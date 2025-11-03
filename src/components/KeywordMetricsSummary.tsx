import { Search, TrendingUp, Target, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber, formatCurrency } from "@/lib/utils";

interface KeywordMetricsSummaryProps {
  keyword: string;
  totalKeywords: number;
  totalVolume: number | null;
  avgDifficulty: number | null;
  avgCpc: number | null;
  locationCode?: number;
}

export const KeywordMetricsSummary = ({
  keyword,
  totalKeywords,
  totalVolume,
  avgDifficulty,
  avgCpc,
  locationCode = 2840
}: KeywordMetricsSummaryProps) => {
  const metrics = [
    {
      label: "Total Keywords",
      value: totalKeywords.toString(),
      icon: Search,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      label: "Total Volume",
      value: formatNumber(totalVolume),
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/10"
    },
    {
      label: "Avg Difficulty",
      value: avgDifficulty === null || avgDifficulty === undefined ? "—" : Math.round(avgDifficulty).toString(),
      icon: Target,
      color: "text-warning",
      bgColor: "bg-warning/10"
    },
    {
      label: "Avg CPC",
      value: formatCurrency(avgCpc, locationCode),
      icon: DollarSign,
      color: "text-accent",
      bgColor: "bg-accent/10"
    }
  ];

  return (
    <div id="metrics-summary" className="w-full">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          Keyword Analysis for "{keyword}"
        </h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index} className="bg-card border-border/50 hover:shadow-md transition-all">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${metric.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${metric.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground font-medium">
                      {metric.label}
                    </p>
                    <p className="text-xl font-bold text-foreground">
                      {metric.value}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};