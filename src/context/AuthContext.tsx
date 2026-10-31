import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, SUPABASE_PROJECT_ID } from '../lib/supabase';

export type UserRole = 'desenvolvedor' | 'professor' | 'aluno' | 'admin' | 'teacher' | 'student';
export type ApprovalStatus = 'pendente' | 'aprovado' | 'rejeitado';

export interface UserProfileData {
  id: string; // auth.users UUID
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'desenvolvedor' | 'professor' | 'aluno';
  approvalStatus?: ApprovalStatus;
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
  status: ApprovalStatus;
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
  loginWithEmail: (email: string, pass: string) => Promise<{ data?: any; error: any }>;
  signUpWithEmail: (email: string, pass: string, name: string, requestedRole?: 'aluno' | 'professor') => Promise<{ data?: any; error: any }>;
  loginAsRole: (role: 'desenvolvedor' | 'professor' | 'aluno', approvalStatus?: ApprovalStatus) => Promise<void>;
  loginAsDemoStudent: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any; message?: string }>;
  logout: () => Promise<void>;
  updateProfileData: (data: Partial<UserProfileData>) => Promise<void>;
  addXp: (amount: number) => Promise<void>;
  savePracticeAudio: (instrument: string, durationSeconds: number, audioDataUrl: string, notes?: string) => Promise<void>;
  saveLessonProgressToDb: (lessonId: string, instrumentId: string, completedTasks: string[]) => Promise<void>;
  rsvpMasterclassInDb: (masterclassId: number, title: string) => Promise<void>;
  createOrderInDb: (orderData: any) => Promise<string>;
  solicitarCadastroProfessor: (nome: string, email: string, instrumento: string, bio?: string) => Promise<{ error: any }>;
  aprovarProfessor: (solicitacaoId: string, professorUserId: string) => Promise<{ error: any }>;
  rejeitarProfessor: (solicitacaoId: string, professorUserId: string) => Promise<{ error: any }>;
  criarMarcacaoAula: (marcacao: Omit<LessonBooking, 'id' | 'created_at'>) => Promise<{ error: any; data?: any }>;
  cancelarMarcacaoAula: (marcacaoId: string) => Promise<{ error: any }>;
  registrarEventoAcesso: (tipo: string, detalhes?: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// Normalize role from database or legacy string
export function normalizeRole(roleString?: string | null, email?: string | null): 'desenvolvedor' | 'professor' | 'aluno' {
  if (email === 'eliandrolucas.EL@gmail.com') return 'desenvolvedor';
  if (!roleString) return 'aluno';
  const lower = roleString.toLowerCase();
  if (lower === 'desenvolvedor' || lower === 'admin') return 'desenvolvedor';
  if (lower === 'professor' || lower === 'teacher') return 'professor';
  return 'aluno';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Active role computed from profile
  const activeRole: 'desenvolvedor' | 'professor' | 'aluno' = profile?.role || 'aluno';

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
   * Load user profile prioritizing public.usuarios (with fallback to public.profiles)
   */
  const loadProfile = async (authUser: User) => {
    const initialName =
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.display_name ||
      authUser.email?.split('@')[0] ||
      'Músico Tutti';

    const defaultCalculatedRole = normalizeRole(authUser.user_metadata?.role, authUser.email);
    const initialApproval: ApprovalStatus = authUser.user_metadata?.approval_status || (defaultCalculatedRole === 'professor' ? 'aprovado' : 'aprovado');

    setProfile(prev => prev || {
      id: authUser.id,
      email: authUser.email || '',
      displayName: initialName,
      photoURL: authUser.user_metadata?.avatar_url,
      role: defaultCalculatedRole,
      approvalStatus: initialApproval,
      currentInstrument: authUser.user_metadata?.instrument || 'Saxofone Alto',
      level: 'Intermediário',
      streakDays: 14,
      xp: 450,
      practiceHours: 26,
      completedLessons: 8,
      bio: 'Estudando no Tutti Escola de Música 🎶'
    });

    try {
      // 1. Try public.usuarios table
      const { data: usuarioData, error: usuarioErr } = await supabase
        .from('usuarios')
        .select('*')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (usuarioData && !usuarioErr) {
        const userRole = normalizeRole(usuarioData.role, authUser.email);
        const approval = (usuarioData.approval_status as ApprovalStatus) || (userRole === 'professor' ? 'aprovado' : 'aprovado');

        setProfile({
          id: authUser.id,
          email: authUser.email || '',
          displayName:
            usuarioData.nome_completo ||
            usuarioData.display_name ||
            initialName,
          photoURL: usuarioData.avatar_url || usuarioData.photo_url || authUser.user_metadata?.avatar_url,
          role: userRole,
          approvalStatus: approval,
          telefone: usuarioData.telefone || '',
          currentInstrument: usuarioData.current_instrument || 'Saxofone Alto',
          level: usuarioData.level || 'Intermediário',
          streakDays: usuarioData.streak_days ?? 14,
          xp: usuarioData.xp ?? 450,
          practiceHours: usuarioData.practice_hours ?? 26,
          completedLessons: usuarioData.completed_lessons ?? 8,
          bio: usuarioData.bio || 'Estudando no Tutti Escola de Música 🎶'
        });
        return;
      }

      // 2. Fallback to public.profiles table
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profileData) {
        const userRole = normalizeRole(profileData.role, authUser.email);
        setProfile({
          id: profileData.id,
          email: profileData.email || authUser.email || '',
          displayName:
            profileData.display_name ||
            profileData.nome_completo ||
            initialName,
          photoURL: profileData.photo_url || profileData.avatar_url || authUser.user_metadata?.avatar_url,
          role: userRole,
          approvalStatus: (profileData.approval_status as ApprovalStatus) || 'aprovado',
          telefone: profileData.telefone || '',
          currentInstrument: profileData.current_instrument || 'Saxofone Alto',
          level: profileData.level || 'Intermediário',
          streakDays: profileData.streak_days ?? 14,
          xp: profileData.xp ?? 450,
          practiceHours: profileData.practice_hours ?? 26,
          completedLessons: profileData.completed_lessons ?? 8,
          bio: profileData.bio || 'Estudando no Tutti Escola de Música 🎶'
        });
        return;
      }
    } catch (err) {
      console.warn('Profile sync note (Supabase):', err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Check active session from Supabase (persisted in localStorage)
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!isMounted) return;
      if (error) {
        console.warn('Supabase session load error:', error);
      }
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        loadProfile(currentUser);
      } else {
        // Check if demo user was saved
        const savedDemo = localStorage.getItem('tutti_demo_role');
        if (savedDemo) {
          const role = savedDemo as 'desenvolvedor' | 'professor' | 'aluno';
          const approval = (localStorage.getItem('tutti_demo_approval') as ApprovalStatus) || 'aprovado';
          applyLocalDemoUser(role, approval);
        } else {
          setProfile(null);
        }
      }
    }).catch(err => {
      console.warn('Supabase getSession exception:', err);
      if (isMounted) setLoading(false);
    });

    // Subscribe to auth state changes
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        loadProfile(currentUser);
      } else {
        const savedDemo = localStorage.getItem('tutti_demo_role');
        if (!savedDemo) {
          setProfile(null);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loginWithGoogle = async () => {
    try {
      const oauthUrl = `https://viwxalwpvuvgcyxsdjbi.supabase.co/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(window.location.origin)}`;
      try {
        const checkResp = await fetch(oauthUrl, { method: 'HEAD' });
        if (checkResp.status === 400) {
          throw new Error('Unsupported provider: provider is not enabled');
        }
      } catch (checkErr: any) {
        if (checkErr.message?.includes('provider is not enabled')) {
          throw checkErr;
        }
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
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
      localStorage.removeItem('tutti_demo_role');
      localStorage.removeItem('tutti_demo_approval');
      const res = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass });
      if (!res.error && res.data.user) {
        setUser(res.data.user);
        await loadProfile(res.data.user);
        await registrarEventoAcesso('login_sucesso', { email: res.data.user.email });
      } else if (res.error) {
        await registrarEventoAcesso('login_falha', { email, error: res.error.message });
      }
      return res;
    } catch (err: any) {
      return { data: { user: null, session: null }, error: err };
    }
  };

  const signUpWithEmail = async (
    email: string,
    pass: string,
    name: string,
    requestedRole: 'aluno' | 'professor' = 'aluno'
  ) => {
    const cleanName = name.trim() || 'Músico Tutti';
    const isProfessor = requestedRole === 'professor';

    try {
      const res = await supabase.auth.signUp({
        email: email.trim(),
        password: pass,
        options: {
          data: {
            full_name: cleanName,
            display_name: cleanName,
            name: cleanName,
            role: requestedRole,
            approval_status: isProfessor ? 'pendente' : 'aprovado'
          }
        }
      });

      if (!res.error && res.data.user) {
        // Also register in solicitacoes_professores if professor was requested
        if (isProfessor) {
          try {
            await supabase.from('solicitacoes_professores').insert({
              user_id: res.data.user.id,
              nome: cleanName,
              email: email.trim(),
              instrumento: 'Saxofone / Madeiras',
              status: 'pendente',
              created_at: new Date().toISOString()
            });
          } catch (e) {
            console.debug('Error registering teacher request:', e);
          }
        }

        if (res.data.session) {
          setUser(res.data.user);
          await loadProfile(res.data.user);
        }
        await registrarEventoAcesso('cadastro_usuario', { email, role: requestedRole });
      }
      return res;
    } catch (err: any) {
      return { data: { user: null, session: null }, error: err };
    }
  };

  const applyLocalDemoUser = (role: 'desenvolvedor' | 'professor' | 'aluno', approvalStatus: ApprovalStatus = 'aprovado') => {
    const demoConfigs = {
      desenvolvedor: {
        id: 'dev-admin-tutti-id',
        email: 'desenvolvedor@tutti.mus.br',
        displayName: 'Lucas Maestro (Desenvolvedor & Admin)',
        photoURL: '/assets/instruments/alto_sax.jpg',
        role: 'desenvolvedor' as const,
        approvalStatus: 'aprovado' as const,
        bio: 'Arquiteto de Software, Maestro e Administrador Geral da Tutti Escola de Música 🎼'
      },
      professor: {
        id: 'prof-clara-tutti-id',
        email: 'professora.clara@tutti.mus.br',
        displayName: 'Profª Clara Vasconcelos',
        photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        role: 'professor' as const,
        approvalStatus: approvalStatus,
        bio: 'Docente de Saxofone Tenor, Flauta Transversal e Improvisação Brasileira 🎷'
      },
      aluno: {
        id: 'aluno-rafael-tutti-id',
        email: 'rafael.aluno@tutti.mus.br',
        displayName: 'Rafael Drumond',
        photoURL: '',
        role: 'aluno' as const,
        approvalStatus: 'aprovado' as const,
        bio: 'Estudando Saxofone Alto e Harmonia de Bossa Nova no Tutti Escola de Música 🎶'
      }
    };

    const cfg = demoConfigs[role];
    const demoUser: any = {
      id: cfg.id,
      email: cfg.email,
      user_metadata: {
        full_name: cfg.displayName,
        role: cfg.role,
        approval_status: cfg.approvalStatus
      }
    };

    setUser(demoUser);
    setProfile({
      id: cfg.id,
      email: cfg.email,
      displayName: cfg.displayName,
      photoURL: cfg.photoURL,
      role: cfg.role,
      approvalStatus: cfg.approvalStatus,
      currentInstrument: 'Saxofone Alto',
      level: 'Intermediário',
      streakDays: 14,
      xp: 450,
      practiceHours: 26,
      completedLessons: 8,
      bio: cfg.bio
    });
  };

  /**
   * Fast 1-Click Login for each environment (Desenvolvedor, Professor, Aluno)
   */
  const loginAsRole = async (role: 'desenvolvedor' | 'professor' | 'aluno', approvalStatus: ApprovalStatus = 'aprovado') => {
    localStorage.setItem('tutti_demo_role', role);
    localStorage.setItem('tutti_demo_approval', approvalStatus);
    applyLocalDemoUser(role, approvalStatus);
    await registrarEventoAcesso('login_demo_perfil', { role, approvalStatus });
  };

  const loginAsDemoStudent = async () => {
    await loginAsRole('aluno', 'aprovado');
  };

  const resetPassword = async (email: string) => {
    try {
      const res = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/perfil`
      });
      return res;
    } catch (err: any) {
      return { error: err };
    }
  };

  const logout = async () => {
    try {
      await registrarEventoAcesso('logout_usuario', { email: user?.email, role: profile?.role });
      localStorage.removeItem('tutti_demo_role');
      localStorage.removeItem('tutti_demo_approval');
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

  // Solicitar cadastro como professor
  const solicitarCadastroProfessor = async (nome: string, email: string, instrumento: string, bio?: string) => {
    try {
      const res = await supabase.from('solicitacoes_professores').insert({
        user_id: user?.id || 'anonimo',
        nome,
        email,
        instrumento,
        bio,
        status: 'pendente',
        created_at: new Date().toISOString()
      });
      await registrarEventoAcesso('solicitacao_professor_criada', { email, instrumento });
      return { error: res.error };
    } catch (error) {
      return { error };
    }
  };

  // Aprovar professor (ação exclusiva de Desenvolvedor / Admin)
  const aprovarProfessor = async (solicitacaoId: string, professorUserId: string) => {
    try {
      // 1. Atualiza a solicitação
      const { error: err1 } = await supabase
        .from('solicitacoes_professores')
        .update({
          status: 'aprovado',
          decided_at: new Date().toISOString(),
          decided_by: user?.email || 'Desenvolvedor'
        })
        .eq('id', solicitacaoId);

      // 2. Atualiza a tabela usuarios
      if (professorUserId && professorUserId !== 'anonimo') {
        await supabase
          .from('usuarios')
          .update({
            role: 'teacher',
            approval_status: 'aprovado',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', professorUserId);
      }

      await registrarEventoAcesso('professor_aprovado', { solicitacaoId, professorUserId });
      return { error: err1 };
    } catch (error) {
      return { error };
    }
  };

  // Rejeitar professor (ação exclusiva de Desenvolvedor / Admin)
  const rejeitarProfessor = async (solicitacaoId: string, professorUserId: string) => {
    try {
      const { error } = await supabase
        .from('solicitacoes_professores')
        .update({
          status: 'rejeitado',
          decided_at: new Date().toISOString(),
          decided_by: user?.email || 'Desenvolvedor'
        })
        .eq('id', solicitacaoId);

      if (professorUserId && professorUserId !== 'anonimo') {
        await supabase
          .from('usuarios')
          .update({
            role: 'student',
            approval_status: 'rejeitado',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', professorUserId);
      }

      await registrarEventoAcesso('professor_rejeitado', { solicitacaoId, professorUserId });
      return { error };
    } catch (error) {
      return { error };
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
        loginAsRole,
        loginAsDemoStudent,
        resetPassword,
        logout,
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
        registrarEventoAcesso
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
