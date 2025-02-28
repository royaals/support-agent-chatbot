import React, { useState, useEffect } from 'react';
import { Search, Send } from 'lucide-react';
import { CDP, SearchResponse, HealthStatus as HealthStatusType } from './types';
import { api } from './utils/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { SearchResult } from '../components/SearchResults';

import { CDPSelector } from '../components/CDPSelector';
import { ErrorMessage } from '../components/ErrorMessage';
import { ErrorBoundary } from '../components/ErrorBoundary';

function App() {
    const [query, setQuery] = useState('');
    const [cdp, setCdp] = useState<CDP>('mparticle');
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(false);
    const [response, setResponse] = useState<SearchResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [health, setHealth] = useState<HealthStatusType | null>(null);

    useEffect(() => {
        checkHealth();
        const interval = setInterval(checkHealth, 30000); // Check health every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const checkHealth = async () => {
        try {
            const status = await api.health();
            setHealth(status);
        } catch (error) {
            console.error('Health check failed:', error);
        }
    };

    const handleInitialize = async () => {
        try {
            setInitializing(true);
            setError(null);
            const result = await api.initialize(cdp);
            await checkHealth();
            alert(`Successfully initialized ${cdp} documentation with ${result.details.document_count} documents`);
        } catch (error) {
            setError(`Failed to initialize ${cdp} documentation`);
        } finally {
            setInitializing(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setResponse(null);
        setError(null);

        try {
            const data = await api.query(cdp, query);
            
            // Ensure the response has all required properties
            if (data.response) {
                setResponse({
                    title: data.response.title || 'Search Result',
                    snippet: {
                        text: typeof data.response === 'string' ? data.response : (data.response.snippet?.text || ''),
                        type: data.response.snippet?.type || 'documentation'
                    },
                    steps: data.response.steps || [],
                    link: data.response.link || '',
                    metadata: {
                        relevance: data.response.metadata?.relevance || 'Medium',
                        documentType: data.response.metadata?.documentType || 'Documentation',
                        headers: data.response.metadata?.headers || []
                    },
                    suggestions: data.response.suggestions || []
                });
            } else {
                setError('No results found');
            }
        } catch (error) {
            setError('Failed to process query');
            console.error('Query error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">
                            CDP Documentation Assistant
                        </h1>
                        <p className="text-gray-600 text-center">
                            Get instant answers from CDP documentation
                        </p>
                    </div>

                   

                    {/* Main Content */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <ErrorBoundary>
                                <CDPSelector
                                    selected={cdp}
                                    onChange={setCdp}
                                    disabled={loading || initializing}
                                />
                            </ErrorBoundary>

                            <div className="space-y-2">
                                <label htmlFor="query" className="block text-sm font-medium text-gray-700">
                                    What would you like to know?
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        id="query"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="e.g., How do I create a user profile?"
                                        className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                        required
                                        disabled={loading || initializing}
                                    />
                                    <button
                                        type="submit"
                                        disabled={loading || initializing}
                                        className="absolute inset-y-0 right-0 flex items-center px-4 text-white bg-blue-600 rounded-r-lg hover:bg-blue-700 focus:outline-none disabled:opacity-50"
                                    >
                                        {loading ? (
                                            <LoadingSpinner size="sm" />
                                        ) : (
                                            <Send className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>

                        {/* Initialize Button */}
                        <div className="mt-4">
                            <button
                                onClick={handleInitialize}
                                disabled={initializing || loading}
                                className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                            >
                                {initializing ? (
                                    <LoadingSpinner size="sm" message="Initializing documentation..." />
                                ) : (
                                    'Initialize Documentation'
                                )}
                            </button>
                        </div>

                        {/* Error Message */}
                        {error && <ErrorMessage message={error} />}

                        {/* Search Results */}
                        {response && !loading && (
                            <ErrorBoundary>
                                <div className="mt-6">
                                    <SearchResult result={response} />
                                </div>
                            </ErrorBoundary>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;