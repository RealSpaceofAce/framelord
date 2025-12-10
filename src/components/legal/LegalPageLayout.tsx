// =============================================================================
// LEGAL PAGE LAYOUT — Shared layout for all legal pages
// =============================================================================

import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
  onBack: () => void;
}

export const LegalPageLayout: React.FC<LegalPageLayoutProps> = ({
  title,
  lastUpdated,
  children,
  onBack,
}) => {
  return (
    <div className="min-h-screen bg-black text-white py-20 px-6 relative z-10">
      <div className="max-w-3xl mx-auto relative">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm">Back to Home</span>
        </button>

        {/* Header */}
        <header className="mb-12">
          <h1 className="font-display text-4xl font-bold tracking-tight text-white mb-4">
            {title}
          </h1>
          <p className="text-gray-400 text-sm">
            Last updated: {lastUpdated}
          </p>
        </header>

        {/* Content */}
        <div className="prose prose-invert prose-lg max-w-none">
          {children}
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-white/10">
          <p className="text-gray-400 text-sm">
            If you have any questions about this document, please contact us at{' '}
            <a href="mailto:legal@framelord.com" className="text-blue-500 hover:text-white transition-colors">
              legal@framelord.com
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
};

// Shared styles for legal content sections
export const legalStyles = {
  section: 'mb-10',
  sectionTitle: 'text-xl font-bold text-white mb-4 tracking-wide',
  paragraph: 'text-gray-400 text-base leading-relaxed mb-4',
  list: 'list-disc list-inside text-gray-400 text-base leading-relaxed mb-4 space-y-2',
  listItem: 'text-gray-400',
  subSection: 'mb-6',
  subSectionTitle: 'text-lg font-semibold text-white/90 mb-3',
  emphasis: 'text-white font-medium',
  link: 'text-blue-500 hover:text-white transition-colors underline',
};

export default LegalPageLayout;
