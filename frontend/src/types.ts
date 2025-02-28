export type CDP = 'segment' | 'mparticle' | 'lytics' | 'zeotap';

export interface SearchSnippet {
    text: string;
    type: 'guide' | 'documentation';
}

export interface SearchMetadata {
    relevance: 'High' | 'Medium' | 'Low';
    documentType: string;
    headers: string[];
}

export interface SearchResponse {
    title: string;
    snippet: SearchSnippet;
    steps?: string[];
    link: string;
    metadata: SearchMetadata;
    suggestions: string[];
    related_topics?: string[];
}

export interface HealthStatus {
    elasticsearch: {
        connected: boolean;
        timestamp: string;
    };
    indices: {
        [key: string]: {
            exists: boolean;
            document_count: number;
            last_updated?: string;
        };
    };
}

export interface ApiError {
    error: string;
    message?: string;
    timestamp?: string;
    suggestions?: string[];
}

export interface InitializeResponse {
    message: string;
    details: {
        cdp: string;
        document_count: number;
        timestamp: string;
    };
}