import React, { useState, useRef, useEffect } from 'react';
import {
    ShieldCheck,
    Plus,
    Search,
    Trash2,
    Upload,
    Download,
    X,
    ChevronRight,
    Loader2,
    Image as ImageIcon,
    FileArchive,
    Camera
} from 'lucide-react';
import { useInsurance } from '../hooks/useInsurance';
import { storage } from '../firebase-client';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function InsuranceAssist() {
    const { cases, loading, createCase, updateCase, deleteCase } = useInsurance();
    const [selectedCase, setSelectedCase] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newCaseName, setNewCaseName] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');

    const fileInputRef = useRef(null);

    // Filtering cases
    const filteredCases = cases.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCreateCase = async () => {
        if (!newCaseName.trim()) return;
        try {
            const result = await createCase(newCaseName);
            setNewCaseName('');
            setIsCreateModalOpen(false);
            setSelectedCase(result);
        } catch (err) {
            alert('Failed to create case');
        }
    };

    const handlePhotoUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length || !selectedCase) return;

        setIsUploading(true);
        const currentPhotos = [...(selectedCase.photos || [])];
        const nextIndex = currentPhotos.length + 1;

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const photoIndex = nextIndex + i;
                setUploadProgress(`Compressing photo ${i + 1}/${files.length}...`);

                // 1. Compress Image (< 200KB)
                const options = {
                    maxSizeMB: 0.19, // ~200kb
                    maxWidthOrHeight: 1920,
                    useWebWorker: true
                };
                const compressedFile = await imageCompression(file, options);

                // 2. Rename: "[insurance_case_name]" with number prefix
                const extension = file.name.split('.').pop();
                const fileName = `${photoIndex} - ${selectedCase.name}.${extension}`;

                setUploadProgress(`Uploading ${fileName}...`);

                // 3. Upload to Firebase Storage
                const storageRef = ref(storage, `insurance_photos/${selectedCase.id}/${fileName}`);
                await uploadBytes(storageRef, compressedFile);
                const url = await getDownloadURL(storageRef);

                currentPhotos.push({
                    id: Date.now() + i,
                    name: fileName,
                    url: url,
                    uploaded_at: new Date().toISOString()
                });
            }

            // 4. Update Database
            const updated = await updateCase(selectedCase.id, { photos: currentPhotos });
            setSelectedCase(updated);
            setUploadProgress('');
        } catch (err) {
            console.error('Upload error:', err);
            alert('Error uploading photos: ' + err.message);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeletePhoto = async (photo) => {
        if (!window.confirm('Delete this photo?')) return;

        try {
            // Remove from Storage
            const storageRef = ref(storage, `insurance_photos/${selectedCase.id}/${photo.name}`);
            await deleteObject(storageRef);

            // Remove from Database
            const newPhotos = selectedCase.photos.filter(p => p.name !== photo.name);
            const updated = await updateCase(selectedCase.id, { photos: newPhotos });
            setSelectedCase(updated);
        } catch (err) {
            console.error('Delete photo error:', err);
            alert('Failed to delete photo');
        }
    };

    const handleDownloadAll = async () => {
        if (!selectedCase?.photos?.length) return;

        const zip = new JSZip();
        const photosFolder = zip.folder(selectedCase.name);

        try {
            setUploadProgress('Preparing ZIP...');
            const fetchPromises = selectedCase.photos.map(async (photo) => {
                const response = await fetch(photo.url);
                const blob = await response.blob();
                photosFolder.file(photo.name, blob);
            });

            await Promise.all(fetchPromises);
            const content = await zip.generateAsync({ type: 'blob' });
            saveAs(content, `${selectedCase.name}_photos.zip`);
            setUploadProgress('');
        } catch (err) {
            console.error('Download all error:', err);
            alert('Failed to download photos');
        }
    };

    const handleDeleteCase = async (caseId, e) => {
        e.stopPropagation();
        if (!window.confirm('Delete this entire case and all photos?')) return;

        try {
            await deleteCase(caseId);
            if (selectedCase?.id === caseId) setSelectedCase(null);
        } catch (err) {
            alert('Failed to delete case');
        }
    };

    return (
        <div className="flex h-full overflow-hidden bg-base">
            {/* Sidebar / List View */}
            <div className={`flex flex-col border-r border-subtle bg-surface transition-all duration-300 ${selectedCase ? 'w-0 opacity-0 md:w-80 md:opacity-100' : 'w-full'}`}>
                <div className="p-6 border-b border-subtle">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-code font-bold text-primary flex items-center gap-2">
                            <ShieldCheck className="text-accent" />
                            Insurance Assist
                        </h2>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="p-2 bg-accent text-white rounded-lg shadow-lg shadow-accent/20 hover:scale-105 transition-transform"
                        >
                            <Plus size={20} />
                        </button>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                        <input
                            type="text"
                            placeholder="Search cases..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-base border border-subtle rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:border-accent transition-colors"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {filteredCases.map(c => (
                        <div
                            key={c.id}
                            onClick={() => setSelectedCase(c)}
                            className={`group flex items-center justify-between p-4 rounded-xl cursor-pointer border transition-all ${selectedCase?.id === c.id
                                    ? 'bg-accent/10 border-accent/30'
                                    : 'bg-surface border-transparent hover:bg-surface-hover hover:border-subtle'
                                }`}
                        >
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-sm text-primary truncate">{c.name}</h3>
                                <p className="text-[10px] text-muted uppercase tracking-wider mt-1">
                                    {c.photos?.length || 0} Photos • {new Date(c.updated_at).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => handleDeleteCase(c.id, e)}
                                    className="p-1.5 text-muted hover:text-accent transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                                <ChevronRight size={16} className="text-muted" />
                            </div>
                        </div>
                    ))}

                    {filteredCases.length === 0 && (
                        <div className="text-center py-12">
                            <ShieldCheck className="mx-auto text-muted/20 mb-4" size={48} />
                            <p className="text-sm text-muted">No insurance cases found</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content / Detail View */}
            <div className="flex-1 flex flex-col h-full bg-base overflow-hidden">
                {selectedCase ? (
                    <>
                        {/* Detail Header */}
                        <div className="p-6 border-b border-subtle bg-surface flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setSelectedCase(null)}
                                    className="p-2 md:hidden text-muted"
                                >
                                    <X size={20} />
                                </button>
                                <div>
                                    <h2 className="text-lg font-bold text-primary">{selectedCase.name}</h2>
                                    <p className="text-xs text-muted uppercase tracking-widest">Insurance Supplement Case</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {selectedCase.photos?.length > 0 && (
                                    <button
                                        onClick={handleDownloadAll}
                                        className="btn-ghost flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl"
                                    >
                                        <Download size={16} />
                                        <span>Download All</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="btn-accent flex items-center gap-2 px-6 py-2.5 text-xs rounded-xl"
                                >
                                    {isUploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                                    <span>Upload Photos</span>
                                </button>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    capture="environment"
                                    ref={fileInputRef}
                                    onChange={handlePhotoUpload}
                                    className="hidden"
                                />
                            </div>
                        </div>

                        {/* Status Overlay */}
                        {uploadProgress && (
                            <div className="bg-accent text-white px-6 py-2 text-center text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse">
                                {uploadProgress}
                            </div>
                        )}

                        {/* Photos Grid */}
                        <div className="flex-1 overflow-y-auto p-8">
                            {selectedCase.photos?.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                    {selectedCase.photos.map((photo, idx) => (
                                        <div key={photo.id} className="group relative aspect-square rounded-2xl overflow-hidden border border-subtle bg-surface shadow-sm hover:shadow-xl hover:border-accent/30 transition-all">
                                            <img
                                                src={photo.url}
                                                alt={photo.name}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                                                <div className="flex justify-end">
                                                    <button
                                                        onClick={() => handleDeletePhoto(photo)}
                                                        className="p-2 bg-black/60 text-white rounded-lg hover:bg-accent transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                                <div className="text-white text-[10px] font-bold truncate">
                                                    {photo.name}
                                                </div>
                                            </div>
                                            <div className="absolute top-2 left-2 w-6 h-6 bg-accent text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                                                {idx + 1}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center py-20">
                                    <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mb-6 border border-subtle">
                                        <Camera className="text-muted" size={32} />
                                    </div>
                                    <h3 className="text-lg font-bold text-primary mb-2">No Photos Yet</h3>
                                    <p className="text-muted text-center max-w-xs mb-8">
                                        Tap the upload button or camera to start adding supplement photos.
                                    </p>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="btn-ghost px-8 py-3 rounded-xl flex items-center gap-2"
                                    >
                                        <Plus size={18} />
                                        <span>Add First Photo</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-24 h-24 bg-accent/10 border border-accent/20 rounded-3xl flex items-center justify-center mb-8 rotate-3">
                            <ShieldCheck className="text-accent" size={48} />
                        </div>
                        <h2 className="text-2xl font-code font-bold text-primary mb-4">Insurance Supplement Assist</h2>
                        <p className="text-muted max-w-md mb-10">
                            Create a case to start organizing supplement photos for insurance. Everything is auto-compressed and named for you.
                        </p>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="btn-accent px-10 py-4 rounded-2xl flex items-center gap-3 text-sm"
                        >
                            <Plus size={20} />
                            <span>Create New Insurance Case</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Create Case Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
                    <div className="w-full max-w-md glass-elevated rounded-3xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-bold text-primary flex items-center gap-3">
                                    <FileArchive className="text-accent" />
                                    New Case
                                </h3>
                                <button onClick={() => setIsCreateModalOpen(false)} className="text-muted hover:text-primary transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-bold text-muted uppercase tracking-widest mb-3">Case Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. John Smith - Rear Bumper"
                                        value={newCaseName}
                                        onChange={(e) => setNewCaseName(e.target.value)}
                                        className="w-full bg-surface border border-subtle rounded-2xl p-4 text-primary outline-none focus:border-accent transition-all font-bold placeholder:font-normal"
                                        autoFocus
                                        onKeyDown={(e) => e.key === 'Enter' && handleCreateCase()}
                                    />
                                </div>
                                <button
                                    onClick={handleCreateCase}
                                    disabled={!newCaseName.trim()}
                                    className="w-full btn-accent py-4 rounded-2xl text-sm font-bold shadow-xl shadow-accent/20 disabled:opacity-50"
                                >
                                    Create Case
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
