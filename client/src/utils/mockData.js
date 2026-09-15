// Centralized mock data for ShadeMatch Part 2 (UI only).
// This will be replaced by real API calls once the backend/ML service
// implement client storage, skin analysis, and shade matching.

export const artist = {
  name: 'Maya Reyes',
  role: 'Senior Makeup Artist',
  initials: 'MR',
};

export const quickStats = [
  { id: 'clients', label: 'Clients analyzed', value: 42 },
  { id: 'matches', label: 'Matches made', value: 87 },
  { id: 'shades', label: 'Foundation shades', value: 156 },
];

export const skinProfiles = {
  amara: { depth: 'Medium Deep', depthValue: 68, undertone: 'Warm', hue: 'Golden', confidence: 91 },
  elena: { depth: 'Light Medium', depthValue: 38, undertone: 'Cool', hue: 'Rosy', confidence: 88 },
  priya: { depth: 'Deep', depthValue: 84, undertone: 'Neutral', hue: 'Olive', confidence: 93 },
  sofia: { depth: 'Medium', depthValue: 52, undertone: 'Warm', hue: 'Peach', confidence: 90 },
  noor: { depth: 'Light', depthValue: 22, undertone: 'Cool', hue: 'Pink', confidence: 86 },
};

export const mockClients = [
  {
    id: 'c1',
    name: 'Amara Osei',
    lastAnalyzed: '2026-09-10',
    skinProfile: skinProfiles.amara,
    lastMatchedFoundation: { brand: 'MAC', product: 'Studio Fix Fluid', shade: 'NC42' },
  },
  {
    id: 'c2',
    name: 'Elena Petrova',
    lastAnalyzed: '2026-09-08',
    skinProfile: skinProfiles.elena,
    lastMatchedFoundation: { brand: 'NARS', product: 'Light Reflecting', shade: 'Vallauris' },
  },
  {
    id: 'c3',
    name: 'Priya Shah',
    lastAnalyzed: '2026-09-05',
    skinProfile: skinProfiles.priya,
    lastMatchedFoundation: { brand: 'Fenty Beauty', product: 'Pro Filt\'r Soft Matte', shade: '420' },
  },
  {
    id: 'c4',
    name: 'Sofia Marchetti',
    lastAnalyzed: '2026-09-02',
    skinProfile: skinProfiles.sofia,
    lastMatchedFoundation: { brand: 'Maybelline', product: 'Fit Me Matte + Poreless', shade: '330 Toffee' },
  },
  {
    id: 'c5',
    name: 'Noor Al-Farsi',
    lastAnalyzed: '2026-08-29',
    skinProfile: skinProfiles.noor,
    lastMatchedFoundation: { brand: 'Estée Lauder', product: 'Double Wear', shade: '1N1 Ivory Nude' },
  },
];

export const mockBrands = ['MAC', 'Maybelline', 'NARS', 'Fenty Beauty', 'Estée Lauder'];

export const mockProducts = [
  { id: 'p1', brand: 'MAC', name: 'Studio Fix Fluid', shadeCount: 67 },
  { id: 'p2', brand: 'Maybelline', name: 'Fit Me Matte + Poreless', shadeCount: 40 },
  { id: 'p3', brand: 'NARS', name: 'Light Reflecting', shadeCount: 36 },
  { id: 'p4', brand: 'Fenty Beauty', name: 'Pro Filt\'r Soft Matte', shadeCount: 50 },
  { id: 'p5', brand: 'Estée Lauder', name: 'Double Wear', shadeCount: 56 },
];

// Shade libraries keyed by product id. Hex values approximate real
// foundation-shade tones spanning depth and undertone ranges.
export const mockShades = {
  p1: [
    { id: 'nc15', name: 'NC15', undertone: 'Neutral', depth: 'Light', hex: '#F1CBA4' },
    { id: 'nc20', name: 'NC20', undertone: 'Warm', depth: 'Light', hex: '#EABF95' },
    { id: 'nc25', name: 'NC25', undertone: 'Warm', depth: 'Light Medium', hex: '#E3B285' },
    { id: 'nc30', name: 'NC30', undertone: 'Warm', depth: 'Medium', hex: '#D9A375' },
    { id: 'nc35', name: 'NC35', undertone: 'Warm', depth: 'Medium', hex: '#CB916A' },
    { id: 'nc37', name: 'NC37', undertone: 'Warm', depth: 'Medium', hex: '#C6885F' },
    { id: 'nc40', name: 'NC40', undertone: 'Warm', depth: 'Medium Deep', hex: '#B87950' },
    { id: 'nc42', name: 'NC42', undertone: 'Warm', depth: 'Medium Deep', hex: '#AD6F49' },
    { id: 'nc44', name: 'NC44', undertone: 'Warm', depth: 'Deep', hex: '#9E6140' },
    { id: 'nc45', name: 'NC45', undertone: 'Warm', depth: 'Deep', hex: '#95583A' },
    { id: 'nc50', name: 'NC50', undertone: 'Warm', depth: 'Deep', hex: '#7C462D' },
  ],
  p2: [
    { id: 'fm112', name: '112 Natural Ivory', undertone: 'Neutral', depth: 'Light', hex: '#EFC9A3' },
    { id: 'fm128', name: '128 Warm Nude', undertone: 'Warm', depth: 'Light Medium', hex: '#E1AE83' },
    { id: 'fm220', name: '220 Natural Beige', undertone: 'Neutral', depth: 'Medium', hex: '#D3A07A' },
    { id: 'fm310', name: '310 Sun Beige', undertone: 'Warm', depth: 'Medium', hex: '#C48D67' },
    { id: 'fm330', name: '330 Toffee', undertone: 'Warm', depth: 'Medium Deep', hex: '#A9714B' },
    { id: 'fm345', name: '345 Coconut', undertone: 'Warm', depth: 'Deep', hex: '#8F5B3A' },
    { id: 'fm356', name: '356 Warm Coconut', undertone: 'Warm', depth: 'Deep', hex: '#7E4E30' },
  ],
  p3: [
    { id: 'nars-gob', name: 'Gobi', undertone: 'Neutral', depth: 'Light', hex: '#EFCBA8' },
    { id: 'nars-mac', name: 'Mackinac', undertone: 'Cool', depth: 'Light Medium', hex: '#E1B695' },
    { id: 'nars-val', name: 'Vallauris', undertone: 'Cool', depth: 'Medium', hex: '#D2A07E' },
    { id: 'nars-syr', name: 'Syracuse', undertone: 'Warm', depth: 'Medium', hex: '#C38C68' },
    { id: 'nars-hue', name: 'Huahine', undertone: 'Warm', depth: 'Medium Deep', hex: '#A86F4B' },
    { id: 'nars-fiji', name: 'Fiji', undertone: 'Warm', depth: 'Deep', hex: '#8C5738' },
  ],
  p4: [
    { id: 'fb130', name: '130', undertone: 'Neutral', depth: 'Light', hex: '#F0CFAE' },
    { id: 'fb180', name: '180', undertone: 'Warm', depth: 'Light Medium', hex: '#E3B78F' },
    { id: 'fb240', name: '240', undertone: 'Neutral', depth: 'Medium', hex: '#D2A57E' },
    { id: 'fb310', name: '310', undertone: 'Warm', depth: 'Medium', hex: '#C0946D' },
    { id: 'fb370', name: '370', undertone: 'Neutral', depth: 'Medium Deep', hex: '#A97D58' },
    { id: 'fb420', name: '420', undertone: 'Neutral', depth: 'Deep', hex: '#8A6041' },
    { id: 'fb480', name: '480', undertone: 'Warm', depth: 'Deep', hex: '#6F4B31' },
  ],
  p5: [
    { id: 'el1n1', name: '1N1 Ivory Nude', undertone: 'Neutral', depth: 'Light', hex: '#EFCFAC' },
    { id: 'el2n1', name: '2N1 Desert Beige', undertone: 'Neutral', depth: 'Light Medium', hex: '#E0B78E' },
    { id: 'el3n1', name: '3N1 Ivory Beige', undertone: 'Neutral', depth: 'Medium', hex: '#D1A67D' },
    { id: 'el4n1', name: '4N1 Shell Beige', undertone: 'Warm', depth: 'Medium', hex: '#C0936A' },
    { id: 'el5n1', name: '5N1 Rich Ginger', undertone: 'Warm', depth: 'Medium Deep', hex: '#A97650' },
    { id: 'el6n1', name: '6N1 Mocha', undertone: 'Warm', depth: 'Deep', hex: '#8B5C3A' },
  ],
};

export const mockMatches = [
  {
    id: 'm1',
    clientName: 'Amara Osei',
    brand: 'MAC',
    product: 'Studio Fix Fluid',
    shade: 'NC40',
    hex: '#B87950',
    matchScore: 94,
    date: '2026-09-10',
  },
  {
    id: 'm2',
    clientName: 'Sofia Marchetti',
    brand: 'Maybelline',
    product: 'Fit Me Matte + Poreless',
    shade: '332 Golden Caramel',
    hex: '#AD7A4E',
    matchScore: 91,
    date: '2026-09-02',
  },
  {
    id: 'm3',
    clientName: 'Priya Shah',
    brand: 'Fenty Beauty',
    product: 'Pro Filt\'r Soft Matte',
    shade: '420',
    hex: '#8A6041',
    matchScore: 88,
    date: '2026-09-05',
  },
  {
    id: 'm4',
    clientName: 'Elena Petrova',
    brand: 'NARS',
    product: 'Light Reflecting',
    shade: 'Vallauris',
    hex: '#D2A07E',
    matchScore: 92,
    date: '2026-09-08',
  },
  {
    id: 'm5',
    clientName: 'Noor Al-Farsi',
    brand: 'Estée Lauder',
    product: 'Double Wear',
    shade: '1N1 Ivory Nude',
    hex: '#EFCFAC',
    matchScore: 87,
    date: '2026-08-29',
  },
];

// Used on the Match Results / Shade Comparison pages as the demo scenario.
export const demoMatchScenario = {
  client: {
    name: 'Amara Osei',
    photo: null,
  },
  skinProfile: skinProfiles.amara,
  brand: 'MAC',
  product: 'Studio Fix Fluid',
  topMatch: {
    shade: 'NC40',
    hex: '#B87950',
    matchScore: 94,
    undertone: 'Warm',
    depth: 'Medium Deep',
    checks: ['Depth match', 'Undertone match', 'Closest color profile'],
  },
  otherMatches: [
    { rank: 2, shade: 'NC42', hex: '#AD6F49', matchScore: 89, undertone: 'Warm', depth: 'Medium Deep' },
    { rank: 3, shade: 'NC37', hex: '#C6885F', matchScore: 83, undertone: 'Warm', depth: 'Medium' },
  ],
  comparison: {
    shades: [
      { shade: 'NC40', hex: '#B87950', color: 96, depth: true, undertone: true, hue: true, overall: 94 },
      { shade: 'NC42', hex: '#AD6F49', color: 91, depth: true, undertone: true, hue: 'partial', overall: 89 },
      { shade: 'NC37', hex: '#C6885F', color: 84, depth: 'partial', undertone: 'partial', hue: 'partial', overall: 83 },
    ],
    explanation:
      'NC40 sits closest to Amara\'s measured depth and warm-golden undertone, with the smallest overall color distance among the shades in MAC Studio Fix Fluid. NC42 runs slightly deeper and NC37 slightly lighter, both retaining the same warm family.',
  },
};
