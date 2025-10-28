import type { FunnelMetrics } from '@/lib/analytics/types';

interface MetricCardsProps {
  metrics: FunnelMetrics;
}

export function MetricCards({ metrics }: MetricCardsProps) {
  const cards = [
    {
      label: 'Total Signups',
      value: metrics.total_users.toLocaleString(),
      color: 'bg-blue-50 text-blue-900',
      borderColor: 'border-blue-200',
    },
    {
      label: 'First Query Rate',
      value: `${metrics.conversion_rates.signup_to_query.toFixed(1)}%`,
      color: 'bg-green-50 text-green-900',
      borderColor: 'border-green-200',
    },
    {
      label: 'Export Rate',
      value: `${metrics.conversion_rates.query_to_export.toFixed(1)}%`,
      color: 'bg-yellow-50 text-yellow-900',
      borderColor: 'border-yellow-200',
    },
    {
      label: 'Upgrade Rate',
      value: `${metrics.conversion_rates.export_to_upgrade.toFixed(1)}%`,
      color: 'bg-purple-50 text-purple-900',
      borderColor: 'border-purple-200',
    },
    {
      label: 'Overall Conversion',
      value: `${metrics.conversion_rates.signup_to_upgrade.toFixed(1)}%`,
      color: 'bg-indigo-50 text-indigo-900',
      borderColor: 'border-indigo-200',
    },
    {
      label: 'Median Time to Query',
      value:
        metrics.time_to_convert.median_hours_to_query !== null
          ? `${metrics.time_to_convert.median_hours_to_query.toFixed(1)}h`
          : 'N/A',
      color: 'bg-gray-50 text-gray-900',
      borderColor: 'border-gray-200',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-lg border p-4 ${card.color} ${card.borderColor}`}
        >
          <div className="text-2xl font-bold">{card.value}</div>
          <div className="text-sm mt-1 opacity-80">{card.label}</div>
        </div>
      ))}
    </div>
  );
}
