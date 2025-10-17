import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileDown, FileText } from "lucide-react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const CompetitorGap = () => {
  const [yourDomain, setYourDomain] = useState("keywordfoundrypro.com");
  const [competitorDomain, setCompetitorDomain] = useState("");
  const [market, setMarket] = useState("");
  const [freshness, setFreshness] = useState("");
  const [includeRelated, setIncludeRelated] = useState(false);
  const [pullSerpFeatures, setPullSerpFeatures] = useState(false);

  // Stub data for charts
  const scatterData = [
    { volume: 1000, difficulty: 30, name: "keyword 1" },
    { volume: 5000, difficulty: 50, name: "keyword 2" },
    { volume: 2000, difficulty: 20, name: "keyword 3" },
    { volume: 8000, difficulty: 70, name: "keyword 4" },
  ];

  const pieData = [
    { name: "Overlap", value: 150, color: "hsl(var(--primary))" },
    { name: "Your Only", value: 200, color: "hsl(var(--secondary))" },
    { name: "Their Only", value: 180, color: "hsl(var(--accent))" },
  ];

  const handleRunComparison = () => {
    console.log("Run comparison clicked", {
      yourDomain,
      competitorDomain,
      market,
      freshness,
      includeRelated,
      pullSerpFeatures,
    });
  };

  const handleGenerateReport = () => {
    console.log("Generate report clicked");
  };

  const handleDownloadCSV = () => {
    console.log("Download CSV clicked");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Competitor Gap Analysis</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleGenerateReport}>
              <FileText className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadCSV}>
              <FileDown className="w-4 h-4 mr-2" />
              Download CSV
            </Button>
          </div>
        </div>

        {/* Controls Card */}
        <Card>
          <CardHeader>
            <CardTitle>Comparison Settings</CardTitle>
            <CardDescription>Configure your competitor analysis parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="your-domain">Your Domain</Label>
                <Input
                  id="your-domain"
                  value={yourDomain}
                  onChange={(e) => setYourDomain(e.target.value)}
                  placeholder="example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="competitor-domain">Competitor Domain</Label>
                <Input
                  id="competitor-domain"
                  value={competitorDomain}
                  onChange={(e) => setCompetitorDomain(e.target.value)}
                  placeholder="competitor.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="market">Market</Label>
                <Select value={market} onValueChange={setMarket}>
                  <SelectTrigger id="market">
                    <SelectValue placeholder="Select market" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="us">United States</SelectItem>
                    <SelectItem value="uk">United Kingdom</SelectItem>
                    <SelectItem value="ca">Canada</SelectItem>
                    <SelectItem value="au">Australia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="freshness">Freshness</Label>
                <Select value={freshness} onValueChange={setFreshness}>
                  <SelectTrigger id="freshness">
                    <SelectValue placeholder="Select freshness" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7days">Last 7 days</SelectItem>
                    <SelectItem value="30days">Last 30 days</SelectItem>
                    <SelectItem value="90days">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-related"
                  checked={includeRelated}
                  onCheckedChange={(checked) => setIncludeRelated(checked as boolean)}
                />
                <Label htmlFor="include-related" className="cursor-pointer">
                  Include related keywords
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pull-serp"
                  checked={pullSerpFeatures}
                  onCheckedChange={(checked) => setPullSerpFeatures(checked as boolean)}
                />
                <Label htmlFor="pull-serp" className="cursor-pointer">
                  Pull SERP features
                </Label>
              </div>
            </div>
            <Button onClick={handleRunComparison} className="w-full md:w-auto">
              Run Comparison
            </Button>
          </CardContent>
        </Card>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Keywords (You)</CardDescription>
              <CardTitle className="text-3xl">2,450</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Keywords (Competitor)</CardDescription>
              <CardTitle className="text-3xl">3,120</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Overlap</CardDescription>
              <CardTitle className="text-3xl">1,580</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Missing (Their Only)</CardDescription>
              <CardTitle className="text-3xl text-destructive">1,540</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Opportunity Scatter</CardTitle>
              <CardDescription>Volume vs Difficulty</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="volume" name="Volume" />
                  <YAxis dataKey="difficulty" name="Difficulty" />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                  <Scatter data={scatterData} fill="hsl(var(--primary))" />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Overlap vs Unique</CardTitle>
              <CardDescription>Keyword distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Section */}
        <Card>
          <CardHeader>
            <CardTitle>Detailed Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="missing" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="missing">Missing Keywords</TabsTrigger>
                <TabsTrigger value="overlap">Overlap / Rank Delta</TabsTrigger>
                <TabsTrigger value="page-level">Page-Level Gaps</TabsTrigger>
              </TabsList>
              <TabsContent value="missing" className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input placeholder="Filter keywords..." className="max-w-sm" />
                  <Button variant="outline" size="sm">Filter</Button>
                </div>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Keyword</TableHead>
                        <TableHead>Volume</TableHead>
                        <TableHead>Difficulty</TableHead>
                        <TableHead>CPC</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>example keyword 1</TableCell>
                        <TableCell>5,200</TableCell>
                        <TableCell>45</TableCell>
                        <TableCell>$2.50</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>example keyword 2</TableCell>
                        <TableCell>3,100</TableCell>
                        <TableCell>38</TableCell>
                        <TableCell>$1.80</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              <TabsContent value="overlap" className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input placeholder="Filter keywords..." className="max-w-sm" />
                  <Button variant="outline" size="sm">Filter</Button>
                </div>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Keyword</TableHead>
                        <TableHead>Your Rank</TableHead>
                        <TableHead>Their Rank</TableHead>
                        <TableHead>Delta</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>shared keyword 1</TableCell>
                        <TableCell>12</TableCell>
                        <TableCell>8</TableCell>
                        <TableCell className="text-destructive">-4</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>shared keyword 2</TableCell>
                        <TableCell>5</TableCell>
                        <TableCell>9</TableCell>
                        <TableCell className="text-green-600">+4</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              <TabsContent value="page-level" className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input placeholder="Filter pages..." className="max-w-sm" />
                  <Button variant="outline" size="sm">Filter</Button>
                </div>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Page URL</TableHead>
                        <TableHead>Keywords</TableHead>
                        <TableHead>Avg Position</TableHead>
                        <TableHead>Traffic Est.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-mono text-sm">/page-1</TableCell>
                        <TableCell>42</TableCell>
                        <TableCell>8.5</TableCell>
                        <TableCell>2,150</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-mono text-sm">/page-2</TableCell>
                        <TableCell>28</TableCell>
                        <TableCell>12.3</TableCell>
                        <TableCell>890</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompetitorGap;
