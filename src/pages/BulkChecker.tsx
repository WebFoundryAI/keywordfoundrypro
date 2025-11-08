import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Download, Trash2, Search } from "lucide-react";
import { logger } from '@/lib/logger';

interface KeywordResult {
  keyword: string;
  search_volume: number;
  competition_index: number;
  competition: string;
  low_top_of_page_bid: number;
  high_top_of_page_bid: number;
  monthly_searches: Array<{
    year: number;
    month: number;
    search_volume: number;
  }>;
}

const BulkChecker = () => {
  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("United Kingdom");
  const [language, setLanguage] = useState("English");
  const [sandbox, setSandbox] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<KeywordResult[]>([]);
  const [filterText, setFilterText] = useState("");
  const [sortColumn, setSortColumn] = useState<keyof KeywordResult | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Load persisted results from localStorage
  useEffect(() => {
    const savedResults = localStorage.getItem('bulkCheckerResults');
    if (savedResults) {
      try {
        setResults(JSON.parse(savedResults));
      } catch (error) {
        console.error('Failed to parse saved results:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth/sign-in');
    }
  }, [user, loading, navigate]);

  const handleCheck = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to use the bulk checker.",
        variant: "destructive",
      });
      navigate('/auth/sign-in');
      return;
    }

    // Parse keywords
    const keywordList = keywords
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    // Validation
    if (keywordList.length === 0) {
      toast({
        title: "No Keywords",
        description: "Please enter at least one keyword.",
        variant: "destructive",
      });
      return;
    }

    if (keywordList.length > 50) {
      toast({
        title: "Too Many Keywords",
        description: "Maximum 50 keywords allowed. Please reduce your list.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Refresh session
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      logger.log('Session refresh result:', {
        hasSession: !!session,
        sessionError: sessionError,
      });

      if (!session?.access_token) {
        logger.error('No valid session or access token found');
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please sign in again.",
          variant: "destructive",
        });
        navigate('/auth/sign-in');
        return;
      }

      logger.log('Calling bulk-keyword-checker function');

      // Call edge function
      const { data, error } = await supabase.functions.invoke('bulk-keyword-checker', {
        body: {
          keywords: keywordList,
          location,
          language,
          sandbox
        }
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to check keywords');
      }

      const fetchedResults = data.results || [];
      setResults(fetchedResults);
      
      // Persist to localStorage
      localStorage.setItem('bulkCheckerResults', JSON.stringify(fetchedResults));

      toast({
        title: "Keywords Checked",
        description: `Successfully checked ${fetchedResults.length} keywords (Cost: $${data.cost?.toFixed(4) || '0.00'})`,
      });

    } catch (err: any) {
      logger.error('Bulk checker error:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to check keywords. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setResults([]);
    localStorage.removeItem('bulkCheckerResults');
    toast({
      title: "Results Cleared",
      description: "All results have been removed.",
    });
  };

  const handleExportCSV = () => {
    if (results.length === 0) {
      toast({
        title: "No Data",
        description: "No results to export.",
        variant: "destructive",
      });
      return;
    }

    const headers = [
      "Keyword",
      "Search Volume",
      "Competition Index",
      "Competition",
      "Low Top Bid",
      "High Top Bid",
      "Latest Monthly Volume"
    ];

    const rows = filteredAndSortedResults.map(result => [
      result.keyword,
      result.search_volume,
      result.competition_index,
      result.competition,
      result.low_top_of_page_bid.toFixed(2),
      result.high_top_of_page_bid.toFixed(2),
      result.monthly_searches[0]?.search_volume || 0
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulk-keywords-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "CSV file downloaded successfully.",
    });
  };

  const handleSort = (column: keyof KeywordResult) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const filteredAndSortedResults = results
    .filter(result =>
      result.keyword.toLowerCase().includes(filterText.toLowerCase())
    )
    .sort((a, b) => {
      if (!sortColumn) return 0;
      
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === "asc" 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return 0;
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Bulk Keyword Checker</h1>
          <p className="text-muted-foreground mt-1">
            Check search volume and competition for up to 50 keywords at once
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enter Keywords</CardTitle>
          <CardDescription>
            Enter one keyword per line (maximum 50 keywords)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="keywords">Keywords</Label>
            <Textarea
              id="keywords"
              placeholder="blocked drains swindon&#10;cctv drain survey&#10;drain unblocking..."
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground">
              {keywords.split('\n').filter(k => k.trim()).length} / 50 keywords
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
                  <SelectItem value="Germany">Germany</SelectItem>
                  <SelectItem value="France">France</SelectItem>
                  <SelectItem value="Spain">Spain</SelectItem>
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

          <div className="flex items-center space-x-2">
            <Switch
              id="sandbox"
              checked={sandbox}
              onCheckedChange={setSandbox}
            />
            <Label htmlFor="sandbox" className="cursor-pointer">
              Sandbox Mode (Test with free credits)
            </Label>
          </div>

          <Button
            onClick={handleCheck}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? "Checking Keywords..." : "Check Keywords"}
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Results ({results.length} keywords)</CardTitle>
                <CardDescription>Click column headers to sort</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button variant="outline" size="sm" onClick={handleClear}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Results
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Filter keywords..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="max-w-sm"
              />
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('keyword')}
                    >
                      Keyword {sortColumn === 'keyword' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 text-right"
                      onClick={() => handleSort('search_volume')}
                    >
                      Volume {sortColumn === 'search_volume' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 text-right"
                      onClick={() => handleSort('competition_index')}
                    >
                      Comp. Index {sortColumn === 'competition_index' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('competition')}
                    >
                      Competition {sortColumn === 'competition' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead className="text-right">Low Bid</TableHead>
                    <TableHead className="text-right">High Bid</TableHead>
                    <TableHead className="text-right">Latest Monthly</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedResults.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{result.keyword}</TableCell>
                      <TableCell className="text-right">{result.search_volume.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{result.competition_index}</TableCell>
                      <TableCell>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          result.competition === 'LOW' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          result.competition === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          result.competition === 'HIGH' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                        }`}>
                          {result.competition}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">${result.low_top_of_page_bid.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${result.high_top_of_page_bid.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        {result.monthly_searches[0]?.search_volume?.toLocaleString() || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredAndSortedResults.length === 0 && results.length > 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No keywords match your filter
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BulkChecker;
