import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { clearMockSession } from '../constants/mock-data';

export interface Profile {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  streak_count: number;
  created_at: string;
}

export interface AuthUser {
  id: string;
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}

interface AuthContextType {
  session: any | null;
  user: AuthUser | null;
  profile: Profile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

let pendingInviteCode: string | null = null;

export function getPendingInviteCode() {
  return pendingInviteCode;
}

export function setPendingInviteCode(code: string | null) {
  pendingInviteCode = code;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (firebaseUser: FirebaseUser): Promise<Profile | null> => {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        return {
          id: firebaseUser.uid,
          email: data.email || firebaseUser.email || '',
          username: data.username || null,
          full_name: data.full_name || firebaseUser.displayName || null,
          avatar_url: data.avatar_url || firebaseUser.photoURL || null,
          streak_count: data.streak_count || 0,
          created_at: data.created_at || new Date().toISOString()
        };
      }

      // Se perfil ainda não existe no Firestore, cria automaticamente
      const newProfile: Profile = {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        username: firebaseUser.email?.split('@')[0] || null,
        full_name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || null,
        avatar_url: firebaseUser.photoURL || null,
        streak_count: 0,
        created_at: new Date().toISOString()
      };

      await setDoc(userRef, newProfile);
      return newProfile;
    } catch (err) {
      console.warn('Erro ao carregar perfil do usuário no Firestore:', err);
      // Retorna perfil temporário em memória para não travar a UI
      return {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        username: firebaseUser.email?.split('@')[0] || null,
        full_name: firebaseUser.displayName || 'Usuário',
        avatar_url: firebaseUser.photoURL || null,
        streak_count: 0,
        created_at: new Date().toISOString()
      };
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (auth.currentUser) {
      const p = await fetchProfile(auth.currentUser);
      if (p) setProfile(p);
    }
  }, [fetchProfile]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      if (firebaseUser) {
        const mappedUser: AuthUser = {
          id: firebaseUser.uid,
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL
        };
        setUser(mappedUser);
        const p = await fetchProfile(firebaseUser);
        setProfile(p);
      } else {
        setUser(null);
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [fetchProfile]);

  const signOut = async () => {
    setIsLoading(true);
    try {
      await firebaseSignOut(auth);
      clearMockSession();
      setUser(null);
      setProfile(null);
    } catch (e) {
      console.error('Erro ao sair:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const session = user ? { user, access_token: 'firebase_token' } : null;

  return (
    <AuthContext.Provider value={{ session, user, profile, isLoading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
