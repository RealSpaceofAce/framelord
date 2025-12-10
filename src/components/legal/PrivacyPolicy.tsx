// =============================================================================
// PRIVACY POLICY PAGE
// =============================================================================

import React from 'react';
import { LegalPageLayout, legalStyles } from './LegalPageLayout';

interface PrivacyPolicyProps {
  onBack: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      lastUpdated="December 2024"
      onBack={onBack}
    >
      {/* TODO: Replace placeholder content with final legal copy */}

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>1. Introduction</h2>
        <p className={legalStyles.paragraph}>
          FrameLord Systems ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy
          explains how we collect, use, disclose, and safeguard your information when you use our Service.
        </p>
        <p className={legalStyles.paragraph}>
          Please read this privacy policy carefully. By using the Service, you consent to the data practices
          described in this policy.
        </p>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>2. Information We Collect</h2>

        <div className={legalStyles.subSection}>
          <h3 className={legalStyles.subSectionTitle}>2.1 Information You Provide</h3>
          <ul className={legalStyles.list}>
            <li className={legalStyles.listItem}>Account information (name, email, password)</li>
            <li className={legalStyles.listItem}>Profile information (avatar, preferences)</li>
            <li className={legalStyles.listItem}>Content you submit for analysis (text, images)</li>
            <li className={legalStyles.listItem}>Notes, contacts, and tasks you create</li>
            <li className={legalStyles.listItem}>Communications with our support team</li>
            <li className={legalStyles.listItem}>Payment information (processed by secure third-party providers)</li>
          </ul>
        </div>

        <div className={legalStyles.subSection}>
          <h3 className={legalStyles.subSectionTitle}>2.2 Information Collected Automatically</h3>
          <ul className={legalStyles.list}>
            <li className={legalStyles.listItem}>Device information (browser type, operating system)</li>
            <li className={legalStyles.listItem}>Usage data (features accessed, time spent)</li>
            <li className={legalStyles.listItem}>IP address and approximate location</li>
            <li className={legalStyles.listItem}>Cookies and similar tracking technologies</li>
          </ul>
        </div>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>3. How We Use Your Information</h2>
        <p className={legalStyles.paragraph}>We use the information we collect to:</p>
        <ul className={legalStyles.list}>
          <li className={legalStyles.listItem}>Provide, maintain, and improve the Service</li>
          <li className={legalStyles.listItem}>Process and complete transactions</li>
          <li className={legalStyles.listItem}>Send you technical notices and support messages</li>
          <li className={legalStyles.listItem}>Respond to your comments and questions</li>
          <li className={legalStyles.listItem}>Provide AI-powered analysis and coaching</li>
          <li className={legalStyles.listItem}>Monitor and analyze usage patterns</li>
          <li className={legalStyles.listItem}>Detect, prevent, and address technical issues</li>
          <li className={legalStyles.listItem}>Comply with legal obligations</li>
        </ul>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>4. AI Processing</h2>
        <p className={legalStyles.paragraph}>
          When you use our FrameScan or Little Lord features, your content is processed by artificial intelligence
          systems. This processing is essential to providing our core services.
        </p>
        <p className={legalStyles.paragraph}>
          <span className={legalStyles.emphasis}>Important:</span> We do not use your personal content to train
          our AI models. Your submitted content is used solely to generate your individual analysis results.
        </p>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>5. Data Sharing and Disclosure</h2>
        <p className={legalStyles.paragraph}>We may share your information in the following situations:</p>
        <ul className={legalStyles.list}>
          <li className={legalStyles.listItem}>
            <span className={legalStyles.emphasis}>Service Providers:</span> Third-party vendors who perform
            services on our behalf (hosting, payment processing, AI inference)
          </li>
          <li className={legalStyles.listItem}>
            <span className={legalStyles.emphasis}>Legal Requirements:</span> When required by law or to protect
            our rights
          </li>
          <li className={legalStyles.listItem}>
            <span className={legalStyles.emphasis}>Business Transfers:</span> In connection with a merger,
            acquisition, or sale of assets
          </li>
          <li className={legalStyles.listItem}>
            <span className={legalStyles.emphasis}>With Your Consent:</span> When you have given us explicit
            permission
          </li>
        </ul>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>6. Data Retention</h2>
        <p className={legalStyles.paragraph}>
          We retain your personal information for as long as your account is active or as needed to provide you
          services. We will retain and use your information as necessary to comply with legal obligations, resolve
          disputes, and enforce our agreements.
        </p>
        <p className={legalStyles.paragraph}>
          You may request deletion of your account and associated data at any time by contacting us.
        </p>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>7. Data Security</h2>
        <p className={legalStyles.paragraph}>
          We implement appropriate technical and organizational measures to protect your personal information.
          However, no method of transmission over the Internet or electronic storage is 100% secure.
        </p>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>8. Your Rights</h2>
        <p className={legalStyles.paragraph}>Depending on your location, you may have the right to:</p>
        <ul className={legalStyles.list}>
          <li className={legalStyles.listItem}>Access the personal data we hold about you</li>
          <li className={legalStyles.listItem}>Request correction of inaccurate data</li>
          <li className={legalStyles.listItem}>Request deletion of your data</li>
          <li className={legalStyles.listItem}>Object to or restrict processing</li>
          <li className={legalStyles.listItem}>Request data portability</li>
          <li className={legalStyles.listItem}>Withdraw consent at any time</li>
        </ul>
        <p className={legalStyles.paragraph}>
          To exercise these rights, please contact us at{' '}
          <a href="mailto:privacy@framelord.com" className={legalStyles.link}>privacy@framelord.com</a>.
        </p>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>9. International Transfers</h2>
        <p className={legalStyles.paragraph}>
          Your information may be transferred to and processed in countries other than your country of residence.
          These countries may have different data protection laws. We take appropriate safeguards to ensure your
          data remains protected.
        </p>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>10. Cookies</h2>
        <p className={legalStyles.paragraph}>
          We use cookies and similar tracking technologies to track activity on our Service and hold certain
          information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being
          sent. However, if you do not accept cookies, you may not be able to use some portions of our Service.
        </p>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>11. Children's Privacy</h2>
        <p className={legalStyles.paragraph}>
          Our Service is not intended for individuals under the age of 18. We do not knowingly collect personal
          information from children. If you are a parent or guardian and believe your child has provided us with
          personal information, please contact us.
        </p>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>12. Changes to This Policy</h2>
        <p className={legalStyles.paragraph}>
          We may update this Privacy Policy from time to time. We will notify you of any changes by posting the
          new Privacy Policy on this page and updating the "Last updated" date.
        </p>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>13. Contact Us</h2>
        <p className={legalStyles.paragraph}>
          If you have any questions about this Privacy Policy, please contact us at{' '}
          <a href="mailto:privacy@framelord.com" className={legalStyles.link}>privacy@framelord.com</a>.
        </p>
      </section>
    </LegalPageLayout>
  );
};

export default PrivacyPolicy;
