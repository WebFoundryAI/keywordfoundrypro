import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { KeywordResultsTable, KeywordResult } from "@/components/KeywordResultsTable";
import { KeywordMetricsSummary } from "@/components/KeywordMetricsSummary";
import { Header } from "@/components/Header";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatNumber, formatDifficulty, formatCurrency, getDifficultyColor } from "@/lib/utils";

const KeywordResults = () => {
  const [results, setResults] = useState<KeywordResult[]>([]);
  const [seedKeyword, setSeedKeyword] = useState<KeywordResult | null>(null);
  const [keywordAnalyzed, setKeywordAnalyzed] = useState<string>("");
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth/sign-in');
      return;
    }

    const loadKeywordResults = async () => {
      const researchId = localStorage.getItem('currentResearchId');
      const storedKeywordAnalyzed = localStorage.getItem('keywordAnalyzed');
      
      if (researchId && storedKeywordAnalyzed) {
        try {
          // Fetch results from database
          const { data: keywordResults, error } = await supabase
            .from('keyword_results')
            .select('*')
            .eq('research_id', researchId);
            
          if (error) {
            console.error('Error fetching keyword results:', error);
            toast({
              title: "Error",
              description: "Failed to load keyword results",
              variant: "destructive",
            });
            return;
          }
          
          // Convert to frontend format
          const convertedResults = keywordResults.map(result => ({
            keyword: result.keyword,
            searchVolume: result.search_volume ?? null,
            cpc: result.cpc ?? null,
            intent: result.intent || 'informational',
            difficulty: result.difficulty ?? null,
            suggestions: result.suggestions || [],
            related: result.related_keywords || [],
            clusterId: result.cluster_id,
            metricsSource: result.metrics_source || 'dataforseo_labs'
          }));
          
          // Normalize whitespace for comparison (handles "survival bushcraft" vs "survival  bushcraft")
          const normalizeKeyword = (kw: string) => kw.toLowerCase().replace(/\s+/g, ' ').trim();
          const normalizedStored = normalizeKeyword(storedKeywordAnalyzed);
          
          // Separate seed keyword from other results
          const seedKeywordResult = convertedResults.find(r => 
            normalizeKeyword(r.keyword) === normalizedStored
          );
          const otherResults = convertedResults.filter(r => 
            normalizeKeyword(r.keyword) !== normalizedStored
          );
          
          // Always create a seed keyword, even if not found in results
          const finalSeedKeyword = seedKeywordResult || {
            keyword: storedKeywordAnalyzed,
            searchVolume: 0, // Show 0 when no data (safe default)
            cpc: 0, // Show 0 when no data (safe default)
            intent: 'informational',
            difficulty: null, // null displays as "—" (truly missing)
            suggestions: [],
            related: [],
            metricsSource: 'dataforseo_labs',
            isSeedKeyword: true
          };
          
          // Include seed keyword as first row in results
          const allResults = [{ ...finalSeedKeyword, isSeedKeyword: true }, ...otherResults];
          
          setResults(allResults);
          setSeedKeyword(finalSeedKeyword);
          setKeywordAnalyzed(storedKeywordAnalyzed);
          
        } catch (error) {
          console.error('Error loading keyword results:', error);
          toast({
            title: "Error", 
            description: "Failed to load keyword results",
            variant: "destructive",
          });
        }
      }
    };
    
    loadKeywordResults();

    // Also log final state
    setTimeout(() => {
      console.log('KeywordResults - Final component state:', {
        resultsLength: results.length,
        seedKeyword,
        keywordAnalyzed
      });
    }, 100);
  }, [user, loading, navigate]);

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
          r.searchVolume === null || r.searchVolume === undefined ? '—' : r.searchVolume,
          r.cpc === null || r.cpc === undefined ? '—' : r.cpc,
          r.intent,
          r.difficulty === null || r.difficulty === undefined ? '—' : r.difficulty
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
      <Header user={user} />

      <section className="px-6 py-8">
        <div className="container mx-auto max-w-4xl space-y-6">
          {keywordAnalyzed && results.length > 0 && seedKeyword && (
            <>
              {/* Seed Keyword Summary Hero Box */}
              <KeywordMetricsSummary 
                keyword={keywordAnalyzed}
                totalKeywords={results.length}
                totalVolume={results.reduce((sum, r) => sum + (r.searchVolume ?? 0), 0)}
                avgDifficulty={results.length > 0 
                  ? Math.round(results.reduce((sum, r) => sum + (r.difficulty ?? 0), 0) / results.length)
                  : null}
                avgCpc={results.length > 0
                  ? results.reduce((sum, r) => sum + (r.cpc ?? 0), 0) / results.length
                  : null}
              />
              
              {/* Seed Keyword Metrics Card */}
              <Card className="bg-gradient-card shadow-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Seed Keyword: "{keywordAnalyzed}"</CardTitle>
                  <CardDescription>
                    Primary keyword metrics
                    {seedKeyword.searchVolume === 0 && seedKeyword.cpc === 0 && seedKeyword.difficulty === null && (
                      <span className="ml-2 text-xs text-warning">
                        • No metrics returned by DataForSEO for this term
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-background/50 p-4 rounded-lg border border-border/30">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                          <span className="text-lg">🔍</span>
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">Volume</span>
                      </div>
                      <p className="text-2xl font-bold text-foreground">
                        {formatNumber(seedKeyword.searchVolume)}
                      </p>
                    </div>
                    
                    <div className="bg-background/50 p-4 rounded-lg border border-border/30">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-md bg-warning/10 flex items-center justify-center">
                          <span className="text-lg">🎯</span>
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">Difficulty</span>
                      </div>
                      <p className={`text-2xl font-bold ${getDifficultyColor(seedKeyword.difficulty)}`}>
                        {formatDifficulty(seedKeyword.difficulty)}
                      </p>
                    </div>
                    
                    <div className="bg-background/50 p-4 rounded-lg border border-border/30">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-md bg-success/10 flex items-center justify-center">
                          <span className="text-lg">💰</span>
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">CPC</span>
                      </div>
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrency(seedKeyword.cpc)}
                      </p>
                    </div>
                    
                    <div className="bg-background/50 p-4 rounded-lg border border-border/30">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-md bg-accent/10 flex items-center justify-center">
                          <span className="text-lg">🎭</span>
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">Intent</span>
                      </div>
                      <p className="text-lg font-semibold text-foreground capitalize">
                        {seedKeyword.intent}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Results Table (includes seed as first row) */}
              <KeywordResultsTable 
                results={results}
                isLoading={false}
                onExport={handleExport}
                seedKeyword={seedKeyword}
                keywordAnalyzed={keywordAnalyzed}
              />
            </>
          )}
          
          {!keywordAnalyzed && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No keyword results available. Please run a keyword research first.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default KeywordResults;