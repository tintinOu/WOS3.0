import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL;

export function useInsurance() {
    const { getAuthToken } = useAuth();
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchCases = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_URL}/insurance-cases`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch insurance cases');
            const data = await response.json();
            setCases(data);
        } catch (err) {
            console.error('Fetch insurance cases error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [getAuthToken]);

    const createCase = async (name) => {
        setLoading(true);
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_URL}/insurance-cases`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name })
            });

            if (!response.ok) throw new Error('Failed to create insurance case');
            const newCase = await response.json();
            setCases(prev => [newCase, ...prev]);
            return newCase;
        } catch (err) {
            console.error('Create insurance case error:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const updateCase = async (caseId, updates) => {
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_URL}/insurance-cases/${caseId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updates)
            });

            if (!response.ok) throw new Error('Failed to update insurance case');
            const updatedCase = await response.json();
            setCases(prev => prev.map(c => c.id === caseId ? updatedCase : c));
            return updatedCase;
        } catch (err) {
            console.error('Update insurance case error:', err);
            setError(err.message);
            throw err;
        }
    };

    const deleteCase = async (caseId) => {
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_URL}/insurance-cases/${caseId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to delete insurance case');
            setCases(prev => prev.filter(c => c.id !== caseId));
            return true;
        } catch (err) {
            console.error('Delete insurance case error:', err);
            setError(err.message);
            throw err;
        }
    };

    useEffect(() => {
        fetchCases();
    }, [fetchCases]);

    return {
        cases,
        loading,
        error,
        fetchCases,
        createCase,
        updateCase,
        deleteCase
    };
}
