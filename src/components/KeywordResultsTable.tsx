import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search, TrendingUp, DollarSign, Target, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatNumber, formatDifficulty, formatCurrency, getDifficultyColor } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface KeywordResult {
  keyword: string;
  searchVolume: number | null;
  cpc: number | null;
  intent: string;
  difficulty: number | null;
  suggestions: string[];
  related: string[];
  clusterId?: string;
  metricsSource: string;
  isSeedKeyword?: boolean;
}

interface KeywordResultsTableProps {
  results: KeywordResult[];
  isLoading?: boolean;
  onExport?: (format: 'csv' | 'json' | 'txt') => void;
  seedKeyword?: KeywordResult | null;
  keywordAnalyzed?: string;
  locationCode?: number;
  // Pagination (optional - page won't show pagination if not provided)
  totalCount?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  // Filters
  searchTerm?: string;
  onSearchChange?: (search: string) => void;
  onFiltersChange?: (filters: {
    volumeMin?: number | null;
    volumeMax?: number | null;
    difficultyMin?: number | null;
    difficultyMax?: number | null;
    cpcMin?: number | null;
    intent?: string | null;
  }) => void;
  // UI customization (optional - for page-specific styling)
  hideResultsCount?: boolean;
  hideFilteringCaption?: boolean;
}


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

// Pure function: apply a single numeric filter to a keyword result
const applyNumericFilter = (result: KeywordResult, filter: NumericFilter): boolean => {
  const rawValue = result[filter.field];
  const numValue = getNumeric(rawValue);
  
  // If field value is missing, exclude this row when filter is active
  if (numValue === null) return false;
  
  const targetValue = getNumeric(filter.value);
  if (targetValue === null) return true; // Ignore invalid filter values
  
  // Apply comparator (0 is a valid number)
  switch (filter.operator) {
    case "<":
      return numValue < targetValue;
    case ">":
      return numValue > targetValue;
    case "<=":
      return numValue <= targetValue;
    case ">=":
      return numValue >= targetValue;
    case "=":
      return numValue === targetValue;
    default:
      return true;
  }
};

// Pure function: filter results based on search term and numeric filters
const filterResults = (
  originalResults: KeywordResult[],
  searchTerm: string,
  volumeFilter: NumericFilter,
  cpcFilter: NumericFilter,
  difficultyFilter: NumericFilter
): KeywordResult[] => {
  return originalResults.filter(result => {
    // Apply keyword search
    const matchesSearch = searchTerm.trim() === '' || 
      result.keyword.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Apply enabled numeric filters with AND logic
    const activeFilters = [volumeFilter, cpcFilter, difficultyFilter].filter(f => f.enabled);
    const matchesNumericFilters = activeFilters.length === 0 || 
      activeFilters.every(filter => applyNumericFilter(result, filter));
    
    return matchesSearch && matchesNumericFilters;
  });
};

export const KeywordResultsTable = ({ 
  results, 
  isLoading, 
  onExport, 
  seedKeyword, 
  keywordAnalyzed, 
  locationCode = 2840,
  // Pagination props
  totalCount = 0,
  page = 1,
  pageSize = 50,
  onPageChange,
  onPageSizeChange,
  // Filter props
  searchTerm: externalSearchTerm = '',
  onSearchChange,
  onFiltersChange,
  // UI customization
  hideResultsCount = false,
  hideFilteringCaption = false
}: KeywordResultsTableProps) => {
  const navigate = useNavigate();
  const [localSearchTerm, setLocalSearchTerm] = useState(externalSearchTerm);
  const [sortBy, setSortBy] = useState<keyof KeywordResult>("searchVolume");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Local filter state for UI (controlled by URL params) - simplified single-value filters
  const [volumeGte, setVolumeGte] = useState<string>('');
  const [difficultyLte, setDifficultyLte] = useState<string>('');
  const [cpcGte, setCpcGte] = useState<string>('');
  const [intentFilter, setIntentFilter] = useState<string>('');

  // Sync local search with external
  useEffect(() => {
    setLocalSearchTerm(externalSearchTerm);
  }, [externalSearchTerm]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearchTerm !== externalSearchTerm && onSearchChange) {
        onSearchChange(localSearchTerm);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearchTerm]);

  // Handle filters with debounce - realtime updates
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onFiltersChange) {
        onFiltersChange({
          volumeMin: volumeGte ? parseInt(volumeGte) : null,
          volumeMax: null,
          difficultyMin: null,
          difficultyMax: difficultyLte ? parseInt(difficultyLte) : null,
          cpcMin: cpcGte ? parseFloat(cpcGte) : null,
          intent: intentFilter && intentFilter !== 'all' ? intentFilter : null,
        });
      }
    }, 350); // Slightly longer debounce for filters to reduce server load
    return () => clearTimeout(timer);
  }, [volumeGte, difficultyLte, cpcGte, intentFilter, onFiltersChange]);

  // Client-side sorting only (filtering happens server-side)
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

  const handleSort = (column: keyof KeywordResult) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const getSortIcon = (column: keyof KeywordResult) => {
    if (sortBy === column) {
      return sortOrder === "asc" ?
        <ChevronUp className="w-4 h-4 inline ml-1" /> :
        <ChevronDown className="w-4 h-4 inline ml-1" />;
    }
    return <ChevronUp className="w-4 h-4 inline ml-1 opacity-30" />;
  };

  const handleSerpClick = (keyword: string) => {
    const language = localStorage.getItem('lastLanguageCode') || 'en';
    const location = locationCode || parseInt(localStorage.getItem('lastLocationCode') || '2840');
    navigate(`/serp-analysis?keyword=${encodeURIComponent(keyword)}&language=${encodeURIComponent(language)}&location=${encodeURIComponent(location.toString())}`);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const totalVolume = results.reduce((sum, result) => sum + (result.searchVolume ?? 0), 0);
  const avgDifficulty = results.length > 0 
    ? Math.round(results.reduce((sum, result) => sum + (result.difficulty ?? 0), 0) / results.length)
    : 0;
  const avgCpc = results.length > 0
    ? results.reduce((sum, result) => sum + (result.cpc ?? 0), 0) / results.length
    : 0;

  if (isLoading) {
    return (
      <Card className="w-full bg-gradient-card shadow-card border-border/50">
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-lg">Analyzing keywords...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (results.length === 0) {
    return null;
  }

  return (
    <div className="w-full space-y-6">
      {/* Results Table */}
      <Card className="bg-gradient-card shadow-card border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Keyword Results</CardTitle>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-background/50"
                  aria-label="Download results"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download results
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onExport?.('csv')}>
                  CSV
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onExport?.('json')}>
                  JSON
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onExport?.('txt')}>
                  TXT
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6">
            {/* Always-visible realtime filters - compact single row at sm+ */}
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {/* Volume Filter - ≥ semantics */}
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Volume ≥</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder="Min"
                      value={volumeGte}
                      onChange={(e) => setVolumeGte(e.target.value.replace(/[^0-9]/g, ''))}
                      className="bg-background text-sm h-9 px-2 w-full max-w-[100px]"
                    />
                  </div>

                  {/* Difficulty Filter - ≤ semantics */}
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Diff ≤</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder="Max"
                      value={difficultyLte}
                      onChange={(e) => setDifficultyLte(e.target.value.replace(/[^0-9]/g, ''))}
                      className="bg-background text-sm h-9 px-2 w-full max-w-[100px]"
                    />
                  </div>

                  {/* CPC Filter - ≥ semantics */}
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">CPC ≥ (USD)</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      placeholder="Min"
                      value={cpcGte}
                      onChange={(e) => setCpcGte(e.target.value.replace(/[^0-9.]/g, ''))}
                      className="bg-background text-sm h-9 px-2 w-full max-w-[100px]"
                    />
                  </div>

                  {/* Intent Filter - dropdown */}
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Intent</Label>
                    <Select value={intentFilter} onValueChange={setIntentFilter}>
                      <SelectTrigger className="bg-background text-sm h-9 px-2 w-full max-w-[100px]">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any</SelectItem>
                        <SelectItem value="Commercial">Commercial</SelectItem>
                        <SelectItem value="Informational">Informational</SelectItem>
                        <SelectItem value="Navigational">Navigational</SelectItem>
                        <SelectItem value="Transactional">Transactional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Results Counter */}
                <div className="text-sm text-muted-foreground whitespace-nowrap">
                  <span className="font-medium text-foreground">{results.length}</span> of <span className="font-medium text-foreground">{totalCount ?? results.length}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 transition-smooth select-none flex-[2] min-w-[320px]"
                    onClick={() => handleSort("keyword")}
                  >
                    <div className="flex items-center">
                      Keyword
                      {getSortIcon("keyword")}
                    </div>
                  </TableHead>
                  <TableHead className="w-14 min-w-[56px]">
                    SERP
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
                    className="cursor-pointer hover:bg-muted/50 transition-smooth text-right select-none w-16 min-w-[70px]"
                    onClick={() => handleSort("difficulty")}
                  >
                    <div className="flex items-center justify-end">
                      Diff
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
                      <div className="flex items-center gap-2 max-w-[280px]">
                        <div className="truncate" title={result.keyword}>
                          {result.keyword}
                        </div>
                        {result.isSeedKeyword && (
                          <Badge variant="outline" className="text-xs shrink-0">SEED</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSerpClick(result.keyword)}
                        className="h-7 px-2 text-xs"
                        aria-label="View SERP"
                      >
                        SERP
                      </Button>
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
                      {formatCurrency(result.cpc, locationCode)}
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

          {/* Pagination Controls (only shown when pagination props provided) */}
          {onPageChange && onPageSizeChange && totalCount !== undefined && page !== undefined && pageSize !== undefined && totalCount > 0 && (
            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Showing {Math.min((page - 1) * pageSize + 1, totalCount)} - {Math.min(page * pageSize, totalCount)} of {totalCount}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Per page:</Label>
                  <Select 
                    value={String(pageSize)} 
                    onValueChange={(value) => onPageSizeChange?.(parseInt(value))}
                  >
                    <SelectTrigger className="w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="250">250</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange?.(page - 1)}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm px-3">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange?.(page + 1)}
                    disabled={page >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};