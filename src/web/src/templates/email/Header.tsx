import React from 'react'; // ^18.0.0
import { format } from 'date-fns'; // ^2.30.0
import { EmailHeader, EmailHeading, EmailText } from './styles';
import logo from '../../assets/images/logo.svg';

interface EmailHeaderProps {
  /** Meeting title */
  title: string;
  /** Meeting date and time */
  date: Date;
  /** Meeting organizer details */
  organizer: {
    name: string;
    email: string;
  };
}

/**
 * Email template header component that displays organization branding and meeting metadata
 * following Microsoft Teams design system.
 * 
 * @param props - Component props containing meeting details
 * @returns Rendered header component with branding and meeting information
 */
export const Header: React.FC<EmailHeaderProps> = ({ title, date, organizer }) => {
  const formattedDate = format(date, 'MMMM d, yyyy h:mm a');

  return (
    <EmailHeader>
      {/* Organization logo with accessibility attributes */}
      <img 
        src={logo} 
        alt="Meeting Minutes System Logo" 
        width="150" 
        height="auto"
        style={{ 
          display: 'block',
          marginBottom: '16px'
        }}
      />

      {/* Meeting title */}
      <EmailHeading>
        {title}
      </EmailHeading>

      {/* Meeting metadata */}
      <EmailText>
        Date: {formattedDate}
      </EmailText>
      
      <EmailText>
        Organizer: {organizer.name} ({organizer.email})
      </EmailText>

      {/* MSO conditional comment for Outlook compatibility */}
      {`<!--[if mso]>
        <table role="presentation" width="100%" style="margin-bottom: 16px;">
          <tr>
            <td style="padding: 0;">
              <img src="${logo}" alt="Meeting Minutes System Logo" width="150" height="auto" style="display: block;" />
            </td>
          </tr>
        </table>
      <![endif]-->`}
    </EmailHeader>
  );
};

export type { EmailHeaderProps };