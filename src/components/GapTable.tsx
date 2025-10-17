import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, FileDown } from "lucide-react";

export type TableType = "missing" | "overlap";

export interface MissingKeywordRow {
  id: string;
  keyword: string;
  volume: number | null;
  difficulty: number | null;
  cpc: number | null;
  their_pos: number | null;
  your_pos: number | null;
  opportunity_score: number;
  serp_features: any;
}

export interface OverlapKeywordRow {
  id: string;
  keyword: string;
  your_pos: number | null;
  their_pos: number | null;
  delta: number | null;
  volume: number | null;
  cpc: number | null;
}

interface GapTableProps {
  type: TableType;
  data: (MissingKeywordRow | OverlapKeywordRow)[];
  loading?: boolean;
}

type SortKey = string;
type SortDirection = "asc" | "desc";

export function GapTable({ type, data, loading = false }: GapTableProps) {
  const [filterText, setFilterText] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Filter data
  const filteredData = useMemo(() => {
    if (!filterText) return data;
    const lower = filterText.toLowerCase();
    return data.filter((row) => {
      if ("keyword" in row) {
        return row.keyword.toLowerCase().includes(lower);
      }
      return false;
    });
  }, [data, filterText]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      const aVal = (a as any)[sortKey];
      const bVal = (b as any)[sortKey];
      
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc" 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      }
      
      return 0;
    });
  }, [filteredData, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  };

  const handleExportCSV = () => {
    if (sortedData.length === 0) return;

    const headers = type === "missing" 
      ? ["Keyword", "Volume", "Difficulty", "CPC", "Their Pos", "Your Pos", "Opportunity Score", "SERP Features"]
      : ["Keyword", "Your Pos", "Their Pos", "Delta", "Volume", "Traffic Value"];

    const rows = sortedData.map((row) => {
      if (type === "missing") {
        const r = row as MissingKeywordRow;
        return [
          r.keyword,
          r.volume || "",
          r.difficulty || "",
          r.cpc || "",
          r.their_pos || "",
          r.your_pos || "",
          r.opportunity_score.toFixed(2),
          r.serp_features ? JSON.stringify(r.serp_features) : "",
        ];
      } else {
        const r = row as OverlapKeywordRow;
        const trafficValue = (r.volume || 0) * (r.cpc || 0);
        return [
          r.keyword,
          r.your_pos || "",
          r.their_pos || "",
          r.delta || "",
          r.volume || "",
          trafficValue.toFixed(2),
        ];
      }
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gap-${type}-keywords.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortableHeader = ({ label, sortKey: key }: { label: string; sortKey: SortKey }) => (
    <TableHead>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8"
        onClick={() => handleSort(key)}
      >
        {label}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Filter keywords..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="max-w-sm"
        />
        <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={sortedData.length === 0}>
          <FileDown className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="border rounded-md max-h-[600px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10 border-b">
            {type === "missing" ? (
              <TableRow>
                <SortableHeader label="Keyword" sortKey="keyword" />
                <SortableHeader label="Volume" sortKey="volume" />
                <SortableHeader label="Difficulty" sortKey="difficulty" />
                <SortableHeader label="CPC" sortKey="cpc" />
                <SortableHeader label="Their Pos" sortKey="their_pos" />
                <SortableHeader label="Your Pos" sortKey="your_pos" />
                <SortableHeader label="Oppty Score" sortKey="opportunity_score" />
                <TableHead>SERP</TableHead>
              </TableRow>
            ) : (
              <TableRow>
                <SortableHeader label="Keyword" sortKey="keyword" />
                <SortableHeader label="Your Pos" sortKey="your_pos" />
                <SortableHeader label="Their Pos" sortKey="their_pos" />
                <SortableHeader label="Δ Rank" sortKey="delta" />
                <SortableHeader label="Volume" sortKey="volume" />
                <TableHead>Traffic Value</TableHead>
              </TableRow>
            )}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={type === "missing" ? 8 : 6} className="text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : sortedData.length > 0 ? (
              sortedData.map((row) => {
                if (type === "missing") {
                  const r = row as MissingKeywordRow;
                  const serpCount = r.serp_features ? Object.keys(r.serp_features).length : 0;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.keyword}</TableCell>
                      <TableCell>{r.volume?.toLocaleString() || "—"}</TableCell>
                      <TableCell>{r.difficulty || "—"}</TableCell>
                      <TableCell>{r.cpc ? `$${r.cpc.toFixed(2)}` : "—"}</TableCell>
                      <TableCell>{r.their_pos || "—"}</TableCell>
                      <TableCell>{r.your_pos || "—"}</TableCell>
                      <TableCell>{r.opportunity_score.toFixed(2)}</TableCell>
                      <TableCell>{serpCount > 0 ? `${serpCount} features` : "—"}</TableCell>
                    </TableRow>
                  );
                } else {
                  const r = row as OverlapKeywordRow;
                  const trafficValue = (r.volume || 0) * (r.cpc || 0);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.keyword}</TableCell>
                      <TableCell>{r.your_pos || "—"}</TableCell>
                      <TableCell>{r.their_pos || "—"}</TableCell>
                      <TableCell className={r.delta && r.delta > 0 ? "text-green-600" : "text-destructive"}>
                        {r.delta ? (r.delta > 0 ? `+${r.delta}` : r.delta) : "—"}
                      </TableCell>
                      <TableCell>{r.volume?.toLocaleString() || "—"}</TableCell>
                      <TableCell>{trafficValue > 0 ? `$${trafficValue.toFixed(2)}` : "—"}</TableCell>
                    </TableRow>
                  );
                }
              })
            ) : (
              <TableRow>
                <TableCell colSpan={type === "missing" ? 8 : 6} className="text-center text-muted-foreground">
                  No keywords found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
