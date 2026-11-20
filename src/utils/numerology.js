// Chaldean Numerology System
import i18n from 'i18next';
const CHALDEAN_VALUES = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 8, G: 3, H: 5, I: 1,
  J: 1, K: 2, L: 3, M: 4, N: 5, O: 7, P: 8, Q: 1, R: 2,
  S: 3, T: 4, U: 6, V: 6, W: 6, X: 5, Y: 1, Z: 7
};

function reduceToSingleDigit(num) {
  // Keep master numbers 11, 22, 33
  if ([11, 22, 33].includes(num)) return num;
  
  while (num > 9) {
    num = num.toString().split('').reduce((sum, digit) => sum + parseInt(digit), 0);
  }
  return num;
}

export function calculateNameNumber(name) {
  const cleanName = name.toUpperCase().replace(/[^A-Z]/g, '');
  let sum = 0;
  
  for (let char of cleanName) {
    sum += CHALDEAN_VALUES[char] || 0;
  }
  
  return reduceToSingleDigit(sum);
}

export function calculateLifePathNumber(dob) {
  const day = reduceToSingleDigit(dob.getDate());
  const month = reduceToSingleDigit(dob.getMonth() + 1);
  const year = reduceToSingleDigit(dob.getFullYear());
  
  const total = day + month + year;
  return reduceToSingleDigit(total);
}

export function calculateDestinyNumber(lifePathNumber, nameNumber) {
  const total = lifePathNumber + nameNumber;
  return reduceToSingleDigit(total);
}

export function getNumerologyInterpretation(number) {
  return i18n.t(`numerology.interpretation.${number}`, { defaultValue: i18n.t('numerology.interpretation.default') });
}

export function getFullNumerology(firstName, middleName, lastName, dob) {
  const fullName = `${firstName} ${middleName} ${lastName}`.trim();
  const nameNumber = calculateNameNumber(fullName);
  const lifePathNumber = calculateLifePathNumber(dob);
  const destinyNumber = calculateDestinyNumber(lifePathNumber, nameNumber);
  
  return {
    nameNumber,
    lifePathNumber,
    destinyNumber,
    nameInterpretation: getNumerologyInterpretation(nameNumber),
    lifePathInterpretation: getNumerologyInterpretation(lifePathNumber),
    destinyInterpretation: getNumerologyInterpretation(destinyNumber)
  };
}