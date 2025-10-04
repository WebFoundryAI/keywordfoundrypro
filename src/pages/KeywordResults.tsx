import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { KeywordResultsTable, KeywordResult } from "@/components/KeywordResultsTable";
import { KeywordMetricsSummary } from "@/components/KeywordMetricsSummary";
import { Header } from "@/components/Header";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

const KeywordResults = () => {
  const [results, setResults] = useState<KeywordResult[]>([]);
  const [seedKeyword, setSeedKeyword] = useState<KeywordResult | null>(null);
  const [keywordAnalyzed, setKeywordAnalyzed] = useState<string>("");
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
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
            searchVolume: result.search_volume ?? 0,
            cpc: result.cpc ?? 0,
            intent: result.intent || 'informational',
            difficulty: result.difficulty ?? null,
            suggestions: result.suggestions || [],
            related: result.related_keywords || [],
            clusterId: result.cluster_id,
            metricsSource: result.metrics_source || 'dataforseo_labs'
          }));
          
          // Separate seed keyword from other results
          const seedKeywordResult = convertedResults.find(r => 
            r.keyword.toLowerCase() === storedKeywordAnalyzed.toLowerCase()
          );
          const otherResults = convertedResults.filter(r => 
            r.keyword.toLowerCase() !== storedKeywordAnalyzed.toLowerCase()
          );
          
          // Always create a seed keyword, even if not found in results
          const finalSeedKeyword = seedKeywordResult || {
            keyword: storedKeywordAnalyzed,
            searchVolume: 0,
            cpc: 0,
            intent: 'informational',
            difficulty: null,
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
      <Header user={user} />

      <section className="px-6 py-8">
        <div className="container mx-auto max-w-4xl">
          {keywordAnalyzed && results.length > 0 && (
            <KeywordResultsTable 
              results={results}
              isLoading={false}
              onExport={handleExport}
              seedKeyword={seedKeyword}
              keywordAnalyzed={keywordAnalyzed}
            />
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