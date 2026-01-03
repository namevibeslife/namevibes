// Simplified Nakshatra calculation based on birth date
// Note: Full calculation requires exact birth time and location
const NAKSHATRAS = [
  { name: 'Ashwini', syllables: ['Chu', 'Che', 'Cho', 'La'] },
  { name: 'Bharani', syllables: ['Li', 'Lu', 'Le', 'Lo'] },
  { name: 'Krittika', syllables: ['Aa', 'Ee', 'Oo', 'Ae'] },
  { name: 'Rohini', syllables: ['O', 'Va', 'Vi', 'Vu'] },
  { name: 'Mrigashira', syllables: ['Ve', 'Vo', 'Ka', 'Ki'] },
  { name: 'Ardra', syllables: ['Ku', 'Gha', 'Nga', 'Chha'] },
  { name: 'Punarvasu', syllables: ['Ke', 'Ko', 'Ha', 'Hi'] },
  { name: 'Pushya', syllables: ['Hu', 'He', 'Ho', 'Da'] },
  { name: 'Ashlesha', syllables: ['Di', 'Du', 'De', 'Do'] },
  { name: 'Magha', syllables: ['Ma', 'Mi', 'Mu', 'Me'] },
  { name: 'Purva Phalguni', syllables: ['Mo', 'Ta', 'Ti', 'Tu'] },
  { name: 'Uttara Phalguni', syllables: ['Te', 'To', 'Pa', 'Pi'] },
  { name: 'Hasta', syllables: ['Pu', 'Sha', 'Na', 'Tha'] },
  { name: 'Chitra', syllables: ['Pe', 'Po', 'Ra', 'Ri'] },
  { name: 'Swati', syllables: ['Ru', 'Re', 'Ro', 'Ta'] },
  { name: 'Vishakha', syllables: ['Ti', 'Tu', 'Te', 'To'] },
  { name: 'Anuradha', syllables: ['Na', 'Ni', 'Nu', 'Ne'] },
  { name: 'Jyeshtha', syllables: ['No', 'Ya', 'Yi', 'Yu'] },
  { name: 'Mula', syllables: ['Ye', 'Yo', 'Bha', 'Bhi'] },
  { name: 'Purva Ashadha', syllables: ['Bhu', 'Dha', 'Pha', 'Dha'] },
  { name: 'Uttara Ashadha', syllables: ['Bhe', 'Bho', 'Ja', 'Ji'] },
  { name: 'Shravana', syllables: ['Ju', 'Je', 'Jo', 'Gha'] },
  { name: 'Dhanishta', syllables: ['Ga', 'Gi', 'Gu', 'Ge'] },
  { name: 'Shatabhisha', syllables: ['Go', 'Sa', 'Si', 'Su'] },
  { name: 'Purva Bhadrapada', syllables: ['Se', 'So', 'Dha', 'Di'] },
  { name: 'Uttara Bhadrapada', syllables: ['Du', 'Tha', 'Jha', 'Na'] },
  { name: 'Revati', syllables: ['De', 'Do', 'Cha', 'Chi'] }
];

export function getNakshatraFromDOB(dob) {
  // Simplified: Use day of year to approximate nakshatra
  const dayOfYear = Math.floor((dob - new Date(dob.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
  const nakshatraIndex = Math.floor((dayOfYear / 365) * 27);
  
  return NAKSHATRAS[nakshatraIndex];
}

export function checkNameSyllableMatch(firstName, nakshatra) {
  const firstTwoLetters = firstName.substring(0, 2).toLowerCase();
  
  for (let syllable of nakshatra.syllables) {
    if (firstTwoLetters.startsWith(syllable.toLowerCase())) {
      return {
        matches: true,
        syllable: syllable
      };
    }
  }
  
  return {
    matches: false,
    syllable: null
  };
}

export function getHinduAstrologyAnalysis(firstName, dob) {
  const nakshatra = getNakshatraFromDOB(dob);
  const syllableMatch = checkNameSyllableMatch(firstName, nakshatra);
  
  return {
    nakshatra: nakshatra.name,
    recommendedSyllables: nakshatra.syllables,
    nameMatchesSyllable: syllableMatch.matches,
    matchingSyllable: syllableMatch.syllable,
    message: syllableMatch.matches 
      ? `✅ "${firstName}" starts with "${syllableMatch.syllable}" - Perfect alignment with your Nakshatra!`
      : `ℹ️ For your birth date, names starting with ${nakshatra.syllables.join(', ')} are considered auspicious.`
  };
}