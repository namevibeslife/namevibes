// All 118 elements. Colors follow the common CPK/Jmol scheme; meanings are NameVibes' interpretations.
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
  'Sc': { name: 'Scandium', number: 21, color: '#E6E6E6', meaning: 'Lightness with strength, quiet excellence' },
  'Ti': { name: 'Titanium', number: 22, color: '#BFC2C7', meaning: 'Endurance, courage, unbreakable spirit' },
  'V': { name: 'Vanadium', number: 23, color: '#A6A6AB', meaning: 'Resilience, toughness, inner reinforcement' },
  'Cr': { name: 'Chromium', number: 24, color: '#8A99C7', meaning: 'Shine, confidence, protection' },
  'Mn': { name: 'Manganese', number: 25, color: '#9C7AC7', meaning: 'Support, vitality, bonding' },
  'Fe': { name: 'Iron', number: 26, color: '#E06633', meaning: 'Strength, willpower, grounding' },
  'Co': { name: 'Cobalt', number: 27, color: '#F090A0', meaning: 'Depth, creativity, calm focus' },
  'Ni': { name: 'Nickel', number: 28, color: '#50D050', meaning: 'Adaptability, resistance, durability' },
  'Cu': { name: 'Copper', number: 29, color: '#C88033', meaning: 'Conductivity, warmth, prosperity' },
  'Zn': { name: 'Zinc', number: 30, color: '#7D80B0', meaning: 'Immunity, protection, healing' },
  'Ga': { name: 'Gallium', number: 31, color: '#C28F8F', meaning: 'Flexibility, warmth, transformation by touch' },
  'Ge': { name: 'Germanium', number: 32, color: '#668F8F', meaning: 'Balance, semiconductor, harmony' },
  'As': { name: 'Arsenic', number: 33, color: '#BD80E3', meaning: 'Power, caution, transformation' },
  'Se': { name: 'Selenium', number: 34, color: '#FFA100', meaning: 'Moonlight, renewal, protection' },
  'Br': { name: 'Bromine', number: 35, color: '#A62929', meaning: 'Intensity, passion, fluidity' },
  'Kr': { name: 'Krypton', number: 36, color: '#5CB8D1', meaning: 'Hidden brilliance, mystery, light' },
  'Rb': { name: 'Rubidium', number: 37, color: '#702EB0', meaning: 'Precision, timekeeping, reactivity' },
  'Sr': { name: 'Strontium', number: 38, color: '#00FF00', meaning: 'Celebration, brilliance, bone strength' },
  'Y': { name: 'Yttrium', number: 39, color: '#94FFFF', meaning: 'Brightness, support, versatility' },
  'Zr': { name: 'Zirconium', number: 40, color: '#94E0E0', meaning: 'Resilience, sparkle, endurance' },
  'Nb': { name: 'Niobium', number: 41, color: '#73C2C9', meaning: 'Superconductivity, flow, harmony' },
  'Mo': { name: 'Molybdenum', number: 42, color: '#54B5B5', meaning: 'Steadiness, heat tolerance, support' },
  'Tc': { name: 'Technetium', number: 43, color: '#3B9E9E', meaning: 'Rarity, insight, healing vision' },
  'Ru': { name: 'Ruthenium', number: 44, color: '#248F8F', meaning: 'Hardness, catalysis, refinement' },
  'Rh': { name: 'Rhodium', number: 45, color: '#0A7D8C', meaning: 'Rarity, brilliance, luxury' },
  'Pd': { name: 'Palladium', number: 46, color: '#006985', meaning: 'Purity, cleansing, catalyst' },
  'Ag': { name: 'Silver', number: 47, color: '#C0C0C0', meaning: 'Clarity, intuition, reflection' },
  'Cd': { name: 'Cadmium', number: 48, color: '#FFD98F', meaning: 'Vivid color, energy, caution' },
  'In': { name: 'Indium', number: 49, color: '#A67573', meaning: 'Softness, flexibility, rarity' },
  'Sn': { name: 'Tin', number: 50, color: '#668080', meaning: 'Preservation, flexibility, protection' },
  'Sb': { name: 'Antimony', number: 51, color: '#9E63B5', meaning: 'Ancient wisdom, beauty, transformation' },
  'Te': { name: 'Tellurium', number: 52, color: '#D47A00', meaning: 'Earth connection, rarity, conduction' },
  'I': { name: 'Iodine', number: 53, color: '#940094', meaning: 'Health, thyroid, balance' },
  'Xe': { name: 'Xenon', number: 54, color: '#429EB0', meaning: 'Stranger, brilliance, illumination' },
  'Cs': { name: 'Cesium', number: 55, color: '#57178F', meaning: 'Precision, timing, quick response' },
  'Ba': { name: 'Barium', number: 56, color: '#00C900', meaning: 'Weight, radiance, visibility' },
  'La': { name: 'Lanthanum', number: 57, color: '#70D4FF', meaning: 'Rarity, catalyst, beginning' },
  'Ce': { name: 'Cerium', number: 58, color: '#FFFFC7', meaning: 'Spark, ignition, polish' },
  'Pr': { name: 'Praseodymium', number: 59, color: '#D9FFC7', meaning: 'Green fire, rarity, color' },
  'Nd': { name: 'Neodymium', number: 60, color: '#C7FFC7', meaning: 'Magnetism, attraction, strength' },
  'Pm': { name: 'Promethium', number: 61, color: '#A3FFC7', meaning: 'Gift of light, foresight, glow' },
  'Sm': { name: 'Samarium', number: 62, color: '#8FFFC7', meaning: 'Steady magnetism, focus, calm' },
  'Eu': { name: 'Europium', number: 63, color: '#61FFC7', meaning: 'Vibrant glow, trust, authenticity' },
  'Gd': { name: 'Gadolinium', number: 64, color: '#45FFC7', meaning: 'Insight, seeing within, clarity' },
  'Tb': { name: 'Terbium', number: 65, color: '#30FFC7', meaning: 'Radiance, green light, vitality' },
  'Dy': { name: 'Dysprosium', number: 66, color: '#1FFFC7', meaning: 'Hard to reach, persistence, power' },
  'Ho': { name: 'Holmium', number: 67, color: '#00FF9C', meaning: 'Strongest attraction, focus, home' },
  'Er': { name: 'Erbium', number: 68, color: '#00E675', meaning: 'Fiber optics, pink, amplification' },
  'Tm': { name: 'Thulium', number: 69, color: '#00D452', meaning: 'X-ray, portable, medical' },
  'Yb': { name: 'Ytterbium', number: 70, color: '#00BF38', meaning: 'Precision, steadiness, accuracy' },
  'Lu': { name: 'Lutetium', number: 71, color: '#00AB24', meaning: 'Completion, density, refinement' },
  'Hf': { name: 'Hafnium', number: 72, color: '#4DC2FF', meaning: 'Control, resilience, harbor' },
  'Ta': { name: 'Tantalum', number: 73, color: '#4DA6FF', meaning: 'Patience, endurance, incorruptibility' },
  'W': { name: 'Tungsten', number: 74, color: '#2194D6', meaning: 'Strength, endurance, highest melting' },
  'Re': { name: 'Rhenium', number: 75, color: '#267DAB', meaning: 'Rarity, catalyst, high temperature' },
  'Os': { name: 'Osmium', number: 76, color: '#266696', meaning: 'Density, depth, steadfastness' },
  'Ir': { name: 'Iridium', number: 77, color: '#175487', meaning: 'Rainbow, resilience, timelessness' },
  'Pt': { name: 'Platinum', number: 78, color: '#D0D0E0', meaning: 'Nobility, value, catalyst' },
  'Au': { name: 'Gold', number: 79, color: '#FFD123', meaning: 'Wealth, sun, perfection' },
  'Hg': { name: 'Mercury', number: 80, color: '#B8B8D0', meaning: 'Communication, quickness, fluidity' },
  'Tl': { name: 'Thallium', number: 81, color: '#A6544D', meaning: 'Green branch, caution, growth' },
  'Pb': { name: 'Lead', number: 82, color: '#575961', meaning: 'Protection, weight, transformation' },
  'Bi': { name: 'Bismuth', number: 83, color: '#9E4FB5', meaning: 'Rainbow, crystal, transformation' },
  'Po': { name: 'Polonium', number: 84, color: '#AB5C00', meaning: 'Homeland, intensity, heritage' },
  'At': { name: 'Astatine', number: 85, color: '#754F45', meaning: 'Impermanence, rarity, change' },
  'Rn': { name: 'Radon', number: 86, color: '#428296', meaning: 'Hidden energy, awareness, release' },
  'Fr': { name: 'Francium', number: 87, color: '#420066', meaning: 'Fleeting brilliance, freedom, rarity' },
  'Ra': { name: 'Radium', number: 88, color: '#007D00', meaning: 'Radioactivity, glow, medical' },
  'Ac': { name: 'Actinium', number: 89, color: '#70ABFA', meaning: 'Ray of light, action, beginnings' },
  'Th': { name: 'Thorium', number: 90, color: '#00BAFF', meaning: 'Thunder, power, lasting energy' },
  'Pa': { name: 'Protactinium', number: 91, color: '#00A1FF', meaning: 'Origin, ancestry, foundation' },
  'U': { name: 'Uranium', number: 92, color: '#008FFF', meaning: 'Power, energy, atomic age' },
  'Np': { name: 'Neptunium', number: 93, color: '#0080FF', meaning: 'Depth, intuition, the sea' },
  'Pu': { name: 'Plutonium', number: 94, color: '#006BFF', meaning: 'Transformation, depth, rebirth' },
  'Am': { name: 'Americium', number: 95, color: '#545CF2', meaning: 'Smoke detector, safety, ionization' },
  'Cm': { name: 'Curium', number: 96, color: '#785CE3', meaning: 'Curiosity, discovery, dedication' },
  'Bk': { name: 'Berkelium', number: 97, color: '#8A4FE3', meaning: 'Learning, scholarship, discovery' },
  'Cf': { name: 'Californium', number: 98, color: '#A136D4', meaning: 'Spark, initiation, golden potential' },
  'Es': { name: 'Einsteinium', number: 99, color: '#B31FD4', meaning: 'Einstein, intelligence, rarity' },
  'Fm': { name: 'Fermium', number: 100, color: '#B31FBA', meaning: 'Inquiry, reasoning, innovation' },
  'Md': { name: 'Mendelevium', number: 101, color: '#B30DA6', meaning: 'Order, patterns, organization' },
  'No': { name: 'Nobelium', number: 102, color: '#BD0D87', meaning: 'Honor, achievement, legacy' },
  'Lr': { name: 'Lawrencium', number: 103, color: '#C70066', meaning: 'Ingenuity, invention, progress' },
  'Rf': { name: 'Rutherfordium', number: 104, color: '#CC0059', meaning: 'Pioneering, structure, insight' },
  'Db': { name: 'Dubnium', number: 105, color: '#D1004F', meaning: 'Collaboration, research, teamwork' },
  'Sg': { name: 'Seaborgium', number: 106, color: '#D90045', meaning: 'Exploration, mapping, recognition' },
  'Bh': { name: 'Bohrium', number: 107, color: '#E00038', meaning: 'Understanding, structure, orbits' },
  'Hs': { name: 'Hassium', number: 108, color: '#E6002E', meaning: 'Homeland, heaviness, stability' },
  'Mt': { name: 'Meitnerium', number: 109, color: '#EB0026', meaning: 'Recognition, perseverance, courage' },
  'Ds': { name: 'Darmstadtium', number: 110, color: '#F00024', meaning: 'Place, roots, community' },
  'Rg': { name: 'Roentgenium', number: 111, color: '#F2001F', meaning: 'Seeing through, revelation, clarity' },
  'Cn': { name: 'Copernicium', number: 112, color: '#F5001A', meaning: 'New perspective, cosmos, centering' },
  'Nh': { name: 'Nihonium', number: 113, color: '#F70015', meaning: 'Rising sun, origin, dawn' },
  'Fl': { name: 'Flerovium', number: 114, color: '#FA0010', meaning: 'Stability amid change, island of calm' },
  'Mc': { name: 'Moscovium', number: 115, color: '#FC000B', meaning: 'Boldness, short-lived spark, courage' },
  'Lv': { name: 'Livermorium', number: 116, color: '#FD0007', meaning: 'Life, vigor, liveliness' },
  'Ts': { name: 'Tennessine', number: 117, color: '#FE0004', meaning: 'Reaching the edge, completion, salt of change' },
  'Og': { name: 'Oganesson', number: 118, color: '#FF0000', meaning: 'Final frontier, completion, nobility' }
};

// Dark tiles (e.g. Francium, Lead) need light text to stay readable
export function textColorFor(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return '#1f2937';
  const [r, g, b] = m.slice(1).map(v => parseInt(v, 16) / 255);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance < 0.45 ? '#ffffff' : '#1f2937';
}

const toElement = (symbol) => ({ symbol, ...ELEMENTS[symbol] });

/**
 * Splits one word into element symbols, covering as many letters as possible.
 * Ties go to the split with fewer (so more two-letter) elements, then to the one that
 * uses a two-letter symbol earliest. Returns { elements, unmatched } where unmatched
 * lists letters no element could cover.
 */
function splitWord(word) {
  const n = word.length;
  // best[i] = best result for word.slice(i)
  const best = new Array(n + 1);
  best[n] = { covered: 0, count: 0, steps: [] };

  for (let i = n - 1; i >= 0; i--) {
    const options = [];
    if (i + 1 < n) {
      const two = word[i] + word[i + 1].toLowerCase();
      if (ELEMENTS[two]) {
        const rest = best[i + 2];
        options.push({ covered: rest.covered + 2, count: rest.count + 1, steps: [{ symbol: two }, ...rest.steps] });
      }
    }
    if (ELEMENTS[word[i]]) {
      const rest = best[i + 1];
      options.push({ covered: rest.covered + 1, count: rest.count + 1, steps: [{ symbol: word[i] }, ...rest.steps] });
    }
    const rest = best[i + 1];
    options.push({ covered: rest.covered, count: rest.count, steps: [{ skipped: word[i] }, ...rest.steps] });

    // Options are listed two-letter first, so a stable "first best" keeps the earliest two-letter symbol
    best[i] = options.reduce((a, b) => (b.covered > a.covered || (b.covered === a.covered && b.count < a.count) ? b : a));
  }

  return {
    elements: best[0].steps.filter(s => s.symbol).map(s => toElement(s.symbol)),
    unmatched: best[0].steps.filter(s => s.skipped).map(s => s.skipped)
  };
}

/**
 * Element breakdown of a full name. Each word is split on its own, so an initial like "S"
 * stays Sulfur instead of merging with the next word.
 */
export function analyzeName(name) {
  const words = (name || '').toUpperCase().split(/[^A-Z]+/).filter(Boolean);
  const parts = words.map(splitWord);
  return {
    elements: parts.flatMap(p => p.elements),
    unmatched: parts.flatMap(p => p.unmatched)
  };
}

export function parseNameToElements(name) {
  return analyzeName(name).elements;
}

/**
 * Public API used by UI
 * (important: keep this name stable)
 */
export const analyzeWord = parseNameToElements;
