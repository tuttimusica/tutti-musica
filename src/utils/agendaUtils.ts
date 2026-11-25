export const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';

export interface SaoPauloNowParts {
  dateStr: string;
  hours: number;
  minutes: number;
  minutesOfDay: number;
  timestampMs: number;
}

export interface AgendaLessonLike {
  data_aula?: string | null;
  date?: string | null;
  hora_inicio?: string | null;
  time?: string | null;
  duracao_minutos?: number | null;
  status?: string | null;
}

const INACTIVE_STATUSES = new Set([
  'cancelada',
  'cancelado',
  'realizada',
  'concluida',
  'concluída',
  'finalizada',
  'encerrada',
  'ausente',
]);

export function getSaoPauloNowParts(now: Date = new Date()): SaoPauloNowParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: SAO_PAULO_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value;
    }
  }

  const year = map.year || '1970';
  const month = map.month || '01';
  const day = map.day || '01';
  const rawHour = Number(map.hour ?? 0);
  const hours = rawHour === 24 ? 0 : rawHour;
  const minutes = Number(map.minute ?? 0);

  return {
    dateStr: `${year}-${month}-${day}`,
    hours,
    minutes,
    minutesOfDay: hours * 60 + minutes,
    timestampMs: now.getTime(),
  };
}

export function normalizeLessonDateStr(rawDate?: string | null): string | null {
  if (!rawDate) return null;
  const trimmed = String(rawDate).trim();
  const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];

  const brMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  }
  return null;
}

export function parseTimeToMinutes(rawTime?: string | null): number {
  if (!rawTime) return 23 * 60 + 59;
  const match = String(rawTime).trim().match(/(\d{1,2}):(\d{2})/);
  if (!match) return 23 * 60 + 59;
  const h = Math.min(23, Math.max(0, Number(match[1])));
  const m = Math.min(59, Math.max(0, Number(match[2])));
  return h * 60 + m;
}

export function normalizeLessonStatus(status?: string | null): string {
  return String(status || 'agendada')
    .trim()
    .toLowerCase();
}

/**
 * Determina se a aula está ativa e futura ou em andamento segundo o fuso oficial America/Sao_Paulo.
 * Aulas canceladas, realizadas, concluídas ou com horário já encerrado são ocultadas.
 */
export function isLessonActiveOrUpcoming(
  lesson: AgendaLessonLike,
  now: Date = new Date()
): boolean {
  const status = normalizeLessonStatus(lesson.status);
  if (INACTIVE_STATUSES.has(status)) {
    return false;
  }

  const dateStr = normalizeLessonDateStr(lesson.data_aula ?? lesson.date);
  if (!dateStr) return false;

  const spNow = getSaoPauloNowParts(now);
  if (dateStr > spNow.dateStr) return true;
  if (dateStr < spNow.dateStr) return false;

  const startMinutes = parseTimeToMinutes(lesson.hora_inicio ?? lesson.time);
  const durationMinutes =
    typeof lesson.duracao_minutos === 'number' && lesson.duracao_minutos > 0
      ? lesson.duracao_minutos
      : 50;
  const endMinutes = startMinutes + durationMinutes;

  return spNow.minutesOfDay < endMinutes;
}

export function getLessonSortKey(lesson: AgendaLessonLike): string {
  const dateStr = normalizeLessonDateStr(lesson.data_aula ?? lesson.date) || '9999-99-99';
  const minutes = parseTimeToMinutes(lesson.hora_inicio ?? lesson.time);
  return `${dateStr}-${String(minutes).padStart(4, '0')}`;
}

export function filterActiveLessons<T extends AgendaLessonLike>(
  lessons: T[],
  now: Date = new Date()
): T[] {
  return lessons
    .filter((lesson) => isLessonActiveOrUpcoming(lesson, now))
    .sort((a, b) => getLessonSortKey(a).localeCompare(getLessonSortKey(b)));
}

export function isLessonInProgress(
  lesson: AgendaLessonLike,
  now: Date = new Date()
): boolean {
  if (!isLessonActiveOrUpcoming(lesson, now)) return false;
  const dateStr = normalizeLessonDateStr(lesson.data_aula ?? lesson.date);
  const spNow = getSaoPauloNowParts(now);
  if (!dateStr || dateStr !== spNow.dateStr) return false;

  const startMinutes = parseTimeToMinutes(lesson.hora_inicio ?? lesson.time);
  const durationMinutes =
    typeof lesson.duracao_minutos === 'number' && lesson.duracao_minutos > 0
      ? lesson.duracao_minutos
      : 50;

  return spNow.minutesOfDay >= startMinutes && spNow.minutesOfDay < startMinutes + durationMinutes;
}

export function getSaoPauloTodayDisplay(): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: SAO_PAULO_TIMEZONE,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date());
}