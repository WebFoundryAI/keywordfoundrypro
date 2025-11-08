import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { KeywordResearchForm, KeywordFormData } from "@/components/KeywordResearchForm";
import { KeywordResult } from "@/components/KeywordResultsTable";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { invokeFunction, DataForSEOApiError } from "@/lib/invoke";
import { logger } from '@/lib/logger';
import { trackKeywordResearch } from '@/lib/analytics';
import { OnboardingTour } from '@/components/OnboardingTour';

const Research = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleFormSubmit = async (formData: KeywordFormData) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to perform keyword research.",
        variant: "destructive",
      });
      navigate('/');
      return;
    }

    // Refresh session to ensure token is valid
    const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
    logger.log('Session refresh result:', {
      hasSession: !!session,
      sessionError: sessionError,
      userId: session?.user?.id,
      hasAccessToken: !!session?.access_token,
      expiresAt: session?.expires_at
    });
    
    if (!session?.access_token) {
      logger.error('No valid session or access token found');
      toast({
        title: "Session Expired",
        description: "Your session has expired. Please sign in again.",
        variant: "destructive",
      });
      navigate('/');
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
      // Detailed pre-invocation logging
      logger.log('=== CLIENT: About to invoke edge function ===');
      logger.log('Function name:', 'keyword-research');
      logger.log('Has session:', !!session);
      logger.log('User ID:', session?.user?.id);
      logger.log('Has access token:', !!session.access_token);
      logger.log('Request body:', {
        keyword: formData.keyword.trim(),
        languageCode: formData.languageCode,
        locationCode: formData.locationCode,
        limit: formData.limit
      });
      logger.log('Timestamp:', new Date().toISOString());
      
      const data = await invokeFunction('keyword-research', {
        keyword: formData.keyword.trim(),
        languageCode: formData.languageCode,
        languageName: formData.languageName,
        locationCode: formData.locationCode,
        locationName: formData.locationName,
        limit: formData.limit
      });
      
      logger.log('=== CLIENT: Function invocation response ===');
      logger.log('Has data:', !!data);
      if (data) {
        logger.log('Data received:', data);
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
      
      // Track successful keyword research
      trackKeywordResearch(data.total_results || convertedResults.length);
      
        // Navigate to results page with research ID in URL
        navigate(`/keyword-results?id=${data.research_id}`);
      
    } catch (err: any) {
      logger.error('Keyword research error:', err);
      logger.error('Error status:', err?.status);
      logger.error('Error response preview:', JSON.stringify(err).slice(0, 300));
      
      // Handle DataForSEO specific errors with helpful messages
      if (err instanceof DataForSEOApiError) {
        if (err.isRateLimit) {
          toast({
            title: "Rate Limit Exceeded",
            description: "API rate limit reached. Please wait a few minutes before trying again.",
            variant: "destructive",
            action: (
              <a 
                href="https://docs.lovable.dev/tips-tricks/troubleshooting#dataforseo" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline text-sm"
              >
                Learn more
              </a>
            ),
          });
        } else if (err.isCreditsExhausted) {
          toast({
            title: "API Credits Exhausted",
            description: "API credits have been exhausted. Please add credits to your account.",
            variant: "destructive",
            action: (
              <a 
                href="https://docs.lovable.dev/tips-tricks/troubleshooting#dataforseo" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline text-sm"
              >
                Learn more
              </a>
            ),
          });
        } else {
          toast({
            title: "API Error",
            description: err.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Analysis Failed",
          description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
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
      <OnboardingTour />
      <div className="container mx-auto max-w-4xl space-y-6">
        <KeywordResearchForm
          onSubmit={handleFormSubmit}
          isLoading={isLoading}
        />
        {/* ISSUE FIX #4: Enhanced loading indicator for long-running queries */}
        {isLoading && (
          <LoadingIndicator
            isLoading={isLoading}
            message="Analyzing keywords..."
            showProgress={true}
            estimatedDuration={10}
          />
        )}
      </div>
    </section>
  );
};

export default Research;