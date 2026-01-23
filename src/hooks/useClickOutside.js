import { useEffect, useRef } from 'react';

/**
 * Custom hook to detect clicks outside of a referenced element
 * @param {Function} callback - Function to call when click outside is detected
 * @param {boolean} isActive - Whether the hook should be active
 */
export function useClickOutside(callback, isActive = true) {
    const ref = useRef(null);

    useEffect(() => {
        if (!isActive) return;

        const handleClickOutside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                callback();
            }
        };

        // Delay adding listener to avoid immediate trigger
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [callback, isActive]);

    return ref;
}

export default useClickOutside;
