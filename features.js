// SmartNet New Features - Spin Wheel, Free WiFi & Ads
// Enhanced version with better connectivity and error handling

// Feature Configuration
const FEATURE_CONFIG = {
    // Spin wheel prizes and weights
    wheelPrizes: [
        { name: 'Thanks', weight: 60, type: 'thanks' },
        { name: '3 Hours', weight: 8, type: 'time', value: '3h' },
        { name: '100MB', weight: 10, type: 'data', value: '100mb' },
        { name: '1GB', weight: 5, type: 'data', value: '1gb' },
        { name: '500MB', weight: 7, type: 'data', value: '500mb' },
        { name: '1 Hour', weight: 8, type: 'time', value: '1h' },
        { name: '1 More Chance', weight: 2, type: 'bonus' }
    ],
    
    // Free WiFi schedule (weekends 12AM-3AM)
    freeWifiSchedule: {
        days: [0, 6], // Sunday = 0, Saturday = 6
        startHour: 0, // 12AM
        endHour: 3    // 3AM
    },
    
    // Local storage keys
    storageKeys: {
        dailySpins: 'smartnet_daily_spins',
        lastSpinDate: 'smartnet_last_spin_date',
        totalSpins: 'smartnet_total_spins',
        winHistory: 'smartnet_win_history',
        featureState: 'smartnet_feature_state'
    },
    
    // Feature settings
    settings: {
        maxRetries: 3,
        retryDelay: 2000,
        animationDuration: 3000
    }
};

// Global variables for features
let spinAnimationRunning = false;
let freeWifiCheckInterval = null;
let featureRetryCount = 0;

// Initialize features when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Wait for main configuration to be ready
    if (typeof window.MIKROTIK_CONFIG === 'undefined') {
        featureLog('Waiting for MikroTik config...', 'warning');
        setTimeout(initializeFeatures, 500);
    } else {
        initializeFeatures();
    }
});

// Initialize all new features
function initializeFeatures() {
    try {
        featureLog('SmartNet features initialization started');
        
        // Check dependencies
        if (!checkDependencies()) {
            featureLog('Dependencies not ready, retrying...', 'warning');
            if (featureRetryCount < FEATURE_CONFIG.settings.maxRetries) {
                featureRetryCount++;
                setTimeout(initializeFeatures, FEATURE_CONFIG.settings.retryDelay);
                return;
            }
            featureLog('Max retries reached, some features may not work', 'error');
        }
        
        // Initialize individual features with error handling
        safeInitialize('Spin Wheel', initializeSpinWheel);
        safeInitialize('Free WiFi', initializeFreeWifi);
        safeInitialize('Advertisement', setupAdvertisement);
        
        // Load saved state
        loadFeatureState();
        
        featureLog('SmartNet new features initialized successfully');
        
        // Mark features as ready
        if (window.SMARTNET_STATE) {
            window.SMARTNET_STATE.featuresReady = true;
        }
        
    } catch (error) {
        featureLog(`Initialization error: ${error.message}`, 'error');
    }
}

// Safe initialization wrapper
function safeInitialize(featureName, initFunction) {
    try {
        initFunction();
        featureLog(`${featureName} initialized`);
    } catch (error) {
        featureLog(`${featureName} initialization failed: ${error.message}`, 'error');
    }
}

// Check if required dependencies are available
function checkDependencies() {
    const required = [
        'MIKROTIK_CONFIG',
        'SESSION_CREDENTIALS'
    ];
    
    for (const dep of required) {
        if (typeof window[dep] === 'undefined') {
            featureLog(`Missing dependency: ${dep}`, 'warning');
            return false;
        }
    }
    
    return true;
}

// Logging function for features
function featureLog(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[FEATURES ${timestamp}] ${type.toUpperCase()}: ${message}`;
    console.log(logEntry);
    
    // Update runtime debug if available
    const runtimeDebug = document.getElementById('runtime-debug');
    if (runtimeDebug) {
        const entry = document.createElement('div');
        entry.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
        entry.style.color = type === 'error' ? '#ff6b6b' : type === 'warning' ? '#ffa94d' : '#51cf66';
        runtimeDebug.insertBefore(entry, runtimeDebug.firstChild);
        
        // Keep only last 10 entries
        while (runtimeDebug.children.length > 10) {
            runtimeDebug.removeChild(runtimeDebug.lastChild);
        }
    }
}

// === SPIN WHEEL FUNCTIONALITY ===

function initializeSpinWheel() {
    const spinBtn = document.getElementById('spinBtn');
    const spinCountDisplay = document.getElementById('spinCount');
    
    if (!spinBtn || !spinCountDisplay) {
        throw new Error('Spin wheel elements not found');
    }
    
    // Update spin count display
    updateSpinDisplay();
    
    // Add spin button click handler
    spinBtn.addEventListener('click', handleSpin);
    
    // Add visual feedback
    spinBtn.addEventListener('mouseenter', function() {
        if (!spinBtn.disabled) {
            this.style.transform = 'scale(1.05)';
        }
    });
    
    spinBtn.addEventListener('mouseleave', function() {
        this.style.transform = 'scale(1)';
    });
}

function updateSpinDisplay() {
    const spinCountDisplay = document.getElementById('spinCount');
    const spinBtn = document.getElementById('spinBtn');
    
    if (!spinCountDisplay || !spinBtn) return;
    
    const remainingSpins = getRemainingSpins();
    spinCountDisplay.textContent = remainingSpins;
    
    if (remainingSpins <= 0) {
        spinBtn.disabled = true;
        spinBtn.textContent = 'NO SPINS LEFT';
        spinBtn.style.opacity = '0.5';
    } else {
        spinBtn.disabled = false;
        spinBtn.textContent = 'SPIN NOW!';
        spinBtn.style.opacity = '1';
    }
}

function getRemainingSpins() {
    try {
        const today = new Date().toDateString();
        const lastSpinDate = localStorage.getItem(FEATURE_CONFIG.storageKeys.lastSpinDate);
        let dailySpins = parseInt(localStorage.getItem(FEATURE_CONFIG.storageKeys.dailySpins)) || 0;
        
        // Reset daily spins if it's a new day
        if (lastSpinDate !== today) {
            dailySpins = 2; // Reset to 2 spins per day
            localStorage.setItem(FEATURE_CONFIG.storageKeys.dailySpins, dailySpins.toString());
            localStorage.setItem(FEATURE_CONFIG.storageKeys.lastSpinDate, today);
            featureLog('Daily spins reset for new day');
        }
        
        return Math.max(0, dailySpins);
    } catch (error) {
        featureLog(`Error getting remaining spins: ${error.message}`, 'error');
        return 0;
    }
}

function useSpinChance() {
    const remainingSpins = getRemainingSpins();
    if (remainingSpins > 0) {
        const newCount = remainingSpins - 1;
        localStorage.setItem(FEATURE_CONFIG.storageKeys.dailySpins, newCount.toString());
        updateSpinDisplay();
        featureLog(`Spin used, ${newCount} remaining`);
        return true;
    }
    return false;
}

function addBonusSpinChance() {
    const currentSpins = getRemainingSpins();
    const newCount = currentSpins + 1;
    localStorage.setItem(FEATURE_CONFIG.storageKeys.dailySpins, newCount.toString());
    updateSpinDisplay();
    featureLog('Bonus spin chance added');
}

function handleSpin() {
    if (spinAnimationRunning) {
        featureLog('Spin already in progress', 'warning');
        return;
    }
    
    if (!useSpinChance()) {
        showSpinResult('No Spins Left', 'Come back tomorrow for more spins!', 'error');
        return;
    }
    
    spinAnimationRunning = true;
    const spinBtn = document.getElementById('spinBtn');
    const wheel = document.getElementById('spinWheel');
    
    if (spinBtn) {
        spinBtn.disabled = true;
        spinBtn.textContent = 'SPINNING...';
    }
    
    // Stop the idle animation
    if (wheel) {
        wheel.style.animation = 'none';
    }
    
    // Determine the winning prize
    const prize = selectWinningPrize();
    const prizeIndex = FEATURE_CONFIG.wheelPrizes.findIndex(p => p.name === prize.name);
    
    // Calculate rotation (each section is 51.43 degrees apart)
    const sectionAngle = 360 / 7; // 7 sections
    const targetAngle = (prizeIndex * sectionAngle) + (sectionAngle / 2);
    const randomOffset = (Math.random() - 0.5) * (sectionAngle * 0.3); // Small random offset
    const finalAngle = targetAngle + randomOffset + (360 * 5); // 5 full rotations plus target
    
    featureLog(`Spinning to ${prize.name} (angle: ${finalAngle})`);
    
    // Apply the spin animation
    if (wheel) {
        wheel.style.transition = `transform ${FEATURE_CONFIG.settings.animationDuration}ms cubic-bezier(0.23, 1, 0.320, 1)`;
        wheel.style.transform = `rotate(${finalAngle}deg)`;
    }
    
    // Handle spin completion
    setTimeout(() => {
        spinAnimationRunning = false;
        
        // Reset wheel animation
        if (wheel) {
            wheel.style.transition = 'none';
            wheel.style.transform = `rotate(${finalAngle % 360}deg)`;
            setTimeout(() => {
                wheel.style.animation = 'wheelIdle 3s ease-in-out infinite';
            }, 100);
        }
        
        // Reset button
        if (spinBtn) {
            spinBtn.disabled = false;
            updateSpinDisplay();
        }
        
        // Show result
        handleSpinResult(prize);
        
    }, FEATURE_CONFIG.settings.animationDuration);
}

function selectWinningPrize() {
    // Create weighted array
    const weightedPrizes = [];
    FEATURE_CONFIG.wheelPrizes.forEach(prize => {
        for (let i = 0; i < prize.weight; i++) {
            weightedPrizes.push(prize);
        }
    });
    
    // Select random prize
    const randomIndex = Math.floor(Math.random() * weightedPrizes.length);
    const selectedPrize = weightedPrizes[randomIndex];
    
    featureLog(`Prize selected: ${selectedPrize.name} (weight: ${selectedPrize.weight})`);
    return selectedPrize;
}

function handleSpinResult(prize) {
    let title, message, type;
    
    switch (prize.type) {
        case 'thanks':
            title = 'Thanks for Playing! 🎯';
            message = 'Better luck next time! Come back tomorrow for more spins.';
            type = 'thanks';
            break;
            
        case 'time':
            title = `Congratulations! ⏰`;
            message = `You won ${prize.name} of free internet! Your session will start automatically.`;
            type = 'win';
            // Auto-connect with the won session
            setTimeout(() => {
                closeSpinResult();
                authenticateWonSession(prize.value);
            }, 3000);
            break;
            
        case 'data':
            title = `Amazing! 📊`;
            message = `You won ${prize.name} of free data! Your session will start automatically.`;
            type = 'win';
            // Auto-connect with data session
            setTimeout(() => {
                closeSpinResult();
                authenticateWonSession('data_' + prize.value);
            }, 3000);
            break;
            
        case 'bonus':
            title = 'Bonus Spin! 🎁';
            message = 'You earned an extra spin chance! Spin again now.';
            type = 'bonus';
            addBonusSpinChance();
            break;
    }
    
    showSpinResult(title, message, type);
    
    // Log win history
    logSpinResult(prize);
}

function authenticateWonSession(sessionType) {
    featureLog(`Authenticating won session: ${sessionType}`);
    
    // Check if SESSION_CREDENTIALS is available
    if (typeof SESSION_CREDENTIALS === 'undefined') {
        featureLog('SESSION_CREDENTIALS not available', 'error');
        showMainMessage('Error: Authentication system not ready. Please try direct login.', 'alert');
        return;
    }
    
    // Map spin wins to actual credentials
    const spinCredentials = {
        '3h': SESSION_CREDENTIALS['3h'],
        '1h': { username: 'smartNet', password: 'smartNet@5120' },
        'data_100mb': { username: 'smartNet data', password: 'smartNet@5120' },
        'data_500mb': { username: 'smartNet data', password: 'smartNet@5120' },
        'data_1gb': { username: 'smartNet data', password: 'smartNet@5120' }
    };
    
    const credentials = spinCredentials[sessionType];
    if (credentials) {
        if (typeof showConnectingOverlay === 'function') {
            showConnectingOverlay();
        }
        if (typeof showMainMessage === 'function') {
            showMainMessage('🎉 Spin winner connecting...', 'success');
        }
        
        setTimeout(() => {
            if (typeof performAuthentication === 'function') {
                performAuthentication(credentials.username, credentials.password);
            } else {
                featureLog('performAuthentication function not available', 'error');
                showMainMessage('Error connecting. Please use direct login.', 'alert');
            }
        }, 1000);
    } else {
        featureLog(`No credentials found for spin win: ${sessionType}`, 'error');
        showMainMessage('Error connecting spin reward. Please contact support.', 'alert');
    }
}

function logSpinResult(prize) {
    try {
        const history = JSON.parse(localStorage.getItem(FEATURE_CONFIG.storageKeys.winHistory) || '[]');
        const entry = {
            date: new Date().toISOString(),
            prize: prize.name,
            type: prize.type,
            timestamp: Date.now()
        };
        
        history.unshift(entry);
        
        // Keep only last 50 entries
        if (history.length > 50) {
            history.splice(50);
        }
        
        localStorage.setItem(FEATURE_CONFIG.storageKeys.winHistory, JSON.stringify(history));
        
        // Update total spins counter
        const totalSpins = parseInt(localStorage.getItem(FEATURE_CONFIG.storageKeys.totalSpins) || '0') + 1;
        localStorage.setItem(FEATURE_CONFIG.storageKeys.totalSpins, totalSpins.toString());
        
        featureLog(`Spin result logged: ${prize.name} (Total spins: ${totalSpins})`);
    } catch (error) {
        featureLog(`Error logging spin result: ${error.message}`, 'error');
    }
}

function showSpinResult(title, message, type) {
    // Remove existing result modal
    const existingModal = document.getElementById('spinResultModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.className = 'spin-result-modal';
    modal.id = 'spinResultModal';
    
    const typeIcon = {
        'thanks': '🎯',
        'win': '🎉',
        'bonus': '🎁',
        'error': '❌'
    }[type] || '🎯';
    
    modal.innerHTML = `
        <div class="spin-result-content">
            <div class="result-icon">${typeIcon}</div>
            <h2>${title}</h2>
            <p>${message}</p>
            <button class="close-result-btn" onclick="closeSpinResult()">Continue</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Auto-close after 5 seconds for "thanks" results
    if (type === 'thanks' || type === 'error') {
        setTimeout(closeSpinResult, 5000);
    }
}

function closeSpinResult() {
    const modal = document.getElementById('spinResultModal');
    if (modal) {
        modal.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    }
}

// === FREE WIFI FUNCTIONALITY ===

function initializeFreeWifi() {
    const freeConnectBtn = document.getElementById('freeConnectBtn');
    
    if (!freeConnectBtn) {
        throw new Error('Free WiFi button not found');
    }
    
    // Check free WiFi availability immediately
    checkFreeWifiAvailability();
    
    // Set up periodic check every minute
    freeWifiCheckInterval = setInterval(checkFreeWifiAvailability, 60000);
    
    // Add click handler
    freeConnectBtn.addEventListener('click', connectFreeWifi);
}

function checkFreeWifiAvailability() {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
    const currentHour = now.getHours();
    
    const { days, startHour, endHour } = FEATURE_CONFIG.freeWifiSchedule;
    
    // Check if it's weekend (Saturday or Sunday) and within time range
    const isWeekend = days.includes(currentDay);
    const isWithinTimeRange = currentHour >= startHour && currentHour < endHour;
    
    const isFreeWifiTime = isWeekend && isWithinTimeRange;
    
    const freeConnectBtn = document.getElementById('freeConnectBtn');
    if (freeConnectBtn) {
        if (isFreeWifiTime) {
            freeConnectBtn.disabled = false;
            freeConnectBtn.textContent = '🎁 Connect Free Now!';
            freeConnectBtn.style.background = 'linear-gradient(45deg, #51cf66, #40c057)';
            freeConnectBtn.style.cursor = 'pointer';
            freeConnectBtn.style.opacity = '1';
            freeConnectBtn.style.animation = 'pulse 2s infinite';
        } else {
            freeConnectBtn.disabled = true;
            freeConnectBtn.textContent = 'Free WiFi: Weekends 12AM-3AM';
            freeConnectBtn.style.background = 'rgba(255,255,255,0.2)';
            freeConnectBtn.style.cursor = 'not-allowed';
            freeConnectBtn.style.opacity = '0.6';
            freeConnectBtn.style.animation = 'none';
        }
    }
    
    if (isFreeWifiTime) {
        featureLog('🎉 Free WiFi is now available!');
    }
}

function connectFreeWifi() {
    featureLog('Free WiFi connection attempt');
    
    // Use special free WiFi credentials
    const freeCredentials = {
        username: 'smartNet_free',
        password: 'smartNet@5120'
    };
    
    if (typeof showConnectingOverlay === 'function') {
        showConnectingOverlay();
    }
    if (typeof showMainMessage === 'function') {
        showMainMessage('🎁 Connecting to Free WiFi...', 'success');
    }
    
    // Disable the free connect button
    const freeConnectBtn = document.getElementById('freeConnectBtn');
    if (freeConnectBtn) {
        freeConnectBtn.disabled = true;
        freeConnectBtn.textContent = 'Connecting...';
    }
    
    setTimeout(() => {
        if (typeof performAuthentication === 'function') {
            performAuthentication(freeCredentials.username, freeCredentials.password);
        } else {
            featureLog('performAuthentication function not available', 'error');
            if (typeof showMainMessage === 'function') {
                showMainMessage('Error: Authentication system not ready', 'alert');
            }
        }
    }, 1500);
}

// === ADVERTISEMENT FUNCTIONALITY ===

function setupAdvertisement() {
    const advertSection = document.querySelector('.advert-section');
    if (advertSection) {
        advertSection.style.cursor = 'pointer';
        featureLog('Advertisement section setup complete');
    }
}

function openCashRipple() {
    featureLog('Redirecting to CashRipple');
    
    // Create a loading overlay for smooth transition
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 3000;
        backdrop-filter: blur(5px);
    `;
    
    overlay.innerHTML = `
        <div style="
            background: #1a1a2e;
            border: 1px solid rgba(128, 0, 128, 0.3);
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            color: white;
        ">
            <div style="
                width: 30px;
                height: 30px;
                border: 3px solid rgba(128, 0, 128, 0.3);
                border-top: 3px solid #800080;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 15px;
            "></div>
            <h3 style="color: #fbbf24; margin-bottom: 10px;">Opening CashRipple...</h3>
            <p style="color: #b0b0c0;">Redirecting to our store</p>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Redirect after short delay
    setTimeout(() => {
        window.open('https://lanmurithi.pythonanywhere.com', '_blank');
        overlay.remove();
    }, 1500);
}

// === STATE MANAGEMENT ===

function saveFeatureState() {
    try {
        const state = {
            lastUpdate: new Date().toISOString(),
            spinsRemaining: getRemainingSpins(),
            freeWifiAvailable: checkFreeWifiTime()
        };
        localStorage.setItem(FEATURE_CONFIG.storageKeys.featureState, JSON.stringify(state));
    } catch (error) {
        featureLog(`Error saving feature state: ${error.message}`, 'error');
    }
}

function loadFeatureState() {
    try {
        const stateStr = localStorage.getItem(FEATURE_CONFIG.storageKeys.featureState);
        if (stateStr) {
            const state = JSON.parse(stateStr);
            featureLog(`Feature state loaded: ${JSON.stringify(state)}`);
        }
    } catch (error) {
        featureLog(`Error loading feature state: ${error.message}`, 'error');
    }
}

function checkFreeWifiTime() {
    const now = new Date();
    const { days, startHour, endHour } = FEATURE_CONFIG.freeWifiSchedule;
    return days.includes(now.getDay()) && now.getHours() >= startHour && now.getHours() < endHour;
}

// === UTILITY FUNCTIONS ===

// Clean up intervals when page unloads
window.addEventListener('beforeunload', function() {
    saveFeatureState();
    
    if (freeWifiCheckInterval) {
        clearInterval(freeWifiCheckInterval);
    }
    featureLog('Features cleanup completed');
});

// Periodic state save
setInterval(saveFeatureState, 300000); // Every 5 minutes

// Expose functions for testing/debugging
window.SmartNetFeatures = {
    getRemainingSpins,
    checkFreeWifiAvailability,
    selectWinningPrize,
    openCashRipple,
    // For debugging
    resetDailySpins: () => {
        localStorage.removeItem(FEATURE_CONFIG.storageKeys.dailySpins);
        localStorage.removeItem(FEATURE_CONFIG.storageKeys.lastSpinDate);
        updateSpinDisplay();
        featureLog('Daily spins reset for testing');
    },
    getWinHistory: () => {
        return JSON.parse(localStorage.getItem(FEATURE_CONFIG.storageKeys.winHistory) || '[]');
    },
    getState: () => {
        return {
            initialized: window.SMARTNET_STATE?.featuresReady || false,
            spinsRemaining: getRemainingSpins(),
            freeWifiAvailable: checkFreeWifiTime(),
            totalSpins: localStorage.getItem(FEATURE_CONFIG.storageKeys.totalSpins) || 0
        };
    }
};

featureLog('SmartNet Features module loaded successfully');