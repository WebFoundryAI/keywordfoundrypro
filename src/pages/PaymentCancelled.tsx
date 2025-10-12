import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const PaymentCancelled = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/pricing');
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
            <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle>Payment Cancelled</CardTitle>
          <CardDescription>
            Your subscription was not activated
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            No charges were made. You can try again anytime you're ready.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate('/pricing')} className="w-full">
              View Pricing Plans
            </Button>
            <Button onClick={() => navigate('/research')} variant="outline" className="w-full">
              Continue with Free Trial
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Redirecting to pricing page in 5 seconds...
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentCancelled;