import { useState, useEffect } from 'react';

/**
 * Custom hook to detect if the current viewport is mobile/tablet size.
 * @param {number} breakpoint - The pixel width below which is considered mobile (default: 1024px)
 * @returns {boolean} - True if viewport is below the breakpoint
 */
export function useIsMobile(breakpoint = 1024) {
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth < breakpoint;
        }
        return false;
    });

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < breakpoint);
        };

        // Add event listener
        window.addEventListener('resize', handleResize);

        // Call handler right away so state gets updated with initial window size
        handleResize();

        // Remove event listener on cleanup
        return () => window.removeEventListener('resize', handleResize);
    }, [breakpoint]);

    return isMobile;
}

export default useIsMobile;
