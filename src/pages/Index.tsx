import { useState } from "react";
import { KeywordResearchForm, KeywordFormData } from "@/components/KeywordResearchForm";
import { KeywordResultsTable, KeywordResult } from "@/components/KeywordResultsTable";
import { useToast } from "@/hooks/use-toast";
import heroImage from "@/assets/hero-image.jpg";

const Index = () => {
  const [results, setResults] = useState<KeywordResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Mock data for demonstration - in real implementation, this would call DataForSEO APIs
  const generateMockResults = (keyword: string, limit: number): KeywordResult[] => {
    const mockResults: KeywordResult[] = [];
    const intents = ['commercial', 'informational', 'navigational', 'transactional'];
    
    for (let i = 0; i < Math.min(limit, 50); i++) {
      mockResults.push({
        keyword: `${keyword} ${['best', 'top', 'reviews', 'guide', 'tips', 'how to', 'vs', 'cheap', 'online', 'near me'][i % 10]}`,
        searchVolume: Math.floor(Math.random() * 50000) + 1000,
        cpc: parseFloat((Math.random() * 5 + 0.1).toFixed(2)),
        intent: intents[Math.floor(Math.random() * intents.length)],
        difficulty: Math.floor(Math.random() * 100) + 1,
        suggestions: [],
        related: [],
        clusterId: `cluster_${Math.floor(i / 10) + 1}`,
        metricsSource: 'dataforseo_labs + keywords_data'
      });
    }
    
    return mockResults.sort((a, b) => b.searchVolume - a.searchVolume);
  };

  const handleFormSubmit = async (formData: KeywordFormData) => {
    setIsLoading(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In real implementation, this would call DataForSEO APIs
      const mockResults = generateMockResults(formData.keyword, formData.limit);
      setResults(mockResults);
      
      toast({
        title: "Analysis Complete",
        description: `Found ${mockResults.length} keywords for "${formData.keyword}"`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to analyze keywords. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = (format: 'csv' | 'json') => {
    if (results.length === 0) return;
    
    let content: string;
    let filename: string;
    let mimeType: string;
    
    if (format === 'csv') {
      const headers = ['Keyword', 'Search Volume', 'CPC', 'Intent', 'Difficulty'];
      const csvRows = [
        headers.join(','),
        ...results.map(r => [
          `"${r.keyword}"`,
          r.searchVolume,
          r.cpc,
          r.intent,
          r.difficulty
        ].join(','))
      ];
      content = csvRows.join('\n');
      filename = 'keyword-research.csv';
      mimeType = 'text/csv';
    } else {
      content = JSON.stringify(results, null, 2);
      filename = 'keyword-research.json';
      mimeType = 'application/json';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export Complete",
      description: `Downloaded ${results.length} keywords as ${format.toUpperCase()}`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-10"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-hero opacity-90" />
        <div className="relative container mx-auto px-4 py-20 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
            DataForSEO Keyword Research
          </h1>
          <p className="text-xl md:text-2xl text-foreground/80 mb-8 max-w-3xl mx-auto">
            Professional keyword analysis powered by DataForSEO APIs. 
            Get comprehensive insights including search volume, difficulty, CPC, and intent analysis.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 space-y-12">
        <KeywordResearchForm 
          onSubmit={handleFormSubmit}
          isLoading={isLoading}
        />
        
        <KeywordResultsTable 
          results={results}
          isLoading={isLoading}
          onExport={handleExport}
        />
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/30 py-8 mt-20">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground">
            Powered by DataForSEO APIs • Built with Lovable
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
