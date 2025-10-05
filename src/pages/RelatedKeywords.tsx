import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { Search, ChevronUp, ChevronDown, Globe, MapPin, Zap } from "lucide-react";
import { formatNumber, formatDifficulty, formatCurrency, getDifficultyColor } from "@/lib/utils";

interface RelatedKeyword {
  keyword: string;
  searchVolume: number | null;
  cpc: number | null;
  intent: string;
  difficulty: number | null;
  relevance: number | null;
}

const LANGUAGE_OPTIONS = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" },
];

const LOCATION_OPTIONS = [
  { code: 2840, name: "United States" },
  { code: 2826, name: "United Kingdom" },
  { code: 2124, name: "Canada" },
  { code: 2036, name: "Australia" },
  { code: 2276, name: "Germany" },
  { code: 2250, name: "France" },
  { code: 2724, name: "Spain" },
  { code: 2380, name: "Italy" },
  { code: 2392, name: "Japan" },
  { code: 2156, name: "China" },
];

const RelatedKeywords = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [keyword, setKeyword] = useState(() => {
    return searchParams.get('keyword') || localStorage.getItem('lastKeyword') || '';
  });
  const [languageCode, setLanguageCode] = useState(() => {
    return searchParams.get('language') || 'en';
  });
  const [locationCode, setLocationCode] = useState(() => {
    return parseInt(searchParams.get('location') || '2840');
  });
  const [limit, setLimit] = useState(() => {
    return parseInt(searchParams.get('limit') || '100');
  });
  const [depth, setDepth] = useState(() => {
    return parseInt(searchParams.get('depth') || '1');
  });
  
  const [results, setResults] = useState<RelatedKeyword[]>(() => {
    const stored = localStorage.getItem('relatedKeywordsResults');
    return stored ? JSON.parse(stored) : [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [sortBy, setSortBy] = useState<keyof RelatedKeyword>("relevance");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleSearch = async () => {
    if (!keyword.trim()) {
      toast({
        title: "Error",
        description: "Please enter a keyword to find related keywords",
        variant: "destructive",
      });
      return;
    }

    // Update URL with search parameters
    setSearchParams({
      keyword: keyword.trim(),
      language: languageCode,
      location: locationCode.toString(),
      limit: limit.toString(),
      depth: depth.toString(),
    });

    setIsLoading(true);
    setCurrentOffset(0);
    
    try {
      const { data, error } = await supabase.functions.invoke('related-keywords', {
        body: {
          keyword: keyword.trim(),
          languageCode,
          locationCode,
          limit,
          depth,
          offset: 0
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to find related keywords');
      }

      if (data.success && data.results) {
        setResults(data.results);
        setHasMore(data.has_more || false);
        setCurrentOffset(data.results.length);
        localStorage.setItem('relatedKeywordsResults', JSON.stringify(data.results));
        
        if (data.research_id) {
          localStorage.setItem('currentRelatedResearchId', data.research_id);
        }
        localStorage.setItem('lastKeyword', keyword.trim());
        
        const message = data.message || `Found ${data.total_results} related keywords for "${keyword}" (Cost: $${data.estimated_cost})`;
        
        toast({
          title: "Analysis Complete",
          description: message,
        });
      } else if (!data.success && data.status_code) {
        // Show API error with status code
        throw new Error(`${data.error} (Status: ${data.status_code})`);
      } else {
        throw new Error(data.error || data.message || 'No results found');
      }
    } catch (error) {
      console.error('Related keywords error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to find related keywords. Please try again.",
        variant: "destructive",
      });
      setResults([]);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!keyword.trim() || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('related-keywords', {
        body: {
          keyword: keyword.trim(),
          languageCode,
          locationCode,
          limit,
          depth,
          offset: currentOffset
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to load more keywords');
      }

      if (data.success && data.results && data.results.length > 0) {
        const newResults = [...results, ...data.results];
        setResults(newResults);
        setHasMore(data.has_more || false);
        setCurrentOffset(currentOffset + data.results.length);
        localStorage.setItem('relatedKeywordsResults', JSON.stringify(newResults));
        
        toast({
          title: "Loaded More Results",
          description: `Added ${data.results.length} more keywords`,
        });
      } else {
        setHasMore(false);
        toast({
          title: "No More Results",
          description: "All related keywords have been loaded.",
        });
      }
    } catch (error) {
      console.error('Load more error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load more keywords.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMore(false);
    }
  };

  const getIntentColor = (intent: string) => {
    switch (intent.toLowerCase()) {
      case 'commercial':
        return 'bg-warning/20 text-warning-foreground border-warning/30';
      case 'informational':
        return 'bg-primary/20 text-primary-foreground border-primary/30';
      case 'navigational':
        return 'bg-accent/20 text-accent-foreground border-accent/30';
      case 'transactional':
        return 'bg-success/20 text-success-foreground border-success/30';
      default:
        return 'bg-muted/20 text-muted-foreground border-muted/30';
    }
  };

  const sortedResults = [...results].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
    // Handle null values - push them to the end
    if (aValue === null && bValue === null) return 0;
    if (aValue === null) return 1;
    if (bValue === null) return -1;
    
    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortOrder === "asc" 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    }
    
    return 0;
  });

  const handleSort = (column: keyof RelatedKeyword) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const getSortIcon = (column: keyof RelatedKeyword) => {
    if (sortBy === column) {
      return sortOrder === "asc" ? 
        <ChevronUp className="w-4 h-4 inline ml-1" /> : 
        <ChevronDown className="w-4 h-4 inline ml-1" />;
    }
    return <ChevronUp className="w-4 h-4 inline ml-1 opacity-30" />;
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

      {/* Search Form */}
      <section className="px-6 py-8">
        <div className="container mx-auto max-w-4xl">
          <Card className="bg-gradient-card shadow-card border-border/50 mb-6">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Find Related Keywords
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Discover content pillars and related opportunities for your keyword strategy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="keyword" className="text-sm font-medium flex items-center gap-2">
                    <Search className="w-4 h-4 text-primary" />
                    Seed Keyword
                  </Label>
                  <Input
                    id="keyword"
                    type="text"
                    placeholder="e.g., best running shoes"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-smooth"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="language" className="text-sm font-medium flex items-center gap-2">
                      <Globe className="w-4 h-4 text-primary" />
                      Language
                    </Label>
                    <Select value={languageCode} onValueChange={setLanguageCode}>
                      <SelectTrigger className="bg-background/50 border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGE_OPTIONS.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code}>
                            {lang.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      Location
                    </Label>
                    <Select value={locationCode.toString()} onValueChange={(value) => setLocationCode(parseInt(value))}>
                      <SelectTrigger className="bg-background/50 border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LOCATION_OPTIONS.map((location) => (
                          <SelectItem key={location.code} value={location.code.toString()}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="depth" className="text-sm font-medium flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      Search Depth
                    </Label>
                    <Select value={depth.toString()} onValueChange={(value) => setDepth(parseInt(value))}>
                      <SelectTrigger className="bg-background/50 border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0 - Direct matches only</SelectItem>
                        <SelectItem value="1">1 - Recommended</SelectItem>
                        <SelectItem value="2">2 - Broader search</SelectItem>
                        <SelectItem value="3">3 - Extended search</SelectItem>
                        <SelectItem value="4">4 - Maximum depth</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="limit" className="text-sm font-medium flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      Results Per Request
                    </Label>
                    <Select value={limit.toString()} onValueChange={(value) => setLimit(parseInt(value))}>
                      <SelectTrigger className="bg-background/50 border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50">50 keywords</SelectItem>
                        <SelectItem value="100">100 keywords</SelectItem>
                        <SelectItem value="250">250 keywords</SelectItem>
                        <SelectItem value="500">500 keywords</SelectItem>
                        <SelectItem value="1000">1000 keywords</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Estimated Cost:</span>
                    <span className="text-primary font-bold">${(Math.ceil(limit / 100) * 0.01).toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Based on API usage pricing. Actual cost may vary.
                  </div>
                </div>

                <Button 
                  onClick={handleSearch}
                  disabled={!keyword.trim() || isLoading}
                  className="w-full bg-gradient-primary hover:shadow-button transition-smooth h-12 text-base font-semibold"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Finding Related Keywords...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Search className="w-5 h-5" />
                      Find Related Keywords
                    </div>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {results.length > 0 && (
            <Card className="bg-gradient-card shadow-card border-border/50">
              <CardHeader>
                <CardTitle>Related Keywords for "{keyword}"</CardTitle>
                <CardDescription>
                  {results.length} related keywords found sorted by relevance and search volume
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border/50 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 transition-smooth select-none min-w-[200px]"
                          onClick={() => handleSort("keyword")}
                        >
                          <div className="flex items-center">
                            Keyword
                            {getSortIcon("keyword")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 transition-smooth text-right select-none min-w-[100px]"
                          onClick={() => handleSort("searchVolume")}
                        >
                          <div className="flex items-center justify-end">
                            Volume
                            {getSortIcon("searchVolume")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 transition-smooth text-right select-none min-w-[100px]"
                          onClick={() => handleSort("difficulty")}
                        >
                          <div className="flex items-center justify-end">
                            Difficulty
                            {getSortIcon("difficulty")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 transition-smooth text-right select-none min-w-[80px]"
                          onClick={() => handleSort("cpc")}
                        >
                          <div className="flex items-center justify-end">
                            CPC
                            {getSortIcon("cpc")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 transition-smooth select-none min-w-[120px]"
                          onClick={() => handleSort("intent")}
                        >
                          <div className="flex items-center">
                            Intent
                            {getSortIcon("intent")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 transition-smooth text-right select-none min-w-[100px]"
                          onClick={() => handleSort("relevance")}
                        >
                          <div className="flex items-center justify-end">
                            Relevance
                            {getSortIcon("relevance")}
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedResults.map((result, index) => (
                        <TableRow key={index} className="hover:bg-muted/20 transition-smooth">
                          <TableCell className="font-medium">
                            <div className="truncate max-w-[180px]" title={result.keyword}>
                              {result.keyword}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatNumber(result.searchVolume)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`font-bold ${getDifficultyColor(result.difficulty)}`}>
                              {formatDifficulty(result.difficulty)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(result.cpc)}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={`${getIntentColor(result.intent)} text-xs`}
                            >
                              {result.intent}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {result.relevance || 0}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {hasMore && (
                  <div className="mt-4 flex justify-center">
                    <Button
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      variant="outline"
                      className="w-full md:w-auto"
                    >
                      {isLoadingMore ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Loading More...
                        </div>
                      ) : (
                        `Load More Keywords (${currentOffset} loaded)`
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
};

export default RelatedKeywords;