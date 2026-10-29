import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, SUPABASE_PROJECT_ID } from '../lib/supabase';

export interface UserProfileData {
  id: string; // auth.users UUID
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'student' | 'teacher' | 'admin';
  currentInstrument: string;
  level: 'Iniciante' | 'Intermediário' | 'Avançado';
  streakDays: number;
  xp: number;
  practiceHours: number;
  completedLessons: number;
  bio: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfileData | null;
  loading: boolean;
  isAuthenticated: boolean;
  projectId: string;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<{ error: any }>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any; message?: string }>;
  logout: () => Promise<void>;
  updateProfileData: (data: Partial<UserProfileData>) => Promise<void>;
  addXp: (amount: number) => Promise<void>;
  savePracticeAudio: (instrument: string, durationSeconds: number, audioDataUrl: string, notes?: string) => Promise<void>;
  saveLessonProgressToDb: (lessonId: string, instrumentId: string, completedTasks: string[]) => Promise<void>;
  rsvpMasterclassInDb: (masterclassId: number, title: string) => Promise<void>;
  createOrderInDb: (orderData: any) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

const DEFAULT_PROFILE: UserProfileData = {
  id: 'guest',
  email: 'aluno@tutti.mus.br',
  displayName: 'Rafael Drumond',
  role: 'student',
  currentInstrument: 'Saxofone',
  level: 'Intermediário',
  streakDays: 14,
  xp: 450,
  practiceHours: 26,
  completedLessons: 8,
  bio: 'Estudando Saxofone Alto e Harmonia de Bossa Nova no Violão 🎶'
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Load user profile prioritizing public.usuarios (with fallback to public.profiles)
   */
  const loadProfile = async (authUser: User) => {
    try {
      // 1. Try public.usuarios table
      const { data: usuarioData, error: usuarioErr } = await supabase
        .from('usuarios')
        .select('*')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (usuarioData && !usuarioErr) {
        setProfile({
          id: authUser.id,
          email: authUser.email || '',
          displayName:
            usuarioData.nome_completo ||
            usuarioData.display_name ||
            authUser.user_metadata?.full_name ||
            authUser.email?.split('@')[0] ||
            'Músico Tutti',
          photoURL: usuarioData.avatar_url || usuarioData.photo_url || authUser.user_metadata?.avatar_url,
          role: (usuarioData.role as any) || (authUser.email === 'eliandrolucas.EL@gmail.com' ? 'admin' : 'student'),
          currentInstrument: usuarioData.current_instrument || 'Saxofone',
          level: usuarioData.level || 'Intermediário',
          streakDays: usuarioData.streak_days ?? 14,
          xp: usuarioData.xp ?? 450,
          practiceHours: usuarioData.practice_hours ?? 26,
          completedLessons: usuarioData.completed_lessons ?? 8,
          bio: usuarioData.bio || 'Estudando no Tutti Escola de Música 🎶'
        });
        return;
      }

      // 2. Fallback to public.profiles table if public.usuarios is not yet created
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profileData) {
        setProfile({
          id: profileData.id,
          email: profileData.email || authUser.email || '',
          displayName:
            profileData.display_name ||
            profileData.nome_completo ||
            authUser.user_metadata?.full_name ||
            authUser.email?.split('@')[0] ||
            'Músico Tutti',
          photoURL: profileData.photo_url || profileData.avatar_url || authUser.user_metadata?.avatar_url,
          role: (profileData.role as any) || (authUser.email === 'eliandrolucas.EL@gmail.com' ? 'admin' : 'student'),
          currentInstrument: profileData.current_instrument || 'Saxofone',
          level: profileData.level || 'Intermediário',
          streakDays: profileData.streak_days ?? 14,
          xp: profileData.xp ?? 450,
          practiceHours: profileData.practice_hours ?? 26,
          completedLessons: profileData.completed_lessons ?? 8,
          bio: profileData.bio || 'Estudando no Tutti Escola de Música 🎶'
        });
        return;
      }

      // 3. User has no record yet: create initial record in public.usuarios and public.profiles
      const initialDisplayName =
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.display_name ||
        authUser.user_metadata?.name ||
        authUser.email?.split('@')[0] ||
        'Músico Tutti';

      const initialProfile: UserProfileData = {
        id: authUser.id,
        email: authUser.email || 'aluno@tutti.mus.br',
        displayName: initialDisplayName,
        photoURL: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture,
        role: authUser.email === 'eliandrolucas.EL@gmail.com' ? 'admin' : 'student',
        currentInstrument: 'Saxofone',
        level: 'Intermediário',
        streakDays: 14,
        xp: 450,
        practiceHours: 26,
        completedLessons: 8,
        bio: 'Estudando no Tutti Escola de Música 🎶'
      };

      // Upsert into usuarios
      try {
        await supabase.from('usuarios').upsert(
          {
            user_id: authUser.id,
            nome_completo: initialProfile.displayName,
            avatar_url: initialProfile.photoURL,
            bio: initialProfile.bio,
            current_instrument: initialProfile.currentInstrument,
            level: initialProfile.level,
            streak_days: initialProfile.streakDays,
            xp: initialProfile.xp,
            practice_hours: initialProfile.practiceHours,
            completed_lessons: initialProfile.completedLessons,
            role: initialProfile.role,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id' }
        );
      } catch (err) {
        // Fallback to profiles if usuarios table is missing
        await supabase.from('profiles').upsert(
          {
            id: authUser.id,
            email: initialProfile.email,
            display_name: initialProfile.displayName,
            photo_url: initialProfile.photoURL,
            role: initialProfile.role,
            current_instrument: initialProfile.currentInstrument,
            level: initialProfile.level,
            streak_days: initialProfile.streakDays,
            xp: initialProfile.xp,
            practice_hours: initialProfile.practiceHours,
            completed_lessons: initialProfile.completedLessons,
            bio: initialProfile.bio,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'id' }
        );
      }

      setProfile(initialProfile);
    } catch (err) {
      console.warn('Profile sync note (Supabase):', err);
      setProfile(prev => prev || DEFAULT_PROFILE);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // 1. Check initial active session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!isMounted) return;
      if (error) {
        console.warn('Supabase session load error:', error);
      }
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        loadProfile(currentUser).finally(() => {
          if (isMounted) setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    // 2. Subscribe to Supabase auth state changes
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await loadProfile(currentUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loginWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Supabase Google OAuth Error:', error);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    const res = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass });
    if (!res.error && res.data.user) {
      setUser(res.data.user);
      await loadProfile(res.data.user);
    }
    return res;
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    const cleanName = name.trim() || 'Músico Tutti';
    const res = await supabase.auth.signUp({
      email: email.trim(),
      password: pass,
      options: {
        data: {
          full_name: cleanName,
          display_name: cleanName,
          name: cleanName
        }
      }
    });

    if (!res.error && res.data.user) {
      setUser(res.data.user);
      await loadProfile(res.data.user);
    }
    return res;
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
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error('Supabase signOut error:', error);
    }
  };

  const updateProfileData = async (data: Partial<UserProfileData>) => {
    setProfile(prev => (prev ? { ...prev, ...data } : null));
    if (!user) return;

    try {
      // 1. Update public.usuarios
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

      const { error: errUsuarios } = await supabase
        .from('usuarios')
        .update(usuariosPayload)
        .eq('user_id', user.id);

      // If usuarios table is not ready or user has no row yet, upsert
      if (errUsuarios) {
        await supabase.from('usuarios').upsert({
          user_id: user.id,
          nome_completo: data.displayName || profile?.displayName,
          bio: data.bio || profile?.bio,
          avatar_url: data.photoURL || profile?.photoURL,
          current_instrument: data.currentInstrument || profile?.currentInstrument,
          level: data.level || profile?.level,
          streak_days: data.streakDays ?? profile?.streakDays,
          xp: data.xp ?? profile?.xp,
          practice_hours: data.practiceHours ?? profile?.practiceHours,
          completed_lessons: data.completedLessons ?? profile?.completedLessons,
          updated_at: new Date().toISOString()
        });
      }

      // 2. Also keep public.profiles updated in parallel if it exists
      const profilesPayload: any = { updated_at: new Date().toISOString() };
      if (data.displayName !== undefined) profilesPayload.display_name = data.displayName;
      if (data.bio !== undefined) profilesPayload.bio = data.bio;
      if (data.photoURL !== undefined) profilesPayload.photo_url = data.photoURL;
      if (data.currentInstrument !== undefined) profilesPayload.current_instrument = data.currentInstrument;
      if (data.level !== undefined) profilesPayload.level = data.level;
      if (data.streakDays !== undefined) profilesPayload.streak_days = data.streakDays;
      if (data.xp !== undefined) profilesPayload.xp = data.xp;
      if (data.practiceHours !== undefined) profilesPayload.practice_hours = data.practiceHours;
      if (data.completedLessons !== undefined) profilesPayload.completed_lessons = data.completedLessons;

      await supabase.from('profiles').update(profilesPayload).eq('id', user.id);
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

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAuthenticated: !!user,
        projectId: SUPABASE_PROJECT_ID,
        loginWithGoogle,
        loginWithEmail,
        signUpWithEmail,
        resetPassword,
        logout,
        updateProfileData,
        addXp,
        savePracticeAudio,
        saveLessonProgressToDb,
        rsvpMasterclassInDb,
        createOrderInDb
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
