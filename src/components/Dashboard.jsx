import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    Plus,
    RefreshCw,
    Loader2,
    Search,
    ChevronRight,
    ChevronLeft,
    AlertTriangle,
    Wrench,
    CheckCircle2,
    Calendar,
    Car,
    Clock,
    TrendingUp,
    ClipboardCheck,
    Bell,
    FileText, // Keep strictly if used elsewhere, but we are replacing usage
    Printer, // Keep strictly if used elsewhere
    ChevronDown,
    MapPin,
    ExternalLink,
    ClipboardList,
    Receipt,
    Edit3,
    FileUp,
    List,
    X
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
import { BlobProvider } from '@react-pdf/renderer';
import PDFOrder from './PDFOrder';
import { JOB_STAGES, STAGE_INFO, getPreparationPhase } from '../hooks/useJobs';

/**
 * Individual Case Row Component
 */
const DashboardCaseRow = ({ job, onSelectJob, getStageBadge }) => {
    const [expanded, setExpanded] = useState(false);

    // Calculate status label
    const statusLabel = useMemo(() => {
        if (job.stage === JOB_STAGES.CONFIRMED) return `Confirmed : Initial Commitment`;
        if (job.stage === JOB_STAGES.PREPARATION) {
            const phase = getPreparationPhase(job);
            return `Preparation : ${phase?.label || 'In Prep'}`;
        }
        if (job.stage === JOB_STAGES.IN_PROGRESS) return `In Progress : In Progress`;
        if (job.stage === JOB_STAGES.READY) return `Ready : Ready for Pickup`;
        if (job.stage === JOB_STAGES.DONE) return `Done : Completed`;
        return `${job.stage} : -`;
    }, [job]);

    const badge = getStageBadge(job.stage);

    // Sort items by category: Repair -> Replace -> Blend -> Other
    const sortedItems = useMemo(() => {
        if (!job.items) return [];
        const order = { 'Repair': 1, 'Replace': 2, 'Blend': 3, 'Polish/Touch up': 4, 'Other': 5 };
        return [...job.items].sort((a, b) => {
            const typeA = (a.type || '').trim();
            const typeB = (b.type || '').trim();
            // Map types to order, default to 6 (end)
            const orderA = order[typeA] || (typeA === 'Polish' ? 4 : 6);
            const orderB = order[typeB] || (typeB === 'Polish' ? 4 : 6);
            return orderA - orderB;
        });
    }, [job.items]);

    // Helper for item type colors - Theme-aware
    const getTypeColor = (type) => {
        const safeType = (type || '').trim();
        switch (safeType) {
            case 'Repair': return 'badge-repair';
            case 'Replace': return 'badge-replace';
            case 'Blend': return 'badge-blend';
            case 'Polish/Touch up': return 'badge-other';
            case 'Other': return 'badge-other';
            default: return 'badge-base surface border border-subtle text-secondary';
        }
    };

    return (
        <div className="group border-b border-subtle last:border-0 hover:bg-surface-hover transition-colors duration-200">
            {/* Main Row Content */}
            <div
                onClick={() => onSelectJob(job)}
                className="flex items-center justify-between p-5 cursor-pointer"
            >
                {/* Left Side: Vehicle & Customer */}
                <div className="flex items-center gap-4 flex-1">
                    <div className="text-left">
                        {/* Line 1: Vehicle + Plate + Customer */}
                        <p className="font-code font-bold text-primary text-base flex items-center gap-2">
                            {job.vehicle_year} {job.vehicle_make_model}
                            {job.vehicle_plate && (
                                <span className="license-plate">
                                    {job.vehicle_plate}
                                </span>
                            )}
                            <span className="text-muted font-normal mx-1">|</span>
                            <span className="text-sm text-secondary font-medium">
                                {job.customer_name || 'Unknown Customer'}
                            </span>
                        </p>
                        {/* Line 2: Status Badge */}
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${badge.bg} ${badge.text}`}>
                                {statusLabel}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right Side: Buttons Only */}
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>

                    {/* View Work Order */}
                    <BlobProvider
                        document={
                            <PDFOrder data={{
                                customer: { name: job.customer_name, phone: job.customer_phone },
                                vehicle: {
                                    year: job.vehicle_year,
                                    makeModel: job.vehicle_make_model,
                                    plate: job.vehicle_plate,
                                    vin: job.vehicle_vin
                                },
                                dates: { start: job.start_date, end: job.end_date },
                                items: job.items || [],
                                notes: job.notes
                            }} />
                        }
                    >
                        {({ url, loading }) => (
                            <button
                                onClick={() => url && window.open(url, '_blank')}
                                disabled={loading}
                                className="p-2 text-white hover:text-accent hover:bg-surface-hover rounded-lg transition-colors"
                                title="Work Order"
                            >
                                <ClipboardList size={18} />
                            </button>
                        )}
                    </BlobProvider>

                    {/* View Estimate (Disabled / Not Available) */}
                    <button
                        disabled={true}
                        className="p-2 text-muted/30 cursor-not-allowed rounded-lg"
                        title="Estimate"
                    >
                        <Receipt size={18} />
                    </button>

                    {/* Expand/Collapse Button */}
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className={`p-2 rounded-lg transition-all duration-200 ${expanded
                            ? 'bg-accent/20 text-accent'
                            : 'bg-surface text-muted hover:bg-surface-hover hover:text-white'
                            }`}
                        title={expanded ? 'Collapse' : 'Expand'}
                    >
                        <ChevronDown size={18} className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Expanded Content: Repair List */}
            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${expanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    }`}
            >
                <div className="px-5 pb-5 pl-5">
                    <div className="ml-0 surface rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Wrench size={14} className="text-muted" />
                            <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Repair List</h4>
                        </div>
                        {sortedItems && sortedItems.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {sortedItems.map((item, idx) => (
                                    <div key={idx} className="flex items-start gap-2 text-sm">
                                        <span className="text-muted mt-1.5">•</span>
                                        <div className="flex items-baseline gap-2">
                                            {item.type && (
                                                <span className={`badge-base ${getTypeColor(item.type)}`}>
                                                    {item.type}
                                                </span>
                                            )}
                                            <span className="font-medium text-white">{item.desc}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted italic">No repair items listed.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * Apple-style Dashboard for job management.
 * Displays statistics cards, critical alerts, and a jobs list.
 */
function Dashboard({
    jobs,
    loading,
    error,
    onRefresh,
    onCreateJob,
    onSelectJob,
    defaultViewMode = 'list'
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [showNotifications, setShowNotifications] = useState(false);
    const [showNewCaseMenu, setShowNewCaseMenu] = useState(false); // State for New Case Dropdown
    const [dismissedNotifications, setDismissedNotifications] = useState({}); // Track dismissed notifications
    const [stageFilter, setStageFilter] = useState(null); // Filter by stage when clicking cards
    const notificationRef = useRef(null);
    const newCaseMenuRef = useRef(null);
    const fileInputRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);

    // Calendar View State
    const [viewMode, setViewMode] = useState(defaultViewMode); // 'list' or 'calendar'

    // Update view mode when prop changes (e.g. sidebar navigation)
    useEffect(() => {
        setViewMode(defaultViewMode);
    }, [defaultViewMode]);

    const [calendarDate, setCalendarDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState(null);

    // Close notification dropdown and new case menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
            if (newCaseMenuRef.current && !newCaseMenuRef.current.contains(event.target)) {
                setShowNewCaseMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Calculate statistics
    const stats = useMemo(() => {
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();

        const confirmedJobs = jobs.filter(j => j.stage === JOB_STAGES.CONFIRMED);
        const preparationJobs = jobs.filter(j => j.stage === JOB_STAGES.PREPARATION);
        const inProgressJobs = jobs.filter(j => j.stage === JOB_STAGES.IN_PROGRESS);
        const readyJobs = jobs.filter(j => j.stage === JOB_STAGES.READY);
        const finishedJobs = jobs.filter(j => j.stage === JOB_STAGES.DONE);

        // Jobs this month (based on created_at)
        const jobsThisMonth = jobs.filter(j => {
            const created = new Date(j.created_at);
            return created.getMonth() === thisMonth && created.getFullYear() === thisYear;
        });

        return {
            confirmedJobs,
            preparationJobs,
            inProgressJobs,
            readyJobs,
            finishedJobs,
            totalThisMonth: jobsThisMonth.length,
            finishedThisMonth: jobsThisMonth.filter(j => j.stage === JOB_STAGES.DONE).length
        };
    }, [jobs]);

    // Generate all notifications
    const notifications = useMemo(() => {
        const alerts = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        jobs.forEach(job => {
            if (job.stage === JOB_STAGES.DONE) return;

            // Check if parts are ready
            const partsToOrder = job.items?.filter(i => i.type?.toLowerCase() === 'replace') || [];
            const hasParts = partsToOrder.length > 0;
            const allPartsArrived = !hasParts || job.parts_arrived || partsToOrder.every(p => p.arrived);

            // 1. Missing schedule but parts are ready
            if (!job.start_date && allPartsArrived && job.stage === JOB_STAGES.PREPARATION) {
                alerts.push({
                    id: `${job.id}-arrange-dropoff`,
                    job,
                    type: 'arrange_dropoff',
                    icon: 'Calendar',
                    color: 'orange',
                    message: 'Please arrange drop off with customer.',
                    priority: 1
                });
            }

            // 2. Due date is tomorrow
            if (job.end_date) {
                // Parse date as local time (add T00:00:00 to prevent UTC parsing)
                const dueDate = new Date(job.end_date + 'T00:00:00');
                if (dueDate.getTime() === tomorrow.getTime() && job.stage === JOB_STAGES.IN_PROGRESS) {
                    alerts.push({
                        id: `${job.id}-due-tomorrow`,
                        job,
                        type: 'due_tomorrow',
                        icon: 'AlertTriangle',
                        color: 'red',
                        message: 'Due date is tomorrow!',
                        priority: 0
                    });
                }
            }

            // 3. Ready to move to In Progress (car here + parts arrived)
            if (job.stage === JOB_STAGES.PREPARATION && job.car_here && allPartsArrived) {
                alerts.push({
                    id: `${job.id}-ready-start`,
                    job,
                    type: 'ready_start',
                    icon: 'Wrench',
                    color: 'green',
                    message: 'Ready to start work.',
                    priority: 2
                });
            }

            // 4. Case is in Ready stage
            if (job.stage === JOB_STAGES.READY) {
                alerts.push({
                    id: `${job.id}-ready-pickup`,
                    job,
                    type: 'ready_pickup',
                    icon: 'CheckCircle2',
                    color: 'teal',
                    message: 'Ready for customer pickup.',
                    priority: 3
                });
            }
        });

        // Filter out dismissed notifications and sort by priority
        return alerts
            .filter(a => !dismissedNotifications[a.id])
            .sort((a, b) => a.priority - b.priority);
    }, [jobs, dismissedNotifications]);

    // Dismiss a notification
    const dismissNotification = (notificationId) => {
        setDismissedNotifications(prev => ({
            ...prev,
            [notificationId]: true
        }));
    };

    // Filter and sort jobs
    const filteredJobs = useMemo(() => {
        // Stage order: Confirmed → Preparation → Ready → In Progress → Done
        const stageOrder = {
            [JOB_STAGES.CONFIRMED]: 1,
            [JOB_STAGES.PREPARATION]: 2,
            [JOB_STAGES.READY]: 3,
            [JOB_STAGES.IN_PROGRESS]: 4,
            [JOB_STAGES.DONE]: 5
        };

        // Filter by search query and stage filter
        let filtered = jobs.filter(job => {
            // Apply stage filter
            if (stageFilter && job.stage !== stageFilter) return false;

            // Apply search query
            if (!searchQuery) return true;
            return job.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                job.vehicle_make_model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                job.vehicle_plate?.toLowerCase().includes(searchQuery.toLowerCase());
        });

        // Sort by stage order, then by created_at descending (latest first)
        return filtered.sort((a, b) => {
            // First compare by stage order
            const stageA = stageOrder[a.stage] || 99;
            const stageB = stageOrder[b.stage] || 99;
            if (stageA !== stageB) return stageA - stageB;

            // Then compare by created_at descending (latest first)
            const dateA = new Date(a.created_at || 0);
            const dateB = new Date(b.created_at || 0);
            return dateB - dateA;
        });
    }, [jobs, searchQuery, stageFilter]);



    // Helper: Map extracted items to job items structure (ensure uniqueness logic if needed)
    const mapExtractedItemsToJobItems = (items) => {
        if (!items || !Array.isArray(items)) return [];
        return items.map((item, i) => ({
            id: Date.now() + i,
            type: item.type || 'Repair',
            desc: item.desc || '',
            partNum: item.partNum || '',
            customTitle: ''
        }));
    };

    // Get stage badge styling
    const getStageBadge = (stage) => {
        switch (stage) {
            case JOB_STAGES.CONFIRMED:
                return { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Confirmed' };
            case JOB_STAGES.PREPARATION:
                return { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Preparation' };
            case JOB_STAGES.IN_PROGRESS:
                return { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'In Progress' };
            case JOB_STAGES.READY:
                return { bg: 'bg-teal-500/20', text: 'text-teal-400', label: 'Ready' };
            case JOB_STAGES.DONE:
                return { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Done' };
            default:
                return { bg: 'bg-white/10', text: 'text-white/60', label: 'New' };
        }
    };

    // Stat Card Component - Glassmorphism Black/White/Red Theme
    const StatCard = ({ icon: Icon, title, value, subtitle, onClick, isActive }) => {
        return (
            <div
                onClick={onClick}
                className={`relative overflow-hidden rounded-2xl p-5 glass-elevated border transition-all duration-300 cursor-pointer
                    ${isActive
                        ? 'border-accent shadow-lg shadow-accent/20'
                        : 'border-subtle hover:border-accent/50 hover:-translate-y-1'
                    }`}
            >
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors
                    ${isActive ? 'bg-accent text-white' : 'surface text-muted'}`}>
                    <Icon size={20} />
                </div>

                {/* Content */}
                <div className="relative z-10">
                    <p className="text-muted text-[10px] font-code font-bold uppercase tracking-wider mb-1">{title}</p>
                    <p className={`font-code text-3xl font-bold mb-1 ${isActive ? 'text-accent' : 'text-primary'}`}>{value}</p>
                    {subtitle && (
                        <p className="text-muted text-xs font-medium">{subtitle}</p>
                    )}
                </div>

                {/* Active indicator */}
                {isActive && (
                    <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-accent animate-glow" />
                )}
            </div>
        );
    };

    // Calendar View Component - Multi-day events like Google Calendar
    const CalendarView = () => {
        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();

        // Get days in month
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay();

        // Create calendar grid (6 weeks x 7 days = 42 cells)
        const calendarDays = [];
        // Add empty cells for days before the 1st
        for (let i = 0; i < firstDayOfMonth; i++) {
            calendarDays.push(null);
        }
        // Add actual days
        for (let d = 1; d <= daysInMonth; d++) {
            calendarDays.push(d);
        }
        // Pad to complete the last week
        while (calendarDays.length % 7 !== 0) {
            calendarDays.push(null);
        }

        // Get stage color for event bar
        const getStageColor = (stage) => {
            switch (stage) {
                case JOB_STAGES.CONFIRMED: return 'bg-blue-500 border-blue-600';
                case JOB_STAGES.PREPARATION: return 'bg-orange-500 border-orange-600';
                case JOB_STAGES.IN_PROGRESS: return 'bg-purple-500 border-purple-600';
                case JOB_STAGES.READY: return 'bg-teal-500 border-teal-600';
                case JOB_STAGES.DONE: return 'bg-green-500 border-green-600';
                default: return 'bg-gray-400 border-gray-500';
            }
        };

        // Get jobs that span across a specific day
        const getJobsForDay = (day) => {
            if (!day) return [];
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const date = new Date(dateStr);

            return jobs.filter(job => {
                if (!job.start_date) return false;
                const start = new Date(job.start_date);
                const end = job.end_date ? new Date(job.end_date) : start;
                return date >= start && date <= end;
            });
        };

        // Check if a job starts on this day
        const isJobStartDay = (job, day) => {
            if (!day || !job.start_date) return false;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            return job.start_date === dateStr;
        };

        // Check if a job ends on this day
        const isJobEndDay = (job, day) => {
            if (!day) return false;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const endDate = job.end_date || job.start_date;
            return endDate === dateStr;
        };

        // Calculate job duration in days
        const getJobDuration = (job) => {
            if (!job.start_date) return 1;
            const start = new Date(job.start_date);
            const end = job.end_date ? new Date(job.end_date) : start;
            return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        };

        // Navigate months
        const goToPrevMonth = () => {
            setCalendarDate(new Date(year, month - 1, 1));
            setSelectedDay(null);
        };

        const goToNextMonth = () => {
            setCalendarDate(new Date(year, month + 1, 1));
            setSelectedDay(null);
        };

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        const today = new Date();
        const isToday = (day) => {
            return day === today.getDate() &&
                month === today.getMonth() &&
                year === today.getFullYear();
        };

        // Group calendar days into weeks
        const weeks = [];
        for (let i = 0; i < calendarDays.length; i += 7) {
            weeks.push(calendarDays.slice(i, i + 7));
        }

        return (
            <div className="glass-elevated rounded-3xl border border-subtle overflow-hidden">
                {/* Calendar Header */}
                <div className="px-6 py-4 border-b border-subtle flex items-center justify-between">
                    <button
                        onClick={goToPrevMonth}
                        className="p-2 rounded-xl hover:bg-surface-hover text-muted hover:text-primary transition-colors cursor-pointer"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <h3 className="font-bold font-code text-primary text-lg">
                        {monthNames[month]} {year}
                    </h3>
                    <button
                        onClick={goToNextMonth}
                        className="p-2 rounded-xl hover:bg-surface-hover text-muted hover:text-primary transition-colors cursor-pointer"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* Day Names Header */}
                <div className="grid grid-cols-7 border-b border-subtle">
                    {dayNames.map(name => (
                        <div key={name} className="py-3 text-center text-xs font-bold font-code text-muted uppercase tracking-wider">
                            {name}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid - Week by Week */}
                <div className="divide-y divide-subtle">
                    {weeks.map((week, weekIdx) => (
                        <div key={weekIdx} className="relative">
                            {/* Days Row */}
                            <div className="grid grid-cols-7">
                                {week.map((day, dayIdx) => {
                                    const dayJobs = getJobsForDay(day);
                                    const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
                                    const isSelected = selectedDay === dateStr;

                                    return (
                                        <div
                                            key={dayIdx}
                                            className={`min-h-[100px] border-r border-subtle last:border-r-0 p-1 transition-colors cursor-pointer
                                                ${day ? 'hover:bg-surface-hover' : 'bg-white/5'}
                                                ${isToday(day) ? 'bg-accent/10' : ''}`}
                                            onClick={() => day && dayJobs.length > 0 && setSelectedDay(isSelected ? null : dateStr)}
                                        >
                                            {day && (
                                                <>
                                                    <div className={`text-xs font-medium mb-1 px-1
                                                        ${isToday(day) ? 'w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center' : 'text-muted'}`}>
                                                        {day}
                                                    </div>

                                                    {/* Job Events */}
                                                    <div className="space-y-0.5">
                                                        {dayJobs.slice(0, 3).map((job) => {
                                                            const isStart = isJobStartDay(job, day);
                                                            const isEnd = isJobEndDay(job, day);

                                                            return (
                                                                <div
                                                                    key={job.id}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onSelectJob(job);
                                                                    }}
                                                                    className={`text-[10px] font-medium text-white px-1.5 py-0.5 cursor-pointer hover:opacity-80 transition-opacity truncate
                                                                        ${getStageColor(job.stage)}
                                                                        ${isStart && isEnd ? 'rounded' : isStart ? 'rounded-l -mr-1' : isEnd ? 'rounded-r -ml-1' : '-mx-1'}`}
                                                                    title={`${job.customer_name} - ${job.vehicle_year} ${job.vehicle_make_model}`}
                                                                >
                                                                    {isStart ? `${job.vehicle_year} ${job.vehicle_make_model?.split(' ')[0] || ''}` : '\u00A0'}
                                                                </div>
                                                            );
                                                        })}
                                                        {dayJobs.length > 3 && (
                                                            <div className="text-[9px] text-muted font-medium px-1">
                                                                +{dayJobs.length - 3} more
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Selected Day Popup */}
                                                    {isSelected && dayJobs.length > 0 && (
                                                        <div
                                                            className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-72 glass-elevated rounded-xl border border-subtle z-50 overflow-hidden"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <div className="px-3 py-2 surface border-b border-subtle">
                                                                <p className="text-xs font-bold font-code text-primary">
                                                                    {dayJobs.length} case{dayJobs.length !== 1 ? 's' : ''} on this day
                                                                </p>
                                                            </div>
                                                            <div className="max-h-48 overflow-y-auto">
                                                                {dayJobs.map(job => (
                                                                    <button
                                                                        key={job.id}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            onSelectJob(job);
                                                                        }}
                                                                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-hover text-left border-b border-subtle last:border-0 cursor-pointer"
                                                                    >
                                                                        <div className={`w-2 h-2 rounded-full shrink-0 ${getStageColor(job.stage).split(' ')[0]}`} />
                                                                        <div className="min-w-0 flex-1">
                                                                            <p className="text-sm font-medium text-primary truncate">
                                                                                {job.vehicle_year} {job.vehicle_make_model}
                                                                            </p>
                                                                            <p className="text-xs text-muted truncate">
                                                                                {job.customer_name} • {getJobDuration(job)} day{getJobDuration(job) !== 1 ? 's' : ''}
                                                                            </p>
                                                                        </div>
                                                                        <ChevronRight size={12} className="text-muted shrink-0" />
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Legend */}
                <div className="px-6 py-4 border-t border-border flex items-center justify-center gap-6 bg-surface">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-2 rounded-sm bg-blue-500" />
                        <span className="text-xs text-muted">Confirmed</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-2 rounded-sm bg-orange-500" />
                        <span className="text-xs text-muted">Preparation</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-2 rounded-sm bg-purple-500" />
                        <span className="text-xs text-muted">In Progress</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-2 rounded-sm bg-teal-500" />
                        <span className="text-xs text-muted">Ready</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-2 rounded-sm bg-green-500" />
                        <span className="text-xs text-muted">Done</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-bg">
            {/* Header */}
            <div className="glass-elevated px-6 py-4 border-b border-subtle shrink-0 relative z-20">
                <div className="flex items-center justify-between gap-6 mb-4">
                    <div className="shrink-0">
                        <h1 className="font-code text-2xl font-bold text-primary tracking-tight">Dashboard</h1>
                        <p className="text-sm text-muted mt-1">
                            Welcome Back, Today is {new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', weekday: 'long' }).replace(/^(\d{2}\/(\d{2})\/\d{4}), (.+)$/, '$1 $3').toUpperCase()}
                        </p>
                    </div>

                    {/* Search - in the middle */}
                    <div className="relative flex-1 max-w-md">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search cases..."
                            className="w-full pl-12 pr-4 py-3 rounded-2xl input-field text-sm"
                        />
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        {/* Notifications Bell */}
                        <div className="relative" ref={notificationRef}>
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className={`relative p-3 rounded-2xl transition-all surface border border-subtle ${notifications.length > 0 ? 'text-accent hover:bg-accent/10' : 'text-muted hover:text-white hover:bg-surface-hover'}`}
                                title="Notifications"
                            >
                                <Bell size={18} />
                                {notifications.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-glow">
                                        {notifications.length > 9 ? '9+' : notifications.length}
                                    </span>
                                )}
                            </button>

                            {/* Notification Dropdown */}
                            {showNotifications && (
                                <div className="absolute right-0 top-full mt-2 w-96 dropdown-menu rounded-2xl overflow-hidden z-50">
                                    <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Bell size={16} className="text-muted" />
                                            <span className="font-bold text-white text-sm">Notifications</span>
                                        </div>
                                        {notifications.length > 0 && (
                                            <span className="px-2 py-0.5 bg-accent/20 text-accent text-xs font-bold rounded-full">
                                                {notifications.length}
                                            </span>
                                        )}
                                    </div>
                                    <div className="max-h-80 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="py-8 text-center">
                                                <CheckCircle2 size={24} className="mx-auto text-green-500 mb-2" />
                                                <p className="text-sm text-gray-500">All caught up!</p>
                                            </div>
                                        ) : (
                                            notifications.map(notification => {
                                                const colorClasses = {
                                                    red: 'bg-red-500/20 text-red-400',
                                                    orange: 'bg-orange-500/20 text-orange-400',
                                                    green: 'bg-green-500/20 text-green-400',
                                                    teal: 'bg-teal-500/20 text-teal-400'
                                                };
                                                return (
                                                    <div
                                                        key={notification.id}
                                                        className="flex items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-colors border-b border-subtle last:border-0"
                                                    >
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClasses[notification.color]}`}>
                                                            {notification.type === 'due_tomorrow' && <AlertTriangle size={14} />}
                                                            {notification.type === 'arrange_dropoff' && <Calendar size={14} />}
                                                            {notification.type === 'ready_start' && <Wrench size={14} />}
                                                            {notification.type === 'ready_pickup' && <CheckCircle2 size={14} />}
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                onSelectJob(notification.job);
                                                                setShowNotifications(false);
                                                            }}
                                                            className="flex-1 min-w-0 text-left cursor-pointer"
                                                        >
                                                            <p className="font-medium text-primary text-sm truncate">
                                                                {notification.job.vehicle_year} {notification.job.vehicle_make_model}
                                                            </p>
                                                            <p className="text-xs text-muted truncate">{notification.message}</p>
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                dismissNotification(notification.id);
                                                            }}
                                                            className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-accent/20 transition-colors shrink-0 cursor-pointer"
                                                            title="Dismiss"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={onRefresh}
                            disabled={loading}
                            className="p-3 rounded-2xl surface hover:bg-surface-hover text-muted hover:text-primary transition-all disabled:opacity-50"
                            title="Refresh"
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <div className="relative" ref={newCaseMenuRef}>
                            <button
                                onClick={() => setShowNewCaseMenu(!showNewCaseMenu)}
                                className="flex items-center gap-2 px-5 py-3 bg-accent text-white text-sm font-bold font-code rounded-2xl hover:bg-accent/80 transition-all shadow-lg shadow-accent/25 hover:shadow-xl hover:-translate-y-0.5"
                            >
                                <Plus size={18} />
                                <span>New Case</span>
                                <ChevronDown size={14} className={`transition-transform duration-200 ${showNewCaseMenu ? 'rotate-180' : ''}`} />
                            </button>

                            {/* New Case Dropdown */}
                            {showNewCaseMenu && (
                                <div className="absolute right-0 top-full mt-2 w-56 dropdown-menu rounded-2xl overflow-hidden z-50">
                                    <button
                                        onClick={() => {
                                            onCreateJob();
                                            setShowNewCaseMenu(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-hover text-left text-secondary border-b border-subtle"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent">
                                            <Edit3 size={16} />
                                        </div>
                                        <div>
                                            <p className="font-bold font-code text-xs uppercase text-primary">Manual Input</p>
                                            <p className="text-[10px] text-muted">Fill details manually</p>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (fileInputRef.current) fileInputRef.current.click();
                                            setShowNewCaseMenu(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-hover text-left text-secondary"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                                            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />}
                                        </div>
                                        <div>
                                            <p className="font-bold font-code text-xs uppercase text-primary">Upload Estimate</p>
                                            <p className="text-[10px] text-muted">Auto-create from 311 PDF</p>
                                        </div>
                                    </button>
                                </div>
                            )}

                            {/* Hidden File Input for Quick Upload */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;

                                    setIsUploading(true);
                                    try {
                                        const formData = new FormData();
                                        formData.append('file', file);

                                        // 1. Analyze PDF
                                        const analyzeRes = await fetch(`${API_URL}/analyze`, {
                                            method: 'POST',
                                            body: formData,
                                        });

                                        if (!analyzeRes.ok) throw new Error('Analysis failed');
                                        const extractedData = await analyzeRes.json();

                                        // 2. Prepare Job Data
                                        const jobData = {
                                            customer: {
                                                name: extractedData.customer?.name || '',
                                                phone: extractedData.customer?.phone || ''
                                            },
                                            vehicle: {
                                                year: extractedData.vehicle?.year || '',
                                                makeModel: extractedData.vehicle?.makeModel || '',
                                                plate: extractedData.vehicle?.plate || '',
                                                vin: extractedData.vehicle?.vin || ''
                                            },
                                            dates: {
                                                start: '',
                                                end: ''
                                            },
                                            items: mapExtractedItemsToJobItems(extractedData.items),
                                            notes: extractedData.notes || '',
                                            stage: JOB_STAGES.CONFIRMED // Start in Confirmed Stage
                                        };

                                        // 3. Create Job
                                        const createRes = await fetch(`${API_URL}/jobs`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify(jobData)
                                        });

                                        if (!createRes.ok) throw new Error('Job creation failed');

                                        const newJob = await createRes.json();

                                        // 4. Refresh & Navigate
                                        await onRefresh();
                                        onSelectJob(newJob);

                                    } catch (error) {
                                        console.error("Quick upload failed:", error);
                                        alert("Failed to upload/analyze estimate. Please try manual input.");
                                    } finally {
                                        setIsUploading(false);
                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                    }
                                }}
                                accept=".pdf"
                                className="hidden"
                            />
                        </div>
                    </div>
                </div>

                {/* Stats Cards in Header */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <StatCard
                        icon={ClipboardCheck}
                        title="Confirmed"
                        value={stats.confirmedJobs.length}
                        subtitle="New cases received"
                        jobs={stats.confirmedJobs}
                        onSelectJob={onSelectJob}
                        onClick={() => setStageFilter(stageFilter === JOB_STAGES.CONFIRMED ? null : JOB_STAGES.CONFIRMED)}
                        isActive={stageFilter === JOB_STAGES.CONFIRMED}
                    />
                    <StatCard
                        icon={Calendar}
                        title="Preparation"
                        value={stats.preparationJobs.length}
                        subtitle="Awaiting parts or schedule"
                        jobs={stats.preparationJobs}
                        onSelectJob={onSelectJob}
                        onClick={() => setStageFilter(stageFilter === JOB_STAGES.PREPARATION ? null : JOB_STAGES.PREPARATION)}
                        isActive={stageFilter === JOB_STAGES.PREPARATION}
                    />
                    <StatCard
                        icon={Wrench}
                        title="In Progress"
                        value={stats.inProgressJobs.length}
                        subtitle="Currently in progress"
                        jobs={stats.inProgressJobs}
                        onSelectJob={onSelectJob}
                        onClick={() => setStageFilter(stageFilter === JOB_STAGES.IN_PROGRESS ? null : JOB_STAGES.IN_PROGRESS)}
                        isActive={stageFilter === JOB_STAGES.IN_PROGRESS}
                    />
                    <StatCard
                        icon={TrendingUp}
                        title="Ready"
                        value={stats.readyJobs.length}
                        subtitle="Ready for pickup"
                        jobs={stats.readyJobs}
                        onSelectJob={onSelectJob}
                        onClick={() => setStageFilter(stageFilter === JOB_STAGES.READY ? null : JOB_STAGES.READY)}
                        isActive={stageFilter === JOB_STAGES.READY}
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 relative z-10">
                {loading && jobs.length === 0 ? (
                    <div className="flex items-center justify-center h-40">
                        <Loader2 size={32} className="animate-spin text-accent" />
                    </div>
                ) : error ? (
                    <div className="text-center py-12">
                        <p className="text-accent font-medium mb-2">Error loading dashboard</p>
                        <button onClick={onRefresh} className="text-sm text-secondary hover:text-primary cursor-pointer">
                            Try again
                        </button>
                    </div>
                ) : (
                    <div className="space-y-8">

                        {/* View Toggle + Jobs List/Calendar */}
                        <div className="glass-elevated rounded-3xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-subtle flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <h3 className="font-code font-bold text-primary">
                                        {stageFilter ? `${STAGE_INFO[stageFilter]?.label} Cases` : 'All Cases'}
                                    </h3>
                                    <span className="text-sm text-muted">{filteredJobs.length} cases</span>
                                    {stageFilter && (
                                        <button
                                            onClick={() => setStageFilter(null)}
                                            className="flex items-center gap-1 px-2 py-1 surface hover:bg-surface-hover rounded-lg text-xs font-medium text-secondary transition-colors cursor-pointer"
                                        >
                                            <X size={12} />
                                            Clear Filter
                                        </button>
                                    )}
                                </div>
                            </div>

                            {viewMode === 'list' ? (
                                <div className="divide-y divide-gray-50">
                                    {filteredJobs.length === 0 ? (
                                        <div className="py-12 text-center">
                                            <Car size={32} className="mx-auto text-gray-300 mb-3" />
                                            <p className="text-gray-500">No cases found</p>
                                        </div>
                                    ) : (
                                        filteredJobs.map(job => (
                                            <DashboardCaseRow
                                                key={job.id}
                                                job={job}
                                                onSelectJob={onSelectJob}
                                                getStageBadge={getStageBadge}
                                            />
                                        ))
                                    )}
                                </div>
                            ) : (
                                <CalendarView />
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}

export default Dashboard;
