import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

const sqlPath = path.resolve('tutti_database_full_schema.sql');
const outputPdfPath = path.resolve('public/tutti_estrutura_banco_de_dados.pdf');

console.log('Reading SQL schema from:', sqlPath);
const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

// Ensure public directory exists
const publicDir = path.dirname(outputPdfPath);
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Generating PDF at:', outputPdfPath);

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 40, bottom: 40, left: 40, right: 40 },
  bufferPages: true
});

const writeStream = fs.createWriteStream(outputPdfPath);
doc.pipe(writeStream);

// Colors
const GOLD = '#D4AF37';
const DARK_BG = '#0B0D14';
const ACCENT = '#06B6D4';
const TEXT_DARK = '#1E293B';
const TEXT_MUTED = '#64748B';
const CODE_BG = '#F8FAFC';
const CODE_BORDER = '#E2E8F0';

// Cover / Title Page
doc.rect(0, 0, doc.page.width, doc.page.height).fill(DARK_BG);

// Decorative gold border
doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
   .lineWidth(2)
   .strokeColor(GOLD)
   .stroke();

doc.rect(24, 24, doc.page.width - 48, doc.page.height - 48)
   .lineWidth(0.5)
   .strokeColor(GOLD)
   .stroke();

// Title Section
doc.moveDown(4);
doc.font('Helvetica-Bold')
   .fontSize(14)
   .fillColor(GOLD)
   .text('TUTTI ESCOLA DE MÚSICA ♪', { align: 'center', characterSpacing: 2 });

doc.moveDown(1);
doc.fontSize(24)
   .fillColor('#FFFFFF')
   .text('ARQUITETURA DE BANCO DE DADOS', { align: 'center' });

doc.moveDown(0.5);
doc.fontSize(13)
   .fillColor(ACCENT)
   .text('ESTRUTURA COMPLETA POSTGRESQL & SUPABASE', { align: 'center' });

doc.moveDown(2);
doc.fontSize(10)
   .fillColor('#94A3B8')
   .text('Documentação Técnica Oficial, Modelagem Relacional, Triggers, Views, RLS e Seeds', { align: 'center' });

doc.moveDown(3);

// Card Info on Cover
const boxX = 70;
const boxY = 270;
const boxW = doc.page.width - 140;
const boxH = 280;

doc.roundedRect(boxX, boxY, boxW, boxH, 8)
   .fillOpacity(0.15)
   .fill('#1E293B')
   .fillOpacity(1);

doc.roundedRect(boxX, boxY, boxW, boxH, 8)
   .lineWidth(1)
   .strokeColor(GOLD)
   .stroke();

doc.fillColor('#FFFFFF')
   .fontSize(12)
   .font('Helvetica-Bold')
   .text('RESUMO EXECUTIVO DO SISTEMA', boxX + 20, boxY + 20);

doc.font('Helvetica')
   .fontSize(9.5)
   .fillColor('#E2E8F0')
   .moveDown(1);

const specs = [
  ['Banco de Dados', 'PostgreSQL 15+ hospedado no Supabase'],
  ['Projeto Supabase', 'https://viwxalwpvuvgcyxsdjbi.supabase.co'],
  ['Versão da Arquitetura', '2.0 (Relacional, Multi-Ambiente com RLS)'],
  ['Ambientes Atendidos', 'Desenvolvedor / Administrador, Professor e Aluno'],
  ['Total de Tabelas', '18 tabelas relacionais com chaves estrangeiras'],
  ['Total de Views', '2 views analíticas (Destaques e Ranking de Alunos)'],
  ['Políticas RLS', '25 políticas granulares de segurança por usuário'],
  ['Triggers e Funções', 'Criação de perfis, auditoria e atualização de timestamps'],
  ['Data de Geração', new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })]
];

specs.forEach(([label, value]) => {
  doc.font('Helvetica-Bold').fillColor(GOLD).text(`•  ${label}: `, { continued: true });
  doc.font('Helvetica').fillColor('#FFFFFF').text(value);
  doc.moveDown(0.4);
});

doc.moveDown(4);
doc.font('Helvetica-Oblique')
   .fontSize(9)
   .fillColor('#94A3B8')
   .text('Tutti Escola de Música - Todos os direitos reservados.', 0, doc.page.height - 70, { align: 'center' });

// Page 2: Table of Contents & Structure Overview
doc.addPage({ margins: { top: 40, bottom: 40, left: 40, right: 40 } });

function renderHeader(title) {
  doc.font('Helvetica-Bold')
     .fontSize(8.5)
     .fillColor(GOLD)
     .text('TUTTI ESCOLA DE MÚSICA  •  ESTRUTURA SQL DO BANCO DE DADOS', 40, 20);
  
  doc.font('Helvetica')
     .fontSize(8)
     .fillColor(TEXT_MUTED)
     .text('Supabase / PostgreSQL v2.0', doc.page.width - 180, 20, { align: 'right' });

  doc.moveTo(40, 32)
     .lineTo(doc.page.width - 40, 32)
     .lineWidth(0.5)
     .strokeColor(GOLD)
     .stroke();
  doc.y = 45;
}

renderHeader();

doc.font('Helvetica-Bold')
   .fontSize(16)
   .fillColor(TEXT_DARK)
   .text('Índice da Modelagem de Dados', 40, doc.y);

doc.moveDown(0.5);
doc.font('Helvetica')
   .fontSize(9.5)
   .fillColor(TEXT_MUTED)
   .text('O banco de dados foi projetado em conformidade com as regras ACID e organizado nos seguintes módulos temáticos:');

doc.moveDown(1);

const sections = [
  { num: '00', title: 'Extensões PostgreSQL', desc: 'uuid-ossp e pgcrypto para criptografia e identificadores globais.' },
  { num: '01', title: 'Usuários, Perfis e Autenticação', desc: 'public.usuarios e public.profiles com triggers automáticos ao cadastrar.' },
  { num: '02', title: 'Planos de Assinatura & Alunos', desc: 'public.planos (Free, Pro, Ultra) e assinaturas ativas com histórico financeiro.' },
  { num: '03', title: 'Catálogo de Instrumentos', desc: 'public.instrumentos com afinações (Eb, Bb, C), famílias e professores.' },
  { num: '04', title: 'Cursos, Aulas & Progresso', desc: 'public.cursos, public.aulas e acompanhamento individual lesson_progress.' },
  { num: '05', title: 'Biblioteca de Partituras & Favoritos', desc: 'public.partituras com arranjos, cifras, playalongs e favoritos_partituras.' },
  { num: '06', title: 'Estúdio Virtual & Gravações', desc: 'public.practice_logs para salvar áudios, afinação e BPM de estudo.' },
  { num: '07', title: 'Mural da Comunidade Musical', desc: 'public.community_posts, likes e relacionamentos entre alunos.' },
  { num: '08', title: 'Loja Tutti & Pedidos', desc: 'public.produtos_loja, cupons de desconto e pedidos de instrumentos/acessórios.' },
  { num: '09', title: 'Masterclasses ao Vivo & RSVPs', desc: 'public.masterclasses e controle de presença em workshops.' },
  { num: '10', title: 'Views Consolidadas & Ranking', desc: 'v_servicos_destaque e v_ranking_alunos ordenado por XP e constância.' },
  { num: '11', title: 'Segurança & Row Level Security (RLS)', desc: '25 políticas restritivas por usuário autenticado e permissões públicas.' },
  { num: '12', title: 'Seeds & Dados Iniciais Oficiais', desc: 'Carga de planos, instrumentos, partituras clássicas e materiais didáticos.' },
  { num: '13', title: 'Gestão Multi-Ambiente (Dev, Prof, Aluno)', desc: 'solicitacoes_professores, marcacoes_aulas (com Google Meet) e auditoria.' }
];

sections.forEach(s => {
  doc.rect(40, doc.y, doc.page.width - 80, 24).fill('#F1F5F9');
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor(GOLD).text(`[ ${s.num} ]  ${s.title}`, 48, doc.y + 6, { continued: true });
  doc.font('Helvetica').fontSize(8.5).fillColor(TEXT_DARK).text(` — ${s.desc}`);
  doc.moveDown(0.7);
});

// Next pages: Full SQL Script Listing
doc.addPage();
renderHeader();

doc.font('Helvetica-Bold')
   .fontSize(14)
   .fillColor(TEXT_DARK)
   .text('Código SQL Completo (PostgreSQL DDL & DML)', 40, doc.y);

doc.moveDown(0.3);
doc.font('Helvetica')
   .fontSize(8.5)
   .fillColor(TEXT_MUTED)
   .text('Este código pode ser executado diretamente no SQL Editor do Supabase para criar todo o banco.');

doc.moveDown(0.8);

// Split SQL content into lines
const lines = sqlContent.split('\n');
const startY = doc.y;

doc.font('Courier').fontSize(7.5);

lines.forEach((line, index) => {
  // Check if page end reached
  if (doc.y > doc.page.height - 45) {
    doc.addPage();
    renderHeader();
    doc.font('Courier').fontSize(7.5);
  }

  // Format line styling
  const trimmed = line.trim();
  const lineNum = String(index + 1).padStart(3, ' ');

  if (trimmed.startsWith('-- ======================')) {
    doc.moveDown(0.4);
    doc.font('Courier-Bold').fillColor(GOLD).text(`${lineNum}  ${line}`);
    doc.font('Courier').fontSize(7.5);
  } else if (trimmed.startsWith('--')) {
    doc.font('Courier-Oblique').fillColor('#64748B').text(`${lineNum}  ${line}`);
    doc.font('Courier').fontSize(7.5);
  } else if (trimmed.startsWith('CREATE TABLE') || trimmed.startsWith('CREATE OR REPLACE VIEW') || trimmed.startsWith('CREATE POLICY') || trimmed.startsWith('ALTER TABLE')) {
    doc.font('Courier-Bold').fillColor('#0284C7').text(`${lineNum}  ${line}`);
    doc.font('Courier').fontSize(7.5);
  } else if (trimmed.startsWith('INSERT INTO')) {
    doc.font('Courier-Bold').fillColor('#059669').text(`${lineNum}  ${line}`);
    doc.font('Courier').fontSize(7.5);
  } else {
    doc.font('Courier').fillColor('#1E293B').text(`${lineNum}  ${line}`);
  }
});

// Add page numbering to all pages except cover
const totalPages = doc.bufferedPageRange().count;
for (let i = 1; i < totalPages; i++) {
  doc.switchToPage(i);
  doc.font('Helvetica')
     .fontSize(8)
     .fillColor(TEXT_MUTED)
     .text(`Página ${i + 1} de ${totalPages}  •  Tutti Escola de Música`, 40, doc.page.height - 25, {
       align: 'center'
     });
}

doc.end();

writeStream.on('finish', () => {
  const stats = fs.statSync(outputPdfPath);
  console.log(`PDF created successfully! Size: ${(stats.size / 1024).toFixed(1)} KB, Total pages: ${totalPages}`);
});
