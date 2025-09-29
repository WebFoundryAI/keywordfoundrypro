import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { Search, ChevronUp, ChevronDown } from "lucide-react";

interface RelatedKeyword {
  keyword: string;
  searchVolume: number;
  cpc: number;
  intent: string;
  difficulty: number;
  relevance: number;
}

const RelatedKeywords = () => {
  const [keyword, setKeyword] = useState(() => {
    return localStorage.getItem('lastKeyword') || '';
  });
  const [results, setResults] = useState<RelatedKeyword[]>(() => {
    const stored = localStorage.getItem('relatedKeywordsResults');
    return stored ? JSON.parse(stored) : [];
  });
  const [isLoading, setIsLoading] = useState(false);
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

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('related-keywords', {
        body: {
          keyword: keyword.trim(),
          languageCode: 'en',
          locationCode: 2840
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to find related keywords');
      }

      if (data.success && data.results) {
        setResults(data.results);
        localStorage.setItem('relatedKeywordsResults', JSON.stringify(data.results));
        localStorage.setItem('lastKeyword', keyword.trim());
        toast({
          title: "Analysis Complete",
          description: `Found ${data.total_results} related keywords for "${keyword}" (Cost: $${data.estimated_cost})`,
        });
      } else {
        throw new Error(data.error || 'No results found');
      }
    } catch (error) {
      console.error('Related keywords error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to find related keywords. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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

  const sortedResults = [...results].sort((a, b) => {
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
            <CardHeader>
              <CardTitle>Find Related Keywords</CardTitle>
              <CardDescription>
                Discover content pillars and related opportunities for your keyword strategy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Input
                  placeholder="Enter seed keyword..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSearch}
                  disabled={isLoading}
                  className="px-8"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Search className="w-4 h-4 mr-2" />
                  )}
                  Find Keywords
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
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 transition-smooth text-right select-none"
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
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <div className="w-12 bg-muted rounded-full h-2">
                                <div 
                                  className="bg-primary rounded-full h-2 transition-all"
                                  style={{ width: `${result.relevance}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-8">
                                {result.relevance}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
};

export default RelatedKeywords;