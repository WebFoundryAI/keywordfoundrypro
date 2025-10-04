import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search, TrendingUp, DollarSign, Target, Filter, ChevronUp, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  onExport?: (format: 'csv' | 'json') => void;
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

const getDifficultyColor = (difficulty: number | null) => {
  if (difficulty === null) return 'text-muted-foreground';
  if (difficulty < 30) return 'text-success';
  if (difficulty < 40) return 'text-warning';
  return 'text-destructive';
};

const formatDifficulty = (difficulty: number | null) => {
  return difficulty === null ? '—' : difficulty.toString();
};

const formatNumber = (num: number | null) => {
  if (num === null) return '—';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

type FilterField = "searchVolume" | "cpc" | "difficulty";
type FilterOperator = "<" | ">" | "<=" | ">=" | "=";

interface NumericFilter {
  field: FilterField;
  operator: FilterOperator;
  value: number;
  enabled: boolean;
}

const applyNumericFilter = (result: KeywordResult, filter: NumericFilter): boolean => {
  const fieldValue = result[filter.field];
  
  // Skip filtering if value is null (no data available from API)
  if (fieldValue === null) return false;
  
  switch (filter.operator) {
    case "<":
      return fieldValue < filter.value;
    case ">":
      return fieldValue > filter.value;
    case "<=":
      return fieldValue <= filter.value;
    case ">=":
      return fieldValue >= filter.value;
    case "=":
      return fieldValue === filter.value;
    default:
      return true;
  }
};

export const KeywordResultsTable = ({ results, isLoading, onExport, seedKeyword, keywordAnalyzed }: KeywordResultsTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<keyof KeywordResult>("searchVolume");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);
  
  // Define all three filters with their state
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
  
  // Working copies for editing (not applied until user clicks Apply)
  const [workingVolumeFilter, setWorkingVolumeFilter] = useState(volumeFilter);
  const [workingCpcFilter, setWorkingCpcFilter] = useState(cpcFilter);
  const [workingDifficultyFilter, setWorkingDifficultyFilter] = useState(difficultyFilter);

  const filteredResults = results.filter(result => {
    // Apply keyword search
    const matchesSearch = result.keyword.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Apply all enabled numeric filters (AND logic)
    const activeFilters = [volumeFilter, cpcFilter, difficultyFilter].filter(f => f.enabled);
    const matchesNumericFilters = activeFilters.every(filter => 
      applyNumericFilter(result, filter)
    );
    
    return matchesSearch && matchesNumericFilters;
  });

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

  const handleApplyFilters = () => {
    setVolumeFilter(workingVolumeFilter);
    setCpcFilter(workingCpcFilter);
    setDifficultyFilter(workingDifficultyFilter);
  };

  const handleResetFilters = () => {
    const resetVolume = { field: "searchVolume" as FilterField, operator: ">" as FilterOperator, value: 0, enabled: false };
    const resetCpc = { field: "cpc" as FilterField, operator: ">" as FilterOperator, value: 0, enabled: false };
    const resetDifficulty = { field: "difficulty" as FilterField, operator: "<" as FilterOperator, value: 100, enabled: false };
    
    setWorkingVolumeFilter(resetVolume);
    setWorkingCpcFilter(resetCpc);
    setWorkingDifficultyFilter(resetDifficulty);
    
    setVolumeFilter(resetVolume);
    setCpcFilter(resetCpc);
    setDifficultyFilter(resetDifficulty);
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
                    checked={workingVolumeFilter.enabled}
                    onChange={(e) => setWorkingVolumeFilter({ ...workingVolumeFilter, enabled: e.target.checked })}
                    className="w-4 h-4 rounded border-border"
                  />
                  <span className="text-sm font-medium min-w-[80px]">Volume</span>
                  <Select
                    value={workingVolumeFilter.operator}
                    onValueChange={(value) => setWorkingVolumeFilter({ ...workingVolumeFilter, operator: value as FilterOperator })}
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
                    value={workingVolumeFilter.value}
                    onChange={(e) => setWorkingVolumeFilter({ ...workingVolumeFilter, value: parseFloat(e.target.value) || 0 })}
                    placeholder="Value"
                    className="w-[120px] bg-background"
                  />
                </div>

                {/* CPC Filter */}
                <div className="flex items-center gap-3 bg-background/80 p-3 rounded-md border border-border/30">
                  <input
                    type="checkbox"
                    checked={workingCpcFilter.enabled}
                    onChange={(e) => setWorkingCpcFilter({ ...workingCpcFilter, enabled: e.target.checked })}
                    className="w-4 h-4 rounded border-border"
                  />
                  <span className="text-sm font-medium min-w-[80px]">CPC</span>
                  <Select
                    value={workingCpcFilter.operator}
                    onValueChange={(value) => setWorkingCpcFilter({ ...workingCpcFilter, operator: value as FilterOperator })}
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
                    value={workingCpcFilter.value}
                    onChange={(e) => setWorkingCpcFilter({ ...workingCpcFilter, value: parseFloat(e.target.value) || 0 })}
                    placeholder="Value"
                    className="w-[120px] bg-background"
                  />
                </div>

                {/* Difficulty Filter */}
                <div className="flex items-center gap-3 bg-background/80 p-3 rounded-md border border-border/30">
                  <input
                    type="checkbox"
                    checked={workingDifficultyFilter.enabled}
                    onChange={(e) => setWorkingDifficultyFilter({ ...workingDifficultyFilter, enabled: e.target.checked })}
                    className="w-4 h-4 rounded border-border"
                  />
                  <span className="text-sm font-medium min-w-[80px]">Difficulty</span>
                  <Select
                    value={workingDifficultyFilter.operator}
                    onValueChange={(value) => setWorkingDifficultyFilter({ ...workingDifficultyFilter, operator: value as FilterOperator })}
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
                    value={workingDifficultyFilter.value}
                    onChange={(e) => setWorkingDifficultyFilter({ ...workingDifficultyFilter, value: parseFloat(e.target.value) || 0 })}
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
                  <Button
                    size="sm"
                    onClick={handleApplyFilters}
                  >
                    Apply
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
                      {result.cpc !== null ? `$${result.cpc.toFixed(2)}` : '—'}
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