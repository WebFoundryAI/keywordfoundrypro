import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from "recharts";

interface OpportunityPoint {
  x: number; // difficulty
  y: number; // volume
  label: string; // keyword
  score: number; // opportunity score
}

interface OpportunityScatterProps {
  points: OpportunityPoint[];
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (active && payload && payload.length) {
    const data = payload[0].payload as OpportunityPoint;
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
        <p className="font-semibold text-popover-foreground mb-1">{data.label}</p>
        <p className="text-sm text-muted-foreground">Volume: {data.y.toLocaleString()}</p>
        <p className="text-sm text-muted-foreground">Difficulty: {data.x}</p>
        <p className="text-sm text-muted-foreground">Score: {data.score.toFixed(2)}</p>
      </div>
    );
  }
  return null;
}

export function OpportunityScatter({ points }: OpportunityScatterProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Opportunity Scatter</CardTitle>
        <CardDescription>Volume vs Difficulty - larger scores indicate better opportunities</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              type="number" 
              dataKey="x" 
              name="Difficulty" 
              className="text-muted-foreground"
              label={{ value: 'Difficulty', position: 'insideBottom', offset: -10 }}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              name="Volume" 
              className="text-muted-foreground"
              label={{ value: 'Volume', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3" }} />
            <Scatter 
              data={points} 
              fill="hsl(var(--primary))" 
              fillOpacity={0.6}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
