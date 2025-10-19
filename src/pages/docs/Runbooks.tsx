import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdmin } from "@/hooks/useAdmin";
import { BookOpen, Plus, Edit, Trash2, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface Runbook {
  id: string;
  title: string;
  category: string;
  lastUpdated: string;
  steps: string[];
  notes?: string;
}

const initialRunbooks: Runbook[] = [
  {
    id: "1",
    title: "Deploy New Feature",
    category: "Deployment",
    lastUpdated: "2025-01-15",
    steps: [
      "Review code changes in development branch",
      "Run all tests: npm run test",
      "Check TypeScript compilation: npm run build:type-check",
      "Verify environment variables match production requirements",
      "Create pull request with detailed description",
      "Wait for CI/CD checks to pass",
      "Request code review from team member",
      "Merge to main branch after approval",
      "Monitor deployment in production dashboard",
      "Check error logs for first 24 hours"
    ],
    notes: "Always deploy during low-traffic hours (2-5 AM EST). Have rollback plan ready."
  },
  {
    id: "2",
    title: "Handle API Rate Limit Errors",
    category: "Operations",
    lastUpdated: "2025-01-10",
    steps: [
      "Check Admin Dashboard → Usage tab for current API consumption",
      "Identify user or process causing high usage",
      "Review DataForSEO account dashboard for rate limit status",
      "If legitimate spike: increase API limits in DataForSEO dashboard",
      "If abuse detected: temporarily restrict user account",
      "Add caching for frequently requested keywords",
      "Implement exponential backoff in edge functions",
      "Document incident in admin logs",
      "Set up alert for future rate limit warnings"
    ],
    notes: "DataForSEO rate limits reset at midnight UTC. Free tier: 100 requests/day."
  },
  {
    id: "3",
    title: "User Subscription Issues",
    category: "Support",
    lastUpdated: "2025-01-08",
    steps: [
      "Navigate to Admin → Users tab",
      "Search for user by email",
      "Check current subscription status in user details",
      "Verify Stripe subscription status matches database",
      "If mismatch: use 'Sync Subscription' button",
      "Check payment history in Stripe dashboard",
      "If payment failed: send payment update email to user",
      "If upgrade needed: guide user to /pricing page",
      "Document resolution in support ticket"
    ],
    notes: "Most subscription issues are caused by failed payments. Check Stripe first."
  },
  {
    id: "4",
    title: "Database Backup and Restore",
    category: "Maintenance",
    lastUpdated: "2025-01-05",
    steps: [
      "Navigate to Supabase project dashboard",
      "Go to Database → Backups section",
      "Click 'Create Backup' with descriptive label",
      "Wait for backup completion (~5-10 minutes)",
      "Download backup file to secure location",
      "To restore: Stop all edge functions temporarily",
      "Use Supabase CLI: supabase db reset --from-backup [file]",
      "Verify data integrity with test queries",
      "Re-enable edge functions",
      "Test critical user flows"
    ],
    notes: "Automated daily backups retained for 7 days. Weekly backups retained for 30 days."
  },
  {
    id: "5",
    title: "Emergency System Shutdown",
    category: "Emergency",
    lastUpdated: "2025-01-03",
    steps: [
      "Assess severity: security breach, data corruption, or service outage",
      "Notify all admins via emergency contact list",
      "Disable all edge functions in Supabase dashboard",
      "Set maintenance mode flag in database",
      "Display maintenance page to users",
      "Document incident start time and symptoms",
      "Investigate root cause using admin logs",
      "Implement fix in staging environment first",
      "Test thoroughly before re-enabling",
      "Gradually re-enable services and monitor",
      "Post-incident review within 48 hours"
    ],
    notes: "⚠️ CRITICAL: Only use for severe incidents. Document everything."
  }
];

export default function Runbooks() {
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const [runbooks] = useState<Runbook[]>(initialRunbooks);

  if (adminLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Skeleton className="h-8 w-64 mb-4" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
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
            <BookOpen className="h-8 w-8 text-primary" />
            Runbooks
          </h1>
          <p className="text-muted-foreground">
            Step-by-step procedures for common operations and incidents
          </p>
        </div>
        {isAdmin && (
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Runbook
          </Button>
        )}
      </div>

      <div className="grid gap-6">
        {/* Category: Emergency */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Emergency Procedures</CardTitle>
            </div>
            <CardDescription>
              Critical procedures for urgent situations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {runbooks
                .filter((rb) => rb.category === "Emergency")
                .map((runbook) => (
                  <AccordionItem key={runbook.id} value={runbook.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <span className="font-medium">{runbook.title}</span>
                        <Badge variant="outline" className="ml-auto mr-2">
                          Updated: {new Date(runbook.lastUpdated).toLocaleDateString()}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-2">
                        <ol className="list-decimal list-inside space-y-2 text-sm">
                          {runbook.steps.map((step, idx) => (
                            <li key={idx} className="pl-2">
                              {step}
                            </li>
                          ))}
                        </ol>
                        {runbook.notes && (
                          <div className="mt-4 p-3 bg-muted rounded-md">
                            <p className="text-sm font-medium mb-1">Notes:</p>
                            <p className="text-sm text-muted-foreground">{runbook.notes}</p>
                          </div>
                        )}
                        {isAdmin && (
                          <div className="flex gap-2 pt-2">
                            <Button variant="outline" size="sm">
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Other Categories */}
        {["Deployment", "Operations", "Support", "Maintenance"].map((category) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle>{category}</CardTitle>
              <CardDescription>
                {category === "Deployment" && "Release and deployment procedures"}
                {category === "Operations" && "Day-to-day operational tasks"}
                {category === "Support" && "User support and troubleshooting"}
                {category === "Maintenance" && "System maintenance and upkeep"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {runbooks
                  .filter((rb) => rb.category === category)
                  .map((runbook) => (
                    <AccordionItem key={runbook.id} value={runbook.id}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <span className="font-medium">{runbook.title}</span>
                          <Badge variant="outline" className="ml-auto mr-2">
                            Updated: {new Date(runbook.lastUpdated).toLocaleDateString()}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          <ol className="list-decimal list-inside space-y-2 text-sm">
                            {runbook.steps.map((step, idx) => (
                              <li key={idx} className="pl-2">
                                {step}
                              </li>
                            ))}
                          </ol>
                          {runbook.notes && (
                            <div className="mt-4 p-3 bg-muted rounded-md">
                              <p className="text-sm font-medium mb-1">Notes:</p>
                              <p className="text-sm text-muted-foreground">{runbook.notes}</p>
                            </div>
                          )}
                          {isAdmin && (
                            <div className="flex gap-2 pt-2">
                              <Button variant="outline" size="sm">
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </Button>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
              </Accordion>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
