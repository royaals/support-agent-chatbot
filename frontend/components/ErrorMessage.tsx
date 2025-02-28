import React from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
    message: string;
    suggestions?: string[];
}

export const ErrorMessage: React.FC<Props> = ({ message, suggestions }) => (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-red-700">{message}</p>
        </div>
        {suggestions && suggestions.length > 0 && (
            <div className="mt-3">
                <p className="text-sm text-red-600 font-medium">Suggestions:</p>
                <ul className="mt-2 list-disc list-inside text-sm text-red-600">
                    {suggestions.map((suggestion, index) => (
                        <li key={index}>{suggestion}</li>
                    ))}
                </ul>
            </div>
        )}
    </div>
);