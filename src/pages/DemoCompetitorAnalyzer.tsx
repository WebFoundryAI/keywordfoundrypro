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
...
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
