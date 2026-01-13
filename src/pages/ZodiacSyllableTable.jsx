import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserNav from '../components/UserNav';
import { ChevronDown } from 'lucide-react';

export default function ZodiacSyllableTable() {
  const navigate = useNavigate();
  const [selectedSign, setSelectedSign] = useState(null);
  const [system, setSystem] = useState('western'); // 'western' or 'vedic'

  const westernZodiac = [
    {
      sign: 'Aries',
      symbol: '♈',
      dates: 'Mar 21 - Apr 19',
      element: 'Fire',
      ruling: 'Mars',
      syllables: ['A', 'M', 'L', 'CH'],
      nameExamples: 'Amelia, Alex, Michael, Lucas, Charlotte',
      luckyNumbers: '1, 9',
      colors: 'Red, Scarlet',
      traits: 'Bold, ambitious, confident, energetic',
      bestFor: 'Leadership, entrepreneurship, sports'
    },
    {
      sign: 'Taurus',
      symbol: '♉',
      dates: 'Apr 20 - May 20',
      element: 'Earth',
      ruling: 'Venus',
      syllables: ['B', 'V', 'U', 'W'],
      nameExamples: 'Benjamin, Victoria, William, Bella, Uma',
      luckyNumbers: '2, 6',
      colors: 'Pink, Green',
      traits: 'Reliable, patient, practical, devoted',
      bestFor: 'Finance, art, fashion, agriculture'
    },
    {
      sign: 'Gemini',
      symbol: '♊',
      dates: 'May 21 - Jun 20',
      element: 'Air',
      ruling: 'Mercury',
      syllables: ['K', 'G', 'C', 'Q'],
      nameExamples: 'Kate, Gabriel, Cameron, Quinn, Chloe',
      luckyNumbers: '3, 5',
      colors: 'Yellow, Light Green',
      traits: 'Curious, adaptable, communicative, witty',
      bestFor: 'Media, teaching, sales, writing'
    },
    {
      sign: 'Cancer',
      symbol: '♋',
      dates: 'Jun 21 - Jul 22',
      element: 'Water',
      ruling: 'Moon',
      syllables: ['H', 'D', 'N'],
      nameExamples: 'Hannah, Daniel, Noah, Diana, Harper',
      luckyNumbers: '2, 7',
      colors: 'White, Silver',
      traits: 'Nurturing, intuitive, emotional, protective',
      bestFor: 'Healthcare, hospitality, counseling'
    },
    {
      sign: 'Leo',
      symbol: '♌',
      dates: 'Jul 23 - Aug 22',
      element: 'Fire',
      ruling: 'Sun',
      syllables: ['M', 'T', 'L'],
      nameExamples: 'Matthew, Mia, Thomas, Lily, Theodore',
      luckyNumbers: '1, 4',
      colors: 'Gold, Orange',
      traits: 'Confident, generous, charismatic, dramatic',
      bestFor: 'Entertainment, politics, management'
    },
    {
      sign: 'Virgo',
      symbol: '♍',
      dates: 'Aug 23 - Sep 22',
      element: 'Earth',
      ruling: 'Mercury',
      syllables: ['P', 'T', 'N'],
      nameExamples: 'Peter, Penelope, Nathan, Tessa, Nora',
      luckyNumbers: '3, 5',
      colors: 'Green, Brown',
      traits: 'Analytical, practical, perfectionist, helpful',
      bestFor: 'Healthcare, analysis, service industry'
    },
    {
      sign: 'Libra',
      symbol: '♎',
      dates: 'Sep 23 - Oct 22',
      element: 'Air',
      ruling: 'Venus',
      syllables: ['R', 'T', 'L'],
      nameExamples: 'Rose, Ryan, Tiffany, Laura, Rafael',
      luckyNumbers: '2, 6',
      colors: 'Blue, Pink',
      traits: 'Diplomatic, fair, social, harmonious',
      bestFor: 'Law, diplomacy, design, partnerships'
    },
    {
      sign: 'Scorpio',
      symbol: '♏',
      dates: 'Oct 23 - Nov 21',
      element: 'Water',
      ruling: 'Pluto',
      syllables: ['N', 'Y', 'O'],
      nameExamples: 'Nicole, Oscar, Yara, Nathan, Oliver',
      luckyNumbers: '9, 18',
      colors: 'Red, Maroon',
      traits: 'Passionate, mysterious, intense, transformative',
      bestFor: 'Research, psychology, investigation'
    },
    {
      sign: 'Sagittarius',
      symbol: '♐',
      dates: 'Nov 22 - Dec 21',
      element: 'Fire',
      ruling: 'Jupiter',
      syllables: ['F', 'P', 'B', 'D'],
      nameExamples: 'Felix, Bella, Patrick, Freya, David',
      luckyNumbers: '3, 9',
      colors: 'Purple, Yellow',
      traits: 'Optimistic, adventurous, philosophical, free',
      bestFor: 'Travel, education, publishing'
    },
    {
      sign: 'Capricorn',
      symbol: '♑',
      dates: 'Dec 22 - Jan 19',
      element: 'Earth',
      ruling: 'Saturn',
      syllables: ['J', 'K', 'G'],
      nameExamples: 'Jack, Katherine, George, Julia, Kevin',
      luckyNumbers: '8, 26',
      colors: 'Black, Brown',
      traits: 'Disciplined, ambitious, responsible, patient',
      bestFor: 'Business, real estate, governance'
    },
    {
      sign: 'Aquarius',
      symbol: '♒',
      dates: 'Jan 20 - Feb 18',
      element: 'Air',
      ruling: 'Uranus',
      syllables: ['G', 'S', 'Z'],
      nameExamples: 'Grace, Samuel, Zoe, Sebastian, Stella',
      luckyNumbers: '4, 8',
      colors: 'Blue, Grey',
      traits: 'Independent, innovative, humanitarian, eccentric',
      bestFor: 'Technology, social work, innovation'
    },
    {
      sign: 'Pisces',
      symbol: '♓',
      dates: 'Feb 19 - Mar 20',
      element: 'Water',
      ruling: 'Neptune',
      syllables: ['D', 'CH', 'Z', 'T'],
      nameExamples: 'Dylan, Charlotte, Zara, Theo, Daisy',
      luckyNumbers: '3, 7',
      colors: 'Sea Green, Lavender',
      traits: 'Compassionate, artistic, intuitive, sensitive',
      bestFor: 'Arts, music, healing, spirituality'
    }
  ];

  const vedicZodiac = [
    {
      sign: 'Mesha (Aries)',
      symbol: '♈',
      dates: 'Apr 13 - May 14',
      element: 'Fire',
      ruling: 'Mars',
      syllables: ['Chu', 'Che', 'Cho', 'La', 'Lee', 'Lu', 'Le', 'Lo', 'A'],
      nameExamples: 'Arjun, Aarav, Laksh, Lila, Arya',
      luckyNumbers: '1, 9',
      colors: 'Red, Maroon',
      traits: 'Bold, ambitious, warrior spirit, leadership',
      bestFor: 'Defense, sports, entrepreneurship'
    },
    {
      sign: 'Vrishabha (Taurus)',
      symbol: '♉',
      dates: 'May 15 - Jun 14',
      element: 'Earth',
      ruling: 'Venus',
      syllables: ['Ee', 'Oo', 'Ae', 'O', 'Va', 'Vee', 'Wu', 'Ve', 'Vo'],
      nameExamples: 'Bhavya, Varun, Vedant, Vihan, Uma',
      luckyNumbers: '2, 6',
      colors: 'White, Pink',
      traits: 'Stable, practical, artistic, luxury-loving',
      bestFor: 'Finance, beauty, art, agriculture'
    },
    {
      sign: 'Mithuna (Gemini)',
      symbol: '♊',
      dates: 'Jun 15 - Jul 14',
      element: 'Air',
      ruling: 'Mercury',
      syllables: ['Ka', 'Ki', 'Ku', 'Gha', 'Ke', 'Ko', 'Ha'],
      nameExamples: 'Karan, Kavya, Krishna, Kiara, Harsh',
      luckyNumbers: '3, 5',
      colors: 'Green, Yellow',
      traits: 'Intelligent, communicative, dual nature',
      bestFor: 'Media, business, communication, trade'
    },
    {
      sign: 'Karka (Cancer)',
      symbol: '♋',
      dates: 'Jul 15 - Aug 14',
      element: 'Water',
      ruling: 'Moon',
      syllables: ['Hi', 'Hu', 'He', 'Ho', 'Da', 'De', 'Do'],
      nameExamples: 'Dev, Dhruv, Diya, Hiral, Divya',
      luckyNumbers: '2, 7',
      colors: 'White, Cream',
      traits: 'Emotional, nurturing, protective, intuitive',
      bestFor: 'Healthcare, hospitality, social work'
    },
    {
      sign: 'Simha (Leo)',
      symbol: '♌',
      dates: 'Aug 15 - Sep 15',
      element: 'Fire',
      ruling: 'Sun',
      syllables: ['Ma', 'Mi', 'Mu', 'Me', 'Mo', 'Ta', 'Ti', 'Tu', 'Te'],
      nameExamples: 'Mayank, Tanish, Madhav, Tara, Milan',
      luckyNumbers: '1, 4',
      colors: 'Gold, Orange',
      traits: 'Royal, confident, generous, leadership',
      bestFor: 'Politics, entertainment, authority roles'
    },
    {
      sign: 'Kanya (Virgo)',
      symbol: '♍',
      dates: 'Sep 16 - Oct 15',
      element: 'Earth',
      ruling: 'Mercury',
      syllables: ['To', 'Pa', 'Pi', 'Pu', 'Sha', 'Pe', 'Po'],
      nameExamples: 'Pranav, Parth, Pooja, Palak, Shaan',
      luckyNumbers: '3, 5',
      colors: 'Green, Brown',
      traits: 'Analytical, perfectionist, service-oriented',
      bestFor: 'Medicine, accounting, analysis'
    },
    {
      sign: 'Tula (Libra)',
      symbol: '♎',
      dates: 'Oct 16 - Nov 14',
      element: 'Air',
      ruling: 'Venus',
      syllables: ['Ra', 'Ri', 'Ru', 'Re', 'Ro', 'Ta', 'Ti', 'Tu'],
      nameExamples: 'Rohan, Riya, Ritesh, Tanvi, Ravi',
      luckyNumbers: '2, 6',
      colors: 'White, Pink',
      traits: 'Balanced, diplomatic, artistic, fair',
      bestFor: 'Law, arts, business, partnerships'
    },
    {
      sign: 'Vrishchika (Scorpio)',
      symbol: '♏',
      dates: 'Nov 15 - Dec 14',
      element: 'Water',
      ruling: 'Mars',
      syllables: ['To', 'Na', 'Ni', 'Nu', 'Ne', 'No', 'Ya', 'Yi', 'Yu'],
      nameExamples: 'Naman, Yash, Neel, Nakul, Yuvan',
      luckyNumbers: '9, 18',
      colors: 'Red, Maroon',
      traits: 'Intense, secretive, transformative, powerful',
      bestFor: 'Research, occult, surgery, investigation'
    },
    {
      sign: 'Dhanu (Sagittarius)',
      symbol: '♐',
      dates: 'Dec 15 - Jan 13',
      element: 'Fire',
      ruling: 'Jupiter',
      syllables: ['Ye', 'Yo', 'Bha', 'Bhi', 'Bhu', 'Dha', 'Fa', 'Dha', 'Bhe'],
      nameExamples: 'Bhavesh, Dhruv, Yug, Bhavik, Dhairya',
      luckyNumbers: '3, 9',
      colors: 'Yellow, Orange',
      traits: 'Philosophical, optimistic, spiritual, truthful',
      bestFor: 'Teaching, religion, travel, education'
    },
    {
      sign: 'Makara (Capricorn)',
      symbol: '♑',
      dates: 'Jan 14 - Feb 12',
      element: 'Earth',
      ruling: 'Saturn',
      syllables: ['Bo', 'Ja', 'Ji', 'Khi', 'Khu', 'Khe', 'Kho', 'Ga', 'Gi'],
      nameExamples: 'Jai, Jatin, Khushi, Gaurav, Jiyan',
      luckyNumbers: '8, 26',
      colors: 'Black, Dark Blue',
      traits: 'Disciplined, hardworking, ambitious, practical',
      bestFor: 'Administration, construction, governance'
    },
    {
      sign: 'Kumbha (Aquarius)',
      symbol: '♒',
      dates: 'Feb 13 - Mar 12',
      element: 'Air',
      ruling: 'Saturn',
      syllables: ['Gu', 'Ge', 'Go', 'Sa', 'Si', 'Su', 'Se', 'So', 'Da'],
      nameExamples: 'Gaurav, Shlok, Saanvi, Samaira, Siddharth',
      luckyNumbers: '4, 8',
      colors: 'Blue, Grey',
      traits: 'Humanitarian, innovative, unconventional',
      bestFor: 'Technology, social reform, science'
    },
    {
      sign: 'Meena (Pisces)',
      symbol: '♓',
      dates: 'Mar 13 - Apr 12',
      element: 'Water',
      ruling: 'Jupiter',
      syllables: ['Di', 'Du', 'Tha', 'Jha', 'De', 'Do', 'Cha', 'Chi'],
      nameExamples: 'Dev, Dhyan, Divit, Dhanush, Chaitanya',
      luckyNumbers: '3, 7',
      colors: 'Yellow, Light Green',
      traits: 'Compassionate, spiritual, artistic, intuitive',
      bestFor: 'Arts, healing, spirituality, charity'
    }
  ];

  const currentData = system === 'western' ? westernZodiac : vedicZodiac;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <UserNav />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* System Selector */}
        <div className="flex justify-end mb-4">
          <div className="relative">
            <select
              value={system}
              onChange={(e) => {
                setSystem(e.target.value);
                setSelectedSign(null);
              }}
              className="appearance-none bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 pr-10 rounded-lg font-semibold text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="western">Western Zodiac</option>
              <option value="vedic">Vedic Astrology</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white pointer-events-none" size={16} />
          </div>
        </div>
        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            {system === 'western' ? '🌟 Western Zodiac' : '🕉️ Vedic Astrology'}
          </h2>
          <p className="text-gray-600 text-sm">
            {system === 'western' 
              ? 'Based on Western/Tropical astrology system'
              : 'Based on Vedic/Hindu Nakshatra system'}
          </p>
        </div>

        {/* Mobile-Optimized Cards */}
        <div className="space-y-4">
          {currentData.map((zodiac) => (
            <div
              key={zodiac.sign}
              className="bg-white rounded-xl shadow-lg border-2 border-gray-100 overflow-hidden"
            >
              {/* Card Header - Always Visible */}
              <div
                onClick={() => setSelectedSign(selectedSign === zodiac.sign ? null : zodiac.sign)}
                className="p-4 cursor-pointer active:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{zodiac.symbol}</span>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">{zodiac.sign}</h3>
                      <p className="text-xs text-gray-600">{zodiac.dates}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-full text-white text-xs font-semibold ${
                      zodiac.element === 'Fire' ? 'bg-red-500' :
                      zodiac.element === 'Earth' ? 'bg-green-600' :
                      zodiac.element === 'Air' ? 'bg-blue-400' : 'bg-blue-600'
                    }`}>
                      {zodiac.element}
                    </span>
                  </div>
                </div>

                {/* Syllables - Always Visible */}
                <div className="mt-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 font-semibold mb-2">✨ Auspicious Syllables:</p>
                  <div className="flex flex-wrap gap-2">
                    {zodiac.syllables.map((syl, idx) => (
                      <span
                        key={idx}
                        className="bg-white px-3 py-1 rounded-full text-purple-700 text-sm font-bold border border-purple-200"
                      >
                        {syl}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Expandable Details */}
              {selectedSign === zodiac.sign && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-700 mb-1">📝 Example Names:</p>
                    <p className="text-sm text-gray-800">{zodiac.nameExamples}</p>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-700 mb-1">🎲 Lucky Numbers:</p>
                    <p className="text-sm text-gray-800">{zodiac.luckyNumbers}</p>
                  </div>

                  <div className="bg-pink-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-700 mb-1">🎨 Lucky Colors:</p>
                    <p className="text-sm text-gray-800">{zodiac.colors}</p>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-700 mb-1">✨ Personality:</p>
                    <p className="text-sm text-gray-800">{zodiac.traits}</p>
                  </div>

                  <div className="bg-yellow-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-700 mb-1">💼 Best Career:</p>
                    <p className="text-sm text-gray-800">{zodiac.bestFor}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* How to Use Guide */}
        <div className="mt-6 bg-white rounded-xl shadow-lg p-5 border-2 border-purple-100">
          <h4 className="text-lg font-bold text-purple-800 mb-3">💡 How to Use</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex gap-2">
              <span className="text-purple-600 font-bold">1.</span>
              <span>Find your zodiac sign based on birth date</span>
            </li>
            <li className="flex gap-2">
              <span className="text-purple-600 font-bold">2.</span>
              <span>Choose names starting with the auspicious syllables</span>
            </li>
            <li className="flex gap-2">
              <span className="text-purple-600 font-bold">3.</span>
              <span>Tap any card to see more details and examples</span>
            </li>
            <li className="flex gap-2">
              <span className="text-purple-600 font-bold">4.</span>
              <span>Switch between Western and Vedic systems using dropdown above</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}