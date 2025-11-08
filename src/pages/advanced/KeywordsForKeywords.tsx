import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { KeywordResultsTable, KeywordResult } from "@/components/KeywordResultsTable";
import { logger } from '@/lib/logger';
import { trackExport } from '@/lib/analytics';

const KeywordsForKeywords = () => {
  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("United Kingdom");
  const [language, setLanguage] = useState("English");
  const [sortBy, setSortBy] = useState("relevance");
  const [includeAdult, setIncludeAdult] = useState(false);
  const [searchPartners, setSearchPartners] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<KeywordResult[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<any>({});

  const { toast } = useToast();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleGenerate = async () => {
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
        description: "Please enter at least one seed keyword.",
        variant: "destructive",
      });
      return;
    }

    if (keywordList.length > 20) {
      toast({
        title: "Too Many Keywords",
        description: "Maximum 20 seed keywords allowed.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('keywords-for-keywords', {
        body: {
          keywords: keywordList,
          location_name: location,
          language_name: language,
          sort_by: sortBy,
          include_adult_keywords: includeAdult,
          search_partners: searchPartners
        }
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to generate suggestions');
      }

      const fetchedResults: KeywordResult[] = (data.results || []).map((r: any) => ({
        keyword: r.keyword,
        searchVolume: r.search_volume || null,
        cpc: (r.low_top_of_page_bid + r.high_top_of_page_bid) / 2 || null,
        intent: 'commercial' as const,
        difficulty: r.competition_index || null,
        suggestions: [],
        related: [],
        metricsSource: 'dataforseo_ads' as const
      }));

      setResults(fetchedResults);

      toast({
        title: "Suggestions Generated",
        description: `Found ${fetchedResults.length} keyword suggestions (Cost: $${data.cost?.toFixed(4) || '0.00'})`,
      });

    } catch (err: any) {
      logger.error('Keywords for keywords error:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to generate suggestions. Please try again.",
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
        filename = `keyword-suggestions-${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      } else if (format === 'txt') {
        content = exportData.map(r => r.keyword).join('\n');
        filename = `keyword-suggestions-${new Date().toISOString().split('T')[0]}.txt`;
        mimeType = 'text/plain';
      } else {
        content = JSON.stringify(exportData, null, 2);
        filename = `keyword-suggestions-${new Date().toISOString().split('T')[0]}.json`;
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
        <h1 className="text-3xl font-bold">Keywords for Keywords</h1>
        <p className="text-muted-foreground mt-1">
          Generate keyword suggestions based on your seed keywords
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seed Keywords</CardTitle>
          <CardDescription>
            Enter up to 20 seed keywords (one per line)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="keywords">Keywords (max 20)</Label>
            <Textarea
              id="keywords"
              placeholder="seo tools&#10;keyword research&#10;serp analysis"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground">
              {keywords.split('\n').filter(k => k.trim()).length} / 20 keywords
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

          <div className="space-y-2">
            <Label htmlFor="sortBy">Sort By</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger id="sortBy">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="search_volume">Search Volume</SelectItem>
                <SelectItem value="competition_index">Competition Index</SelectItem>
                <SelectItem value="low_top_of_page_bid">Low Bid</SelectItem>
                <SelectItem value="high_top_of_page_bid">High Bid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeAdult"
                checked={includeAdult}
                onCheckedChange={(checked) => setIncludeAdult(checked as boolean)}
              />
              <Label htmlFor="includeAdult" className="cursor-pointer">
                Include adult keywords
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="searchPartners"
                checked={searchPartners}
                onCheckedChange={(checked) => setSearchPartners(checked as boolean)}
              />
              <Label htmlFor="searchPartners" className="cursor-pointer">
                Include search partners
              </Label>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? "Generating Suggestions..." : "Generate Suggestions"}
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

export default KeywordsForKeywords;
