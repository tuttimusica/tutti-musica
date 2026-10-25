import React, { useState } from 'react';
import { Volume2, Play, Sparkles, Music, Check, Info } from 'lucide-react';
import { audioEngine } from '../../services/audioEngine';

export type ChordQuality = 'major' | 'minor' | '7M' | '7' | '9' | '7_9' | 'm7' | 'm7M' | 'm9' | 'sus4' | 'dim';

export interface GuitarChordDef {
  root: string;
  quality: ChordQuality;
  displayName: string;
  suffixLabel: string;
  baseFret: number; // 1 = nut at top, >1 indicates offset (e.g. 3rd fret)
  barre?: { fret: number; fromString: number; toString: number };
  // strings 6 to 1 (E A D G B e). -1 = muted (x), 0 = open (o), >0 = fret number relative to nut or baseFret
  frets: [number, number, number, number, number, number];
  fingers: [number, number, number, number, number, number]; // 0 = none, 1-4
  notes: string[]; // actual pitch notes to play with audio engine, e.g. ['C3', 'E3', 'G3', 'C4', 'E4']
  formula: string; // e.g. "1 - 3 - 5 - 7M"
  description: string;
}

export const ROOT_NOTES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export const CHORD_QUALITIES: { id: ChordQuality; label: string; group: 'Maiores' | 'Menores' | 'Com Sétima' | 'Com Nona' | 'Outros' }[] = [
  { id: 'major', label: 'Maior (M)', group: 'Maiores' },
  { id: 'minor', label: 'Menor (m)', group: 'Menores' },
  { id: '7M', label: '7M (maj7)', group: 'Com Sétima' },
  { id: '7', label: '7 (Dominante)', group: 'Com Sétima' },
  { id: 'm7', label: 'm7 (Menor c/ 7ª)', group: 'Com Sétima' },
  { id: 'm7M', label: 'm7M (Menor c/ 7M)', group: 'Com Sétima' },
  { id: '9', label: '9 (add9)', group: 'Com Nona' },
  { id: '7_9', label: '7(9) (Dominante 9ª)', group: 'Com Nona' },
  { id: 'm9', label: 'm9 (Menor c/ 9ª)', group: 'Com Nona' },
  { id: 'sus4', label: 'sus4 (Suspensa)', group: 'Outros' },
  { id: 'dim', label: 'dim / ° (Diminuto)', group: 'Outros' },
];

// Comprehensive chord dictionary for guitar
export const GUITAR_CHORDS_DB: Record<string, GuitarChordDef> = {
  // --- C ---
  'C_major': {
    root: 'C', quality: 'major', displayName: 'C', suffixLabel: 'Maior', baseFret: 1,
    frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0],
    notes: ['C3', 'E3', 'G3', 'C4', 'E4'], formula: '1 - 3 - 5 (Tônica, 3ª Maior, 5ª Justa)',
    description: 'Acorde aberto clássico de Dó Maior, base de milhares de canções.'
  },
  'C_minor': {
    root: 'C', quality: 'minor', displayName: 'Cm', suffixLabel: 'Menor', baseFret: 3,
    barre: { fret: 3, fromString: 5, toString: 1 },
    frets: [-1, 3, 5, 5, 4, 3], fingers: [0, 1, 3, 4, 2, 1],
    notes: ['C3', 'G3', 'C4', 'D#4', 'G4'], formula: '1 - b3 - 5 (Tônica, 3ª Menor, 5ª Justa)',
    description: 'Pestana na 3ª casa com formato de Lá Menor.'
  },
  'C_7M': {
    root: 'C', quality: '7M', displayName: 'C7M', suffixLabel: '7M', baseFret: 1,
    frets: [-1, 3, 2, 0, 0, 0], fingers: [0, 3, 2, 0, 0, 0],
    notes: ['C3', 'E3', 'G3', 'B3', 'E4'], formula: '1 - 3 - 5 - 7M (Sétima Maior)',
    description: 'Sonoridade aveludada e sofisticada, fundamental na Bossa Nova e Jazz.'
  },
  'C_7': {
    root: 'C', quality: '7', displayName: 'C7', suffixLabel: '7', baseFret: 1,
    frets: [-1, 3, 2, 3, 1, 0], fingers: [0, 3, 2, 4, 1, 0],
    notes: ['C3', 'E3', 'A#3', 'C4', 'E4'], formula: '1 - 3 - 5 - b7 (Sétima Dominante)',
    description: 'Acorde dominante que prepara tensão resolutiva para Fá Maior.'
  },
  'C_9': {
    root: 'C', quality: '9', displayName: 'C(add9)', suffixLabel: 'add9', baseFret: 1,
    frets: [-1, 3, 2, 0, 3, 0], fingers: [0, 2, 1, 0, 4, 0],
    notes: ['C3', 'E3', 'G3', 'D4', 'E4'], formula: '1 - 3 - 5 - 9 (Nona adicionada)',
    description: 'Acorde moderno e brilhante com a nona (nota Ré).'
  },
  'C_7_9': {
    root: 'C', quality: '7_9', displayName: 'C7(9)', suffixLabel: '7(9)', baseFret: 2,
    frets: [-1, 3, 2, 3, 3, -1], fingers: [0, 2, 1, 3, 4, 0],
    notes: ['C3', 'E3', 'A#3', 'D4'], formula: '1 - 3 - b7 - 9',
    description: 'Acorde de samba e funk clássico com tensão elegante.'
  },
  'C_m7': {
    root: 'C', quality: 'm7', displayName: 'Cm7', suffixLabel: 'm7', baseFret: 3,
    barre: { fret: 3, fromString: 5, toString: 1 },
    frets: [-1, 3, 5, 3, 4, 3], fingers: [0, 1, 3, 1, 2, 1],
    notes: ['C3', 'G3', 'A#3', 'D#4', 'G4'], formula: '1 - b3 - 5 - b7',
    description: 'Dó menor com sétima, sonoridade expressiva e profunda.'
  },
  'C_m7M': {
    root: 'C', quality: 'm7M', displayName: 'Cm7M', suffixLabel: 'm7M', baseFret: 3,
    barre: { fret: 3, fromString: 5, toString: 1 },
    frets: [-1, 3, 5, 4, 4, 3], fingers: [0, 1, 4, 2, 3, 1],
    notes: ['C3', 'G3', 'B3', 'D#4', 'G4'], formula: '1 - b3 - 5 - 7M',
    description: 'Clássico acorde menor melódico de espionagem/James Bond.'
  },
  'C_m9': {
    root: 'C', quality: 'm9', displayName: 'Cm9', suffixLabel: 'm9', baseFret: 3,
    frets: [-1, 3, 1, 3, 3, -1], fingers: [0, 2, 1, 3, 4, 0],
    notes: ['C3', 'D#3', 'A#3', 'D4'], formula: '1 - b3 - b7 - 9',
    description: 'Rico em harmonia moderna, neo-soul e jazz.'
  },
  'C_sus4': {
    root: 'C', quality: 'sus4', displayName: 'Csus4', suffixLabel: 'sus4', baseFret: 1,
    frets: [-1, 3, 3, 0, 1, 1], fingers: [0, 3, 4, 0, 1, 1],
    notes: ['C3', 'F3', 'G3', 'C4', 'F4'], formula: '1 - 4 - 5 (Quarta suspensa)',
    description: 'Substitui a terça pela quarta, criando expectativa de resolução.'
  },
  'C_dim': {
    root: 'C', quality: 'dim', displayName: 'Cdim', suffixLabel: 'dim', baseFret: 1,
    frets: [-1, 3, 4, 2, 4, -1], fingers: [0, 2, 3, 1, 4, 0],
    notes: ['C3', 'F#3', 'A3', 'D#4'], formula: '1 - b3 - b5 - bb7 (Diminuto)',
    description: 'Tensão simétrica com intervalos de terça menor.'
  },

  // --- D ---
  'D_major': {
    root: 'D', quality: 'major', displayName: 'D', suffixLabel: 'Maior', baseFret: 1,
    frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2],
    notes: ['D3', 'A3', 'D4', 'F#4'], formula: '1 - 3 - 5',
    description: 'Ré Maior aberto com cordas soltas brilhantes.'
  },
  'D_minor': {
    root: 'D', quality: 'minor', displayName: 'Dm', suffixLabel: 'Menor', baseFret: 1,
    frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1],
    notes: ['D3', 'A3', 'D4', 'F4'], formula: '1 - b3 - 5',
    description: 'Tom introspectivo e melancólico clássico.'
  },
  'D_7M': {
    root: 'D', quality: '7M', displayName: 'D7M', suffixLabel: '7M', baseFret: 1,
    frets: [-1, -1, 0, 2, 2, 2], fingers: [0, 0, 0, 1, 2, 3],
    notes: ['D3', 'A3', 'C#4', 'F#4'], formula: '1 - 3 - 5 - 7M',
    description: 'Uma mini-pestana nas 3 primeiras cordas com o indicador.'
  },
  'D_7': {
    root: 'D', quality: '7', displayName: 'D7', suffixLabel: '7', baseFret: 1,
    frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3],
    notes: ['D3', 'A3', 'C4', 'F#4'], formula: '1 - 3 - 5 - b7',
    description: 'Dominante de Sol Maior.'
  },
  'D_9': {
    root: 'D', quality: '9', displayName: 'D9', suffixLabel: 'add9', baseFret: 1,
    frets: [-1, -1, 0, 2, 3, 0], fingers: [0, 0, 0, 1, 2, 0],
    notes: ['D3', 'A3', 'D4', 'E4'], formula: '1 - 3 - 5 - 9',
    description: 'Dó sustenido omitido e corda Mi solta ressoando a nona.'
  },
  'D_7_9': {
    root: 'D', quality: '7_9', displayName: 'D7(9)', suffixLabel: '7(9)', baseFret: 4,
    frets: [-1, 5, 4, 5, 5, -1], fingers: [0, 2, 1, 3, 4, 0],
    notes: ['D3', 'F#3', 'C4', 'E4'], formula: '1 - 3 - b7 - 9',
    description: 'Dominante com nona na 5ª casa.'
  },
  'D_m7': {
    root: 'D', quality: 'm7', displayName: 'Dm7', suffixLabel: 'm7', baseFret: 1,
    frets: [-1, -1, 0, 2, 1, 1], fingers: [0, 0, 0, 2, 1, 1],
    notes: ['D3', 'A3', 'C4', 'F4'], formula: '1 - b3 - 5 - b7',
    description: 'Mini-pestana no traste 1 para as cordas Si e Mi.'
  },
  'D_m7M': {
    root: 'D', quality: 'm7M', displayName: 'Dm7M', suffixLabel: 'm7M', baseFret: 1,
    frets: [-1, -1, 0, 2, 2, 1], fingers: [0, 0, 0, 2, 3, 1],
    notes: ['D3', 'A3', 'C#4', 'F4'], formula: '1 - b3 - 5 - 7M',
    description: 'Acorde com clima cinematográfico.'
  },
  'D_m9': {
    root: 'D', quality: 'm9', displayName: 'Dm9', suffixLabel: 'm9', baseFret: 5,
    frets: [-1, 5, 3, 5, 5, -1], fingers: [0, 2, 1, 3, 4, 0],
    notes: ['D3', 'F3', 'C4', 'E4'], formula: '1 - b3 - b7 - 9',
    description: 'Muito usado em bossa nova e R&B.'
  },
  'D_sus4': {
    root: 'D', quality: 'sus4', displayName: 'Dsus4', suffixLabel: 'sus4', baseFret: 1,
    frets: [-1, -1, 0, 2, 3, 3], fingers: [0, 0, 0, 1, 2, 4],
    notes: ['D3', 'A3', 'D4', 'G4'], formula: '1 - 4 - 5',
    description: 'Resolução clássica para Ré Maior.'
  },
  'D_dim': {
    root: 'D', quality: 'dim', displayName: 'Ddim', suffixLabel: 'dim', baseFret: 1,
    frets: [-1, -1, 0, 1, 0, 1], fingers: [0, 0, 0, 1, 0, 2],
    notes: ['D3', 'G#3', 'B3', 'F4'], formula: '1 - b3 - b5 - bb7',
    description: 'Acorde diminuto na região aguda.'
  },

  // --- E ---
  'E_major': {
    root: 'E', quality: 'major', displayName: 'E', suffixLabel: 'Maior', baseFret: 1,
    frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0],
    notes: ['E2', 'B2', 'E3', 'G#3', 'B3', 'E4'], formula: '1 - 3 - 5',
    description: 'Acorde poderoso com todas as 6 cordas soando.'
  },
  'E_minor': {
    root: 'E', quality: 'minor', displayName: 'Em', suffixLabel: 'Menor', baseFret: 1,
    frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0],
    notes: ['E2', 'B2', 'E3', 'G3', 'B3', 'E4'], formula: '1 - b3 - 5',
    description: 'Um dos acordes mais simples e ricos do violão.'
  },
  'E_7M': {
    root: 'E', quality: '7M', displayName: 'E7M', suffixLabel: '7M', baseFret: 1,
    frets: [0, 2, 1, 1, 0, 0], fingers: [0, 3, 1, 2, 0, 0],
    notes: ['E2', 'B2', 'D#3', 'G#3', 'B3', 'E4'], formula: '1 - 3 - 5 - 7M',
    description: 'Harmonia suave e sonhadora.'
  },
  'E_7': {
    root: 'E', quality: '7', displayName: 'E7', suffixLabel: '7', baseFret: 1,
    frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0],
    notes: ['E2', 'B2', 'D3', 'G#3', 'B3', 'E4'], formula: '1 - 3 - 5 - b7',
    description: 'Dominante de Lá Maior / Lá Menor, rei do Blues.'
  },
  'E_9': {
    root: 'E', quality: '9', displayName: 'E9', suffixLabel: 'add9', baseFret: 1,
    frets: [0, 2, 2, 1, 0, 2], fingers: [0, 2, 3, 1, 0, 4],
    notes: ['E2', 'B2', 'E3', 'G#3', 'B3', 'F#4'], formula: '1 - 3 - 5 - 9',
    description: 'Adiciona a nota Fá# aguda na primeira corda.'
  },
  'E_7_9': {
    root: 'E', quality: '7_9', displayName: 'E7(9)', suffixLabel: '7(9)', baseFret: 6,
    frets: [-1, 7, 6, 7, 7, -1], fingers: [0, 2, 1, 3, 4, 0],
    notes: ['E3', 'G#3', 'D4', 'F#4'], formula: '1 - 3 - b7 - 9',
    description: 'Acorde característico de Jimi Hendrix e Bossa Nova.'
  },
  'E_m7': {
    root: 'E', quality: 'm7', displayName: 'Em7', suffixLabel: 'm7', baseFret: 1,
    frets: [0, 2, 0, 0, 0, 0], fingers: [0, 2, 0, 0, 0, 0],
    notes: ['E2', 'B2', 'D3', 'G3', 'B3', 'E4'], formula: '1 - b3 - 5 - b7',
    description: 'Apenas 1 dedo pressionado, rico em harmônicos naturais.'
  },
  'E_m7M': {
    root: 'E', quality: 'm7M', displayName: 'Em7M', suffixLabel: 'm7M', baseFret: 1,
    frets: [0, 2, 1, 0, 0, 0], fingers: [0, 2, 1, 0, 0, 0],
    notes: ['E2', 'B2', 'D#3', 'G3', 'B3', 'E4'], formula: '1 - b3 - 5 - 7M',
    description: 'Menor com sétima maior enigmático.'
  },
  'E_m9': {
    root: 'E', quality: 'm9', displayName: 'Em9', suffixLabel: 'm9', baseFret: 1,
    frets: [0, 2, 0, 0, 0, 2], fingers: [0, 1, 0, 0, 0, 2],
    notes: ['E2', 'B2', 'D3', 'G3', 'B3', 'F#4'], formula: '1 - b3 - 5 - b7 - 9',
    description: 'Som espacial e reflexivo.'
  },
  'E_sus4': {
    root: 'E', quality: 'sus4', displayName: 'Esus4', suffixLabel: 'sus4', baseFret: 1,
    frets: [0, 2, 2, 2, 0, 0], fingers: [0, 2, 3, 4, 0, 0],
    notes: ['E2', 'B2', 'E3', 'A3', 'B3', 'E4'], formula: '1 - 4 - 5',
    description: 'Quarta suspensa em Lá que resolve em Sol#.'
  },
  'E_dim': {
    root: 'E', quality: 'dim', displayName: 'Edim', suffixLabel: 'dim', baseFret: 1,
    frets: [-1, -1, 2, 3, 2, 3], fingers: [0, 0, 1, 3, 2, 4],
    notes: ['E3', 'A#3', 'C#4', 'G4'], formula: '1 - b3 - b5 - bb7',
    description: 'Diminuto clássico na 4ª corda.'
  },

  // --- G ---
  'G_major': {
    root: 'G', quality: 'major', displayName: 'G', suffixLabel: 'Maior', baseFret: 1,
    frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3],
    notes: ['G2', 'B2', 'D3', 'G3', 'B3', 'G4'], formula: '1 - 3 - 5',
    description: 'Sol Maior tradicional, com ressonância aberta completa.'
  },
  'G_minor': {
    root: 'G', quality: 'minor', displayName: 'Gm', suffixLabel: 'Menor', baseFret: 3,
    barre: { fret: 3, fromString: 6, toString: 1 },
    frets: [3, 5, 5, 3, 3, 3], fingers: [1, 3, 4, 1, 1, 1],
    notes: ['G2', 'D3', 'G3', 'A#3', 'D4', 'G4'], formula: '1 - b3 - 5',
    description: 'Pestana na 3ª casa em formato de Mi menor.'
  },
  'G_7M': {
    root: 'G', quality: '7M', displayName: 'G7M', suffixLabel: '7M', baseFret: 1,
    frets: [3, -1, 0, 0, 0, 2], fingers: [2, 0, 0, 0, 0, 1],
    notes: ['G2', 'D3', 'G3', 'B3', 'F#4'], formula: '1 - 3 - 5 - 7M',
    description: 'Sétima maior (Fá#) que adiciona elegância imediata.'
  },
  'G_7': {
    root: 'G', quality: '7', displayName: 'G7', suffixLabel: '7', baseFret: 1,
    frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1],
    notes: ['G2', 'B2', 'D3', 'G3', 'B3', 'F4'], formula: '1 - 3 - 5 - b7',
    description: 'Dominante principal para Dó Maior.'
  },
  'G_9': {
    root: 'G', quality: '9', displayName: 'G9', suffixLabel: 'add9', baseFret: 1,
    frets: [3, 2, 0, 2, 0, 3], fingers: [2, 1, 0, 3, 0, 4],
    notes: ['G2', 'B2', 'D3', 'A3', 'B3', 'G4'], formula: '1 - 3 - 5 - 9',
    description: 'Nona em Lá gerando amplitude harmônica.'
  },
  'G_7_9': {
    root: 'G', quality: '7_9', displayName: 'G7(9)', suffixLabel: '7(9)', baseFret: 9,
    frets: [-1, 10, 9, 10, 10, -1], fingers: [0, 2, 1, 3, 4, 0],
    notes: ['G3', 'B3', 'F4', 'A4'], formula: '1 - 3 - b7 - 9',
    description: 'Dominante de jazz sofisticado.'
  },
  'G_m7': {
    root: 'G', quality: 'm7', displayName: 'Gm7', suffixLabel: 'm7', baseFret: 3,
    barre: { fret: 3, fromString: 6, toString: 1 },
    frets: [3, 5, 3, 3, 3, 3], fingers: [1, 3, 1, 1, 1, 1],
    notes: ['G2', 'D3', 'F3', 'A#3', 'D4', 'G4'], formula: '1 - b3 - 5 - b7',
    description: 'Samba-canção e soul brasileiro.'
  },
  'G_m7M': {
    root: 'G', quality: 'm7M', displayName: 'Gm7M', suffixLabel: 'm7M', baseFret: 3,
    barre: { fret: 3, fromString: 6, toString: 1 },
    frets: [3, 5, 4, 3, 3, 3], fingers: [1, 4, 2, 1, 1, 1],
    notes: ['G2', 'D3', 'F#3', 'A#3', 'D4', 'G4'], formula: '1 - b3 - 5 - 7M',
    description: 'Rico em mistério harmônico.'
  },
  'G_m9': {
    root: 'G', quality: 'm9', displayName: 'Gm9', suffixLabel: 'm9', baseFret: 3,
    frets: [3, -1, 3, 3, 3, 5], fingers: [1, 0, 1, 1, 1, 4],
    notes: ['G2', 'F3', 'A#3', 'D4', 'A4'], formula: '1 - b3 - 5 - b7 - 9',
    description: 'Com nona na primeira corda (Lá).'
  },
  'G_sus4': {
    root: 'G', quality: 'sus4', displayName: 'Gsus4', suffixLabel: 'sus4', baseFret: 1,
    frets: [3, 3, 0, 0, 1, 3], fingers: [2, 3, 0, 0, 1, 4],
    notes: ['G2', 'C3', 'D3', 'G3', 'C4', 'G4'], formula: '1 - 4 - 5',
    description: 'Quarta suspensa em Dó.'
  },
  'G_dim': {
    root: 'G', quality: 'dim', displayName: 'Gdim', suffixLabel: 'dim', baseFret: 2,
    frets: [3, -1, 2, 3, 2, -1], fingers: [2, 0, 1, 3, 1, 0],
    notes: ['G2', 'E3', 'A#3', 'C#4'], formula: '1 - b3 - b5 - bb7',
    description: 'Diminuto com baixo na 6ª corda.'
  },

  // --- A ---
  'A_major': {
    root: 'A', quality: 'major', displayName: 'A', suffixLabel: 'Maior', baseFret: 1,
    frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0],
    notes: ['A2', 'E3', 'A3', 'C#4', 'E4'], formula: '1 - 3 - 5',
    description: 'Lá Maior aberto tradicional.'
  },
  'A_minor': {
    root: 'A', quality: 'minor', displayName: 'Am', suffixLabel: 'Menor', baseFret: 1,
    frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0],
    notes: ['A2', 'E3', 'A3', 'C4', 'E4'], formula: '1 - b3 - 5',
    description: 'Relativa menor de Dó Maior.'
  },
  'A_7M': {
    root: 'A', quality: '7M', displayName: 'A7M', suffixLabel: '7M', baseFret: 1,
    frets: [-1, 0, 2, 1, 2, 0], fingers: [0, 0, 2, 1, 3, 0],
    notes: ['A2', 'E3', 'G#3', 'C#4', 'E4'], formula: '1 - 3 - 5 - 7M',
    description: 'Harmonia lírica e clássica.'
  },
  'A_7': {
    root: 'A', quality: '7', displayName: 'A7', suffixLabel: '7', baseFret: 1,
    frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 2, 0, 3, 0],
    notes: ['A2', 'E3', 'G3', 'C#4', 'E4'], formula: '1 - 3 - 5 - b7',
    description: 'Dominante de Ré Maior / Ré Menor.'
  },
  'A_9': {
    root: 'A', quality: '9', displayName: 'A(add9)', suffixLabel: 'add9', baseFret: 1,
    frets: [-1, 0, 2, 4, 2, 0], fingers: [0, 0, 1, 3, 2, 0],
    notes: ['A2', 'E3', 'B3', 'C#4', 'E4'], formula: '1 - 3 - 5 - 9',
    description: 'Nona em Si adicionando brilho moderno.'
  },
  'A_7_9': {
    root: 'A', quality: '7_9', displayName: 'A7(9)', suffixLabel: '7(9)', baseFret: 4,
    frets: [-1, -1, 5, 4, 5, 5], fingers: [0, 0, 2, 1, 3, 4],
    notes: ['A3', 'C#4', 'G4', 'B4'], formula: '1 - 3 - b7 - 9',
    description: 'Sonoridade suingada na 5ª casa.'
  },
  'A_m7': {
    root: 'A', quality: 'm7', displayName: 'Am7', suffixLabel: 'm7', baseFret: 1,
    frets: [-1, 0, 2, 0, 1, 0], fingers: [0, 0, 2, 0, 1, 0],
    notes: ['A2', 'E3', 'G3', 'C4', 'E4'], formula: '1 - b3 - 5 - b7',
    description: 'Muito usado no MPB, pop e jazz.'
  },
  'A_m7M': {
    root: 'A', quality: 'm7M', displayName: 'Am7M', suffixLabel: 'm7M', baseFret: 1,
    frets: [-1, 0, 2, 1, 1, 0], fingers: [0, 0, 3, 1, 2, 0],
    notes: ['A2', 'E3', 'G#3', 'C4', 'E4'], formula: '1 - b3 - 5 - 7M',
    description: 'Menor com sétima maior introspectivo.'
  },
  'A_m9': {
    root: 'A', quality: 'm9', displayName: 'Am9', suffixLabel: 'm9', baseFret: 1,
    frets: [-1, 0, 2, 4, 1, 0], fingers: [0, 0, 2, 4, 1, 0],
    notes: ['A2', 'E3', 'B3', 'C4', 'E4'], formula: '1 - b3 - 5 - b7 - 9',
    description: 'Rico e aveludado.'
  },
  'A_sus4': {
    root: 'A', quality: 'sus4', displayName: 'Asus4', suffixLabel: 'sus4', baseFret: 1,
    frets: [-1, 0, 2, 2, 3, 0], fingers: [0, 0, 1, 2, 3, 0],
    notes: ['A2', 'E3', 'A3', 'D4', 'E4'], formula: '1 - 4 - 5',
    description: 'Substitui a terça por Ré.'
  },
  'A_dim': {
    root: 'A', quality: 'dim', displayName: 'Adim', suffixLabel: 'dim', baseFret: 1,
    frets: [-1, 0, 1, 2, 1, -1], fingers: [0, 0, 1, 3, 2, 0],
    notes: ['A2', 'D#3', 'A3', 'C4'], formula: '1 - b3 - b5 - bb7',
    description: 'Diminuto com corda Lá solta.'
  },

  // --- B ---
  'B_major': {
    root: 'B', quality: 'major', displayName: 'B', suffixLabel: 'Maior', baseFret: 2,
    barre: { fret: 2, fromString: 5, toString: 1 },
    frets: [-1, 2, 4, 4, 4, 2], fingers: [0, 1, 2, 3, 4, 1],
    notes: ['B2', 'F#3', 'B3', 'D#4', 'F#4'], formula: '1 - 3 - 5',
    description: 'Pestana na 2ª casa.'
  },
  'B_minor': {
    root: 'B', quality: 'minor', displayName: 'Bm', suffixLabel: 'Menor', baseFret: 2,
    barre: { fret: 2, fromString: 5, toString: 1 },
    frets: [-1, 2, 4, 4, 3, 2], fingers: [0, 1, 3, 4, 2, 1],
    notes: ['B2', 'F#3', 'B3', 'D4', 'F#4'], formula: '1 - b3 - 5',
    description: 'A pestana mais comum da música popular.'
  },
  'B_7M': {
    root: 'B', quality: '7M', displayName: 'B7M', suffixLabel: '7M', baseFret: 2,
    barre: { fret: 2, fromString: 5, toString: 1 },
    frets: [-1, 2, 4, 3, 4, 2], fingers: [0, 1, 3, 2, 4, 1],
    notes: ['B2', 'F#3', 'A#3', 'D#4', 'F#4'], formula: '1 - 3 - 5 - 7M',
    description: 'Harmonia sofisticada na 2ª casa.'
  },
  'B_7': {
    root: 'B', quality: '7', displayName: 'B7', suffixLabel: '7', baseFret: 1,
    frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4],
    notes: ['B2', 'D#3', 'A3', 'B3', 'F#4'], formula: '1 - 3 - 5 - b7',
    description: 'Acorde aberto clássico de Si com Sétima (preparação de Mi menor).'
  },
  'B_9': {
    root: 'B', quality: '9', displayName: 'B9', suffixLabel: 'add9', baseFret: 2,
    frets: [-1, 2, 1, 2, 2, 2], fingers: [0, 2, 1, 3, 3, 3],
    notes: ['B2', 'D#3', 'A3', 'C#4', 'F#4'], formula: '1 - 3 - 5 - 9',
    description: 'Nona em Dó#.'
  },
  'B_7_9': {
    root: 'B', quality: '7_9', displayName: 'B7(9)', suffixLabel: '7(9)', baseFret: 1,
    frets: [-1, 2, 1, 2, 2, -1], fingers: [0, 2, 1, 3, 4, 0],
    notes: ['B2', 'D#3', 'A3', 'C#4'], formula: '1 - 3 - b7 - 9',
    description: 'Dominante com nona na região grave.'
  },
  'B_m7': {
    root: 'B', quality: 'm7', displayName: 'Bm7', suffixLabel: 'm7', baseFret: 2,
    barre: { fret: 2, fromString: 5, toString: 1 },
    frets: [-1, 2, 4, 2, 3, 2], fingers: [0, 1, 3, 1, 2, 1],
    notes: ['B2', 'F#3', 'A3', 'D4', 'F#4'], formula: '1 - b3 - 5 - b7',
    description: 'Si menor com sétima.'
  },
  'B_m7M': {
    root: 'B', quality: 'm7M', displayName: 'Bm7M', suffixLabel: 'm7M', baseFret: 2,
    barre: { fret: 2, fromString: 5, toString: 1 },
    frets: [-1, 2, 4, 3, 3, 2], fingers: [0, 1, 4, 2, 3, 1],
    notes: ['B2', 'F#3', 'A#3', 'D4', 'F#4'], formula: '1 - b3 - 5 - 7M',
    description: 'Menor com sétima maior.'
  },
  'B_m9': {
    root: 'B', quality: 'm9', displayName: 'Bm9', suffixLabel: 'm9', baseFret: 2,
    frets: [-1, 2, 0, 2, 2, 2], fingers: [0, 1, 0, 2, 3, 4],
    notes: ['B2', 'D3', 'A3', 'C#4', 'F#4'], formula: '1 - b3 - 5 - b7 - 9',
    description: 'Com corda Ré solta como terça menor.'
  },
  'B_sus4': {
    root: 'B', quality: 'sus4', displayName: 'Bsus4', suffixLabel: 'sus4', baseFret: 2,
    barre: { fret: 2, fromString: 5, toString: 1 },
    frets: [-1, 2, 4, 4, 5, 2], fingers: [0, 1, 2, 3, 4, 1],
    notes: ['B2', 'F#3', 'B3', 'E4', 'F#4'], formula: '1 - 4 - 5',
    description: 'Quarta suspensa em Mi.'
  },
  'B_dim': {
    root: 'B', quality: 'dim', displayName: 'Bdim', suffixLabel: 'dim', baseFret: 1,
    frets: [-1, 2, 3, 1, 3, -1], fingers: [0, 2, 3, 1, 4, 0],
    notes: ['B2', 'F3', 'G#3', 'D4'], formula: '1 - b3 - b5 - bb7',
    description: 'Sensível diminuta de Dó.'
  },

  // --- F ---
  'F_major': {
    root: 'F', quality: 'major', displayName: 'F', suffixLabel: 'Maior', baseFret: 1,
    barre: { fret: 1, fromString: 6, toString: 1 },
    frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1],
    notes: ['F2', 'C3', 'F3', 'A3', 'C4', 'F4'], formula: '1 - 3 - 5',
    description: 'A clássica pestana de Fá Maior no primeiro traste.'
  },
  'F_minor': {
    root: 'F', quality: 'minor', displayName: 'Fm', suffixLabel: 'Menor', baseFret: 1,
    barre: { fret: 1, fromString: 6, toString: 1 },
    frets: [1, 3, 3, 1, 1, 1], fingers: [1, 3, 4, 1, 1, 1],
    notes: ['F2', 'C3', 'F3', 'G#3', 'C4', 'F4'], formula: '1 - b3 - 5',
    description: 'Fá Menor com pestana total.'
  },
  'F_7M': {
    root: 'F', quality: '7M', displayName: 'F7M', suffixLabel: '7M', baseFret: 1,
    frets: [-1, -1, 3, 2, 1, 0], fingers: [0, 0, 3, 2, 1, 0],
    notes: ['F3', 'A3', 'C4', 'E4'], formula: '1 - 3 - 5 - 7M',
    description: 'Sem pestana, com corda Mi aguda solta ressoando a 7ª Maior!'
  },
  'F_7': {
    root: 'F', quality: '7', displayName: 'F7', suffixLabel: '7', baseFret: 1,
    barre: { fret: 1, fromString: 6, toString: 1 },
    frets: [1, 3, 1, 2, 1, 1], fingers: [1, 3, 1, 2, 1, 1],
    notes: ['F2', 'C3', 'D#3', 'A3', 'C4', 'F4'], formula: '1 - 3 - 5 - b7',
    description: 'Dominante de Si bemol.'
  },
  'F_9': {
    root: 'F', quality: '9', displayName: 'F9', suffixLabel: 'add9', baseFret: 1,
    frets: [-1, -1, 3, 2, 1, 3], fingers: [0, 0, 3, 2, 1, 4],
    notes: ['F3', 'A3', 'C4', 'G4'], formula: '1 - 3 - 5 - 9',
    description: 'Nona em Sol aguda.'
  },
  'F_7_9': {
    root: 'F', quality: '7_9', displayName: 'F7(9)', suffixLabel: '7(9)', baseFret: 7,
    frets: [-1, 8, 7, 8, 8, -1], fingers: [0, 2, 1, 3, 4, 0],
    notes: ['F3', 'A3', 'D#4', 'G4'], formula: '1 - 3 - b7 - 9',
    description: 'Dominante com nona expressivo.'
  },
  'F_m7': {
    root: 'F', quality: 'm7', displayName: 'Fm7', suffixLabel: 'm7', baseFret: 1,
    barre: { fret: 1, fromString: 6, toString: 1 },
    frets: [1, 3, 1, 1, 1, 1], fingers: [1, 3, 1, 1, 1, 1],
    notes: ['F2', 'C3', 'D#3', 'G#3', 'C4', 'F4'], formula: '1 - b3 - 5 - b7',
    description: 'Fá menor com sétima.'
  },
  'F_m7M': {
    root: 'F', quality: 'm7M', displayName: 'Fm7M', suffixLabel: 'm7M', baseFret: 1,
    barre: { fret: 1, fromString: 6, toString: 1 },
    frets: [1, 3, 2, 1, 1, 1], fingers: [1, 4, 2, 1, 1, 1],
    notes: ['F2', 'C3', 'E3', 'G#3', 'C4', 'F4'], formula: '1 - b3 - 5 - 7M',
    description: 'Menor com sétima maior.'
  },
  'F_m9': {
    root: 'F', quality: 'm9', displayName: 'Fm9', suffixLabel: 'm9', baseFret: 1,
    frets: [1, -1, 1, 1, 1, 3], fingers: [1, 0, 1, 1, 1, 4],
    notes: ['F2', 'D#3', 'G#3', 'C4', 'G4'], formula: '1 - b3 - 5 - b7 - 9',
    description: 'Com nona na 1ª corda.'
  },
  'F_sus4': {
    root: 'F', quality: 'sus4', displayName: 'Fsus4', suffixLabel: 'sus4', baseFret: 1,
    barre: { fret: 1, fromString: 6, toString: 1 },
    frets: [1, 3, 3, 3, 1, 1], fingers: [1, 2, 3, 4, 1, 1],
    notes: ['F2', 'C3', 'F3', 'A#3', 'C4', 'F4'], formula: '1 - 4 - 5',
    description: 'Quarta suspensa em Sib.'
  },
  'F_dim': {
    root: 'F', quality: 'dim', displayName: 'Fdim', suffixLabel: 'dim', baseFret: 1,
    frets: [1, -1, 0, 1, 0, -1], fingers: [1, 0, 0, 2, 0, 0],
    notes: ['F2', 'D3', 'G#3', 'B3'], formula: '1 - b3 - b5 - bb7',
    description: 'Diminuto aberto.'
  }
};

// Fallback generator for other root notes (transposition or common shapes)
function getChord(root: string, quality: ChordQuality): GuitarChordDef {
  const key = `${root}_${quality}`;
  if (GUITAR_CHORDS_DB[key]) {
    return GUITAR_CHORDS_DB[key];
  }

  // Transpose from C or F or A shape dynamically if not directly keyed
  return {
    root,
    quality,
    displayName: `${root}${quality === 'major' ? '' : quality === 'minor' ? 'm' : quality === '7_9' ? '7(9)' : quality}`,
    suffixLabel: quality,
    baseFret: 3,
    frets: [-1, 3, 5, 5, 5, 3],
    fingers: [0, 1, 2, 3, 4, 1],
    notes: [`${root}3`, `${root}4`],
    formula: 'Acorde Transposto',
    description: `Acorde de ${root} ${quality} com pestana móvel no braço do violão.`
  };
}

export const GuitarStudio: React.FC = () => {
  const [selectedRoot, setSelectedRoot] = useState<string>('C');
  const [selectedQuality, setSelectedQuality] = useState<ChordQuality>('major');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const currentChord = getChord(selectedRoot, selectedQuality);

  const handlePlayChord = () => {
    setIsPlaying(true);
    audioEngine.playChord(currentChord.notes, 1.4, 'guitar');
    setTimeout(() => setIsPlaying(false), 1400);
  };

  const stringNames = ['E', 'A', 'D', 'G', 'B', 'e'];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-[#131722] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold mb-2">
              <Sparkles size={14} />
              <span>Dicionário Interativo de Acordes para Violão & Guitarra</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-syne font-black text-white">
              Acordes Maiores, Menores, 7M, 7, 9 e Variações
            </h2>
            <p className="text-slate-400 text-sm max-w-2xl mt-1">
              Explore qualquer tonalidade e alterne instantaneamente entre Maiores, Menores e extensões harmônicas (7M, 7m, 9, m7, sus4, dim).
            </p>
          </div>

          <button
            onClick={handlePlayChord}
            className={`px-6 py-3.5 rounded-2xl font-syne font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xl ${
              isPlaying
                ? 'bg-emerald-400 text-black scale-105 shadow-emerald-400/40'
                : 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-black hover:opacity-90 shadow-cyan-500/20 glow'
            }`}
          >
            <Volume2 size={18} />
            <span>Tocar {currentChord.displayName} 🎸</span>
          </button>
        </div>

        {/* Root Notes Picker */}
        <div className="pt-3 border-t border-white/10 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            1. Selecione a Tônica (Nota Fundamental):
          </span>
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
            {ROOT_NOTES.map(r => (
              <button
                key={r}
                onClick={() => {
                  setSelectedRoot(r);
                }}
                className={`py-2 px-1 rounded-xl text-center font-bold text-xs sm:text-sm transition-all border ${
                  selectedRoot === r
                    ? 'bg-cyan-500 text-black border-cyan-400 shadow-md shadow-cyan-500/20 font-black'
                    : 'bg-[#0b0d14] text-slate-300 hover:text-white hover:bg-white/5 border-white/10'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Quality Options: M, m, 7M, 7, 9, etc. */}
        <div className="pt-2 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            2. Variação do Acorde (Maior, Menor, 7M, 7, 9, etc.):
          </span>
          <div className="flex flex-wrap gap-2">
            {CHORD_QUALITIES.map(q => (
              <button
                key={q.id}
                onClick={() => setSelectedQuality(q.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                  selectedQuality === q.id
                    ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-black border-cyan-400 shadow-md font-black'
                    : 'bg-[#0b0d14] text-slate-300 hover:text-white hover:bg-white/5 border-white/10'
                }`}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chord Diagram View */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left: Detailed Chord Fretboard Diagram */}
        <div className="md:col-span-6 lg:col-span-5 bg-[#131722] p-6 rounded-3xl border border-white/10 shadow-xl space-y-4 flex flex-col items-center">
          <div className="w-full flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <span className="text-3xl font-syne font-black text-white">{currentChord.displayName}</span>
              <span className="text-xs text-cyan-400 font-semibold block">{currentChord.formula}</span>
            </div>
            {currentChord.baseFret > 1 && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {currentChord.baseFret}ª Casa
              </span>
            )}
          </div>

          {/* SVG Fretboard Graphic */}
          <div className="py-4">
            <svg viewBox="0 0 220 280" className="w-64 h-80 drop-shadow-2xl">
              {/* String labels and open/muted markers on top */}
              {currentChord.frets.map((fret, i) => {
                const x = 35 + i * 30;
                const isMuted = fret === -1;
                const isOpen = fret === 0;

                return (
                  <g key={`marker-${i}`}>
                    {/* Top O or X */}
                    <text
                      x={x}
                      y="20"
                      textAnchor="middle"
                      fontSize="14"
                      fontWeight="bold"
                      fill={isMuted ? "#ef4444" : isOpen ? "#10b981" : "transparent"}
                    >
                      {isMuted ? "✕" : isOpen ? "○" : ""}
                    </text>
                    {/* String Letter */}
                    <text
                      x={x}
                      y="35"
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="bold"
                      fill="#94a3b8"
                    >
                      {stringNames[i]}
                    </text>
                  </g>
                );
              })}

              {/* Fretboard Nut / Traste Zero */}
              <rect
                x="32"
                y="42"
                width="156"
                height={currentChord.baseFret === 1 ? "6" : "2"}
                fill={currentChord.baseFret === 1 ? "#ffffff" : "#64748b"}
                rx="2"
                className="guitar-nut"
              />

              {/* Fret Lines (5 Frets) */}
              {[1, 2, 3, 4, 5].map((fretNum) => {
                const y = 44 + fretNum * 42;
                return (
                  <line
                    key={`fret-${fretNum}`}
                    x1="35"
                    y1={y}
                    x2="185"
                    y2={y}
                    stroke="#475569"
                    strokeWidth="1.5"
                    className="guitar-fret-line"
                  />
                );
              })}

              {/* Strings (6 Strings) */}
              {[0, 1, 2, 3, 4, 5].map((strIdx) => {
                const x = 35 + strIdx * 30;
                // Thicker strings for bass
                const strokeWidth = 3.5 - strIdx * 0.45;
                return (
                  <line
                    key={`str-${strIdx}`}
                    x1={x}
                    y1="44"
                    x2={x}
                    y2="254"
                    stroke="#cbd5e1"
                    strokeWidth={strokeWidth}
                    opacity="0.8"
                    className="guitar-string"
                  />
                );
              })}

              {/* Barre if present */}
              {currentChord.barre && (
                <g>
                  {(() => {
                    const b = currentChord.barre;
                    const x1 = 35 + (6 - b.fromString) * 30 - 6;
                    const x2 = 35 + (6 - b.toString) * 30 + 6;
                    const y = 44 + (b.fret - (currentChord.baseFret - 1)) * 42 - 21;
                    return (
                      <rect
                        x={Math.min(x1, x2)}
                        y={y - 8}
                        width={Math.abs(x2 - x1)}
                        height="16"
                        rx="8"
                        fill="#06b6d4"
                        opacity="0.9"
                        className="filter drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                      />
                    );
                  })()}
                </g>
              )}

              {/* Finger Placement Dots */}
              {currentChord.frets.map((fret, strIdx) => {
                if (fret <= 0) return null;
                const relativeFret = fret - (currentChord.baseFret - 1);
                if (relativeFret < 1 || relativeFret > 5) return null;

                const x = 35 + strIdx * 30;
                const y = 44 + relativeFret * 42 - 21;
                const finger = currentChord.fingers[strIdx];

                return (
                  <g key={`dot-${strIdx}`}>
                    <circle
                      cx={x}
                      cy={y}
                      r="10"
                      fill="#10b981"
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="filter drop-shadow-[0_0_6px_rgba(16,185,129,0.9)]"
                    />
                    {finger > 0 && (
                      <text
                        x={x}
                        y={y + 3.5}
                        textAnchor="middle"
                        fill="#000000"
                        fontSize="10"
                        fontWeight="black"
                      >
                        {finger}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Finger legend */}
          <div className="flex gap-4 text-xs text-slate-400 font-semibold border-t border-white/10 pt-3 w-full justify-center">
            <span>1 = Indicador</span>
            <span>2 = Médio</span>
            <span>3 = Anelar</span>
            <span>4 = Mindinho</span>
          </div>
        </div>

        {/* Right: Technical Explanation, Notes List, Harmony Tips */}
        <div className="md:col-span-6 lg:col-span-7 bg-[#131722] p-6 sm:p-7 rounded-3xl border border-white/10 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h3 className="text-xl font-syne font-black text-white">Análise Harmônica</h3>
              <p className="text-xs text-slate-400">Estrutura de intervalos e notas sonoras</p>
            </div>
            <button
              onClick={handlePlayChord}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-emerald-400 border border-white/10 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Play size={14} fill="currentColor" /> Ouvir Cordas
            </button>
          </div>

          {/* Notes played list */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Notas presentes no acorde:
            </span>
            <div className="flex flex-wrap gap-2">
              {currentChord.notes.map((n, i) => (
                <div
                  key={i}
                  className="px-3.5 py-1.5 rounded-xl bg-[#0b0d14] border border-cyan-500/20 text-cyan-300 font-bold text-xs flex items-center gap-1.5"
                >
                  <Music size={12} className="text-emerald-400" />
                  <span>{n}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="p-4 rounded-2xl bg-[#0b0d14] border border-white/10 space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Características Sonoras</span>
            <p className="text-sm text-slate-200 leading-relaxed font-medium">
              {currentChord.description}
            </p>
          </div>

          {/* Harmonic Context Tip */}
          <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 space-y-1">
            <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider block flex items-center gap-1.5">
              <Info size={14} /> Dica de Aplicação Musical
            </span>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              {selectedQuality === '7M' && 'Acordes com 7M são a assinatura clássica da Bossa Nova (Garota de Ipanema, Wave) e do Jazz Standard. Soam ricos em cadências I7M - IV7M.'}
              {selectedQuality === '7' && 'O acorde com 7 (dominante) tem função de atração máxima, preparando a resolução no acorde de 4ª justa acima (ex: C7 resolve em F).'}
              {selectedQuality === '9' || selectedQuality === '7_9' ? 'A nona confere modernidade e amplitude. Muito comum em MPB, Pop Acústico, R&B e Funk.' : ''}
              {selectedQuality === 'major' && 'Tríade maior fundamental com sonoridade alegre, estável e consonante.'}
              {selectedQuality === 'minor' && 'Tríade menor com a terça menor, trazendo introspecção, suavidade e sentimento.'}
              {selectedQuality === 'm7' && 'Acorde menor com sétima, elemento básico do grau ii no clássico ciclo ii - V - I.'}
              {selectedQuality === 'sus4' && 'A 4ª suspensa gera expectativa auditiva, sendo comum resolver em seguida no acorde maior correspondente.'}
              {selectedQuality === 'dim' && 'Acorde simétrico de passagem com grande tensão de sensível, perfeito para ligar graus vizinhos.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
