import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search, TrendingUp, DollarSign, Target, Filter, ChevronUp, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatNumber, formatDifficulty, formatCurrency, getDifficultyColor } from "@/lib/utils";

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
}

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

export const KeywordResultsTable = ({ results, isLoading, onExport, seedKeyword, keywordAnalyzed }: KeywordResultsTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<keyof KeywordResult>("searchVolume");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);
  
  // Define all three filters with their state (live filtering)
  const [volumeFilter, setVolumeFilter] = useState<NumericFilter>({
    field: "searchVolume",
    operator: ">",
    value: 0,
    enabled: false
  });
  const [cpcFilter, setCpcFilter] = useState<NumericFilter>({
    field: "cpc",
    operator: ">",
    value: 0,
    enabled: false
  });
  const [difficultyFilter, setDifficultyFilter] = useState<NumericFilter>({
    field: "difficulty",
    operator: "<",
    value: 100,
    enabled: false
  });

  // Single source of truth: results prop is the original unfiltered dataset
  // Live filtering: computed on every render when any filter state changes
  const filteredResults = filterResults(results, searchTerm, volumeFilter, cpcFilter, difficultyFilter);

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

  const handleResetFilters = () => {
    setVolumeFilter({ field: "searchVolume" as FilterField, operator: ">" as FilterOperator, value: 0, enabled: false });
    setCpcFilter({ field: "cpc" as FilterField, operator: ">" as FilterOperator, value: 0, enabled: false });
    setDifficultyFilter({ field: "difficulty" as FilterField, operator: "<" as FilterOperator, value: 100, enabled: false });
  };

  const getActiveFilterCount = () => {
    return [volumeFilter, cpcFilter, difficultyFilter].filter(f => f.enabled).length;
  };

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
              <CardDescription>
                {results.length} keywords found with comprehensive metrics
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport?.('csv')}
                className="bg-background/50"
              >
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport?.('json')}
                className="bg-background/50"
              >
                <Download className="w-4 h-4 mr-2" />
                JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport?.('txt')}
                className="bg-background/50"
              >
                <Download className="w-4 h-4 mr-2" />
                TXT
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
                {filteredResults.length} of {results.length}
              </Badge>
            </div>

            {showFilters && (
              <div className="bg-muted/30 rounded-lg p-4 space-y-4">
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
                    onClick={handleResetFilters}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-smooth select-none"
                    onClick={() => handleSort("keyword")}
                  >
                    <div className="flex items-center">
                      Keyword
                      {getSortIcon("keyword")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-smooth text-right select-none"
                    onClick={() => handleSort("searchVolume")}
                  >
                    <div className="flex items-center justify-end">
                      Volume
                      {getSortIcon("searchVolume")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-smooth text-right select-none"
                    onClick={() => handleSort("difficulty")}
                  >
                    <div className="flex items-center justify-end">
                      Difficulty
                      {getSortIcon("difficulty")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-smooth text-right select-none"
                    onClick={() => handleSort("cpc")}
                  >
                    <div className="flex items-center justify-end">
                      CPC
                      {getSortIcon("cpc")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-smooth select-none"
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
                    <TableCell className="font-medium max-w-xs">
                      <div className="flex items-center gap-2">
                        <div className="truncate" title={result.keyword}>
                          {result.keyword}
                        </div>
                        {result.isSeedKeyword && (
                          <Badge variant="outline" className="text-xs shrink-0">SEED</Badge>
                        )}
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};