import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, Sparkles } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const PDFUpload = ({ onDataExtracted, onClose }) => {
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile && selectedFile.type === 'application/pdf') {
            setFile(selectedFile);
            setError('');
        } else {
            setError('Please select a PDF file');
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile && droppedFile.type === 'application/pdf') {
            setFile(droppedFile);
            setError('');
        } else {
            setError('Please drop a PDF file');
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        setError('');
        setStatus('Uploading PDF...');

        const formData = new FormData();
        formData.append('file', file);

        try {
            setStatus('Processing with OCR...');
            const response = await fetch(`${API_URL}/analyze`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to analyze PDF');
            }

            setStatus('Extracting data...');
            const data = await response.json();

            setStatus('Done!');
            onDataExtracted(data);

            // Close after a brief success message
            setTimeout(() => {
                onClose();
            }, 500);

        } catch (err) {
            setError(err.message || 'Failed to process PDF');
            setStatus('');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600">
                    <div className="flex items-center gap-3">
                        <Sparkles className="text-white" size={24} />
                        <div>
                            <h3 className="text-lg font-black text-white uppercase">AI Auto-Fill</h3>
                            <p className="text-xs text-blue-100 font-medium">Upload a PDF to extract data</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isUploading}
                        className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors disabled:opacity-50"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Drop Zone */}
                    <div
                        onClick={() => !isUploading && fileInputRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                            ${file ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'}
                            ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            className="hidden"
                        />

                        {file ? (
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                    <Upload className="text-green-600" size={24} />
                                </div>
                                <p className="text-sm font-bold text-gray-900">{file.name}</p>
                                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                                    <Upload className="text-gray-400" size={24} />
                                </div>
                                <p className="text-sm font-bold text-gray-900">Drop PDF here or click to browse</p>
                                <p className="text-xs text-gray-400">Supports work order documents</p>
                            </div>
                        )}
                    </div>

                    {/* Status */}
                    {status && (
                        <div className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-blue-600">
                            <Loader2 className="animate-spin" size={16} />
                            <span>{status}</span>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="mt-4 p-3 bg-red-50 rounded-lg text-sm text-red-600 font-medium text-center">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isUploading}
                        className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={!file || isUploading}
                        className="px-6 py-2 bg-blue-600 text-white text-sm font-bold uppercase tracking-wider rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="animate-spin" size={16} />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Sparkles size={16} />
                                Analyze
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PDFUpload;
