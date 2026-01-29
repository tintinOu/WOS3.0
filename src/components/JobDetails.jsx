import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    ArrowLeft, Car, Phone, User, Calendar, FileText, Package, Wrench,
    CheckCircle, Clock, Trash2, Edit3, Save, X, AlertCircle, Key,
    PhoneCall, CircleDot, Check, XCircle, Plus, AlertTriangle, Printer, ClipboardList, MoreVertical, Loader2, ChevronDown
} from 'lucide-react';
import { BlobProvider } from '@react-pdf/renderer';
import PDFOrder from './PDFOrder';
import { JOB_STAGES, STAGE_INFO, getPreparationPhase } from '../hooks/useJobs';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

/**
 * JobDetails component - Full page view with stage-based workflow
 */
function JobDetails({
    job,
    onBack,
    onUpdate,
    onDelete,
    onAdvanceStage,
    onRevertStage,
    toggleCarHere,
    togglePartsOrdered,
    togglePartsArrived,
    toggleRentalRequested,
    toggleCustomerNotified
}) {
    const { getAuthToken } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [editedJob, setEditedJob] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [activeTab, setActiveTab] = useState('customer'); // 'customer' or 'rental' for Confirmed stage
    const [prepTab, setPrepTab] = useState('case'); // 'case' or 'rental' for Preparation stage
    const [newItemDesc, setNewItemDesc] = useState('');
    const [newItemType, setNewItemType] = useState('Repair');
    const [newItemCustomTitle, setNewItemCustomTitle] = useState('');
    const [newItemPartNum, setNewItemPartNum] = useState('');
    const [showTimelineNote, setShowTimelineNote] = useState(false);
    const [timelineNoteText, setTimelineNoteText] = useState('');
    const [showAddItemForm, setShowAddItemForm] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmWarnings, setConfirmWarnings] = useState([]);
    const dateRangeRef = useRef(null);
    const rentalStartRef = useRef(null);
    const changeDueDateRef = useRef(null);
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const [partsStatusExpanded, setPartsStatusExpanded] = useState(false);
    const [isEditingNotes, setIsEditingNotes] = useState(false);

    const pdfDocument = useMemo(() => {
        if (!job) return <PDFOrder data={{
            customer: {}, vehicle: {}, dates: {}, items: [], notes: ''
        }} />;

        return (
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
        );
    }, [job]);

    const handleDueDateChange = (newDate) => {
        // Prevent unnecessary updates if date hasn't changed
        if (newDate === (job.end_date || '')) return;

        const dateObj = new Date(newDate + 'T00:00:00');
        const formattedDate = dateObj.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });

        const newTimeline = [...(job.timeline || []), {
            stage: job.stage || JOB_STAGES.IN_PROGRESS,
            timestamp: new Date().toISOString(),
            label: `📅 Due Date Changed to ${formattedDate}`
        }];

        onUpdate(job.id, {
            end_date: newDate,
            timeline: newTimeline
        });
    };

    // Determine if fields should be editable based on stage
    // Treat null/undefined/unrecognized stage as CONFIRMED
    const effectiveStage = job?.stage || JOB_STAGES.CONFIRMED;
    const isConfirmedStage = effectiveStage === JOB_STAGES.CONFIRMED;
    const isPreparationStage = effectiveStage === JOB_STAGES.PREPARATION;
    const isInProgressStage = effectiveStage === JOB_STAGES.IN_PROGRESS;
    const isReadyStage = effectiveStage === JOB_STAGES.READY;
    const isDoneStage = effectiveStage === JOB_STAGES.DONE;

    // In CONFIRMED stage, everything is editable. Otherwise, need edit mode.
    const canEditFields = isConfirmedStage || isEditing;

    // Get parts list with original indices
    const partsToOrder = job?.items?.map((item, originalIndex) => ({ ...item, originalIndex }))
        .filter(item => item?.type?.toLowerCase() === 'replace') || [];
    const hasParts = partsToOrder.length > 0;

    // Check if rental info is filled
    const hasRentalInfo = job?.rental_company || job?.rental_vehicle;

    // Get preparation phase
    const prepPhase = isPreparationStage ? getPreparationPhase(job) : null;

    // Format date for display
    const formatDateDisplay = (dateStr) => {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${mm}/${dd}`;
    };

    // Calculate duration
    const getDuration = () => {
        if (job?.start_date && job?.end_date) {
            const start = new Date(job.start_date);
            const end = new Date(job.end_date);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays === 1 ? '1 Day' : `${diffDays} Days`;
        }
        return null;
    };

    // Format date range for display
    const formatDateRange = () => {
        if (job?.start_date && job?.end_date) {
            const formatDate = (dateStr) => {
                const date = new Date(dateStr + 'T00:00:00');
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                return `${months[date.getMonth()]} ${date.getDate()} ${days[date.getDay()]}`;
            };
            return `${formatDate(job.start_date)} TO ${formatDate(job.end_date)}`;
        }
        return '';
    };

    // Format rental start date for display
    const formatRentalDate = () => {
        if (job?.rental_start_date) {
            const date = new Date(job.rental_start_date + 'T00:00:00');
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            return `${months[date.getMonth()]} ${date.getDate()} ${days[date.getDay()]}`;
        }
        return '';
    };

    // Initialize flatpickr
    useEffect(() => {
        if (dateRangeRef.current && job) {
            const defaultDates = [];
            if (job.start_date) defaultDates.push(job.start_date);
            if (job.end_date) defaultDates.push(job.end_date);

            const fp = flatpickr(dateRangeRef.current, {
                mode: "range",
                dateFormat: "M j D",
                locale: { rangeSeparator: ' TO ' },
                defaultDate: defaultDates.length === 2 ? defaultDates : null,
                clickOpens: canEditFields || (!job.start_date || !job.end_date),
                onChange: (selectedDates, dateStr) => {
                    if (selectedDates.length === 2) {
                        const format = (d) => {
                            const yyyy = d.getFullYear();
                            const mm = String(d.getMonth() + 1).padStart(2, '0');
                            const dd = String(d.getDate()).padStart(2, '0');
                            return `${yyyy}-${mm}-${dd}`;
                        };
                        // Update the input display immediately
                        if (dateRangeRef.current) {
                            dateRangeRef.current.value = dateStr;
                        }
                        // Add timeline entry for schedule
                        const hadScheduleBefore = job.start_date && job.end_date;
                        const newTimeline = hadScheduleBefore ? job.timeline : [...(job.timeline || []), {
                            type: 'schedule',
                            timestamp: new Date().toISOString(),
                            label: '📅 Vehicle drop off date scheduled.'
                        }];
                        onUpdate(job.id, {
                            start_date: format(selectedDates[0]),
                            end_date: format(selectedDates[1]),
                            ...(hadScheduleBefore ? {} : { timeline: newTimeline })
                        });
                    }
                }
            });
            return () => fp.destroy();
        }
    }, [job?.id, canEditFields, job?.start_date, job?.end_date]);

    // Initialize flatpickr for rental start date
    useEffect(() => {
        if (rentalStartRef.current && job && isConfirmedStage && activeTab === 'rental') {
            const fp = flatpickr(rentalStartRef.current, {
                dateFormat: "M j D",
                defaultDate: job.rental_start_date || null,
                clickOpens: canEditFields,
                onChange: (selectedDates, dateStr) => {
                    if (selectedDates.length === 1) {
                        const date = selectedDates[0];
                        const yyyy = date.getFullYear();
                        const mm = String(date.getMonth() + 1).padStart(2, '0');
                        const dd = String(date.getDate()).padStart(2, '0');
                        const formatted = `${yyyy}-${mm}-${dd}`;
                        // Update display immediately
                        if (rentalStartRef.current) {
                            rentalStartRef.current.value = dateStr;
                        }
                        onUpdate(job.id, { rental_start_date: formatted });
                    }
                }
            });
            return () => fp.destroy();
        }
    }, [job?.id, canEditFields, isConfirmedStage, activeTab, job?.rental_start_date]);

    if (!job) return null;

    const stageInfo = STAGE_INFO[job.stage] || STAGE_INFO[JOB_STAGES.CONFIRMED];

    // Check if can advance to next stage (hard requirements only)
    const canAdvanceStage = () => {
        switch (job.stage) {
            case JOB_STAGES.CONFIRMED:
                return true; // No conditions required
            case JOB_STAGES.PREPARATION:
                // Hard requirements: car on site, schedule set
                const hasSchedule = job.start_date && job.end_date;
                return job.car_here && hasSchedule;
            case JOB_STAGES.IN_PROGRESS:
                return true;
            case JOB_STAGES.READY:
                return job.customer_notified;
            default:
                return false;
        }
    };

    // Get warnings for soft requirements (user can still proceed but should confirm)
    const getAdvanceWarnings = () => {
        const warnings = [];

        if (job.stage === JOB_STAGES.PREPARATION) {
            const allPartsOrdered = partsToOrder.every(p => p.ordered) || job.parts_ordered;
            const allPartsArrived = partsToOrder.every(p => p.arrived) || job.parts_arrived;

            if (hasParts && !allPartsOrdered) {
                const orderedCount = partsToOrder.filter(p => p.ordered).length;
                warnings.push(`Parts not fully ordered (${orderedCount}/${partsToOrder.length})`);
            }
            if (hasParts && allPartsOrdered && !allPartsArrived) {
                const arrivedCount = partsToOrder.filter(p => p.arrived).length;
                warnings.push(`Parts not fully arrived (${arrivedCount}/${partsToOrder.length})`);
            }
            if (hasRentalInfo && !job.rental_requested) {
                warnings.push('Rental not requested');
            }
        }

        return warnings;
    };

    // Handle advance stage with confirmation for warnings
    const handleAdvanceStage = () => {
        const warnings = getAdvanceWarnings();

        if (warnings.length > 0) {
            setConfirmWarnings(warnings);
            setShowConfirmModal(true);
            return;
        }

        onAdvanceStage(job.id);
    };

    const confirmAdvanceStage = () => {
        setShowConfirmModal(false);
        setConfirmWarnings([]);
        onAdvanceStage(job.id);
    };

    const cancelAdvanceStage = () => {
        setShowConfirmModal(false);
        setConfirmWarnings([]);
    };

    const getAdvanceButtonLabel = () => {
        switch (job.stage) {
            case JOB_STAGES.CONFIRMED:
                return 'Move to Preparation →';
            case JOB_STAGES.PREPARATION:
                return 'Start Work →';
            case JOB_STAGES.IN_PROGRESS:
                return 'Ready for Pick Up';
            case JOB_STAGES.READY:
                return 'Mark as Done ✓';
            default:
                return null;
        }
    };

    // Get list of missing hard requirements for advancing stage
    const getMissingRequirements = () => {
        if (canAdvanceStage()) return '';

        const missing = [];

        if (job.stage === JOB_STAGES.PREPARATION) {
            if (!job.car_here) missing.push('Car not on site');
            if (!job.start_date || !job.end_date) missing.push('Schedule not set');
        } else if (job.stage === JOB_STAGES.READY) {
            if (!job.customer_notified) missing.push('Customer not notified');
        }

        return missing.length > 0 ? `Missing: ${missing.join(', ')}` : '';
    };

    const startEditing = () => {
        setEditedJob({
            customer_name: job.customer_name || '',
            customer_phone: job.customer_phone || '',
            vehicle_year: job.vehicle_year || '',
            vehicle_make_model: job.vehicle_make_model || '',
            vehicle_plate: job.vehicle_plate || '',
            vehicle_vin: job.vehicle_vin || '',
            notes: job.notes || '',
            rental_company: job.rental_company || '',
            rental_vehicle: job.rental_vehicle || '',
            rental_confirmation: job.rental_confirmation || '',
            rental_notes: job.rental_notes || ''
        });
        setIsEditing(true);
    };

    const saveEdits = async () => {
        if (editedJob) {
            await onUpdate(job.id, editedJob);
            setIsEditing(false);
            setEditedJob(null);
        }
    };

    const cancelEditing = () => {
        setIsEditing(false);
        setEditedJob(null);
    };

    // Add new job item
    const handleAddItem = () => {
        if (!newItemDesc.trim()) return;
        const currentItems = job.items || [];
        const newItem = {
            type: newItemType,
            desc: newItemDesc.trim().toUpperCase(),
            customTitle: newItemType === 'Other' ? newItemCustomTitle : '',
            partNum: newItemPartNum.trim(),
            // Mark items added during In Progress stage as "new"
            ...(isInProgressStage && { addedInProgress: true })
        };
        onUpdate(job.id, { items: [...currentItems, newItem] });
        setNewItemDesc('');
        // Keep the same item type for quick entry of similar items
        // setNewItemType('Repair'); // Don't reset type
        setNewItemCustomTitle('');
        setNewItemPartNum('');
    };

    // Update existing job item
    const handleUpdateItem = (index, field, value) => {
        const currentItems = job.items || [];
        const updatedItems = currentItems.map((item, idx) => {
            if (idx === index) {
                return { ...item, [field]: field === 'desc' ? value.toUpperCase() : value };
            }
            return item;
        });
        onUpdate(job.id, { items: updatedItems });
    };

    // Delete job item
    const handleDeleteItem = (indexToDelete) => {
        const currentItems = job.items || [];
        const updatedItems = currentItems.filter((_, idx) => idx !== indexToDelete);
        onUpdate(job.id, { items: updatedItems });
    };

    const handleDelete = async () => {
        await onDelete(job.id);
        onBack();
    };

    // Handle direct field updates (for CONFIRMED stage)
    const handleDirectUpdate = (field, value) => {
        if (isConfirmedStage) {
            onUpdate(job.id, { [field]: value });
        }
    };

    // Stage progress
    const stages = [
        { key: JOB_STAGES.CONFIRMED, label: 'Confirmed' },
        { key: JOB_STAGES.PREPARATION, label: 'Preparation' },
        { key: JOB_STAGES.IN_PROGRESS, label: 'In Progress' },
        { key: JOB_STAGES.READY, label: 'Ready' },
        { key: JOB_STAGES.DONE, label: 'Done' }
    ];
    // Default to index 0 (CONFIRMED) if stage not found
    const foundIndex = stages.findIndex(s => s.key === effectiveStage);
    const currentStageIndex = foundIndex >= 0 ? foundIndex : 0;



    // Save handler for editable fields
    const handleFieldSave = useCallback((field, newValue) => {
        // Note: We check against current job value inside the callback
        // to ensure we always have the latest value
        if (isEditing) {
            setEditedJob(prev => ({ ...prev, [field]: newValue }));
        } else {
            onUpdate(job.id, { [field]: newValue });
        }
    }, [job.id, isEditing, onUpdate]);

    const EditableField = useMemo(() => {
        return ({ label, field, value, type = 'text', placeholder = '', mono = false, uppercase = false }) => (
            <EditableFieldComponent
                label={label}
                value={value}
                type={type}
                placeholder={placeholder}
                mono={mono}
                uppercase={uppercase}
                canEdit={canEditFields}
                onSave={(newValue) => handleFieldSave(field, newValue)}
                inputKey={`${job.id}-${field}`}
            />
        );
    }, [canEditFields, handleFieldSave, job.id]);

    // Checkbox control item with glassmorphism theme
    const ControlItem = ({ label, checked, onChange, disabled = false, crossedOut = false }) => {
        const handleClick = (e) => {
            if (disabled || crossedOut) return;
            e.preventDefault();
            e.stopPropagation();
            onChange();
        };

        return (
            <div
                onClick={handleClick}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors select-none
                    ${crossedOut ? 'opacity-50 cursor-not-allowed' : disabled ? 'cursor-default' : 'cursor-pointer hover:bg-white/5'}
                    ${checked ? 'bg-accent/10 border border-accent/30' : 'surface border border-subtle'}`}
            >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors
                    ${checked ? 'bg-accent border-accent' : 'bg-transparent border-muted'}
                    ${crossedOut || disabled ? 'opacity-50' : ''}`}>
                    {checked && <Check size={12} className="text-white" />}
                </div>
                <span className={`text-sm font-medium ${crossedOut ? 'line-through text-muted' : checked ? 'text-accent' : 'text-secondary'}`}>
                    {label}
                </span>
                {crossedOut && <span className="text-xs text-muted">N/A</span>}
            </div>
        );
    };

    // File Car-In Button with loading states
    const FileCarInButton = ({ job, onUpdate }) => {
        const [status, setStatus] = useState('idle'); // idle, loading, success, failed

        // Check if already filed in (persisted in job data)
        const alreadyFiled = (job.timeline || []).some(event => event.type === 'car_in') || job.car_filed_in === true;

        const handleClick = async () => {
            if (status === 'loading' || alreadyFiled) return;

            setStatus('loading');

            try {
                const token = getAuthToken();
                const response = await fetch(`${API_URL}/file-car-in`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        vehicle_year: job.vehicle_year,
                        vehicle_make_model: job.vehicle_make_model,
                        vehicle_plate: job.vehicle_plate,
                        items: job.items || []
                    })
                });

                const result = await response.json();

                if (response.ok) {
                    setStatus('success');
                    // Add timeline entry AND mark as filed
                    const newTimeline = [...(job.timeline || []), {
                        type: 'car_in',
                        timestamp: new Date().toISOString(),
                        label: '🚗 Vehicle dropped off and filed car-in.'
                    }];
                    onUpdate(job.id, {
                        timeline: newTimeline,
                        car_filed_in: true,  // Persist the filed state
                        car_here: true       // Mark car as on site
                    });
                } else {
                    console.error('File Car-In error:', result.error);
                    setStatus('failed');
                    setTimeout(() => setStatus('idle'), 2000);
                }
            } catch (error) {
                console.error('File Car-In error:', error);
                setStatus('failed');
                setTimeout(() => setStatus('idle'), 2000);
            }
        };

        // Determine visual state: already filed takes priority, then current status
        const showSuccess = alreadyFiled || status === 'success';
        const showLoading = status === 'loading';
        const showFailed = status === 'failed';

        return (
            <button
                onClick={handleClick}
                disabled={showLoading || showSuccess}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold font-code uppercase transition-all
                    ${showLoading ? 'bg-orange-500/20 text-orange-400 border-2 border-orange-400/30' :
                        showSuccess ? 'bg-green-500/20 text-green-400 border-2 border-green-400/30' :
                            showFailed ? 'bg-accent/20 text-accent border-2 border-accent/30' :
                                'bg-orange-500/20 text-orange-400 border-2 border-orange-400/30 hover:bg-orange-500/30'}`}
            >
                {showLoading ? (
                    <>
                        <Loader2 size={18} className="animate-spin" />
                        Filing...
                    </>
                ) : showSuccess ? (
                    <>
                        <CheckCircle size={18} />
                        Car-In Filed
                    </>
                ) : showFailed ? (
                    <>
                        <XCircle size={18} />
                        Failed
                    </>
                ) : (
                    <>
                        <Car size={18} />
                        File Car-In
                    </>
                )}
            </button>
        );
    };
    // Parts Status Container for In Progress stage
    const PartsStatusContainer = ({ partsToOrder, job, onUpdate, isExpanded, setIsExpanded }) => {

        // Count arrived - if job.parts_arrived is true, all are arrived
        const arrivedCount = job.parts_arrived
            ? partsToOrder.length
            : partsToOrder.filter(p => p.arrived).length;
        const totalParts = partsToOrder.length;
        const allArrived = arrivedCount === totalParts;

        const togglePartStatus = (partIndex) => {
            const updatedItems = [...job.items];
            const item = updatedItems[partIndex];

            // Cycle through: Not Ordered -> Ordered -> Arrived -> Not Ordered
            if (item.arrived) {
                // Arrived -> Not Ordered
                item.ordered = false;
                item.arrived = false;
            } else if (item.ordered) {
                // Ordered -> Arrived
                item.arrived = true;
            } else {
                // Not Ordered -> Ordered
                item.ordered = true;
            }

            onUpdate(job.id, { items: updatedItems });
        };

        const getPartStatus = (part) => {
            // Check individual status first, then fall back to global flags
            if (part.arrived || job.parts_arrived) return { label: 'Arrived', color: 'text-green-400 bg-green-500/20', icon: CheckCircle };
            if (part.ordered || job.parts_ordered) return { label: 'Ordered', color: 'text-yellow-400 bg-yellow-500/20', icon: Clock };
            return { label: 'Not Ordered', color: 'text-muted surface', icon: Package };
        };

        if (totalParts === 0) return null;

        return (
            <div className="glass-elevated rounded-2xl border border-subtle overflow-hidden mb-6">
                {/* Header - Clickable to expand */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`w-full flex items-center justify-between p-4 transition-colors ${allArrived ? 'bg-green-500/10 hover:bg-green-500/20' : 'bg-orange-500/10 hover:bg-orange-500/20'
                        }`}
                >
                    <div className="flex items-center gap-3">
                        {allArrived ? (
                            <CheckCircle size={20} className="text-green-400" />
                        ) : (
                            <AlertTriangle size={20} className="text-orange-400" />
                        )}
                        <span className={`font-bold ${allArrived ? 'text-green-400' : 'text-orange-400'
                            }`}>
                            {allArrived ? 'All Parts Arrived!' : 'Missing Few Parts'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${allArrived ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'
                            }`}>
                            {arrivedCount}/{totalParts}
                        </span>
                    </div>
                    <ChevronDown
                        size={20}
                        className={`transition-transform duration-200 ${allArrived ? 'text-green-400' : 'text-orange-400'
                            } ${isExpanded ? 'rotate-180' : ''}`}
                    />
                </button>

                {/* Expandable Content with Animation */}
                <div
                    className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                        }`}
                >
                    <div className="overflow-hidden">
                        <div className="border-t border-subtle divide-y divide-subtle">
                            {partsToOrder.map((part, idx) => {
                                const status = getPartStatus(part);
                                const StatusIcon = status.icon;

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => togglePartStatus(part.originalIndex)}
                                        className="w-full flex items-center justify-between p-3 hover:bg-surface-hover transition-colors text-left"
                                    >
                                        <span className="text-sm text-secondary truncate flex-1">
                                            {part.desc || 'Unknown part'}
                                        </span>
                                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                                            <StatusIcon size={12} />
                                            {status.label}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Format timeline date
    const formatTimelineDate = (timestamp) => {
        const d = new Date(timestamp);
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="h-full flex flex-col glass">
            {/* Header */}
            <div className="glass-elevated px-6 py-4 border-b border-subtle shrink-0 relative z-30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="p-2 rounded-lg hover:bg-white/5 text-muted transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-black text-primary font-code">
                                {job.vehicle_year} {job.vehicle_make_model || 'Unknown Vehicle'}
                            </h1>
                            <div className="flex items-center gap-4 text-sm text-muted mt-0.5">
                                <span className="flex items-center gap-1">
                                    <User size={12} />
                                    {job.customer_name || 'Unknown'}
                                </span>
                                {job.customer_phone && (
                                    <span className="flex items-center gap-1">
                                        <Phone size={12} />
                                        {job.customer_phone}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex items-center gap-1">
                        {stages.map((stage, idx) => {
                            const isCompleted = idx < currentStageIndex;
                            const isCurrent = idx === currentStageIndex;
                            return (
                                <div key={stage.key} className="flex items-center">
                                    <div
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold font-code
                                            transition-all duration-500 ease-out transform
                                            ${isCompleted ? 'bg-accent/20 text-accent scale-100' :
                                                isCurrent ? 'bg-accent text-white scale-105 shadow-lg shadow-accent/30 animate-pulse' :
                                                    'surface text-muted scale-95 opacity-70'}`}
                                        style={{
                                            animationDuration: isCurrent ? '2s' : '0s'
                                        }}
                                    >
                                        <span className={`transition-transform duration-300 ${isCompleted ? 'rotate-0' : 'rotate-0'}`}>
                                            {isCompleted ? <Check size={12} /> : <CircleDot size={12} />}
                                        </span>
                                        <span className="hidden lg:inline">{stage.label}</span>
                                    </div>
                                    {idx < stages.length - 1 && (
                                        <div
                                            className={`h-0.5 mx-0.5 transition-all duration-500 ease-out
                                                ${idx < currentStageIndex ? 'w-6 bg-accent' : 'w-4 bg-white/10'}`}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        {/* PDF Button - View in New Tab */}
                        <BlobProvider document={pdfDocument}>
                            {({ url, loading }) => (
                                <button
                                    onClick={() => url && window.open(url, '_blank')}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-xs font-bold font-code uppercase rounded-lg hover:bg-accent/80 transition-colors disabled:opacity-50"
                                    title="View Work Order"
                                >
                                    <ClipboardList size={14} />
                                    {loading ? '...' : 'Work Order'}
                                </button>
                            )}
                        </BlobProvider>

                        {/* Actions Dropdown */}
                        <div className="relative">
                            {!isConfirmedStage && !isDoneStage && isEditing ? (
                                /* Show Save/Cancel when editing */
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={cancelEditing}
                                        className="flex items-center gap-2 px-4 py-2 text-muted text-xs font-bold font-code uppercase rounded-lg border border-subtle hover:bg-white/5 transition-colors"
                                    >
                                        <X size={14} />
                                        Cancel
                                    </button>
                                    <button
                                        onClick={saveEdits}
                                        className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-xs font-bold font-code uppercase rounded-lg hover:bg-accent/80 transition-colors"
                                    >
                                        <Save size={14} />
                                        Save
                                    </button>
                                </div>
                            ) : (
                                /* Show Actions Menu Button */
                                <div className="relative">
                                    <button
                                        onClick={() => setShowActionsMenu(!showActionsMenu)}
                                        onBlur={() => setTimeout(() => setShowActionsMenu(false), 200)}
                                        className="flex items-center gap-2 px-4 py-2 text-secondary glass-elevated border border-subtle rounded-lg hover:bg-white/5 transition-colors text-xs font-bold font-code uppercase"
                                    >
                                        <CircleDot size={14} />
                                        Actions
                                    </button>

                                    {showActionsMenu && (
                                        <div className="absolute right-0 top-full mt-2 w-48 dropdown-menu rounded-xl py-1 z-[100]">
                                            {!isConfirmedStage && !isDoneStage && (
                                                <button
                                                    onClick={() => {
                                                        startEditing();
                                                        setShowActionsMenu(false);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-secondary hover:bg-white/5 text-left"
                                                >
                                                    <Edit3 size={14} />
                                                    Edit Details
                                                </button>
                                            )}

                                            {/* Export to Google Calendar */}
                                            <button
                                                onClick={async () => {
                                                    setShowActionsMenu(false);
                                                    try {
                                                        const token = getAuthToken();
                                                        const response = await fetch(`${API_URL}/create-calendar-event`, {
                                                            method: 'POST',
                                                            headers: {
                                                                'Content-Type': 'application/json',
                                                                'Authorization': `Bearer ${token}`
                                                            },
                                                            body: JSON.stringify({
                                                                vehicle_year: job.vehicle_year,
                                                                vehicle_make_model: job.vehicle_make_model,
                                                                vehicle_plate: job.vehicle_plate,
                                                                customer_name: job.customer_name,
                                                                customer_phone: job.customer_phone,
                                                                items: job.items || [],
                                                                start_date: job.start_date,
                                                                end_date: job.end_date
                                                            })
                                                        });

                                                        const result = await response.json();

                                                        if (response.ok && result.success) {
                                                            // Add timeline entry
                                                            const newTimeline = [...(job.timeline || []), {
                                                                type: 'calendar_export',
                                                                timestamp: new Date().toISOString(),
                                                                label: '📅 Exported to Google Calendar'
                                                            }];
                                                            onUpdate(job.id, { timeline: newTimeline });
                                                            alert(`✅ Exported to Google Calendar!\n\nEvent: ${result.title}\nDates: ${result.start} to ${result.end}`);
                                                        } else {
                                                            alert(`❌ Error: ${result.error || 'Unknown error'}`);
                                                        }
                                                    } catch (error) {
                                                        console.error('Export to Calendar error:', error);
                                                        alert(`❌ Failed to export: ${error.message}`);
                                                    }
                                                }}
                                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-secondary hover:bg-white/5 text-left"
                                            >
                                                <Calendar size={14} />
                                                Export to Google Calendar
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setShowDeleteConfirm(true);
                                                    setShowActionsMenu(false);
                                                }}
                                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-accent hover:bg-accent/10 text-left"
                                            >
                                                <Trash2 size={14} />
                                                Delete Job
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Confirmed Stage Badge */}
                {isConfirmedStage && (
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold font-code surface border border-subtle text-accent">
                        <Clock size={12} />
                        Initial Commitment
                    </div>
                )}

                {/* Preparation Phase Badge */}
                {isPreparationStage && prepPhase && (
                    <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold font-code
                        ${prepPhase.color === 'red' ? 'bg-accent/20 text-accent' :
                            prepPhase.color === 'orange' ? 'bg-orange-500/20 text-orange-400' :
                                prepPhase.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' :
                                    prepPhase.color === 'blue' ? 'bg-blue-500/20 text-blue-400' :
                                        prepPhase.color === 'purple' ? 'bg-purple-500/20 text-purple-400' :
                                            prepPhase.color === 'green' ? 'bg-green-500/20 text-green-400' :
                                                'surface text-muted'}`}>
                        <Clock size={12} />
                        {prepPhase.label}
                        {prepPhase.phase === 'arrange_dropoff' && (
                            <span className="text-xs font-normal ml-1">- Call customer to arrange drop off</span>
                        )}
                    </div>
                )}

                {/* In Progress Stage Badge with Countdown */}
                {isInProgressStage && (
                    <div className="mt-3 flex items-center gap-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold font-code bg-accent/20 text-accent">
                            <Wrench size={12} />
                            Work in Progress
                        </div>
                        {job.end_date && (() => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const endDate = new Date(job.end_date + 'T00:00:00');
                            const diffTime = endDate - today;
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                            let bgColor, textColor, label;
                            if (diffDays <= 0) {
                                bgColor = 'bg-accent/20';
                                textColor = 'text-accent';
                                if (diffDays === 0) {
                                    label = 'Due Today';
                                } else {
                                    label = `${Math.abs(diffDays)} Day${Math.abs(diffDays) !== 1 ? 's' : ''} Overdue`;
                                }
                            } else if (diffDays < 2) {
                                bgColor = 'bg-orange-500/20';
                                textColor = 'text-orange-400';
                                label = `${diffDays} Day Left`;
                            } else {
                                bgColor = 'bg-green-500/20';
                                textColor = 'text-green-400';
                                label = `${diffDays} Days Left`;
                            }

                            return (
                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold font-code ${bgColor} ${textColor}`}>
                                    <Calendar size={12} />
                                    {label}
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className={`mx-auto grid gap-6 ${isConfirmedStage
                    ? 'max-w-4xl grid-cols-1'
                    : (isPreparationStage || isInProgressStage || isReadyStage)
                        ? 'max-w-[1600px] grid-cols-1 lg:grid-cols-5'
                        : 'max-w-7xl grid-cols-1 lg:grid-cols-2'
                    }`}>

                    {/* LEFT COLUMN */}
                    <div className={`space-y-6 ${(isPreparationStage || isInProgressStage || isReadyStage) ? 'lg:col-span-1 lg:sticky lg:top-6 lg:self-start' : ''}`}>

                        {/* Tabbed Customer & Rental Section - Only in Confirmed Stage */}
                        {isConfirmedStage ? (
                            <div className="glass-elevated rounded-2xl border border-subtle overflow-hidden">
                                {/* Tabs */}
                                <div className="flex border-b border-subtle">
                                    <button
                                        onClick={() => setActiveTab('customer')}
                                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold font-code transition-colors
                                            ${activeTab === 'customer'
                                                ? 'glass text-accent border-b-2 border-accent'
                                                : 'surface text-muted hover:text-secondary'}`}
                                    >
                                        <Car size={16} />
                                        Customer & Vehicle
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('rental')}
                                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold font-code transition-colors
                                            ${activeTab === 'rental'
                                                ? 'glass text-accent border-b-2 border-accent'
                                                : 'surface text-muted hover:text-secondary'}`}
                                    >
                                        <Key size={16} />
                                        Rental Info
                                    </button>
                                </div>

                                {/* Tab Content */}
                                <div className="p-5">
                                    {activeTab === 'customer' ? (
                                        <div className="grid grid-cols-2 gap-4">
                                            <EditableField label="Customer Name" field="customer_name" value={job.customer_name} />
                                            <EditableField label="Phone" field="customer_phone" value={job.customer_phone} type="tel" />

                                            <div className="col-span-2 border-t border-subtle pt-4 mt-2">
                                                <div className="grid grid-cols-3 gap-2">
                                                    <EditableField label="Year" field="vehicle_year" value={job.vehicle_year} />
                                                    <div className="col-span-2">
                                                        <EditableField label="Make & Model" field="vehicle_make_model" value={job.vehicle_make_model} />
                                                    </div>
                                                </div>
                                            </div>

                                            <EditableField label="Plate" field="vehicle_plate" value={job.vehicle_plate} uppercase />
                                            <EditableField label="VIN" field="vehicle_vin" value={job.vehicle_vin} mono uppercase />

                                            {/* Schedule */}
                                            <div className="col-span-2 border-t border-subtle pt-4 mt-2">
                                                <label className="text-[10px] font-bold text-muted uppercase">Schedule</label>
                                                <input
                                                    ref={dateRangeRef}
                                                    type="text"
                                                    readOnly
                                                    value={formatDateRange()}
                                                    placeholder="Select Date Range..."
                                                    className={`w-full mt-1 uppercase text-center rounded-lg border-2 py-2.5 px-4 outline-none transition-all text-sm font-bold font-code
                                                        ${canEditFields ? 'cursor-pointer hover:border-subtle' : 'cursor-not-allowed surface'}
                                                        ${(job.start_date && job.end_date)
                                                            ? 'bg-blue-500/20 border-blue-400/30 text-blue-300'
                                                            : 'surface border-dashed border-subtle text-muted'}`}
                                                />
                                                {job.start_date && job.end_date && (
                                                    <p className="text-[10px] text-center text-blue-400 font-bold font-code mt-1">
                                                        Duration: {getDuration()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-4">
                                            <EditableField label="Rental Company" field="rental_company" value={job.rental_company} placeholder="Enterprise, Hertz..." />

                                            <div>
                                                <label className="text-[10px] font-bold text-muted uppercase font-code">Rental Start Date</label>
                                                <input
                                                    ref={rentalStartRef}
                                                    type="text"
                                                    readOnly
                                                    value={formatRentalDate()}
                                                    placeholder="Select Rental Start..."
                                                    className={`w-full mt-1 uppercase text-center rounded-lg border-2 py-2.5 px-4 outline-none transition-all text-sm font-bold font-code
                                                        ${canEditFields ? 'cursor-pointer hover:border-subtle' : 'cursor-not-allowed surface'}
                                                        ${job.rental_start_date
                                                            ? 'bg-blue-500/20 border-blue-400/30 text-blue-300'
                                                            : 'surface border-dashed border-subtle text-muted'}`}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (isPreparationStage || isInProgressStage || isReadyStage) ? (
                            <>
                                {/* Preparation stage shows tabbed Case Info container */}
                                <div className="glass-elevated rounded-2xl border border-subtle overflow-hidden">
                                    {/* Tabs */}
                                    <div className="flex border-b border-subtle">
                                        <button
                                            onClick={() => setPrepTab('case')}
                                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold font-code transition-colors
                                            ${prepTab === 'case' || prepTab === 'vehicle' || prepTab === 'customer'
                                                    ? 'glass text-accent border-b-2 border-accent'
                                                    : 'surface text-muted hover:text-secondary'}`}
                                        >
                                            <Car size={16} />
                                            Case
                                        </button>
                                        <button
                                            onClick={() => setPrepTab('rental')}
                                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold font-code transition-colors
                                            ${prepTab === 'rental'
                                                    ? 'glass text-accent border-b-2 border-accent'
                                                    : hasRentalInfo && !job.rental_requested
                                                        ? 'bg-yellow-500/20 text-yellow-400 border-b-2 border-yellow-400'
                                                        : 'surface text-muted hover:text-secondary'}`}
                                        >
                                            {hasRentalInfo ? (
                                                job.rental_requested ? (
                                                    <CheckCircle size={16} className="text-green-400" />
                                                ) : (
                                                    <AlertTriangle size={16} className="text-yellow-400" />
                                                )
                                            ) : (
                                                <Key size={16} />
                                            )}
                                            Rental
                                        </button>
                                    </div>

                                    {/* Tab Content */}
                                    <div className="p-4">
                                        {prepTab !== 'rental' ? (
                                            /* Case Tab - Combined Vehicle & Customer with compact layout */
                                            <div className="space-y-3">
                                                {/* Vehicle - Single line */}
                                                <div>
                                                    <label className="text-[9px] font-bold text-muted font-code uppercase">Vehicle</label>
                                                    <p className="text-sm font-bold text-primary truncate">
                                                        {job.vehicle_year} {job.vehicle_make_model || '—'}
                                                    </p>
                                                </div>

                                                {/* Plate & VIN - Second row */}
                                                <div className="flex items-center gap-4">
                                                    <div>
                                                        <label className="text-[9px] font-bold text-muted font-code uppercase">Plate</label>
                                                        <p className="text-sm font-mono font-bold text-accent uppercase">
                                                            {job.vehicle_plate || '—'}
                                                        </p>
                                                    </div>
                                                    <div className="flex-1 min-w-0 overflow-hidden">
                                                        <label className="text-[9px] font-bold text-muted font-code uppercase">VIN</label>
                                                        <p className="text-xs font-mono text-secondary uppercase truncate">{job.vehicle_vin || '—'}</p>
                                                    </div>
                                                </div>

                                                {/* Divider */}
                                                <div className="border-t border-subtle"></div>

                                                {/* Customer Info - Compact */}
                                                <div className="flex items-center gap-4 overflow-hidden">
                                                    <div className="flex-1 min-w-0 overflow-hidden">
                                                        <label className="text-[9px] font-bold text-muted font-code uppercase">Customer</label>
                                                        <p className="text-sm font-medium text-primary truncate">{job.customer_name || '—'}</p>
                                                    </div>
                                                    <div className="shrink-0">
                                                        <label className="text-[9px] font-bold text-muted font-code uppercase">Phone</label>
                                                        <p className="text-sm font-medium text-secondary">{job.customer_phone || '—'}</p>
                                                    </div>
                                                </div>

                                                {/* Divider */}
                                                <div className="border-t border-subtle"></div>

                                                {/* Schedule - Display mode vs Edit mode */}
                                                <div>
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[9px] font-bold text-muted font-code uppercase">Schedule</label>
                                                        {job.start_date && job.end_date && !isInProgressStage && (
                                                            <button
                                                                type="button"
                                                                onClick={() => onUpdate(job.id, { start_date: null, end_date: null })}
                                                                className="p-0.5 text-muted hover:text-accent hover:bg-accent/10 rounded transition-colors"
                                                                title="Reset schedule"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    {isInProgressStage ? (
                                                        /* In Progress stage - custom date layout */
                                                        <div className="mt-2 space-y-3">
                                                            {/* Started Date and Duration on same line */}
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div className="bg-blue-500/20 rounded-lg py-2 px-3 text-center">
                                                                    <p className="text-[9px] text-blue-400 font-medium font-code uppercase">Started Date</p>
                                                                    {isEditing ? (
                                                                        <input
                                                                            type="date"
                                                                            value={job.start_date || ''}
                                                                            onChange={(e) => onUpdate(job.id, { start_date: e.target.value })}
                                                                            className="w-full mt-1 text-xs font-bold text-blue-300 bg-transparent border border-blue-400/30 rounded px-2 py-1 text-center uppercase"
                                                                        />
                                                                    ) : (
                                                                        <p className="text-xs font-bold text-blue-300 uppercase mt-1">
                                                                            {job.start_date ? new Date(job.start_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '-'}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                <div className="bg-green-500/20 rounded-lg py-2 px-3 text-center">
                                                                    <p className="text-[9px] text-green-400 font-medium font-code uppercase">Duration</p>
                                                                    <p className="text-xs font-bold text-green-300 mt-1">{getDuration()}</p>
                                                                </div>
                                                            </div>
                                                            {/* Est. Due Date */}
                                                            <div className="bg-orange-500/20 rounded-lg py-2 px-3 text-center">
                                                                <p className="text-[9px] text-orange-400 font-medium font-code uppercase">Est. Due Date</p>
                                                                <p className="text-sm font-bold text-orange-300 mt-1">
                                                                    {job.end_date ? new Date(job.end_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Not Set'}
                                                                </p>
                                                            </div>
                                                            {/* Change Due Date Button */}
                                                            {/* Change Due Date Button */}
                                                            <div className="relative">
                                                                <input
                                                                    ref={changeDueDateRef}
                                                                    type="date"
                                                                    value={job.end_date || ''}
                                                                    onChange={(e) => handleDueDateChange(e.target.value)}
                                                                    className="absolute top-0 left-0 w-0 h-0 opacity-0 pointer-events-none"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (changeDueDateRef.current) {
                                                                            try {
                                                                                changeDueDateRef.current.showPicker();
                                                                            } catch (e) {
                                                                                // Fallback for older browsers
                                                                                changeDueDateRef.current.focus();
                                                                                changeDueDateRef.current.click();
                                                                            }
                                                                        }
                                                                    }}
                                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold font-code text-accent glass-elevated border border-accent/30 hover:bg-accent/10 transition-colors"
                                                                >
                                                                    <Calendar size={14} />
                                                                    Change Due Date
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : isEditing || !job.start_date || !job.end_date ? (
                                                        /* Edit mode or no dates - show date picker */
                                                        <div className="relative mt-1">
                                                            <input
                                                                ref={dateRangeRef}
                                                                type="text"
                                                                readOnly
                                                                value={formatDateRange()}
                                                                placeholder="Select Date Range..."
                                                                className={`w-full uppercase text-center rounded-lg border-2 py-2 px-3 outline-none transition-all text-xs font-bold font-code
                                                                ${(canEditFields || !job.start_date || !job.end_date) ? 'cursor-pointer hover:border-subtle' : 'cursor-not-allowed surface'}
                                                                ${(job.start_date && job.end_date)
                                                                        ? 'bg-blue-500/20 border-blue-400/30 text-blue-300'
                                                                        : (job.car_here && (!hasParts || job.parts_arrived))
                                                                            ? 'bg-accent/20 border-accent text-accent animate-pulse'
                                                                            : 'surface border-dashed border-subtle text-muted'}`}
                                                            />
                                                        </div>
                                                    ) : (
                                                        /* Display mode - show dates separately with duration */
                                                        <div className="mt-1 grid grid-cols-3 gap-2 text-center">
                                                            <div className="bg-blue-500/20 rounded-lg py-2 px-2">
                                                                <p className="text-[9px] text-blue-400 font-medium font-code uppercase">Start</p>
                                                                <p className="text-xs font-bold text-blue-300 uppercase">
                                                                    {new Date(job.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                                </p>
                                                            </div>
                                                            <div className="bg-green-500/20 rounded-lg py-2 px-2">
                                                                <p className="text-[9px] text-green-400 font-medium font-code uppercase">Duration</p>
                                                                <p className="text-xs font-bold text-green-300">{getDuration()}</p>
                                                            </div>
                                                            <div className="bg-blue-500/20 rounded-lg py-2 px-2">
                                                                <p className="text-[9px] text-blue-400 font-medium font-code uppercase">End</p>
                                                                <p className="text-xs font-bold text-blue-300 uppercase">
                                                                    {new Date(job.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {/* Warning when schedule required but not set */}
                                                    {!job.start_date && !job.end_date && job.car_here && (!hasParts || job.parts_arrived) && (
                                                        <p className="mt-1 text-xs text-accent font-medium flex items-center gap-1">
                                                            <AlertTriangle size={12} />
                                                            Please set schedule before starting work
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Divider */}
                                                <div className="border-t border-subtle"></div>

                                                {/* File Car-In Button - Only in Preparation Stage */}
                                                {isPreparationStage && (
                                                    <FileCarInButton job={job} onUpdate={onUpdate} />
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {isEditing ? (
                                                    /* Editable rental fields in edit mode */
                                                    <div className="space-y-4">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="text-[9px] font-bold text-gray-400 uppercase">Rental Company</label>
                                                                <input
                                                                    type="text"
                                                                    defaultValue={job.rental_company || ''}
                                                                    onBlur={(e) => {
                                                                        if (e.target.value !== (job.rental_company || '')) {
                                                                            setEditedJob({ ...editedJob, rental_company: e.target.value });
                                                                        }
                                                                    }}
                                                                    placeholder="Enter company..."
                                                                    className="w-full mt-1 px-3 py-2 surface text-primary border border-subtle rounded-lg text-sm focus:border-accent outline-none"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-[9px] font-bold text-gray-400 uppercase">Rental Vehicle</label>
                                                                <input
                                                                    type="text"
                                                                    defaultValue={job.rental_vehicle || ''}
                                                                    onBlur={(e) => {
                                                                        if (e.target.value !== (job.rental_vehicle || '')) {
                                                                            setEditedJob({ ...editedJob, rental_vehicle: e.target.value });
                                                                        }
                                                                    }}
                                                                    placeholder="Enter vehicle..."
                                                                    className="w-full mt-1 px-3 py-2 surface text-primary border border-subtle rounded-lg text-sm focus:border-accent outline-none"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-bold text-gray-400 uppercase">Rental Start Date</label>
                                                            <div className="relative mt-1">
                                                                <input
                                                                    ref={rentalStartRef}
                                                                    type="text"
                                                                    readOnly
                                                                    value={formatRentalDate() || ''}
                                                                    placeholder="Select date..."
                                                                    className="w-full px-3 py-2 surface text-primary border border-subtle rounded-lg text-sm focus:border-accent outline-none cursor-pointer"
                                                                />
                                                                {job.rental_start_date && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setEditedJob({ ...editedJob, rental_start_date: null });
                                                                            onUpdate(job.id, { rental_start_date: null });
                                                                        }}
                                                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-accent hover:bg-accent/20 rounded transition-colors"
                                                                        title="Clear date"
                                                                    >
                                                                        <X size={14} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-bold text-gray-400 uppercase">Rental Notes</label>
                                                            <textarea
                                                                defaultValue={job.rental_notes || ''}
                                                                onBlur={(e) => {
                                                                    if (e.target.value !== (job.rental_notes || '')) {
                                                                        setEditedJob({ ...editedJob, rental_notes: e.target.value });
                                                                    }
                                                                }}
                                                                placeholder="Add rental notes..."
                                                                className="w-full mt-1 px-3 py-2 surface text-primary border border-subtle rounded-lg text-sm focus:border-accent outline-none resize-none h-20"
                                                            />
                                                        </div>
                                                    </div>
                                                ) : hasRentalInfo ? (
                                                    <>
                                                        {/* Read-only rental info display */}
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="text-[9px] font-bold text-muted uppercase">Rental Company</label>
                                                                <p className="text-sm font-bold text-primary">{job.rental_company || '—'}</p>
                                                            </div>
                                                            <div>
                                                                <label className="text-[9px] font-bold text-muted uppercase">Rental Vehicle</label>
                                                                <p className="text-sm font-bold text-primary">{job.rental_vehicle || '—'}</p>
                                                            </div>
                                                        </div>
                                                        {job.rental_start_date && (
                                                            <div>
                                                                <label className="text-[9px] font-bold text-muted uppercase">Rental Start Date</label>
                                                                <p className="text-sm font-bold text-blue-400">{formatRentalDate()}</p>
                                                            </div>
                                                        )}
                                                        {job.rental_notes && (
                                                            <div>
                                                                <label className="text-[9px] font-bold text-muted uppercase">Notes</label>
                                                                <p className="text-sm text-secondary mt-1">{job.rental_notes}</p>
                                                            </div>
                                                        )}

                                                        {/* Rental Requested Button */}
                                                        <div className="pt-3 border-t border-subtle">
                                                            <button
                                                                onClick={() => toggleRentalRequested(job.id, job.rental_requested)}
                                                                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold uppercase transition-all
                                                                    ${job.rental_requested
                                                                        ? 'bg-green-500/20 text-green-400 border-2 border-green-400/30'
                                                                        : 'bg-yellow-500/20 text-yellow-400 border-2 border-yellow-400/30 hover:bg-yellow-500/30'}`}
                                                            >
                                                                {job.rental_requested ? (
                                                                    <>
                                                                        <CheckCircle size={18} />
                                                                        Rental Requested
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <AlertTriangle size={18} />
                                                                        Request Rental
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-center py-6">
                                                        <Key size={32} className="mx-auto text-muted mb-2" />
                                                        <p className="text-sm font-medium text-muted">No Rental Information</p>
                                                        <p className="text-xs text-muted mt-1">Rental info can be edited in Edit Mode</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            /* Other non-confirmed stages show the original Customer & Vehicle container */
                            <Container title="Customer & Vehicle Details" icon={Car}>
                                <div className="grid grid-cols-2 gap-4">
                                    <EditableField label="Customer Name" field="customer_name" value={job.customer_name} />
                                    <EditableField label="Phone" field="customer_phone" value={job.customer_phone} type="tel" />

                                    <div className="col-span-2 border-t border-gray-100 pt-4 mt-2">
                                        <div className="grid grid-cols-3 gap-2">
                                            <EditableField label="Year" field="vehicle_year" value={job.vehicle_year} />
                                            <div className="col-span-2">
                                                <EditableField label="Make & Model" field="vehicle_make_model" value={job.vehicle_make_model} />
                                            </div>
                                        </div>
                                    </div>

                                    <EditableField label="Plate" field="vehicle_plate" value={job.vehicle_plate} uppercase />
                                    <EditableField label="VIN" field="vehicle_vin" value={job.vehicle_vin} mono uppercase />

                                    {/* Schedule */}
                                    <div className="col-span-2 border-t border-gray-100 pt-4 mt-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Schedule</label>
                                        <input
                                            ref={dateRangeRef}
                                            type="text"
                                            readOnly
                                            value={formatDateRange()}
                                            placeholder="Select Date Range..."
                                            className={`w-full mt-1 uppercase text-center rounded-lg border-2 py-2.5 px-4 outline-none transition-all text-sm font-bold
                                                ${canEditFields ? 'cursor-pointer hover:border-subtle' : 'cursor-not-allowed surface'}
                                                ${(job.start_date && job.end_date)
                                                    ? 'bg-blue-500/20 border-blue-400/30 text-blue-300'
                                                    : 'surface border-dashed border-subtle text-muted'}`}
                                        />
                                        {job.start_date && job.end_date && (
                                            <p className="text-[10px] text-center text-blue-600 font-bold mt-1">
                                                Duration: {getDuration()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </Container>
                        )}

                        {/* Repair Lists - with inline editing matching work order structure */}
                        {/* Only show in LEFT COLUMN for Confirmed stage */}
                        {isConfirmedStage && (
                            <Container
                                title="Repair Lists"
                                icon={FileText}
                                titleBadge={job.items?.length > 0 ? (
                                    <span className="ml-2 px-2 py-0.5 rounded-full surface border border-subtle text-muted text-[10px] font-bold font-code">
                                        {job.items.length}
                                    </span>
                                ) : null}
                            >
                                {job.items && job.items.length > 0 ? (
                                    isConfirmedStage && canEditFields ? (
                                        /* Editable list for Confirmed stage */
                                        <div className="space-y-3">
                                            {job.items.map((item, idx) => (
                                                <RepairItemRow
                                                    key={idx}
                                                    item={item}
                                                    index={idx}
                                                    onUpdate={handleUpdateItem}
                                                    onDelete={handleDeleteItem}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        /* Categorized read-only grid for other stages */
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Replace Items */}
                                            {job.items.filter(i => i.type?.toLowerCase() === 'replace').length > 0 && (
                                                <div className="bg-accent/10 rounded-xl p-4 border border-accent/20">
                                                    <h4 className="text-[10px] font-black uppercase text-accent mb-3 flex items-center gap-2 font-code">
                                                        <span className="w-5 h-5 rounded bg-accent/20 flex items-center justify-center text-accent">
                                                            {job.items.filter(i => i.type?.toLowerCase() === 'replace').length}
                                                        </span>
                                                        Replace
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {job.items.filter(i => i.type?.toLowerCase() === 'replace').map((item, idx) => (
                                                            <div key={idx} className="text-sm text-secondary flex items-center gap-2">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0"></span>
                                                                <span className="flex-1 truncate">{item.desc}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Repair Items */}
                                            {job.items.filter(i => i.type?.toLowerCase() === 'repair').length > 0 && (
                                                <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-400/20">
                                                    <h4 className="text-[10px] font-black uppercase text-blue-400 mb-3 flex items-center gap-2 font-code">
                                                        <span className="w-5 h-5 rounded bg-blue-500/20 flex items-center justify-center text-blue-400">
                                                            {job.items.filter(i => i.type?.toLowerCase() === 'repair').length}
                                                        </span>
                                                        Repair
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {job.items.filter(i => i.type?.toLowerCase() === 'repair').map((item, idx) => (
                                                            <div key={idx} className="text-sm text-secondary flex items-center gap-2">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></span>
                                                                <span className="flex-1 truncate">{item.desc}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Blend Items */}
                                            {job.items.filter(i => i.type?.toLowerCase() === 'blend').length > 0 && (
                                                <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-400/20">
                                                    <h4 className="text-[10px] font-black uppercase text-purple-400 mb-3 flex items-center gap-2 font-code">
                                                        <span className="w-5 h-5 rounded bg-purple-500/20 flex items-center justify-center text-purple-400">
                                                            {job.items.filter(i => i.type?.toLowerCase() === 'blend').length}
                                                        </span>
                                                        Blend
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {job.items.filter(i => i.type?.toLowerCase() === 'blend').map((item, idx) => (
                                                            <div key={idx} className="text-sm text-secondary flex items-center gap-2">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0"></span>
                                                                <span className="flex-1 truncate">{item.desc}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Polish/Other Items */}
                                            {job.items.filter(i => !['replace', 'repair', 'blend'].includes(i.type?.toLowerCase())).length > 0 && (
                                                <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-400/20">
                                                    <h4 className="text-[10px] font-black uppercase text-amber-400 mb-3 flex items-center gap-2 font-code">
                                                        <span className="w-5 h-5 rounded bg-amber-500/20 flex items-center justify-center text-amber-400">
                                                            {job.items.filter(i => !['replace', 'repair', 'blend'].includes(i.type?.toLowerCase())).length}
                                                        </span>
                                                        Other
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {job.items.filter(i => !['replace', 'repair', 'blend'].includes(i.type?.toLowerCase())).map((item, idx) => (
                                                            <div key={idx} className="text-sm text-secondary flex items-center gap-2">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                                                                <span className="flex-1 truncate">{item.desc}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                ) : (
                                    <p className="text-sm text-muted text-center py-4">No items added to this job</p>
                                )}

                                {/* Add Item Form - Only in Confirmed Stage */}
                                {isConfirmedStage && canEditFields && (
                                    <div className="mt-4 pt-4 border-t border-subtle">
                                        <div className="flex items-start gap-3">
                                            <div className="flex flex-col gap-2">
                                                <select
                                                    value={newItemType}
                                                    onChange={(e) => setNewItemType(e.target.value)}
                                                    className="w-28 surface text-primary text-xs font-bold font-code uppercase rounded-lg border-2 border-subtle focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all py-2.5 px-3 outline-none cursor-pointer"
                                                >
                                                    <option value="Repair">Repair</option>
                                                    <option value="Replace">Replace</option>
                                                    <option value="Blend">Blend</option>
                                                    <option value="Polish/Touch up">Polish</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                                {newItemType === 'Other' && (
                                                    <input
                                                        type="text"
                                                        value={newItemCustomTitle}
                                                        onChange={(e) => setNewItemCustomTitle(e.target.value)}
                                                        className="w-28 surface text-primary text-[10px] font-bold font-code uppercase rounded-lg border-2 border-subtle focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all py-2 px-3 outline-none placeholder-muted"
                                                        placeholder="Title"
                                                    />
                                                )}
                                            </div>
                                            <input
                                                type="text"
                                                value={newItemDesc}
                                                onChange={(e) => setNewItemDesc(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                                                placeholder="Description of work..."
                                                className="flex-1 surface text-primary font-bold rounded-lg border-2 border-subtle focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all py-2.5 px-4 outline-none uppercase placeholder-muted text-sm"
                                            />
                                            <input
                                                type="text"
                                                value={newItemPartNum}
                                                onChange={(e) => setNewItemPartNum(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                                                placeholder="P/N"
                                                className="w-28 surface text-primary font-mono text-xs rounded-lg border-2 border-subtle focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all py-2.5 px-3 outline-none uppercase placeholder-muted"
                                            />
                                            <button
                                                onClick={handleAddItem}
                                                disabled={!newItemDesc.trim()}
                                                className="h-[42px] px-5 bg-accent text-white text-xs font-bold uppercase rounded-lg hover:bg-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </Container>
                        )}


                        {/* Rental Information - Only for non-confirmed and non-preparation/in-progress stages */}
                        {!isConfirmedStage && !isPreparationStage && !isInProgressStage && !isReadyStage && (
                            <Container title="Rental Information" icon={Key}>
                                <div className="grid grid-cols-2 gap-3">
                                    <EditableField label="Rental Company" field="rental_company" value={job.rental_company} placeholder="Enterprise, Hertz..." />
                                    <EditableField label="Rental Vehicle" field="rental_vehicle" value={job.rental_vehicle} placeholder="Vehicle type..." />
                                    <div className="col-span-2">
                                        {canEditFields ? (
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Notes</label>
                                                <textarea
                                                    key={`${job.id}-rental_notes`}
                                                    defaultValue={job.rental_notes || ''}
                                                    onBlur={(e) => {
                                                        if (e.target.value !== (job.rental_notes || '')) {
                                                            if (isEditing) {
                                                                setEditedJob({ ...editedJob, rental_notes: e.target.value });
                                                            } else {
                                                                onUpdate(job.id, { rental_notes: e.target.value });
                                                            }
                                                        }
                                                    }}
                                                    placeholder="Additional rental notes..."
                                                    rows={2}
                                                    className="w-full mt-1 px-3 py-2 surface text-primary border border-subtle rounded-lg text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none resize-none"
                                                />
                                            </div>
                                        ) : job.rental_notes ? (
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Notes</label>
                                                <p className="text-sm text-gray-700 mt-1">{job.rental_notes}</p>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </Container>
                        )}
                    </div>

                    {/* MIDDLE COLUMN */}
                    <div className={`space-y-6 ${(isPreparationStage || isInProgressStage || isReadyStage) ? 'lg:col-span-3' : ''}`}>

                        {/* Parts to Order - Only in Preparation Stage */}
                        {isPreparationStage && (
                            <Container
                                title="Parts to Order"
                                icon={Package}
                                titleBadge={
                                    <>
                                        {partsToOrder.length > 0 && (() => {
                                            const orderedCount = partsToOrder.filter(p => p.ordered).length;
                                            const arrivedCount = partsToOrder.filter(p => p.arrived).length;
                                            const totalParts = partsToOrder.length;
                                            const allOrdered = orderedCount === totalParts || job.parts_ordered;
                                            const someOrdered = orderedCount > 0 && orderedCount < totalParts;
                                            const allArrived = arrivedCount === totalParts || job.parts_arrived;

                                            let badgeColor;
                                            if (allArrived) {
                                                badgeColor = 'bg-green-500/20 text-green-400';
                                            } else if (allOrdered) {
                                                badgeColor = 'bg-yellow-500/20 text-yellow-400';
                                            } else if (someOrdered) {
                                                badgeColor = 'bg-orange-500/20 text-orange-400';
                                            } else {
                                                badgeColor = 'bg-accent/20 text-accent';
                                            }

                                            return (
                                                <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold font-code ${badgeColor}`}>
                                                    {partsToOrder.length}
                                                </span>
                                            );
                                        })()}
                                        {hasParts && isPreparationStage && (() => {
                                            const orderedCount = partsToOrder.filter(p => p.ordered).length;
                                            const arrivedCount = partsToOrder.filter(p => p.arrived).length;
                                            const totalParts = partsToOrder.length;
                                            const allOrdered = orderedCount === totalParts || job.parts_ordered;
                                            const someOrdered = orderedCount > 0 && orderedCount < totalParts;
                                            const allArrived = arrivedCount === totalParts || job.parts_arrived;
                                            const someArrived = arrivedCount > 0 && arrivedCount < totalParts;

                                            let statusText, statusColor;
                                            if (allArrived) {
                                                statusText = '✓ All Parts Arrived!';
                                                statusColor = 'bg-green-500/20 text-green-400';
                                            } else if (allOrdered && someArrived) {
                                                statusText = `⏳ Waiting: ${arrivedCount}/${totalParts} Arrived`;
                                                statusColor = 'bg-yellow-500/20 text-yellow-400';
                                            } else if (allOrdered) {
                                                statusText = '⏳ Waiting for Parts...';
                                                statusColor = 'bg-yellow-500/20 text-yellow-400';
                                            } else if (someOrdered) {
                                                statusText = `⚠️ Order Parts: ${orderedCount}/${totalParts} Ordered`;
                                                statusColor = 'bg-orange-500/20 text-orange-400';
                                            } else {
                                                statusText = '⚠️ Order Parts';
                                                statusColor = 'bg-accent/20 text-accent';
                                            }

                                            return (
                                                <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold font-code normal-case ${statusColor}`}>
                                                    {statusText}
                                                </span>
                                            );
                                        })()}
                                    </>
                                }
                                badge={hasParts && isPreparationStage ? (
                                    <div className="flex items-center gap-1">
                                        {/* Undo button - show when parts_ordered or parts_arrived */}
                                        {(job.parts_ordered || job.parts_arrived) && (
                                            <button
                                                onClick={() => {
                                                    if (job.parts_arrived) {
                                                        togglePartsArrived(job.id, job.parts_arrived);
                                                    } else if (job.parts_ordered) {
                                                        togglePartsOrdered(job.id, job.parts_ordered);
                                                    }
                                                }}
                                                className="flex items-center justify-center w-7 h-7 rounded-lg surface border border-subtle text-muted hover:bg-white/5 hover:text-secondary transition-all"
                                                title="Undo"
                                            >
                                                <ArrowLeft size={14} />
                                            </button>
                                        )}
                                        {/* Main status button */}
                                        {(() => {
                                            const allItemsOrdered = partsToOrder.every(p => p.ordered) || job.parts_ordered;
                                            const allItemsArrived = partsToOrder.every(p => p.arrived) || job.parts_arrived;

                                            return (
                                                <button
                                                    onClick={() => {
                                                        if (!allItemsOrdered) {
                                                            togglePartsOrdered(job.id, job.parts_ordered);
                                                        } else if (!allItemsArrived) {
                                                            togglePartsArrived(job.id, job.parts_arrived);
                                                        }
                                                    }}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-code uppercase transition-all
                                                        ${allItemsArrived
                                                            ? 'bg-green-500/20 text-green-400 border border-green-400/30 cursor-default'
                                                            : allItemsOrdered
                                                                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-400/30 hover:bg-yellow-500/30'
                                                                : 'bg-accent/20 text-accent border border-accent/30 hover:bg-accent/30'}`}
                                                >
                                                    {allItemsArrived ? (
                                                        <>
                                                            <CheckCircle size={14} />
                                                            All Parts Arrived
                                                        </>
                                                    ) : allItemsOrdered ? (
                                                        <>
                                                            <AlertTriangle size={14} />
                                                            Mark All Arrived
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Package size={14} />
                                                            Mark All Ordered
                                                        </>
                                                    )}
                                                </button>
                                            );
                                        })()}
                                    </div>
                                ) : null}
                            >
                                {hasParts ? (
                                    <div className="space-y-2">
                                        {partsToOrder.map((item, idx) => {
                                            const orderedCount = partsToOrder.filter(p => p.ordered).length;
                                            const allOrdered = orderedCount === partsToOrder.length || job.parts_ordered;
                                            const isClickable = isPreparationStage && (!job.parts_arrived);
                                            const showOrderedStatus = allOrdered || item.ordered;

                                            return (
                                                <div
                                                    key={idx}
                                                    onClick={() => {
                                                        if (!isClickable) return;
                                                        const updatedItems = [...job.items];
                                                        const itemIndex = item.originalIndex;

                                                        // Cycle: not ordered → ordered → arrived → not ordered
                                                        if (item.arrived) {
                                                            // Arrived - reset to not ordered
                                                            updatedItems[itemIndex] = { ...updatedItems[itemIndex], ordered: false, arrived: false };
                                                        } else if (item.ordered) {
                                                            // Ordered - mark as arrived
                                                            updatedItems[itemIndex] = { ...updatedItems[itemIndex], arrived: true };
                                                        } else {
                                                            // Not ordered - mark as ordered
                                                            updatedItems[itemIndex] = { ...updatedItems[itemIndex], ordered: true };
                                                        }
                                                        onUpdate(job.id, { items: updatedItems });
                                                    }}
                                                    className={`flex items-center justify-between gap-3 py-2 px-2 -mx-2 rounded-lg border-b border-subtle last:border-b-0 transition-all
                                                        ${isClickable ? 'cursor-pointer hover:bg-white/5' : ''}
                                                        ${item.arrived || job.parts_arrived ? 'bg-green-500/10' : item.ordered || job.parts_ordered ? 'bg-yellow-500/10' : ''}`}
                                                >
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        <span className="text-sm font-medium text-primary truncate">{item.desc || 'No description'}</span>
                                                        {(item.arrived || job.parts_arrived) && (
                                                            <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold font-code uppercase bg-green-500/20 text-green-400">Arrived</span>
                                                        )}
                                                        {!item.arrived && !job.parts_arrived && (item.ordered || job.parts_ordered) && (
                                                            <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold font-code uppercase bg-yellow-500/20 text-yellow-400">Ordered</span>
                                                        )}
                                                    </div>
                                                    {item.partNum && (
                                                        <span className="text-xs font-mono text-muted shrink-0 max-w-[120px] truncate" title={item.partNum}>
                                                            {item.partNum}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-6">
                                        <CheckCircle size={32} className="mx-auto text-green-400 mb-2" />
                                        <p className="text-sm font-medium text-muted">No Parts Needed for This Repair</p>
                                    </div>
                                )}
                            </Container>
                        )}

                        {/* Parts Status Container - Only in In Progress stage */}
                        {isInProgressStage && partsToOrder.length > 0 && (
                            <PartsStatusContainer
                                partsToOrder={partsToOrder}
                                job={job}
                                onUpdate={onUpdate}
                                isExpanded={partsStatusExpanded}
                                setIsExpanded={setPartsStatusExpanded}
                            />
                        )}

                        {/* Repair Lists - Show in MIDDLE COLUMN for Preparation, In Progress, and Ready stages */}
                        {(isPreparationStage || isInProgressStage || isReadyStage) && (
                            <Container
                                title="Repair Lists"
                                icon={FileText}
                                titleBadge={job.items?.length > 0 ? (
                                    <span className="ml-2 px-2 py-0.5 rounded-full surface border border-subtle text-muted text-[10px] font-bold font-code">
                                        {job.items.length}
                                    </span>
                                ) : null}
                                badge={isEditing ? (
                                    <button
                                        onClick={() => setShowAddItemForm(!showAddItemForm)}
                                        className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold font-code rounded-lg transition-colors ${showAddItemForm ? 'text-muted surface border border-subtle hover:bg-white/5' : 'text-accent bg-accent/20 border border-accent/30 hover:bg-accent/30'}`}
                                    >
                                        {showAddItemForm ? <X size={12} /> : <Plus size={12} />}
                                        {showAddItemForm ? 'Cancel' : 'Add Item'}
                                    </button>
                                ) : null}
                            >
                                {/* Add Item Form - Shown when editing and showAddItemForm is true */}
                                {isEditing && showAddItemForm && (
                                    <div className="mb-4 p-4 surface rounded-xl border-2 border-dashed border-subtle">
                                        <div className="flex items-start gap-3">
                                            <div className="flex flex-col gap-2">
                                                <select
                                                    value={newItemType}
                                                    onChange={(e) => setNewItemType(e.target.value)}
                                                    className="w-24 surface text-primary text-xs font-bold font-code uppercase rounded-lg border border-subtle py-2 px-2 outline-none cursor-pointer"
                                                >
                                                    <option value="Repair">Repair</option>
                                                    <option value="Replace">Replace</option>
                                                    <option value="Blend">Blend</option>
                                                    <option value="Polish/Touch up">Polish</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                                {newItemType === 'Other' && (
                                                    <input
                                                        type="text"
                                                        value={newItemCustomTitle}
                                                        onChange={(e) => setNewItemCustomTitle(e.target.value)}
                                                        placeholder="Title..."
                                                        className="w-24 surface text-primary text-[10px] font-bold font-code uppercase rounded-lg border border-subtle py-1.5 px-2 outline-none focus:border-accent"
                                                    />
                                                )}
                                            </div>
                                            <input
                                                type="text"
                                                value={newItemDesc}
                                                onChange={(e) => setNewItemDesc(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && newItemDesc.trim()) {
                                                        handleAddItem();
                                                        setShowAddItemForm(false);
                                                    }
                                                }}
                                                placeholder="Item description..."
                                                className="flex-1 surface text-primary text-sm rounded-lg border border-subtle py-2 px-3 outline-none focus:border-accent uppercase"
                                            />
                                            <button
                                                onClick={() => {
                                                    if (newItemDesc.trim()) {
                                                        handleAddItem();
                                                        setShowAddItemForm(false);
                                                    }
                                                }}
                                                disabled={!newItemDesc.trim()}
                                                className={`px-3 py-2 text-xs font-bold font-code rounded-lg transition-colors ${newItemDesc.trim() ? 'bg-accent text-white hover:bg-accent/80' : 'surface text-muted cursor-not-allowed border border-subtle'}`}
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {job.items && job.items.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Replace Items */}
                                        {job.items.map((item, idx) => ({ ...item, originalIndex: idx })).filter(i => i.type?.toLowerCase() === 'replace').length > 0 && (
                                            <div className="bg-accent/10 rounded-xl p-4 border border-accent/20">
                                                <h4 className="text-[10px] font-black uppercase text-accent mb-3 flex items-center gap-2 font-code">
                                                    <span className="w-5 h-5 rounded bg-accent/20 flex items-center justify-center text-accent">
                                                        {job.items.filter(i => i.type?.toLowerCase() === 'replace').length}
                                                    </span>
                                                    Replace
                                                </h4>
                                                <div className="space-y-2">
                                                    {job.items.map((item, idx) => ({ ...item, originalIndex: idx })).filter(i => i.type?.toLowerCase() === 'replace').map((item) => (
                                                        <div key={item.originalIndex} className={`text-sm text-secondary flex items-center gap-2 group rounded-lg px-2 py-1 -mx-2 transition-colors ${isEditing ? 'hover:bg-accent/20' : ''}`}>
                                                            <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0"></span>
                                                            <span className="flex-1 truncate">{item.desc}</span>
                                                            {item.addedInProgress && (
                                                                <span className="px-1.5 py-0.5 text-[9px] font-bold font-code uppercase bg-green-500/20 text-green-400 rounded shrink-0">NEW</span>
                                                            )}
                                                            {isEditing && (
                                                                <button
                                                                    onClick={() => handleDeleteItem(item.originalIndex)}
                                                                    className="opacity-0 group-hover:opacity-100 p-1 text-accent hover:text-white hover:bg-accent/50 rounded transition-all"
                                                                    title="Delete item"
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Repair Items */}
                                        {job.items.map((item, idx) => ({ ...item, originalIndex: idx })).filter(i => i.type?.toLowerCase() === 'repair').length > 0 && (
                                            <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-400/20">
                                                <h4 className="text-[10px] font-black uppercase text-blue-400 mb-3 flex items-center gap-2 font-code">
                                                    <span className="w-5 h-5 rounded bg-blue-500/20 flex items-center justify-center text-blue-400">
                                                        {job.items.filter(i => i.type?.toLowerCase() === 'repair').length}
                                                    </span>
                                                    Repair
                                                </h4>
                                                <div className="space-y-2">
                                                    {job.items.map((item, idx) => ({ ...item, originalIndex: idx })).filter(i => i.type?.toLowerCase() === 'repair').map((item) => (
                                                        <div key={item.originalIndex} className={`text-sm text-secondary flex items-center gap-2 group rounded-lg px-2 py-1 -mx-2 transition-colors ${isEditing ? 'hover:bg-blue-500/20' : ''}`}>
                                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></span>
                                                            <span className="flex-1 truncate">{item.desc}</span>
                                                            {item.addedInProgress && (
                                                                <span className="px-1.5 py-0.5 text-[9px] font-bold font-code uppercase bg-green-500/20 text-green-400 rounded shrink-0">NEW</span>
                                                            )}
                                                            {isEditing && (
                                                                <button
                                                                    onClick={() => handleDeleteItem(item.originalIndex)}
                                                                    className="opacity-0 group-hover:opacity-100 p-1 text-accent hover:text-white hover:bg-accent/50 rounded transition-all"
                                                                    title="Delete item"
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Blend Items */}
                                        {job.items.map((item, idx) => ({ ...item, originalIndex: idx })).filter(i => i.type?.toLowerCase() === 'blend').length > 0 && (
                                            <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-400/20">
                                                <h4 className="text-[10px] font-black uppercase text-purple-400 mb-3 flex items-center gap-2 font-code">
                                                    <span className="w-5 h-5 rounded bg-purple-500/20 flex items-center justify-center text-purple-400">
                                                        {job.items.filter(i => i.type?.toLowerCase() === 'blend').length}
                                                    </span>
                                                    Blend
                                                </h4>
                                                <div className="space-y-2">
                                                    {job.items.map((item, idx) => ({ ...item, originalIndex: idx })).filter(i => i.type?.toLowerCase() === 'blend').map((item) => (
                                                        <div key={item.originalIndex} className={`text-sm text-secondary flex items-center gap-2 group rounded-lg px-2 py-1 -mx-2 transition-colors ${isEditing ? 'hover:bg-purple-500/20' : ''}`}>
                                                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0"></span>
                                                            <span className="flex-1 truncate">{item.desc}</span>
                                                            {item.addedInProgress && (
                                                                <span className="px-1.5 py-0.5 text-[9px] font-bold font-code uppercase bg-green-500/20 text-green-400 rounded shrink-0">NEW</span>
                                                            )}
                                                            {isEditing && (
                                                                <button
                                                                    onClick={() => handleDeleteItem(item.originalIndex)}
                                                                    className="opacity-0 group-hover:opacity-100 p-1 text-accent hover:text-white hover:bg-accent/50 rounded transition-all"
                                                                    title="Delete item"
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Polish/Other Items */}
                                        {job.items.map((item, idx) => ({ ...item, originalIndex: idx })).filter(i => !['replace', 'repair', 'blend'].includes(i.type?.toLowerCase())).length > 0 && (
                                            <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-400/20">
                                                <h4 className="text-[10px] font-black uppercase text-amber-400 mb-3 flex items-center gap-2 font-code">
                                                    <span className="w-5 h-5 rounded bg-amber-500/20 flex items-center justify-center text-amber-400">
                                                        {job.items.filter(i => !['replace', 'repair', 'blend'].includes(i.type?.toLowerCase())).length}
                                                    </span>
                                                    Other
                                                </h4>
                                                <div className="space-y-2">
                                                    {job.items.map((item, idx) => ({ ...item, originalIndex: idx })).filter(i => !['replace', 'repair', 'blend'].includes(i.type?.toLowerCase())).map((item) => (
                                                        <div key={item.originalIndex} className={`text-sm text-secondary flex items-center gap-2 group rounded-lg px-2 py-1 -mx-2 transition-colors ${isEditing ? 'hover:bg-amber-500/20' : ''}`}>
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                                                            {item.customTitle && (
                                                                <span className="px-1.5 py-0.5 text-[9px] font-bold font-code uppercase bg-amber-500/20 text-amber-400 rounded shrink-0">
                                                                    {item.customTitle}
                                                                </span>
                                                            )}
                                                            <span className="flex-1 truncate">{item.desc}</span>
                                                            {item.addedInProgress && (
                                                                <span className="px-1.5 py-0.5 text-[9px] font-bold font-code uppercase bg-green-500/20 text-green-400 rounded shrink-0">NEW</span>
                                                            )}
                                                            {isEditing && (
                                                                <button
                                                                    onClick={() => handleDeleteItem(item.originalIndex)}
                                                                    className="opacity-0 group-hover:opacity-100 p-1 text-accent hover:text-white hover:bg-accent/50 rounded transition-all"
                                                                    title="Delete item"
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted text-center py-4">No items added to this job</p>
                                )}
                            </Container>
                        )}

                        {(job.notes || true) && (
                            <Container
                                title="Special Instructions"
                                icon={FileText}
                            >
                                <textarea
                                    key={`${job.id}-notes`}
                                    defaultValue={job.notes || ''}
                                    onBlur={(e) => {
                                        if (e.target.value !== (job.notes || '')) {
                                            onUpdate(job.id, { notes: e.target.value });
                                        }
                                    }}
                                    className="w-full h-24 px-3 py-2 surface border border-subtle rounded-lg text-sm text-primary focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none resize-none placeholder-muted"
                                    placeholder="Add notes..."
                                />
                            </Container>
                        )}
                    </div>

                    {/* RIGHT COLUMN - Timeline */}
                    {(isPreparationStage || isInProgressStage || isReadyStage) && (
                        <div className="lg:col-span-1 lg:sticky lg:top-6 lg:self-start">
                            <div className="glass-elevated rounded-2xl border border-subtle overflow-hidden h-full flex flex-col">
                                <div className="px-5 py-4 border-b border-subtle surface flex items-center justify-between shrink-0">
                                    <h3 className="text-xs font-black text-primary uppercase tracking-wider flex items-center gap-2 font-code">
                                        <Clock size={14} className="text-accent" />
                                        Timeline
                                    </h3>
                                    <button
                                        onClick={() => setShowTimelineNote(!showTimelineNote)}
                                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold font-code text-accent bg-accent/20 border border-accent/30 rounded-lg hover:bg-accent/30 transition-colors"
                                    >
                                        <Plus size={12} />
                                        Note
                                    </button>
                                </div>
                                {/* Add Note Input */}
                                {showTimelineNote && (
                                    <div className="px-5 py-3 border-b border-subtle surface">
                                        <textarea
                                            value={timelineNoteText}
                                            onChange={(e) => setTimelineNoteText(e.target.value)}
                                            placeholder="Add a note to timeline..."
                                            rows={2}
                                            className="w-full px-3 py-2 text-sm surface border border-subtle rounded-lg text-primary focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none resize-none placeholder-muted"
                                        />
                                        <div className="flex justify-end gap-2 mt-2">
                                            <button
                                                onClick={() => {
                                                    setShowTimelineNote(false);
                                                    setTimelineNoteText('');
                                                }}
                                                className="px-3 py-1.5 text-xs font-bold font-code text-muted hover:text-secondary transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (timelineNoteText.trim()) {
                                                        const newTimeline = [...(job.timeline || []), {
                                                            stage: job.stage,
                                                            timestamp: new Date().toISOString(),
                                                            label: `📝 ${timelineNoteText.trim()}`
                                                        }];
                                                        onUpdate(job.id, { timeline: newTimeline });
                                                        setTimelineNoteText('');
                                                        setShowTimelineNote(false);
                                                    }
                                                }}
                                                disabled={!timelineNoteText.trim()}
                                                className="px-3 py-1.5 text-xs font-bold font-code text-white bg-accent rounded-lg hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Add Note
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <div className="p-5 overflow-y-auto" style={{ maxHeight: '500px' }}>
                                    {job.timeline && job.timeline.length > 0 ? (
                                        <div className="space-y-3">
                                            {[...job.timeline].reverse().map((event, idx) => (
                                                <div key={idx} className="flex gap-3">
                                                    <div className="flex flex-col items-center">
                                                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${idx === 0 ? 'bg-accent' : 'bg-white/20'}`} />
                                                        {idx < job.timeline.length - 1 && (
                                                            <div className="w-0.5 h-full bg-white/10 mt-1" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 pb-3">
                                                        <p className={`text-xs font-bold font-code ${idx === 0 ? 'text-primary' : 'text-muted'}`}>
                                                            {event.label}
                                                        </p>
                                                        <p className="text-[10px] text-muted mt-0.5">
                                                            {new Date(event.timestamp).toLocaleDateString('en-US', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted text-center py-4">No activity yet</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Sticky Footer - Stage Control */}
            {
                !isDoneStage && (
                    <div className="relative z-10 glass-elevated border-t border-subtle px-6 py-4 shrink-0">
                        <div className="max-w-7xl mx-auto">
                            <div className="flex items-center justify-between">
                                {/* Left Side - Control Items */}
                                <div className="flex items-center gap-3 flex-1">

                                    {/* Control Items */}
                                    {/* Note: Car-In button moved to Case Info panel for Preparation stage */}

                                    {isInProgressStage && (
                                        <div className="flex items-center gap-2 text-accent">
                                            <Wrench size={16} />
                                            <span className="text-sm font-medium font-code">Work in Progress</span>
                                        </div>
                                    )}

                                    {isReadyStage && (
                                        <>
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-500/20 rounded-lg border border-teal-400/30">
                                                <PhoneCall size={14} className="text-teal-400" />
                                                <span className="text-sm font-medium text-teal-400 font-code">
                                                    Call: {job.customer_phone || 'No phone'}
                                                </span>
                                            </div>
                                            <ControlItem
                                                label="Customer Notified"
                                                checked={job.customer_notified}
                                                onChange={() => toggleCustomerNotified(job.id, job.customer_notified)}
                                            />
                                        </>
                                    )}
                                </div>

                                {/* Center - Stage Badge */}
                                <div className={`px-4 py-2 rounded-full text-xs font-bold font-code uppercase
                                ${stageInfo.color === 'blue' ? 'bg-blue-500/20 text-blue-400' :
                                        stageInfo.color === 'orange' ? 'bg-orange-500/20 text-orange-400' :
                                            stageInfo.color === 'purple' ? 'bg-accent/20 text-accent' :
                                                stageInfo.color === 'teal' ? 'bg-teal-500/20 text-teal-400' :
                                                    'bg-green-500/20 text-green-400'}`}>
                                    {stageInfo.label}
                                </div>

                                {/* Right Side - Back and Advance Buttons */}
                                <div className="flex items-center gap-3 flex-1 justify-end">
                                    {!isConfirmedStage && (
                                        <button
                                            onClick={() => onRevertStage(job.id)}
                                            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold font-code text-muted surface border border-subtle rounded-xl hover:bg-white/5 transition-colors shrink-0"
                                        >
                                            <ArrowLeft size={14} />
                                            Back to Previous Stage
                                        </button>
                                    )}
                                    {getAdvanceButtonLabel() && (
                                        <button
                                            onClick={handleAdvanceStage}
                                            disabled={!canAdvanceStage()}
                                            title={getMissingRequirements()}
                                            className={`px-6 py-2.5 font-bold font-code uppercase text-sm rounded-xl transition-all shrink-0
                                            ${canAdvanceStage()
                                                    ? 'bg-accent text-white hover:bg-accent/80 shadow-lg shadow-accent/25 animate-pulse hover:animate-none'
                                                    : 'surface text-muted cursor-not-allowed border border-subtle'}`}
                                        >
                                            {getAdvanceButtonLabel()}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Done Stage - Full screen overlay-style message */}
            {
                isDoneStage && (
                    <div className="surface border-t border-subtle px-6 py-4 shrink-0">
                        <div className="max-w-7xl mx-auto flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <CheckCircle size={24} className="text-green-400" />
                                <div>
                                    <p className="font-bold text-green-400">Case Completed!</p>
                                    {job.timeline && job.timeline.length > 0 && (
                                        <p className="text-xs text-muted">
                                            Completed: {formatTimelineDate(job.timeline[job.timeline.length - 1]?.timestamp)}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="flex items-center gap-2 px-4 py-2 text-accent text-xs font-bold uppercase rounded-lg border border-accent/30 hover:bg-accent/10 transition-colors"
                            >
                                <Trash2 size={14} />
                                Delete Case
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Delete Confirmation Modal */}
            {
                showDeleteConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <div className="surface-modal rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-up">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                                    <AlertCircle size={24} className="text-accent" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-primary">Delete Case?</h3>
                                    <p className="text-sm text-muted">This cannot be undone</p>
                                </div>
                            </div>
                            <p className="text-sm text-secondary mb-6">
                                Are you sure you want to delete this case for <strong className="text-primary">{job.customer_name}</strong>?
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 py-3 text-sm font-bold text-secondary surface border border-subtle rounded-xl hover:bg-surface-hover transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="flex-1 py-3 text-sm font-bold text-white bg-accent rounded-xl hover:bg-accent/80 transition-colors"
                                >
                                    Delete Case
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Confirmation Modal for Advancing Stage */}
            {
                showConfirmModal && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60]">
                        <div className="surface-modal rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-slide-up">
                            <div className="surface px-6 py-4 border-b border-subtle">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-yellow-500/20 rounded-full">
                                        <AlertTriangle size={24} className="text-yellow-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-primary">Incomplete Items</h3>
                                </div>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-secondary mb-4">
                                    The following items are not complete. Are you sure you want to proceed?
                                </p>
                                <ul className="space-y-2 mb-6">
                                    {confirmWarnings.map((warning, idx) => (
                                        <li key={idx} className="flex items-center gap-2 text-sm text-secondary">
                                            <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full shrink-0"></span>
                                            {warning}
                                        </li>
                                    ))}
                                </ul>
                                <div className="flex gap-3">
                                    <button
                                        onClick={cancelAdvanceStage}
                                        className="flex-1 py-2.5 text-sm font-bold text-secondary surface border border-subtle rounded-xl hover:bg-surface-hover transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmAdvanceStage}
                                        className="flex-1 py-2.5 text-sm font-bold text-white bg-accent rounded-xl hover:bg-accent/80 transition-colors"
                                    >
                                        Proceed Anyway
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

// Container component with glassmorphism theme
const Container = ({ title, icon: Icon, children, className = '', badge = null, titleBadge = null }) => (
    <div className={`glass-elevated rounded-2xl border border-subtle overflow-hidden ${className}`}>
        <div className="px-5 py-4 border-b border-subtle surface flex items-center justify-center sm:justify-between">
            <h3 className="text-xs font-black text-primary font-code uppercase tracking-wider flex items-center gap-2">
                <Icon size={14} className="text-accent" />
                {title}
                {titleBadge}
            </h3>
            {badge}
        </div>
        <div className="p-5">
            {children}
        </div>
    </div>
);

// Repair Item Row Component - Handles local state to prevent re-render focus loss
const RepairItemRow = ({ item, index, onUpdate, onDelete }) => {
    const [type, setType] = useState(item.type || 'Repair');
    const [customTitle, setCustomTitle] = useState(item.customTitle || '');
    const [desc, setDesc] = useState(item.desc || '');
    const [partNum, setPartNum] = useState(item.partNum || '');

    // Sync state with props when props change (e.g. external updates)
    useEffect(() => {
        setType(item.type || 'Repair');
        setCustomTitle(item.customTitle || '');
        setDesc(item.desc || '');
        setPartNum(item.partNum || '');
    }, [item.type, item.customTitle, item.desc, item.partNum]);

    const handleBlur = (field, value) => {
        if (value !== item[field]) {
            onUpdate(index, field, value);
        }
    };

    return (
        <div className="group flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg surface flex items-center justify-center text-[10px] font-bold text-muted mt-2 select-none shrink-0">
                {(index + 1).toString().padStart(2, '0')}
            </div>
            <div className="flex flex-col gap-2">
                <select
                    value={type}
                    onChange={(e) => {
                        setType(e.target.value);
                        handleBlur('type', e.target.value);
                    }}
                    className="w-28 surface text-primary text-xs font-bold uppercase rounded-lg border border-subtle focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all py-2.5 px-3 outline-none cursor-pointer"
                >
                    <option value="Repair">Repair</option>
                    <option value="Replace">Replace</option>
                    <option value="Blend">Blend</option>
                    <option value="Polish/Touch up">Polish</option>
                    <option value="Other">Other</option>
                </select>
                {type === 'Other' && (
                    <input
                        type="text"
                        value={customTitle}
                        onChange={(e) => setCustomTitle(e.target.value)}
                        onBlur={(e) => handleBlur('customTitle', e.target.value)}
                        className="w-28 surface text-primary text-[10px] font-bold uppercase rounded-lg border border-subtle focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all py-2 px-3 outline-none placeholder-muted"
                        placeholder="Title"
                    />
                )}
            </div>
            <input
                type="text"
                value={desc}
                onChange={(e) => setDesc(e.target.value.toUpperCase())}
                onBlur={(e) => handleBlur('desc', e.target.value)}
                className="flex-1 surface text-primary font-bold rounded-lg border border-subtle focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all py-2.5 px-4 outline-none uppercase placeholder-muted text-sm"
                placeholder="Description of work..."
            />
            <input
                type="text"
                value={partNum}
                onChange={(e) => setPartNum(e.target.value.toUpperCase())}
                onBlur={(e) => handleBlur('partNum', e.target.value)}
                className="w-28 surface text-primary font-mono text-xs rounded-lg border border-subtle focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all py-2.5 px-3 outline-none uppercase placeholder-muted"
                placeholder="P/N"
            />
            <button
                onClick={() => onDelete(index)}
                className="h-[42px] w-[42px] rounded-lg surface text-muted hover:bg-accent/20 hover:text-accent transition-all flex items-center justify-center shrink-0"
                title="Delete item"
            >
                <X size={16} />
            </button>
        </div>
    );
};

// Standalone EditableField component to ensure stable identity and prevent re-renders
const EditableFieldComponent = React.memo(({ label, value, type = 'text', placeholder = '', mono = false, uppercase = false, canEdit, onSave, inputKey }) => {
    const inputRef = useRef(null);
    const [localValue, setLocalValue] = useState(value || '');
    const [hasFocus, setHasFocus] = useState(false);

    // Sync local value when external value changes, BUT ONLY if input is not focused
    useEffect(() => {
        if (!hasFocus) {
            setLocalValue(value || '');
        }
    }, [value, hasFocus]);

    const handleBlur = () => {
        setHasFocus(false);
        const newValue = uppercase ? localValue.toUpperCase() : localValue;
        if (newValue !== (value || '')) {
            onSave(newValue);
        }
    };

    const handleFocus = () => {
        setHasFocus(true);
    };

    const handleChange = (e) => {
        const newVal = uppercase ? e.target.value.toUpperCase() : e.target.value;
        setLocalValue(newVal);
    };

    if (canEdit) {
        return (
            <div>
                <label className="text-[10px] font-bold text-muted uppercase">{label}</label>
                <input
                    ref={inputRef}
                    key={inputKey}
                    type={type}
                    value={localValue}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onFocus={handleFocus}
                    placeholder={placeholder}
                    className={`w-full mt-1 px-3 py-2 surface text-primary border border-subtle rounded-lg text-sm font-medium focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none ${mono ? 'font-mono' : ''} ${uppercase ? 'uppercase' : ''}`}
                />
            </div>
        );
    }

    return (
        <div>
            <label className="text-[10px] font-bold text-muted uppercase">{label}</label>
            <p className={`text-sm font-bold text-primary mt-1 ${mono ? 'font-mono text-xs text-secondary' : ''}`}>
                {value || '-'}
            </p>
        </div>
    );
});

// Use React.memo to prevent unnecessary re-renders but allow updates when job data changes
export default React.memo(JobDetails, (prevProps, nextProps) => {
    // Re-render if job ID changes
    if (prevProps.job?.id !== nextProps.job?.id) return false;

    // Re-render if stage changes
    if (prevProps.job?.stage !== nextProps.job?.stage) return false;

    // Re-render if timeline changes (new entries added)
    if (prevProps.job?.timeline?.length !== nextProps.job?.timeline?.length) return false;

    // Skip re-render if only functions changed
    return prevProps.onBack === nextProps.onBack &&
        prevProps.onUpdate === nextProps.onUpdate &&
        prevProps.onDelete === nextProps.onDelete &&
        prevProps.onAdvanceStage === nextProps.onAdvanceStage &&
        prevProps.onRevertStage === nextProps.onRevertStage;
});
