// =============================================================================
// PUBLIC FRAME SCAN PAGE — Try FrameScan with one free scan
// =============================================================================
// This page allows non-authenticated visitors to try a single FrameScan.
// After one scan, they are prompted to create an account for full access.
// Shows a truncated preview of the report to encourage signups.
// =============================================================================

import React, { useState, useEffect } from 'react';
import { Scan, Lock, Sparkles, ArrowRight, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { hasUsedPublicScan, markPublicScanUsed } from '../lib/frameScan/publicScanGate';
import { appConfig } from '../config/appConfig';
import { runTextFrameScan, type TextDomainId } from '../lib/frameScan/frameScanLLM';
import type { FrameScore } from '../lib/frameScan/frameTypes';
import type { FrameScanUIReport } from '../lib/frameScan/frameReportUI';
import { CONTACT_ZERO } from '../services/contactStore';

/**
 * Build a truncated preview of the UI report for public visitors
 */
function buildPublicPreview(ui: FrameScanUIReport): FrameScanUIReport {
  return {
    header: {
      ...ui.header,
      badges: (ui.header.badges ?? []).slice(0, 2),
    },
    sections: ui.sections.map(section => {
      if (section.id === 'corrections') {
        return {
          ...section,
          corrections: (section.corrections ?? []).slice(0, 1),
        };
      }
      if (section.bullets && section.bullets.length > 0) {
        return {
          ...section,
          bullets: (section.bullets ?? []).slice(0, 2),
        };
      }
      return section;
    }),
  };
}

export const PublicFrameScanPage: React.FC = () => {
  const [hasUsed, setHasUsed] = useState(false);
  const [inputText, setInputText] = useState('');
  const [domain, setDomain] = useState<TextDomainId>('generic');
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    score: FrameScore;
    uiReport: FrameScanUIReport;
    preview: FrameScanUIReport;
  } | null>(null);

  useEffect(() => {
    if (appConfig.enablePublicScanGate) {
      setHasUsed(hasUsedPublicScan());
    }
  }, []);

  const handleScan = async () => {
    if (!inputText.trim()) {
      setError('Please enter some text to scan');
      return;
    }
    
    setIsScanning(true);
    setError(null);
    
    try {
      const score = await runTextFrameScan({
        content: inputText.trim(),
        domain,
        contactId: CONTACT_ZERO.id,
        sourceRef: 'public_scan',
      });
      
      // Get the most recent report (we just created it)
      const { getFrameScanReports } = await import('../services/frameScanReportStore');
      const reports = getFrameScanReports();
      const latestReport = reports[0];
      
      if (latestReport?.uiReport) {
        const preview = buildPublicPreview(latestReport.uiReport);
        setResult({
          score,
          uiReport: latestReport.uiReport,
          preview,
        });
        
        // Mark as used for public gate
        if (appConfig.enablePublicScanGate) {
          markPublicScanUsed();
          setHasUsed(true);
        }
      } else {
        setError('Scan completed but report could not be generated');
      }
    } catch (err: any) {
      console.error('Public scan error:', err);
      setError(err?.message || 'Failed to run scan');
    } finally {
      setIsScanning(false);
    }
  };

  const getScoreColorClass = (score: number) => {
    if (score >= 70) return 'text-green-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const domainOptions: { value: TextDomainId; label: string }[] = [
    { value: 'generic', label: 'General' },
    { value: 'sales_email', label: 'Sales Email' },
    { value: 'dating_message', label: 'Dating Message' },
    { value: 'leadership_update', label: 'Leadership Update' },
    { value: 'social_post', label: 'Social Post' },
  ];

  // Locked state - already used free scan
  if (hasUsed && appConfig.enablePublicScanGate && !result) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
        <div className="max-w-lg w-full">
          <div className="bg-[#0E0E0E] rounded-xl border border-[#2A2A2A] p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-[#4433FF]/20 flex items-center justify-center mx-auto mb-6">
              <Lock size={32} className="text-[#4433FF]" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">
              You've Used Your Free Scan
            </h1>
            <p className="text-gray-400 mb-6">
              You have used your free sample FrameScan. Create an account to keep scanning and see full reports with detailed breakdowns and corrections.
            </p>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#4433FF] hover:bg-[#5544FF] text-white font-bold rounded-lg transition-colors">
                <Sparkles size={18} />
                Create Free Account
              </button>
              <button className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-[#333] text-gray-400 hover:text-white hover:border-[#4433FF] rounded-lg transition-colors">
                Learn More About FrameLord
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Scan size={32} className="text-[#4433FF]" />
            <h1 className="text-3xl font-bold text-white">Try FrameScan</h1>
          </div>
          <p className="text-gray-400">
            Analyze your message for frame dynamics. Paste any text below to see how your communication style scores.
          </p>
          {!hasUsed && appConfig.enablePublicScanGate && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#4433FF]/10 border border-[#4433FF]/30 rounded-full">
              <Info size={14} className="text-[#4433FF]" />
              <span className="text-xs text-[#4433FF]">One free scan available</span>
            </div>
          )}
        </div>

        {/* Input Form */}
        {!result && (
          <div className="bg-[#0E0E0E] rounded-xl border border-[#2A2A2A] p-6 mb-6">
            <div className="mb-4">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">
                Text to Analyze
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste an email, message, or social post here..."
                className="w-full h-40 bg-[#1A1A1D] border border-[#333] rounded-lg px-4 py-3 text-white text-sm focus:border-[#4433FF] outline-none resize-none"
                disabled={isScanning}
              />
            </div>
            
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">
                  Context
                </label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value as TextDomainId)}
                  className="w-full bg-[#1A1A1D] border border-[#333] rounded-lg px-4 py-2 text-white text-sm focus:border-[#4433FF] outline-none"
                  disabled={isScanning}
                >
                  {domainOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={handleScan}
                disabled={isScanning || !inputText.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-[#4433FF] hover:bg-[#5544FF] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
              >
                <Scan size={18} />
                {isScanning ? 'Scanning...' : 'Scan Frame'}
              </button>
            </div>
            
            {error && (
              <div className="mt-4 flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertTriangle size={16} className="text-red-400" />
                <span className="text-sm text-red-400">{error}</span>
              </div>
            )}
          </div>
        )}

        {/* Result - Preview for public users */}
        {result && (
          <div className="space-y-6">
            {/* Score Header */}
            <div className="bg-[#0E0E0E] rounded-xl border border-[#2A2A2A] p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-white">{result.preview.header.title}</h2>
                  <p className="text-gray-400 mt-1">{result.preview.header.oneLineVerdict}</p>
                </div>
                <div className={`text-5xl font-bold ${getScoreColorClass(result.score.frameScore)}`}>
                  {result.score.frameScore}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.preview.header.badges.map((badge, idx) => (
                  <span key={idx} className="px-3 py-1 bg-[#4433FF]/20 text-[#4433FF] text-xs font-medium rounded-full">
                    {badge}
                  </span>
                ))}
              </div>
            </div>

            {/* Preview Sections */}
            {result.preview.sections.map((section, idx) => (
              <div key={section.id || idx} className="bg-[#0E0E0E] rounded-xl border border-[#2A2A2A] p-6">
                <h3 className="text-lg font-bold text-white mb-3">{section.title}</h3>
                {section.mainParagraph && (
                  <p className="text-gray-300 mb-4">{section.mainParagraph}</p>
                )}
                {section.bullets && section.bullets.length > 0 && (
                  <ul className="space-y-2">
                    {section.bullets.map((bullet, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-2 text-sm text-gray-300">
                        <CheckCircle size={14} className="text-[#4433FF] mt-1 flex-shrink-0" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
                {section.corrections && section.corrections.length > 0 && (
                  <div className="space-y-3 mt-4">
                    {section.corrections.map((correction, cIdx) => (
                      <div key={cIdx} className="p-3 bg-[#1A1A1D] border border-[#333] rounded-lg">
                        <p className="font-bold text-white text-sm">{correction.label}</p>
                        <p className="text-xs text-gray-400 mt-1">{correction.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Paywall Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#4433FF]/30" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 py-1 bg-[#0A0A0A] text-xs text-[#4433FF] uppercase tracking-wider font-medium">
                  Preview Above • Full Report Below
                </span>
              </div>
            </div>

            {/* Locked Full Report - Blurred Content */}
            <div className="relative">
              {/* Blurred content behind paywall */}
              <div className="blur-[6px] select-none pointer-events-none opacity-40 space-y-4">
                <div className="bg-[#0E0E0E] rounded-xl border border-[#2A2A2A] p-6">
                  <h3 className="text-lg font-bold text-white mb-3">Axis-by-Axis Breakdown</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-[#1A1A1D] rounded-lg">
                      <div className="text-sm text-gray-400">Emotional Sovereignty</div>
                      <div className="text-2xl font-bold text-green-400">78</div>
                    </div>
                    <div className="p-4 bg-[#1A1A1D] rounded-lg">
                      <div className="text-sm text-gray-400">Frame Control</div>
                      <div className="text-2xl font-bold text-yellow-400">65</div>
                    </div>
                    <div className="p-4 bg-[#1A1A1D] rounded-lg">
                      <div className="text-sm text-gray-400">Outcome Independence</div>
                      <div className="text-2xl font-bold text-red-400">42</div>
                    </div>
                    <div className="p-4 bg-[#1A1A1D] rounded-lg">
                      <div className="text-sm text-gray-400">Value Assertion</div>
                      <div className="text-2xl font-bold text-green-400">71</div>
                    </div>
                  </div>
                </div>
                <div className="bg-[#0E0E0E] rounded-xl border border-[#2A2A2A] p-6">
                  <h3 className="text-lg font-bold text-white mb-3">All Corrections & Rewrites</h3>
                  <div className="space-y-3">
                    <div className="p-4 bg-[#1A1A1D] rounded-lg">
                      <div className="text-sm text-white font-medium">Before: "I hope this finds you well..."</div>
                      <div className="text-sm text-green-400 mt-1">After: "Based on your Q3 results..."</div>
                    </div>
                    <div className="p-4 bg-[#1A1A1D] rounded-lg">
                      <div className="text-sm text-white font-medium">Before: "Would you be open to..."</div>
                      <div className="text-sm text-green-400 mt-1">After: "Here's what I'm proposing..."</div>
                    </div>
                    <div className="p-4 bg-[#1A1A1D] rounded-lg h-16" />
                  </div>
                </div>
              </div>

              {/* Overlay with lock */}
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-transparent via-[#0A0A0A]/70 to-[#0A0A0A]">
                <div className="text-center p-8 max-w-md bg-[#0E0E0E]/90 backdrop-blur-md rounded-xl border border-[#4433FF]/30 shadow-[0_0_60px_rgba(68,51,255,0.2)]">
                  <div className="w-16 h-16 rounded-full bg-[#4433FF]/20 flex items-center justify-center mx-auto mb-6 border border-[#4433FF]/30">
                    <Lock size={28} className="text-[#4433FF]" />
                  </div>
                  <h4 className="text-xl font-bold text-white mb-3">Full Report Locked</h4>
                  <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                    Upgrade inside FrameLord to unlock the full FrameScan report.
                  </p>
                  <button className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#4433FF] hover:bg-[#5544FF] text-white font-bold rounded-lg transition-colors shadow-[0_0_20px_rgba(68,51,255,0.3)]">
                    <Sparkles size={18} />
                    Upgrade to FrameLord
                  </button>
                  <p className="text-xs text-gray-500 mt-4">
                    Get full diagnostics, corrections, and coaching
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicFrameScanPage;

