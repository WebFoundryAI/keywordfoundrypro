import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, X } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { supabase } from '@/integrations/supabase/client';

export const TrialExpiredBanner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;

    const checkTrialStatus = async () => {
      const { data } = await supabase
        .from('user_subscriptions')
        .select('tier, status, trial_ends_at')
        .eq('user_id', user.id)
        .single();

      if (data?.tier === 'free_trial' && data?.trial_ends_at) {
        const trialEnd = new Date(data.trial_ends_at);
        const now = new Date();
        const diffTime = trialEnd.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 2 && diffDays >= 0) {
          setDaysRemaining(diffDays);
          setShow(true);
        } else if (diffDays < 0) {
          setDaysRemaining(0);
          setShow(true);
        }
      }
    };

    checkTrialStatus();
  }, [user]);

  if (!show) return null;

  const isExpired = daysRemaining === 0;

  return (
    <div className={`relative ${isExpired ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'} border-b`}>
      <div className="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between flex-wrap">
          <div className="flex items-center flex-1">
            <AlertCircle className={`h-5 w-5 ${isExpired ? 'text-red-600' : 'text-amber-600'} mr-3`} />
            <p className={`text-sm font-medium ${isExpired ? 'text-red-800' : 'text-amber-800'}`}>
              {isExpired ? (
                <>Your free trial has ended. Upgrade to continue using premium features.</>
              ) : (
                <>Your free trial ends in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}. Upgrade now to keep your access!</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/pricing')}
              className={`${
                isExpired
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              } px-4 py-1.5 rounded-lg text-sm font-medium transition-colors`}
            >
              Upgrade Now
            </button>
            <button
              onClick={() => setShow(false)}
              className={`${isExpired ? 'text-red-600 hover:text-red-800' : 'text-amber-600 hover:text-amber-800'} transition-colors`}
              aria-label="Dismiss"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
