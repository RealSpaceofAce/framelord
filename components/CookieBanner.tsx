// =============================================================================
// COOKIE BANNER — GDPR/CCPA compliant cookie consent
// =============================================================================
// Displays at the bottom of the screen until user accepts.
// Persists consent in localStorage with version tracking.
// =============================================================================

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X, ExternalLink } from 'lucide-react';
import { 
  shouldShowCookieBanner, 
  acceptCookies, 
  getCookieConsent 
} from '../stores/cookieConsentStore';

const MotionDiv = motion.div as any;

export const CookieBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if we should show the banner
    setIsVisible(shouldShowCookieBanner());
  }, []);

  const handleAccept = () => {
    acceptCookies();
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <MotionDiv
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4"
      >
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl shadow-2xl shadow-black/50 overflow-hidden">
            <div className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* Icon */}
                <div className="p-3 bg-[#4433FF]/20 rounded-lg border border-[#4433FF]/30 flex-shrink-0">
                  <Cookie size={24} className="text-[#4433FF]" />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-white mb-1">
                    We use cookies
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    We use cookies and similar technologies to provide you with the best 
                    experience on our platform. By clicking "Accept", you consent to our 
                    use of cookies for analytics, personalization, and advertising purposes.
                    {' '}
                    <a 
                      href="/legal/privacy" 
                      className="text-[#4433FF] hover:text-[#5544FF] inline-flex items-center gap-1"
                    >
                      Learn more
                      <ExternalLink size={10} />
                    </a>
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 flex-shrink-0 w-full sm:w-auto">
                  <button
                    onClick={handleAccept}
                    className="flex-1 sm:flex-none px-6 py-2.5 bg-[#4433FF] hover:bg-[#5544FF] text-white text-sm font-bold rounded-lg transition-colors"
                  >
                    Accept
                  </button>
                </div>
              </div>
            </div>

            {/* Progress bar for visual appeal */}
            <div className="h-1 bg-gradient-to-r from-[#4433FF] via-[#7a5dff] to-[#4433FF] opacity-50" />
          </div>
        </div>
      </MotionDiv>
    </AnimatePresence>
  );
};

export default CookieBanner;







