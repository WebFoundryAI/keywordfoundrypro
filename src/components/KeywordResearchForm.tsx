import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Globe, MapPin, Zap, AlertCircle } from "lucide-react";

interface KeywordResearchFormProps {
  onSubmit: (data: KeywordFormData) => void;
  isLoading?: boolean;
}

export interface KeywordFormData {
  keyword: string;
  languageCode: string;
  locationCode: number;
  limit: number;
  includeSuggestions: boolean;
  includeRelated: boolean;
  includeSerp: boolean;
}

const LANGUAGE_OPTIONS = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" },
];

const LOCATION_OPTIONS = [
  { code: 2840, name: "United States" },
  { code: 2826, name: "United Kingdom" },
  { code: 2124, name: "Canada" },
  { code: 2036, name: "Australia" },
  { code: 2276, name: "Germany" },
  { code: 2250, name: "France" },
  { code: 2724, name: "Spain" },
  { code: 2380, name: "Italy" },
  { code: 2392, name: "Japan" },
  { code: 2156, name: "China" },
];

export const KeywordResearchForm = ({ onSubmit, isLoading }: KeywordResearchFormProps) => {
  // Load previous limit from localStorage if available
  const getPreviousLimit = () => {
    const stored = localStorage.getItem('lastSearchLimit');
    return stored ? parseInt(stored) : 100;
  };

  const [formData, setFormData] = useState<KeywordFormData>({
    keyword: "",
    languageCode: "en",
    locationCode: 2840,
    limit: getPreviousLimit(),
    includeSuggestions: true,
    includeRelated: true,
    includeSerp: false,
  });
  
  const [spellingSuggestion, setSpellingSuggestion] = useState<string>("");
  const [showSuggestion, setShowSuggestion] = useState(false);

  // Check for common misspellings and suggest corrections
  useEffect(() => {
    if (!formData.keyword.trim() || formData.keyword.length < 3) {
      setShowSuggestion(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        // Use Datamuse API for spelling suggestions (free, no API key needed)
        const response = await fetch(`https://api.datamuse.com/sug?s=${encodeURIComponent(formData.keyword)}&max=1`);
        const suggestions = await response.json();
        
        if (suggestions.length > 0 && suggestions[0].word.toLowerCase() !== formData.keyword.toLowerCase()) {
          setSpellingSuggestion(suggestions[0].word);
          setShowSuggestion(true);
        } else {
          setShowSuggestion(false);
        }
      } catch (error) {
        // Silently fail - spell check is optional
        setShowSuggestion(false);
      }
    }, 800); // Wait for user to stop typing

    return () => clearTimeout(timer);
  }, [formData.keyword]);

  const applySuggestion = () => {
    setFormData({ ...formData, keyword: spellingSuggestion });
    setShowSuggestion(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate keyword input
    const trimmedKeyword = formData.keyword.trim();
    if (!trimmedKeyword) {
      return;
    }
    
    if (trimmedKeyword.length < 2) {
      return;
    }
    
    if (trimmedKeyword.length > 200) {
      return;
    }
    
    // Clear previous results from all pages
    localStorage.removeItem('keywordResults');
    localStorage.removeItem('keywordAnalyzed');
    localStorage.removeItem('serpAnalysisResults');
    localStorage.removeItem('relatedKeywordsResults');
    
    // Store the limit for future searches
    localStorage.setItem('lastSearchLimit', formData.limit.toString());
    onSubmit(formData);
  };

  const estimatedCost = Math.ceil(formData.limit / 100) * 0.01;

  return (
    <Card className="w-full max-w-2xl mx-auto bg-gradient-card shadow-card border-border/50">
      <CardHeader className="text-center pb-6">
        <CardTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Keyword Research Tool
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Professional SEO analysis - Get comprehensive keyword insights
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="keyword" className="text-sm font-medium flex items-center gap-2">
              <Search className="w-4 h-4 text-primary" />
              Seed Keyword
            </Label>
            <Input
              id="keyword"
              type="text"
              placeholder="e.g., best running shoes"
              value={formData.keyword}
              onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
              className="bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-smooth"
              spellCheck={true}
              autoComplete="off"
              autoCorrect="on"
              required
              data-tour="keyword-input"
            />
            {showSuggestion && spellingSuggestion && (
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md border border-border/50 text-sm">
                <AlertCircle className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Did you mean:</span>
                <button
                  type="button"
                  onClick={applySuggestion}
                  className="font-medium text-primary hover:underline"
                >
                  {spellingSuggestion}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSuggestion(false)}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                >
                  Ignore
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-tour="language-select">
            <div className="space-y-2">
              <Label htmlFor="language" className="text-sm font-medium flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                Language
              </Label>
              <Select value={formData.languageCode} onValueChange={(value) => setFormData({ ...formData, languageCode: value })}>
                <SelectTrigger className="bg-background/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="text-sm font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Location
              </Label>
              <Select value={formData.locationCode.toString()} onValueChange={(value) => setFormData({ ...formData, locationCode: parseInt(value) })}>
                <SelectTrigger className="bg-background/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCATION_OPTIONS.map((location) => (
                    <SelectItem key={location.code} value={location.code.toString()}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="limit" className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Results Limit
            </Label>
            <Select value={formData.limit.toString()} onValueChange={(value) => setFormData({ ...formData, limit: parseInt(value) })}>
              <SelectTrigger className="bg-background/50 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50 keywords</SelectItem>
                <SelectItem value="100">100 keywords</SelectItem>
                <SelectItem value="250">250 keywords</SelectItem>
                <SelectItem value="500">500 keywords</SelectItem>
                <SelectItem value="1000">1000 keywords</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Estimated Cost:</span>
              <span className="text-primary font-bold">${estimatedCost.toFixed(2)}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Based on API usage pricing. Actual cost may vary.
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={!formData.keyword.trim() || isLoading}
            className="w-full bg-gradient-primary hover:shadow-button transition-smooth h-12 text-base font-semibold"
            data-tour="submit-button"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Analyzing Keywords...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Start Keyword Research
              </div>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};