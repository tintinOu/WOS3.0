import React, { useState, useCallback } from 'react';
import { Home, Calendar, Settings, ChevronLeft, ChevronRight, Wrench, Sun, Moon, ShieldCheck, LogOut } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useClickOutside } from '../hooks/useClickOutside';

/**
 * Sidebar - Glassmorphism Design System
 * Features: Dark/Light mode toggle, Red accent active states, click-outside to collapse
 * Following ui-ux-pro-max workflow guidelines
 */
function Sidebar({ activeView, onViewChange, jobsCount = 0, onLogout }) {
    const [collapsed, setCollapsed] = useState(false);
    const { theme, toggleTheme, isDark } = useTheme();

    // Auto-collapse when clicking outside (only when sidebar is expanded)
    const handleClickOutside = useCallback(() => {
        if (!collapsed) {
            setCollapsed(true);
        }
    }, [collapsed]);

    const sidebarRef = useClickOutside(handleClickOutside, !collapsed);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: Home, badge: null },
        { id: 'calendar', label: 'Calendar', icon: Calendar, badge: null },
        { id: 'workorder', label: 'Work Order', icon: Wrench, badge: null },
        { id: 'insurance', label: 'Insurance Assist', icon: ShieldCheck, badge: null },
        { id: 'settings', label: 'Settings', icon: Settings, badge: null },
    ];

    // Add job count badge to dashboard
    if (jobsCount > 0) {
        navItems[0].badge = jobsCount;
    }

    return (
        <div
            ref={sidebarRef}
            className={`h-full glass-elevated flex flex-col transition-all duration-300 ease-out overflow-hidden ${collapsed ? 'w-20' : 'w-64'}`}
        >
            {/* Logo / Header */}
            <div className="p-6 border-b border-subtle flex items-center justify-between min-h-[88px]">
                <div className={`overflow-hidden transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                    <h2 className="font-code text-lg font-bold uppercase tracking-wider text-primary whitespace-nowrap">
                        311 Auto
                    </h2>
                    <p className="text-[10px] text-muted font-medium uppercase tracking-[0.2em] mt-1 whitespace-nowrap">
                        Work Order System
                    </p>
                </div>
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="p-2 rounded-xl hover:bg-surface-hover transition-all text-muted hover:text-primary cursor-pointer shrink-0"
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4">
                <ul className="space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeView === item.id;

                        return (
                            <li key={item.id} className="relative group">
                                <button
                                    onClick={() => onViewChange(item.id)}
                                    className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${isActive
                                        ? 'bg-accent text-white shadow-lg shadow-accent/30'
                                        : 'text-secondary hover:bg-surface-hover hover:text-primary'
                                        }`}
                                >
                                    <div className="w-5 shrink-0 flex items-center justify-center">
                                        <Icon size={20} className={isActive ? 'text-white' : ''} />
                                    </div>
                                    <div className={`overflow-hidden transition-all duration-300 flex items-center ${collapsed ? 'w-0 ml-0 opacity-0' : 'w-auto ml-3 opacity-100'}`}>
                                        <span className="font-code font-medium text-sm tracking-wide whitespace-nowrap">
                                            {item.label}
                                        </span>
                                        {item.badge && (
                                            <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${isActive
                                                ? 'bg-white/20 text-white'
                                                : 'bg-accent text-white'
                                                }`}>
                                                {item.badge}
                                            </span>
                                        )}
                                    </div>
                                </button>

                                {/* Collapsed Badge */}
                                {collapsed && item.badge && (
                                    <span className="absolute -top-1 -right-1 text-[9px] font-bold bg-accent text-white w-5 h-5 rounded-full flex items-center justify-center shadow-lg shadow-accent/30">
                                        {item.badge > 9 ? '9+' : item.badge}
                                    </span>
                                )}

                                {/* Tooltip for collapsed state */}
                                {collapsed && (
                                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-2 bg-black/80 backdrop-blur-xl border border-subtle text-primary text-xs font-code font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                                        {item.label}
                                        {item.badge && (
                                            <span className="ml-2 bg-accent text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                                {item.badge}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Footer with Theme Toggle and Logout */}
            <div className="p-4 border-t border-subtle space-y-2">
                {/* Theme Toggle Button */}
                <button
                    onClick={toggleTheme}
                    className="w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer text-secondary hover:bg-surface-hover hover:text-primary"
                    title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                    <div className="w-5 shrink-0 flex items-center justify-center">
                        {isDark ? <Sun size={20} /> : <Moon size={20} />}
                    </div>
                    <div className={`overflow-hidden transition-all duration-300 ${collapsed ? 'w-0 ml-0 opacity-0' : 'w-auto ml-3 opacity-100'}`}>
                        <span className="font-code font-medium text-sm tracking-wide whitespace-nowrap">
                            {isDark ? 'Light Mode' : 'Dark Mode'}
                        </span>
                    </div>
                </button>

                {/* Logout Button */}
                <button
                    onClick={onLogout}
                    className="w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer text-secondary hover:bg-accent/10 hover:text-accent"
                    title="Sign Out"
                >
                    <div className="w-5 shrink-0 flex items-center justify-center">
                        <LogOut size={20} />
                    </div>
                    <div className={`overflow-hidden transition-all duration-300 ${collapsed ? 'w-0 ml-0 opacity-0' : 'w-auto ml-3 opacity-100'}`}>
                        <span className="font-code font-medium text-sm tracking-wide whitespace-nowrap">
                            Sign Out
                        </span>
                    </div>
                </button>

                <div className={`overflow-hidden transition-all duration-300 ${collapsed ? 'h-0 opacity-0' : 'h-auto opacity-100 mt-4'}`}>
                    <p className="text-[10px] text-muted font-medium text-center uppercase tracking-widest whitespace-nowrap">
                        v2.1.0 • {isDark ? 'Dark' : 'Light'}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Sidebar;
