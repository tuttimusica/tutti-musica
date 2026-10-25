import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, SUPABASE_PROJECT_ID } from '../services/supabase';

export interface UserProfileData {
  id: string;
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
  projectId: string;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<{ error: any }>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<{ error: any }>;
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
  const [profile, setProfile] = useState<UserProfileData | null>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);

  // Load user profile from Supabase
  const loadProfile = async (authUser: User) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (data) {
        setProfile({
          id: data.id,
          email: data.email || authUser.email || '',
          displayName: data.display_name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Músico Tutti',
          photoURL: data.photo_url || authUser.user_metadata?.avatar_url,
          role: data.role || 'student',
          currentInstrument: data.current_instrument || 'Saxofone',
          level: data.level || 'Intermediário',
          streakDays: data.streak_days ?? 14,
          xp: data.xp ?? 450,
          practiceHours: data.practice_hours ?? 26,
          completedLessons: data.completed_lessons ?? 8,
          bio: data.bio || 'Estudando no Tutti ♪'
        });
      } else {
        // Create initial profile in Supabase table
        const newProfile: UserProfileData = {
          id: authUser.id,
          email: authUser.email || 'aluno@tutti.mus.br',
          displayName: authUser.user_metadata?.full_name || authUser.user_metadata?.display_name || authUser.email?.split('@')[0] || 'Músico Tutti',
          photoURL: authUser.user_metadata?.avatar_url,
          role: authUser.email === 'eliandrolucas.EL@gmail.com' ? 'admin' : 'student',
          currentInstrument: 'Saxofone',
          level: 'Intermediário',
          streakDays: 14,
          xp: 450,
          practiceHours: 26,
          completedLessons: 8,
          bio: 'Estudando no Tutti ♪'
        };

        await supabase.from('profiles').upsert({
          id: newProfile.id,
          email: newProfile.email,
          display_name: newProfile.displayName,
          photo_url: newProfile.photoURL,
          role: newProfile.role,
          current_instrument: newProfile.currentInstrument,
          level: newProfile.level,
          streak_days: newProfile.streakDays,
          xp: newProfile.xp,
          practice_hours: newProfile.practiceHours,
          completed_lessons: newProfile.completedLessons,
          bio: newProfile.bio,
          updated_at: new Date().toISOString()
        });

        setProfile(newProfile);
      }
    } catch (err) {
      console.warn('Profile load note (Supabase):', err);
      // Keep state resilient
      setProfile(prev => prev || DEFAULT_PROFILE);
    }
  };

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        loadProfile(currentUser);
      } else {
        setProfile(DEFAULT_PROFILE);
      }
      setLoading(false);
    });

    // Listen to Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          await loadProfile(currentUser);
        } else {
          setProfile(DEFAULT_PROFILE);
        }
        setLoading(false);
      }
    );

    return () => {
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
    const res = await supabase.auth.signInWithPassword({ email, password: pass });
    if (!res.error && res.data.user) {
      setUser(res.data.user);
      await loadProfile(res.data.user);
    }
    return res;
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    const res = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: { full_name: name, display_name: name }
      }
    });
    if (!res.error && res.data.user) {
      setUser(res.data.user);
      await loadProfile(res.data.user);
    }
    return res;
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(DEFAULT_PROFILE);
    } catch (error) {
      console.error('Supabase signOut error:', error);
    }
  };

  const updateProfileData = async (data: Partial<UserProfileData>) => {
    setProfile(prev => prev ? { ...prev, ...data } : null);
    if (!user) return;

    try {
      const payload: any = { updated_at: new Date().toISOString() };
      if (data.displayName !== undefined) payload.display_name = data.displayName;
      if (data.currentInstrument !== undefined) payload.current_instrument = data.currentInstrument;
      if (data.level !== undefined) payload.level = data.level;
      if (data.streakDays !== undefined) payload.streak_days = data.streakDays;
      if (data.xp !== undefined) payload.xp = data.xp;
      if (data.practiceHours !== undefined) payload.practice_hours = data.practiceHours;
      if (data.completedLessons !== undefined) payload.completed_lessons = data.completedLessons;
      if (data.bio !== undefined) payload.bio = data.bio;

      await supabase.from('profiles').update(payload).eq('id', user.id);
    } catch (err) {
      console.warn('Error updating Supabase profile:', err);
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
      await supabase.from('lesson_progress').upsert({
        user_id: user ? user.id : 'guest',
        lesson_id: lessonId,
        instrument_id: instrumentId,
        completed: completedTasks.length > 0,
        completed_tasks: completedTasks,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,lesson_id' });
    } catch (err) {
      console.warn('Lesson progress save note (Supabase):', err);
    }
  };

  const rsvpMasterclassInDb = async (masterclassId: number, title: string) => {
    try {
      await supabase.from('masterclass_rsvps').upsert({
        user_id: user ? user.id : 'guest',
        masterclass_id: masterclassId,
        title,
        registered_at: new Date().toISOString()
      }, { onConflict: 'user_id,masterclass_id' });
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
        projectId: SUPABASE_PROJECT_ID,
        loginWithGoogle,
        loginWithEmail,
        signUpWithEmail,
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
