import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { invokeWithAuth, DataForSEOApiError } from "@/lib/supabaseHelpers";
import { invokeFunction } from "@/lib/invoke";
import { Loader2, TrendingUp, Link as LinkIcon, Code, Sparkles, RefreshCw, Download, AlertCircle, X, Globe, MapPin, FileQuestion } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toCSV, toJSON, normalizedFilename, type GapKeywordRow, type ExportMeta } from "@/utils/exportHelpers";
import { logger } from '@/lib/logger';
import { trackCompetitorAnalysis, trackExport } from '@/lib/analytics';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { parseCompetitorInsights, hasInsightsData } from './CompetitorAnalyzer/insightsAdapter';
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
    competitor_rank: number;
    search_volume: number;
    competitor_url?: string | null;
  }>;
  your_keywords?: Array<{
    keyword: string;
    rank_absolute: number;
    search_volume: number;
    url?: string | null;
  }>;
  competitor_keywords?: Array<{
    keyword: string;
    rank_absolute: number;
    search_volume: number;
    url?: string | null;
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

/* 
 * EDGE FUNCTION SELF-TEST GUIDE
 * 
 * To test the generate-ai-insights Edge Function error handling, open browser console and run:
 * 
 * // Test 1: Valid small payload (should succeed with 200)
 * fetch(import.meta.env.VITE_SUPABASE_URL + '/functions/v1/generate-ai-insights', {
 *   method: 'POST',
 *   headers: {
 *     'Authorization': 'Bearer ' + (await supabase.auth.getSession()).data.session.access_token,
 *     'Content-Type': 'application/json',
 *     'x-kfp-request-id': crypto.randomUUID()
 *   },
 *   body: JSON.stringify({
 *     analysisData: { keyword_gap_list: [{ keyword: 'test', competitor_rank: 1, search_volume: 100 }] },
 *     competitorDomain: 'example.com'
 *   })
 * }).then(r => r.json()).then(console.log);
 * 
 * // Test 2: Invalid schema - missing analysisData (should return 422)
 * fetch(import.meta.env.VITE_SUPABASE_URL + '/functions/v1/generate-ai-insights', {
 *   method: 'POST',
 *   headers: {
 *     'Authorization': 'Bearer ' + (await supabase.auth.getSession()).data.session.access_token,
 *     'Content-Type': 'application/json'
 *   },
 *   body: JSON.stringify({ competitorDomain: 'example.com' })
 * }).then(r => r.json()).then(console.log);
 * 
 * // Test 3: Oversized payload - too many keywords (should return 413)
 * fetch(import.meta.env.VITE_SUPABASE_URL + '/functions/v1/generate-ai-insights', {
 *   method: 'POST',
 *   headers: {
 *     'Authorization': 'Bearer ' + (await supabase.auth.getSession()).data.session.access_token,
 *     'Content-Type': 'application/json'
 *   },
 *   body: JSON.stringify({
 *     analysisData: { 
 *       keyword_gap_list: Array(1001).fill({ keyword: 'test', competitor_rank: 1, search_volume: 100 })
 *     },
 *     competitorDomain: 'example.com'
 *   })
 * }).then(r => r.json()).then(console.log);
 * 
 * Expected results:
 * - Test 1: {report: "...", meta: {requestId, durationMs, timestamp}}
 * - Test 2: {error: "Missing or invalid analysisData object", code: "INVALID_INPUT", requestId}
 * - Test 3: {error: "Too many keywords...", code: "PAYLOAD_TOO_LARGE", limits: {...}, requestId}
 */

const LANGUAGE_OPTIONS = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" },
];

const LOCATION_OPTIONS = [
  { code: 2840, name: "United States" },
  { code: 2826, name: "United Kingdom" },
  { code: 2124, name: "Canada" },
  { code: 2036, name: "Australia" },
  { code: 2276, name: "Germany" },
  { code: 2250, name: "France" },
  { code: 2724, name: "Spain" },
  { code: 2380, name: "Italy" },
  { code: 2392, name: "Japan" },
  { code: 2156, name: "China" },
];

export default function CompetitorAnalyzer() {
  const [yourDomain, setYourDomain] = useState("");
  const [competitorDomain, setCompetitorDomain] = useState("");
  const [locationCode, setLocationCode] = useState<number>(() => {
    const stored = localStorage.getItem("kfp_loc_code");
    return stored ? parseInt(stored, 10) : 2840;
  });
  const [languageCode, setLanguageCode] = useState(() => localStorage.getItem("kfp_lang_code") || "en");
  const [limit, setLimit] = useState(() => localStorage.getItem("kfp_limit") || "300");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'keyword' | 'competitor_rank' | 'search_volume'>('search_volume');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [yourKeywordsSortField, setYourKeywordsSortField] = useState<'keyword' | 'rank_absolute' | 'search_volume'>('search_volume');
  const [yourKeywordsSortOrder, setYourKeywordsSortOrder] = useState<'asc' | 'desc'>('desc');
  const [competitorKeywordsSortField, setCompetitorKeywordsSortField] = useState<'keyword' | 'rank_absolute' | 'search_volume'>('search_volume');
  const [competitorKeywordsSortOrder, setCompetitorKeywordsSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [profile, setProfile] = useState<{ free_reports_used: number; free_reports_renewal_at: string | null } | null>(null);
  const [errorAlert, setErrorAlert] = useState<{ request_id: string; stage: string; message: string; warnings: string[] } | null>(null);
  const [diagnosticTest, setDiagnosticTest] = useState<{
    running: boolean;
    result: { ok: boolean; request_id: string; data?: { d4s_creds_present: boolean } } | null;
    error: { message: string } | null
  } | null>(null);
  const [aiInsightsError, setAiInsightsError] = useState<{
    request_id: string;
    status: number;
    statusText: string;
    responseBody: string;
    timestamp: string;
  } | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();

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

  const runDiagnosticTest = async () => {
    setDiagnosticTest({ running: true, result: null, error: null });

    try {
      const { data, error } = await supabase.functions.invoke('competitor-analyze', {
        body: { op: 'health' }
      });

      setDiagnosticTest({ running: false, result: data, error });
    } catch (err) {
      setDiagnosticTest({ running: false, result: null, error: { message: err instanceof Error ? err.message : 'Unknown error' } });
    }
  };

  const handleCompare = async () => {
    if (!yourDomain || !competitorDomain) {
      toast({ title: "Missing Information", description: "Please enter both domains", variant: "destructive" });
      return;
    }

    // Check authentication first
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setErrorAlert({
        request_id: 'auth-check',
        stage: 'auth',
        message: 'Please sign in to use the Competitor Analyzer. Click here to go to the sign in page.',
        warnings: []
      });
      return;
    }

    // Domain normalization to bare host
    const normalize = (v: string) => {
      try { const u = new URL(v.trim()); return u.hostname.replace(/^www\./, ''); }
      catch {
        return v.trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*/, '');
      }
    };
    
    // Save location/language/limit to localStorage
    localStorage.setItem("kfp_loc_code", locationCode.toString());
    localStorage.setItem("kfp_lang_code", languageCode);
    localStorage.setItem("kfp_limit", limit);
    
    const payload: any = { 
      yourDomain: normalize(yourDomain), 
      competitorDomain: normalize(competitorDomain),
      location_code: locationCode,
      language_code: languageCode,
      limit: parseInt(limit, 10)
    };

    // Pre-check local badge if available (skip for admins)
    if (!isAdmin && profile) {
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
    setErrorAlert(null);

    try {
      const data = await invokeWithAuth('competitor-analyze', payload);

      // Check for structured error response
      if (data && !data.ok) {
        setErrorAlert({
          request_id: data.request_id || 'unknown',
          stage: data.error?.stage || 'unknown',
          message: data.error?.message || 'An error occurred',
          warnings: data.warnings || []
        });
        
        // Still render partial data if available
        if (data.data) {
          setAnalysisData(data.data);
        }
        return;
      }

      // Handle legacy error codes for backward compatibility
      if (data?.code === 'LIMIT_EXCEEDED') {
        setShowLimitModal(true);
        return;
      }
      if (data?.code === 'PROFILE_MISSING') {
        toast({ title: "Profile issue", description: "Please sign out and back in, then retry.", variant: "destructive" });
        return;
      }

      // Extract data from the new structure if present
      const analysisResult = data?.data || data;
      setAnalysisData(analysisResult);
      
      // Track successful competitor analysis
      trackCompetitorAnalysis();

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

      if (analysisResult?.cached) {
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

      // AI insights disabled - payload too large for current implementation
      // await generateAIInsights(analysisResult);

    } catch (error: any) {
      // Enhanced error handling with better messages
      let errorMessage = error?.message || "Unknown error.";
      let errorTitle = "Network error";

      // Check for specific error patterns
      if (errorMessage.toLowerCase().includes('failed to send') ||
          errorMessage.toLowerCase().includes('edge function')) {
        errorTitle = "Edge Function Error";
        errorMessage = "Failed to connect to the competitor analyzer service. The Edge Function may not be deployed or is experiencing issues. Please contact support if this persists.";
      } else if (errorMessage.toLowerCase().includes('timeout')) {
        errorMessage = "The request timed out. This analysis takes 60-90 seconds. Please retry.";
      } else if (errorMessage.toLowerCase().includes('network')) {
        errorMessage = "Network error. Please check your internet connection and try again.";
      } else if (errorMessage.toLowerCase().includes('fetch')) {
        errorMessage = "Failed to connect to the server. Please check your connection and try again.";
      } else if (errorMessage.toLowerCase().includes('unauthorized') || errorMessage.toLowerCase().includes('auth')) {
        errorTitle = "Authentication Error";
        errorMessage = "Your session may have expired. Please sign out and sign in again.";
      }

      logger.error('Competitor Analysis Error:', {
        error: error,
        message: errorMessage,
        stack: error?.stack
      });

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        duration: 10000  // Show for 10 seconds
      });
    } finally {
      setLoading(false);
      setAnalyzing(false);
    }
  };

  const generateAIInsights = async (data?: AnalysisData) => {
    const dataToAnalyze = data || analysisData;
    if (!dataToAnalyze) return;

    // Generate request-id for correlation across client/server logs
    const requestId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    // Clear previous AI error state
    setAiInsightsError(null);
    setGeneratingInsights(true);

    // Log diagnostics: request payload size, parameters
    const payloadSize = JSON.stringify({ analysisData: dataToAnalyze, competitorDomain }).length;
    console.info('[AI-INSIGHTS-DIAGNOSTICS] Request initiated', {
      request_id: requestId,
      timestamp,
      payload_size_bytes: payloadSize,
      competitor_domain: competitorDomain,
      keyword_gaps_count: dataToAnalyze.keyword_gap_list?.length || 0,
      location_code: locationCode,
      language_code: languageCode,
      limit,
    });

    try {
      console.info('[AI-INSIGHTS-DIAGNOSTICS] Calling edge function', {
        request_id: requestId,
        function_name: 'generate-ai-insights',
      });

      // Use invokeFunction helper which includes Authorization header
      const insightsData = await invokeFunction('generate-ai-insights', { 
        analysisData: dataToAnalyze,
        competitorDomain,
        requestId
      });
      
      const error = null; // invokeFunction throws on error

      // Log response status
      console.info('[AI-INSIGHTS-DIAGNOSTICS] Response received', {
        request_id: requestId,
        has_error: !!error,
        has_data: !!insightsData,
      });

      if (error) {
        // Capture full error details for non-2xx responses
        const errorBody = typeof error === 'object' ? JSON.stringify(error, null, 2) : String(error);
        console.error('[AI-INSIGHTS-DIAGNOSTICS] Edge function error', {
          request_id: requestId,
          error_message: error.message || 'Unknown error',
          error_body: errorBody.substring(0, 512),
        });
        
        // Map error codes to user-friendly messages
        let userMessage = error.message || 'Failed to generate AI insights';
        if (insightsData?.code) {
          switch (insightsData.code) {
            case 'PAYLOAD_TOO_LARGE':
              userMessage = `Payload too large. Please reduce the number of keywords below ${insightsData.limits?.maxKeywords || 1000} and try again.`;
              break;
            case 'INVALID_INPUT':
              userMessage = 'Invalid analysis data format. Please run a new competitor analysis.';
              break;
            case 'UPSTREAM_TIMEOUT':
              userMessage = 'AI model request timed out. Please try again in a moment.';
              break;
            case 'RATE_LIMIT':
              userMessage = 'AI service rate limit reached. Please wait a moment and try again.';
              break;
            case 'CONFIG_MISSING':
              userMessage = 'Server configuration error. Please contact support.';
              break;
            case 'UPSTREAM_ERROR':
              userMessage = 'AI service temporarily unavailable. Please try again later.';
              break;
          }
        }
        
        // Set inline error state with helpful remediation
        setAiInsightsError({
          request_id: requestId,
          status: (error as any)?.status || insightsData?.code === 'PAYLOAD_TOO_LARGE' ? 413 : insightsData?.code === 'INVALID_INPUT' ? 422 : 500,
          statusText: insightsData?.code || 'Unknown',
          responseBody: userMessage,
          timestamp,
        });
        
        throw new Error(userMessage);
      }

      // Use adapter to normalize response and handle schema variations
      const normalized = parseCompetitorInsights(insightsData);
      
      console.info('[AI-INSIGHTS-DIAGNOSTICS] Normalized response', {
        request_id: requestId,
        has_data: hasInsightsData(normalized),
        report_length: normalized.report?.length || 0,
      });

      // Check if normalized response has an error
      if (!normalized.ok || normalized.error) {
        const errMsg = normalized.error?.message || 'Failed to generate AI insights';
        setAiInsightsError({
          request_id: normalized.meta?.requestId || requestId,
          status: normalized.error?.code === 'PAYLOAD_TOO_LARGE' ? 413 : 
                  normalized.error?.code === 'INVALID_INPUT' ? 422 : 500,
          statusText: normalized.error?.code || 'Unknown',
          responseBody: errMsg,
          timestamp,
        });
        throw new Error(errMsg);
      }

      // Set insights from normalized response
      setAiInsights(normalized.report || null);
      
      console.info('[AI-INSIGHTS-DIAGNOSTICS] Success', { request_id: requestId });
      
      toast({
        title: "AI Insights Generated",
        description: "Strategic recommendations are ready"
      });

    } catch (error: any) {
      logger.error('AI insights error:', error);
      
      // Only show toast if we haven't already set inline error
      if (!aiInsightsError) {
        toast({
          title: "AI Insights failed",
          description: error.message || "Failed to generate AI insights. Check console for details.",
          variant: "destructive"
        });
      }
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

  const sortedKeywords = analysisData?.keyword_gap_list?.slice().sort((a, b) => {
    if (sortField === 'keyword') {
      return sortOrder === 'asc' ? a.keyword.localeCompare(b.keyword) : b.keyword.localeCompare(a.keyword);
    }
    const aVal = (a[sortField] as number) ?? 0;
    const bVal = (b[sortField] as number) ?? 0;
    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
  }) || [];

  const handleYourKeywordsSort = (field: typeof yourKeywordsSortField) => {
    if (yourKeywordsSortField === field) {
      setYourKeywordsSortOrder(yourKeywordsSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setYourKeywordsSortField(field);
      setYourKeywordsSortOrder('desc');
    }
  };

  const sortedYourKeywords = analysisData?.your_keywords?.slice().sort((a, b) => {
    if (yourKeywordsSortField === 'keyword') {
      return yourKeywordsSortOrder === 'asc' ? a.keyword.localeCompare(b.keyword) : b.keyword.localeCompare(a.keyword);
    }
    const aVal = (a[yourKeywordsSortField] as number) ?? 0;
    const bVal = (b[yourKeywordsSortField] as number) ?? 0;
    return yourKeywordsSortOrder === 'asc' ? aVal - bVal : bVal - aVal;
  }) || [];

  const handleCompetitorKeywordsSort = (field: typeof competitorKeywordsSortField) => {
    if (competitorKeywordsSortField === field) {
      setCompetitorKeywordsSortOrder(competitorKeywordsSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setCompetitorKeywordsSortField(field);
      setCompetitorKeywordsSortOrder('desc');
    }
  };

  const sortedCompetitorKeywords = analysisData?.competitor_keywords?.slice().sort((a, b) => {
    if (competitorKeywordsSortField === 'keyword') {
      return competitorKeywordsSortOrder === 'asc' ? a.keyword.localeCompare(b.keyword) : b.keyword.localeCompare(a.keyword);
    }
    const aVal = (a[competitorKeywordsSortField] as number) ?? 0;
    const bVal = (b[competitorKeywordsSortField] as number) ?? 0;
    return competitorKeywordsSortOrder === 'asc' ? aVal - bVal : bVal - aVal;
  }) || [];

  const handleExportCSV = () => {
    if (!sortedKeywords.length) return;

    const rows: GapKeywordRow[] = sortedKeywords.map(kw => ({
      keyword: kw.keyword,
      search_volume: kw.search_volume,
      competitor_rank: kw.competitor_rank,
      competitor_url: kw.competitor_url || undefined,
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
    
    // Track CSV export
    trackExport('csv');

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
      competitor_rank: kw.competitor_rank,
      competitor_url: kw.competitor_url || undefined,
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
    
    // Track JSON export
    trackExport('json');

    toast({
      title: "JSON Downloaded",
      description: `Exported ${rows.length} keywords`,
    });
  };

  const handleExportYourKeywordsCSV = () => {
    if (!sortedYourKeywords.length) return;

    const rows = sortedYourKeywords.map(kw => ({
      keyword: kw.keyword,
      rank: kw.rank_absolute,
      search_volume: kw.search_volume,
      url: kw.url || '',
    }));

    const csvContent = [
      `# Your Domain: ${yourDomain}`,
      `# Total Keywords: ${rows.length}`,
      `# Generated: ${new Date().toISOString()}`,
      'keyword,rank,search_volume,url',
      ...rows.map(r => `"${r.keyword}",${r.rank},${r.search_volume},"${r.url}"`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kfp_your_keywords_${yourDomain.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    trackExport('csv');
    toast({ title: "CSV Downloaded", description: `Exported ${rows.length} your domain keywords` });
  };

  const handleExportCompetitorKeywordsCSV = () => {
    if (!sortedCompetitorKeywords.length) return;

    const rows = sortedCompetitorKeywords.map(kw => ({
      keyword: kw.keyword,
      rank: kw.rank_absolute,
      search_volume: kw.search_volume,
      url: kw.url || '',
    }));

    const csvContent = [
      `# Competitor Domain: ${competitorDomain}`,
      `# Total Keywords: ${rows.length}`,
      `# Generated: ${new Date().toISOString()}`,
      'keyword,rank,search_volume,url',
      ...rows.map(r => `"${r.keyword}",${r.rank},${r.search_volume},"${r.url}"`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kfp_competitor_keywords_${competitorDomain.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    trackExport('csv');
    toast({ title: "CSV Downloaded", description: `Exported ${rows.length} competitor keywords` });
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
            <p style={{ margin: '8px 0' }}>
              <a href="/docs/competitor-analysis" target="_self" rel="noopener" data-testid="docs-link">
                How we calculate this
              </a>
            </p>
          </div>
          {!isAdmin && reportsLeft !== null && (
            <Badge variant="secondary" className="text-sm">
              Free reports left: {reportsLeft}
            </Badge>
          )}
          {isAdmin && (
            <Badge variant="default" className="text-sm">
              Admin: Unlimited
            </Badge>
          )}
        </div>

        {/* Diagnostic Test Panel */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              🔧 Connection Diagnostic Tool
            </CardTitle>
            <CardDescription>
              Test if the Edge Function is deployed and DataForSEO credentials are configured
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={runDiagnosticTest}
              disabled={diagnosticTest?.running}
              variant="outline"
            >
              {diagnosticTest?.running ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Run Connection Test
                </>
              )}
            </Button>

            {diagnosticTest && !diagnosticTest.running && (
              <div className="space-y-3 p-4 bg-white rounded-md border">
                {diagnosticTest.error ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-red-600 font-semibold">
                      ❌ Edge Function NOT Deployed
                    </div>
                    <p className="text-sm text-gray-600">
                      <strong>Error:</strong> {diagnosticTest.error.message || 'Failed to connect to Edge Function'}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>What this means:</strong> The competitor-analyze Edge Function is not deployed to Supabase.
                    </p>
                    <p className="text-sm text-blue-600">
                      <strong>How to fix:</strong> Deploy the Edge Function via Loveable.dev or Supabase CLI.
                    </p>
                  </div>
                ) : diagnosticTest.result?.ok ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-600 font-semibold">
                      ✅ Edge Function Deployed
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        {diagnosticTest.result.data?.d4s_creds_present ? (
                          <>
                            <span className="text-green-600">✅</span>
                            <span>DataForSEO credentials are configured</span>
                          </>
                        ) : (
                          <>
                            <span className="text-red-600">❌</span>
                            <span className="text-red-600">DataForSEO credentials are MISSING</span>
                          </>
                        )}
                      </div>
                      {!diagnosticTest.result.data?.d4s_creds_present && (
                        <p className="text-sm text-blue-600 mt-2">
                          <strong>How to fix:</strong> Add DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD to Supabase Edge Function secrets.
                        </p>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Request ID: {diagnosticTest.result.request_id}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-yellow-600 font-semibold">
                      ⚠️ Unexpected Response
                    </div>
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                      {JSON.stringify(diagnosticTest.result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {errorAlert && (
          <Alert variant="destructive" className="relative">
            <AlertCircle className="h-4 w-4" />
            <button
              onClick={() => setErrorAlert(null)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
              aria-label="Dismiss alert"
            >
              <X className="h-4 w-4" />
            </button>
            <AlertTitle>Analysis Error</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <div>
                <strong>Stage:</strong> {errorAlert.stage}
              </div>
              <div>
                <strong>Message:</strong> {errorAlert.message}
              </div>
              {errorAlert.stage === 'auth' && (
                <Button 
                  onClick={() => navigate('/auth/sign-in')} 
                  variant="outline"
                  className="mt-2"
                >
                  Go to Sign In
                </Button>
              )}
              {errorAlert.stage !== 'auth' && (
                <div>
                  <strong>Request ID:</strong> <code className="text-xs">{errorAlert.request_id}</code>
                </div>
              )}
              {errorAlert.warnings.length > 0 && (
                <div>
                  <strong>Warnings:</strong>
                  <ul className="list-disc list-inside mt-1 text-sm">
                    {errorAlert.warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

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
              <div className="space-y-2">
                <Label htmlFor="location" className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Location
                </Label>
                <Select 
                  value={locationCode.toString()} 
                  onValueChange={(value) => setLocationCode(parseInt(value, 10))}
                  disabled={loading}
                >
                  <SelectTrigger data-testid="location-code-input" className="bg-background/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {LOCATION_OPTIONS.map((location) => (
                      <SelectItem key={location.code} value={location.code.toString()}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="language" className="text-sm font-medium flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  Language
                </Label>
                <Select 
                  value={languageCode} 
                  onValueChange={setLanguageCode}
                  disabled={loading}
                >
                  <SelectTrigger data-testid="language-code-input" className="bg-background/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">Top N Keywords</label>
              <Input
                data-testid="limit-input"
                type="number"
                min="50"
                max="1000"
                step="50"
                placeholder="300"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground mt-1">Limits per domain; higher N uses more credits.</p>
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
            <div className="grid md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Your Keywords
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{analysisData.your_keywords?.length || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total ranking keywords
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Competitor Keywords
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{analysisData.competitor_keywords?.length || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total ranking keywords
                  </p>
                </CardContent>
              </Card>

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
                <CardDescription className="flex items-center gap-2">
                  Keywords where your competitor ranks but you don't
                  <a 
                    href="/docs/competitor-analysis" 
                    target="_blank"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  >
                    How we calculate this
                  </a>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sortedKeywords.length > 0 ? (
                  <>
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
                            <th className="text-right py-3 px-2 cursor-pointer hover:bg-muted/50" onClick={() => handleSort('competitor_rank')}>
                              Competitor Rank {sortField === 'competitor_rank' && (sortOrder === 'asc' ? '↑' : '↓')}
                            </th>
                            <th className="text-right py-3 px-2 cursor-pointer hover:bg-muted/50" onClick={() => handleSort('search_volume')}>
                              Search Volume {sortField === 'search_volume' && (sortOrder === 'asc' ? '↑' : '↓')}
                            </th>
                            <th className="text-left py-3 px-2">
                              Ranking URL
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedKeywords.map((kw, idx) => (
                            <tr key={idx} className="border-b hover:bg-muted/30">
                              <td className="py-2 px-2">{kw.keyword}</td>
                              <td className="text-right py-2 px-2">#{kw.competitor_rank}</td>
                              <td className="text-right py-2 px-2">{kw.search_volume.toLocaleString()}</td>
                              <td className="py-2 px-2">
                                {kw.competitor_url ? (
                                  <a 
                                    href={kw.competitor_url} 
                                    target="_blank" 
                                    rel="nofollow noopener noreferrer"
                                    className="text-primary hover:underline text-xs truncate max-w-xs block"
                                  >
                                    {kw.competitor_url}
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileQuestion className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Keyword Gaps Found</h3>
                    <p className="text-sm text-muted-foreground max-w-md mb-4">
                      The competitor analysis returned no keyword gaps. This could mean:
                    </p>
                    <ul className="text-sm text-muted-foreground text-left list-disc list-inside space-y-1 mb-4">
                      <li>Your domain ranks for all keywords the competitor ranks for</li>
                      <li>The competitor has no ranking keywords in the specified market</li>
                      <li>Try adjusting the location or language settings</li>
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Keywords Your Domain Ranks For</span>
                  <Badge variant="secondary">{sortedYourKeywords.length} keywords</Badge>
                </CardTitle>
                <CardDescription>
                  All ranking keywords for {yourDomain}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sortedYourKeywords.length > 0 ? (
                  <>
                    <div className="flex justify-end gap-2 mb-4">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleExportYourKeywordsCSV}
                        disabled={!sortedYourKeywords.length}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download CSV
                      </Button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-2 cursor-pointer hover:bg-muted/50" onClick={() => handleYourKeywordsSort('keyword')}>
                              Keyword {yourKeywordsSortField === 'keyword' && (yourKeywordsSortOrder === 'asc' ? '↑' : '↓')}
                            </th>
                            <th className="text-right py-3 px-2 cursor-pointer hover:bg-muted/50" onClick={() => handleYourKeywordsSort('rank_absolute')}>
                              Your Rank {yourKeywordsSortField === 'rank_absolute' && (yourKeywordsSortOrder === 'asc' ? '↑' : '↓')}
                            </th>
                            <th className="text-right py-3 px-2 cursor-pointer hover:bg-muted/50" onClick={() => handleYourKeywordsSort('search_volume')}>
                              Search Volume {yourKeywordsSortField === 'search_volume' && (yourKeywordsSortOrder === 'asc' ? '↑' : '↓')}
                            </th>
                            <th className="text-left py-3 px-2">
                              Ranking URL
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedYourKeywords.map((kw, idx) => (
                            <tr key={idx} className="border-b hover:bg-muted/30">
                              <td className="py-2 px-2">{kw.keyword}</td>
                              <td className="text-right py-2 px-2">#{kw.rank_absolute}</td>
                              <td className="text-right py-2 px-2">{kw.search_volume.toLocaleString()}</td>
                              <td className="py-2 px-2">
                                {kw.url ? (
                                  <a 
                                    href={kw.url} 
                                    target="_blank" 
                                    rel="nofollow noopener noreferrer"
                                    className="text-primary hover:underline text-xs truncate max-w-xs block"
                                  >
                                    {kw.url}
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileQuestion className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Keywords Found</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      No ranking keywords found for your domain in the specified location and language.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Keywords Competitor Domain Ranks For</span>
                  <Badge variant="secondary">{sortedCompetitorKeywords.length} keywords</Badge>
                </CardTitle>
                <CardDescription>
                  All ranking keywords for {competitorDomain}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sortedCompetitorKeywords.length > 0 ? (
                  <>
                    <div className="flex justify-end gap-2 mb-4">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleExportCompetitorKeywordsCSV}
                        disabled={!sortedCompetitorKeywords.length}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download CSV
                      </Button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-2 cursor-pointer hover:bg-muted/50" onClick={() => handleCompetitorKeywordsSort('keyword')}>
                              Keyword {competitorKeywordsSortField === 'keyword' && (competitorKeywordsSortOrder === 'asc' ? '↑' : '↓')}
                            </th>
                            <th className="text-right py-3 px-2 cursor-pointer hover:bg-muted/50" onClick={() => handleCompetitorKeywordsSort('rank_absolute')}>
                              Competitor Rank {competitorKeywordsSortField === 'rank_absolute' && (competitorKeywordsSortOrder === 'asc' ? '↑' : '↓')}
                            </th>
                            <th className="text-right py-3 px-2 cursor-pointer hover:bg-muted/50" onClick={() => handleCompetitorKeywordsSort('search_volume')}>
                              Search Volume {competitorKeywordsSortField === 'search_volume' && (competitorKeywordsSortOrder === 'asc' ? '↑' : '↓')}
                            </th>
                            <th className="text-left py-3 px-2">
                              Ranking URL
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedCompetitorKeywords.map((kw, idx) => (
                            <tr key={idx} className="border-b hover:bg-muted/30">
                              <td className="py-2 px-2">{kw.keyword}</td>
                              <td className="text-right py-2 px-2">#{kw.rank_absolute}</td>
                              <td className="text-right py-2 px-2">{kw.search_volume.toLocaleString()}</td>
                              <td className="py-2 px-2">
                                {kw.url ? (
                                  <a 
                                    href={kw.url} 
                                    target="_blank" 
                                    rel="nofollow noopener noreferrer"
                                    className="text-primary hover:underline text-xs truncate max-w-xs block"
                                  >
                                    {kw.url}
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileQuestion className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Keywords Found</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      No ranking keywords found for the competitor domain in the specified location and language.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {aiInsightsError && (
              <Alert variant="destructive" className="relative">
                <AlertCircle className="h-4 w-4" />
                <button
                  onClick={() => setAiInsightsError(null)}
                  className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
                  aria-label="Dismiss alert"
                >
                  <X className="h-4 w-4" />
                </button>
                <AlertTitle>AI Insights Generation Failed</AlertTitle>
                <AlertDescription className="mt-2 space-y-2">
                  <div>
                    <strong>Status Code:</strong> {aiInsightsError.status || 'Unknown'}
                  </div>
                  <div>
                    <strong>Status Text:</strong> {aiInsightsError.statusText || 'Unknown'}
                  </div>
                  <div>
                    <strong>Request ID:</strong> <code className="text-xs bg-background/50 px-1 py-0.5 rounded">{aiInsightsError.request_id}</code>
                  </div>
                  <div>
                    <strong>Timestamp:</strong> {aiInsightsError.timestamp}
                  </div>
                  {aiInsightsError.responseBody && (
                    <div>
                      <strong>Response (first 256 chars):</strong>
                      <pre className="text-xs bg-background/50 p-2 rounded mt-1 overflow-x-auto">{aiInsightsError.responseBody}</pre>
                    </div>
                  )}
                  <div className="pt-2">
                    <Button 
                      onClick={() => generateAIInsights()} 
                      variant="outline"
                      size="sm"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Retry
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    <strong>Debugging:</strong> Check browser console for detailed logs (search for request_id: {aiInsightsError.request_id}). 
                    Server-side logs available in Supabase Dashboard → Edge Functions → generate-ai-insights → Logs (filter by x-kfp-request-id header).
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {aiInsights && !aiInsightsError && (
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
                  {aiInsights.trim() ? (
                    <div className="prose prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap text-sm bg-muted/50 p-4 rounded-lg">{aiInsights}</pre>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <FileQuestion className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Insights Generated</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        The AI returned an empty response. Try regenerating the insights.
                      </p>
                      <Button onClick={() => generateAIInsights()} variant="outline" size="sm">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Regenerate Insights
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!aiInsights && !generatingInsights && !aiInsightsError && (
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
