// API Configuration
const API_CONFIG = {
    // Backend API URL - Update this with your deployed backend URL
    // For production, replace 'https://api.aethon.fund' with your actual backend URL
    baseUrl: window.location.hostname === 'localhost' 
        ? 'http://localhost:8001' 
        : 'https://api.aethon.fund', // TODO: Replace with your actual backend API URL
    
    // API endpoints
    endpoints: {
        rankings: '/rankings',
        feedback: '/feedback',
        performance: '/performance',
        activeModels: '/models/active',
        updateConfig: '/models/config',
        signals: '/signals',
        signalSummary: '/signals',
        signalReport: '/signals/report',
        availableTickers: '/signals/tickers/available',
        uploadCSV: '/upload/csv',
        positions: '/positions',
        positionsSummary: '/positions/summary'
    },
    
    // Request configuration
    headers: {
        'Content-Type': 'application/json',
    }
};

// Helper function to build full URL
function buildUrl(endpoint, params = {}) {
    const url = new URL(API_CONFIG.baseUrl + API_CONFIG.endpoints[endpoint]);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    return url.toString();
}