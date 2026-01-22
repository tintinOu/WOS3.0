import React, { useState } from 'react';
import { Plus, Filter, RefreshCw, Loader2, Search } from 'lucide-react';
import JobCard from './JobCard';
import { JOB_STAGES, STAGE_INFO } from '../hooks/useJobs';

/**
 * JobsList - Glassmorphism Design System
 * Features: Dark/Light mode, red accent filters, glass surfaces
 * Following ui-ux-pro-max workflow guidelines
 */
function JobsList({
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
    const [filterStage, setFilterStage] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Filter jobs by stage and search query
    const filteredJobs = jobs.filter(job => {
        const matchesStage = filterStage === 'all' || job.stage === filterStage;
        const matchesSearch = !searchQuery ||
            job.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.vehicle_make_model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.vehicle_plate?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStage && matchesSearch;
    });

    // Count jobs by stage
    const stageCounts = {
        all: jobs.length,
        [JOB_STAGES.ORDER_PARTS]: jobs.filter(j => j.stage === JOB_STAGES.ORDER_PARTS).length,
        [JOB_STAGES.START_JOB]: jobs.filter(j => j.stage === JOB_STAGES.START_JOB).length,
        [JOB_STAGES.DONE]: jobs.filter(j => j.stage === JOB_STAGES.DONE).length,
    };

    return (
        <div className="h-full flex flex-col bg-bg">
            {/* Header */}
            <div className="glass-elevated px-6 py-5 border-b border-subtle shrink-0">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="font-code text-xl font-bold text-primary uppercase tracking-tight">Jobs</h1>
                        <p className="text-xs text-muted font-medium mt-1">
                            {jobs.length} total job{jobs.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onRefresh}
                            disabled={loading}
                            className="btn-ghost p-2 rounded-xl cursor-pointer disabled:opacity-50"
                            title="Refresh"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={onCreateJob}
                            className="btn-accent flex items-center gap-2 px-4 py-2 text-xs rounded-xl cursor-pointer"
                        >
                            <Plus size={16} />
                            <span>New Job</span>
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by customer, vehicle, or plate..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl input-field text-sm"
                    />
                </div>

                {/* Stage Filter Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-1">
                    <button
                        onClick={() => setFilterStage('all')}
                        className={`shrink-0 px-3 py-1.5 text-[10px] font-code font-bold uppercase rounded-lg transition-all duration-200 cursor-pointer ${filterStage === 'all'
                                ? 'bg-accent text-white shadow-lg shadow-accent/30'
                                : 'surface text-muted hover:text-primary'
                            }`}
                    >
                        All ({stageCounts.all})
                    </button>
                    {Object.entries(STAGE_INFO).map(([stage, info]) => (
                        <button
                            key={stage}
                            onClick={() => setFilterStage(stage)}
                            className={`shrink-0 px-3 py-1.5 text-[10px] font-code font-bold uppercase rounded-lg transition-all duration-200 cursor-pointer ${filterStage === stage
                                    ? 'bg-accent text-white shadow-lg shadow-accent/30'
                                    : 'surface text-muted hover:text-primary'
                                }`}
                        >
                            {info.label} ({stageCounts[stage] || 0})
                        </button>
                    ))}
                </div>
            </div>

            {/* Jobs List */}
            <div className="flex-1 overflow-y-auto p-4">
                {loading && jobs.length === 0 ? (
                    <div className="flex items-center justify-center h-40">
                        <Loader2 size={24} className="animate-spin text-accent" />
                    </div>
                ) : error ? (
                    <div className="text-center py-8">
                        <p className="text-accent text-sm font-medium mb-2">Error loading jobs</p>
                        <p className="text-muted text-xs">{error}</p>
                        <button
                            onClick={onRefresh}
                            className="mt-4 btn-ghost px-4 py-2 text-xs rounded-xl cursor-pointer"
                        >
                            Try Again
                        </button>
                    </div>
                ) : filteredJobs.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 surface rounded-full flex items-center justify-center mx-auto mb-4">
                            <Filter size={24} className="text-muted" />
                        </div>
                        <p className="text-secondary text-sm font-code font-medium mb-1">No jobs found</p>
                        <p className="text-muted text-xs">
                            {searchQuery || filterStage !== 'all'
                                ? 'Try adjusting your filters'
                                : 'Create your first job to get started'}
                        </p>
                        {!searchQuery && filterStage === 'all' && (
                            <button
                                onClick={onCreateJob}
                                className="mt-4 btn-accent px-4 py-2 text-xs rounded-xl cursor-pointer"
                            >
                                Create First Job
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredJobs.map(job => (
                            <JobCard
                                key={job.id}
                                job={job}
                                onSelect={onSelectJob}
                                onAdvanceStage={onAdvanceStage}
                                onMarkPartsOrdered={onMarkPartsOrdered}
                                onMarkCarHere={onMarkCarHere}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default JobsList;
