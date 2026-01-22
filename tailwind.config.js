/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class', // Enable class-based dark mode
    theme: {
        extend: {
            fontFamily: {
                'code': ['Fira Code', 'monospace'],
                'sans': ['Fira Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
            },
            colors: {
                // Design System Colors
                'bg': 'var(--color-bg)',
                'surface': 'var(--color-surface)',
                'surface-elevated': 'var(--color-surface-elevated)',
                'surface-hover': 'var(--color-surface-hover)',
                'text-primary': 'var(--color-text)',
                'text-secondary': 'var(--color-text-secondary)',
                'text-muted': 'var(--color-text-muted)',
                'accent': 'var(--color-accent)',
                'accent-hover': 'var(--color-accent-hover)',
                'border': 'var(--color-border)',
                'border-hover': 'var(--color-border-hover)',
            },
            boxShadow: {
                'sm': 'var(--shadow-sm)',
                'md': 'var(--shadow-md)',
                'lg': 'var(--shadow-lg)',
                'xl': 'var(--shadow-xl)',
                'glow': 'var(--shadow-glow)',
                'accent-glow': '0 4px 20px var(--color-accent-glow)',
            },
            transitionDuration: {
                'fast': '150ms',
                'normal': '200ms',
                'slow': '300ms',
            },
            backdropBlur: {
                'glass': '20px',
                'glass-heavy': '24px',
            },
            animation: {
                'glow': 'glow-pulse 2s ease-in-out infinite',
                'fade-in': 'fade-in 0.3s ease-out',
                'slide-up': 'slide-up 0.3s ease-out',
            },
        },
    },
    plugins: [],
}
