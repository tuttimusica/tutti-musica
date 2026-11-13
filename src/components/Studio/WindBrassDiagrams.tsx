import React from 'react';

export interface ClarinetKeys {
  register?: boolean; // Chave de registro (polegar esquerdo atrás)
  thumb?: boolean;    // Furo do polegar esquerdo
  lh1?: boolean;      // Indicador esquerdo
  lh2?: boolean;      // Médio esquerdo
  lh3?: boolean;      // Anelar esquerdo
  throatA?: boolean;  // Chave A (frente superior)
  throatGSharp?: boolean; // Chave G# (lateral superior)
  lhPinkyEb?: boolean; // Mindinho esquerdo Eb/Ab
  lhPinkyCSharp?: boolean; // Mindinho esquerdo C#/F#
  lhPinkyB?: boolean; // Mindinho esquerdo B/E
  lhPinkyC?: boolean; // Mindinho esquerdo C/F
  rh4?: boolean;      // Indicador direito
  rh5?: boolean;      // Médio direito
  rh6?: boolean;      // Anelar direito
  sideBb?: boolean;   // Chave lateral Sib (trinado 1/2)
  rhPinkyEb?: boolean;// Mindinho direito Eb/Ab
  rhPinkyF?: boolean; // Mindinho direito F/C
  rhPinkyE?: boolean; // Mindinho direito E/B
  rhPinkyFSharp?: boolean; // Mindinho direito F#/C#
}

export interface ClarinetNote {
  id: string;
  scientific: string;
  namePt: string;
  register: 'Chalumeau (Grave)' | 'Garganta (Médio-Grave)' | 'Clarim (Médio-Agudo)' | 'Agudo';
  keys: ClarinetKeys;
  leftHandText: string;
  rightHandText: string;
  tip: string;
}

export const CLARINET_NOTES: ClarinetNote[] = [
  {
    id: 'E3', scientific: 'E3', namePt: 'Mi Grave', register: 'Chalumeau (Grave)',
    keys: { thumb: true, lh1: true, lh2: true, lh3: true, rh4: true, rh5: true, rh6: true, rhPinkyE: true },
    leftHandText: 'Polegar (furo) + Dedos 1, 2, 3', rightHandText: 'Dedos 4, 5, 6 + Mindinho E/B',
    tip: 'Nota mais grave do clarinete Bb padrão (soa D3 real). Vede todos os anéis com a polpa dos dedos.'
  },
  {
    id: 'F3', scientific: 'F3', namePt: 'Fá Grave', register: 'Chalumeau (Grave)',
    keys: { thumb: true, lh1: true, lh2: true, lh3: true, rh4: true, rh5: true, rh6: true, rhPinkyF: true },
    leftHandText: 'Polegar + Dedos 1, 2, 3', rightHandText: 'Dedos 4, 5, 6 + Mindinho F/C',
    tip: 'Alternativa de mindinho esquerdo C/F disponível para passagens cromáticas.'
  },
  {
    id: 'F#3', scientific: 'F#3', namePt: 'Fá# / Solb Grave', register: 'Chalumeau (Grave)',
    keys: { thumb: true, lh1: true, lh2: true, lh3: true, rh4: true, rh5: true, rh6: true, rhPinkyFSharp: true },
    leftHandText: 'Polegar + Dedos 1, 2, 3', rightHandText: 'Dedos 4, 5, 6 + Mindinho F#/C#',
    tip: 'Mantenha pressão de ar constante para evitar perda de foco nos graves.'
  },
  {
    id: 'G3', scientific: 'G3', namePt: 'Sol Grave', register: 'Chalumeau (Grave)',
    keys: { thumb: true, lh1: true, lh2: true, lh3: true, rh4: true, rh5: true, rh6: true },
    leftHandText: 'Polegar + Dedos 1, 2, 3', rightHandText: 'Dedos 4, 5, 6 (mindinhos livres)',
    tip: 'Base fundamental do registro chalumeau.'
  },
  {
    id: 'G#3', scientific: 'G#3', namePt: 'Sol# / Láb Grave', register: 'Chalumeau (Grave)',
    keys: { thumb: true, lh1: true, lh2: true, lh3: true, rh4: true, rh5: true, rh6: true, rhPinkyEb: true },
    leftHandText: 'Polegar + Dedos 1, 2, 3', rightHandText: 'Dedos 4, 5, 6 + Chave Eb/Ab',
    tip: 'Mindinho direito na chave superior do conjunto inferior.'
  },
  {
    id: 'A3', scientific: 'A3', namePt: 'Lá Grave', register: 'Chalumeau (Grave)',
    keys: { thumb: true, lh1: true, lh2: true, lh3: true, rh4: true, rh5: true },
    leftHandText: 'Polegar + Dedos 1, 2, 3', rightHandText: 'Dedos 4, 5 (6 aberto)',
    tip: 'Som aveludado e escuro típico do clarinete.'
  },
  {
    id: 'Bb3', scientific: 'Bb3', namePt: 'Sib Grave', register: 'Chalumeau (Grave)',
    keys: { thumb: true, lh1: true, lh2: true, lh3: true, rh4: true },
    leftHandText: 'Polegar + Dedos 1, 2, 3', rightHandText: 'Apenas Dedo 4',
    tip: 'Evite levantar os dedos 5 e 6 excessivamente.'
  },
  {
    id: 'B3', scientific: 'B3', namePt: 'Si Grave', register: 'Chalumeau (Grave)',
    keys: { thumb: true, lh1: true, lh2: true, lh3: true, rh5: true },
    leftHandText: 'Polegar + Dedos 1, 2, 3', rightHandText: 'Apenas Dedo 5 (Forquilha)',
    tip: 'Digitação padrão Boehm usando o médio direito (5).'
  },
  {
    id: 'C4', scientific: 'C4', namePt: 'Dó Médio', register: 'Chalumeau (Grave)',
    keys: { thumb: true, lh1: true, lh2: true, lh3: true },
    leftHandText: 'Polegar + Dedos 1, 2, 3', rightHandText: 'Mão direita aberta (apoio no polegar)',
    tip: 'Dó central escrito (soa Sib3 de concerto).'
  },
  {
    id: 'D4', scientific: 'D4', namePt: 'Ré Médio', register: 'Chalumeau (Grave)',
    keys: { thumb: true, lh1: true, lh2: true },
    leftHandText: 'Polegar + Dedos 1, 2', rightHandText: 'Aberta',
    tip: 'Apoie bem o peso do instrumento no polegar direito.'
  },
  {
    id: 'E4', scientific: 'E4', namePt: 'Mi Médio', register: 'Chalumeau (Grave)',
    keys: { thumb: true, lh1: true },
    leftHandText: 'Polegar + Dedo 1', rightHandText: 'Aberta',
    tip: 'Som aberto e expressivo.'
  },
  {
    id: 'F4', scientific: 'F4', namePt: 'Fá Médio', register: 'Chalumeau (Grave)',
    keys: { thumb: true },
    leftHandText: 'Apenas Polegar esquerdo no furo', rightHandText: 'Aberta',
    tip: 'Mantenha o dedo 1 próximo ao anel sem encostar.'
  },
  {
    id: 'G4', scientific: 'G4', namePt: 'Sol Médio (Aberto)', register: 'Garganta (Médio-Grave)',
    keys: {},
    leftHandText: 'Todos os furos abertos', rightHandText: 'Aberta',
    tip: 'Nota solta da região de garganta; evite sopro frouxo.'
  },
  {
    id: 'G#4', scientific: 'G#4', namePt: 'Sol# / Láb', register: 'Garganta (Médio-Grave)',
    keys: { throatGSharp: true },
    leftHandText: 'Indicador esquerdo aciona chave lateral G#', rightHandText: 'Aberta',
    tip: 'Gire levemente a base do indicador sem mover o pulso.'
  },
  {
    id: 'A4', scientific: 'A4', namePt: 'Lá de Garganta', register: 'Garganta (Médio-Grave)',
    keys: { throatA: true },
    leftHandText: 'Indicador esquerdo na chave frontal A', rightHandText: 'Aberta',
    tip: 'Use os dedos direitos no corpo se precisar estabilizar afinação.'
  },
  {
    id: 'Bb4', scientific: 'Bb4', namePt: 'Sib de Garganta', register: 'Garganta (Médio-Grave)',
    keys: { register: true, throatA: true },
    leftHandText: 'Polegar na chave de Registro + Chave frontal A', rightHandText: 'Aberta (ou apoio 4,5,6 para encorpar)',
    tip: 'Posição tradicional antes da passagem para o registro clarim.'
  },
  {
    id: 'B4', scientific: 'B4', namePt: 'Si Natural (Clarim)', register: 'Clarim (Médio-Agudo)',
    keys: { register: true, thumb: true, lh1: true, lh2: true, lh3: true, rh4: true, rh5: true, rh6: true, rhPinkyE: true },
    leftHandText: 'Registro + Polegar + 1, 2, 3', rightHandText: '4, 5, 6 + Mindinho E/B',
    tip: 'Passagem clássica ("crossing the break"): antecipe a colocação dos dedos direitos.'
  },
  {
    id: 'C5', scientific: 'C5', namePt: 'Dó Agudo (Clarim)', register: 'Clarim (Médio-Agudo)',
    keys: { register: true, thumb: true, lh1: true, lh2: true, lh3: true, rh4: true, rh5: true, rh6: true, rhPinkyF: true },
    leftHandText: 'Registro + Polegar + 1, 2, 3', rightHandText: '4, 5, 6 + Mindinho F/C',
    tip: 'Mesma digitação do Fá grave com a chave de registro (12ª acima).'
  },
  {
    id: 'D5', scientific: 'D5', namePt: 'Ré Agudo', register: 'Clarim (Médio-Agudo)',
    keys: { register: true, thumb: true, lh1: true, lh2: true, lh3: true, rh4: true, rh5: true, rh6: true },
    leftHandText: 'Registro + Polegar + 1, 2, 3', rightHandText: 'Dedos 4, 5, 6',
    tip: 'Timbre luminoso e redondo do registro clarim.'
  },
  {
    id: 'E5', scientific: 'E5', namePt: 'Mi Agudo', register: 'Clarim (Médio-Agudo)',
    keys: { register: true, thumb: true, lh1: true, lh2: true, lh3: true, rh4: true, rh5: true },
    leftHandText: 'Registro + Polegar + 1, 2, 3', rightHandText: 'Dedos 4, 5',
    tip: 'Coluna de ar firme e focalizada.'
  },
  {
    id: 'F5', scientific: 'F5', namePt: 'Fá Agudo', register: 'Clarim (Médio-Agudo)',
    keys: { register: true, thumb: true, lh1: true, lh2: true, lh3: true, rh4: true },
    leftHandText: 'Registro + Polegar + 1, 2, 3', rightHandText: 'Dedo 4',
    tip: 'Afinação estável com queixo relaxado e apoio abdominal.'
  },
  {
    id: 'G5', scientific: 'G5', namePt: 'Sol Agudo', register: 'Clarim (Médio-Agudo)',
    keys: { register: true, thumb: true, lh1: true, lh2: true, lh3: true },
    leftHandText: 'Registro + Polegar + 1, 2, 3', rightHandText: 'Aberta',
    tip: 'Mesma digitação do C4 + chave de registro.'
  },
  {
    id: 'A5', scientific: 'A5', namePt: 'Lá Agudo', register: 'Clarim (Médio-Agudo)',
    keys: { register: true, thumb: true, lh1: true, lh2: true },
    leftHandText: 'Registro + Polegar + 1, 2', rightHandText: 'Aberta',
    tip: 'Mantenha velocidade do ar alta.'
  },
  {
    id: 'Bb5', scientific: 'Bb5', namePt: 'Sib Agudo', register: 'Clarim (Médio-Agudo)',
    keys: { register: true, thumb: true, lh1: true },
    leftHandText: 'Registro + Polegar + Dedo 1', rightHandText: 'Aberta',
    tip: 'Transição suave para o registro altíssimo.'
  },
  {
    id: 'C6', scientific: 'C6', namePt: 'Dó Superagudo', register: 'Agudo',
    keys: { register: true, thumb: true },
    leftHandText: 'Registro + Polegar', rightHandText: 'Aberta (ou chave Eb direita para afinar)',
    tip: 'Última nota antes do registro altíssimo estendido.'
  },
  {
    id: 'D6', scientific: 'D6', namePt: 'Ré Superagudo', register: 'Agudo',
    keys: { register: true, thumb: true, lh2: true, lh3: true, rh4: true, rh5: true, rh6: true, rhPinkyEb: true },
    leftHandText: 'Registro + Polegar + 2, 3 (1 aberto)', rightHandText: '4, 5, 6 + Chave Eb',
    tip: 'Posição altíssima padrão com indicador esquerdo aberto ("half-hole/open 1").'
  },
];

export interface TrumpetNote {
  id: string;
  scientific: string;
  namePt: string;
  valves: [boolean, boolean, boolean]; // [Pisto 1, Pisto 2, Pisto 3]
  valvesLabel: string;
  partial: string;
  tip: string;
}

export const TRUMPET_NOTES: TrumpetNote[] = [
  { id: 'F#3', scientific: 'F#3', namePt: 'Fá# Grave', valves: [true, true, true], valvesLabel: '1 + 2 + 3', partial: '2ª Série Harmônica', tip: 'Use a bomba móvel do 3º pisto para corrigir afinação naturalmente alta.' },
  { id: 'G3', scientific: 'G3', namePt: 'Sol Grave', valves: [true, false, true], valvesLabel: '1 + 3', partial: '2ª Série Harmônica', tip: 'Estenda levemente a bomba do 3º pisto para afinar.' },
  { id: 'G#3', scientific: 'G#3', namePt: 'Sol# / Láb Grave', valves: [false, true, true], valvesLabel: '2 + 3', partial: '2ª Série Harmônica', tip: 'Embocadura relaxada com ar amplo e quente.' },
  { id: 'A3', scientific: 'A3', namePt: 'Lá Grave', valves: [true, true, false], valvesLabel: '1 + 2', partial: '2ª Série Harmônica', tip: 'Pistos firmes até o fim do curso.' },
  { id: 'Bb3', scientific: 'Bb3', namePt: 'Sib Grave', valves: [true, false, false], valvesLabel: '1', partial: '2ª Série Harmônica', tip: 'Apenas o 1º pisto pressionado.' },
  { id: 'B3', scientific: 'B3', namePt: 'Si Grave', valves: [false, true, false], valvesLabel: '2', partial: '2ª Série Harmônica', tip: 'Apenas o 2º pisto (central).' },
  { id: 'C4', scientific: 'C4', namePt: 'Dó Central', valves: [false, false, false], valvesLabel: '0 (Aberto)', partial: '2ª Série Harmônica', tip: 'Todos os pistos soltos. Nota base de aquecimento no trompete Bb (soa Sib3).' },
  { id: 'C#4', scientific: 'C#4', namePt: 'Dó# / Réb Médio', valves: [true, true, true], valvesLabel: '1 + 2 + 3', partial: '3ª Série Harmônica', tip: 'Corrija afinação estendendo a bomba do 3º pisto.' },
  { id: 'D4', scientific: 'D4', namePt: 'Ré Médio', valves: [true, false, true], valvesLabel: '1 + 3', partial: '3ª Série Harmônica', tip: 'Ajuste fino com o anelar esquerdo na bomba do 3º pisto.' },
  { id: 'Eb4', scientific: 'Eb4', namePt: 'Mib Médio', valves: [false, true, true], valvesLabel: '2 + 3', partial: '3ª Série Harmônica', tip: 'Transição limpa para o Mi natural.' },
  { id: 'E4', scientific: 'E4', namePt: 'Mi Médio', valves: [true, true, false], valvesLabel: '1 + 2', partial: '3ª Série Harmônica', tip: 'Mantenha fluxo de ar contínuo sem apertar o bocal nos lábios.' },
  { id: 'F4', scientific: 'F4', namePt: 'Fá Médio', valves: [true, false, false], valvesLabel: '1', partial: '3ª Série Harmônica', tip: 'Nota central muito utilizada para estudos de sonoridade.' },
  { id: 'F#4', scientific: 'F#4', namePt: 'Fá# Médio', valves: [false, true, false], valvesLabel: '2', partial: '3ª Série Harmônica', tip: 'Apenas pisto 2 pressionado.' },
  { id: 'G4', scientific: 'G4', namePt: 'Sol Médio', valves: [false, false, false], valvesLabel: '0 (Aberto)', partial: '3ª Série Harmônica', tip: '3º harmônico natural aberto.' },
  { id: 'Ab4', scientific: 'Ab4', namePt: 'Láb / Sol#', valves: [false, true, true], valvesLabel: '2 + 3', partial: '4ª Série Harmônica', tip: 'Velocidade de ar direcionada com sílaba "Taa-ii".' },
  { id: 'A4', scientific: 'A4', namePt: 'Lá Médio', valves: [true, true, false], valvesLabel: '1 + 2', partial: '4ª Série Harmônica', tip: 'Afinação tende a subir leve; apoie com o diafragma.' },
  { id: 'Bb4', scientific: 'Bb4', namePt: 'Sib Médio', valves: [true, false, false], valvesLabel: '1', partial: '4ª Série Harmônica', tip: 'Pisto 1 único.' },
  { id: 'B4', scientific: 'B4', namePt: 'Si Médio', valves: [false, true, false], valvesLabel: '2', partial: '4ª Série Harmônica', tip: 'Pisto 2 único.' },
  { id: 'C5', scientific: 'C5', namePt: 'Dó Agudo', valves: [false, false, false], valvesLabel: '0 (Aberto)', partial: '4ª Série Harmônica', tip: '4º harmônico aberto. Use ar rápido sem forçar pressão no bocal.' },
  { id: 'D5', scientific: 'D5', namePt: 'Ré Agudo', valves: [true, false, false], valvesLabel: '1', partial: '5ª Série Harmônica', tip: 'Atenção à série harmônica mais próxima; escute a afinação antes de atacar.' },
  { id: 'E5', scientific: 'E5', namePt: 'Mi Agudo', valves: [false, false, false], valvesLabel: '0 (Aberto)', partial: '5ª Série Harmônica', tip: '5º harmônico natural (alternativa 1+2 se soar baixo).' },
  { id: 'F5', scientific: 'F5', namePt: 'Fá Agudo', valves: [true, false, false], valvesLabel: '1', partial: '6ª Série Harmônica', tip: 'Língua elevada ("ii") para acelerar o fluxo de ar.' },
  { id: 'G5', scientific: 'G5', namePt: 'Sol Agudo', valves: [false, false, false], valvesLabel: '0 (Aberto)', partial: '6ª Série Harmônica', tip: '6º harmônico aberto.' },
  { id: 'A5', scientific: 'A5', namePt: 'Lá Agudo', valves: [true, true, false], valvesLabel: '1 + 2', partial: '7ª/8ª Série Harmônica', tip: 'Suporte abdominal firme.' },
  { id: 'C6', scientific: 'C6', namePt: 'Dó Superagudo', valves: [false, false, false], valvesLabel: '0 (Aberto)', partial: '8ª Série Harmônica', tip: '8º harmônico aberto. Controle preciso dos cantos da embocadura.' },
];

export interface TromboneNote {
  id: string;
  scientific: string;
  namePt: string;
  position: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  partial: string;
  tip: string;
}

export const TROMBONE_NOTES: TromboneNote[] = [
  { id: 'E2', scientific: 'E2', namePt: 'Mi Grave', position: 7, partial: '2º Harmônico', tip: '7ª posição (extensão máxima da vara). Som profundo com ar largo.' },
  { id: 'F2', scientific: 'F2', namePt: 'Fá Grave', position: 6, partial: '2º Harmônico', tip: '6ª posição. Mantenha o pulso direito solto para alcançar sem tensionar.' },
  { id: 'F#2', scientific: 'F#2', namePt: 'Fá# Grave', position: 5, partial: '2º Harmônico', tip: '5ª posição.' },
  { id: 'G2', scientific: 'G2', namePt: 'Sol Grave', position: 4, partial: '2º Harmônico', tip: '4ª posição (ponta da vara alinhada próxima à borda da campana).' },
  { id: 'Ab2', scientific: 'Ab2', namePt: 'Láb Grave', position: 3, partial: '2º Harmônico', tip: '3ª posição (mão direita alinhada próxima à campana).' },
  { id: 'A2', scientific: 'A2', namePt: 'Lá Grave', position: 2, partial: '2º Harmônico', tip: '2ª posição (~8 cm abaixo da 1ª posição).' },
  { id: 'Bb2', scientific: 'Bb2', namePt: 'Sib Grave (Fundamental)', position: 1, partial: '2º Harmônico', tip: '1ª posição totalmente recolhida. Nota base do trombone tenor.' },
  { id: 'B2', scientific: 'B2', namePt: 'Si Grave', position: 7, partial: '3º Harmônico', tip: '7ª posição no 3º harmônico.' },
  { id: 'C3', scientific: 'C3', namePt: 'Dó Grave', position: 6, partial: '3º Harmônico', tip: '6ª posição no 3º harmônico.' },
  { id: 'C#3', scientific: 'C#3', namePt: 'Dó# / Réb', position: 5, partial: '3º Harmônico', tip: '5ª posição.' },
  { id: 'D3', scientific: 'D3', namePt: 'Ré Médio', position: 4, partial: '3º Harmônico', tip: '4ª posição alinhada à campana.' },
  { id: 'Eb3', scientific: 'Eb3', namePt: 'Mib Médio', position: 3, partial: '3º Harmônico', tip: '3ª posição.' },
  { id: 'E3', scientific: 'E3', namePt: 'Mi Médio', position: 2, partial: '3º Harmônico', tip: '2ª posição.' },
  { id: 'F3', scientific: 'F3', namePt: 'Fá Médio', position: 1, partial: '3º Harmônico', tip: '1ª posição recolhida (3º harmônico natural).' },
  { id: 'F#3', scientific: 'F#3', namePt: 'Fá# Médio', position: 5, partial: '4º Harmônico', tip: '5ª posição.' },
  { id: 'G3', scientific: 'G3', namePt: 'Sol Médio', position: 4, partial: '4º Harmônico', tip: '4ª posição no 4º harmônico.' },
  { id: 'Ab3', scientific: 'Ab3', namePt: 'Láb Médio', position: 3, partial: '4º Harmônico', tip: '3ª posição.' },
  { id: 'A3', scientific: 'A3', namePt: 'Lá Médio', position: 2, partial: '4º Harmônico', tip: '2ª posição.' },
  { id: 'Bb3', scientific: 'Bb3', namePt: 'Sib Médio', position: 1, partial: '4º Harmônico', tip: '1ª posição no 4º harmônico.' },
  { id: 'C4', scientific: 'C4', namePt: 'Dó Agudo', position: 3, partial: '5º Harmônico', tip: '3ª posição (alternativa na 6ª posição).' },
  { id: 'D4', scientific: 'D4', namePt: 'Ré Agudo', position: 1, partial: '5º Harmônico', tip: '1ª posição (ajuste fino levemente estendido devido ao 5º harmônico).' },
  { id: 'Eb4', scientific: 'Eb4', namePt: 'Mib Agudo', position: 3, partial: '6º Harmônico', tip: '3ª posição.' },
  { id: 'F4', scientific: 'F4', namePt: 'Fá Agudo', position: 1, partial: '6º Harmônico', tip: '1ª posição.' },
  { id: 'G4', scientific: 'G4', namePt: 'Sol Agudo', position: 2, partial: '7º Harmônico', tip: '2ª posição curta (ajuste auditivo).' },
  { id: 'Bb4', scientific: 'Bb4', namePt: 'Sib Agudo', position: 1, partial: '8º Harmônico', tip: '1ª posição. Ar rápido e cantos da embocadura firmes.' },
];

export const ClarinetSvgDiagram: React.FC<{ keys: ClarinetKeys }> = ({ keys }) => {
  const hole = (cx: number, cy: number, label: string, active?: boolean, r = 10) => (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={active ? '#ef4444' : '#1e293b'}
        stroke={active ? '#fca5a5' : '#64748b'}
        strokeWidth="2.5"
        className={active ? 'filter drop-shadow-[0_0_9px_rgba(239,68,68,0.95)]' : ''}
      />
      <text x={cx} y={cy + 3.5} textAnchor="middle" fill={active ? '#ffffff' : '#cbd5e1'} fontSize="9.5" fontWeight="bold">
        {label}
      </text>
    </g>
  );

  const lever = (x: number, y: number, w: number, h: number, label: string, active?: boolean) => (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={4}
        fill={active ? '#ef4444' : '#1e293b'}
        stroke={active ? '#fca5a5' : '#64748b'}
        strokeWidth="1.8"
        className={active ? 'filter drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]' : ''}
      />
      <text x={x + w / 2} y={y + h / 2 + 3} textAnchor="middle" fill={active ? '#fff' : '#94a3b8'} fontSize="7" fontWeight="bold">
        {label}
      </text>
    </g>
  );

  return (
    <div className="relative w-52 sm:w-56 h-[460px] flex items-center justify-center">
      <svg viewBox="0 0 210 480" className="w-full h-full drop-shadow-2xl">
        {/* Corpo em ébano + anéis prateados + campana */}
        <rect x="93" y="48" width="14" height="368" rx="4" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
        {/* Boquilha & Barrilete */}
        <path d="M 94 12 L 106 12 L 108 42 L 92 42 Z" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
        <rect x="90" y="42" width="20" height="22" rx="3" fill="#0f172a" stroke="#94a3b8" strokeWidth="1.5" />
        {/* Anéis de junção */}
        <rect x="89" y="232" width="22" height="4" rx="1" fill="#cbd5e1" />
        <rect x="89" y="408" width="22" height="4" rx="1" fill="#cbd5e1" />
        {/* Campana inferior */}
        <path d="M 91 412 L 109 412 L 122 456 Q 100 464 78 456 Z" fill="#0f172a" stroke="#94a3b8" strokeWidth="2" />

        {/* Chave de Registro (R) e Polegar Esquerdo (T) */}
        {lever(55, 86, 26, 17, 'REG', keys.register)}
        {hole(68, 118, 'TH', keys.thumb, 10)}

        {/* Chaves de Garganta (A frontal, G# lateral) */}
        {lever(91, 78, 18, 14, 'A', keys.throatA)}
        {lever(115, 88, 22, 14, 'G#', keys.throatGSharp)}

        {/* Mão Esquerda: 1, 2, 3 */}
        {hole(100, 118, '1', keys.lh1)}
        {hole(100, 152, '2', keys.lh2)}
        {hole(100, 186, '3', keys.lh3)}

        {/* Chaves de Mindinho Esquerdo (E/B, F/C, F#/C#, Eb/Ab) */}
        {lever(54, 198, 26, 14, 'Eb', keys.lhPinkyEb)}
        {lever(54, 214, 26, 14, 'F#/C#', keys.lhPinkyCSharp)}
        {lever(54, 230, 26, 14, 'E/B', keys.lhPinkyB)}
        {lever(54, 246, 26, 14, 'F/C', keys.lhPinkyC)}

        {/* Mão Direita: 4, 5, 6 */}
        {hole(100, 266, '4', keys.rh4)}
        {hole(100, 300, '5', keys.rh5)}
        {hole(100, 334, '6', keys.rh6)}

        {/* Chaves de Mindinho Direito */}
        {lever(120, 350, 28, 14, 'Eb/Ab', keys.rhPinkyEb)}
        {lever(120, 366, 28, 14, 'F/C', keys.rhPinkyF)}
        {lever(120, 382, 28, 14, 'E/B', keys.rhPinkyE)}
        {lever(120, 398, 28, 14, 'F#/C#', keys.rhPinkyFSharp)}
      </svg>
    </div>
  );
};

export const TrumpetSvgDiagram: React.FC<{ valves: [boolean, boolean, boolean] }> = ({ valves }) => {
  return (
    <div className="relative w-64 sm:w-72 h-[380px] flex items-center justify-center">
      <svg viewBox="0 0 280 340" className="w-full h-full drop-shadow-2xl">
        {/* Silhueta técnica lateral do trompete em latão dourado */}
        <path
          d="M 22 145 L 220 145 Q 250 145 268 112 L 268 178 Q 250 145 220 145"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 65 145 L 65 182 Q 65 198 85 198 L 190 198 Q 208 198 208 182 L 208 164 L 90 164"
          fill="none"
          stroke="#d97706"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Bocal */}
        <path d="M 10 137 L 26 141 L 26 149 L 10 153 Z" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" />
        {/* Campana */}
        <path d="M 225 145 L 266 112 L 266 178 Z" fill="#f59e0b" opacity="0.35" stroke="#fbbf24" strokeWidth="2.5" />

        {/* Bloco dos 3 Pistos (Vista detalhada superior e frontal) */}
        <text x="140" y="34" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="bold">
          VÁLVULAS / PISTOS DO TROMPETE (Bb)
        </text>
        {[0, 1, 2].map((idx) => {
          const pressed = valves[idx];
          const cx = 104 + idx * 36;
          const capY = pressed ? 105 : 88;
          return (
            <g key={idx}>
              {/* Cilindro do pisto */}
              <rect x={cx - 10} y="114" width="20" height="74" rx="4" fill="#b45309" stroke="#fbbf24" strokeWidth="2" />
              {/* Haste */}
              <rect x={cx - 3} y={capY + 10} width="6" height={114 - (capY + 10)} fill="#e2e8f0" />
              {/* Botão (pérola) do pisto: Vermelho quando pressionado */}
              <circle
                cx={cx}
                cy={capY}
                r="14"
                fill={pressed ? '#ef4444' : '#1e293b'}
                stroke={pressed ? '#fca5a5' : '#94a3b8'}
                strokeWidth="2.5"
                className={pressed ? 'filter drop-shadow-[0_0_10px_rgba(239,68,68,0.95)]' : ''}
              />
              <text x={cx} y={capY + 4} textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">
                {idx + 1}
              </text>
              <text
                x={cx}
                y="235"
                textAnchor="middle"
                fill={pressed ? '#f87171' : '#64748b'}
                fontSize="10"
                fontWeight="bold"
              >
                {pressed ? 'BAIXO' : 'SOLTO'}
              </text>
            </g>
          );
        })}

        {/* Legenda inferior */}
        <rect x="30" y="264" width="220" height="44" rx="10" fill="#131722" stroke="#334155" strokeWidth="1.2" />
        <text x="140" y="283" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontWeight="bold">
          Vermelho = Pressionar Pisto • Cinza = Aberto
        </text>
        <text x="140" y="299" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold">
          Combinação Ativa: {valves.map((v, i) => (v ? i + 1 : null)).filter(Boolean).join(' + ') || '0 (Todos Soltos)'}
        </text>
      </svg>
    </div>
  );
};

export const TromboneSvgDiagram: React.FC<{ position: number }> = ({ position }) => {
  // Posição 1 = recolhido (slideOffset = 0), Posição 7 = extensão máxima (slideOffset = 108)
  const slideOffset = ((position - 1) / 6) * 108;

  return (
    <div className="relative w-72 sm:w-80 h-[380px] flex items-center justify-center">
      <svg viewBox="0 0 320 340" className="w-full h-full drop-shadow-2xl">
        <text x="160" y="30" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="bold">
          POSIÇÕES DA VARA DO TROMBONE (1ª a 7ª)
        </text>

        {/* Campana & Tubo traseiro fixo */}
        <path
          d="M 110 100 L 42 100 Q 22 100 22 120 Q 22 140 42 140 L 145 140"
          fill="none"
          stroke="#d97706"
          strokeWidth="6.5"
          strokeLinecap="round"
        />
        {/* Campana */}
        <path d="M 105 100 L 160 72 L 160 128 Z" fill="#f59e0b" opacity="0.4" stroke="#fbbf24" strokeWidth="2.5" />

        {/* Bocal & Tubo fixo interno da vara */}
        <path d="M 48 158 L 62 162 L 62 170 L 48 174 Z" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.2" />
        <line x1="64" y1="166" x2="188" y2="166" stroke="#94a3b8" strokeWidth="4" />
        <line x1="64" y1="190" x2="188" y2="190" stroke="#94a3b8" strokeWidth="4" />

        {/* Vara externa móvel (translada conforme posição 1..7) */}
        <g transform={`translate(${slideOffset}, 0)`}>
          <path
            d="M 76 166 L 190 166 Q 204 166 204 178 Q 204 190 190 190 L 76 190"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="7"
            strokeLinecap="round"
          />
          {/* Barra da mão direita */}
          <rect x="84" y="158" width="8" height="40" rx="3" fill="#ef4444" stroke="#fca5a5" strokeWidth="1.5" />
          {/* Marcador na ponta da vara */}
          <circle cx="204" cy="178" r="7" fill="#ef4444" className="filter drop-shadow-[0_0_8px_rgba(239,68,68,0.95)]" />
        </g>

        {/* Régua graduada de posições (1 a 7) */}
        <line x1="76" y1="242" x2="306" y2="242" stroke="#334155" strokeWidth="2" />
        {[1, 2, 3, 4, 5, 6, 7].map((pos) => {
          const x = 92 + ((pos - 1) / 6) * 202;
          const isCurrent = pos === position;
          return (
            <g key={pos}>
              <line x1={x} y1="234" x2={x} y2="250" stroke={isCurrent ? '#ef4444' : '#64748b'} strokeWidth={isCurrent ? '3' : '1.5'} />
              <circle
                cx={x}
                cy="268"
                r={isCurrent ? 13 : 10}
                fill={isCurrent ? '#ef4444' : '#1e293b'}
                stroke={isCurrent ? '#fca5a5' : '#475569'}
                strokeWidth="2"
                className={isCurrent ? 'filter drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]' : ''}
              />
              <text x={x} y="272" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">
                {pos}ª
              </text>
            </g>
          );
        })}

        <rect x="35" y="294" width="250" height="34" rx="10" fill="#131722" stroke="#334155" strokeWidth="1.2" />
        <text x="160" y="315" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="bold">
          Posição Ativa da Vara: {position}ª Posição
        </text>
      </svg>
    </div>
  );
};
