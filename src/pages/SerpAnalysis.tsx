import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { Search, ExternalLink, Globe } from "lucide-react";

interface SerpResult {
  position: number;
  title: string;
  url: string;
  domain: string;
  description: string;
  breadcrumb: string;
  highlighted: string[];
  extra: {
    ad_aclk: string | null;
    content_score: number | null;
    snippet: string;
  };
}

const SerpAnalysis = () => {
  const [keyword, setKeyword] = useState(() => {
    return localStorage.getItem('lastKeyword') || '';
  });
  const [results, setResults] = useState<SerpResult[]>(() => {
    const stored = localStorage.getItem('serpAnalysisResults');
    return stored ? JSON.parse(stored) : [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleSearch = async () => {
    if (!keyword.trim()) {
      toast({
        title: "Error",
        description: "Please enter a keyword to analyze",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('serp-analysis', {
        body: {
          keyword: keyword.trim(),
          languageCode: 'en',
          locationCode: 2840
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to analyze SERP results');
      }

      if (data.success && data.results) {
        setResults(data.results);
        localStorage.setItem('serpAnalysisResults', JSON.stringify(data.results));
        localStorage.setItem('lastKeyword', keyword.trim());
        toast({
          title: "Analysis Complete",
          description: `Found ${data.total_results} organic results for "${keyword}" (Cost: $${data.estimated_cost})`,
        });
      } else {
        throw new Error(data.error || 'No results found');
      }
    } catch (error) {
      console.error('SERP analysis error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to analyze SERP results. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
      <Header user={user} />

      {/* Search Form */}
      <section className="px-6 py-8">
        <div className="container mx-auto max-w-4xl">
          <Card className="bg-gradient-card shadow-card border-border/50 mb-6">
            <CardHeader>
              <CardTitle>Analyze SERP Results</CardTitle>
              <CardDescription>
                Get the top 10 organic search results for any keyword
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Input
                  placeholder="Enter keyword to analyze..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSearch}
                  disabled={isLoading}
                  className="px-8"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Search className="w-4 h-4 mr-2" />
                  )}
                  Analyze
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">
                SERP Results for "{keyword}"
              </h2>
              {results.map((result) => (
                <Card key={result.position} className="bg-gradient-card shadow-card border-border/50">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">
                          {result.position}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Globe className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {result.domain}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(result.url, '_blank')}
                            className="ml-auto p-1 h-auto"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                        <h3 className="text-lg font-semibold mb-2 text-primary hover:underline">
                          <a href={result.url} target="_blank" rel="noopener noreferrer">
                            {result.title}
                          </a>
                        </h3>
                        <p className="text-muted-foreground text-sm mb-2">
                          {result.description}
                        </p>
                        {result.breadcrumb && (
                          <div className="text-xs text-muted-foreground">
                            {result.breadcrumb}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default SerpAnalysis;