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
import { supabase } from "@/integrations/supabase/client";
import { invokeFunction } from "@/lib/invoke";
import { Search, ChevronUp, ChevronDown, Globe, MapPin, Zap, Filter, Download } from "lucide-react";
import { formatNumber, formatDifficulty, formatCurrency } from "@/lib/utils";
import { logger } from '@/lib/logger';

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
    const urlLang = searchParams.get('language');
    const storedLang = localStorage.getItem('lastLanguageCode');
    return urlLang || storedLang || 'en';
  });
  const [locationCode, setLocationCode] = useState(() => {
    const urlLoc = searchParams.get('location');
    const storedLoc = localStorage.getItem('lastLocationCode');
    return parseInt(urlLoc || storedLoc || '2840');
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
      navigate('/');
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
      const languageName = LANGUAGE_OPTIONS.find(l => l.code === languageCode)?.name;
      const locationName = LOCATION_OPTIONS.find(l => l.code === locationCode)?.name;
      
      const data = await invokeFunction('related-keywords', {
        keyword: keyword.trim(),
        languageCode,
        languageName,
        locationCode,
        locationName,
        limit: 100,
        depth,
        offset: 0
      });

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
        throw new Error(`${data.error} (Status: ${data.status_code})`);
      } else {
        throw new Error(data.error || data.message || 'No results found');
      }
    } catch (err: any) {
      logger.error('Related keywords error:', err);
      toast({
        title: "Analysis Failed",
        description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
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
      const languageName = LANGUAGE_OPTIONS.find(l => l.code === languageCode)?.name;
      const locationName = LOCATION_OPTIONS.find(l => l.code === locationCode)?.name;
      
      const data = await invokeFunction('related-keywords', {
        keyword: keyword.trim(),
        languageCode,
        languageName,
        locationCode,
        locationName,
        limit: 100,
        depth,
        offset: currentOffset
      });

      if (data.success && data.results && data.results.length > 0) {
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
    } catch (err: any) {
      logger.error('Load more error:', err);
      toast({
        title: "Load More Failed",
        description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
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
    setVolumeFilter({ field: "searchVolume", operator: ">=", value: 0, enabled: false });
    setCpcFilter({ field: "cpc", operator: ">=", value: 0, enabled: false });
    setDifficultyFilter({ field: "difficulty", operator: "<=", value: 100, enabled: false });
  };

  const getActiveFilterCount = () => {
    return [volumeFilter, cpcFilter, difficultyFilter].filter(f => f.enabled).length;
  };

  const filteredResults = filterResults(results, searchTerm, [volumeFilter, cpcFilter, difficultyFilter]);

  const sortedResults = [...filteredResults].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
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
                    <SelectTrigger id="language">
                      <SelectValue placeholder="Select language" />
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
                  <Select value={locationCode.toString()} onValueChange={(val) => setLocationCode(parseInt(val))}>
                    <SelectTrigger id="location">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCATION_OPTIONS.map((loc) => (
                        <SelectItem key={loc.code} value={loc.code.toString()}>
                          {loc.name}
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
                  <Select value={depth.toString()} onValueChange={(val) => setDepth(parseInt(val))}>
                    <SelectTrigger id="depth">
                      <SelectValue placeholder="Select depth" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Shallow (Faster, Fewer Results)</SelectItem>
                      <SelectItem value="2">Medium (Balanced)</SelectItem>
                      <SelectItem value="3">Deep (Slower, More Results)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleSearch}
                disabled={isLoading || !keyword.trim()}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Find Related Keywords
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {results.length > 0 && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Results</CardTitle>
                    <CardDescription>
                      {filteredResults.length} keywords {totalCount > results.length && `(${totalCount} total available)`}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                      <Filter className="w-4 h-4 mr-2" />
                      Filters {getActiveFilterCount() > 0 && `(${getActiveFilterCount()})`}
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportToCSV}>
                      <Download className="w-4 h-4 mr-2" />
                      CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportToJSON}>
                      <Download className="w-4 h-4 mr-2" />
                      JSON
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {showFilters && (
                  <div className="mb-4 p-4 bg-muted/30 rounded-lg space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">Filters</h3>
                      <Button variant="ghost" size="sm" onClick={resetFilters}>
                        Reset All
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label>Search in results</Label>
                      <Input
                        placeholder="Filter keywords..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="cursor-pointer" onClick={() => handleSort('keyword')}>
                          Keyword {getSortIcon('keyword')}
                        </TableHead>
                        <TableHead className="text-right cursor-pointer" onClick={() => handleSort('searchVolume')}>
                          Volume {getSortIcon('searchVolume')}
                        </TableHead>
                        <TableHead className="text-right cursor-pointer" onClick={() => handleSort('cpc')}>
                          CPC {getSortIcon('cpc')}
                        </TableHead>
                        <TableHead className="text-right cursor-pointer" onClick={() => handleSort('difficulty')}>
                          Difficulty {getSortIcon('difficulty')}
                        </TableHead>
                        <TableHead>Intent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedResults.map((result, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{result.keyword}</TableCell>
                          <TableCell className="text-right">{formatNumber(result.searchVolume)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(result.cpc, locationCode)}</TableCell>
                          <TableCell className="text-right">{formatDifficulty(result.difficulty)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{result.intent}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {hasMore && (
                  <div className="mt-4 text-center">
                    <Button
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      variant="outline"
                    >
                      {isLoadingMore ? (
                        <>
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                          Loading More...
                        </>
                      ) : (
                        'Load More Results'
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </section>
  );
};

export default RelatedKeywords;
