// =============================================================================
// TERMS OF SERVICE PAGE
// =============================================================================

import React from 'react';
import { LegalPageLayout, legalStyles } from './LegalPageLayout';

interface TermsOfServiceProps {
  onBack: () => void;
}

export const TermsOfService: React.FC<TermsOfServiceProps> = ({ onBack }) => {
  return (
    <LegalPageLayout
      title="Terms of Service"
      lastUpdated="December 2024"
      onBack={onBack}
    >
      {/* TODO: Replace placeholder content with final legal copy */}

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>1. Agreement to Terms</h2>
        <p className={legalStyles.paragraph}>
          By accessing or using FrameLord ("the Service"), you agree to be bound by these Terms of Service ("Terms").
          If you disagree with any part of these terms, you may not access the Service.
        </p>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>2. Description of Service</h2>
        <p className={legalStyles.paragraph}>
          FrameLord provides AI-powered authority diagnostics and communication analysis tools designed to help users
          identify and improve patterns in their professional and personal communication.
        </p>
        <p className={legalStyles.paragraph}>
          The Service includes but is not limited to:
        </p>
        <ul className={legalStyles.list}>
          <li className={legalStyles.listItem}>FrameScan text and image analysis</li>
          <li className={legalStyles.listItem}>Little Lord AI coaching assistant</li>
          <li className={legalStyles.listItem}>Contact and relationship management tools</li>
          <li className={legalStyles.listItem}>Notes and task organization features</li>
        </ul>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>3. User Accounts</h2>
        <p className={legalStyles.paragraph}>
          When you create an account with us, you must provide accurate, complete, and current information.
          Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account.
        </p>
        <p className={legalStyles.paragraph}>
          You are responsible for safeguarding the password that you use to access the Service and for any activities
          or actions under your password.
        </p>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>4. Acceptable Use</h2>
        <p className={legalStyles.paragraph}>
          You agree not to use the Service:
        </p>
        <ul className={legalStyles.list}>
          <li className={legalStyles.listItem}>For any unlawful purpose or to solicit others to perform unlawful acts</li>
          <li className={legalStyles.listItem}>To violate any international, federal, or state regulations, rules, laws, or ordinances</li>
          <li className={legalStyles.listItem}>To infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
          <li className={legalStyles.listItem}>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
          <li className={legalStyles.listItem}>To submit false or misleading information</li>
          <li className={legalStyles.listItem}>To upload or transmit viruses or any other type of malicious code</li>
          <li className={legalStyles.listItem}>To interfere with or circumvent the security features of the Service</li>
        </ul>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>5. Intellectual Property</h2>
        <p className={legalStyles.paragraph}>
          The Service and its original content (excluding content provided by users), features, and functionality are
          and will remain the exclusive property of FrameLord Systems and its licensors.
        </p>
        <p className={legalStyles.paragraph}>
          The Service is protected by copyright, trademark, and other laws. Our trademarks may not be used in connection
          with any product or service without prior written consent.
        </p>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>6. User Content</h2>
        <p className={legalStyles.paragraph}>
          Our Service allows you to submit, store, and share content including text, images, and other materials ("User Content").
          You retain ownership of your User Content. However, by submitting User Content to the Service, you grant us a license
          to use, modify, and display such content solely for the purpose of providing the Service.
        </p>
        <p className={legalStyles.paragraph}>
          You represent that you have the right to submit any User Content you provide and that such content does not
          violate the rights of any third party.
        </p>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>7. AI-Generated Content</h2>
        <p className={legalStyles.paragraph}>
          The Service uses artificial intelligence to generate analysis, coaching, and other content. While we strive
          for accuracy, AI-generated content is provided for informational purposes only and should not be considered
          professional advice.
        </p>
        <p className={legalStyles.paragraph}>
          You acknowledge that AI-generated content may contain errors or inaccuracies and should not be relied upon
          as the sole basis for important decisions.
        </p>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>8. Payment Terms</h2>
        <p className={legalStyles.paragraph}>
          Certain features of the Service may require payment. By subscribing to a paid plan, you agree to pay the
          applicable fees as described on our pricing page. Fees are non-refundable except as required by law or
          as otherwise specified in these Terms.
        </p>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>9. Termination</h2>
        <p className={legalStyles.paragraph}>
          We may terminate or suspend your account immediately, without prior notice or liability, for any reason,
          including breach of these Terms. Upon termination, your right to use the Service will immediately cease.
        </p>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>10. Limitation of Liability</h2>
        <p className={legalStyles.paragraph}>
          In no event shall FrameLord Systems, its directors, employees, partners, agents, suppliers, or affiliates
          be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of
          profits, data, or goodwill, arising from your use of the Service.
        </p>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>11. Disclaimer</h2>
        <p className={legalStyles.paragraph}>
          The Service is provided "as is" and "as available" without any warranties of any kind, either express or
          implied, including but not limited to implied warranties of merchantability, fitness for a particular
          purpose, and non-infringement.
        </p>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>12. Governing Law</h2>
        <p className={legalStyles.paragraph}>
          These Terms shall be governed by and construed in accordance with the laws of the State of Delaware,
          United States, without regard to its conflict of law provisions.
        </p>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>13. Changes to Terms</h2>
        <p className={legalStyles.paragraph}>
          We reserve the right to modify or replace these Terms at any time. If a revision is material, we will
          provide at least 30 days notice prior to any new terms taking effect. Your continued use of the Service
          after such changes constitutes acceptance of the new Terms.
        </p>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>14. Contact Us</h2>
        <p className={legalStyles.paragraph}>
          If you have any questions about these Terms, please contact us at{' '}
          <a href="mailto:legal@framelord.com" className={legalStyles.link}>legal@framelord.com</a>.
        </p>
      </section>
    </LegalPageLayout>
  );
};

export default TermsOfService;
