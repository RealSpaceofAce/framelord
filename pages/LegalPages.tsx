// =============================================================================
// LEGAL PAGES — /legal/privacy and /legal/terms
// =============================================================================
// Structured placeholder legal content with commented sections.
// Replace with actual legal text before production.
// =============================================================================

import React from 'react';
import { Shield, Scale, ArrowLeft } from 'lucide-react';

// =============================================================================
// PRIVACY POLICY PAGE
// =============================================================================

export const PrivacyPolicyPage: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="border-b border-[#2A2A2A] bg-[#0E0E0E]">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#4433FF]/20 rounded-lg border border-[#4433FF]/30">
                <Shield size={20} className="text-[#4433FF]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Privacy Policy</h1>
                <p className="text-xs text-gray-500">Last updated: December 2024</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="prose prose-invert max-w-none">
          {/* SECTION: Introduction */}
          {/* TODO: Replace with actual legal content */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4">1. Introduction</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              FrameLord ("we", "our", or "us") is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard 
              your information when you use our application and services.
            </p>
          </section>

          {/* SECTION: Information We Collect */}
          {/* TODO: Specify exact data collected */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4">2. Information We Collect</h2>
            <h3 className="text-sm font-bold text-gray-300 mb-2">2.1 Information You Provide</h3>
            <ul className="text-gray-400 text-sm space-y-2 list-disc list-inside">
              <li>Account information (name, email, password)</li>
              <li>Profile information</li>
              <li>Content you create (notes, tasks, contacts)</li>
              <li>Communications with us</li>
            </ul>
            
            <h3 className="text-sm font-bold text-gray-300 mt-4 mb-2">2.2 Information Collected Automatically</h3>
            <ul className="text-gray-400 text-sm space-y-2 list-disc list-inside">
              <li>Usage data and analytics</li>
              <li>Device information</li>
              <li>Log data</li>
            </ul>
          </section>

          {/* SECTION: How We Use Your Information */}
          {/* TODO: Detail all use cases */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4">3. How We Use Your Information</h2>
            <ul className="text-gray-400 text-sm space-y-2 list-disc list-inside">
              <li>To provide and maintain our services</li>
              <li>To personalize your experience</li>
              <li>To improve our services</li>
              <li>To communicate with you</li>
              <li>To provide AI-powered features</li>
              <li>To ensure security and prevent fraud</li>
            </ul>
          </section>

          {/* SECTION: Data Sharing */}
          {/* TODO: List all third parties */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4">4. Data Sharing</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              We do not sell your personal information. We may share data with:
            </p>
            <ul className="text-gray-400 text-sm space-y-2 list-disc list-inside mt-2">
              <li>Service providers who assist in our operations</li>
              <li>AI service providers for feature functionality</li>
              <li>Legal authorities when required by law</li>
            </ul>
          </section>

          {/* SECTION: Data Retention */}
          {/* TODO: Specify retention periods */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4">5. Data Retention</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              We retain your data for as long as your account is active or as needed 
              to provide services. You may request deletion of your data at any time.
            </p>
          </section>

          {/* SECTION: Your Rights */}
          {/* TODO: List all applicable rights (GDPR, CCPA, etc.) */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4">6. Your Rights</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-2">
              Depending on your location, you may have the right to:
            </p>
            <ul className="text-gray-400 text-sm space-y-2 list-disc list-inside">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data</li>
              <li>Opt out of certain processing</li>
            </ul>
          </section>

          {/* SECTION: Security */}
          {/* TODO: Detail security measures */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4">7. Security</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              We implement appropriate technical and organizational measures to protect 
              your personal data against unauthorized access, alteration, disclosure, 
              or destruction.
            </p>
          </section>

          {/* SECTION: Contact */}
          {/* TODO: Add actual contact information */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4">8. Contact Us</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              If you have questions about this Privacy Policy, please contact us at:
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Email: privacy@framelord.com<br />
              {/* TODO: Add mailing address */}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// TERMS OF SERVICE PAGE
// =============================================================================

export const TermsOfServicePage: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="border-b border-[#2A2A2A] bg-[#0E0E0E]">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#4433FF]/20 rounded-lg border border-[#4433FF]/30">
                <Scale size={20} className="text-[#4433FF]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Terms of Service</h1>
                <p className="text-xs text-gray-500">Last updated: December 2024</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="prose prose-invert max-w-none">
          {/* SECTION: Acceptance of Terms */}
          {/* TODO: Review with legal counsel */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              By accessing or using FrameLord ("Service"), you agree to be bound by these 
              Terms of Service. If you do not agree to these terms, you may not use the Service.
            </p>
          </section>

          {/* SECTION: Description of Service */}
          {/* TODO: Detail all service features */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4">2. Description of Service</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              FrameLord is a personal CRM and productivity application that helps users 
              manage contacts, notes, tasks, and provides AI-powered frame analysis features.
            </p>
          </section>

          {/* SECTION: User Accounts */}
          {/* TODO: Specify account requirements */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4">3. User Accounts</h2>
            <ul className="text-gray-400 text-sm space-y-2 list-disc list-inside">
              <li>You must provide accurate information when creating an account</li>
              <li>You are responsible for maintaining the security of your account</li>
              <li>You must be at least 18 years old to use the Service</li>
              <li>One person may not maintain more than one account</li>
            </ul>
          </section>

          {/* SECTION: Acceptable Use */}
          {/* TODO: List prohibited activities */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4">4. Acceptable Use</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-2">
              You agree not to:
            </p>
            <ul className="text-gray-400 text-sm space-y-2 list-disc list-inside">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to the Service</li>
              <li>Interfere with the proper functioning of the Service</li>
              <li>Upload malicious code or content</li>
              <li>Violate the rights of others</li>
            </ul>
          </section>

          {/* SECTION: Intellectual Property */}
          {/* TODO: Detail IP ownership */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4">5. Intellectual Property</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              The Service and its original content, features, and functionality are owned 
              by FrameLord and are protected by international copyright, trademark, and 
              other intellectual property laws.
            </p>
            <p className="text-gray-400 text-sm leading-relaxed mt-2">
              You retain ownership of content you create within the Service.
            </p>
          </section>

          {/* SECTION: Subscription and Payments */}
          {/* TODO: Detail pricing and billing */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4">6. Subscription and Payments</h2>
            <ul className="text-gray-400 text-sm space-y-2 list-disc list-inside">
              <li>Some features may require a paid subscription</li>
              <li>Payments are processed securely through third-party providers</li>
              <li>Subscriptions automatically renew unless cancelled</li>
              <li>Refund policy as specified at time of purchase</li>
            </ul>
          </section>

          {/* SECTION: Disclaimer of Warranties */}
          {/* TODO: Review with legal counsel */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4">7. Disclaimer of Warranties</h2>
            <p className="text-gray-400 text-sm leading-relaxed uppercase">
              THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. WE DISCLAIM 
              ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY 
              AND FITNESS FOR A PARTICULAR PURPOSE.
            </p>
          </section>

          {/* SECTION: Limitation of Liability */}
          {/* TODO: Review with legal counsel */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4">8. Limitation of Liability</h2>
            <p className="text-gray-400 text-sm leading-relaxed uppercase">
              IN NO EVENT SHALL FRAMELORD BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, 
              CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF YOUR USE OF THE SERVICE.
            </p>
          </section>

          {/* SECTION: Termination */}
          {/* TODO: Detail termination procedures */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4">9. Termination</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              We may terminate or suspend your account at any time for violations of these 
              terms. You may terminate your account at any time by contacting us or using 
              the account deletion feature.
            </p>
          </section>

          {/* SECTION: Changes to Terms */}
          {/* TODO: Specify notification procedures */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4">10. Changes to Terms</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              We reserve the right to modify these terms at any time. We will notify users 
              of significant changes. Continued use after changes constitutes acceptance.
            </p>
          </section>

          {/* SECTION: Governing Law */}
          {/* TODO: Specify jurisdiction */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4">11. Governing Law</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              These terms shall be governed by and construed in accordance with applicable 
              laws, without regard to conflict of law principles.
            </p>
          </section>

          {/* SECTION: Contact */}
          {/* TODO: Add actual contact information */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4">12. Contact Us</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              If you have questions about these Terms, please contact us at:
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Email: legal@framelord.com<br />
              {/* TODO: Add mailing address */}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default { PrivacyPolicyPage, TermsOfServicePage };

