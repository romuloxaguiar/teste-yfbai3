import { createContext, useContext, useState, useCallback, useEffect } from 'react'; // react ^18.2.0
import { AccountInfo } from '@azure/msal-browser'; // @azure/msal-browser ^2.32.0
import { AuthService } from '../services/auth.service';

// Constants
const AUTH_CONTEXT_ERROR = 'AuthContext must be used within an AuthProvider';
const DEFAULT_SESSION_TIMEOUT = 3600000; // 1 hour
const DEFAULT_TOKEN_REFRESH_INTERVAL = 300000; // 5 minutes

// Custom error type for authentication
interface AuthError {
    code: string;
    message: string;
    timestamp: Date;
    details: Record<string, unknown>;
}

// Interface for authentication context
interface AuthContextType {
    isAuthenticated: boolean;
    user: AccountInfo | null;
    isLoading: boolean;
    error: AuthError | null;
    lastActivity: Date | null;
    sessionExpiry: Date | null;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    getToken: () => Promise<string>;
    refreshSession: () => Promise<void>;
    clearError: () => void;
}

// Props interface for AuthProvider
interface AuthProviderProps {
    children: React.ReactNode;
    sessionTimeout?: number;
    tokenRefreshInterval?: number;
    onAuthenticationError?: (error: AuthError) => void;
}

// Create the authentication context
const AuthContext = createContext<AuthContextType | null>(null);

// AuthProvider component
export const AuthProvider: React.FC<AuthProviderProps> = ({
    children,
    sessionTimeout = DEFAULT_SESSION_TIMEOUT,
    tokenRefreshInterval = DEFAULT_TOKEN_REFRESH_INTERVAL,
    onAuthenticationError
}) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<AccountInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<AuthError | null>(null);
    const [lastActivity, setLastActivity] = useState<Date | null>(null);
    const [sessionExpiry, setSessionExpiry] = useState<Date | null>(null);

    const authService = new AuthService();

    // Initialize session monitoring
    useEffect(() => {
        const checkSession = async () => {
            try {
                const currentUser = authService.getCurrentUser();
                if (currentUser) {
                    setUser(currentUser);
                    setIsAuthenticated(true);
                    updateSessionTimestamp();
                }
            } catch (err) {
                handleError(err);
            } finally {
                setIsLoading(false);
            }
        };

        checkSession();
    }, []);

    // Set up session expiry monitoring
    useEffect(() => {
        if (isAuthenticated) {
            const interval = setInterval(() => {
                if (sessionExpiry && new Date() > sessionExpiry) {
                    handleSessionExpired();
                }
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [isAuthenticated, sessionExpiry]);

    // Handle session expiry
    const handleSessionExpired = useCallback(async () => {
        try {
            await logout();
            handleError({
                code: 'SESSION_EXPIRED',
                message: 'Your session has expired. Please log in again.',
                timestamp: new Date(),
                details: {}
            });
        } catch (err) {
            handleError(err);
        }
    }, []);

    // Update session timestamp
    const updateSessionTimestamp = useCallback(() => {
        const now = new Date();
        setLastActivity(now);
        setSessionExpiry(new Date(now.getTime() + sessionTimeout));
    }, [sessionTimeout]);

    // Handle authentication errors
    const handleError = useCallback((err: unknown) => {
        const authError: AuthError = {
            code: err instanceof Error ? err.name : 'UNKNOWN_ERROR',
            message: err instanceof Error ? err.message : 'An unknown error occurred',
            timestamp: new Date(),
            details: err instanceof Error ? { stack: err.stack } : {}
        };
        setError(authError);
        onAuthenticationError?.(authError);
    }, [onAuthenticationError]);

    // Clear error state
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // Login handler
    const login = useCallback(async () => {
        setIsLoading(true);
        clearError();
        try {
            await authService.login();
            const currentUser = authService.getCurrentUser();
            if (currentUser) {
                setUser(currentUser);
                setIsAuthenticated(true);
                updateSessionTimestamp();
            }
        } catch (err) {
            handleError(err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Logout handler
    const logout = useCallback(async () => {
        setIsLoading(true);
        try {
            await authService.logout();
            setUser(null);
            setIsAuthenticated(false);
            setLastActivity(null);
            setSessionExpiry(null);
        } catch (err) {
            handleError(err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Get token handler
    const getToken = useCallback(async () => {
        try {
            return await authService.getToken();
        } catch (err) {
            handleError(err);
            throw err;
        }
    }, []);

    // Refresh session handler
    const refreshSession = useCallback(async () => {
        try {
            await authService.getToken(); // This will trigger a token refresh if needed
            updateSessionTimestamp();
        } catch (err) {
            handleError(err);
            throw err;
        }
    }, []);

    // Context value
    const contextValue: AuthContextType = {
        isAuthenticated,
        user,
        isLoading,
        error,
        lastActivity,
        sessionExpiry,
        login,
        logout,
        getToken,
        refreshSession,
        clearError
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook for using auth context
export const useAuthContext = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error(AUTH_CONTEXT_ERROR);
    }
    return context;
};

export default AuthContext;