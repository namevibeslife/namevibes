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
                  <td>{t('insights.n033')}</td>
                  <td>{t('insights.n034')}</td>
                  <td>2</td>
                  <td>{t('insights.n035')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n036')}</td>
                  <td>{t('insights.n037')}</td>
                  <td>10</td>
                  <td>{t('insights.n038')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n039')}</td>
                  <td>{t('insights.n040')}</td>
                  <td>18</td>
                  <td>{t('insights.n041')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n042')}</td>
                  <td>{t('insights.n043')}</td>
                  <td>36</td>
                  <td>{t('insights.n044')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n045')}</td>
                  <td>{t('insights.n046')}</td>
                  <td>54</td>
                  <td>{t('insights.n047')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n048')}</td>
                  <td>{t('insights.n049')}</td>
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
                  <td>{t('insights.n052')}</td>
                  <td>{t('insights.n053')}</td>
                  <td>3</td>
                  <td>{t('insights.n054')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n055')}</td>
                  <td>{t('insights.n056')}</td>
                  <td>11</td>
                  <td>{t('insights.n057')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n058')}</td>
                  <td>K</td>
                  <td>19</td>
                  <td>{t('insights.n059')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n060')}</td>
                  <td>{t('insights.n061')}</td>
                  <td>37</td>
                  <td>{t('insights.n062')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n063')}</td>
                  <td>{t('insights.n064')}</td>
                  <td>55</td>
                  <td>{t('insights.n065')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n066')}</td>
                  <td>{t('insights.n067')}</td>
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
                  <td>{t('insights.n070')}</td>
                  <td>{t('insights.n071')}</td>
                  <td>4</td>
                  <td>{t('insights.n072')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n073')}</td>
                  <td>{t('insights.n074')}</td>
                  <td>12</td>
                  <td>{t('insights.n075')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n076')}</td>
                  <td>{t('insights.n077')}</td>
                  <td>20</td>
                  <td>{t('insights.n078')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n079')}</td>
                  <td>{t('insights.n080')}</td>
                  <td>38</td>
                  <td>{t('insights.n081')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n082')}</td>
                  <td>{t('insights.n083')}</td>
                  <td>56</td>
                  <td>{t('insights.n084')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n085')}</td>
                  <td>{t('insights.n086')}</td>
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
                  <td>{t('insights.n095')}</td>
                  <td>H</td>
                  <td>{t('insights.n096')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n097')}</td>
                  <td>C</td>
                  <td>{t('insights.n098')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n099')}</td>
                  <td>N</td>
                  <td>{t('insights.n100')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n101')}</td>
                  <td>O</td>
                  <td>{t('insights.n102')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n103')}</td>
                  <td>P</td>
                  <td>{t('insights.n104')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n105')}</td>
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
                  <td>{t('insights.n108')}</td>
                  <td>F</td>
                  <td>{t('insights.n109')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n110')}</td>
                  <td>{t('insights.n111')}</td>
                  <td>{t('insights.n112')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n113')}</td>
                  <td>{t('insights.n114')}</td>
                  <td>{t('insights.n115')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n116')}</td>
                  <td>I</td>
                  <td>{t('insights.n117')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n118')}</td>
                  <td>{t('insights.n119')}</td>
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
                  <td>{t('insights.n133')}</td>
                  <td>{t('insights.n134')}</td>
                  <td>{t('insights.n135')}</td>
                  <td>{t('insights.n136')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n137')}</td>
                  <td>{t('insights.n138')}</td>
                  <td>{t('insights.n139')}</td>
                  <td>{t('insights.n140')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n141')}</td>
                  <td>{t('insights.n142')}</td>
                  <td>{t('insights.n143')}</td>
                  <td>{t('insights.n144')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n145')}</td>
                  <td>{t('insights.n134')}</td>
                  <td>{t('insights.n146')}</td>
                  <td>{t('insights.n147')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n148')}</td>
                  <td>{t('insights.n138')}</td>
                  <td>{t('insights.n149')}</td>
                  <td>{t('insights.n150')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n151')}</td>
                  <td>{t('insights.n142')}</td>
                  <td>{t('insights.n152')}</td>
                  <td>{t('insights.n153')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n154')}</td>
                  <td>{t('insights.n138')}</td>
                  <td>{t('insights.n155')}</td>
                  <td>{t('insights.n156')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n157')}</td>
                  <td>{t('insights.n142')}</td>
                  <td>{t('insights.n158')}</td>
                  <td>{t('insights.n159')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n160')}</td>
                  <td>{t('insights.n134')}</td>
                  <td>{t('insights.n161')}</td>
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
                  <td>{t('insights.n164')}</td>
                  <td>{t('insights.n165')}</td>
                  <td>{t('insights.n166')}</td>
                  <td>{t('insights.n167')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n168')}</td>
                  <td>{t('insights.n165')}</td>
                  <td>{t('insights.n169')}</td>
                  <td>{t('insights.n170')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n171')}</td>
                  <td>{t('insights.n165')}</td>
                  <td>{t('insights.n172')}</td>
                  <td>{t('insights.n173')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n174')}</td>
                  <td>{t('insights.n175')}</td>
                  <td>{t('insights.n176')}</td>
                  <td>{t('insights.n177')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n178')}</td>
                  <td>{t('insights.n175')}</td>
                  <td>{t('insights.n179')}</td>
                  <td>{t('insights.n180')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n181')}</td>
                  <td>{t('insights.n175')}</td>
                  <td>{t('insights.n182')}</td>
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
                  <td>{t('insights.n185')}</td>
                  <td>{t('insights.n186')}</td>
                  <td>{t('insights.n187')}</td>
                  <td>{t('insights.n188')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n189')}</td>
                  <td>{t('insights.n186')}</td>
                  <td>{t('insights.n190')}</td>
                  <td>{t('insights.n191')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n192')}</td>
                  <td>{t('insights.n186')}</td>
                  <td>{t('insights.n193')}</td>
                  <td>{t('insights.n194')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n195')}</td>
                  <td>{t('insights.n196')}</td>
                  <td>{t('insights.n197')}</td>
                  <td>{t('insights.n198')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n199')}</td>
                  <td>{t('insights.n196')}</td>
                  <td>{t('insights.n200')}</td>
                  <td>{t('insights.n201')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n202')}</td>
                  <td>{t('insights.n196')}</td>
                  <td>{t('insights.n203')}</td>
                  <td>{t('insights.n204')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n205')}</td>
                  <td>{t('insights.n206')}</td>
                  <td>{t('insights.n207')}</td>
                  <td>{t('insights.n208')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n209')}</td>
                  <td>{t('insights.n206')}</td>
                  <td>{t('insights.n210')}</td>
                  <td>{t('insights.n211')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n212')}</td>
                  <td>{t('insights.n206')}</td>
                  <td>{t('insights.n213')}</td>
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
                  <td>{t('insights.n216')}</td>
                  <td>{t('insights.n217')}</td>
                  <td>{t('insights.n218')}</td>
                  <td>{t('insights.n219')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n220')}</td>
                  <td>{t('insights.n217')}</td>
                  <td>{t('insights.n221')}</td>
                  <td>{t('insights.n222')}</td>
                </tr>
                <tr>
                  <td>{t('insights.n223')}</td>
                  <td>{t('insights.n217')}</td>
                  <td>{t('insights.n224')}</td>
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