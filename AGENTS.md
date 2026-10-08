# Agent guide — MyVisApp web

Conventions for anyone, human or agent, changing this codebase.

The structure and component rules follow [cal.com](https://github.com/calcom/cal.com).
Their stack is Next.js App Router, Prisma and tRPC; this is Vite + TanStack
Router against a separate Spring API, so what was worth taking is the *shape* —
thin routes, views in `modules/`, design system apart from features, one-way
dependencies — not the stack-specific rules. Everything below is what we
actually do.

## Stack

| Concern | Tool |
| --- | --- |
| Build | Vite, React 19, TypeScript |
| Routing | TanStack Router (file-based, Zod-validated search params) |
| Server state | TanStack Query |
| Tables | TanStack Table |
| Forms | react-hook-form + Zod via `zodResolver` |
| HTTP | axios, one instance with interceptors (`src/api/http.ts`) |
| UI | Tailwind v4 + shadcn/ui (Radix primitives) |
| Mocks | MSW (`src/mocks`), on by default in dev |

## TypeScript

- **Never `as any`.** If a type fights you, fix the type. `as unknown as X` is
  the same offence wearing a hat.
- Use `import type { X }` for type-only imports.
- `npx tsc -b --noEmit` must pass before anything is pushed.
- Validate every response at the boundary with Zod. A value that has not been
  through a schema is `unknown`, not a typed object.

## Structure

Borrowed from cal.com: **routes are thin entry points, the page lives
elsewhere, and the design system is separate from the features.** Their split
is across monorepo packages (`apps/web/app` vs `apps/web/modules` vs
`packages/ui` vs `packages/features`); this is one Vite app, so the same
separation is expressed as folders.

```
src/
  routes/       TanStack Router files. Route config and one view import. Nothing else.
  modules/      One view per route: <area>/views/<name>-view.tsx
  features/     Domain. One folder per domain, each owning:
                  lib/         Zod schemas, types, constants
                  api/         endpoint functions
                  hooks/       queries, mutations, context
                  components/  components only this domain uses
  components/
    ui/         shadcn primitives. The CLI owns this folder — let it.
    shared/     Our own presentational components, used across features.
  api/          Transport: axios instance, envelope, ApiProblem, tokens, query client.
  lib/          Cross-cutting utilities with no domain knowledge.
  mocks/        MSW handlers and the in-memory db.
```

### Dependency direction

One way, top to bottom. Nothing below imports from above.

```
routes  →  modules  →  features  →  components/shared  →  components/ui
                           ↓                ↓                    ↓
                        api,  lib  ────────────────────────────────
```

- **`components/ui` imports nothing of ours** but `lib/utils`. A primitive that
  knows about the session or an endpoint is no longer a primitive.
- **`components/shared` may use `ui`, never `features`.** If a component needs
  a feature's data it belongs to that feature.
- **A feature never reaches into another feature's folder.** Use its `api/`,
  `hooks/` or `lib/` — the parts meant to be consumed — not its components or
  internals.
- **Only routes import modules.** A view is a leaf.

This is documented, not linted. If it starts drifting, add
`import/no-restricted-paths` rather than relying on review.

### Component rules

- **A route file is route config plus one import.** No JSX beyond the view, no
  queries, no handlers. If you are tempted to add a condition to a route file,
  it belongs in the view.
- **A view reaches its route's search params with `getRouteApi`,** never by
  importing the route — that is a cycle. The id is a string:
  `const route = getRouteApi('/_auth/login')`.
- **One view per route, named `<Thing>View`,** in
  `modules/<area>/views/<thing>-view.tsx`.
- **Import from the source file, never a barrel.** `@/components/ui/button`,
  not `@/components/ui`. No `index.ts` re-export files anywhere.
- **Name folders for the domain, not the endpoint.** The API says `/clients`;
  the feature is `travellers`, because that is what the thing is.
- A component that takes no props and reads a hook is fine. A component that
  takes fifteen props is two components.

## Data access

- Every call goes through `src/api/client.ts`. No component calls `axios` or
  `fetch` directly.
- One axios instance, `src/api/http.ts`. Auth, correlation IDs and the refresh
  retry live in its interceptors, not at call sites.
- **Never let a raw response escape the API layer.** Server text is parsed into
  `ApiProblem`; exception messages and stack details never reach a screen.
- Query keys carry the organisation context (`queryKeys` in
  `api/query-client.ts`) so switching organisations can never serve another
  tenant's rows from cache.
- Refusals are not retried: every 4xx except 408 and 429 has already given its
  final answer, and so has a response that failed its schema.

## Errors

Mirrors cal.com's rule that services raise a domain error and only the
framework layer raises a framework error.

- `ApiProblem` is the only error the API layer raises. Components branch on
  `status` and `code`; they show `message`.
- Form-level mapping goes through `applyServerErrors` in `lib/form.ts`, which
  also surfaces any field the form does not own rather than dropping it.
- `humanMessage` in `api/problem.ts` owns the wording for each status, so no
  screen invents its own.

## Permissions

- Guards read `permissions` from `/users/me` and nothing else. Never infer
  access from a role name.
- `TENANT_ACCESS_CROSS` is separate and sensitive; a broad read permission
  never implies it.
- **A frontend guard decides what to render, never what someone may have.**
  The backend refuses regardless, and every call is written to survive a 401
  or 403 arriving anyway.

## Forms

- Zod schema in the feature's `schemas.ts`, never inline in a component.
- No `.default()` in a form schema — it makes the schema's input and output
  types differ, which the react-hook-form resolver rejects. Defaults belong in
  `defaultValues`.
- Always `noValidate` on the form: Zod owns validation, so the browser's
  native bubbles do not compete with the field messages.
- Every input has a real `<label>`; icon-only buttons carry `aria-label`.

## Motion

Follow `.claude/skills/animate`. The decisions already made:

- **Frequency decides whether something animates at all.** Anything a person
  triggers many times a day is instant — the password Show toggle, field
  focus, the step rail.
- Three animations exist today: the form column rising in on arrival, a
  notice entering via `@starting-style`, and button press feedback at
  `scale(0.97)`.
- CSS only. Motion for React is not installed and should not be added until
  something needs an exit animation, a layout morph or a real spring — the
  conditional-field reveal in the visa question renderer is the first likely
  case.
- Animate `transform` and `opacity`. Never `width`, `height`, `top` or
  `margin`.
- **Every animation ships two variants.** The reduced-motion one removes the
  movement and keeps the meaning; check it with DevTools → Rendering →
  Emulate `prefers-reduced-motion`.

## Comments

Explain **why**, never restate **what**. A comment that says the loop iterates
over users is noise; one that says the refresh is single-flight because the
token rotates is the reason the code looks odd.

## Mock API

There is no backend. `src/mocks/vite-plugin.ts` serves the MSW handlers from
the dev server at `/api/v1`, so requests are real HTTP — visible in the network
tab, shared across tabs, surviving a reload. Set `VITE_API_ORIGIN` and the
mock turns itself off.

It was a browser service worker first. That was wrong: a stale registration or
a load before activation left requests falling through to Vite as mystery
404s, which reads as an app bug. If something ever 404s across the board, the
dev server banner (`Mock API: /api/v1`) is the first thing to check.

Fixture state lives in the dev-server process and resets on restart. Seeded
accounts, permissions and catalogue live in `src/mocks/db.ts` and
`src/mocks/catalogue.ts` — one list each, never duplicated into a handler.

## Before pushing

```bash
npm run check           # typecheck + form rules + the whole journey over HTTP
npx oxlint src          # warnings about route files exporting Route are expected
npx vite build          # must succeed
```

`scripts/e2e.sh` walks register → verify → login → refresh → traveller →
catalogue → draft → answers → documents → submit → queue → assign → checklist
→ notes → status → information request against the running dev server. It is
the fastest way to know the stack still works without opening a browser.

`scripts/check-forms.ts` asserts that **every value the UI suggests passes its
own validation** — a placeholder must never demonstrate a value the validator
then rejects.

- Conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`.
- Keep a PR under ~500 lines and ~10 files. Split anything larger.

## Security

- Tokens never enter a URL, a log, or an analytics call. The access token
  lives in memory; only the refresh token is persisted.
- Single-use tokens are stripped from the URL after use — see
  `routes/_auth/verify-email.tsx`.
- Never build a storage path or expose a document URL. Downloads go through
  `requestBlob`, which reads the filename from `Content-Disposition`.
- Messages stay non-enumerating: a record in another organisation is a 404,
  and forgot-password answers identically for every address.

## Open decisions

- **No i18n.** Copy is inline. cal.com requires every string in a locale file,
  and for an immigration product the case for translation is strong — but
  retrofitting gets worse with every screen, so decide before the next slice.
- **Timezones.** `date-fns` or native `Date` is fine where timezone awareness
  is not required, but the backend sends timestamps *with* a timezone and
  `dueAt` is timezone-significant. Those need real handling, not `Date`.
