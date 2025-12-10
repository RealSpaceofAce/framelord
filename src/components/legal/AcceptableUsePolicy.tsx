// =============================================================================
// ACCEPTABLE USE POLICY PAGE
// =============================================================================

import React from 'react';
import { LegalPageLayout, legalStyles } from './LegalPageLayout';

interface AcceptableUsePolicyProps {
  onBack: () => void;
}

export const AcceptableUsePolicy: React.FC<AcceptableUsePolicyProps> = ({ onBack }) => {
  return (
    <LegalPageLayout
      title="Acceptable Use Policy"
      lastUpdated="December 2024"
      onBack={onBack}
    >
      {/* TODO: Replace placeholder content with final legal copy */}

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>1. Purpose</h2>
        <p className={legalStyles.paragraph}>
          This Acceptable Use Policy ("AUP") outlines the rules and guidelines for using FrameLord's services.
          By using our Service, you agree to comply with this policy. Violations may result in suspension or
          termination of your account.
        </p>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>2. Prohibited Content</h2>
        <p className={legalStyles.paragraph}>You may not use FrameLord to submit, store, or analyze content that:</p>
        <ul className={legalStyles.list}>
          <li className={legalStyles.listItem}>Is illegal, harmful, threatening, abusive, or harassing</li>
          <li className={legalStyles.listItem}>Contains hate speech or promotes discrimination</li>
          <li className={legalStyles.listItem}>Is sexually explicit or pornographic</li>
          <li className={legalStyles.listItem}>Promotes violence or terrorism</li>
          <li className={legalStyles.listItem}>Infringes on intellectual property rights</li>
          <li className={legalStyles.listItem}>Contains malware, viruses, or malicious code</li>
          <li className={legalStyles.listItem}>Violates the privacy rights of others</li>
          <li className={legalStyles.listItem}>Contains sensitive personal data of third parties without consent</li>
          <li className={legalStyles.listItem}>Is designed to manipulate, deceive, or defraud</li>
        </ul>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>3. Prohibited Activities</h2>
        <p className={legalStyles.paragraph}>You may not:</p>
        <ul className={legalStyles.list}>
          <li className={legalStyles.listItem}>Use the Service for any illegal purpose</li>
          <li className={legalStyles.listItem}>Attempt to gain unauthorized access to the Service or its systems</li>
          <li className={legalStyles.listItem}>Interfere with or disrupt the Service or connected networks</li>
          <li className={legalStyles.listItem}>Circumvent rate limits or usage restrictions</li>
          <li className={legalStyles.listItem}>Use automated systems to access the Service without permission</li>
          <li className={legalStyles.listItem}>Impersonate another person or entity</li>
          <li className={legalStyles.listItem}>Sell, resell, or commercially exploit the Service without authorization</li>
          <li className={legalStyles.listItem}>Use the Service to send spam or unsolicited communications</li>
          <li className={legalStyles.listItem}>Collect user information without consent</li>
          <li className={legalStyles.listItem}>Reverse engineer or attempt to extract the source code of the Service</li>
        </ul>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>4. AI Usage Guidelines</h2>
        <p className={legalStyles.paragraph}>When using FrameScan, Little Lord, or other AI-powered features:</p>
        <ul className={legalStyles.list}>
          <li className={legalStyles.listItem}>
            Do not use AI features to generate content for harassment or manipulation of others
          </li>
          <li className={legalStyles.listItem}>
            Do not attempt to "jailbreak" or bypass AI safety measures
          </li>
          <li className={legalStyles.listItem}>
            Do not use AI outputs to impersonate professionals (lawyers, doctors, etc.)
          </li>
          <li className={legalStyles.listItem}>
            Understand that AI analysis is for informational purposes and not professional advice
          </li>
          <li className={legalStyles.listItem}>
            Do not submit content of others without their knowledge for analysis
          </li>
        </ul>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>5. Resource Usage</h2>
        <p className={legalStyles.paragraph}>
          FrameLord implements fair usage limits to ensure quality service for all users. You agree to:
        </p>
        <ul className={legalStyles.list}>
          <li className={legalStyles.listItem}>Respect rate limits and quotas associated with your plan</li>
          <li className={legalStyles.listItem}>Not engage in activities that disproportionately consume server resources</li>
          <li className={legalStyles.listItem}>Not use the Service in a manner that degrades performance for other users</li>
        </ul>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>6. Third-Party Content</h2>
        <p className={legalStyles.paragraph}>
          If you submit third-party content for analysis (such as messages from others), you represent that:
        </p>
        <ul className={legalStyles.list}>
          <li className={legalStyles.listItem}>You have the right to submit such content</li>
          <li className={legalStyles.listItem}>The submission does not violate any applicable laws</li>
          <li className={legalStyles.listItem}>You will use the analysis ethically and responsibly</li>
        </ul>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>7. Reporting Violations</h2>
        <p className={legalStyles.paragraph}>
          If you become aware of any violation of this AUP, please report it to{' '}
          <a href="mailto:abuse@framelord.com" className={legalStyles.link}>abuse@framelord.com</a>.
          We take all reports seriously and will investigate accordingly.
        </p>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>8. Enforcement</h2>
        <p className={legalStyles.paragraph}>
          We reserve the right to investigate any suspected violations of this AUP. If we determine a violation
          has occurred, we may take action including:
        </p>
        <ul className={legalStyles.list}>
          <li className={legalStyles.listItem}>Warning the account holder</li>
          <li className={legalStyles.listItem}>Temporarily suspending access to the Service</li>
          <li className={legalStyles.listItem}>Permanently terminating the account</li>
          <li className={legalStyles.listItem}>Removing violating content</li>
          <li className={legalStyles.listItem}>Reporting illegal activity to law enforcement</li>
        </ul>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>9. Changes to This Policy</h2>
        <p className={legalStyles.paragraph}>
          We may update this AUP from time to time. Continued use of the Service after changes constitutes
          acceptance of the updated policy.
        </p>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>10. Contact Us</h2>
        <p className={legalStyles.paragraph}>
          If you have questions about this Acceptable Use Policy, please contact us at{' '}
          <a href="mailto:legal@framelord.com" className={legalStyles.link}>legal@framelord.com</a>.
        </p>
      </section>
    </LegalPageLayout>
  );
};

export default AcceptableUsePolicy;
