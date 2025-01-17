import { Configuration, LogLevel } from '@azure/msal-browser'; // @azure/msal-browser ^2.32.0

/**
 * MSAL configuration object for Azure AD B2C authentication
 * Configures authentication parameters, cache handling, and system settings
 */
export const msalConfig: Configuration = {
    auth: {
        clientId: process.env.VITE_AUTH_CLIENT_ID as string,
        authority: process.env.VITE_AUTH_AUTHORITY as string,
        redirectUri: process.env.VITE_AUTH_REDIRECT_URI as string,
        knownAuthorities: [process.env.VITE_AUTH_KNOWN_AUTHORITIES as string],
        postLogoutRedirectUri: '/',
        navigateToLoginRequestUrl: true,
        validateAuthority: true
    },
    cache: {
        cacheLocation: 'localStorage',
        storeAuthStateInCookie: false,
        secureCookies: true
    },
    system: {
        loggerOptions: {
            loggerCallback: (level: LogLevel, message: string, containsPii: boolean) => {
                if (containsPii) {
                    return;
                }
                switch (level) {
                    case LogLevel.Error:
                        console.error(message);
                        break;
                    case LogLevel.Warning:
                        console.warn(message);
                        break;
                    case LogLevel.Info:
                        console.info(message);
                        break;
                    case LogLevel.Verbose:
                        console.debug(message);
                        break;
                    default:
                        console.log(message);
                }
            },
            logLevel: LogLevel.Info,
            piiLoggingEnabled: false
        },
        windowHashTimeout: 60000,
        iframeHashTimeout: 6000,
        loadFrameTimeout: 0
    }
};

/**
 * Login request configuration defining required authentication scopes
 */
export const loginRequest = {
    scopes: [
        'openid',
        'profile',
        'offline_access',
        'https://meetingminutesb2c.onmicrosoft.com/api/user.read',
        'https://meetingminutesb2c.onmicrosoft.com/api/minutes.read',
        'https://meetingminutesb2c.onmicrosoft.com/api/minutes.write'
    ]
};

/**
 * Token request configuration for secure API access
 */
export const tokenRequest = {
    scopes: [
        'https://meetingminutesb2c.onmicrosoft.com/api/user.read',
        'https://meetingminutesb2c.onmicrosoft.com/api/minutes.read',
        'https://meetingminutesb2c.onmicrosoft.com/api/minutes.write'
    ]
};

/**
 * Authentication endpoints and B2C policy configurations
 */
export const authConfig = {
    endpoints: {
        apiBaseUrl: '/api/v1',
        authBaseUrl: process.env.VITE_AUTH_AUTHORITY as string,
        tokenEndpoint: `${process.env.VITE_AUTH_AUTHORITY as string}/oauth2/v2.0/token`,
        authorizeEndpoint: `${process.env.VITE_AUTH_AUTHORITY as string}/oauth2/v2.0/authorize`,
        logoutEndpoint: `${process.env.VITE_AUTH_AUTHORITY as string}/oauth2/v2.0/logout`,
        userInfoEndpoint: `${process.env.VITE_AUTH_AUTHORITY as string}/oauth2/v2.0/userinfo`
    },
    policies: {
        signUpSignIn: 'B2C_1_signupsignin',
        resetPassword: 'B2C_1_passwordreset',
        editProfile: 'B2C_1_profileediting'
    }
};