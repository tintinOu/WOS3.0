import React, { useState } from 'react';
import { Plus, RefreshCw, Loader2, Search, ChevronRight, Phone, Car, Package, Wrench, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { JOB_STAGES, STAGE_INFO } from '../hooks/useJobs';

/**
 * Kanban-style workflow board for job management.
 * Jobs are organized in columns by their current stage.
 * Theme-aware colors for both light and dark modes.
 */
function JobsKanban({
    jobs,
    loading,
    error,
    onRefresh,
    onCreateJob,
    onSelectJob,
    onAdvanceStage,
    onMarkPartsOrdered,
    onMarkCarHere
}) {
    const [searchQuery, setSearchQuery] = useState('');

    // Filter jobs by search query
    const filteredJobs = jobs.filter(job => {
        if (!searchQuery) return true;
        return job.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.vehicle_make_model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.vehicle_plate?.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // Group jobs by stage
    const jobsByStage = {
        [JOB_STAGES.ORDER_PARTS]: filteredJobs.filter(j => j.stage === JOB_STAGES.ORDER_PARTS),
        [JOB_STAGES.START_JOB]: filteredJobs.filter(j => j.stage === JOB_STAGES.START_JOB),
        [JOB_STAGES.DONE]: filteredJobs.filter(j => j.stage === JOB_STAGES.DONE),
    };

    // Column configuration with theme-aware colors
    const columns = [
        {
            stage: JOB_STAGES.ORDER_PARTS,
            title: 'Order Parts',
            icon: Package,
            color: 'orange',
            // Theme-aware colors using transparent overlays
            bgColor: 'bg-orange-500/5',
            borderColor: 'border-orange-500/20',
            headerBg: 'bg-orange-500/10',
            textColor: 'text-orange-500',
            badgeBg: 'bg-orange-500',
            buttonBg: 'bg-purple-600 hover:bg-purple-700'
        },
        {
            stage: JOB_STAGES.START_JOB,
            title: 'Ready to Start',
            icon: Wrench,
            color: 'purple',
            bgColor: 'bg-purple-500/5',
            borderColor: 'border-purple-500/20',
            headerBg: 'bg-purple-500/10',
            textColor: 'text-purple-500',
            badgeBg: 'bg-purple-500',
            buttonBg: 'bg-green-600 hover:bg-green-700'
        },
        {
            stage: JOB_STAGES.DONE,
            title: 'Completed',
            icon: CheckCircle,
            color: 'green',
            bgColor: 'bg-green-500/5',
            borderColor: 'border-green-500/20',
            headerBg: 'bg-green-500/10',
            textColor: 'text-green-500',
            badgeBg: 'bg-green-500'
        }
    ];

    // Compact Job Card for Kanban - theme-aware
    const KanbanCard = ({ job, column }) => {
        const hasReplaceItems = job.items?.some(item =>
            item?.type?.toLowerCase() === 'replace'
        );

        return (
            <div
                className="surface-card rounded-xl p-4 hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => onSelectJob(job)}
            >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-primary truncate">
                            {job.customer_name || 'Unknown'}
                        </h4>
                        <p className="text-xs text-muted truncate mt-0.5">
                            {job.vehicle_year} {job.vehicle_make_model}
                        </p>
                    </div>
                    <span className="text-[9px] text-muted font-medium">#{job.id}</span>
                </div>

                {/* Vehicle Plate */}
                {job.vehicle_plate && (
                    <div className="flex items-center gap-1.5 mb-3">
                        <Car size={12} className="text-muted" />
                        <span className="text-[10px] font-bold text-secondary surface px-1.5 py-0.5 rounded border border-subtle">
                            {job.vehicle_plate}
                        </span>
                    </div>
                )}

                {/* Stage-specific content */}
                {column.stage === JOB_STAGES.ORDER_PARTS && (
                    <div className="space-y-2 pt-2 border-t border-subtle">
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-xs text-secondary cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                <input
                                    type="checkbox"
                                    checked={job.parts_ordered}
                                    onChange={() => onMarkPartsOrdered(job.id)}
                                    className="w-3.5 h-3.5 rounded accent-orange-500"
                                />
                                <span className={job.parts_ordered ? 'line-through text-muted' : ''}>Parts ordered</span>
                            </label>
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-xs text-secondary cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                <input
                                    type="checkbox"
                                    checked={job.car_here}
                                    onChange={() => onMarkCarHere(job.id)}
                                    className="w-3.5 h-3.5 rounded accent-orange-500"
                                />
                                <span className={job.car_here ? 'line-through text-muted' : ''}>Car is here</span>
                            </label>
                        </div>
                        {job.parts_ordered && !job.car_here && (
                            <div className="flex items-center gap-1 text-[10px] text-amber-500 bg-amber-500/10 px-2 py-1 rounded mt-1 border border-amber-500/20">
                                <Clock size={10} />
                                <span>Book dates when parts arrive</span>
                            </div>
                        )}
                        {job.parts_ordered && job.car_here && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onAdvanceStage(job.id); }}
                                className="w-full mt-2 py-1.5 bg-purple-600 text-white text-[10px] font-bold uppercase rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-1"
                            >
                                Move to Start <ChevronRight size={12} />
                            </button>
                        )}
                    </div>
                )}

                {column.stage === JOB_STAGES.START_JOB && (
                    <div className="space-y-2 pt-2 border-t border-subtle">
                        <label className="flex items-center gap-2 text-xs text-secondary cursor-pointer" onClick={(e) => e.stopPropagation()}>
                            <input
                                type="checkbox"
                                checked={job.car_here}
                                onChange={() => onMarkCarHere(job.id)}
                                className="w-3.5 h-3.5 rounded accent-purple-500"
                            />
                            <span className={job.car_here ? 'line-through text-muted' : ''}>Car dropped off</span>
                        </label>
                        {job.car_here && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onAdvanceStage(job.id); }}
                                className="w-full mt-2 py-1.5 bg-green-600 text-white text-[10px] font-bold uppercase rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
                            >
                                Mark Complete <CheckCircle size={12} />
                            </button>
                        )}
                    </div>
                )}

                {column.stage === JOB_STAGES.DONE && (
                    <div className="pt-2 border-t border-subtle">
                        <div className="flex items-center gap-1.5 text-[10px] text-blue-500 bg-blue-500/10 px-2 py-1.5 rounded border border-blue-500/20">
                            <Phone size={10} />
                            <span className="font-medium">Call for pickup: {job.customer_phone || 'N/A'}</span>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-bg">
            {/* Header */}
            <div className="surface-card px-6 py-4 border-b border-subtle shrink-0">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h1 className="text-xl font-black text-primary uppercase tracking-tight">Jobs Overview</h1>
                        <p className="text-xs text-muted font-medium mt-0.5">
                            {jobs.length} active job{jobs.length !== 1 ? 's' : ''} in workflow
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onRefresh}
                            disabled={loading}
                            className="p-2 rounded-lg surface border border-subtle text-muted hover:text-primary hover:bg-surface-hover transition-colors disabled:opacity-50"
                            title="Refresh"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={onCreateJob}
                            className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-xs font-bold uppercase rounded-lg hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20"
                        >
                            <Plus size={16} />
                            <span>New Job</span>
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search jobs..."
                        className="w-full max-w-md surface-input pl-10 pr-4 py-2 rounded-lg text-sm outline-none transition-all"
                    />
                </div>
            </div>

            {/* Workflow Arrow Header */}
            <div className="glass-elevated px-6 py-3 border-b border-subtle flex items-center justify-center gap-2">
                <div className="flex items-center">
                    <span className="text-xs font-bold text-muted uppercase">Workflow:</span>
                </div>
                {columns.map((col, idx) => (
                    <React.Fragment key={col.stage}>
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${col.headerBg} ${col.textColor} border ${col.borderColor}`}>
                            <col.icon size={14} />
                            <span className="text-xs font-bold">{col.title}</span>
                        </div>
                        {idx < columns.length - 1 && (
                            <ChevronRight size={16} className="text-muted" />
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto p-4">
                {loading && jobs.length === 0 ? (
                    <div className="flex items-center justify-center h-40">
                        <Loader2 size={24} className="animate-spin text-accent" />
                    </div>
                ) : error ? (
                    <div className="text-center py-8">
                        <p className="text-accent text-sm font-medium mb-2">Error loading jobs</p>
                        <button onClick={onRefresh} className="text-xs text-muted hover:text-secondary">
                            Try again
                        </button>
                    </div>
                ) : (
                    <div className="flex gap-4 h-full min-w-max">
                        {columns.map((column) => (
                            <div
                                key={column.stage}
                                className={`w-80 flex flex-col rounded-xl ${column.bgColor} border ${column.borderColor} overflow-hidden`}
                            >
                                {/* Column Header */}
                                <div className={`${column.headerBg} px-4 py-3 border-b ${column.borderColor}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <column.icon size={16} className={column.textColor} />
                                            <h3 className={`text-sm font-bold ${column.textColor}`}>
                                                {column.title}
                                            </h3>
                                        </div>
                                        <span className={`${column.badgeBg} text-white text-xs font-bold px-2 py-0.5 rounded-full`}>
                                            {jobsByStage[column.stage]?.length || 0}
                                        </span>
                                    </div>
                                </div>

                                {/* Cards */}
                                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                    {jobsByStage[column.stage]?.length === 0 ? (
                                        <div className="text-center py-8">
                                            <p className="text-xs text-muted">No jobs in this stage</p>
                                        </div>
                                    ) : (
                                        jobsByStage[column.stage]?.map(job => (
                                            <KanbanCard key={job.id} job={job} column={column} />
                                        ))
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default JobsKanban;
