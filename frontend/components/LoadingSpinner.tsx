import React from 'react';
import { Loader2 } from 'lucide-react';

interface Props {
    size?: 'sm' | 'md' | 'lg';
    message?: string;
}

export const LoadingSpinner: React.FC<Props> = ({ 
    size = 'md', 
    message = 'Loading...' 
}) => {
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-8 w-8',
        lg: 'h-12 w-12'
    };

    return (
        <div className="flex flex-col items-center justify-center p-4">
            <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
            {message && (
                <p className="mt-2 text-sm text-gray-600">{message}</p>
            )}
        </div>
    );
};