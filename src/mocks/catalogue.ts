/**
 * Two seeded offerings. Between them they exercise every question type and a
 * conditional rule, so the renderer is never only tested on the easy path.
 */
export const mockCatalogue = [
  {
    id: 'def_gb_visitor_v4',
    code: 'GB_VISITOR_STD',
    name: 'United Kingdom — Standard Visitor',
    destinationCountry: 'GB',
    visaCategory: 'VISITOR',
    description: 'Tourism, family visits and short business trips of up to six months.',
    version: 4,
    processingInformation: 'Typically decided in 15 working days.',
    requirements: [
      {
        code: 'PASSPORT',
        name: 'Passport biographic page',
        description: 'Valid for the whole stay. Reusable across your applications.',
        required: true,
      },
      {
        code: 'PASSPORT_PHOTOGRAPH',
        name: 'Recent photograph',
        description: 'Taken within the last six months.',
        required: true,
      },
      {
        code: 'BANK_STATEMENT',
        name: 'Six months of bank statements',
        description: 'Specific to this application, not reused.',
        required: true,
      },
      { code: 'TRAVEL_BOOKING', name: 'Flight and accommodation booking', required: true },
      {
        code: 'INVITATION_LETTER',
        name: 'Letter from your host',
        description: 'Asked for only if you say you are visiting family or friends.',
        required: false,
      },
    ],
    questions: [
      {
        code: 'TRAVEL_PURPOSE',
        label: 'Purpose of travel',
        type: 'SELECT',
        required: true,
        options: [
          { code: 'TOURISM', value: 'TOURISM', label: 'Tourism' },
          { code: 'FAMILY', value: 'FAMILY', label: 'Visiting family or friends' },
          { code: 'BUSINESS', value: 'BUSINESS', label: 'Business' },
        ],
      },
      {
        code: 'HOST_NAME',
        label: 'Who are you visiting?',
        helpText: 'The full name of the person you will stay with.',
        type: 'TEXT',
        required: false,
        // Only asked once the purpose makes it relevant.
        rules: [{ sourceQuestionCode: 'TRAVEL_PURPOSE', operator: 'EQUALS', expectedValue: 'FAMILY', effect: 'DISPLAY' }],
      },
      {
        code: 'ARRIVAL_DATE',
        label: 'Arrival date',
        type: 'DATE',
        required: true,
      },
      {
        code: 'DEPARTURE_DATE',
        label: 'Departure date',
        type: 'DATE',
        required: true,
      },
      {
        code: 'ACCOMMODATION_ADDRESS',
        label: 'Address where you will stay',
        type: 'TEXTAREA',
        required: true,
      },
      {
        code: 'MONTHLY_INCOME',
        label: 'Monthly income after tax',
        helpText: 'In your own currency.',
        type: 'NUMBER',
        required: true,
      },
      {
        code: 'TRIP_SELF_FUNDED',
        label: 'Are you paying for this trip yourself?',
        type: 'BOOLEAN',
        required: true,
      },
      {
        code: 'SPONSOR_DETAILS',
        label: 'Who is paying, and what is your relationship to them?',
        type: 'TEXTAREA',
        required: false,
        rules: [
          { sourceQuestionCode: 'TRIP_SELF_FUNDED', operator: 'EQUALS', expectedValue: 'false', effect: 'DISPLAY' },
          { sourceQuestionCode: 'TRIP_SELF_FUNDED', operator: 'EQUALS', expectedValue: 'false', effect: 'REQUIRE' },
        ],
      },
      {
        code: 'COUNTRIES_VISITED',
        label: 'Countries visited in the last ten years',
        type: 'MULTI_SELECT',
        required: false,
        options: [
          { code: 'GH', value: 'GH', label: 'Ghana' },
          { code: 'AE', value: 'AE', label: 'United Arab Emirates' },
          { code: 'ZA', value: 'ZA', label: 'South Africa' },
          { code: 'US', value: 'US', label: 'United States' },
          { code: 'CA', value: 'CA', label: 'Canada' },
        ],
      },
      {
        code: 'HAS_PREVIOUS_REFUSAL',
        label: 'Have you ever been refused a visa for any country?',
        helpText: 'A refusal is not a bar — an undisclosed one is.',
        type: 'BOOLEAN',
        required: true,
      },
      {
        code: 'PREVIOUS_REFUSAL_DETAILS',
        label: 'Give the country, date and reason given',
        type: 'TEXTAREA',
        required: false,
        rules: [
          { sourceQuestionCode: 'HAS_PREVIOUS_REFUSAL', operator: 'EQUALS', expectedValue: 'true', effect: 'DISPLAY' },
          { sourceQuestionCode: 'HAS_PREVIOUS_REFUSAL', operator: 'EQUALS', expectedValue: 'true', effect: 'REQUIRE' },
        ],
      },
      {
        code: 'CRIMINAL_CONVICTION',
        label: 'Do you have any criminal convictions?',
        type: 'BOOLEAN',
        required: true,
      },
    ],
  },
  {
    id: 'def_ae_visit_v6',
    code: 'AE_VISIT_30',
    name: 'United Arab Emirates — 30-day Visit',
    destinationCountry: 'AE',
    visaCategory: 'VISITOR',
    description: 'Single-entry visit for tourism or family, valid for thirty days.',
    version: 6,
    processingInformation: 'Usually decided in 3 to 5 working days.',
    requirements: [
      { code: 'PASSPORT', name: 'Passport biographic page', required: true },
      { code: 'PASSPORT_PHOTOGRAPH', name: 'Recent photograph', required: true },
      { code: 'TRAVEL_BOOKING', name: 'Return flight booking', required: true },
    ],
    questions: [
      {
        code: 'TRAVEL_PURPOSE',
        label: 'Purpose of travel',
        type: 'SELECT',
        required: true,
        options: [
          { code: 'TOURISM', value: 'TOURISM', label: 'Tourism' },
          { code: 'FAMILY', value: 'FAMILY', label: 'Visiting family' },
        ],
      },
      {
        code: 'ARRIVAL_DATE',
        label: 'Arrival date',
        type: 'DATE',
        required: true,
      },
      {
        code: 'HOTEL_NAME',
        label: 'Where will you stay?',
        type: 'TEXT',
        required: true,
      },
    ],
  },
]
