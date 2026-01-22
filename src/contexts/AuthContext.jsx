import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

/**
 * Authentication Context for Google OAuth
 * Manages user authentication state and provides methods for sign-in/sign-out
 */

const AuthContext = createContext(undefined);

// Google OAuth Client ID - should be set in environment variables
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Initialize Google Identity Services
    useEffect(() => {
        // Check for existing session
        const storedUser = localStorage.getItem('wos_user');
        const storedToken = localStorage.getItem('wos_token');

        if (storedUser && storedToken) {
            try {
                setUser(JSON.parse(storedUser));
                setToken(storedToken);
            } catch (e) {
                localStorage.removeItem('wos_user');
                localStorage.removeItem('wos_token');
            }
        }

        // Load Google Identity Services script
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            if (window.google && GOOGLE_CLIENT_ID) {
                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleCredentialResponse,
                    auto_select: false,
                });
            }
            setLoading(false);
        };
        script.onerror = () => {
            setError('Failed to load Google Sign-In');
            setLoading(false);
        };

        document.body.appendChild(script);

        return () => {
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        };
    }, []);

    // Handle Google credential response
    const handleCredentialResponse = useCallback((response) => {
        if (response.credential) {
            // Decode the JWT to get user info
            const payload = decodeJwt(response.credential);

            const userData = {
                id: payload.sub,
                email: payload.email,
                name: payload.name,
                picture: payload.picture,
            };

            // Store user and token
            setUser(userData);
            setToken(response.credential);
            localStorage.setItem('wos_user', JSON.stringify(userData));
            localStorage.setItem('wos_token', response.credential);
            setError(null);
        }
    }, []);

    // Decode JWT without verification (verification happens on backend)
    const decodeJwt = (token) => {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            return JSON.parse(jsonPayload);
        } catch (e) {
            console.error('Failed to decode JWT:', e);
            return {};
        }
    };

    // Trigger Google Sign-In
    const signIn = useCallback(() => {
        if (window.google && GOOGLE_CLIENT_ID) {
            window.google.accounts.id.prompt((notification) => {
                if (notification.isNotDisplayed()) {
                    // Fallback: render the button if prompt doesn't show
                    setError('Please click the Google Sign-In button');
                }
            });
        } else {
            setError('Google Sign-In not initialized');
        }
    }, []);

    // Sign out
    const signOut = useCallback(() => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('wos_user');
        localStorage.removeItem('wos_token');

        if (window.google) {
            window.google.accounts.id.disableAutoSelect();
        }
    }, []);

    // Get current auth token for API calls
    const getAuthToken = useCallback(() => {
        return token;
    }, [token]);

    // Render Google Sign-In button into a container
    const renderGoogleButton = useCallback((containerId, options = {}) => {
        if (window.google && GOOGLE_CLIENT_ID) {
            window.google.accounts.id.renderButton(
                document.getElementById(containerId),
                {
                    type: 'standard',
                    theme: 'filled_black',
                    size: 'large',
                    text: 'signin_with',
                    shape: 'rectangular',
                    logo_alignment: 'center',
                    width: options.width || 300,
                    ...options,
                }
            );
        }
    }, []);

    const value = {
        user,
        token,
        loading,
        error,
        isAuthenticated: !!user,
        signIn,
        signOut,
        getAuthToken,
        renderGoogleButton,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
