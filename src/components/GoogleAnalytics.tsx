"use client";

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { GA_MEASUREMENT_ID, pageview } from '@/lib/gtag';

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    console.log('GA_MEASUREMENT_ID:', GA_MEASUREMENT_ID);
    if (!GA_MEASUREMENT_ID) {
      console.warn('Google Analytics: No measurement ID found');
      return;
    }
    
    const url = pathname + (searchParams?.toString() || '');
    console.log('GA: Tracking page view for:', url);
    pageview(url);
  }, [pathname, searchParams]);

  if (!GA_MEASUREMENT_ID) {
    console.warn('Google Analytics: Component not rendering - no measurement ID');
    return null;
  }

  console.log('Google Analytics: Rendering scripts for ID:', GA_MEASUREMENT_ID);

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        onLoad={() => console.log('Google Analytics: gtag script loaded')}
        onError={(e) => console.error('Google Analytics: Script failed to load', e)}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        onLoad={() => console.log('Google Analytics: Configuration script loaded')}
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
            });
            console.log('Google Analytics: gtag configured with ID ${GA_MEASUREMENT_ID}');
          `,
        }}
      />
    </>
  );
} 