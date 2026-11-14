import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, isMockMode } from '@/lib/supabase';
import { Profile } from '@/types/database';
import { cleanIban } from '@/lib/iban';

interface SignUpData {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  primaryUnitId: string;
  iban: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  profileError: string | null;
  isMock: boolean;
  isPasswordRecovery: boolean;
  signIn: (email: string, password?: string) => Promise<{ error: Error | null }>;
  signUp: (data: SignUpData) => Promise<{ error: Error | null; needsEmailConfirmation?: boolean }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  switchMockUser?: (roleOrId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.location.hash.includes('type=recovery') ||
      window.location.search.includes('type=recovery')
    );
  });

  // Auto-guérison : crée le profil s'il manque dans public.profiles pour un utilisateur authentifié
  const selfHealProfile = async (authUser: any): Promise<Profile | null> => {
    try {
      console.warn('[Self-Healing] Profil absent pour l’utilisateur authentifié. Création automatique...');
      const meta = authUser.user_metadata || {};
      const emailPrefix = authUser.email ? authUser.email.split('@')[0] : 'Chef';
      const fullName: string = (meta.full_name || meta.name || '').trim();
      const firstName = meta.first_name || meta.given_name || fullName.split(' ')[0] || emailPrefix;
      const lastName = meta.last_name || meta.family_name || fullName.split(' ').slice(1).join(' ') || 'Saint-Martin';
      // Sans unité (connexion Google), l'appli demande de compléter l'inscription
      const unitId = meta.primary_unit_id || null;
      const iban = meta.iban ? cleanIban(meta.iban) : null;
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
          iban,
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
      if (_event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }

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

  // Pas d'écran de chargement global avant la réponse : il démonterait la page de connexion,
  // et le message « Email ou mot de passe incorrect » serait perdu avec l'email saisi.
  const signIn = async (email: string, password: string = 'password') => {
    setProfileError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: error as Error | null };
    }
    if (data?.user) {
      setIsLoading(true);
      setUser(data.user as any);
      await fetchProfile(data.user.id, data.user);
    }
    return { error: null };
  };

  // Redirige vers Google ; au retour, Supabase lit la session dans l'URL (detectSessionInUrl)
  const signInWithGoogle = async () => {
    if (isMockMode) {
      return { error: new Error("La connexion Google n'est pas disponible en mode démo.") };
    }
    const { error } = await (supabase as any).auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin, queryParams: { prompt: 'select_account' } },
    });
    return { error: (error as Error | null) ?? null };
  };

  const signUp = async ({ email, password = 'password', firstName, lastName, primaryUnitId, iban }: SignUpData) => {
    setProfileError(null);
    const cleanedIban = cleanIban(iban);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          primary_unit_id: primaryUnitId,
          iban: cleanedIban,
        },
      },
    });

    if (error) {
      return { error: error as Error | null };
    }

    setIsLoading(true);
    const session = (data as any)?.session;
    if (session && data?.user?.id && !isMockMode) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        first_name: firstName,
        last_name: lastName,
        role: 'chef',
        status: 'pending',
        primary_unit_id: primaryUnitId,
        iban: cleanedIban,
      });
    }

    await refreshProfile();
    // Sans session, Supabase attend que le chef clique le lien de confirmation reçu par email
    return { error: null, needsEmailConfirmation: !session && !isMockMode };
  };

  const signOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setProfileError(null);
    setIsPasswordRecovery(false);
    setIsLoading(false);
  };

  const resetPassword = async (email: string) => {
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return { error: error as Error | null };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) {
      setIsPasswordRecovery(false);
      if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
      await refreshProfile();
    }
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
        isPasswordRecovery,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        resetPassword,
        updatePassword,
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
