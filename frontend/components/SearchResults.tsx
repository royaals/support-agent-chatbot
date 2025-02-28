import React from 'react';
import { BookOpen, ExternalLink, AlertCircle } from 'lucide-react';
import { SearchResponse } from '../src/types';

interface Props {
    result: SearchResponse;
}

export const SearchResult: React.FC<Props> = ({ result }) => {
    // Add null check and default values
    if (!result || typeof result === 'string') {
        return (
            <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-yellow-700">{result || 'No results found'}</p>
            </div>
        );
    }

    const {
        title = 'Untitled',
        snippet = { text: '', type: 'documentation' },
        steps = [],
        link = '',
        metadata = { relevance: 'Medium', documentType: 'Documentation', headers: [] },
        suggestions = [],
        related_topics = []
    } = result;

    return (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-white">{title}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                        metadata.relevance === 'High' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                    }`}>
                        {metadata.relevance} Relevance
                    </span>
                </div>
                <div className="mt-2 text-blue-100">
                    {metadata.documentType}
                </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
                {/* Main Content */}
                {snippet.text && (
                    <div className="prose prose-blue max-w-none">
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div 
                                className="text-gray-700 leading-relaxed" 
                                dangerouslySetInnerHTML={{ __html: snippet.text }} 
                            />
                        </div>
                    </div>
                )}

                {/* Steps */}
                {steps.length > 0 && (
                    <div className="border-l-4 border-blue-500 pl-4">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">
                            Steps
                        </h4>
                        <ol className="list-decimal list-inside space-y-2">
                            {steps.map((step, index) => (
                                <li key={index} className="text-gray-700">
                                    {step}
                                </li>
                            ))}
                        </ol>
                    </div>
                )}

                {/* Suggestions */}
                {suggestions.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">
                            Suggested Actions
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {suggestions.map((suggestion, index) => (
                                <span 
                                    key={index}
                                    className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                                >
                                    {suggestion}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Related Topics */}
                {related_topics.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">
                            Related Topics
                        </h4>
                        <ul className="space-y-1">
                            {related_topics.map((topic, index) => (
                                <li 
                                    key={index}
                                    className="text-blue-600 hover:text-blue-800 cursor-pointer flex items-center"
                                >
                                    <AlertCircle className="h-4 w-4 mr-2" />
                                    {topic}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Documentation Link */}
                {link && (
                    <div className="flex justify-between items-center pt-4 border-t">
                        <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                        >
                            <BookOpen className="h-4 w-4 mr-2" />
                            View full documentation
                            <ExternalLink className="h-4 w-4 ml-1" />
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
};