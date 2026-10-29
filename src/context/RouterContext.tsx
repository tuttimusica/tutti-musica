import { createContext, useContext } from 'react';
import { SheetMusic, Product } from './../data/musicData';

export interface RouterContextType {
  currentPath: string;
  queryParams: Record<string, string>;
  navigate: (path: string, params?: Record<string, string>) => void;
  openMetronome: () => void;
  openTuner: () => void;
  openSheetViewer: (sheet: SheetMusic) => void;
  openAuthModal: () => void;
  openPlansModal: () => void;
  openSocialModal: () => void;
  userPlan: 'free' | 'pro' | 'ultra';
  setUserPlan: (plan: 'free' | 'pro' | 'ultra') => void;
  cart: { product: Product; quantity: number }[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: number) => void;
  clearCart: () => void;
  openCheckout: () => void;
  toast: string | null;
  showToast: (msg: string) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  userStats: {
    xp: number;
    streakDays: number;
    practiceHours: number;
    completedLessons: number;
  };
  completeTask: (xpGain: number) => void;
}

export const RouterContext = createContext<RouterContextType | null>(null);

export const useAppRouter = () => {
  const context = useContext(RouterContext);
  if (!context) throw new Error('useAppRouter must be used within RouterProvider');
  return context;
};
