/**
 * Media Buyer Portfolio - Main JavaScript
 * 
 * This file contains all client-side functionality including:
 * - Theme toggling (dark/light mode)
 * - Navigation and scroll effects
 * - KPI Dashboard data handling
 * - Audit Engine with 15 deterministic checks
 * - Chart.js visualizations
 * - CSV parsing (PapaParse)
 * - JSON handling
 * - PDF/JSON export
 * - Modal and form interactions
 * 
 * @author Media Buyer Portfolio
 * @version 1.0.0
 */

'use strict';

// ============================================
// Global State
// ============================================
const AppState = {
    // Current dataset being analyzed
    dataset: [],
    
    // Audit findings
    findings: [],
    
    // Chart instances
    charts: {
        timeSeries: null,
        funnel: null,
        events: null
    },
    
    // Audit configuration thresholds
    config: {
        roasThreshold: 1.5,
        cpaMultiplier: 1.3,
        minConversions: 30,
        eventMismatchThreshold: 0.25,
        funnelDropoffThreshold: 0.60,
        pageSpeedThreshold: 3.0,
        budgetImbalanceThreshold: 0.70,
        matchRateThreshold: 0.60
    },
    
    // Default config for reset
    defaultConfig: null,
    
    // Marked as fixed findings
    fixedFindings: new Set()
};

// Initialize default config reference
AppState.defaultConfig = { ...AppState.config };

// ============================================
// Utility Functions
// ============================================

/**
 * Safely escape HTML to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Format number as currency
 * @param {number} value - Number to format
 * @param {string} currency - Currency code
 * @returns {string} Formatted currency string
 */
function formatCurrency(value, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

/**
 * Format number with commas
 * @param {number} value - Number to format
 * @returns {string} Formatted number string
 */
function formatNumber(value) {
    return new Intl.NumberFormat('en-US').format(Math.round(value));
}

/**
 * Format percentage
 * @param {number} value - Decimal value (0.15 = 15%)
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage string
 */
function formatPercent(value, decimals = 1) {
    return (value * 100).toFixed(decimals) + '%';
}

/**
 * Generate unique ID
 * @returns {string} Unique ID
 */
function generateId() {
    return 'id-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type: 'success', 'error', or default
 */
function showToast(message, type = '') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// ============================================
// Theme Management
// ============================================

/**
 * Initialize theme from localStorage or system preference
 */
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    
    document.documentElement.setAttribute('data-theme', theme);
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        }
    });
}

/**
 * Toggle between dark and light theme
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// ============================================
// Navigation
// ============================================

/**
 * Initialize navigation functionality
 */
function initNavigation() {
    const navbar = document.querySelector('.navbar');
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Mobile menu toggle
    mobileToggle?.addEventListener('click', () => {
        const isExpanded = mobileToggle.getAttribute('aria-expanded') === 'true';
        mobileToggle.setAttribute('aria-expanded', !isExpanded);
        navMenu.classList.toggle('active');
    });
    
    // Smooth scroll for nav links
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const target = document.querySelector(targetId);
            
            if (target) {
                const navHeight = navbar.offsetHeight;
                const targetPosition = target.offsetTop - navHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
            
            // Close mobile menu
            mobileToggle?.setAttribute('aria-expanded', 'false');
            navMenu.classList.remove('active');
        });
    });
    
    // Navbar background on scroll
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        
        lastScroll = currentScroll;
    });
    
    // Active nav link on scroll
    const sections = document.querySelectorAll('section[id]');
    window.addEventListener('scroll', () => {
        const scrollY = window.pageYOffset;
        
        sections.forEach(section => {
            const sectionHeight = section.offsetHeight;
            const sectionTop = section.offsetTop - 150;
            const sectionId = section.getAttribute('id');
            const navLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);
            
            if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                navLinks.forEach(link => link.classList.remove('active'));
                navLink?.classList.add('active');
            }
        });
    });
}

/**
 * Initialize back to top button
 */
function initBackToTop() {
    const backToTop = document.querySelector('.back-to-top');
    
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 500) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    });
    
    backToTop?.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

/**
 * Initialize scroll animations
 */
function initScrollAnimations() {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;
    
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animationPlayState = 'running';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    document.querySelectorAll('.fade-in-up').forEach(el => {
        el.style.animationPlayState = 'paused';
        observer.observe(el);
    });
}

// ============================================
// Dashboard Tab Management
// ============================================

/**
 * Initialize dashboard tabs
 */
function initDashboardTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            
            // Update buttons
            tabButtons.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            
            // Update panels
            tabPanels.forEach(panel => {
                panel.hidden = true;
                panel.classList.remove('active');
            });
            
            const activePanel = document.getElementById(`tab-${tabId}`);
            if (activePanel) {
                activePanel.hidden = false;
                activePanel.classList.add('active');
            }
        });
    });
}

// ============================================
// Settings Panel
// ============================================

/**
 * Initialize settings panel
 */
function initSettingsPanel() {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsPanel = document.getElementById('settings-panel');
    const closeBtn = settingsPanel?.querySelector('.close-settings');
    const applyBtn = document.getElementById('apply-settings');
    const resetBtn = document.getElementById('reset-settings');
    
    settingsBtn?.addEventListener('click', () => {
        settingsPanel.hidden = false;
        loadSettingsToUI();
    });
    
    closeBtn?.addEventListener('click', () => {
        settingsPanel.hidden = true;
    });
    
    // Close on backdrop click
    settingsPanel?.addEventListener('click', (e) => {
        if (e.target === settingsPanel) {
            settingsPanel.hidden = true;
        }
    });
    
    applyBtn?.addEventListener('click', () => {
        saveSettingsFromUI();
        settingsPanel.hidden = true;
        showToast('Settings saved successfully', 'success');
        
        // Re-run audit if data exists
        if (AppState.dataset.length > 0) {
            runAudit();
        }
    });
    
    resetBtn?.addEventListener('click', () => {
        AppState.config = { ...AppState.defaultConfig };
        loadSettingsToUI();
        showToast('Settings reset to defaults', 'success');
    });
}

/**
 * Load settings from AppState to UI
 */
function loadSettingsToUI() {
    document.getElementById('roas-threshold').value = AppState.config.roasThreshold;
    document.getElementById('cpa-multiplier').value = AppState.config.cpaMultiplier;
    document.getElementById('min-conversions').value = AppState.config.minConversions;
    document.getElementById('event-mismatch-threshold').value = AppState.config.eventMismatchThreshold * 100;
    document.getElementById('funnel-dropoff-threshold').value = AppState.config.funnelDropoffThreshold * 100;
    document.getElementById('page-speed-threshold').value = AppState.config.pageSpeedThreshold;
}

/**
 * Save settings from UI to AppState
 */
function saveSettingsFromUI() {
    AppState.config.roasThreshold = parseFloat(document.getElementById('roas-threshold').value);
    AppState.config.cpaMultiplier = parseFloat(document.getElementById('cpa-multiplier').value);
    AppState.config.minConversions = parseInt(document.getElementById('min-conversions').value);
    AppState.config.eventMismatchThreshold = parseFloat(document.getElementById('event-mismatch-threshold').value) / 100;
    AppState.config.funnelDropoffThreshold = parseFloat(document.getElementById('funnel-dropoff-threshold').value) / 100;
    AppState.config.pageSpeedThreshold = parseFloat(document.getElementById('page-speed-threshold').value);
}

// ============================================
// Data Input Handling
// ============================================

/**
 * Initialize manual form
 */
function initManualForm() {
    const form = document.getElementById('manual-form');
    const clearBtn = form?.querySelector('.clear-form-btn');
    const revenueInput = document.getElementById('revenue');
    const purchasesInput = document.getElementById('purchases');
    const aovInput = document.getElementById('aov');
    
    // Auto-calculate AOV
    const calculateAov = () => {
        const revenue = parseFloat(revenueInput?.value) || 0;
        const purchases = parseInt(purchasesInput?.value) || 0;
        if (purchases > 0 && revenue > 0) {
            aovInput.value = (revenue / purchases).toFixed(2);
        } else {
            aovInput.value = '';
        }
    };
    
    revenueInput?.addEventListener('input', calculateAov);
    purchasesInput?.addEventListener('input', calculateAov);
    
    // Clear form
    clearBtn?.addEventListener('click', () => {
        form.reset();
        aovInput.value = '';
    });
    
    // Form submission
    form?.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const data = {
            date: formData.get('date_start') || new Date().toISOString().split('T')[0],
            campaign: 'Manual Entry',
            adset: 'Manual',
            ad: 'Manual Entry',
            spend: parseFloat(formData.get('spend')) || 0,
            clicks: parseInt(formData.get('clicks')) || 0,
            impressions: parseInt(formData.get('impressions')) || 0,
            purchases: parseInt(formData.get('purchases')) || 0,
            revenue: parseFloat(formData.get('revenue')) || 0,
            currency: formData.get('currency') || 'USD',
            utm_campaign: 'manual_entry',
            pixel_events: parseInt(formData.get('pixel_events')) || 0,
            server_events: parseInt(formData.get('server_events')) || 0,
            transaction_id: formData.get('transaction_id') || generateId(),
            page_load_time: parseFloat(formData.get('page_load_time')) || 0,
            ad_copy: '',
            cpa_target: parseFloat(formData.get('cpa_target')) || 0,
            attribution_window: parseInt(formData.get('attribution_window')) || 7
        };
        
        AppState.dataset = [data];
        processDataset();
    });
}

/**
 * Initialize CSV upload
 */
function initCsvUpload() {
    const uploadZone = document.getElementById('csv-upload-zone');
    const fileInput = document.getElementById('csv-file-input');
    const browseBtn = uploadZone?.querySelector('.browse-btn');
    const preview = document.getElementById('csv-preview');
    const previewTable = document.getElementById('csv-preview-table');
    const fileInfo = document.getElementById('csv-file-info');
    const clearBtn = document.getElementById('csv-clear-btn');
    const auditBtn = document.getElementById('csv-audit-btn');
    
    // Browse button
    browseBtn?.addEventListener('click', () => fileInput?.click());
    
    // Drag and drop
    uploadZone?.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });
    
    uploadZone?.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });
    
    uploadZone?.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        
        const file = e.dataTransfer?.files[0];
        if (file && file.name.endsWith('.csv')) {
            handleCsvFile(file);
        } else {
            showToast('Please upload a CSV file', 'error');
        }
    });
    
    // File input change
    fileInput?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) {
            handleCsvFile(file);
        }
    });
    
    // Clear preview
    clearBtn?.addEventListener('click', () => {
        preview.hidden = true;
        uploadZone.style.display = '';
        fileInput.value = '';
        AppState.dataset = [];
    });
    
    // Run audit
    auditBtn?.addEventListener('click', () => {
        if (AppState.dataset.length > 0) {
            processDataset();
        }
    });
}

/**
 * Handle CSV file parsing
 * @param {File} file - CSV file to parse
 */
function handleCsvFile(file) {
    if (typeof Papa === 'undefined') {
        showToast('PapaParse library not loaded', 'error');
        return;
    }
    
    const uploadZone = document.getElementById('csv-upload-zone');
    const preview = document.getElementById('csv-preview');
    const fileInfo = document.getElementById('csv-file-info');
    
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
            if (results.errors.length > 0) {
                console.warn('CSV parsing warnings:', results.errors);
            }
            
            // Map data to expected format
            AppState.dataset = results.data.map(row => normalizeDataRow(row));
            
            // Show preview
            uploadZone.style.display = 'none';
            preview.hidden = false;
            fileInfo.textContent = `${file.name} (${results.data.length} rows)`;
            
            renderPreviewTable(results.data.slice(0, 10));
            showToast(`Loaded ${results.data.length} rows from CSV`, 'success');
        },
        error: (error) => {
            showToast(`Error parsing CSV: ${error.message}`, 'error');
        }
    });
}

/**
 * Render preview table
 * @param {Array} data - Data to render
 */
function renderPreviewTable(data) {
    const table = document.getElementById('csv-preview-table');
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    
    if (data.length === 0) return;
    
    // Headers
    const headers = Object.keys(data[0]);
    thead.innerHTML = `<tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`;
    
    // Rows
    tbody.innerHTML = data.map(row => 
        `<tr>${headers.map(h => `<td>${escapeHtml(row[h] ?? '')}</td>`).join('')}</tr>`
    ).join('');
}

/**
 * Initialize JSON input
 */
function initJsonInput() {
    const jsonInput = document.getElementById('json-input');
    const clearBtn = document.querySelector('.clear-json-btn');
    const parseBtn = document.querySelector('.parse-json-btn');
    const auditBtn = document.getElementById('json-audit-btn');
    const mappingDiv = document.getElementById('json-field-mapping');
    
    clearBtn?.addEventListener('click', () => {
        jsonInput.value = '';
        mappingDiv.hidden = true;
        auditBtn.hidden = true;
        AppState.dataset = [];
    });
    
    parseBtn?.addEventListener('click', () => {
        try {
            const text = jsonInput.value.trim();
            if (!text) {
                showToast('Please enter JSON data', 'error');
                return;
            }
            
            // Safe JSON parsing (no eval)
            const data = JSON.parse(text);
            
            if (!Array.isArray(data)) {
                showToast('JSON must be an array of objects', 'error');
                return;
            }
            
            // Check if fields match expected
            const expectedFields = ['date', 'spend', 'revenue', 'purchases', 'clicks', 'impressions'];
            const sampleKeys = Object.keys(data[0] || {});
            const hasExpectedFields = expectedFields.some(f => sampleKeys.includes(f));
            
            if (!hasExpectedFields) {
                // Show field mapping
                showFieldMapping(sampleKeys, expectedFields);
            } else {
                // Process directly
                AppState.dataset = data.map(row => normalizeDataRow(row));
                auditBtn.hidden = false;
                showToast(`Parsed ${data.length} records from JSON`, 'success');
            }
        } catch (error) {
            showToast(`Invalid JSON: ${error.message}`, 'error');
        }
    });
    
    auditBtn?.addEventListener('click', () => {
        if (AppState.dataset.length > 0) {
            processDataset();
        }
    });
}

/**
 * Show field mapping UI
 * @param {Array} sourceFields - Fields from JSON
 * @param {Array} targetFields - Expected fields
 */
function showFieldMapping(sourceFields, targetFields) {
    const mappingDiv = document.getElementById('json-field-mapping');
    const mappingGrid = document.getElementById('mapping-grid');
    
    mappingGrid.innerHTML = targetFields.map(target => `
        <div class="mapping-item">
            <label for="map-${target}">${target}</label>
            <select id="map-${target}">
                <option value="">-- Select --</option>
                ${sourceFields.map(source => `<option value="${source}">${source}</option>`).join('')}
            </select>
        </div>
    `).join('');
    
    mappingDiv.hidden = false;
    
    // Add apply mapping button functionality
    const applyMappingBtn = document.createElement('button');
    applyMappingBtn.className = 'btn btn-primary';
    applyMappingBtn.textContent = 'Apply Mapping';
    applyMappingBtn.onclick = () => applyFieldMapping();
    
    if (!mappingDiv.querySelector('.apply-mapping-btn')) {
        mappingDiv.appendChild(applyMappingBtn);
    }
}

/**
 * Apply field mapping and process data
 */
function applyFieldMapping() {
    const jsonInput = document.getElementById('json-input');
    const auditBtn = document.getElementById('json-audit-btn');
    
    try {
        const data = JSON.parse(jsonInput.value.trim());
        const mapping = {};
        
        // Collect mappings
        document.querySelectorAll('[id^="map-"]').forEach(select => {
            const targetField = select.id.replace('map-', '');
            const sourceField = select.value;
            if (sourceField) {
                mapping[targetField] = sourceField;
            }
        });
        
        // Apply mapping
        AppState.dataset = data.map(row => {
            const mappedRow = {};
            for (const [target, source] of Object.entries(mapping)) {
                mappedRow[target] = row[source];
            }
            return normalizeDataRow(mappedRow);
        });
        
        auditBtn.hidden = false;
        showToast(`Mapped ${AppState.dataset.length} records`, 'success');
    } catch (error) {
        showToast(`Error applying mapping: ${error.message}`, 'error');
    }
}

/**
 * Normalize data row to expected format
 * @param {Object} row - Raw data row
 * @returns {Object} Normalized row
 */
function normalizeDataRow(row) {
    return {
        date: row.date || row.Date || row.DATE || new Date().toISOString().split('T')[0],
        campaign: row.campaign || row.Campaign || row.campaign_name || 'Unknown',
        adset: row.adset || row.Adset || row.ad_set || row.adset_name || 'Unknown',
        ad: row.ad || row.Ad || row.ad_name || 'Unknown',
        spend: Number(row.spend || row.Spend || row.cost || 0),
        clicks: Number(row.clicks || row.Clicks || 0),
        impressions: Number(row.impressions || row.Impressions || 0),
        purchases: Number(row.purchases || row.Purchases || row.conversions || row.orders || 0),
        revenue: Number(row.revenue || row.Revenue || row.value || 0),
        currency: row.currency || row.Currency || 'USD',
        utm_campaign: row.utm_campaign || row.utm_campaign_name || row.campaign || '',
        pixel_events: Number(row.pixel_events || row.pixelEvents || row.pixel || 0),
        server_events: Number(row.server_events || row.serverEvents || row.server || 0),
        transaction_id: row.transaction_id || row.transactionId || row.order_id || generateId(),
        page_load_time: Number(row.page_load_time || row.pageLoadTime || 0),
        ad_copy: row.ad_copy || row.adCopy || row.copy || '',
        cpa_target: Number(row.cpa_target || row.cpaTarget || 0),
        match_rate: Number(row.match_rate || row.matchRate || 0)
    };
}

/**
 * Initialize sample data loading
 */
function initSampleData() {
    const sampleBtn = document.getElementById('load-sample-btn');
    
    sampleBtn?.addEventListener('click', async () => {
        try {
            sampleBtn.disabled = true;
            sampleBtn.textContent = 'Loading...';
            
            // Load sample JSON
            const response = await fetch('data/samples/sample_campaign.json');
            if (!response.ok) {
                throw new Error('Failed to load sample data');
            }
            
            const data = await response.json();
            AppState.dataset = data.map(row => normalizeDataRow(row));
            
            showToast(`Loaded ${data.length} sample records`, 'success');
            processDataset();
        } catch (error) {
            showToast(`Error loading sample: ${error.message}`, 'error');
        } finally {
            sampleBtn.disabled = false;
            sampleBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                Load Sample Data
            `;
        }
    });
}

// ============================================
// Data Processing & Metrics
// ============================================

/**
 * Process dataset and display results
 */
function processDataset() {
    if (AppState.dataset.length === 0) {
        showToast('No data to process', 'error');
        return;
    }
    
    // Calculate summary metrics
    const metrics = calculateMetrics();
    
    // Display results
    displayMetrics(metrics);
    
    // Create charts
    createCharts();
    
    // Run audit
    runAudit();
    
    // Show results section
    document.getElementById('dashboard-results').hidden = false;
    document.getElementById('audit-results').hidden = false;
    
    // Scroll to results
    document.getElementById('dashboard-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Calculate aggregate metrics from dataset
 * @returns {Object} Calculated metrics
 */
function calculateMetrics() {
    const data = AppState.dataset;
    
    const totals = data.reduce((acc, row) => {
        acc.spend += row.spend || 0;
        acc.revenue += row.revenue || 0;
        acc.clicks += row.clicks || 0;
        acc.impressions += row.impressions || 0;
        acc.purchases += row.purchases || 0;
        acc.pixelEvents += row.pixel_events || 0;
        acc.serverEvents += row.server_events || 0;
        return acc;
    }, { spend: 0, revenue: 0, clicks: 0, impressions: 0, purchases: 0, pixelEvents: 0, serverEvents: 0 });
    
    const avgPageLoad = data.reduce((sum, row) => sum + (row.page_load_time || 0), 0) / data.length;
    
    return {
        totalSpend: totals.spend,
        totalRevenue: totals.revenue,
        totalClicks: totals.clicks,
        totalImpressions: totals.impressions,
        totalPurchases: totals.purchases,
        avgROAS: totals.spend > 0 ? totals.revenue / totals.spend : 0,
        avgCPA: totals.purchases > 0 ? totals.spend / totals.purchases : 0,
        avgCTR: totals.impressions > 0 ? totals.clicks / totals.impressions : 0,
        avgAOV: totals.purchases > 0 ? totals.revenue / totals.purchases : 0,
        avgPageLoad: avgPageLoad,
        pixelEvents: totals.pixelEvents,
        serverEvents: totals.serverEvents,
        currency: data[0]?.currency || 'USD'
    };
}

/**
 * Display metrics in summary cards
 * @param {Object} metrics - Calculated metrics
 */
function displayMetrics(metrics) {
    document.getElementById('total-spend').textContent = formatCurrency(metrics.totalSpend, metrics.currency);
    document.getElementById('total-revenue').textContent = formatCurrency(metrics.totalRevenue, metrics.currency);
    document.getElementById('avg-roas').textContent = metrics.avgROAS.toFixed(2) + 'x';
    document.getElementById('avg-cpa').textContent = formatCurrency(metrics.avgCPA, metrics.currency);
    document.getElementById('total-conversions').textContent = formatNumber(metrics.totalPurchases);
    document.getElementById('avg-ctr').textContent = formatPercent(metrics.avgCTR);
    
    // Update alert counts
    updateAlertCounts();
}

/**
 * Update alert counts in alerts widget
 */
function updateAlertCounts() {
    const errors = AppState.findings.filter(f => f.severity === 'P0').length;
    const warnings = AppState.findings.filter(f => f.severity === 'P1').length;
    const info = AppState.findings.filter(f => f.severity === 'P2').length;
    
    document.getElementById('error-count').textContent = `${errors} Errors`;
    document.getElementById('warning-count').textContent = `${warnings} Warnings`;
    document.getElementById('info-count').textContent = `${info} Info`;
}

// ============================================
// Chart Creation
// ============================================

/**
 * Create all charts
 */
function createCharts() {
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded - using fallback display');
        showChartFallback();
        return;
    }
    
    createTimeSeriesChart();
    createFunnelChart();
    createEventsChart();
    updateCampaignsTable();
}

/**
 * Show fallback when charts are not available
 */
function showChartFallback() {
    const chartContainers = document.querySelectorAll('.chart-wrapper');
    chartContainers.forEach(container => {
        container.innerHTML = '<p class="chart-fallback">Chart visualization requires Chart.js library</p>';
    });
}

/**
 * Create time series chart
 */
function createTimeSeriesChart() {
    const ctx = document.getElementById('timeSeriesChart')?.getContext('2d');
    if (!ctx) return;
    
    // Destroy existing chart
    if (AppState.charts.timeSeries) {
        AppState.charts.timeSeries.destroy();
    }
    
    // Aggregate data by date
    const dateGroups = {};
    AppState.dataset.forEach(row => {
        const date = row.date;
        if (!dateGroups[date]) {
            dateGroups[date] = { spend: 0, revenue: 0, purchases: 0 };
        }
        dateGroups[date].spend += row.spend;
        dateGroups[date].revenue += row.revenue;
        dateGroups[date].purchases += row.purchases;
    });
    
    const sortedDates = Object.keys(dateGroups).sort();
    const labels = sortedDates;
    const spendData = sortedDates.map(d => dateGroups[d].spend);
    const revenueData = sortedDates.map(d => dateGroups[d].revenue);
    const roasData = sortedDates.map(d => 
        dateGroups[d].spend > 0 ? dateGroups[d].revenue / dateGroups[d].spend : 0
    );
    const cpaData = sortedDates.map(d => 
        dateGroups[d].purchases > 0 ? dateGroups[d].spend / dateGroups[d].purchases : 0
    );
    
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDark ? '#9CA3AF' : '#6B7280';
    
    AppState.charts.timeSeries = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Spend ($)',
                    data: spendData,
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: false,
                    tension: 0.3,
                    yAxisID: 'y'
                },
                {
                    label: 'Revenue ($)',
                    data: revenueData,
                    borderColor: '#22C55E',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    fill: false,
                    tension: 0.3,
                    yAxisID: 'y'
                },
                {
                    label: 'ROAS (x)',
                    data: roasData,
                    borderColor: '#0E7C86',
                    backgroundColor: 'rgba(14, 124, 134, 0.1)',
                    fill: false,
                    tension: 0.3,
                    yAxisID: 'y1'
                },
                {
                    label: 'CPA ($)',
                    data: cpaData,
                    borderColor: '#FF6B5F',
                    backgroundColor: 'rgba(255, 107, 95, 0.1)',
                    fill: false,
                    tension: 0.3,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: textColor }
                },
                tooltip: {
                    backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                    titleColor: isDark ? '#F9FAFB' : '#111827',
                    bodyColor: isDark ? '#9CA3AF' : '#6B7280'
                }
            },
            scales: {
                x: {
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: { color: textColor }
                }
            }
        }
    });
}

/**
 * Create funnel chart
 */
function createFunnelChart() {
    const ctx = document.getElementById('funnelChart')?.getContext('2d');
    if (!ctx) return;
    
    if (AppState.charts.funnel) {
        AppState.charts.funnel.destroy();
    }
    
    // Calculate funnel stages
    const metrics = calculateMetrics();
    const visits = metrics.totalImpressions;
    const clicks = metrics.totalClicks;
    // Simulate add-to-cart and checkout from typical ratios
    const addToCart = Math.round(metrics.totalPurchases * 2.5);
    const checkout = Math.round(metrics.totalPurchases * 1.3);
    const purchases = metrics.totalPurchases;
    
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#9CA3AF' : '#6B7280';
    
    AppState.charts.funnel = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Visits', 'Clicks', 'Add to Cart', 'Checkout', 'Purchase'],
            datasets: [{
                label: 'Users',
                data: [visits, clicks, addToCart, checkout, purchases],
                backgroundColor: [
                    'rgba(14, 124, 134, 0.8)',
                    'rgba(14, 124, 134, 0.7)',
                    'rgba(14, 124, 134, 0.6)',
                    'rgba(14, 124, 134, 0.5)',
                    'rgba(34, 197, 94, 0.8)'
                ],
                borderColor: [
                    '#0E7C86',
                    '#0E7C86',
                    '#0E7C86',
                    '#0E7C86',
                    '#22C55E'
                ],
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                    titleColor: isDark ? '#F9FAFB' : '#111827',
                    bodyColor: isDark ? '#9CA3AF' : '#6B7280',
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const prevValue = context.dataIndex > 0 ? context.dataset.data[context.dataIndex - 1] : value;
                            const dropoff = prevValue > 0 ? ((prevValue - value) / prevValue * 100).toFixed(1) : 0;
                            return `${formatNumber(value)} users${context.dataIndex > 0 ? ` (${dropoff}% drop-off)` : ''}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' },
                    ticks: { 
                        color: textColor,
                        callback: value => formatNumber(value)
                    }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: textColor }
                }
            }
        }
    });
}

/**
 * Create events comparison chart
 */
function createEventsChart() {
    const ctx = document.getElementById('eventsChart')?.getContext('2d');
    if (!ctx) return;
    
    if (AppState.charts.events) {
        AppState.charts.events.destroy();
    }
    
    // Aggregate by date
    const dateGroups = {};
    AppState.dataset.forEach(row => {
        const date = row.date;
        if (!dateGroups[date]) {
            dateGroups[date] = { pixel: 0, server: 0 };
        }
        dateGroups[date].pixel += row.pixel_events || 0;
        dateGroups[date].server += row.server_events || 0;
    });
    
    const sortedDates = Object.keys(dateGroups).sort();
    
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#9CA3AF' : '#6B7280';
    
    AppState.charts.events = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedDates.slice(-14), // Last 14 days
            datasets: [
                {
                    label: 'Pixel Events',
                    data: sortedDates.slice(-14).map(d => dateGroups[d].pixel),
                    backgroundColor: 'rgba(14, 124, 134, 0.7)',
                    borderColor: '#0E7C86',
                    borderWidth: 1
                },
                {
                    label: 'Server Events',
                    data: sortedDates.slice(-14).map(d => dateGroups[d].server),
                    backgroundColor: 'rgba(255, 107, 95, 0.7)',
                    borderColor: '#FF6B5F',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: textColor }
                },
                tooltip: {
                    backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                    titleColor: isDark ? '#F9FAFB' : '#111827',
                    bodyColor: isDark ? '#9CA3AF' : '#6B7280'
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: textColor }
                },
                y: {
                    grid: { color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' },
                    ticks: { 
                        color: textColor,
                        callback: value => formatNumber(value)
                    }
                }
            }
        }
    });
}

/**
 * Update campaigns table
 */
function updateCampaignsTable() {
    const tbody = document.querySelector('#campaigns-table tbody');
    if (!tbody) return;
    
    // Aggregate by campaign
    const campaignGroups = {};
    AppState.dataset.forEach(row => {
        const campaign = row.campaign;
        if (!campaignGroups[campaign]) {
            campaignGroups[campaign] = { spend: 0, revenue: 0, purchases: 0, clicks: 0, impressions: 0 };
        }
        campaignGroups[campaign].spend += row.spend;
        campaignGroups[campaign].revenue += row.revenue;
        campaignGroups[campaign].purchases += row.purchases;
        campaignGroups[campaign].clicks += row.clicks;
        campaignGroups[campaign].impressions += row.impressions;
    });
    
    // Calculate metrics and sort
    const campaigns = Object.entries(campaignGroups).map(([name, data]) => ({
        name,
        spend: data.spend,
        revenue: data.revenue,
        purchases: data.purchases,
        roas: data.spend > 0 ? data.revenue / data.spend : 0,
        cpa: data.purchases > 0 ? data.spend / data.purchases : 0,
        ctr: data.impressions > 0 ? data.clicks / data.impressions : 0
    }));
    
    // Sort by ROAS descending
    campaigns.sort((a, b) => b.roas - a.roas);
    
    // Render table
    tbody.innerHTML = campaigns.slice(0, 10).map(c => `
        <tr>
            <td><strong>${escapeHtml(c.name)}</strong></td>
            <td>${formatCurrency(c.spend)}</td>
            <td>${formatCurrency(c.revenue)}</td>
            <td><span class="${c.roas >= 2 ? 'text-success' : c.roas >= 1 ? 'text-warning' : 'text-danger'}">${c.roas.toFixed(2)}x</span></td>
            <td>${formatCurrency(c.cpa)}</td>
            <td>${formatNumber(c.purchases)}</td>
            <td>${formatPercent(c.ctr)}</td>
        </tr>
    `).join('');
    
    // Add sort functionality
    initTableSort(campaigns);
}

/**
 * Initialize table sorting
 * @param {Array} campaigns - Campaign data
 */
function initTableSort(campaigns) {
    const sortSelect = document.getElementById('sort-by');
    const sortDirection = document.getElementById('sort-direction');
    
    let ascending = false;
    
    const sortTable = () => {
        const sortBy = sortSelect?.value || 'roas';
        campaigns.sort((a, b) => {
            const aVal = a[sortBy];
            const bVal = b[sortBy];
            return ascending ? aVal - bVal : bVal - aVal;
        });
        
        // Re-render
        const tbody = document.querySelector('#campaigns-table tbody');
        tbody.innerHTML = campaigns.slice(0, 10).map(c => `
            <tr>
                <td><strong>${escapeHtml(c.name)}</strong></td>
                <td>${formatCurrency(c.spend)}</td>
                <td>${formatCurrency(c.revenue)}</td>
                <td>${c.roas.toFixed(2)}x</td>
                <td>${formatCurrency(c.cpa)}</td>
                <td>${formatNumber(c.purchases)}</td>
                <td>${formatPercent(c.ctr)}</td>
            </tr>
        `).join('');
    };
    
    sortSelect?.addEventListener('change', sortTable);
    sortDirection?.addEventListener('click', () => {
        ascending = !ascending;
        sortDirection.classList.toggle('asc', ascending);
        sortTable();
    });
}

// ============================================
// Audit Engine
// ============================================

/**
 * AUDIT ENGINE
 * 
 * This section contains all audit rules. Each rule follows a consistent pattern:
 * 1. Check condition based on dataset and config
 * 2. Return finding object with standardized structure
 * 
 * To add a new audit rule:
 * 1. Create a function named checkYourRuleName that takes (data, config) parameters
 * 2. Return a finding object or null if no issue found
 * 3. Add the function to the auditRules array in runAudit()
 * 
 * Finding object structure:
 * {
 *   id: string,
 *   severity: 'P0' | 'P1' | 'P2',
 *   type: 'error' | 'warning' | 'info',
 *   title: string,
 *   description: string,
 *   evidence: string | Array,
 *   estimatedImpact: string,
 *   confidence: 'High' | 'Medium' | 'Low',
 *   recommendedFix: string,
 *   fixSnippet: string (optional)
 * }
 */

/**
 * Run all audit checks on the dataset
 */
function runAudit() {
    const data = AppState.dataset;
    const config = AppState.config;
    
    if (data.length === 0) {
        showToast('No data to audit', 'error');
        return;
    }
    
    // Clear previous findings
    AppState.findings = [];
    
    // Run all audit checks
    const findings = [
        checkMissingConversions(data, config),
        checkEventMismatch(data, config),
        checkCurrencyInconsistency(data, config),
        checkAttributionWindowMismatch(data, config),
        checkHighCpaVsTarget(data, config),
        checkLowRoas(data, config),
        checkLowMatchRate(data, config),
        checkDuplicateTransactions(data, config),
        checkUtmInconsistencies(data, config),
        checkLargeFunnelDropoff(data, config),
        checkInsufficientSampleSize(data, config),
        checkImbalancedBudgetAllocation(data, config),
        checkPixelNotFiring(data, config),
        checkPageSpeed(data, config),
        checkAdCopyFlags(data, config)
    ].filter(f => f !== null);
    
    AppState.findings = findings;
    
    // Display findings
    displayFindings();
    updateAlertCounts();
}

/**
 * Audit Rule 1: Missing conversions
 * Detects revenue without corresponding purchases
 */
function checkMissingConversions(data, config) {
    const problematicRows = data.filter(row => 
        row.revenue > 0 && row.purchases === 0
    );
    
    if (problematicRows.length === 0) return null;
    
    return {
        id: 'MISSING_CONVERSIONS',
        severity: 'P0',
        type: 'error',
        title: 'Missing Conversions Detected',
        description: `Found ${problematicRows.length} rows with revenue but zero purchases. This indicates a potential tracking issue where conversions are not being recorded properly.`,
        evidence: problematicRows.slice(0, 5).map(r => 
            `${r.date}: ${formatCurrency(r.revenue)} revenue, ${r.purchases} purchases`
        ),
        estimatedImpact: 'High - May result in incorrect CPA calculations and underreported performance',
        confidence: 'High',
        recommendedFix: '1. Check your conversion pixel installation\n2. Verify purchase event is firing on thank-you page\n3. Test with a test purchase\n4. Check for ad blockers interfering with tracking',
        fixSnippet: `// Example: Verify purchase event
fbq('track', 'Purchase', {
  value: ${problematicRows[0]?.revenue || 0},
  currency: 'USD'
});`
    };
}

/**
 * Audit Rule 2: Event mismatch between pixel and server
 */
function checkEventMismatch(data, config) {
    const threshold = config.eventMismatchThreshold;
    const problematicRows = data.filter(row => {
        const maxEvents = Math.max(row.pixel_events, row.server_events, 1);
        const mismatch = Math.abs(row.pixel_events - row.server_events) / maxEvents;
        return mismatch > threshold;
    });
    
    if (problematicRows.length === 0) return null;
    
    const avgMismatch = problematicRows.reduce((sum, row) => {
        const maxEvents = Math.max(row.pixel_events, row.server_events, 1);
        return sum + Math.abs(row.pixel_events - row.server_events) / maxEvents;
    }, 0) / problematicRows.length;
    
    return {
        id: 'EVENT_MISMATCH',
        severity: avgMismatch > 0.5 ? 'P0' : 'P1',
        type: avgMismatch > 0.5 ? 'error' : 'warning',
        title: 'Pixel/Server Event Mismatch',
        description: `${problematicRows.length} rows have more than ${(threshold * 100).toFixed(0)}% discrepancy between pixel and server events. Average mismatch: ${(avgMismatch * 100).toFixed(1)}%.`,
        evidence: problematicRows.slice(0, 5).map(r => 
            `${r.date}: Pixel=${r.pixel_events}, Server=${r.server_events}`
        ),
        estimatedImpact: 'Medium - May affect attribution accuracy and audience building',
        confidence: 'High',
        recommendedFix: '1. Compare browser vs server event timestamps\n2. Check for duplicate events\n3. Verify event deduplication is implemented\n4. Review server-side tracking setup',
        fixSnippet: `// Implement event deduplication
const eventId = generateUniqueId();
fbq('track', 'Purchase', {...}, {eventID: eventId});
// Send same eventId to server`
    };
}

/**
 * Audit Rule 3: Currency inconsistency
 */
function checkCurrencyInconsistency(data, config) {
    const currencies = new Set(data.map(row => row.currency));
    
    if (currencies.size <= 1) return null;
    
    const currencyCounts = {};
    data.forEach(row => {
        currencyCounts[row.currency] = (currencyCounts[row.currency] || 0) + 1;
    });
    
    return {
        id: 'CURRENCY_INCONSISTENCY',
        severity: 'P1',
        type: 'warning',
        title: 'Multiple Currencies Detected',
        description: `Found ${currencies.size} different currencies in the dataset: ${Array.from(currencies).join(', ')}. This may cause incorrect ROAS and CPA calculations.`,
        evidence: Object.entries(currencyCounts).map(([curr, count]) => 
            `${curr}: ${count} rows`
        ),
        estimatedImpact: 'Medium - May skew performance metrics if not normalized',
        confidence: 'High',
        recommendedFix: '1. Standardize currency before importing\n2. Apply exchange rates to normalize\n3. Set a base currency for reporting\n4. Use currency conversion API for real-time rates',
        fixSnippet: `// Normalize to USD
const exchangeRates = { EUR: 1.08, GBP: 1.27 };
const normalizedRevenue = revenue * (exchangeRates[currency] || 1);`
    };
}

/**
 * Audit Rule 4: Attribution window mismatch
 */
function checkAttributionWindowMismatch(data, config) {
    // Check if attribution window data is available
    const hasAttributionData = data.some(row => row.attribution_window);
    if (!hasAttributionData) return null;
    
    const windows = new Set(data.filter(row => row.attribution_window).map(row => row.attribution_window));
    
    if (windows.size <= 1) return null;
    
    return {
        id: 'ATTRIBUTION_MISMATCH',
        severity: 'P2',
        type: 'info',
        title: 'Varying Attribution Windows',
        description: `Found ${windows.size} different attribution windows: ${Array.from(windows).join(', ')} days. Inconsistent attribution windows can make performance comparison difficult.`,
        evidence: `Campaigns using ${Array.from(windows).join(', ')} day windows`,
        estimatedImpact: 'Low - May cause confusion when comparing campaign performance',
        confidence: 'Medium',
        recommendedFix: '1. Standardize attribution window across campaigns\n2. Document which window is used for each campaign type\n3. Consider using platform default (7-day click, 1-day view)',
        fixSnippet: null
    };
}

/**
 * Audit Rule 5: High CPA vs target
 */
function checkHighCpaVsTarget(data, config) {
    const multiplier = config.cpaMultiplier;
    const campaigns = {};
    
    data.forEach(row => {
        if (row.cpa_target > 0) {
            if (!campaigns[row.campaign]) {
                campaigns[row.campaign] = { spend: 0, purchases: 0, target: row.cpa_target };
            }
            campaigns[row.campaign].spend += row.spend;
            campaigns[row.campaign].purchases += row.purchases;
        }
    });
    
    const overTargetCampaigns = Object.entries(campaigns)
        .map(([name, data]) => ({
            name,
            cpa: data.purchases > 0 ? data.spend / data.purchases : Infinity,
            target: data.target
        }))
        .filter(c => c.cpa > c.target * multiplier);
    
    if (overTargetCampaigns.length === 0) return null;
    
    return {
        id: 'HIGH_CPA',
        severity: 'P0',
        type: 'error',
        title: 'CPA Exceeds Target',
        description: `${overTargetCampaigns.length} campaigns have CPA more than ${multiplier}x their target. Immediate optimization needed.`,
        evidence: overTargetCampaigns.slice(0, 5).map(c => 
            `${c.name}: CPA ${formatCurrency(c.cpa)} vs Target ${formatCurrency(c.target)}`
        ),
        estimatedImpact: 'High - Overspending on acquisition, reducing profitability',
        confidence: 'High',
        recommendedFix: '1. Pause or reduce budget on underperforming campaigns\n2. Review audience targeting\n3. Test new ad creatives\n4. Optimize landing page conversion rate\n5. Narrow targeting to higher-intent audiences',
        fixSnippet: null
    };
}

/**
 * Audit Rule 6: Low ROAS
 */
function checkLowRoas(data, config) {
    const threshold = config.roasThreshold;
    
    // Aggregate by campaign
    const campaigns = {};
    data.forEach(row => {
        if (!campaigns[row.campaign]) {
            campaigns[row.campaign] = { spend: 0, revenue: 0 };
        }
        campaigns[row.campaign].spend += row.spend;
        campaigns[row.campaign].revenue += row.revenue;
    });
    
    const lowRoasCampaigns = Object.entries(campaigns)
        .map(([name, data]) => ({
            name,
            roas: data.spend > 0 ? data.revenue / data.spend : 0,
            spend: data.spend
        }))
        .filter(c => c.roas < threshold && c.spend > 100);
    
    if (lowRoasCampaigns.length === 0) return null;
    
    const totalWasted = lowRoasCampaigns.reduce((sum, c) => sum + c.spend, 0);
    
    return {
        id: 'LOW_ROAS',
        severity: 'P1',
        type: 'warning',
        title: 'Low ROAS Campaigns Detected',
        description: `${lowRoasCampaigns.length} campaigns have ROAS below ${threshold}x threshold, representing ${formatCurrency(totalWasted)} in spend.`,
        evidence: lowRoasCampaigns.sort((a, b) => a.roas - b.roas).slice(0, 5).map(c => 
            `${c.name}: ${c.roas.toFixed(2)}x ROAS (${formatCurrency(c.spend)} spend)`
        ),
        estimatedImpact: 'Medium to High - Unprofitable spend reducing overall account performance',
        confidence: 'High',
        recommendedFix: '1. Review creative fatigue - rotate ads\n2. Test new audiences\n3. Adjust bidding strategy\n4. Check for seasonal factors\n5. Consider pausing if no improvement after optimization',
        fixSnippet: null
    };
}

/**
 * Audit Rule 7: Low match rate
 */
function checkLowMatchRate(data, config) {
    const threshold = config.matchRateThreshold;
    
    const hasMatchRate = data.some(row => row.match_rate > 0);
    if (!hasMatchRate) return null;
    
    const lowMatchRows = data.filter(row => 
        row.match_rate > 0 && row.match_rate < threshold
    );
    
    if (lowMatchRows.length === 0) return null;
    
    const avgMatchRate = lowMatchRows.reduce((sum, r) => sum + r.match_rate, 0) / lowMatchRows.length;
    
    return {
        id: 'LOW_MATCH_RATE',
        severity: 'P1',
        type: 'warning',
        title: 'Low Match Rate Detected',
        description: `${lowMatchRows.length} records have match rate below ${(threshold * 100).toFixed(0)}%. Average match rate: ${(avgMatchRate * 100).toFixed(1)}%.`,
        evidence: `Match rates range from ${(Math.min(...lowMatchRows.map(r => r.match_rate)) * 100).toFixed(1)}% to ${(Math.max(...lowMatchRows.map(r => r.match_rate)) * 100).toFixed(1)}%`,
        estimatedImpact: 'Medium - Reduces effectiveness of audience targeting and lookalikes',
        confidence: 'High',
        recommendedFix: '1. Verify Customer List ID formatting\n2. Use more customer data points (email, phone, name)\n3. Ensure proper hashing (SHA256)\n4. Update customer lists more frequently',
        fixSnippet: `// Proper SHA256 hashing
const hashEmail = async (email) => {
  const normalized = email.trim().toLowerCase();
  const buffer = new TextEncoder().encode(normalized);
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
};`
    };
}

/**
 * Audit Rule 8: Duplicate transactions
 */
function checkDuplicateTransactions(data, config) {
    const transactionIds = {};
    
    data.forEach(row => {
        if (row.transaction_id) {
            transactionIds[row.transaction_id] = (transactionIds[row.transaction_id] || 0) + 1;
        }
    });
    
    const duplicates = Object.entries(transactionIds).filter(([id, count]) => count > 1);
    
    if (duplicates.length === 0) return null;
    
    const totalDuplicateCount = duplicates.reduce((sum, [_, count]) => sum + count - 1, 0);
    
    return {
        id: 'DUPLICATE_TRANSACTIONS',
        severity: 'P0',
        type: 'error',
        title: 'Duplicate Transaction IDs Found',
        description: `Found ${duplicates.length} transaction IDs appearing multiple times, totaling ${totalDuplicateCount} duplicate entries. This will inflate performance metrics.`,
        evidence: duplicates.slice(0, 5).map(([id, count]) => 
            `${id}: appears ${count} times`
        ),
        estimatedImpact: 'High - Overreports revenue and conversions',
        confidence: 'High',
        recommendedFix: '1. Implement deduplication at data source\n2. Use unique transaction IDs\n3. Check for multiple pixel fires\n4. Verify server-side tracking is not double-counting',
        fixSnippet: `// Deduplicate before analysis
const uniqueTransactions = new Map();
data.forEach(row => {
  if (!uniqueTransactions.has(row.transaction_id)) {
    uniqueTransactions.set(row.transaction_id, row);
  }
});`
    };
}

/**
 * Audit Rule 9: UTM inconsistencies
 */
function checkUtmInconsistencies(data, config) {
    const missingUtm = data.filter(row => 
        !row.utm_campaign || row.utm_campaign.trim() === ''
    );
    
    if (missingUtm.length === 0) return null;
    
    const percentage = (missingUtm.length / data.length * 100).toFixed(1);
    
    return {
        id: 'UTM_INCONSISTENCY',
        severity: 'P1',
        type: 'warning',
        title: 'Missing UTM Parameters',
        description: `${missingUtm.length} rows (${percentage}%) are missing UTM campaign parameters. This affects traffic source attribution.`,
        evidence: `${missingUtm.length} of ${data.length} rows missing utm_campaign`,
        estimatedImpact: 'Medium - Reduces ability to track campaign performance accurately',
        confidence: 'High',
        recommendedFix: '1. Set up UTM tracking for all campaigns\n2. Use UTM builder tools\n3. Create UTM naming conventions\n4. Configure auto-tagging where available',
        fixSnippet: `// UTM parameter format
?utm_source=meta&utm_medium=cpc&utm_campaign=summer_sale_2024&utm_content=video_ad_1`
    };
}

/**
 * Audit Rule 10: Large funnel drop-off
 */
function checkLargeFunnelDropoff(data, config) {
    const threshold = config.funnelDropoffThreshold;
    
    // Simulate funnel metrics
    const metrics = calculateMetrics();
    const avgCVR = metrics.totalImpressions > 0 ? 
        metrics.totalPurchases / metrics.totalClicks : 0;
    
    // Estimate checkout to purchase dropoff
    const estimatedCheckout = metrics.totalPurchases * 1.3;
    const dropoffRate = (estimatedCheckout - metrics.totalPurchases) / estimatedCheckout;
    
    if (dropoffRate < threshold) return null;
    
    return {
        id: 'FUNNEL_DROPOFF',
        severity: 'P1',
        type: 'warning',
        title: 'High Checkout Drop-off Rate',
        description: `Estimated ${(dropoffRate * 100).toFixed(1)}% drop-off between checkout initiation and purchase completion. This exceeds the ${(threshold * 100).toFixed(0)}% threshold.`,
        evidence: `Estimated checkout initiations: ${formatNumber(estimatedCheckout)}, Purchases: ${formatNumber(metrics.totalPurchases)}`,
        estimatedImpact: 'Medium - Revenue loss from abandoned checkouts',
        confidence: 'Medium',
        recommendedFix: '1. Simplify checkout process\n2. Add guest checkout option\n3. Display trust signals\n4. Implement abandoned cart emails\n5. Check for shipping cost shock',
        fixSnippet: null
    };
}

/**
 * Audit Rule 11: Insufficient sample size
 */
function checkInsufficientSampleSize(data, config) {
    const threshold = config.minConversions;
    const metrics = calculateMetrics();
    
    if (metrics.totalPurchases >= threshold) return null;
    
    return {
        id: 'INSUFFICIENT_SAMPLE',
        severity: 'P2',
        type: 'info',
        title: 'Limited Sample Size',
        description: `Total conversions (${metrics.totalPurchases}) are below the recommended minimum of ${threshold} for statistically significant insights.`,
        evidence: `Current conversions: ${metrics.totalPurchases}, Recommended: ${threshold}`,
        estimatedImpact: 'Low - Results may not be statistically significant',
        confidence: 'High',
        recommendedFix: '1. Continue collecting data before making major decisions\n2. Consider broader targeting to increase volume\n3. Be cautious about scaling based on limited data\n4. Use wider confidence intervals for analysis',
        fixSnippet: null
    };
}

/**
 * Audit Rule 12: Imbalanced budget allocation
 */
function checkImbalancedBudgetAllocation(data, config) {
    const threshold = config.budgetImbalanceThreshold;
    
    // Aggregate by ad creative
    const creatives = {};
    data.forEach(row => {
        const creative = row.ad || 'Unknown';
        if (!creatives[creative]) {
            creatives[creative] = { spend: 0, purchases: 0 };
        }
        creatives[creative].spend += row.spend;
        creatives[creative].purchases += row.purchases;
    });
    
    if (Object.keys(creatives).length < 2) return null;
    
    const totalSpend = Object.values(creatives).reduce((sum, c) => sum + c.spend, 0);
    const totalPurchases = Object.values(creatives).reduce((sum, c) => sum + c.purchases, 0);
    
    // Find if any creative has >70% spend but <30% conversions
    const imbalancedCreatives = Object.entries(creatives)
        .filter(([_, data]) => {
            const spendShare = data.spend / totalSpend;
            const convShare = totalPurchases > 0 ? data.purchases / totalPurchases : 0;
            return spendShare > threshold && convShare < 0.3;
        });
    
    if (imbalancedCreatives.length === 0) return null;
    
    return {
        id: 'BUDGET_IMBALANCE',
        severity: 'P1',
        type: 'warning',
        title: 'Imbalanced Budget Allocation',
        description: `${imbalancedCreatives.length} creatives consume >${(threshold * 100).toFixed(0)}% of budget but generate <30% of conversions.`,
        evidence: imbalancedCreatives.slice(0, 3).map(([name, data]) => {
            const spendShare = (data.spend / totalSpend * 100).toFixed(1);
            const convShare = totalPurchases > 0 ? (data.purchases / totalPurchases * 100).toFixed(1) : 0;
            return `${name}: ${spendShare}% spend, ${convShare}% conversions`;
        }),
        estimatedImpact: 'Medium - Budget not optimized for best performers',
        confidence: 'Medium',
        recommendedFix: '1. Reallocate budget to better-performing creatives\n2. Test new creative variations\n3. Use automated creative optimization\n4. Review creative messaging',
        fixSnippet: null
    };
}

/**
 * Audit Rule 13: Pixel not firing
 */
function checkPixelNotFiring(data, config) {
    const problematicRows = data.filter(row => 
        row.purchases > 0 && row.pixel_events === 0
    );
    
    if (problematicRows.length === 0) return null;
    
    return {
        id: 'PIXEL_NOT_FIRING',
        severity: 'P0',
        type: 'error',
        title: 'Pixel Events Not Recording',
        description: `${problematicRows.length} rows show purchases but zero pixel events. Your conversion pixel may not be firing correctly.`,
        evidence: problematicRows.slice(0, 5).map(r => 
            `${r.date}: ${r.purchases} purchases, ${r.pixel_events} pixel events`
        ),
        estimatedImpact: 'Critical - Platform cannot optimize for conversions',
        confidence: 'High',
        recommendedFix: '1. Check pixel helper tool for errors\n2. Verify pixel is installed on all pages\n3. Check for JavaScript errors\n4. Test with Facebook Events Manager\n5. Consider implementing Conversions API',
        fixSnippet: `<!-- Verify pixel is loaded -->
<script>
  if (typeof fbq === 'function') {
    console.log('Pixel loaded correctly');
  } else {
    console.error('Pixel not loaded!');
  }
</script>`
    };
}

/**
 * Audit Rule 14: Page speed warning
 */
function checkPageSpeed(data, config) {
    const threshold = config.pageSpeedThreshold;
    
    const slowPages = data.filter(row => 
        row.page_load_time > threshold
    );
    
    if (slowPages.length === 0) return null;
    
    const avgLoadTime = slowPages.reduce((sum, r) => sum + r.page_load_time, 0) / slowPages.length;
    
    return {
        id: 'PAGE_SPEED',
        severity: 'P1',
        type: 'warning',
        title: 'Slow Page Load Times',
        description: `${slowPages.length} landing pages have load times exceeding ${threshold}s. Average: ${avgLoadTime.toFixed(1)}s. Slow pages hurt conversion rates.`,
        evidence: slowPages.slice(0, 5).map(r => 
            `${r.campaign}: ${r.page_load_time.toFixed(1)}s load time`
        ),
        estimatedImpact: 'Medium - Every second delay reduces conversions ~7%',
        confidence: 'High',
        recommendedFix: '1. Optimize images (WebP format, compression)\n2. Minimize JavaScript\n3. Use CDN for static assets\n4. Enable browser caching\n5. Consider lazy loading\n6. Use PageSpeed Insights for specific recommendations',
        fixSnippet: `<!-- Lazy load images -->
<img loading="lazy" src="image.jpg" alt="...">`
    };
}

/**
 * Audit Rule 15: Ad copy policy flags
 */
function checkAdCopyFlags(data, config) {
    // Basic regex patterns for potentially problematic content
    const patterns = [
        { name: 'Guarantee claims', pattern: /\b(guarantee|guaranteed)\s+(results|success|income|profit)\b/i },
        { name: 'Urgency manipulation', pattern: /\b(limited time|act now|don\'t wait|hurry)\b.*\b(buy|purchase|order)\b/i },
        { name: 'Income claims', pattern: /\$\d+.*?(day|week|month|year).*?(guaranteed|easy|simple)\b/i }
    ];
    
    const flaggedAds = [];
    
    data.forEach(row => {
        if (!row.ad_copy) return;
        
        patterns.forEach(({ name, pattern }) => {
            if (pattern.test(row.ad_copy)) {
                flaggedAds.push({ campaign: row.campaign, ad: row.ad, issue: name });
            }
        });
    });
    
    if (flaggedAds.length === 0) return null;
    
    return {
        id: 'AD_COPY_FLAGS',
        severity: 'P2',
        type: 'info',
        title: 'Ad Copy Policy Considerations',
        description: `${flaggedAds.length} ads contain content that may need review for platform policy compliance.`,
        evidence: flaggedAds.slice(0, 5).map(f => 
            `${f.campaign} - ${f.ad}: ${f.issue}`
        ),
        estimatedImpact: 'Low - Informational only, manual review recommended',
        confidence: 'Low',
        recommendedFix: '1. Review flagged ad copy manually\n2. Ensure claims are substantiated\n3. Avoid misleading urgency language\n4. Check platform-specific ad policies\n5. Consider A/B testing alternative copy',
        fixSnippet: null
    };
}

/**
 * Display audit findings
 */
function displayFindings() {
    const container = document.getElementById('findings-list');
    if (!container) return;
    
    if (AppState.findings.length === 0) {
        container.innerHTML = `
            <div class="no-findings">
                <div class="no-findings-icon">✅</div>
                <h4>No Issues Found</h4>
                <p>Your campaign data looks healthy! All audit checks passed.</p>
            </div>
        `;
        return;
    }
    
    // Sort by severity
    const sorted = [...AppState.findings].sort((a, b) => {
        const severityOrder = { P0: 0, P1: 1, P2: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
    });
    
    container.innerHTML = sorted.map((finding, index) => `
        <article class="finding-card" data-id="${finding.id}">
            <div class="finding-header" onclick="toggleFinding(${index})">
                <div class="finding-severity ${finding.severity}">${finding.severity}</div>
                <div class="finding-info">
                    <h4 class="finding-title">${escapeHtml(finding.title)}</h4>
                    <span class="finding-type ${finding.type}">${finding.type}</span>
                </div>
                <svg class="finding-toggle" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </div>
            <div class="finding-body">
                <p class="finding-description">${escapeHtml(finding.description)}</p>
                ${finding.evidence ? `
                    <div class="finding-evidence">
                        <strong>Evidence:</strong>
                        ${Array.isArray(finding.evidence) 
                            ? finding.evidence.map(e => `<div>${escapeHtml(e)}</div>`).join('') 
                            : escapeHtml(finding.evidence)}
                    </div>
                ` : ''}
                <div class="finding-impact">
                    <div class="impact-item">
                        <span class="impact-label">Impact</span>
                        <span class="impact-value">${escapeHtml(finding.estimatedImpact)}</span>
                    </div>
                    <div class="impact-item">
                        <span class="impact-label">Confidence</span>
                        <span class="impact-value">${escapeHtml(finding.confidence)}</span>
                    </div>
                </div>
                <div class="finding-fix">
                    <h4>Recommended Fix</h4>
                    <p>${escapeHtml(finding.recommendedFix).replace(/\n/g, '<br>')}</p>
                    ${finding.fixSnippet ? `
                        <pre class="fix-snippet"><code>${escapeHtml(finding.fixSnippet)}</code></pre>
                    ` : ''}
                    <div class="finding-actions">
                        <button class="btn btn-sm btn-outline" onclick="copyFix(${index})">
                            Copy Quick-Fix
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="markFixed('${finding.id}')">
                            Mark as Fixed
                        </button>
                    </div>
                </div>
            </div>
        </article>
    `).join('');
}

/**
 * Toggle finding expansion
 * @param {number} index - Finding index
 */
function toggleFinding(index) {
    const cards = document.querySelectorAll('.finding-card');
    cards[index]?.classList.toggle('expanded');
}

/**
 * Copy fix snippet to clipboard
 * @param {number} index - Finding index
 */
function copyFix(index) {
    const finding = AppState.findings[index];
    const text = finding.recommendedFix + (finding.fixSnippet ? '\n\n' + finding.fixSnippet : '');
    
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard!', 'success');
    }).catch(() => {
        showToast('Failed to copy', 'error');
    });
}

/**
 * Mark finding as fixed
 * @param {string} id - Finding ID
 */
function markFixed(id) {
    AppState.fixedFindings.add(id);
    showToast('Finding marked as fixed. Re-run audit to update.', 'success');
}

// ============================================
// Export Functions
// ============================================

/**
 * Initialize export buttons
 */
function initExportButtons() {
    // Export JSON
    document.getElementById('export-json-btn')?.addEventListener('click', exportJson);
    
    // Export PDF
    document.getElementById('export-pdf-btn')?.addEventListener('click', exportPdf);
    
    // Share snapshot
    document.getElementById('share-snapshot-btn')?.addEventListener('click', shareSnapshot);
    
    // Rerun audit
    document.getElementById('rerun-audit-btn')?.addEventListener('click', () => {
        if (AppState.dataset.length > 0) {
            runAudit();
            showToast('Audit re-run complete', 'success');
        }
    });
}

/**
 * Export audit results as JSON
 */
function exportJson() {
    const exportData = {
        exportDate: new Date().toISOString(),
        summary: calculateMetrics(),
        config: AppState.config,
        findings: AppState.findings,
        dataset: AppState.dataset
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    showToast('JSON exported successfully', 'success');
}

/**
 * Export audit results as PDF
 */
function exportPdf() {
    if (typeof html2pdf === 'undefined') {
        showToast('PDF export library not loaded', 'error');
        return;
    }
    
    showToast('Generating PDF...', 'success');
    
    // Create PDF content
    const pdfContent = document.createElement('div');
    pdfContent.className = 'pdf-export';
    pdfContent.innerHTML = `
        <div style="padding: 40px; font-family: Arial, sans-serif; color: #111;">
            <h1 style="color: #0E7C86; margin-bottom: 10px;">Campaign Audit Report</h1>
            <p style="color: #666; margin-bottom: 30px;">Generated: ${new Date().toLocaleString()}</p>
            
            <h2 style="color: #333; border-bottom: 2px solid #0E7C86; padding-bottom: 10px;">Summary</h2>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px;">
                ${Object.entries(calculateMetrics()).map(([key, value]) => `
                    <div style="padding: 15px; background: #f5f5f5; border-radius: 8px;">
                        <strong style="color: #666; font-size: 12px; text-transform: uppercase;">${key}</strong>
                        <div style="font-size: 20px; font-weight: bold; color: #111;">${typeof value === 'number' ? value.toFixed(2) : value}</div>
                    </div>
                `).join('')}
            </div>
            
            <h2 style="color: #333; border-bottom: 2px solid #0E7C86; padding-bottom: 10px;">Audit Findings</h2>
            <div style="margin-bottom: 20px;">
                ${AppState.findings.map(f => `
                    <div style="padding: 15px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 8px; border-left: 4px solid ${f.severity === 'P0' ? '#EF4444' : f.severity === 'P1' ? '#F59E0B' : '#3B82F6'};">
                        <h3 style="margin: 0 0 10px 0; color: #111;">${f.title}</h3>
                        <p style="margin: 0 0 10px 0; color: #666;">${f.description}</p>
                        <p style="margin: 0; font-size: 12px; color: #888;"><strong>Fix:</strong> ${f.recommendedFix.substring(0, 200)}...</p>
                    </div>
                `).join('')}
            </div>
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #888; font-size: 12px;">
                <p>Data processed locally in your browser. No data was uploaded to external servers.</p>
            </div>
        </div>
    `;
    
    const opt = {
        margin: 10,
        filename: `audit-report-${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(pdfContent).save().then(() => {
        showToast('PDF exported successfully', 'success');
    });
}

/**
 * Share audit snapshot via URL
 */
function shareSnapshot() {
    const snapshot = {
        summary: calculateMetrics(),
        findingCount: AppState.findings.length,
        topIssues: AppState.findings.slice(0, 3).map(f => ({
            title: f.title,
            severity: f.severity
        }))
    };
    
    const encoded = btoa(JSON.stringify(snapshot));
    const shareUrl = `${window.location.origin}${window.location.pathname}#audit=${encoded}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
        showToast('Share URL copied to clipboard!', 'success');
    }).catch(() => {
        showToast('Failed to copy URL', 'error');
    });
}

// ============================================
// Modal & Project Details
// ============================================

/**
 * Initialize project modals
 */
function initProjectModals() {
    const modal = document.getElementById('project-modal');
    const modalBody = document.getElementById('modal-body');
    const modalTitle = document.getElementById('modal-title');
    const closeBtn = modal?.querySelector('.modal-close');
    const backdrop = modal?.querySelector('.modal-backdrop');
    
    const projectDetails = {
        1: {
            title: 'Fashion Brand Scale: $50K to $500K/month',
            client: 'Sustainable Fashion Brand',
            period: '8 months',
            overview: 'This project involved scaling a sustainable fashion brand from $50K to $500K in monthly revenue while maintaining profitability. The key challenge was achieving scale without sacrificing ROAS.',
            strategy: [
                'Implemented creative testing framework with 3 new ads per week',
                'Built custom audience segments based on LTV data',
                'Developed lookalike audiences from best customers',
                'Restructured campaign architecture for scaling efficiency'
            ],
            results: {
                roas: '4.2x',
                cpaReduction: '-42%',
                revenueGrowth: '10x',
                breakeven: 'Achieved in Month 2'
            },
            testimonial: '"Their systematic approach to scaling transformed our business. We finally have predictable, profitable growth."'
        },
        2: {
            title: 'Beauty Brand Profitability Turnaround',
            client: 'DTC Beauty Subscription',
            period: '6 months',
            overview: 'A beauty subscription brand was losing money on paid acquisition with 0.8x ROAS. Through creative optimization and audience restructuring, we turned them profitable.',
            strategy: [
                'Audited existing campaigns to identify waste',
                'Developed UGC creative strategy',
                'Implemented proper attribution tracking',
                'Built retention-focused audience segments'
            ],
            results: {
                roas: '3.5x',
                cpaReduction: '-58%',
                ltvIncrease: '+180%',
                churnReduction: '-25%'
            },
            testimonial: '"We went from burning cash to profitable growth in just 3 months. The transformation was incredible."'
        },
        3: {
            title: 'Global Expansion: 3 Markets Launch',
            client: 'Health & Wellness Brand',
            period: '3 months',
            overview: 'Successfully launched a wellness brand in UK, Canada, and Australia simultaneously, achieving positive ROAS within 30 days in each market.',
            strategy: [
                'Localized creative for each market',
                'Built region-specific audiences',
                'Implemented currency-aware bidding',
                'Established local fulfillment partnerships'
            ],
            results: {
                roas: '2.8x',
                markets: '3',
                q1Revenue: '$1.2M',
                newCustomers: '15,000+'
            },
            testimonial: '"Expanding internationally seemed daunting, but their expertise made it feel seamless."'
        },
        4: {
            title: 'B2B SaaS Lead Generation',
            client: 'Enterprise SaaS Company',
            period: 'Ongoing',
            overview: 'Built a comprehensive lead generation engine for a B2B SaaS company, combining LinkedIn and Google Ads to reduce customer acquisition costs.',
            strategy: [
                'Developed account-based marketing approach',
                'Created high-intent keyword strategy',
                'Built lead scoring integration',
                'Implemented offline conversion tracking'
            ],
            results: {
                cacReduction: '-65%',
                mqls: '2x increase',
                leadCost: '$85',
                sqlRate: '+40%'
            },
            testimonial: '"Our sales team now has more qualified leads than they can handle. Quality dramatically improved."'
        },
        5: {
            title: 'Custom Analytics Dashboard',
            client: 'Multi-brand E-commerce Group',
            period: '2 months development',
            overview: 'Built a custom attribution dashboard integrating data from Meta, Google, TikTok, and Shopify to provide unified performance visibility.',
            strategy: [
                'Integrated 5 data sources via APIs',
                'Built custom attribution model',
                'Implemented real-time data syncing',
                'Created automated reporting workflows'
            ],
            results: {
                integrations: '5',
                updateTime: 'Real-time',
                reportTime: '-40%',
                accuracy: '+25%'
            },
            testimonial: '"Finally, we have a single source of truth for all our marketing data. Game changer."'
        }
    };
    
    // Project card click handlers
    document.querySelectorAll('.view-project-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const projectId = btn.getAttribute('data-project');
            const project = projectDetails[projectId];
            
            if (project) {
                modalTitle.textContent = project.title;
                modalBody.innerHTML = `
                    <div class="project-detail">
                        <div class="project-meta">
                            <span><strong>Client:</strong> ${project.client}</span>
                            <span><strong>Period:</strong> ${project.period}</span>
                        </div>
                        
                        <section class="project-section">
                            <h4>Overview</h4>
                            <p>${project.overview}</p>
                        </section>
                        
                        <section class="project-section">
                            <h4>Strategy</h4>
                            <ul>
                                ${project.strategy.map(s => `<li>${s}</li>`).join('')}
                            </ul>
                        </section>
                        
                        <section class="project-section">
                            <h4>Results</h4>
                            <div class="results-grid">
                                ${Object.entries(project.results).map(([key, value]) => `
                                    <div class="result-item">
                                        <span class="result-value">${value}</span>
                                        <span class="result-label">${key}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </section>
                        
                        <blockquote class="project-testimonial">
                            ${project.testimonial}
                        </blockquote>
                    </div>
                `;
                
                modal.hidden = false;
                document.body.style.overflow = 'hidden';
            }
        });
    });
    
    // Close modal
    const closeModal = () => {
        modal.hidden = true;
        document.body.style.overflow = '';
    };
    
    closeBtn?.addEventListener('click', closeModal);
    backdrop?.addEventListener('click', closeModal);
    
    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal?.hidden) {
            closeModal();
        }
    });
}

// ============================================
// Contact Form
// ============================================

/**
 * Initialize contact form
 */
function initContactForm() {
    const form = document.getElementById('contact-form');
    
    form?.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // In production, this would send to a backend
        showToast('Form submitted successfully! (Demo mode)', 'success');
        form.reset();
    });
}

// ============================================
// Utility Functions for Footer
// ============================================

/**
 * Set current year in footer
 */
function setCurrentYear() {
    const yearEl = document.getElementById('current-year');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }
}

// ============================================
// Unit Test Mode
// ============================================

/**
 * Run lightweight unit tests against sample datasets
 * Call with: runTests() in console
 */
function runTests() {
    console.log('🧪 Running Unit Tests...\n');
    
    const tests = [];
    
    // Test 1: Missing conversions detection
    const testData1 = [
        { date: '2024-01-01', spend: 100, revenue: 500, purchases: 0, clicks: 100, impressions: 1000 }
    ];
    const result1 = checkMissingConversions(testData1, AppState.config);
    tests.push({
        name: 'Missing Conversions Detection',
        pass: result1 !== null && result1.id === 'MISSING_CONVERSIONS',
        expected: 'Finding should be returned',
        actual: result1 ? 'Finding returned' : 'No finding'
    });
    
    // Test 2: Event mismatch detection
    const testData2 = [
        { date: '2024-01-01', spend: 100, revenue: 500, purchases: 5, clicks: 100, impressions: 1000, pixel_events: 10, server_events: 2 }
    ];
    const result2 = checkEventMismatch(testData2, AppState.config);
    tests.push({
        name: 'Event Mismatch Detection',
        pass: result2 !== null && result2.id === 'EVENT_MISMATCH',
        expected: 'Finding should be returned for >25% mismatch',
        actual: result2 ? 'Finding returned' : 'No finding'
    });
    
    // Test 3: Low ROAS detection
    const testData3 = [
        { date: '2024-01-01', campaign: 'Test', spend: 1000, revenue: 1000, purchases: 10, clicks: 500, impressions: 10000 }
    ];
    const result3 = checkLowRoas(testData3, { ...AppState.config, roasThreshold: 1.5 });
    tests.push({
        name: 'Low ROAS Detection',
        pass: result3 !== null && result3.id === 'LOW_ROAS',
        expected: 'Finding should be returned for ROAS < 1.5x',
        actual: result3 ? 'Finding returned' : 'No finding'
    });
    
    // Test 4: Duplicate transaction detection
    const testData4 = [
        { date: '2024-01-01', transaction_id: 'TXN001', spend: 100, revenue: 500, purchases: 5 },
        { date: '2024-01-02', transaction_id: 'TXN001', spend: 100, revenue: 500, purchases: 5 }
    ];
    const result4 = checkDuplicateTransactions(testData4, AppState.config);
    tests.push({
        name: 'Duplicate Transaction Detection',
        pass: result4 !== null && result4.id === 'DUPLICATE_TRANSACTIONS',
        expected: 'Finding should be returned for duplicate IDs',
        actual: result4 ? 'Finding returned' : 'No finding'
    });
    
    // Test 5: Currency formatting
    tests.push({
        name: 'Currency Formatting',
        pass: formatCurrency(1234.56) === '$1,235',
        expected: '$1,235',
        actual: formatCurrency(1234.56)
    });
    
    // Test 6: Percent formatting
    tests.push({
        name: 'Percent Formatting',
        pass: formatPercent(0.156) === '15.6%',
        expected: '15.6%',
        actual: formatPercent(0.156)
    });
    
    // Test 7: HTML escaping
    tests.push({
        name: 'HTML Escaping',
        pass: escapeHtml('<script>') === '&lt;script&gt;',
        expected: '&lt;script&gt;',
        actual: escapeHtml('<script>')
    });
    
    // Test 8: Normalize data row
    const rawRow = { Spend: 100, Revenue: 500, Purchases: 5 };
    const normalized = normalizeDataRow(rawRow);
    tests.push({
        name: 'Data Normalization',
        pass: normalized.spend === 100 && normalized.revenue === 500 && normalized.purchases === 5,
        expected: 'Spend=100, Revenue=500, Purchases=5',
        actual: `Spend=${normalized.spend}, Revenue=${normalized.revenue}, Purchases=${normalized.purchases}`
    });
    
    // Print results
    const passed = tests.filter(t => t.pass).length;
    const total = tests.length;
    
    console.log('📊 Test Results:');
    console.log('================\n');
    
    tests.forEach((test, i) => {
        const icon = test.pass ? '✅' : '❌';
        console.log(`${icon} Test ${i + 1}: ${test.name}`);
        if (!test.pass) {
            console.log(`   Expected: ${test.expected}`);
            console.log(`   Actual: ${test.actual}`);
        }
    });
    
    console.log(`\n📈 Summary: ${passed}/${total} tests passed`);
    
    return { passed, total, tests };
}

// Expose test function globally
window.runTests = runTests;

// ============================================
// Initialization
// ============================================

/**
 * Initialize all functionality when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    // Theme & Navigation
    initTheme();
    initNavigation();
    initBackToTop();
    initScrollAnimations();
    
    // Dashboard
    initDashboardTabs();
    initSettingsPanel();
    initManualForm();
    initCsvUpload();
    initJsonInput();
    initSampleData();
    initExportButtons();
    
    // Other sections
    initProjectModals();
    initContactForm();
    setCurrentYear();
    
    // Theme toggle button
    document.querySelector('.theme-toggle')?.addEventListener('click', toggleTheme);
    
    // Check for shared audit in URL hash
    const hash = window.location.hash;
    if (hash.startsWith('#audit=')) {
        try {
            const snapshot = JSON.parse(atob(hash.replace('#audit=', '')));
            console.log('Loaded shared audit snapshot:', snapshot);
            showToast('Shared audit snapshot loaded', 'success');
        } catch (e) {
            console.warn('Could not parse shared audit');
        }
    }
    
    console.log('📊 Media Buyer Portfolio initialized');
    console.log('💡 Tip: Run runTests() in console to execute unit tests');
});

// Make key functions available globally
window.toggleFinding = toggleFinding;
window.copyFix = copyFix;
window.markFixed = markFixed;
