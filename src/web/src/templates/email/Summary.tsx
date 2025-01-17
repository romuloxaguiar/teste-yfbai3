import React from 'react'; // react@^18.0.0
import { EmailHeading, EmailText } from './styles';
import type { WebMinutes } from '../../types/minutes.types';

/**
 * Props interface for Summary component with enhanced validation
 */
interface SummaryProps {
  minutes: WebMinutes;
}

/**
 * Renders the meeting summary section in email template with enhanced accessibility and email client compatibility
 * Implements Teams design system with responsive layout and RTL support
 */
const Summary: React.FC<SummaryProps> = React.memo(({ minutes }) => {
  // Validate summary content
  const hasSummary = minutes.summary && minutes.summary.trim().length > 0;
  const fallbackContent = 'No meeting summary is available.';

  return (
    <section 
      role="region" 
      aria-label="Meeting Summary"
      dir="auto" // Support RTL languages
    >
      {/* MSO conditional comments for Outlook compatibility */}
      {`<!--[if mso]>
        <table role="presentation" width="100%" style="width:100%;"><tr><td>
      <![endif]-->`}

      <EmailHeading
        role="heading"
        aria-level={2}
        style={{
          marginBottom: '16px',
          msoLineHeightRule: 'exactly',
          msoMarginBottomAlt: '16px'
        }}
      >
        Summary
      </EmailHeading>

      <EmailText
        role="contentinfo"
        aria-label={hasSummary ? 'Meeting summary content' : 'No summary available'}
        style={{
          marginBottom: '24px',
          msoLineHeightRule: 'exactly',
          msoMarginBottomAlt: '24px'
        }}
      >
        {hasSummary ? minutes.summary : fallbackContent}
      </EmailText>

      {/* Close MSO conditional wrapper */}
      {`<!--[if mso]>
        </td></tr></table>
      <![endif]-->`}
    </section>
  );
});

// Set display name for debugging
Summary.displayName = 'Summary';

export default Summary;