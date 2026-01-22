import React from 'react';

/**
 * FloatingLabelInput - Glassmorphism Design System
 * Features: Dark/Light mode support, red accent focus states
 * Following ui-ux-pro-max workflow guidelines
 */
const FloatingLabelInput = ({
    label,
    value,
    onChange,
    type = "text",
    isMissing = false,
    className = "",
    ...props
}) => {
    return (
        <div className="relative">
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder=" "
                className={`
                    block px-5 pb-2.5 pt-6 w-full text-base font-medium rounded-xl 
                    appearance-none outline-none peer transition-all duration-200
                    bg-surface border border-subtle text-primary
                    focus:bg-surface-elevated focus:border-accent focus:shadow-accent-glow
                    ${isMissing ? 'border-accent bg-accent/10' : ''}
                    ${className}
                `}
                {...props}
            />
            <label
                className={`
                    absolute text-[10px] duration-200 transform -translate-y-3 scale-75 
                    top-4 z-10 origin-[0] left-5 
                    peer-focus:text-accent 
                    peer-placeholder-shown:scale-100 
                    peer-placeholder-shown:translate-y-0 
                    peer-placeholder-shown:text-xs 
                    peer-focus:scale-75 
                    peer-focus:-translate-y-3 
                    font-code font-bold uppercase tracking-widest pointer-events-none
                    ${isMissing ? 'text-accent' : 'text-muted'}
                `}
            >
                {label}
            </label>
        </div>
    );
};

export default FloatingLabelInput;
