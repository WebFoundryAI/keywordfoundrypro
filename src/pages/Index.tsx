import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { KeywordResearchForm, KeywordFormData } from "@/components/KeywordResearchForm";
import { KeywordResultsTable, KeywordResult } from "@/components/KeywordResultsTable";
import { UserMenu } from "@/components/UserMenu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Search, Zap, Target, TrendingUp, Database } from "lucide-react";

const Index = () => {
  const [results, setResults] = useState<KeywordResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

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
        setResults(data.results);
        toast({
          title: "Analysis Complete",
          description: `Found ${data.total_results} keywords for "${formData.keyword}" (Cost: $${data.estimated_cost})`,
        });
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
                <h1 className="text-xl font-bold tracking-tight">KeywordSpark</h1>
                <p className="text-xs text-muted-foreground">Professional SEO Research</p>
              </div>
            </div>
            {user && <UserMenu />}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-6">
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
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="glass rounded-xl p-6 text-center hover-lift">
              <Database className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Real-time Data</h3>
              <p className="text-sm text-muted-foreground">Live search volume and competition metrics</p>
            </div>
            <div className="glass rounded-xl p-6 text-center hover-lift">
              <Target className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Intent Analysis</h3>
              <p className="text-sm text-muted-foreground">Automated classification of search intent</p>
            </div>
            <div className="glass rounded-xl p-6 text-center hover-lift">
              <TrendingUp className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Difficulty Score</h3>
              <p className="text-sm text-muted-foreground">Comprehensive ranking difficulty analysis</p>
            </div>
          </div>
        </div>
      </section>

      {/* Research Tool */}
      <section className="px-6 pb-16">
        <div className="container mx-auto max-w-6xl space-y-8">
          <KeywordResearchForm 
            onSubmit={handleFormSubmit}
            isLoading={isLoading}
          />
          
          <KeywordResultsTable 
            results={results}
            isLoading={isLoading}
            onExport={handleExport}
          />
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