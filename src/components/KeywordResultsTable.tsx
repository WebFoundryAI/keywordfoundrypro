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
  seedKeyword?: KeywordResult | null;
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

export const KeywordResultsTable = ({ results, isLoading, onExport, seedKeyword }: KeywordResultsTableProps) => {
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
    if (sortBy === column) {
      return sortOrder === "asc" ? 
        <ChevronUp className="w-4 h-4 inline ml-1" /> : 
        <ChevronDown className="w-4 h-4 inline ml-1" />;
    }
    return <ChevronUp className="w-4 h-4 inline ml-1 opacity-30" />;
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
      {/* Seed Keyword Section - Always show if we have results */}
      <Card className="bg-gradient-card shadow-card border-border/50 border-primary/20">
        <CardHeader>
          <CardTitle className="text-primary">
            {seedKeyword ? `"${seedKeyword.keyword}"` : 'Original Keyword'}
            <Badge variant="outline" className="ml-2 text-xs">SEED KEYWORD</Badge>
          </CardTitle>
          <CardDescription>
            Core metrics for your primary keyword
          </CardDescription>
        </CardHeader>
        <CardContent>
          {seedKeyword ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-background/50 rounded-lg p-4 text-center border border-border/30">
                <div className="text-sm text-muted-foreground mb-1">Search Volume</div>
                <div className="text-2xl font-bold text-success">{seedKeyword.searchVolume.toLocaleString()}</div>
              </div>
              <div className="bg-background/50 rounded-lg p-4 text-center border border-border/30">
                <div className="text-sm text-muted-foreground mb-1">Difficulty</div>
                <div className={`text-2xl font-bold ${getDifficultyColor(seedKeyword.difficulty)}`}>{seedKeyword.difficulty}</div>
              </div>
              <div className="bg-background/50 rounded-lg p-4 text-center border border-border/30">
                <div className="text-sm text-muted-foreground mb-1">CPC</div>
                <div className="text-2xl font-bold text-primary">${seedKeyword.cpc.toFixed(2)}</div>
              </div>
              <div className="bg-background/50 rounded-lg p-4 text-center border border-border/30">
                <div className="text-sm text-muted-foreground mb-1">Intent</div>
                <div className="text-lg font-medium">
                  <Badge variant="outline" className={`${getIntentColor(seedKeyword.intent)} text-xs`}>
                    {seedKeyword.intent}
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-muted-foreground">Seed keyword metrics not available</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card className="bg-gradient-card shadow-card border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Related Keywords</CardTitle>
              <CardDescription>
                {results.length} additional keywords found with comprehensive metrics
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