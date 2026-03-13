/**
 * Admin Panel JavaScript
 * Media Buyer Portfolio
 * 
 * Features:
 * - Netlify Identity authentication
 * - Content management (CRUD)
 * - Design token editor
 * - Audit rule builder
 * - WhatsApp button configuration
 * - Version history
 * - Import/Export
 */

'use strict';

// ============================================
// Admin State
// ============================================
const AdminState = {
    // Authentication
    user: null,
    role: 'viewer', // admin, editor, viewer
    
    // Content
    siteContent: null,
    designTokens: null,
    auditConfig: null,
    
    // UI State
    currentPanel: 'dashboard',
    hasUnsavedChanges: false,
    
    // Undo/Redo
    history: [],
    historyIndex: -1,
    maxHistory: 20,
    
    // Auto-save
    autoSaveTimer: null,
    autoSaveInterval: 15000 // 15 seconds
};

// ============================================
// Utility Functions
// ============================================
function showToast(message, type = 'info') {
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

function showScreen(screenId) {
    document.getElementById('loading-screen').hidden = true;
    document.getElementById('login-screen').hidden = screenId !== 'login';
    document.getElementById('admin-app').hidden = screenId !== 'app';
}

function generateId() {
    return 'id-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================
// Authentication
// ============================================
function initAuth() {
    // Check for Netlify Identity
    if (typeof netlifyIdentity !== 'undefined') {
        netlifyIdentity.on('init', user => {
            if (user) {
                handleLogin(user);
            } else {
                showScreen('login');
            }
        });
        
        netlifyIdentity.on('login', user => {
            handleLogin(user);
            netlifyIdentity.close();
        });
        
        netlifyIdentity.on('logout', () => {
            AdminState.user = null;
            showScreen('login');
        });
    } else {
        // Dev mode - show login screen
        showScreen('login');
        console.log('Netlify Identity not available - using dev mode');
    }
    
    // Login button handlers
    document.getElementById('login-btn')?.addEventListener('click', () => {
        if (typeof netlifyIdentity !== 'undefined') {
            netlifyIdentity.open();
        } else {
            showToast('Netlify Identity not configured', 'error');
        }
    });
    
    document.getElementById('dev-login-btn')?.addEventListener('click', () => {
        handleDevLogin();
    });
    
    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        if (typeof netlifyIdentity !== 'undefined') {
            netlifyIdentity.logout();
        } else {
            AdminState.user = null;
            showScreen('login');
        }
    });
}

function handleLogin(user) {
    AdminState.user = user;
    AdminState.role = 'admin'; // Default to admin for logged-in users
    
    // Update UI
    const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin';
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    
    document.getElementById('user-initials').textContent = initials;
    document.getElementById('user-name').textContent = name;
    document.getElementById('user-email').textContent = user.email;
    document.getElementById('user-role').textContent = AdminState.role.charAt(0).toUpperCase() + AdminState.role.slice(1);
    
    showScreen('app');
    loadAllContent();
}

function handleDevLogin() {
    AdminState.user = {
        email: 'dev@localhost',
        user_metadata: { full_name: 'Dev Admin' }
    };
    AdminState.role = 'admin';
    
    document.getElementById('user-initials').textContent = 'DA';
    document.getElementById('user-name').textContent = 'Dev Admin';
    document.getElementById('user-email').textContent = 'dev@localhost';
    document.getElementById('user-role').textContent = 'Administrator';
    
    showScreen('app');
    loadAllContent();
}

// ============================================
// Content Loading
// ============================================
async function loadAllContent() {
    try {
        // Load all content files
        const [siteContent, designTokens, auditConfig] = await Promise.all([
            fetchJSON('data/site-content.json'),
            fetchJSON('data/design-tokens.json'),
            fetchJSON('data/audit-config.json')
        ]);
        
        AdminState.siteContent = siteContent;
        AdminState.designTokens = designTokens;
        AdminState.auditConfig = auditConfig;
        
        // Initialize all panels
        initDashboard();
        initSectionsPanel();
        initProjectsPanel();
        initDesignPanel();
        initWhatsAppPanel();
        initAuditConfigPanel();
        initRulesPanel();
        initFormulasPanel();
        initSiteSettingsPanel();
        
        console.log('All content loaded');
    } catch (error) {
        console.error('Error loading content:', error);
        showToast('Error loading content: ' + error.message, 'error');
    }
}

async function fetchJSON(path) {
    const response = await fetch(path);
    if (!response.ok) {
        throw new Error(`Failed to load ${path}`);
    }
    return response.json();
}

// ============================================
// Navigation
// ============================================
function initNavigation() {
    // Sidebar toggle
    document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('collapsed');
    });
    
    // Nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const panel = link.getAttribute('data-panel');
            switchPanel(panel);
        });
    });
    
    // User menu
    document.getElementById('user-menu-btn')?.addEventListener('click', () => {
        document.getElementById('user-dropdown').hidden = !document.getElementById('user-dropdown').hidden;
    });
    
    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.header-user')) {
            document.getElementById('user-dropdown').hidden = true;
        }
    });
}

function switchPanel(panelId) {
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.getAttribute('data-panel') === panelId);
    });
    
    // Update panels
    document.querySelectorAll('.admin-panel').forEach(panel => {
        panel.hidden = panel.id !== `panel-${panelId}`;
    });
    
    AdminState.currentPanel = panelId;
    
    // Close sidebar on mobile
    document.getElementById('sidebar').classList.remove('open');
}

// ============================================
// Dashboard
// ============================================
function initDashboard() {
    // Update stats
    document.getElementById('stat-pending').textContent = '0';
    document.getElementById('stat-published').textContent = '1';
    document.getElementById('stat-assets').textContent = '0';
    document.getElementById('stat-rules').textContent = AdminState.auditConfig?.rules?.length || 15;
    
    // Quick actions
    document.querySelectorAll('.quick-action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.getAttribute('data-action');
            handleQuickAction(action);
        });
    });
}

function handleQuickAction(action) {
    switch (action) {
        case 'new-section':
            switchPanel('sections');
            break;
        case 'new-project':
            switchPanel('projects');
            break;
        case 'upload-asset':
            switchPanel('media');
            break;
        case 'run-audit':
            window.open('index.html#dashboard', '_blank');
            break;
    }
}

// ============================================
// Sections Panel
// ============================================
function initSectionsPanel() {
    const sectionsList = document.getElementById('sections-list');
    if (!sectionsList || !AdminState.siteContent) return;
    
    renderSectionsList();
    
    document.getElementById('add-section-btn')?.addEventListener('click', () => {
        showToast('Section editor coming soon', 'info');
    });
}

function renderSectionsList() {
    const sectionsList = document.getElementById('sections-list');
    if (!sectionsList || !AdminState.siteContent?.sections) return;
    
    sectionsList.innerHTML = AdminState.siteContent.sections.map((section, index) => `
        <div class="section-item" data-id="${section.id}" draggable="true">
            <div class="section-drag-handle">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6"></line>
                    <line x1="8" y1="12" x2="21" y2="12"></line>
                    <line x1="8" y1="18" x2="21" y2="18"></line>
                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
            </div>
            <div class="section-info">
                <div class="section-name">${escapeHtml(section.title || section.id)}</div>
                <div class="section-meta">Order: ${section.order} • ${section.enabled ? 'Enabled' : 'Disabled'}</div>
            </div>
            <div class="section-actions">
                <button class="btn btn-sm btn-outline edit-section-btn" data-id="${section.id}">Edit</button>
                <label class="toggle-label">
                    <input type="checkbox" class="toggle-input section-toggle" data-id="${section.id}" ${section.enabled ? 'checked' : ''}>
                    <span class="toggle-switch"></span>
                </label>
            </div>
        </div>
    `).join('');
    
    // Toggle handlers
    sectionsList.querySelectorAll('.section-toggle').forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            const id = e.target.getAttribute('data-id');
            const section = AdminState.siteContent.sections.find(s => s.id === id);
            if (section) {
                section.enabled = e.target.checked;
                markUnsaved();
            }
        });
    });
    
    // Edit handlers
    sectionsList.querySelectorAll('.edit-section-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            showToast('Section editor coming soon', 'info');
        });
    });
    
    // Drag and drop
    initDragAndDrop(sectionsList, (newOrder) => {
        newOrder.forEach((id, index) => {
            const section = AdminState.siteContent.sections.find(s => s.id === id);
            if (section) section.order = index;
        });
        markUnsaved();
    });
}

// ============================================
// Projects Panel
// ============================================
function initProjectsPanel() {
    renderProjectsGrid();
    
    document.getElementById('add-project-btn')?.addEventListener('click', () => {
        showToast('Project editor coming soon', 'info');
    });
}

function renderProjectsGrid() {
    const grid = document.getElementById('projects-grid');
    if (!grid || !AdminState.siteContent?.sections) return;
    
    const projectsSection = AdminState.siteContent.sections.find(s => s.id === 'projects');
    const projects = projectsSection?.blocks || [];
    
    grid.innerHTML = projects.map(project => `
        <div class="project-card-admin" data-id="${project.id}">
            <div class="card-header">
                <span class="project-category">${escapeHtml(project.category || '')}</span>
                <h4>${escapeHtml(project.title)}</h4>
            </div>
            <div class="card-body">
                <p>${escapeHtml(project.description || '')}</p>
                <div class="project-metrics">
                    ${(project.metrics || []).map(m => `
                        <span class="metric"><strong>${m.value}</strong> ${m.label}</span>
                    `).join(' • ')}
                </div>
            </div>
            <div class="card-footer">
                <button class="btn btn-sm btn-outline edit-project-btn" data-id="${project.id}">Edit</button>
                <button class="btn btn-sm btn-danger delete-project-btn" data-id="${project.id}">Delete</button>
            </div>
        </div>
    `).join('');
}

// ============================================
// Design Tokens Panel
// ============================================
function initDesignPanel() {
    renderDesignTokens();
    
    document.getElementById('reset-design-btn')?.addEventListener('click', () => {
        if (confirm('Reset all design tokens to defaults?')) {
            loadAllContent().then(() => {
                renderDesignTokens();
                applyDesignTokens();
                showToast('Design tokens reset', 'success');
            });
        }
    });
    
    document.getElementById('save-preset-btn')?.addEventListener('click', () => {
        showToast('Preset feature coming soon', 'info');
    });
}

function renderDesignTokens() {
    const colorsGrid = document.getElementById('colors-grid');
    const typographyGrid = document.getElementById('typography-grid');
    const spacingGrid = document.getElementById('spacing-grid');
    
    if (!AdminState.designTokens) return;
    
    // Colors
    if (colorsGrid && AdminState.designTokens.colors) {
        colorsGrid.innerHTML = Object.entries(AdminState.designTokens.colors).map(([key, value]) => `
            <div class="token-item">
                <label>${formatLabel(key)}</label>
                <input type="color" value="${value.value || value}" data-token="colors.${key}" class="color-token-input">
            </div>
        `).join('');
        
        colorsGrid.querySelectorAll('.color-token-input').forEach(input => {
            input.addEventListener('change', handleTokenChange);
        });
    }
    
    // Typography
    if (typographyGrid && AdminState.designTokens.typography) {
        typographyGrid.innerHTML = `
            <div class="token-item">
                <label>Heading Font</label>
                <input type="text" value="${AdminState.designTokens.typography.headingFont?.value || 'Poppins'}" data-token="typography.headingFont" class="form-input">
            </div>
            <div class="token-item">
                <label>Body Font</label>
                <input type="text" value="${AdminState.designTokens.typography.fontFamily?.value || 'Inter'}" data-token="typography.fontFamily" class="form-input">
            </div>
            <div class="token-item">
                <label>Base Font Size</label>
                <input type="text" value="${AdminState.designTokens.typography.fontSizes?.base || '1rem'}" data-token="typography.fontSizes.base" class="form-input">
            </div>
        `;
        
        typographyGrid.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', handleTokenChange);
        });
    }
    
    // Spacing
    if (spacingGrid && AdminState.designTokens.spacing) {
        spacingGrid.innerHTML = `
            <div class="token-item">
                <label>Container Max Width</label>
                <input type="text" value="${AdminState.designTokens.spacing?.containerMax || '1280px'}" data-token="spacing.containerMax" class="form-input">
            </div>
        `;
    }
}

function handleTokenChange(e) {
    const tokenPath = e.target.getAttribute('data-token');
    const value = e.target.value;
    
    // Update local state
    const parts = tokenPath.split('.');
    let obj = AdminState.designTokens;
    for (let i = 0; i < parts.length - 1; i++) {
        obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = value;
    
    // Apply to preview
    applyDesignTokens();
    markUnsaved();
}

function applyDesignTokens() {
    if (!AdminState.designTokens?.colors) return;
    
    Object.entries(AdminState.designTokens.colors).forEach(([key, value]) => {
        const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
        document.documentElement.style.setProperty(cssVar, value.value || value);
    });
}

// ============================================
// WhatsApp Panel
// ============================================
function initWhatsAppPanel() {
    const config = AdminState.siteContent?.whatsappButton || {};
    
    // Set initial values
    document.getElementById('wa-enabled').checked = config.enabled || false;
    document.getElementById('wa-phone').value = config.phoneNumber || '';
    document.getElementById('wa-position').value = config.position || 'bottom-right';
    document.getElementById('wa-size').value = config.size || 'medium';
    document.getElementById('wa-color').value = config.themeColor || '#25D366';
    document.getElementById('wa-zindex').value = config.zIndex || 9999;
    document.getElementById('wa-pulse').checked = config.pulse !== false;
    document.getElementById('wa-pulse-color').value = config.pulseColor || '#25D366';
    document.getElementById('wa-pulse-speed').value = config.pulseSpeed || 1.8;
    document.getElementById('wa-mobile').checked = config.visibleOnMobile !== false;
    document.getElementById('wa-desktop').checked = config.visibleOnDesktop !== false;
    document.getElementById('wa-message').value = config.prefilledMessage || '';
    
    // Add change handlers
    const inputs = document.querySelectorAll('.whatsapp-config input, .whatsapp-config select, .whatsapp-config textarea');
    inputs.forEach(input => {
        input.addEventListener('change', updateWhatsAppConfig);
    });
    
    updateWhatsAppPreview();
}

function updateWhatsAppConfig() {
    if (!AdminState.siteContent) return;
    
    AdminState.siteContent.whatsappButton = {
        enabled: document.getElementById('wa-enabled').checked,
        phoneNumber: document.getElementById('wa-phone').value,
        position: document.getElementById('wa-position').value,
        size: document.getElementById('wa-size').value,
        themeColor: document.getElementById('wa-color').value,
        zIndex: parseInt(document.getElementById('wa-zindex').value) || 9999,
        pulse: document.getElementById('wa-pulse').checked,
        pulseColor: document.getElementById('wa-pulse-color').value,
        pulseSpeed: parseFloat(document.getElementById('wa-pulse-speed').value) || 1.8,
        visibleOnMobile: document.getElementById('wa-mobile').checked,
        visibleOnDesktop: document.getElementById('wa-desktop').checked,
        prefilledMessage: document.getElementById('wa-message').value
    };
    
    updateWhatsAppPreview();
    markUnsaved();
}

function updateWhatsAppPreview() {
    const preview = document.querySelector('.wa-btn-preview');
    if (!preview) return;
    
    const config = AdminState.siteContent?.whatsappButton || {};
    
    preview.style.background = config.themeColor || '#25D366';
    preview.style.width = config.size === 'large' ? '64px' : config.size === 'small' ? '48px' : '56px';
    preview.style.height = config.size === 'large' ? '64px' : config.size === 'small' ? '48px' : '56px';
    
    // Update position
    const container = document.querySelector('.wa-preview-phone');
    if (container) {
        preview.style.right = config.position === 'bottom-left' ? 'auto' : '20px';
        preview.style.left = config.position === 'bottom-left' ? '20px' : 'auto';
    }
}

// ============================================
// Audit Config Panel
// ============================================
function initAuditConfigPanel() {
    const grid = document.getElementById('thresholds-grid');
    if (!grid || !AdminState.auditConfig?.thresholds) return;
    
    grid.innerHTML = Object.entries(AdminState.auditConfig.thresholds).map(([key, config]) => `
        <div class="threshold-item">
            <label>${config.label}</label>
            <p class="description">${config.description}</p>
            <input type="number" 
                   value="${config.value}" 
                   step="${config.step || 0.1}" 
                   min="${config.min || 0}" 
                   max="${config.max || 100}"
                   data-threshold="${key}"
                   class="form-input threshold-input">
        </div>
    `).join('');
    
    // Add change handlers
    grid.querySelectorAll('.threshold-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const key = e.target.getAttribute('data-threshold');
            AdminState.auditConfig.thresholds[key].value = parseFloat(e.target.value);
            markUnsaved();
        });
    });
    
    document.getElementById('reset-thresholds-btn')?.addEventListener('click', () => {
        // Reset to defaults
        AdminState.auditConfig.thresholds = {
            roasThreshold: { value: 1.5, label: 'Minimum ROAS Threshold', description: 'Flag campaigns below this ROAS', unit: 'multiplier', min: 0.1, max: 10, step: 0.1 },
            cpaMultiplier: { value: 1.3, label: 'CPA Target Multiplier', description: 'Flag when CPA exceeds target × multiplier', unit: 'multiplier', min: 1, max: 3, step: 0.1 },
            minConversions: { value: 30, label: 'Minimum Conversions', description: 'Warn if total conversions below this', unit: 'count', min: 10, max: 100, step: 5 },
            eventMismatchThreshold: { value: 0.25, label: 'Event Mismatch Threshold', description: 'Max allowed pixel/server variance', unit: 'percent', min: 0.05, max: 0.5, step: 0.05 },
            funnelDropoffThreshold: { value: 0.6, label: 'Funnel Drop-off Threshold', description: 'Flag stages with this drop-off', unit: 'percent', min: 0.3, max: 0.9, step: 0.05 },
            pageSpeedThreshold: { value: 3, label: 'Page Load Time Threshold', description: 'Warn if page load exceeds', unit: 'seconds', min: 1, max: 10, step: 0.5 }
        };
        initAuditConfigPanel();
        showToast('Thresholds reset to defaults', 'success');
    });
    
    document.getElementById('save-thresholds-btn')?.addEventListener('click', () => {
        saveContent();
    });
}

// ============================================
// Rules Panel
// ============================================
function initRulesPanel() {
    renderRulesList();
    
    document.getElementById('add-rule-btn')?.addEventListener('click', () => {
        openRuleEditor();
    });
}

function renderRulesList() {
    const list = document.getElementById('rules-list');
    if (!list || !AdminState.auditConfig?.rules) return;
    
    list.innerHTML = AdminState.auditConfig.rules.map(rule => `
        <div class="rule-item" data-id="${rule.id}">
            <span class="rule-severity ${rule.severity}">${rule.severity}</span>
            <div class="rule-info">
                <div class="rule-title">${escapeHtml(rule.title)}</div>
                <div class="rule-meta">${rule.category} • ${rule.enabled ? 'Enabled' : 'Disabled'}</div>
            </div>
            <div class="rule-actions">
                <label class="toggle-label">
                    <input type="checkbox" class="toggle-input rule-toggle" data-id="${rule.id}" ${rule.enabled ? 'checked' : ''}>
                    <span class="toggle-switch"></span>
                </label>
                <button class="btn btn-sm btn-outline edit-rule-btn" data-id="${rule.id}">Edit</button>
            </div>
        </div>
    `).join('');
    
    // Toggle handlers
    list.querySelectorAll('.rule-toggle').forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            const id = e.target.getAttribute('data-id');
            const rule = AdminState.auditConfig.rules.find(r => r.id === id);
            if (rule) {
                rule.enabled = e.target.checked;
                markUnsaved();
            }
        });
    });
    
    // Edit handlers
    list.querySelectorAll('.edit-rule-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            openRuleEditor(id);
        });
    });
}

function openRuleEditor(ruleId = null) {
    const modal = document.getElementById('rule-editor-modal');
    const title = document.getElementById('rule-editor-title');
    
    if (ruleId) {
        title.textContent = 'Edit Rule';
        const rule = AdminState.auditConfig?.rules?.find(r => r.id === ruleId);
        if (rule) {
            document.getElementById('rule-id').value = rule.id;
            document.getElementById('rule-title').value = rule.title;
            document.getElementById('rule-category').value = rule.category;
            document.getElementById('rule-severity').value = rule.severity;
            document.getElementById('rule-description').value = rule.description;
            document.getElementById('rule-impact').value = rule.impact || '';
            document.getElementById('rule-fix').value = rule.recommendedFix || '';
        }
    } else {
        title.textContent = 'Create New Rule';
        document.getElementById('rule-id').value = '';
        document.getElementById('rule-title').value = '';
        document.getElementById('rule-description').value = '';
    }
    
    modal.hidden = false;
    
    // Close modal
    modal.querySelector('.modal-close')?.addEventListener('click', () => {
        modal.hidden = true;
    });
    
    // Save rule
    document.getElementById('save-rule-btn')?.addEventListener('click', () => {
        saveRule();
        modal.hidden = true;
    });
}

function saveRule() {
    const rule = {
        id: document.getElementById('rule-id').value || generateId(),
        title: document.getElementById('rule-title').value,
        category: document.getElementById('rule-category').value,
        severity: document.getElementById('rule-severity').value,
        description: document.getElementById('rule-description').value,
        impact: document.getElementById('rule-impact').value,
        recommendedFix: document.getElementById('rule-fix').value,
        enabled: true,
        condition: {
            type: 'comparison',
            field: 'spend',
            operator: '>',
            value: 0
        }
    };
    
    if (!AdminState.auditConfig.rules) {
        AdminState.auditConfig.rules = [];
    }
    
    // Update or add
    const existingIndex = AdminState.auditConfig.rules.findIndex(r => r.id === rule.id);
    if (existingIndex >= 0) {
        AdminState.auditConfig.rules[existingIndex] = rule;
    } else {
        AdminState.auditConfig.rules.push(rule);
    }
    
    renderRulesList();
    markUnsaved();
    showToast('Rule saved', 'success');
}

// ============================================
// Formulas Panel
// ============================================
function initFormulasPanel() {
    renderFormulasList();
    
    document.getElementById('add-formula-btn')?.addEventListener('click', () => {
        showToast('Formula editor coming soon', 'info');
    });
}

function renderFormulasList() {
    const list = document.getElementById('formulas-list');
    if (!list || !AdminState.auditConfig?.formulas) return;
    
    list.innerHTML = AdminState.auditConfig.formulas.map(formula => `
        <div class="formula-item" style="background: var(--admin-card); border: 1px solid var(--admin-border); border-radius: 8px; padding: 16px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h4 style="margin-bottom: 4px;">${escapeHtml(formula.name)}</h4>
                    <p style="color: var(--admin-text-muted); font-size: 13px;">${escapeHtml(formula.description)}</p>
                    <code style="background: var(--admin-bg-tertiary); padding: 4px 8px; border-radius: 4px; font-size: 12px;">${escapeHtml(formula.formula)}</code>
                </div>
                <span style="padding: 4px 12px; background: rgba(14, 124, 134, 0.15); color: var(--admin-primary); border-radius: 20px; font-size: 12px;">${formula.category}</span>
            </div>
        </div>
    `).join('');
}

// ============================================
// Site Settings Panel
// ============================================
function initSiteSettingsPanel() {
    if (!AdminState.siteContent?.siteMeta) return;
    
    const meta = AdminState.siteContent.siteMeta;
    
    document.getElementById('site-title').value = meta.title || '';
    document.getElementById('site-description').value = meta.description || '';
    document.getElementById('site-keywords').value = meta.keywords || '';
    document.getElementById('contact-email').value = meta.contactEmail || '';
    document.getElementById('copyright-text').value = meta.copyright || '';
    
    // Social links
    if (meta.socialLinks) {
        document.getElementById('social-youtube').value = meta.socialLinks.youtube || '';
        document.getElementById('social-linkedin').value = meta.socialLinks.linkedin || '';
        document.getElementById('social-github').value = meta.socialLinks.github || '';
        document.getElementById('social-facebook').value = meta.socialLinks.facebook || '';
    }
    
    // Footer
    const footerSection = AdminState.siteContent.sections?.find(s => s.id === 'footer');
    document.getElementById('show-back-to-top').checked = footerSection?.data?.showBackToTop !== false;
    
    document.getElementById('save-settings-btn')?.addEventListener('click', saveSiteSettings);
}

function saveSiteSettings() {
    AdminState.siteContent.siteMeta = {
        title: document.getElementById('site-title').value,
        description: document.getElementById('site-description').value,
        keywords: document.getElementById('site-keywords').value,
        contactEmail: document.getElementById('contact-email').value,
        copyright: document.getElementById('copyright-text').value,
        socialLinks: {
            youtube: document.getElementById('social-youtube').value,
            linkedin: document.getElementById('social-linkedin').value,
            github: document.getElementById('social-github').value,
            facebook: document.getElementById('social-facebook').value
        }
    };
    
    const footerSection = AdminState.siteContent.sections?.find(s => s.id === 'footer');
    if (footerSection) {
        footerSection.data.showBackToTop = document.getElementById('show-back-to-top').checked;
    }
    
    markUnsaved();
    showToast('Settings saved', 'success');
}

// ============================================
// Save & Publish
// ============================================
function markUnsaved() {
    AdminState.hasUnsavedChanges = true;
    
    const status = document.getElementById('save-status');
    if (status) {
        status.classList.add('unsaved');
        status.querySelector('.status-text').textContent = 'Unsaved changes';
    }
}

function markSaved() {
    AdminState.hasUnsavedChanges = false;
    
    const status = document.getElementById('save-status');
    if (status) {
        status.classList.remove('unsaved');
        status.querySelector('.status-text').textContent = 'All changes saved';
    }
}

async function saveContent() {
    try {
        // In a real implementation, this would call the API
        // For now, save to localStorage
        localStorage.setItem('admin_siteContent', JSON.stringify(AdminState.siteContent));
        localStorage.setItem('admin_designTokens', JSON.stringify(AdminState.designTokens));
        localStorage.setItem('admin_auditConfig', JSON.stringify(AdminState.auditConfig));
        
        markSaved();
        showToast('Content saved locally', 'success');
    } catch (error) {
        showToast('Error saving: ' + error.message, 'error');
    }
}

function initPublish() {
    document.getElementById('preview-btn')?.addEventListener('click', () => {
        const panel = document.getElementById('preview-panel');
        panel.hidden = !panel.hidden;
        
        if (!panel.hidden) {
            // Apply current changes to preview
            applyDesignTokens();
            document.getElementById('preview-frame').contentWindow.location.reload();
        }
    });
    
    document.getElementById('publish-btn')?.addEventListener('click', () => {
        document.getElementById('publish-modal').hidden = false;
    });
    
    document.getElementById('cancel-publish-btn')?.addEventListener('click', () => {
        document.getElementById('publish-modal').hidden = true;
    });
    
    document.getElementById('confirm-publish-btn')?.addEventListener('click', () => {
        publishContent();
    });
    
    // Preview size buttons
    document.querySelectorAll('.preview-size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.preview-size-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const frame = document.getElementById('preview-frame');
            const size = btn.getAttribute('data-size');
            
            switch (size) {
                case 'mobile':
                    frame.style.width = '375px';
                    break;
                case 'tablet':
                    frame.style.width = '768px';
                    break;
                default:
                    frame.style.width = '100%';
            }
        });
    });
    
    // Close preview
    document.querySelector('.close-preview-btn')?.addEventListener('click', () => {
        document.getElementById('preview-panel').hidden = true;
    });
}

async function publishContent() {
    try {
        document.getElementById('confirm-publish-btn').disabled = true;
        document.getElementById('confirm-publish-btn').textContent = 'Publishing...';
        
        // Save first
        await saveContent();
        
        // In a real implementation, this would:
        // 1. Call the Netlify Function to commit changes to Git
        // 2. Trigger a new deploy
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        document.getElementById('publish-modal').hidden = true;
        showToast('Content published successfully!', 'success');
        
        // Record in history
        addHistoryEntry('Published site changes');
    } catch (error) {
        showToast('Publish failed: ' + error.message, 'error');
    } finally {
        document.getElementById('confirm-publish-btn').disabled = false;
        document.getElementById('confirm-publish-btn').innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Publish Now
        `;
    }
}

// ============================================
// History
// ============================================
function addHistoryEntry(action) {
    const entry = {
        timestamp: new Date().toISOString(),
        action: action,
        user: AdminState.user?.email || 'unknown'
    };
    
    // Add to localStorage history
    const history = JSON.parse(localStorage.getItem('admin_history') || '[]');
    history.unshift(entry);
    localStorage.setItem('admin_history', JSON.stringify(history.slice(0, 20)));
}

// ============================================
// Import/Export
// ============================================
function initImportExport() {
    document.getElementById('export-all-btn')?.addEventListener('click', () => {
        exportAllContent();
    });
    
    document.querySelectorAll('[data-export]').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.getAttribute('data-export');
            exportSingleFile(type);
        });
    });
    
    document.getElementById('import-btn')?.addEventListener('click', () => {
        document.getElementById('import-file-input').click();
    });
    
    document.getElementById('import-file-input')?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) {
            importContent(file);
        }
    });
}

function exportAllContent() {
    const data = {
        siteContent: AdminState.siteContent,
        designTokens: AdminState.designTokens,
        auditConfig: AdminState.auditConfig,
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    showToast('Content exported', 'success');
}

function exportSingleFile(type) {
    let data, filename;
    
    switch (type) {
        case 'site-content':
            data = AdminState.siteContent;
            filename = 'site-content.json';
            break;
        case 'design-tokens':
            data = AdminState.designTokens;
            filename = 'design-tokens.json';
            break;
        case 'audit-config':
            data = AdminState.auditConfig;
            filename = 'audit-config.json';
            break;
    }
    
    if (data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        
        URL.revokeObjectURL(url);
        showToast(`${filename} exported`, 'success');
    }
}

async function importContent(file) {
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (data.siteContent) AdminState.siteContent = data.siteContent;
        if (data.designTokens) AdminState.designTokens = data.designTokens;
        if (data.auditConfig) AdminState.auditConfig = data.auditConfig;
        
        // Re-initialize all panels
        loadAllContent();
        
        showToast('Content imported successfully', 'success');
        markUnsaved();
    } catch (error) {
        showToast('Import failed: ' + error.message, 'error');
    }
}

// ============================================
// Drag & Drop
// ============================================
function initDragAndDrop(container, onReorder) {
    let draggedItem = null;
    
    container.querySelectorAll('[draggable="true"]').forEach(item => {
        item.addEventListener('dragstart', (e) => {
            draggedItem = item;
            item.classList.add('dragging');
        });
        
        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            draggedItem = null;
        });
        
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            if (draggedItem && draggedItem !== item) {
                const allItems = [...container.querySelectorAll('[draggable="true"]')];
                const draggedIndex = allItems.indexOf(draggedItem);
                const dropIndex = allItems.indexOf(item);
                
                if (draggedIndex < dropIndex) {
                    item.parentNode.insertBefore(draggedItem, item.nextSibling);
                } else {
                    item.parentNode.insertBefore(draggedItem, item);
                }
                
                // Get new order
                const newOrder = [...container.querySelectorAll('[draggable="true"]')].map(i => i.getAttribute('data-id'));
                onReorder(newOrder);
            }
        });
    });
}

// ============================================
// Helper Functions
// ============================================
function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatLabel(key) {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
}

// ============================================
// Auto-save
// ============================================
function initAutoSave() {
    AdminState.autoSaveTimer = setInterval(() => {
        if (AdminState.hasUnsavedChanges) {
            saveContent();
        }
    }, AdminState.autoSaveInterval);
    
    // Warn before leaving with unsaved changes
    window.addEventListener('beforeunload', (e) => {
        if (AdminState.hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
}

// ============================================
// Initialize
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    initNavigation();
    initPublish();
    initImportExport();
    initAutoSave();
    
    // Load from localStorage if available
    const savedContent = localStorage.getItem('admin_siteContent');
    if (savedContent) {
        try {
            AdminState.siteContent = JSON.parse(savedContent);
        } catch (e) {
            console.warn('Could not load saved content');
        }
    }
    
    console.log('Admin Panel initialized');
});

// Expose for debugging
window.AdminState = AdminState;
