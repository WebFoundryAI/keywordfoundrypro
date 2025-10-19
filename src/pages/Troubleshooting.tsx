import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ExternalLink, RefreshCw, Key, CreditCard, Lock } from "lucide-react";

export default function Troubleshooting() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Troubleshooting Guide</h1>
        <p className="text-muted-foreground">
          Common issues and their solutions to help you get back on track.
        </p>
      </div>

      {/* Auth 404 Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-destructive" />
            Authentication Error (404)
          </CardTitle>
          <CardDescription>
            Cannot access protected pages or getting 404 errors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">What you see:</h3>
            <Alert variant="destructive">
              <AlertDescription>
                "404 Not Found" or "Unauthorized" when trying to access your account or research pages
              </AlertDescription>
            </Alert>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Why it happens:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Your session has expired</li>
              <li>Authentication cookies were cleared</li>
              <li>You're accessing a protected route without being logged in</li>
              <li>Browser privacy/incognito mode is interfering with authentication</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">How to fix:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li className="pl-2">
                <span className="font-medium">Sign out and sign back in:</span>
                <ul className="list-disc list-inside pl-6 mt-1 space-y-1">
                  <li>Click your profile icon and select "Sign out"</li>
                  <li>Clear your browser cache and cookies</li>
                  <li>Sign in again with your credentials</li>
                </ul>
              </li>
              <li className="pl-2">
                <span className="font-medium">Check your browser settings:</span>
                <ul className="list-disc list-inside pl-6 mt-1 space-y-1">
                  <li>Ensure cookies are enabled for this site</li>
                  <li>Disable "Block third-party cookies" temporarily</li>
                  <li>Try a different browser or disable extensions</li>
                </ul>
              </li>
              <li className="pl-2">
                <span className="font-medium">Reset your password:</span>
                <ul className="list-disc list-inside pl-6 mt-1 space-y-1">
                  <li>Go to the sign-in page</li>
                  <li>Click "Forgot password?"</li>
                  <li>Follow the email instructions to reset</li>
                </ul>
              </li>
            </ol>
          </div>

          <Button variant="outline" asChild className="w-full sm:w-auto">
            <a href="/auth/sign-in" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Go to Sign In
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* API 400 Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-warning" />
            API Error (400 - DataForSEO)
          </CardTitle>
          <CardDescription>
            Bad request or invalid parameters when running keyword research
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">What you see:</h3>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                "Bad Request" or "Invalid parameters" error when starting keyword research
              </AlertDescription>
            </Alert>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Why it happens:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Invalid keyword format (special characters, too long/short)</li>
              <li>Unsupported location or language combination</li>
              <li>API rate limits exceeded</li>
              <li>DataForSEO service temporary outage</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">How to fix:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li className="pl-2">
                <span className="font-medium">Check your keyword input:</span>
                <ul className="list-disc list-inside pl-6 mt-1 space-y-1">
                  <li>Use 2-200 characters</li>
                  <li>Avoid excessive special characters</li>
                  <li>Use common search terms (not URLs or code)</li>
                </ul>
              </li>
              <li className="pl-2">
                <span className="font-medium">Verify location and language:</span>
                <ul className="list-disc list-inside pl-6 mt-1 space-y-1">
                  <li>Ensure they're compatible (e.g., English + United States)</li>
                  <li>Try a common combination like "English + United States"</li>
                </ul>
              </li>
              <li className="pl-2">
                <span className="font-medium">Wait and retry:</span>
                <ul className="list-disc list-inside pl-6 mt-1 space-y-1">
                  <li>Wait 5-10 minutes if rate limited</li>
                  <li>Try with a smaller results limit first</li>
                </ul>
              </li>
            </ol>
          </div>

          <Button variant="outline" asChild className="w-full sm:w-auto">
            <a href="/research" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Research Again
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Credit Exhaustion Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-warning" />
            Credits Exhausted
          </CardTitle>
          <CardDescription>
            You've run out of API credits or reached your plan limit
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">What you see:</h3>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                "Insufficient credits" or "Plan limit reached" when trying to run research
              </AlertDescription>
            </Alert>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Why it happens:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Your subscription plan has reached its monthly limit</li>
              <li>Free trial has ended</li>
              <li>Payment method failed or card expired</li>
              <li>High-volume usage depleted credits faster than expected</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">How to fix:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li className="pl-2">
                <span className="font-medium">Check your subscription status:</span>
                <ul className="list-disc list-inside pl-6 mt-1 space-y-1">
                  <li>Go to Profile → Subscription Status</li>
                  <li>View remaining credits and renewal date</li>
                </ul>
              </li>
              <li className="pl-2">
                <span className="font-medium">Upgrade your plan:</span>
                <ul className="list-disc list-inside pl-6 mt-1 space-y-1">
                  <li>Visit the Pricing page</li>
                  <li>Select a plan with more credits</li>
                  <li>Update payment method if needed</li>
                </ul>
              </li>
              <li className="pl-2">
                <span className="font-medium">Optimize your usage:</span>
                <ul className="list-disc list-inside pl-6 mt-1 space-y-1">
                  <li>Start with smaller result limits (50-100 keywords)</li>
                  <li>Use cached results when available</li>
                  <li>Focus on high-value keywords</li>
                </ul>
              </li>
            </ol>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="default" asChild>
              <a href="/pricing" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                View Pricing Plans
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/profile" className="flex items-center gap-2">
                Check Subscription
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Additional Help */}
      <Card>
        <CardHeader>
          <CardTitle>Still Need Help?</CardTitle>
          <CardDescription>
            We're here to support you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            If your issue isn't resolved by the solutions above, please reach out to our support team. 
            Include as much detail as possible about your issue, including:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>What you were trying to do</li>
            <li>The exact error message you received</li>
            <li>Your browser and operating system</li>
            <li>Steps to reproduce the issue</li>
          </ul>
          <Button asChild>
            <a href="/contact" className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Contact Support
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
