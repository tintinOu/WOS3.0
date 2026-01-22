import React from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useIsMobile } from './hooks/useIsMobile';
import { useWorkOrderForm } from './hooks/useWorkOrderForm';
import DesktopLayout from './layouts/DesktopLayout';
import MobileLayout from './layouts/MobileLayout';
import LoginPage from './components/LoginPage';

function AppContent() {
    // Check authentication status
    const { isAuthenticated, loading } = useAuth();

    // Detect if we're on mobile/tablet (< 1024px)
    const isMobile = useIsMobile(1024);

    // Shared form state and handlers
    const form = useWorkOrderForm();

    // Show loading state while checking auth
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-base">
                <div className="login-spinner" style={{
                    width: '32px',
                    height: '32px',
                    border: '3px solid var(--color-border)',
                    borderTopColor: 'var(--color-accent)',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                }} />
            </div>
        );
    }

    // Show login page if not authenticated
    if (!isAuthenticated) {
        return <LoginPage />;
    }

    // Render the appropriate layout based on screen size
    return isMobile ? (
        <MobileLayout form={form} />
    ) : (
        <DesktopLayout form={form} />
    );
}

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
