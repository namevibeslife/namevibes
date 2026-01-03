import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { parseNameToElements } from '../utils/elements';
import { ArrowLeft, Download, Plus, X, LogOut, Share2, Instagram } from 'lucide-react';
import jsPDF from 'jspdf';

const RELATIONS = [
  'Father', 'Mother', 'Son', 'Daughter', 'Brother', 'Sister',
  'Husband', 'Wife', 'Friend', 'Uncle', 'Aunt', 'Grandfather',
  'Grandmother', 'Cousin', 'In-Law', 'Company Name', 'Brand Name',
  'Pet Name', 'Other'
];

export default function FamilyPackage() {
  const navigate = useNavigate();
  
  const [names, setNames] = useState([
    { id: 1, firstName: '', middleName: '', lastName: '', relation: 'Father' }
  ]);
  const [results, setResults] = useState(null);
  const [showingCount, setShowingCount] = useState(10);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleShare = () => {
    const text = `Check out our family name chemistry on NameVibes!`;
    const url = 'https://namevibes.life?ref=NV2024XYZ';
    window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`);
  };

  const addName = () => {
    if (names.length < 50) {
      setNames([...names, {
        id: Date.now(),
        firstName: '',
        middleName: '',
        lastName: '',
        relation: 'Mother'
      }]);
    }
  };

  const removeName = (id) => {
    if (names.length > 1) {
      setNames(names.filter(n => n.id !== id));
    }
  };

  const updateName = (id, field, value) => {
    setNames(names.map(n => n.id === id ? { ...n, [field]: value } : n));
  };

  const handleAnalyzeAll = () => {
    const validNames = names.filter(n => n.firstName.trim() && n.lastName.trim());
    
    if (validNames.length === 0) {
      alert('Please enter at least one complete name (First and Last name required)');
      return;
    }

    const analyzed = validNames.map(nameData => {
      const fullName = `${nameData.firstName} ${nameData.middleName} ${nameData.lastName}`.trim();
      const elements = parseNameToElements(fullName);
      
      return {
        ...nameData,
        fullName,
        elements
      };
    });

    setResults(analyzed);
  };

  const findCommonElements = () => {
    if (!results || results.length < 2) return [];
    
    const allElementSymbols = results.map(r => 
      r.elements.map(e => e.symbol)
    );
    
    const firstSet = new Set(allElementSymbols[0]);
    const common = [...firstSet].filter(symbol =>
      allElementSymbols.every(symbols => symbols.includes(symbol))
    );
    
    return results[0].elements.filter(e => common.includes(e.symbol))
      .filter((e, i, arr) => arr.findIndex(x => x.symbol === e.symbol) === i);
  };

  const downloadPDF = async () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;
    let yPos = margin;

    const addNewPage = () => {
      pdf.addPage();
      yPos = margin;
      pdf.setFontSize(10);
      pdf.setTextColor(100);
      pdf.text('www.namevibes.life', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;
    };

    // Title
    pdf.setFontSize(24);
    pdf.setTextColor(147, 51, 234);
    pdf.setFont('helvetica', 'bold');
    pdf.text('NameVibes', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    pdf.setFontSize(14);
    pdf.setTextColor(100);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Family Chemistry Report', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // For each person
    for (let i = 0; i < results.length; i++) {
      const person = results[i];
      
      if (yPos > pageHeight - 100) {
        addNewPage();
      }

      // Relation + Name
      pdf.setFontSize(12);
      pdf.setTextColor(100);
      pdf.setFont('helvetica', 'bold');
      if (results.length > 1) {
        pdf.text(person.relation.toUpperCase(), margin, yPos);
        yPos += 7;
      }
      
      pdf.setFontSize(18);
      pdf.setTextColor(0);
      pdf.text(person.fullName, margin, yPos);
      yPos += 12;

      // Elements
      const boxSize = 28;
      const boxGap = 6;
      const elementsPerRow = 5;
      let xPos = margin;
      let rowYPos = yPos;

      for (let j = 0; j < person.elements.length; j++) {
        const element = person.elements[j];
        
        if (j > 0 && j % elementsPerRow === 0) {
          xPos = margin;
          rowYPos += boxSize + 18;
        }

        if (rowYPos > pageHeight - 50) {
          addNewPage();
          rowYPos = yPos;
          xPos = margin;
        }

        const rgb = hexToRgb(element.color);
        pdf.setFillColor(rgb.r, rgb.g, rgb.b);
        pdf.rect(xPos, rowYPos, boxSize, boxSize, 'F');
        
        pdf.setDrawColor(80);
        pdf.setLineWidth(0.5);
        pdf.rect(xPos, rowYPos, boxSize, boxSize);

        // Atomic number - LARGER
        pdf.setFontSize(9);
        pdf.setTextColor(0);
        pdf.setFont('helvetica', 'bold');
        pdf.text(element.number.toString(), xPos + 2, rowYPos + 4);

        // Element symbol - LARGER
        pdf.setFontSize(20);
        pdf.setFont('helvetica', 'bold');
        const symbolWidth = pdf.getTextWidth(element.symbol);
        pdf.text(element.symbol, xPos + (boxSize - symbolWidth) / 2, rowYPos + boxSize / 2 + 4);

        // Element name - LARGER
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        const nameWidth = pdf.getTextWidth(element.name);
        pdf.text(element.name, xPos + (boxSize - nameWidth) / 2, rowYPos + boxSize + 5);

        xPos += boxSize + boxGap;
      }

      yPos = rowYPos + boxSize + 20;
      
      if (i < results.length - 1) {
        pdf.setDrawColor(200);
        pdf.setLineWidth(0.3);
        pdf.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 10;
      }
    }

    // Common Elements
    if (results.length > 1) {
      const commonElements = findCommonElements();
      
      if (commonElements.length > 0) {
        addNewPage();
        
        pdf.setFontSize(22);
        pdf.setTextColor(147, 51, 234);
        pdf.setFont('helvetica', 'bold');
        pdf.text('The Harmony', pageWidth / 2, yPos, { align: 'center' });
        yPos += 8;
        
        pdf.setFontSize(12);
        pdf.setTextColor(100);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Common Elements Across All Names', pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;

        const boxSize = 28;
        const boxGap = 6;
        const elementsPerRow = 5;
        let xPos = margin;
        let rowYPos = yPos;

        for (let j = 0; j < commonElements.length; j++) {
          const element = commonElements[j];
          
          if (j > 0 && j % elementsPerRow === 0) {
            xPos = margin;
            rowYPos += boxSize + 18;
          }

          const rgb = hexToRgb(element.color);
          pdf.setFillColor(rgb.r, rgb.g, rgb.b);
          pdf.rect(xPos, rowYPos, boxSize, boxSize, 'F');
          
          pdf.setDrawColor(80);
          pdf.setLineWidth(0.5);
          pdf.rect(xPos, rowYPos, boxSize, boxSize);

          pdf.setFontSize(9);
          pdf.setTextColor(0);
          pdf.setFont('helvetica', 'bold');
          pdf.text(element.number.toString(), xPos + 2, rowYPos + 4);

          pdf.setFontSize(20);
          pdf.setFont('helvetica', 'bold');
          const symbolWidth = pdf.getTextWidth(element.symbol);
          pdf.text(element.symbol, xPos + (boxSize - symbolWidth) / 2, rowYPos + boxSize / 2 + 4);

          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'bold');
          const nameWidth = pdf.getTextWidth(element.name);
          pdf.text(element.name, xPos + (boxSize - nameWidth) / 2, rowYPos + boxSize + 5);

          xPos += boxSize + boxGap;
        }
      }
    }

    pdf.setFontSize(8);
    pdf.setTextColor(150);
    const date = new Date().toLocaleDateString();
    pdf.text(date, margin, pageHeight - 10);
    pdf.text('www.namevibes.life', pageWidth - margin, pageHeight - 10, { align: 'right' });

    pdf.save(`NameVibes_Family_Report.pdf`);
  };

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  }

  if (results) {
    const displayedResults = results.slice(0, showingCount);
    const commonElements = results.length > 1 ? findCommonElements() : [];

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='molecules' x='0' y='0' width='200' height='200' patternUnits='userSpaceOnUse'%3E%3Ccircle cx='40' cy='40' r='3' fill='%236b21a8' opacity='0.05'/%3E%3Ccircle cx='80' cy='60' r='3' fill='%236b21a8' opacity='0.05'/%3E%3Ccircle cx='60' cy='100' r='3' fill='%236b21a8' opacity='0.05'/%3E%3Ccircle cx='120' cy='80' r='3' fill='%236b21a8' opacity='0.05'/%3E%3Cline x1='40' y1='40' x2='80' y2='60' stroke='%236b21a8' stroke-width='1' opacity='0.05'/%3E%3Cline x1='80' y1='60' x2='60' y2='100' stroke='%236b21a8' stroke-width='1' opacity='0.05'/%3E%3Cline x1='60' y1='100' x2='120' y2='80' stroke='%236b21a8' stroke-width='1' opacity='0.05'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23molecules)'/%3E%3C/svg%3E")`
      }}>
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setResults(null)}
                  className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
                >
                  <ArrowLeft size={20} />
                  Back
                </button>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  NameVibes - Family Package
                </h1>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </header>

        <div className="container mx-auto max-w-6xl py-8 px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="mb-8">
              <h2 className="text-4xl font-bold text-center mb-4">
                {results.length === 1 ? 'Name Chemistry' : 'Family Chemistry Analysis'}
              </h2>
              
              <div className="flex gap-4 justify-center mb-6">
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                >
                  <Share2 size={20} />
                  Share on WhatsApp
                </button>
                <button
                  onClick={downloadPDF}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition"
                >
                  <Download size={20} />
                  Download PDF
                </button>
              </div>

              <p className="text-center text-lg text-gray-600 italic font-medium">
                "Elements of the Universe Found in Your Names"
              </p>
            </div>

            {/* Individual Results */}
            {displayedResults.map((person, idx) => (
              <div key={idx} className="mb-12 pb-8 border-b-2 border-gray-100 last:border-0">
                {results.length > 1 && (
                  <div className="text-xs font-bold text-purple-600 uppercase tracking-wide mb-1">
                    {person.relation}
                  </div>
                )}
                <h3 className="text-3xl font-bold text-gray-800 mb-6">{person.fullName}</h3>

                {/* Element Boxes - LARGER */}
                <div className="flex flex-wrap gap-6 justify-center p-6 bg-gray-50 rounded-xl mb-6">
                  {person.elements.map((el, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div
                        className="relative border-4 border-gray-800 rounded-lg p-4 w-40 h-40 flex flex-col justify-between"
                        style={{ backgroundColor: el.color }}
                      >
                        <div className="text-base font-mono text-gray-800 font-bold">
                          {el.number}
                        </div>
                        <div className="text-7xl font-bold text-gray-800 text-center leading-none">
                          {el.symbol}
                        </div>
                        <div className="text-base text-gray-800 text-center font-bold">
                          {el.name}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Element Table - SAME AS INDIVIDUAL */}
                <div className="overflow-x-auto">
                  <h4 className="text-2xl font-bold text-gray-800 mb-4">Element Colors & Meanings</h4>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-purple-600 text-white">
                        <th className="border border-gray-300 px-4 py-3 text-left">#</th>
                        <th className="border border-gray-300 px-4 py-3 text-left">Element</th>
                        <th className="border border-gray-300 px-4 py-3 text-left">Atomic Number</th>
                        <th className="border border-gray-300 px-4 py-3 text-left">Color</th>
                        <th className="border border-gray-300 px-4 py-3 text-left">Life Meaning</th>
                      </tr>
                    </thead>
                    <tbody>
                      {person.elements.map((el, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-3 font-semibold">{i + 1}</td>
                          <td className="border border-gray-300 px-4 py-3 font-semibold">{el.name}</td>
                          <td className="border border-gray-300 px-4 py-3">{el.number}</td>
                          <td className="border border-gray-300 px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-12 h-12 rounded border-2 border-gray-400"
                                style={{ backgroundColor: el.color }}
                              />
                              <span className="font-mono text-sm">{el.color}</span>
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-gray-700">{el.meaning}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {results.length > showingCount && (
              <button
                onClick={() => setShowingCount(showingCount + 10)}
                className="w-full py-3 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition font-semibold"
              >
                Show More ({results.length - showingCount} remaining)
              </button>
            )}

            {/* The Harmony - Common Elements */}
            {results.length > 1 && commonElements.length > 0 && (
              <div className="mt-12 pt-8 border-t-2 border-purple-200">
                <h3 className="text-3xl font-bold text-purple-600 mb-2 text-center">The Harmony</h3>
                <p className="text-gray-600 mb-6 text-center text-lg italic">
                  "Common Elements Across All Family Members"
                </p>

                <div className="flex flex-wrap gap-6 justify-center p-6 bg-purple-50 rounded-xl mb-6">
                  {commonElements.map((el, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div
                        className="relative border-4 border-purple-600 rounded-lg p-4 w-40 h-40 flex flex-col justify-between"
                        style={{ backgroundColor: el.color }}
                      >
                        <div className="text-base font-mono text-gray-800 font-bold">
                          {el.number}
                        </div>
                        <div className="text-7xl font-bold text-gray-800 text-center leading-none">
                          {el.symbol}
                        </div>
                        <div className="text-base text-gray-800 text-center font-bold">
                          {el.name}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-purple-100 rounded-lg p-6 border-2 border-purple-300">
                  <p className="text-lg text-purple-900 text-center">
                    <span className="font-bold">These {commonElements.length} elements</span> appear in all family members' names, 
                    representing the shared vibrational energy and collective identity of your family unit.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50" style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='molecules' x='0' y='0' width='200' height='200' patternUnits='userSpaceOnUse'%3E%3Ccircle cx='40' cy='40' r='3' fill='%236b21a8' opacity='0.05'/%3E%3Ccircle cx='80' cy='60' r='3' fill='%236b21a8' opacity='0.05'/%3E%3Ccircle cx='60' cy='100' r='3' fill='%236b21a8' opacity='0.05'/%3E%3Ccircle cx='120' cy='80' r='3' fill='%236b21a8' opacity='0.05'/%3E%3Cline x1='40' y1='40' x2='80' y2='60' stroke='%236b21a8' stroke-width='1' opacity='0.05'/%3E%3Cline x1='80' y1='60' x2='60' y2='100' stroke='%236b21a8' stroke-width='1' opacity='0.05'/%3E%3Cline x1='60' y1='100' x2='120' y2='80' stroke='%236b21a8' stroke-width='1' opacity='0.05'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23molecules)'/%3E%3C/svg%3E")`
    }}>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
              >
                <ArrowLeft size={20} />
                Back
              </button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                NameVibes - Family Package
              </h1>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-4xl py-8 px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Family Package</h1>
          <p className="text-gray-600 mb-8">
            Analyze up to 50 names • Showing {Math.min(names.length, 10)} at once
          </p>

          <div className="space-y-6">
            {names.map((nameData, index) => (
              <div key={nameData.id} className="bg-gray-50 rounded-xl p-6 relative">
                <div className="absolute top-4 right-4">
                  {names.length > 1 && (
                    <button
                      onClick={() => removeName(nameData.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>

                <div className="grid md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={nameData.firstName}
                      onChange={(e) => updateName(nameData.id, 'firstName', e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      value={nameData.middleName}
                      onChange={(e) => updateName(nameData.id, 'middleName', e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={nameData.lastName}
                      onChange={(e) => updateName(nameData.id, 'lastName', e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Relation
                    </label>
                    <select
                      value={nameData.relation}
                      onChange={(e) => updateName(nameData.id, 'relation', e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    >
                      {RELATIONS.map(rel => (
                        <option key={rel} value={rel}>{rel}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={addName}
              disabled={names.length >= 50}
              className="w-full flex items-center justify-center gap-2 py-3 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              <Plus size={20} />
              Add Another Name ({names.length}/50)
            </button>
          </div>

          <div className="mt-8">
            <button
              onClick={handleAnalyzeAll}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition"
            >
              Analyze All Names
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}