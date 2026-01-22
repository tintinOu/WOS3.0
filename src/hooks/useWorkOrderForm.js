import { useState, useRef } from 'react';

/**
 * Custom hook that encapsulates all Work Order form state and handlers.
 * This allows both Desktop and Mobile layouts to share the same business logic.
 */
export function useWorkOrderForm() {
    const [isPrinting, setIsPrinting] = useState(false);
    const dateInputRef = useRef(null);
    const fileInputRef = useRef(null);

    const [customer, setCustomer] = useState({ name: '', phone: '' });
    const [vehicle, setVehicle] = useState({ year: '', makeModel: '', plate: '', vin: '' });
    const [dates, setDates] = useState({ start: '', end: '' });
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState([{ id: Date.now(), type: 'Repair', desc: '' }]);

    // Vehicle Details State
    const [vehicleDetails, setVehicleDetails] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    // Auto-Fill State
    const [uploadStatus, setUploadStatus] = useState('idle');
    const [highlightMissing, setHighlightMissing] = useState(false);

    // Calculate duration
    const getDuration = () => {
        if (!dates?.start || !dates?.end) return null;
        try {
            const [sm, sd] = dates.start.split('/').map(Number);
            const [em, ed] = dates.end.split('/').map(Number);
            const currentYear = new Date().getFullYear();
            const start = new Date(currentYear, sm - 1, sd);
            const end = new Date(currentYear, em - 1, ed);
            const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
            return diff > 0 ? `${diff} DAYS` : null;
        } catch (e) { return null; }
    };

    const duration = getDuration();

    // Line item handlers
    const addLineItem = () => {
        setItems(prev => {
            const lastItem = prev.length > 0 ? prev[prev.length - 1] : null;
            const lastType = lastItem ? lastItem.type : 'Repair';
            const lastCustomTitle = (lastItem && lastItem.type === 'Other') ? lastItem.customTitle : '';
            return [...prev, { id: Date.now(), type: lastType, desc: '', customTitle: lastCustomTitle }];
        });
    };

    const removeItem = (id) => {
        if (items.length === 1) {
            setItems([{ id: Date.now(), type: 'Repair', desc: '', customTitle: '' }]);
            return;
        }
        setItems(items.filter(item => item.id !== id));
    };

    const updateItem = (id, field, value) => {
        setItems(prevItems => {
            const newItems = prevItems.map(item =>
                item.id === id ? { ...item, [field]: value } : item
            );

            // Auto-add logic
            const index = newItems.findIndex(item => item.id === id);
            if (field === 'desc' && value && index === newItems.length - 1) {
                const currentItem = newItems[index];
                const currentType = currentItem.type;
                const currentCustomTitle = (currentType === 'Other') ? currentItem.customTitle : '';
                newItems.push({ id: Date.now(), type: currentType, desc: '', customTitle: currentCustomTitle });
            }

            return newItems;
        });
    };

    // VIN Decoding Logic
    const decodeVin = async (vin) => {
        if (vin.length !== 17) return;

        try {
            const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`);
            const data = await response.json();

            if (data && data.Results) {
                setVehicleDetails(data.Results);

                const getVal = (id) => {
                    const item = data.Results.find(r => r.VariableId === id);
                    return item ? item.Value : '';
                };

                const year = getVal(29);
                const make = getVal(26);
                const model = getVal(28);
                const trim = getVal(38) || getVal(34);

                if (year && make && model) {
                    const baseStr = `${make} ${model}`;
                    const fullStr = trim && !baseStr.includes(trim) ? `${baseStr} ${trim}` : baseStr;

                    setVehicle(prev => ({
                        ...prev,
                        vin: vin,
                        year: year,
                        makeModel: fullStr.trim()
                    }));
                }
            }
        } catch (error) {
            console.error("VIN Decode Failed:", error);
            setVehicleDetails(null);
        }
    };

    // Helper to get useful non-empty fields for the modal
    const getDisplayDetails = () => {
        if (!vehicleDetails) return [];
        return vehicleDetails.filter(item =>
            item.Value &&
            item.Value !== "Not Applicable" &&
            !item.Variable.includes("Error") &&
            !item.Variable.includes("ErrorCode")
        );
    };

    // Handle AI Auto-Fill
    const handleAutoFill = (data) => {
        if (data.customer) {
            setCustomer(prev => ({
                ...prev,
                name: data.customer.name || prev.name,
                phone: data.customer.phone || prev.phone
            }));
        }
        if (data.vehicle) {
            setVehicle(prev => ({
                ...prev,
                year: data.vehicle.year || prev.year,
                makeModel: data.vehicle.makeModel || prev.makeModel,
                plate: data.vehicle.plate || prev.plate,
                vin: data.vehicle.vin || prev.vin
            }));
        }
        if (data.items && data.items.length > 0) {
            const newItems = data.items.map((item, i) => ({
                id: Date.now() + i,
                type: item.type || 'Repair',
                desc: item.desc || '',
                partNum: item.partNum || '',
                customTitle: item.customTitle || ''
            }));
            newItems.push({ id: Date.now() + data.items.length, type: 'Repair', desc: '', customTitle: '' });
            setItems(newItems);
        }
        if (data.notes) {
            setNotes(data.notes);
        }
    };

    // File Upload Handler
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadStatus('uploading');

        const formData = new FormData();
        formData.append('file', file);

        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

        try {
            const response = await fetch(`${API_URL}/analyze`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Failed');

            const data = await response.json();
            handleAutoFill(data);
            setUploadStatus('success');
            setHighlightMissing(true);

            setTimeout(() => setUploadStatus('idle'), 3000);
        } catch (error) {
            console.error(error);
            setUploadStatus('error');
            setTimeout(() => setUploadStatus('idle'), 3000);
        }

        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Reset Form
    const resetForm = () => {
        setCustomer({ name: '', phone: '' });
        setVehicle({ year: '', makeModel: '', plate: '', vin: '' });
        setDates({ start: '', end: '' });
        setNotes('');
        setItems([{ id: Date.now(), type: 'Repair', desc: '' }]);
        setVehicleDetails(null);
        setHighlightMissing(false);
        if (dateInputRef.current) {
            dateInputRef.current._flatpickr?.clear();
        }
    };

    // PDF Data
    const pdfData = {
        customer,
        vehicle,
        dates,
        items,
        notes
    };

    return {
        // Refs
        dateInputRef,
        fileInputRef,

        // State
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

        // Handlers
        addLineItem,
        removeItem,
        updateItem,
        decodeVin,
        getDisplayDetails,
        handleFileUpload,
        resetForm,
    };
}

export default useWorkOrderForm;
