import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isMockMode } from '@/lib/supabase';
import { Profile } from '@/types/database';

interface SignUpData {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  primaryUnitId: string;
}

interface AuthContextType {
  profile: Profile | null;
  isLoading: boolean;
  isMock: boolean;
  signIn: (email: string, password?: string) => Promise<{ error: Error | null }>;
  signUp: (data: SignUpData) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  switchMockUser?: (roleOrId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setProfile(null);
      } else {
        setProfile(data as Profile);
      }
    } catch (err) {
      console.error('Catch fetching profile:', err);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (data?.user?.id) {
      await fetchProfile(data.user.id);
    } else {
      setProfile(null);
      setIsLoading(false);
    }
  }, [fetchProfile]);

  useEffect(() => {
    refreshProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshProfile, fetchProfile]);

  const signIn = async (email: string, password: string = 'password') => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      await refreshProfile();
    } else {
      setIsLoading(false);
    }
    return { error: error as Error | null };
  };

  const signUp = async ({ email, password = 'password', firstName, lastName, primaryUnitId }: SignUpData) => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          primary_unit_id: primaryUnitId,
        },
      },
    });

    if (error) {
      setIsLoading(false);
      return { error: error as Error | null };
    }

    if (data?.user?.id && !isMockMode) {
      // In real supabase, if trigger didn't create profile, create it
      await supabase.from('profiles').insert({
        id: data.user.id,
        first_name: firstName,
        last_name: lastName,
        role: 'chef',
        status: 'pending',
        primary_unit_id: primaryUnitId,
      });
    }

    await refreshProfile();
    return { error: null };
  };

  const signOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setProfile(null);
    setIsLoading(false);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error: error as Error | null };
  };

  const switchMockUser = (roleOrId: string) => {
    if (roleOrId === 'admin') {
      signIn('benoit@enf.local');
    } else if (roleOrId === 'admin2') {
      signIn('marie@enf.local');
    } else if (roleOrId === 'chef' || roleOrId === 'chef1') {
      signIn('guillaume@enf.local');
    } else if (roleOrId === 'chef2') {
      signIn('thomas@enf.local');
    } else if (roleOrId === 'chef3') {
      signIn('sophie@enf.local');
    } else if (roleOrId === 'pending') {
      signIn('claire@enf.local');
    } else if (roleOrId === 'deactivated') {
      signIn('julien@enf.local');
    } else {
      signIn(roleOrId);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        profile,
        isLoading,
        isMock: isMockMode,
        signIn,
        signUp,
        signOut,
        resetPassword,
        refreshProfile,
        switchMockUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
