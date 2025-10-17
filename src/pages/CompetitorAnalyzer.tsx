import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, Link as LinkIcon, Code, Sparkles, RefreshCw } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
}

export default function CompetitorAnalyzer() {
  const [yourDomain, setYourDomain] = useState("");
  const [competitorDomain, setCompetitorDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'keyword' | 'position' | 'search_volume' | 'cpc'>('search_volume');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleCompare = async () => {
    if (!yourDomain || !competitorDomain) {
      toast({
        title: "Missing Information",
        description: "Please enter both domains",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setAnalyzing(true);
    setAnalysisData(null);
    setAiInsights(null);

    try {
      const { data, error } = await supabase.functions.invoke('competitor-analyze', {
        body: { yourDomain, competitorDomain }
      });

      if (error) throw error;

      setAnalysisData(data);
      
      if (data.cached) {
        toast({
          title: "Loaded from cache",
          description: "Using cached analysis results (last 24 hours)"
        });
      } else {
        toast({
          title: "Analysis complete",
          description: "Competitor analysis successfully generated"
        });
      }

      // Auto-generate AI insights
      await generateAIInsights(data);

    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis failed",
        description: error.message || "Failed to analyze competitors",
        variant: "destructive"
      });
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

  return (
    <div className="min-h-screen bg-background">
      <Header user={null} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">Competitor Analyzer</h1>
            <p className="text-muted-foreground">
              Compare your domain against a competitor to discover keyword gaps, backlink opportunities, and technical insights
            </p>
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
                    placeholder="example.com"
                    value={yourDomain}
                    onChange={(e) => setYourDomain(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Competitor Domain</label>
                  <Input
                    placeholder="competitor.com"
                    value={competitorDomain}
                    onChange={(e) => setCompetitorDomain(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
              
              <Button 
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
                    <p className="text-xs text-muted-foreground mt-1">Keywords they rank for</p>
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
                    <div className="text-3xl font-bold">
                      {analysisData.backlink_summary.competitor_domain.backlinks.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      vs. {analysisData.backlink_summary.your_domain.backlinks.toLocaleString()} yours
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      Tech Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {analysisData.onpage_summary.competitor_domain.tech_score}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      vs. {analysisData.onpage_summary.your_domain.tech_score}% yours
                    </p>
                  </CardContent>
                </Card>
              </div>

              {aiInsights && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        AI Insights (Beta)
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateAIInsights()}
                        disabled={generatingInsights}
                      >
                        {generatingInsights ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        <span className="ml-2">Regenerate</span>
                      </Button>
                    </div>
                    <CardDescription>AI-powered strategic recommendations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                      {aiInsights}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                <Card>
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
                        <Bar dataKey="backlinks" fill="hsl(var(--primary))" />
                        <Bar dataKey="referring_domains" fill="hsl(var(--secondary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Technical Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={techScorePieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: ${entry.value}%`}
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

              <Card>
                <CardHeader>
                  <CardTitle>Keyword Gap Analysis</CardTitle>
                  <CardDescription>
                    Keywords your competitor ranks for that you don't (showing top 50)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th 
                            className="text-left p-3 cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort('keyword')}
                          >
                            Keyword {sortField === 'keyword' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </th>
                          <th 
                            className="text-left p-3 cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort('position')}
                          >
                            Position {sortField === 'position' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </th>
                          <th 
                            className="text-left p-3 cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort('search_volume')}
                          >
                            Volume {sortField === 'search_volume' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </th>
                          <th 
                            className="text-left p-3 cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort('cpc')}
                          >
                            CPC {sortField === 'cpc' && (sortOrder === 'asc' ? '↑' : '↓')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedKeywords.slice(0, 50).map((keyword, idx) => (
                          <tr key={idx} className="border-b hover:bg-muted/50">
                            <td className="p-3 font-medium">{keyword.keyword}</td>
                            <td className="p-3">
                              <Badge variant="secondary">{keyword.position}</Badge>
                            </td>
                            <td className="p-3">{keyword.search_volume.toLocaleString()}</td>
                            <td className="p-3">${keyword.cpc.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}