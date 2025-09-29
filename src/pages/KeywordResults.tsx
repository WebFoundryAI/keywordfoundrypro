import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { KeywordResultsTable, KeywordResult } from "@/components/KeywordResultsTable";
import { KeywordMetricsSummary } from "@/components/KeywordMetricsSummary";
import { Header } from "@/components/Header";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

    console.log('KeywordResults - Starting to load from localStorage...');
    
    // Load results from localStorage
    const storedResults = localStorage.getItem('keywordResults');
    const storedSeedKeyword = localStorage.getItem('seedKeyword');
    const storedKeywordAnalyzed = localStorage.getItem('keywordAnalyzed');

    console.log('KeywordResults - Raw localStorage data:', {
      storedResults,
      storedSeedKeyword,
      storedKeywordAnalyzed,
      hasResults: !!storedResults,
      hasSeedKeyword: !!storedSeedKeyword,
      hasKeywordAnalyzed: !!storedKeywordAnalyzed
    });

    if (storedResults) {
      try {
        const parsedResults = JSON.parse(storedResults);
        console.log('KeywordResults - Parsed results:', parsedResults);
        setResults(parsedResults);
      } catch (error) {
        console.error('Error parsing stored results:', error);
      }
    }
    
    if (storedSeedKeyword) {
      try {
        const parsedSeedKeyword = JSON.parse(storedSeedKeyword);
        console.log('KeywordResults - Parsed seed keyword:', parsedSeedKeyword);
        setSeedKeyword(parsedSeedKeyword);
      } catch (error) {
        console.error('Error parsing stored seed keyword:', error);
      }
    }
    
    if (storedKeywordAnalyzed) {
      console.log('KeywordResults - Setting keyword analyzed:', storedKeywordAnalyzed);
      setKeywordAnalyzed(storedKeywordAnalyzed);
    }

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
        <div className="container mx-auto max-w-4xl space-y-6">
          {keywordAnalyzed && results.length > 0 && (
              <>
                {seedKeyword && (
                  <Card className="bg-gradient-card shadow-card border-border/50 mb-6">
                    <CardHeader>
                      <CardTitle>Seed Keyword: "{seedKeyword.keyword}"</CardTitle>
                      <CardDescription>
                        Core metrics for your primary keyword
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-background/50 rounded-lg p-4 text-center">
                          <div className="text-sm text-muted-foreground mb-1">Search Volume</div>
                          <div className="text-2xl font-bold text-success">{seedKeyword.searchVolume.toLocaleString()}</div>
                        </div>
                        <div className="bg-background/50 rounded-lg p-4 text-center">
                          <div className="text-sm text-muted-foreground mb-1">Difficulty</div>
                          <div className="text-2xl font-bold text-warning">{seedKeyword.difficulty}</div>
                        </div>
                        <div className="bg-background/50 rounded-lg p-4 text-center">
                          <div className="text-sm text-muted-foreground mb-1">CPC</div>
                          <div className="text-2xl font-bold text-primary">${seedKeyword.cpc.toFixed(2)}</div>
                        </div>
                        <div className="bg-background/50 rounded-lg p-4 text-center">
                          <div className="text-sm text-muted-foreground mb-1">Intent</div>
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
                  isLoading={false}
                  onExport={handleExport}
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