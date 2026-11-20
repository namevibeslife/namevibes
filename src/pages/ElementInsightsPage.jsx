import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ElementInsightsPage.css';
import { useTranslation } from 'react-i18next';

export default function ElementInsightsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="element-insights-page">
      
      {/* Quick Navigation */}
      <nav className="insights-nav-menu">
        <div className="insights-nav-container">
          <h2 className="insights-nav-title">{t('insights.n001')}</h2>
          <ul className="insights-nav-links">
            <li><button onClick={() => scrollToSection('periodic-table')}>{t('insights.n002')}</button></li>
            <li><button onClick={() => scrollToSection('elements-guide')}>{t('insights.n003')}</button></li>
            <li><button onClick={() => scrollToSection('nakshatras')}>{t('insights.n004')}</button></li>
            <li><button onClick={() => scrollToSection('practical-guide')}>{t('insights.n005')}</button></li>
            <li><button onClick={() => navigate('/dashboard')}>{t('insights.n006')}</button></li>
          </ul>
        </div>
      </nav>

      <div className="insights-container">
        {/* Hero Section */}
        <section className="insights-hero">
          <h1>{t('insights.n007')}</h1>
          <p className="hero-subtitle">{t('insights.n008')}</p>
        </section>

        {/* Reading Guide */}
        <div className="reading-guide">
          <h3>{t('insights.n009')}</h3>
          <p><strong>{t('insights.n010')}</strong>{" "}{t('insights.n011')}</p>
          <p><strong>{t('insights.n012')}</strong>{" "}{t('insights.n013')}</p>
          <p><strong>{t('insights.n014')}</strong>{" "}{t('insights.n015')}</p>
        </div>

        {/* Science Truth Box */}
        <div className="science-truth">
          <h3>{t('insights.n016')}</h3>
          <ul>
            <li><strong>{t('insights.n017')}</strong>{" "}{t('insights.n018')}</li>
            <li><strong>{t('insights.n019')}</strong>{" "}{t('insights.n020')}</li>
            <li><strong>{t('insights.n021')}</strong>{" "}{t('insights.n022')}</li>
            <li><strong>{t('insights.n023')}</strong>{" "}{t('insights.n024')}</li>
          </ul>
          <p className="highlight">{t('insights.n025')}</p>
        </div>

        {/* Periodic Table Section */}
        <section id="periodic-table" className="content-section">
          <h2>{t('insights.n026')}</h2>
          <p className="section-intro">{t('insights.n027')}</p>

          <div className="element-category">
            <h3>{t('insights.n028')}</h3>
            <div className="overflow-x-auto"><table>
              <thead>
                <tr>
                  <th>{t('insights.n029')}</th>
                  <th>{t('insights.n030')}</th>
                  <th>{t('insights.n031')}</th>
                  <th>{t('insights.n032')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Helium</td>
                  <td>He</td>
                  <td>2</td>
                  <td>{t('insights.n035')}</td>
                </tr>
                <tr>
                  <td>Neon</td>
                  <td>Ne</td>
                  <td>10</td>
                  <td>{t('insights.n038')}</td>
                </tr>
                <tr>
                  <td>Argon</td>
                  <td>Ar</td>
                  <td>18</td>
                  <td>{t('insights.n041')}</td>
                </tr>
                <tr>
                  <td>Krypton</td>
                  <td>Kr</td>
                  <td>36</td>
                  <td>{t('insights.n044')}</td>
                </tr>
                <tr>
                  <td>Xenon</td>
                  <td>Xe</td>
                  <td>54</td>
                  <td>{t('insights.n047')}</td>
                </tr>
                <tr>
                  <td>Radon</td>
                  <td>Rn</td>
                  <td>86</td>
                  <td>{t('insights.n050')}</td>
                </tr>
              </tbody>
            </table></div>
          </div>

          <div className="element-category">
            <h3>{t('insights.n051')}</h3>
            <div className="overflow-x-auto"><table>
              <thead>
                <tr>
                  <th>{t('insights.n029')}</th>
                  <th>{t('insights.n030')}</th>
                  <th>{t('insights.n031')}</th>
                  <th>{t('insights.n032')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Lithium</td>
                  <td>Li</td>
                  <td>3</td>
                  <td>{t('insights.n054')}</td>
                </tr>
                <tr>
                  <td>Sodium</td>
                  <td>Na</td>
                  <td>11</td>
                  <td>{t('insights.n057')}</td>
                </tr>
                <tr>
                  <td>Potassium</td>
                  <td>K</td>
                  <td>19</td>
                  <td>{t('insights.n059')}</td>
                </tr>
                <tr>
                  <td>Rubidium</td>
                  <td>Rb</td>
                  <td>37</td>
                  <td>{t('insights.n062')}</td>
                </tr>
                <tr>
                  <td>Cesium</td>
                  <td>Cs</td>
                  <td>55</td>
                  <td>{t('insights.n065')}</td>
                </tr>
                <tr>
                  <td>Francium</td>
                  <td>Fr</td>
                  <td>87</td>
                  <td>{t('insights.n068')}</td>
                </tr>
              </tbody>
            </table></div>
          </div>

          <div className="element-category">
            <h3>{t('insights.n069')}</h3>
            <div className="overflow-x-auto"><table>
              <thead>
                <tr>
                  <th>{t('insights.n029')}</th>
                  <th>{t('insights.n030')}</th>
                  <th>{t('insights.n031')}</th>
                  <th>{t('insights.n032')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Beryllium</td>
                  <td>Be</td>
                  <td>4</td>
                  <td>{t('insights.n072')}</td>
                </tr>
                <tr>
                  <td>Magnesium</td>
                  <td>Mg</td>
                  <td>12</td>
                  <td>{t('insights.n075')}</td>
                </tr>
                <tr>
                  <td>Calcium</td>
                  <td>Ca</td>
                  <td>20</td>
                  <td>{t('insights.n078')}</td>
                </tr>
                <tr>
                  <td>Strontium</td>
                  <td>Sr</td>
                  <td>38</td>
                  <td>{t('insights.n081')}</td>
                </tr>
                <tr>
                  <td>Barium</td>
                  <td>Ba</td>
                  <td>56</td>
                  <td>{t('insights.n084')}</td>
                </tr>
                <tr>
                  <td>Radium</td>
                  <td>Ra</td>
                  <td>88</td>
                  <td>{t('insights.n087')}</td>
                </tr>
              </tbody>
            </table></div>
          </div>

          <div className="element-category">
            <h3>{t('insights.n088')}</h3>
            <p><em>{t('insights.n089')}</em></p>
            <p>{t('insights.n090')}</p>
          </div>

          <div className="element-category">
            <h3>{t('insights.n091')}</h3>
            <p><em>{t('insights.n092')}</em></p>
            <p>{t('insights.n093')}</p>
          </div>

          <div className="element-category">
            <h3>{t('insights.n094')}</h3>
            <div className="overflow-x-auto"><table>
              <thead>
                <tr>
                  <th>{t('insights.n029')}</th>
                  <th>{t('insights.n030')}</th>
                  <th>{t('insights.n032')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Hydrogen</td>
                  <td>H</td>
                  <td>{t('insights.n096')}</td>
                </tr>
                <tr>
                  <td>Carbon</td>
                  <td>C</td>
                  <td>{t('insights.n098')}</td>
                </tr>
                <tr>
                  <td>Nitrogen</td>
                  <td>N</td>
                  <td>{t('insights.n100')}</td>
                </tr>
                <tr>
                  <td>Oxygen</td>
                  <td>O</td>
                  <td>{t('insights.n102')}</td>
                </tr>
                <tr>
                  <td>Phosphorus</td>
                  <td>P</td>
                  <td>{t('insights.n104')}</td>
                </tr>
                <tr>
                  <td>Sulfur</td>
                  <td>S</td>
                  <td>{t('insights.n106')}</td>
                </tr>
              </tbody>
            </table></div>
          </div>

          <div className="element-category">
            <h3>{t('insights.n107')}</h3>
            <div className="overflow-x-auto"><table>
              <thead>
                <tr>
                  <th>{t('insights.n029')}</th>
                  <th>{t('insights.n030')}</th>
                  <th>{t('insights.n032')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Fluorine</td>
                  <td>F</td>
                  <td>{t('insights.n109')}</td>
                </tr>
                <tr>
                  <td>Chlorine</td>
                  <td>Cl</td>
                  <td>{t('insights.n112')}</td>
                </tr>
                <tr>
                  <td>Bromine</td>
                  <td>Br</td>
                  <td>{t('insights.n115')}</td>
                </tr>
                <tr>
                  <td>Iodine</td>
                  <td>I</td>
                  <td>{t('insights.n117')}</td>
                </tr>
                <tr>
                  <td>Astatine</td>
                  <td>At</td>
                  <td>{t('insights.n120')}</td>
                </tr>
              </tbody>
            </table></div>
          </div>
        </section>

        {/* Elements Guide */}
        <section id="elements-guide" className="content-section">
          <h2>{t('insights.n121')}</h2>
          
          <div className="why-matters">
            <h3>{t('insights.n122')}</h3>
            <p>{t('insights.n123')}</p>
            <p><strong>{t('insights.n124')}</strong></p>
            <p><strong>{t('insights.n125')}</strong></p>
            <p><strong>{t('insights.n126')}</strong></p>
          </div>
        </section>

        {/* Nakshatras Section */}
        <section id="nakshatras" className="content-section">
          <h2>{t('insights.n127')}</h2>
          <p className="section-intro">{t('insights.n128')}</p>

          <div className="nakshatra-group">
            <h3>{t('insights.n129')}</h3>
            <div className="overflow-x-auto"><table>
              <thead>
                <tr>
                  <th>{t('insights.n130')}</th>
                  <th>{t('insights.n131')}</th>
                  <th>{t('insights.n132')}</th>
                  <th>{t('insights.n032')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Ashwini</td>
                  <td>{t('hora.planet.Ketu')}</td>
                  <td>Chu, Che, Cho, La</td>
                  <td>{t('insights.n136')}</td>
                </tr>
                <tr>
                  <td>Bharani</td>
                  <td>{t('hora.planet.Venus')}</td>
                  <td>Li, Lu, Le, Lo</td>
                  <td>{t('insights.n140')}</td>
                </tr>
                <tr>
                  <td>Krittika</td>
                  <td>{t('hora.planet.Sun')}</td>
                  <td>A, I, U, E</td>
                  <td>{t('insights.n144')}</td>
                </tr>
                <tr>
                  <td>Magha</td>
                  <td>{t('hora.planet.Ketu')}</td>
                  <td>Ma, Mi, Mu, Me</td>
                  <td>{t('insights.n147')}</td>
                </tr>
                <tr>
                  <td>Purva Phalguni</td>
                  <td>{t('hora.planet.Venus')}</td>
                  <td>Mo, Ta, Ti, Tu</td>
                  <td>{t('insights.n150')}</td>
                </tr>
                <tr>
                  <td>Uttara Phalguni</td>
                  <td>{t('hora.planet.Sun')}</td>
                  <td>Te, To, Pa, Pi</td>
                  <td>{t('insights.n153')}</td>
                </tr>
                <tr>
                  <td>Purva Ashadha</td>
                  <td>{t('hora.planet.Venus')}</td>
                  <td>Bhu, Dha, Pha, Dha</td>
                  <td>{t('insights.n156')}</td>
                </tr>
                <tr>
                  <td>Uttara Ashadha</td>
                  <td>{t('hora.planet.Sun')}</td>
                  <td>Bhe, Bho, Ja, Ji</td>
                  <td>{t('insights.n159')}</td>
                </tr>
                <tr>
                  <td>Mula</td>
                  <td>{t('hora.planet.Ketu')}</td>
                  <td>Ye, Yo, Bha, Bhi</td>
                  <td>{t('insights.n162')}</td>
                </tr>
              </tbody>
            </table></div>
          </div>

          <div className="nakshatra-group">
            <h3>{t('insights.n163')}</h3>
            <div className="overflow-x-auto"><table>
              <thead>
                <tr>
                  <th>{t('insights.n130')}</th>
                  <th>{t('insights.n131')}</th>
                  <th>{t('insights.n132')}</th>
                  <th>{t('insights.n032')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Rohini</td>
                  <td>{t('hora.planet.Moon')}</td>
                  <td>O, Va, Vi, Vu</td>
                  <td>{t('insights.n167')}</td>
                </tr>
                <tr>
                  <td>Hasta</td>
                  <td>{t('hora.planet.Moon')}</td>
                  <td>Pu, Sha, Na, Tha</td>
                  <td>{t('insights.n170')}</td>
                </tr>
                <tr>
                  <td>Shravana</td>
                  <td>{t('hora.planet.Moon')}</td>
                  <td>Ju, Je, Jo, Kha</td>
                  <td>{t('insights.n173')}</td>
                </tr>
                <tr>
                  <td>Ashlesha</td>
                  <td>{t('hora.planet.Mercury')}</td>
                  <td>Di, Du, De, Do</td>
                  <td>{t('insights.n177')}</td>
                </tr>
                <tr>
                  <td>Jyeshtha</td>
                  <td>{t('hora.planet.Mercury')}</td>
                  <td>No, Ya, Yi, Yu</td>
                  <td>{t('insights.n180')}</td>
                </tr>
                <tr>
                  <td>Revati</td>
                  <td>{t('hora.planet.Mercury')}</td>
                  <td>De, Do, Cha, Chi</td>
                  <td>{t('insights.n183')}</td>
                </tr>
              </tbody>
            </table></div>
          </div>

          <div className="nakshatra-group">
            <h3>{t('insights.n184')}</h3>
            <div className="overflow-x-auto"><table>
              <thead>
                <tr>
                  <th>{t('insights.n130')}</th>
                  <th>{t('insights.n131')}</th>
                  <th>{t('insights.n132')}</th>
                  <th>{t('insights.n032')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Mrigashira</td>
                  <td>{t('hora.planet.Mars')}</td>
                  <td>Ve, Vo, Ka, Ki</td>
                  <td>{t('insights.n188')}</td>
                </tr>
                <tr>
                  <td>Chitra</td>
                  <td>{t('hora.planet.Mars')}</td>
                  <td>Pe, Po, Ra, Ri</td>
                  <td>{t('insights.n191')}</td>
                </tr>
                <tr>
                  <td>Dhanishta</td>
                  <td>{t('hora.planet.Mars')}</td>
                  <td>Ga, Gi, Gu, Ge</td>
                  <td>{t('insights.n194')}</td>
                </tr>
                <tr>
                  <td>Ardra</td>
                  <td>{t('hora.planet.Rahu')}</td>
                  <td>Ku, Gha, Nga, Chha</td>
                  <td>{t('insights.n198')}</td>
                </tr>
                <tr>
                  <td>Swati</td>
                  <td>{t('hora.planet.Rahu')}</td>
                  <td>Ru, Re, Ro, Ta</td>
                  <td>{t('insights.n201')}</td>
                </tr>
                <tr>
                  <td>Shatabhisha</td>
                  <td>{t('hora.planet.Rahu')}</td>
                  <td>Go, Sa, Si, Su</td>
                  <td>{t('insights.n204')}</td>
                </tr>
                <tr>
                  <td>Pushya</td>
                  <td>{t('hora.planet.Saturn')}</td>
                  <td>Hu, He, Ho, Da</td>
                  <td>{t('insights.n208')}</td>
                </tr>
                <tr>
                  <td>Anuradha</td>
                  <td>{t('hora.planet.Saturn')}</td>
                  <td>Na, Ni, Nu, Ne</td>
                  <td>{t('insights.n211')}</td>
                </tr>
                <tr>
                  <td>Uttara Bhadrapada</td>
                  <td>{t('hora.planet.Saturn')}</td>
                  <td>Du, Tha, Jha, Tra</td>
                  <td>{t('insights.n214')}</td>
                </tr>
              </tbody>
            </table></div>
          </div>

          <div className="nakshatra-group">
            <h3>{t('insights.n215')}</h3>
            <div className="overflow-x-auto"><table>
              <thead>
                <tr>
                  <th>{t('insights.n130')}</th>
                  <th>{t('insights.n131')}</th>
                  <th>{t('insights.n132')}</th>
                  <th>{t('insights.n032')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Punarvasu</td>
                  <td>{t('hora.planet.Jupiter')}</td>
                  <td>Ke, Ko, Ha, Hi</td>
                  <td>{t('insights.n219')}</td>
                </tr>
                <tr>
                  <td>Vishakha</td>
                  <td>{t('hora.planet.Jupiter')}</td>
                  <td>Ti, Tu, Te, To</td>
                  <td>{t('insights.n222')}</td>
                </tr>
                <tr>
                  <td>Purva Bhadrapada</td>
                  <td>{t('hora.planet.Jupiter')}</td>
                  <td>Se, So, Da, Di</td>
                  <td>{t('insights.n225')}</td>
                </tr>
              </tbody>
            </table></div>
          </div>

          <div className="correction">
            <strong>{t('insights.n226')}</strong>{" "}{t('insights.n227')}</div>
        </section>

        {/* Practical Guide */}
        <section id="practical-guide" className="content-section">
          <div className="practical-guide">
            <h3>{t('insights.n228')}</h3>
            <ol>
              <li>
                <strong>{t('insights.n229')}</strong>
                <ul>
                  <li>{t('insights.n230')}</li>
                  <li>{t('insights.n231')}</li>
                  <li>{t('insights.n232')}</li>
                </ul>
              </li>
              <li>
                <strong>{t('insights.n233')}</strong>
                <ul>
                  <li>{t('insights.n234')}</li>
                  <li>{t('insights.n235')}</li>
                  <li>{t('insights.n236')}</li>
                </ul>
              </li>
              <li>
                <strong>{t('insights.n237')}</strong>
                <ul>
                  <li>{t('insights.n238')}</li>
                  <li>{t('insights.n239')}</li>
                  <li>{t('insights.n240')}</li>
                </ul>
              </li>
              <li>
                <strong>{t('insights.n241')}</strong>
                <ul>
                  <li>{t('insights.n242')}</li>
                  <li>{t('insights.n243')}</li>
                  <li>{t('insights.n244')}</li>
                </ul>
              </li>
            </ol>
          </div>
        </section>

        {/* Final CTA */}
        <div className="why-matters">
          <h3>{t('insights.n245')}</h3>
          <p>{t('insights.n246')}</p>
          <button 
            onClick={() => navigate('/analyze')}
            className="cta-button"
          >{t('insights.n247')}</button>
        </div>
      </div>
    </div>
  );
}