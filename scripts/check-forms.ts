/**
 * Validation is only correct if the values the UI suggests actually pass.
 * These assert exactly that, so a placeholder can never drift away from the
 * rule that judges it again.
 */
import { registerSchema } from '../src/features/auth/lib/schemas'
import { travellerProfileSchema } from '../src/features/travellers/lib/schemas'

let failures = 0

function check(name: string, ok: boolean) {
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}`)
  if (!ok) failures++
}

const base = {
  firstName: 'Ada',
  lastName: 'Okafor',
  email: 'ada.new@example.com',
  password: 'correct horse battery',
  acceptedTerms: true,
}

// The exact string the placeholder and the error message both suggest.
check('register accepts the placeholder phone', registerSchema.safeParse({ ...base, phoneNumber: '+234 800 000 0000' }).success)
check('register accepts a bare phone', registerSchema.safeParse({ ...base, phoneNumber: '+2348000000000' }).success)
check('register accepts dashes and brackets', registerSchema.safeParse({ ...base, phoneNumber: '+234 (800) 000-0000' }).success)
check('register rejects a phone with no country code', !registerSchema.safeParse({ ...base, phoneNumber: '08000000000' }).success)
check('register rejects a short password', !registerSchema.safeParse({ ...base, phoneNumber: '+2348000000000', password: 'short' }).success)
check('register rejects unaccepted terms', !registerSchema.safeParse({ ...base, phoneNumber: '+2348000000000', acceptedTerms: false }).success)

const traveller = {
  firstName: 'Ada',
  middleName: '',
  lastName: 'Okafor',
  dateOfBirth: '1991-05-10',
  gender: 'FEMALE' as const,
  nationality: 'NG',
  countryOfResidence: 'NG',
  email: 'ada@example.com',
}

check('traveller accepts the placeholder phone', travellerProfileSchema.safeParse({ ...traveller, phoneNumber: '+234 800 000 0000' }).success)
check('traveller accepts an empty phone', travellerProfileSchema.safeParse({ ...traveller, phoneNumber: '' }).success)
check('traveller accepts an empty email', travellerProfileSchema.safeParse({ ...traveller, email: '', phoneNumber: '' }).success)
check('traveller rejects a future date of birth', !travellerProfileSchema.safeParse({ ...traveller, dateOfBirth: '2099-01-01', phoneNumber: '' }).success)

console.log(failures === 0 ? '\nall form rules accept what the UI suggests' : `\n${failures} FAILING`)
process.exit(failures === 0 ? 0 : 1)
