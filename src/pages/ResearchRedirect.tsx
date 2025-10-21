import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { getOrCreateUserResearchHome } from '@/lib/researchHome';
import { logger } from '@/lib/logger';

export default function ResearchRedirect() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const redirect = async () => {
      // Wait for auth to load
      if (loading) return;

      // Not signed in - go to login
      if (!user) {
        navigate('/auth/sign-in', { replace: true });
        return;
      }

      // Get or create research space and redirect
      try {
        const path = await getOrCreateUserResearchHome(supabase, user.id);
        navigate(path, { replace: true });
      } catch (err) {
        logger.error('Error redirecting to research space:', err);
        setError('Failed to load your research space. Please try again.');
      }
    };

    redirect();
  }, [user, loading, navigate]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p className="text-destructive">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-sm text-muted-foreground">Loading your research...</p>
      </div>
    </div>
  );
}
