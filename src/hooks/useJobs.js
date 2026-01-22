import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';


/**
 * Job stages enum - Updated workflow
 */
export const JOB_STAGES = {
    CONFIRMED: 'confirmed',
    PREPARATION: 'preparation',
    IN_PROGRESS: 'in_progress',
    READY: 'ready',
    DONE: 'done'
};

/**
 * Stage display info for UI
 */
export const STAGE_INFO = {
    [JOB_STAGES.CONFIRMED]: {
        label: 'Confirmed',
        color: 'blue',
        description: 'Case created, review details'
    },
    [JOB_STAGES.PREPARATION]: {
        label: 'Preparation',
        color: 'orange',
        description: 'Preparing for repair'
    },
    [JOB_STAGES.IN_PROGRESS]: {
        label: 'In Progress',
        color: 'purple',
        description: 'Repair in progress'
    },
    [JOB_STAGES.READY]: {
        label: 'Ready',
        color: 'teal',
        description: 'Ready for pickup'
    },
    [JOB_STAGES.DONE]: {
        label: 'Done',
        color: 'green',
        description: 'Case completed'
    }
};

/**
 * Get preparation sub-phase based on job status
 */
export const getPreparationPhase = (job) => {
    const partsToOrder = job.items?.filter(item => item?.type?.toLowerCase() === 'replace') || [];
    const hasParts = partsToOrder.length > 0;
    const hasSchedule = job.start_date && job.end_date;

    if (hasParts) {
        // Count individual part statuses
        const orderedCount = partsToOrder.filter(p => p.ordered).length;
        const arrivedCount = partsToOrder.filter(p => p.arrived).length;
        const totalParts = partsToOrder.length;

        const allOrdered = orderedCount === totalParts || job.parts_ordered;
        const someOrdered = orderedCount > 0 && orderedCount < totalParts;
        const allArrived = arrivedCount === totalParts || job.parts_arrived;
        const someArrived = arrivedCount > 0 && arrivedCount < totalParts;

        // Not all ordered yet
        if (!allOrdered) {
            if (someOrdered) {
                return { phase: 'order_parts_partial', label: 'Order Parts: Partially Ordered', color: 'orange' };
            }
            return { phase: 'order_parts', label: 'Order Parts', color: 'red' };
        }

        // All ordered, but not all arrived
        if (!allArrived) {
            if (someArrived) {
                return { phase: 'waiting_parts_partial', label: 'Waiting for Parts: Partially Arrived', color: 'yellow' };
            }
            return { phase: 'waiting_parts', label: 'Waiting for Parts', color: 'yellow' };
        }
    }

    // If car is on site and (no parts needed OR all parts arrived) - Ready to Start
    if (job.car_here && (!hasParts || job.parts_arrived || partsToOrder.every(p => p.arrived))) {
        return { phase: 'ready_start', label: 'Ready to Start', color: 'green' };
    }

    // If parts arrived (or no parts needed) but car not here
    const allPartsReady = !hasParts || job.parts_arrived || partsToOrder.every(p => p.arrived);
    if (allPartsReady) {
        if (hasSchedule) {
            return { phase: 'waiting_dropoff', label: 'Waiting for Drop Off', color: 'blue' };
        } else {
            return { phase: 'arrange_dropoff', label: 'Please Arrange Drop Off', color: 'purple' };
        }
    }

    return { phase: 'pending', label: 'Pending', color: 'gray' };
};

/**
 * Custom hook for Jobs state management
 */
export function useJobs() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedJob, setSelectedJob] = useState(null);
    const { getAuthToken, isAuthenticated } = useAuth();

    // Fetch all jobs
    const fetchJobs = useCallback(async () => {
        if (!isAuthenticated) return;

        setLoading(true);
        setError(null);
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_URL}/jobs`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error('Failed to fetch jobs');
            const data = await response.json();
            setJobs(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [getAuthToken, isAuthenticated]);

    // Create a new job
    const createJob = async (jobData) => {
        try {
            const token = getAuthToken();
            const newJob = {
                ...jobData,
                stage: JOB_STAGES.CONFIRMED,
                car_here: false,
                parts_ordered: false,
                parts_arrived: false,
                customer_notified: false,
                rental_requested: false,
                timeline: [{
                    stage: JOB_STAGES.CONFIRMED,
                    timestamp: new Date().toISOString(),
                    label: '📝 Case created.'
                }],
                created_at: new Date().toISOString()
            };

            const response = await fetch(`${API_URL}/jobs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newJob)
            });

            if (!response.ok) throw new Error('Failed to create job');
            const created = await response.json();
            setJobs(prev => [...prev, created]);
            return created;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    // Update a job
    const updateJob = async (jobId, updates, options = {}) => {
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_URL}/jobs/${jobId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updates)
            });

            if (!response.ok) throw new Error('Failed to update job');
            const updated = await response.json();

            // Update local state
            setJobs(prev => prev.map(j => j.id === jobId ? updated : j));

            // Update selected job if it's the one being updated (unless skipSelectedUpdate is true)
            if (selectedJob?.id === jobId && !options.skipSelectedUpdate) {
                setSelectedJob(updated);
            }

            return updated;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    // Delete a job
    const deleteJob = async (jobId) => {
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_URL}/jobs/${jobId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to delete job');

            setJobs(prev => prev.filter(j => j.id !== jobId));

            if (selectedJob?.id === jobId) {
                setSelectedJob(null);
            }
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };


    // Advance to next stage with timeline tracking
    const advanceStage = async (jobId) => {
        const job = jobs.find(j => j.id === jobId);
        if (!job) return;

        const stageOrder = [
            JOB_STAGES.CONFIRMED,
            JOB_STAGES.PREPARATION,
            JOB_STAGES.IN_PROGRESS,
            JOB_STAGES.READY,
            JOB_STAGES.DONE
        ];

        const currentIndex = stageOrder.indexOf(job.stage);
        if (currentIndex < stageOrder.length - 1) {
            const nextStage = stageOrder[currentIndex + 1];

            // Custom timeline labels for each stage transition
            let timelineLabel = `Moved to ${STAGE_INFO[nextStage].label}`;
            if (nextStage === JOB_STAGES.PREPARATION) {
                timelineLabel = '📋 Preparation started.';
            } else if (nextStage === JOB_STAGES.IN_PROGRESS) {
                const dueDate = job.end_date ? new Date(job.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD';
                timelineLabel = `🔧 Work started. Estimated due date is ${dueDate}.`;
            } else if (nextStage === JOB_STAGES.READY) {
                timelineLabel = '✅ Repair Finished.';
            } else if (nextStage === JOB_STAGES.DONE) {
                timelineLabel = '🎉 Case completed and closed.';
            }

            const newTimeline = [...(job.timeline || []), {
                stage: nextStage,
                timestamp: new Date().toISOString(),
                label: timelineLabel
            }];
            return updateJob(jobId, { stage: nextStage, timeline: newTimeline });
        }
    };

    // Revert to previous stage with timeline tracking
    const revertStage = async (jobId) => {
        const job = jobs.find(j => j.id === jobId);
        if (!job) return;

        const stageOrder = [
            JOB_STAGES.CONFIRMED,
            JOB_STAGES.PREPARATION,
            JOB_STAGES.IN_PROGRESS,
            JOB_STAGES.READY,
            JOB_STAGES.DONE
        ];

        const currentIndex = stageOrder.indexOf(job.stage);
        if (currentIndex > 0) {
            const prevStage = stageOrder[currentIndex - 1];
            const newTimeline = [...(job.timeline || []), {
                stage: prevStage,
                timestamp: new Date().toISOString(),
                label: `⏪ Reverted to ${STAGE_INFO[prevStage].label}.`
            }];
            return updateJob(jobId, { stage: prevStage, timeline: newTimeline });
        }
    };

    // Toggle car on site
    const toggleCarHere = async (jobId, currentValue = false) => {
        const job = jobs.find(j => j.id === jobId);
        const newValue = !currentValue;
        const newTimeline = [...(job?.timeline || []), {
            stage: job?.stage,
            timestamp: new Date().toISOString(),
            label: newValue ? '🚗 Vehicle arrived on site.' : '🚗 Vehicle marked as not on site.'
        }];
        return updateJob(jobId, { car_here: newValue, timeline: newTimeline });
    };

    // Toggle parts ordered
    const togglePartsOrdered = async (jobId, currentValue = false) => {
        const job = jobs.find(j => j.id === jobId);
        const newValue = !currentValue;
        const newTimeline = [...(job?.timeline || []), {
            stage: job?.stage,
            timestamp: new Date().toISOString(),
            label: newValue ? '📦 All parts are ordered, waiting for arrival.' : '📦 Parts order cancelled.'
        }];
        return updateJob(jobId, { parts_ordered: newValue, timeline: newTimeline });
    };

    // Toggle parts arrived
    const togglePartsArrived = async (jobId, currentValue = false) => {
        const job = jobs.find(j => j.id === jobId);
        const newValue = !currentValue;
        const newTimeline = [...(job?.timeline || []), {
            stage: job?.stage,
            timestamp: new Date().toISOString(),
            label: newValue ? '✅ All parts have arrived.' : '📦 Parts marked as not arrived.'
        }];
        return updateJob(jobId, { parts_arrived: newValue, timeline: newTimeline });
    };

    // Toggle rental requested
    const toggleRentalRequested = async (jobId, currentValue = false) => {
        const job = jobs.find(j => j.id === jobId);
        const newValue = !currentValue;
        const newTimeline = [...(job?.timeline || []), {
            stage: job?.stage,
            timestamp: new Date().toISOString(),
            label: newValue ? '🚙 Rental has been arranged.' : '🚙 Rental request cancelled.'
        }];
        return updateJob(jobId, { rental_requested: newValue, timeline: newTimeline });
    };

    // Toggle customer notified
    const toggleCustomerNotified = async (jobId, currentValue = false) => {
        const job = jobs.find(j => j.id === jobId);
        const newValue = !currentValue;
        const newTimeline = [...(job?.timeline || []), {
            stage: job?.stage,
            timestamp: new Date().toISOString(),
            label: newValue ? '📞 Customer notified.' : '📞 Customer notification undone.'
        }];
        return updateJob(jobId, { customer_notified: newValue, timeline: newTimeline });
    };

    // Check if job has replace items (needs parts)
    const hasReplaceItems = (job) => {
        if (!job?.items || !Array.isArray(job.items)) return false;
        return job.items.some(item =>
            item?.type?.toLowerCase() === 'replace'
        );
    };

    // Get jobs by stage
    const getJobsByStage = (stage) => {
        return jobs.filter(job => job.stage === stage);
    };

    // Load jobs on mount
    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    return {
        // State
        jobs,
        loading,
        error,
        selectedJob,
        setSelectedJob,

        // Actions
        fetchJobs,
        createJob,
        updateJob,
        deleteJob,
        advanceStage,
        revertStage,
        toggleCarHere,
        togglePartsOrdered,
        togglePartsArrived,
        toggleRentalRequested,
        toggleCustomerNotified,

        // Helpers
        hasReplaceItems,
        getJobsByStage,
        getPreparationPhase,
    };
}

export default useJobs;
