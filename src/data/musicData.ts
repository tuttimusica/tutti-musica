/**
 * Tutti ♪ Music Data Catalog
 * Comprehensive data for Instruments, Sheets, Lessons, Store, and Masterclasses.
 */

export interface Instrument {
  id: string;
  name: string;
  emoji: string;
  family: 'Metais' | 'Teclas' | 'Voz' | 'Cordas' | 'Percussão' | 'Madeiras';
  level: string;
  teacher: string;
  description: string;
  color: string;
  tuning: string;
  techniques: string[];
  image?: string;
}

export interface SheetMusic {
  id: number;
  title: string;
  composer: string;
  instrument: string;
  tonality: string;
  originalKey: string;
  family: string;
  level: 'Iniciante' | 'Intermediário' | 'Avançado';
  genre: string;
  tempo: number;
  timeSignature: string;
  melodyNotes: { note: string; duration: number; lyric?: string }[];
  chords: string[];
  description: string;
  youtubeUrl?: string;
  youtubeId?: string;
  viewsCount?: number;
}

export interface Lesson {
  id: number;
  instrumentId: string;
  title: string;
  module: string;
  duration: string;
  level: 'Iniciante' | 'Intermediário' | 'Avançado';
  teacher: string;
  videoPoster: string;
  summary: string;
  keyPoints: string[];
  chords: string[];
  tabSnippet: string;
  practiceTasks: { id: string; text: string; done?: boolean }[];
  demoMelody: { note: string; duration: number }[];
}

export interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  category: 'Acessórios' | 'Instrumentos' | 'Vestuário' | 'Livros';
  image: string;
  rating: number;
  reviewsCount: number;
  badge?: string;
  description: string;
  inStock: boolean;
}

export interface Masterclass {
  id: number;
  title: string;
  instructor: string;
  instrument: string;
  date: string;
  time: string;
  participants: number;
  level: string;
  status: 'Inscrições Abertas' | 'Hoje' | 'Encerrado';
}

export interface CommunityPost {
  id: number;
  author: string;
  avatar: string;
  instrument: string;
  timeAgo: string;
  content: string;
  likes: number;
  comments: number;
  tag: string;
}

export const INSTRUMENTS: Instrument[] = [
  {
    id: 'sax',
    name: 'Saxofone',
    emoji: '🎷',
    family: 'Metais',
    level: 'Todos os níveis',
    teacher: 'Prof. Henrique Prado',
    description: 'Aprenda a expressividade lírica do jazz, choro, MPB e blues com embocadura relaxada e som aveludado.',
    color: 'from-amber-500 to-yellow-600',
    tuning: 'Eb (Alto) / Bb (Tenor)',
    techniques: ['Embocadura firme', 'Subtone jazzístico', 'Apoio diafragmático', 'Articulação staccato'],
    image: '/assets/instruments/alto_sax.jpg'
  },
  {
    id: 'flauta',
    name: 'Flauta Transversal',
    emoji: '🪈',
    family: 'Madeiras',
    level: 'Todos os níveis',
    teacher: 'Profa. Cecília Prado',
    description: 'Som límpido e aveludado, agilidade técnica no choro, na bossa nova e na música clássica com embocadura precisa.',
    color: 'from-cyan-500 to-teal-600',
    tuning: 'C (Afinação de Concerto)',
    techniques: ['Embocadura focada', 'Apoio de diafragma', 'Golpe duplo de língua (T-K)', 'Vibrato de garganta'],
    image: '/assets/instruments/flauta.jpg'
  },
  {
    id: 'trombone',
    name: 'Trombone de Vara',
    emoji: '🎺',
    family: 'Metais',
    level: 'Todos os níveis',
    teacher: 'Prof. Sérgio Trombonista',
    description: 'Potência e lirismo com o glissando inconfundível da vara, essencial em big bands, gafieira, salsa e orquestra.',
    color: 'from-rose-500 to-amber-600',
    tuning: 'Bb / F com Rotor (Clave de Fá)',
    techniques: ['Posições precisas da vara (1ª a 7ª)', 'Glissando lírico', 'Flexibilidade labial', 'Apoio diafragmático firme'],
    image: '/assets/instruments/trombone.jpg'
  },
  {
    id: 'teclado',
    name: 'Teclado & Piano',
    emoji: '🎹',
    family: 'Teclas',
    level: 'Todos os níveis',
    teacher: 'Profa. Clara Vasconcelos',
    description: 'A base universal da harmonia musical, leitura à primeira vista, condução de vozes e acompanhamento.',
    color: 'from-cyan-500 to-blue-600',
    tuning: 'Pitch de Concerto (C)',
    techniques: ['Independência de mãos', 'Condução de vozes', 'Inversão de acordes', 'Pedal de sustain']
  },
  {
    id: 'canto',
    name: 'Canto & Técnica Vocal',
    emoji: '🎤',
    family: 'Voz',
    level: 'Iniciante ao Avançado',
    teacher: 'Profa. Mariana Sales',
    description: 'Descubra a potência, afinação e extensão da sua própria voz com ressonância facial e saúde vocal.',
    color: 'from-pink-500 to-rose-600',
    tuning: 'Voz Humana (A3 - C6)',
    techniques: ['Apoio intercostal', 'Mix voice (voz mista)', 'Vibrato natural', 'Dicção límpida']
  },
  {
    id: 'violao',
    name: 'Violão & Guitarra',
    emoji: '🎸',
    family: 'Cordas',
    level: 'Todos os níveis',
    teacher: 'Prof. André Martins',
    description: 'O instrumento mais versátil da música brasileira: levadas de samba, bossa nova, fingerstyle e solos.',
    color: 'from-emerald-500 to-teal-600',
    tuning: 'E - A - D - G - B - E',
    techniques: ['Levada de Bossa', 'Fingerpicking clássico', 'Pestana sem dor', 'Walking bass']
  },
  {
    id: 'bateria',
    name: 'Bateria & Ritmos',
    emoji: '🥁',
    family: 'Percussão',
    level: 'Iniciante ao Avançado',
    teacher: 'Prof. Lucas Ritmista',
    description: 'O coração e o pulso de qualquer banda: coordenação motora dos 4 membros, grooves e rudimentos.',
    color: 'from-purple-500 to-indigo-600',
    tuning: 'Afinação percussiva',
    techniques: ['Paradiddle e Rolls', 'Independência de bumbo', 'Hi-hat dinâmico', 'Levada de Samba funk']
  },
  {
    id: 'violino',
    name: 'Violino & Cordas',
    emoji: '🎻',
    family: 'Cordas',
    level: 'Iniciante ao Avançado',
    teacher: 'Maestro Fernando Couto',
    description: 'Elegância melódica, afinação milimétrica, controle de arco e expressão para clássico e popular.',
    color: 'from-orange-500 to-amber-700',
    tuning: 'G - D - A - E',
    techniques: ['Postura de arco franco', 'Afinação de ouvido', 'Vibrato contínuo', 'Mudança de posição']
  }
];

export const SHEETS_CATALOG: SheetMusic[] = [
  {
    id: 1,
    title: 'Garota de Ipanema',
    composer: 'Tom Jobim & Vinicius de Moraes',
    instrument: 'Violão',
    tonality: 'F Maior',
    originalKey: 'F',
    family: 'Cordas',
    level: 'Intermediário',
    genre: 'Bossa Nova',
    tempo: 124,
    timeSignature: '4/4',
    youtubeUrl: 'https://www.youtube.com/watch?v=kYJ5oVbY-70',
    viewsCount: 18450,
    description: 'O clássico mundial da Bossa Nova com a icônica levada sincopada e harmonias refinadas.',
    chords: ['Fmaj7', 'G7', 'Gm7', 'Gb7(#11)', 'Fmaj7'],
    melodyNotes: [
      { note: 'G4', duration: 1.5, lyric: 'Olha' },
      { note: 'E4', duration: 0.5, lyric: 'que' },
      { note: 'E4', duration: 0.5, lyric: 'coi-' },
      { note: 'D4', duration: 0.5, lyric: 'sa' },
      { note: 'G4', duration: 1, lyric: 'mais' },
      { note: 'E4', duration: 1, lyric: 'lin-' },
      { note: 'D4', duration: 1, lyric: 'da' },
      { note: 'G4', duration: 1.5, lyric: 'mais' },
      { note: 'E4', duration: 0.5, lyric: 'cheia' },
      { note: 'E4', duration: 0.5, lyric: 'de' },
      { note: 'D4', duration: 0.5, lyric: 'gra-' },
      { note: 'A4', duration: 2, lyric: 'ça' }
    ]
  },
  {
    id: 2,
    title: 'Autumn Leaves (Les Feuilles Mortes)',
    composer: 'Joseph Kosma',
    instrument: 'Saxofone',
    tonality: 'G Menor',
    originalKey: 'Gm',
    family: 'Metais',
    level: 'Intermediário',
    genre: 'Jazz Standard',
    tempo: 110,
    timeSignature: '4/4',
    youtubeUrl: 'https://www.youtube.com/watch?v=PPHtQn3LjbQ',
    viewsCount: 22100,
    description: 'O standard de jazz mais estudado no mundo, perfeito para dominar a progressão ii-V-I maior e menor.',
    chords: ['Cm7', 'F7', 'Bbmaj7', 'Ebmaj7', 'Am7(b5)', 'D7', 'Gm'],
    melodyNotes: [
      { note: 'E4', duration: 1, lyric: 'The' },
      { note: 'F#4', duration: 1, lyric: 'fal-' },
      { note: 'G4', duration: 1, lyric: 'ling' },
      { note: 'C5', duration: 2.5, lyric: 'leaves' },
      { note: 'REST', duration: 0.5 },
      { note: 'D4', duration: 1, lyric: 'drift' },
      { note: 'E4', duration: 1, lyric: 'by' },
      { note: 'F#4', duration: 1, lyric: 'the' },
      { note: 'B4', duration: 2.5, lyric: 'win-' },
      { note: 'B4', duration: 1, lyric: 'dow' }
    ]
  },
  {
    id: 3,
    title: 'Asa Branca',
    composer: 'Luiz Gonzaga & Humberto Teixeira',
    instrument: 'Teclado',
    tonality: 'C Maior',
    originalKey: 'C',
    family: 'Teclas',
    level: 'Iniciante',
    genre: 'Baião',
    tempo: 116,
    timeSignature: '2/4',
    youtubeUrl: 'https://www.youtube.com/watch?v=b0Zq2U0uC4Q',
    viewsCount: 16700,
    description: 'Hino inconfundível do cancioneiro nordestino com melodia cativante e ritmo pulsante.',
    chords: ['C', 'F', 'G7', 'C'],
    melodyNotes: [
      { note: 'C4', duration: 0.5, lyric: 'Quan-' },
      { note: 'D4', duration: 0.5, lyric: 'do' },
      { note: 'E4', duration: 1, lyric: 'olhei' },
      { note: 'G4', duration: 1, lyric: 'a' },
      { note: 'G4', duration: 1, lyric: 'ter-' },
      { note: 'E4', duration: 1, lyric: 'ra' },
      { note: 'F4', duration: 1, lyric: 'ar-' },
      { note: 'F4', duration: 2, lyric: 'dendo' },
      { note: 'C4', duration: 0.5, lyric: 'qual' },
      { note: 'D4', duration: 0.5, lyric: 'fo-' },
      { note: 'E4', duration: 1, lyric: 'gueira' },
      { note: 'G4', duration: 1, lyric: 'de' },
      { note: 'G4', duration: 1, lyric: 'São' },
      { note: 'F4', duration: 1, lyric: 'Jo-' },
      { note: 'E4', duration: 2, lyric: 'ão' }
    ]
  },
  {
    id: 4,
    title: 'Take Five',
    composer: 'Paul Desmond',
    instrument: 'Saxofone',
    tonality: 'Eb Menor',
    originalKey: 'Ebm',
    family: 'Metais',
    level: 'Avançado',
    genre: 'Cool Jazz',
    tempo: 172,
    timeSignature: '5/4',
    youtubeUrl: 'https://www.youtube.com/watch?v=vmDDOFXSgAs',
    viewsCount: 19800,
    description: 'Obra prima do jazz em compasso ímpar 5/4 (3+2), célebre pelo quarteto Dave Brubeck.',
    chords: ['Ebm', 'Bbm7', 'Ebm', 'Bbm7'],
    melodyNotes: [
      { note: 'Bb4', duration: 1.5 },
      { note: 'Ab4', duration: 0.5 },
      { note: 'Gb4', duration: 1 },
      { note: 'Eb4', duration: 1.5 },
      { note: 'F4', duration: 0.5 },
      { note: 'Gb4', duration: 1 },
      { note: 'Ab4', duration: 1 },
      { note: 'Bb4', duration: 2 }
    ]
  },
  {
    id: 5,
    title: 'Carinhoso',
    composer: 'Pixinguinha',
    instrument: 'Violão',
    tonality: 'G Maior',
    originalKey: 'G',
    family: 'Cordas',
    level: 'Intermediário',
    genre: 'Choro',
    tempo: 84,
    timeSignature: '2/4',
    youtubeUrl: 'https://www.youtube.com/watch?v=F3_68f8U8vE',
    viewsCount: 26300,
    description: 'Uma das melodias mais sentimentais do Brasil, rica em contrapontos e cromatismos suaves.',
    chords: ['G', 'E7', 'Am7', 'D7', 'G'],
    melodyNotes: [
      { note: 'D4', duration: 0.5 },
      { note: 'G4', duration: 1 },
      { note: 'B4', duration: 1 },
      { note: 'D5', duration: 1.5 },
      { note: 'C5', duration: 0.5 },
      { note: 'B4', duration: 1 },
      { note: 'A4', duration: 1 },
      { note: 'G4', duration: 2 }
    ]
  },
  {
    id: 6,
    title: 'Clair de Lune',
    composer: 'Claude Debussy',
    instrument: 'Teclado',
    tonality: 'Db Maior',
    originalKey: 'Db',
    family: 'Teclas',
    level: 'Avançado',
    genre: 'Impressionismo',
    tempo: 60,
    timeSignature: '9/8',
    youtubeUrl: 'https://www.youtube.com/watch?v=WNcsUNKlAKw',
    viewsCount: 14200,
    description: 'Poesia sonora impressionista com texturas harmônicas fluidas e dinâmica rubato.',
    chords: ['Db', 'Fm', 'Gb', 'Db/Ab'],
    melodyNotes: [
      { note: 'F4', duration: 1.5 },
      { note: 'Eb4', duration: 1.5 },
      { note: 'Db4', duration: 2 },
      { note: 'C4', duration: 1 },
      { note: 'Db4', duration: 3 }
    ]
  },
  {
    id: 7,
    title: 'Aquarela',
    composer: 'Toquinho & Vinicius',
    instrument: 'Canto',
    tonality: 'G Maior',
    originalKey: 'G',
    family: 'Voz',
    level: 'Iniciante',
    genre: 'MPB',
    tempo: 104,
    timeSignature: '4/4',
    youtubeUrl: 'https://www.youtube.com/watch?v=bWwV_j0P46U',
    viewsCount: 11900,
    description: 'Letra poética e melodia inesquecível, ótima para afinação vocal e expressividade lírica.',
    chords: ['G', 'Bm', 'C', 'D7'],
    melodyNotes: [
      { note: 'D4', duration: 1, lyric: 'Numa' },
      { note: 'D4', duration: 1, lyric: 'folha' },
      { note: 'D4', duration: 1, lyric: 'qual-' },
      { note: 'E4', duration: 1, lyric: 'quer' },
      { note: 'D4', duration: 1, lyric: 'eu' },
      { note: 'B3', duration: 1, lyric: 'dese-' },
      { note: 'C4', duration: 1, lyric: 'nho' },
      { note: 'D4', duration: 1, lyric: 'um' },
      { note: 'B3', duration: 2, lyric: 'sol' }
    ]
  },
  {
    id: 8,
    title: 'Brasileirinho',
    composer: 'Waldir Azevedo',
    instrument: 'Violino',
    tonality: 'A Maior',
    originalKey: 'A',
    family: 'Cordas',
    level: 'Avançado',
    genre: 'Choro',
    tempo: 130,
    timeSignature: '2/4',
    youtubeUrl: 'https://www.youtube.com/watch?v=3vK8uF2wB5E',
    viewsCount: 20400,
    description: 'Choro virtuosístico com semicolcheias ligeiras e arpejos ágeis em toda a extensão do instrumento.',
    chords: ['A', 'E7', 'A', 'D'],
    melodyNotes: [
      { note: 'E4', duration: 0.25 },
      { note: 'F#4', duration: 0.25 },
      { note: 'G#4', duration: 0.25 },
      { note: 'A4', duration: 0.5 },
      { note: 'C#5', duration: 0.5 },
      { note: 'E5', duration: 0.75 },
      { note: 'D5', duration: 0.25 },
      { note: 'C#5', duration: 0.5 },
      { note: 'B4', duration: 0.5 },
      { note: 'A4', duration: 1 }
    ]
  },
  // --- PEÇAS EXCLUSIVAS DE FLAUTA TRANSVERSAL ---
  {
    id: 9,
    title: 'Carinhoso (Solo de Flauta Transversal)',
    composer: 'Pixinguinha',
    instrument: 'Flauta Transversal',
    tonality: 'C Maior',
    originalKey: 'C',
    family: 'Madeiras',
    level: 'Intermediário',
    genre: 'Choro',
    tempo: 84,
    timeSignature: '2/4',
    youtubeUrl: 'https://www.youtube.com/watch?v=F3_68f8U8vE',
    viewsCount: 31200,
    description: 'O solo emblemático de flauta gravado pelo mestre Pixinguinha com contra-cantos expressivos.',
    chords: ['C', 'A7', 'Dm7', 'G7', 'C'],
    melodyNotes: [
      { note: 'G4', duration: 0.5 },
      { note: 'C5', duration: 1 },
      { note: 'E5', duration: 1 },
      { note: 'G5', duration: 1.5 },
      { note: 'F5', duration: 0.5 },
      { note: 'E5', duration: 1 },
      { note: 'D5', duration: 1 },
      { note: 'C5', duration: 2 }
    ]
  },
  {
    id: 10,
    title: 'Partita em Lá Menor (Allemande)',
    composer: 'Johann Sebastian Bach (BWV 1013)',
    instrument: 'Flauta Transversal',
    tonality: 'A Menor',
    originalKey: 'Am',
    family: 'Madeiras',
    level: 'Avançado',
    genre: 'Barroco',
    tempo: 76,
    timeSignature: '4/4',
    youtubeUrl: 'https://www.youtube.com/watch?v=E2pUvG3eZ4s',
    viewsCount: 15300,
    description: 'A obra-prima absoluta para flauta solo desacompanhada de Bach, exigindo respiração circular e condução polifônica.',
    chords: ['Am', 'Dm', 'E7', 'Am'],
    melodyNotes: [
      { note: 'A4', duration: 0.5 },
      { note: 'C5', duration: 0.5 },
      { note: 'E5', duration: 1 },
      { note: 'A5', duration: 1.5 },
      { note: 'G#5', duration: 0.5 },
      { note: 'A5', duration: 2 }
    ]
  },
  {
    id: 11,
    title: 'Tico-Tico no Fubá (Flauta)',
    composer: 'Zequinha de Abreu',
    instrument: 'Flauta Transversal',
    tonality: 'A Menor',
    originalKey: 'Am',
    family: 'Madeiras',
    level: 'Avançado',
    genre: 'Choro',
    tempo: 126,
    timeSignature: '2/4',
    youtubeUrl: 'https://www.youtube.com/watch?v=3vK8uF2wB5E',
    viewsCount: 24500,
    description: 'Choro rápido de virtuosismo e articulação veloz com staccato duplo.',
    chords: ['Am', 'E7', 'Am', 'A7', 'Dm'],
    melodyNotes: [
      { note: 'E5', duration: 0.25 },
      { note: 'D#5', duration: 0.25 },
      { note: 'E5', duration: 0.25 },
      { note: 'B4', duration: 0.25 },
      { note: 'C5', duration: 0.5 },
      { note: 'A4', duration: 1 }
    ]
  },
  // --- PEÇAS EXCLUSIVAS DE TROMBONE DE VARA ---
  {
    id: 12,
    title: 'Na Baixa do Sapateiro (Trombone)',
    composer: 'Ary Barroso',
    instrument: 'Trombone de Vara',
    tonality: 'Bb Maior',
    originalKey: 'Bb',
    family: 'Metais',
    level: 'Intermediário',
    genre: 'Samba-Exaltação',
    tempo: 112,
    timeSignature: '2/4',
    youtubeUrl: 'https://www.youtube.com/watch?v=V9L7r94rXwM',
    viewsCount: 17800,
    description: 'Clássico com a rica ressonância do trombone de vara em clave de fá, glissandos calorosos e sincopas.',
    chords: ['Bb', 'G7', 'Cm7', 'F7', 'Bb'],
    melodyNotes: [
      { note: 'F3', duration: 0.5 },
      { note: 'Bb3', duration: 1 },
      { note: 'D4', duration: 1 },
      { note: 'F4', duration: 1.5 },
      { note: 'Eb4', duration: 0.5 },
      { note: 'D4', duration: 2 }
    ]
  },
  {
    id: 13,
    title: 'Georgia on My Mind (Trombone Solo)',
    composer: 'Hoagy Carmichael',
    instrument: 'Trombone de Vara',
    tonality: 'F Maior',
    originalKey: 'F',
    family: 'Metais',
    level: 'Intermediário',
    genre: 'Ballad / Jazz',
    tempo: 68,
    timeSignature: '4/4',
    youtubeUrl: 'https://www.youtube.com/watch?v=fRgWbmG1G5c',
    viewsCount: 19100,
    description: 'Balada lírica onde o trombone emula a voz humana com vibrato natural e sonoridade aveludada.',
    chords: ['F', 'A7', 'Dm', 'Bb', 'Bbm', 'F'],
    melodyNotes: [
      { note: 'C3', duration: 1 },
      { note: 'F3', duration: 1.5 },
      { note: 'G3', duration: 0.5 },
      { note: 'A3', duration: 2 },
      { note: 'D4', duration: 2 }
    ]
  },
  {
    id: 14,
    title: 'Blues for Trombone (J.J. Style)',
    composer: 'J. J. Johnson',
    instrument: 'Trombone de Vara',
    tonality: 'Bb Blues',
    originalKey: 'Bb',
    family: 'Metais',
    level: 'Avançado',
    genre: 'Bebop / Blues',
    tempo: 144,
    timeSignature: '4/4',
    youtubeUrl: 'https://www.youtube.com/watch?v=vmDDOFXSgAs',
    viewsCount: 12400,
    description: 'Bebop rápido para trombone de vara, explorando posições alternadas para passagens ágeis.',
    chords: ['Bb7', 'Eb7', 'Bb7', 'F7', 'Bb7'],
    melodyNotes: [
      { note: 'Bb3', duration: 0.5 },
      { note: 'Db4', duration: 0.5 },
      { note: 'D4', duration: 0.5 },
      { note: 'F4', duration: 1 },
      { note: 'Ab4', duration: 1 },
      { note: 'Bb4', duration: 2 }
    ]
  },
  // --- PEÇAS EXCLUSIVAS DE SAXOFONE ALTO E TENOR ---
  {
    id: 15,
    title: 'Desafinado (Sax Alto)',
    composer: 'Tom Jobim & Newton Mendonça',
    instrument: 'Saxofone',
    tonality: 'F Maior (Eb Sax)',
    originalKey: 'F',
    family: 'Metais',
    level: 'Intermediário',
    genre: 'Bossa Nova',
    tempo: 132,
    timeSignature: '4/4',
    youtubeUrl: 'https://www.youtube.com/watch?v=x9q8mZqQc_M',
    viewsCount: 28900,
    description: 'Fraseado sinuoso com notas alteradas, perfeito para trabalhar entonação e afinação precisa.',
    chords: ['Fmaj7', 'G7(b5)', 'Gm7', 'C7'],
    melodyNotes: [
      { note: 'C5', duration: 1 },
      { note: 'B4', duration: 0.5 },
      { note: 'C5', duration: 0.5 },
      { note: 'G#4', duration: 1 },
      { note: 'A4', duration: 2 }
    ]
  },
  {
    id: 16,
    title: 'Wave (Vou Te Contar)',
    composer: 'Tom Jobim',
    instrument: 'Saxofone',
    tonality: 'D Maior',
    originalKey: 'D',
    family: 'Metais',
    level: 'Intermediário',
    genre: 'Bossa Nova',
    tempo: 120,
    timeSignature: '4/4',
    youtubeUrl: 'https://www.youtube.com/watch?v=V9L7r94rXwM',
    viewsCount: 21700,
    description: 'Melodia expansiva com saltos de oitava e arpejos suaves na região média do instrumento.',
    chords: ['Dmaj7', 'Bdim', 'Em7', 'A7'],
    melodyNotes: [
      { note: 'D4', duration: 1 },
      { note: 'F#4', duration: 1 },
      { note: 'A4', duration: 1 },
      { note: 'D5', duration: 2 },
      { note: 'C#5', duration: 1 },
      { note: 'B4', duration: 2 }
    ]
  }
];

export const LESSONS_DATABASE: Record<string, Lesson[]> = {
  sax: [
    {
      id: 101,
      instrumentId: 'sax',
      title: 'Aula 1: Anatomia do Sax, Montagem e Primeira Nota',
      module: 'Módulo 1: Fundamentos',
      duration: '14 min',
      level: 'Iniciante',
      teacher: 'Prof. Henrique Prado',
      videoPoster: '🎷',
      summary: 'Aprenda a montar a palheta na boquilha, ajustar o tudel, posicionar os dentes superiores e soprar o primeiro som limpo sem apitos.',
      keyPoints: [
        'Umedeça a palheta antes de fixar na braçadeira',
        'Dentes superiores repousam sobre a boquilha',
        'Lábio inferior enrolado suavemente sobre os dentes',
        'Coluna de ar contínua e foco na boca'
      ],
      chords: ['Nota Sol (G4)', 'Nota Lá (A4)', 'Nota Si (B4)'],
      tabSnippet: `Sol: [● ● ● | ○ ○ ○]
Lá:  [● ● ○ | ○ ○ ○]
Si:  [● ○ ○ | ○ ○ ○]`,
      practiceTasks: [
        { id: 't1', text: 'Sustentar a nota Si (B4) por 8 segundos contínuos', done: false },
        { id: 't2', text: 'Tocar a sequência Si - Lá - Sol sem interromper o sopro', done: false },
        { id: 't3', text: 'Treinar com metrônomo a 60 BPM', done: false }
      ],
      demoMelody: [
        { note: 'B4', duration: 2 },
        { note: 'A4', duration: 2 },
        { note: 'G4', duration: 4 }
      ]
    },
    {
      id: 102,
      instrumentId: 'sax',
      title: 'Aula 2: Respiração Diafragmática e Apoio',
      module: 'Módulo 1: Fundamentos',
      duration: '18 min',
      level: 'Iniciante',
      teacher: 'Prof. Henrique Prado',
      videoPoster: '🌬️',
      summary: 'Elimine o cansaço ao tocar! Domine a expansão costal de 360 graus e o fluxo estável de ar que dá corpo ao timbre.',
      keyPoints: [
        'Sem elevar os ombros durante a inalação',
        'Pressão contínua vinda da musculatura abdominal',
        'Exercício do "Tssss" cronometrado'
      ],
      chords: ['Escala Pentatônica de Sol Maior'],
      tabSnippet: `G4 -> A4 -> B4 -> D5 -> E5`,
      practiceTasks: [
        { id: 't1', text: 'Inalar em 4 tempos e exalar em 16 tempos a 60 BPM', done: false },
        { id: 't2', text: 'Tocar a escala pentatônica com ataque suave de língua', done: false }
      ],
      demoMelody: [
        { note: 'G4', duration: 1 },
        { note: 'A4', duration: 1 },
        { note: 'B4', duration: 1 },
        { note: 'D5', duration: 1 },
        { note: 'E5', duration: 2 }
      ]
    },
    {
      id: 103,
      instrumentId: 'sax',
      title: 'Aula 3: Articulação, Ataque de Língua e "Doo-Dah"',
      module: 'Módulo 2: Expressividade',
      duration: '16 min',
      level: 'Intermediário',
      teacher: 'Prof. Henrique Prado',
      videoPoster: '🎶',
      summary: 'Como falar com o saxofone: a ponta da língua toca a ponta da palheta para criar frases swingadas e com balanço jazzístico.',
      keyPoints: [
        'A língua não interrompe a coluna de ar, apenas controla o release',
        'Sílaba mental "Doo-Dah" para acentuação de contratempos',
        'Ghost notes para enriquecer o fraseado'
      ],
      chords: ['Cm7', 'F7', 'Bbmaj7'],
      tabSnippet: `Frase Jazz: C5 - D5 - Eb5 - F5 - D5 - Bb4`,
      practiceTasks: [
        { id: 't1', text: 'Tocar 8 compassos em colcheias sincopadas com metrônomo', done: false }
      ],
      demoMelody: [
        { note: 'C5', duration: 0.5 },
        { note: 'D5', duration: 0.5 },
        { note: 'D#5', duration: 1 },
        { note: 'F5', duration: 1 },
        { note: 'D5', duration: 1 }
      ]
    }
  ],
  teclado: [
    {
      id: 201,
      instrumentId: 'teclado',
      title: 'Aula 1: Teclas Brancas, Pretas e Postura Relaxada',
      module: 'Módulo 1: Teclado Básico',
      duration: '12 min',
      level: 'Iniciante',
      teacher: 'Profa. Clara Vasconcelos',
      videoPoster: '🎹',
      summary: 'Descubra a topografia do piano através dos grupos de 2 e 3 teclas pretas. Mãos como conchas e pulso solto.',
      keyPoints: [
        'Dó central (C4) fica imediatamente à esquerda das 2 teclas pretas',
        'Dedos numerados de 1 (polegar) a 5 (mínimo)',
        'Peso dos braços relaxado transferido para a ponta dos dedos'
      ],
      chords: ['C (Dó Maior)', 'G (Sol Maior)'],
      tabSnippet: `Mão Direita: Dedo 1 (C), Dedo 2 (D), Dedo 3 (E), Dedo 4 (F), Dedo 5 (G)`,
      practiceTasks: [
        { id: 't1', text: 'Tocar escala de C Maior subindo e descendo com dedilhado correto', done: false },
        { id: 't2', text: 'Tocar o acorde C (C-E-G) com a mão esquerda mantida no tempo', done: false }
      ],
      demoMelody: [
        { note: 'C4', duration: 1 },
        { note: 'D4', duration: 1 },
        { note: 'E4', duration: 1 },
        { note: 'F4', duration: 1 },
        { note: 'G4', duration: 2 }
      ]
    },
    {
      id: 202,
      instrumentId: 'teclado',
      title: 'Aula 2: Harmonia Prática e a Tríade de Ouro (I - IV - V)',
      module: 'Módulo 1: Teclado Básico',
      duration: '20 min',
      level: 'Iniciante',
      teacher: 'Profa. Clara Vasconcelos',
      videoPoster: '🎼',
      summary: 'Como acompanhar centenas de músicas populares usando apenas os acordes C, F e G com condução eficiente sem pular de oitava.',
      keyPoints: [
        'Inversões mantêm notas comuns na mesma região',
        'Baixo na mão esquerda marcando a tônica',
        'Ritmo pop em semínimas e colcheias'
      ],
      chords: ['C (C-E-G)', 'F (C-F-A)', 'G (B-D-G)'],
      tabSnippet: `Condução: C -> F/C -> G/B -> C`,
      practiceTasks: [
        { id: 't1', text: 'Mudar entre C e F sem olhar para as mãos', done: false }
      ],
      demoMelody: [
        { note: 'C4', duration: 2 },
        { note: 'E4', duration: 2 },
        { note: 'F4', duration: 2 },
        { note: 'G4', duration: 2 }
      ]
    }
  ],
  violao: [
    {
      id: 301,
      instrumentId: 'violao',
      title: 'Aula 1: Afinador, Primeiras Notas e o Acorde Mágico de Mi Menor',
      module: 'Módulo 1: Iniciação nas Cordas',
      duration: '15 min',
      level: 'Iniciante',
      teacher: 'Prof. André Martins',
      videoPoster: '🎸',
      summary: 'Aprenda a afinar o violão de ouvido e com afinador eletrônico, posicionar a mão esquerda sem cansaço e tocar seu primeiro ritmo com Em e C.',
      keyPoints: [
        'Apoiar a ponta dos dedos próxima ao traste de metal',
        'Polegar atrás do braço do violão como apoio suave',
        'Palhetada ou batida suave com a polpa dos dedos'
      ],
      chords: ['Em (Mi Menor)', 'C (Dó Maior)', 'G (Sol Maior)', 'D (Ré Maior)'],
      tabSnippet: `Em: 0 2 2 0 0 0
C:  x 3 2 0 1 0
G:  3 2 0 0 0 3`,
      practiceTasks: [
        { id: 't1', text: 'Afinação completa das 6 cordas no app Tutti', done: false },
        { id: 't2', text: 'Treinar troca limpa entre Em e G em 4 tempos', done: false }
      ],
      demoMelody: [
        { note: 'E3', duration: 1 },
        { note: 'B3', duration: 1 },
        { note: 'E4', duration: 1 },
        { note: 'G4', duration: 2 }
      ]
    },
    {
      id: 302,
      instrumentId: 'violao',
      title: 'Aula 2: A Levada da Bossa Nova e o Segredo do Polegar',
      module: 'Módulo 2: Ritmos Brasileiros',
      duration: '22 min',
      level: 'Intermediário',
      teacher: 'Prof. André Martins',
      videoPoster: '🌴',
      summary: 'Desvende o violão de João Gilberto: o polegar marca o contratempo do surdo enquanto os dedos indicador, médio e anelar puxam os acordes sincopados.',
      keyPoints: [
        'Polegar independente nas cordas graves (Bordões)',
        'Acordes com sétima e nona sem cordas soltas dissonantes',
        'Balanço sutil sem acelerar o andamento'
      ],
      chords: ['Fmaj7', 'G7(13)', 'Gm7', 'C7(9)'],
      tabSnippet: `P I-M-A . P . I-M-A P . I-M-A`,
      practiceTasks: [
        { id: 't1', text: 'Tocar a frase inicial de Garota de Ipanema com a levada', done: false }
      ],
      demoMelody: [
        { note: 'G4', duration: 1.5 },
        { note: 'E4', duration: 0.5 },
        { note: 'E4', duration: 0.5 },
        { note: 'D4', duration: 0.5 },
        { note: 'A4', duration: 2 }
      ]
    }
  ],
  canto: [
    {
      id: 401,
      instrumentId: 'canto',
      title: 'Aula 1: Afinação Vocal e Conexão Corpo-Voz',
      module: 'Módulo 1: Consciência Vocal',
      duration: '15 min',
      level: 'Iniciante',
      teacher: 'Profa. Mariana Sales',
      videoPoster: '🎤',
      summary: 'Descubra que qualquer pessoa pode cantar afinada. Exercícios de sirene, ressonância facial "Mmm" e sustentação do ar sem apertar a garganta.',
      keyPoints: [
        'Bocejar internamente para erguer o palato mole',
        'Cantar no espelho para conferir mandíbula relaxada',
        'Imitação auditiva com o piano afinador'
      ],
      chords: ['Vocalise C3 - G3 - C4'],
      tabSnippet: `Vocalise com "Nhe-Nhe" ou "Brrrr"`,
      practiceTasks: [
        { id: 't1', text: 'Fazer vibração de lábios (Brrrr) subindo e descendo a escala', done: false },
        { id: 't2', text: 'Cantar a nota Lá (440Hz) sustentada com afinação perfeita', done: false }
      ],
      demoMelody: [
        { note: 'C4', duration: 1 },
        { note: 'D4', duration: 1 },
        { note: 'E4', duration: 1 },
        { note: 'F4', duration: 1 },
        { note: 'G4', duration: 2 }
      ]
    }
  ],
  bateria: [
    {
      id: 501,
      instrumentId: 'bateria',
      title: 'Aula 1: Pegada nas Baquetas e o Primeiro Groove de Rock',
      module: 'Módulo 1: Fundamentos do Ritmo',
      duration: '17 min',
      level: 'Iniciante',
      teacher: 'Prof. Lucas Ritmista',
      videoPoster: '🥁',
      summary: 'Pegada matched grip (fulcro correto entre indicador e polegar), bumbo nos tempos 1 e 3, caixa nos tempos 2 e 4, e chimbal em colcheias.',
      keyPoints: [
        'Pulso com mola natural aproveitando o rebote da pele',
        'Pé do bumbo sem cansar a canela',
        'Contagem verbal contínua: 1 e 2 e 3 e 4 e'
      ],
      chords: ['Groove Básico 4/4'],
      tabSnippet: `CH: x x x x x x x x
CX: . . o . . . o .
BD: o . . . o . . .`,
      practiceTasks: [
        { id: 't1', text: 'Tocar 1 minuto sem errar o groove a 70 BPM', done: false }
      ],
      demoMelody: [
        { note: 'C3', duration: 1 },
        { note: 'D3', duration: 1 },
        { note: 'C3', duration: 1 },
        { note: 'D3', duration: 1 }
      ]
    }
  ],
  violino: [
    {
      id: 601,
      instrumentId: 'violino',
      title: 'Aula 1: Empunhadura de Arco e Primeira Corda Solta',
      module: 'Módulo 1: O Arco Mágico',
      duration: '16 min',
      level: 'Iniciante',
      teacher: 'Maestro Fernando Couto',
      videoPoster: '🎻',
      summary: 'Como segurar o arco sem rigidez, passar o breu na crina e produzir um som aveludado e perpendicular ao cavalete na corda Lá (A).',
      keyPoints: [
        'Polegar curvo encostado no talão',
        'Ponto de contato equidistante entre o espelho e o cavalete',
        'Velocidade e peso de braço equilibrados'
      ],
      chords: ['Cordas Soltas: Sol, Ré, Lá, Mi'],
      tabSnippet: `G3 - D4 - A4 - E5`,
      practiceTasks: [
        { id: 't1', text: 'Arco inteiro na corda Lá sem ruído metálico', done: false }
      ],
      demoMelody: [
        { note: 'A4', duration: 2 },
        { note: 'E5', duration: 2 },
        { note: 'A4', duration: 4 }
      ]
    }
  ]
};

export const STORE_PRODUCTS: Product[] = [
  {
    id: 1,
    name: 'Boquilha Yamaha 4C Original para Sax Alto',
    price: 289.90,
    originalPrice: 340.00,
    category: 'Acessórios',
    image: '🎷',
    rating: 4.9,
    reviewsCount: 142,
    badge: 'Mais Vendido',
    description: 'A boquilha padrão ouro recomendada por professores para quem busca som equilibrado, fácil resposta e afinação precisa.',
    inStock: true
  },
  {
    id: 2,
    name: 'Afinador & Metrônomo Clip Digital Tutti Pro',
    price: 59.90,
    originalPrice: 85.00,
    category: 'Acessórios',
    image: '🎛️',
    rating: 4.8,
    reviewsCount: 230,
    badge: 'Essencial',
    description: 'Display LCD colorido de alto contraste, captação piezoelétrica resistente a ruídos e calibração de 430 a 450Hz.',
    inStock: true
  },
  {
    id: 3,
    name: 'Caixa de Palhetas Vandoren Tradicional Azul 2.5 (10 un)',
    price: 245.00,
    category: 'Acessórios',
    image: '🎼',
    rating: 5.0,
    reviewsCount: 88,
    badge: 'Qualidade Francesa',
    description: 'A palheta mais tocada do mundo, com riqueza harmônica e timbre puro desde o pianíssimo até o fortíssimo.',
    inStock: true
  },
  {
    id: 4,
    name: 'Baquetas American Classic Vic Firth 5A Hickory',
    price: 99.90,
    originalPrice: 120.00,
    category: 'Acessórios',
    image: '🥁',
    rating: 4.9,
    reviewsCount: 175,
    badge: 'Clássico',
    description: 'Fabricadas em madeira Hickory americano de alta densidade para durabilidade e resposta veloz.',
    inStock: true
  },
  {
    id: 5,
    name: 'Camiseta Oficial Tutti "All Notes Welcome"',
    price: 89.90,
    category: 'Vestuário',
    image: '👕',
    rating: 4.7,
    reviewsCount: 64,
    badge: 'Edição Exclusiva',
    description: '100% Algodão egípcio peletizado, toque suave e estampa exclusiva com tipografia musical luminosa.',
    inStock: true
  },
  {
    id: 6,
    name: 'Capotraste Profissional com Mola em Alumínio para Violão',
    price: 49.00,
    originalPrice: 65.00,
    category: 'Acessórios',
    image: '🎸',
    rating: 4.8,
    reviewsCount: 110,
    description: 'Pressão uniforme que não desafina suas cordas e proteção em silicone macio.',
    inStock: true
  },
  {
    id: 7,
    name: 'E-book: O Guia Definitivo da Harmonia Funcional',
    price: 69.90,
    category: 'Livros',
    image: '📚',
    rating: 4.9,
    reviewsCount: 94,
    badge: 'Best-Seller',
    description: 'Mais de 250 páginas ilustradas com exemplos de MPB, Bossa Nova, Pop e Jazz pelo Maestro Fernando Couto.',
    inStock: true
  },
  {
    id: 8,
    name: 'Muffler Abafador de Gel para Peles de Bateria (Kit 6 un)',
    price: 39.90,
    category: 'Acessórios',
    image: '🔘',
    rating: 4.6,
    reviewsCount: 41,
    description: 'Controle de ressonância harmônica para bumbo, caixas e tons sem alterar o timbre natural.',
    inStock: true
  }
];

export const MASTERCLASSES: Masterclass[] = [
  {
    id: 1,
    title: 'Masterclass: Improvisação no Jazz e Fraseado Brasileiro',
    instructor: 'Maestro Paulo Silva (Grammy Nominee)',
    instrument: 'Saxofone & Teclado',
    date: 'Quarta-feira, 22 de Outubro',
    time: '19:30 BRT',
    participants: 148,
    level: 'Intermediário / Avançado',
    status: 'Inscrições Abertas'
  },
  {
    id: 2,
    title: 'Workshop: A Levada Perfeita de Bossa Nova no Violão',
    instructor: 'Prof. André Martins',
    instrument: 'Violão',
    date: 'Sábado, 25 de Outubro',
    time: '15:00 BRT',
    participants: 215,
    level: 'Todos os níveis',
    status: 'Inscrições Abertas'
  },
  {
    id: 3,
    title: 'Oficina Ao Vivo: Saúde Vocal e Alta Performance',
    instructor: 'Dra. Mariana Sales (Fonoaudióloga & Cantora)',
    instrument: 'Canto & Voz',
    date: 'Hoje',
    time: '20:00 BRT',
    participants: 310,
    level: 'Todos os níveis',
    status: 'Hoje'
  }
];

export const COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: 1,
    author: 'Mariana Duarte',
    avatar: '👩‍🦱',
    instrument: 'Saxofone Alto',
    timeAgo: 'há 2 horas',
    content: 'Gente! Finalmente consegui tirar Autumn Leaves sem errar a transição para o D7! A dica do Maestro IA sobre manter a embocadura relaxada mudou tudo 🎷✨',
    likes: 38,
    comments: 9,
    tag: '#Conquistas'
  },
  {
    id: 2,
    author: 'Carlos Alberto',
    avatar: '🧔',
    instrument: 'Violão 7 Cordas',
    timeAgo: 'há 4 horas',
    content: 'Alguém aqui estuda Choro? Estou montando uma roda de prática virtual no Discord do Tutti para tocar Carinhoso e Brasileirinho nesta sexta!',
    likes: 54,
    comments: 21,
    tag: '#ComunidadeJam'
  },
  {
    id: 3,
    author: 'Bárbara Klein',
    avatar: '👩',
    instrument: 'Teclado & Piano',
    timeAgo: 'há 1 dia',
    content: 'Dica de ouro que aprendi na aula 2 da Profa. Clara: condução de vozes! Inverter o acorde de Sol para B-D-G evita você ficar pulando a mão pelo teclado. Soou muito mais profissional!',
    likes: 82,
    comments: 14,
    tag: '#DicaDoDia'
  }
];
