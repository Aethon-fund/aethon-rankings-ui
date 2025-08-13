// Simple version to test basic functionality
console.log('Script loading...');

// Global variables
let currentRankings = [];
let characteristicsChart = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing...');
    initializeDatePicker();
    loadRankings();
});

// Initialize date picker with today's date
function initializeDatePicker() {
    const datePicker = document.getElementById('rankingDate');
    if (datePicker) {
        const today = new Date().toISOString().split('T')[0];
        datePicker.value = today;
        datePicker.addEventListener('change', loadRankings);
        console.log('Date picker initialized with:', today);
    }
}

// Load rankings
async function loadRankings() {
    console.log('Loading rankings...');
    const dateInput = document.getElementById('rankingDate');
    const container = document.getElementById('rankingsContainer');
    
    if (!dateInput || !container) {
        console.error('Required elements not found');
        return;
    }
    
    let date = dateInput.value;
    if (!date) {
        date = new Date().toISOString().split('T')[0];
        dateInput.value = date;
    }
    
    container.innerHTML = '<div class="loading">Loading rankings...</div>';
    
    try {
        const url = `${API_CONFIG.baseUrl}/rankings/${date}?model=all`;
        console.log('Fetching from:', url);
        
        const response = await fetch(url);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const rankings = await response.json();
        console.log('Loaded rankings:', rankings.length);
        
        currentRankings = rankings;
        displayRankings(rankings);
        
    } catch (error) {
        console.error('Error loading rankings:', error);
        container.innerHTML = `<div class="error">Failed to load rankings: ${error.message}</div>`;
    }
}

// Display rankings
function displayRankings(rankings) {
    const container = document.getElementById('rankingsContainer');
    
    if (!rankings || rankings.length === 0) {
        container.innerHTML = '<div class="no-data">No rankings available for this date.</div>';
        return;
    }
    
    // Simple display for testing
    container.innerHTML = rankings.map(ranking => `
        <div class="ranking-card">
            <div class="ranking-header">
                <div class="rank-info">
                    <div class="rank-number">#${ranking.rank}</div>
                    <div class="ticker-symbol">${ranking.ticker}</div>
                    <div class="confidence-score">Confidence: ${(ranking.confidence_score * 100).toFixed(0)}%</div>
                </div>
            </div>
            <div class="characteristics">
                <h4>Characteristics (${ranking.characteristics.length}):</h4>
                ${ranking.characteristics.map((char, idx) => `
                    <div class="characteristic-item">
                        <span>${idx + 1}. ${char.text}</span>
                        <span class="char-confidence">${(char.confidence * 100).toFixed(0)}%</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
    
    console.log('Rankings displayed');
}

// Stub functions to prevent errors
function loadActiveModels() {
    console.log('loadActiveModels called (stub)');
}

function loadPerformance(period) {
    console.log('loadPerformance called (stub)');
}

function loadPositions(type) {
    console.log('loadPositions called (stub)');
}

function loadPositionsSummary() {
    console.log('loadPositionsSummary called (stub)');
}

function toggleCharacteristics(ticker) {
    console.log('toggleCharacteristics called (stub)');
}

function openFeedbackModal(ticker, event) {
    if (event) event.stopPropagation();
    console.log('openFeedbackModal called (stub)');
}

function updateCharacteristicsChart(rankings) {
    console.log('updateCharacteristicsChart called (stub)');
}

console.log('Script loaded successfully');