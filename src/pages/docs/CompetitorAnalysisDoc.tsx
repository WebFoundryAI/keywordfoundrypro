import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, Globe, Search, TrendingUp } from "lucide-react";

export default function CompetitorAnalysisDoc() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">Competitor Analysis Documentation</h1>
          <p className="text-muted-foreground">
            Understanding how we calculate and present competitor analysis data
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Sources
            </CardTitle>
            <CardDescription>
              Our competitor analysis combines multiple DataForSEO APIs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Search className="h-4 w-4" />
                Labs Ranked Keywords API
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                Fetches organic keywords where each domain currently ranks in Google search results.
                Called separately for your domain and the competitor domain.
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Location and language configurable (affects which Google index is queried)</li>
                <li>Limit parameter controls how many top-ranking keywords to fetch per domain</li>
                <li>Returns: keyword, rank position, search volume, CPC, and ranking URL</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Backlinks Summary API
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                Provides aggregate backlink metrics for each domain including total backlinks,
                referring domains, and referring IPs.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Globe className="h-4 w-4" />
                On-Page API (Optional)
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                Crawls up to 50 pages per domain to calculate technical SEO scores, internal/external
                links, and image counts. This data may be unavailable for some domains.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Keyword Gap Calculation</CardTitle>
            <CardDescription>
              How we identify opportunities where competitors rank but you don't
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Set Difference Logic</h3>
              <p className="text-sm text-muted-foreground mb-2">
                The keyword gap list is computed as:
              </p>
              <div className="bg-muted p-3 rounded-md text-sm font-mono mb-2">
                keyword_gap = competitor_keywords − your_keywords
              </div>
              <p className="text-sm text-muted-foreground">
                In other words, we show all keywords where the competitor has a ranking position
                but your domain does not appear in the results. This represents potential content
                opportunities.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Displayed Columns</h3>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li><strong>Keyword:</strong> The search term</li>
                <li><strong>Competitor Rank:</strong> The position where competitor appears (e.g., #3 means third result)</li>
                <li><strong>Search Volume:</strong> Monthly average searches for this keyword</li>
                <li><strong>Ranking URL:</strong> The specific competitor page that ranks for this keyword</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Important Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Location & Language Effects</h3>
              <p className="text-sm text-muted-foreground">
                Different location codes (e.g., 2840 for US, 2826 for UK) and language codes
                (e.g., "en", "es") query different Google indexes. Results will vary based on
                these settings to reflect regional search behavior.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Result Limits</h3>
              <p className="text-sm text-muted-foreground mb-2">
                The "Top N" limit parameter controls how many keywords are fetched per domain:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Default: 300 keywords per domain</li>
                <li>Range: 50–1000 keywords</li>
                <li>Higher limits provide more comprehensive data but use more API credits</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Caching Window</h3>
              <p className="text-sm text-muted-foreground mb-2">
                To avoid duplicate charges and improve performance:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Identical requests (same domains + location + language + limit) are cached for 24 hours</li>
                <li>Cached results are returned immediately with a <Badge variant="secondary" className="mx-1">cache_hit</Badge> indicator</li>
                <li>Partial results (with warnings) are not cached to ensure fresh data on retry</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Partial Data</h3>
              <p className="text-sm text-muted-foreground">
                If any API calls fail (network issues, rate limits, etc.), you'll see a warning
                notification. The analysis will show available data with blank sections for
                unavailable metrics rather than failing completely.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
