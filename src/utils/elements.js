export const ELEMENTS = {
  'H': { name: 'Hydrogen', number: 1, color: '#FFFFFF', meaning: 'Purity, new beginnings, clarity' },
  'He': { name: 'Helium', number: 2, color: '#D9FFFF', meaning: 'Lightness, joy, elevation' },
  'Li': { name: 'Lithium', number: 3, color: '#CC80FF', meaning: 'Energy, mood balance, stability' },
  'Be': { name: 'Beryllium', number: 4, color: '#C2FF00', meaning: 'Strength, resilience, structure' },
  'B': { name: 'Boron', number: 5, color: '#FFB5B5', meaning: 'Growth, support, foundation' },
  'C': { name: 'Carbon', number: 6, color: '#909090', meaning: 'Life, adaptability, transformation' },
  'N': { name: 'Nitrogen', number: 7, color: '#3050F8', meaning: 'Calm, stability, peace' },
  'O': { name: 'Oxygen', number: 8, color: '#FF0D0D', meaning: 'Vitality, passion, life force' },
  'F': { name: 'Fluorine', number: 9, color: '#90E050', meaning: 'Protection, strength, sharpness' },
  'Ne': { name: 'Neon', number: 10, color: '#B3E3F5', meaning: 'Brightness, attraction, visibility' },
  'Na': { name: 'Sodium', number: 11, color: '#AB5CF2', meaning: 'Balance, reactivity, connection' },
  'Mg': { name: 'Magnesium', number: 12, color: '#8AFF00', meaning: 'Healing, relaxation, growth' },
  'Al': { name: 'Aluminum', number: 13, color: '#BFA6A6', meaning: 'Flexibility, lightness, reflection' },
  'Si': { name: 'Silicon', number: 14, color: '#F0C8A0', meaning: 'Foundation, technology, structure' },
  'P': { name: 'Phosphorus', number: 15, color: '#FF8000', meaning: 'Energy, illumination, creativity' },
  'S': { name: 'Sulfur', number: 16, color: '#FFFF30', meaning: 'Transformation, purification, healing' },
  'Cl': { name: 'Chlorine', number: 17, color: '#1FF01F', meaning: 'Cleansing, protection, clarity' },
  'Ar': { name: 'Argon', number: 18, color: '#80D1E3', meaning: 'Peace, nobility, non-reactivity' },
  'K': { name: 'Potassium', number: 19, color: '#8F40D4', meaning: 'Activity, impulse, movement' },
  'Ca': { name: 'Calcium', number: 20, color: '#3DFF00', meaning: 'Strength, structure, support' },
  'Fe': { name: 'Iron', number: 26, color: '#E06633', meaning: 'Strength, willpower, grounding' },
  'Ni': { name: 'Nickel', number: 28, color: '#50D050', meaning: 'Adaptability, resistance, durability' },
  'Cu': { name: 'Copper', number: 29, color: '#C88033', meaning: 'Conductivity, warmth, prosperity' },
  'Ge': { name: 'Germanium', number: 32, color: '#668F8F', meaning: 'Balance, semiconductor, harmony' },
  'As': { name: 'Arsenic', number: 33, color: '#BD80E3', meaning: 'Power, caution, transformation' },
  'Ag': { name: 'Silver', number: 47, color: '#C0C0C0', meaning: 'Clarity, intuition, reflection' },
  'In': { name: 'Indium', number: 49, color: '#A67573', meaning: 'Softness, flexibility, rarity' },
  'Sn': { name: 'Tin', number: 50, color: '#668080', meaning: 'Preservation, flexibility, protection' },
  'I': { name: 'Iodine', number: 53, color: '#940094', meaning: 'Health, thyroid, balance' },
  'Ba': { name: 'Barium', number: 56, color: '#00C900', meaning: 'Weight, radiance, visibility' },
  'La': { name: 'Lanthanum', number: 57, color: '#70D4FF', meaning: 'Rarity, catalyst, beginning' },
  'Pr': { name: 'Praseodymium', number: 59, color: '#D9FFC7', meaning: 'Green fire, rarity, color' },
  'Nd': { name: 'Neodymium', number: 60, color: '#C7FFC7', meaning: 'Magnetism, attraction, strength' },
  'Er': { name: 'Erbium', number: 68, color: '#00E675', meaning: 'Fiber optics, pink, amplification' },
  'Tm': { name: 'Thulium', number: 69, color: '#00D452', meaning: 'X-ray, portable, medical' },
  'W': { name: 'Tungsten', number: 74, color: '#2194D6', meaning: 'Strength, endurance, highest melting' },
  'Re': { name: 'Rhenium', number: 75, color: '#267DAB', meaning: 'Rarity, catalyst, high temperature' },
  'Pt': { name: 'Platinum', number: 78, color: '#D0D0E0', meaning: 'Nobility, value, catalyst' },
  'Au': { name: 'Gold', number: 79, color: '#FFD123', meaning: 'Wealth, sun, perfection' },
  'Pb': { name: 'Lead', number: 82, color: '#575961', meaning: 'Protection, weight, transformation' },
  'Bi': { name: 'Bismuth', number: 83, color: '#9E4FB5', meaning: 'Rainbow, crystal, transformation' },
  'Ra': { name: 'Radium', number: 88, color: '#007D00', meaning: 'Radioactivity, glow, medical' },
  'U': { name: 'Uranium', number: 92, color: '#008FFF', meaning: 'Power, energy, atomic age' },
  'Am': { name: 'Americium', number: 95, color: '#545CF2', meaning: 'Smoke detector, safety, ionization' },
  'Es': { name: 'Einsteinium', number: 99, color: '#B31FD4', meaning: 'Einstein, intelligence, rarity' },
};

export function parseNameToElements(name) {
  const upperName = name.toUpperCase().replace(/[^A-Z]/g, '');
  const elements = [];
  let i = 0;

  while (i < upperName.length) {
    let found = false;
    
    // Try two-letter element first
    if (i < upperName.length - 1) {
      const twoLetter = upperName[i] + upperName[i + 1].toLowerCase();
      if (ELEMENTS[twoLetter]) {
        elements.push({
          symbol: twoLetter,
          ...ELEMENTS[twoLetter]
        });
        i += 2;
        found = true;
      }
    }
    
    // Try one-letter element
    if (!found) {
      const oneLetter = upperName[i];
      if (ELEMENTS[oneLetter]) {
        elements.push({
          symbol: oneLetter,
          ...ELEMENTS[oneLetter]
        });
        i += 1;
        found = true;
      }
    }
    
    // Skip if no element found
    if (!found) {
      i += 1;
    }
  }
  
  return elements;
}
/**
 * Public API used by UI
 * (important: keep this name stable)
 */
export const analyzeWord = parseNameToElements;