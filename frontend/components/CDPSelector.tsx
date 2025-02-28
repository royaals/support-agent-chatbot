import React from 'react';
import { CDP } from '../src/types';

interface Props {
    selected: CDP;
    onChange: (cdp: CDP) => void;
    disabled?: boolean;
}

export const CDPSelector: React.FC<Props> = ({ selected, onChange, disabled }) => {
    const cdps: CDP[] = ['mparticle', 'lytics','segment',  'zeotap'];

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
                Select CDP Platform
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {cdps.map((cdp) => (
                    <button
                        key={cdp}
                        type="button"
                        onClick={() => onChange(cdp)}
                        disabled={disabled}
                        className={`
                            py-2 px-4 rounded-lg text-sm font-medium transition-all
                            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                            ${selected === cdp
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }
                        `}
                    >
                        {cdp.charAt(0).toUpperCase() + cdp.slice(1)}
                    </button>
                ))}
            </div>
        </div>
    );
};