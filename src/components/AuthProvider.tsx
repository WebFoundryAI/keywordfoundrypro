import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getStoredPlanSelection, clearStoredPlanSelection } from '@/lib/planStorage';
import { logger } from '@/lib/logger';
import { setAnalyticsExclusion, clearAnalyticsExclusion } from '@/lib/analytics/exclusion';

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
  const didRedirectRef = useRef(false);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        logger.log('Auth state change:', event, session?.user?.id);
        
        // Only handle SIGNED_IN for navigation, ignore TOKEN_REFRESHED and USER_UPDATED
        if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Apply stored plan selection and handle centralized redirect after SIGNED_IN
        if (event === 'SIGNED_IN' && session?.user) {
          // Prevent double-redirect within one session
          if (didRedirectRef.current) {
            logger.log('Redirect already performed, skipping');
            return;
          }

          setTimeout(async () => {
            // Fetch user first
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const storedPlan = getStoredPlanSelection();
            if (storedPlan) {
              logger.log('Applying stored plan selection:', storedPlan);
              await supabase.auth.updateUser({
                data: {
                  selected_plan: storedPlan.tier,
                  billing_period: storedPlan.billing
                }
              }).then(({ error }) => {
                if (error) {
                  logger.error('Error applying stored plan:', error);
                } else {
                  logger.log('Successfully applied stored plan to user metadata');
                  clearStoredPlanSelection();
                }
              });
            }

            // Check if user is admin FIRST
            const { data: adminRole } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', user.id)
              .eq('role', 'admin')
              .maybeSingle();

            // Set analytics exclusion based on admin status
            const isAdmin = !!adminRole;
            setAnalyticsExclusion(isAdmin);
            
            if (isAdmin) {
              logger.log('Admin user - analytics tracking disabled');
            }

            // For non-admin users, ensure subscription is ready before redirecting
            if (!isAdmin) {
              logger.log('Non-admin user - verifying subscription setup');
              
              // Call ensure_user_subscription
              const { error: rpcErr } = await supabase.rpc('ensure_user_subscription', {
                user_id_param: user.id
              });
              
              if (rpcErr) {
                logger.error('ensure_user_subscription error', rpcErr);
              }

              // Verify subscription exists with retries (max 3 attempts, 500ms between)
              let subscriptionReady = false;
              for (let attempt = 1; attempt <= 3; attempt++) {
                logger.log(`Verifying subscription (attempt ${attempt}/3)`);
                
                const { data: subscription } = await supabase
                  .from('user_subscriptions')
                  .select('id, status, tier')
                  .eq('user_id', user.id)
                  .maybeSingle();

                if (subscription) {
                  logger.log('Subscription verified:', subscription);
                  subscriptionReady = true;
                  break;
                }

                if (attempt < 3) {
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
              }

              if (!subscriptionReady) {
                logger.error('Failed to verify subscription after 3 attempts');
                // Still allow redirect but log the issue
              }
            } else {
              // For admins, just call ensure_user_subscription without waiting
              await supabase.rpc('ensure_user_subscription', {
                user_id_param: user.id
              });
            }

            // Only redirect from specific whitelist paths
            const currentPath = window.location.pathname;
            const shouldRedirect = ['/', '/auth/callback'].includes(currentPath);
            
            if (shouldRedirect) {
              didRedirectRef.current = true;
              const redirectPath = '/research';
              logger.log('Centralized redirect from', currentPath, '->', redirectPath);
              window.location.replace(redirectPath);
            } else {
              logger.log('Skipping redirect - not on whitelist path:', currentPath);
            }
          }, 0);
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        logger.error('Error getting session:', error);
      } else {
        logger.log('Initial session:', session?.user?.id);
        
        // Re-verify analytics exclusion if user is already signed in
        if (session?.user) {
          const { data: adminRole } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .eq('role', 'admin')
            .maybeSingle();
          
          setAnalyticsExclusion(!!adminRole);
        }
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
      
      // Clear analytics exclusion
      clearAnalyticsExclusion();
      
      // Clear all client-side caches and storage
      localStorage.clear();
      sessionStorage.clear();
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        logger.error('Error signing out:', error);
        throw error;
      }
      
      logger.log('Successfully signed out');
      
      // Reset redirect flag
      didRedirectRef.current = false;
    } catch (error) {
      logger.error('Sign out error:', error);
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