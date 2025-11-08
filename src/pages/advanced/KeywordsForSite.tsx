import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { KeywordResultsTable, KeywordResult } from "@/components/KeywordResultsTable";
import { logger } from '@/lib/logger';
import { trackExport } from '@/lib/analytics';

const KeywordsForSite = () => {
  const [target, setTarget] = useState("");
  const [targetType, setTargetType] = useState("site");
  const [location, setLocation] = useState("United Kingdom");
  const [language, setLanguage] = useState("English");
  const [includeSerpInfo, setIncludeSerpInfo] = useState(false);
  const [includeClickstream, setIncludeClickstream] = useState(false);
  const [limit, setLimit] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<KeywordResult[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<any>({});

  const { toast } = useToast();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth/sign-in');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const saved = localStorage.getItem('keywordsForSiteResults');
    if (saved) {
      try {
        setResults(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to parse saved results:', error);
      }
    }
  }, []);

  const handleFetch = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to use this feature.",
        variant: "destructive",
      });
      navigate('/auth/sign-in');
      return;
    }

    if (!target.trim()) {
      toast({
        title: "Target Required",
        description: "Please enter a domain or URL.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('keywords-for-site', {
        body: {
          target: target.trim(),
          target_type: targetType,
          location_name: location,
          language_name: language,
          include_serp_info: includeSerpInfo,
          include_clickstream_data: includeClickstream,
          limit
        }
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to fetch keywords');
      }

      const fetchedResults: KeywordResult[] = (data.results || []).map((r: any) => ({
        keyword: r.keyword,
        searchVolume: r.keyword_info?.search_volume || null,
        cpc: r.keyword_info?.cpc || null,
        intent: 'informational' as const,
        difficulty: r.keyword_info?.competition_index || null,
        suggestions: [],
        related: [],
        metricsSource: 'dataforseo_labs' as const
      }));

      setResults(fetchedResults);
      localStorage.setItem('keywordsForSiteResults', JSON.stringify(fetchedResults));

      toast({
        title: "Keywords Retrieved",
        description: `Found ${fetchedResults.length} keywords (Cost: $${data.cost?.toFixed(4) || '0.00'})`,
      });

    } catch (err: any) {
      logger.error('Keywords for site error:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to fetch keywords. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
        filename = `keywords-for-site-${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      } else if (format === 'txt') {
        content = exportData.map(r => r.keyword).join('\n');
        filename = `keywords-for-site-${new Date().toISOString().split('T')[0]}.txt`;
        mimeType = 'text/plain';
      } else {
        content = JSON.stringify(exportData, null, 2);
        filename = `keywords-for-site-${new Date().toISOString().split('T')[0]}.json`;
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
      <div>
        <h1 className="text-3xl font-bold">Keywords for Site</h1>
        <p className="text-muted-foreground mt-1">
          Find keywords that a specific domain or URL ranks for
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Configuration</CardTitle>
          <CardDescription>
            Enter a domain or URL to find all keywords it ranks for
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="target">Target Domain/URL *</Label>
            <Input
              id="target"
              placeholder="example.com or https://example.com/page"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetType">Target Type</Label>
              <Select value={targetType} onValueChange={setTargetType}>
                <SelectTrigger id="targetType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="site">Entire Site</SelectItem>
                  <SelectItem value="page">Specific Page</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="limit">Limit</Label>
              <Input
                id="limit"
                type="number"
                min="1"
                max="1000"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value) || 100)}
              />
            </div>
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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="includeSerpInfo">Include SERP Info</Label>
              <Switch
                id="includeSerpInfo"
                checked={includeSerpInfo}
                onCheckedChange={setIncludeSerpInfo}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="includeClickstream">Include Clickstream Data</Label>
              <Switch
                id="includeClickstream"
                checked={includeClickstream}
                onCheckedChange={setIncludeClickstream}
              />
            </div>
          </div>

          <Button
            onClick={handleFetch}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? "Fetching Keywords..." : "Fetch Keywords"}
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <KeywordResultsTable
          results={results.filter(r => {
            if (searchTerm && !r.keyword.toLowerCase().includes(searchTerm.toLowerCase())) {
              return false;
            }
            if (filters.volumeMin && (r.searchVolume || 0) < filters.volumeMin) return false;
            if (filters.volumeMax && (r.searchVolume || 0) > filters.volumeMax) return false;
            if (filters.difficultyMin && (r.difficulty || 0) < filters.difficultyMin) return false;
            if (filters.difficultyMax && (r.difficulty || 0) > filters.difficultyMax) return false;
            if (filters.cpcMin && (r.cpc || 0) < filters.cpcMin) return false;
            if (filters.intent && r.intent?.toLowerCase() !== filters.intent.toLowerCase()) return false;
            return true;
          })}
          totalCount={results.length}
          searchTerm={searchTerm}
          seedKeyword={null}
          keywordAnalyzed={target}
          onSearchChange={setSearchTerm}
          onFiltersChange={setFilters}
          locationCode={2826}
          onExport={handleExport}
        />
      )}
    </div>
  );
};

export default KeywordsForSite;
