import React from 'react'; // ^18.0.0
import { WebActionItem } from '../../types/minutes.types';
import { EmailList, EmailText } from './styles';
import { lightTheme } from '../../assets/styles/theme';

interface ActionItemsProps {
  actionItems: WebActionItem[];
  confidenceThreshold?: number;
  highContrastMode?: boolean;
}

/**
 * Formats a due date for email display with client compatibility
 * @param date Due date to format or null
 * @returns Formatted date string or empty string
 */
const formatDueDate = (date: Date | null): string => {
  if (!date) return '';
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  
  return formatter.format(date);
};

/**
 * Renders a priority indicator with VML fallback for Outlook
 * @param priority Priority level of the action item
 * @param highContrastMode Whether high contrast mode is enabled
 * @returns JSX element with email client fallbacks
 */
const renderPriorityIndicator = (priority: string, highContrastMode: boolean): JSX.Element => {
  const getPriorityColor = () => {
    if (highContrastMode) {
      return priority === 'HIGH' ? '#ffff00' : priority === 'MEDIUM' ? '#ffffff' : '#808080';
    }
    return priority === 'HIGH' ? lightTheme.palette.redDark : 
           priority === 'MEDIUM' ? lightTheme.palette.themePrimary : 
           lightTheme.palette.neutralTertiary;
  };

  const color = getPriorityColor();
  
  return (
    <>
      {/* VML fallback for Outlook */}
      <div style={{ display: 'none' }}>
        <!--[if mso]>
        <v:oval style="width:12px;height:12px" fillcolor="${color}">
          <v:fill type="solid" color="${color}"/>
        </v:oval>
        <![endif]-->
      </div>
      
      {/* Modern email clients */}
      <div style={{
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        backgroundColor: color,
        display: 'inline-block',
        marginRight: '8px',
        verticalAlign: 'middle'
      }} 
      aria-label={`Priority: ${priority}`}
      role="img" />
    </>
  );
};

/**
 * Renders the action items section in email templates with enhanced accessibility
 * and email client compatibility
 */
const ActionItems: React.FC<ActionItemsProps> = ({ 
  actionItems, 
  confidenceThreshold = 0.8,
  highContrastMode = false 
}) => {
  if (!actionItems || actionItems.length === 0) {
    return (
      <EmailText role="region" aria-label="Action Items">
        <p style={{ color: highContrastMode ? '#ffffff' : lightTheme.palette.neutralSecondary }}>
          No action items were identified in this meeting.
        </p>
      </EmailText>
    );
  }

  return (
    <div role="region" aria-label="Action Items">
      {/* Table structure for maximum email client compatibility */}
      <table 
        cellPadding="0" 
        cellSpacing="0" 
        border="0" 
        width="100%" 
        style={{ 
          borderCollapse: 'collapse',
          msoTableLspace: '0pt',
          msoTableRspace: '0pt'
        }}
      >
        <thead>
          <tr>
            <th 
              align="left" 
              style={{ 
                padding: '12px 8px',
                borderBottom: `1px solid ${highContrastMode ? '#ffffff' : lightTheme.palette.neutralLight}`,
                color: highContrastMode ? '#ffffff' : lightTheme.palette.neutralPrimary,
                fontFamily: lightTheme.fonts.medium.fontFamily,
                fontSize: lightTheme.fonts.medium.fontSize,
                fontWeight: 600
              }}
            >
              Action Items
            </th>
          </tr>
        </thead>
        <tbody>
          {actionItems.map((item) => (
            <tr key={item.id}>
              <td style={{ padding: '12px 8px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {renderPriorityIndicator(item.priority, highContrastMode)}
                  <div style={{ flex: 1 }}>
                    <EmailText
                      style={{ 
                        color: highContrastMode ? '#ffffff' : lightTheme.palette.neutralPrimary,
                        marginBottom: '4px'
                      }}
                    >
                      {item.description}
                      {item.confidence < confidenceThreshold && (
                        <span 
                          style={{ 
                            color: highContrastMode ? '#ffff00' : lightTheme.palette.neutralTertiary,
                            fontSize: '12px',
                            marginLeft: '8px'
                          }}
                        >
                          (AI Confidence: {Math.round(item.confidence * 100)}%)
                        </span>
                      )}
                    </EmailText>
                    <div style={{ 
                      fontSize: '12px',
                      color: highContrastMode ? '#ffffff' : lightTheme.palette.neutralSecondary
                    }}>
                      <span>Assigned to: </span>
                      <span style={{ fontWeight: 600 }}>{item.assigneeId}</span>
                      {item.dueDate && (
                        <>
                          <span style={{ margin: '0 8px' }}>•</span>
                          <span>Due: {formatDueDate(item.dueDate)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ActionItems;