export const COUNTRIES = {
  IN: {
    name: 'India',
    code: 'IN',
    currency: 'INR',
    symbol: '₹',
    gateway: 'razorpay',
    states: [
      { code: 'AN', name: 'Andaman and Nicobar Islands' },
      { code: 'AP', name: 'Andhra Pradesh' },
      { code: 'AR', name: 'Arunachal Pradesh' },
      { code: 'AS', name: 'Assam' },
      { code: 'BR', name: 'Bihar' },
      { code: 'CH', name: 'Chandigarh' },
      { code: 'CT', name: 'Chhattisgarh' },
      { code: 'DN', name: 'Dadra and Nagar Haveli' },
      { code: 'DD', name: 'Daman and Diu' },
      { code: 'DL', name: 'Delhi' },
      { code: 'GA', name: 'Goa' },
      { code: 'GJ', name: 'Gujarat' },
      { code: 'HR', name: 'Haryana' },
      { code: 'HP', name: 'Himachal Pradesh' },
      { code: 'JK', name: 'Jammu and Kashmir' },
      { code: 'JH', name: 'Jharkhand' },
      { code: 'KA', name: 'Karnataka' },
      { code: 'KL', name: 'Kerala' },
      { code: 'LA', name: 'Ladakh' },
      { code: 'LD', name: 'Lakshadweep' },
      { code: 'MP', name: 'Madhya Pradesh' },
      { code: 'MH', name: 'Maharashtra' },
      { code: 'MN', name: 'Manipur' },
      { code: 'ML', name: 'Meghalaya' },
      { code: 'MZ', name: 'Mizoram' },
      { code: 'NL', name: 'Nagaland' },
      { code: 'OR', name: 'Odisha' },
      { code: 'PY', name: 'Puducherry' },
      { code: 'PB', name: 'Punjab' },
      { code: 'RJ', name: 'Rajasthan' },
      { code: 'SK', name: 'Sikkim' },
      { code: 'TN', name: 'Tamil Nadu' },
      { code: 'TG', name: 'Telangana' },
      { code: 'TR', name: 'Tripura' },
      { code: 'UP', name: 'Uttar Pradesh' },
      { code: 'UT', name: 'Uttarakhand' },
      { code: 'WB', name: 'West Bengal' }
    ]
  },
  US: {
    name: 'United States',
    code: 'US',
    currency: 'USD',
    symbol: '$',
    gateway: 'paypal',
    states: [
      { code: 'AL', name: 'Alabama' },
      { code: 'AK', name: 'Alaska' },
      { code: 'AZ', name: 'Arizona' },
      { code: 'AR', name: 'Arkansas' },
      { code: 'CA', name: 'California' },
      { code: 'CO', name: 'Colorado' },
      { code: 'CT', name: 'Connecticut' },
      { code: 'DE', name: 'Delaware' },
      { code: 'FL', name: 'Florida' },
      { code: 'GA', name: 'Georgia' },
      { code: 'HI', name: 'Hawaii' },
      { code: 'ID', name: 'Idaho' },
      { code: 'IL', name: 'Illinois' },
      { code: 'IN', name: 'Indiana' },
      { code: 'IA', name: 'Iowa' },
      { code: 'KS', name: 'Kansas' },
      { code: 'KY', name: 'Kentucky' },
      { code: 'LA', name: 'Louisiana' },
      { code: 'ME', name: 'Maine' },
      { code: 'MD', name: 'Maryland' },
      { code: 'MA', name: 'Massachusetts' },
      { code: 'MI', name: 'Michigan' },
      { code: 'MN', name: 'Minnesota' },
      { code: 'MS', name: 'Mississippi' },
      { code: 'MO', name: 'Missouri' },
      { code: 'MT', name: 'Montana' },
      { code: 'NE', name: 'Nebraska' },
      { code: 'NV', name: 'Nevada' },
      { code: 'NH', name: 'New Hampshire' },
      { code: 'NJ', name: 'New Jersey' },
      { code: 'NM', name: 'New Mexico' },
      { code: 'NY', name: 'New York' },
      { code: 'NC', name: 'North Carolina' },
      { code: 'ND', name: 'North Dakota' },
      { code: 'OH', name: 'Ohio' },
      { code: 'OK', name: 'Oklahoma' },
      { code: 'OR', name: 'Oregon' },
      { code: 'PA', name: 'Pennsylvania' },
      { code: 'RI', name: 'Rhode Island' },
      { code: 'SC', name: 'South Carolina' },
      { code: 'SD', name: 'South Dakota' },
      { code: 'TN', name: 'Tennessee' },
      { code: 'TX', name: 'Texas' },
      { code: 'UT', name: 'Utah' },
      { code: 'VT', name: 'Vermont' },
      { code: 'VA', name: 'Virginia' },
      { code: 'WA', name: 'Washington' },
      { code: 'WV', name: 'West Virginia' },
      { code: 'WI', name: 'Wisconsin' },
      { code: 'WY', name: 'Wyoming' }
    ]
  },
  GB: {
    name: 'United Kingdom',
    code: 'GB',
    currency: 'USD',
    symbol: '$',
    gateway: 'paypal',
    states: [
      { code: 'EN', name: 'England' },
      { code: 'SC', name: 'Scotland' },
      { code: 'WA', name: 'Wales' },
      { code: 'NI', name: 'Northern Ireland' }
    ]
  },
  CA: {
    name: 'Canada',
    code: 'CA',
    currency: 'USD',
    symbol: '$',
    gateway: 'paypal',
    states: [
      { code: 'AB', name: 'Alberta' },
      { code: 'BC', name: 'British Columbia' },
      { code: 'MB', name: 'Manitoba' },
      { code: 'NB', name: 'New Brunswick' },
      { code: 'NL', name: 'Newfoundland and Labrador' },
      { code: 'NT', name: 'Northwest Territories' },
      { code: 'NS', name: 'Nova Scotia' },
      { code: 'NU', name: 'Nunavut' },
      { code: 'ON', name: 'Ontario' },
      { code: 'PE', name: 'Prince Edward Island' },
      { code: 'QC', name: 'Quebec' },
      { code: 'SK', name: 'Saskatchewan' },
      { code: 'YT', name: 'Yukon' }
    ]
  },
  AE: {
    name: 'United Arab Emirates',
    code: 'AE',
    currency: 'USD',
    symbol: '$',
    gateway: 'paypal',
    states: [
      { code: 'AZ', name: 'Abu Dhabi' },
      { code: 'AJ', name: 'Ajman' },
      { code: 'DU', name: 'Dubai' },
      { code: 'FU', name: 'Fujairah' },
      { code: 'RK', name: 'Ras Al Khaimah' },
      { code: 'SH', name: 'Sharjah' },
      { code: 'UQ', name: 'Umm Al Quwain' }
    ]
  },
  AU: {
    name: 'Australia',
    code: 'AU',
    currency: 'USD',
    symbol: '$',
    gateway: 'paypal',
    states: [
      { code: 'AC', name: 'Australian Capital Territory' },
      { code: 'NS', name: 'New South Wales' },
      { code: 'NT', name: 'Northern Territory' },
      { code: 'QL', name: 'Queensland' },
      { code: 'SA', name: 'South Australia' },
      { code: 'TA', name: 'Tasmania' },
      { code: 'VI', name: 'Victoria' },
      { code: 'WA', name: 'Western Australia' }
    ]
  },
  SG: {
    name: 'Singapore',
    code: 'SG',
    currency: 'USD',
    symbol: '$',
    gateway: 'paypal',
    states: [
      { code: 'SG', name: 'Singapore' }
    ]
  },
  MY: {
    name: 'Malaysia',
    code: 'MY',
    currency: 'USD',
    symbol: '$',
    gateway: 'paypal',
    states: [
      { code: 'JH', name: 'Johor' },
      { code: 'KD', name: 'Kedah' },
      { code: 'KL', name: 'Kelantan' },
      { code: 'KU', name: 'Kuala Lumpur' },
      { code: 'LB', name: 'Labuan' },
      { code: 'ML', name: 'Melaka' },
      { code: 'NS', name: 'Negeri Sembilan' },
      { code: 'PH', name: 'Pahang' },
      { code: 'PG', name: 'Penang' },
      { code: 'PR', name: 'Perak' },
      { code: 'PL', name: 'Perlis' },
      { code: 'PJ', name: 'Putrajaya' },
      { code: 'SB', name: 'Sabah' },
      { code: 'SW', name: 'Sarawak' },
      { code: 'SL', name: 'Selangor' },
      { code: 'TR', name: 'Terengganu' }
    ]
  },
  SA: {
    name: 'Saudi Arabia',
    code: 'SA',
    currency: 'USD',
    symbol: '$',
    gateway: 'paypal',
    states: [
      { code: 'RI', name: 'Riyadh' },
      { code: 'MK', name: 'Makkah' },
      { code: 'MD', name: 'Madinah' },
      { code: 'EP', name: 'Eastern Province' },
      { code: 'AS', name: 'Asir' },
      { code: 'TB', name: 'Tabuk' },
      { code: 'HA', name: 'Hail' },
      { code: 'NB', name: 'Northern Borders' },
      { code: 'JZ', name: 'Jazan' },
      { code: 'NJ', name: 'Najran' },
      { code: 'BA', name: 'Al Bahah' },
      { code: 'JF', name: 'Al Jawf' },
      { code: 'QS', name: 'Qassim' }
    ]
  },
  DE: {
    name: 'Germany',
    code: 'DE',
    currency: 'USD',
    symbol: '$',
    gateway: 'paypal',
    states: [
      { code: 'BW', name: 'Baden-Württemberg' },
      { code: 'BY', name: 'Bavaria' },
      { code: 'BE', name: 'Berlin' },
      { code: 'BR', name: 'Brandenburg' },
      { code: 'HB', name: 'Bremen' },
      { code: 'HH', name: 'Hamburg' },
      { code: 'HE', name: 'Hesse' },
      { code: 'MV', name: 'Mecklenburg-Vorpommern' },
      { code: 'NI', name: 'Lower Saxony' },
      { code: 'NW', name: 'North Rhine-Westphalia' },
      { code: 'RP', name: 'Rhineland-Palatinate' },
      { code: 'SL', name: 'Saarland' },
      { code: 'SN', name: 'Saxony' },
      { code: 'ST', name: 'Saxony-Anhalt' },
      { code: 'SH', name: 'Schleswig-Holstein' },
      { code: 'TH', name: 'Thuringia' }
    ]
  },
  FR: {
    name: 'France',
    code: 'FR',
    currency: 'USD',
    symbol: '$',
    gateway: 'paypal',
    states: [
      { code: 'IF', name: 'Île-de-France' },
      { code: 'CV', name: 'Centre-Val de Loire' },
      { code: 'BF', name: 'Bourgogne-Franche-Comté' },
      { code: 'NO', name: 'Normandy' },
      { code: 'HF', name: 'Hauts-de-France' },
      { code: 'GE', name: 'Grand Est' },
      { code: 'PL', name: 'Pays de la Loire' },
      { code: 'BR', name: 'Brittany' },
      { code: 'NA', name: 'Nouvelle-Aquitaine' },
      { code: 'OC', name: 'Occitanie' },
      { code: 'AR', name: 'Auvergne-Rhône-Alpes' },
      { code: 'PA', name: "Provence-Alpes-Côte d'Azur" },
      { code: 'CO', name: 'Corsica' }
    ]
  },
  NZ: {
    name: 'New Zealand',
    code: 'NZ',
    currency: 'USD',
    symbol: '$',
    gateway: 'paypal',
    states: [
      { code: 'AK', name: 'Auckland' },
      { code: 'BP', name: 'Bay of Plenty' },
      { code: 'CA', name: 'Canterbury' },
      { code: 'GI', name: 'Gisborne' },
      { code: 'HB', name: "Hawke's Bay" },
      { code: 'MW', name: 'Manawatū-Whanganui' },
      { code: 'MB', name: 'Marlborough' },
      { code: 'NS', name: 'Nelson' },
      { code: 'NL', name: 'Northland' },
      { code: 'OT', name: 'Otago' },
      { code: 'SL', name: 'Southland' },
      { code: 'TK', name: 'Taranaki' },
      { code: 'TA', name: 'Tasman' },
      { code: 'WK', name: 'Waikato' },
      { code: 'WG', name: 'Wellington' },
      { code: 'WC', name: 'West Coast' }
    ]
  },
  ZA: {
    name: 'South Africa',
    code: 'ZA',
    currency: 'USD',
    symbol: '$',
    gateway: 'paypal',
    states: [
      { code: 'EC', name: 'Eastern Cape' },
      { code: 'FS', name: 'Free State' },
      { code: 'GP', name: 'Gauteng' },
      { code: 'KN', name: 'KwaZulu-Natal' },
      { code: 'LP', name: 'Limpopo' },
      { code: 'MP', name: 'Mpumalanga' },
      { code: 'NC', name: 'Northern Cape' },
      { code: 'NW', name: 'North West' },
      { code: 'WC', name: 'Western Cape' }
    ]
  },
  PH: {
    name: 'Philippines',
    code: 'PH',
    currency: 'USD',
    symbol: '$',
    gateway: 'paypal',
    states: [
      { code: 'MM', name: 'Metro Manila' },
      { code: 'IL', name: 'Ilocos Region' },
      { code: 'CV', name: 'Cagayan Valley' },
      { code: 'CL', name: 'Central Luzon' },
      { code: 'CA', name: 'CALABARZON' },
      { code: 'MI', name: 'MIMAROPA' },
      { code: 'BI', name: 'Bicol Region' },
      { code: 'WV', name: 'Western Visayas' },
      { code: 'CV', name: 'Central Visayas' },
      { code: 'EV', name: 'Eastern Visayas' },
      { code: 'ZP', name: 'Zamboanga Peninsula' },
      { code: 'NO', name: 'Northern Mindanao' },
      { code: 'DA', name: 'Davao Region' },
      { code: 'SO', name: 'SOCCSKSARGEN' },
      { code: 'CA', name: 'Caraga' },
      { code: 'AR', name: 'BARMM' },
      { code: 'CO', name: 'Cordillera' }
    ]
  },
  JP: {
    name: 'Japan',
    code: 'JP',
    currency: 'USD',
    symbol: '$',
    gateway: 'paypal',
    states: [
      { code: 'TK', name: 'Tokyo' },
      { code: 'OS', name: 'Osaka' },
      { code: 'KY', name: 'Kyoto' },
      { code: 'HO', name: 'Hokkaido' },
      { code: 'AI', name: 'Aichi' },
      { code: 'KA', name: 'Kanagawa' },
      { code: 'SA', name: 'Saitama' },
      { code: 'CH', name: 'Chiba' },
      { code: 'HY', name: 'Hyogo' },
      { code: 'FU', name: 'Fukuoka' }
    ]
  },
  KR: {
    name: 'South Korea',
    code: 'KR',
    currency: 'USD',
    symbol: '$',
    gateway: 'paypal',
    states: [
      { code: 'SE', name: 'Seoul' },
      { code: 'BS', name: 'Busan' },
      { code: 'DG', name: 'Daegu' },
      { code: 'IC', name: 'Incheon' },
      { code: 'GJ', name: 'Gwangju' },
      { code: 'DJ', name: 'Daejeon' },
      { code: 'US', name: 'Ulsan' },
      { code: 'GG', name: 'Gyeonggi' },
      { code: 'GW', name: 'Gangwon' },
      { code: 'CB', name: 'North Chungcheong' },
      { code: 'CN', name: 'South Chungcheong' },
      { code: 'JB', name: 'North Jeolla' },
      { code: 'JN', name: 'South Jeolla' },
      { code: 'GB', name: 'North Gyeongsang' },
      { code: 'GN', name: 'South Gyeongsang' },
      { code: 'JJ', name: 'Jeju' }
    ]
  },
  TH: {
    name: 'Thailand',
    code: 'TH',
    currency: 'USD',
    symbol: '$',
    gateway: 'paypal',
    states: [
      { code: 'BK', name: 'Bangkok' },
      { code: 'CM', name: 'Chiang Mai' },
      { code: 'PK', name: 'Phuket' },
      { code: 'PY', name: 'Pattaya' },
      { code: 'KR', name: 'Krabi' },
      { code: 'SM', name: 'Samui' }
    ]
  },
  ID: {
    name: 'Indonesia',
    code: 'ID',
    currency: 'USD',
    symbol: '$',
    gateway: 'paypal',
    states: [
      { code: 'JK', name: 'Jakarta' },
      { code: 'JB', name: 'West Java' },
      { code: 'JT', name: 'Central Java' },
      { code: 'JI', name: 'East Java' },
      { code: 'BA', name: 'Bali' },
      { code: 'SU', name: 'North Sumatra' },
      { code: 'RI', name: 'Riau' },
      { code: 'SS', name: 'South Sumatra' }
    ]
  }
};

export const getPricing = (countryCode, planType) => {
  const country = COUNTRIES[countryCode] || COUNTRIES.US;
  
  const prices = {
    individual: country.currency === 'INR' ? 99 : 3,
    family: country.currency === 'INR' ? 299 : 6
  };
  
  return {
    price: prices[planType],
    currency: country.currency,
    symbol: country.symbol
  };
};

export const getDiscountedPrice = (price, planType) => {
  const discount = planType === 'individual' ? 0.10 : 0.20;
  return price * (1 - discount);
};

export const getAmbassadorCommission = (price, planType) => {
  const rate = planType === 'individual' ? 0.15 : 0.25;
  return price * rate;
};

export const generateReferralCode = (countryCode, stateCode, number) => {
  return `${countryCode} ${stateCode} ${number.toString().padStart(5, '0')}`;
};