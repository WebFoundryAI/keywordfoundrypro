import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { KeywordResultsTable, KeywordResult } from "@/components/KeywordResultsTable";
import { KeywordMetricsSummary } from "@/components/KeywordMetricsSummary";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { logger } from '@/lib/logger';
import { trackExport } from '@/lib/analytics';

const KeywordResults = () => {
  const [allResults, setAllResults] = useState<KeywordResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<KeywordResult[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [keywordAnalyzed, setKeywordAnalyzed] = useState<string>("");
  const [locationCode, setLocationCode] = useState<number>(2840);
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Get research ID from URL first, then fallback to localStorage
  const urlResearchId = searchParams.get('id');
  const localStorageResearchId = localStorage.getItem('currentResearchId');
  const researchId = urlResearchId || localStorageResearchId;

  // Get filter params from URL
  const searchTerm = searchParams.get('search') || '';
  const volumeMin = searchParams.get('volumeMin');
  const volumeMax = searchParams.get('volumeMax');
  const difficultyMin = searchParams.get('difficultyMin');
  const difficultyMax = searchParams.get('difficultyMax');
  const cpcMin = searchParams.get('cpcMin');
  const intent = searchParams.get('intent');

  // Effect 1: Initial data load
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth/sign-in');
      return;
    }

    const loadKeywordResults = async () => {
      try {
        setIsInitialLoading(true);
        
        // If no research ID provided, try to load the user's most recent research
        let finalResearchId = researchId;
        
        if (!finalResearchId && user) {
          const { data: recentResearch } = await supabase
            .from('keyword_research')
            .select('id, seed_keyword')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (recentResearch) {
            finalResearchId = recentResearch.id;
            setKeywordAnalyzed(recentResearch.seed_keyword);
            localStorage.setItem('currentResearchId', recentResearch.id);
            localStorage.setItem('keywordAnalyzed', recentResearch.seed_keyword);
          } else {
            logger.warn('No research found');
            setHasError(true);
            setIsInitialLoading(false);
            return;
          }
        }

        if (!finalResearchId) {
          setHasError(true);
          setIsInitialLoading(false);
          return;
        }
        
        // Fetch research details including seed keyword
        const { data: researchData, error: researchError } = await supabase
          .from('keyword_research')
          .select('location_code, seed_keyword')
          .eq('id', finalResearchId)
          .maybeSingle();

        if (researchError) {
          logger.error('Error fetching research data:', researchError);
          setHasError(true);
          setIsInitialLoading(false);
          return;
        }

        if (researchData) {
          setLocationCode(researchData.location_code);
          setKeywordAnalyzed(researchData.seed_keyword);
          localStorage.setItem('keywordAnalyzed', researchData.seed_keyword);
          localStorage.setItem('currentResearchId', finalResearchId);
        }

        // Fetch ALL results from database
        const { data: keywordResults, error, count } = await supabase
          .from('keyword_results')
          .select('*', { count: 'exact' })
          .eq('research_id', finalResearchId);
          
        if (error) {
          logger.error('Error fetching keyword results:', error);
          toast({
            title: "Error",
            description: "Failed to load keyword results",
            variant: "destructive",
          });
          setHasError(true);
          setIsInitialLoading(false);
          return;
        }

        logger.log('Fetched keyword results:', keywordResults?.length || 0);

        // Set total count
        setTotalCount(count || 0);
        
        // Convert to frontend format
        const convertedResults = (keywordResults || []).map(result => ({
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
        
        // Normalize whitespace for comparison
        const normalizeKeyword = (kw: string) => kw.toLowerCase().replace(/\s+/g, ' ').trim();
        const normalizedStored = normalizeKeyword(researchData?.seed_keyword || '');
        
        // Separate seed keyword from other results
        const seedKeywordResult = convertedResults.find(r => 
          normalizeKeyword(r.keyword) === normalizedStored
        );
        const otherResults = convertedResults.filter(r => 
          normalizeKeyword(r.keyword) !== normalizedStored
        );
        
        // Always create a seed keyword, even if not found in results
        const finalSeedKeyword = seedKeywordResult || {
          keyword: researchData?.seed_keyword || '',
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
        const allResultsWithSeed = [{ ...finalSeedKeyword, isSeedKeyword: true }, ...otherResults];
        
        setAllResults(allResultsWithSeed);
        setHasError(false);
        
        toast({
          title: "Success",
          description: `Loaded ${convertedResults.length} keyword results`,
        });
        
      } catch (error) {
        logger.error('Error loading keyword results:', error);
        toast({
          title: "Error", 
          description: "Failed to load keyword results",
          variant: "destructive",
        });
        setHasError(true);
      } finally {
        setIsInitialLoading(false);
      }
    };
    
    if (!loading) {
      loadKeywordResults();
    }
  }, [user, loading, navigate, toast, researchId]);

  // Effect 2: Client-side filtering
  useEffect(() => {
    let filtered = [...allResults];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.keyword.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply volume filters
    if (volumeMin && !isNaN(parseInt(volumeMin))) {
      filtered = filtered.filter(r => 
        (r.searchVolume ?? 0) >= parseInt(volumeMin)
      );
    }
    if (volumeMax && !isNaN(parseInt(volumeMax))) {
      filtered = filtered.filter(r => 
        (r.searchVolume ?? 0) <= parseInt(volumeMax)
      );
    }

    // Apply difficulty filters
    if (difficultyMin && !isNaN(parseInt(difficultyMin))) {
      filtered = filtered.filter(r => 
        (r.difficulty ?? 0) >= parseInt(difficultyMin)
      );
    }
    if (difficultyMax && !isNaN(parseInt(difficultyMax))) {
      filtered = filtered.filter(r => 
        (r.difficulty ?? 0) <= parseInt(difficultyMax)
      );
    }

    // Apply CPC filter
    if (cpcMin && !isNaN(parseFloat(cpcMin))) {
      filtered = filtered.filter(r => 
        (r.cpc ?? 0) >= parseFloat(cpcMin)
      );
    }

    // Apply intent filter
    if (intent && intent !== '') {
      filtered = filtered.filter(r => 
        r.intent?.toLowerCase() === intent.toLowerCase()
      );
    }

    setFilteredResults(filtered);
  }, [allResults, searchTerm, volumeMin, volumeMax, difficultyMin, difficultyMax, cpcMin, intent]);

  const handleExport = async (format: 'csv' | 'json' | 'txt') => {
    if (!researchId) return;

    try {
      // Build query with same filters as current view
      let query = supabase
        .from('keyword_results')
        .select('*')
        .eq('research_id', researchId);

      // Apply filters
      if (searchTerm) query = query.ilike('keyword', `%${searchTerm}%`);
      if (volumeMin) query = query.gte('search_volume', parseInt(volumeMin));
      if (volumeMax) query = query.lte('search_volume', parseInt(volumeMax));
      if (difficultyMin) query = query.gte('difficulty', parseInt(difficultyMin));
      if (difficultyMax) query = query.lte('difficulty', parseInt(difficultyMax));
      if (cpcMin) query = query.gte('cpc', parseFloat(cpcMin));
      if (intent && intent !== '') query = query.eq('intent', intent.toLowerCase());

      const { data: allResults, error } = await query;

      if (error) throw error;
      if (!allResults || allResults.length === 0) return;

      const exportData = allResults.map(result => ({
        keyword: result.keyword,
        searchVolume: result.search_volume,
        cpc: result.cpc,
        intent: result.intent,
        difficulty: result.difficulty
      }));

      let content: string;
      let filename: string;
      let mimeType: string;
      
      if (format === 'csv') {
        const headers = ['Keyword', 'Search Volume', 'CPC', 'Intent', 'Difficulty'];
        const csvRows = [
          headers.join(','),
          ...exportData.map(r => [
            `"${r.keyword}"`,
            r.searchVolume ?? '—',
            r.cpc ?? '—',
            r.intent || 'informational',
            r.difficulty ?? '—'
          ].join(','))
        ];
        content = csvRows.join('\n');
        filename = 'keyword-research.csv';
        mimeType = 'text/csv';
      } else if (format === 'txt') {
        const headers = ['Keyword', 'Search Volume', 'CPC', 'Intent', 'Difficulty'];
        const txtRows = [
          headers.join('\t'),
          ...exportData.map(r => [
            r.keyword,
            r.searchVolume ?? '—',
            r.cpc ?? '—',
            r.intent || 'informational',
            r.difficulty ?? '—'
          ].join('\t'))
        ];
        content = txtRows.join('\n');
        filename = 'keyword-research.txt';
        mimeType = 'text/plain';
      } else {
        content = JSON.stringify(exportData, null, 2);
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
      
      trackExport(format);
      
      toast({
        title: "Export Complete",
        description: `Downloaded ${allResults.length} keywords as ${format.toUpperCase()}`,
      });
    } catch (error) {
      logger.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export keyword results",
        variant: "destructive"
      });
    }
  };

  if (loading || isInitialLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading keyword results...</p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-destructive">⚠️</span>
              No Research Found
            </CardTitle>
            <CardDescription>
              We couldn't find any keyword research data. Please start a new keyword research to view results.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <button
              onClick={() => navigate('/research')}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Start New Research
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <section className="px-6 py-8">
      <div className="container mx-auto max-w-4xl space-y-6">
        {!isInitialLoading && allResults.length > 0 && (
          <>
            {/* Seed Keyword Summary Hero Box */}
            <KeywordMetricsSummary
              keyword={keywordAnalyzed || 'Unknown'}
              totalKeywords={filteredResults.length}
              totalVolume={filteredResults.reduce((sum, r) => sum + (r.searchVolume ?? 0), 0)}
              avgDifficulty={filteredResults.length > 0 
                ? Math.round(filteredResults.reduce((sum, r) => sum + (r.difficulty ?? 0), 0) / filteredResults.length)
                : null}
              avgCpc={filteredResults.length > 0
                ? filteredResults.reduce((sum, r) => sum + (r.cpc ?? 0), 0) / filteredResults.length
                : null}
              locationCode={locationCode}
            />

            {/* Results Table */}
            <KeywordResultsTable
              results={allResults}
              searchTerm={searchTerm}
              seedKeyword={null}
              keywordAnalyzed={keywordAnalyzed || 'Unknown'}
              onSearchChange={(value) => {
                setSearchParams(prev => {
                  const newParams = new URLSearchParams(prev);
                  if (value) {
                    newParams.set('search', value);
                  } else {
                    newParams.delete('search');
                  }
                  return newParams;
                });
              }}
              onFiltersChange={(filters) => {
                setSearchParams(prev => {
                  const newParams = new URLSearchParams(prev);
                  
                  Object.entries(filters).forEach(([key, value]) => {
                    if (value !== null && value !== undefined && value !== '') {
                      newParams.set(key, value.toString());
                    } else {
                      newParams.delete(key);
                    }
                  });
                  
                  return newParams;
                });
              }}
              locationCode={locationCode}
              onExport={handleExport}
            />
          </>
        )}

        {!isInitialLoading && allResults.length === 0 && !hasError && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No keyword results found for this research</p>
                <button
                  onClick={() => navigate('/research')}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  Start New Research
                </button>
              </div>
            )}
      </div>
    </section>
  );
};

export default KeywordResults;
