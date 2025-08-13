// Global state
let currentRankings = [];
let selectedTicker = null;
let characteristicsChart = null;
let currentPositionType = 'long';

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeDatePicker();
    loadActiveModels();
    loadRankings();
    loadPerformance('7d');
    loadPositions('long');
    loadPositionsSummary();
});

// Initialize date picker with today's date
function initializeDatePicker() {
    const datePicker = document.getElementById('rankingDate');
    const today = new Date().toISOString().split('T')[0];
    datePicker.value = today;
    datePicker.addEventListener('change', loadRankings);
}

// Load active models count
async function loadActiveModels() {
    try {
        const response = await fetch(`${API_CONFIG.baseUrl}/models/active`);
        const models = await response.json();
        document.getElementById('activeModels').textContent = models.length;
    } catch (error) {
        console.error('Error loading active models:', error);
        document.getElementById('activeModels').textContent = '0';
    }
}

// Load rankings for selected date
async function loadRankings() {
    const dateInput = document.getElementById('rankingDate');
    let date = dateInput.value;
    
    // If no date is set, use today's date
    if (!date) {
        const today = new Date().toISOString().split('T')[0];
        date = today;
        dateInput.value = today;
    }
    
    const positionType = document.getElementById('positionFilter').value;
    const model = document.getElementById('modelFilter').value;
    const container = document.getElementById('rankingsContainer');
    
    container.innerHTML = '<div class="loading">Loading rankings...</div>';
    
    try {
        let url = `${API_CONFIG.baseUrl}/rankings/${date}`;
        const params = new URLSearchParams();
        if (positionType) params.append('position_type', positionType);
        if (model) params.append('model', model);
        
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load rankings');
        
        const rankings = await response.json();
        currentRankings = rankings;
        
        displayRankings(rankings);
        updateCharacteristicsChart(rankings);
    } catch (error) {
        console.error('Error loading rankings:', error);
        container.innerHTML = '<div class="error">Failed to load rankings. Please try again.</div>';
    }
}

// Display rankings in UI
function displayRankings(rankings) {
    const container = document.getElementById('rankingsContainer');
    
    if (rankings.length === 0) {
        container.innerHTML = '<div class="no-data">No rankings available for this date.</div>';
        return;
    }
    
    container.innerHTML = rankings.map(ranking => `
        <div class="ranking-card">
            <div class="ranking-header" onclick="toggleCharacteristics('${ranking.ticker}')">
                <div class="rank-info">
                    <div class="rank-number">#${ranking.rank}</div>
                    <div class="ticker-symbol">${ranking.ticker}</div>
                    <div class="confidence-score">Confidence: ${(ranking.confidence_score * 100).toFixed(0)}%</div>
                    ${ranking.confidence_scores && ranking.confidence_scores.signals ? `
                        <div class="signal-indicator" title="Signal Score: ${(ranking.confidence_scores.signals * 100).toFixed(0)}%">
                            📊 ${(ranking.confidence_scores.signals * 100).toFixed(0)}%
                        </div>
                    ` : ''}
                    <div class="expand-indicator" id="expand-${ranking.ticker}">▼</div>
                </div>
                <div class="price-info">
                    ${ranking.returns ? `
                        <div class="return ${ranking.returns['1d'] >= 0 ? 'positive-return' : 'negative-return'}">
                            1D: ${ranking.returns['1d'] >= 0 ? '+' : ''}${ranking.returns['1d']}%
                        </div>
                        ${ranking.returns['7d'] !== null ? `
                            <div class="return ${ranking.returns['7d'] >= 0 ? 'positive-return' : 'negative-return'}">
                                7D: ${ranking.returns['7d'] >= 0 ? '+' : ''}${ranking.returns['7d']}%
                            </div>
                        ` : ''}
                    ` : ''}
                    <button class="feedback-button" onclick="openFeedbackModal('${ranking.ticker}', event)">
                        Feedback
                    </button>
                </div>
            </div>
            <div class="characteristics" id="chars-${ranking.ticker}" style="display: none;">
                <h4>Individual Characteristics:</h4>
                ${ranking.characteristics.map((char, idx) => {
                    const charId = `char_${ranking.ticker}_${idx}`;
                    const hasComponents = char.signal_type || char.components;
                    const isExpandable = hasComponents || char.text.length > 50;
                    
                    return `
                        <div class="characteristic-item ${isExpandable ? 'expandable' : ''}" id="${charId}">
                            <div class="char-main-content">
                                <div class="char-header" ${isExpandable ? `onclick="toggleCharacteristicDetail('${charId}')"` : ''}>
                                    <span class="char-text">${char.text.split(' - ')[0]}</span>
                                    <div class="char-meta">
                                        <span class="char-confidence">${(char.confidence * 100).toFixed(0)}%</span>
                                        ${isExpandable ? `<span class="expand-icon" id="expand_${charId}">▶</span>` : ''}
                                    </div>
                                </div>
                                
                                <div class="char-detail" id="detail_${charId}" style="display: none;">
                                    ${char.text.split(' - ')[1] ? `<p class="char-explanation">${char.text.split(' - ')[1]}</p>` : ''}
                                    ${hasComponents ? renderSignalComponents(char.components) : ''}
                                    
                                    <div class="char-feedback">
                                        <label>How accurate is this analysis?</label>
                                        <div class="feedback-controls">
                                            <span class="slider-label">Disagree</span>
                                            <input type="range" 
                                                   class="feedback-slider" 
                                                   id="slider_${charId}" 
                                                   min="0" 
                                                   max="100" 
                                                   value="50"
                                                   oninput="updateCharSliderValue('${charId}', this.value)">
                                            <span class="slider-label">Agree</span>
                                            <span class="slider-value" id="slider_value_${charId}">50%</span>
                                        </div>
                                        <button class="submit-char-feedback-btn" onclick="submitCharFeedback('${ranking.ticker}', ${idx}, '${charId}')">
                                            Submit Feedback
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
                ${ranking.confidence_scores && ranking.confidence_scores.signals ? `
                    <div class="signal-details">
                        <h4>Signal Components:</h4>
                        <div class="signal-breakdown">
                            <div class="signal-component">
                                <span>Newsletter Score:</span>
                                <span class="signal-value">${(ranking.confidence_scores.newsletter * 100).toFixed(0)}%</span>
                            </div>
                            <div class="signal-component">
                                <span>Signal Score:</span>
                                <span class="signal-value">${(ranking.confidence_scores.signals * 100).toFixed(0)}%</span>
                            </div>
                            <div class="signal-component">
                                <span>Combined Score:</span>
                                <span class="signal-value">${(ranking.confidence_scores.overall * 100).toFixed(0)}%</span>
                            </div>
                        </div>
                        <button class="btn-secondary btn-small" onclick="loadSignalDetails('${ranking.ticker}', event)">
                            View Signal Details
                        </button>
                    </div>
                ` : ''}
                ${getStockSpecificCharacteristics(ranking.ticker, ranking.position_type)}
            </div>
        </div>
    `).join('');
}

// Toggle characteristics dropdown
function toggleCharacteristics(ticker) {
    const charsDiv = document.getElementById(`chars-${ticker}`);
    const expandIndicator = document.getElementById(`expand-${ticker}`);
    
    if (charsDiv) {
        const isVisible = charsDiv.style.display !== 'none';
        charsDiv.style.display = isVisible ? 'none' : 'block';
        expandIndicator.textContent = isVisible ? '▼' : '▲';
        
        // Close other open dropdowns
        document.querySelectorAll('.characteristics').forEach(div => {
            if (div.id !== `chars-${ticker}`) {
                div.style.display = 'none';
                const otherId = div.id.replace('chars-', '');
                const otherIndicator = document.getElementById(`expand-${otherId}`);
                if (otherIndicator) otherIndicator.textContent = '▼';
            }
        });
    }
}

// Get stock-specific characteristics
function getStockSpecificCharacteristics(ticker, positionType) {
    // Mock data for individual stock characteristics with detailed explanations
    const stockChars = {
        'PLTR': [
            { 
                id: 'pltr-1',
                text: 'Strong AI/ML market position', 
                confidence: 0.85,
                tooltip: 'Palantir leads in enterprise AI solutions with unique data integration capabilities',
                details: 'Palantir has established itself as a leader in AI/ML for enterprise and government sectors. Their Foundry and Gotham platforms provide unique capabilities for data integration, analysis, and decision-making that competitors struggle to replicate. Recent commercial growth of 27% YoY demonstrates market acceptance.'
            },
            { 
                id: 'pltr-2',
                text: 'Government contract growth', 
                confidence: 0.78,
                tooltip: 'Expanding defense and intelligence contracts with stable revenue streams',
                details: 'Government revenue remains strong with multiple long-term contracts. Recent wins include a $463M U.S. Army contract and expanded work with NHS in the UK. Government contracts provide stable, high-margin revenue with 30%+ operating margins.'
            },
            { 
                id: 'pltr-3',
                text: 'High R&D investment', 
                confidence: 0.82,
                tooltip: 'Significant investment in product development maintaining competitive edge',
                details: 'Palantir invests over 20% of revenue in R&D, focusing on AI capabilities, user experience, and platform scalability. This high investment rate ensures continued product leadership and creates barriers to entry for competitors.'
            }
        ],
        'META': [
            { 
                id: 'meta-1',
                text: 'Metaverse leadership potential', 
                confidence: 0.75,
                tooltip: 'Leading position in VR/AR technology and metaverse development',
                details: 'Meta\'s Reality Labs has invested over $50B in metaverse technologies. Quest headsets dominate consumer VR market with 75%+ share. While current losses are significant, the long-term potential for new computing platforms remains substantial.'
            },
            { 
                id: 'meta-2',
                text: 'Strong advertising revenue', 
                confidence: 0.88,
                tooltip: 'Dominant position in digital advertising with growing AI-driven targeting',
                details: 'Meta\'s advertising business generated $135B in 2023 with 25% YoY growth. AI-driven ad optimization has improved ROI for advertisers by 20%+. Instagram Reels monetization is accelerating, approaching Facebook News Feed efficiency.'
            },
            { 
                id: 'meta-3',
                text: 'User engagement growth', 
                confidence: 0.80,
                tooltip: 'Increasing daily active users and time spent across platforms',
                details: 'DAUs across Meta\'s family of apps reached 3.24B, up 6% YoY. Time spent on Instagram increased 24% driven by Reels. WhatsApp business messaging growing 40%+ annually, creating new monetization opportunities.'
            }
        ],
        'CASY': [
            { 
                id: 'casy-1',
                text: 'Consistent store expansion', 
                confidence: 0.82,
                tooltip: 'Steady growth in store count with strong unit economics',
                details: 'Casey\'s adds 50-80 stores annually with proven small-town market strategy. New stores achieve profitability within 12-18 months. Same-store sales growth of 7%+ demonstrates successful expansion without cannibalizing existing locations.'
            },
            { 
                id: 'casy-2',
                text: 'Strong rural market presence', 
                confidence: 0.85,
                tooltip: 'Dominant position in underserved rural markets with limited competition',
                details: 'Casey\'s operates in towns with populations under 20,000 where competition is limited. 60%+ market share in many rural communities creates pricing power. Acts as essential service provider in communities overlooked by larger chains.'
            },
            { 
                id: 'casy-3',
                text: 'Defensive consumer staples', 
                confidence: 0.79,
                tooltip: 'Recession-resistant business model focused on essential goods',
                details: 'Fuel and prepared food represent necessities with consistent demand. Private label penetration at 11% provides margin expansion opportunity. Pizza program generates 40%+ gross margins, significantly higher than fuel.'
            }
        ],
        'LLY': [
            { 
                id: 'lly-1',
                text: 'Leading diabetes treatments', 
                confidence: 0.90,
                tooltip: 'Market-leading GLP-1 drugs with strong pricing power',
                details: 'Mounjaro and Trulicity generated $18B+ in 2023 revenue. GLP-1 market expected to reach $100B+ by 2030. Lilly\'s manufacturing capacity investments position them to capture 40%+ market share in rapidly growing diabetes/obesity market.'
            },
            { 
                id: 'lly-2',
                text: 'Strong drug pipeline', 
                confidence: 0.85,
                tooltip: 'Robust late-stage pipeline with multiple potential blockbusters',
                details: 'Pipeline includes 20+ Phase 3 assets across oncology, immunology, and neuroscience. Alzheimer\'s drug donanemab shows promise with FDA approval expected. R&D productivity improving with 5 new drug approvals in last 2 years.'
            },
            { 
                id: 'lly-3',
                text: 'Obesity drug market growth', 
                confidence: 0.88,
                tooltip: 'Zepbound positioned to capture significant share of obesity treatment market',
                details: 'Zepbound (tirzepatide) shows superior weight loss vs competitors with 22.5% average reduction. Total addressable market of 100M+ patients in US alone. Insurance coverage expanding rapidly with 50%+ of commercial lives now covered.'
            }
        ],
        'FANG': [
            { 
                id: 'fang-1',
                text: 'Oil price sensitivity', 
                confidence: 0.82,
                tooltip: 'High correlation with oil prices providing leverage to energy markets',
                details: 'Diamondback\'s low breakeven price of $35-40/barrel provides profitability across cycles. Generates free cash flow at $50+ oil prices. Variable dividend policy returns 50%+ of FCF to shareholders when oil prices are elevated.'
            },
            { 
                id: 'fang-2',
                text: 'Strong Permian Basin assets', 
                confidence: 0.86,
                tooltip: 'Premium acreage in the most economic US shale basin',
                details: 'Controls 500,000+ net acres in Midland and Delaware basins. Well productivity 20%+ above Permian average. Inventory of 15+ years of premium drilling locations at current activity levels. Infrastructure ownership reduces operating costs.'
            },
            { 
                id: 'fang-3',
                text: 'Capital discipline focus', 
                confidence: 0.78,
                tooltip: 'Management commitment to returning cash to shareholders',
                details: 'Maintenance capex of only $2.5B annually at 450k boe/d production. Return of capital framework targets 75%+ of FCF to shareholders. Track record of meeting guidance and avoiding growth-for-growth\'s-sake mentality common in sector.'
            }
        ]
    };
    
    const chars = stockChars[ticker] || [
        { 
            id: 'default-1',
            text: 'Sector momentum positive', 
            confidence: 0.75,
            tooltip: 'Industry trends supporting growth',
            details: 'The sector shows positive momentum with favorable industry dynamics and improving fundamentals.'
        },
        { 
            id: 'default-2',
            text: 'Technical indicators favorable', 
            confidence: 0.72,
            tooltip: 'Chart patterns suggest continued strength',
            details: 'Technical analysis indicates positive trend continuation with strong support levels and bullish momentum indicators.'
        }
    ];
    
    return `
        <div class="stock-specific-chars">
            <h5>
                Stock-Specific Analysis
                <span class="info-icon" title="AI-powered analysis of key factors driving this stock's ranking">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <circle cx="8" cy="8" r="7" stroke="currentColor" fill="none" stroke-width="1"/>
                        <text x="8" y="12" text-anchor="middle" font-size="10" font-weight="bold">i</text>
                    </svg>
                </span>
            </h5>
            ${chars.map((char, index) => `
                <div class="analysis-item" id="analysis-${char.id}">
                    <div class="analysis-header">
                        <div class="analysis-text">
                            <span>${char.text}</span>
                            <span class="tooltip-icon" title="${char.tooltip}">
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                    <circle cx="8" cy="8" r="6" stroke="currentColor" fill="none" stroke-width="1" opacity="0.5"/>
                                    <text x="8" y="11" text-anchor="middle" font-size="8">i</text>
                                </svg>
                            </span>
                        </div>
                        <div class="analysis-actions">
                            <span class="char-confidence">${(char.confidence * 100).toFixed(0)}%</span>
                            <button class="expand-btn" onclick="toggleAnalysisDetail('${char.id}')">
                                <span id="expand-icon-${char.id}">+</span>
                            </button>
                        </div>
                    </div>
                    <div class="analysis-detail" id="detail-${char.id}" style="display: none;">
                        <p class="detail-text">${char.details}</p>
                        <div class="analysis-feedback">
                            <label>How accurate is this analysis?</label>
                            <div class="slider-container">
                                <span class="slider-label">Disagree</span>
                                <input type="range" 
                                       class="feedback-slider" 
                                       id="slider-${char.id}" 
                                       min="0" 
                                       max="100" 
                                       value="50"
                                       oninput="updateSliderValue('${char.id}', this.value)">
                                <span class="slider-label">Agree</span>
                                <span class="slider-value" id="slider-value-${char.id}">50%</span>
                            </div>
                            <textarea 
                                class="feedback-text" 
                                id="feedback-${char.id}"
                                placeholder="Additional thoughts on this analysis (optional)"
                                rows="2"></textarea>
                            <button class="submit-feedback-btn" onclick="submitAnalysisFeedback('${ticker}', '${char.id}', '${char.text}')">
                                Submit Feedback
                            </button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Update characteristics chart
function updateCharacteristicsChart(rankings) {
    // Aggregate all characteristics
    const charCounts = {};
    
    rankings.forEach(ranking => {
        ranking.characteristics.forEach(char => {
            const text = char.text.toLowerCase();
            charCounts[text] = (charCounts[text] || 0) + 1;
        });
    });
    
    // Sort and get top 10
    const sortedChars = Object.entries(charCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    // Update chart
    const ctx = document.getElementById('charChart').getContext('2d');
    
    if (characteristicsChart) {
        characteristicsChart.destroy();
    }
    
    characteristicsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedChars.map(([char, _]) => {
                // Truncate long labels for display
                if (char.length > 30) {
                    return char.substring(0, 30) + '...';
                }
                return char;
            }),
            datasets: [{
                label: 'Frequency',
                data: sortedChars.map(([_, count]) => count),
                backgroundColor: '#d4af37',
                borderColor: '#d4af37',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            // Show full text in tooltip
                            const index = context[0].dataIndex;
                            return sortedChars[index][0];
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#b8b8b8',
                        maxRotation: 90,
                        minRotation: 45,
                        autoSkip: false,
                        callback: function(value, index) {
                            // For x-axis labels, show truncated version
                            const label = this.getLabelForValue(value);
                            return label.length > 20 ? label.substring(0, 20) + '...' : label;
                        }
                    },
                    grid: {
                        color: '#2a2a2a'
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#2a2a2a'
                    },
                    ticks: {
                        color: '#b8b8b8'
                        display: false
                    },
                    ticks: {
                        color: '#b8b8b8',
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
}

// Load performance metrics
async function loadPerformance(period) {
    const model = document.getElementById('modelFilter').value;
    
    try {
        let url = `${API_CONFIG.baseUrl}/performance/${period}`;
        if (model && model !== 'all') {
            url += `?model=${model}`;
        }
        
        const response = await fetch(url);
        const performance = await response.json();
        
        document.getElementById('accuracyMetric').textContent = 
            `${(performance.accuracy * 100).toFixed(1)}%`;
        document.getElementById('sharpeMetric').textContent = 
            performance.sharpe_ratio.toFixed(2);
        document.getElementById('precisionMetric').textContent = 
            `${(performance.precision * 100).toFixed(1)}%`;
    } catch (error) {
        console.error('Error loading performance:', error);
        document.querySelectorAll('.metric-value').forEach(el => {
            el.textContent = 'N/A';
        });
    }
}

// Feedback Modal Functions
function openFeedbackModal(ticker, event) {
    event.stopPropagation();
    selectedTicker = ticker;
    
    document.getElementById('feedbackTicker').textContent = ticker;
    
    // Get characteristics for this ticker
    const ranking = currentRankings.find(r => r.ticker === ticker);
    if (ranking) {
        const charsList = document.getElementById('characteristicsList');
        charsList.innerHTML = ranking.characteristics.map((char, idx) => `
            <div class="char-rating">
                <span>${char.text}</span>
                <div class="char-rating-buttons">
                    <button class="thumb-btn positive" onclick="rateCharacteristic(${idx}, 'positive')">👍</button>
                    <button class="thumb-btn negative" onclick="rateCharacteristic(${idx}, 'negative')">👎</button>
                </div>
            </div>
        `).join('');
    }
    
    document.getElementById('feedbackModal').style.display = 'block';
}

function closeFeedbackModal() {
    document.getElementById('feedbackModal').style.display = 'none';
    selectedTicker = null;
    
    // Reset form
    document.querySelectorAll('.feedback-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('feedbackText').value = '';
}

// Handle feedback button clicks
document.querySelectorAll('.feedback-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.feedback-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
    });
});

// Rate individual characteristic
let characteristicRatings = {};

function rateCharacteristic(idx, rating) {
    characteristicRatings[idx] = rating;
    
    // Update UI
    const buttons = document.querySelectorAll('.char-rating')[idx].querySelectorAll('.thumb-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    if (rating === 'positive') {
        buttons[0].classList.add('active');
    } else {
        buttons[1].classList.add('active');
    }
}

// Submit feedback
async function submitFeedback() {
    const activeBtn = document.querySelector('.feedback-btn.active');
    const feedbackType = activeBtn ? activeBtn.dataset.type : 'general';
    const content = document.getElementById('feedbackText').value;
    
    // Build characteristic feedback
    const ranking = currentRankings.find(r => r.ticker === selectedTicker);
    const charFeedback = {};
    
    if (ranking) {
        Object.entries(characteristicRatings).forEach(([idx, rating]) => {
            const char = ranking.characteristics[parseInt(idx)];
            if (char) {
                charFeedback[char.text.toLowerCase()] = rating;
            }
        });
    }
    
    const feedbackData = {
        feedback_type: feedbackType,
        content: content,
        characteristic_feedback: charFeedback
    };
    
    try {
        const response = await fetch(`${API_CONFIG.baseUrl}/feedback/${selectedTicker}`, {
            method: 'POST',
            headers: API_CONFIG.headers,
            body: JSON.stringify(feedbackData)
        });
        
        if (response.ok) {
            alert('Thank you for your feedback!');
            closeFeedbackModal();
            characteristicRatings = {};
        } else {
            alert('Error submitting feedback. Please try again.');
        }
    } catch (error) {
        console.error('Error submitting feedback:', error);
        alert('Error submitting feedback. Please try again.');
    }
}

// Show model configuration
function showModelConfig() {
    window.open(`${API_CONFIG.baseUrl}/admin/models`, '_blank');
}

// Show about information
function showAbout() {
    alert('AI Stock Rankings uses multiple AI models to analyze and rank stocks based on consensus characteristics. The system learns from user feedback to improve predictions over time.');
}

// Load signal details for a ticker
async function loadSignalDetails(ticker, event) {
    if (event) {
        event.stopPropagation();
    }
    
    try {
        // Get signal summary
        const response = await fetch(`${API_CONFIG.baseUrl}/signals/${ticker}/summary?days=30`);
        if (!response.ok) throw new Error('Failed to load signal details');
        
        const summary = await response.json();
        
        // Create modal content
        const modalContent = `
            <div class="signal-modal">
                <h3>${ticker} - Signal Analysis</h3>
                <div class="signal-summary">
                    ${summary.signals.gain_loss ? `
                        <div class="signal-section">
                            <h4>Gain/Loss Probability</h4>
                            <p>Average Gain: ${summary.signals.gain_loss.avg_gain.toFixed(1)}%</p>
                            <p>Average Loss: ${summary.signals.gain_loss.avg_loss.toFixed(1)}%</p>
                            <p>Latest Gain: ${summary.signals.gain_loss.latest_gain.toFixed(1)}%</p>
                            <p>Latest Loss: ${summary.signals.gain_loss.latest_loss.toFixed(1)}%</p>
                            <p>Data Points: ${summary.signals.gain_loss.data_points}</p>
                        </div>
                    ` : ''}
                    ${summary.signals.net_options ? `
                        <div class="signal-section">
                            <h4>Net Options Sentiment</h4>
                            <p>Average Sentiment: ${summary.signals.net_options.avg_sentiment.toFixed(1)}</p>
                            <p>Latest Sentiment: ${summary.signals.net_options.latest_sentiment.toFixed(1)}</p>
                            <p>Trend: ${summary.signals.net_options.sentiment_trend}</p>
                            <p>Data Points: ${summary.signals.net_options.data_points}</p>
                        </div>
                    ` : ''}
                    ${summary.signals.upside_downside ? `
                        <div class="signal-section">
                            <h4>Upside/Downside Potential</h4>
                            <p>Average Gain: ${summary.signals.upside_downside.avg_gain.toFixed(1)}%</p>
                            <p>Average Loss: ${summary.signals.upside_downside.avg_loss.toFixed(1)}%</p>
                            <p>Latest Gain: ${summary.signals.upside_downside.latest_gain.toFixed(1)}%</p>
                            <p>Latest Loss: ${summary.signals.upside_downside.latest_loss.toFixed(1)}%</p>
                            <p>Data Points: ${summary.signals.upside_downside.data_points}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        // Show in a simple alert for now (you can enhance this with a proper modal)
        const signalWindow = window.open('', 'Signal Details', 'width=600,height=400');
        signalWindow.document.write(`
            <html>
            <head>
                <title>${ticker} Signal Details</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .signal-section { margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 5px; }
                    h3 { color: #333; }
                    h4 { color: #666; margin-top: 0; }
                    p { margin: 5px 0; }
                </style>
            </head>
            <body>${modalContent}</body>
            </html>
        `);
        
    } catch (error) {
        console.error('Error loading signal details:', error);
        alert('Failed to load signal details. Please try again.');
    }
}

// Update year filter
function updateYearFilter() {
    // Reload rankings and positions with new year
    loadRankings();
    loadPositions(currentPositionType);
    loadPositionsSummary();
}

// Update model filter
function updateModelFilter() {
    const selectedModel = document.getElementById('modelFilter').value;
    // Reload rankings and performance based on selected model
    loadRankings();
    loadPerformance('7d');
    updateCharacteristicsChart(currentRankings);
}

// Open stock modal
async function openStockModal(ticker, event) {
    if (event) {
        event.stopPropagation();
    }
    
    const stockModal = document.getElementById('stockModal');
    const ranking = currentRankings.find(r => r.ticker === ticker);
    
    if (!ranking) return;
    
    document.getElementById('stockTicker').textContent = ticker;
    
    // Show overview tab by default
    showStockTab('overview');
    
    // Load stock overview
    const overviewHtml = `
        <div class="stock-info-grid">
            <div class="info-item">
                <label>Rank:</label>
                <span>#${ranking.rank}</span>
            </div>
            <div class="info-item">
                <label>Position Type:</label>
                <span>${ranking.position_type}</span>
            </div>
            <div class="info-item">
                <label>Confidence Score:</label>
                <span>${(ranking.confidence_score * 100).toFixed(0)}%</span>
            </div>
            ${ranking.characteristics.map(char => {
                if (char.text.includes('Return:')) {
                    return `<div class="info-item">
                        <label>Return:</label>
                        <span class="${char.text.includes('-') ? 'negative-return' : 'positive-return'}">${char.text.split('Return:')[1]}</span>
                    </div>`;
                }
                if (char.text.includes('Sector:')) {
                    return `<div class="info-item">
                        <label>Sector:</label>
                        <span>${char.text.split('Sector:')[1]}</span>
                    </div>`;
                }
                return '';
            }).join('')}
        </div>
    `;
    document.getElementById('stockOverview').innerHTML = overviewHtml;
    
    // Load characteristics
    loadStockCharacteristics(ticker, ranking);
    
    // Load model analysis
    loadModelAnalysis(ticker);
    
    stockModal.style.display = 'block';
}

// Close stock modal
function closeStockModal() {
    document.getElementById('stockModal').style.display = 'none';
}

// Show stock tab
function showStockTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.stock-details-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}-tab`).classList.add('active');
    event.target.classList.add('active');
}

// Load stock characteristics
function loadStockCharacteristics(ticker, ranking) {
    const charsContainer = document.getElementById('stockCharacteristics');
    
    // Separate signal characteristics from others
    const signalChars = ranking.characteristics.filter(char => 
        char.signal_type || char.text.includes('Signal') || 
        char.text.includes('Gain/Loss') || char.text.includes('Options') || 
        char.text.includes('Upside/Downside')
    );
    const otherChars = ranking.characteristics.filter(char => 
        !char.signal_type && !char.text.includes('Signal') && 
        !char.text.includes('Gain/Loss') && !char.text.includes('Options') && 
        !char.text.includes('Upside/Downside')
    );
    
    // Display characteristics with enhanced signal details
    const charsHtml = `
        ${otherChars.length > 0 ? `
            <div class="char-section">
                <h5>Newsletter Analysis</h5>
                ${otherChars.map(char => `
                    <div class="stock-characteristic">
                        <span>${char.text}</span>
                        <span class="char-confidence">${(char.confidence * 100).toFixed(0)}%</span>
                    </div>
                `).join('')}
            </div>
        ` : ''}
        ${signalChars.length > 0 ? `
            <div class="char-section signal-section">
                <h5>Quantitative Signals</h5>
                ${signalChars.map(char => {
                    // Check if this is a detailed signal characteristic
                    if (char.components) {
                        return `
                            <div class="signal-characteristic expandable" onclick="toggleSignalDetail('${char.signal_type || 'signal'}_${ticker}')">
                                <div class="signal-header">
                                    <span>${char.text.split(' - ')[0]}</span>
                                    <div class="signal-meta">
                                        <span class="char-confidence">${(char.confidence * 100).toFixed(0)}%</span>
                                        <span class="expand-icon" id="expand_${char.signal_type || 'signal'}_${ticker}">▼</span>
                                    </div>
                                </div>
                                <div class="signal-detail" id="detail_${char.signal_type || 'signal'}_${ticker}" style="display: none;">
                                    <p class="signal-explanation">${char.text.split(' - ')[1] || ''}</p>
                                    ${char.components ? renderSignalComponents(char.components) : ''}
                                </div>
                            </div>
                        `;
                    } else {
                        return `
                            <div class="stock-characteristic">
                                <span>${char.text}</span>
                                <span class="char-confidence">${(char.confidence * 100).toFixed(0)}%</span>
                            </div>
                        `;
                    }
                }).join('')}
            </div>
        ` : ''}
        ${ranking.confidence_scores && ranking.confidence_scores.signal_components ? `
            <div class="char-section">
                <h5>Signal Score Breakdown</h5>
                <div class="signal-scores-grid">
                    <div class="score-item">
                        <label>Gain/Loss:</label>
                        <div class="score-bar">
                            <div class="score-fill" style="width: ${ranking.confidence_scores.signal_components.gain_loss * 100}%"></div>
                            <span class="score-value">${(ranking.confidence_scores.signal_components.gain_loss * 100).toFixed(0)}%</span>
                        </div>
                    </div>
                    <div class="score-item">
                        <label>Net Options:</label>
                        <div class="score-bar">
                            <div class="score-fill" style="width: ${ranking.confidence_scores.signal_components.net_options * 100}%"></div>
                            <span class="score-value">${(ranking.confidence_scores.signal_components.net_options * 100).toFixed(0)}%</span>
                        </div>
                    </div>
                    <div class="score-item">
                        <label>Upside/Downside:</label>
                        <div class="score-bar">
                            <div class="score-fill" style="width: ${ranking.confidence_scores.signal_components.upside_downside * 100}%"></div>
                            <span class="score-value">${(ranking.confidence_scores.signal_components.upside_downside * 100).toFixed(0)}%</span>
                        </div>
                    </div>
                </div>
            </div>
        ` : ''}
    `;
    
    charsContainer.innerHTML = charsHtml;
    
    // Create characteristics chart for this specific stock
    const ctx = document.getElementById('stockCharChart').getContext('2d');
    
    // Destroy existing chart if any
    if (window.stockCharChart) {
        window.stockCharChart.destroy();
    }
    
    window.stockCharChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ranking.characteristics.map(c => c.text.split(':')[0]),
            datasets: [{
                label: 'Confidence',
                data: ranking.characteristics.map(c => c.confidence * 100),
                backgroundColor: 'rgba(212, 175, 55, 0.2)',
                borderColor: '#d4af37',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        color: '#b8b8b8'
                    },
                    grid: {
                        color: '#2a2a2a'
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

// Load model analysis
async function loadModelAnalysis(ticker) {
    const container = document.getElementById('modelAnalysis');
    const selectedModel = document.getElementById('modelFilter').value;
    
    // For now, show mock data - this would connect to real model analysis endpoint
    const mockAnalysis = {
        'gpt-4': {
            rank: 3,
            confidence: 0.85,
            reasoning: 'Strong technical indicators and positive sector momentum'
        },
        'claude-3': {
            rank: 2,
            confidence: 0.78,
            reasoning: 'Favorable market conditions and solid fundamentals'
        },
        'finbert': {
            rank: 5,
            confidence: 0.72,
            reasoning: 'Positive sentiment in recent news and analyst reports'
        }
    };
    
    let analysisHtml = '';
    
    if (selectedModel === 'all') {
        // Show all model analyses
        for (const [model, analysis] of Object.entries(mockAnalysis)) {
            analysisHtml += `
                <div class="model-analysis-item">
                    <h5>${model.toUpperCase()}</h5>
                    <div class="info-item">
                        <label>Rank:</label>
                        <span>#${analysis.rank}</span>
                    </div>
                    <div class="info-item">
                        <label>Confidence:</label>
                        <span>${(analysis.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <div class="info-item">
                        <label>Reasoning:</label>
                        <span>${analysis.reasoning}</span>
                    </div>
                </div>
            `;
        }
    } else {
        // Show specific model analysis
        const analysis = mockAnalysis[selectedModel];
        if (analysis) {
            analysisHtml = `
                <div class="model-analysis-item">
                    <div class="info-item">
                        <label>Rank by ${selectedModel}:</label>
                        <span>#${analysis.rank}</span>
                    </div>
                    <div class="info-item">
                        <label>Confidence:</label>
                        <span>${(analysis.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <div class="info-item">
                        <label>Reasoning:</label>
                        <span>${analysis.reasoning}</span>
                    </div>
                </div>
            `;
        }
    }
    
    container.innerHTML = analysisHtml;
}

// Toggle analysis detail
function toggleAnalysisDetail(analysisId) {
    const detailDiv = document.getElementById(`detail-${analysisId}`);
    const expandIcon = document.getElementById(`expand-icon-${analysisId}`);
    
    if (detailDiv) {
        const isVisible = detailDiv.style.display !== 'none';
        detailDiv.style.display = isVisible ? 'none' : 'block';
        expandIcon.textContent = isVisible ? '+' : '−';
    }
}

// Update slider value display
function updateSliderValue(analysisId, value) {
    const valueDisplay = document.getElementById(`slider-value-${analysisId}`);
    if (valueDisplay) {
        valueDisplay.textContent = `${value}%`;
    }
}

// Submit analysis feedback
async function submitAnalysisFeedback(ticker, analysisId, analysisText) {
    const slider = document.getElementById(`slider-${analysisId}`);
    const feedbackText = document.getElementById(`feedback-${analysisId}`);
    
    const feedbackData = {
        ticker: ticker,
        analysis_id: analysisId,
        analysis_text: analysisText,
        agreement_score: parseInt(slider.value),
        feedback_text: feedbackText.value
    };
    
    try {
        // In production, this would send to the backend
        console.log('Submitting feedback:', feedbackData);
        
        // Show success feedback
        const button = event.target;
        const originalText = button.textContent;
        button.textContent = '✓ Feedback Sent';
        button.style.background = 'var(--accent-green)';
        button.style.color = 'var(--bg-primary)';
        
        // Reset after 2 seconds
        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '';
            button.style.color = '';
            // Reset form
            slider.value = 50;
            updateSliderValue(analysisId, 50);
            feedbackText.value = '';
        }, 2000);
        
    } catch (error) {
        console.error('Error submitting feedback:', error);
        alert('Failed to submit feedback. Please try again.');
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const feedbackModal = document.getElementById('feedbackModal');
    const uploadModal = document.getElementById('uploadModal');
    const stockModal = document.getElementById('stockModal');
    
    if (event.target === feedbackModal) {
        closeFeedbackModal();
    } else if (event.target === uploadModal) {
        closeUploadModal();
    } else if (event.target === stockModal) {
        closeStockModal();
    }
}

// CSV Upload Functions
function showUploadModal() {
    document.getElementById('uploadModal').style.display = 'block';
}

function closeUploadModal() {
    document.getElementById('uploadModal').style.display = 'none';
    document.getElementById('uploadStatus').className = 'upload-status';
    document.getElementById('uploadStatus').innerHTML = '';
}

async function uploadCSVFiles() {
    const longFile = document.getElementById('longFile').files[0];
    const shortFile = document.getElementById('shortFile').files[0];
    const statusDiv = document.getElementById('uploadStatus');
    
    if (!longFile || !shortFile) {
        statusDiv.className = 'upload-status error';
        statusDiv.innerHTML = 'Please select both CSV files';
        return;
    }
    
    const formData = new FormData();
    formData.append('long_file', longFile);
    formData.append('short_file', shortFile);
    
    statusDiv.className = 'upload-status';
    statusDiv.innerHTML = 'Uploading files...';
    
    try {
        const response = await fetch(`${API_CONFIG.baseUrl}/upload/csv`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            statusDiv.className = 'upload-status success';
            statusDiv.innerHTML = `
                <strong>Upload successful!</strong><br>
                Long positions: ${result.long_count}<br>
                Short positions: ${result.short_count}<br>
                <small>Top tickers: ${result.active_positions.long.slice(0, 5).join(', ')}...</small>
            `;
            
            // Reload positions and rankings
            loadPositions(currentPositionType);
            loadPositionsSummary();
            loadRankings();
            
            // Close modal after 3 seconds
            setTimeout(() => {
                closeUploadModal();
            }, 3000);
        } else {
            const error = await response.json();
            statusDiv.className = 'upload-status error';
            statusDiv.innerHTML = 'Upload failed: ' + error.detail;
        }
    } catch (error) {
        statusDiv.className = 'upload-status error';
        statusDiv.innerHTML = 'Upload failed: ' + error.message;
    }
}

// Position viewing functions
function showPositions(type) {
    currentPositionType = type;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    loadPositions(type);
}

async function loadPositions(type) {
    const container = document.getElementById('positionsContainer');
    container.innerHTML = '<div class="loading">Loading positions...</div>';
    
    const year = document.getElementById('yearFilter').value;
    
    try {
        let url = `${API_CONFIG.baseUrl}/positions/${type}`;
        if (year) {
            url += `?year=${year}`;
        }
        
        const response = await fetch(url);
        if (response.ok) {
            const positions = await response.json();
            displayPositions(positions);
        } else {
            container.innerHTML = '<div class="error">Failed to load positions</div>';
        }
    } catch (error) {
        container.innerHTML = '<div class="error">No positions uploaded yet. Please upload CSV files.</div>';
    }
}

function displayPositions(positions) {
    const container = document.getElementById('positionsContainer');
    
    if (positions.length === 0) {
        container.innerHTML = '<div class="no-data">No positions found. Please upload CSV files.</div>';
        return;
    }
    
    container.innerHTML = positions.map((pos, index) => `
        <div class="position-card">
            <div class="rank-number">#${index + 1}</div>
            <div class="position-ticker">${pos.ticker}</div>
            <div class="position-details">
                <span><strong>${pos.sector}</strong></span>
                <span>${pos.market_cap}</span>
                <span>Entry: $${pos.entry_price.toFixed(2)}</span>
                <span>Current: $${pos.live_price.toFixed(2)}</span>
                <span>vs SPY: ${pos.spy_benchmark >= 0 ? '+' : ''}${pos.spy_benchmark.toFixed(2)}%</span>
            </div>
            <div class="position-return ${pos.return_pct >= 0 ? 'positive-return' : 'negative-return'}">
                ${pos.return_pct >= 0 ? '+' : ''}${pos.return_pct.toFixed(2)}%
            </div>
        </div>
    `).join('');
}

async function loadPositionsSummary() {
    const year = document.getElementById('yearFilter').value;
    
    try {
        let url = `${API_CONFIG.baseUrl}/positions/summary`;
        if (year) {
            url += `?year=${year}`;
        }
        
        const response = await fetch(url);
        if (response.ok) {
            const summary = await response.json();
            console.log('Positions summary:', summary);
            // Could display this in a summary card if needed
        }
    } catch (error) {
        console.error('Error loading positions summary:', error);
    }
}

// Helper function to render signal components
function renderSignalComponents(components) {
    if (!components) return '';
    
    let html = '<div class="signal-components">';
    
    // Handle different component types
    if (components.gain_probability !== undefined) {
        // Gain/Loss signal
        html += `
            <div class="component-item">
                <span>Gain Probability:</span>
                <span class="component-value">${(components.gain_probability * 100).toFixed(1)}%</span>
            </div>
            <div class="component-item">
                <span>Loss Probability:</span>
                <span class="component-value">${(components.loss_probability * 100).toFixed(1)}%</span>
            </div>
        `;
    }
    
    if (components.sentiment_score !== undefined) {
        // Net Options signal
        html += `
            <div class="component-item">
                <span>Sentiment Score:</span>
                <span class="component-value">${components.sentiment_score}/100</span>
            </div>
            <div class="component-item">
                <span>Trend:</span>
                <span class="component-value">${components.trend}</span>
            </div>
        `;
    }
    
    if (components.upside_probability !== undefined) {
        // Upside/Downside signal
        html += `
            <div class="component-item">
                <span>Upside Probability:</span>
                <span class="component-value">${(components.upside_probability * 100).toFixed(1)}%</span>
            </div>
            <div class="component-item">
                <span>Downside Probability:</span>
                <span class="component-value">${(components.downside_probability * 100).toFixed(1)}%</span>
            </div>
        `;
    }
    
    if (components.signal_alignment) {
        // Composite signal
        html += `
            <div class="component-item">
                <span>Bullish Signals:</span>
                <span class="component-value">${components.signal_alignment.bullish}/${components.signal_alignment.total}</span>
            </div>
            <div class="component-item">
                <span>Bearish Signals:</span>
                <span class="component-value">${components.signal_alignment.bearish}/${components.signal_alignment.total}</span>
            </div>
        `;
    }
    
    html += '</div>';
    return html;
}

// Toggle signal detail expansion
function toggleSignalDetail(signalId) {
    const detailEl = document.getElementById(`detail_${signalId}`);
    const iconEl = document.getElementById(`expand_${signalId}`);
    
    if (detailEl.style.display === 'none') {
        detailEl.style.display = 'block';
        iconEl.textContent = '▲';
    } else {
        detailEl.style.display = 'none';
        iconEl.textContent = '▼';
    }
}

// Toggle inline signal detail expansion
function toggleInlineSignalDetail(signalId) {
    const detailEl = document.getElementById(`detail_${signalId}`);
    const iconEl = document.getElementById(`expand_${signalId}`);
    
    if (detailEl.style.display === 'none') {
        detailEl.style.display = 'block';
        iconEl.textContent = '▼';
    } else {
        detailEl.style.display = 'none';
        iconEl.textContent = '▶';
    }
}

// Toggle characteristic detail expansion
function toggleCharacteristicDetail(charId) {
    const detailEl = document.getElementById(`detail_${charId}`);
    const iconEl = document.getElementById(`expand_${charId}`);
    
    if (detailEl.style.display === 'none') {
        detailEl.style.display = 'block';
        iconEl.textContent = '▼';
        // Animate in
        detailEl.style.opacity = '0';
        setTimeout(() => {
            detailEl.style.transition = 'opacity 0.3s ease';
            detailEl.style.opacity = '1';
        }, 10);
    } else {
        detailEl.style.opacity = '0';
        setTimeout(() => {
            detailEl.style.display = 'none';
            iconEl.textContent = '▶';
        }, 300);
    }
}

// Update characteristic slider value
function updateCharSliderValue(charId, value) {
    document.getElementById(`slider_value_${charId}`).textContent = value + '%';
}

// Submit feedback for individual characteristic
async function submitCharFeedback(ticker, charIndex, charId) {
    const sliderValue = document.getElementById(`slider_${charId}`).value;
    const feedbackData = {
        ticker: ticker,
        characteristic_index: charIndex,
        accuracy_score: sliderValue / 100,
        timestamp: new Date().toISOString()
    };
    
    try {
        // TODO: Send to backend when endpoint is ready
        console.log('Characteristic feedback:', feedbackData);
        
        // Visual feedback
        const button = event.target;
        button.textContent = '✓ Feedback Submitted';
        button.style.background = 'var(--accent-green)';
        
        setTimeout(() => {
            button.textContent = 'Submit Feedback';
            button.style.background = '';
        }, 2000);
    } catch (error) {
        console.error('Error submitting characteristic feedback:', error);
        alert('Failed to submit feedback. Please try again.');
    }
}

// Toggle chart expansion
let isChartExpanded = false;
function toggleChartExpand() {
    const container = document.getElementById('characteristicsContainer');
    const canvas = document.getElementById('charChart');
    const icon = document.getElementById('chartExpandIcon');
    
    isChartExpanded = !isChartExpanded;
    
    if (isChartExpanded) {
        // Expand chart
        container.classList.add('expanded');
        canvas.width = 1000;
        canvas.height = 600;
        icon.textContent = '⛶'; // collapse icon
        
        // Redraw chart with better spacing
        if (characteristicsChart) {
            characteristicsChart.options.scales.x.ticks.maxRotation = 45;
            characteristicsChart.options.scales.x.ticks.minRotation = 45;
            characteristicsChart.update();
        }
    } else {
        // Collapse chart
        container.classList.remove('expanded');
        canvas.width = 600;
        canvas.height = 300;
        icon.textContent = '⛶'; // expand icon
        
        // Redraw chart
        if (characteristicsChart) {
            characteristicsChart.options.scales.x.ticks.maxRotation = 90;
            characteristicsChart.options.scales.x.ticks.minRotation = 45;
            characteristicsChart.update();
        }
    }
}