import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { KeywordResultsTable, KeywordResult } from "@/components/KeywordResultsTable";
import { KeywordMetricsSummary } from "@/components/KeywordMetricsSummary";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { logger } from '@/lib/logger';
import { trackExport } from '@/lib/analytics';

const KeywordResults = () => {
  const [results, setResults] = useState<KeywordResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [researchData, setResearchData] = useState<{
    seedKeyword: string;
    locationCode: number;
  } | null>(null);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const researchId = searchParams.get('id');
  const searchTerm = searchParams.get('search') || '';
  const volumeMin = searchParams.get('volumeMin');
  const volumeMax = searchParams.get('volumeMax');
  const difficultyMin = searchParams.get('difficultyMin');
  const difficultyMax = searchParams.get('difficultyMax');
  const cpcMin = searchParams.get('cpcMin');
  const intent = searchParams.get('intent');

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      navigate('/auth/sign-in');
      return;
    }

    if (!researchId) {
      toast({
        title: "No Research ID",
        description: "Please start a new keyword research",
        variant: "destructive",
      });
      navigate('/research');
      return;
    }

    loadData();
  }, [user, authLoading, researchId]);

  const loadData = async () => {
    if (!researchId) return;

    try {
      setIsLoading(true);

      const { data: research, error: researchError } = await supabase
        .from('keyword_research')
        .select('seed_keyword, location_code')
        .eq('id', researchId)
        .single();

      if (researchError) throw researchError;
      if (!research) throw new Error('Research not found');

      setResearchData({
        seedKeyword: research.seed_keyword,
        locationCode: research.location_code
      });

      const { data: keywordResults, error: resultsError } = await supabase
        .from('keyword_results')
        .select('*')
        .eq('research_id', researchId);

      if (resultsError) throw resultsError;

      const converted: KeywordResult[] = (keywordResults || []).map(r => ({
        keyword: r.keyword,
        searchVolume: r.search_volume,
        cpc: r.cpc,
        intent: r.intent || 'informational',
        difficulty: r.difficulty,
        suggestions: r.suggestions || [],
        related: r.related_keywords || [],
        clusterId: r.cluster_id,
        metricsSource: r.metrics_source || 'dataforseo_labs'
      }));

      setResults(converted);
    } catch (error) {
      logger.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load keyword results",
        variant: "destructive",
      });
      navigate('/research');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredResults = results.filter(r => {
    if (searchTerm && !r.keyword.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (volumeMin && (r.searchVolume || 0) < parseInt(volumeMin)) {
      return false;
    }
    if (volumeMax && (r.searchVolume || 0) > parseInt(volumeMax)) {
      return false;
    }
    if (difficultyMin && (r.difficulty || 0) < parseInt(difficultyMin)) {
      return false;
    }
    if (difficultyMax && (r.difficulty || 0) > parseInt(difficultyMax)) {
      return false;
    }
    if (cpcMin && (r.cpc || 0) < parseFloat(cpcMin)) {
      return false;
    }
    if (intent && r.intent?.toLowerCase() !== intent.toLowerCase()) {
      return false;
    }
    return true;
  });

  const handleExport = async (format: 'csv' | 'json' | 'txt') => {
    if (!researchId) return;

    try {
      const exportData = filteredResults.map(r => ({
        keyword: r.keyword,
        searchVolume: r.searchVolume,
        cpc: r.cpc,
        intent: r.intent,
        difficulty: r.difficulty
      }));

      let content: string;
      let filename: string;
      let mimeType: string;
      
      if (format === 'csv') {
        const headers = ['Keyword', 'Search Volume', 'CPC', 'Intent', 'Difficulty'];
        const rows = [
          headers.join(','),
          ...exportData.map(r => [
            `"${r.keyword}"`,
            r.searchVolume ?? '',
            r.cpc ?? '',
            r.intent || '',
            r.difficulty ?? ''
          ].join(','))
        ];
        content = rows.join('\n');
        filename = 'keywords.csv';
        mimeType = 'text/csv';
      } else if (format === 'txt') {
        content = exportData.map(r => r.keyword).join('\n');
        filename = 'keywords.txt';
        mimeType = 'text/plain';
      } else {
        content = JSON.stringify(exportData, null, 2);
        filename = 'keywords.json';
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
        description: `Downloaded ${filteredResults.length} keywords`,
      });
    } catch (error) {
      logger.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export keywords",
        variant: "destructive"
      });
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!researchData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>No Research Found</CardTitle>
          </CardHeader>
          <CardContent>
            <button
              onClick={() => navigate('/research')}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Start New Research
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate metrics from UNFILTERED results for overview cards
  const totalVolume = results.reduce((sum, r) => sum + (r.searchVolume || 0), 0);
  const avgDifficulty = results.length > 0
    ? results.reduce((sum, r) => sum + (r.difficulty || 0), 0) / results.length
    : 0;
  const avgCpc = results.length > 0
    ? results.reduce((sum, r) => sum + (r.cpc || 0), 0) / results.length
    : 0;

  return (
    <section className="px-6 py-8">
      <div className="container mx-auto max-w-4xl space-y-6">
        <KeywordMetricsSummary
          keyword={researchData.seedKeyword}
          totalKeywords={results.length}
          totalVolume={totalVolume}
          avgDifficulty={avgDifficulty}
          avgCpc={avgCpc}
          locationCode={researchData.locationCode}
        />

        <KeywordResultsTable
          results={filteredResults}
          totalCount={results.length}
          searchTerm={searchTerm}
          seedKeyword={null}
          keywordAnalyzed={researchData.seedKeyword}
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
          locationCode={researchData.locationCode}
          onExport={handleExport}
        />
      </div>
    </section>
  );
};

export default KeywordResults;
