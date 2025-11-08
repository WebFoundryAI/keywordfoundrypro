import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { KeywordResultsTable, KeywordResult } from "@/components/KeywordResultsTable";
import { logger } from '@/lib/logger';
import { trackExport } from '@/lib/analytics';

const DataForSEOSearchVolume = () => {
  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("United Kingdom");
  const [language, setLanguage] = useState("English");
  const [useClickstream, setUseClickstream] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<KeywordResult[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<any>({});

  const { toast } = useToast();
  const { user, loading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleRetrieve = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to use this feature.",
        variant: "destructive",
      });
      navigate('/');
      return;
    }

    const keywordList = keywords
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    if (keywordList.length === 0) {
      toast({
        title: "No Keywords",
        description: "Please enter at least one keyword.",
        variant: "destructive",
      });
      return;
    }

    if (keywordList.length > 1000) {
      toast({
        title: "Too Many Keywords",
        description: "Maximum 1000 keywords allowed.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('dataforseo-search-volume', {
        body: {
          keywords: keywordList,
          location_name: location,
          language_name: language,
          use_clickstream: useClickstream
        }
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to retrieve search volume');
      }

      const fetchedResults: KeywordResult[] = (data.results || []).map((r: any) => ({
        keyword: r.keyword,
        searchVolume: r.search_volume || null,
        cpc: null,
        intent: 'informational' as const,
        difficulty: null,
        suggestions: [],
        related: [],
        metricsSource: 'dataforseo_clickstream' as const
      }));

      setResults(fetchedResults);

      toast({
        title: "Search Volume Retrieved",
        description: `Retrieved data for ${fetchedResults.length} keywords (Cost: $${data.cost?.toFixed(4) || '0.00'})`,
      });

    } catch (err: any) {
      logger.error('DataForSEO search volume error:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to retrieve search volume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'json' | 'txt') => {
    if (results.length === 0) return;

    try {
      const exportData = results.map(r => ({
        keyword: r.keyword,
        searchVolume: r.searchVolume,
        source: r.metricsSource
      }));

      let content: string;
      let filename: string;
      let mimeType: string;
      
      if (format === 'csv') {
        const headers = ['Keyword', 'Search Volume', 'Source'];
        const rows = [
          headers.join(','),
          ...exportData.map(r => [
            `"${r.keyword}"`,
            r.searchVolume ?? '',
            r.source || ''
          ].join(','))
        ];
        content = rows.join('\n');
        filename = `dataforseo-volume-${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      } else if (format === 'txt') {
        content = exportData.map(r => r.keyword).join('\n');
        filename = `dataforseo-volume-${new Date().toISOString().split('T')[0]}.txt`;
        mimeType = 'text/plain';
      } else {
        content = JSON.stringify(exportData, null, 2);
        filename = `dataforseo-volume-${new Date().toISOString().split('T')[0]}.json`;
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
        <h1 className="text-3xl font-bold">DataForSEO Search Volume</h1>
        <p className="text-muted-foreground mt-1">
          Get search volume data from DataForSEO's clickstream sources
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Keywords</CardTitle>
          <CardDescription>
            Enter up to 1000 keywords to retrieve search volume data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="keywords">Keywords (max 1000)</Label>
            <Textarea
              id="keywords"
              placeholder="keyword one&#10;keyword two&#10;keyword three"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground">
              {keywords.split('\n').filter(k => k.trim()).length} / 1000 keywords
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

          <div className="flex items-center justify-between">
            <Label htmlFor="useClickstream">Use Clickstream Data</Label>
            <Switch
              id="useClickstream"
              checked={useClickstream}
              onCheckedChange={setUseClickstream}
            />
          </div>

          <Button
            onClick={handleRetrieve}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? "Retrieving Volume..." : "Retrieve Volume"}
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
            return true;
          })}
          totalCount={results.length}
          searchTerm={searchTerm}
          seedKeyword={null}
          keywordAnalyzed={null}
          onSearchChange={setSearchTerm}
          onFiltersChange={setFilters}
          locationCode={2826}
          onExport={handleExport}
        />
      )}
    </div>
  );
};

export default DataForSEOSearchVolume;
