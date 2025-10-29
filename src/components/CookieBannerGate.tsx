/**
 * Cookie Banner Gate
 * Shows cookie banner only if:
 * 1. Admin has enabled it via /privacy-settings
 * 2. User is in EEA/UK region (GDPR compliance)
 * 3. User hasn't already consented
 */

import { useEffect, useState } from 'react';
import { CookieBanner } from '@/components/legal/CookieBanner';
import { getCookieBannerEnabled } from '@/lib/siteSettings';
import { detectGeoLocation } from '@/lib/geo';

export function CookieBannerGate() {
  const [shouldShow, setShouldShow] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkShouldShow() {
      try {
        // Check if user has already consented
        const hasConsented = localStorage.getItem('cookie_consent');
        if (hasConsented) {
          if (mounted) {
            setShouldShow(false);
            setIsLoading(false);
          }
          return;
        }

        // Check if admin has enabled the banner
        const isEnabled = await getCookieBannerEnabled();
        if (!isEnabled) {
          if (mounted) {
            setShouldShow(false);
            setIsLoading(false);
          }
          return;
        }

        // Check if user is in EEA/UK
        const geoData = await detectGeoLocation();
        if (!geoData.isEEA) {
          if (mounted) {
            setShouldShow(false);
            setIsLoading(false);
          }
          return;
        }

        // All conditions met - show the banner
        if (mounted) {
          setShouldShow(true);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error checking cookie banner conditions:', error);
        // On error, default to showing (safer for GDPR)
        if (mounted) {
          setShouldShow(true);
          setIsLoading(false);
        }
      }
    }

    checkShouldShow();

    return () => {
      mounted = false;
    };
  }, []);

  // Don't render anything while loading
  if (isLoading) {
    return null;
  }

  // Don't render if conditions not met
  if (!shouldShow) {
    return null;
  }

  // Render the cookie banner
  return <CookieBanner />;
}
