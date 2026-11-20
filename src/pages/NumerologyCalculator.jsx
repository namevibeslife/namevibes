import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator } from 'lucide-react';
import i18n from 'i18next';
import { relationLabel } from '../i18n/poster';
import { useTranslation } from 'react-i18next';

const RELATIONS = [
  'Self', 'Father', 'Mother', 'Son', 'Daughter', 'Brother', 'Sister',
  'Husband', 'Wife', 'Partner', 'Friend', 'Uncle', 'Aunt', 'Grandfather',
  'Grandmother', 'Cousin', 'Company Name', 'Brand Name', 'Pet Name', 'Other'
];

// Chaldean system (1-8, no 9)
const chaldeanValues = {
  'A': 1, 'I': 1, 'J': 1, 'Q': 1, 'Y': 1,
  'B': 2, 'K': 2, 'R': 2,
  'C': 3, 'G': 3, 'L': 3, 'S': 3,
  'D': 4, 'M': 4, 'T': 4,
  'E': 5, 'H': 5, 'N': 5, 'X': 5,
  'U': 6, 'V': 6, 'W': 6,
  'O': 7, 'Z': 7,
  'F': 8, 'P': 8
};

// Pythagorean system (1-9)
const pythagoreanValues = {
  'A': 1, 'J': 1, 'S': 1,
  'B': 2, 'K': 2, 'T': 2,
  'C': 3, 'L': 3, 'U': 3,
  'D': 4, 'M': 4, 'V': 4,
  'E': 5, 'N': 5, 'W': 5,
  'F': 6, 'O': 6, 'X': 6,
  'G': 7, 'P': 7, 'Y': 7,
  'H': 8, 'Q': 8, 'Z': 8,
  'I': 9, 'R': 9
};

const vowels = ['A', 'E', 'I', 'O', 'U'];

export default function NumerologyCalculator() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [relation, setRelation] = useState('Self');
  const [results, setResults] = useState(null);

  const reduceToSingle = (num) => {
    // Master numbers: 11, 22, 33
    if (num === 11 || num === 22 || num === 33) return num;
    
    while (num > 9) {
      num = num.toString().split('').reduce((sum, digit) => sum + parseInt(digit), 0);
    }
    return num;
  };

  const calculateDestinyNumber = (fullName) => {
    const cleanName = fullName.toUpperCase().replace(/[^A-Z]/g, '');
    let sum = 0;
    
    for (let char of cleanName) {
      sum += chaldeanValues[char] || 0;
    }
    
    return reduceToSingle(sum);
  };

  const calculateSoulUrgeNumber = (fullName) => {
    const cleanName = fullName.toUpperCase().replace(/[^A-Z]/g, '');
    let sum = 0;
    
    for (let char of cleanName) {
      if (vowels.includes(char)) {
        sum += pythagoreanValues[char] || 0;
      }
    }
    
    return reduceToSingle(sum);
  };

  const calculatePersonalityNumber = (fullName) => {
    const cleanName = fullName.toUpperCase().replace(/[^A-Z]/g, '');
    let sum = 0;
    
    for (let char of cleanName) {
      if (!vowels.includes(char)) {
        sum += pythagoreanValues[char] || 0;
      }
    }
    
    return reduceToSingle(sum);
  };

  const calculateLifePathNumber = (dateString) => {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    let sum = day + month + year;
    return reduceToSingle(sum);
  };

  const calculateExpressionNumber = (fullName) => {
    const cleanName = fullName.toUpperCase().replace(/[^A-Z]/g, '');
    let sum = 0;
    
    for (let char of cleanName) {
      sum += pythagoreanValues[char] || 0;
    }
    
    return reduceToSingle(sum);
  };

  const getNumberMeaning = (number, type) => i18n.t(`numerology.meaning.${number}.${type}`, { defaultValue: i18n.t('numerology.meaning.default') });

  const handleCalculate = () => {
    if (!firstName || !lastName) {
      alert(t('numerologyPage.needName'));
      return;
    }

    const fullName = `${firstName} ${middleName} ${lastName}`.trim();
    
    const destinyNumber = calculateDestinyNumber(fullName);
    const soulUrgeNumber = calculateSoulUrgeNumber(fullName);
    const personalityNumber = calculatePersonalityNumber(fullName);
    const expressionNumber = calculateExpressionNumber(fullName);
    const lifePathNumber = birthDate ? calculateLifePathNumber(birthDate) : null;

    setResults({
      fullName,
      relation,
      destinyNumber,
      soulUrgeNumber,
      personalityNumber,
      expressionNumber,
      lifePathNumber
    });
  };

  if (results) {
    return (
      <div className="min-h-screen site-background">

        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Header Card */}
          <div className="bg-paper rounded-xl shadow-lg p-6 mb-6">
            <div className="text-center">
              <div className="text-sm text-brand-600 font-semibold mb-1">{relationLabel(results.relation, t)}</div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">{results.fullName}</h2>
              <p className="text-gray-600 text-sm italic">{t('numerologyPage.n001')}</p>
            </div>
          </div>

          {/* Numbers Grid */}
          <div className="space-y-4">
            {/* Destiny Number */}
            <div className="bg-paper rounded-xl shadow-lg p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-500 to-brand-500 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">{results.destinyNumber}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{t('numerologyPage.n002')}</h3>
                  <p className="text-xs text-gray-600">{t('numerologyPage.n003')}</p>
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed">
                {getNumberMeaning(results.destinyNumber, 'destiny')}
              </p>
            </div>

            {/* Life Path Number */}
            {results.lifePathNumber && (
              <div className="bg-paper rounded-xl shadow-lg p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-ocean-500 to-cyan-500 flex items-center justify-center">
                    <span className="text-3xl font-bold text-white">{results.lifePathNumber}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{t('numerologyPage.n004')}</h3>
                    <p className="text-xs text-gray-600">{t('numerologyPage.n005')}</p>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  {getNumberMeaning(results.lifePathNumber, 'lifePath')}
                </p>
              </div>
            )}

            {/* Soul Urge Number */}
            <div className="bg-paper rounded-xl shadow-lg p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-500 to-rose-500 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">{results.soulUrgeNumber}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{t('numerologyPage.n006')}</h3>
                  <p className="text-xs text-gray-600">{t('numerologyPage.n007')}</p>
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed">
                {getNumberMeaning(results.soulUrgeNumber, 'soulUrge')}
              </p>
            </div>

            {/* Personality Number */}
            <div className="bg-paper rounded-xl shadow-lg p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">{results.personalityNumber}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{t('numerologyPage.n008')}</h3>
                  <p className="text-xs text-gray-600">{t('numerologyPage.n009')}</p>
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed">
                {getNumberMeaning(results.personalityNumber, 'personality')}
              </p>
            </div>

            {/* Expression Number */}
            <div className="bg-paper rounded-xl shadow-lg p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">{results.expressionNumber}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{t('numerologyPage.n010')}</h3>
                  <p className="text-xs text-gray-600">{t('numerologyPage.n011')}</p>
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed">
                {getNumberMeaning(results.expressionNumber, 'expression')}
              </p>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-gradient-to-r from-brand-50 to-ocean-50 rounded-xl p-5 border-2 border-brand-200">
            <h4 className="text-lg font-bold text-brand-800 mb-2">{t('numerologyPage.n012')}</h4>
            <p className="text-sm text-gray-700 leading-relaxed">{t('numerologyPage.n013')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen site-background">

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-paper rounded-xl shadow-lg p-6">
          <div className="text-center mb-6">
            <Calculator className="w-16 h-16 mx-auto mb-3 text-brand-600" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('numerologyPage.n014')}</h2>
            <p className="text-gray-600 text-sm">{t('numerologyPage.n015')}</p>
          </div>

          <div className="space-y-4">
            {/* Relation */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('numerologyPage.n016')}</label>
              <select
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
              >
                {RELATIONS.map(rel => (
                  <option key={rel} value={rel}>{relationLabel(rel, t)}</option>
                ))}
              </select>
            </div>

            {/* First Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('numerologyPage.n017')}</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t('numerologyPage.n032')}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
              />
            </div>

            {/* Middle Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('numerologyPage.n018')}</label>
              <input
                type="text"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                placeholder={t('numerologyPage.n033')}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('numerologyPage.n019')}</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t('numerologyPage.n034')}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
              />
            </div>

            {/* Birth Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('numerologyPage.n020')}</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
              />
            </div>

            {/* Calculate Button */}
            <button
              onClick={handleCalculate}
              className="w-full bg-gradient-to-r from-brand-600 to-ocean-600 text-white py-4 rounded-xl font-bold text-lg hover:from-brand-700 hover:to-ocean-700 transition transform active:scale-95"
            >{t('numerologyPage.n021')}</button>
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 bg-paper rounded-xl shadow-lg p-5">
          <h3 className="text-lg font-bold text-gray-800 mb-3">{t('numerologyPage.n022')}</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex gap-2">
              <span className="text-brand-600 font-bold">•</span>
              <span><strong>{t('numerologyPage.n023')}</strong>{" "}{t('numerologyPage.n024')}</span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand-600 font-bold">•</span>
              <span><strong>{t('numerologyPage.n025')}</strong>{" "}{t('numerologyPage.n026')}</span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand-600 font-bold">•</span>
              <span><strong>{t('numerologyPage.n027')}</strong>{" "}{t('numerologyPage.n028')}</span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand-600 font-bold">•</span>
              <span><strong>{t('numerologyPage.n029')}</strong>{" "}{t('numerologyPage.n030')}</span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand-600 font-bold">•</span>
              <span><strong>{t('numerologyPage.n031')}</strong>{" "}{t('numerologyPage.n011')}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}