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
  const [results, setResults] = useState<KeywordResult[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [seedKeyword, setSeedKeyword] = useState<KeywordResult | null>(null);
  const [keywordAnalyzed, setKeywordAnalyzed] = useState<string>("");
  const [locationCode, setLocationCode] = useState<number>(2840);
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Get pagination and filter params from URL
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');
  const searchTerm = searchParams.get('search') || '';
  const volumeMin = searchParams.get('volumeMin');
  const volumeMax = searchParams.get('volumeMax');
  const difficultyMin = searchParams.get('difficultyMin');
  const difficultyMax = searchParams.get('difficultyMax');

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
          // Fetch location code from keyword_research table
          const { data: researchData, error: researchError } = await supabase
            .from('keyword_research')
            .select('location_code')
            .eq('id', researchId)
            .single();
            
          if (researchError) {
            logger.error('Error fetching research data:', researchError);
          } else if (researchData) {
            setLocationCode(researchData.location_code);
          }
          
          // Build query with filters
          let query = supabase
            .from('keyword_results')
            .select('*', { count: 'exact' })
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

          // Apply pagination
          const from = (page - 1) * pageSize;
          const to = from + pageSize - 1;
          query = query.range(from, to);

          // Execute query
          const { data: keywordResults, error, count } = await query;
            
          if (error) {
            logger.error('Error fetching keyword results:', error);
            toast({
              title: "Error",
              description: "Failed to load keyword results",
              variant: "destructive",
            });
            return;
          }

          // Set total count for pagination
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
          logger.error('Error loading keyword results:', error);
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
      logger.log('KeywordResults - Final component state:', {
        resultsLength: results.length,
        totalCount,
        seedKeyword,
        keywordAnalyzed,
        page,
        pageSize
      });
    }, 100);
  }, [user, loading, navigate, page, pageSize, searchTerm, volumeMin, volumeMax, difficultyMin, difficultyMax]);

  const handleExport = async (format: 'csv' | 'json' | 'txt') => {
    const researchId = localStorage.getItem('currentResearchId');
    if (!researchId) return;

    try {
      // Fetch ALL results for export (not just current page)
      const { data: allResults, error } = await supabase
        .from('keyword_results')
        .select('*')
        .eq('research_id', researchId);

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

            {/* Results Table (includes seed as first row) */}
            <KeywordResultsTable 
              results={results}
              isLoading={false}
              onExport={handleExport}
              seedKeyword={seedKeyword}
              keywordAnalyzed={keywordAnalyzed}
              locationCode={locationCode}
              // Pagination props
              totalCount={totalCount}
              page={page}
              pageSize={pageSize}
              onPageChange={(newPage) => {
                setSearchParams(prev => {
                  const params = new URLSearchParams(prev);
                  params.set('page', String(newPage));
                  return params;
                });
              }}
              onPageSizeChange={(newSize) => {
                setSearchParams(prev => {
                  const params = new URLSearchParams(prev);
                  params.set('pageSize', String(newSize));
                  params.set('page', '1'); // Reset to first page
                  return params;
                });
              }}
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
                  params.set('page', '1'); // Reset to first page
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
                  
                  params.set('page', '1'); // Reset to first page
                  return params;
                });
              }}
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
  );
};

export default KeywordResults;