import { Card, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";

interface GapKpiProps {
  totalYourKeywords: number;
  totalTheirKeywords: number;
  overlapCount: number;
  missingCount: number;
}

export function GapKpi({
  totalYourKeywords,
  totalTheirKeywords,
  overlapCount,
  missingCount,
}: GapKpiProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardDescription>Total Keywords (You)</CardDescription>
          <CardTitle className="text-3xl">
            {totalYourKeywords.toLocaleString()}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardDescription>Total Keywords (Competitor)</CardDescription>
          <CardTitle className="text-3xl">
            {totalTheirKeywords.toLocaleString()}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardDescription>Overlap</CardDescription>
          <CardTitle className="text-3xl">{overlapCount.toLocaleString()}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardDescription>Missing (Their Only)</CardDescription>
          <CardTitle className="text-3xl text-destructive">
            {missingCount.toLocaleString()}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
