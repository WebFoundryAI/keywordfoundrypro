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
import { Search, ChevronUp, ChevronDown, Globe, MapPin, Zap, Filter } from "lucide-react";
import { formatNumber, formatDifficulty, formatCurrency } from "@/lib/utils";

interface RelatedKeyword {
  keyword: string;
  searchVolume: number | null;
  cpc: number | null;
  competition: number | null;
  competition_level?: string;
  intent: string;
  difficulty: number | null;
  relevance: number | null;
  trend: any[] | null;
  categories: number[];
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

// Filter types
type FilterField = "searchVolume" | "cpc" | "difficulty";
type FilterOperator = "<" | ">" | "<=" | ">=" | "=";

interface NumericFilter {
  field: FilterField;
  operator: FilterOperator;
  value: number;
  enabled: boolean;
}

// Pure function: parse metric value to number, handling formatted strings
const getNumeric = (value: any): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return isFinite(value) ? value : null;
  
  // Handle strings (e.g., "12.1K", "$1.28", "1,234")
  if (typeof value === 'string') {
    // Remove currency symbols, commas, spaces
    let cleaned = value.replace(/[$,\s]/g, '').trim();
    
    // Handle K (thousands) and M (millions)
    const multiplier = cleaned.endsWith('K') ? 1000 : cleaned.endsWith('M') ? 1000000 : 1;
    if (multiplier > 1) {
      cleaned = cleaned.slice(0, -1);
    }
    
    const parsed = parseFloat(cleaned) * multiplier;
    return isFinite(parsed) ? parsed : null;
  }
  
  return null;
};

// Apply a single numeric filter to a result
const applyNumericFilter = (result: RelatedKeyword, filter: NumericFilter): boolean => {
  if (!filter.enabled) return true;
  
  const value = getNumeric(result[filter.field]);
  if (value === null) return false;
  
  switch (filter.operator) {
    case '<': return value < filter.value;
    case '<=': return value <= filter.value;
    case '=': return value === filter.value;
    case '>=': return value >= filter.value;
    case '>': return value > filter.value;
    default: return true;
  }
};

// Filter results based on search term and numeric filters
const filterResults = (
  results: RelatedKeyword[],
  searchTerm: string,
  filters: NumericFilter[]
): RelatedKeyword[] => {
  return results.filter(result => {
    // Search term filter
    if (searchTerm && !result.keyword.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Apply all numeric filters
    return filters.every(filter => applyNumericFilter(result, filter));
  });
};

const RelatedKeywords = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [keyword, setKeyword] = useState(() => {
    return searchParams.get('keyword') || localStorage.getItem('lastKeyword') || '';
  });
  const [languageCode, setLanguageCode] = useState(() => {
    return searchParams.get('language') || localStorage.getItem('lastLanguageCode') || 'en';
  });
  const [locationCode, setLocationCode] = useState(() => {
    return parseInt(searchParams.get('location') || localStorage.getItem('lastLocationCode') || '2840');
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
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [sortBy, setSortBy] = useState<keyof RelatedKeyword>("searchVolume");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [volumeFilter, setVolumeFilter] = useState<NumericFilter>({
    field: "searchVolume",
    operator: ">=",
    value: 0,
    enabled: false
  });
  const [cpcFilter, setCpcFilter] = useState<NumericFilter>({
    field: "cpc",
    operator: ">=",
    value: 0,
    enabled: false
  });
  const [difficultyFilter, setDifficultyFilter] = useState<NumericFilter>({
    field: "difficulty",
    operator: "<=",
    value: 100,
    enabled: false
  });
  
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth/sign-in');
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
    setTotalCount(0);
    
    try {
      const { data, error } = await supabase.functions.invoke('related-keywords', {
        body: {
          keyword: keyword.trim(),
          languageCode,
          locationCode,
          limit: 100, // Always use 100 for first request
          depth,
          offset: 0
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to find related keywords');
      }

      if (data.success && data.results) {
        setResults(data.results);
        setTotalCount(data.total_results || data.results.length);
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
      setTotalCount(0);
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
          limit: 100, // Always use 100 per request
          depth,
          offset: currentOffset
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to load more keywords');
      }

      if (data.success && data.results && data.results.length > 0) {
        // Filter out duplicates based on keyword
        const existingKeywords = new Set(results.map(r => r.keyword.toLowerCase()));
        const newUniqueResults = data.results.filter(
          (r: RelatedKeyword) => !existingKeywords.has(r.keyword.toLowerCase())
        );
        
        const newResults = [...results, ...newUniqueResults];
        setResults(newResults);
        setHasMore(data.has_more || false);
        setCurrentOffset(currentOffset + data.results.length);
        setTotalCount(data.total_results || newResults.length);
        localStorage.setItem('relatedKeywordsResults', JSON.stringify(newResults));
        
        toast({
          title: "Loaded More Results",
          description: `Added ${newUniqueResults.length} more keywords${newUniqueResults.length !== data.results.length ? ` (${data.results.length - newUniqueResults.length} duplicates filtered)` : ''}`,
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

  const exportToJSON = () => {
    const dataStr = JSON.stringify(filteredResults, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `related-keywords-${keyword.trim().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export Complete",
      description: `Exported ${filteredResults.length} keywords to JSON`,
    });
  };

  const exportToCSV = () => {
    const headers = ['Keyword', 'Search Volume', 'CPC', 'Competition', 'Competition Level', 'Difficulty', 'Intent', 'Relevance', 'Categories'];
    const csvRows = [headers.join(',')];
    
    filteredResults.forEach(result => {
      const row = [
        `"${result.keyword.replace(/"/g, '""')}"`,
        result.searchVolume ?? '',
        result.cpc ?? '',
        result.competition ?? '',
        result.competition_level ? `"${result.competition_level}"` : '',
        result.difficulty ?? '',
        `"${result.intent}"`,
        result.relevance ?? '',
        result.categories?.length > 0 ? `"${result.categories.join(', ')}"` : ''
      ];
      csvRows.push(row.join(','));
    });
    
    const csvStr = csvRows.join('\n');
    const dataBlob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `related-keywords-${keyword.trim().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export Complete",
      description: `Exported ${filteredResults.length} keywords to CSV`,
    });
  };

  const resetFilters = () => {
    setVolumeFilter({ field: "searchVolume" as FilterField, operator: ">" as FilterOperator, value: 0, enabled: false });
    setCpcFilter({ field: "cpc" as FilterField, operator: ">" as FilterOperator, value: 0, enabled: false });
    setDifficultyFilter({ field: "difficulty" as FilterField, operator: "<" as FilterOperator, value: 100, enabled: false });
  };

  const getActiveFilterCount = () => {
    return [volumeFilter, cpcFilter, difficultyFilter].filter(f => f.enabled).length;
  };


  // Apply filtering
  const filteredResults = filterResults(results, searchTerm, [volumeFilter, cpcFilter, difficultyFilter]);

  const sortedResults = [...filteredResults].sort((a, b) => {
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
                    spellCheck={true}
                    autoCorrect="on"
                    autoComplete="off"
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
                      <SelectItem value="100">100 keywords (recommended)</SelectItem>
                      <SelectItem value="250">250 keywords</SelectItem>
                      <SelectItem value="500">500 keywords</SelectItem>
                      <SelectItem value="1000">1000 keywords</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Initial request uses 100 keywords. Use "Load more" for additional results.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="depth" className="text-sm font-medium">
                    Depth
                  </Label>
                  <Select value={depth.toString()} onValueChange={(value) => setDepth(parseInt(value))}>
                    <SelectTrigger className="bg-background/50 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Higher depth explores 'searches related to' multiple hops: 0 = seed only, 1 ≈8 ideas, 2 ≈72, 3 ≈584, 4 ≈4,680. More depth = more ideas & more cost/time.
                  </p>
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Related Keywords for "{keyword}"</CardTitle>
                    <CardDescription>
                      Showing {sortedResults.length} of {results.length} keywords
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={exportToJSON} variant="outline" size="sm" className="bg-background/50">
                      Export JSON
                    </Button>
                    <Button onClick={exportToCSV} variant="outline" size="sm" className="bg-background/50">
                      Export CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search keywords..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-background/50"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                      className="bg-background/50"
                    >
                      <Filter className="w-4 h-4 mr-2" />
                      Filters
                      {getActiveFilterCount() > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {getActiveFilterCount()}
                        </Badge>
                      )}
                    </Button>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      {sortedResults.length} of {results.length}
                    </Badge>
                  </div>
                </div>
                {/* Filter Panel */}
                {showFilters && (
                  <div className="bg-muted/30 rounded-lg p-4 space-y-4 mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Numeric Filters</span>
                      <span className="text-xs text-muted-foreground">All filters use AND logic</span>
                    </div>

                    {/* Volume Filter */}
                    <div className="flex items-center gap-3 bg-background/80 p-3 rounded-md border border-border/30">
                      <input
                        type="checkbox"
                        checked={volumeFilter.enabled}
                        onChange={(e) => setVolumeFilter({ ...volumeFilter, enabled: e.target.checked })}
                        className="w-4 h-4 rounded border-border"
                      />
                      <span className="text-sm font-medium min-w-[80px]">Volume</span>
                      <Select
                        value={volumeFilter.operator}
                        onValueChange={(value) => setVolumeFilter({ ...volumeFilter, operator: value as FilterOperator })}
                      >
                        <SelectTrigger className="w-[80px] bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="<">{"<"}</SelectItem>
                          <SelectItem value="<=">{"≤"}</SelectItem>
                          <SelectItem value="=">{"="}</SelectItem>
                          <SelectItem value=">=">{">="}</SelectItem>
                          <SelectItem value=">">{">"}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        value={volumeFilter.value}
                        onChange={(e) => setVolumeFilter({ ...volumeFilter, value: parseFloat(e.target.value) || 0 })}
                        placeholder="Value"
                        className="w-[120px] bg-background"
                      />
                    </div>

                    {/* CPC Filter */}
                    <div className="flex items-center gap-3 bg-background/80 p-3 rounded-md border border-border/30">
                      <input
                        type="checkbox"
                        checked={cpcFilter.enabled}
                        onChange={(e) => setCpcFilter({ ...cpcFilter, enabled: e.target.checked })}
                        className="w-4 h-4 rounded border-border"
                      />
                      <span className="text-sm font-medium min-w-[80px]">CPC</span>
                      <Select
                        value={cpcFilter.operator}
                        onValueChange={(value) => setCpcFilter({ ...cpcFilter, operator: value as FilterOperator })}
                      >
                        <SelectTrigger className="w-[80px] bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="<">{"<"}</SelectItem>
                          <SelectItem value="<=">{"≤"}</SelectItem>
                          <SelectItem value="=">{"="}</SelectItem>
                          <SelectItem value=">=">{">="}</SelectItem>
                          <SelectItem value=">">{">"}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        step="0.01"
                        value={cpcFilter.value}
                        onChange={(e) => setCpcFilter({ ...cpcFilter, value: parseFloat(e.target.value) || 0 })}
                        placeholder="Value"
                        className="w-[120px] bg-background"
                      />
                    </div>

                    {/* Difficulty Filter */}
                    <div className="flex items-center gap-3 bg-background/80 p-3 rounded-md border border-border/30">
                      <input
                        type="checkbox"
                        checked={difficultyFilter.enabled}
                        onChange={(e) => setDifficultyFilter({ ...difficultyFilter, enabled: e.target.checked })}
                        className="w-4 h-4 rounded border-border"
                      />
                      <span className="text-sm font-medium min-w-[80px]">Difficulty</span>
                      <Select
                        value={difficultyFilter.operator}
                        onValueChange={(value) => setDifficultyFilter({ ...difficultyFilter, operator: value as FilterOperator })}
                      >
                        <SelectTrigger className="w-[80px] bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="<">{"<"}</SelectItem>
                          <SelectItem value="<=">{"≤"}</SelectItem>
                          <SelectItem value="=">{"="}</SelectItem>
                          <SelectItem value=">=">{">="}</SelectItem>
                          <SelectItem value=">">{">"}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        value={difficultyFilter.value}
                        onChange={(e) => setDifficultyFilter({ ...difficultyFilter, value: parseFloat(e.target.value) || 0 })}
                        placeholder="Value"
                        className="w-[120px] bg-background"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetFilters}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                )}
                <div className="rounded-lg border border-border/50 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 transition-smooth select-none min-w-[300px]"
                          onClick={() => handleSort("keyword")}
                        >
                          <div className="flex items-center">
                            Keyword
                            {getSortIcon("keyword")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 transition-smooth text-right select-none min-w-[90px]"
                          onClick={() => handleSort("searchVolume")}
                        >
                          <div className="flex items-center justify-end">
                            Volume
                            {getSortIcon("searchVolume")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 transition-smooth text-right select-none min-w-[90px]"
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
                          className="cursor-pointer hover:bg-muted/50 transition-smooth select-none min-w-[100px]"
                          onClick={() => handleSort("intent")}
                        >
                          <div className="flex items-center">
                            Intent
                            {getSortIcon("intent")}
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedResults.map((result, index) => (
                        <TableRow key={index} className="hover:bg-muted/20 transition-smooth">
                          <TableCell className="font-medium">
                            <div className="truncate max-w-[280px]" title={result.keyword}>
                              {result.keyword}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatNumber(result.searchVolume)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-foreground">
                              {formatDifficulty(result.difficulty)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(result.cpc)}
                          </TableCell>
                          <TableCell>
                            <span className="text-foreground capitalize">
                              {result.intent}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {hasMore && (
                  <div className="mt-4 flex flex-col items-center gap-2">
                    <div className="text-sm text-muted-foreground">
                      Loaded {results.length} keywords{totalCount > 0 && totalCount > results.length ? ` of ${totalCount} total` : ''}
                    </div>
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
                        'Load More Keywords'
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