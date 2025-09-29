import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { KeywordResearchForm, KeywordFormData } from "@/components/KeywordResearchForm";
import { KeywordResult } from "@/components/KeywordResultsTable";
import { Header } from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

const Research = () => {
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
        
        // Store research ID for fetching from database
        localStorage.setItem('currentResearchId', data.research_id);
        localStorage.setItem('keywordAnalyzed', formData.keyword);
        localStorage.setItem('lastKeyword', formData.keyword);
        
        toast({
          title: "Analysis Complete",
          description: `Found ${data.total_results} keywords for "${formData.keyword}" (Cost: $${data.estimated_cost})`,
        });
        
        // Navigate to results page
        navigate('/keyword-results');
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
          <KeywordResearchForm 
            onSubmit={handleFormSubmit}
            isLoading={isLoading}
          />
        </div>
      </section>
    </div>
  );
};

export default Research;