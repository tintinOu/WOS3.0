import React, { useState, useRef } from 'react';
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
    FileArchive,
    ImagePlus,
    ZoomIn
} from 'lucide-react';
import { useInsurance } from '../hooks/useInsurance';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL;

export default function InsuranceAssist() {
    const { cases, loading, createCase, updateCase, deleteCase, fetchCases } = useInsurance();
    const { getAuthToken } = useAuth();
    const [selectedCase, setSelectedCase] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newCaseName, setNewCaseName] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState('');

    // For photo enlargement
    const [enlargedPhoto, setEnlargedPhoto] = useState(null);

    // For uploading during case creation
    const [pendingPhotos, setPendingPhotos] = useState([]);

    const fileInputRef = useRef(null);
    const createFileInputRef = useRef(null);

    // Filtering cases
    const filteredCases = cases.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Toggle case selection (click to open, click again to close)
    const handleCaseClick = (c) => {
        if (selectedCase?.id === c.id) {
            setSelectedCase(null);
        } else {
            setSelectedCase(c);
        }
    };

    // Handle photos selected during case creation
    const handleCreateModalPhotos = (e) => {
        const files = Array.from(e.target.files);
        setPendingPhotos(prev => [...prev, ...files]);
    };

    const removePendingPhoto = (index) => {
        setPendingPhotos(prev => prev.filter((_, i) => i !== index));
    };

    // Upload photo via backend API
    const uploadPhotoToBackend = async (caseId, file) => {
        const token = getAuthToken();
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_URL}/insurance-cases/${caseId}/photos`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
        }

        return response.json();
    };

    const handleCreateCase = async () => {
        if (!newCaseName.trim()) return;

        setIsUploading(true);
        setUploadStatus('Creating case...');

        try {
            const result = await createCase(newCaseName);

            if (pendingPhotos.length > 0) {
                for (let i = 0; i < pendingPhotos.length; i++) {
                    const file = pendingPhotos[i];
                    setUploadStatus(`Uploading ${i + 1}/${pendingPhotos.length}...`);
                    setUploadProgress(Math.round(((i + 1) / pendingPhotos.length) * 100));

                    const uploadResult = await uploadPhotoToBackend(result.id, file);
                    if (i === pendingPhotos.length - 1) {
                        setSelectedCase(uploadResult.case);
                    }
                }
            } else {
                setSelectedCase(result);
            }

            await fetchCases();
            setNewCaseName('');
            setPendingPhotos([]);
            setIsCreateModalOpen(false);

        } catch (err) {
            console.error('Create case error:', err);
            alert('Failed to create case: ' + err.message);
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            setUploadStatus('');
        }
    };

    const handlePhotoUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length || !selectedCase) return;

        setIsUploading(true);

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                setUploadStatus(`Uploading ${i + 1}/${files.length}...`);
                setUploadProgress(Math.round(((i + 1) / files.length) * 100));

                const result = await uploadPhotoToBackend(selectedCase.id, file);

                if (i === files.length - 1) {
                    setSelectedCase(result.case);
                }
            }

            await fetchCases();

        } catch (err) {
            console.error('Upload error:', err);
            alert('Error uploading photos: ' + err.message);
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            setUploadStatus('');
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeletePhoto = async (photo, e) => {
        e.stopPropagation();
        if (!window.confirm('Delete this photo?')) return;

        try {
            const token = getAuthToken();
            const response = await fetch(
                `${API_URL}/insurance-cases/${selectedCase.id}/photos/${encodeURIComponent(photo.name)}`,
                {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            if (!response.ok) throw new Error('Failed to delete photo');

            const result = await response.json();
            setSelectedCase(result.case);
            await fetchCases();
        } catch (err) {
            console.error('Delete photo error:', err);
            alert('Failed to delete photo');
        }
    };

    // Download single photo
    const handleDownloadPhoto = async (photo, e) => {
        e.stopPropagation();
        try {
            // Use a proxy approach - open in new tab which will trigger download
            const link = document.createElement('a');
            link.href = photo.url;
            link.download = photo.name;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Download error:', err);
            // Fallback: open in new tab
            window.open(photo.url, '_blank');
        }
    };

    // Download all as ZIP via backend proxy
    const handleDownloadAll = async () => {
        if (!selectedCase?.photos?.length) return;

        try {
            setUploadStatus('Downloading photos...');
            setIsUploading(true);

            const zip = new JSZip();
            const photosFolder = zip.folder(selectedCase.name);

            for (let i = 0; i < selectedCase.photos.length; i++) {
                const photo = selectedCase.photos[i];
                setUploadProgress(Math.round((i / selectedCase.photos.length) * 100));
                setUploadStatus(`Fetching ${i + 1}/${selectedCase.photos.length}...`);

                try {
                    // Try fetching directly first
                    const response = await fetch(photo.url, { mode: 'cors' });
                    if (response.ok) {
                        const blob = await response.blob();
                        photosFolder.file(photo.name, blob);
                    } else {
                        // If CORS fails, try fetching via image element
                        const blob = await fetchImageAsBlob(photo.url);
                        photosFolder.file(photo.name, blob);
                    }
                } catch (fetchErr) {
                    console.warn(`Failed to fetch ${photo.name}, trying alternative method...`);
                    // Alternative: fetch via image element
                    const blob = await fetchImageAsBlob(photo.url);
                    photosFolder.file(photo.name, blob);
                }
            }

            setUploadStatus('Creating ZIP...');
            const content = await zip.generateAsync({ type: 'blob' });
            saveAs(content, `${selectedCase.name}_photos.zip`);

        } catch (err) {
            console.error('Download all error:', err);
            alert('Failed to download photos. Try downloading individual photos.');
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            setUploadStatus('');
        }
    };

    // Helper to fetch image via canvas to bypass CORS
    const fetchImageAsBlob = (url) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                canvas.toBlob(resolve, 'image/jpeg', 0.95);
            };
            img.onerror = reject;
            img.src = url;
        });
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
        <div className="flex h-full overflow-hidden bg-bg">
            {/* Sidebar / List View */}
            <div className={`flex flex-col border-r border-subtle glass-elevated transition-all duration-300 ${selectedCase ? 'w-0 opacity-0 md:w-80 md:opacity-100' : 'w-full'}`}>
                <div className="p-6 border-b border-subtle">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-code font-bold text-white flex items-center gap-2">
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
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search cases..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-400 outline-none focus:border-accent transition-colors"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {filteredCases.map(c => (
                        <div
                            key={c.id}
                            onClick={() => handleCaseClick(c)}
                            className={`group flex items-center justify-between p-4 rounded-xl cursor-pointer border transition-all ${selectedCase?.id === c.id
                                    ? 'bg-accent/10 border-accent/30'
                                    : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
                                }`}
                        >
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-sm text-white truncate">{c.name}</h3>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">
                                    {c.photos?.length || 0} Photos • {new Date(c.updated_at).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => handleDeleteCase(c.id, e)}
                                    className="p-1.5 text-gray-400 hover:text-accent transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                                <ChevronRight size={16} className="text-gray-400" />
                            </div>
                        </div>
                    ))}

                    {filteredCases.length === 0 && (
                        <div className="text-center py-12">
                            <ShieldCheck className="mx-auto text-gray-600 mb-4" size={48} />
                            <p className="text-sm text-gray-400">No insurance cases found</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content / Detail View */}
            <div className="flex-1 flex flex-col h-full bg-bg overflow-hidden">
                {selectedCase ? (
                    <>
                        {/* Detail Header */}
                        <div className="p-6 border-b border-subtle glass-elevated flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setSelectedCase(null)}
                                    className="p-2 md:hidden text-gray-400 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                                <div>
                                    <h2 className="text-lg font-bold text-white">{selectedCase.name}</h2>
                                    <p className="text-xs text-gray-400 uppercase tracking-widest">Insurance Supplement Case</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {selectedCase.photos?.length > 0 && (
                                    <button
                                        onClick={handleDownloadAll}
                                        disabled={isUploading}
                                        className="btn-ghost flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl text-white border-white/20 hover:border-white/40"
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
                                    ref={fileInputRef}
                                    onChange={handlePhotoUpload}
                                    className="hidden"
                                />
                            </div>
                        </div>

                        {/* Progress Bar */}
                        {isUploading && (
                            <div className="bg-black/40 px-6 py-3 border-b border-subtle">
                                <div className="flex items-center justify-between text-xs text-white mb-2">
                                    <span className="font-bold">{uploadStatus}</span>
                                    <span className="font-mono">{uploadProgress}%</span>
                                </div>
                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-accent transition-all duration-300 ease-out rounded-full"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Photos Grid */}
                        <div className="flex-1 overflow-y-auto p-8">
                            {selectedCase.photos?.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                    {selectedCase.photos.map((photo, idx) => (
                                        <div
                                            key={photo.id}
                                            onClick={() => setEnlargedPhoto(photo)}
                                            className="group relative aspect-square rounded-2xl overflow-hidden border border-white/10 bg-white/5 shadow-sm hover:shadow-xl hover:border-accent/30 transition-all cursor-pointer"
                                        >
                                            <img
                                                src={photo.url}
                                                alt={photo.name}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={(e) => handleDownloadPhoto(photo, e)}
                                                        className="p-2 bg-black/60 text-white rounded-lg hover:bg-green-600 transition-colors"
                                                        title="Download"
                                                    >
                                                        <Download size={14} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDeletePhoto(photo, e)}
                                                        className="p-2 bg-black/60 text-white rounded-lg hover:bg-accent transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="text-white text-[10px] font-bold truncate flex-1">
                                                        {photo.name}
                                                    </div>
                                                    <ZoomIn size={14} className="text-white/60 ml-2" />
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
                                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
                                        <ImagePlus className="text-gray-400" size={32} />
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2">No Photos Yet</h3>
                                    <p className="text-gray-400 text-center max-w-xs mb-8">
                                        Tap the upload button to start adding supplement photos from your library.
                                    </p>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="btn-ghost px-8 py-3 rounded-xl flex items-center gap-2 text-white border-white/20 hover:border-white/40"
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
                        <h2 className="text-2xl font-code font-bold text-white mb-4">Insurance Supplement Assist</h2>
                        <p className="text-gray-400 max-w-md mb-10">
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md">
                    <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                    <FileArchive className="text-accent" />
                                    New Case
                                </h3>
                                <button onClick={() => { setIsCreateModalOpen(false); setPendingPhotos([]); }} className="text-gray-400 hover:text-white transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Case Name *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. John Smith - Rear Bumper"
                                        value={newCaseName}
                                        onChange={(e) => setNewCaseName(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-accent transition-all font-bold placeholder:font-normal placeholder:text-gray-500"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Photos (Optional)</label>
                                    <div
                                        onClick={() => createFileInputRef.current?.click()}
                                        className="border-2 border-dashed border-white/10 rounded-2xl p-6 text-center cursor-pointer hover:border-accent/50 transition-colors"
                                    >
                                        <ImagePlus className="mx-auto text-gray-500 mb-3" size={32} />
                                        <p className="text-sm text-gray-400">Tap to select photos from library</p>
                                    </div>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        ref={createFileInputRef}
                                        onChange={handleCreateModalPhotos}
                                        className="hidden"
                                    />

                                    {pendingPhotos.length > 0 && (
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {pendingPhotos.map((file, idx) => (
                                                <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10">
                                                    <img
                                                        src={URL.createObjectURL(file)}
                                                        alt={file.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); removePendingPhoto(idx); }}
                                                        className="absolute top-0 right-0 bg-accent text-white p-0.5 rounded-bl-lg"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {isUploading && (
                                    <div className="bg-black/40 rounded-xl p-4">
                                        <div className="flex items-center justify-between text-xs text-white mb-2">
                                            <span className="font-bold">{uploadStatus}</span>
                                            <span className="font-mono">{uploadProgress}%</span>
                                        </div>
                                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-accent transition-all duration-300 ease-out rounded-full"
                                                style={{ width: `${uploadProgress}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={handleCreateCase}
                                    disabled={!newCaseName.trim() || isUploading}
                                    className="w-full btn-accent py-4 rounded-2xl text-sm font-bold shadow-xl shadow-accent/20 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="animate-spin" size={18} />
                                            <span>Creating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={18} />
                                            <span>Create Case {pendingPhotos.length > 0 ? `with ${pendingPhotos.length} Photos` : ''}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Photo Enlargement Modal */}
            {enlargedPhoto && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg"
                    onClick={() => setEnlargedPhoto(null)}
                >
                    <div className="relative max-w-5xl max-h-[90vh] w-full">
                        <button
                            onClick={() => setEnlargedPhoto(null)}
                            className="absolute top-4 right-4 z-10 p-3 bg-black/60 text-white rounded-full hover:bg-accent transition-colors"
                        >
                            <X size={24} />
                        </button>

                        <img
                            src={enlargedPhoto.url}
                            alt={enlargedPhoto.name}
                            className="w-full h-full object-contain rounded-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />

                        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-black/60 backdrop-blur-md rounded-xl px-4 py-3">
                            <span className="text-white font-bold text-sm truncate">{enlargedPhoto.name}</span>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDownloadPhoto(enlargedPhoto, e); }}
                                className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-xs font-bold hover:bg-accent/80 transition-colors"
                            >
                                <Download size={14} />
                                <span>Download</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
