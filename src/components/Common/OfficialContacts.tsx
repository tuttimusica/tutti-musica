import React from 'react';
import { Phone, MessageCircle, ExternalLink } from 'lucide-react';

export const TUTTI_PHONE_DISPLAY = '(21) 92037-5422';
export const TUTTI_PHONE_E164 = '+5521920375422';
export const TUTTI_WHATSAPP_BASE = 'https://wa.me/5521920375422';
export const TUTTI_STUDENT_MENTION_TEXT = 'Mencionar aluno P/ (21) 92037-5422';
export const TUTTI_SECRETARY_TEXT = 'Falar com a secretaria P/ (21) 92037-5422';

export function buildTuttiWhatsAppUrl(message: string): string {
  return `${TUTTI_WHATSAPP_BASE}?text=${encodeURIComponent(message)}`;
}

interface OfficialContactsProps {
  compact?: boolean;
  className?: string;
}

export const OfficialContacts: React.FC<OfficialContactsProps> = ({
  compact = false,
  className = '',
}) => {
  const mentionUrl = buildTuttiWhatsAppUrl(
    'Olá! Gostaria de mencionar um aluno na Tutti Escola de Música.'
  );
  const secretaryUrl = buildTuttiWhatsAppUrl(
    'Olá! Gostaria de falar com a secretaria da Tutti Escola de Música.'
  );

  if (compact) {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        <a
          href={mentionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-colors"
        >
          <MessageCircle size={13} />
          <span>{TUTTI_STUDENT_MENTION_TEXT}</span>
        </a>
        <a
          href={secretaryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors"
        >
          <Phone size={13} />
          <span>{TUTTI_SECRETARY_TEXT}</span>
        </a>
      </div>
    );
  }

  return (
    <div className={`space-y-2.5 ${className}`}>
      <a
        href={mentionUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between gap-3 p-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 border border-cyan-500/25 text-xs font-semibold transition-colors"
      >
        <span className="flex items-center gap-2.5">
          <MessageCircle className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{TUTTI_STUDENT_MENTION_TEXT}</span>
        </span>
        <ExternalLink className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
      </a>

      <a
        href={secretaryUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between gap-3 p-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 border border-emerald-500/25 text-xs font-semibold transition-colors"
      >
        <span className="flex items-center gap-2.5">
          <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{TUTTI_SECRETARY_TEXT}</span>
        </span>
        <ExternalLink className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
      </a>

      <a
        href={`tel:${TUTTI_PHONE_E164}`}
        className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-medium transition-colors"
      >
        <Phone className="w-4 h-4 text-amber-400 shrink-0" />
        <span>Ligar diretamente: {TUTTI_PHONE_DISPLAY}</span>
      </a>
    </div>
  );
};
