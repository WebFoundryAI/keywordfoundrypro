import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search, TrendingUp, DollarSign, Target, Filter, ChevronUp, ChevronDown } from "lucide-react";

export interface KeywordResult {
  keyword: string;
  searchVolume: number;
  cpc: number;
  intent: string;
  difficulty: number;
  suggestions: string[];
  related: string[];
  clusterId?: string;
  metricsSource: string;
}

interface KeywordResultsTableProps {
  results: KeywordResult[];
  isLoading?: boolean;
  onExport?: (format: 'csv' | 'json') => void;
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

const getDifficultyColor = (difficulty: number) => {
  if (difficulty < 30) return 'text-success';
  if (difficulty < 40) return 'text-warning';
  return 'text-destructive';
};

const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

export const KeywordResultsTable = ({ results, isLoading, onExport }: KeywordResultsTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<keyof KeywordResult>("searchVolume");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const filteredResults = results.filter(result =>
    result.keyword.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedResults = [...filteredResults].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
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
    if (sortBy !== column) return null;
    return sortOrder === "asc" ? 
      <ChevronUp className="w-4 h-4 inline ml-1" /> : 
      <ChevronDown className="w-4 h-4 inline ml-1" />;
  };

  const totalVolume = results.reduce((sum, result) => sum + result.searchVolume, 0);
  const avgDifficulty = results.length > 0 
    ? Math.round(results.reduce((sum, result) => sum + result.difficulty, 0) / results.length)
    : 0;
  const avgCpc = results.length > 0
    ? results.reduce((sum, result) => sum + result.cpc, 0) / results.length
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
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-card shadow-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Search className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Keywords</p>
                <p className="text-2xl font-bold">{results.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Volume</p>
                <p className="text-2xl font-bold">{formatNumber(totalVolume)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/20 rounded-lg">
                <Target className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Difficulty</p>
                <p className="text-2xl font-bold">{avgDifficulty}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg CPC</p>
                <p className="text-2xl font-bold">${avgCpc.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Filter keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background/50"
              />
            </div>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Filter className="w-3 h-3" />
              {filteredResults.length} of {results.length}
            </Badge>
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
                  <TableHead>Intent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedResults.map((result, index) => (
                  <TableRow key={index} className="hover:bg-muted/20 transition-smooth">
                    <TableCell className="font-medium max-w-xs">
                      <div className="truncate" title={result.keyword}>
                        {result.keyword}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatNumber(result.searchVolume)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-bold ${getDifficultyColor(result.difficulty)}`}>
                        {result.difficulty}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${result.cpc.toFixed(2)}
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