import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

// Ensure valid Supabase URL and Key in environment (discards dummy values like "123")
if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_URL.startsWith('http')) {
  process.env.VITE_SUPABASE_URL = 'https://viwxalwpvuvgcyxsdjbi.supabase.co';
}
if (!process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY.length < 15) {
  process.env.VITE_SUPABASE_ANON_KEY = 'sb_publishable_lmlaQ5wY_WDUa5G8O9SRVw_PKStIgXy';
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // Maestro IA API endpoint using @google/genai
  app.post('/api/maestro', async (req, res) => {
    try {
      const { prompt, instrument, level, context } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      const systemInstruction = `Você é o "Maestro Lucas", o maestro e mentor de IA da plataforma Tutti ♪ - a principal escola de música digital do Brasil.
Seu nome é Maestro Lucas. Seu tom é caloroso, pedagógico, inspirador, técnico quando necessário e extremamente refinado e acessível.
Você guia estudantes de todos os níveis em instrumentos como Saxofone, Teclado/Piano, Canto, Violão/Guitarra, Bateria, Violino e Teoria Musical.
Dê respostas práticas com explicações claras, cifras quando apropriado, dicas de digitação, respiração diafragmática, afinação, ritmo, harmonia funcional e exercícios diários de prática.
Assine carinhosamente suas orientações como "Maestro Lucas 🎼". Mantenha as respostas concisas e práticas (2 a 4 parágrafos ou passos pontuais).
Instrumento atual do aluno: ${instrument || 'Geral'}
Nível atual: ${level || 'Iniciante/Intermediário'}
${context ? `Contexto da aula/partitura: ${context}` : ''}`;

      if (apiKey) {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstruction}\n\nPergunta do aluno: ${prompt}` }]
            }
          ]
        });

        const reply = response.text || 'Continue praticando com foco no ritmo e na postura!';
        return res.json({ reply });
      } else {
        // Fallback intelligent music educator responses when key is not configured
        const smartReplies: Record<string, string> = {
          default: `Olá! Sou o **Maestro Lucas**, seu mentor de IA no Tutti ♪, pronto para afinar cada detalhe do seu aprendizado. 
Para dominar o ${instrument || 'seu instrumento'}, divida sua rotina diária em 3 blocos de 10 minutos:
1. **Aquecimento & Respiração**: notas longas e consciência corporal.
2. **Técnica & Escalas**: foco na precisão rítmica com o metrônomo (comece a 60 BPM).
3. **Repertório**: toque trechos difíceis bem devagar antes de acelerar!

Abraço musical,
*Maestro Lucas 🎼*`,
          campo: `🎼 **Campo Harmônico de Sol Maior (G):**
- I: G (Tônica)
- ii: Am (Super dominante / menor)
- iii: Bm (Mediante)
- IV: C (Subdominante)
- V: D ou D7 (Dominante com tensão)
- vi: Em (Relativa menor)
- vii°: F#m7(b5) (Sensível diminuta)
💡 *Dica do Maestro Lucas:* A progressão mais famosa da música brasileira e do jazz é ii - V - I (Am7 - D7 - Gmaj7). Pratique tocando e cantando as terças e sétimas!`,
          respiracao: `🌬️ **Respiração Diafragmática (Sopro & Canto):**
1. **Postura:** Coluna ereta, ombros relaxados e peito aberto sem tensão.
2. **Inspiração Baixa:** Ao puxar o ar pelo nariz ou boca aberta, sinta o abdômen e as costelas expandirem 360°, sem levantar os ombros.
3. **Apoio (Suporte):** Mantenha uma leve sustentação na musculatura abdominal enquanto expira em "Tssss" contínuo por 16 tempos a 60 BPM.
4. **Aplicação:** No ${instrument || 'instrumento'}, nunca empurre o som com a garganta; o motor é a coluna de ar!`,
          improvisacao: `🎷 **Improvisação sobre Autumn Leaves (G Menor / Bb Maior):**
1. Comece pelas **notas do acorde** (arpejos 1, 3, 5, 7) nos tempos fortes (1 e 3).
2. A progressão clássica é Cm7 - F7 - Bbmaj7 - Ebmaj7 - Am7(b5) - D7 - Gm.
3. Use a escala de **Sol Menor Natural** e adicione a sensível (F#) sobre o acorde D7 para criar a escala Menor Harmônica.
4. Menos é mais: toque uma frase rítmica curta de 3 notas e responda a ela!`,
        };

        const lower = (prompt || '').toLowerCase();
        let selectedReply = smartReplies.default;
        if (lower.includes('campo') || lower.includes('harmon') || lower.includes('acorde')) {
          selectedReply = smartReplies.campo;
        } else if (lower.includes('respir') || lower.includes('ar') || lower.includes('sopr') || lower.includes('voz')) {
          selectedReply = smartReplies.respiracao;
        } else if (lower.includes('improv') || lower.includes('leaves') || lower.includes('solo') || lower.includes('escala')) {
          selectedReply = smartReplies.improvisacao;
        }

        return res.json({ reply: selectedReply });
      }
    } catch (error: any) {
      console.error('Error in /api/maestro:', error);
      res.status(500).json({ 
        error: 'Não foi possível consultar o Maestro IA no momento.',
        details: error?.message || 'Erro desconhecido'
      });
    }
  });

  // Vite integration
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎵 Tutti ♪ server rodando na porta ${PORT}`);
  });
}

startServer();
