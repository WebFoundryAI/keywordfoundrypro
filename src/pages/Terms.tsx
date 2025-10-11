import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-16 max-w-4xl">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <h1 className="text-4xl font-bold mb-6">Terms of Service</h1>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm italic">Last updated: October 2025</p>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>
              By accessing and using Keyword Foundry Pro, you agree to be bound by these Terms of Service 
              and all applicable laws and regulations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">2. Use License</h2>
            <p>
              Permission is granted to temporarily access the service for personal or commercial SEO research 
              purposes. This license shall automatically terminate if you violate any of these restrictions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">3. Service Usage</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must provide accurate account information</li>
              <li>You are responsible for maintaining account security</li>
              <li>Usage is subject to plan limits and quotas</li>
              <li>Abuse or excessive usage may result in account suspension</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">4. Subscription and Billing</h2>
            <p>
              Subscriptions are billed according to your selected plan. You may cancel at any time, 
              with cancellation taking effect at the end of the current billing period.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">5. Data and Privacy</h2>
            <p>
              Your use of the service is also governed by our Privacy Policy. We collect and use data 
              as described in that policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">6. Disclaimer</h2>
            <p>
              The service is provided "as is" without warranties of any kind. We do not guarantee 
              uninterrupted or error-free service.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
