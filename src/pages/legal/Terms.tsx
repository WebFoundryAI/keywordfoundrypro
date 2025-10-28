import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Terms() {
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Terms of Service</CardTitle>
          <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using Keyword Foundry Pro ("the Service"), you accept and agree to be bound by the terms
            and provision of this agreement.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            Keyword Foundry Pro provides keyword research, SERP analysis, and competitor analysis tools for SEO
            professionals and marketers.
          </p>

          <h2>3. User Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account and password. You agree to accept
            responsibility for all activities that occur under your account.
          </p>

          <h2>4. Acceptable Use</h2>
          <p>
            You agree not to use the Service for any unlawful purpose or in any way that interrupts, damages, or impairs
            the service.
          </p>

          <h2>5. Billing and Payments</h2>
          <p>
            Subscription fees are billed in advance on a monthly or annual basis. All fees are non-refundable except as
            required by law.
          </p>

          <h2>6. Data and Privacy</h2>
          <p>
            We collect and process data as described in our Privacy Policy. By using the Service, you consent to such
            processing.
          </p>

          <h2>7. Termination</h2>
          <p>
            We may terminate or suspend your account at any time for violations of these terms. You may cancel your
            subscription at any time.
          </p>

          <h2>8. Limitation of Liability</h2>
          <p>
            The Service is provided "as is" without warranties of any kind. We shall not be liable for any indirect,
            incidental, or consequential damages.
          </p>

          <h2>9. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Continued use of the Service constitutes acceptance
            of modified terms.
          </p>

          <h2>10. Contact</h2>
          <p>
            For questions about these Terms, please contact us through our Contact page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
