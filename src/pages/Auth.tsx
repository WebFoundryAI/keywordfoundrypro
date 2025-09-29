import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Chrome, Shield, Zap, TrendingUp } from 'lucide-react';

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Redirect authenticated users to main page
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      
      // More robust redirect URL construction
      const currentUrl = new URL(window.location.href);
      const redirectUrl = `${currentUrl.protocol}//${currentUrl.host}/`;
      
      console.log('Attempting Google sign-in with redirect:', redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        console.error('Google sign-in error:', error);
        
        // More specific error handling
        let errorMessage = "Failed to sign in with Google. Please try again.";
        
        if (error.message.includes('provider is not enabled')) {
          errorMessage = "Google authentication is not configured. Please contact support.";
        } else if (error.message.includes('Invalid redirect URL')) {
          errorMessage = "Authentication configuration error. Please contact support.";
        } else if (error.message.includes('network')) {
          errorMessage = "Network error. Please check your connection and try again.";
        }
        
        toast({
          title: "Authentication Error",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        console.log('OAuth redirect initiated successfully:', data);
      }
    } catch (error) {
      console.error('Unexpected error during Google sign-in:', error);
      toast({
        title: "Unexpected Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Keyword Research Pro
          </h1>
          <p className="text-foreground/80">
            Professional keyword analysis and SEO insights
          </p>
        </div>

        {/* Sign In Card */}
        <Card className="bg-gradient-card shadow-card border-border/50">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-semibold">
              Sign in to get started
            </CardTitle>
            <CardDescription>
              Access comprehensive keyword insights and analytics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full h-12 bg-gradient-primary hover:shadow-button transition-smooth"
              size="lg"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Chrome className="w-5 h-5" />
                  Continue with Google
                </div>
              )}
            </Button>

            {/* Features */}
            <div className="space-y-4 pt-4 border-t border-border/30">
              <h3 className="font-medium text-center text-muted-foreground">
                What you'll get access to:
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                  <span>Comprehensive keyword research with search volume & CPC data</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-primary" />
                  </div>
                  <span>Real-time keyword data and analytics</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-primary" />
                  </div>
                  <span>Secure data storage and export capabilities</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          By signing in, you agree to our terms of service and privacy policy
        </p>
      </div>
    </div>
  );
};

export default Auth;