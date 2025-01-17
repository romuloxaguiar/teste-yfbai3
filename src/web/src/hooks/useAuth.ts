import { useCallback, useEffect } from 'react'; // react ^18.2.0
import { useAuthContext } from '../contexts/AuthContext';

// Constants for authentication management
const TOKEN_REFRESH_INTERVAL = 300000; // 5 minutes
const SESSION_TIMEOUT = 3600000; // 1 hour
const MAX_RETRY_ATTEMPTS = 3;

// Interface for hook return type
interface UseAuthReturn {
    isAuthenticated: boolean;
    user: AccountInfo | null;
    isLoading: boolean;
    error: AuthError | null;
    sessionExpiry: Date | null;
    lastActivity: Date | null;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    getToken: () => Promise<string>;
    refreshToken: () => Promise<void>;
    validateSession: () => Promise<boolean>;
}

/**
 * Custom hook for managing authentication state and operations
 * Provides secure token management and session handling
 */
export const useAuth = (): UseAuthReturn => {
    const {
        isAuthenticated,
        user,
        isLoading,
        error,
        sessionExpiry,
        lastActivity,
        login: contextLogin,
        logout: contextLogout,
        getToken: contextGetToken,
        refreshSession,
        clearError
    } = useAuthContext();

    // Set up automatic token refresh
    useEffect(() => {
        let refreshInterval: NodeJS.Timer;

        if (isAuthenticated) {
            refreshInterval = setInterval(async () => {
                try {
                    await refreshToken();
                } catch (err) {
                    console.error('Token refresh failed:', err);
                }
            }, TOKEN_REFRESH_INTERVAL);
        }

        return () => {
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
        };
    }, [isAuthenticated]);

    // Monitor session activity
    useEffect(() => {
        if (isAuthenticated) {
            const checkSession = async () => {
                const isValid = await validateSession();
                if (!isValid) {
                    await logout();
                }
            };

            const interval = setInterval(checkSession, SESSION_TIMEOUT / 4);
            return () => clearInterval(interval);
        }
    }, [isAuthenticated]);

    /**
     * Enhanced login handler with retry mechanism
     */
    const login = useCallback(async (): Promise<void> => {
        let attempts = 0;
        while (attempts < MAX_RETRY_ATTEMPTS) {
            try {
                await contextLogin();
                return;
            } catch (err) {
                attempts++;
                if (attempts === MAX_RETRY_ATTEMPTS) {
                    throw err;
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            }
        }
    }, [contextLogin]);

    /**
     * Secure logout handler with cleanup
     */
    const logout = useCallback(async (): Promise<void> => {
        try {
            await contextLogout();
            clearError();
        } catch (err) {
            console.error('Logout failed:', err);
            throw err;
        }
    }, [contextLogout, clearError]);

    /**
     * Secure token retrieval with validation
     */
    const getToken = useCallback(async (): Promise<string> => {
        try {
            const token = await contextGetToken();
            if (!token) {
                throw new TokenValidationError('Invalid token received');
            }
            return token;
        } catch (err) {
            console.error('Token retrieval failed:', err);
            throw err;
        }
    }, [contextGetToken]);

    /**
     * Token refresh handler with enhanced error handling
     */
    const refreshToken = useCallback(async (): Promise<void> => {
        try {
            await refreshSession();
        } catch (err) {
            console.error('Token refresh failed:', err);
            if (err instanceof TokenValidationError) {
                await logout();
            }
            throw err;
        }
    }, [refreshSession, logout]);

    /**
     * Session validation with security checks
     */
    const validateSession = useCallback(async (): Promise<boolean> => {
        if (!isAuthenticated || !sessionExpiry || !lastActivity) {
            return false;
        }

        const now = new Date();
        if (now > sessionExpiry) {
            return false;
        }

        try {
            await getToken();
            return true;
        } catch (err) {
            console.error('Session validation failed:', err);
            return false;
        }
    }, [isAuthenticated, sessionExpiry, lastActivity, getToken]);

    return {
        isAuthenticated,
        user,
        isLoading,
        error,
        sessionExpiry,
        lastActivity,
        login,
        logout,
        getToken,
        refreshToken,
        validateSession
    };
};

export default useAuth;