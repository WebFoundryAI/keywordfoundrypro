import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { KeywordResearchForm, KeywordFormData } from "@/components/KeywordResearchForm";
import { KeywordResultsTable, KeywordResult } from "@/components/KeywordResultsTable";
import { KeywordMetricsSummary } from "@/components/KeywordMetricsSummary";
import { UserMenu } from "@/components/UserMenu";
import { Navigation } from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Search, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Research = () => {
  const [results, setResults] = useState<KeywordResult[]>([]);
  const [seedKeyword, setSeedKeyword] = useState<KeywordResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [keywordAnalyzed, setKeywordAnalyzed] = useState<string>("");
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const metricsSummaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleFormSubmit = async (formData: KeywordFormData) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('keyword-research', {
        body: {
          keyword: formData.keyword,
          languageCode: formData.languageCode,
          locationCode: formData.locationCode,
          limit: formData.limit
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to analyze keywords');
      }

      if (data.success && data.results) {
        // Convert snake_case API response to camelCase for frontend
        const convertedResults = data.results.map((result: any) => ({
          keyword: result.keyword,
          searchVolume: result.search_volume || 0,
          cpc: result.cpc || 0,
          intent: result.intent || 'informational',
          difficulty: result.difficulty || 0,
          suggestions: result.suggestions || [],
          related: result.related_keywords || [],
          clusterId: result.cluster_id,
          metricsSource: result.metrics_source || 'dataforseo_labs'
        }));
        
        // Separate seed keyword from other results
        const seedKeywordResult = convertedResults.find(r => 
          r.keyword.toLowerCase() === formData.keyword.toLowerCase()
        );
        const otherResults = convertedResults.filter(r => 
          r.keyword.toLowerCase() !== formData.keyword.toLowerCase()
        );
        
        setSeedKeyword(seedKeywordResult || null);
        setResults(otherResults);
        setKeywordAnalyzed(formData.keyword);
        // Store the keyword for other pages
        localStorage.setItem('lastKeyword', formData.keyword);
        toast({
          title: "Analysis Complete",
          description: `Found ${data.total_results} keywords for "${formData.keyword}" (Cost: $${data.estimated_cost})`,
        });
        
        // Scroll to metrics summary after successful analysis
        setTimeout(() => {
          metricsSummaryRef.current?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }, 100);
      } else {
        throw new Error(data.error || 'No results found');
      }
    } catch (error) {
      console.error('Keyword research error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to analyze keywords. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = (format: 'csv' | 'json') => {
    if (results.length === 0) return;
    
    let content: string;
    let filename: string;
    let mimeType: string;
    
    if (format === 'csv') {
      const headers = ['Keyword', 'Search Volume', 'CPC', 'Intent', 'Difficulty'];
      const csvRows = [
        headers.join(','),
        ...results.map(r => [
          `"${r.keyword}"`,
          r.searchVolume,
          r.cpc,
          r.intent,
          r.difficulty
        ].join(','))
      ];
      content = csvRows.join('\n');
      filename = 'keyword-research.csv';
      mimeType = 'text/csv';
    } else {
      content = JSON.stringify(results, null, 2);
      filename = 'keyword-research.json';
      mimeType = 'application/json';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export Complete",
      description: `Downloaded ${results.length} keywords as ${format.toUpperCase()}`,
    });
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
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Search className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Keyword Research</h1>
                <p className="text-xs text-muted-foreground">Professional SEO Analysis</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Navigation />
              {user && <UserMenu />}
            </div>
          </div>
        </div>
      </header>

      {/* Research Tool */}
      <section className="px-6 py-8">
        <div className="container mx-auto max-w-4xl space-y-6">
          <KeywordResearchForm 
            onSubmit={handleFormSubmit}
            isLoading={isLoading}
          />
          
          {/* Metrics Summary - shown after analysis */}
          {keywordAnalyzed && results.length > 0 && (
            <div ref={metricsSummaryRef} className="mb-6">
              <KeywordMetricsSummary
                keyword={keywordAnalyzed}
                totalKeywords={results.length + (seedKeyword ? 1 : 0)}
                totalVolume={results.reduce((sum, r) => sum + r.searchVolume, 0) + (seedKeyword?.searchVolume || 0)}
                avgDifficulty={results.length > 0 ? results.reduce((sum, r) => sum + r.difficulty, 0) / results.length : 0}
                avgCpc={results.length > 0 ? results.reduce((sum, r) => sum + r.cpc, 0) / results.length : 0}
              />
            </div>
          )}
          
          {/* Seed Keyword Display */}
          {seedKeyword && (
            <Card className="bg-gradient-card shadow-card border-border/50">
              <CardHeader>
                <CardTitle>Seed Keyword Analysis</CardTitle>
                <CardDescription>
                  Analysis for your primary keyword: "{seedKeyword.keyword}"
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-background/50 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">Search Volume</div>
                    <div className="text-2xl font-bold">{seedKeyword.searchVolume.toLocaleString()}</div>
                  </div>
                  <div className="bg-background/50 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">Difficulty</div>
                    <div className="text-2xl font-bold text-warning">{seedKeyword.difficulty}</div>
                  </div>
                  <div className="bg-background/50 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">CPC</div>
                    <div className="text-2xl font-bold">${seedKeyword.cpc.toFixed(2)}</div>
                  </div>
                  <div className="bg-background/50 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">Intent</div>
                    <div className="text-lg font-medium">
                      <Badge variant="outline" className="text-xs">
                        {seedKeyword.intent}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          <KeywordResultsTable 
            results={results}
            isLoading={isLoading}
            onExport={handleExport}
          />
        </div>
      </section>
    </div>
  );
};

export default Research;