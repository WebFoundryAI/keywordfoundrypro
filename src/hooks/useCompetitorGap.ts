import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CompetitorGapForm {
  myDomain: string;
  competitorDomain: string;
  market: string;
  freshness: 'live' | '24h' | '7d';
  includeRelated: boolean;
  includeSerp: boolean;
}

export interface GapReport {
  id: string;
  my_domain: string;
  competitor_domain: string;
  market: string;
  status: string;
  created_at: string;
}

export interface GapKeyword {
  id: string;
  keyword: string;
  volume: number;
  difficulty: number;
  cpc: number;
  their_pos: number | null;
  your_pos: number | null;
  delta: number | null;
  opportunity_score: number;
  kind: 'missing' | 'overlap';
  serp_features: any;
}

export interface ReportSummary {
  report: GapReport;
  kpis: {
    totalYourKeywords: number;
    totalTheirKeywords: number;
    overlapCount: number;
    missingCount: number;
  };
  scatterData: Array<{
    keyword: string;
    volume: number;
    difficulty: number;
    opportunityScore: number;
    kind: string;
  }>;
  pieData: Array<{
    name: string;
    value: number;
  }>;
}

export function useCompetitorGap() {
  const [isStarting, setIsStarting] = useState(false);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  /**
   * Start a new competitor gap analysis
   */
  const startComparison = async (form: CompetitorGapForm): Promise<string | null> => {
    setIsStarting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Please sign in to start a comparison');
        return null;
      }

      // Create the report record
      const { data: report, error: reportError } = await supabase
        .from('domain_gap_reports')
        .insert({
          user_id: user.id,
          my_domain: form.myDomain,
          competitor_domain: form.competitorDomain,
          market: form.market,
          freshness: form.freshness,
          include_related: form.includeRelated,
          include_serp: form.includeSerp,
          status: 'queued',
        })
        .select()
        .single();

      if (reportError) throw reportError;

      // Trigger the background processing
      const { error: functionError } = await supabase.functions.invoke(
        'competitor-gap-process',
        {
          body: { reportId: report.id },
        }
      );

      if (functionError) {
        console.error('Error starting background processing:', functionError);
        // Update status to failed
        await supabase
          .from('domain_gap_reports')
          .update({ status: 'failed' })
          .eq('id', report.id);
        
        throw functionError;
      }

      toast.success('Analysis started! This may take a few minutes.');
      return report.id;

    } catch (error: any) {
      console.error('Error starting comparison:', error);
      toast.error(error.message || 'Failed to start comparison');
      return null;
    } finally {
      setIsStarting(false);
    }
  };

  /**
   * Get report summary with KPIs and chart data
   */
  const getReport = async (reportId: string): Promise<ReportSummary | null> => {
    setIsLoadingReport(true);
    
    try {
      // Fetch report details
      const { data: report, error: reportError } = await supabase
        .from('domain_gap_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (reportError) throw reportError;

      // Fetch all keywords for this report
      const { data: keywords, error: keywordsError } = await supabase
        .from('gap_keywords')
        .select('*')
        .eq('report_id', reportId);

      if (keywordsError) throw keywordsError;

      // Calculate KPIs
      const missingKeywords = keywords?.filter(k => k.kind === 'missing') || [];
      const overlapKeywords = keywords?.filter(k => k.kind === 'overlap') || [];

      const kpis = {
        totalYourKeywords: overlapKeywords.length,
        totalTheirKeywords: missingKeywords.length + overlapKeywords.length,
        overlapCount: overlapKeywords.length,
        missingCount: missingKeywords.length,
      };

      // Prepare scatter data (top 200 by opportunity score)
      const scatterData = (keywords || [])
        .sort((a, b) => (b.opportunity_score || 0) - (a.opportunity_score || 0))
        .slice(0, 200)
        .map(k => ({
          keyword: k.keyword,
          volume: k.volume || 0,
          difficulty: k.difficulty || 0,
          opportunityScore: k.opportunity_score || 0,
          kind: k.kind,
        }));

      // Prepare pie data
      const pieData = [
        { name: 'Overlap', value: overlapKeywords.length },
        { name: 'Missing (Theirs Only)', value: missingKeywords.length },
        { name: 'Unique (Yours Only)', value: 0 }, // Could calculate if we had your-only keywords
      ];

      return {
        report,
        kpis,
        scatterData,
        pieData,
      };

    } catch (error: any) {
      console.error('Error fetching report:', error);
      toast.error(error.message || 'Failed to fetch report');
      return null;
    } finally {
      setIsLoadingReport(false);
    }
  };

  /**
   * Get paginated keywords for a report
   */
  const getKeywords = async (
    reportId: string,
    kind?: 'missing' | 'overlap',
    page = 0,
    pageSize = 50
  ): Promise<{ keywords: GapKeyword[]; total: number }> => {
    try {
      let query = supabase
        .from('gap_keywords')
        .select('*', { count: 'exact' })
        .eq('report_id', reportId);

      if (kind) {
        query = query.eq('kind', kind);
      }

      query = query
        .order('opportunity_score', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        keywords: (data as GapKeyword[]) || [],
        total: count || 0,
      };

    } catch (error: any) {
      console.error('Error fetching keywords:', error);
      toast.error(error.message || 'Failed to fetch keywords');
      return { keywords: [], total: 0 };
    }
  };

  /**
   * Get user's reports list
   */
  const getReportsList = async (): Promise<GapReport[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return [];

      const { data, error } = await supabase
        .from('domain_gap_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];

    } catch (error: any) {
      console.error('Error fetching reports list:', error);
      return [];
    }
  };

  return {
    startComparison,
    getReport,
    getKeywords,
    getReportsList,
    isStarting,
    isLoadingReport,
  };
}
