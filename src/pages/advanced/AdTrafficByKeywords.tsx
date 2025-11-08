import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { logger } from '@/lib/logger';
import { Download } from "lucide-react";

const AdTrafficByKeywords = () => {
  const [keywords, setKeywords] = useState("");
  const [bid, setBid] = useState(1.0);
  const [match, setMatch] = useState("broad");
  const [location, setLocation] = useState("United Kingdom");
  const [language, setLanguage] = useState("English");
  const [dateMode, setDateMode] = useState<"interval" | "range">("interval");
  const [dateInterval, setDateInterval] = useState("next_month");
  const [searchPartners, setSearchPartners] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const { toast } = useToast();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleForecast = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to use this feature.",
        variant: "destructive",
      });
      navigate('/');
      return;
    }

    const keywordList = keywords
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    if (keywordList.length === 0) {
      toast({
        title: "No Keywords",
        description: "Please enter at least one keyword.",
        variant: "destructive",
      });
      return;
    }

    if (keywordList.length > 1000) {
      toast({
        title: "Too Many Keywords",
        description: "Maximum 1000 keywords allowed.",
        variant: "destructive",
      });
      return;
    }

    if (bid <= 0) {
      toast({
        title: "Invalid Bid",
        description: "Please enter a valid bid amount.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const payload: any = {
        keywords: keywordList,
        bid,
        match,
        location_name: location,
        language_name: language,
        search_partners: searchPartners
      };

      if (dateMode === "interval") {
        payload.date_interval = dateInterval;
      }

      const { data, error } = await supabase.functions.invoke('ad-traffic-by-keywords', {
        body: payload
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to forecast traffic');
      }

      setResults(data.results || []);

      toast({
        title: "Forecast Complete",
        description: `Forecasted traffic for ${data.results.length} keywords (Cost: $${data.cost?.toFixed(4) || '0.00'})`,
      });

    } catch (err: any) {
      logger.error('Ad traffic forecast error:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to forecast traffic. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    if (results.length === 0) return;

    const headers = ['Keyword', 'Impressions', 'Clicks', 'CPC', 'Cost', 'Match Type'];
    const rows = [
      headers.join(','),
      ...results.map(r => [
        `"${r.keyword}"`,
        r.impressions || 0,
        r.clicks || 0,
        r.cpc?.toFixed(2) || 0,
        ((r.clicks || 0) * (r.cpc || 0)).toFixed(2),
        match
      ].join(','))
    ];
    
    const content = rows.join('\n');
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ad-traffic-forecast-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export Complete",
      description: `Downloaded ${results.length} forecasts`,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ad Traffic Forecast</h1>
        <p className="text-muted-foreground mt-1">
          Forecast Google Ads traffic and costs for your keywords
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Forecast Configuration</CardTitle>
          <CardDescription>
            Enter keywords and bid amount to forecast potential ad traffic
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="keywords">Keywords (max 1000)</Label>
            <Textarea
              id="keywords"
              placeholder="keyword one&#10;keyword two&#10;keyword three"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground">
              {keywords.split('\n').filter(k => k.trim()).length} / 1000 keywords
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bid">Bid Amount (USD) *</Label>
              <Input
                id="bid"
                type="number"
                min="0.01"
                step="0.01"
                value={bid}
                onChange={(e) => setBid(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="match">Match Type</Label>
              <Select value={match} onValueChange={setMatch}>
                <SelectTrigger id="match">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="broad">Broad</SelectItem>
                  <SelectItem value="phrase">Phrase</SelectItem>
                  <SelectItem value="exact">Exact</SelectItem>
                </SelectContent>
              </Select>
            </div>
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

          <div className="space-y-3">
            <Label>Forecast Period</Label>
            <RadioGroup value={dateMode} onValueChange={(v) => setDateMode(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="interval" id="interval" />
                <Label htmlFor="interval" className="cursor-pointer">Use Interval</Label>
              </div>
            </RadioGroup>
            
            {dateMode === "interval" && (
              <Select value={dateInterval} onValueChange={setDateInterval}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="next_week">Next Week</SelectItem>
                  <SelectItem value="next_month">Next Month</SelectItem>
                  <SelectItem value="next_quarter">Next Quarter</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="searchPartners"
              checked={searchPartners}
              onCheckedChange={(checked) => setSearchPartners(checked as boolean)}
            />
            <Label htmlFor="searchPartners" className="cursor-pointer">
              Include search partners
            </Label>
          </div>

          <Button
            onClick={handleForecast}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? "Forecasting Traffic..." : "Forecast Traffic"}
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Traffic Forecast Results</CardTitle>
              <CardDescription>{results.length} keywords analyzed</CardDescription>
            </div>
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead className="text-right">Impressions</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">CPC</TableHead>
                    <TableHead className="text-right">Est. Cost</TableHead>
                    <TableHead>Match</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{result.keyword}</TableCell>
                      <TableCell className="text-right">{result.impressions?.toLocaleString() || '-'}</TableCell>
                      <TableCell className="text-right">{result.clicks?.toLocaleString() || '-'}</TableCell>
                      <TableCell className="text-right">${result.cpc?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell className="text-right">
                        ${((result.clicks || 0) * (result.cpc || 0)).toFixed(2)}
                      </TableCell>
                      <TableCell className="capitalize">{match}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdTrafficByKeywords;
