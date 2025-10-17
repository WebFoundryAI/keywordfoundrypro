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
import { Loader2 } from "lucide-react";
import { useCompetitorGap } from "@/hooks/useCompetitorGap";
import { MARKETS } from "@/lib/markets";
import { toast } from "@/hooks/use-toast";
import { GapKpi } from "@/components/GapKpi";
import { OpportunityScatter } from "@/components/OpportunityScatter";
import { OverlapPie } from "@/components/OverlapPie";
import { GapTable } from "@/components/GapTable";
import { useAuth } from "@/components/AuthProvider";

const CompetitorGap = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { startComparison, getReport, getKeywords, isStarting, isLoadingReport } = useCompetitorGap();
  const [isPending, startTransition] = useTransition();
  const { user } = useAuth();
  
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
  const scatterPoints = (reportData?.scatterData || []).map((item: any) => ({
    x: item.difficulty,
    y: item.volume,
    label: item.keyword,
    score: item.opportunityScore,
  }));

  const handleGenerateReport = () => {
    console.log("Generate report clicked");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />
      
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Competitor Gap Analysis</h1>
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

        {/* KPI Cards */}
        {reportData && (
          <GapKpi
            totalYourKeywords={reportData.kpis.totalYourKeywords}
            totalTheirKeywords={reportData.kpis.totalTheirKeywords}
            overlapCount={reportData.kpis.overlapCount}
            missingCount={reportData.kpis.missingCount}
          />
        )}

        {/* Charts Row */}
        {reportData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <OpportunityScatter points={scatterPoints} />
            <OverlapPie
              overlapCount={reportData.kpis.overlapCount}
              yourOnlyCount={reportData.kpis.totalYourKeywords - reportData.kpis.overlapCount}
              theirOnlyCount={reportData.kpis.missingCount}
            />
          </div>
        )}

        {/* Tabs Section */}
        <Card>
          <CardHeader>
            <CardTitle>Detailed Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="missing" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="missing">Missing Keywords</TabsTrigger>
                <TabsTrigger value="overlap">Overlap / Rank Delta</TabsTrigger>
              </TabsList>
              <TabsContent value="missing" className="mt-6">
                <GapTable 
                  type="missing" 
                  data={missingKeywords} 
                  loading={isLoadingReport}
                />
              </TabsContent>
              <TabsContent value="overlap" className="mt-6">
                <GapTable 
                  type="overlap" 
                  data={overlapKeywords} 
                  loading={isLoadingReport}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompetitorGap;
