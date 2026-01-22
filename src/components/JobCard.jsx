import React from 'react';
import { Car, Phone, Wrench, Clock, CheckCircle, Package, Calendar } from 'lucide-react';
import { STAGE_INFO, JOB_STAGES } from '../hooks/useJobs';

/**
 * JobCard - Glassmorphism Design System
 * Features: Dark/Light mode, red accent badges, glass surfaces
 * Following ui-ux-pro-max workflow guidelines
 */
function JobCard({ job, onSelect, onAdvanceStage, onMarkPartsOrdered, onMarkCarHere }) {
    const stageInfo = STAGE_INFO[job.stage] || STAGE_INFO[JOB_STAGES.CONFIRMED];

    // Stage colors using CSS variables for theme support
    const stageColors = {
        blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        green: 'bg-green-500/20 text-green-400 border-green-500/30',
        teal: 'bg-teal-500/20 text-teal-400 border-teal-500/30'
    };

    const badgeClass = stageColors[stageInfo.color] || stageColors.blue;

    // Check if job has replace items
    const hasReplaceItems = job.items?.some(item =>
        item?.type?.toLowerCase() === 'replace'
    );

    // Render stage-specific content
    const renderStageActions = () => {
        switch (job.stage) {
            case JOB_STAGES.ORDER_PARTS:
                return (
                    <div className="mt-4 p-3 surface rounded-xl">
                        <p className="text-xs font-code font-bold text-orange-400 mb-3 flex items-center gap-2">
                            <Package size={14} />
                            Parts Required
                        </p>
                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 text-xs text-secondary cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={job.car_here}
                                    onChange={() => onMarkCarHere(job.id)}
                                    className="w-4 h-4 rounded accent-accent cursor-pointer"
                                />
                                <span className="font-medium">Car is here</span>
                            </label>
                            <label className="flex items-center gap-2 text-xs text-secondary cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={job.parts_ordered}
                                    onChange={() => onMarkPartsOrdered(job.id)}
                                    className="w-4 h-4 rounded accent-accent cursor-pointer"
                                />
                                <span className="font-medium">Parts ordered</span>
                            </label>
                        </div>
                        {job.parts_ordered && (
                            <div className="mt-3 p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                                <p className="text-[10px] font-code font-bold text-yellow-400 flex items-center gap-1">
                                    <Clock size={12} />
                                    {job.car_here ? 'Waiting for parts...' : 'Book dates when parts arrive!'}
                                </p>
                            </div>
                        )}
                        {job.parts_ordered && job.car_here && (
                            <button
                                onClick={() => onAdvanceStage(job.id)}
                                className="mt-3 w-full btn-accent py-2 px-3 text-xs rounded-lg"
                            >
                                Parts Received → Start Job
                            </button>
                        )}
                    </div>
                );

            case JOB_STAGES.START_JOB:
                return (
                    <div className="mt-4 p-3 surface rounded-xl">
                        <p className="text-xs font-code font-bold text-purple-400 mb-3 flex items-center gap-2">
                            <Wrench size={14} />
                            Ready to Start
                        </p>
                        <label className="flex items-center gap-2 text-xs text-secondary cursor-pointer mb-3">
                            <input
                                type="checkbox"
                                checked={job.car_here}
                                onChange={() => onMarkCarHere(job.id)}
                                className="w-4 h-4 rounded accent-accent cursor-pointer"
                            />
                            <span className="font-medium">Car dropped off and ready</span>
                        </label>
                        {job.car_here && (
                            <button
                                onClick={() => onAdvanceStage(job.id)}
                                className="w-full py-2 px-3 bg-green-600 text-white text-xs font-code font-bold uppercase rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
                            >
                                Mark Job as Done
                            </button>
                        )}
                    </div>
                );

            case JOB_STAGES.DONE:
                return (
                    <div className="mt-4 p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                        <p className="text-xs font-code font-bold text-green-400 flex items-center gap-2">
                            <CheckCircle size={14} />
                            Job Completed!
                        </p>
                        <div className="mt-2 p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                            <p className="text-[10px] font-code font-bold text-blue-400 flex items-center gap-1">
                                <Phone size={12} />
                                Call customer for pickup: {job.customer_phone || 'N/A'}
                            </p>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div
            className="surface rounded-xl hover:bg-surface-hover transition-all duration-200 p-4 cursor-pointer"
            onClick={() => onSelect(job)}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-1 text-[10px] font-code font-bold uppercase rounded-lg border ${badgeClass}`}>
                            {stageInfo.label}
                        </span>
                        {hasReplaceItems && job.stage !== JOB_STAGES.DONE && (
                            <span className="px-2 py-1 text-[10px] font-code font-bold uppercase rounded-lg bg-accent/20 text-accent border border-accent/30">
                                Parts
                            </span>
                        )}
                    </div>
                    <h3 className="text-sm font-code font-bold text-primary truncate">
                        {job.customer_name || 'Unknown Customer'}
                    </h3>
                </div>
                <span className="text-[10px] text-muted font-code">
                    #{job.id}
                </span>
            </div>

            {/* Vehicle Info */}
            <div className="flex items-center gap-2 text-xs text-secondary mb-2">
                <Car size={14} className="text-muted" />
                <span className="font-medium truncate">
                    {job.vehicle_year} {job.vehicle_make_model || 'Unknown Vehicle'}
                </span>
            </div>

            {/* Plate & Phone */}
            <div className="flex items-center gap-4 text-[11px] text-muted">
                {job.vehicle_plate && (
                    <span className="font-code font-medium bg-surface px-2 py-0.5 rounded border border-subtle">
                        {job.vehicle_plate}
                    </span>
                )}
                {job.customer_phone && (
                    <span className="flex items-center gap-1">
                        <Phone size={11} />
                        {job.customer_phone}
                    </span>
                )}
            </div>

            {/* Dates */}
            {(job.start_date || job.end_date) && (
                <div className="mt-2 flex items-center gap-2 text-[10px] text-muted">
                    <Calendar size={12} />
                    <span className="font-code">{job.start_date} - {job.end_date}</span>
                </div>
            )}

            {/* Items summary */}
            {job.items && job.items.length > 0 && (
                <div className="mt-2 text-[10px] text-muted">
                    <span className="font-medium">{job.items.length} item{job.items.length > 1 ? 's' : ''}:</span>
                    {' '}
                    {job.items.slice(0, 3).map(item => item?.desc || item?.type).join(', ')}
                    {job.items.length > 3 && '...'}
                </div>
            )}

            {/* Stage Actions */}
            <div onClick={(e) => e.stopPropagation()}>
                {renderStageActions()}
            </div>
        </div>
    );
}

export default JobCard;
