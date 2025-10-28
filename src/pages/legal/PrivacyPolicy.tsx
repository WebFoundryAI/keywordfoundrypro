import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Privacy Policy</CardTitle>
          <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <h2>1. Information We Collect</h2>
          <p>
            We collect information you provide directly to us, including name, email address, and usage data when you
            use our Service.
          </p>

          <h2>2. How We Use Your Information</h2>
          <p>
            We use the information we collect to:
          </p>
          <ul>
            <li>Provide, maintain, and improve our services</li>
            <li>Process transactions and send related information</li>
            <li>Send technical notices and support messages</li>
            <li>Respond to your comments and questions</li>
            <li>Monitor and analyze trends and usage</li>
          </ul>

          <h2>3. Information Sharing</h2>
          <p>
            We do not sell your personal information. We may share your information with:
          </p>
          <ul>
            <li>Service providers who perform services on our behalf</li>
            <li>In response to legal requests or to prevent harm</li>
            <li>In connection with a business transaction</li>
          </ul>

          <h2>4. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your personal information against
            unauthorized or unlawful processing and accidental loss.
          </p>

          <h2>5. Your Rights</h2>
          <p>
            You have the right to:
          </p>
          <ul>
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Object to processing of your data</li>
            <li>Export your data</li>
          </ul>

          <h2>6. Cookies</h2>
          <p>
            We use cookies and similar tracking technologies to track activity on our Service. You can control cookies
            through your browser settings and our cookie consent banner.
          </p>

          <h2>7. Data Retention</h2>
          <p>
            We retain your information for as long as necessary to provide the Service and comply with legal obligations.
          </p>

          <h2>8. International Data Transfers</h2>
          <p>
            Your information may be transferred to and processed in countries other than your own. We ensure appropriate
            safeguards are in place.
          </p>

          <h2>9. Children's Privacy</h2>
          <p>
            Our Service is not intended for children under 13. We do not knowingly collect information from children.
          </p>

          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new
            policy on this page.
          </p>

          <h2>11. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us through our Contact page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
