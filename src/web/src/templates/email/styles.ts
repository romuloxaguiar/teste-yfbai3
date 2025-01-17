import styled from 'styled-components'; // styled-components@^5.3.0
import { lightTheme } from '../../assets/styles/theme';

// Global constants for email template styling
const EMAIL_MAX_WIDTH = '600px';
const EMAIL_PADDING = '20px';
const EMAIL_SAFE_FONTS = "'Segoe UI', Arial, 'Helvetica Neue', sans-serif";
const EMAIL_BREAKPOINTS = {
  mobile: '320px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1440px'
};

/**
 * Creates responsive styles with email client compatibility
 * @param styles Object containing styles for different breakpoints
 * @param breakpoints Breakpoint definitions
 * @returns CSS string with email client fallbacks
 */
const createResponsiveStyles = (styles: any, breakpoints: any) => {
  let cssString = '';
  
  Object.entries(styles).forEach(([breakpoint, style]) => {
    const width = breakpoints[breakpoint];
    
    // Add MSO conditional comments for Outlook
    cssString += `
      <!--[if mso]>
        <style>
          @media screen and (max-width: ${width}) {
            ${Object.entries(style).map(([prop, value]) => `${prop}: ${value};`).join('\n')}
          }
        </style>
      <![endif]-->
      @media screen and (max-width: ${width}) {
        ${Object.entries(style).map(([prop, value]) => `${prop}: ${value};`).join('\n')}
      }
    `;
  });
  
  return cssString;
};

/**
 * Creates email client safe styles with fallbacks
 * @param styles Base styles object
 * @returns Email-safe CSS string
 */
const createEmailSafeStyles = (styles: any) => {
  const safeStyles = { ...styles };
  
  // Add email client specific prefixes and fallbacks
  if (safeStyles.borderRadius) {
    safeStyles['-webkit-border-radius'] = safeStyles.borderRadius;
    safeStyles['-moz-border-radius'] = safeStyles.borderRadius;
  }
  
  // Convert modern flexbox to table-based layout for Outlook
  if (safeStyles.display === 'flex') {
    safeStyles['display'] = 'table';
    safeStyles['width'] = '100%';
    safeStyles['mso-table-lspace'] = '0pt';
    safeStyles['mso-table-rspace'] = '0pt';
  }
  
  return safeStyles;
};

export const EmailContainer = styled.div`
  max-width: ${EMAIL_MAX_WIDTH};
  margin: 0 auto;
  padding: ${EMAIL_PADDING};
  background-color: ${lightTheme.palette.white};
  font-family: ${EMAIL_SAFE_FONTS};
  color: ${lightTheme.palette.neutralPrimary};
  font-size: ${lightTheme.fonts.medium.fontSize};
  line-height: 1.5;
  -webkit-text-size-adjust: 100%;
  -ms-text-size-adjust: 100%;
  mso-line-height-rule: exactly;
  
  ${createResponsiveStyles({
    mobile: {
      padding: '10px',
      width: '100% !important',
      'max-width': '100% !important'
    }
  }, EMAIL_BREAKPOINTS)}
`;

export const EmailHeader = styled.header`
  padding: ${lightTheme.spacing.md}px;
  border-bottom: 1px solid ${lightTheme.palette.neutralLight};
  text-align: left;
  mso-border-bottom-alt: 1px solid ${lightTheme.palette.neutralLight};
  
  img {
    max-width: 150px;
    height: auto;
    -ms-interpolation-mode: bicubic;
  }
`;

export const EmailBody = styled.main`
  padding: ${lightTheme.spacing.lg}px ${lightTheme.spacing.md}px;
  background-color: ${lightTheme.palette.white};
  
  h1 {
    font-family: ${EMAIL_SAFE_FONTS};
    font-size: ${lightTheme.fonts.xLarge.fontSize};
    font-weight: ${lightTheme.fonts.xLarge.fontWeight};
    margin: 0 0 ${lightTheme.spacing.md}px 0;
    color: ${lightTheme.palette.neutralPrimary};
    mso-line-height-rule: exactly;
  }
  
  h2 {
    font-family: ${EMAIL_SAFE_FONTS};
    font-size: ${lightTheme.fonts.large.fontSize};
    font-weight: ${lightTheme.fonts.large.fontWeight};
    margin: ${lightTheme.spacing.lg}px 0 ${lightTheme.spacing.sm}px 0;
    color: ${lightTheme.palette.neutralPrimary};
    mso-line-height-rule: exactly;
  }
  
  p {
    margin: 0 0 ${lightTheme.spacing.md}px 0;
    color: ${lightTheme.palette.neutralSecondary};
  }
  
  ul, ol {
    margin: ${lightTheme.spacing.sm}px 0;
    padding-left: ${lightTheme.spacing.lg}px;
  }
  
  li {
    margin: ${lightTheme.spacing.xs}px 0;
    color: ${lightTheme.palette.neutralSecondary};
  }
  
  ${createResponsiveStyles({
    mobile: {
      padding: `${lightTheme.spacing.md}px ${lightTheme.spacing.sm}px`,
      'font-size': '14px'
    }
  }, EMAIL_BREAKPOINTS)}
`;

export const EmailFooter = styled.footer`
  padding: ${lightTheme.spacing.md}px;
  border-top: 1px solid ${lightTheme.palette.neutralLight};
  text-align: center;
  font-size: ${lightTheme.fonts.medium.fontSize};
  color: ${lightTheme.palette.neutralSecondary};
  mso-border-top-alt: 1px solid ${lightTheme.palette.neutralLight};
  
  a {
    color: ${lightTheme.palette.themePrimary};
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
      color: ${lightTheme.palette.themeDarker};
    }
  }
  
  p {
    margin: ${lightTheme.spacing.xs}px 0;
  }
`;

export const ActionButton = styled.a`
  display: inline-block;
  padding: ${lightTheme.spacing.sm}px ${lightTheme.spacing.lg}px;
  background-color: ${lightTheme.palette.themePrimary};
  color: ${lightTheme.palette.white} !important;
  text-decoration: none;
  border-radius: ${lightTheme.effects.roundedCorner2};
  mso-padding-alt: ${lightTheme.spacing.sm}px ${lightTheme.spacing.lg}px;
  
  <!--[if mso]>
  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
    style="height:40px;v-text-anchor:middle;width:200px;" arcsize="10%">
    <v:fill type="solid" color="${lightTheme.palette.themePrimary}"/>
    <w:anchorlock/>
    <center style="color:${lightTheme.palette.white};font-family:${EMAIL_SAFE_FONTS};font-size:16px;">
      View Minutes
    </center>
  </v:roundrect>
  <![endif]-->
  
  &:hover {
    background-color: ${lightTheme.palette.themeDarker};
    text-decoration: none;
  }
`;

export const Divider = styled.hr`
  border: 0;
  border-top: 1px solid ${lightTheme.palette.neutralLight};
  margin: ${lightTheme.spacing.md}px 0;
  mso-border-top-alt: 1px solid ${lightTheme.palette.neutralLight};
`;