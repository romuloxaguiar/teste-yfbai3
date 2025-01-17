import { PublicClientApplication, AccountInfo, AuthenticationResult, InteractionRequiredAuthError } from '@azure/msal-browser'; // @azure/msal-browser ^2.32.0
import { msalConfig, loginRequest, tokenRequest } from '../config/auth.config';

// Constants for authentication service
const AUTH_STORAGE_KEY = 'auth_state';
const TOKEN_REFRESH_INTERVAL = 300000; // 5 minutes
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Service class for handling authentication operations using Azure AD B2C
 * Manages user authentication, token management, and session handling
 */
export class AuthService {
    private msalInstance: PublicClientApplication;
    private currentAccount: AccountInfo | null;
    private tokenRefreshTimer: NodeJS.Timer | null;
    private isRefreshing: boolean;

    constructor() {
        this.msalInstance = new PublicClientApplication(msalConfig);
        this.currentAccount = null;
        this.tokenRefreshTimer = null;
        this.isRefreshing = false;

        // Restore authentication state if exists
        this.restoreAuthState();
        
        // Setup automatic token refresh
        this.setupTokenRefresh();
    }

    /**
     * Handles user login through Azure AD B2C
     * @returns Promise<void>
     * @throws Error if login fails
     */
    public async login(): Promise<void> {
        try {
            // Clear any existing auth state
            await this.clearAuthState();

            // Attempt login with popup
            const response = await this.msalInstance.loginPopup(loginRequest);
            
            if (response) {
                await this.handleResponse(response);
                this.setupTokenRefresh();
                
                // Emit authentication success event
                window.dispatchEvent(new CustomEvent('auth:login', {
                    detail: { account: this.currentAccount }
                }));
            }
        } catch (error) {
            console.error('Login failed:', error);
            
            // Handle specific error types
            if (error instanceof InteractionRequiredAuthError) {
                throw new Error('Interactive login required');
            }
            
            throw new Error('Authentication failed');
        }
    }

    /**
     * Handles user logout with cleanup
     * @returns Promise<void>
     */
    public async logout(): Promise<void> {
        try {
            if (this.tokenRefreshTimer) {
                clearInterval(this.tokenRefreshTimer);
                this.tokenRefreshTimer = null;
            }

            this.currentAccount = null;
            localStorage.removeItem(AUTH_STORAGE_KEY);

            await this.msalInstance.logoutPopup();

            // Emit logout event
            window.dispatchEvent(new CustomEvent('auth:logout'));
            
            this.isRefreshing = false;
        } catch (error) {
            console.error('Logout failed:', error);
            throw new Error('Logout failed');
        }
    }

    /**
     * Retrieves access token with automatic refresh handling
     * @returns Promise<string>
     * @throws Error if token acquisition fails
     */
    public async getToken(): Promise<string> {
        if (!this.currentAccount) {
            return '';
        }

        try {
            // Check if token is being refreshed
            if (this.isRefreshing) {
                await this.waitForRefresh();
            }

            // Attempt silent token acquisition
            const response = await this.msalInstance.acquireTokenSilent({
                ...tokenRequest,
                account: this.currentAccount
            });

            return response.accessToken;
        } catch (error) {
            if (error instanceof InteractionRequiredAuthError) {
                // Token expired or requires interaction
                try {
                    const response = await this.msalInstance.acquireTokenPopup(tokenRequest);
                    return response.accessToken;
                } catch (popupError) {
                    console.error('Token acquisition failed:', popupError);
                    throw new Error('Failed to acquire access token');
                }
            }
            throw error;
        }
    }

    /**
     * Gets current authenticated user information
     * @returns AccountInfo | null
     */
    public getCurrentUser(): AccountInfo | null {
        if (!this.currentAccount) {
            return null;
        }

        // Validate account claims
        if (!this.validateAccountClaims(this.currentAccount)) {
            return null;
        }

        return this.currentAccount;
    }

    /**
     * Handles authentication response with enhanced security
     * @param response AuthenticationResult
     * @private
     */
    private async handleResponse(response: AuthenticationResult): Promise<void> {
        if (!response || !response.account) {
            throw new Error('Invalid authentication response');
        }

        // Validate response integrity
        if (!this.validateAuthResponse(response)) {
            throw new Error('Invalid authentication response');
        }

        this.currentAccount = response.account;

        // Store auth state securely
        this.storeAuthState();

        // Setup token refresh timer
        this.setupTokenRefresh();
    }

    /**
     * Sets up automatic token refresh
     * @private
     */
    private setupTokenRefresh(): void {
        if (this.tokenRefreshTimer) {
            clearInterval(this.tokenRefreshTimer);
        }

        this.tokenRefreshTimer = setInterval(async () => {
            if (this.currentAccount && !this.isRefreshing) {
                this.isRefreshing = true;
                try {
                    await this.getToken();
                } finally {
                    this.isRefreshing = false;
                }
            }
        }, TOKEN_REFRESH_INTERVAL);
    }

    /**
     * Validates authentication response
     * @param response AuthenticationResult
     * @private
     * @returns boolean
     */
    private validateAuthResponse(response: AuthenticationResult): boolean {
        return !!(
            response &&
            response.account &&
            response.account.homeAccountId &&
            response.account.username &&
            response.accessToken
        );
    }

    /**
     * Validates account claims
     * @param account AccountInfo
     * @private
     * @returns boolean
     */
    private validateAccountClaims(account: AccountInfo): boolean {
        return !!(
            account &&
            account.homeAccountId &&
            account.username &&
            account.environment
        );
    }

    /**
     * Stores authentication state securely
     * @private
     */
    private storeAuthState(): void {
        if (this.currentAccount) {
            const authState = {
                homeAccountId: this.currentAccount.homeAccountId,
                username: this.currentAccount.username,
                environment: this.currentAccount.environment
            };
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
        }
    }

    /**
     * Restores authentication state from storage
     * @private
     */
    private async restoreAuthState(): Promise<void> {
        const storedState = localStorage.getItem(AUTH_STORAGE_KEY);
        if (storedState) {
            try {
                const authState = JSON.parse(storedState);
                const accounts = await this.msalInstance.getAllAccounts();
                this.currentAccount = accounts.find(
                    account => account.homeAccountId === authState.homeAccountId
                ) || null;
            } catch (error) {
                console.error('Failed to restore auth state:', error);
                await this.clearAuthState();
            }
        }
    }

    /**
     * Clears authentication state
     * @private
     */
    private async clearAuthState(): Promise<void> {
        this.currentAccount = null;
        localStorage.removeItem(AUTH_STORAGE_KEY);
        if (this.tokenRefreshTimer) {
            clearInterval(this.tokenRefreshTimer);
            this.tokenRefreshTimer = null;
        }
    }

    /**
     * Waits for token refresh to complete
     * @private
     * @returns Promise<void>
     */
    private async waitForRefresh(): Promise<void> {
        let attempts = 0;
        while (this.isRefreshing && attempts < MAX_RETRY_ATTEMPTS) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            attempts++;
        }
        if (this.isRefreshing) {
            throw new Error('Token refresh timeout');
        }
    }
}