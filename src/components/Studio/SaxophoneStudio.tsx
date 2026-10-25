import React, { useState } from 'react';
import { Play, Volume2, Sparkles, Info, HelpCircle, ChevronRight, Award, BookOpen, ExternalLink, Image as ImageIcon, X } from 'lucide-react';
import { audioEngine } from '../../services/audioEngine';

export interface SaxKeyMap {
  octave?: boolean;
  frontF?: boolean;
  palmD?: boolean;
  palmEb?: boolean;
  palmF?: boolean;
  bis?: boolean;
  lh1?: boolean;
  lh2?: boolean;
  lh3?: boolean;
  gSharp?: boolean;
  lowCsharp?: boolean;
  lowB?: boolean;
  lowBb?: boolean;
  rh4?: boolean;
  rh5?: boolean;
  rh6?: boolean;
  highFsharp?: boolean;
  sideBb?: boolean;
  sideC?: boolean;
  sideHighE?: boolean;
  lowEb?: boolean;
  lowC?: boolean;
}

export interface SaxNoteDefinition {
  id: string;
  namePt: string;
  scientific: string;
  register: 'Grave' | 'Médio' | 'Agudo' | 'Altíssimo (Superagudo)';
  isAltissimo: boolean;
  description: string;
  keys: SaxKeyMap;
  fingeringText: {
    leftHand: string;
    rightHand: string;
    specialKeys: string;
  };
  voicingTip: string;
}

export const SAX_NOTES: SaxNoteDefinition[] = [
  // GRAVES
  {
    id: 'Bb3',
    namePt: 'Si bemol 3',
    scientific: 'Bb3',
    register: 'Grave',
    isAltissimo: false,
    description: 'A nota mais grave tradicional do saxofone. Exige apoio diafragmático firme e garganta relaxada.',
    keys: { lh1: true, lh2: true, lh3: true, lowBb: true, lowB: true, rh4: true, rh5: true, rh6: true, lowC: true },
    fingeringText: {
      leftHand: 'Dedos 1, 2, 3 + Chave de Sib grave (mindinho)',
      rightHand: 'Dedos 4, 5, 6 + Chave de Dó grave (mindinho)',
      specialKeys: 'Todas as chaves fechadas + Mesa de graves'
    },
    voicingTip: 'Garganta bem aberta dizendo "ÔÔ", embocadura relaxada para não pular de oitava.'
  },
  {
    id: 'B3',
    namePt: 'Si 3',
    scientific: 'B3',
    register: 'Grave',
    isAltissimo: false,
    description: 'Si grave encorpado.',
    keys: { lh1: true, lh2: true, lh3: true, lowB: true, rh4: true, rh5: true, rh6: true, lowC: true },
    fingeringText: {
      leftHand: 'Dedos 1, 2, 3 + Chave de Si grave (mindinho)',
      rightHand: 'Dedos 4, 5, 6 + Chave de Dó grave',
      specialKeys: 'Mindinho esquerdo na chave do Si'
    },
    voicingTip: 'Coluna de ar quente e volumosa.'
  },
  {
    id: 'C4',
    namePt: 'Dó 4',
    scientific: 'C4',
    register: 'Grave',
    isAltissimo: false,
    description: 'Dó grave com rica ressonância.',
    keys: { lh1: true, lh2: true, lh3: true, rh4: true, rh5: true, rh6: true, lowC: true },
    fingeringText: {
      leftHand: 'Dedos 1, 2, 3',
      rightHand: 'Dedos 4, 5, 6 + Chave de Dó grave (mindinho direito)',
      specialKeys: 'Mindinho direito pressionando chave inferior de Dó'
    },
    voicingTip: 'Mantenha a palheta vibrando livremente.'
  },
  {
    id: 'C#4',
    namePt: 'Dó sustenido 4',
    scientific: 'C#4',
    register: 'Grave',
    isAltissimo: false,
    description: 'Dó sustenido grave com todas as chaves principais abertas + mesa C# acionada.',
    keys: { lh1: true, lh2: true, lh3: true, lowCsharp: true, rh4: true, rh5: true, rh6: true },
    fingeringText: {
      leftHand: 'Dedos 1, 2, 3 + Chave C# (mesa)',
      rightHand: 'Dedos 4, 5, 6',
      specialKeys: 'Chave de Dó# da mesa do mindinho esquerdo'
    },
    voicingTip: 'Pressão de ar uniforme para estabilizar a afinação.'
  },
  {
    id: 'D4',
    namePt: 'Ré 4',
    scientific: 'D4',
    register: 'Grave',
    isAltissimo: false,
    description: 'Ré grave, nota fundamental com corpo acústico amplo.',
    keys: { lh1: true, lh2: true, lh3: true, rh4: true, rh5: true, rh6: true },
    fingeringText: {
      leftHand: 'Dedos 1, 2, 3',
      rightHand: 'Dedos 4, 5, 6',
      specialKeys: 'Nenhuma chave lateral'
    },
    voicingTip: 'Apoio firme no diafragma sem morder a boquilha.'
  },
  {
    id: 'Eb4',
    namePt: 'Mi bemol 4',
    scientific: 'Eb4',
    register: 'Grave',
    isAltissimo: false,
    description: 'Mi bemol grave.',
    keys: { lh1: true, lh2: true, lh3: true, rh4: true, rh5: true, rh6: true, lowEb: true },
    fingeringText: {
      leftHand: 'Dedos 1, 2, 3',
      rightHand: 'Dedos 4, 5, 6 + Chave de Mib (mindinho direito superior)',
      specialKeys: 'Mindinho direito na chave superior de Mib'
    },
    voicingTip: 'Atenção para não escorregar o mindinho para a chave de Dó.'
  },
  {
    id: 'E4',
    namePt: 'Mi 4',
    scientific: 'E4',
    register: 'Grave',
    isAltissimo: false,
    description: 'Mi grave.',
    keys: { lh1: true, lh2: true, lh3: true, rh4: true, rh5: true },
    fingeringText: {
      leftHand: 'Dedos 1, 2, 3',
      rightHand: 'Dedos 4 e 5',
      specialKeys: 'Dedo 6 livre'
    },
    voicingTip: 'Timbre aveludado e equilibrado.'
  },
  {
    id: 'F4',
    namePt: 'Fá 4',
    scientific: 'F4',
    register: 'Grave',
    isAltissimo: false,
    description: 'Fá natural grave.',
    keys: { lh1: true, lh2: true, lh3: true, rh4: true },
    fingeringText: {
      leftHand: 'Dedos 1, 2, 3',
      rightHand: 'Dedo 4 (indicador direito)',
      specialKeys: 'Dedos 5 e 6 livres'
    },
    voicingTip: 'Transição suave entre as mãos.'
  },
  {
    id: 'F#4',
    namePt: 'Fá sustenido 4',
    scientific: 'F#4',
    register: 'Grave',
    isAltissimo: false,
    description: 'Fá sustenido grave.',
    keys: { lh1: true, lh2: true, lh3: true, rh5: true },
    fingeringText: {
      leftHand: 'Dedos 1, 2, 3',
      rightHand: 'Dedo 5 (médio direito)',
      specialKeys: 'Dedo 4 levantado'
    },
    voicingTip: 'Posição ergonômica da mão direita.'
  },
  {
    id: 'G4',
    namePt: 'Sol 4',
    scientific: 'G4',
    register: 'Médio',
    isAltissimo: false,
    description: 'Sol médio, fechando toda a mão esquerda.',
    keys: { lh1: true, lh2: true, lh3: true },
    fingeringText: {
      leftHand: 'Dedos 1, 2, 3',
      rightHand: 'Todos os dedos abertos',
      specialKeys: 'Mão direita livre'
    },
    voicingTip: 'Voz limpa e centrada.'
  },
  {
    id: 'G#4',
    namePt: 'Sol sustenido 4',
    scientific: 'G#4',
    register: 'Médio',
    isAltissimo: false,
    description: 'Sol sustenido / Lá bemol médio.',
    keys: { lh1: true, lh2: true, lh3: true, gSharp: true },
    fingeringText: {
      leftHand: 'Dedos 1, 2, 3 + Chave de Sol# (mindinho esquerdo)',
      rightHand: 'Mão direita aberta',
      specialKeys: 'Chave de Sol# acionada'
    },
    voicingTip: 'Cuidado para o mindinho não pressionar a chave do Si grave.'
  },
  {
    id: 'A4',
    namePt: 'Lá 4',
    scientific: 'A4',
    register: 'Médio',
    isAltissimo: false,
    description: 'Lá 440 Hz padrão.',
    keys: { lh1: true, lh2: true },
    fingeringText: {
      leftHand: 'Dedos 1 e 2',
      rightHand: 'Mão direita aberta',
      specialKeys: 'Nenhuma'
    },
    voicingTip: 'Perfeita afinação de referência com o afinador.'
  },
  {
    id: 'Bb4',
    namePt: 'Si bemol 4',
    scientific: 'Bb4',
    register: 'Médio',
    isAltissimo: false,
    description: 'Si bemol médio (digitação com Chave Bis ou 1+1).',
    keys: { lh1: true, bis: true },
    fingeringText: {
      leftHand: 'Dedo 1 cobrindo a chave 1 e a chave Bis',
      rightHand: 'Mão direita aberta',
      specialKeys: 'Chave Bis acionada com o dedo indicador esquerdo'
    },
    voicingTip: 'Muito ágil para passagens cromáticas.'
  },
  {
    id: 'B4',
    namePt: 'Si 4',
    scientific: 'B4',
    register: 'Médio',
    isAltissimo: false,
    description: 'Si médio.',
    keys: { lh1: true },
    fingeringText: {
      leftHand: 'Apenas dedo 1 (indicador)',
      rightHand: 'Mão direita aberta',
      specialKeys: 'Nenhuma'
    },
    voicingTip: 'Ar focado e leve.'
  },
  {
    id: 'C5',
    namePt: 'Dó 5',
    scientific: 'C5',
    register: 'Médio',
    isAltissimo: false,
    description: 'Dó médio.',
    keys: { lh2: true },
    fingeringText: {
      leftHand: 'Apenas dedo 2 (médio)',
      rightHand: 'Mão direita aberta',
      specialKeys: 'Dedo 1 levantado'
    },
    voicingTip: 'Não aperte a boquilha.'
  },
  {
    id: 'C#5',
    namePt: 'Dó sustenido 5',
    scientific: 'C#5',
    register: 'Médio',
    isAltissimo: false,
    description: 'Nota aberta (tubo curto).',
    keys: {},
    fingeringText: {
      leftHand: 'Todas as chaves abertas',
      rightHand: 'Todas as chaves abertas',
      specialKeys: 'Tubo totalmente aberto'
    },
    voicingTip: 'Sustente o ar com firmeza pois a resistência do tubo é menor.'
  },
  // AGUDOS (COM CHAVE DE OITAVA)
  {
    id: 'D5',
    namePt: 'Ré 5 (Agudo)',
    scientific: 'D5',
    register: 'Agudo',
    isAltissimo: false,
    description: 'Ré agudo com chave de oitava acionada pelo polegar esquerdo.',
    keys: { octave: true, lh1: true, lh2: true, lh3: true, rh4: true, rh5: true, rh6: true },
    fingeringText: {
      leftHand: 'Polegar na Chave de Oitava + Dedos 1, 2, 3',
      rightHand: 'Dedos 4, 5, 6',
      specialKeys: 'Chave de Oitava (Octave Key)'
    },
    voicingTip: 'Posição interna da língua em "IÉ", fluxo de ar rápido.'
  },
  {
    id: 'Eb5',
    namePt: 'Mi bemol 5',
    scientific: 'Eb5',
    register: 'Agudo',
    isAltissimo: false,
    description: 'Mi bemol agudo.',
    keys: { octave: true, lh1: true, lh2: true, lh3: true, rh4: true, rh5: true, rh6: true, lowEb: true },
    fingeringText: {
      leftHand: 'Oitava + Dedos 1, 2, 3',
      rightHand: 'Dedos 4, 5, 6 + Chave Mib',
      specialKeys: 'Chave de Oitava + Chave Mib'
    },
    voicingTip: 'Apoio abdominal constante.'
  },
  {
    id: 'E5',
    namePt: 'Mi 5',
    scientific: 'E5',
    register: 'Agudo',
    isAltissimo: false,
    description: 'Mi agudo.',
    keys: { octave: true, lh1: true, lh2: true, lh3: true, rh4: true, rh5: true },
    fingeringText: {
      leftHand: 'Oitava + Dedos 1, 2, 3',
      rightHand: 'Dedos 4 e 5',
      specialKeys: 'Chave de Oitava'
    },
    voicingTip: 'Mantenha a garganta flexível.'
  },
  {
    id: 'F5',
    namePt: 'Fá 5',
    scientific: 'F5',
    register: 'Agudo',
    isAltissimo: false,
    description: 'Fá agudo.',
    keys: { octave: true, lh1: true, lh2: true, lh3: true, rh4: true },
    fingeringText: {
      leftHand: 'Oitava + Dedos 1, 2, 3',
      rightHand: 'Dedo 4',
      specialKeys: 'Chave de Oitava'
    },
    voicingTip: 'Projeção brilhante.'
  },
  {
    id: 'F#5',
    namePt: 'Fá sustenido 5',
    scientific: 'F#5',
    register: 'Agudo',
    isAltissimo: false,
    description: 'Fá sustenido agudo.',
    keys: { octave: true, lh1: true, lh2: true, lh3: true, rh5: true },
    fingeringText: {
      leftHand: 'Oitava + Dedos 1, 2, 3',
      rightHand: 'Dedo 5',
      specialKeys: 'Chave de Oitava'
    },
    voicingTip: 'Dedos relaxados e próximos das chaves.'
  },
  {
    id: 'G5',
    namePt: 'Sol 5',
    scientific: 'G5',
    register: 'Agudo',
    isAltissimo: false,
    description: 'Sol agudo.',
    keys: { octave: true, lh1: true, lh2: true, lh3: true },
    fingeringText: {
      leftHand: 'Oitava + Dedos 1, 2, 3',
      rightHand: 'Mão direita aberta',
      specialKeys: 'Chave de Oitava'
    },
    voicingTip: 'Som límpido e ressonante.'
  },
  {
    id: 'A5',
    namePt: 'Lá 5',
    scientific: 'A5',
    register: 'Agudo',
    isAltissimo: false,
    description: 'Lá agudo.',
    keys: { octave: true, lh1: true, lh2: true },
    fingeringText: {
      leftHand: 'Oitava + Dedos 1 e 2',
      rightHand: 'Mão direita aberta',
      specialKeys: 'Chave de Oitava'
    },
    voicingTip: 'Atenção para não subir a afinação.'
  },
  {
    id: 'Bb5',
    namePt: 'Si bemol 5',
    scientific: 'Bb5',
    register: 'Agudo',
    isAltissimo: false,
    description: 'Si bemol agudo.',
    keys: { octave: true, lh1: true, bis: true },
    fingeringText: {
      leftHand: 'Oitava + Dedo 1 e Chave Bis',
      rightHand: 'Mão direita aberta',
      specialKeys: 'Chave de Oitava + Chave Bis'
    },
    voicingTip: 'Suporte diafragmático firme.'
  },
  {
    id: 'B5',
    namePt: 'Si 5',
    scientific: 'B5',
    register: 'Agudo',
    isAltissimo: false,
    description: 'Si agudo.',
    keys: { octave: true, lh1: true },
    fingeringText: {
      leftHand: 'Oitava + Dedo 1',
      rightHand: 'Mão direita aberta',
      specialKeys: 'Chave de Oitava'
    },
    voicingTip: 'Ar focado e veloz.'
  },
  {
    id: 'C6',
    namePt: 'Dó 6',
    scientific: 'C6',
    register: 'Agudo',
    isAltissimo: false,
    description: 'Dó agudo.',
    keys: { octave: true, lh2: true },
    fingeringText: {
      leftHand: 'Oitava + Dedo 2',
      rightHand: 'Mão direita aberta',
      specialKeys: 'Chave de Oitava'
    },
    voicingTip: 'Firmeza sem morder a palheta.'
  },
  {
    id: 'C#6',
    namePt: 'Dó sustenido 6',
    scientific: 'C#6',
    register: 'Agudo',
    isAltissimo: false,
    description: 'Dó sustenido agudo com chave de oitava.',
    keys: { octave: true },
    fingeringText: {
      leftHand: 'Apenas chave de oitava (dedos 1, 2, 3 abertos)',
      rightHand: 'Mão direita aberta',
      specialKeys: 'Chave de Oitava'
    },
    voicingTip: 'Controle preciso do fluxo de ar.'
  },
  // PALM KEYS (D6 a F#6)
  {
    id: 'D6',
    namePt: 'Ré 6 (Chaves de Palma)',
    scientific: 'D6',
    register: 'Agudo',
    isAltissimo: false,
    description: 'Ré agudíssimo acionado pela palma da mão esquerda (Chave Palm D).',
    keys: { octave: true, palmD: true },
    fingeringText: {
      leftHand: 'Oitava + Chave Palm D (palma da mão esquerda)',
      rightHand: 'Mão direita aberta',
      specialKeys: 'Palm Key D1'
    },
    voicingTip: 'Língua posicionada na vogal "II", coluna de ar veloz.'
  },
  {
    id: 'Eb6',
    namePt: 'Mi bemol 6',
    scientific: 'Eb6',
    register: 'Agudo',
    isAltissimo: false,
    description: 'Mi bemol agudo acionado com Palm D + Palm Eb.',
    keys: { octave: true, palmD: true, palmEb: true },
    fingeringText: {
      leftHand: 'Oitava + Chave Palm D + Chave Palm Eb',
      rightHand: 'Mão direita aberta',
      specialKeys: 'Palm Keys D1 + D2'
    },
    voicingTip: 'Firmeza nos cantos da boca.'
  },
  {
    id: 'E6',
    namePt: 'Mi 6',
    scientific: 'E6',
    register: 'Agudo',
    isAltissimo: false,
    description: 'Mi agudíssimo com Palm D + Palm Eb + Chave Lateral High E (mão direita).',
    keys: { octave: true, palmD: true, palmEb: true, sideHighE: true },
    fingeringText: {
      leftHand: 'Oitava + Palm D + Palm Eb',
      rightHand: 'Chave lateral de Mi agudo (mão direita superior)',
      specialKeys: 'Palm Keys + Chave Lateral Direita'
    },
    voicingTip: 'Ar altamente comprimido pelo diafragma.'
  },
  {
    id: 'F6',
    namePt: 'Fá 6',
    scientific: 'F6',
    register: 'Agudo',
    isAltissimo: false,
    description: 'Fá agudíssimo acionando Palm D, Eb, F ou Chave Front F.',
    keys: { octave: true, palmD: true, palmEb: true, palmF: true, sideHighE: true },
    fingeringText: {
      leftHand: 'Oitava + Palm D + Palm Eb + Palm F',
      rightHand: 'Chave lateral de Mi agudo',
      specialKeys: 'Todas as chaves de palma da mão esquerda acionadas'
    },
    voicingTip: 'Extremo da extensão padrão dos saxofones sem chave de F# agudo.'
  },
  {
    id: 'F#6',
    namePt: 'Fá sustenido 6',
    scientific: 'F#6',
    register: 'Agudo',
    isAltissimo: false,
    description: 'Limite superior da extensão convencional do saxofone moderno.',
    keys: { octave: true, palmD: true, palmEb: true, palmF: true, highFsharp: true },
    fingeringText: {
      leftHand: 'Oitava + Palm D + Palm Eb',
      rightHand: 'Chave de Fá# agudo (High F#)',
      specialKeys: 'Chave exclusiva High F#'
    },
    voicingTip: 'Última nota mecânica antes de entrar no registro de Superagudos (Altíssimo).'
  },

  // ==========================================
  // SUPERAGUDOS / ALTÍSSIMO (FORA DA EXTENSÃO)
  // ==========================================
  {
    id: 'G6',
    namePt: 'Sol 6 (Superagudo / Altíssimo)',
    scientific: 'G6',
    register: 'Altíssimo (Superagudo)',
    isAltissimo: true,
    description: 'Primeira nota do registro de altíssimo (fora da extensão padrão). Requer vocalização interna em "III" e ar rápido.',
    keys: { octave: true, frontF: true, lh1: true, lh3: true, rh4: true, rh6: true },
    fingeringText: {
      leftHand: 'Oitava + Front F (Chave X) + Dedo 1 + Dedo 3',
      rightHand: 'Dedo 4 + Dedo 6 (ou Chave Lateral Bb)',
      specialKeys: 'Chave Frontal de Fá (Front F)'
    },
    voicingTip: 'Língua alta encostando nos molares superiores. Pense na nota antes de tocar para ressoar o harmônico!'
  },
  {
    id: 'G#6',
    namePt: 'Sol sustenido 6 (Altíssimo)',
    scientific: 'G#6',
    register: 'Altíssimo (Superagudo)',
    isAltissimo: true,
    description: 'Sol sustenido altíssimo fora da extensão. Som penetrante e brilhante.',
    keys: { octave: true, frontF: true, lh1: true, lh3: true, gSharp: true, rh4: true },
    fingeringText: {
      leftHand: 'Oitava + Front F + Dedo 1 + Dedo 3 + Chave Sol# (mindinho)',
      rightHand: 'Dedo 4 (ou lateral)',
      specialKeys: 'Front F + Chave Sol# da mesa'
    },
    voicingTip: 'Apoio abdominal intenso, pressão de ar focada como um raio laser.'
  },
  {
    id: 'A6',
    namePt: 'Lá 6 (Altíssimo)',
    scientific: 'A6',
    register: 'Altíssimo (Superagudo)',
    isAltissimo: true,
    description: 'Lá altíssimo fora da extensão. Harmônico limpo e muito utilizado em solos de Jazz e Fusion.',
    keys: { octave: true, lh2: true, lh3: true, rh4: true, rh5: true, rh6: true },
    fingeringText: {
      leftHand: 'Oitava + Dedos 2 e 3 (Dedo 1 aberto)',
      rightHand: 'Dedos 4, 5, 6 (ou Chave lateral C)',
      specialKeys: 'Dedo 1 aberto funcionando como nó de onda'
    },
    voicingTip: 'Vocalize internamente a sílaba "KI" bem aguda para estabilizar o harmônico.'
  },
  {
    id: 'Bb6',
    namePt: 'Si bemol 6 (Altíssimo)',
    scientific: 'Bb6',
    register: 'Altíssimo (Superagudo)',
    isAltissimo: true,
    description: 'Si bemol altíssimo fora da extensão.',
    keys: { octave: true, lh3: true, rh4: true, sideBb: true },
    fingeringText: {
      leftHand: 'Oitava + Dedo 3',
      rightHand: 'Dedo 4 + Chave Lateral de Sib',
      specialKeys: 'Chave Lateral Sib (Side Bb)'
    },
    voicingTip: 'Não aperte a mandíbula; o segredo está na velocidade do ar e posição da garganta.'
  },
  {
    id: 'B6',
    namePt: 'Si 6 (Altíssimo)',
    scientific: 'B6',
    register: 'Altíssimo (Superagudo)',
    isAltissimo: true,
    description: 'Si altíssimo fora da extensão. Exige controle extremo de harmônicos.',
    keys: { octave: true, palmD: true, palmEb: true, lh3: true },
    fingeringText: {
      leftHand: 'Oitava + Palm D + Palm Eb + Dedo 3',
      rightHand: 'Mão direita aberta',
      specialKeys: 'Palm Keys D e Eb'
    },
    voicingTip: 'Apoio firme na base do diafragma e firmeza nos cantos da boca.'
  },
  {
    id: 'C7',
    namePt: 'Dó 7 (Superagudo Extremo)',
    scientific: 'C7',
    register: 'Altíssimo (Superagudo)',
    isAltissimo: true,
    description: 'Dó 7 altíssimo fora da extensão mecânica. Som potente e agudo dos mestres virtuoses.',
    keys: { octave: true, palmD: true, frontF: true, rh4: true, rh5: true },
    fingeringText: {
      leftHand: 'Oitava + Palm D + Front F',
      rightHand: 'Dedos 4 e 5',
      specialKeys: 'Palm D + Front F combinadas'
    },
    voicingTip: 'Língua muito alta e ar ultra-veloz. Pratique exercícios de harmônicos graves antes!'
  },
  {
    id: 'C#7',
    namePt: 'Dó sustenido 7 (Superagudo)',
    scientific: 'C#7',
    register: 'Altíssimo (Superagudo)',
    isAltissimo: true,
    description: 'Dó sustenido no registro hiper-agudo.',
    keys: { octave: true, palmD: true, palmEb: true, frontF: true, sideC: true },
    fingeringText: {
      leftHand: 'Oitava + Palm D + Palm Eb + Front F',
      rightHand: 'Chave lateral de Dó (Side C)',
      specialKeys: 'Palm Keys + Front F + Side C'
    },
    voicingTip: 'Embocadura flexível e relaxada no centro da palheta.'
  },
  {
    id: 'D7',
    namePt: 'Ré 7 (A Última Nota Fora da Extensão)',
    scientific: 'D7',
    register: 'Altíssimo (Superagudo)',
    isAltissimo: true,
    description: 'A última nota extrema do saxofone no registro superagudo. O ápice da virtuosidade acústica.',
    keys: { octave: true, palmD: true, highFsharp: true, sideHighE: true },
    fingeringText: {
      leftHand: 'Oitava + Palm D',
      rightHand: 'Chave High F# + Chave Lateral High E',
      specialKeys: 'Chaves agudíssimas simultâneas'
    },
    voicingTip: 'Parabéns por explorar até a última nota! Exige alta pressão de ar e controle de harmônicos superiores.'
  }
];

// Map of note positions on the treble clef musical staff
const STAFF_NOTE_DATA: Record<string, { step: number; accidental?: 'sharp' | 'flat'; row: 1 | 2 }> = {
  // Row 1: Bb3 to F5
  'Bb3': { step: -1, accidental: 'flat', row: 1 },
  'B3': { step: -1, row: 1 },
  'C4': { step: 0, row: 1 },
  'C#4': { step: 0, accidental: 'sharp', row: 1 },
  'D4': { step: 1, row: 1 },
  'Eb4': { step: 2, accidental: 'flat', row: 1 },
  'E4': { step: 2, row: 1 },
  'F4': { step: 3, row: 1 },
  'F#4': { step: 3, accidental: 'sharp', row: 1 },
  'G4': { step: 4, row: 1 },
  'G#4': { step: 4, accidental: 'sharp', row: 1 },
  'A4': { step: 5, row: 1 },
  'Bb4': { step: 6, accidental: 'flat', row: 1 },
  'B4': { step: 6, row: 1 },
  'C5': { step: 7, row: 1 },
  'C#5': { step: 7, accidental: 'sharp', row: 1 },
  'D5': { step: 8, row: 1 },
  'Eb5': { step: 9, accidental: 'flat', row: 1 },
  'E5': { step: 9, row: 1 },
  'F5': { step: 10, row: 1 },

  // Row 2: F#5 to D7 (Agudos e Superagudos / Altíssimo)
  'F#5': { step: 10, accidental: 'sharp', row: 2 },
  'G5': { step: 11, row: 2 },
  'G#5': { step: 11, accidental: 'sharp', row: 2 },
  'A5': { step: 12, row: 2 },
  'Bb5': { step: 13, accidental: 'flat', row: 2 },
  'B5': { step: 13, row: 2 },
  'C6': { step: 14, row: 2 },
  'C#6': { step: 14, accidental: 'sharp', row: 2 },
  'D6': { step: 15, row: 2 },
  'Eb6': { step: 16, accidental: 'flat', row: 2 },
  'E6': { step: 16, row: 2 },
  'F6': { step: 17, row: 2 },
  'F#6': { step: 17, accidental: 'sharp', row: 2 },
  'G6': { step: 18, row: 2 },
  'G#6': { step: 18, accidental: 'sharp', row: 2 },
  'A6': { step: 19, row: 2 },
  'Bb6': { step: 20, accidental: 'flat', row: 2 },
  'B6': { step: 20, row: 2 },
  'C7': { step: 21, row: 2 },
  'C#7': { step: 21, accidental: 'sharp', row: 2 },
  'D7': { step: 22, row: 2 },
};

export const SaxophoneStudio: React.FC = () => {
  const [selectedNoteId, setSelectedNoteId] = useState<string>('C4');
  const [filterRegister, setFilterRegister] = useState<'Todos' | 'Grave' | 'Médio' | 'Agudo' | 'Altíssimo'>('Todos');
  const [saxVoice, setSaxVoice] = useState<'Alto' | 'Tenor' | 'Soprano'>('Alto');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [diagramViewMode, setDiagramViewMode] = useState<'both' | 'photo' | 'diagram'>('both');

  const currentNote = SAX_NOTES.find(n => n.id === selectedNoteId) || SAX_NOTES[2];

  const handlePlaySound = (scientific: string) => {
    setIsPlayingAudio(true);
    // Sound pitch adjustment for transposing instruments
    // Alto: Eb (sounds major 6th lower)
    // Tenor: Bb (sounds major 9th lower)
    // Soprano: Bb (sounds major 2nd lower)
    audioEngine.playNote(scientific, 1.2, 'sax');
    setTimeout(() => setIsPlayingAudio(false), 1200);
  };

  const filteredNotes = SAX_NOTES.filter(n => {
    if (filterRegister === 'Todos') return true;
    if (filterRegister === 'Grave') return n.register === 'Grave';
    if (filterRegister === 'Médio') return n.register === 'Médio';
    if (filterRegister === 'Agudo') return n.register === 'Agudo';
    return n.isAltissimo;
  });

  const k = currentNote.keys;

  const row1Notes = SAX_NOTES.filter(n => STAFF_NOTE_DATA[n.id]?.row === 1);
  const row2Notes = SAX_NOTES.filter(n => STAFF_NOTE_DATA[n.id]?.row === 2);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Title & Description */}
      <div className="bg-[#131722] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold mb-2">
              <Sparkles size={14} />
              <span>Chaves Ativas Destacadas em Vermelho • Extensão Completa até Altíssimo</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-syne font-black text-white">
              Dedilhado Interativo do Saxofone
            </h2>
            <p className="text-slate-400 text-sm max-w-2xl mt-1">
              Selecione qualquer nota para visualizar as chaves que devem ser pressionadas (em vermelho) no saxofone, desde o Si bemol grave até as notas fora da extensão (Superagudos / Altíssimo).
            </p>
          </div>

          {/* Quick Sound Play Button */}
          <button
            onClick={() => handlePlaySound(currentNote.scientific)}
            className={`px-6 py-3.5 rounded-2xl font-syne font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xl cursor-pointer ${
              isPlayingAudio
                ? 'bg-red-500 text-white scale-105 shadow-red-500/40'
                : 'bg-gradient-to-r from-red-500 via-rose-500 to-amber-500 text-white hover:opacity-90 shadow-red-500/20 glow'
            }`}
          >
            <Volume2 size={18} />
            <span>Ouvir {currentNote.namePt} ({currentNote.scientific})</span>
          </button>
        </div>

        {/* ALTO / TENOR / SOPRANO SWITCHER (matches uploaded diagram) & REFERENCE ASSETS */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0b0d14] p-3.5 rounded-2xl border border-white/10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo de Saxofone:</span>
            <div className="inline-flex p-1 rounded-full bg-[#131722] border border-white/15 shadow-md">
              {(['Alto', 'Tenor', 'Soprano'] as const).map(voice => (
                <button
                  key={voice}
                  onClick={() => setSaxVoice(voice)}
                  className={`px-5 py-1.5 rounded-full font-syne font-bold text-xs transition-all cursor-pointer ${
                    saxVoice === voice
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {voice} {voice === 'Alto' ? '(Eb)' : '(Bb)'}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-cyan-400 font-semibold hidden md:inline">
              Afinação: {saxVoice === 'Alto' ? 'Mi Bemol (Eb)' : 'Si Bemol (Bb)'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/assets/aistudio/saxophone-en_teclas_91ce1e9e.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
              title="Abrir a Tabela Oficial de Teclas em PDF enviada"
            >
              <BookOpen size={13} />
              <span>Tabela PDF de Teclas</span>
              <ExternalLink size={11} />
            </a>
            <button
              onClick={() => setShowReferenceModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/15 font-bold text-xs flex items-center gap-1.5 transition-colors"
              title="Visualizar a ilustração e tabela de referência"
            >
              <ImageIcon size={13} />
              <span>Ilustração Original</span>
            </button>
          </div>
        </div>

        {/* INTERACTIVE MUSICAL STAFF (PAUTA MUSICAL COM CLAVE DE SOL) */}
        <div className="bg-[#0b0d14] p-4 sm:p-5 rounded-2xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                🎼 Pauta Musical Interativa (Pentagrama)
              </span>
              <span className="text-[11px] text-slate-400">• Clique em qualquer nota na pauta para ouvi-la e ver o dedilhado</span>
            </div>
            <div className="text-xs font-bold text-rose-400">
              Nota Atual: <span className="text-white bg-rose-500/20 px-2 py-0.5 rounded-md border border-rose-500/30 font-mono">{currentNote.namePt} ({currentNote.scientific})</span>
            </div>
          </div>

          {/* Staves container: 2 rows with treble clefs, notes and selection highlight */}
          <div className="space-y-4 overflow-x-auto pb-2">
            {/* Staff Row 1: Graves e Médios (Bb3 a F5) */}
            <div className="min-w-[760px] bg-[#131722]/80 p-3 rounded-xl border border-white/5">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 pl-2">
                Linha 1: Registro Grave e Médio (Sib3 ao Fá5)
              </div>
              <svg viewBox="0 0 780 100" className="w-full h-24 select-none">
                {/* 5 Staff lines (E4 = 60, G4 = 50, B4 = 40, D5 = 30, F5 = 20) */}
                {[20, 30, 40, 50, 60].map(y => (
                  <line key={y} x1="15" y1={y} x2="770" y2={y} stroke="#475569" strokeWidth="1.2" className="staff-line" />
                ))}
                {/* Treble clef */}
                <text x="22" y="58" fontSize="46" fontFamily="serif" fill="#94a3b8" pointerEvents="none" className="staff-clef">𝄞</text>

                {/* Notes in row 1 */}
                {row1Notes.map((n, idx) => {
                  const staffInfo = STAFF_NOTE_DATA[n.id];
                  if (!staffInfo) return null;
                  const isSelected = selectedNoteId === n.id;
                  const x = 75 + idx * 34;
                  const noteY = 60 - (staffInfo.step - 2) * 5;

                  return (
                    <g
                      key={n.id}
                      onClick={() => {
                        setSelectedNoteId(n.id);
                        handlePlaySound(n.scientific);
                      }}
                      className="cursor-pointer group"
                    >
                      {/* Highlight Selection Box around active note */}
                      {isSelected && (
                        <rect
                          x={x - 12}
                          y={8}
                          width={24}
                          height={82}
                          rx={6}
                          fill="#f43f5e"
                          fillOpacity="0.18"
                          stroke="#f43f5e"
                          strokeWidth="2"
                          className="filter drop-shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse"
                        />
                      )}

                      {/* Ledger lines below staff */}
                      {staffInfo.step <= 0 && (
                        <line x1={x - 8} y1="70" x2={x + 8} y2="70" stroke={isSelected ? "#f43f5e" : "#cbd5e1"} strokeWidth="1.5" className={`staff-ledger ${isSelected ? 'selected' : ''}`} />
                      )}
                      {staffInfo.step <= -2 && (
                        <line x1={x - 8} y1="80" x2={x + 8} y2="80" stroke={isSelected ? "#f43f5e" : "#cbd5e1"} strokeWidth="1.5" className={`staff-ledger ${isSelected ? 'selected' : ''}`} />
                      )}

                      {/* Accidental (# or b) */}
                      {staffInfo.accidental === 'sharp' && (
                        <text x={x - 11} y={noteY + 4.5} fontSize="13" fontWeight="bold" fill={isSelected ? "#f43f5e" : "#f1f5f9"} className={`staff-accidental ${isSelected ? 'selected' : ''}`}>♯</text>
                      )}
                      {staffInfo.accidental === 'flat' && (
                        <text x={x - 10} y={noteY + 3.5} fontSize="13" fontWeight="bold" fill={isSelected ? "#f43f5e" : "#f1f5f9"} className={`staff-accidental ${isSelected ? 'selected' : ''}`}>♭</text>
                      )}

                      {/* Note Head */}
                      <ellipse
                        cx={x}
                        cy={noteY}
                        rx="5"
                        ry="3.6"
                        transform={`rotate(-20 ${x} ${noteY})`}
                        fill={isSelected ? "#f43f5e" : "#f8fafc"}
                        stroke={isSelected ? "#dc2626" : "#0f172a"}
                        strokeWidth="1.2"
                        className={`staff-note-head ${isSelected ? 'selected' : ''}`}
                      />

                      {/* Note label under staff */}
                      <text
                        x={x}
                        y="94"
                        textAnchor="middle"
                        fontSize="8.5"
                        fontWeight="bold"
                        fill={isSelected ? "#f43f5e" : "#94a3b8"}
                        className={`staff-note-label ${isSelected ? 'selected' : ''} transition-colors`}
                      >
                        {n.scientific}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Staff Row 2: Agudos e Superagudos / Altíssimo (F#5 a D7) */}
            <div className="min-w-[760px] bg-[#131722]/80 p-3 rounded-xl border border-white/5">
              <div className="text-[10px] uppercase font-bold text-rose-400 mb-1 pl-2 flex items-center gap-1.5">
                <span>Linha 2: Registro Agudo & Superagudos / Altíssimo (Fá#5 ao Ré7)</span>
                <span className="px-1.5 py-0.2 rounded-full bg-red-500/20 text-[9px] text-red-300">Extensão Completa</span>
              </div>
              <svg viewBox="0 0 780 135" className="w-full h-32 select-none">
                {/* 5 Staff lines (E4 = 100, G4 = 90, B4 = 80, D5 = 70, F5 = 60) */}
                {[60, 70, 80, 90, 100].map(y => (
                  <line key={y} x1="15" y1={y} x2="770" y2={y} stroke="#475569" strokeWidth="1.2" className="staff-line" />
                ))}
                {/* Treble clef */}
                <text x="22" y="98" fontSize="46" fontFamily="serif" fill="#94a3b8" pointerEvents="none" className="staff-clef">𝄞</text>

                {/* Notes in row 2 */}
                {row2Notes.map((n, idx) => {
                  const staffInfo = STAFF_NOTE_DATA[n.id];
                  if (!staffInfo) return null;
                  const isSelected = selectedNoteId === n.id;
                  const x = 75 + idx * 34;
                  const noteY = 100 - (staffInfo.step - 2) * 5;

                  // Compute ledger lines above staff: 50, 40, 30, 20, 10, 0
                  const ledgerYs: number[] = [];
                  if (staffInfo.step >= 12) ledgerYs.push(50); // A5
                  if (staffInfo.step >= 14) ledgerYs.push(40); // C6
                  if (staffInfo.step >= 16) ledgerYs.push(30); // E6
                  if (staffInfo.step >= 18) ledgerYs.push(20); // G6
                  if (staffInfo.step >= 20) ledgerYs.push(10); // B6 / Bb6
                  if (staffInfo.step >= 22) ledgerYs.push(0);  // D7

                  return (
                    <g
                      key={n.id}
                      onClick={() => {
                        setSelectedNoteId(n.id);
                        handlePlaySound(n.scientific);
                      }}
                      className="cursor-pointer group"
                    >
                      {/* Highlight Selection Box around active note */}
                      {isSelected && (
                        <rect
                          x={x - 12}
                          y={4}
                          width={24}
                          height={122}
                          rx={6}
                          fill="#f43f5e"
                          fillOpacity="0.18"
                          stroke="#f43f5e"
                          strokeWidth="2"
                          className="filter drop-shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse"
                        />
                      )}

                      {/* Ledger lines */}
                      {ledgerYs.map(ly => (
                        <line key={ly} x1={x - 8} y1={ly} x2={x + 8} y2={ly} stroke={isSelected ? "#f43f5e" : "#cbd5e1"} strokeWidth="1.5" className={`staff-ledger ${isSelected ? 'selected' : ''}`} />
                      ))}

                      {/* Accidental (# or b) */}
                      {staffInfo.accidental === 'sharp' && (
                        <text x={x - 11} y={noteY + 4.5} fontSize="13" fontWeight="bold" fill={isSelected ? "#f43f5e" : "#f1f5f9"} className={`staff-accidental ${isSelected ? 'selected' : ''}`}>♯</text>
                      )}
                      {staffInfo.accidental === 'flat' && (
                        <text x={x - 10} y={noteY + 3.5} fontSize="13" fontWeight="bold" fill={isSelected ? "#f43f5e" : "#f1f5f9"} className={`staff-accidental ${isSelected ? 'selected' : ''}`}>♭</text>
                      )}

                      {/* Note Head */}
                      <ellipse
                        cx={x}
                        cy={noteY}
                        rx="5"
                        ry="3.6"
                        transform={`rotate(-20 ${x} ${noteY})`}
                        fill={isSelected ? "#f43f5e" : n.isAltissimo ? "#ef4444" : "#f8fafc"}
                        stroke={isSelected ? "#dc2626" : "#0f172a"}
                        strokeWidth="1.2"
                        className={`staff-note-head ${isSelected ? 'selected' : ''} ${n.isAltissimo ? 'altissimo' : ''}`}
                      />

                      {/* Note label under staff */}
                      <text
                        x={x}
                        y="126"
                        textAnchor="middle"
                        fontSize="8.5"
                        fontWeight="bold"
                        fill={isSelected ? "#f43f5e" : n.isAltissimo ? "#f87171" : "#94a3b8"}
                        className={`staff-note-label ${isSelected ? 'selected' : ''} ${n.isAltissimo ? 'altissimo' : ''} transition-colors`}
                      >
                        {n.scientific}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>

        {/* Filter Tabs by Register */}
        <div className="pt-2 flex flex-wrap gap-2 border-t border-white/10 items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {(['Todos', 'Grave', 'Médio', 'Agudo', 'Altíssimo'] as const).map(reg => (
              <button
                key={reg}
                onClick={() => setFilterRegister(reg)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterRegister === reg
                    ? reg === 'Altíssimo'
                      ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                      : 'bg-cyan-500 text-black shadow-md'
                    : 'bg-[#0b0d14] text-slate-400 hover:text-white border border-white/10'
                }`}
              >
                {reg === 'Altíssimo' ? '🔥 Superagudos (Altíssimo)' : reg}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-400 font-semibold">
            {filteredNotes.length} notas na lista
          </span>
        </div>
      </div>

      {/* Main Grid: Saxophone Diagram & Notes Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Note Selection Buttons */}
        <div className="lg:col-span-5 bg-[#131722] p-5 sm:p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-syne font-bold text-white text-base">Selecione a Nota:</h3>
            <span className="text-[11px] text-slate-400">Sib3 ao Ré7</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[580px] overflow-y-auto pr-1">
            {filteredNotes.map(n => {
              const isSelected = selectedNoteId === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => {
                    setSelectedNoteId(n.id);
                    handlePlaySound(n.scientific);
                  }}
                  className={`p-2.5 rounded-2xl text-left border transition-all flex flex-col justify-between group ${
                    isSelected
                      ? n.isAltissimo
                        ? 'bg-red-600 text-white border-red-400 shadow-lg shadow-red-500/30 font-black'
                        : 'bg-cyan-500 text-black border-cyan-300 shadow-lg shadow-cyan-500/30 font-black'
                      : 'bg-[#0b0d14] hover:bg-white/5 text-slate-300 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="text-base font-black tracking-tight">{n.scientific}</span>
                    {n.isAltissimo && (
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected ? 'bg-black/30 text-white' : 'bg-red-500/20 text-red-400'
                      }`}>
                        Alt
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] truncate block mt-1 font-medium ${
                    isSelected ? 'text-black/80 font-bold' : 'text-slate-400'
                  }`}>
                    {n.namePt.split('(')[0]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Note Summary Card */}
          <div className="p-4 rounded-2xl bg-[#0b0d14] border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-bold uppercase">Nota Selecionada</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                currentNote.isAltissimo 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {currentNote.register}
              </span>
            </div>
            <div className="text-xl font-syne font-black text-white">
              {currentNote.namePt} ({currentNote.scientific})
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {currentNote.description}
            </p>
          </div>
        </div>

        {/* Right Column: Saxophone Visual Diagram with Red Highlighted Keys */}
        <div className="lg:col-span-7 bg-[#131722] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h3 className="font-syne font-black text-xl text-white flex items-center gap-2">
                <span>Diagrama & Saxofone Real</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                  Chaves em Vermelho = Pressionar
                </span>
              </h3>
              <p className="text-xs text-slate-400">Saxofone Alto de verdade integrado com marcação de chaves ativas</p>
            </div>

            <div className="flex items-center gap-2">
              {/* Mode switch */}
              <div className="bg-[#0b0d14] p-1 rounded-xl border border-white/10 flex items-center gap-1 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setDiagramViewMode('both')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    diagramViewMode === 'both' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sax Real & Chaves
                </button>
                <button
                  type="button"
                  onClick={() => setDiagramViewMode('photo')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    diagramViewMode === 'photo' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sax Real
                </button>
                <button
                  type="button"
                  onClick={() => setDiagramViewMode('diagram')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    diagramViewMode === 'diagram' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Chaves
                </button>
              </div>

              <button
                onClick={() => handlePlaySound(currentNote.scientific)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-400 border border-white/10 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Play size={14} fill="currentColor" /> Tocar
              </button>
            </div>
          </div>

          {/* Graphical Representation of Saxophone with Real Instrument and Highlighted Red Keys */}
          <div className="bg-[#0b0d14] p-6 rounded-3xl border border-white/10 flex flex-col xl:flex-row items-center justify-center gap-6 relative overflow-hidden">
            {/* Background subtle glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/5 via-red-500/5 to-transparent pointer-events-none"></div>

            {/* Real Alto Saxophone Image */}
            {(diagramViewMode === 'both' || diagramViewMode === 'photo') && (
              <div className="flex flex-col items-center gap-2">
                <div className="relative group rounded-2xl overflow-hidden border-2 border-amber-500/40 shadow-2xl bg-black/50 max-h-[460px]">
                  <img
                    src="/assets/instruments/alto_sax.jpg"
                    alt="Saxofone Alto Real"
                    className="w-48 sm:w-52 h-[420px] object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-2 left-2 right-2 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                      Saxofone Alto Real (Mib)
                    </span>
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-center">
                    <span className="text-[10px] text-slate-300 font-medium">
                      Latão Dourado • Afinação Eb
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-slate-400">
                  Instrumento Real • Visual Anatômico
                </span>
              </div>
            )}

            {/* SVG Saxophone Body with interactive keys */}
            {(diagramViewMode === 'both' || diagramViewMode === 'diagram') && (
            <div className="relative w-48 sm:w-56 h-[460px] flex items-center justify-center">
              <svg viewBox="0 0 200 480" className="w-full h-full drop-shadow-2xl">
                {/* Sax Neck & Mouthpiece */}
                <path d="M 90 20 Q 90 60 100 80 L 100 420 Q 100 450 140 450 Q 170 450 170 380 Q 170 340 140 330" fill="none" stroke="#d97706" strokeWidth="18" strokeLinecap="round" opacity="0.25" />
                <path d="M 90 20 Q 90 60 100 80 L 100 420 Q 100 450 140 450 Q 170 450 170 380 Q 170 340 140 330" fill="none" stroke="#f59e0b" strokeWidth="10" strokeLinecap="round" />
                
                {/* Mouthpiece / Boquilha */}
                <rect x="84" y="8" width="12" height="22" rx="4" fill="#0f172a" stroke="#475569" strokeWidth="2" />
                <path d="M 84 8 L 96 8 L 93 18 L 87 18 Z" fill="#38bdf8" opacity="0.6" />

                {/* Bell (Campana) */}
                <ellipse cx="148" cy="350" rx="20" ry="32" fill="#d97706" stroke="#fbbf24" strokeWidth="3" opacity="0.85" />
                <ellipse cx="148" cy="350" rx="14" ry="24" fill="#78350f" />

                {/* --- LEFT HAND SECTION (UPPER TUBE) --- */}
                {/* Octave Key (Thumb Back) */}
                <g transform="translate(68, 90)">
                  <rect x="0" y="0" width="16" height="26" rx="6" 
                    fill={k.octave ? "#ef4444" : "#1e293b"} 
                    stroke={k.octave ? "#dc2626" : "#64748b"} 
                    strokeWidth="2.5" 
                    className={k.octave ? "filter drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]" : ""}
                  />
                  <text x="8" y="16" textAnchor="middle" fill={k.octave ? "#ffffff" : "#94a3b8"} fontSize="8" fontWeight="bold">OCT</text>
                </g>

                {/* Palm Keys (Left side: D, Eb, F) */}
                <g transform="translate(64, 125)">
                  {/* Palm D */}
                  <path d="M 0 0 C 10 -4 14 10 0 14 Z" 
                    fill={k.palmD ? "#ef4444" : "#1e293b"} 
                    stroke={k.palmD ? "#dc2626" : "#64748b"} 
                    strokeWidth="2"
                    className={k.palmD ? "filter drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]" : ""}
                  />
                  {/* Palm Eb */}
                  <path d="M 0 18 C 10 14 14 28 0 32 Z" 
                    fill={k.palmEb ? "#ef4444" : "#1e293b"} 
                    stroke={k.palmEb ? "#dc2626" : "#64748b"} 
                    strokeWidth="2"
                    className={k.palmEb ? "filter drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]" : ""}
                  />
                  {/* Palm F */}
                  <path d="M 0 36 C 10 32 14 46 0 50 Z" 
                    fill={k.palmF ? "#ef4444" : "#1e293b"} 
                    stroke={k.palmF ? "#dc2626" : "#64748b"} 
                    strokeWidth="2"
                    className={k.palmF ? "filter drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]" : ""}
                  />
                </g>

                {/* Front F Key (Chave X) */}
                <circle cx="100" cy="118" r="7" 
                  fill={k.frontF ? "#ef4444" : "#1e293b"} 
                  stroke={k.frontF ? "#dc2626" : "#64748b"} 
                  strokeWidth="2"
                  className={k.frontF ? "filter drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]" : ""}
                />
                <text x="100" y="121" textAnchor="middle" fill={k.frontF ? "#fff" : "#94a3b8"} fontSize="8" fontWeight="bold">X</text>

                {/* Key 1 (B) */}
                <circle cx="100" cy="142" r="11" 
                  fill={k.lh1 ? "#ef4444" : "#1e293b"} 
                  stroke={k.lh1 ? "#dc2626" : "#64748b"} 
                  strokeWidth="2.5"
                  className={k.lh1 ? "filter drop-shadow-[0_0_10px_rgba(239,68,68,0.95)]" : ""}
                />
                <text x="100" y="146" textAnchor="middle" fill={k.lh1 ? "#fff" : "#cbd5e1"} fontSize="11" fontWeight="bold">1</text>

                {/* Bis Key (between 1 and 2) */}
                <circle cx="100" cy="162" r="6" 
                  fill={k.bis ? "#ef4444" : "#1e293b"} 
                  stroke={k.bis ? "#dc2626" : "#64748b"} 
                  strokeWidth="2"
                  className={k.bis ? "filter drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]" : ""}
                />
                <text x="100" y="165" textAnchor="middle" fill={k.bis ? "#fff" : "#94a3b8"} fontSize="7" fontWeight="bold">Bis</text>

                {/* Key 2 (A) */}
                <circle cx="100" cy="182" r="11" 
                  fill={k.lh2 ? "#ef4444" : "#1e293b"} 
                  stroke={k.lh2 ? "#dc2626" : "#64748b"} 
                  strokeWidth="2.5"
                  className={k.lh2 ? "filter drop-shadow-[0_0_10px_rgba(239,68,68,0.95)]" : ""}
                />
                <text x="100" y="186" textAnchor="middle" fill={k.lh2 ? "#fff" : "#cbd5e1"} fontSize="11" fontWeight="bold">2</text>

                {/* Key 3 (G) */}
                <circle cx="100" cy="210" r="11" 
                  fill={k.lh3 ? "#ef4444" : "#1e293b"} 
                  stroke={k.lh3 ? "#dc2626" : "#64748b"} 
                  strokeWidth="2.5"
                  className={k.lh3 ? "filter drop-shadow-[0_0_10px_rgba(239,68,68,0.95)]" : ""}
                />
                <text x="100" y="214" textAnchor="middle" fill={k.lh3 ? "#fff" : "#cbd5e1"} fontSize="11" fontWeight="bold">3</text>

                {/* Left Hand Table Keys (G#, C#, B, Bb - Mesa do Mindinho Esquerdo) */}
                <g transform="translate(68, 225)">
                  {/* G# */}
                  <rect x="0" y="0" width="14" height="12" rx="3" 
                    fill={k.gSharp ? "#ef4444" : "#1e293b"} 
                    stroke={k.gSharp ? "#dc2626" : "#64748b"} 
                    strokeWidth="1.5"
                    className={k.gSharp ? "filter drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]" : ""}
                  />
                  <text x="7" y="9" textAnchor="middle" fill={k.gSharp ? "#fff" : "#94a3b8"} fontSize="7" fontWeight="bold">G#</text>

                  {/* Low C# */}
                  <rect x="16" y="0" width="14" height="12" rx="3" 
                    fill={k.lowCsharp ? "#ef4444" : "#1e293b"} 
                    stroke={k.lowCsharp ? "#dc2626" : "#64748b"} 
                    strokeWidth="1.5"
                    className={k.lowCsharp ? "filter drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]" : ""}
                  />
                  <text x="23" y="9" textAnchor="middle" fill={k.lowCsharp ? "#fff" : "#94a3b8"} fontSize="7" fontWeight="bold">C#</text>

                  {/* Low B */}
                  <rect x="0" y="14" width="14" height="12" rx="3" 
                    fill={k.lowB ? "#ef4444" : "#1e293b"} 
                    stroke={k.lowB ? "#dc2626" : "#64748b"} 
                    strokeWidth="1.5"
                    className={k.lowB ? "filter drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]" : ""}
                  />
                  <text x="7" y="23" textAnchor="middle" fill={k.lowB ? "#fff" : "#94a3b8"} fontSize="7" fontWeight="bold">B</text>

                  {/* Low Bb */}
                  <rect x="16" y="14" width="14" height="12" rx="3" 
                    fill={k.lowBb ? "#ef4444" : "#1e293b"} 
                    stroke={k.lowBb ? "#dc2626" : "#64748b"} 
                    strokeWidth="1.5"
                    className={k.lowBb ? "filter drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]" : ""}
                  />
                  <text x="23" y="23" textAnchor="middle" fill={k.lowBb ? "#fff" : "#94a3b8"} fontSize="7" fontWeight="bold">Bb</text>
                </g>

                {/* --- RIGHT HAND SECTION (LOWER TUBE) --- */}
                {/* Side Keys (Right side: Side Bb, Side C, High E) */}
                <g transform="translate(122, 160)">
                  {/* Side High E */}
                  <rect x="0" y="0" width="12" height="14" rx="3" 
                    fill={k.sideHighE ? "#ef4444" : "#1e293b"} 
                    stroke={k.sideHighE ? "#dc2626" : "#64748b"} 
                    strokeWidth="1.5"
                    className={k.sideHighE ? "filter drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]" : ""}
                  />
                  <text x="6" y="10" textAnchor="middle" fill={k.sideHighE ? "#fff" : "#94a3b8"} fontSize="6.5" fontWeight="bold">E</text>

                  {/* Side C */}
                  <rect x="0" y="18" width="12" height="14" rx="3" 
                    fill={k.sideC ? "#ef4444" : "#1e293b"} 
                    stroke={k.sideC ? "#dc2626" : "#64748b"} 
                    strokeWidth="1.5"
                    className={k.sideC ? "filter drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]" : ""}
                  />
                  <text x="6" y="28" textAnchor="middle" fill={k.sideC ? "#fff" : "#94a3b8"} fontSize="6.5" fontWeight="bold">C</text>

                  {/* Side Bb */}
                  <rect x="0" y="36" width="12" height="14" rx="3" 
                    fill={k.sideBb ? "#ef4444" : "#1e293b"} 
                    stroke={k.sideBb ? "#dc2626" : "#64748b"} 
                    strokeWidth="1.5"
                    className={k.sideBb ? "filter drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]" : ""}
                  />
                  <text x="6" y="46" textAnchor="middle" fill={k.sideBb ? "#fff" : "#94a3b8"} fontSize="6.5" fontWeight="bold">Bb</text>
                </g>

                {/* Key 4 (F) */}
                <circle cx="100" cy="275" r="11" 
                  fill={k.rh4 ? "#ef4444" : "#1e293b"} 
                  stroke={k.rh4 ? "#dc2626" : "#64748b"} 
                  strokeWidth="2.5"
                  className={k.rh4 ? "filter drop-shadow-[0_0_10px_rgba(239,68,68,0.95)]" : ""}
                />
                <text x="100" y="279" textAnchor="middle" fill={k.rh4 ? "#fff" : "#cbd5e1"} fontSize="11" fontWeight="bold">4</text>

                {/* Key 5 (E) */}
                <circle cx="100" cy="305" r="11" 
                  fill={k.rh5 ? "#ef4444" : "#1e293b"} 
                  stroke={k.rh5 ? "#dc2626" : "#64748b"} 
                  strokeWidth="2.5"
                  className={k.rh5 ? "filter drop-shadow-[0_0_10px_rgba(239,68,68,0.95)]" : ""}
                />
                <text x="100" y="309" textAnchor="middle" fill={k.rh5 ? "#fff" : "#cbd5e1"} fontSize="11" fontWeight="bold">5</text>

                {/* Key 6 (D) */}
                <circle cx="100" cy="335" r="11" 
                  fill={k.rh6 ? "#ef4444" : "#1e293b"} 
                  stroke={k.rh6 ? "#dc2626" : "#64748b"} 
                  strokeWidth="2.5"
                  className={k.rh6 ? "filter drop-shadow-[0_0_10px_rgba(239,68,68,0.95)]" : ""}
                />
                <text x="100" y="339" textAnchor="middle" fill={k.rh6 ? "#fff" : "#cbd5e1"} fontSize="11" fontWeight="bold">6</text>

                {/* High F# Key */}
                <circle cx="120" cy="290" r="7" 
                  fill={k.highFsharp ? "#ef4444" : "#1e293b"} 
                  stroke={k.highFsharp ? "#dc2626" : "#64748b"} 
                  strokeWidth="2"
                  className={k.highFsharp ? "filter drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]" : ""}
                />
                <text x="120" y="293" textAnchor="middle" fill={k.highFsharp ? "#fff" : "#94a3b8"} fontSize="6.5" fontWeight="bold">F#</text>

                {/* Right Hand Pinky Keys (Low Eb and Low C) */}
                <g transform="translate(116, 350)">
                  {/* Low Eb */}
                  <ellipse cx="8" cy="8" rx="8" ry="6" 
                    fill={k.lowEb ? "#ef4444" : "#1e293b"} 
                    stroke={k.lowEb ? "#dc2626" : "#64748b"} 
                    strokeWidth="2"
                    className={k.lowEb ? "filter drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]" : ""}
                  />
                  <text x="8" y="10" textAnchor="middle" fill={k.lowEb ? "#fff" : "#94a3b8"} fontSize="6.5" fontWeight="bold">Eb</text>

                  {/* Low C */}
                  <ellipse cx="8" cy="24" rx="8" ry="6" 
                    fill={k.lowC ? "#ef4444" : "#1e293b"} 
                    stroke={k.lowC ? "#dc2626" : "#64748b"} 
                    strokeWidth="2"
                    className={k.lowC ? "filter drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]" : ""}
                  />
                  <text x="8" y="26" textAnchor="middle" fill={k.lowC ? "#fff" : "#94a3b8"} fontSize="6.5" fontWeight="bold">C</text>
                </g>
              </svg>
            </div>
            )}

            {/* Right: Technical Explanation of Fingers & Keys */}
            <div className="flex-1 space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-[#131722] border border-white/10 space-y-1">
                <span className="font-bold text-red-400 uppercase tracking-wider block">Mão Esquerda (Superior)</span>
                <p className="text-white font-medium">{currentNote.fingeringText.leftHand}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#131722] border border-white/10 space-y-1">
                <span className="font-bold text-amber-400 uppercase tracking-wider block">Mão Direita (Inferior)</span>
                <p className="text-white font-medium">{currentNote.fingeringText.rightHand}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#131722] border border-white/10 space-y-1">
                <span className="font-bold text-cyan-400 uppercase tracking-wider block">Chaves Especiais / Laterais</span>
                <p className="text-white font-medium">{currentNote.fingeringText.specialKeys}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-red-500/10 to-transparent border border-red-500/20 space-y-1">
                <span className="font-bold text-rose-300 uppercase tracking-wider block flex items-center gap-1.5">
                  <Info size={14} /> Dica de Voicing & Embocadura
                </span>
                <p className="text-slate-300 leading-relaxed font-medium">
                  {currentNote.voicingTip}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reference Modal for Original Diagram & PDF */}
      {showReferenceModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#131722] border border-white/20 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-syne font-black text-lg text-white">Ilustração Original & Tabela do Saxofone</h3>
                <p className="text-xs text-slate-400">Diagrama de referência com dedilhado, claves e visual anatômico</p>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href="/assets/aistudio/saxophone-en_teclas_91ce1e9e.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <BookOpen size={14} /> Abrir PDF Completo
                </a>
                <button
                  onClick={() => setShowReferenceModal(false)}
                  className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-[#0b0d14]">
              <img
                src="/assets/aistudio/image_73578fe6.png"
                alt="Diagrama de Dedilhado do Saxofone"
                className="max-h-[65vh] w-auto object-contain rounded-2xl shadow-xl border border-white/10"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
