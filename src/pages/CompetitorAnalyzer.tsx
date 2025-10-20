import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { invokeWithAuth, DataForSEOApiError } from "@/lib/supabaseHelpers";
import { Loader2, TrendingUp, Link as LinkIcon, Code, Sparkles, RefreshCw, Download } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toCSV, toJSON, normalizedFilename, type GapKeywordRow, type ExportMeta } from "@/utils/exportHelpers";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AnalysisData {
  keyword_gap_list: Array<{
    keyword: string;
    position: number;
    search_volume: number;
    cpc: number;
  }>;
  backlink_summary: {
    your_domain: {
      backlinks: number;
      referring_domains: number;
      referring_ips: number;
    };
    competitor_domain: {
      backlinks: number;
      referring_domains: number;
      referring_ips: number;
    };
  };
  onpage_summary: {
    your_domain: {
      pages_crawled: number;
      internal_links: number;
      external_links: number;
      images: number;
      tech_score: number;
    };
    competitor_domain: {
      pages_crawled: number;
      internal_links: number;
      external_links: number;
      images: number;
      tech_score: number;
    };
  };
  cached?: boolean;
  warnings?: string[];
}

const FREE_LIMIT = 3;

export default function CompetitorAnalyzer() {
  const [yourDomain, setYourDomain] = useState("");
  const [competitorDomain, setCompetitorDomain] = useState("");
  const [locationCode, setLocationCode] = useState(() => localStorage.getItem("kfp_loc_code") || "");
  const [languageCode, setLanguageCode] = useState(() => localStorage.getItem("kfp_lang_code") || "");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'keyword' | 'position' | 'search_volume' | 'cpc'>('search_volume');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [profile, setProfile] = useState<{ free_reports_used: number; free_reports_renewal_at: string | null } | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('free_reports_used, free_reports_renewal_at')
          .eq('user_id', user.id)
          .single();
        if (data) {
          setProfile(data);
        }
      }
    };
    fetchProfile();
  }, []);

  const handleCompare = async () => {
    if (!yourDomain || !competitorDomain) {
      toast({ title: "Missing Information", description: "Please enter both domains", variant: "destructive" });
      return;
    }

    // Domain normalization to bare host
    const normalize = (v: string) => {
      try { const u = new URL(v.trim()); return u.hostname.replace(/^www\./, ''); }
      catch {
        return v.trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*/, '');
      }
    };
    
    // Save location/language to localStorage
    if (locationCode) localStorage.setItem("kfp_loc_code", locationCode);
    if (languageCode) localStorage.setItem("kfp_lang_code", languageCode);
    
    const payload: any = { 
      yourDomain: normalize(yourDomain), 
      competitorDomain: normalize(competitorDomain) 
    };
    if (locationCode) payload.location_code = parseInt(locationCode, 10);
    if (languageCode) payload.language_code = languageCode;

    // Pre-check local badge if available
    if (profile) {
      const now = new Date();
      const renewalDate = profile.free_reports_renewal_at ? new Date(profile.free_reports_renewal_at) : null;
      const needsRenewal = !renewalDate || now > renewalDate;
      const effectiveUsed = needsRenewal ? 0 : (profile.free_reports_used || 0);
      if (effectiveUsed >= FREE_LIMIT) { setShowLimitModal(true); return; }
    }

    setLoading(true);
    setAnalyzing(true);
    setAnalysisData(null);
    setAiInsights(null);

    try {
      const data = await invokeWithAuth('competitor-analyze', payload);

      // Handle expected business outcomes via data.code
      if (data?.code === 'LIMIT_EXCEEDED') {
        setShowLimitModal(true);
        return;
      }
      if (data?.code === 'PROFILE_MISSING') {
        toast({ title: "Profile issue", description: "Please sign out and back in, then retry.", variant: "destructive" });
        return;
      }

      setAnalysisData(data);

      // Refresh profile badge after a successful run
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: updatedProfile } = await supabase
          .from('profiles')
          .select('free_reports_used, free_reports_renewal_at')
          .eq('user_id', user.id)
          .single();
        if (updatedProfile) setProfile(updatedProfile);
      }

      if (data?.cached) {
        toast({ title: "Loaded from cache", description: "Using cached analysis results (last 24 hours)" });
      } else {
        if (data?.warnings && data.warnings.length > 0) {
          toast({ 
            title: "Analysis complete with partial data", 
            description: "Some data unavailable - showing available results.",
            variant: "default"
          });
        } else {
          toast({ title: "Analysis complete", description: "Competitor report is ready." });
        }
      }

      // Auto-generate AI insights
      await generateAIInsights(data);

    } catch (error: any) {
      // Handle DataForSEO specific errors with helpful messages
      if (error instanceof DataForSEOApiError) {
        if (error.isRateLimit) {
          toast({
            title: "Rate Limit Exceeded",
            description: "DataForSEO API rate limit reached. Please wait a few minutes before trying again.",
            variant: "destructive",
            action: (
              <a 
                href="https://docs.lovable.dev/tips-tricks/troubleshooting#dataforseo" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline text-sm"
              >
                Learn more
              </a>
            ),
          });
        } else if (error.isCreditsExhausted) {
          toast({
            title: "API Credits Exhausted",
            description: "DataForSEO API credits have been exhausted. Please add credits to your DataForSEO account.",
            variant: "destructive",
            action: (
              <a 
                href="https://docs.lovable.dev/tips-tricks/troubleshooting#dataforseo" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline text-sm"
              >
                Learn more
              </a>
            ),
          });
        } else {
          toast({
            title: "API Error",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        let errorMessage = error?.message || "Unknown error.";
        if (errorMessage.toLowerCase().includes('edge function returned a non-2xx')) {
          errorMessage = "The analyzer returned a non‑success status. Please try again or contact support.";
        } else if (errorMessage.toLowerCase().includes('timeout')) {
          errorMessage = "The request timed out. Please retry in a moment.";
        } else if (errorMessage.toLowerCase().includes('network')) {
          errorMessage = "Network error. Please check your connection and try again.";
        }
        toast({ title: "Analysis failed", description: errorMessage, variant: "destructive" });
      }
    } finally {
      setLoading(false);
      setAnalyzing(false);
    }
  };

  const generateAIInsights = async (data?: AnalysisData) => {
    const dataToAnalyze = data || analysisData;
    if (!dataToAnalyze) return;

    setGeneratingInsights(true);

    try {
      const { data: insightsData, error } = await supabase.functions.invoke('generate-ai-insights', {
        body: { 
          analysisData: dataToAnalyze,
          competitorDomain 
        }
      });

      if (error) throw error;

      setAiInsights(insightsData.report);
      
      toast({
        title: "AI Insights Generated",
        description: "Strategic recommendations are ready"
      });

    } catch (error: any) {
      console.error('AI insights error:', error);
      toast({
        title: "AI Insights failed",
        description: error.message || "Failed to generate AI insights",
        variant: "destructive"
      });
    } finally {
      setGeneratingInsights(false);
    }
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedKeywords = analysisData?.keyword_gap_list.slice().sort((a, b) => {
    const aVal = a[sortField] as number;
    const bVal = b[sortField] as number;
    if (sortField === 'keyword') {
      return sortOrder === 'asc' ? a.keyword.localeCompare(b.keyword) : b.keyword.localeCompare(a.keyword);
    }
    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
  }) || [];

  const handleExportCSV = () => {
    if (!sortedKeywords.length) return;

    const rows: GapKeywordRow[] = sortedKeywords.map(kw => ({
      keyword: kw.keyword,
      search_volume: kw.search_volume,
      competitor_rank: kw.position,
    }));

    const meta: ExportMeta = {
      run_timestamp: new Date().toISOString(),
      your_domain: yourDomain,
      competitor_domain: competitorDomain,
      total_gaps: rows.length,
    };

    const csvContent = toCSV(rows, meta);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = normalizedFilename(yourDomain, competitorDomain, "csv");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "CSV Downloaded",
      description: `Exported ${rows.length} keywords`,
    });
  };

  const handleExportJSON = () => {
    if (!sortedKeywords.length) return;

    const rows: GapKeywordRow[] = sortedKeywords.map(kw => ({
      keyword: kw.keyword,
      search_volume: kw.search_volume,
      competitor_rank: kw.position,
    }));

    const meta: ExportMeta = {
      run_timestamp: new Date().toISOString(),
      your_domain: yourDomain,
      competitor_domain: competitorDomain,
      total_gaps: rows.length,
    };

    const jsonContent = toJSON(rows, meta);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = normalizedFilename(yourDomain, competitorDomain, "json");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "JSON Downloaded",
      description: `Exported ${rows.length} keywords`,
    });
  };

  const backlinksChartData = analysisData ? [
    {
      name: 'Your Domain',
      backlinks: analysisData.backlink_summary.your_domain.backlinks,
      referring_domains: analysisData.backlink_summary.your_domain.referring_domains
    },
    {
      name: 'Competitor',
      backlinks: analysisData.backlink_summary.competitor_domain.backlinks,
      referring_domains: analysisData.backlink_summary.competitor_domain.referring_domains
    }
  ] : [];

  const techScorePieData = analysisData ? [
    { name: 'Your Domain', value: analysisData.onpage_summary.your_domain.tech_score },
    { name: 'Competitor', value: analysisData.onpage_summary.competitor_domain.tech_score }
  ] : [];

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))'];

  const reportsLeft = profile ? Math.max(0, FREE_LIMIT - (profile.free_reports_used || 0)) : null;

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Competitor Analyzer</h1>
            <p className="text-muted-foreground">
              Compare your domain against a competitor to discover keyword gaps, backlink opportunities, and technical insights
            </p>
          </div>
          {reportsLeft !== null && (
            <Badge variant="secondary" className="text-sm">
              Free reports left: {reportsLeft}
            </Badge>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Domain Comparison</CardTitle>
            <CardDescription>Enter both domains to start the analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Your Domain</label>
                <Input
                  data-testid="your-domain-input"
                  placeholder="example.com"
                  value={yourDomain}
                  onChange={(e) => setYourDomain(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Competitor Domain</label>
                <Input
                  data-testid="competitor-domain-input"
                  placeholder="competitor.com"
                  value={competitorDomain}
                  onChange={(e) => setCompetitorDomain(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Location Code</label>
                <Input
                  type="number"
                  placeholder="2840"
                  value={locationCode}
                  onChange={(e) => setLocationCode(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground mt-1">DataForSEO location_code</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Language Code</label>
                <Input
                  type="text"
                  placeholder="en"
                  value={languageCode}
                  onChange={(e) => setLanguageCode(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground mt-1">DataForSEO language_code</p>
              </div>
            </div>
            
            <Button 
              data-testid="compare-button"
              onClick={handleCompare} 
              disabled={loading || !yourDomain || !competitorDomain}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {analyzing ? 'Analyzing...' : 'Loading...'}
                </>
              ) : (
                'Compare'
              )}
            </Button>
          </CardContent>
        </Card>

        {analysisData && (
          <>
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Keyword Gaps
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{analysisData.keyword_gap_list.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Keywords where competitor ranks
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Backlinks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs">Your Domain</span>
                      <span className="font-semibold">{analysisData.backlink_summary.your_domain.backlinks.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs">Competitor</span>
                      <span className="font-semibold">{analysisData.backlink_summary.competitor_domain.backlinks.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Technical Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs">Your Domain</span>
                      <Badge variant={analysisData.onpage_summary.your_domain.tech_score >= 75 ? "default" : "secondary"}>
                        {analysisData.onpage_summary.your_domain.tech_score}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs">Competitor</span>
                      <Badge variant={analysisData.onpage_summary.competitor_domain.tech_score >= 75 ? "default" : "secondary"}>
                        {analysisData.onpage_summary.competitor_domain.tech_score}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card data-testid="keyword-gap-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Keyword Gap Analysis</span>
                  <Badge variant="secondary">{sortedKeywords.length} keywords</Badge>
                </CardTitle>
                <CardDescription>Keywords where your competitor ranks but you don't</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-end gap-2 mb-4">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleExportCSV}
                    disabled={!sortedKeywords.length}
                    title="Exports your current result set"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download CSV
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExportJSON}
                    disabled={!sortedKeywords.length}
                    title="Exports your current result set"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download JSON
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="keyword-gap-table">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 cursor-pointer hover:bg-muted/50" onClick={() => handleSort('keyword')}>
                          Keyword {sortField === 'keyword' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="text-right py-3 px-2 cursor-pointer hover:bg-muted/50" onClick={() => handleSort('position')}>
                          Position {sortField === 'position' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="text-right py-3 px-2 cursor-pointer hover:bg-muted/50" onClick={() => handleSort('search_volume')}>
                          Volume {sortField === 'search_volume' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="text-right py-3 px-2 cursor-pointer hover:bg-muted/50" onClick={() => handleSort('cpc')}>
                          CPC {sortField === 'cpc' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedKeywords.map((kw, idx) => (
                        <tr key={idx} className="border-b hover:bg-muted/30">
                          <td className="py-2 px-2">{kw.keyword}</td>
                          <td className="text-right py-2 px-2">#{kw.position}</td>
                          <td className="text-right py-2 px-2">{kw.search_volume.toLocaleString()}</td>
                          <td className="text-right py-2 px-2">${kw.cpc.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {aiInsights && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    AI Strategic Insights
                    <Badge variant="secondary" className="ml-auto">Powered by AI</Badge>
                  </CardTitle>
                  <CardDescription>Strategic recommendations based on the analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-sm bg-muted/50 p-4 rounded-lg">{aiInsights}</pre>
                  </div>
                </CardContent>
              </Card>
            )}

            {!aiInsights && !generatingInsights && (
              <Card>
                <CardContent className="pt-6">
                  <Button 
                    onClick={() => generateAIInsights()} 
                    variant="outline"
                    className="w-full"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Regenerate AI Insights
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <Card data-testid="backlinks-chart-card">
                <CardHeader>
                  <CardTitle>Backlink Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={backlinksChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="backlinks" fill={COLORS[0]} />
                      <Bar dataKey="referring_domains" fill={COLORS[1]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Technical Score Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={techScorePieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {techScorePieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        <AlertDialog open={showLimitModal} onOpenChange={setShowLimitModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>You've reached your free limit</AlertDialogTitle>
              <AlertDialogDescription>
                Upgrade to continue running competitor analyses.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
              <AlertDialogAction onClick={() => navigate('/pricing')}>
                See Pricing
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </main>
  );
}
