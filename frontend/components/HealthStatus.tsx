import React from 'react';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { HealthStatus as HealthStatusType } from '../src/types';

interface Props {
    health: HealthStatusType;
}

export const HealthStatus: React.FC<Props> = ({ health }) => {
    const getIndexStatus = (count: number) => {
        if (count > 100) return 'Healthy';
        if (count > 0) return 'Partial';
        return 'Empty';
    };

    const StatusIcon = ({ status }: { status: string }) => {
        switch (status) {
            case 'Healthy':
                return <CheckCircle className="h-5 w-5 text-green-600" />;
            case 'Partial':
                return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
            default:
                return <XCircle className="h-5 w-5 text-red-600" />;
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">System Status</h3>
                <span className={`flex items-center ${
                    health.elasticsearch.connected ? 'text-green-600' : 'text-red-600'
                }`}>
                    <StatusIcon status={health.elasticsearch.connected ? 'Healthy' : 'Empty'} />
                    <span className="ml-2">
                        {health.elasticsearch.connected ? 'Connected' : 'Disconnected'}
                    </span>
                </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Object.entries(health.indices).map(([index, data]) => {
                    const status = getIndexStatus(data.document_count);
                    return (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">
                                    {index.replace('_docs', '')}
                                </span>
                                <StatusIcon status={status} />
                            </div>
                            <div className="text-xs text-gray-500">
                                {data.document_count} documents
                            </div>
                            {data.last_updated && (
                                <div className="text-xs text-gray-400 mt-1">
                                    Updated: {new Date(data.last_updated).toLocaleString()}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};