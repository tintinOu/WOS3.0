import React, { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon, Shield, Wrench, Car, ClipboardList } from 'lucide-react';

/**
 * LoginPage - Premium glassmorphism login page for 311 Auto Body
 * Uses existing design system: black/white/red, Fira fonts, glassmorphism
 */
export default function LoginPage() {
    const { renderGoogleButton, error, loading } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const googleButtonRef = useRef(null);
    const buttonRendered = useRef(false);

    // Render Google Sign-In button when component mounts
    useEffect(() => {
        if (!loading && googleButtonRef.current && !buttonRendered.current) {
            // Small delay to ensure Google SDK is fully ready
            const timer = setTimeout(() => {
                renderGoogleButton('google-signin-button', { width: 280 });
                buttonRendered.current = true;
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [loading, renderGoogleButton]);

    return (
        <div className="login-page">
            {/* Animated Background */}
            <div className="login-bg">
                <div className="login-bg-gradient" />
                <div className="login-bg-glow login-bg-glow-1" />
                <div className="login-bg-glow login-bg-glow-2" />
                <div className="login-bg-grid" />
            </div>

            {/* Theme Toggle */}
            <button
                onClick={toggleTheme}
                className="theme-toggle login-theme-toggle"
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Main Content */}
            <div className="login-container">
                {/* Left Side - Branding */}
                <div className="login-branding">
                    <div className="login-logo">
                        <div className="login-logo-icon">
                            <Wrench className="login-logo-wrench" />
                            <Car className="login-logo-car" />
                        </div>
                        <h1 className="login-title">
                            <span className="login-title-number">311</span>
                            <span className="login-title-text">AUTO BODY</span>
                        </h1>
                    </div>

                    <p className="login-tagline">
                        Work Order Management System
                    </p>

                    {/* Features List */}
                    <div className="login-features">
                        <div className="login-feature">
                            <ClipboardList size={20} />
                            <span>Manage Work Orders</span>
                        </div>
                        <div className="login-feature">
                            <Car size={20} />
                            <span>Track Vehicle Repairs</span>
                        </div>
                        <div className="login-feature">
                            <Shield size={20} />
                            <span>Secure & Reliable</span>
                        </div>
                    </div>
                </div>

                {/* Right Side - Login Card */}
                <div className="login-card glass-elevated">
                    <div className="login-card-header">
                        <h2>Welcome Back</h2>
                        <p className="text-secondary">
                            Sign in to access your dashboard
                        </p>
                    </div>

                    {/* Google Sign-In Button Container */}
                    <div className="login-google-container">
                        {loading ? (
                            <div className="login-loading">
                                <div className="login-spinner" />
                                <span>Loading...</span>
                            </div>
                        ) : (
                            <div
                                id="google-signin-button"
                                ref={googleButtonRef}
                                className="login-google-button"
                            />
                        )}
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="login-error">
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Divider */}
                    <div className="login-divider">
                        <span>Authorized Personnel Only</span>
                    </div>

                    {/* Footer */}
                    <div className="login-footer">
                        <p>
                            Protected by Google OAuth 2.0
                        </p>
                    </div>
                </div>
            </div>

            {/* Version */}
            <div className="login-version">
                <span>WOS v2.1.0</span>
            </div>

            <style>{`
                .login-page {
                    min-height: 100vh;
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    overflow: hidden;
                    padding: 2rem;
                }

                /* Background Effects */
                .login-bg {
                    position: fixed;
                    inset: 0;
                    z-index: 0;
                    overflow: hidden;
                }

                .login-bg-gradient {
                    position: absolute;
                    inset: 0;
                    background: var(--color-bg);
                }

                .login-bg-glow {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(100px);
                    opacity: 0.5;
                    animation: float 8s ease-in-out infinite;
                }

                .login-bg-glow-1 {
                    width: 600px;
                    height: 600px;
                    background: var(--color-accent-glow);
                    top: -200px;
                    right: -200px;
                }

                .login-bg-glow-2 {
                    width: 400px;
                    height: 400px;
                    background: var(--color-accent-glow);
                    bottom: -100px;
                    left: -100px;
                    animation-delay: 4s;
                }

                .login-bg-grid {
                    position: absolute;
                    inset: 0;
                    background-image: 
                        linear-gradient(var(--color-border) 1px, transparent 1px),
                        linear-gradient(90deg, var(--color-border) 1px, transparent 1px);
                    background-size: 50px 50px;
                    opacity: 0.3;
                }

                @keyframes float {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(30px, 20px) scale(1.1); }
                }

                /* Theme Toggle */
                .login-theme-toggle {
                    position: fixed;
                    top: 1.5rem;
                    right: 1.5rem;
                    z-index: 100;
                }

                /* Container */
                .login-container {
                    position: relative;
                    z-index: 10;
                    display: flex;
                    align-items: center;
                    gap: 4rem;
                    max-width: 1000px;
                    width: 100%;
                }

                /* Branding Section */
                .login-branding {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .login-logo {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .login-logo-icon {
                    width: 64px;
                    height: 64px;
                    background: var(--color-accent);
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    box-shadow: 0 0 30px var(--color-accent-glow);
                }

                .login-logo-wrench {
                    position: absolute;
                    color: white;
                    width: 28px;
                    height: 28px;
                    transform: rotate(-45deg);
                    top: 10px;
                    left: 12px;
                }

                .login-logo-car {
                    position: absolute;
                    color: white;
                    width: 28px;
                    height: 28px;
                    bottom: 10px;
                    right: 10px;
                }

                .login-title {
                    display: flex;
                    flex-direction: column;
                    line-height: 1;
                }

                .login-title-number {
                    font-family: 'Fira Code', monospace;
                    font-size: 2.5rem;
                    font-weight: 700;
                    color: var(--color-accent);
                    letter-spacing: -0.02em;
                }

                .login-title-text {
                    font-family: 'Fira Code', monospace;
                    font-size: 1rem;
                    font-weight: 600;
                    color: var(--color-text);
                    letter-spacing: 0.2em;
                    margin-top: 2px;
                }

                .login-tagline {
                    font-size: 1.125rem;
                    color: var(--color-text-secondary);
                    max-width: 320px;
                }

                .login-features {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                    margin-top: 1rem;
                }

                .login-feature {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    color: var(--color-text-muted);
                    font-size: 0.875rem;
                }

                .login-feature svg {
                    color: var(--color-accent);
                    flex-shrink: 0;
                }

                /* Login Card */
                .login-card {
                    width: 380px;
                    padding: 2.5rem;
                    border-radius: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                    animation: slide-up 0.5s ease-out;
                }

                .login-card-header {
                    text-align: center;
                }

                .login-card-header h2 {
                    font-family: 'Fira Code', monospace;
                    font-size: 1.5rem;
                    font-weight: 600;
                    color: var(--color-text);
                    margin-bottom: 0.5rem;
                }

                .login-card-header p {
                    font-size: 0.875rem;
                }

                /* Google Button Container */
                .login-google-container {
                    display: flex;
                    justify-content: center;
                    min-height: 44px;
                }

                .login-google-button {
                    display: flex;
                    justify-content: center;
                }

                .login-loading {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    color: var(--color-text-muted);
                    font-size: 0.875rem;
                }

                .login-spinner {
                    width: 20px;
                    height: 20px;
                    border: 2px solid var(--color-border);
                    border-top-color: var(--color-accent);
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                /* Error */
                .login-error {
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    border-radius: 0.75rem;
                    padding: 0.75rem 1rem;
                    text-align: center;
                }

                .login-error span {
                    color: #EF4444;
                    font-size: 0.875rem;
                }

                /* Divider */
                .login-divider {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .login-divider::before,
                .login-divider::after {
                    content: '';
                    flex: 1;
                    height: 1px;
                    background: var(--color-border);
                }

                .login-divider span {
                    font-size: 0.75rem;
                    color: var(--color-text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    white-space: nowrap;
                }

                /* Footer */
                .login-footer {
                    text-align: center;
                }

                .login-footer p {
                    font-size: 0.75rem;
                    color: var(--color-text-muted);
                }

                /* Version */
                .login-version {
                    position: fixed;
                    bottom: 1.5rem;
                    left: 1.5rem;
                    z-index: 10;
                }

                .login-version span {
                    font-family: 'Fira Code', monospace;
                    font-size: 0.75rem;
                    color: var(--color-text-muted);
                }

                /* Responsive */
                @media (max-width: 768px) {
                    .login-container {
                        flex-direction: column;
                        gap: 2rem;
                    }

                    .login-branding {
                        text-align: center;
                        align-items: center;
                    }

                    .login-logo {
                        flex-direction: column;
                    }

                    .login-tagline {
                        text-align: center;
                    }

                    .login-features {
                        align-items: center;
                    }

                    .login-card {
                        width: 100%;
                        max-width: 380px;
                    }
                }

                /* Reduce motion */
                @media (prefers-reduced-motion: reduce) {
                    .login-bg-glow {
                        animation: none;
                    }
                    
                    .login-card {
                        animation: none;
                    }
                }
            `}</style>
        </div>
    );
}
