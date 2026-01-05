import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calculator } from 'lucide-react';

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

  const getNumberMeaning = (number, type) => {
    const meanings = {
      1: {
        destiny: 'Natural leader, independent, ambitious. You\'re meant to pioneer new paths.',
        soulUrge: 'Deep desire for independence and leadership. You crave recognition.',
        personality: 'Others see you as confident, assertive, and self-reliant.',
        lifePath: 'Your journey is about developing leadership and independence.',
        expression: 'You express yourself through innovation and individuality.'
      },
      2: {
        destiny: 'Peacemaker, diplomat, cooperative. You bring harmony to situations.',
        soulUrge: 'You desire peace, partnership, and emotional connections.',
        personality: 'Others perceive you as gentle, diplomatic, and supportive.',
        lifePath: 'Your path involves cooperation, relationships, and balance.',
        expression: 'You express through empathy, mediation, and partnerships.'
      },
      3: {
        destiny: 'Creative communicator, artist, entertainer. You inspire through expression.',
        soulUrge: 'You crave creative expression and joyful connections.',
        personality: 'Others see you as charming, creative, and expressive.',
        lifePath: 'Your journey centers on creativity and self-expression.',
        expression: 'You express through art, words, and creative pursuits.'
      },
      4: {
        destiny: 'Builder, organizer, practical. You create stable foundations.',
        soulUrge: 'You desire security, order, and tangible achievements.',
        personality: 'Others view you as reliable, hardworking, and grounded.',
        lifePath: 'Your path involves building lasting structures and systems.',
        expression: 'You express through practical work and organization.'
      },
      5: {
        destiny: 'Freedom seeker, adventurer, change agent. You thrive on variety.',
        soulUrge: 'You crave freedom, adventure, and new experiences.',
        personality: 'Others see you as dynamic, adventurous, and unpredictable.',
        lifePath: 'Your journey is about embracing change and freedom.',
        expression: 'You express through exploration and adaptability.'
      },
      6: {
        destiny: 'Nurturer, caregiver, teacher. You create harmony and beauty.',
        soulUrge: 'You desire to nurture, love, and create beautiful environments.',
        personality: 'Others perceive you as caring, responsible, and supportive.',
        lifePath: 'Your path involves service, family, and community.',
        expression: 'You express through caring, teaching, and healing.'
      },
      7: {
        destiny: 'Seeker, analyst, mystic. You search for deeper truths.',
        soulUrge: 'You crave knowledge, solitude, and spiritual understanding.',
        personality: 'Others see you as mysterious, intellectual, and reserved.',
        lifePath: 'Your journey involves spiritual growth and inner wisdom.',
        expression: 'You express through analysis, research, and spirituality.'
      },
      8: {
        destiny: 'Powerhouse, executive, manifester. You achieve material success.',
        soulUrge: 'You desire power, success, and material accomplishment.',
        personality: 'Others view you as powerful, ambitious, and authoritative.',
        lifePath: 'Your path involves mastering material world and leadership.',
        expression: 'You express through business, management, and achievement.'
      },
      9: {
        destiny: 'Humanitarian, teacher, healer. You serve humanity.',
        soulUrge: 'You desire to help humanity and create positive change.',
        personality: 'Others see you as compassionate, wise, and selfless.',
        lifePath: 'Your journey is about service, compassion, and completion.',
        expression: 'You express through humanitarian work and universal love.'
      },
      11: {
        destiny: 'Master teacher, spiritual messenger. You inspire and enlighten.',
        soulUrge: 'You desire spiritual illumination and to inspire others.',
        personality: 'Others see you as inspirational and spiritually gifted.',
        lifePath: 'Your path is spiritual leadership and enlightenment.',
        expression: 'You express through intuition and spiritual teaching.'
      },
      22: {
        destiny: 'Master builder. You manifest dreams into reality on large scale.',
        soulUrge: 'You desire to build something lasting and significant.',
        personality: 'Others view you as capable of achieving the impossible.',
        lifePath: 'Your path involves manifesting grand visions into reality.',
        expression: 'You express through building systems that serve many.'
      },
      33: {
        destiny: 'Master teacher, healer of healers. You uplift humanity.',
        soulUrge: 'You desire to nurture and heal on a universal scale.',
        personality: 'Others see you as a beacon of unconditional love.',
        lifePath: 'Your path is about selfless service and universal love.',
        expression: 'You express through compassionate service to all.'
      }
    };

    return meanings[number]?.[type] || 'Unique energy with special significance.';
  };

  const handleCalculate = () => {
    if (!firstName || !lastName) {
      alert('Please enter at least first and last name');
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setResults(null)}
                className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
              >
                <ArrowLeft size={20} />
                Back
              </button>
              <h1 className="text-lg font-bold text-gray-800">Numerology Results</h1>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Header Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="text-center">
              <div className="text-sm text-purple-600 font-semibold mb-1">{results.relation}</div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">{results.fullName}</h2>
              <p className="text-gray-600 text-sm italic">
                "Every number carries a unique vibration and meaning"
              </p>
            </div>
          </div>

          {/* Numbers Grid */}
          <div className="space-y-4">
            {/* Destiny Number */}
            <div className="bg-white rounded-xl shadow-lg p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">{results.destinyNumber}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Destiny Number</h3>
                  <p className="text-xs text-gray-600">Your life's purpose and path</p>
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed">
                {getNumberMeaning(results.destinyNumber, 'destiny')}
              </p>
            </div>

            {/* Life Path Number */}
            {results.lifePathNumber && (
              <div className="bg-white rounded-xl shadow-lg p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <span className="text-3xl font-bold text-white">{results.lifePathNumber}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Life Path Number</h3>
                    <p className="text-xs text-gray-600">Your journey and lessons</p>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  {getNumberMeaning(results.lifePathNumber, 'lifePath')}
                </p>
              </div>
            )}

            {/* Soul Urge Number */}
            <div className="bg-white rounded-xl shadow-lg p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">{results.soulUrgeNumber}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Soul Urge Number</h3>
                  <p className="text-xs text-gray-600">Your heart's deepest desires</p>
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed">
                {getNumberMeaning(results.soulUrgeNumber, 'soulUrge')}
              </p>
            </div>

            {/* Personality Number */}
            <div className="bg-white rounded-xl shadow-lg p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">{results.personalityNumber}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Personality Number</h3>
                  <p className="text-xs text-gray-600">How others see you</p>
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed">
                {getNumberMeaning(results.personalityNumber, 'personality')}
              </p>
            </div>

            {/* Expression Number */}
            <div className="bg-white rounded-xl shadow-lg p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">{results.expressionNumber}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Expression Number</h3>
                  <p className="text-xs text-gray-600">Your natural talents</p>
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed">
                {getNumberMeaning(results.expressionNumber, 'expression')}
              </p>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-5 border-2 border-purple-200">
            <h4 className="text-lg font-bold text-purple-800 mb-2">✨ Understanding Your Numbers</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              These numbers reveal different aspects of your personality and life path. 
              Use them as guidance to understand your strengths, challenges, and life purpose.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
            >
              <ArrowLeft size={20} />
              Back
            </button>
            <h1 className="text-lg font-bold text-gray-800">Numerology Calculator</h1>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-center mb-6">
            <Calculator className="w-16 h-16 mx-auto mb-3 text-purple-600" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Discover Your Numbers
            </h2>
            <p className="text-gray-600 text-sm">
              Enter details below to calculate your numerology profile
            </p>
          </div>

          <div className="space-y-4">
            {/* Relation */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                This is for:
              </label>
              <select
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none"
              >
                {RELATIONS.map(rel => (
                  <option key={rel} value={rel}>{rel}</option>
                ))}
              </select>
            </div>

            {/* First Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                First Name *
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter first name"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none"
              />
            </div>

            {/* Middle Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Middle Name (Optional)
              </label>
              <input
                type="text"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                placeholder="Enter middle name"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none"
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Last Name *
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter last name"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none"
              />
            </div>

            {/* Birth Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Birth Date (Optional - for Life Path Number)
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none"
              />
            </div>

            {/* Calculate Button */}
            <button
              onClick={handleCalculate}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:from-purple-700 hover:to-blue-700 transition transform active:scale-95"
            >
              Calculate My Numbers
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 bg-white rounded-xl shadow-lg p-5">
          <h3 className="text-lg font-bold text-gray-800 mb-3">📖 What You'll Discover</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex gap-2">
              <span className="text-purple-600 font-bold">•</span>
              <span><strong>Destiny Number:</strong> Your life purpose and mission</span>
            </li>
            <li className="flex gap-2">
              <span className="text-purple-600 font-bold">•</span>
              <span><strong>Life Path Number:</strong> Your journey and key lessons</span>
            </li>
            <li className="flex gap-2">
              <span className="text-purple-600 font-bold">•</span>
              <span><strong>Soul Urge Number:</strong> Your deepest desires</span>
            </li>
            <li className="flex gap-2">
              <span className="text-purple-600 font-bold">•</span>
              <span><strong>Personality Number:</strong> How others perceive you</span>
            </li>
            <li className="flex gap-2">
              <span className="text-purple-600 font-bold">•</span>
              <span><strong>Expression Number:</strong> Your natural talents</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}