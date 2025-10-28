import type { FunnelMetrics } from '@/lib/analytics/types';

interface FunnelChartProps {
  metrics: FunnelMetrics;
}

export function FunnelChart({ metrics }: FunnelChartProps) {
  const maxUsers = metrics.stages[0]?.users || 1;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        Conversion Funnel
      </h2>

      <div className="space-y-4">
        {metrics.stages.map((stage, index) => {
          const widthPercent = (stage.users / maxUsers) * 100;
          const conversionColor =
            stage.conversion_from_previous === null
              ? 'bg-blue-500'
              : stage.conversion_from_previous >= 50
                ? 'bg-green-500'
                : stage.conversion_from_previous >= 25
                  ? 'bg-yellow-500'
                  : 'bg-red-500';

          return (
            <div key={stage.stage}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {stage.stage.replace('_', ' ')}
                  </span>
                  <span className="text-sm text-gray-600">
                    {stage.users.toLocaleString()} users
                  </span>
                  {stage.conversion_from_previous !== null && (
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${
                        stage.conversion_from_previous >= 50
                          ? 'bg-green-100 text-green-800'
                          : stage.conversion_from_previous >= 25
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {stage.conversion_from_previous.toFixed(1)}% conversion
                    </span>
                  )}
                </div>
                {stage.avg_time_from_signup_hours !== null && (
                  <span className="text-xs text-gray-500">
                    Median: {stage.avg_time_from_signup_hours.toFixed(1)}h
                  </span>
                )}
              </div>

              <div className="relative h-12 bg-gray-100 rounded-lg overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 ${conversionColor} flex items-center justify-center text-white font-medium text-sm transition-all duration-500`}
                  style={{ width: `${widthPercent}%` }}
                >
                  {widthPercent > 10 && (
                    <span>{stage.users.toLocaleString()}</span>
                  )}
                </div>
              </div>

              {index < metrics.stages.length - 1 && (
                <div className="flex justify-center my-2">
                  <svg
                    className="w-6 h-6 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Overall Conversion Rate:</span>
            <span className="ml-2 font-medium text-gray-900">
              {metrics.conversion_rates.signup_to_upgrade.toFixed(2)}%
            </span>
          </div>
          <div>
            <span className="text-gray-600">Total Users:</span>
            <span className="ml-2 font-medium text-gray-900">
              {metrics.total_users.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
