import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TrendingUp, Link as LinkIcon, Code, Sparkles, Lock } from "lucide-react";

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
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/competitor-analyze-demo`,
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
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-ai-insights-demo`,
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

      toast({
        title: "Demo Analysis Complete",
        description: "Showing limited results. Sign up for the full report!"
      });

    } catch (error: any) {
      console.error('Analysis error:', error);
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
    <div className="min-h-screen bg-background">
      <Header user={null} />
      
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
                  'Run Demo Analysis'
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
                      Keyword Gaps (Demo)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{analysisData.keyword_gap_list.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">Limited to 5 keywords</p>
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
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      AI Insights (Preview)
                    </CardTitle>
                    <CardDescription>Truncated to 500 characters - sign up for the full report</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap mb-4">
                      {aiInsights}
                    </div>
                    <Button onClick={() => navigate('/auth/sign-up')} className="w-full">
                      <Lock className="mr-2 h-4 w-4" />
                      Sign Up to See Full Insights
                    </Button>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Sample Keyword Gaps (Limited to 5)</CardTitle>
                  <CardDescription>
                    Keywords your competitor ranks for that you don't
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3">Keyword</th>
                          <th className="text-left p-3">Position</th>
                          <th className="text-left p-3">Volume</th>
                          <th className="text-left p-3">CPC</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysisData.keyword_gap_list.map((keyword, idx) => (
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

                  <div className="mt-6 p-4 bg-muted rounded-lg text-center">
                    <p className="text-muted-foreground mb-4">
                      Want to see hundreds of keyword opportunities?
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
    </div>
  );
}
