import { Link } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Contact = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-16 max-w-4xl">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <h1 className="text-4xl font-bold mb-6">Contact Us</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Get in Touch</CardTitle>
            <CardDescription>
              We'd love to hear from you. Reach out for support, custom plans, or any questions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-4">
              <Mail className="w-6 h-6 text-primary mt-1" />
              <div>
                <h3 className="font-semibold mb-2">Email Support</h3>
                <p className="text-muted-foreground mb-2">
                  For general inquiries and support:
                </p>
                <a href="mailto:support@keywordfoundry.pro" className="text-primary hover:underline">
                  support@keywordfoundry.pro
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Mail className="w-6 h-6 text-primary mt-1" />
              <div>
                <h3 className="font-semibold mb-2">Sales & Custom Plans</h3>
                <p className="text-muted-foreground mb-2">
                  For enterprise solutions and custom pricing:
                </p>
                <a href="mailto:sales@keywordfoundry.pro" className="text-primary hover:underline">
                  sales@keywordfoundry.pro
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Contact;
