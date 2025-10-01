import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Search, Chrome, Shield, Zap, TrendingUp, Database } from 'lucide-react';

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
      const redirectUrl = `${currentUrl.origin}/`;
      
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
        let errorTitle = "Authentication Error";
        
        if (error.message.includes('provider is not enabled') || error.message.includes('not enabled for this project')) {
          errorMessage = "Google authentication is not enabled. Please ensure Google OAuth is configured in your Supabase project settings.";
          errorTitle = "Configuration Required";
        } else if (error.message.includes('Invalid redirect URL') || error.message.includes('redirect_to')) {
          errorMessage = "Redirect URL configuration error. Please verify your domain is added to the allowed redirect URLs in Supabase Authentication settings.";
          errorTitle = "Configuration Error";
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = "Network error. Please check your internet connection and try again.";
          errorTitle = "Connection Error";
        } else if (error.message.includes('timeout')) {
          errorMessage = "Request timed out. Please try again.";
          errorTitle = "Timeout Error";
        } else if (error.message) {
          errorMessage = `${error.message}`;
        }
        
        toast({
          title: errorTitle,
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
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-secondary p-12 flex-col justify-center">
        <div className="max-w-md">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Search className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Keyword Foundry Pro</h1>
              <p className="text-sm text-muted-foreground">Professional SEO Research</p>
            </div>
          </div>
          
          <h2 className="text-3xl font-bold mb-4">
            Advanced Keyword Intelligence for Technical SEO
          </h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Join thousands of SEO professionals using real-time data and advanced analytics 
            to dominate search rankings. Get started with comprehensive keyword research today.
          </p>
          
          {/* Features */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Database className="w-5 h-5 text-primary flex-shrink-0" />
              <span className="text-sm">Real-time search volume and competition data</span>
            </div>
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-5 h-5 text-primary flex-shrink-0" />
              <span className="text-sm">Advanced difficulty scoring algorithms</span>
            </div>
            <div className="flex items-center space-x-3">
              <Zap className="w-5 h-5 text-primary flex-shrink-0" />
              <span className="text-sm">Automated intent classification</span>
            </div>
            <div className="flex items-center space-x-3">
              <Shield className="w-5 h-5 text-primary flex-shrink-0" />
              <span className="text-sm">Secure data export and storage</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Authentication */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          {/* Mobile header */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Search className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold">Keyword Foundry Pro</h1>
            </div>
            <p className="text-sm text-muted-foreground">Professional SEO Research Tool</p>
          </div>

          {/* Sign In Card */}
          <Card className="glass border-border/50">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
              <CardDescription>
                Sign in to access your keyword research dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground"
                size="lg"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Connecting...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <Chrome className="w-5 h-5" />
                    <span>Continue with Google</span>
                  </div>
                )}
              </Button>

              {/* Security Note */}
              <div className="text-center space-y-2">
                <p className="text-xs text-muted-foreground">
                  Secure authentication powered by Google OAuth
                </p>
                <div className="flex items-center justify-center space-x-1 text-xs text-muted-foreground">
                  <Shield className="w-3 h-3" />
                  <span>Your data is encrypted and secure</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Legal */}
          <p className="text-center text-xs text-muted-foreground">
            By signing in, you agree to our terms of service and privacy policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;