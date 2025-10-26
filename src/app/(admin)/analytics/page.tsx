'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { checkIsAdmin } from '@/lib/runbook/api';
import {
  getFunnelMetrics,
  getFunnelSummary,
  getFunnelCohorts,
} from '@/lib/analytics/queries';
import type {
  FunnelMetrics,
  FunnelSummary,
  FunnelCohort,
  SegmentFilter,
} from '@/lib/analytics/types';
import { FunnelChart } from '@/components/admin/analytics/FunnelChart';
import { MetricCards } from '@/components/admin/analytics/MetricCards';
import { SegmentationControls } from '@/components/admin/analytics/SegmentationControls';

export default function AnalyticsPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<FunnelMetrics | null>(null);
  const [summary, setSummary] = useState<FunnelSummary[]>([]);
  const [cohorts, setCohorts] = useState<FunnelCohort[]>([]);
  const [filter, setFilter] = useState<SegmentFilter>({});

  useEffect(() => {
    async function init() {
      const adminStatus = await checkIsAdmin();

      if (!adminStatus) {
        router.push('/');
        return;
      }

      setIsAdmin(true);
      await loadData(filter);
      setLoading(false);
    }

    init();
  }, [router]);

  async function loadData(newFilter: SegmentFilter) {
    const [metricsData, summaryData, cohortsData] = await Promise.all([
      getFunnelMetrics(newFilter),
      getFunnelSummary(),
      getFunnelCohorts(newFilter),
    ]);

    setMetrics(metricsData);
    setSummary(summaryData);
    setCohorts(cohortsData);
  }

  async function handleFilterChange(newFilter: SegmentFilter) {
    setFilter(newFilter);
    await loadData(newFilter);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading analytics...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Header */}
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Analytics Funnel
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              User conversion funnel: Signup → First Query → Export → Upgrade
            </p>
          </div>

          {/* Controls */}
          <div className="border-b border-gray-200 px-6 py-4">
            <SegmentationControls
              filter={filter}
              onFilterChange={handleFilterChange}
            />
          </div>

          {/* Metrics */}
          <div className="p-6 space-y-6">
            {metrics && <MetricCards metrics={metrics} />}

            {metrics && <FunnelChart metrics={metrics} />}

            {/* Summary by Plan */}
            {summary.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Conversion by Plan
                </h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Plan
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Users
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Query %
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Export %
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Upgrade %
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Overall %
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {summary.map((row) => (
                        <tr key={row.plan}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {row.plan}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {row.total_users}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {row.conversion_to_query.toFixed(1)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {row.conversion_query_to_export.toFixed(1)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {row.conversion_export_to_upgrade.toFixed(1)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {row.overall_conversion_to_paid.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Cohorts */}
            {cohorts.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Weekly Cohorts
                </h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Week
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Plan
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Signups
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Query %
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Export %
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Upgrade %
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {cohorts.map((cohort, index) => (
                        <tr key={`${cohort.signup_week}-${cohort.plan}-${index}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {new Date(cohort.signup_week).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {cohort.plan}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {cohort.total_signups}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {cohort.pct_first_query.toFixed(1)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {cohort.pct_first_export.toFixed(1)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {cohort.pct_upgrade.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
