import React from 'react';
import { useNavigate } from 'react-router-dom';
import UserNav from '../components/UserNav';
import './ElementInsightsPage.css';

export default function ElementInsightsPage() {
  const navigate = useNavigate();

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="element-insights-page">
      <UserNav />
      
      {/* Quick Navigation */}
      <nav className="insights-nav-menu">
        <div className="insights-nav-container">
          <h2 className="insights-nav-title">Element & Nakshatra Insights</h2>
          <ul className="insights-nav-links">
            <li><button onClick={() => scrollToSection('periodic-table')}>Periodic Table</button></li>
            <li><button onClick={() => scrollToSection('elements-guide')}>Elements Guide</button></li>
            <li><button onClick={() => scrollToSection('nakshatras')}>Nakshatras</button></li>
            <li><button onClick={() => scrollToSection('practical-guide')}>Practical Guide</button></li>
            <li><button onClick={() => navigate('/dashboard')}>Back to Dashboard</button></li>
          </ul>
        </div>
      </nav>

      <div className="insights-container">
        {/* Hero Section */}
        <section className="insights-hero">
          <h1>🌟 Unlock the Cosmic Secrets of Your Name 🌟</h1>
          <p className="hero-subtitle">
            Discover how the periodic table elements and ancient Nakshatras shape your identity, personality, and destiny
          </p>
        </section>

        {/* Reading Guide */}
        <div className="reading-guide">
          <h3>📖 How to Read Your Analysis</h3>
          <p><strong>Element Percentage:</strong> Higher % = Stronger influence on your personality</p>
          <p><strong>Nakshatra Ruling Planet:</strong> Each Nakshatra is governed by a planet that influences your cosmic energy</p>
          <p><strong>Name Chemistry:</strong> The unique blend of elements in your name creates your personal "cosmic signature"</p>
        </div>

        {/* Science Truth Box */}
        <div className="science-truth">
          <h3>🔬 The Science Behind Name Analysis</h3>
          <ul>
            <li><strong>Periodic Table Elements:</strong> Every letter maps to specific elements (like Hydrogen, Carbon, Oxygen) based on vibrational patterns</li>
            <li><strong>Element Properties:</strong> Each element carries unique traits (stability, reactivity, energy) that influence personality</li>
            <li><strong>Nakshatras:</strong> Ancient Vedic star constellations linked to planetary energies</li>
            <li><strong>Syllable Science:</strong> Sound vibrations of name syllables resonate with cosmic frequencies</li>
          </ul>
          <p className="highlight">
            ✨ Your name isn't just letters—it's a unique chemical and cosmic formula that shapes your energy field!
          </p>
        </div>

        {/* Periodic Table Section */}
        <section id="periodic-table" className="content-section">
          <h2>🧪 The Periodic Table of Elements</h2>
          <p className="section-intro">
            Understanding the building blocks of matter helps us decode the vibrational essence of your name. 
            Each element carries specific energetic properties that influence personality traits.
          </p>

          <div className="element-category">
            <h3>⚛️ Noble Gases (Group 18) - The Independent Souls</h3>
            <table>
              <thead>
                <tr>
                  <th>Element</th>
                  <th>Symbol</th>
                  <th>Atomic Number</th>
                  <th>Key Traits</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Helium</td>
                  <td>He</td>
                  <td>2</td>
                  <td>Light, uplifting, carefree nature</td>
                </tr>
                <tr>
                  <td>Neon</td>
                  <td>Ne</td>
                  <td>10</td>
                  <td>Bright, attention-grabbing, vibrant</td>
                </tr>
                <tr>
                  <td>Argon</td>
                  <td>Ar</td>
                  <td>18</td>
                  <td>Calm, non-reactive, peaceful</td>
                </tr>
                <tr>
                  <td>Krypton</td>
                  <td>Kr</td>
                  <td>36</td>
                  <td>Mysterious, hidden strength</td>
                </tr>
                <tr>
                  <td>Xenon</td>
                  <td>Xe</td>
                  <td>54</td>
                  <td>Unique, exotic, rare qualities</td>
                </tr>
                <tr>
                  <td>Radon</td>
                  <td>Rn</td>
                  <td>86</td>
                  <td>Powerful but invisible influence</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="element-category">
            <h3>🔥 Alkali Metals (Group 1) - The Reactive Leaders</h3>
            <table>
              <thead>
                <tr>
                  <th>Element</th>
                  <th>Symbol</th>
                  <th>Atomic Number</th>
                  <th>Key Traits</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Lithium</td>
                  <td>Li</td>
                  <td>3</td>
                  <td>Energetic, mood-balancing, dynamic</td>
                </tr>
                <tr>
                  <td>Sodium</td>
                  <td>Na</td>
                  <td>11</td>
                  <td>Essential, social, highly reactive</td>
                </tr>
                <tr>
                  <td>Potassium</td>
                  <td>K</td>
                  <td>19</td>
                  <td>Vital, nerve-conducting, quick</td>
                </tr>
                <tr>
                  <td>Rubidium</td>
                  <td>Rb</td>
                  <td>37</td>
                  <td>Explosive potential, rare talent</td>
                </tr>
                <tr>
                  <td>Cesium</td>
                  <td>Cs</td>
                  <td>55</td>
                  <td>Extremely reactive, time-precise</td>
                </tr>
                <tr>
                  <td>Francium</td>
                  <td>Fr</td>
                  <td>87</td>
                  <td>Rarest, most reactive, unstable genius</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="element-category">
            <h3>💪 Alkaline Earth Metals (Group 2) - The Stable Supporters</h3>
            <table>
              <thead>
                <tr>
                  <th>Element</th>
                  <th>Symbol</th>
                  <th>Atomic Number</th>
                  <th>Key Traits</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Beryllium</td>
                  <td>Be</td>
                  <td>4</td>
                  <td>Strong yet lightweight, resilient</td>
                </tr>
                <tr>
                  <td>Magnesium</td>
                  <td>Mg</td>
                  <td>12</td>
                  <td>Vital for energy, bright burning</td>
                </tr>
                <tr>
                  <td>Calcium</td>
                  <td>Ca</td>
                  <td>20</td>
                  <td>Structural support, bone of operations</td>
                </tr>
                <tr>
                  <td>Strontium</td>
                  <td>Sr</td>
                  <td>38</td>
                  <td>Firework-like brilliance, flashy</td>
                </tr>
                <tr>
                  <td>Barium</td>
                  <td>Ba</td>
                  <td>56</td>
                  <td>Heavy, grounding, medical healing</td>
                </tr>
                <tr>
                  <td>Radium</td>
                  <td>Ra</td>
                  <td>88</td>
                  <td>Radioactive glow, dangerous beauty</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="element-category">
            <h3>⚙️ Transition Metals (Groups 3-12) - The Versatile Achievers</h3>
            <p><em>Key metals include: Iron (Fe), Copper (Cu), Silver (Ag), Gold (Au), Platinum (Pt)</em></p>
            <p>Traits: Strength, conductivity, versatility, value, beauty, durability</p>
          </div>

          <div className="element-category">
            <h3>🌍 Lanthanides & Actinides - The Rare & Powerful</h3>
            <p><em>Rare earth elements and radioactive elements</em></p>
            <p>Traits: Magnetic properties, hidden power, transformative energy, technological advancement</p>
          </div>

          <div className="element-category">
            <h3>🧬 Non-metals - The Life Essentials</h3>
            <table>
              <thead>
                <tr>
                  <th>Element</th>
                  <th>Symbol</th>
                  <th>Key Traits</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Hydrogen</td>
                  <td>H</td>
                  <td>Most abundant, foundation of stars, light</td>
                </tr>
                <tr>
                  <td>Carbon</td>
                  <td>C</td>
                  <td>Basis of all life, versatile bonding</td>
                </tr>
                <tr>
                  <td>Nitrogen</td>
                  <td>N</td>
                  <td>Essential for growth, atmospheric calm</td>
                </tr>
                <tr>
                  <td>Oxygen</td>
                  <td>O</td>
                  <td>Life-giving breath, energy burning</td>
                </tr>
                <tr>
                  <td>Phosphorus</td>
                  <td>P</td>
                  <td>Energy transfer (ATP), glowing potential</td>
                </tr>
                <tr>
                  <td>Sulfur</td>
                  <td>S</td>
                  <td>Transformative, purifying, volcanic</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="element-category">
            <h3>⚡ Halogens (Group 17) - The Intense Reactors</h3>
            <table>
              <thead>
                <tr>
                  <th>Element</th>
                  <th>Symbol</th>
                  <th>Key Traits</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Fluorine</td>
                  <td>F</td>
                  <td>Most reactive, protective, sharp</td>
                </tr>
                <tr>
                  <td>Chlorine</td>
                  <td>Cl</td>
                  <td>Purifying, cleansing, essential</td>
                </tr>
                <tr>
                  <td>Bromine</td>
                  <td>Br</td>
                  <td>Liquid intensity, sedative calm</td>
                </tr>
                <tr>
                  <td>Iodine</td>
                  <td>I</td>
                  <td>Thyroid regulator, purple mystery</td>
                </tr>
                <tr>
                  <td>Astatine</td>
                  <td>At</td>
                  <td>Rarest natural, fleeting presence</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Elements Guide */}
        <section id="elements-guide" className="content-section">
          <h2>🎯 What Each Element Means in Your Name</h2>
          
          <div className="why-matters">
            <h3>Why Element Percentages Matter</h3>
            <p>The elements in your name create your unique "energetic signature"</p>
            <p><strong>High % Element = Dominant Trait</strong></p>
            <p><strong>Balanced Elements = Harmonious Personality</strong></p>
            <p><strong>Rare Elements = Unique Gifts</strong></p>
          </div>
        </section>

        {/* Nakshatras Section */}
        <section id="nakshatras" className="content-section">
          <h2>⭐ The 27 Nakshatras - Cosmic Star Constellations</h2>
          <p className="section-intro">
            Nakshatras are the 27 lunar mansions used in Vedic astrology. Each syllable of your name 
            resonates with specific Nakshatra energies, influencing your personality and destiny.
          </p>

          <div className="nakshatra-group">
            <h3>🔥 Fire Nakshatras (Ruled by Sun, Mars, Ketu)</h3>
            <table>
              <thead>
                <tr>
                  <th>Nakshatra</th>
                  <th>Ruling Planet</th>
                  <th>Pada Syllables</th>
                  <th>Key Traits</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Ashwini</td>
                  <td>Ketu</td>
                  <td>Chu, Che, Cho, La</td>
                  <td>Swift action, healing, pioneering</td>
                </tr>
                <tr>
                  <td>Bharani</td>
                  <td>Venus</td>
                  <td>Li, Lu, Le, Lo</td>
                  <td>Nurturing, creative, transformative</td>
                </tr>
                <tr>
                  <td>Krittika</td>
                  <td>Sun</td>
                  <td>A, I, U, E</td>
                  <td>Sharp intellect, purifying, fiery</td>
                </tr>
                <tr>
                  <td>Magha</td>
                  <td>Ketu</td>
                  <td>Ma, Mi, Mu, Me</td>
                  <td>Royal authority, ancestral pride</td>
                </tr>
                <tr>
                  <td>Purva Phalguni</td>
                  <td>Venus</td>
                  <td>Mo, Ta, Ti, Tu</td>
                  <td>Artistic, pleasure-loving, generous</td>
                </tr>
                <tr>
                  <td>Uttara Phalguni</td>
                  <td>Sun</td>
                  <td>Te, To, Pa, Pi</td>
                  <td>Leadership, friendship, helpful</td>
                </tr>
                <tr>
                  <td>Purva Ashadha</td>
                  <td>Venus</td>
                  <td>Bhu, Dha, Pha, Dha</td>
                  <td>Invincible energy, optimistic</td>
                </tr>
                <tr>
                  <td>Uttara Ashadha</td>
                  <td>Sun</td>
                  <td>Bhe, Bho, Ja, Ji</td>
                  <td>Victory, lasting success</td>
                </tr>
                <tr>
                  <td>Mula</td>
                  <td>Ketu</td>
                  <td>Ye, Yo, Bha, Bhi</td>
                  <td>Root investigation, spiritual depth</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="nakshatra-group">
            <h3>🌊 Water Nakshatras (Ruled by Moon, Mercury)</h3>
            <table>
              <thead>
                <tr>
                  <th>Nakshatra</th>
                  <th>Ruling Planet</th>
                  <th>Pada Syllables</th>
                  <th>Key Traits</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Rohini</td>
                  <td>Moon</td>
                  <td>O, Va, Vi, Vu</td>
                  <td>Growth, beauty, materialistic</td>
                </tr>
                <tr>
                  <td>Hasta</td>
                  <td>Moon</td>
                  <td>Pu, Sha, Na, Tha</td>
                  <td>Skillful hands, clever, dexterous</td>
                </tr>
                <tr>
                  <td>Shravana</td>
                  <td>Moon</td>
                  <td>Ju, Je, Jo, Kha</td>
                  <td>Listening, learning, wisdom</td>
                </tr>
                <tr>
                  <td>Ashlesha</td>
                  <td>Mercury</td>
                  <td>Di, Du, De, Do</td>
                  <td>Mystical, serpent wisdom, cunning</td>
                </tr>
                <tr>
                  <td>Jyeshtha</td>
                  <td>Mercury</td>
                  <td>No, Ya, Yi, Yu</td>
                  <td>Elder authority, protective</td>
                </tr>
                <tr>
                  <td>Revati</td>
                  <td>Mercury</td>
                  <td>De, Do, Cha, Chi</td>
                  <td>Journey completion, nourishing</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="nakshatra-group">
            <h3>🌍 Earth Nakshatras (Ruled by Mars, Rahu, Saturn)</h3>
            <table>
              <thead>
                <tr>
                  <th>Nakshatra</th>
                  <th>Ruling Planet</th>
                  <th>Pada Syllables</th>
                  <th>Key Traits</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Mrigashira</td>
                  <td>Mars</td>
                  <td>Ve, Vo, Ka, Ki</td>
                  <td>Searching, gentle, curious</td>
                </tr>
                <tr>
                  <td>Chitra</td>
                  <td>Mars</td>
                  <td>Pe, Po, Ra, Ri</td>
                  <td>Artistic brilliance, craftsmanship</td>
                </tr>
                <tr>
                  <td>Dhanishta</td>
                  <td>Mars</td>
                  <td>Ga, Gi, Gu, Ge</td>
                  <td>Wealthy, musical, rhythmic</td>
                </tr>
                <tr>
                  <td>Ardra</td>
                  <td>Rahu</td>
                  <td>Ku, Gha, Nga, Chha</td>
                  <td>Storm energy, transformative tears</td>
                </tr>
                <tr>
                  <td>Swati</td>
                  <td>Rahu</td>
                  <td>Ru, Re, Ro, Ta</td>
                  <td>Independent wind, freedom-loving</td>
                </tr>
                <tr>
                  <td>Shatabhisha</td>
                  <td>Rahu</td>
                  <td>Go, Sa, Si, Su</td>
                  <td>Healing, mysterious, secretive</td>
                </tr>
                <tr>
                  <td>Pushya</td>
                  <td>Saturn</td>
                  <td>Hu, He, Ho, Da</td>
                  <td>Nourishing, spiritual, disciplined</td>
                </tr>
                <tr>
                  <td>Anuradha</td>
                  <td>Saturn</td>
                  <td>Na, Ni, Nu, Ne</td>
                  <td>Devotional, friendship, balance</td>
                </tr>
                <tr>
                  <td>Uttara Bhadrapada</td>
                  <td>Saturn</td>
                  <td>Du, Tha, Jha, Tra</td>
                  <td>Deep wisdom, serpent power</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="nakshatra-group">
            <h3>💨 Air Nakshatras (Ruled by Jupiter)</h3>
            <table>
              <thead>
                <tr>
                  <th>Nakshatra</th>
                  <th>Ruling Planet</th>
                  <th>Pada Syllables</th>
                  <th>Key Traits</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Punarvasu</td>
                  <td>Jupiter</td>
                  <td>Ke, Ko, Ha, Hi</td>
                  <td>Renewal, return, optimistic</td>
                </tr>
                <tr>
                  <td>Vishakha</td>
                  <td>Jupiter</td>
                  <td>Ti, Tu, Te, To</td>
                  <td>Goal-oriented, determined, forked</td>
                </tr>
                <tr>
                  <td>Purva Bhadrapada</td>
                  <td>Jupiter</td>
                  <td>Se, So, Da, Di</td>
                  <td>Intense transformation, dual nature</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="correction">
            <strong>⚠️ Important Correction:</strong> While traditional texts group Nakshatras by element, 
            modern astrology recognizes that planetary rulers have more influence than elemental classification. 
            Focus on the ruling planet's energy for accurate interpretation.
          </div>
        </section>

        {/* Practical Guide */}
        <section id="practical-guide" className="content-section">
          <div className="practical-guide">
            <h3>📋 How to Use Your Name Analysis</h3>
            <ol>
              <li>
                <strong>Identify Your Dominant Elements</strong>
                <ul>
                  <li>Check which elements have the highest percentage in your name</li>
                  <li>These represent your core personality traits</li>
                  <li>Example: High Carbon (C) = Strong life force, adaptable</li>
                </ul>
              </li>
              <li>
                <strong>Find Your Nakshatra Connections</strong>
                <ul>
                  <li>Look up each syllable of your name in the Nakshatra tables</li>
                  <li>Note the ruling planets for those Nakshatras</li>
                  <li>Planets appearing multiple times have stronger influence</li>
                </ul>
              </li>
              <li>
                <strong>Understand Element Interactions</strong>
                <ul>
                  <li>Metals + Non-metals = Balance of strength and flexibility</li>
                  <li>Noble gases = Independent, self-sufficient nature</li>
                  <li>Multiple reactive elements = Dynamic, energetic personality</li>
                </ul>
              </li>
              <li>
                <strong>Apply to Life Decisions</strong>
                <ul>
                  <li>Career: Match your dominant elements with suitable professions</li>
                  <li>Relationships: Understand compatibility through elemental balance</li>
                  <li>Personal Growth: Strengthen weak elements through conscious effort</li>
                </ul>
              </li>
            </ol>
          </div>
        </section>

        {/* Final CTA */}
        <div className="why-matters">
          <h3>🚀 Ready to Discover Your Cosmic Blueprint?</h3>
          <p>Analyze your name now and unlock the secrets written in the stars!</p>
          <button 
            onClick={() => navigate('/analyze')}
            className="cta-button"
          >
            Analyze Your Name Now
          </button>
        </div>
      </div>
    </div>
  );
}