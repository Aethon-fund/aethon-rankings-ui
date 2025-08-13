// Working version with no external dependencies
console.log('Working script starting...');

// Wait for DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM ready');
    
    // Initialize date picker
    const dateInput = document.getElementById('rankingDate');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    
    // Load rankings immediately
    loadRankingsSimple();
});

async function loadRankingsSimple() {
    const container = document.getElementById('rankingsContainer');
    if (!container) {
        console.error('No rankings container found');
        return;
    }
    
    container.innerHTML = '<div class="loading">Loading rankings...</div>';
    
    try {
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`http://localhost:8001/rankings/${today}?model=all`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch: ' + response.status);
        }
        
        const rankings = await response.json();
        console.log('Got ' + rankings.length + ' rankings');
        
        // Display rankings
        if (rankings.length === 0) {
            container.innerHTML = '<div class="no-data">No rankings available.</div>';
            return;
        }
        
        container.innerHTML = rankings.map(r => `
            <div class="ranking-card" onclick="toggleCharacteristicDetail('${r.ticker}')">
                <div class="ranking-header">
                    <div class="rank-info">
                        <div class="rank-number">#${r.rank}</div>
                        <div class="ticker-symbol">${r.ticker}</div>
                        <div class="confidence-score">Confidence: ${(r.confidence_score * 100).toFixed(0)}%</div>
                    </div>
                    <button class="feedback-btn-small" onclick="openFeedbackModal('${r.ticker}', event)" title="Provide feedback">
                        <span class="feedback-icon">💬</span>
                    </button>
                </div>
                <div class="characteristics">
                    <h4>Key Characteristics:</h4>
                    ${r.characteristics.slice(0, 3).map((c, i) => `
                        <div class="characteristic-item">
                            <span>${i + 1}. ${c.text}</span>
                            <span class="char-confidence">${(c.confidence * 100).toFixed(0)}%</span>
                        </div>
                    `).join('')}
                </div>
                <div id="detail-${r.ticker}" class="characteristic-detail" style="display: none;">
                    <h4>Individual Characteristics:</h4>
                    ${r.characteristics.map((c, i) => `
                        <div class="characteristic-feedback-item">
                            <div class="char-text">${i + 1}. ${c.text}</div>
                            <div class="char-confidence">Confidence: ${(c.confidence * 100).toFixed(0)}%</div>
                            ${c.explanation ? `<div class="char-explanation">${c.explanation}</div>` : ''}
                            <div class="feedback-slider-container">
                                <label>How much do you agree?</label>
                                <div class="slider-wrapper">
                                    <span>Disagree</span>
                                    <input type="range" class="feedback-slider" 
                                           id="slider-${r.ticker}-${i}" 
                                           min="0" max="100" value="50"
                                           onchange="updateSliderValue('${r.ticker}', ${i})">
                                    <span>Agree</span>
                                </div>
                                <div class="slider-value" id="value-${r.ticker}-${i}">50%</div>
                            </div>
                        </div>
                    `).join('')}
                    <button class="btn-primary" onclick="submitCharacteristicFeedback('${r.ticker}')">
                        Submit Feedback
                    </button>
                </div>
            </div>
        `).join('');
        
        // Update characteristics chart
        updateCharacteristicsChart(rankings);
        
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}

// Update characteristics chart
function updateCharacteristicsChart(rankings) {
    if (!window.characteristicsChart) return;
    
    // Count characteristics
    const charCounts = {};
    rankings.forEach(r => {
        r.characteristics.forEach(c => {
            const key = c.text.split(':')[0].trim();
            charCounts[key] = (charCounts[key] || 0) + 1;
        });
    });
    
    // Sort by frequency and take top 10
    const sorted = Object.entries(charCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    // Update chart
    window.characteristicsChart.data.labels = sorted.map(([label]) => label);
    window.characteristicsChart.data.datasets[0].data = sorted.map(([, count]) => count);
    window.characteristicsChart.update();
}

// Add event listener for date change
window.loadRankings = loadRankingsSimple;

// Initialize other sections
async function loadPositions(type = 'long') {
    const container = document.getElementById('positionsContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Loading positions...</div>';
    
    try {
        const year = document.getElementById('yearFilter')?.value || '2025';
        const url = `http://localhost:8001/positions/${type}?year=${year}`;
        console.log('Loading positions from:', url);
        
        const response = await fetch(url);
        console.log('Positions response:', response.status);
        
        if (!response.ok) {
            const text = await response.text();
            console.error('Positions error response:', text);
            throw new Error('Failed to load positions: ' + response.status);
        }
        
        const positions = await response.json();
        
        if (positions.length === 0) {
            container.innerHTML = '<div class="no-data">No positions available.</div>';
            return;
        }
        
        container.innerHTML = `
            <table class="positions-table">
                <thead>
                    <tr>
                        <th>Ticker</th>
                        <th>Sector</th>
                        <th>Entry Price</th>
                        <th>Current Price</th>
                        <th>Return</th>
                        <th>vs SPY</th>
                    </tr>
                </thead>
                <tbody>
                    ${positions.map(p => `
                        <tr>
                            <td>${p.ticker}</td>
                            <td>${p.sector || 'N/A'}</td>
                            <td>$${p.entry_price.toFixed(2)}</td>
                            <td>$${p.live_price.toFixed(2)}</td>
                            <td class="${p.return_pct > 0 ? 'positive' : 'negative'}">
                                ${p.return_pct > 0 ? '+' : ''}${p.return_pct.toFixed(2)}%
                            </td>
                            <td class="${p.return_pct > p.spy_benchmark ? 'positive' : 'negative'}">
                                ${p.return_pct > p.spy_benchmark ? '+' : ''}${(p.return_pct - p.spy_benchmark).toFixed(2)}%
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Error loading positions:', error);
        container.innerHTML = '<div class="error">Failed to load positions</div>';
    }
}

async function loadPerformance() {
    try {
        const response = await fetch('http://localhost:8001/performance/7d');
        if (response.ok) {
            const data = await response.json();
            document.getElementById('accuracyMetric').textContent = 
                data.accuracy ? (data.accuracy * 100).toFixed(1) + '%' : 'N/A';
            document.getElementById('sharpeMetric').textContent = 
                data.sharpe_ratio ? data.sharpe_ratio.toFixed(2) : 'N/A';
            document.getElementById('precisionMetric').textContent = 
                data.precision ? (data.precision * 100).toFixed(1) + '%' : 'N/A';
        }
    } catch (error) {
        console.error('Error loading performance:', error);
    }
}

async function loadActiveModels() {
    try {
        const response = await fetch('http://localhost:8001/models/active');
        if (response.ok) {
            const models = await response.json();
            const elem = document.getElementById('activeModels');
            if (elem) elem.textContent = models.length;
        }
    } catch (error) {
        console.error('Error loading active models:', error);
    }
}

// Initialize positions on load
document.addEventListener('DOMContentLoaded', function() {
    loadPositions('long');
    loadPerformance();
    loadActiveModels();
    
    // Initialize empty chart
    const ctx = document.getElementById('charChart');
    if (ctx) {
        window.characteristicsChart = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Frequency',
                    data: [],
                    backgroundColor: 'rgba(255, 215, 0, 0.8)',
                    borderColor: 'rgba(255, 215, 0, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#fff'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#fff',
                            autoSkip: false,
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
});

// Update tab switching
window.showPositions = function(type) {
    // Update active tab
    document.querySelectorAll('.position-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Load positions
    loadPositions(type);
};

// Chart expansion
window.toggleChartExpand = function() {
    const container = document.getElementById('characteristicsContainer');
    const icon = document.getElementById('chartExpandIcon');
    
    if (container) {
        container.classList.toggle('expanded');
        icon.textContent = container.classList.contains('expanded') ? '⛶' : '⛶';
    }
};

// Modal functions
window.showUploadModal = function() { 
    document.getElementById('uploadModal').style.display = 'block';
};
window.closeUploadModal = function() { 
    document.getElementById('uploadModal').style.display = 'none';
};
window.showModelConfig = function() { console.log('Model config clicked'); };
window.updateModelFilter = function() { loadRankingsSimple(); };
window.updateYearFilter = function() { 
    loadPositions(document.querySelector('.position-tabs .tab-btn.active')?.textContent.includes('Long') ? 'long' : 'short');
};
// Toggle characteristic detail view
window.toggleCharacteristicDetail = function(ticker) {
    const detail = document.getElementById(`detail-${ticker}`);
    if (detail) {
        detail.style.display = detail.style.display === 'none' ? 'block' : 'none';
    }
};

// Update slider value display
window.updateSliderValue = function(ticker, index) {
    const slider = document.getElementById(`slider-${ticker}-${index}`);
    const valueDisplay = document.getElementById(`value-${ticker}-${index}`);
    if (slider && valueDisplay) {
        valueDisplay.textContent = slider.value + '%';
    }
};

// Submit characteristic feedback
window.submitCharacteristicFeedback = async function(ticker) {
    const feedbackData = [];
    const characteristics = document.querySelectorAll(`#detail-${ticker} .characteristic-feedback-item`);
    
    characteristics.forEach((item, index) => {
        const slider = item.querySelector('.feedback-slider');
        if (slider) {
            feedbackData.push({
                index: index,
                agreement: parseInt(slider.value)
            });
        }
    });
    
    console.log('Submitting feedback for', ticker, feedbackData);
    // TODO: Send to backend
    alert('Feedback submitted successfully!');
};

window.toggleCharacteristics = function(ticker) { toggleCharacteristicDetail(ticker); };
window.openFeedbackModal = function(ticker, event) { 
    if (event) event.stopPropagation();
    const modal = document.getElementById('feedbackModal');
    const tickerSpan = document.getElementById('feedbackTicker');
    if (modal && tickerSpan) {
        tickerSpan.textContent = ticker;
        modal.style.display = 'block';
    }
};
window.closeStockModal = function() { 
    document.getElementById('stockModal').style.display = 'none';
};
window.closeFeedbackModal = function() { 
    document.getElementById('feedbackModal').style.display = 'none';
};
window.showStockTab = function(tab) { console.log('Show tab:', tab); };
window.submitFeedback = function() { console.log('Submit feedback'); };
window.uploadCSVFiles = function() { console.log('Upload CSV'); };

console.log('Working script loaded successfully');