import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, SUPABASE_PROJECT_ID } from '../lib/supabase';

export type UserRole = 'desenvolvedor' | 'professor' | 'aluno' | 'admin' | 'teacher' | 'student';
export type ApprovalStatus = 'nao_solicitado' | 'pendente' | 'aprovado' | 'rejeitado';

export interface UserProfileData {
  id: string; // auth.users UUID
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'desenvolvedor' | 'professor' | 'aluno';
  approvalStatus: ApprovalStatus;
  telefone?: string;
  currentInstrument: string;
  level: 'Iniciante' | 'Intermediário' | 'Avançado';
  streakDays: number;
  xp: number;
  practiceHours: number;
  completedLessons: number;
  bio: string;
}

export interface TeacherRequest {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  instrumento: string;
  bio?: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  created_at: string;
  decided_at?: string;
  decided_by?: string;
}

export interface LessonBooking {
  id: string;
  aluno_id?: string;
  aluno_nome: string;
  aluno_email: string;
  aluno_telefone?: string;
  professor_id?: string;
  professor_nome: string;
  professor_email?: string;
  data_aula: string;
  hora_inicio: string;
  duracao_minutos: number;
  status: 'agendada' | 'realizada' | 'cancelada';
  observacoes?: string;
  link_meet?: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfileData | null;
  loading: boolean;
  isAuthenticated: boolean;
  projectId: string;
  activeRole: 'desenvolvedor' | 'professor' | 'aluno';
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<{ data?: any; error: any; profile?: UserProfileData | null }>;
  signUpWithEmail: (
    email: string,
    pass: string,
    name: string,
    requestedRole?: 'aluno' | 'professor',
    extraData?: { instrumento?: string; bio?: string }
  ) => Promise<{ data?: any; error: any }>;
  resetPassword: (email: string) => Promise<{ error: any; message?: string }>;
  resendConfirmationEmail: (email: string) => Promise<{ error: any }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<UserProfileData | null>;
  updateProfileData: (data: Partial<UserProfileData>) => Promise<void>;
  addXp: (amount: number) => Promise<void>;
  savePracticeAudio: (instrument: string, durationSeconds: number, audioDataUrl: string, notes?: string) => Promise<void>;
  saveLessonProgressToDb: (lessonId: string, instrumentId: string, completedTasks: string[]) => Promise<void>;
  rsvpMasterclassInDb: (masterclassId: number, title: string) => Promise<void>;
  createOrderInDb: (orderData: any) => Promise<string>;
  solicitarCadastroProfessor: (nome: string, email: string, instrumento: string, bio?: string) => Promise<{ error: any }>;
  aprovarProfessor: (solicitacaoId: string, professorUserId?: string) => Promise<{ error: any; data?: any }>;
  rejeitarProfessor: (solicitacaoId: string, professorUserId?: string) => Promise<{ error: any; data?: any }>;
  criarMarcacaoAula: (marcacao: Omit<LessonBooking, 'id' | 'created_at'>) => Promise<{ error: any; data?: any }>;
  cancelarMarcacaoAula: (marcacaoId: string) => Promise<{ error: any }>;
  registrarEventoAcesso: (tipo: string, detalhes?: any) => Promise<void>;
  backendPlan: 'free' | 'pro' | 'ultra';
  hasActiveSubscription: boolean;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// Authorized developer emails verified against backend rules
export const AUTHORIZED_DEVELOPER_EMAILS = [
  'eliandrolucas.el@gmail.com',
  'eliandrolucas.EL@gmail.com'.toLowerCase(),
  'desenvolvedor@tutti.mus.br'
];

export function isAuthorizedDeveloperEmail(email?: string | null): boolean {
  if (!email) return false;
  return AUTHORIZED_DEVELOPER_EMAILS.includes(email.trim().toLowerCase());
}

// Normalize role strictly: developer privilege CANNOT be self-granted via client metadata
export function normalizeRole(roleString?: string | null, email?: string | null): 'desenvolvedor' | 'professor' | 'aluno' {
  if (isAuthorizedDeveloperEmail(email)) return 'desenvolvedor';
  if (!roleString) return 'aluno';
  const lower = roleString.toLowerCase();
  // Role 'desenvolvedor' or 'admin' is strictly forbidden unless authorized by email/database
  if (lower === 'desenvolvedor' || lower === 'admin') {
    if (isAuthorizedDeveloperEmail(email)) return 'desenvolvedor';
    return 'aluno'; // blocked self-elevation attempt
  }
  if (lower === 'professor' || lower === 'teacher') return 'professor';
  return 'aluno';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendPlan, setBackendPlan] = useState<'free' | 'pro' | 'ultra'>('free');
  const [hasActiveSubscription, setHasActiveSubscription] = useState<boolean>(false);

  // Active role computed from profile
  const activeRole: 'desenvolvedor' | 'professor' | 'aluno' = profile?.role || 'aluno';

  /**
   * Sincronizar assinatura real do backend Supabase
   */
  const syncSubscription = async (authUser: User | null) => {
    if (!authUser) {
      setBackendPlan('free');
      setHasActiveSubscription(false);
      return;
    }

    if (isAuthorizedDeveloperEmail(authUser.email)) {
      setBackendPlan('ultra');
      setHasActiveSubscription(true);
      return;
    }

    try {
      const { data: sub, error } = await supabase
        .from('assinaturas_usuarios')
        .select('plano_id, status, data_fim')
        .eq('user_id', authUser.id)
        .eq('status', 'ativo')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && sub) {
        const isNotExpired = !sub.data_fim || new Date(sub.data_fim) >= new Date();
        if (isNotExpired) {
          const pId = sub.plano_id?.toLowerCase();
          if (pId === 'ultra' || pId === 'mensal' || pId === 'trimestral' || pId === 'semestral') {
            setBackendPlan('ultra');
          } else if (pId === 'pro') {
            setBackendPlan('pro');
          } else {
            setBackendPlan('free');
          }
          setHasActiveSubscription(true);
          return;
        }
      }

      setBackendPlan('free');
      setHasActiveSubscription(false);
    } catch (e) {
      console.warn('Subscription sync notice:', e);
      setBackendPlan('free');
      setHasActiveSubscription(false);
    }
  };

  /**
   * Log Access Events in Supabase (tabela eventos_acesso)
   */
  const registrarEventoAcesso = async (tipo: string, detalhes: any = {}) => {
    try {
      await supabase.from('eventos_acesso').insert({
        user_id: user?.id || 'anonimo',
        perfil: profile?.role || 'visitante',
        tipo_evento: tipo,
        detalhes: detalhes,
        created_at: new Date().toISOString()
      });
    } catch (e) {
      // Non-blocking log
      console.debug('Log access event notice:', e);
    }
  };

  /**
   * Carrega o perfil exclusivamente a partir do banco de dados (public.usuarios / public.profiles / solicitacoes_professores).
   * NUNCA utiliza user_metadata editável pelo cliente como fonte de autorização de role ou aprovação.
   */
  const loadProfile = async (authUser: User): Promise<UserProfileData> => {
    const cleanEmail = (authUser.email || '').trim().toLowerCase();
    const initialName =
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.display_name ||
      cleanEmail.split('@')[0] ||
      'Músico Tutti';

    const fallbackProfile: UserProfileData = {
      id: authUser.id,
      email: cleanEmail,
      displayName: initialName,
      photoURL: authUser.user_metadata?.avatar_url,
      role: isAuthorizedDeveloperEmail(cleanEmail) ? 'desenvolvedor' : 'aluno',
      approvalStatus: isAuthorizedDeveloperEmail(cleanEmail) ? 'aprovado' : 'nao_solicitado',
      currentInstrument: authUser.user_metadata?.instrumento || 'Saxofone Alto',
      level: 'Intermediário',
      streakDays: 0,
      xp: 0,
      practiceHours: 0,
      completedLessons: 0,
      bio: authUser.user_metadata?.bio || 'Estudando no Tutti Escola de Música 🎶'
    };

    try {
      const [usuarioRes, profileRes, solicitacaoRes] = await Promise.all([
        supabase
          .from('usuarios')
          .select('*')
          .eq('user_id', authUser.id)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle(),
        cleanEmail
          ? supabase
              .from('solicitacoes_professores')
              .select('id, status, instrumento, bio, created_at')
              .or(`user_id.eq.${authUser.id},email.eq.${cleanEmail}`)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
          : supabase
              .from('solicitacoes_professores')
              .select('id, status, instrumento, bio, created_at')
              .eq('user_id', authUser.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
      ]);

      const usuarioData = !usuarioRes.error ? usuarioRes.data : null;
      const profileData = !profileRes.error ? profileRes.data : null;
      const solicitacaoData = !solicitacaoRes.error ? solicitacaoRes.data : null;

      const dbSource = usuarioData || profileData;

      let resolvedRole: 'desenvolvedor' | 'professor' | 'aluno' = 'aluno';
      let resolvedApproval: ApprovalStatus = 'nao_solicitado';

      if (isAuthorizedDeveloperEmail(cleanEmail)) {
        resolvedRole = 'desenvolvedor';
        resolvedApproval = 'aprovado';
      } else {
        const rawDbRole = normalizeRole(dbSource?.role, cleanEmail);
        const rawDbApproval = (dbSource?.approval_status as ApprovalStatus | undefined) || undefined;
        const latestReqStatus = solicitacaoData?.status as ('pendente' | 'aprovado' | 'rejeitado' | undefined);

        if (rawDbRole === 'professor' && (rawDbApproval === 'aprovado' || latestReqStatus === 'aprovado' || !rawDbApproval)) {
          resolvedRole = 'professor';
          resolvedApproval = 'aprovado';
        } else if (rawDbApproval === 'pendente' || latestReqStatus === 'pendente') {
          // Segurança: enquanto pendente, o usuário permanece com role = 'aluno'
          resolvedRole = 'aluno';
          resolvedApproval = 'pendente';
        } else if (rawDbApproval === 'rejeitado' || latestReqStatus === 'rejeitado') {
          resolvedRole = 'aluno';
          resolvedApproval = 'rejeitado';
        } else {
          resolvedRole = 'aluno';
          resolvedApproval = rawDbApproval || 'aprovado';
        }
      }

      const resolved: UserProfileData = {
        id: authUser.id,
        email: dbSource?.email || cleanEmail,
        displayName:
          usuarioData?.nome_completo ||
          profileData?.display_name ||
          initialName,
        photoURL:
          usuarioData?.avatar_url ||
          profileData?.photo_url ||
          authUser.user_metadata?.avatar_url,
        role: resolvedRole,
        approvalStatus: resolvedApproval,
        telefone: dbSource?.telefone || '',
        currentInstrument:
          usuarioData?.current_instrument ||
          usuarioData?.instrumento_principal ||
          profileData?.current_instrument ||
          solicitacaoData?.instrumento ||
          'Saxofone Alto',
        level: dbSource?.level || 'Intermediário',
        streakDays: dbSource?.streak_days ?? 0,
        xp: dbSource?.xp ?? 0,
        practiceHours: dbSource?.practice_hours ?? 0,
        completedLessons: dbSource?.completed_lessons ?? 0,
        bio:
          dbSource?.bio ||
          solicitacaoData?.bio ||
          'Estudando no Tutti Escola de Música 🎶'
      };

      setProfile(resolved);
      return resolved;
    } catch (err) {
      console.warn('Profile sync note (Supabase):', err);
      setProfile(fallbackProfile);
      return fallbackProfile;
    }
  };

  const refreshProfile = async (): Promise<UserProfileData | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const targetUser = session?.user || user;
      if (!targetUser) {
        setProfile(null);
        return null;
      }
      setUser(targetUser);
      const updated = await loadProfile(targetUser);
      await syncSubscription(targetUser);
      return updated;
    } catch (err) {
      console.warn('refreshProfile error:', err);
      return null;
    }
  };

  // Trigger welcome email in backend only after user email is confirmed (idempotent in DB)
  const triggerWelcomeEmailIfConfirmed = async (session: any) => {
    try {
      const currentUser = session?.user;
      if (!currentUser?.id || !currentUser?.email_confirmed_at || !session?.access_token) return;
      const cacheKey = `tutti_welcome_sent_${currentUser.id}`;
      if (typeof window !== 'undefined' && window.localStorage.getItem(cacheKey) === '1') {
        return;
      }

      const nome =
        currentUser.user_metadata?.full_name ||
        currentUser.user_metadata?.display_name ||
        currentUser.email?.split('@')[0] ||
        'Aluno(a)';
      const platformUrl = typeof window !== 'undefined' ? window.location.origin : undefined;

      let dispatched = false;
      try {
        const res = await fetch('/api/emails/welcome', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ nome, platformUrl }),
        });
        const json = await res.json().catch(() => ({}));
        if (json?.sent || json?.alreadySent) {
          dispatched = true;
        }
      } catch {
        // Fallback to Edge Function when running without local Express server
        try {
          const { data } = await supabase.functions.invoke('send-welcome-email', {
            body: { nome, platformUrl },
          });
          if (data?.sent || data?.alreadySent) {
            dispatched = true;
          }
        } catch (edgeErr) {
          console.debug('Welcome email Edge Function note:', edgeErr);
        }
      }

      if (dispatched && typeof window !== 'undefined') {
        window.localStorage.setItem(cacheKey, '1');
      }
    } catch (err) {
      console.debug('Welcome email check skipped:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const hydrateSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!isMounted) return;
        if (error) {
          console.warn('Supabase session load error:', error);
        }
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          await Promise.all([
            loadProfile(currentUser),
            syncSubscription(currentUser),
          ]);
          triggerWelcomeEmailIfConfirmed(session);
        } else {
          setProfile(null);
          await syncSubscription(null);
        }
      } catch (err) {
        console.warn('Supabase getSession exception:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    hydrateSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await Promise.all([
          loadProfile(currentUser),
          syncSubscription(currentUser),
        ]);
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
          triggerWelcomeEmailIfConfirmed(session);
        }
      } else {
        setProfile(null);
        await syncSubscription(null);
      }
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Realtime: revalida automaticamente permissões caso o Desenvolvedor aprove ou rejeite enquanto o usuário estiver logado
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`auth-profile-sync-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'usuarios', filter: `user_id=eq.${user.id}` },
        () => {
          loadProfile(user);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'solicitacoes_professores', filter: `user_id=eq.${user.id}` },
        () => {
          loadProfile(user);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loginWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`
        }
      });
      if (error) throw error;
      await registrarEventoAcesso('login_google_iniciado');
    } catch (error) {
      console.error('Supabase Google OAuth Error:', error);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      const res = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass });
      if (!res.error && res.data.user) {
        setUser(res.data.user);
        const loadedProfile = await loadProfile(res.data.user);
        await syncSubscription(res.data.user);
        await registrarEventoAcesso('login_sucesso', { email: res.data.user.email, role: loadedProfile.role });
        return { ...res, profile: loadedProfile };
      } else if (res.error) {
        await registrarEventoAcesso('login_falha', { email, error: res.error.message });
      }
      return { ...res, profile: null };
    } catch (err: any) {
      return { data: { user: null, session: null }, error: err, profile: null };
    }
  };

  const signUpWithEmail = async (
    email: string,
    pass: string,
    name: string,
    requestedRole: 'aluno' | 'professor' = 'aluno',
    extraData?: { instrumento?: string; bio?: string }
  ) => {
    const cleanName = name.trim() || 'Músico Tutti';
    const cleanEmail = email.trim().toLowerCase();
    const isProfessor = requestedRole === 'professor';

    try {
      const emailRedirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth` : undefined;
      const metadataPayload = isProfessor
        ? {
            full_name: cleanName,
            account_type: 'teacher',
            instrumento: extraData?.instrumento || 'Saxofone Alto',
            bio: extraData?.bio || ''
          }
        : {
            full_name: cleanName,
            account_type: 'student'
          };

      const res = await supabase.auth.signUp({
        email: cleanEmail,
        password: pass,
        options: {
          emailRedirectTo,
          data: metadataPayload
        }
      });

      // Detectar caso em que o Supabase retorna user sem identities para e-mail já existente
      if (!res.error && res.data?.user && Array.isArray(res.data.user.identities) && res.data.user.identities.length === 0) {
        return {
          data: res.data,
          error: new Error('User already registered')
        };
      }

      if (!res.error && res.data.user) {
        // A criação em public.usuarios e public.solicitacoes_professores ocorre automaticamente
        // via trigger on_auth_user_created no backend Supabase (mesmo com session = null).
        if (res.data.session) {
          setUser(res.data.user);
          await loadProfile(res.data.user);
        }
        await registrarEventoAcesso('cadastro_usuario', { email: cleanEmail, account_type: metadataPayload.account_type });
      }
      return res;
    } catch (err: any) {
      return { data: { user: null, session: null }, error: err };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const res = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth`
      });
      return res;
    } catch (err: any) {
      return { error: err };
    }
  };

  const resendConfirmationEmail = async (email: string) => {
    try {
      const emailRedirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth` : undefined;
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: { emailRedirectTo },
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const logout = async () => {
    try {
      await registrarEventoAcesso('logout_usuario', { email: user?.email, role: profile?.role });
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Supabase signOut error:', error);
    } finally {
      setUser(null);
      setProfile(null);
    }
  };

  const updateProfileData = async (data: Partial<UserProfileData>) => {
    setProfile(prev => (prev ? { ...prev, ...data } : null));
    if (!user) return;

    try {
      const usuariosPayload: any = { updated_at: new Date().toISOString() };
      if (data.displayName !== undefined) usuariosPayload.nome_completo = data.displayName;
      if (data.bio !== undefined) usuariosPayload.bio = data.bio;
      if (data.photoURL !== undefined) usuariosPayload.avatar_url = data.photoURL;
      if (data.currentInstrument !== undefined) usuariosPayload.current_instrument = data.currentInstrument;
      if (data.level !== undefined) usuariosPayload.level = data.level;
      if (data.streakDays !== undefined) usuariosPayload.streak_days = data.streakDays;
      if (data.xp !== undefined) usuariosPayload.xp = data.xp;
      if (data.practiceHours !== undefined) usuariosPayload.practice_hours = data.practiceHours;
      if (data.completedLessons !== undefined) usuariosPayload.completed_lessons = data.completedLessons;
      if (data.telefone !== undefined) usuariosPayload.telefone = data.telefone;

      await supabase.from('usuarios').update(usuariosPayload).eq('user_id', user.id);
    } catch (err) {
      console.warn('Error updating profile in Supabase:', err);
    }
  };

  const addXp = async (amount: number) => {
    if (!profile) return;
    const newXp = (profile.xp || 0) + amount;
    const newCompleted = (profile.completedLessons || 0) + 1;
    await updateProfileData({ xp: newXp, completedLessons: newCompleted });
  };

  const savePracticeAudio = async (
    instrument: string,
    durationSeconds: number,
    audioDataUrl: string,
    notes = ''
  ) => {
    try {
      await supabase.from('practice_logs').insert({
        user_id: user ? user.id : 'guest',
        instrument,
        duration_seconds: durationSeconds,
        audio_data_url: audioDataUrl,
        notes,
        created_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Practice log save note (Supabase):', err);
    }
  };

  const saveLessonProgressToDb = async (lessonId: string, instrumentId: string, completedTasks: string[]) => {
    try {
      await supabase.from('lesson_progress').upsert(
        {
          user_id: user ? user.id : 'guest',
          lesson_id: lessonId,
          instrument_id: instrumentId,
          completed: completedTasks.length > 0,
          completed_tasks: completedTasks,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id,lesson_id' }
      );
    } catch (err) {
      console.warn('Lesson progress save note (Supabase):', err);
    }
  };

  const rsvpMasterclassInDb = async (masterclassId: number, title: string) => {
    try {
      await supabase.from('masterclass_rsvps').upsert(
        {
          user_id: user ? user.id : 'guest',
          masterclass_id: masterclassId,
          title,
          registered_at: new Date().toISOString()
        },
        { onConflict: 'user_id,masterclass_id' }
      );
    } catch (err) {
      console.warn('Masterclass RSVP save note (Supabase):', err);
    }
  };

  const createOrderInDb = async (orderData: any): Promise<string> => {
    const orderId = `TT-${Math.floor(10000 + Math.random() * 90000)}`;
    try {
      await supabase.from('orders').insert({
        id: orderId,
        user_id: user ? user.id : 'guest',
        user_email: user?.email || orderData.email || 'aluno@tutti.mus.br',
        items: orderData.items,
        subtotal: orderData.subtotal,
        discount: orderData.discount || 0,
        total: orderData.total,
        coupon: orderData.coupon || null,
        payment_method: orderData.paymentMethod,
        status: 'confirmed',
        shipping_address: orderData.shippingAddress || null,
        created_at: new Date().toISOString()
      });
      return orderId;
    } catch (err) {
      console.warn('Order save note (Supabase):', err);
      return orderId;
    }
  };

  // Solicitar cadastro como professor (com validação anti-duplicidade)
  const solicitarCadastroProfessor = async (nome: string, email: string, instrumento: string, bio?: string) => {
    try {
      const cleanEmail = email.trim().toLowerCase();

      // Verificar se já existe solicitação pendente
      const { data: existing } = await supabase
        .from('solicitacoes_professores')
        .select('id, status')
        .eq('email', cleanEmail)
        .eq('status', 'pendente')
        .maybeSingle();

      if (existing) {
        return {
          error: new Error('Já existe uma solicitação pendente para este e-mail. Aguarde a análise do Desenvolvedor.')
        };
      }

      const res = await supabase.from('solicitacoes_professores').insert({
        user_id: user?.id || 'anonimo',
        nome,
        email: cleanEmail,
        instrumento,
        bio,
        status: 'pendente',
        created_at: new Date().toISOString()
      });
      await registrarEventoAcesso('solicitacao_professor_criada', { email: cleanEmail, instrumento });
      return { error: res.error };
    } catch (error) {
      return { error };
    }
  };

  // Aprovar professor exclusivamente via RPC backend (SECURITY DEFINER + validação is_admin())
  const aprovarProfessor = async (solicitacaoId: string, professorUserId?: string) => {
    if (profile?.role !== 'desenvolvedor') {
      return { error: new Error('Acesso negado: apenas o Desenvolvedor autorizado pode aprovar professores.') };
    }

    try {
      const { data, error: rpcErr } = await supabase.rpc('tutti_decidir_solicitacao_professor', {
        p_solicitacao_id: solicitacaoId,
        p_aprovar: true
      });

      if (rpcErr) {
        return { error: rpcErr, data: null };
      }

      await registrarEventoAcesso('professor_aprovado_rpc', { solicitacaoId, professorUserId });
      return { error: null, data };
    } catch (error) {
      return { error, data: null };
    }
  };

  // Rejeitar professor exclusivamente via RPC backend (SECURITY DEFINER + validação is_admin())
  const rejeitarProfessor = async (solicitacaoId: string, professorUserId?: string) => {
    if (profile?.role !== 'desenvolvedor') {
      return { error: new Error('Acesso negado: apenas o Desenvolvedor autorizado pode rejeitar solicitações.') };
    }

    try {
      const { data, error: rpcErr } = await supabase.rpc('tutti_decidir_solicitacao_professor', {
        p_solicitacao_id: solicitacaoId,
        p_aprovar: false
      });

      if (rpcErr) {
        return { error: rpcErr, data: null };
      }

      await registrarEventoAcesso('professor_rejeitado_rpc', { solicitacaoId, professorUserId });
      return { error: null, data };
    } catch (error) {
      return { error, data: null };
    }
  };

  // Criar marcação de aula com verificação de conflito
  const criarMarcacaoAula = async (marcacao: Omit<LessonBooking, 'id' | 'created_at'>) => {
    try {
      // 1. Verificar conflito de horário para o mesmo professor no mesmo dia/hora
      const { data: conflitos } = await supabase
        .from('marcacoes_aulas')
        .select('id, data_aula, hora_inicio')
        .eq('professor_nome', marcacao.professor_nome)
        .eq('data_aula', marcacao.data_aula)
        .eq('hora_inicio', marcacao.hora_inicio)
        .neq('status', 'cancelada');

      if (conflitos && conflitos.length > 0) {
        return {
          error: new Error(`Conflito de agenda: o professor já possui aula marcada em ${marcacao.data_aula} às ${marcacao.hora_inicio}. Escolha outro horário.`)
        };
      }

      // 2. Inserir marcação
      const payload = {
        ...marcacao,
        status: 'agendada',
        link_meet: marcacao.link_meet || `https://meet.google.com/tut-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 5)}`,
        created_at: new Date().toISOString()
      };

      const res = await supabase.from('marcacoes_aulas').insert(payload).select().single();
      await registrarEventoAcesso('aula_marcada', { aluno: marcacao.aluno_nome, professor: marcacao.professor_nome, data: marcacao.data_aula });
      return { error: res.error, data: res.data };
    } catch (error) {
      return { error };
    }
  };

  // Cancelar marcação de aula
  const cancelarMarcacaoAula = async (marcacaoId: string) => {
    try {
      const res = await supabase
        .from('marcacoes_aulas')
        .update({ status: 'cancelada' })
        .eq('id', marcacaoId);
      await registrarEventoAcesso('aula_cancelada', { marcacaoId });
      return { error: res.error };
    } catch (error) {
      return { error };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAuthenticated: !!user,
        projectId: SUPABASE_PROJECT_ID,
        activeRole,
        loginWithGoogle,
        loginWithEmail,
        signUpWithEmail,
        resetPassword,
        resendConfirmationEmail,
        logout,
        refreshProfile,
        updateProfileData,
        addXp,
        savePracticeAudio,
        saveLessonProgressToDb,
        rsvpMasterclassInDb,
        createOrderInDb,
        solicitarCadastroProfessor,
        aprovarProfessor,
        rejeitarProfessor,
        criarMarcacaoAula,
        cancelarMarcacaoAula,
        registrarEventoAcesso,
        backendPlan,
        hasActiveSubscription,
        refreshSubscription: () => syncSubscription(user)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
