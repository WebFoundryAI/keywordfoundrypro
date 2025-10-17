import { useNavigate } from "react-router-dom";
import { UserMenu } from "@/components/UserMenu";
import { useAuth } from "@/components/AuthProvider";
import { Search, Database, Target, TrendingUp, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Search className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Keyword Foundry Pro</h1>
                <p className="text-xs text-muted-foreground">Professional SEO Research</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <nav className="hidden md:flex items-center gap-6">
                <Button variant="link" size="sm" onClick={() => navigate('/pricing')} className="text-foreground hover:text-primary">
                  Pricing
                </Button>
              </nav>
              {user ? (
                <UserMenu />
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => navigate('/auth/sign-in')}>
                    Log In
                  </Button>
                  <Button size="sm" onClick={() => navigate('/auth/sign-up')}>
                    Sign Up
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight mb-4">
            Keyword Foundry Pro
          </h2>
          <p className="text-xl md:text-2xl font-semibold text-muted-foreground mb-6">
            Advanced Keyword Intelligence for Technical SEO
          </p>
          <p className="text-base md:text-lg text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
            Unlock SEO potential with real-time, data-driven insights. A professional-grade keyword research platform built for technical SEO experts who demand accuracy and speed.
          </p>
          <Button
            size="lg"
            onClick={() => navigate(user ? '/research' : '/auth/sign-in')}
            className="px-8 py-6 text-base font-medium hover-lift"
          >
            Get Started Now
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                <Database className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Real-time Data</h3>
              <p className="text-sm text-muted-foreground">
                Access live search volume and competition metrics.
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Difficulty Score</h3>
              <p className="text-sm text-muted-foreground">
                Leverage advanced algorithms to measure true ranking difficulty.
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Intent Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Automatically classify search intent to align content strategies.
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Secure Export & Storage</h3>
              <p className="text-sm text-muted-foreground">
                Save, manage, and export keyword data with complete confidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Professional Credibility Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
            Built for Professionals
          </h2>
          <p className="text-base md:text-lg text-muted-foreground mb-10 leading-relaxed">
            Join thousands of SEO experts already using Keyword Foundry Pro to dominate search rankings with actionable insights.
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => navigate(user ? '/research' : '/auth/sign-in')}
            className="px-8 py-6 text-base font-medium hover-lift"
          >
            Start Your Research
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 backdrop-blur-sm py-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <div className="space-y-2">
                <button onClick={() => navigate('/research')} className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                  Research
                </button>
                <button onClick={() => navigate('/pricing')} className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                  Pricing
                </button>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <div className="space-y-2">
                <button onClick={() => navigate('/about')} className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                  About
                </button>
                <button onClick={() => navigate('/contact')} className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                  Contact
                </button>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <div className="space-y-2">
                <button onClick={() => navigate('/terms')} className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                  Terms
                </button>
                <button onClick={() => navigate('/privacy')} className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                  Privacy
                </button>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Built for SEO professionals • Powered by real-time data
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;