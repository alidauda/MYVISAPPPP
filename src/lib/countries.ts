/**
 * ISO 3166-1 alpha-2 subset. The backend exposes no country master list, so
 * this is owned by the frontend — extend it as destinations are configured.
 */
export const countries = [
  { code: 'NG', name: 'Nigeria' },
  { code: 'GH', name: 'Ghana' },
  { code: 'KE', name: 'Kenya' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'IE', name: 'Ireland' },
  { code: 'CA', name: 'Canada' },
  { code: 'US', name: 'United States' },
  { code: 'AE', name: 'United Arab Emirates' },
] as const

export const countryCodes: readonly string[] = countries.map((c) => c.code)
export type CountryCode = (typeof countries)[number]['code']
