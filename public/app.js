// API endpoints
const API = {
    monitors: '/api/monitors',
    alerts: '/api/alerts',
    checkPage: '/api/check-page'
};

// State
let monitors = [];
let alerts = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadMonitors();
    loadAlerts();
    setupEventListeners();
    
    // Refresh data every 30 seconds
    setInterval(() => {
        loadMonitors();
        loadAlerts();
    }, 30000);
});

// Setup event listeners
function setupEventListeners() {
    document.getElementById('addMonitorForm').addEventListener('submit', handleAddMonitor);
    document.getElementById('quickCheckForm').addEventListener('submit', handleQuickCheck);
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}

// Load monitors
async function loadMonitors() {
    try {
        const response = await fetch(API.monitors);
        monitors = await response.json();
        renderMonitors();
    } catch (error) {
        console.error('Failed to load monitors:', error);
    }
}

// Load alerts
async function loadAlerts() {
    try {
        const response = await fetch(API.alerts);
        alerts = await response.json();
        renderAlerts();
    } catch (error) {
        console.error('Failed to load alerts:', error);
    }
}

// Render monitors
function renderMonitors() {
    const container = document.getElementById('monitorsList');
    
    if (monitors.length === 0) {
        container.innerHTML = '<p class="empty-state">No monitors yet. Add one above!</p>';
        return;
    }
    
    container.innerHTML = monitors.map(monitor => `
        <div class="monitor-item ${monitor.active ? '' : 'inactive'}">
            <div class="monitor-header">
                <div>
                    <div class="monitor-title">
                        <span class="status-indicator ${monitor.active ? 'active' : 'inactive'}"></span>
                        ${truncateUrl(monitor.url, 40)}
                    </div>
                    <span class="platform-badge ${monitor.platform}">${monitor.platform}</span>
                </div>
                <div class="monitor-actions">
                    <button class="btn ${monitor.active ? 'btn-secondary' : 'btn-success'}" 
                            onclick="toggleMonitor('${monitor.id}')">
                        ${monitor.active ? 'Pause' : 'Resume'}
                    </button>
                    <button class="btn btn-danger" onclick="deleteMonitor('${monitor.id}')">
                        Delete
                    </button>
                </div>
            </div>
            <div class="monitor-info">
                Check every ${monitor.checkInterval} minutes
            </div>
            ${monitor.lastChecked ? `
                <div class="monitor-info">
                    Last checked: ${formatTime(monitor.lastChecked)}
                </div>
            ` : ''}
            ${monitor.keywords && monitor.keywords.length > 0 ? `
                <div class="monitor-keywords">
                    ${monitor.keywords.map(kw => `<span class="keyword-tag">${kw}</span>`).join('')}
                </div>
            ` : ''}
        </div>
    `).join('');
}

// Render alerts
function renderAlerts() {
    const container = document.getElementById('alertsList');
    
    if (alerts.length === 0) {
        container.innerHTML = '<p class="empty-state">No alerts yet.</p>';
        return;
    }
    
    // Sort by timestamp, newest first
    const sortedAlerts = [...alerts].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    // Show only last 10 alerts
    const recentAlerts = sortedAlerts.slice(0, 10);
    
    container.innerHTML = recentAlerts.map(alert => `
        <div class="alert-item ${alert.read ? 'read' : ''}">
            <div class="alert-header">
                <div>
                    <div class="alert-title">
                        ${alert.read ? '✓' : '🔔'} Keyword Match Found
                    </div>
                    <div class="alert-time">${formatTime(alert.timestamp)}</div>
                </div>
                <div class="alert-actions">
                    ${!alert.read ? `
                        <button class="btn btn-success" onclick="markAlertRead('${alert.id}')">
                            Mark Read
                        </button>
                    ` : ''}
                    <button class="btn btn-danger" onclick="deleteAlert('${alert.id}')">
                        Delete
                    </button>
                </div>
            </div>
            <div class="alert-preview">
                ${alert.preview}
            </div>
            <div class="monitor-info">
                <a href="${alert.url}" target="_blank" rel="noopener noreferrer">
                    ${truncateUrl(alert.url, 50)}
                </a>
            </div>
            ${alert.foundKeywords && alert.foundKeywords.length > 0 ? `
                <div class="alert-keywords">
                    ${alert.foundKeywords.map(kw => `<span class="alert-keyword">${kw}</span>`).join('')}
                </div>
            ` : ''}
        </div>
    `).join('');
}

// Handle add monitor form
async function handleAddMonitor(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    
    const url = formData.get('url');
    const platform = formData.get('platform');
    const keywordsStr = formData.get('keywords');
    const checkInterval = parseInt(formData.get('checkInterval'));
    
    const keywords = keywordsStr 
        ? keywordsStr.split(',').map(k => k.trim()).filter(k => k)
        : [];
    
    try {
        const response = await fetch(API.monitors, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url,
                platform,
                keywords,
                checkInterval
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to add monitor');
        }
        
        showNotification('Monitor added successfully!', 'success');
        form.reset();
        await loadMonitors();
        
    } catch (error) {
        showNotification('Failed to add monitor: ' + error.message, 'error');
    }
}

// Handle quick check
async function handleQuickCheck(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    
    const url = formData.get('quickUrl');
    const keywordsStr = formData.get('quickKeywords');
    
    const keywords = keywordsStr 
        ? keywordsStr.split(',').map(k => k.trim()).filter(k => k)
        : [];
    
    const resultDiv = document.getElementById('quickCheckResult');
    resultDiv.innerHTML = '<p>Checking page... <span class="loading"></span></p>';
    resultDiv.className = 'quick-check-result';
    resultDiv.style.display = 'block';
    
    try {
        const response = await fetch(API.checkPage, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url, keywords })
        });
        
        const result = await response.json();
        
        if (result.success) {
            resultDiv.className = 'quick-check-result success';
            
            let html = '<h4>✓ Check Complete</h4>';
            html += `<p><strong>URL:</strong> ${truncateUrl(result.url, 50)}</p>`;
            html += `<p><strong>Time:</strong> ${formatTime(result.timestamp)}</p>`;
            
            if (result.foundKeywords && result.foundKeywords.length > 0) {
                html += `<p><strong>Found Keywords:</strong></p>`;
                html += `<div class="quick-check-keywords">`;
                result.foundKeywords.forEach(kw => {
                    html += `<span class="alert-keyword">${kw}</span>`;
                });
                html += `</div>`;
            } else if (keywords.length > 0) {
                html += `<p><strong>Keywords:</strong> None of the specified keywords were found.</p>`;
            }
            
            if (result.preview) {
                html += `<p><strong>Preview:</strong></p>`;
                html += `<p style="font-size: 12px; color: #64748b; margin-top: 8px;">${result.preview}</p>`;
            }
            
            resultDiv.innerHTML = html;
            showNotification('Page check complete!', 'success');
            
        } else {
            throw new Error(result.details || 'Check failed');
        }
        
    } catch (error) {
        resultDiv.className = 'quick-check-result error';
        resultDiv.innerHTML = `
            <h4>✗ Check Failed</h4>
            <p>${error.message}</p>
            <p style="font-size: 12px; margin-top: 8px;">
                This might happen if the page blocks automated access or takes too long to load.
            </p>
        `;
        showNotification('Failed to check page', 'error');
    }
}

// Toggle monitor active status
async function toggleMonitor(id) {
    const monitor = monitors.find(m => m.id === id);
    if (!monitor) return;
    
    try {
        const response = await fetch(`${API.monitors}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                active: !monitor.active
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update monitor');
        }
        
        showNotification(
            `Monitor ${!monitor.active ? 'resumed' : 'paused'}`, 
            'success'
        );
        await loadMonitors();
        
    } catch (error) {
        showNotification('Failed to update monitor: ' + error.message, 'error');
    }
}

// Delete monitor
async function deleteMonitor(id) {
    if (!confirm('Are you sure you want to delete this monitor?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API.monitors}/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete monitor');
        }
        
        showNotification('Monitor deleted', 'success');
        await loadMonitors();
        
    } catch (error) {
        showNotification('Failed to delete monitor: ' + error.message, 'error');
    }
}

// Mark alert as read
async function markAlertRead(id) {
    try {
        const response = await fetch(`${API.alerts}/${id}/read`, {
            method: 'PUT'
        });
        
        if (!response.ok) {
            throw new Error('Failed to mark alert as read');
        }
        
        await loadAlerts();
        
    } catch (error) {
        showNotification('Failed to update alert: ' + error.message, 'error');
    }
}

// Delete alert
async function deleteAlert(id) {
    try {
        const response = await fetch(`${API.alerts}/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete alert');
        }
        
        await loadAlerts();
        
    } catch (error) {
        showNotification('Failed to delete alert: ' + error.message, 'error');
    }
}

// Load preview
function loadPreview() {
    const url = document.getElementById('previewUrl').value;
    const frame = document.getElementById('previewFrame');
    const error = document.getElementById('previewError');
    
    if (!url) {
        showNotification('Please enter a URL', 'error');
        return;
    }
    
    // Hide error, show frame
    error.style.display = 'none';
    frame.style.display = 'block';
    
    // Try to load the URL
    frame.src = url;
    
    // Show error if iframe fails to load (some sites block iframes)
    frame.onerror = () => {
        frame.style.display = 'none';
        error.style.display = 'block';
    };
    
    showNotification('Loading preview...', 'info');
}

// Utility functions
function truncateUrl(url, maxLength) {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // Less than 1 minute
    if (diff < 60000) {
        return 'Just now';
    }
    
    // Less than 1 hour
    if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    
    // Less than 1 day
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    
    // Format as date
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
