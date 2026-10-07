import { create } from 'zustand';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

async function fetchProfile(user) {
  if (!user) return null;
  try {
    const snapshot = await getDoc(doc(db, 'users', user.uid));
    return snapshot.exists() ? snapshot.data() : null;
  } catch (error) {
    console.error('Error loading profile:', error);
    return null;
  }
}

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  loading: true,

  setUser: (user) => set({ user, loading: false }),

  // Call after writing to the user's profile (profile form, payment) so route guards see the change
  refreshProfile: async () => {
    const profile = await fetchProfile(get().user);
    set({ profile });
    return profile;
  },

  logout: async () => {
    await auth.signOut();
    set({ user: null, profile: null });
  },

  initialize: () => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      set({ loading: true });
      const profile = await fetchProfile(user);
      set({ user, profile, loading: false });
    });
    return unsubscribe;
  }
}));

// Initialize on app start
if (typeof window !== 'undefined') {
  useAuthStore.getState().initialize();
}
