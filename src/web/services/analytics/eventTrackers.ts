import { pageview, event } from '@/lib/gtag';

export const trackPageView = (url: string) => {
  pageview(url);
};

export const trackEvent = (action: string, parameters?: Record<string, unknown>) => {
  event(action, parameters);
};

