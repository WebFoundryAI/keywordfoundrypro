import { useState, useTransition, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileDown, FileText, Loader2 } from "lucide-react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useCompetitorGap } from "@/hooks/useCompetitorGap";
import { getAvailableMarkets, MARKETS } from "@/lib/markets";
import { toast } from "@/hooks/use-toast";

const CompetitorGap = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { startComparison, getReport, getKeywords, isStarting, isLoadingReport } = useCompetitorGap();
  const [isPending, startTransition] = useTransition();
  
  // Form state - sync with URL params
  const [yourDomain, setYourDomain] = useState(() => searchParams.get("yourDomain") || "");
  const [competitorDomain, setCompetitorDomain] = useState(() => searchParams.get("competitorDomain") || "");
  const [market, setMarket] = useState(() => searchParams.get("market") || "us");
  const [freshness, setFreshness] = useState(() => searchParams.get("freshness") || "live");
  const [includeRelated, setIncludeRelated] = useState(() => searchParams.get("includeRelated") === "true");
  const [pullSerpFeatures, setPullSerpFeatures] = useState(() => searchParams.get("pullSerpFeatures") === "true");
  
  // Report state
  const [reportId, setReportId] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [missingKeywords, setMissingKeywords] = useState<any[]>([]);
  const [overlapKeywords, setOverlapKeywords] = useState<any[]>([]);

  // Sync form state to URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (yourDomain) params.set("yourDomain", yourDomain);
    if (competitorDomain) params.set("competitorDomain", competitorDomain);
    if (market) params.set("market", market);
    if (freshness) params.set("freshness", freshness);
    if (includeRelated) params.set("includeRelated", "true");
    if (pullSerpFeatures) params.set("pullSerpFeatures", "true");
    setSearchParams(params, { replace: true });
  }, [yourDomain, competitorDomain, market, freshness, includeRelated, pullSerpFeatures, setSearchParams]);

  // Poll for report completion
  useEffect(() => {
    if (!reportId || reportData?.report?.status === "done") return;

    const pollInterval = setInterval(async () => {
      const data = await getReport(reportId);
      if (data) {
        setReportData(data);
        if (data.report.status === "done") {
          // Fetch keywords when done
          const missing = await getKeywords(reportId, "missing", 1, 100);
          const overlap = await getKeywords(reportId, "overlap", 1, 100);
          setMissingKeywords(missing.keywords);
          setOverlapKeywords(overlap.keywords);
          
          toast({
            title: "Analysis Complete",
            description: "Your competitor gap analysis is ready!",
          });
        }
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [reportId, reportData?.report?.status, getReport, getKeywords]);

  const handleRunComparison = () => {
    if (!yourDomain || !competitorDomain || !market) {
      toast({
        title: "Missing Fields",
        description: "Please enter both domains and select a market.",
        variant: "destructive",
      });
      return;
    }

    startTransition(() => {
      (async () => {
        const id = await startComparison({
          myDomain: yourDomain,
          competitorDomain: competitorDomain,
          market,
          freshness: freshness as "live" | "24h" | "7d",
          includeRelated,
          includeSerp: pullSerpFeatures,
        });

        if (id) {
          setReportId(id);
          setReportData(null);
          toast({
            title: "Analysis Queued",
            description: "We'll notify you when ready. This may take a few minutes.",
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to start analysis. Please try again.",
            variant: "destructive",
          });
        }
      })();
    });
  };

  // Chart data from report
  const scatterData = reportData?.scatterData || [];
  const pieData = reportData?.pieData || [
    { name: "Overlap", value: 0, color: "hsl(var(--primary))" },
    { name: "Your Only", value: 0, color: "hsl(var(--secondary))" },
    { name: "Their Only", value: 0, color: "hsl(var(--accent))" },
  ];

  const handleGenerateReport = () => {
    console.log("Generate report clicked");
  };

  const handleDownloadCSV = () => {
    console.log("Download CSV clicked");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Competitor Gap Analysis</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleGenerateReport}>
              <FileText className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadCSV}>
              <FileDown className="w-4 h-4 mr-2" />
              Download CSV
            </Button>
          </div>
        </div>

        {/* Controls Card */}
        <Card>
          <CardHeader>
            <CardTitle>Comparison Settings</CardTitle>
            <CardDescription>Configure your competitor analysis parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="your-domain">Your Domain</Label>
                <Input
                  id="your-domain"
                  value={yourDomain}
                  onChange={(e) => setYourDomain(e.target.value)}
                  placeholder="example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="competitor-domain">Competitor Domain</Label>
                <Input
                  id="competitor-domain"
                  value={competitorDomain}
                  onChange={(e) => setCompetitorDomain(e.target.value)}
                  placeholder="competitor.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="market">Market</Label>
                <Select value={market} onValueChange={setMarket}>
                  <SelectTrigger id="market">
                    <SelectValue placeholder="Select market" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="us">{MARKETS.us.name}</SelectItem>
                    <SelectItem value="uk">{MARKETS.uk.name}</SelectItem>
                    <SelectItem value="au">{MARKETS.au.name}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="freshness">Freshness</Label>
                <Select value={freshness} onValueChange={setFreshness}>
                  <SelectTrigger id="freshness">
                    <SelectValue placeholder="Select freshness" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="24h">Last 24 hours</SelectItem>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-related"
                  checked={includeRelated}
                  onCheckedChange={(checked) => setIncludeRelated(checked as boolean)}
                />
                <Label htmlFor="include-related" className="cursor-pointer">
                  Include related keywords
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pull-serp"
                  checked={pullSerpFeatures}
                  onCheckedChange={(checked) => setPullSerpFeatures(checked as boolean)}
                />
                <Label htmlFor="pull-serp" className="cursor-pointer">
                  Pull SERP features
                </Label>
              </div>
            </div>
            <Button onClick={handleRunComparison} className="w-full md:w-auto" disabled={isStarting || isPending}>
              {(isStarting || isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Run Comparison
            </Button>
          </CardContent>
        </Card>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Keywords (You)</CardDescription>
              <CardTitle className="text-3xl">
                {reportData?.kpis?.totalYourKeywords?.toLocaleString() || "—"}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Keywords (Competitor)</CardDescription>
              <CardTitle className="text-3xl">
                {reportData?.kpis?.totalTheirKeywords?.toLocaleString() || "—"}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Overlap</CardDescription>
              <CardTitle className="text-3xl">
                {reportData?.kpis?.overlapCount?.toLocaleString() || "—"}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Missing (Their Only)</CardDescription>
              <CardTitle className="text-3xl text-destructive">
                {reportData?.kpis?.missingCount?.toLocaleString() || "—"}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Opportunity Scatter</CardTitle>
              <CardDescription>Volume vs Difficulty</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="volume" name="Volume" className="text-muted-foreground" />
                  <YAxis dataKey="difficulty" name="Difficulty" className="text-muted-foreground" />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                  <Scatter data={scatterData} fill="hsl(var(--primary))" />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Overlap vs Unique</CardTitle>
              <CardDescription>Keyword distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Section */}
        <Card>
          <CardHeader>
            <CardTitle>Detailed Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="missing" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="missing">Missing Keywords</TabsTrigger>
                <TabsTrigger value="overlap">Overlap / Rank Delta</TabsTrigger>
                <TabsTrigger value="page-level">Page-Level Gaps</TabsTrigger>
              </TabsList>
              <TabsContent value="missing" className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input placeholder="Filter keywords..." className="max-w-sm" />
                  <Button variant="outline" size="sm">Filter</Button>
                </div>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Keyword</TableHead>
                        <TableHead>Volume</TableHead>
                        <TableHead>Difficulty</TableHead>
                        <TableHead>CPC</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {missingKeywords.length > 0 ? (
                        missingKeywords.map((kw) => (
                          <TableRow key={kw.id}>
                            <TableCell>{kw.keyword}</TableCell>
                            <TableCell>{kw.volume?.toLocaleString() || "—"}</TableCell>
                            <TableCell>{kw.difficulty || "—"}</TableCell>
                            <TableCell>${kw.cpc?.toFixed(2) || "—"}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            {reportData ? "No missing keywords found" : "Run a comparison to see results"}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              <TabsContent value="overlap" className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input placeholder="Filter keywords..." className="max-w-sm" />
                  <Button variant="outline" size="sm">Filter</Button>
                </div>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Keyword</TableHead>
                        <TableHead>Your Rank</TableHead>
                        <TableHead>Their Rank</TableHead>
                        <TableHead>Delta</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overlapKeywords.length > 0 ? (
                        overlapKeywords.map((kw) => (
                          <TableRow key={kw.id}>
                            <TableCell>{kw.keyword}</TableCell>
                            <TableCell>{kw.your_pos || "—"}</TableCell>
                            <TableCell>{kw.their_pos || "—"}</TableCell>
                            <TableCell className={kw.delta && kw.delta > 0 ? "text-green-600" : "text-destructive"}>
                              {kw.delta ? (kw.delta > 0 ? `+${kw.delta}` : kw.delta) : "—"}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            {reportData ? "No overlap keywords found" : "Run a comparison to see results"}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              <TabsContent value="page-level" className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input placeholder="Filter pages..." className="max-w-sm" />
                  <Button variant="outline" size="sm">Filter</Button>
                </div>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Page URL</TableHead>
                        <TableHead>Keywords</TableHead>
                        <TableHead>Avg Position</TableHead>
                        <TableHead>Traffic Est.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-mono text-sm">/page-1</TableCell>
                        <TableCell>42</TableCell>
                        <TableCell>8.5</TableCell>
                        <TableCell>2,150</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-mono text-sm">/page-2</TableCell>
                        <TableCell>28</TableCell>
                        <TableCell>12.3</TableCell>
                        <TableCell>890</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompetitorGap;
