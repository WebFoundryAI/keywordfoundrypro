import Plausible from 'plausible-tracker';

const isEnabled = import.meta.env.VITE_PLAUSIBLE_ENABLED === 'true';
const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN || '';

const plausible = Plausible({
  domain,
  trackLocalhost: false,
  apiHost: 'https://plausible.io',
});

export const analytics = {
  pageview: () => {
    if (isEnabled && domain) plausible.trackPageview();
  },

  event: (eventName: string, props?: Record<string, string | number>) => {
    if (isEnabled && domain) plausible.trackEvent(eventName, { props });
  },
};

// Common events
export const trackKeywordResearch = (keywords: number) =>
  analytics.event('Keyword Research', { keywords });

export const trackCompetitorAnalysis = () =>
  analytics.event('Competitor Analysis');

export const trackSerpAnalysis = () =>
  analytics.event('SERP Analysis');

export const trackSubscriptionUpgrade = (tier: string) =>
  analytics.event('Subscription Upgrade', { tier });

export const trackExport = (format: string) =>
  analytics.event('Export Data', { format });

export const trackSignUp = (method: string) =>
  analytics.event('Sign Up', { method });

export const trackSignIn = (method: string) =>
  analytics.event('Sign In', { method });
