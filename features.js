// SmartNet New Features - Spin Wheel, Free WiFi & Ads
// This file handles the new UI features while keeping original login.js intact

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
        winHistory: 'smartnet_win_history'
    }
};

// Global variables for features
let spinAnimationRunning = false;
let freeWifiCheckInterval = null;

// Initialize features when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeFeatures();
});

// Initialize all new features
function initializeFeatures() {
    initializeSpinWheel();
    initializeFreeWifi();
    setupAdvertisement();
    
    featureLog('SmartNet new features initialized');
}

// Logging function for features
function featureLog(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[FEATURES ${timestamp}] ${type.toUpperCase()}: ${message}`;
    console.log(logEntry);
}

// === SPIN WHEEL FUNCTIONALITY ===

function initializeSpinWheel() {
    const spinBtn = document.getElementById('spinBtn');
    const spinCountDisplay = document.getElementById('spinCount');
    
    if (!spinBtn || !spinCountDisplay) {
        featureLog('Spin wheel elements not found', 'warning');
        return;
    }
    
    // Update spin count display
    updateSpinDisplay();
    
    // Add spin button click handler
    spinBtn.addEventListener('click', handleSpin);
    
    featureLog('Spin wheel initialized');
}

function updateSpinDisplay() {
    const spinCountDisplay = document.getElementById('spinCount');
    const spinBtn = document.getElementById('spinBtn');
    
    if (!spinCountDisplay || !spinBtn) return;
    
    const remainingSpins = getRemainingSpins();
    spinCountDisplay.textContent = remainingSpins;
    
    if (remainingSpins <= 0) {
        spinBtn.disabled = true;
        spinBtn.textContent = 'NO SPINS';
    } else {
        spinBtn.disabled = false;
        spinBtn.textContent = 'SPIN';
    }
}

function getRemainingSpins() {
    const today = new Date().toDateString();
    const lastSpinDate = localStorage.getItem(FEATURE_CONFIG.storageKeys.lastSpinDate);
    let dailySpins = parseInt(localStorage.getItem(FEATURE_CONFIG.storageKeys.dailySpins)) || 0;
    
    // Reset daily spins if it's a new day
    if (lastSpinDate !== today) {
        dailySpins = 2; // Reset to 2 spins per day
        localStorage.setItem(FEATURE_CONFIG.storageKeys.dailySpins, dailySpins.toString());
        localStorage.setItem(FEATURE_CONFIG.storageKeys.lastSpinDate, today);
    }
    
    return Math.max(0, dailySpins);
}

function useSpinChance() {
    const remainingSpins = getRemainingSpins();
    if (remainingSpins > 0) {
        const newCount = remainingSpins - 1;
        localStorage.setItem(FEATURE_CONFIG.storageKeys.dailySpins, newCount.toString());
        updateSpinDisplay();
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
    if (spinAnimationRunning) return;
    
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
        wheel.style.transition = 'transform 3s cubic-bezier(0.23, 1, 0.320, 1)';
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
        
    }, 3000);
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
    
    // Map spin wins to actual credentials
    const spinCredentials = {
        '3h': SESSION_CREDENTIALS['3h'],
        '1h': { username: 'smartNet 1h', password: 'smartNet@5120' },
        'data_100mb': { username: 'smartNet data', password: 'smartNet@5120' },
        'data_500mb': { username: 'smartNet data', password: 'smartNet@5120' },
        'data_1gb': { username: 'smartNet data', password: 'smartNet@5120' }
    };
    
    const credentials = spinCredentials[sessionType];
    if (credentials) {
        showConnectingOverlay();
        showMainMessage('Spin winner connecting...', 'success');
        
        setTimeout(() => {
            performAuthentication(credentials.username, credentials.password);
        }, 1000);
    } else {
        featureLog(`No credentials found for spin win: ${sessionType}`, 'error');
        showMainMessage('Error connecting spin reward. Please contact support.', 'alert');
    }
}

function logSpinResult(prize) {
    const history = JSON.parse(localStorage.getItem(FEATURE_CONFIG.storageKeys.winHistory) || '[]');
    const entry = {
        date: new Date().toISOString(),
        prize: prize.name,
        type: prize.type
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
            <h2>${typeIcon} ${title}</h2>
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
        featureLog('Free WiFi button not found', 'warning');
        return;
    }
    
    // Check free WiFi availability immediately
    checkFreeWifiAvailability();
    
    // Set up periodic check every minute
    freeWifiCheckInterval = setInterval(checkFreeWifiAvailability, 60000);
    
    // Add click handler
    freeConnectBtn.addEventListener('click', connectFreeWifi);
    
    featureLog('Free WiFi feature initialized');
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
            freeConnectBtn.textContent = 'Connect Free Now!';
            freeConnectBtn.style.background = 'linear-gradient(45deg, #51cf66, #40c057)';
            freeConnectBtn.style.cursor = 'pointer';
            freeConnectBtn.style.opacity = '1';
            
            // Add pulsing animation
            freeConnectBtn.style.animation = 'pulse 2s infinite';
        } else {
            freeConnectBtn.disabled = true;
            freeConnectBtn.textContent = 'Free WiFi Available Weekends 12AM-3AM';
            freeConnectBtn.style.background = 'rgba(255,255,255,0.2)';
            freeConnectBtn.style.cursor = 'not-allowed';
            freeConnectBtn.style.opacity = '0.6';
            freeConnectBtn.style.animation = 'none';
        }
    }
    
    if (isFreeWifiTime) {
        featureLog('Free WiFi is now available!');
    }
}

function connectFreeWifi() {
    featureLog('Free WiFi connection attempt');
    
    // Use special free WiFi credentials
    const freeCredentials = {
        username: 'smartNet_free',
        password: 'smartNet@5120'
    };
    
    showConnectingOverlay();
    showMainMessage('Connecting to Free WiFi...', 'success');
    
    // Disable the free connect button
    const freeConnectBtn = document.getElementById('freeConnectBtn');
    if (freeConnectBtn) {
        freeConnectBtn.disabled = true;
        freeConnectBtn.textContent = 'Connecting...';
    }
    
    setTimeout(() => {
        performAuthentication(freeCredentials.username, freeCredentials.password);
    }, 1500);
}

// === ADVERTISEMENT FUNCTIONALITY ===

function setupAdvertisement() {
    const advertSection = document.querySelector('.advert-section');
    if (advertSection) {
        advertSection.addEventListener('click', openCashRipple);
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

// === UTILITY FUNCTIONS ===

// Clean up intervals when page unloads
window.addEventListener('beforeunload', function() {
    if (freeWifiCheckInterval) {
        clearInterval(freeWifiCheckInterval);
    }
    featureLog('Features cleanup completed');
});

// Add fadeOut animation for modals (if not already present)
if (!document.getElementById('feature-modal-styles')) {
    const style = document.createElement('style');
    style.id = 'feature-modal-styles';
    style.textContent = `
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
    `;
    document.head.appendChild(style);
}

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
    }
};

featureLog('SmartNet Features module loaded successfully');