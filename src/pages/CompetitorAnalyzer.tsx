import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
...
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
  );
}