import { createBrowserClient } from '@supabase/ssr';
import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from '../../lib/supabase';

const rawUrl =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  (typeof import.meta !== 'undefined' && (import.meta.env?.NEXT_PUBLIC_SUPABASE_URL || import.meta.env?.VITE_SUPABASE_URL)) ||
  DEFAULT_SUPABASE_URL;

const rawKey =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
  (typeof import.meta !== 'undefined' && (import.meta.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || import.meta.env?.VITE_SUPABASE_ANON_KEY)) ||
  DEFAULT_SUPABASE_ANON_KEY;

const supabaseUrl = typeof rawUrl === 'string' && rawUrl.startsWith('http') ? rawUrl : DEFAULT_SUPABASE_URL;
const supabaseKey = typeof rawKey === 'string' && rawKey.length > 15 && rawKey !== '123' ? rawKey : DEFAULT_SUPABASE_ANON_KEY;

export const createClient = () =>
  createBrowserClient(
    supabaseUrl,
    supabaseKey
  );
