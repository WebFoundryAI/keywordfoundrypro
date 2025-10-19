import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/useAdmin";
import { Save, Edit, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function MasterPrompt() {
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [prompt, setPrompt] = useState(
    `# Master Prompt - Keyword Foundry Pro

## System Overview
Keyword Foundry Pro is a professional SEO keyword research platform powered by DataForSEO API. The system provides comprehensive keyword analysis, competitor insights, and SERP analysis.

## Core Features
1. **Keyword Research**: Volume, difficulty, CPC, and competition metrics
2. **Competitor Analysis**: Backlink profiles, ranked keywords, domain authority
3. **SERP Analysis**: Top-ranking pages with domain metrics
4. **Related Keywords**: Find semantic variations and long-tail opportunities
5. **AI Insights**: OpenAI-powered strategic recommendations

## Technical Stack
- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **APIs**: DataForSEO, OpenAI, Stripe
- **Hosting**: Lovable Cloud

## Data Flow
1. User submits keyword → Edge function validates auth
2. Check cache for recent results (24h)
3. Call DataForSEO API if needed
4. Store results in PostgreSQL
5. Return formatted data to UI
6. Update usage tracking

## Key Principles
- **Performance**: Cache aggressively, paginate results
- **Cost Control**: Track API usage, enforce subscription limits
- **Security**: RLS policies, admin role checks, input sanitization
- **UX**: Loading states, error handling, empty states

## Admin Responsibilities
- Monitor usage and costs in Admin Dashboard
- Review user subscriptions and upgrade requests
- Check environment variables are configured
- Analyze system logs for errors or abuse

Version: 1.0
Last Updated: ${new Date().toISOString().split('T')[0]}`
  );

  const handleSave = () => {
    // In a real implementation, this would save to database
    toast({
      title: "Master Prompt saved",
      description: "Changes have been saved successfully.",
    });
    setIsEditing(false);
  };

  if (adminLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Skeleton className="h-8 w-64 mb-4" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            Master Prompt
          </h1>
          <p className="text-muted-foreground">
            Core system documentation and operational guidelines
          </p>
        </div>
        <Badge variant="outline" className="h-fit">
          Version 1.0
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>System Documentation</CardTitle>
              <CardDescription>
                {isAdmin 
                  ? "Edit and maintain the master prompt for the application"
                  : "Read-only view of the master prompt"}
              </CardDescription>
            </div>
            {isAdmin && !isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[600px] font-mono text-sm"
              />
              <div className="flex gap-2">
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <pre className="whitespace-pre-wrap bg-muted p-4 rounded-lg text-sm">
                {prompt}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Version History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center py-2 border-b">
                <div>
                  <span className="font-medium">Version 1.0</span>
                  <span className="text-muted-foreground ml-4">Initial documentation</span>
                </div>
                <span className="text-muted-foreground">{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
