// Diagnostic component to debug BlockSuite issues
import { useEffect, useState } from 'react';

interface DiagnosticInfo {
  browser: string;
  userAgent: string;
  webComponents: boolean;
  shadowDOM: boolean;
  customElements: boolean;
  blockSuiteLoaded: boolean;
  blockSuiteDetails: string;
  errors: string[];
}

export function BlockSuiteDiagnostics() {
  const [info, setInfo] = useState<DiagnosticInfo | null>(null);

  useEffect(() => {
    const errors: string[] = [];

    // Check browser
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edg')) browser = 'Edge';

    // Check Web Components support
    const hasWebComponents = 'customElements' in window;
    const hasShadowDOM = 'attachShadow' in Element.prototype;
    const hasCustomElements = typeof customElements !== 'undefined';

    // Check if BlockSuite loaded
    let blockSuiteLoaded = false;
    let blockSuiteDetails = '';
    try {
      // Try to import BlockSuite
      const hasAffineEditor = customElements?.get('affine-editor-container');
      blockSuiteLoaded = !!hasAffineEditor;

      // Check for specific BlockSuite elements
      const edgelessToolbar = customElements?.get('edgeless-toolbar');
      const colorPanel = customElements?.get('edgeless-color-panel');
      blockSuiteDetails = `Editor: ${!!hasAffineEditor}, Toolbar: ${!!edgelessToolbar}, ColorPanel: ${!!colorPanel}`;

      // Check if effects have run
      const effectsRan = (window as any).__blocksuiteEffectsInitialized;
      blockSuiteDetails += `, Effects: ${!!effectsRan}`;
    } catch (e) {
      errors.push(`BlockSuite check error: ${e}`);
    }

    setInfo({
      browser,
      userAgent: ua,
      webComponents: hasWebComponents,
      shadowDOM: hasShadowDOM,
      customElements: hasCustomElements,
      blockSuiteLoaded,
      blockSuiteDetails,
      errors
    });
  }, []);

  if (!info) return <div>Loading diagnostics...</div>;

  return (
    <div style={{
      position: 'fixed',
      top: 10,
      right: 10,
      background: '#1e2028',
      color: '#fff',
      padding: '20px',
      borderRadius: '8px',
      border: '1px solid rgba(99, 102, 241, 0.3)',
      maxWidth: '400px',
      fontSize: '12px',
      zIndex: 999999,
      boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
    }}>
      <h3 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 600 }}>
        BlockSuite Diagnostics
      </h3>

      <div style={{ marginBottom: '8px' }}>
        <strong>Browser:</strong> {info.browser}
      </div>

      <div style={{ marginBottom: '8px' }}>
        <strong>Web Components:</strong>{' '}
        <span style={{ color: info.webComponents ? '#10b981' : '#ef4444' }}>
          {info.webComponents ? '✓' : '✗'}
        </span>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <strong>Shadow DOM:</strong>{' '}
        <span style={{ color: info.shadowDOM ? '#10b981' : '#ef4444' }}>
          {info.shadowDOM ? '✓' : '✗'}
        </span>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <strong>Custom Elements:</strong>{' '}
        <span style={{ color: info.customElements ? '#10b981' : '#ef4444' }}>
          {info.customElements ? '✓' : '✗'}
        </span>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <strong>BlockSuite Loaded:</strong>{' '}
        <span style={{ color: info.blockSuiteLoaded ? '#10b981' : '#ef4444' }}>
          {info.blockSuiteLoaded ? '✓' : '✗'}
        </span>
      </div>

      {info.blockSuiteDetails && (
        <div style={{ marginBottom: '8px', fontSize: '11px', color: '#9ca3af' }}>
          {info.blockSuiteDetails}
        </div>
      )}

      {info.errors.length > 0 && (
        <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '4px' }}>
          <strong>Errors:</strong>
          {info.errors.map((err, i) => (
            <div key={i} style={{ marginTop: '4px', fontSize: '11px', color: '#ef4444' }}>
              {err}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '12px', fontSize: '10px', color: '#6b7280' }}>
        User Agent: {info.userAgent.substring(0, 60)}...
      </div>
    </div>
  );
}
