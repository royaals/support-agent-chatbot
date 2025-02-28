import { CDP, SearchResponse, HealthStatus, InitializeResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_REACT_APP_API_BASE_URL || 'http://localhost:5000';

class ApiClient {
    private async fetchWithError(url: string, options?: RequestInit) {
        try {
            const response = await fetch(`${API_BASE_URL}${url}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options?.headers,
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'An error occurred');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async health(): Promise<HealthStatus> {
        return this.fetchWithError('/health');
    }

    async initialize(cdp: CDP): Promise<InitializeResponse> {
        return this.fetchWithError(`/initialize/${cdp}`, {
            method: 'POST'
        });
    }

    async query(cdp: CDP, query: string): Promise<{ response: SearchResponse }> {
        return this.fetchWithError('/query', {
            method: 'POST',
            body: JSON.stringify({ cdp, query })
        });
    }
}

export const api = new ApiClient();