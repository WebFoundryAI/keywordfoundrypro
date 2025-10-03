import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserMenu } from "@/components/UserMenu";
import { useAuth } from "@/components/AuthProvider";
import { Search, Zap, Target, TrendingUp, Database } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // No need to redirect unauthenticated users on landing page

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
            {user && <UserMenu />}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-8 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center px-3 py-1 mb-6 text-xs rounded-full bg-primary/10 text-primary border border-primary/20">
            <Zap className="w-3 h-3 mr-1" />
            Advanced Keyword Intelligence
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 bg-gradient-primary bg-clip-text text-transparent">
            Unlock SEO Potential with
            <br />Data-Driven Insights
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Professional-grade keyword research tool built for technical SEO professionals. 
            Get comprehensive search volume, difficulty metrics, and intent analysis.
          </p>
          
          {/* Feature highlights */}
          <div className="grid md:grid-cols-3 gap-4 mb-8 max-w-3xl mx-auto">
            <div className="glass rounded-lg p-4 text-center hover-lift">
              <Database className="w-6 h-6 text-primary mx-auto mb-2" />
              <h3 className="font-medium mb-1 text-sm">Real-time Data</h3>
              <p className="text-xs text-muted-foreground">Live search volume metrics</p>
            </div>
            <div className="glass rounded-lg p-4 text-center hover-lift">
              <Target className="w-6 h-6 text-primary mx-auto mb-2" />
              <h3 className="font-medium mb-1 text-sm">Intent Analysis</h3>
              <p className="text-xs text-muted-foreground">Automated search intent classification</p>
            </div>
            <div className="glass rounded-lg p-4 text-center hover-lift">
              <TrendingUp className="w-6 h-6 text-primary mx-auto mb-2" />
              <h3 className="font-medium mb-1 text-sm">Difficulty Score</h3>
              <p className="text-xs text-muted-foreground">Ranking difficulty analysis</p>
            </div>
          </div>
          
          {/* CTA Button */}
          <div className="mt-8">
            <Button
              size="lg"
              onClick={() => navigate(user ? '/research' : '/auth')}
              className="bg-gradient-primary hover:opacity-90 text-primary-foreground px-8 py-3 rounded-lg font-medium shadow-elegant hover-lift"
            >
              {user ? 'Start Keyword Research' : 'Login to start KW research'}
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 backdrop-blur-sm py-8">
        <div className="container mx-auto px-6 text-center">
          <p className="text-sm text-muted-foreground">
            Built for SEO professionals • Powered by real-time data
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;