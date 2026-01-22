import React, { useEffect, useState } from 'react';
import { PDFViewer, pdf } from '@react-pdf/renderer';
import PDFOrder from '../components/PDFOrder';
import Sidebar from '../components/Sidebar';
import Dashboard from '../components/Dashboard';
import JobDetails from '../components/JobDetails';
import InsuranceAssist from '../components/InsuranceAssist';

import { useJobs } from '../hooks/useJobs';
import { X, Calendar, Wrench, Printer, FileText, Info, Sparkles, Check, Loader2, RotateCcw } from 'lucide-react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import 'flatpickr/dist/themes/dark.css';
import FloatingLabelInput from '../components/FloatingLabelInput';

/**
 * Desktop layout for the Work Order System.
 * Features a sidebar for navigation, Jobs view, and Work Order form with PDF preview.
 */
function DesktopLayout({ form }) {
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

    // Navigation state
    const [activeView, setActiveView] = useState('dashboard');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

    // Jobs state
    const {
        jobs,
        loading: jobsLoading,
        error: jobsError,
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
        selectedJob,
        setSelectedJob,
    } = useJobs();

    useEffect(() => {
        if (dateInputRef.current) {
            flatpickr(dateInputRef.current, {
                mode: "range",
                dateFormat: "M j D",
                locale: {
                    rangeSeparator: ' TO '
                },
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

    const handleCreateJob = async (jobData = {}) => {
        try {
            const newJob = await createJob(jobData);
            await fetchJobs(); // Refresh jobs list
            if (newJob) {
                setSelectedJob(newJob);
            }
        } catch (error) {
            console.error("Failed to create job:", error);
            alert("Failed to create new case. Please try again.");
        }
    };

    // Helper for Input Styles - Glassmorphism Dark Theme
    const getInputClass = (val) => {
        const isMissing = highlightMissing && !val;
        return `w-full font-semibold rounded-xl transition-all py-3.5 px-5 outline-none input-field
            ${isMissing
                ? 'border-accent bg-accent/10 text-white placeholder-accent/50'
                : ''}`;
    };

    // Render Work Order Form
    const renderWorkOrderForm = () => (
        <div className="flex flex-1 h-full overflow-hidden">
            {/* LEFT PANEL: Input Form */}
            <div className="w-1/2 h-full flex flex-col glass-elevated z-10">
                {/* Header */}
                <header className="px-8 py-6 border-b border-subtle flex flex-row items-center justify-between gap-3 shrink-0">
                    <div className="text-left">
                        <h1 className="font-code text-2xl font-bold tracking-tight text-primary uppercase">311 Auto Body</h1>
                        <p className="text-xs text-muted font-medium tracking-[0.2em] mt-1 ml-1">WORK ORDER SYSTEM</p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadStatus === 'uploading'}
                                className="btn-accent flex items-center gap-2 px-5 py-2.5 text-[10px] rounded-xl disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                <Sparkles size={14} />
                                <span>Auto Fill</span>
                            </button>

                            {/* Status Icons */}
                            {uploadStatus === 'uploading' && <Loader2 className="animate-spin text-accent" size={18} />}
                            {uploadStatus === 'success' && <Check className="text-green-500" size={18} />}
                            {uploadStatus === 'error' && (
                                <div className="group relative">
                                    <X className="text-accent cursor-help" size={18} />
                                    <span className="absolute right-0 top-6 w-32 bg-bg border border-border text-white text-[10px] p-2 rounded shadow-lg hidden group-hover:block z-10">Upload failed</span>
                                </div>
                            )}
                        </div>
                        <span className="text-[9px] text-muted font-medium tracking-wider uppercase">Beta: Works with 311 Estimates</span>

                        {/* Hidden Input */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept=".pdf"
                            className="hidden"
                        />
                    </div>
                </header>

                {/* Dashboard Form (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-8 space-y-12">
                    <div className="flex flex-col gap-12">
                        {/* grid-cols-2 for top section */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                            {/* Customer Section */}
                            <section className="space-y-6">
                                <div>
                                    <h2 className="text-xs font-bold text-secondary uppercase tracking-[0.15em] mb-6 flex items-center gap-3">
                                        <span className="w-2.5 h-2.5 rounded-full bg-accent shadow-[0_0_10px_rgba(239,68,68,0.5)]"></span>
                                        Customer Details
                                    </h2>
                                    <div className="space-y-4">
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
                                </div>

                                {/* Work Schedule */}
                                <div className="pt-6 border-t border-border">
                                    <label className="block text-[10px] font-bold text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Calendar size={14} className="text-accent" /> Work Schedule
                                    </label>
                                    <input
                                        ref={dateInputRef}
                                        type="text"
                                        readOnly
                                        placeholder="Select Date Range..."
                                        className={`uppercase w-full text-center rounded-xl py-4 px-4 outline-none transition-all cursor-pointer input-field
                                            ${(highlightMissing && (!dates.start || !dates.end))
                                                ? 'border-accent bg-accent/10 text-white font-bold'
                                                : 'font-bold hover:border-border-hover'}`}
                                    />
                                    {dates.start && (
                                        <div className="mt-3 flex justify-center gap-4 text-[10px] font-bold uppercase text-white bg-surface py-2 rounded-lg border border-border">
                                            <span>Start: {dates.start}</span>
                                            <span className="text-muted">|</span>
                                            <span>Due: {dates.end} {duration && <span className="ml-2 bg-accent text-white px-2 py-0.5 rounded-md">[{duration}]</span>}</span>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Vehicle Section */}
                            <section>
                                <h2 className="text-xs font-bold text-secondary uppercase tracking-[0.15em] mb-6 flex items-center gap-3">
                                    <span className="w-2.5 h-2.5 rounded-full bg-accent shadow-[0_0_10px_rgba(239,68,68,0.5)]"></span>
                                    Vehicle Information
                                </h2>
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="col-span-2">
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
                                            className="uppercase font-mono tracking-[0.2em] text-sm"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <FloatingLabelInput
                                            label="Make & Model"
                                            value={vehicle.makeModel}
                                            onChange={(e) => setVehicle({ ...vehicle, makeModel: e.target.value })}
                                            isMissing={highlightMissing && !vehicle.makeModel}
                                        />
                                    </div>
                                    <div>
                                        <FloatingLabelInput
                                            label="Plate Number"
                                            value={vehicle.plate}
                                            onChange={(e) => setVehicle({ ...vehicle, plate: e.target.value })}
                                            isMissing={highlightMissing && !vehicle.plate}
                                            className="uppercase"
                                        />
                                    </div>
                                    <div>
                                        <FloatingLabelInput
                                            label="Year"
                                            value={vehicle.year}
                                            onChange={(e) => setVehicle({ ...vehicle, year: e.target.value })}
                                            isMissing={highlightMissing && !vehicle.year}
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={() => setShowDetailsModal(true)}
                                    disabled={!vehicleDetails}
                                    className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold uppercase text-xs tracking-wider transition-all
                                        ${vehicleDetails
                                            ? 'btn-ghost hover:border-accent hover:text-accent'
                                            : 'surface text-muted cursor-not-allowed opacity-50'
                                        }`}
                                >
                                    <Info size={16} />
                                    More Vehicle Details
                                </button>
                            </section>
                        </div>

                        {/* Job Details Section */}
                        <section className="pt-8 border-t border-border">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-xs font-bold text-secondary uppercase tracking-[0.15em] flex items-center gap-3">
                                    <span className="w-2.5 h-2.5 rounded-full bg-accent shadow-[0_0_10px_rgba(239,68,68,0.5)]"></span>
                                    Job Details
                                </h2>
                                <button
                                    onClick={addLineItem}
                                    className="btn-ghost flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg"
                                >
                                    <span>+ Add Item</span>
                                </button>
                            </div>
                            <div className="space-y-4">
                                {items.map((item, index) => (
                                    <div key={item.id} className="group flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-lg surface flex items-center justify-center text-[10px] font-bold text-muted mt-1 select-none">
                                            {(index + 1).toString().padStart(2, '0')}
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <select
                                                value={item.type}
                                                onChange={(e) => updateItem(item.id, 'type', e.target.value)}
                                                className="w-32 input-field text-xs font-bold uppercase rounded-xl py-3 px-3 cursor-pointer"
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
                                                    className="w-32 input-field text-[10px] font-bold uppercase rounded-xl py-2 px-3 placeholder-muted"
                                                    placeholder="Title"
                                                />
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            value={item.desc}
                                            onChange={(e) => updateItem(item.id, 'desc', e.target.value)}
                                            className="flex-1 input-field font-bold rounded-xl py-3 px-5 uppercase placeholder-muted"
                                            placeholder="Description of work..."
                                        />
                                        <button
                                            onClick={() => removeItem(item.id)}
                                            className="h-[46px] w-[46px] rounded-xl surface text-muted hover:bg-accent/10 hover:text-accent hover:border-accent/30 transition-all flex items-center justify-center"
                                            tabIndex={-1}
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Special Instructions */}
                        <section className="pt-8 border-t border-border">
                            <h2 className="text-xs font-bold text-secondary uppercase tracking-[0.15em] mb-6 flex items-center gap-3">
                                <span className="w-2.5 h-2.5 rounded-full bg-accent shadow-[0_0_10px_rgba(239,68,68,0.5)]"></span>
                                Special Instructions
                            </h2>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full h-32 input-field font-medium rounded-xl py-4 px-5 resize-none placeholder-muted"
                                placeholder="Additional notes or instructions..."
                            />
                        </section>
                    </div>
                </div>

                {/* Footer / Actions */}
                <div className="px-8 py-6 border-t border-border flex items-center justify-between gap-4 shrink-0">
                    <button
                        onClick={resetForm}
                        className="btn-ghost px-6 py-3 text-xs font-bold uppercase tracking-wider rounded-xl flex items-center gap-2 hover:border-accent hover:text-accent"
                    >
                        <RotateCcw size={16} />
                        <span>Reset</span>
                    </button>
                    <span className="text-[10px] text-muted font-medium tracking-wider">Version 2.1.0</span>
                    <button
                        onClick={handlePrint}
                        disabled={isPrinting}
                        className="btn-accent px-8 py-3 text-xs rounded-xl disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isPrinting ? (
                            <span className="animate-pulse">Loading...</span>
                        ) : (
                            <>
                                <Printer size={18} />
                                <span>Generate PDF</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* RIGHT PANEL: PDF Preview */}
            <div className="w-1/2 h-full bg-bg p-6 flex items-center justify-center">
                <div className="w-full h-full shadow-2xl rounded-xl overflow-hidden border border-border">
                    <PDFViewer width="100%" height="100%" className='border-none'>
                        <PDFOrder data={pdfData} />
                    </PDFViewer>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen w-full bg-bg overflow-hidden">
            {/* Sidebar */}
            <Sidebar
                activeView={activeView}
                onViewChange={setActiveView}
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                jobCount={jobs.length}
            />

            {/* Main Content Area */}
            <div className="flex-1 h-full overflow-hidden">
                {activeView === 'dashboard' ? (
                    selectedJob ? (
                        <JobDetails
                            key={selectedJob.id}
                            job={selectedJob}
                            onBack={() => setSelectedJob(null)}
                            onUpdate={updateJob}
                            onDelete={deleteJob}
                            onAdvanceStage={advanceStage}
                            onRevertStage={revertStage}
                            toggleCarHere={toggleCarHere}
                            togglePartsOrdered={togglePartsOrdered}
                            togglePartsArrived={togglePartsArrived}
                            toggleRentalRequested={toggleRentalRequested}
                            toggleCustomerNotified={toggleCustomerNotified}
                        />
                    ) : (
                        <Dashboard
                            jobs={jobs}
                            loading={jobsLoading}
                            error={jobsError}
                            onRefresh={fetchJobs}
                            onCreateJob={handleCreateJob}
                            onSelectJob={setSelectedJob}
                        />
                    )
                ) : activeView === 'workorder' ? (
                    renderWorkOrderForm()
                ) : activeView === 'calendar' ? (
                    // Calendar view - show Dashboard in calendar mode
                    <Dashboard
                        jobs={jobs}
                        loading={jobsLoading}
                        error={jobsError}
                        onRefresh={fetchJobs}
                        onCreateJob={handleCreateJob}
                        onSelectJob={setSelectedJob}
                        defaultViewMode="calendar"
                    />
                ) : activeView === 'insurance' ? (
                    <InsuranceAssist />
                ) : activeView === 'settings' ? (
                    // Settings placeholder
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                            <h2 className="font-code text-2xl font-bold text-primary mb-2">Settings</h2>
                            <p className="text-muted">Settings page coming soon</p>
                        </div>
                    </div>
                ) : (
                    renderWorkOrderForm()
                )}
            </div>



            {/* Modal - Vehicle Details */}
            {showDetailsModal && vehicleDetails && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 uppercase">Vehicle Specifications</h3>
                                <p className="text-xs text-gray-500 font-bold mt-1 tracking-wider uppercase"> VIN: {vehicle.vin}</p>
                            </div>
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="h-8 w-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-50 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto bg-white">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {getDisplayDetails().map((item, i) => (
                                    <div key={i} className="p-3 rounded-lg border border-gray-100 hover:border-blue-50 hover:bg-blue-50/30 transition-colors">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">{item.Variable}</p>
                                        <p className="text-sm font-bold text-gray-900 break-words">{item.Value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="px-6 py-2 bg-gray-900 text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-gray-800 transition-colors"
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

export default DesktopLayout;
