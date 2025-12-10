// =============================================================================
// DATA PROCESSING ADDENDUM (DPA) PAGE
// =============================================================================

import React from 'react';
import { LegalPageLayout, legalStyles } from './LegalPageLayout';

interface DataProcessingAddendumProps {
  onBack: () => void;
}

export const DataProcessingAddendum: React.FC<DataProcessingAddendumProps> = ({ onBack }) => {
  return (
    <LegalPageLayout
      title="Data Processing Addendum"
      lastUpdated="December 2024"
      onBack={onBack}
    >
      {/* TODO: Replace placeholder content with final legal copy */}

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>1. Introduction</h2>
        <p className={legalStyles.paragraph}>
          This Data Processing Addendum ("DPA") forms part of the Terms of Service between FrameLord Systems
          ("Processor," "we," "us") and you ("Controller," "Customer") and governs our processing of personal
          data on your behalf.
        </p>
        <p className={legalStyles.paragraph}>
          This DPA applies where we process personal data as a data processor on behalf of you as a data controller.
        </p>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>2. Definitions</h2>
        <ul className={legalStyles.list}>
          <li className={legalStyles.listItem}>
            <span className={legalStyles.emphasis}>"Personal Data"</span> means any information relating to an
            identified or identifiable natural person.
          </li>
          <li className={legalStyles.listItem}>
            <span className={legalStyles.emphasis}>"Processing"</span> means any operation performed on Personal Data,
            including collection, storage, use, and deletion.
          </li>
          <li className={legalStyles.listItem}>
            <span className={legalStyles.emphasis}>"Data Subject"</span> means the individual to whom Personal Data relates.
          </li>
          <li className={legalStyles.listItem}>
            <span className={legalStyles.emphasis}>"Sub-processor"</span> means any third party engaged by us to process
            Personal Data on your behalf.
          </li>
          <li className={legalStyles.listItem}>
            <span className={legalStyles.emphasis}>"Applicable Data Protection Laws"</span> means all laws relating to
            data protection and privacy, including GDPR, CCPA, and other applicable regulations.
          </li>
        </ul>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>3. Scope of Processing</h2>
        <div className={legalStyles.subSection}>
          <h3 className={legalStyles.subSectionTitle}>3.1 Subject Matter</h3>
          <p className={legalStyles.paragraph}>
            The subject matter of the data processing is the provision of the FrameLord Service, including
            AI-powered communication analysis, coaching evaluation, and CRM functionality.
          </p>
        </div>
        <div className={legalStyles.subSection}>
          <h3 className={legalStyles.subSectionTitle}>3.2 Duration</h3>
          <p className={legalStyles.paragraph}>
            Processing will continue for the duration of your use of the Service, unless otherwise agreed
            in writing or required by law.
          </p>
        </div>
        <div className={legalStyles.subSection}>
          <h3 className={legalStyles.subSectionTitle}>3.3 Nature and Purpose</h3>
          <p className={legalStyles.paragraph}>
            We process Personal Data to provide the Service, including text and image analysis, generating
            insights, storing user content, and facilitating communication management.
          </p>
        </div>
        <div className={legalStyles.subSection}>
          <h3 className={legalStyles.subSectionTitle}>3.4 Types of Personal Data</h3>
          <ul className={legalStyles.list}>
            <li className={legalStyles.listItem}>Contact information (names, email addresses)</li>
            <li className={legalStyles.listItem}>Communication content submitted for analysis</li>
            <li className={legalStyles.listItem}>User-generated notes and records</li>
            <li className={legalStyles.listItem}>Usage data and analytics</li>
          </ul>
        </div>
        <div className={legalStyles.subSection}>
          <h3 className={legalStyles.subSectionTitle}>3.5 Categories of Data Subjects</h3>
          <ul className={legalStyles.list}>
            <li className={legalStyles.listItem}>Customers and their authorized users</li>
            <li className={legalStyles.listItem}>Individuals whose data is submitted by Customers</li>
          </ul>
        </div>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>4. Processor Obligations</h2>
        <p className={legalStyles.paragraph}>We agree to:</p>
        <ul className={legalStyles.list}>
          <li className={legalStyles.listItem}>
            Process Personal Data only on documented instructions from you
          </li>
          <li className={legalStyles.listItem}>
            Ensure that persons authorized to process Personal Data have committed to confidentiality
          </li>
          <li className={legalStyles.listItem}>
            Implement appropriate technical and organizational security measures
          </li>
          <li className={legalStyles.listItem}>
            Engage Sub-processors only with your prior authorization and subject to equivalent data protection obligations
          </li>
          <li className={legalStyles.listItem}>
            Assist you in responding to Data Subject requests
          </li>
          <li className={legalStyles.listItem}>
            Assist you in ensuring compliance with security, breach notification, and impact assessment obligations
          </li>
          <li className={legalStyles.listItem}>
            Delete or return all Personal Data upon termination of the Service, unless retention is required by law
          </li>
          <li className={legalStyles.listItem}>
            Make available information necessary to demonstrate compliance with this DPA
          </li>
        </ul>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>5. Controller Obligations</h2>
        <p className={legalStyles.paragraph}>You agree to:</p>
        <ul className={legalStyles.list}>
          <li className={legalStyles.listItem}>
            Ensure that your use of the Service complies with Applicable Data Protection Laws
          </li>
          <li className={legalStyles.listItem}>
            Provide lawful processing instructions
          </li>
          <li className={legalStyles.listItem}>
            Obtain all necessary consents and provide all required notices to Data Subjects
          </li>
          <li className={legalStyles.listItem}>
            Ensure that you have the right to transfer Personal Data to us for processing
          </li>
        </ul>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>6. Sub-processors</h2>
        <p className={legalStyles.paragraph}>
          You authorize us to engage Sub-processors to assist in providing the Service. We maintain a list
          of current Sub-processors, which is available upon request.
        </p>
        <p className={legalStyles.paragraph}>
          We will notify you of any intended changes to Sub-processors and provide you an opportunity to
          object. If you reasonably object, we will work with you to find an alternative solution.
        </p>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>7. Security Measures</h2>
        <p className={legalStyles.paragraph}>
          We implement and maintain appropriate technical and organizational measures to protect Personal Data,
          including:
        </p>
        <ul className={legalStyles.list}>
          <li className={legalStyles.listItem}>Encryption of Personal Data in transit and at rest</li>
          <li className={legalStyles.listItem}>Access controls and authentication mechanisms</li>
          <li className={legalStyles.listItem}>Regular security assessments and testing</li>
          <li className={legalStyles.listItem}>Employee training on data protection</li>
          <li className={legalStyles.listItem}>Incident response and breach notification procedures</li>
        </ul>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>8. Data Breach Notification</h2>
        <p className={legalStyles.paragraph}>
          In the event of a Personal Data breach, we will notify you without undue delay after becoming aware
          of the breach. The notification will include:
        </p>
        <ul className={legalStyles.list}>
          <li className={legalStyles.listItem}>A description of the nature of the breach</li>
          <li className={legalStyles.listItem}>Categories and approximate number of Data Subjects affected</li>
          <li className={legalStyles.listItem}>Likely consequences of the breach</li>
          <li className={legalStyles.listItem}>Measures taken or proposed to address the breach</li>
        </ul>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>9. Data Subject Rights</h2>
        <p className={legalStyles.paragraph}>
          We will assist you in fulfilling your obligations to respond to Data Subject requests, including
          requests for access, rectification, erasure, restriction, portability, and objection to processing.
        </p>
        <p className={legalStyles.paragraph}>
          If we receive a request directly from a Data Subject, we will promptly notify you unless prohibited
          by law.
        </p>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>10. International Transfers</h2>
        <p className={legalStyles.paragraph}>
          Where Personal Data is transferred outside the EEA or other jurisdiction with data transfer
          restrictions, we ensure appropriate safeguards are in place, which may include:
        </p>
        <ul className={legalStyles.list}>
          <li className={legalStyles.listItem}>Standard Contractual Clauses approved by the European Commission</li>
          <li className={legalStyles.listItem}>Binding Corporate Rules</li>
          <li className={legalStyles.listItem}>Adequacy decisions</li>
          <li className={legalStyles.listItem}>Other lawful transfer mechanisms</li>
        </ul>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>11. Audits</h2>
        <p className={legalStyles.paragraph}>
          Upon reasonable request and subject to confidentiality obligations, we will make available
          information necessary to demonstrate compliance with this DPA. You may conduct audits, including
          inspections, at our premises or through a mutually agreed third-party auditor.
        </p>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>12. Termination</h2>
        <p className={legalStyles.paragraph}>
          Upon termination of the Service, we will, at your choice, delete or return all Personal Data
          and delete existing copies unless retention is required by applicable law. We will certify
          deletion upon request.
        </p>
      </section>

      <section className={legalStyles.section}>
        <h2 className={legalStyles.sectionTitle}>13. Contact</h2>
        <p className={legalStyles.paragraph}>
          For questions about this DPA or to exercise your rights under it, please contact our Data
          Protection Officer at{' '}
          <a href="mailto:dpo@framelord.com" className={legalStyles.link}>dpo@framelord.com</a>.
        </p>
      </section>
    </LegalPageLayout>
  );
};

export default DataProcessingAddendum;
