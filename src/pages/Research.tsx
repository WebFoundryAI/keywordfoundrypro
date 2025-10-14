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
      navigate('/auth/sign-in');
    }
  }, [user, loading, navigate]);

  const handleFormSubmit = async (formData: KeywordFormData) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to perform keyword research.",
        variant: "destructive",
      });
      navigate('/auth/sign-in');
      return;
    }

    // Check session validity
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('Current session check:', {
      hasSession: !!session,
      sessionError: sessionError,
      userId: session?.user?.id,
      expiresAt: session?.expires_at
    });
    
    if (!session) {
      console.error('No valid session found');
      toast({
        title: "Session Expired",
        description: "Your session has expired. Please sign in again.",
        variant: "destructive",
      });
      navigate('/auth/sign-in');
      return;
    }

    // Input validation
    if (!formData.keyword || formData.keyword.trim().length < 2) {
      toast({
        title: "Invalid Keyword",
        description: "Please enter a keyword with at least 2 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('keyword-research', {
        body: {
          keyword: formData.keyword.trim(),
          languageCode: formData.languageCode,
          locationCode: formData.locationCode,
          limit: formData.limit
        }
      });

      if (error) {
        console.error('Function invocation error:', error);
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          context: (error as any).context,
          status: (error as any).status
        });
        
        // Provide specific error messages
        let errorMessage = 'Failed to analyze keywords. Please try again.';
        
        if (error.message.includes('FunctionsRelayError')) {
          errorMessage = 'API service temporarily unavailable. Please try again in a moment.';
        } else if (error.message.includes('FunctionsFetchError')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('Unauthorized')) {
          errorMessage = 'Session expired. Please sign in again.';
          setTimeout(() => navigate('/auth/sign-in'), 2000);
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        throw new Error(errorMessage);
      }

      // Check for API response errors
      if (!data) {
        throw new Error('No response received from server. Please try again.');
      }

      if (!data.success) {
        const errorMsg = data.error || 'Analysis failed. Please try again.';
        throw new Error(errorMsg);
      }

      if (!data.results || data.results.length === 0) {
        toast({
          title: "No Results Found",
          description: `No keyword data found for "${formData.keyword}". Try a different keyword.`,
          variant: "destructive",
        });
        return;
      }

      // Convert snake_case API response to camelCase for frontend
      const convertedResults = data.results.map((result: any) => ({
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
      localStorage.setItem('lastLanguageCode', formData.languageCode);
      localStorage.setItem('lastLocationCode', formData.locationCode.toString());
      
      // Build success message
      let description = `Found ${data.total_results} keywords for "${formData.keyword}" (Cost: $${data.estimated_cost})`;
      
      // Add discreet note if seed keyword has no metrics
      if (data.seed_keyword_note) {
        description += `. Note: ${data.seed_keyword_note}`;
      }
      
      toast({
        title: "Analysis Complete",
        description: description,
      });
      
      // Navigate to results page
      navigate('/keyword-results');
      
    } catch (error) {
      console.error('Keyword research error:', error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
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