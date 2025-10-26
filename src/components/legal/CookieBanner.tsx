import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { hasConsent, setConsent, type ConsentLevel } from '@/lib/legal/consent';
import { X } from 'lucide-react';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Show banner if no consent has been given
    if (!hasConsent()) {
      setVisible(true);
    }
  }, []);

  const handleConsent = (level: ConsentLevel) => {
    setConsent(level);
    setVisible(false);

    // Reload page to apply consent settings
    if (level === 'all') {
      window.location.reload();
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <Card className="max-w-4xl mx-auto shadow-lg">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">Cookie Settings</CardTitle>
              <CardDescription>
                We use cookies to improve your experience
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleConsent('essential')}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm">
            We use essential cookies to make our site work. With your consent, we may also use non-essential
            cookies to improve user experience and analyze website traffic. By clicking "Accept All", you agree
            to our website's cookie use as described in our Privacy Policy.
          </p>

          {showDetails && (
            <div className="space-y-3 text-sm border-t pt-4">
              <div>
                <h4 className="font-semibold mb-1">Essential Cookies</h4>
                <p className="text-muted-foreground">
                  Required for the website to function. These cannot be disabled.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Analytics Cookies</h4>
                <p className="text-muted-foreground">
                  Help us understand how visitors interact with our website.
                </p>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={() => handleConsent('all')}
            className="w-full sm:w-auto"
          >
            Accept All
          </Button>
          <Button
            onClick={() => handleConsent('essential')}
            variant="outline"
            className="w-full sm:w-auto"
          >
            Essential Only
          </Button>
          <Button
            onClick={() => setShowDetails(!showDetails)}
            variant="ghost"
            className="w-full sm:w-auto"
          >
            {showDetails ? 'Hide Details' : 'Manage Preferences'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
