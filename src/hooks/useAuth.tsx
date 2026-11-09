import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
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
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  profileError: string | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Auto-guérison : crée le profil s'il manque dans public.profiles pour un utilisateur authentifié
  const selfHealProfile = async (authUser: any): Promise<Profile | null> => {
    try {
      console.warn('[Self-Healing] Profil absent pour l’utilisateur authentifié. Création automatique...');
      const { data: units } = await supabase.from('units').select('id').eq('is_active', true);
      const defaultUnitId = units && units.length > 0 ? units[0].id : null;

      const meta = authUser.user_metadata || {};
      const emailPrefix = authUser.email ? authUser.email.split('@')[0] : 'Chef';
      const firstName = meta.first_name || emailPrefix;
      const lastName = meta.last_name || 'Saint-Martin';
      const unitId = meta.primary_unit_id || defaultUnitId;
      // Un profil créé côté client est toujours un chef en attente : le rôle admin se donne côté admin
      const role = 'chef';
      const status = 'pending';

      const insertRes = await supabase
        .from('profiles')
        .insert({
          id: authUser.id,
          first_name: firstName,
          last_name: lastName,
          role,
          status,
          primary_unit_id: unitId,
        });

      if (insertRes.error) {
        console.error('[Self-Healing] Échec de la création automatique du profil:', insertRes.error);
        setProfileError(`Impossible d'initialiser le profil : ${insertRes.error.message}`);
        return null;
      }

      const { data: newProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      setProfileError(null);
      return (newProfile as Profile) || null;
    } catch (err: any) {
      console.error('[Self-Healing] Exception lors de la création du profil:', err);
      setProfileError(err?.message || 'Erreur inattendue lors de la création du profil');
      return null;
    }
  };

  const fetchProfile = useCallback(async (userId: string, authUser?: any) => {
    try {
      setProfileError(null);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        const errCode = (error as any)?.code;
        if (errCode === 'PGRST116' && !isMockMode) {
          const targetUser = authUser || (await supabase.auth.getUser()).data?.user;
          if (targetUser) {
            const healedProfile = await selfHealProfile(targetUser);
            if (healedProfile) {
              setProfile(healedProfile);
              return;
            }
          }
        }
        console.error('Erreur récupération profil:', error);
        setProfile(null);
        setProfileError(error.message);
      } else {
        setProfile(data as Profile);
        setProfileError(null);
      }
    } catch (err: any) {
      console.error('Catch récupération profil:', err);
      setProfile(null);
      setProfileError(err?.message || 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    setIsLoading(true);
    setProfileError(null);
    const { data } = await supabase.auth.getUser();
    if (data?.user?.id) {
      setUser(data.user as any);
      await fetchProfile(data.user.id, data.user);
    } else {
      setUser(null);
      setProfile(null);
      setIsLoading(false);
    }
  }, [fetchProfile]);

  useEffect(() => {
    refreshProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user?.id) {
        setUser(session.user as any);
        await fetchProfile(session.user.id, session.user);
      } else {
        setUser(null);
        setProfile(null);
        setProfileError(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshProfile, fetchProfile]);

  const signIn = async (email: string, password: string = 'password') => {
    setIsLoading(true);
    setProfileError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setIsLoading(false);
      return { error: error as Error | null };
    }
    if (data?.user) {
      setUser(data.user as any);
      await fetchProfile(data.user.id, data.user);
    }
    return { error: null };
  };

  const signUp = async ({ email, password = 'password', firstName, lastName, primaryUnitId }: SignUpData) => {
    setIsLoading(true);
    setProfileError(null);
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

    const session = (data as any)?.session;
    if (session && data?.user?.id && !isMockMode) {
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
    setUser(null);
    setProfile(null);
    setProfileError(null);
    setIsLoading(false);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error: error as Error | null };
  };

  const switchMockUser = (roleOrId: string) => {
    if (roleOrId === 'admin') {
      signIn('benoit@saint-martin.local');
    } else if (roleOrId === 'admin2') {
      signIn('marie@saint-martin.local');
    } else if (roleOrId === 'chef' || roleOrId === 'chef1') {
      signIn('guillaume@saint-martin.local');
    } else if (roleOrId === 'chef2') {
      signIn('thomas@saint-martin.local');
    } else if (roleOrId === 'chef3') {
      signIn('sophie@saint-martin.local');
    } else if (roleOrId === 'pending') {
      signIn('claire@saint-martin.local');
    } else if (roleOrId === 'deactivated') {
      signIn('julien@saint-martin.local');
    } else {
      signIn(roleOrId);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        profileError,
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
