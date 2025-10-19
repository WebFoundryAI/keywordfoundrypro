export type GapKeywordRow = {
  keyword: string;
  search_volume?: number;
  difficulty?: number;
  intent?: string;
  competitor_rank?: number;
  competitor_url?: string;
  est_traffic?: number;
};

export type ExportMeta = {
  run_timestamp: string;        // ISO string
  your_domain: string;
  competitor_domain: string;
  location?: string;
  device?: string;
  language?: string;
  total_gaps: number;
};

export function toCSV(rows: GapKeywordRow[], meta?: ExportMeta): string {
  const headers = [
    "keyword",
    "search_volume",
    "difficulty",
    "intent",
    "competitor_rank",
    "competitor_url",
    "est_traffic",
  ];
  const lines: string[] = [];
  if (meta) {
    lines.push(`# run_timestamp,${meta.run_timestamp}`);
    lines.push(`# your_domain,${meta.your_domain}`);
    lines.push(`# competitor_domain,${meta.competitor_domain}`);
    if (meta.location) lines.push(`# location,${meta.location}`);
    if (meta.device) lines.push(`# device,${meta.device}`);
    if (meta.language) lines.push(`# language,${meta.language}`);
    lines.push(`# total_gaps,${meta.total_gaps}`);
  }
  lines.push(headers.join(","));
  for (const r of rows) {
    const vals = [
      r.keyword ?? "",
      r.search_volume ?? "",
      r.difficulty ?? "",
      r.intent ?? "",
      r.competitor_rank ?? "",
      r.competitor_url ?? "",
      r.est_traffic ?? "",
    ].map(v => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    });
    lines.push(vals.join(","));
  }
  return lines.join("\n");
}

export function toJSON(rows: GapKeywordRow[], meta?: ExportMeta): string {
  return JSON.stringify({ meta, gap_keywords: rows }, null, 2);
}

export function normalizedFilename(
  yourDomain: string,
  competitorDomain: string,
  ext: "csv" | "json",
  d: Date = new Date()
): string {
  const norm = (s: string) =>
    s.replace(/^https?:\/\//, "").replace(/[^a-zA-Z0-9-]+/g, "-");
  const stamp = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}_${String(d.getHours()).padStart(2,"0")}${String(d.getMinutes()).padStart(2,"0")}`;
  return `kfp_competitor_gap_${norm(yourDomain)}_vs_${norm(competitorDomain)}_${stamp}.${ext}`;
}
