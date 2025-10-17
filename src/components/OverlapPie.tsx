import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, Legend, ResponsiveContainer, Tooltip, TooltipProps } from "recharts";

interface PieSlice {
  name: string;
  value: number;
}

interface OverlapPieProps {
  overlapCount: number;
  yourOnlyCount: number;
  theirOnlyCount: number;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--accent))",
];

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
        <p className="font-semibold text-popover-foreground">{data.name}</p>
        <p className="text-sm text-muted-foreground">{data.value?.toLocaleString()} keywords</p>
      </div>
    );
  }
  return null;
}

export function OverlapPie({ overlapCount, yourOnlyCount, theirOnlyCount }: OverlapPieProps) {
  const data: PieSlice[] = [
    { name: "Overlap", value: overlapCount },
    { name: "Your Only", value: yourOnlyCount },
    { name: "Their Only", value: theirOnlyCount },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Overlap vs Unique</CardTitle>
        <CardDescription>Keyword distribution across domains</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value, percent }) => 
                `${name}: ${value.toLocaleString()} (${(percent * 100).toFixed(0)}%)`
              }
              outerRadius={80}
              dataKey="value"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
