import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TrendingUp, Link as LinkIcon, Code, Sparkles, Lock } from "lucide-react";
import { logger } from '@/lib/logger';

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
    };
    competitor_domain: {
      backlinks: number;
      referring_domains: number;
    };
  };
  onpage_summary: {
    your_domain: {
      tech_score: number;
    };
    competitor_domain: {
      tech_score: number;
    };
  };
  is_demo: boolean;
  warnings?: string[];
}

export default function DemoCompetitorAnalyzer() {
  const [yourDomain, setYourDomain] = useState("");
  const [competitorDomain, setCompetitorDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
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
    setAnalysisData(null);
    setAiInsights(null);

    try {
      // Call demo endpoint (no auth required)
      const analyzeResponse = await fetch(
        `https://vhjffdzroebdkbmvcpgv.supabase.co/functions/v1/competitor-analyze-demo`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ yourDomain, competitorDomain })
        }
      );

      if (!analyzeResponse.ok) {
        throw new Error('Analysis failed');
      }

      const data = await analyzeResponse.json();
      setAnalysisData(data);

      // Generate AI insights (demo version)
      const insightsResponse = await fetch(
        `https://vhjffdzroebdkbmvcpgv.supabase.co/functions/v1/generate-ai-insights-demo`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            analysisData: data,
            competitorDomain 
          })
        }
      );

      if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json();
        setAiInsights(insightsData.report);
      }

      if (data?.warnings && data.warnings.length > 0) {
        toast({
          title: "Demo Analysis Complete (Partial Data)",
          description: "Some data unavailable. Sign up for full access!"
        });
      } else {
        toast({
          title: "Demo Analysis Complete",
          description: "Showing limited results. Sign up for the full report!"
        });
      }

    } catch (error: any) {
      logger.error('Analysis error:', error);
      toast({
        title: "Analysis failed",
        description: error.message || "Failed to analyze competitors",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">Competitor Analyzer Demo</h1>
          <p className="text-muted-foreground">
            Try our competitor analysis tool - see a preview with 5 sample keyword gaps
          </p>
        </div>

        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            This is a limited demo. Sign up for unlimited analyses with full keyword lists, detailed insights, and more.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Domain Comparison</CardTitle>
            <CardDescription>Enter both domains to start the demo analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="your-domain">Your Domain</Label>
                <Input
                  id="your-domain"
                  placeholder="example.com"
                  value={yourDomain}
                  onChange={(e) => setYourDomain(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="competitor-domain">Competitor Domain</Label>
                <Input
                  id="competitor-domain"
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
                  Analyzing...
                </>
              ) : (
                'Compare Domains (Demo)'
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
                    Keyword Gaps (Limited)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{analysisData.keyword_gap_list.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Showing 5 sample keywords
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Backlinks Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs">Your Domain</span>
                      <Badge variant="outline">
                        {analysisData.backlink_summary.your_domain.backlinks.toLocaleString()}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs">Competitor</span>
                      <Badge variant="outline">
                        {analysisData.backlink_summary.competitor_domain.backlinks.toLocaleString()}
                      </Badge>
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
                      <Badge>{analysisData.onpage_summary.your_domain.tech_score}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs">Competitor</span>
                      <Badge>{analysisData.onpage_summary.competitor_domain.tech_score}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Sample Keyword Gaps</span>
                  <Badge variant="secondary">Limited to 5</Badge>
                </CardTitle>
                <CardDescription>Sign up to see all keyword opportunities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">Keyword</th>
                        <th className="text-right py-3 px-2">Position</th>
                        <th className="text-right py-3 px-2">Volume</th>
                        <th className="text-right py-3 px-2">CPC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysisData.keyword_gap_list.map((kw, idx) => (
                        <tr key={idx} className="border-b">
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
                    AI Insights Preview
                    <Badge variant="secondary" className="ml-auto">Truncated</Badge>
                  </CardTitle>
                  <CardDescription>Sign up for complete strategic recommendations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-sm bg-muted/50 p-4 rounded-lg">{aiInsights}</pre>
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      ... Full report available with signup
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <h3 className="text-xl font-semibold">Want the Full Report?</h3>
                  <p className="text-muted-foreground">
                    Get unlimited keyword gaps, detailed backlink analysis, and complete AI insights
                  </p>
                  <Button onClick={() => navigate('/auth/sign-up')} size="lg" className="w-full md:w-auto">
                    Sign Up to See Full Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
