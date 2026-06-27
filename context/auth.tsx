import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
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

interface AuthContextType {
  session: Session | null;
  user: User | null;
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


const MAX_PROFILE_RETRIES = 6;
const RETRY_DELAY = 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data && !error) {
      return data as Profile;
    }
    return null;
  }, []);

  const retryFetchProfile = useCallback(async (userId: string) => {
    const profile = await fetchProfile(userId);
    if (profile) {
      setProfile(profile);
      setIsLoading(false);
      return;
    }

    if (retryCountRef.current < MAX_PROFILE_RETRIES) {
      retryCountRef.current += 1;
      retryTimerRef.current = setTimeout(() => {
        retryFetchProfile(userId);
      }, RETRY_DELAY);
    } else {
      console.error('Profile not found after retries');
      setIsLoading(false);
    }
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    const currentUser = user;
    if (currentUser?.id) {
      const profile = await fetchProfile(currentUser.id);
      if (profile) {
        setProfile(profile);
      }
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        retryFetchProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      retryCountRef.current = 0;
      
      // Limpar memória de mocks locais se trocar de conta
      if (session?.user?.id !== user?.id) {
        clearMockSession();
      }

      setSession(session);
      setUser(session?.user ?? null);
      if (event === 'PASSWORD_RECOVERY') {
        setIsLoading(false);
      } else if (session?.user) {
        retryFetchProfile(session.user.id);
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [retryFetchProfile]);

  const signOut = async () => {
    setIsLoading(true);
    retryCountRef.current = 0;
    try {
      await supabase.auth.signOut();
      clearMockSession();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, isLoading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
