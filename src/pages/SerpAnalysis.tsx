import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { invokeFunction } from "@/lib/invoke";
import { Search, ExternalLink, Globe, MapPin, Zap } from "lucide-react";
import { logger } from '@/lib/logger';
import { trackSerpAnalysis } from '@/lib/analytics';

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

const LANGUAGE_OPTIONS = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" },
];

const LOCATION_OPTIONS = [
  { code: 2840, name: "United States" },
  { code: 2826, name: "United Kingdom" },
  { code: 2124, name: "Canada" },
  { code: 2036, name: "Australia" },
  { code: 2276, name: "Germany" },
  { code: 2250, name: "France" },
  { code: 2724, name: "Spain" },
  { code: 2380, name: "Italy" },
  { code: 2392, name: "Japan" },
  { code: 2156, name: "China" },
];

const SerpAnalysis = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [keyword, setKeyword] = useState(() => {
    return searchParams.get('keyword') || localStorage.getItem('lastKeyword') || '';
  });
  const [languageCode, setLanguageCode] = useState(() => {
    return searchParams.get('language') || localStorage.getItem('lastLanguageCode') || 'en';
  });
  const [locationCode, setLocationCode] = useState(() => {
    return parseInt(searchParams.get('location') || localStorage.getItem('lastLocationCode') || '2840');
  });
  const [limit] = useState(10);
  
  const [results, setResults] = useState<SerpResult[]>(() => {
    // Don't load from cache if fresh=true parameter is present
    const isFreshRequest = searchParams.get('fresh') === 'true';
    if (isFreshRequest) {
      return [];
    }
    const stored = localStorage.getItem('serpAnalysisResults');
    return stored ? JSON.parse(stored) : [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth/sign-in');
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

    // Update URL with search parameters
    setSearchParams({
      keyword: keyword.trim(),
      language: languageCode,
      location: locationCode.toString(),
      limit: limit.toString(),
    });

    setIsLoading(true);
    
    try {
      const languageName = LANGUAGE_OPTIONS.find(l => l.code === languageCode)?.name;
      const locationName = LOCATION_OPTIONS.find(l => l.code === locationCode)?.name;
      
      const data = await invokeFunction('serp-analysis', {
        keyword: keyword.trim(),
        languageCode,
        languageName,
        locationCode,
        locationName,
        limit
      });

      if (data.success && data.results) {
        setResults(data.results);
        localStorage.setItem('serpAnalysisResults', JSON.stringify(data.results));
        localStorage.setItem('lastKeyword', keyword.trim());
        
        // Remove fresh parameter after successful analysis
        if (searchParams.get('fresh') === 'true') {
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('fresh');
          setSearchParams(newParams, { replace: true });
        }
        
        // Track successful SERP analysis
        trackSerpAnalysis();
        
        toast({
          title: "Analysis Complete",
          description: `Found ${data.total_results} organic results for "${keyword}" (Cost: $${data.estimated_cost})`,
        });
        // Auto-scroll to results
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } else {
        throw new Error(data.error || 'No results found');
      }
    } catch (err: any) {
      logger.error('SERP analysis error:', err);
      logger.error('Error status:', err?.status);
      logger.error('Error response preview:', JSON.stringify(err).slice(0, 300));
      
      toast({
        title: "Analysis Failed",
        description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
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
    <section className="px-6 py-8">
      <div className="container mx-auto max-w-4xl">
        <Card className="bg-gradient-card shadow-card border-border/50 mb-6">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Analyze SERP Results
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Get the top organic search results for any keyword with competitive insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="keyword" className="text-sm font-medium flex items-center gap-2">
                  <Search className="w-4 h-4 text-primary" />
                  Seed Keyword
                </Label>
                <Input
                  id="keyword"
                  type="text"
                  placeholder="e.g., best running shoes"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  spellCheck={true}
                  autoCorrect="on"
                  autoComplete="off"
                  className="bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-smooth"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="language" className="text-sm font-medium flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" />
                    Language
                  </Label>
                  <Select value={languageCode} onValueChange={setLanguageCode}>
                    <SelectTrigger className="bg-background/50 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_OPTIONS.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    Location
                  </Label>
                  <Select value={locationCode.toString()} onValueChange={(value) => setLocationCode(parseInt(value))}>
                    <SelectTrigger className="bg-background/50 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCATION_OPTIONS.map((location) => (
                        <SelectItem key={location.code} value={location.code.toString()}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Results:</span>
                  <span className="text-sm">10 top organic results</span>
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Estimated Cost:</span>
                  <span className="text-primary font-bold">
                    ${(() => {
                      const serpsNeeded = Math.ceil(limit / 10);
                      const cost = serpsNeeded === 0 ? 0 : 
                                 serpsNeeded === 1 ? 0.002 : 
                                 0.002 + ((serpsNeeded - 1) * 0.0015);
                      return cost.toFixed(3);
                    })()}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Pricing: $0.002 for first SERP (10 results), $0.0015 for each additional SERP.
                </div>
              </div>

              <Button 
                onClick={handleSearch}
                disabled={!keyword.trim() || isLoading}
                className="w-full bg-gradient-primary hover:shadow-button transition-smooth h-12 text-base font-semibold"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Analyzing SERP...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    Analyze SERP Results
                  </div>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {results.length > 0 && (
          <section id="serp-results" data-testid="serp-results" className="mt-6">
            <div ref={resultsRef} className="space-y-4">
              <h2 className="text-2xl font-bold">
                SERP Results for "{keyword}"
              </h2>
              <div className="space-y-4">
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
            </div>
          </section>
        )}
      </div>
    </section>
  );
};

export default SerpAnalysis;