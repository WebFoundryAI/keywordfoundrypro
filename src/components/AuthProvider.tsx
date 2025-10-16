import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getStoredPlanSelection, clearStoredPlanSelection } from '@/lib/planStorage';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Apply stored plan selection and handle smart redirects after SIGNED_IN event
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(async () => {
            const storedPlan = getStoredPlanSelection();
            if (storedPlan) {
              console.log('Applying stored plan selection:', storedPlan);
              await supabase.auth.updateUser({
                data: {
                  selected_plan: storedPlan.tier,
                  billing_period: storedPlan.billing
                }
              }).then(({ error }) => {
                if (error) {
                  console.error('Error applying stored plan:', error);
                } else {
                  console.log('Successfully applied stored plan to user metadata');
                  clearStoredPlanSelection();
                }
              });
            }

            // Smart redirect based on subscription status (for OAuth flows)
            const currentPath = window.location.pathname;
            if (currentPath.includes('/auth/callback')) {
              const { data: subscriptionData } = await supabase.rpc('get_user_subscription', {
                user_id_param: session.user.id
              });
              
              console.log('OAuth subscription check:', subscriptionData)
              const hasSubscription = subscriptionData && subscriptionData.length > 0 && subscriptionData[0] && subscriptionData[0].status === 'active'

              const redirectTo = hasSubscription ? '/research' : '/pricing?new=true';
              console.log('Smart redirect:', { hasSubscription, redirectTo });
              window.location.href = redirectTo;
            }
          }, 0);
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error);
      } else {
        console.log('Initial session:', session?.user?.id);
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        throw error;
      }
      console.log('Successfully signed out');
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};