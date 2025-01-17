import React from 'react'; // react@^18.0.0
import { EmailList, EmailHeading, EmailText } from './styles';
import type { WebTopic } from '../../types/minutes.types';

interface TopicsProps {
  topics: WebTopic[];
  highContrastMode: boolean;
}

/**
 * Renders a single topic with email-safe indentation and styling
 * @param topic Topic data to render
 * @param depth Current nesting depth for indentation
 * @param highContrastMode Whether high contrast mode is enabled
 */
const renderTopic = (topic: WebTopic, depth: number, highContrastMode: boolean): JSX.Element => {
  // Email-safe indentation using non-breaking spaces
  const indent = '\u00A0'.repeat(depth * 4);
  
  // Calculate confidence indicator characters based on score
  const confidenceIndicator = topic.confidence >= 0.9 ? '★' : 
                            topic.confidence >= 0.7 ? '☆' : '';
  
  // VML-based bullet for Outlook compatibility
  const bulletPoint = `
    <!--[if mso]>
    <v:oval style="width:6px;height:6px;margin-right:8px;" fillcolor="${highContrastMode ? '#FFFFFF' : '#605e5c'}">
      <w:anchorlock/>
    </v:oval>
    <![endif]-->
    <!--[if !mso]><!-->
    •
    <!--<![endif]-->
  `;

  return (
    <React.Fragment key={topic.id}>
      {/* Topic title with confidence indicator */}
      <EmailList.Item
        role="listitem"
        aria-level={depth + 1}
        style={{
          marginLeft: `${depth * 20}px`,
          color: highContrastMode ? '#FFFFFF' : '#323130'
        }}
      >
        <span dangerouslySetInnerHTML={{ __html: bulletPoint }} />
        <EmailText
          style={{
            fontWeight: depth === 0 ? 600 : 400,
            fontSize: `${18 - depth}px`
          }}
        >
          {indent}{topic.title} {confidenceIndicator}
        </EmailText>
      </EmailList.Item>

      {/* Topic content if available */}
      {topic.content && (
        <EmailText
          style={{
            marginLeft: `${(depth + 1) * 20}px`,
            color: highContrastMode ? '#FFFFFF' : '#605e5c',
            fontSize: '14px'
          }}
        >
          {topic.content}
        </EmailText>
      )}

      {/* Recursively render subtopics */}
      {topic.subtopics?.length > 0 && (
        <EmailList role="list" aria-label={`Subtopics of ${topic.title}`}>
          {topic.subtopics.map(subtopic => 
            renderTopic(subtopic, depth + 1, highContrastMode)
          )}
        </EmailList>
      )}
    </React.Fragment>
  );
};

/**
 * Topics component for email templates with enhanced client compatibility
 * Implements Teams design system and accessibility features
 */
const Topics: React.FC<TopicsProps> = ({ topics, highContrastMode }) => {
  if (!topics?.length) {
    return null;
  }

  return (
    <section role="region" aria-label="Meeting Topics">
      {/* Section heading with email-safe styling */}
      <EmailHeading
        style={{
          color: highContrastMode ? '#FFFFFF' : '#323130',
          marginBottom: '16px',
          fontSize: '20px',
          fontWeight: 600
        }}
      >
        KEY TOPICS
      </EmailHeading>

      {/* Topics list with semantic structure */}
      <EmailList
        role="list"
        aria-label="Meeting topics list"
        style={{
          marginTop: 0,
          marginBottom: '24px'
        }}
      >
        {topics.map(topic => renderTopic(topic, 0, highContrastMode))}
      </EmailList>

      {/* Outlook-specific table-based layout fallback */}
      {'<!--[if mso]>'}
      <table width="100%" cellPadding="0" cellSpacing="0" style={{ msoTableLspace: '0pt', msoTableRspace: '0pt' }}>
        <tr>
          <td style={{ padding: '0' }}>
            <![endif]-->'}
            {/* Content rendered above */}
            {'<!--[if mso]>'}
          </td>
        </tr>
      </table>
      <![endif]-->'}
    </section>
  );
};

export default Topics;