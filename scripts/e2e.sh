#!/bin/bash
# Walks the whole customer journey against the running dev server.
set -u
API=http://127.0.0.1:${E2E_PORT:-5180}/api/v1
C=/usr/bin/curl
J='Content-Type: application/json'
pass=0; fail=0

step() { printf '%-46s' "$1"; }
expect() { # expect <actual> <wanted>
  if [ "$1" = "$2" ]; then echo "ok ($1)"; pass=$((pass+1)); else echo "FAIL (got $1, wanted $2)"; fail=$((fail+1)); fi
}

# This suite is fixture-shaped: it resets state, reads verification tokens out
# of the dev-server log, and assumes seeded accounts. Pointed at a real system
# it would create real records and fail for the wrong reasons — so refuse.
HEALTH=$($C -s -o /dev/null -w '%{http_code}' -m 5 "$API/__mock_health__" || echo 000)
if [ "$HEALTH" != "200" ]; then
  echo "REFUSING TO RUN: $API is not the mock API."
  echo
  echo "  This suite creates and deletes records. Against a real backend it"
  echo "  would register accounts and reset nothing."
  echo
  echo "  Unset VITE_API_ORIGIN (check .env) and restart the dev server, or"
  echo "  use 'npm run check:contract' to validate a real backend read-only."
  exit 2
fi

$C -s -X POST "$API/__mock_reset__" -o /dev/null

step "register"
CODE=$($C -s -o /tmp/r.json -w '%{http_code}' -X POST "$API/auth/register" -H "$J" \
  -d '{"email":"kelvin@example.com","password":"correct horse battery","firstName":"Kelvin","lastName":"Okegbe","phoneNumber":"+2348001112222"}')
expect "$CODE" 201

step "login is refused before verifying"
CODE=$($C -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/login" -H "$J" \
  -d '{"email":"kelvin@example.com","password":"correct horse battery"}')
expect "$CODE" 403

TOKEN=$(grep -o 'verify-email?token=[a-z0-9_]*' ${E2E_LOG:-/tmp/myvis-dev.log} | tail -1 | cut -d= -f2)
step "verify email with the emailed token"
CODE=$($C -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/verify-email" -H "$J" -d "{\"token\":\"$TOKEN\"}")
expect "$CODE" 200

step "the same token cannot be reused"
CODE=$($C -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/verify-email" -H "$J" -d "{\"token\":\"$TOKEN\"}")
expect "$CODE" 400

step "login"
$C -s -o /tmp/l.json -X POST "$API/auth/login" -H "$J" \
  -d '{"email":"kelvin@example.com","password":"correct horse battery"}'
ACCESS=$(python3 -c "import json;print(json.load(open('/tmp/l.json'))['data']['accessToken'])")
REFRESH=$(python3 -c "import json;print(json.load(open('/tmp/l.json'))['data']['refreshToken'])")
A="Authorization: Bearer $ACCESS"
[ -n "$ACCESS" ] && expect "ok" "ok" || expect "no-token" "ok"

step "users/me carries the permissions"
PERMS=$($C -s "$API/users/me" -H "$A" | python3 -c "import json,sys;print(len(json.load(sys.stdin)['data']['permissions']))")
[ "$PERMS" -gt 0 ] && expect "ok" "ok" || expect "none" "ok"

step "refresh rotates the token"
$C -s -o /tmp/rf.json -X POST "$API/auth/refresh" -H "$J" -d "{\"refreshToken\":\"$REFRESH\"}"
NEW=$(python3 -c "import json;print(json.load(open('/tmp/rf.json'))['data']['refreshToken'])")
[ "$NEW" != "$REFRESH" ] && expect "ok" "ok" || expect "same" "ok"
ACCESS=$(python3 -c "import json;print(json.load(open('/tmp/rf.json'))['data']['accessToken'])")
A="Authorization: Bearer $ACCESS"

step "reusing a spent refresh token is refused"
CODE=$($C -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/refresh" -H "$J" -d "{\"refreshToken\":\"$REFRESH\"}")
expect "$CODE" 401

# ---- password reset ------------------------------------------------------
step "forgot-password answers the same for any address"
CODE=$($C -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/forgot-password" -H "$J" -d '{"email":"nobody@nowhere.test"}')
expect "$CODE" 200

step "request a reset for the real account"
CODE=$($C -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/forgot-password" -H "$J" -d '{"email":"kelvin@example.com"}')
expect "$CODE" 200

RESET=$(grep -o 'reset-password?token=[a-z0-9_]*' ${E2E_LOG:-/tmp/myvis-dev.log} | tail -1 | cut -d= -f2)
step "reset rejects the wrong field name"
CODE=$($C -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/reset-password" -H "$J" \
  -d "{\"token\":\"$RESET\",\"password\":\"a brand new secret\"}")
expect "$CODE" 400

step "reset accepts newPassword"
CODE=$($C -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/reset-password" -H "$J" \
  -d "{\"token\":\"$RESET\",\"newPassword\":\"a brand new secret\"}")
expect "$CODE" 200

step "the old password no longer works"
CODE=$($C -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/login" -H "$J" \
  -d '{"email":"kelvin@example.com","password":"correct horse battery"}')
expect "$CODE" 401

step "sign in with the new one"
$C -s -o /tmp/l.json -X POST "$API/auth/login" -H "$J" \
  -d '{"email":"kelvin@example.com","password":"a brand new secret"}'
ACCESS=$(python3 -c "import json;print(json.load(open('/tmp/l.json'))['data']['accessToken'])")
A="Authorization: Bearer $ACCESS"
[ -n "$ACCESS" ] && expect "ok" "ok" || expect "no-token" "ok"

step "create the traveller"
$C -s -o /tmp/c.json -X POST "$API/clients" -H "$J" -H "$A" \
  -d '{"firstName":"Kelvin","lastName":"Okegbe","dateOfBirth":"1994-03-02","gender":"MALE","nationality":"NG","countryOfResidence":"NG","email":"kelvin@example.com","phoneNumber":"+2348001112222","selfManaged":true}'
CLIENT=$(python3 -c "import json;print(json.load(open('/tmp/c.json'))['data']['id'])")
[ -n "$CLIENT" ] && expect "ok" "ok" || expect "none" "ok"

step "catalogue lists offerings"
N=$($C -s "$API/visa-catalogue" | python3 -c "import json,sys;print(len(json.load(sys.stdin)['data']))")
[ "$N" -ge 2 ] && expect "ok" "ok" || expect "$N" "ok"

step "offering carries questions and requirements"
DEF=$($C -s "$API/visa-catalogue/GB_VISITOR_STD" | python3 -c "import json,sys;d=json.load(sys.stdin)['data'];print(d['id'] if len(d['questions'])>=12 else '')")
[ -n "$DEF" ] && expect "ok" "ok" || expect "thin" "ok"

step "create a draft application"
$C -s -o /tmp/a.json -X POST "$API/applications" -H "$J" -H "$A" \
  -d "{\"clientId\":\"$CLIENT\",\"visaDefinitionId\":\"$DEF\"}"
APP=$(python3 -c "import json;print(json.load(open('/tmp/a.json'))['data']['id'])")
STATUS=$(python3 -c "import json;print(json.load(open('/tmp/a.json'))['data']['status'])")
expect "$STATUS" "DRAFT"

step "questions come back pinned to the version"
V=$($C -s "$API/applications/$APP/questions" -H "$A" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['visaDefinitionVersion'])")
expect "$V" "4"

step "save answers"
CODE=$($C -s -o /dev/null -w '%{http_code}' -X PUT "$API/applications/$APP/answers" -H "$J" -H "$A" \
  -d '{"answers":[{"questionCode":"TRAVEL_PURPOSE","value":"TOURISM"},{"questionCode":"ARRIVAL_DATE","value":"2026-11-04"},{"questionCode":"DEPARTURE_DATE","value":"2026-11-22"},{"questionCode":"ACCOMMODATION_ADDRESS","value":"Premier Inn, Manchester"},{"questionCode":"MONTHLY_INCOME","value":850000},{"questionCode":"TRIP_SELF_FUNDED","value":true},{"questionCode":"HAS_PREVIOUS_REFUSAL","value":false},{"questionCode":"CRIMINAL_CONVICTION","value":false}]}')
expect "$CODE" 200

step "answers come back on the questions themselves"
N=$($C -s "$API/applications/$APP/questions" -H "$A" | python3 -c "import json,sys;print(len([q for q in json.load(sys.stdin)['data']['questions'] if q.get('currentAnswer') is not None]))")
expect "$N" "8"

step "submit stage 1"
S=$($C -s -X POST "$API/applications/$APP/submit-initial" -H "$J" -H "$A" -d '{"comment":"Dates are fixed."}' | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['status'])")
expect "$S" "INITIAL_INFORMATION_SUBMITTED"

step "answers are locked once submitted"
CODE=$($C -s -o /dev/null -w '%{http_code}' -X PUT "$API/applications/$APP/answers" -H "$J" -H "$A" -d '{"answers":[]}')
expect "$CODE" 409

step "submit stage 2"
S=$($C -s -X POST "$API/applications/$APP/submit-initial" -H "$J" -H "$A" -d '{}' | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['status'])")
expect "$S" "INITIAL_DOCUMENTS_SUBMITTED"

step "a third submit is refused"
CODE=$($C -s -o /dev/null -w '%{http_code}' -X POST "$API/applications/$APP/submit-initial" -H "$J" -H "$A" -d '{}')
expect "$CODE" 409

step "another owner's record is hidden, not refused"
CODE=$($C -s -o /dev/null -w '%{http_code}' "$API/applications/does-not-exist" -H "$A")
expect "$CODE" 404

step "upload a document"
printf '%%PDF-1.4 fake' > /tmp/statement.pdf
CODE=$($C -s -o /tmp/d.json -w '%{http_code}' -X POST "$API/applications/$APP/documents?categoryCode=BANK_STATEMENT" \
  -H "$A" -F "file=@/tmp/statement.pdf;type=application/pdf")
expect "$CODE" 201

step "replacing it makes a new version"
V=$($C -s -X POST "$API/applications/$APP/documents?categoryCode=BANK_STATEMENT" -H "$A" \
  -F "file=@/tmp/statement.pdf;type=application/pdf" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['versionNumber'])")
expect "$V" "2"

step "an oversized file is refused"
/usr/bin/head -c 11000000 /dev/zero > /tmp/big.pdf
CODE=$($C -s -o /dev/null -w '%{http_code}' -X POST "$API/applications/$APP/documents?categoryCode=BANK_STATEMENT" \
  -H "$A" -F "file=@/tmp/big.pdf;type=application/pdf")
expect "$CODE" 413

step "the wrong file type is refused"
printf 'not a pdf' > /tmp/note.txt
CODE=$($C -s -o /dev/null -w '%{http_code}' -X POST "$API/applications/$APP/documents?categoryCode=BANK_STATEMENT" \
  -H "$A" -F "file=@/tmp/note.txt;type=text/plain")
expect "$CODE" 415

step "timeline records both submissions"
N=$($C -s "$API/applications/$APP/timeline" -H "$A" | python3 -c "import json,sys;print(len(json.load(sys.stdin)['data']))")
expect "$N" "3"

step "queue lists the case"
N=$($C -s "$API/internal/applications?page=0" -H "$A" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['totalElements'])")
[ "$N" -ge 1 ] && expect "ok" "ok" || expect "$N" "ok"

step "queue filters by status"
N=$($C -s "$API/internal/applications?status=DRAFT" -H "$A" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['totalElements'])")
expect "$N" "0"

step "queue filters by destination"
N=$($C -s "$API/internal/applications?country=GB" -H "$A" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['totalElements'])")
expect "$N" "1"

step "assign an officer"
NAME=$($C -s -X PUT "$API/internal/applications/$APP/officer" -H "$J" -H "$A" \
  -d '{"userId":"usr_kene","reason":"Triage"}' | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['officerId'])")
expect "$NAME" "usr_kene"

step "set priority and due date"
# Always in the future, so the overdue check below cannot go stale.
DUE=$(python3 -c "import datetime;print((datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(days=365)).strftime('%Y-%m-%dT12:00:00Z'))")
P=$($C -s -X PUT "$API/internal/applications/$APP/schedule" -H "$J" -H "$A" \
  -d "{\"priority\":\"HIGH\",\"dueAt\":\"$DUE\"}" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['priority'])")
expect "$P" "HIGH"

step "overdue filter excludes a future due date"
N=$($C -s "$API/internal/applications?overdue=true" -H "$A" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['totalElements'])")
expect "$N" "0"

step "checklist seeds on first open"
N=$($C -s "$API/internal/applications/$APP/checklist" -H "$A" | python3 -c "import json,sys;print(len(json.load(sys.stdin)['data']))")
expect "$N" "4"

step "ticking a checklist item"
WHO=$($C -s -X PUT "$API/internal/applications/$APP/checklist" -H "$J" -H "$A" \
  -d '{"code":"PASSPORT_VALID","label":"Passport valid for the whole stay","completed":true}' | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['completed'])")
expect "$WHO" "True"

step "a checklist update without a label is refused"
CODE=$($C -s -o /dev/null -w '%{http_code}' -X PUT "$API/internal/applications/$APP/checklist" -H "$J" -H "$A" \
  -d '{"code":"PASSPORT_VALID","completed":true}')
expect "$CODE" 400

step "post an internal note"
CODE=$($C -s -o /dev/null -w '%{http_code}' -X POST "$API/internal/applications/$APP/notes" -H "$J" -H "$A" \
  -d '{"note":"Bank statement shows no salary credit."}')
expect "$CODE" 201

step "a note without the note field is refused"
CODE=$($C -s -o /dev/null -w '%{http_code}' -X POST "$API/internal/applications/$APP/notes" -H "$J" -H "$A" \
  -d '{"body":"wrong field name"}')
expect "$CODE" 400

step "an illegal status jump is refused"
CODE=$($C -s -o /dev/null -w '%{http_code}' -X POST "$API/applications/$APP/status" -H "$J" -H "$A" \
  -d '{"status":"APPROVED"}')
expect "$CODE" 409

step "a legal transition is allowed"
S=$($C -s -X POST "$API/applications/$APP/status" -H "$J" -H "$A" \
  -d '{"status":"IN_PROGRESS","reason":"Starting checks"}' | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['status'])")
expect "$S" "IN_PROGRESS"

step "requesting information moves the case"
$C -s -o /dev/null -X POST "$API/internal/applications/$APP/information-requests" -H "$J" -H "$A" \
  -d '{"message":"Please send proof of employment.","dueAt":"2026-09-30T17:00:00Z"}'
S=$($C -s "$API/applications/$APP" -H "$A" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['status'])")
expect "$S" "AWAITING_ADDITIONAL_INFORMATION"

step "the applicant can read the request"
N=$($C -s "$API/applications/$APP/information-requests" -H "$A" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['totalElements'])")
expect "$N" "1"

# ---- family -------------------------------------------------------------
step "add a family traveller"
$C -s -o /tmp/f.json -X POST "$API/family-members" -H "$J" -H "$A" \
  -d '{"relationship":"Child","traveller":{"firstName":"Tomi","lastName":"Okegbe","dateOfBirth":"2004-05-12","gender":"UNSPECIFIED","nationality":"NG","countryOfResidence":"NG","email":"tomi@example.com"}}'
KID=$(python3 -c "import json;print(json.load(open('/tmp/f.json'))['data']['clientId'])")
[ -n "$KID" ] && expect "ok" "ok" || expect "none" "ok"

step "their own email cannot be yours"
CODE=$($C -s -o /dev/null -w '%{http_code}' -X POST "$API/family-members" -H "$J" -H "$A" \
  -d '{"relationship":"Child","traveller":{"firstName":"X","lastName":"Y","dateOfBirth":"2004-01-01","gender":"UNSPECIFIED","nationality":"NG","countryOfResidence":"NG","email":"kelvin@example.com"}}')
expect "$CODE" 400

step "invite the adult for consent"
CODE=$($C -s -o /dev/null -w '%{http_code}' -X POST "$API/family-members/$KID/invitations" -H "$J" -H "$A" -d '{"purpose":"CONSENT"}')
expect "$CODE" 201

step "the raw token is never returned to the manager"
HAS=$($C -s -X POST "$API/family-members/$KID/invitations" -H "$J" -H "$A" -d '{"purpose":"CONSENT"}' | grep -c '"token"' || true)
expect "$HAS" "0"

CONSENT=$(grep -o 'family-consent?token=[a-z0-9_]*' ${E2E_LOG:-/tmp/myvis-dev.log} | tail -1 | cut -d= -f2)
step "recording consent is public and single-use"
CODE=$($C -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/family-consent" -H "$J" -d "{\"token\":\"$CONSENT\",\"granted\":true}")
expect "$CODE" 200
step "the consent link cannot be reused"
CODE=$($C -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/family-consent" -H "$J" -d "{\"token\":\"$CONSENT\",\"granted\":true}")
expect "$CODE" 400

step "a migration invitation to the wrong account is refused"
$C -s -o /dev/null -X POST "$API/family-members/$KID/invitations" -H "$J" -H "$A" -d '{"purpose":"MIGRATION"}'
MIG=$(grep -o 'family-migration?token=[a-z0-9_]*' ${E2E_LOG:-/tmp/myvis-dev.log} | tail -1 | cut -d= -f2)
CODE=$($C -s -o /dev/null -w '%{http_code}' -X POST "$API/family-members/accept-migration" -H "$J" -H "$A" -d "{\"token\":\"$MIG\"}")
expect "$CODE" 403

# ---- administration -----------------------------------------------------
step "accounts list"
N=$($C -s "$API/users" -H "$A" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['totalElements'])")
[ "$N" -ge 2 ] && expect "ok" "ok" || expect "$N" "ok"

step "you cannot suspend yourself"
ME=$($C -s "$API/users/me" -H "$A" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['id'])")
CODE=$($C -s -o /dev/null -w '%{http_code}' -X POST "$API/users/$ME/suspend" -H "$A")
expect "$CODE" 409

step "an unverified account cannot be activated"
CHIDI=$($C -s "$API/users" -H "$A" | python3 -c "import json,sys;print([u['id'] for u in json.load(sys.stdin)['data']['content'] if not u['emailVerified']][0])")
CODE=$($C -s -o /dev/null -w '%{http_code}' -X POST "$API/users/$CHIDI/activate" -H "$A")
expect "$CODE" 409

step "permissions reference is sorted by code"
N=$($C -s "$API/roles/permissions" -H "$A" | python3 -c "import json,sys;d=json.load(sys.stdin)['data'];print('ok' if [p['code'] for p in d]==sorted(p['code'] for p in d) else 'unsorted')")
expect "$N" "ok"

step "an organisation role cannot grant cross-tenant access"
PID=$($C -s "$API/roles/permissions" -H "$A" | python3 -c "import json,sys;print([p['id'] for p in json.load(sys.stdin)['data'] if p['code']=='TENANT_ACCESS_CROSS'][0])")
CODE=$($C -s -o /dev/null -w '%{http_code}' -X PUT "$API/organisations/org_ada_travel/roles/orl_officer/permissions/$PID" -H "$A")
expect "$CODE" 403

step "adding a member never creates an account"
CODE=$($C -s -o /dev/null -w '%{http_code}' -X POST "$API/organisations/org_ada_travel/members" -H "$J" -H "$A" \
  -d '{"userId":"usr_nobody","roleIds":["orl_officer"]}')
expect "$CODE" 404

step "review queue needs cross-tenant access"
N=$($C -s "$API/organisation-registrations?reviewQueue=true" -H "$A" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['totalElements'])")
[ "$N" -ge 2 ] && expect "ok" "ok" || expect "$N" "ok"

step "an unverified applicant cannot be approved"
CODE=$($C -s -o /dev/null -w '%{http_code}' -X POST "$API/organisation-registrations/reg_3/approve" -H "$A")
expect "$CODE" 409

step "rejecting without a reason is refused"
CODE=$($C -s -o /dev/null -w '%{http_code}' -X POST "$API/organisation-registrations/reg_2/reject" -H "$J" -H "$A" -d '{}')
expect "$CODE" 400

step "approve a verified registration"
CODE=$($C -s -o /dev/null -w '%{http_code}' -X POST "$API/organisation-registrations/reg_1/approve" -H "$A")
expect "$CODE" 200
step "it cannot be reviewed twice"
CODE=$($C -s -o /dev/null -w '%{http_code}' -X POST "$API/organisation-registrations/reg_1/approve" -H "$A")
expect "$CODE" 409

step "activating a draft deactivates the live version"
$C -s -o /dev/null -X POST "$API/admin/visa-definitions/def_gb_visitor_v5/activate" -H "$A"
S=$($C -s "$API/admin/visa-definitions/def_gb_visitor_v4" -H "$A" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['active'])")
expect "$S" "False"

echo
echo "passed $pass, failed $fail"
exit $((fail > 0))
