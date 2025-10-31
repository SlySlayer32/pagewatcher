const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const { chromium } = require('playwright');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Data storage
const DATA_DIR = path.join(__dirname, 'data');
const MONITORS_FILE = path.join(DATA_DIR, 'monitors.json');
const ALERTS_FILE = path.join(DATA_DIR, 'alerts.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize data files
function initDataFiles() {
    if (!fs.existsSync(MONITORS_FILE)) {
        fs.writeFileSync(MONITORS_FILE, JSON.stringify([]));
    }
    if (!fs.existsSync(ALERTS_FILE)) {
        fs.writeFileSync(ALERTS_FILE, JSON.stringify([]));
    }
}

// Read data
function readMonitors() {
    try {
        return JSON.parse(fs.readFileSync(MONITORS_FILE, 'utf8'));
    } catch (error) {
        return [];
    }
}

function readAlerts() {
    try {
        return JSON.parse(fs.readFileSync(ALERTS_FILE, 'utf8'));
    } catch (error) {
        return [];
    }
}

// Write data
function writeMonitors(monitors) {
    fs.writeFileSync(MONITORS_FILE, JSON.stringify(monitors, null, 2));
}

function writeAlerts(alerts) {
    fs.writeFileSync(ALERTS_FILE, JSON.stringify(alerts, null, 2));
}

// API Routes

// Get all monitors
app.get('/api/monitors', (req, res) => {
    const monitors = readMonitors();
    res.json(monitors);
});

// Add new monitor
app.post('/api/monitors', (req, res) => {
    const { url, keywords, checkInterval, platform } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    const monitors = readMonitors();
    const newMonitor = {
        id: Date.now().toString(),
        url,
        keywords: keywords || [],
        checkInterval: checkInterval || 30,
        platform: platform || 'general',
        active: true,
        lastChecked: null,
        createdAt: new Date().toISOString()
    };

    monitors.push(newMonitor);
    writeMonitors(monitors);
    
    res.json(newMonitor);
});

// Update monitor
app.put('/api/monitors/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    const monitors = readMonitors();
    const index = monitors.findIndex(m => m.id === id);
    
    if (index === -1) {
        return res.status(404).json({ error: 'Monitor not found' });
    }
    
    monitors[index] = { ...monitors[index], ...updates };
    writeMonitors(monitors);
    
    res.json(monitors[index]);
});

// Delete monitor
app.delete('/api/monitors/:id', (req, res) => {
    const { id } = req.params;
    
    let monitors = readMonitors();
    monitors = monitors.filter(m => m.id !== id);
    writeMonitors(monitors);
    
    res.json({ success: true });
});

// Get all alerts
app.get('/api/alerts', (req, res) => {
    const alerts = readAlerts();
    res.json(alerts);
});

// Mark alert as read
app.put('/api/alerts/:id/read', (req, res) => {
    const { id } = req.params;
    
    const alerts = readAlerts();
    const alert = alerts.find(a => a.id === id);
    
    if (!alert) {
        return res.status(404).json({ error: 'Alert not found' });
    }
    
    alert.read = true;
    writeAlerts(alerts);
    
    res.json(alert);
});

// Delete alert
app.delete('/api/alerts/:id', (req, res) => {
    const { id } = req.params;
    
    let alerts = readAlerts();
    alerts = alerts.filter(a => a.id !== id);
    writeAlerts(alerts);
    
    res.json({ success: true });
});

// Check page with Playwright
app.post('/api/check-page', async (req, res) => {
    const { url, keywords } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();
        
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        
        // Wait a bit for dynamic content
        await page.waitForTimeout(3000);
        
        // Get page content
        const content = await page.content();
        const textContent = await page.evaluate(() => document.body.innerText);
        
        // Check for keywords
        const foundKeywords = [];
        if (keywords && keywords.length > 0) {
            keywords.forEach(keyword => {
                if (textContent.toLowerCase().includes(keyword.toLowerCase())) {
                    foundKeywords.push(keyword);
                }
            });
        }
        
        await browser.close();
        
        res.json({
            success: true,
            url,
            timestamp: new Date().toISOString(),
            hasContent: textContent.length > 0,
            foundKeywords,
            preview: textContent.substring(0, 500)
        });
        
    } catch (error) {
        res.status(500).json({ 
            error: 'Failed to check page', 
            details: error.message 
        });
    }
});

// Background monitoring function
async function checkMonitor(monitor) {
    try {
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();
        
        await page.goto(monitor.url, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(3000);
        
        const textContent = await page.evaluate(() => document.body.innerText);
        
        // Check for keywords
        const foundKeywords = [];
        if (monitor.keywords && monitor.keywords.length > 0) {
            monitor.keywords.forEach(keyword => {
                if (textContent.toLowerCase().includes(keyword.toLowerCase())) {
                    foundKeywords.push(keyword);
                }
            });
        }
        
        await browser.close();
        
        // If keywords found, create alert
        if (foundKeywords.length > 0) {
            const alerts = readAlerts();
            const newAlert = {
                id: Date.now().toString(),
                monitorId: monitor.id,
                url: monitor.url,
                foundKeywords,
                preview: textContent.substring(0, 300),
                timestamp: new Date().toISOString(),
                read: false
            };
            alerts.push(newAlert);
            writeAlerts(alerts);
            console.log(`Alert created for monitor ${monitor.id}: Found keywords ${foundKeywords.join(', ')}`);
        }
        
        // Update last checked time
        const monitors = readMonitors();
        const index = monitors.findIndex(m => m.id === monitor.id);
        if (index !== -1) {
            monitors[index].lastChecked = new Date().toISOString();
            writeMonitors(monitors);
        }
        
    } catch (error) {
        console.error(`Error checking monitor ${monitor.id}:`, error.message);
    }
}

// Schedule background checks every minute
cron.schedule('* * * * *', async () => {
    const monitors = readMonitors();
    const activeMonitors = monitors.filter(m => m.active);
    
    for (const monitor of activeMonitors) {
        // Check if it's time to check this monitor
        const now = Date.now();
        const lastChecked = monitor.lastChecked ? new Date(monitor.lastChecked).getTime() : 0;
        const intervalMs = (monitor.checkInterval || 30) * 60 * 1000;
        
        if (now - lastChecked >= intervalMs) {
            console.log(`Checking monitor ${monitor.id} for ${monitor.url}`);
            await checkMonitor(monitor);
        }
    }
});

// Serve index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize and start server
initDataFiles();

app.listen(PORT, () => {
    console.log(`Page Watcher server running on http://localhost:${PORT}`);
});
