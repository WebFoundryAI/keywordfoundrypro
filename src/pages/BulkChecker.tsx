import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { KeywordResultsTable, KeywordResult } from "@/components/KeywordResultsTable";
import { logger } from '@/lib/logger';
import { trackExport } from '@/lib/analytics';


const BulkChecker = () => {
  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("United Kingdom");
  const [language, setLanguage] = useState("English");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<KeywordResult[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    volumeMin: null as number | null,
    volumeMax: null as number | null,
    difficultyMin: null as number | null,
    difficultyMax: null as number | null,
    cpcMin: null as number | null,
    intent: null as string | null,
  });
  
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Load persisted results from localStorage
  useEffect(() => {
    const savedResults = localStorage.getItem('bulkCheckerResults');
    if (savedResults) {
      try {
        setResults(JSON.parse(savedResults));
      } catch (error) {
        console.error('Failed to parse saved results:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth/sign-in');
    }
  }, [user, loading, navigate]);

  const handleCheck = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to use the bulk checker.",
        variant: "destructive",
      });
      navigate('/auth/sign-in');
      return;
    }

    // Parse keywords
    const keywordList = keywords
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    // Validation
    if (keywordList.length === 0) {
      toast({
        title: "No Keywords",
        description: "Please enter at least one keyword.",
        variant: "destructive",
      });
      return;
    }

    if (keywordList.length > 50) {
      toast({
        title: "Too Many Keywords",
        description: "Maximum 50 keywords allowed. Please reduce your list.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Refresh session
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      logger.log('Session refresh result:', {
        hasSession: !!session,
        sessionError: sessionError,
      });

      if (!session?.access_token) {
        logger.error('No valid session or access token found');
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please sign in again.",
          variant: "destructive",
        });
        navigate('/auth/sign-in');
        return;
      }

      logger.log('Calling bulk-keyword-checker function');

      // Call edge function
      const { data, error } = await supabase.functions.invoke('bulk-keyword-checker', {
        body: {
          keywords: keywordList,
          location,
          language
        }
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to check keywords');
      }

      const fetchedResults: KeywordResult[] = (data.results || []).map((r: any) => ({
        keyword: r.keyword,
        searchVolume: r.search_volume,
        cpc: (r.low_top_of_page_bid + r.high_top_of_page_bid) / 2,
        intent: 'commercial' as const,
        difficulty: r.competition_index,
        suggestions: [],
        related: [],
        metricsSource: 'dataforseo_ads' as const
      }));
      setResults(fetchedResults);
      
      // Persist to localStorage
      localStorage.setItem('bulkCheckerResults', JSON.stringify(fetchedResults));

      toast({
        title: "Keywords Checked",
        description: `Successfully checked ${fetchedResults.length} keywords (Cost: $${data.cost?.toFixed(4) || '0.00'})`,
      });

    } catch (err: any) {
      logger.error('Bulk checker error:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to check keywords. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToResearch = async () => {
    if (!user || results.length === 0) return;

    try {
      setIsLoading(true);

      // Create a keyword_research entry
      const { data: researchData, error: researchError } = await supabase
        .from('keyword_research')
        .insert({
          user_id: user.id,
          seed_keyword: `Bulk Check - ${new Date().toLocaleDateString()}`,
          location_code: 2826, // Default to UK
          location_name: location,
          language_code: 'en',
          language_name: language,
          total_results: results.length,
          query_source: 'bulk_checker',
        })
        .select()
        .single();

      if (researchError) throw researchError;

      // Create keyword_results entries
      const keywordResultsData = results.map(r => ({
        research_id: researchData.id,
        keyword: r.keyword,
        search_volume: r.searchVolume,
        cpc: r.cpc,
        difficulty: r.difficulty,
        intent: r.intent,
        suggestions: r.suggestions || [],
        related_keywords: r.related || [],
        metrics_source: r.metricsSource || 'dataforseo_ads',
      }));

      const { error: resultsError } = await supabase
        .from('keyword_results')
        .insert(keywordResultsData);

      if (resultsError) throw resultsError;

      toast({
        title: "Saved to My Research",
        description: `${results.length} keywords saved successfully`,
      });

      // Navigate to the results page
      navigate(`/keyword-results?id=${researchData.id}`);
    } catch (error: any) {
      logger.error('Save to research error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save results",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setResults([]);
    localStorage.removeItem('bulkCheckerResults');
    toast({
      title: "Results Cleared",
      description: "All results have been removed.",
    });
  };

  const handleExport = async (format: 'csv' | 'json' | 'txt') => {
    if (results.length === 0) {
      toast({
        title: "No Data",
        description: "No results to export.",
        variant: "destructive",
      });
      return;
    }

    try {
      const exportData = results.map(r => ({
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
            r.cpc?.toFixed(2) ?? '',
            r.intent || '',
            r.difficulty ?? ''
          ].join(','))
        ];
        content = rows.join('\n');
        filename = `bulk-keywords-${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      } else if (format === 'txt') {
        content = exportData.map(r => r.keyword).join('\n');
        filename = `bulk-keywords-${new Date().toISOString().split('T')[0]}.txt`;
        mimeType = 'text/plain';
      } else {
        content = JSON.stringify(exportData, null, 2);
        filename = `bulk-keywords-${new Date().toISOString().split('T')[0]}.json`;
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
        description: `Downloaded ${results.length} keywords`,
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


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Bulk Keyword Checker</h1>
          <p className="text-muted-foreground mt-1">
            Check search volume and competition for up to 50 keywords at once
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enter Keywords</CardTitle>
          <CardDescription>
            Enter one keyword per line (maximum 50 keywords)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="keywords">Keywords</Label>
            <Textarea
              id="keywords"
              placeholder="blocked drains swindon&#10;cctv drain survey&#10;drain unblocking..."
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground">
              {keywords.split('\n').filter(k => k.trim()).length} / 50 keywords
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger id="location">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                  <SelectItem value="United States">United States</SelectItem>
                  <SelectItem value="Canada">Canada</SelectItem>
                  <SelectItem value="Australia">Australia</SelectItem>
                  <SelectItem value="Germany">Germany</SelectItem>
                  <SelectItem value="France">France</SelectItem>
                  <SelectItem value="Spain">Spain</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Spanish">Spanish</SelectItem>
                  <SelectItem value="French">French</SelectItem>
                  <SelectItem value="German">German</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleCheck}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? "Checking Keywords..." : "Check Keywords"}
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleSaveToResearch}
              disabled={isLoading}
            >
              Save to My Research
            </Button>
            <Button variant="outline" size="sm" onClick={handleClear}>
              Clear Results
            </Button>
          </div>
          
          <KeywordResultsTable
            results={results.filter(r => {
              if (searchTerm && !r.keyword.toLowerCase().includes(searchTerm.toLowerCase())) {
                return false;
              }
              if (filters.volumeMin && (r.searchVolume || 0) < filters.volumeMin) {
                return false;
              }
              if (filters.volumeMax && (r.searchVolume || 0) > filters.volumeMax) {
                return false;
              }
              if (filters.difficultyMin && (r.difficulty || 0) < filters.difficultyMin) {
                return false;
              }
              if (filters.difficultyMax && (r.difficulty || 0) > filters.difficultyMax) {
                return false;
              }
              if (filters.cpcMin && (r.cpc || 0) < filters.cpcMin) {
                return false;
              }
              if (filters.intent && r.intent?.toLowerCase() !== filters.intent.toLowerCase()) {
                return false;
              }
              return true;
            })}
            totalCount={results.length}
            searchTerm={searchTerm}
            seedKeyword={null}
            keywordAnalyzed={null}
            onSearchChange={setSearchTerm}
            onFiltersChange={(newFilters) => {
              setFilters({
                volumeMin: newFilters.volumeMin ? (typeof newFilters.volumeMin === 'string' ? parseInt(newFilters.volumeMin) : newFilters.volumeMin) : null,
                volumeMax: newFilters.volumeMax ? (typeof newFilters.volumeMax === 'string' ? parseInt(newFilters.volumeMax) : newFilters.volumeMax) : null,
                difficultyMin: newFilters.difficultyMin ? (typeof newFilters.difficultyMin === 'string' ? parseInt(newFilters.difficultyMin) : newFilters.difficultyMin) : null,
                difficultyMax: newFilters.difficultyMax ? (typeof newFilters.difficultyMax === 'string' ? parseInt(newFilters.difficultyMax) : newFilters.difficultyMax) : null,
                cpcMin: newFilters.cpcMin ? (typeof newFilters.cpcMin === 'string' ? parseFloat(newFilters.cpcMin) : newFilters.cpcMin) : null,
                intent: newFilters.intent ? String(newFilters.intent) : null,
              });
            }}
            locationCode={2826}
            onExport={handleExport}
          />
        </div>
      )}
    </div>
  );
};

export default BulkChecker;
