import { create } from 'zustand';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  
  setUser: (user) => set({ user, loading: false }),
  
  logout: async () => {
    await auth.signOut();
    set({ user: null });
  },
  
  initialize: () => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      set({ user, loading: false });
    });
    return unsubscribe;
  }
}));

// Initialize on app start
if (typeof window !== 'undefined') {
  useAuthStore.getState().initialize();
}