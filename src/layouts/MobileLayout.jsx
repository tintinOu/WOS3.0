import React, { useEffect, useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import PDFOrder from '../components/PDFOrder';
import JobsList from '../components/JobsList';
import InsuranceAssist from '../components/InsuranceAssist';
import { useJobs } from '../hooks/useJobs';
import { useAuth } from '../contexts/AuthContext';
import { X, Calendar, Printer, Sparkles, Check, Loader2, RotateCcw, ChevronDown, ChevronUp, FileText, Briefcase, ShieldCheck, LogOut } from 'lucide-react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import 'flatpickr/dist/themes/dark.css';
import FloatingLabelInput from '../components/FloatingLabelInput';

/**
 * Mobile/Tablet optimized layout for the Work Order System.
 * Features bottom navigation for Jobs and Work Order tabs.
 */
function MobileLayout({ form }) {
    const {
        dateInputRef,
        fileInputRef,
        isPrinting,
        setIsPrinting,
        customer,
        setCustomer,
        vehicle,
        setVehicle,
        dates,
        setDates,
        notes,
        setNotes,
        items,
        vehicleDetails,
        showDetailsModal,
        setShowDetailsModal,
        uploadStatus,
        highlightMissing,
        duration,
        pdfData,
        addLineItem,
        removeItem,
        updateItem,
        decodeVin,
        getDisplayDetails,
        handleFileUpload,
        resetForm,
    } = form;

    const { signOut } = useAuth();

    // Navigation state
    const [activeView, setActiveView] = useState('jobs');


    // Jobs state
    const {
        jobs,
        loading: jobsLoading,
        error: jobsError,
        fetchJobs,
        createJob,
        advanceStage,
        markPartsOrdered,
        markCarHere,
        setSelectedJob,
    } = useJobs();

    // Collapsible section states
    const [expandedSections, setExpandedSections] = useState({
        customer: true,
        vehicle: true,
        schedule: true,
        jobs: true,
        notes: false
    });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // Initialize flatpickr for mobile
    useEffect(() => {
        if (dateInputRef.current) {
            flatpickr(dateInputRef.current, {
                mode: "range",
                dateFormat: "M j D",
                locale: {
                    rangeSeparator: ' TO '
                },
                disableMobile: false,
                onChange: (selectedDates) => {
                    if (selectedDates.length === 2) {
                        const format = (d) => {
                            const mm = String(d.getMonth() + 1).padStart(2, '0');
                            const dd = String(d.getDate()).padStart(2, '0');
                            return `${mm}/${dd}`;
                        };
                        setDates({
                            start: format(selectedDates[0]),
                            end: format(selectedDates[1])
                        });
                    }
                }
            });
        }
    }, [dateInputRef, setDates]);

    const handlePrint = async () => {
        setIsPrinting(true);
        try {
            const blob = await pdf(<PDFOrder data={pdfData} />).toBlob();
            const url = URL.createObjectURL(blob);
            const win = window.open(url, '_blank');
            if (win) {
                win.focus();
            }
        } catch (error) {
            console.error("Print failed:", error);
        } finally {
            setIsPrinting(false);
        }
    };

    const handleCreateJob = async (jobData) => {
        // Handle direct event passing or explicit data
        const data = (jobData && !jobData.nativeEvent) ? jobData : {};

        try {
            const newJob = await createJob(data);
            await fetchJobs();
            if (newJob) {
                setSelectedJob(newJob);
            }
        } catch (error) {
            console.error("Failed to create job:", error);
            alert("Failed to create new case");
        }
    };

    // Section Header Component
    const SectionHeader = ({ title, section, icon: Icon }) => (
        <button
            onClick={() => toggleSection(section)}
            className="w-full flex items-center justify-between py-4 px-1"
        >
            <h2 className="text-xs font-bold text-secondary uppercase tracking-[0.15em] flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-accent shadow-[0_0_10px_rgba(239,68,68,0.5)]"></span>
                {title}
            </h2>
            {expandedSections[section] ? (
                <ChevronUp size={20} className="text-muted" />
            ) : (
                <ChevronDown size={20} className="text-muted" />
            )}
        </button>
    );

    // Render Work Order Form
    const renderWorkOrderForm = () => (
        <>
            {/* Mobile Header */}
            <header className="sticky top-0 z-40 glass-elevated px-4 py-4 border-b border-subtle">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="font-code text-lg font-bold tracking-tight text-primary uppercase">311 Auto Body</h1>
                        <p className="text-[9px] text-muted font-medium tracking-[0.15em]">WORK ORDER SYSTEM</p>
                    </div>

                    <div className="flex items-center gap-2">
                        {uploadStatus === 'uploading' && <Loader2 className="animate-spin text-accent" size={18} />}
                        {uploadStatus === 'success' && <Check className="text-green-500" size={18} />}
                        {uploadStatus === 'error' && <X className="text-accent" size={18} />}

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadStatus === 'uploading'}
                            className="btn-accent flex items-center gap-1.5 px-3 py-2 text-[10px] rounded-lg disabled:opacity-70"
                        >
                            <Sparkles size={14} />
                            <span>Auto Fill</span>
                        </button>

                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept=".pdf"
                            className="hidden"
                        />
                    </div>
                </div>
            </header>

            {/* Scrollable Form Content */}
            <div className="flex-1 overflow-y-auto px-4 py-6 pb-32 space-y-2">
                {/* Customer Section */}
                <section className="surface rounded-2xl overflow-hidden">
                    <div className="px-4">
                        <SectionHeader title="Customer Details" section="customer" />
                    </div>
                    {expandedSections.customer && (
                        <div className="px-4 pb-5 space-y-4">
                            <FloatingLabelInput
                                label="Full Name"
                                value={customer.name}
                                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                                isMissing={highlightMissing && !customer.name}
                            />
                            <FloatingLabelInput
                                label="Phone Number"
                                type="tel"
                                value={customer.phone}
                                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                                isMissing={highlightMissing && !customer.phone}
                            />
                        </div>
                    )}
                </section>

                {/* Vehicle Section */}
                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-4">
                        <SectionHeader title="Vehicle Information" section="vehicle" />
                    </div>
                    {expandedSections.vehicle && (
                        <div className="px-4 pb-5 space-y-4">
                            <FloatingLabelInput
                                label="VIN Number"
                                value={vehicle.vin}
                                onChange={(e) => {
                                    const newVin = e.target.value.toUpperCase();
                                    setVehicle({ ...vehicle, vin: newVin });
                                    if (newVin.length === 17) {
                                        decodeVin(newVin);
                                    }
                                }}
                                maxLength={17}
                                isMissing={highlightMissing && !vehicle.vin}
                                className="uppercase font-mono tracking-[0.15em]"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <FloatingLabelInput
                                        label="Year"
                                        value={vehicle.year}
                                        onChange={(e) => setVehicle({ ...vehicle, year: e.target.value })}
                                        isMissing={highlightMissing && !vehicle.year}
                                    />
                                </div>
                                <div>
                                    <FloatingLabelInput
                                        label="Plate"
                                        value={vehicle.plate}
                                        onChange={(e) => setVehicle({ ...vehicle, plate: e.target.value })}
                                        isMissing={highlightMissing && !vehicle.plate}
                                        className="uppercase"
                                    />
                                </div>
                            </div>
                            <FloatingLabelInput
                                label="Make & Model"
                                value={vehicle.makeModel}
                                onChange={(e) => setVehicle({ ...vehicle, makeModel: e.target.value })}
                                isMissing={highlightMissing && !vehicle.makeModel}
                            />
                            {vehicleDetails && (
                                <button
                                    onClick={() => setShowDetailsModal(true)}
                                    className="w-full py-3 px-4 rounded-xl bg-blue-600 text-white font-bold uppercase text-xs tracking-wider flex items-center justify-center gap-2"
                                >
                                    <FileText size={16} />
                                    View More Details
                                </button>
                            )}
                        </div>
                    )}
                </section>

                {/* Work Schedule Section */}
                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-4">
                        <SectionHeader title="Work Schedule" section="schedule" />
                    </div>
                    {expandedSections.schedule && (
                        <div className="px-4 pb-5">
                            <div className="flex items-center gap-2 mb-3">
                                <Calendar size={14} className="text-blue-600" />
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date Range</span>
                            </div>
                            <input
                                ref={dateInputRef}
                                type="text"
                                readOnly
                                placeholder="Tap to select dates..."
                                className={`uppercase w-full text-center rounded-xl border-2 py-4 px-4 outline-none cursor-pointer shadow-sm text-base font-bold
                                    ${(highlightMissing && (!dates.start || !dates.end))
                                        ? 'bg-yellow-50 border-yellow-400 text-gray-900'
                                        : 'bg-white border-gray-200 text-gray-900'}`}
                            />
                            {dates.start && (
                                <div className="mt-3 flex flex-col items-center gap-1 text-xs font-bold uppercase text-blue-600 bg-blue-50 py-3 rounded-xl">
                                    <span>Start: {dates.start} — Due: {dates.end}</span>
                                    {duration && <span className="text-blue-900 bg-blue-200 px-3 py-1 rounded-lg mt-1">{duration}</span>}
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {/* Job Details Section */}
                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-4">
                        <SectionHeader title="Job Details" section="jobs" />
                    </div>
                    {expandedSections.jobs && (
                        <div className="px-4 pb-5 space-y-3">
                            {items.map((item, index) => (
                                <div key={item.id} className="bg-gray-50 rounded-xl p-3 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-gray-400 uppercase">Item {(index + 1).toString().padStart(2, '0')}</span>
                                        <button
                                            onClick={() => removeItem(item.id)}
                                            className="h-8 w-8 rounded-lg bg-white text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <div className="flex gap-2">
                                        <select
                                            value={item.type}
                                            onChange={(e) => updateItem(item.id, 'type', e.target.value)}
                                            className="flex-shrink-0 w-28 bg-white text-gray-900 text-xs font-bold uppercase rounded-lg border-2 border-gray-200 py-3 px-2 outline-none"
                                        >
                                            <option value="Repair">Repair</option>
                                            <option value="Replace">Replace</option>
                                            <option value="Blend">Blend</option>
                                            <option value="Polish/Touch up">Polish</option>
                                            <option value="Other">Other</option>
                                        </select>
                                        {item.type === 'Other' && (
                                            <input
                                                type="text"
                                                value={item.customTitle || ''}
                                                onChange={(e) => updateItem(item.id, 'customTitle', e.target.value)}
                                                className="w-24 bg-white text-gray-900 text-xs font-bold uppercase rounded-lg border-2 border-gray-200 py-3 px-2 outline-none placeholder-gray-400"
                                                placeholder="Title"
                                            />
                                        )}
                                    </div>
                                    <input
                                        type="text"
                                        value={item.desc}
                                        onChange={(e) => updateItem(item.id, 'desc', e.target.value)}
                                        className="w-full bg-white text-gray-900 font-bold rounded-lg border-2 border-gray-200 py-3 px-3 outline-none uppercase placeholder-gray-300 text-sm"
                                        placeholder="Description of work..."
                                    />
                                </div>
                            ))}
                            <button
                                onClick={addLineItem}
                                className="w-full py-3 bg-white text-gray-700 text-xs font-black uppercase tracking-wider rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:text-blue-600 transition-all"
                            >
                                + Add Item
                            </button>
                        </div>
                    )}
                </section>

                {/* Special Instructions Section */}
                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-4">
                        <SectionHeader title="Special Instructions" section="notes" />
                    </div>
                    {expandedSections.notes && (
                        <div className="px-4 pb-5">
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full h-32 bg-gray-50 text-gray-900 font-bold rounded-xl border-2 border-transparent focus:border-blue-600/20 focus:ring-4 focus:ring-blue-600/10 focus:bg-white py-4 px-4 outline-none resize-none text-base"
                                placeholder="Additional notes or instructions..."
                            />
                        </div>
                    )}
                </section>
            </div>

            {/* Sticky Bottom Action Bar - Work Order */}
            <div className="fixed bottom-16 left-0 right-0 z-40 bg-white border-t border-gray-200 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
                <div className="flex items-center gap-3">
                    <button
                        onClick={resetForm}
                        className="flex-shrink-0 px-4 py-3 bg-gray-100 text-gray-600 text-xs font-black uppercase tracking-wider rounded-xl border border-gray-200 flex items-center gap-2"
                    >
                        <RotateCcw size={16} />
                    </button>
                    <button
                        onClick={handlePrint}
                        disabled={isPrinting}
                        className="flex-1 py-3 bg-gray-900 text-white text-sm font-black uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {isPrinting ? (
                            <span className="animate-pulse">Generating...</span>
                        ) : (
                            <>
                                <Printer size={18} />
                                <span>Generate PDF</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </>
    );

    return (
        <div className="min-h-screen bg-bg flex flex-col pb-16">
            {/* Main Content */}
            {activeView === 'jobs' ? (
                <div className="flex-1 flex flex-col">
                    <JobsList
                        jobs={jobs}
                        loading={jobsLoading}
                        error={jobsError}
                        onRefresh={fetchJobs}
                        onCreateJob={handleCreateJob}
                        onSelectJob={setSelectedJob}
                        onAdvanceStage={advanceStage}
                        onMarkPartsOrdered={markPartsOrdered}
                        onMarkCarHere={markCarHere}
                    />
                </div>
            ) : activeView === 'insurance' ? (
                <InsuranceAssist />
            ) : (
                renderWorkOrderForm()
            )}

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 glass-elevated border-t border-border">
                <div className="flex">
                    <button
                        onClick={() => setActiveView('jobs')}
                        className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${activeView === 'jobs'
                            ? 'text-accent'
                            : 'text-muted'
                            }`}
                    >
                        <Briefcase size={20} />
                        <span className="text-[10px] font-bold uppercase">Jobs</span>
                        {jobs.length > 0 && (
                            <span className="absolute top-2 right-1/4 w-4 h-4 bg-accent text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                {jobs.length > 9 ? '9+' : jobs.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveView('insurance')}
                        className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${activeView === 'insurance'
                            ? 'text-accent'
                            : 'text-muted'
                            }`}
                    >
                        <ShieldCheck size={20} />
                        <span className="text-[10px] font-bold uppercase">Insurance</span>
                    </button>
                    <button
                        onClick={() => setActiveView('workorder')}
                        className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${activeView === 'workorder'
                            ? 'text-accent'
                            : 'text-muted'
                            }`}
                    >
                        <FileText size={20} />
                        <span className="text-[10px] font-bold uppercase">Work Order</span>
                    </button>
                    <button
                        onClick={signOut}
                        className="flex-1 flex flex-col items-center gap-1 py-3 transition-colors text-muted hover:text-accent"
                    >
                        <LogOut size={20} />
                        <span className="text-[10px] font-bold uppercase">Logout</span>
                    </button>
                </div>
            </nav>



            {/* Modal - Vehicle Details */}
            {showDetailsModal && vehicleDetails && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-t-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <div>
                                <h3 className="text-lg font-black text-gray-900 uppercase">Vehicle Details</h3>
                                <p className="text-[10px] text-gray-500 font-bold mt-1 tracking-wider uppercase">VIN: {vehicle.vin}</p>
                            </div>
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="h-10 w-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-5 overflow-y-auto flex-1">
                            <div className="grid grid-cols-1 gap-3">
                                {getDisplayDetails().map((item, i) => (
                                    <div key={i} className="p-3 rounded-xl border border-gray-100 bg-gray-50">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">{item.Variable}</p>
                                        <p className="text-sm font-bold text-gray-900 break-words">{item.Value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50">
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="w-full py-3 bg-gray-900 text-white text-sm font-bold uppercase tracking-wider rounded-xl"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MobileLayout;
