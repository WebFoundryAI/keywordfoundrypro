import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { KeywordResultsTable, KeywordResult } from "@/components/KeywordResultsTable";
import { KeywordMetricsSummary } from "@/components/KeywordMetricsSummary";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatNumber, formatDifficulty, formatCurrency, getDifficultyColor } from "@/lib/utils";
import { logger } from '@/lib/logger';
import { trackExport } from '@/lib/analytics';

const KeywordResults = () => {
  const [allResults, setAllResults] = useState<KeywordResult[]>([]); // Store all results from DB
  const [filteredResults, setFilteredResults] = useState<KeywordResult[]>([]); // Filtered results for display
  const [totalCount, setTotalCount] = useState<number>(0);
  const [seedKeyword, setSeedKeyword] = useState<KeywordResult | null>(null);
  const [keywordAnalyzed, setKeywordAnalyzed] = useState<string>("");
  const [locationCode, setLocationCode] = useState<number>(2840);
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Get filter params from URL (pagination removed - show all results)
  const searchTerm = searchParams.get('search') || '';
  const volumeMin = searchParams.get('volumeMin');
  const volumeMax = searchParams.get('volumeMax');
  const difficultyMin = searchParams.get('difficultyMin');
  const difficultyMax = searchParams.get('difficultyMax');
  const cpcMin = searchParams.get('cpcMin');
  const intent = searchParams.get('intent');

  // Effect 1: Initial data load (runs once on mount)
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth/sign-in');
      return;
    }

    const loadKeywordResults = async () => {
      const researchId = localStorage.getItem('currentResearchId');
      const storedKeywordAnalyzed = localStorage.getItem('keywordAnalyzed');

      // Guard: If no seed keyword context, show error instead of redirecting
      if (!researchId || !storedKeywordAnalyzed) {
        logger.warn('No seed keyword context found');
        setHasError(true);
        setIsInitialLoading(false);
        return;
      }

      try {
        setIsInitialLoading(true);
        
        // Fetch location code from keyword_research table
        const { data: researchData, error: researchError } = await supabase
          .from('keyword_research')
          .select('location_code')
          .eq('id', researchId)
          .maybeSingle();

        if (researchError) {
          logger.error('Error fetching research data:', researchError);
        } else if (researchData) {
          setLocationCode(researchData.location_code);
        }

        // Fetch ALL results from database (no filters in query)
        const { data: keywordResults, error, count } = await supabase
          .from('keyword_results')
          .select('*', { count: 'exact' })
          .eq('research_id', researchId);
          
        if (error) {
          logger.error('Error fetching keyword results:', error);
          toast({
            title: "Error",
            description: "Failed to load keyword results",
            variant: "destructive",
          });
          setHasError(true);
          return;
        }

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
        setSeedKeyword(finalSeedKeyword);
        setKeywordAnalyzed(storedKeywordAnalyzed);
        setHasError(false);
        
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
  }, [user, loading, navigate, toast]);

  // Effect 2: Client-side filtering (no database queries!)
  useEffect(() => {
    if (allResults.length === 0) {
      setFilteredResults([]);
      return;
    }

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
    const researchId = localStorage.getItem('currentResearchId');
    if (!researchId) return;

    try {
      // Build query with same filters as current view
      let query = supabase
        .from('keyword_results')
        .select('*')
        .eq('research_id', researchId);

      // Apply search filter
      if (searchTerm) {
        query = query.ilike('keyword', `%${searchTerm}%`);
      }

      // Apply volume filters
      if (volumeMin) {
        query = query.gte('search_volume', parseInt(volumeMin));
      }
      if (volumeMax) {
        query = query.lte('search_volume', parseInt(volumeMax));
      }

      // Apply difficulty filters
      if (difficultyMin) {
        query = query.gte('difficulty', parseInt(difficultyMin));
      }
      if (difficultyMax) {
        query = query.lte('difficulty', parseInt(difficultyMax));
      }

      // Apply CPC filter
      if (cpcMin) {
        query = query.gte('cpc', parseFloat(cpcMin));
      }

      // Apply Intent filter
      if (intent && intent !== '') {
        query = query.eq('intent', intent.toLowerCase());
      }

      // Fetch filtered results for export
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
            r.searchVolume === null || r.searchVolume === undefined ? '—' : r.searchVolume,
            r.cpc === null || r.cpc === undefined ? '—' : r.cpc,
            r.intent || 'informational',
            r.difficulty === null || r.difficulty === undefined ? '—' : r.difficulty
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
            r.searchVolume === null || r.searchVolume === undefined ? '—' : r.searchVolume,
            r.cpc === null || r.cpc === undefined ? '—' : r.cpc,
            r.intent || 'informational',
            r.difficulty === null || r.difficulty === undefined ? '—' : r.difficulty
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
      
      // Track export event
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
        {keywordAnalyzed && allResults.length > 0 && seedKeyword && (
          <>
            {/* Seed Keyword Summary Hero Box */}
            <KeywordMetricsSummary 
              keyword={keywordAnalyzed}
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
                      {formatCurrency(seedKeyword.cpc, locationCode)}
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

            {/* Results Table (includes seed as first row) - no pagination, shows all results */}
            <KeywordResultsTable
              results={filteredResults}
              isLoading={false}
              onExport={handleExport}
              seedKeyword={seedKeyword}
              keywordAnalyzed={keywordAnalyzed}
              locationCode={locationCode}
              // Filter props
              searchTerm={searchTerm}
              onSearchChange={(search) => {
                setSearchParams(prev => {
                  const params = new URLSearchParams(prev);
                  if (search) {
                    params.set('search', search);
                  } else {
                    params.delete('search');
                  }
                  return params;
                });
              }}
              onFiltersChange={(filters) => {
                setSearchParams(prev => {
                  const params = new URLSearchParams(prev);

                  // Volume filters
                  if (filters.volumeMin !== undefined) {
                    if (filters.volumeMin) {
                      params.set('volumeMin', String(filters.volumeMin));
                    } else {
                      params.delete('volumeMin');
                    }
                  }
                  if (filters.volumeMax !== undefined) {
                    if (filters.volumeMax) {
                      params.set('volumeMax', String(filters.volumeMax));
                    } else {
                      params.delete('volumeMax');
                    }
                  }

                  // Difficulty filters
                  if (filters.difficultyMin !== undefined) {
                    if (filters.difficultyMin) {
                      params.set('difficultyMin', String(filters.difficultyMin));
                    } else {
                      params.delete('difficultyMin');
                    }
                  }
                  if (filters.difficultyMax !== undefined) {
                    if (filters.difficultyMax) {
                      params.set('difficultyMax', String(filters.difficultyMax));
                    } else {
                      params.delete('difficultyMax');
                    }
                  }

                  // CPC filter
                  if (filters.cpcMin !== undefined) {
                    if (filters.cpcMin) {
                      params.set('cpcMin', String(filters.cpcMin));
                    } else {
                      params.delete('cpcMin');
                    }
                  }

                  // Intent filter
                  if (filters.intent !== undefined) {
                    if (filters.intent) {
                      params.set('intent', filters.intent);
                    } else {
                      params.delete('intent');
                    }
                  }

                  return params;
                });
              }}
              // UI customization - hide elements for cleaner display
              hideResultsCount={true}
              hideFilteringCaption={true}
            />

            {/* Summary pill below filters */}
            <div className="mt-2">
              <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                After filters: {filteredResults.length} shown • {totalCount} total
              </span>
            </div>
          </>
        )}
        
        {(!keywordAnalyzed || (allResults.length === 0 && !isInitialLoading)) && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No keyword results available. Please run a keyword research first.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default KeywordResults;