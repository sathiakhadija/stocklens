/**
 * StockLens V1 — Main Application JS
 *
 * Responsibilities:
 *  - Theme (dark/light) toggle + persistence
 *  - Language switcher (EN / AR / ES)
 *  - Tab navigation
 *  - All data fetching from /api/*
 *  - DOM rendering for each section
 *  - Logout
 *  - Sidebar mobile toggle
 */

(function installCsrfFetchWrapper() {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, options = {}) => {
    const method = String(options.method || 'GET').toUpperCase();
    const token = window.STOCKLENS_CSRF_TOKEN;
    if (token && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const headers = new Headers(options.headers || {});
      headers.set('X-CSRF-Token', token);
      options = { ...options, headers };
    }
    return nativeFetch(input, options);
  };
})();

/* ═══════════════════════════════════════════════════════════
   THEME
   ═══════════════════════════════════════════════════════════ */
(function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  _syncThemeIcon(saved);
})();

function _syncThemeIcon(theme) {
  const icon = document.getElementById('theme-icon');
  if (icon) {
    icon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
    if (window.lucide) lucide.createIcons();
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next    = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  _syncThemeIcon(next);
  // Update existing chart grid/tick colours without re-fetching data
  const cc = chartColors();
  Object.values(_charts).forEach(chart => {
    const scales = chart.options.scales || {};
    ['x', 'y'].forEach(axis => {
      if (scales[axis]) {
        if (scales[axis].grid)  scales[axis].grid.color  = cc.grid;
        if (scales[axis].ticks) scales[axis].ticks.color = cc.tick;
      }
    });
    if (chart.options.plugins?.legend?.labels) {
      chart.options.plugins.legend.labels.color = cc.tick;
    }
    chart.update('none'); // 'none' = skip animation on theme update
  });
}

/* ═══════════════════════════════════════════════════════════
   LANGUAGE
   ═══════════════════════════════════════════════════════════ */
function initLang() {
  const select = document.getElementById('lang-select');
  if (!select) return;
  select.value = window.currentLang;
  if (!select.dataset.appI18nBound) {
    select.dataset.appI18nBound = '1';
    select.addEventListener('change', () => setLanguage(select.value));
  }
  window.addEventListener('stocklens:languagechange', () => {
    const active = document.querySelector('.nav-link.active');
    if (active) {
      updatePageTitle(active.dataset.tab);
      invalidateTabs(Object.keys(TAB_LOADERS));
      TAB_LOADERS[active.dataset.tab]?.();
    }
    setTimeout(applyTranslations, 0);
  });
  applyTranslations();
}

/* ═══════════════════════════════════════════════════════════
   TAB NAVIGATION
   ═══════════════════════════════════════════════════════════ */
const PAGE_TITLES = {
  overview:       'page.overview',
  products:       'page.products',
  inventory:      'page.inventory',
  upload:         'page.upload',
  decisions:      'page.decisions',
  forecast:       'page.forecast',
  analytics:      'page.analytics',
  evaluation:     'page.evaluation',
  scenario:       'page.scenario',
  classification: 'page.classification',
  manual:         'page.manual',
  team:           'page.team',
};

const TAB_LOADERS = {
  overview:       loadOverview,
  products:       loadProducts,
  inventory:      loadInventory,
  upload:         loadUpload,
  decisions:      loadDecisions,
  forecast:       loadForecast,
  analytics:      loadAnalytics,
  evaluation:     loadEvaluation,
  scenario:       loadScenario,
  classification: loadClassification,
  manual:         loadManualEntry,
  team:           loadTeam,
};

const loadedTabs = new Set();
const loadedAt = new Map();
const TAB_STALE_MS = 2 * 60 * 1000;
let currentDecisionFilter = 'ALL';

function invalidateTabs(tabs) {
  tabs.forEach(tab => {
    loadedTabs.delete(tab);
    loadedAt.delete(tab);
  });
}

function isTabStale(tab) {
  const last = loadedAt.get(tab) || 0;
  return Date.now() - last > TAB_STALE_MS;
}

function renderTabLoading(tab) {
  const panel = document.getElementById(`tab-${tab}`);
  const body = panel?.querySelector('tbody');
  if (!body) return;
  const cols = body.closest('table')?.querySelectorAll('thead th').length || 1;
  body.innerHTML = Array.from({ length: 4 }, () =>
    `<tr><td colspan="${cols}" class="loading-cell"><span class="skeleton-line"></span></td></tr>`
  ).join('');
}

function enforceRoleUiGuards() {
  const isManager = window.STOCKLENS_ROLE === 'manager';
  if (isManager) return;

  // Defensive UI guard: if manager-only nav/panels are present for any reason,
  // remove them so staff users never see inaccessible sections.
  document.querySelectorAll('[data-tab="team"]').forEach((el) => el.remove());
  document.getElementById('tab-team')?.remove();
}

function updatePageTitle(tab) {
  const el = document.getElementById('page-title');
  if (el) el.textContent = t(PAGE_TITLES[tab] || tab);
}

function switchTab(tab) {
  if (tab === 'more') return;
  if (tab === 'team' && window.STOCKLENS_ROLE !== 'manager') return;

  // Update nav links
  document.querySelectorAll('.nav-link').forEach(a => {
    a.classList.toggle('active', a.dataset.tab === tab);
  });

  // Show the right panel
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.toggle('active', p.id === `tab-${tab}`);
  });

  updatePageTitle(tab);

  // Load each tab once; theme toggle handles chart re-renders separately
  if (!loadedTabs.has(tab) || isTabStale(tab)) {
    renderTabLoading(tab);
    TAB_LOADERS[tab]?.();
    loadedTabs.add(tab);
    loadedAt.set(tab, Date.now());
  }

  // After the DOM has settled (one rAF), resize any charts in this panel
  // so Chart.js reads stable pixel dimensions from the explicit .chart-wrap height.
  if (tab === 'analytics' || tab === 'scenario') {
    requestAnimationFrame(() => {
      Object.values(window._charts || {}).forEach(c => { try { c.resize(); } catch (_) {} });
    });
  }

  // Close mobile sidebar
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar && window.innerWidth <= 768) {
    sidebar.classList.remove('open');
    overlay?.classList.remove('visible');
  }

  const drawer = document.getElementById('mobile-drawer');
  drawer?.classList.remove('open');
}

function initTabs() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      switchTab(link.dataset.tab);
    });
  });
  // Load initial tab
  switchTab('overview');
}

function initMobileMoreDrawer() {
  const btn = document.getElementById('mobile-more-btn');
  const drawer = document.getElementById('mobile-drawer');
  if (!btn || !drawer) return;

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    drawer.classList.toggle('open');
  });

  drawer.addEventListener('click', (e) => {
    if (e.target === drawer) drawer.classList.remove('open');
  });
}

/* ═══════════════════════════════════════════════════════════
   MOBILE SIDEBAR
   ═══════════════════════════════════════════════════════════ */
function initSidebar() {
  const toggle  = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  if (!toggle || !sidebar) return;

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  overlay.id = 'sidebar-overlay';
  document.body.appendChild(overlay);

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('visible');
  });

  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
  });
}

/* ═══════════════════════════════════════════════════════════
   LOGOUT
   ═══════════════════════════════════════════════════════════ */
function initLogout() {
  const btn = document.getElementById('logout-btn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    sessionStorage.clear();
    window.location.href = '/login';
  });
}

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */
async function apiFetch(url) {
  let res;
  try {
    res = await fetch(url, { credentials: 'include' });
  } catch (e) {
    renderApiError(url);
    return null;
  }
  if (res.status === 401) { window.location.href = '/login'; return null; }
  if (res.status === 400) {
    const body = await res.json().catch(() => ({}));
    if ((body.message || '').toLowerCase().includes('onboarding')) {
      window.location.href = '/onboarding';
      return null;
    }
    renderApiError(url);
    return null;
  }
  if (!res.ok) {
    renderApiError(url);
    return null;
  }
  return res.json();
}

function riskBadge(flag) {
  if (!flag) return '';
  const f = flag.toLowerCase();
  return `<span class="badge badge-${f}">${t('risk.' + f) || flag}</span>`;
}

function decisionBadge(action) {
  if (!action) return '';
  const a = action.toLowerCase();
  return `<span class="badge badge-${a}">${t('action.' + a) || action}</span>`;
}

function fmt(n, decimals = 1) {
  if (n == null) return '—';
  return parseFloat(n).toFixed(decimals);
}

function fmtPrice(n) {
  if (n == null) return '—';
  return (window.STOCKLENS_CURRENCY_SYMBOL || '£') + parseFloat(n).toFixed(2);
}

function accuracyClass(pct) {
  if (pct >= 75) return 'accuracy-high';
  if (pct >= 50) return 'accuracy-medium';
  return 'accuracy-low';
}

/* ═══════════════════════════════════════════════════════════
   ANIMATION HELPERS
   ═══════════════════════════════════════════════════════════ */
function animateCount(id, target, formatFn) {
  const el = document.getElementById(id);
  if (!el) return;
  const end = parseFloat(target) || 0;
  const fmt = formatFn || (v => Math.round(v));

  // Only animate once per browser session — subsequent overview loads just set the value
  if (sessionStorage.getItem('kpi_animated')) {
    el.textContent = fmt(end);
    return;
  }

  const duration = 1200;
  const step     = 16;
  const steps    = Math.ceil(duration / step);
  let   current  = 0;
  const inc      = end / steps;

  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';

  const timer = setInterval(() => {
    current = Math.min(current + inc, end);
    el.textContent = fmt(current);
    if (current >= end) clearInterval(timer);
  }, step);
}

function _markKpisAnimated() { sessionStorage.setItem('kpi_animated', '1'); }

function markReorderRows() {
  document.querySelectorAll('.data-table tbody tr').forEach(tr => {
    const badge = tr.querySelector('.badge-reorder');
    if (badge) tr.classList.add('row-reorder');
    else tr.classList.remove('row-reorder');
  });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function timeAgo(ts) {
  if (!ts) return t('common.recently');
  const date = new Date(String(ts).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return ts;
  const diff = Math.max(0, Date.now() - date.getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('common.justNow');
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return t('common.yesterday');
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function showToast(message, type = 'success') {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = translateServerMessage(message);
  root.appendChild(toast);
  setTimeout(() => toast.remove(), 4200);
}

function openProductModal(title, bodyHtml) {
  const modal = document.getElementById('reorder-modal');
  const titleEl = document.getElementById('reorder-modal-title');
  const body = document.getElementById('reorder-modal-body');
  if (!modal || !titleEl || !body) return;
  titleEl.textContent = title;
  body.innerHTML = bodyHtml;
  modal.classList.add('open');
}

function closeProductModal() {
  const modal = document.getElementById('reorder-modal');
  if (modal) modal.classList.remove('open');
}
window.closeProductModal = closeProductModal;

function fetchWithTimeout(url, options = {}, timeoutMs = 120000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

function renderApiError(url) {
  const active = document.querySelector('.tab-panel.active');
  if (!active) return;
  const target = active.querySelector('tbody') || active.querySelector('.activity-feed') || active;
  const message = `Could not load data from ${url}. Check your connection and try again.`;
  if (target.tagName === 'TBODY') {
    const cols = target.closest('table')?.querySelectorAll('thead th').length || 1;
    target.innerHTML = `<tr><td colspan="${cols}" class="loading-cell">${message}</td></tr>`;
  } else {
    target.innerHTML = `<div class="chart-empty-state">${message}</div>`;
  }
}

/* ═══════════════════════════════════════════════════════════
   OVERVIEW
   ═══════════════════════════════════════════════════════════ */
function renderWelcomeBanner() {
  const name = window.STOCKLENS_USER_NAME || 'there';
  const isManager = window.STOCKLENS_ROLE === 'manager';
  const steps = isManager
    ? [
        { num: '1', label: t('overview.stepUpload'), action: "goToUploadSection()" },
        { num: '2', label: t('overview.stepForecast'), action: "switchTab('forecast')" },
        { num: '3', label: t('overview.stepDecisions'), action: "switchTab('decisions')" },
      ]
    : [
        { num: '1', label: t('overview.stepInventory'), action: "switchTab('inventory')" },
        { num: '2', label: t('overview.stepAlerts'), action: "switchTab('decisions')" },
        { num: '3', label: t('overview.stepAnalytics'), action: "switchTab('analytics')" },
      ];
  return `
    <div class="welcome-banner" id="welcome-banner">
      <div class="welcome-banner-body">
        <p class="welcome-banner-title">${tf('overview.welcomeTitle', { name })}</p>
        <p class="welcome-banner-subtitle">
          ${isManager ? t('overview.welcomeManager') : t('overview.welcomeStaff')}
        </p>
        <div class="welcome-banner-steps">
          ${steps.map(s => `
            <div class="welcome-step" onclick="${s.action}">
              <span class="welcome-step-num">${s.num}</span>
              ${s.label}
            </div>`).join('')}
        </div>
      </div>
      <button class="welcome-banner-dismiss" onclick="dismissWelcome()">${t('common.dismiss')}</button>
    </div>`;
}

function dismissWelcome() {
  localStorage.setItem('welcome_dismissed', '1');
  const banner = document.getElementById('welcome-banner');
  if (banner) {
    banner.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    banner.style.opacity    = '0';
    banner.style.transform  = 'translateY(-8px)';
    setTimeout(() => { banner.remove(); }, 260);
  }
}

function goToUploadSection() {
  if (document.getElementById('tab-upload')) {
    switchTab('upload');
    return;
  }
  switchTab('overview');
  setTimeout(() => {
    document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 0);
}

function prepareUploadTab() {
  const mount = document.getElementById('upload-tab-mount');
  if (!mount) return;
  ['upload-section', 'upload-history-card'].forEach((id) => {
    const el = document.getElementById(id);
    if (el && el.parentElement !== mount) mount.appendChild(el);
  });
}

function triggerForecastRunFromFreshness() {
  switchTab('forecast');
  setTimeout(() => {
    document.getElementById('forecast-run-btn')?.click();
  }, 0);
}

function renderTodayActionPlan(data) {
  const el = document.getElementById('today-action-section');
  if (!el) return;

  const isManager = window.STOCKLENS_ROLE === 'manager';
  const decisions = data.decision_counts || {};
  const quality = data.data_quality || {};
  const tasks = [];

  if (isManager && data.pending_reorders_count > 0) {
    tasks.push({
      label: t('overview.confirmDeliveries'),
      detail: tf('overview.pendingOrders', { count: data.pending_reorders_count, plural: plural(data.pending_reorders_count) }),
      action: 'openPendingOrdersModal()',
      tone: 'warning',
    });
  }
  if ((decisions.REORDER || 0) > 0) {
    tasks.push({
      label: t('overview.placeReorder'),
      detail: tf('overview.productsNeedAction', { count: decisions.REORDER, plural: plural(decisions.REORDER) }),
      action: isManager ? "switchTab('decisions'); setDecisionFilter('REORDER')" : "switchTab('decisions')",
      tone: 'critical',
    });
  }
  if ((decisions.AT_RISK || 0) > 0) {
    tasks.push({
      label: t('overview.reviewAtRisk'),
      detail: tf('overview.productsNearReorder', { count: decisions.AT_RISK, plural: plural(decisions.AT_RISK) }),
      action: isManager ? "switchTab('decisions'); setDecisionFilter('AT_RISK')" : "switchTab('decisions')",
      tone: 'warning',
    });
  }
  if (isManager && quality.status && quality.status !== 'good') {
    tasks.push({
      label: t('overview.fixDataQuality'),
      detail: translateServerMessage((quality.issues || [quality.summary || 'Data needs attention'])[0]),
      action: 'goToUploadSection()',
      tone: quality.status === 'critical' ? 'critical' : 'warning',
    });
  }
  if (isManager && !data.last_forecast_run) {
    tasks.push({
      label: t('overview.runForecast'),
      detail: t('overview.noForecastRun'),
      action: 'triggerForecastRunFromFreshness()',
      tone: 'warning',
    });
  }

  const visibleTasks = tasks.slice(0, 3);
  if (!visibleTasks.length) {
    el.innerHTML = `
      <div class="today-action-panel good">
        <div>
          <div class="today-action-title">${t('overview.todayGoodTitle')}</div>
          <div class="today-action-sub">${t('msg.noUrgentTasks')}</div>
        </div>
        <button class="btn btn-sm btn-outline" onclick="switchTab('inventory')">${t('overview.stepInventory')}</button>
      </div>`;
    return;
  }

  el.innerHTML = `
    <div class="today-action-panel">
      <div class="today-action-head">
        <div>
          <div class="today-action-title">${t('overview.todayTitle')}</div>
          <div class="today-action-sub">${t('overview.todaySub')}</div>
        </div>
      </div>
      <div class="today-action-grid">
        ${visibleTasks.map((task, idx) => `
          <button class="today-action-card ${task.tone}" onclick="${task.action}">
            <span class="today-action-num">${idx + 1}</span>
            <span>
              <strong>${task.label}</strong>
              <small>${task.detail}</small>
            </span>
          </button>
        `).join('')}
      </div>
    </div>`;
}

/* ═══════════════════════════════════════════════════════════
   PENDING ORDERS TRACKER
   ═══════════════════════════════════════════════════════════ */
function renderPendingOrdersSection(count) {
  const el = document.getElementById('pending-orders-section');
  if (!el) return;

  if (count === 0) {
    el.innerHTML = '';
    return;
  }

  el.innerHTML = `
    <div class="pending-orders-bar">
      <div class="pending-orders-label">
        <span class="pending-orders-dot"></span>
        <strong>${tf('overview.pendingOrders', { count, plural: plural(count) })}</strong> ${t('orders.awaitingConfirmation')}
      </div>
      <button class="btn btn-sm btn-outline" onclick="openPendingOrdersModal()">${t('btn.viewConfirm').replace(/->/g, '→')}</button>
    </div>`;
}

async function openPendingOrdersModal() {
  const rows = await apiFetch('/api/reorder/pending');
  if (!rows) return;

  if (!rows.length) {
    openProductModal(t('modal.pendingOrders'), `<p style="color:var(--text-muted);text-align:center;padding:24px">${t('msg.noPendingOrders')}</p>`);
    return;
  }

  window._pendingOrdersById = Object.fromEntries(rows.map(r => [String(r.log_id), r]));
  openProductModal(t('modal.pendingOrders'), `
      <div class="table-wrap">
      <table class="data-table">
        <thead><tr>
          <th>${t('th.product')}</th>
          <th>${t('field.quantityOrdered')}</th>
          <th>${t('field.expectedArrival')}</th>
          <th>${t('field.by')}</th>
          <th>${t('th.action')}</th>
        </tr></thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <td><strong>${escapeHtml(r.product_name)}</strong></td>
              <td>${tf('orders.quantityUnits', { quantity: r.quantity_ordered })}</td>
              <td style="color:var(--text-muted);font-size:12px">${escapeHtml(r.expected_arrival || '—')}</td>
              <td style="color:var(--text-muted);font-size:12px">${escapeHtml(r.ordered_by || '—')}</td>
              <td>
                <button class="btn btn-sm btn-outline"
                        onclick="showPendingOrderEditModal(${r.log_id})">
                  ${t('common.edit')}
                </button>
                <button class="btn btn-sm btn-primary"
                        onclick="showDeliveryModal(${r.log_id})">
                  ${t('btn.confirmDelivery')}
                </button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
      </div>`);
}

window.showPendingOrderEditModal = function(logId) {
  const row = window._pendingOrdersById?.[String(logId)];
  if (!row) return;
  openProductModal(t('modal.editPending'), `
    <p class="modal-help">${tf('orders.updateDetails', { product: escapeHtml(row.product_name) })}</p>
    <div class="modal-form-grid">
      <div class="form-field">
        <label for="pending-order-qty">${t('field.quantityOrdered')}</label>
        <input class="form-input" id="pending-order-qty" type="number" min="1" step="1" value="${row.quantity_ordered}">
      </div>
      <div class="form-field">
        <label for="pending-order-days">${t('field.expectedDeliveryDays')}</label>
        <input class="form-input" id="pending-order-days" type="number" min="1" step="1" value="${row.expected_days || 7}">
      </div>
      <div class="form-field" style="grid-column:1 / -1">
        <label for="pending-order-notes">${t('field.notes')}</label>
        <input class="form-input" id="pending-order-notes" type="text" maxlength="500" value="${escapeHtml(row.notes || '')}" placeholder="${t('orders.supplierNote')}">
      </div>
    </div>
    <div class="modal-form-actions">
      <button class="btn btn-outline" type="button" onclick="openPendingOrdersModal()">${t('common.back')}</button>
      <button class="btn btn-primary" type="button" onclick="submitPendingOrderUpdate(${logId})">${t('common.saveChanges')}</button>
    </div>`);
};

window.submitPendingOrderUpdate = async function(logId) {
  const quantity = parseInt(document.getElementById('pending-order-qty')?.value || '', 10);
  const expectedDays = parseInt(document.getElementById('pending-order-days')?.value || '', 10);
  const notes = document.getElementById('pending-order-notes')?.value || '';
  if (isNaN(quantity) || quantity <= 0 || isNaN(expectedDays) || expectedDays <= 0) {
    showToast(t('msg.validQuantityDelivery'), 'error');
    return;
  }

  const res = await fetch('/api/reorder/update', {
    method:      'POST',
    credentials: 'include',
    headers:     { 'Content-Type': 'application/json' },
    body:        JSON.stringify({
      log_id: logId,
      quantity_ordered: quantity,
      expected_days: expectedDays,
      notes,
    }),
  });
  const data = await res.json().catch(() => ({}));

  if (res.ok) {
    showToast(data.message || t('msg.pendingOrderUpdated'));
    invalidateTabs(['overview', 'decisions']);
    loadOverview();
    loadDecisions();
    openPendingOrdersModal();
  } else {
    showToast(data.message || t('msg.pendingOrderUpdateFailed'), 'error');
  }
};

window.showDeliveryModal = function(logId) {
  const row = window._pendingOrdersById?.[String(logId)];
  if (!row) return;
  openProductModal(t('modal.confirmDelivery'), `
    <p class="modal-help">${tf('orders.confirmReceived', { product: escapeHtml(row.product_name) })}</p>
    <div class="modal-form-grid">
      <div class="form-field">
        <label for="delivery-qty">${t('field.quantityReceived')}</label>
        <input class="form-input" id="delivery-qty" type="number" min="1" step="1" value="${row.quantity_ordered}">
      </div>
    </div>
    <div class="modal-form-actions">
      <button class="btn btn-outline" type="button" onclick="openPendingOrdersModal()">${t('common.back')}</button>
      <button class="btn btn-primary" type="button" onclick="submitDeliveryConfirmation(${logId})">${t('btn.confirmDelivery')}</button>
    </div>`);
};

window.submitDeliveryConfirmation = async function(logId) {
  const actualQty = parseInt(document.getElementById('delivery-qty')?.value || '', 10);
  if (isNaN(actualQty) || actualQty <= 0) {
    showToast(t('msg.validQuantity'), 'error');
    return;
  }

  const res = await fetch('/api/reorder/confirm', {
    method:      'POST',
    credentials: 'include',
    headers:     { 'Content-Type': 'application/json' },
    body:        JSON.stringify({ log_id: logId, actual_quantity: actualQty }),
  });
  const data = await res.json().catch(() => ({}));

  if (res.ok) {
    showToast(data.message || t('msg.deliveryConfirmed'));
    closeProductModal();
    invalidateTabs(['overview', 'inventory', 'decisions', 'forecast']);
    loadOverview();
  } else {
    showToast(data.message || t('msg.deliveryFailed'), 'error');
  }
};

/* Mark Reorder Ordered — called from decisions table button */
window.markReorderOrdered = async function(productId, productName, suggestedQty) {
  openProductModal(t('modal.logReorder'), `
    <p class="modal-help">${tf('orders.recordPlaced', { product: escapeHtml(productName) })}</p>
    <div class="modal-form-grid">
      <div class="form-field">
        <label for="reorder-qty">${t('field.quantityOrdered')}</label>
        <input class="form-input" id="reorder-qty" type="number" min="1" step="1" value="${suggestedQty || 1}">
      </div>
      <div class="form-field">
        <label for="reorder-days">${t('field.expectedDeliveryDays')}</label>
        <input class="form-input" id="reorder-days" type="number" min="1" step="1" value="7">
      </div>
    </div>
    <div class="modal-form-actions">
      <button class="btn btn-outline" type="button" onclick="closeProductModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" type="button" onclick="submitReorderLog(${productId})">${t('btn.confirmOrder')}</button>
    </div>`);
};

window.submitReorderLog = async function(productId) {
  const quantity = parseInt(document.getElementById('reorder-qty')?.value || '', 10);
  if (isNaN(quantity) || quantity <= 0) {
    showToast(t('msg.validQuantity'), 'error');
    return;
  }
  const expectedDays = Math.max(1, parseInt(document.getElementById('reorder-days')?.value || '7', 10) || 7);

  const res = await fetch('/api/reorder/log', {
    method:      'POST',
    credentials: 'include',
    headers:     { 'Content-Type': 'application/json' },
    body:        JSON.stringify({ product_id: productId, quantity_ordered: quantity, expected_days: expectedDays }),
  });
  const data = await res.json().catch(() => ({}));

  if (res.ok) {
    showToast(data.message || t('msg.reorderLogged'));
    closeProductModal();
    invalidateTabs(['overview', 'decisions']);
    loadOverview();
    loadDecisions();
  } else {
    showToast(data.message || t('msg.reorderFailed'), 'error');
  }
};

window.showDecisionHistory = async function(productId) {
  const url = productId ? `/api/decisions/history?product_id=${productId}` : '/api/decisions/history';
  const rows = await apiFetch(url);
  if (!rows) {
    showToast(t('msg.decisionHistoryFailed'), 'error');
    return;
  }
  openProductModal(t('modal.decisionHistory'), `
    <div class="table-wrap" style="max-height:60vh;overflow:auto">
      <table class="data-table">
        <thead><tr><th>${t('th.product')}</th><th>${t('th.decision')}</th><th class="mobile-hide">${t('field.quantityOrdered')}</th><th>${t('th.date')}</th></tr></thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <td>${escapeHtml(r.product_name || '—')}</td>
              <td>${decisionBadge(r.action)}</td>
              <td class="mobile-hide">${r.reorder_status ? `${r.reorder_status} ${r.actual_quantity || r.quantity_ordered || ''}` : '—'}</td>
              <td>${String(r.created_at || '').slice(0, 16)}</td>
            </tr>
          `).join('') || `<tr><td colspan="4" class="loading-cell">${t('msg.noHistoryYet')}</td></tr>`}
        </tbody>
      </table>
    </div>`);
};

async function loadOverview() {
  const data = await apiFetch('/api/overview');
  if (!data) return;

  // ── KPI counts ────────────────────────────────────────────────────────────
  animateCount('kpi-total',   data.total_products);
  animateCount('kpi-active',  data.active_products);
  animateCount('kpi-reorder', data.decision_counts?.REORDER || 0);
  animateCount('kpi-value',   data.inventory_value || 0, v => (window.STOCKLENS_CURRENCY_SYMBOL || '£') + Math.round(v).toLocaleString('en-GB'));
  _markKpisAnimated();

  // ── KPI trend arrows ──────────────────────────────────────────────────────
  function renderTrend(pct) {
    if (pct === 0) return `<span class="kpi-trend flat">— 0%</span>`;
    const dir = pct > 0 ? 'up' : 'down';
    const arrow = pct > 0
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>`;
    return `<span class="kpi-trend ${dir}">${arrow} ${Math.abs(pct)}%</span>`;
  }

  const st = data.kpi_trends?.sales_trend ?? 0;
  // Inject trend under each KPI value
  [
    ['kpi-total',   st,   true],
    ['kpi-active',  st,   true],
    ['kpi-reorder', data.kpi_trends?.reorder_count > 0 ? -Math.min(st, 8) : st, false],
    ['kpi-value',   st,   true],
  ].forEach(([id, pct, positiveIsGood]) => {
    const el = document.getElementById(id);
    if (!el) return;
    let wrap = el.parentElement.querySelector('.kpi-trend-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'kpi-trend-wrap';
      wrap.style.cssText = 'margin-top:4px;';
      el.insertAdjacentElement('afterend', wrap);
    }
    wrap.innerHTML = renderTrend(pct);
  });

  // ── Data freshness signal ─────────────────────────────────────────────────
  const freshnessEl = document.getElementById('freshness-bar');
  if (freshnessEl) {
    const lastRun = data.last_forecast_run;
    if (!lastRun) {
      const runBtn = (window.STOCKLENS_ROLE === 'manager')
        ? `<button class="freshness-run-btn" onclick="triggerForecastRunFromFreshness()">${t('overview.runForecast')}</button>`
        : '';
      freshnessEl.innerHTML = `
        <div class="freshness-bar stale">
          <span class="freshness-dot"></span>
          <span class="freshness-label">${t('overview.forecastNotRun')} — <strong>${t('overview.dataOutdated')}</strong></span>
          ${runBtn}
        </div>`;
    } else {
      const runDate  = new Date(lastRun.replace(' ', 'T'));
      const diffMs   = Date.now() - runDate.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHrs  = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHrs / 24);
      let ageStr;
      if (diffMins < 60)       ageStr = `${diffMins}m ago`;
      else if (diffHrs < 24)   ageStr = `${diffHrs}h ago`;
      else                     ageStr = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

      const isStale = diffDays > 3;
      const staleNote = isStale
        ? ` — <strong>${t('overview.dataOutdated')}</strong>`
        : '';
      const runBtn = (window.STOCKLENS_ROLE === 'manager')
        ? `<button class="freshness-run-btn" onclick="triggerForecastRunFromFreshness()">${t('overview.rerunForecast')}</button>`
        : '';

      freshnessEl.innerHTML = `
        <div class="freshness-bar${isStale ? ' stale' : ''}">
          <span class="freshness-dot"></span>
          <span class="freshness-label">${tf('overview.forecastLastRun', { age: `<strong>${ageStr}</strong>` })}${staleNote}</span>
          ${isStale ? runBtn : ''}
        </div>`;
    }
  }

  // ── Data quality signal ──────────────────────────────────────────────────
  const qualityEl = document.getElementById('data-quality-section');
  const quality = data.data_quality;
  if (qualityEl && quality) {
    const issues = quality.issues || [];
    const cls = quality.status === 'critical' ? 'critical' : quality.status === 'warning' ? 'warning' : 'good';
    const actionBtn = window.STOCKLENS_ROLE === 'manager' && cls !== 'good'
      ? `<button class="btn btn-sm btn-secondary" onclick="goToUploadSection()">${t('btn.uploadCleanerData')}</button>`
      : '';
    qualityEl.innerHTML = `
      <div class="data-quality-panel ${cls}">
        <div class="data-quality-main">
          <span class="data-quality-dot"></span>
          <div>
            <div class="data-quality-title">${translateServerMessage(quality.summary)}</div>
            ${issues.length
              ? `<div class="data-quality-issues">${issues.map(i => `<span>${translateServerMessage(i)}</span>`).join('')}</div>`
              : `<div class="data-quality-issues"><span>${tf('overview.salesRowsChecked', { count: quality.sales_rows || 0 })}</span></div>`}
          </div>
        </div>
        ${actionBtn}
      </div>`;
  }

  renderTodayActionPlan(data);

  // ── Welcome banner (first visit) ─────────────────────────────────────────
  const bannerEl = document.getElementById('welcome-banner-section');
  if (bannerEl) {
    if (data.is_first_visit && !localStorage.getItem('welcome_dismissed')) {
      bannerEl.innerHTML = renderWelcomeBanner();
    } else {
      bannerEl.innerHTML = '';
    }
  }

  // ── Pending orders tracker ────────────────────────────────────────────────
  if (window.STOCKLENS_ROLE === 'manager') {
    renderPendingOrdersSection(data.pending_reorders_count || 0);
  }

  // ── Sidebar badge (REORDER count) ────────────────────────────────────────
  const badge = document.getElementById('decisions-badge');
  const reorderN = data.decision_counts?.REORDER || 0;
  if (badge) {
    if (reorderN > 0) {
      badge.textContent = reorderN;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  }

  // ── Urgent Actions Required panel ────────────────────────────────────────
  const urgentEl = document.getElementById('urgent-actions-section');
  const urgent   = data.urgent_actions || [];
  if (urgentEl) {
    if (urgent.length > 0) {
      urgentEl.innerHTML = `
        <div class="urgent-panel">
          <div class="urgent-panel-header">
            <div class="urgent-panel-title">
              <div class="urgent-panel-icon">
                <svg viewBox="0 0 24 24"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              </div>
              <div>
                <div class="urgent-panel-label">${t('overview.urgentTitle')}</div>
                <div class="urgent-panel-sub">${t('overview.urgentSub')}</div>
              </div>
            </div>
            <span class="urgent-items-count">${tf('overview.itemsCount', { count: urgent.length, plural: plural(urgent.length) })}</span>
          </div>
          <div class="urgent-products-grid">
            ${urgent.map(u => {
              const days = u.days_to_stockout;
              const isCritical = days <= 3;
              const badgeCls = isCritical ? '' : 'moderate';
              const probTxt = u.stockout_prob > 0 ? ` · ${tf('overview.stockoutRisk', { prob: u.stockout_prob })}` : '';
              return `
                <div class="urgent-product-card">
                  <div class="urgent-product-name">${u.product_name}</div>
                  <div class="urgent-stock-row">
                    <span class="urgent-stock-label">${t('overview.stockLabel')} <strong class="urgent-stock-value">${u.stock_on_hand}</strong></span>
                    <span class="urgent-days-badge ${badgeCls}">${days}d${probTxt}</span>
                  </div>
                  <button class="urgent-reorder-btn" onclick="switchTab('decisions'); if (window.STOCKLENS_ROLE === 'manager') setDecisionFilter('REORDER')">
                    ${t('overview.reorderNow')}
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    } else {
      urgentEl.innerHTML = '';
    }
  }

  // ── Smart AI Recommendations ──────────────────────────────────────────────
  const recEl  = document.getElementById('recommendations-section');
  const recs   = data.smart_recommendations || [];
  if (recEl) {
    if (recs.length > 0) {
      recEl.innerHTML = `
        <div class="recommendations-panel">
          <div class="recommendations-header">
            <div class="recommendations-icon">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <span class="recommendations-title">${t('overview.smartRecommendations')}</span>
          </div>
          ${recs.map(r => `
            <div class="recommendation-item ${r.urgency === 'critical' ? 'critical' : r.urgency === 'warning' ? 'warning' : ''}">
              ${translateServerMessage(r.text)}
            </div>
          `).join('')}
        </div>
      `;
    } else {
      recEl.innerHTML = '';
    }
  }

  // ── Decision breakdown ────────────────────────────────────────────────────
  const dcEl = document.getElementById('decision-breakdown');
  const dc   = data.decision_counts || {};
  const order = ['REORDER', 'AT_RISK', 'OVERSTOCK', 'HOLD', 'INACTIVE'];
  const badgeFn = (a) => `<span class="badge badge-${a.toLowerCase()}">${t('action.' + a.toLowerCase())}</span>`;
  if (dcEl) {
    dcEl.innerHTML = order.map(a => `
      <div class="breakdown-row breakdown-row--link" onclick="switchTab('decisions')" title="${tf('decision.viewDecisions', { action: a })}">
        ${badgeFn(a)}
        <span class="breakdown-count">${dc[a] || 0}</span>
      </div>
    `).join('');
  }

  // ── Risk breakdown ────────────────────────────────────────────────────────
  const rcEl = document.getElementById('risk-breakdown');
  const rc   = data.risk_counts || {};
  const riskOrder = ['HIGH', 'MEDIUM', 'LOW', 'INACTIVE'];
  if (rcEl) {
    rcEl.innerHTML = riskOrder.map(r => `
      <div class="breakdown-row breakdown-row--link" onclick="switchTab('inventory')" title="${t('btn.viewInventory').replace(/->/g, '→')}">
        ${riskBadge(r)}
        <span class="breakdown-count">${rc[r] || 0}</span>
      </div>
    `).join('');
  }

  // ── Low Stock Alerts ──────────────────────────────────────────────────────
  const alertsEl = document.getElementById('overview-alerts');
  if (alertsEl) {
    const alerts = data.alerts || [];
    alertsEl.innerHTML = alerts.length
      ? alerts.map(a => `
        <div class="breakdown-row">
          <span><strong>${a.product_name}</strong> — ${decisionBadge(a.action)}</span>
          <span style="font-size:12px;color:var(--text-muted)">${(a.created_at || '').slice(0, 16)}</span>
        </div>
      `).join('')
      : `<div class="loading-cell" style="padding:12px !important;">${t('msg.noLowStockAlerts')}</div>`;
  }

  // ── Recent Activity feed ──────────────────────────────────────────────────
  const activityEl = document.getElementById('activity-feed');
  const activity   = data.activity || [];
  if (activityEl) {
    if (activity.length > 0) {
      const iconSvgs = {
        'alert-triangle':  '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
        'upload-cloud':    '<polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>',
        'trending-up':     '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
        'shopping-cart':   '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
      };
      activityEl.innerHTML = activity.map((a, i) => `
        <div class="activity-item" style="animation-delay:${i * 60}ms">
          <div class="activity-icon ${a.type}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              ${iconSvgs[a.icon] || iconSvgs['trending-up']}
            </svg>
          </div>
          <div>
            <div class="activity-message">${translateServerMessage(a.message)}</div>
            <div class="activity-time">${timeAgo(a.time)}</div>
          </div>
        </div>
      `).join('');
    } else {
      activityEl.innerHTML = `<div class="loading-cell" style="padding:12px !important;">${t('common.noRecentActivity')}</div>`;
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   PRODUCTS
   ═══════════════════════════════════════════════════════════ */
async function loadProducts() {
  const data = await apiFetch('/api/products');
  if (!data) return;

  renderProductsTable(data);

  // Search filter
  const search = document.getElementById('product-search');
  if (search) {
    search.addEventListener('input', () => {
      const q = search.value.toLowerCase();
      const filtered = data.filter(p =>
        p.product_name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
      renderProductsTable(filtered, true);
    });
  }
}

function renderProductsTable(data, skipToggle = false) {
  const isManager = window.STOCKLENS_ROLE === 'manager';
  const tbody = document.getElementById('products-body');
  if (!tbody) return;

  tbody.innerHTML = data.map(p => {
    const statusTxt = p.is_active
      ? `<span class="status-active">✓ ${t('status.active')}</span>`
      : `<span class="status-inactive">✗ ${t('status.inactive')}</span>`;

    const seasonTxt = p.is_seasonal
      ? `<span class="badge badge-medium">${p.season || t('yes')}</span>`
      : `<span style="color:var(--text-muted)">${t('no')}</span>`;

    const toggleBtn = isManager ? `
      <button class="btn btn-sm ${p.is_active ? 'btn-danger' : 'btn-success'}"
              onclick="toggleProductStatus(${p.product_id}, this)">
        ${p.is_active ? t('btn.deactivate') : t('btn.activate')}
      </button>
    ` : '';

    return `
      <tr>
        <td><strong>${p.product_name}</strong></td>
        <td class="mobile-hide">${p.sku || '—'}</td>
        <td>${p.category}</td>
        <td class="mobile-hide">${fmtPrice(p.purchase_cost)}</td>
        <td class="mobile-hide">${fmtPrice(p.price)}</td>
        <td><strong>${p.stock_on_hand != null ? p.stock_on_hand : '—'}</strong></td>
        <td class="mobile-hide">${seasonTxt}</td>
        <td>${statusTxt}</td>
        <td>${decisionBadge(p.decision)}</td>
        ${isManager ? `<td>${toggleBtn}</td>` : ''}
      </tr>
    `;
  }).join('') || `<tr><td colspan="${isManager ? 10 : 9}" class="loading-cell">No products found.</td></tr>`;
}

async function toggleProductStatus(productId, btn) {
  btn.disabled = true;
  const res = await fetch(`/api/products/${productId}/toggle-status`, {
    method:      'POST',
    credentials: 'include',
  });
  if (res.ok) {
    invalidateTabs(['overview', 'products', 'inventory', 'decisions', 'forecast', 'evaluation']);
    loadProducts();
    loadOverview();
  }
  btn.disabled = false;
}

/* ═══════════════════════════════════════════════════════════
   EMPTY STATE UTILITY
   ═══════════════════════════════════════════════════════════ */
function renderEmptyState({ icon, title, body, managerCta, staffNote }) {
  const isManager = window.STOCKLENS_ROLE === 'manager';
  const ctaHtml = isManager && managerCta
    ? `<button class="empty-state-cta" onclick="${managerCta.action}">
         <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
           <polyline points="5 12 12 5 19 12"/><line x1="12" y1="5" x2="12" y2="19"/>
         </svg>
         ${managerCta.label}
       </button>`
    : (!isManager && staffNote)
      ? `<span class="empty-state-staff-note">${staffNote}</span>`
      : '';
  return `
    <tr><td colspan="99" style="padding:0;border:none">
      <div class="empty-state">
        <div class="empty-state-icon">${icon}</div>
        <p class="empty-state-title">${title}</p>
        <p class="empty-state-body">${body}</p>
        ${ctaHtml}
      </div>
    </td></tr>`;
}

/* ═══════════════════════════════════════════════════════════
   INVENTORY
   ═══════════════════════════════════════════════════════════ */
async function loadInventory() {
  const data = await apiFetch('/api/inventory');
  if (!data) return;

  const tbody = document.getElementById('inventory-body');
  if (!tbody) return;

  if (!data.length) {
    tbody.innerHTML = renderEmptyState({
      icon: `<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" fill="none"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>`,
      title: 'No inventory data yet',
      body: 'Upload a sales or inventory CSV to populate stock levels and reorder points.',
      managerCta: { action: "goToUploadSection()", label: 'Upload CSV' },
      staffNote: 'Ask your manager to upload inventory data.',
    });
    return;
  }

  window._inventoryData = data;
  renderInventoryRows(data);

  const search = document.getElementById('inventory-search');
  if (search && !search._bound) {
    search._bound = true;
    search.addEventListener('input', () => {
      const q = search.value.toLowerCase();
      renderInventoryRows((window._inventoryData || []).filter(row =>
        (row.product_name || '').toLowerCase().includes(q) ||
        (row.category || '').toLowerCase().includes(q)
      ));
    });
  }
}

function renderInventoryRows(data) {
  const tbody = document.getElementById('inventory-body');
  if (!tbody) return;
  tbody.innerHTML = data.map(row => {
    const rf       = (row.risk_flag || 'low').toLowerCase();
    const rp       = row.reorder_point || 0;
    const stock    = row.stock_on_hand;
    const pct      = rp > 0 ? Math.min(100, Math.round((stock / (rp * 2)) * 100)) : 50;

    return `
      <tr>
        <td><strong>${row.product_name}</strong></td>
        <td>${row.category}</td>
        <td><strong>${stock}</strong></td>
        <td class="mobile-hide">
          <div class="stock-bar-wrap">
            <div class="stock-bar-fill ${rf}" style="width:${pct}%"></div>
          </div>
        </td>
        <td class="mobile-hide">${fmt(rp, 0)}</td>
        <td class="mobile-hide">${fmt(row.order_quantity, 0)}</td>
        <td>${riskBadge(row.risk_flag)}</td>
        <td class="mobile-hide" style="color:var(--text-muted);font-size:12px">${row.last_updated || '—'}</td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="8" class="loading-cell">No inventory rows found.</td></tr>';
}

/* ═══════════════════════════════════════════════════════════
   DECISIONS
   ═══════════════════════════════════════════════════════════ */
function decisionConfidence(d) {
  const hasForecast = d.forecast_demand != null;
  const hasReason   = Boolean(d.reason);
  const hasModel    = Boolean(d.model_used);
  const risk        = d.stockout_prob != null ? parseFloat(d.stockout_prob) : null;

  if (!hasForecast) {
    return { label: t('confidence.low'), cls: 'low', detail: t('confidence.noForecast') };
  }
  if (d.action === 'INACTIVE') {
    return { label: t('confidence.low'), cls: 'low', detail: t('confidence.inactive') };
  }
  if ((d.action === 'REORDER' || risk >= 50) && hasReason && hasModel) {
    return { label: t('confidence.high'), cls: 'high', detail: t('confidence.highDetail') };
  }
  if (d.action === 'AT_RISK' || risk >= 20 || hasReason) {
    return { label: t('confidence.medium'), cls: 'medium', detail: t('confidence.mediumDetail') };
  }
  return { label: t('confidence.high'), cls: 'high', detail: t('confidence.holdDetail') };
}

function decisionReasonPreview(d) {
  const text = translateDecisionReason((d.reason || '').trim());
  if (!text) return t('msg.noReason');
  return text.length > 92 ? `${text.slice(0, 89)}...` : text;
}

async function loadDecisions() {
  const data = await apiFetch('/api/decisions');
  if (!data) return;

  const isManager = window.STOCKLENS_ROLE === 'manager';
  const tbody = document.getElementById('decisions-body');
  if (!tbody) return;

  if (!data.length) {
    tbody.innerHTML = renderEmptyState({
      icon: `<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" fill="none"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
      title: 'No decisions generated yet',
      body: 'Run the forecasting pipeline to generate REORDER, HOLD, AT_RISK, and OVERSTOCK decisions for each product.',
      managerCta: { action: "switchTab('forecast')", label: 'Run Pipeline' },
      staffNote: 'Ask your manager to run the forecasting pipeline.',
    });
    return;
  }

  window._decisionsData = data;

  // Show pending orders bar on decisions tab for managers
  if (isManager) {
    const pendingBar = document.getElementById('decisions-pending-bar');
    if (pendingBar) {
      apiFetch('/api/reorder/pending').then(pending => {
        const n = (pending || []).length;
        pendingBar.innerHTML = n > 0
          ? `<div class="pending-orders-bar" style="margin-bottom:16px">
               <div class="pending-orders-label">
                 <span class="pending-orders-dot"></span>
                 <strong>${tf('overview.pendingOrders', { count: n, plural: plural(n) })}</strong> ${t('orders.awaitingConfirmation')}
               </div>
               <button class="btn btn-sm btn-outline" onclick="openPendingOrdersModal()">${t('btn.confirmDeliveries').replace(/->/g, '→')}</button>
             </div>`
          : '';
      });
    }
  }

  tbody.innerHTML = data.map((d, idx) => {
    const isReorder  = d.action === 'REORDER';
    const orderQty   = d.order_quantity || 0;
    const confidence = decisionConfidence(d);
    const pendingLabel = d.pending_quantity_ordered
      ? (d.pending_expected_arrival
          ? tf('orders.dueDate', { quantity: d.pending_quantity_ordered, date: escapeHtml(d.pending_expected_arrival) })
          : tf('orders.quantityUnits', { quantity: d.pending_quantity_ordered }))
      : '';
    const markBtn    = isManager && isReorder
      ? (d.pending_reorder_id
          ? `<button class="btn btn-xs btn-outline"
                  onclick="openPendingOrdersModal()"
                  title="${tf('orders.pendingDelivery', { detail: pendingLabel })}">
               ${t('btn.pendingDelivery')}
             </button>`
          : `<button class="btn btn-xs btn-primary"
                  onclick="markReorderOrdered(${d.product_id}, window._decisionsData[${idx}].product_name, ${orderQty})"
                  title="${t('btn.orderPlaced')}">
               ${t('btn.orderPlaced')}
             </button>`)
      : (isManager ? '' : '');

    const staffStock = !isManager
      ? `<td class="mobile-hide" style="font-size:13px">${d.stock_on_hand != null ? tf('orders.quantityUnits', { quantity: d.stock_on_hand }) : '—'}</td>
         <td class="mobile-hide" style="font-size:13px">${orderQty > 0 ? tf('orders.quantityUnits', { quantity: orderQty }) : '—'}</td>`
      : '';

    return `
    <tr class="decision-row" data-decision-idx="${idx}" data-decision-action="${d.action || ''}">
      <td><strong>${escapeHtml(d.product_name)}</strong></td>
      <td>${escapeHtml(d.category)}</td>
      <td>${decisionBadge(d.action)}</td>
      ${staffStock}
      ${isManager ? `
        <td class="mobile-hide">${d.forecast_demand != null ? `${fmt(d.forecast_demand)} ${t('common.unitsPerDay')}` : '—'}</td>
        <td class="mobile-hide">
          <span class="confidence-pill ${confidence.cls}" title="${confidence.detail}">${confidence.label}</span>
        </td>
        <td class="mobile-hide">
          <span class="decision-reason-preview" title="${translateDecisionReason(d.reason || '').replace(/"/g, '&quot;')}">${decisionReasonPreview(d)}</span>
        </td>
        <td class="mobile-hide">${markBtn}</td>
        <td class="mobile-hide" style="width:32px;text-align:center">
          <span class="decision-expand-chevron">›</span>
        </td>
      ` : ''}
    </tr>`;
  }).join('');

  setDecisionFilter(currentDecisionFilter);
  bindDecisionSearch();
  markReorderRows();
  if (isManager) attachDecisionRowExpand(tbody);
}

function bindDecisionSearch() {
  const search = document.getElementById('decision-search');
  if (!search || search._bound) return;
  search._bound = true;
  search.addEventListener('input', applyDecisionVisibility);
}

function buildDecisionBrief(d) {
  const ci = (d.lower_bound != null && d.upper_bound != null)
    ? `${fmt(d.lower_bound, 1)} – ${fmt(d.upper_bound, 1)} ${t('common.unitsPerDay')}`
    : '—';
  return `
    <div class="decision-brief-panel">
      <div class="decision-brief-item">
        <span class="decision-brief-label">${t('th.forecastDemand')}</span>
        <span class="decision-brief-value">${d.forecast_demand != null ? `${fmt(d.forecast_demand)} ${t('common.unitsPerDay')}` : '—'}</span>
      </div>
      <div class="decision-brief-item">
        <span class="decision-brief-label">${t('th.range95')}</span>
        <span class="decision-brief-value">${ci}</span>
      </div>
      <div class="decision-brief-item">
        <span class="decision-brief-label">${t('th.reorderPoint')}</span>
        <span class="decision-brief-value">${d.reorder_point != null ? fmt(d.reorder_point, 0) : '—'}</span>
      </div>
      <div class="decision-brief-reason">${translateDecisionReason(d.reason) || t('msg.noReasonPeriod')}</div>
    </div>`;
}

function attachDecisionRowExpand(tbody) {
  if (tbody._decisionExpandBound) return;
  tbody._decisionExpandBound = true;
  tbody.addEventListener('click', e => {
    if (e.target.closest('button, a, select, input')) return;
    const row = e.target.closest('.decision-row');
    if (!row) return;

    const idx    = parseInt(row.dataset.decisionIdx, 10);
    const d      = (window._decisionsData || [])[idx];
    const isOpen = row.classList.contains('is-open');

    // Close any existing open brief
    tbody.querySelectorAll('.decision-brief-row').forEach(r => r.remove());
    tbody.querySelectorAll('.decision-row.is-open').forEach(r => r.classList.remove('is-open'));

    if (!isOpen && d) {
      row.classList.add('is-open');
      const colCount = row.querySelectorAll('td').length;
      const briefRow = document.createElement('tr');
      briefRow.className = 'decision-brief-row';
      briefRow.innerHTML = `<td colspan="${colCount}">${buildDecisionBrief(d)}</td>`;
      row.insertAdjacentElement('afterend', briefRow);
    }
  });
}

window.setDecisionFilter = function(action) {
  currentDecisionFilter = action;
  document.querySelectorAll('.decision-filter').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.decisionFilter === action);
  });
  applyDecisionVisibility();
};

function applyDecisionVisibility() {
  const query = (document.getElementById('decision-search')?.value || '').toLowerCase();
  document.querySelectorAll('#decisions-body .decision-brief-row').forEach(row => row.remove());
  document.querySelectorAll('#decisions-body .decision-row').forEach(row => {
    row.classList.remove('is-open');
    const d = (window._decisionsData || [])[parseInt(row.dataset.decisionIdx, 10)] || {};
    const matchesFilter = currentDecisionFilter === 'ALL' || row.dataset.decisionAction === currentDecisionFilter;
    const matchesSearch = !query || (d.product_name || '').toLowerCase().includes(query) || (d.category || '').toLowerCase().includes(query);
    const show = matchesFilter && matchesSearch;
    row.style.display = show ? '' : 'none';
  });
}

/* ═══════════════════════════════════════════════════════════
   FORECAST  (manager only)
   ═══════════════════════════════════════════════════════════ */
function renderTrendChip(dir, slope) {
  if (!dir) return '—';
  const slopeStr = (slope != null && dir !== 'STABLE')
    ? ` ${slope > 0 ? '+' : ''}${parseFloat(slope).toFixed(1)}/day`
    : '';
  const map = {
    INCREASING: { label: `↑ ${t('forecast.trendIncreasing')}${slopeStr}`,  cls: 'rising'  },
    DECREASING: { label: `↓ ${t('forecast.trendDecreasing')}${slopeStr}`, cls: 'falling' },
    STABLE:     { label: `→ ${t('forecast.trendStable')}`,              cls: 'stable'  },
  };
  const item = map[dir] || { label: dir, cls: 'stable' };
  return `<span class="trend-chip ${item.cls}">${item.label}</span>`;
}

function renderProbGauge(pct) {
  if (pct == null) return '—';
  const p   = parseFloat(pct);
  const cls = p >= 50 ? 'critical' : p >= 20 ? 'warning' : 'safe';
  return `
    <div class="prob-gauge-wrap">
      <span class="prob-gauge-label ${cls}">${p.toFixed(1)}%</span>
      <div class="prob-gauge-bar">
        <div class="prob-gauge-fill ${cls}" style="width:${Math.min(p, 100)}%"></div>
      </div>
    </div>`;
}

function renderDemandRange(lo, hi) {
  if (lo == null || hi == null) return '—';
  return `<span class="demand-range"><strong>${fmt(lo, 1)}</strong> – <strong>${fmt(hi, 1)}</strong> ${t('common.unitsPerDay')}</span>`;
}

/* Keep old names as aliases so any other callers still work */
function trendBadge(dir, slope)  { return renderTrendChip(dir, slope); }
function stockoutBadge(pct)      { return renderProbGauge(pct); }

async function loadForecast() {
  const data = await apiFetch('/api/forecast');
  if (!data) return;

  const tbody = document.getElementById('forecast-body');
  if (!tbody) return;

  if (!data.length) {
    tbody.innerHTML = renderEmptyState({
      icon: `<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" fill="none"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
      title: t('msg.noForecastData'),
      body: 'Upload sales history and run the pipeline to generate demand forecasts.',
      managerCta: { action: "document.getElementById('forecast-run-btn')?.click()", label: t('btn.runFullPipeline') },
      staffNote: 'Ask your manager to run the forecasting pipeline.',
    });
    return;
  }

  tbody.innerHTML = data.map(f => {
    const modelBadge = f.model_used
      ? `<span class="badge" style="font-size:11px;padding:2px 7px">${f.model_used}</span>`
      : '—';
    return `
      <tr>
        <td><strong>${f.product_name}</strong></td>
        <td class="mobile-hide">${f.category}</td>
        <td class="mobile-hide">${modelBadge}</td>
        <td>${fmt(f.forecast_demand)} ${t('common.unitsPerDay')}</td>
        <td class="mobile-hide">${renderDemandRange(f.lower_bound, f.upper_bound)}</td>
        <td class="mobile-hide">${fmt(f.safety_stock, 0)}</td>
        <td>${fmt(f.reorder_point, 0)}</td>
        <td class="mobile-hide"><strong>${f.order_quantity}</strong></td>
        <td class="mobile-hide">${renderTrendChip(f.trend_direction, f.trend_slope)}</td>
        <td class="mobile-hide">${renderProbGauge(f.stockout_prob)}</td>
        <td>${riskBadge(f.risk_flag)}</td>
      </tr>`;
  }).join('');

  // ── Model insight panel ───────────────────────────────────────────────────
  const insightEl = document.getElementById('forecast-model-insight');
  if (insightEl && data.length) {
    // Model distribution
    const modelCounts = {};
    const MODEL_COLOURS = { SMA: '#2D6A4F', WMA: '#475569', SES: '#16A34A', Holt: '#F59E0B' };
    data.forEach(f => {
      if (f.model_used) modelCounts[f.model_used] = (modelCounts[f.model_used] || 0) + 1;
    });
    const total       = data.length;
    const topModel    = Object.entries(modelCounts).sort((a, b) => b[1] - a[1])[0];
    const topModelPct = topModel ? Math.round((topModel[1] / total) * 100) : 0;

    // Stockout risk summary
    const highRisk  = data.filter(f => (f.stockout_prob || 0) >= 50).length;
    const risingDemand = data.filter(f => f.trend_direction === 'INCREASING').length;

    const distSegments = Object.entries(modelCounts)
      .map(([m, n]) => {
        const pct   = Math.round((n / total) * 100);
        const color = MODEL_COLOURS[m] || '#475569';
        return `<div class="model-dist-segment" style="width:${pct}%;background:${color}" title="${m}: ${n} ${t('nav.products').toLowerCase()} (${pct}%)"></div>`;
      }).join('');

    const modelLegend = Object.entries(modelCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([m, n]) => {
        const color = MODEL_COLOURS[m] || '#475569';
        return `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;font-size:11px;color:var(--text-muted)">
          <span style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0"></span>${m}: ${n}
        </span>`;
      }).join('');

    const riskCls = highRisk > total * 0.3 ? 'critical' : highRisk > 0 ? 'warning' : 'positive';

    insightEl.innerHTML = `
      <div class="model-insight-panel">
        <div class="model-insight-kpi">
          <span class="model-insight-label">${t('forecast.productsForecast')}</span>
          <span class="model-insight-value">${total}</span>
          <span class="model-insight-sub">${tf('forecast.withRisingDemand', { count: risingDemand })}</span>
        </div>
        <div class="model-insight-kpi">
          <span class="model-insight-label">${t('forecast.dominantModel')}</span>
          <span class="model-insight-value positive">${topModel ? topModel[0] : '—'}</span>
          <span class="model-insight-sub">${tf('forecast.lowestMae', { pct: topModelPct })}</span>
        </div>
        <div class="model-insight-kpi">
          <span class="model-insight-label">${t('forecast.highStockoutRisk')}</span>
          <span class="model-insight-value ${riskCls}">${highRisk}</span>
          <span class="model-insight-sub">${t('forecast.productsStockoutProb')}</span>
        </div>
        <div class="model-insight-kpi" style="grid-column:1/-1">
          <span class="model-insight-label">${t('forecast.modelDistribution')}</span>
          <div class="model-dist-bar" style="margin-top:6px">${distSegments}</div>
          <div style="margin-top:6px">${modelLegend}</div>
        </div>
      </div>`;
  }

  const btn = document.getElementById('forecast-run-btn');
  if (btn && !btn._bound) {
    btn._bound = true;
    btn.addEventListener('click', () => {
      openProductModal(t('btn.runFullPipeline'), `
        <p class="modal-help">${t('forecast.runFullPipelineHelp')}</p>
        <div class="modal-form-actions">
          <button class="btn btn-outline" type="button" onclick="closeProductModal()">${t('common.cancel')}</button>
          <button class="btn btn-primary" type="button" onclick="runFullPipelineFromModal()">${t('forecast.yesRecalculateAll')}</button>
        </div>`);
    });
  }
}

window.runFullPipelineFromModal = async function() {
  const btn = document.getElementById('forecast-run-btn');
  closeProductModal();
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = t('common.running');
  }
  const res = await fetch('/api/pipeline/run', { method: 'POST', credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  invalidateTabs(['forecast','overview','decisions','evaluation','scenario','classification']);
  if (res.ok && data.job_id) {
    showToast(t('team.pipelineQueued'));
    pollPipelineJob(data.job_id, () => {
      showToast(t('msg.pipelineComplete'));
      loadForecast();
      loadOverview();
    }, (job) => showToast(job.error || job.message || t('msg.pipelineFailed'), 'error'));
  } else if (res.ok) {
    showToast(data.message || t('team.pipelineQueued'));
  } else {
    showToast(data.message || t('msg.pipelineFailed'), 'error');
  }
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="play" style="width:14px;height:14px;margin-right:6px;"></i>${t('btn.runFullPipeline')}`;
    if (window.lucide) lucide.createIcons();
  }
};

/* ═══════════════════════════════════════════════════════════
   ANALYTICS  (manager only)
   ═══════════════════════════════════════════════════════════ */
let _analyticsRunning = false;

async function loadAnalytics() {
  if (_analyticsRunning) return;
  _analyticsRunning = true;
  try {
    const isManager = window.STOCKLENS_ROLE === 'manager';
    const [salesData, fvaData, invData, productsData] = await Promise.all([
      apiFetch('/api/analytics/sales'),
      isManager ? apiFetch('/api/analytics/forecast-vs-actual') : Promise.resolve(null),
      apiFetch('/api/analytics/inventory'),
      apiFetch('/api/products'),
    ]);
    if (salesData) renderSalesChart(salesData);
    if (fvaData) {
      renderFvaChart(fvaData);
    } else if (!isManager) {
      const canvas = document.getElementById('chart-fva');
      if (canvas) {
        canvas.style.display = 'none';
        if (!canvas.parentElement.querySelector('.chart-empty-state')) {
          canvas.insertAdjacentHTML(
            'afterend',
            `<div class="chart-empty-state">${t('chart.managerOnlyFva')}</div>`,
          );
        }
      }
    }
    if (invData)   renderInventoryChart(invData);
    if (productsData) renderCategoryChart(productsData);
    if (salesData) renderTopProductsChart(salesData);
  } finally {
    _analyticsRunning = false;
  }
}

/* ═══════════════════════════════════════════════════════════
   EVALUATION  (manager only)
   ═══════════════════════════════════════════════════════════ */
function trackingSignalBadge(ts) {
  if (ts == null) return '—';
  const v   = parseFloat(ts);
  const abs = Math.abs(v);
  const cls = abs > 4 ? 'color:#dc2626;font-weight:600' : abs > 2 ? 'color:#d97706' : 'color:var(--text-muted)';
  const warn = abs > 4 ? ' ⚠' : '';
  return `<span style="font-size:12px;${cls}">${v.toFixed(2)}${warn}</span>`;
}

function biasBadge(bias) {
  if (bias == null) return '—';
  const v = parseFloat(bias);
  const cls = v > 1 ? 'color:var(--semantic-warning)' : v < -1 ? 'color:var(--semantic-positive)' : 'color:var(--text-muted)';
  const dir = v > 0.1 ? '▲' : v < -0.1 ? '▼' : '≈';
  return `<span style="font-size:12px;${cls}">${dir} ${v.toFixed(2)}</span>`;
}

async function loadEvaluation() {
  const data = await apiFetch('/api/evaluation');
  if (!data) return;

  const sumEl = document.getElementById('eval-summary');
  if (sumEl && data.length === 0) {
    sumEl.innerHTML = '';
    const evTbody = document.getElementById('evaluation-body');
    if (evTbody) {
      evTbody.innerHTML = renderEmptyState({
        icon: `<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" fill="none"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>`,
        title: 'No evaluation data yet',
        body: 'Run the pipeline after uploading sales data to generate forecast accuracy metrics.',
        managerCta: { action: "switchTab('forecast')", label: 'Run Pipeline' },
        staffNote: 'Ask your manager to run the forecasting pipeline.',
      });
    }
    return;
  }
  if (sumEl && data.length > 0) {
    const avgAcc  = data.reduce((s, d) => s + (d.accuracy_pct || 0), 0) / data.length;
    const avgMae  = data.reduce((s, d) => s + (d.mae || 0), 0) / data.length;
    const avgRmse = data.reduce((s, d) => s + (d.rmse || 0), 0) / data.length;
    const avgMase = data.filter(d => d.mase != null).reduce((s, d) => s + d.mase, 0)
                  / (data.filter(d => d.mase != null).length || 1);
    const beatsNaive = data.filter(d => d.naive_mase != null && d.naive_mase < 1).length;
    sumEl.innerHTML = `
      <div class="eval-kpi">
        <div class="eval-kpi-val ${accuracyClass(avgAcc)}">${avgAcc.toFixed(1)}%</div>
        <div class="eval-kpi-label">${t('eval.avgAccuracy')}</div>
      </div>
      <div class="eval-kpi">
        <div class="eval-kpi-val">${avgMae.toFixed(2)}</div>
        <div class="eval-kpi-label">${t('eval.avgMae')}</div>
      </div>
      <div class="eval-kpi">
        <div class="eval-kpi-val">${avgRmse.toFixed(2)}</div>
        <div class="eval-kpi-label">${t('evaluation.avgRmse')}</div>
      </div>
      <div class="eval-kpi">
        <div class="eval-kpi-val ${avgMase < 1 ? 'accuracy-high' : 'accuracy-low'}">${avgMase.toFixed(2)}</div>
        <div class="eval-kpi-label">${t('evaluation.avgMase')} <span style="font-size:10px;opacity:.7">${t('evaluation.beatsNaiveHint')}</span></div>
      </div>
      <div class="eval-kpi">
        <div class="eval-kpi-val ${beatsNaive === data.length ? 'accuracy-high' : beatsNaive > data.length / 2 ? 'accuracy-medium' : 'accuracy-low'}">${beatsNaive}/${data.length}</div>
        <div class="eval-kpi-label">${t('evaluation.beatNaive')}</div>
      </div>
      <div class="eval-kpi">
        <div class="eval-kpi-val">${data.length}</div>
        <div class="eval-kpi-label">${t('eval.products')}</div>
      </div>`;
  }

  const tbody = document.getElementById('evaluation-body');
  if (!tbody) return;

  tbody.innerHTML = data.map(e => {
    const ac = accuracyClass(e.accuracy_pct);
    const nm = e.naive_mase != null ? e.naive_mase : null;
    const nmCls = nm != null ? (nm < 1 ? 'accuracy-high' : 'accuracy-low') : '';
    const nmLabel = nm != null ? `<span class="${nmCls}" style="font-size:12px">${nm.toFixed(3)}</span>` : '—';
    return `
      <tr>
        <td><strong>${e.product_name}</strong></td>
        <td>${e.category}</td>
        <td>${fmt(e.predicted_demand)}</td>
        <td>${fmt(e.actual_demand)}</td>
        <td>${fmt(e.mae, 3)}</td>
        <td class="mobile-hide" style="font-size:12px;color:var(--text-muted)">${e.naive_mae != null ? fmt(e.naive_mae, 3) : '—'}</td>
        <td class="mobile-hide">${fmt(e.rmse, 3)}</td>
        <td class="mobile-hide">${biasBadge(e.bias)}</td>
        <td>${nmLabel}</td>
        <td class="mobile-hide">${trackingSignalBadge(e.tracking_signal)}</td>
        <td><span class="${ac}">${e.accuracy_pct}%</span></td>
        <td class="mobile-hide" style="font-size:11px;color:var(--text-muted)">${e.eval_period || '—'}</td>
      </tr>`;
  }).join('');
}

/* ═══════════════════════════════════════════════════════════
   SCENARIO  (manager only)
   ═══════════════════════════════════════════════════════════ */
function renderScenarioRows(data, tbodyId) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = data.map(s => {
    const imp    = s.improvement.stockout_reduction;
    const impCls = imp > 0 ? 'improvement-positive' : imp < 0 ? 'improvement-negative' : 'improvement-zero';
    const impTxt = imp > 0
      ? tf('scenario.stockoutDaysChange', { sign: '−', days: imp })
      : imp < 0
        ? tf('scenario.stockoutDaysChange', { sign: '+', days: Math.abs(imp) })
        : t('scenario.noChange');
    return `
      <tr>
        <td><strong>${s.product_name}</strong></td>
        <td>${s.without_system.stockout_days}</td>
        <td>${s.with_system.stockout_days}</td>
        <td>${s.without_system.overstock_days}</td>
        <td>${s.with_system.overstock_days}</td>
        <td>${s.without_system.total_reorders}</td>
        <td>${s.with_system.total_reorders}</td>
        <td>${s.adjusted_order_qty != null ? s.adjusted_order_qty : '—'}</td>
        <td><span class="${impCls}">${impTxt}</span></td>
      </tr>`;
  }).join('') || `<tr><td colspan="9" class="loading-cell">${t('msg.noData')}</td></tr>`;
}

async function loadScenario() {
  const data = await apiFetch('/api/scenario');
  if (!data) return;
  renderScenarioChart(data);
  renderScenarioRows(data, 'scenario-body');
  initScenarioBuilder();
}

function initScenarioBuilder() {
  const btn = document.getElementById('scenario-run-btn');
  if (!btn || btn._bound) return;
  btn._bound = true;
  btn.addEventListener('click', runCustomScenario);
}

async function runCustomScenario() {
  const btn      = document.getElementById('scenario-run-btn');
  const resultEl = document.getElementById('scenario-builder-result');
  const demand   = parseFloat(document.getElementById('scenario-demand')?.value   || 1.0);
  const leadtime = parseInt(document.getElementById('scenario-leadtime')?.value   || 7);
  const horizon  = parseInt(document.getElementById('scenario-horizon')?.value    || 90);

  btn.textContent = t('common.running');
  btn.disabled    = true;
  if (resultEl) resultEl.textContent = '';

  try {
    const res  = await fetch('/api/scenario', {
      method:      'POST',
      credentials: 'include',
      headers:     { 'Content-Type': 'application/json' },
      body:        JSON.stringify({ demand_shock: demand, lead_time: leadtime, horizon }),
    });
    const data = await res.json();

    if (Array.isArray(data) && data.length > 0) {
      const totalSO    = data.reduce((s, d) => s + d.with_system.stockout_days, 0);
      const totalImp   = data.reduce((s, d) => s + d.improvement.stockout_reduction, 0);
      const worstItems = [...data].sort((a, b) => b.with_system.stockout_days - a.with_system.stockout_days).slice(0, 3);

      let verdictText, verdictCls;
      if (totalImp > 0) {
        const pct = totalSO > 0 ? Math.round((totalImp / (totalSO + totalImp)) * 100) : 0;
        verdictText = tf('scenario.prevents', { days: totalImp, plural: plural(totalImp), pct, horizon, demand });
        verdictCls  = 'positive';
      } else if (totalImp < 0) {
        verdictText = tf('scenario.adds', { days: Math.abs(totalImp), plural: plural(Math.abs(totalImp)) });
        verdictCls  = 'critical';
      } else {
        verdictText = tf('scenario.neutral', { demand });
        verdictCls  = 'neutral';
      }

      const worstHtml = worstItems.length
        ? `<div style="margin-top:10px;font-size:12px;color:var(--text-muted)">${tf('scenario.mostExposed', { products: worstItems.map(d => `<strong>${d.product_name}</strong> (${d.with_system.stockout_days}d)`).join(', ') })}</div>`
        : '';

      if (resultEl) {
        resultEl.innerHTML = `<div class="scenario-verdict scenario-verdict--${verdictCls}">${verdictText}${worstHtml}</div>`;
      }
      renderScenarioChart(data);
      renderScenarioRows(data, 'scenario-body');
    } else {
      if (resultEl) resultEl.textContent = t('msg.noResultsReturned');
    }
  } catch (e) {
    if (resultEl) resultEl.innerHTML = `<span style="color:var(--danger)">${t('msg.simulationFailed')}</span>`;
  }
  btn.textContent = t('btn.runSimulation');
  btn.disabled    = false;
}

/* ═══════════════════════════════════════════════════════════
   ABC-XYZ CLASSIFICATION  (manager only)
   ═══════════════════════════════════════════════════════════ */
const ABC_COLOURS = { A: '#16A34A', B: '#F59E0B', C: '#475569' };
const XYZ_COLOURS = { X: '#16A34A', Y: '#F59E0B', Z: '#DC2626' };

async function loadClassification() {
  const data = await apiFetch('/api/classification');
  if (!data) return;

  if (!data.length) {
    const clTbody = document.getElementById('classification-body');
    const matrixEl2 = document.getElementById('abc-xyz-matrix');
    if (matrixEl2) matrixEl2.innerHTML = '';
    if (clTbody) {
      clTbody.innerHTML = renderEmptyState({
        icon: `<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" fill="none"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
        title: 'No classification data yet',
        body: 'Run the pipeline to classify products by value (ABC) and demand variability (XYZ).',
        managerCta: { action: "switchTab('forecast')", label: 'Run Pipeline' },
        staffNote: 'Ask your manager to run the forecasting pipeline.',
      });
    }
    return;
  }

  // ABC-XYZ 3×3 heatmap summary
  const matrixEl = document.getElementById('abc-xyz-matrix');
  if (matrixEl) {
    const counts = {};
    data.forEach(d => { counts[d.combined_class] = (counts[d.combined_class] || 0) + 1; });
    const abcs = ['A','B','C'], xyzs = ['X','Y','Z'];
    const classStrategy = {
      AX: t('abc.strategy.AX'),
      AY: t('abc.strategy.AY'),
      AZ: t('abc.strategy.AZ'),
      BX: t('abc.strategy.BX'),
      BY: t('abc.strategy.BY'),
      BZ: t('abc.strategy.BZ'),
      CX: t('abc.strategy.CX'),
      CY: t('abc.strategy.CY'),
      CZ: t('abc.strategy.CZ'),
    };
    const cellStyle = (cls) => {
      const n = counts[cls] || 0;
      const bg = n > 0 ? `rgba(37,99,235,${Math.min(0.15 + n * 0.12, 0.7)})` : 'var(--surface)';
      return `background:${bg};border:1px solid var(--border);border-radius:6px;
              padding:12px;text-align:center;min-width:70px`;
    };
    matrixEl.innerHTML = `
      <div style="display:inline-grid;grid-template-columns:40px repeat(3,80px);gap:4px;margin-bottom:16px">
        <div></div>
        ${xyzs.map(x => `<div style="text-align:center;font-weight:600;font-size:13px;color:${XYZ_COLOURS[x]}">${x}</div>`).join('')}
        ${abcs.map(a => `
          <div style="font-weight:600;font-size:13px;color:${ABC_COLOURS[a]};display:flex;align-items:center">${a}</div>
          ${xyzs.map(x => {
            const cls = a + x; const n = counts[cls] || 0;
            return `<div style="${cellStyle(cls)}">
              <div style="font-size:18px;font-weight:700">${n}</div>
              <div style="font-size:10px;color:var(--text-muted)">${cls}</div>
              <div style="font-size:10px;color:var(--text-muted)">${classStrategy[cls] || ''}</div>
            </div>`;
          }).join('')}
        `).join('')}
      </div>
      <p style="font-size:12px;color:var(--text-muted);margin:0">
        ${t('scenario.darkerHelp')}
      </p>`;
  }

  // Table
  const tbody = document.getElementById('classification-body');
  if (!tbody) return;

  tbody.innerHTML = data.map(d => {
    const abcStyle = `color:${ABC_COLOURS[d.abc_class]||'inherit'};font-weight:700`;
    const xyzStyle = `color:${XYZ_COLOURS[d.xyz_class]||'inherit'};font-weight:700`;
    const combined = d.combined_class || '—';
    return `
      <tr>
        <td><strong>${d.product_name}</strong></td>
        <td>${d.category}</td>
        <td><span style="${abcStyle}">${d.abc_class}</span></td>
        <td><span style="${xyzStyle}">${d.xyz_class}</span></td>
        <td><span class="badge" style="font-size:12px">${combined}</span></td>
        <td>${d.revenue_contribution != null ? d.revenue_contribution.toFixed(1) + '%' : '—'}</td>
        <td>${d.cv != null ? d.cv.toFixed(3) : '—'}</td>
        <td>${d.review_frequency || '—'}</td>
        <td style="font-size:12px;color:var(--text-muted);max-width:220px">${d.strategy || '—'}</td>
      </tr>`;
  }).join('') || `<tr><td colspan="9" class="loading-cell">${t('msg.noClassificationData')} — ${t('btn.runFullPipeline')}</td></tr>`;
}

/* ═══════════════════════════════════════════════════════════
   CSV UPLOAD
   ═══════════════════════════════════════════════════════════ */
let uploadFiles = [];

function loadUpload() {
  prepareUploadTab();
  initUpload();
  loadUploadHistory();
}

function initUpload() {
  const zone    = document.getElementById('upload-drop-zone');
  const input   = document.getElementById('upload-input');
  const actions = document.getElementById('upload-actions');
  const listEl  = document.getElementById('upload-file-list');
  const result  = document.getElementById('upload-result');
  if (!zone || zone._bound) return;
  zone._bound = true;

  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', () => { addFiles(Array.from(input.files)); input.value = ''; });
  zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    addFiles(Array.from(e.dataTransfer.files).filter(f =>
      /\.(csv|xlsx|xls)$/i.test(f.name)
    ));
  });

  document.getElementById('upload-preview-btn')?.addEventListener('click', doPreview);
  document.getElementById('upload-submit-btn')?.addEventListener('click', () => doUpload());
  document.getElementById('upload-clear-btn')?.addEventListener('click', () => {
    uploadFiles = [];
    renderFileList();
    actions.style.display = 'none';
    result.style.display  = 'none';
  });
  document.getElementById('preview-confirm-btn')?.addEventListener('click', () => {
    closeModal();
    doUpload();
  });
  document.getElementById('preview-cancel-btn')?.addEventListener('click', closeModal);

  function addFiles(newFiles) {
    const existing = new Set(uploadFiles.map(f => f.name));
    newFiles.forEach(f => { if (!existing.has(f.name)) uploadFiles.push(f); });
    renderFileList();
    if (uploadFiles.length > 0) actions.style.display = 'flex';
  }

  function renderFileList() {
    const icons = { csv: '📄', xlsx: '📊', xls: '📊' };
    listEl.innerHTML = uploadFiles.map((f, i) => {
      const ext  = f.name.split('.').pop().toLowerCase();
      const icon = icons[ext] || '📄';
      return `
        <div class="upload-file-item">
          <span class="upload-file-name">${icon} ${f.name}</span>
          <span style="display:flex;align-items:center;gap:8px">
            <span class="upload-file-size">${(f.size / 1024).toFixed(1)} KB</span>
            <span class="upload-file-remove" onclick="removeUploadFile(${i})">✕</span>
          </span>
        </div>`;
    }).join('');
  }

  function closeModal() {
    const modal = document.getElementById('upload-preview-modal');
    if (modal) modal.style.display = 'none';
  }

  function renderPreviewBody(previews) {
    return previews.map(p => {
      if (p.skipped) return `<div style="color:var(--danger);margin-bottom:8px">✗ ${p.file} — ${translateServerMessage(p.reason)}</div>`;
      const cols    = p.detected_cols || {};
      const fmt     = cols.format && cols.format !== 'standard'
        ? `<div style="color:var(--accent);font-size:12px;margin-bottom:6px">📋 Auto-detected: ${cols.format}</div>` : '';
      const mapping = ['date','product','units','price','stock']
        .filter(k => cols[k])
        .map(k => `<span class="badge">${k} → <strong>${cols[k]}</strong></span>`)
        .join(' ');
      const samples = (p.sample_rows || []).map(r =>
        `<tr><td>${r.date}</td><td>${r.product}</td><td>${r.units}</td></tr>`
      ).join('');
      const errs = (p.errors || []).length
        ? `<div style="color:var(--danger);margin-top:6px;font-size:13px">${p.errors.join('<br>')}</div>` : '';
      return `
        <div style="border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:12px">
          <div style="font-weight:600;margin-bottom:8px">📄 ${p.file}</div>
          ${fmt}
          <div style="margin-bottom:6px;font-size:13px">${mapping || t('upload.noColumnsMatched')}</div>
          <table class="data-table" style="font-size:13px;margin-bottom:6px">
            <thead><tr><th>${t('th.date')}</th><th>${t('th.product')}</th><th>${t('chart.units')}</th></tr></thead>
            <tbody>${samples || `<tr><td colspan="3" style="text-align:center">${t('upload.noPreviewRows')}</td></tr>`}</tbody>
          </table>
          <div style="font-size:13px;color:var(--text-muted)">
            ${p.rows_importable} new rows &bull;
            ${p.skipped_duplicates || 0} duplicates &bull;
            ${p.skipped_returns || 0} returns &bull;
            ${(p.new_products||[]).length} ${t('th.newProducts').toLowerCase()}
            ${(p.new_products||[]).length ? ': ' + p.new_products.join(', ') : ''}
          </div>
          ${errs}
        </div>`;
    }).join('');
  }

  async function doPreview() {
    if (uploadFiles.length === 0) return;
    const btn = document.getElementById('upload-preview-btn');
    btn.textContent = t('common.loading');
    btn.disabled    = true;

    const formData = new FormData();
    uploadFiles.forEach(f => formData.append('files[]', f));

    try {
      const res  = await fetchWithTimeout('/api/upload/preview', { method: 'POST', credentials: 'include', body: formData });
      const data = await res.json();
      const modal = document.getElementById('upload-preview-modal');
      const body  = document.getElementById('preview-modal-body');
      if (modal && body) {
        body.innerHTML  = renderPreviewBody(data.previews || []);
        modal.style.display = 'flex';
      }
    } catch (e) {
      showToast(t('upload.previewFailed'), 'error');
    }

    btn.textContent = t('common.preview');
    btn.disabled    = false;
  }

  async function doUpload() {
    if (uploadFiles.length === 0) return;

    const btn = document.getElementById('upload-submit-btn');
    btn.textContent = t('common.uploading');
    btn.disabled    = true;
    result.style.display = 'none';

    const stopProgress = simulatePipelineProgress();

    const formData = new FormData();
    uploadFiles.forEach(f => formData.append('files[]', f));

    try {
      const res  = await fetchWithTimeout('/api/upload/sales', { method: 'POST', credentials: 'include', body: formData });
      const data = await res.json();

      stopProgress(res.ok && data.success);
      result.style.display = 'block';

      if (res.ok && data.success) {
        result.className = 'upload-result success';
        const fileSummary = (data.file_summaries || []).map(s => {
          if (s.skipped) return `<div>✗ ${s.file} — ${translateServerMessage(s.reason)}</div>`;
          const parts = [tf('upload.rowsInserted', { count: s.rows_inserted })];
          if (s.skipped_duplicates) parts.push(tf('upload.duplicatesSkipped', { count: s.skipped_duplicates }));
          if (s.skipped_returns)    parts.push(tf('upload.returnsSkipped', { count: s.skipped_returns }));
          if (s.inventory_updates)  parts.push(tf('upload.stockUpdated', { count: s.inventory_updates }));
          if ((s.new_products||[]).length) parts.push(tf('upload.newProducts', { names: s.new_products.join(', ') }));
          return `<div>✓ ${s.file} — ${parts.join(' &bull; ')}</div>`;
        }).join('');

        const cs = data.cleaning_summary || {};
        const cleaningHtml = cs.cleaning_steps ? `
          <div class="upload-cleaning-summary">
            <div class="upload-cleaning-title">${t('upload.cleaningApplied')}</div>
            <div class="upload-cleaning-grid">
              <span>${t('upload.rowsAccepted')}</span><strong>${cs.rows_accepted || 0}</strong>
              <span>${t('upload.duplicatesRemoved')}</span><strong>${cs.duplicates_removed || 0}</strong>
              <span>${t('upload.negativesRemoved')}</span><strong>${cs.negatives_removed || 0}</strong>
              <span>${t('upload.stockLevelsUpdated')}</span><strong>${cs.stock_levels_updated || 0}</strong>
              <span>${t('upload.newProductsCreated')}</span><strong>${cs.new_products_created || 0}</strong>
            </div>
          </div>` : '';

        const dq = data.data_quality || {};
        const dqColor = dq.quality_label === 'Good' ? '#16a34a' : dq.quality_label === 'Fair' ? '#d97706' : '#dc2626';
        const dqWarnings = (dq.data_quality_warnings || []);
        const dqWarningsHtml = dqWarnings.length ? `
          <details class="upload-dq-warnings">
            <summary style="cursor:pointer;font-size:12px;color:var(--text-muted);margin-top:6px">
              ${tf('upload.qualityNotes', { count: dqWarnings.length, plural: plural(dqWarnings.length) })} ▾
            </summary>
            <ul style="margin:6px 0 0 16px;font-size:12px;color:var(--text-muted)">
              ${dqWarnings.map(w => `<li>${translateServerMessage(w)}</li>`).join('')}
            </ul>
          </details>` : '';
        const dqHtml = dq.quality_label ? `
          <div style="margin-top:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <span style="font-size:12px;font-weight:500">${t('upload.quality')}</span>
            <span class="badge" style="background:${dqColor};color:#fff;font-size:11px">
              ${dq.quality_label} &nbsp;${dq.quality_score}%
            </span>
            ${dqWarningsHtml}
          </div>` : '';

        result.innerHTML = `
          <div class="upload-result-title">✓ ${translateServerMessage(data.message)}</div>
          <div class="upload-file-summary">${fileSummary}</div>
          ${cleaningHtml}
          ${dqHtml}`;

        uploadFiles = [];
        renderFileList();
        actions.style.display = 'none';

        invalidateTabs(['overview','products','decisions','forecast','analytics','evaluation','scenario']);
        loadOverview();
        loadUploadHistory();
        if (data.pipeline_job_id) {
          pollPipelineJob(data.pipeline_job_id, () => {
            showToast(t('msg.pipelineComplete'));
            invalidateTabs(['overview','products','inventory','decisions','forecast','analytics','evaluation','scenario','classification']);
            loadOverview();
          }, (job) => showToast(job.error || job.message || t('msg.pipelineFailed'), 'error'));
        }
      } else {
        result.className = 'upload-result error';
        const detail = (data.file_summaries || []).map(s => {
          if (!s.skipped && s.detected_cols) {
            const dc = s.detected_cols;
            return `<div style="font-size:12px;margin-top:4px">
              ${tf('upload.detectedColumns', { file: s.file, columns: (dc.all_headers||[]).join(', ') })}<br>
              ${tf('upload.detectedMapping', { date: dc.date || 'NOT FOUND', product: dc.product || 'NOT FOUND', units: dc.units || 'NOT FOUND' })}
            </div>`;
          }
          return s.skipped ? `<div>${s.file}: ${s.reason}</div>` : '';
        }).join('');
        result.innerHTML = `
          <div class="upload-result-title">✗ ${translateServerMessage(data.error || data.message || t('msg.uploadFailed'))}</div>
          ${detail}
          <div style="font-size:12px;margin-top:8px;color:inherit;opacity:.75">
            ${t('upload.renameColumns')} <strong>date, product_name, units_sold</strong>
          </div>`;
      }
    } catch (e) {
      stopProgress(false);
      result.className     = 'upload-result error';
      result.style.display = 'block';
      result.innerHTML     = `<div class="upload-result-title">✗ ${e.name === 'AbortError' ? t('msg.uploadTimeout') : t('msg.networkError')}</div>`;
    }

    btn.textContent = t('upload.submit');
    btn.disabled    = false;
  }
}

function simulatePipelineProgress() {
  const container = document.getElementById('pipeline-progress');
  const fillEl    = document.getElementById('pipeline-progress-fill');
  const labelEl   = document.getElementById('pipeline-progress-label');
  const pctEl     = document.getElementById('pipeline-progress-pct');
  const stepsEl   = document.getElementById('pipeline-progress-steps');
  if (!container) return () => {};

  const stages = [
    { label: t('upload.stageUploading'),  pct: 15,  ms: 300  },
    { label: t('upload.stageCleaning'),   pct: 35,  ms: 700  },
    { label: t('upload.stageInventory'),  pct: 55,  ms: 500  },
    { label: t('upload.stageForecast'),   pct: 75,  ms: 800  },
    { label: t('upload.stageDecisions'),  pct: 90,  ms: 400  },
    { label: t('upload.stageFinalising'), pct: 98,  ms: 300  },
  ];

  container.style.display = 'block';
  stepsEl.innerHTML = stages.map((s, i) =>
    `<div class="pipeline-step" id="pipe-step-${i}">
       <span class="pipeline-step-dot"></span>
       <span>${s.label}</span>
     </div>`
  ).join('');

  let current = 0;
  let timers  = [];
  let elapsed = 0;

  stages.forEach((s, i) => {
    elapsed += s.ms;
    const t = setTimeout(() => {
      // Mark previous done
      if (i > 0) {
        const prev = document.getElementById(`pipe-step-${i - 1}`);
        if (prev) { prev.classList.remove('active'); prev.classList.add('done'); }
      }
      const step = document.getElementById(`pipe-step-${i}`);
      if (step) step.classList.add('active');
      if (fillEl) fillEl.style.width = s.pct + '%';
      if (pctEl)  pctEl.textContent  = s.pct + '%';
      if (labelEl) labelEl.textContent = s.label + '…';
    }, elapsed);
    timers.push(t);
  });

  return function stop(success) {
    timers.forEach(clearTimeout);
    // Mark all steps done or error
    stages.forEach((_, i) => {
      const step = document.getElementById(`pipe-step-${i}`);
      if (step) {
        step.classList.remove('active');
        step.classList.add(success ? 'done' : 'error');
      }
    });
    if (fillEl) fillEl.style.width = success ? '100%' : fillEl.style.width;
    if (pctEl)  pctEl.textContent  = success ? '100%' : pctEl.textContent;
    if (labelEl) labelEl.textContent = success ? t('common.complete') : t('common.failed');
    // Hide after 2s
    setTimeout(() => { container.style.display = 'none'; }, 2000);
  };
}

async function loadUploadHistory() {
  const tbody = document.getElementById('upload-history-body');
  if (!tbody) return;
  try {
    const res  = await fetch('/api/upload/history', { credentials: 'include' });
    const rows = await res.json();
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">${t('msg.noUploadsYet')}</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map(r => `
      <tr>
        <td>${r.filename}</td>
        <td>${r.uploaded_by || '—'}</td>
        <td>${r.rows_inserted}</td>
        <td>${r.new_products}</td>
        <td>${r.skipped_duplicates}</td>
        <td>${r.inventory_updates}</td>
        <td style="color:var(--text-muted);font-size:12px">${(r.uploaded_at||'').slice(0,16)}</td>
      </tr>`).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:var(--danger)">${t('msg.failedLoadHistory')}</td></tr>`;
  }
}

/* ═══════════════════════════════════════════════════════════
   TEAM (manager only)
   ═══════════════════════════════════════════════════════════ */
async function loadTeam() {
  const rows = await apiFetch('/api/staff/list');
  const tbody = document.getElementById('team-body');
  if (!tbody) return;
  if (!rows) {
    tbody.innerHTML = `<tr><td colspan="5" class="loading-cell">${t('msg.failedLoadTeam')}</td></tr>`;
    return;
  }

  const me = await apiFetch('/api/me');
  const myId = me?.user_id;

  tbody.innerHTML = rows.map((u) => `
    <tr>
      <td><strong>${u.username}</strong></td>
      <td class="mobile-hide">${u.email || '—'}</td>
      <td>
        <select onchange="teamSetRole(${u.user_id}, this.value)" ${u.user_id === myId ? 'disabled' : ''}>
          <option value="manager" ${u.role === 'manager' ? 'selected' : ''}>${t('team.manager')}</option>
          <option value="staff" ${u.role === 'staff' ? 'selected' : ''}>${t('team.staff')}</option>
        </select>
      </td>
      <td class="mobile-hide">
        ${u.is_active ? `<span class="status-active">${t('status.active')}</span>` : `<span class="status-inactive">${t('status.inactive')}</span>`}
        ${u.email_verified ? `<span class="badge badge-low" style="margin-left:6px">${t('team.verified')}</span>` : `<span class="badge badge-medium" style="margin-left:6px">${t('team.unverified')}</span>`}
      </td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="teamRemove(${u.user_id})" ${u.user_id === myId ? 'disabled' : ''}>${t('btn.deactivate')}</button>
      </td>
    </tr>
  `).join('');

  const invBtn = document.getElementById('team-generate-invite-btn');
  if (invBtn && !invBtn._bound) {
    invBtn._bound = true;
    invBtn.addEventListener('click', teamGenerateInvite);
  }

  const pipelineBtn = document.getElementById('team-run-pipeline-btn');
  if (pipelineBtn && !pipelineBtn._bound) {
    pipelineBtn._bound = true;
    pipelineBtn.addEventListener('click', teamRunPipeline);
  }

  bindCompanySettings();
}

async function bindCompanySettings() {
  const currencyInput = document.getElementById('company-currency-symbol');
  const saveBtn = document.getElementById('company-save-settings-btn');
  const deleteCompanyBtn = document.getElementById('company-delete-btn');
  const deleteAccountBtn = document.getElementById('account-delete-btn');
  const resendEmailBtn = document.getElementById('email-resend-btn');
  if (currencyInput && !currencyInput._loaded) {
    currencyInput._loaded = true;
    const settings = await apiFetch('/api/company/settings');
    if (settings?.currency_symbol) currencyInput.value = settings.currency_symbol;
  }
  if (saveBtn && !saveBtn._bound) {
    saveBtn._bound = true;
    saveBtn.addEventListener('click', async () => {
      const res = await fetch('/api/company/settings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency_symbol: currencyInput?.value || '£' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        window.STOCKLENS_CURRENCY_SYMBOL = data.currency_symbol || currencyInput.value || '£';
        invalidateTabs(['overview','products','inventory','decisions','forecast','analytics','evaluation','scenario','classification']);
        showToast(t('team.companySettingsSaved'));
      } else {
        showToast(data.message || t('team.companySettingsFailed'), 'error');
      }
    });
  }
  if (deleteCompanyBtn && !deleteCompanyBtn._bound) {
    deleteCompanyBtn._bound = true;
    deleteCompanyBtn.addEventListener('click', async () => {
      if (prompt(t('team.deleteCompanyPrompt')) !== 'DELETE') return;
      const res = await fetch('/api/company/delete', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'DELETE' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) window.location.href = '/login';
      else showToast(data.message || t('team.deleteCompanyFailed'), 'error');
    });
  }
  if (deleteAccountBtn && !deleteAccountBtn._bound) {
    deleteAccountBtn._bound = true;
    deleteAccountBtn.addEventListener('click', async () => {
      if (prompt(t('team.deleteAccountPrompt')) !== 'DELETE') return;
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'DELETE' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) window.location.href = '/login';
      else showToast(data.message || t('team.deleteAccountFailed'), 'error');
    });
  }
  if (resendEmailBtn && !resendEmailBtn._bound) {
    resendEmailBtn._bound = true;
    resendEmailBtn.addEventListener('click', async () => {
      const res = await fetch('/api/email/resend', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const suffix = data.email_verification_url ? tf('team.verificationOpen', { url: data.email_verification_url }) : '';
        showToast((data.message || t('team.verificationSent')) + suffix);
      } else {
        showToast(data.message || t('team.verificationFailed'), 'error');
      }
    });
  }
}

async function teamGenerateInvite() {
  const status = document.getElementById('team-status');
  const codeEl = document.getElementById('team-invite-code');
  const expiryEl = document.getElementById('team-invite-expiry');
  if (status) status.textContent = t('msg.generatingInvite');
  const res = await fetch('/api/invite/generate', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expires_in_days: 14 }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok) {
    if (codeEl) codeEl.textContent = data.code || '------';
    if (expiryEl) {
      expiryEl.textContent = data.expires_at
        ? tf('team.inviteExpires', { date: String(data.expires_at).replace('T', ' ').slice(0, 16) })
        : '';
    }
    if (status) status.textContent = t('msg.inviteReady');
  } else if (status) {
    status.textContent = data.message || t('msg.inviteFailed');
  }
}

async function teamRunPipeline() {
  const status = document.getElementById('team-status');
  if (status) status.textContent = t('msg.pipelineRunning');
  const res = await fetch('/api/pipeline/run', { method: 'POST', credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (res.ok && data.job_id) {
    if (status) status.textContent = t('team.pipelineQueued');
    pollPipelineJob(data.job_id, (job) => {
      if (status) status.textContent = tf('team.pipelineCompleteProducts', {
        message: translateServerMessage(job.message || t('msg.pipelineComplete')),
        count: job.products_processed || 0,
      });
      invalidateTabs(['overview','products','inventory','decisions','forecast','analytics','evaluation','scenario','classification']);
      loadOverview();
    }, (job) => {
      if (status) status.textContent = job.error || job.message || t('msg.pipelineFailed');
    });
  } else if (status) {
    status.textContent = data.message || t('msg.pipelineFailed');
  }
}

async function pollPipelineJob(jobId, onComplete, onFailed) {
  for (let i = 0; i < 240; i++) {
    await new Promise(resolve => setTimeout(resolve, i < 5 ? 800 : 1500));
    const res = await fetch(`/api/pipeline/jobs/${jobId}`, { credentials: 'include' });
    const job = await res.json().catch(() => ({}));
    if (!res.ok) continue;
    if (job.status === 'complete') {
      onComplete?.(job);
      return job;
    }
    if (job.status === 'failed') {
      onFailed?.(job);
      return job;
    }
  }
  onFailed?.({ message: 'Pipeline is still running. Refresh later for updated results.' });
  return null;
}

window.teamSetRole = async function(userId, role) {
  const status = document.getElementById('team-status');
  const res = await fetch('/api/staff/role', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, role }),
  });
  const data = await res.json().catch(() => ({}));
  if (status) status.textContent = res.ok ? t('msg.roleUpdated') : (data.message || t('msg.roleUpdateFailed'));
  loadTeam();
};

window.teamRemove = async function(userId) {
  const status = document.getElementById('team-status');
  const res = await fetch('/api/staff/remove', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  });
  const data = await res.json().catch(() => ({}));
  if (status) status.textContent = res.ok ? t('msg.userDeactivated') : (data.message || t('msg.userDeactivateFailed'));
  loadTeam();
};

window.removeUploadFile = function(index) {
  uploadFiles.splice(index, 1);
  const listEl  = document.getElementById('upload-file-list');
  const actions = document.getElementById('upload-actions');
  if (!listEl) return;
  const icons = { csv: '📄', xlsx: '📊', xls: '📊' };
  listEl.innerHTML = uploadFiles.map((f, i) => {
    const ext = f.name.split('.').pop().toLowerCase();
    return `
      <div class="upload-file-item">
        <span class="upload-file-name">${icons[ext]||'📄'} ${f.name}</span>
        <span style="display:flex;align-items:center;gap:8px">
          <span class="upload-file-size">${(f.size / 1024).toFixed(1)} KB</span>
          <span class="upload-file-remove" onclick="removeUploadFile(${i})">✕</span>
        </span>
      </div>`;
  }).join('');
  if (uploadFiles.length === 0) actions.style.display = 'none';
};


/* ═══════════════════════════════════════════════════════════
   BOOT
   ═══════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════
   MANUAL DATA ENTRY
   ═══════════════════════════════════════════════════════════ */

// State
let _manualSelectedProductId   = null;
let _manualSelectedProductName = null;

const MANUAL_CATEGORY_RULES = [
  ['Beverages', ['fanta', 'cola', 'coke', 'pepsi', 'sprite', '7up', 'juice', 'water', 'drink', 'soda', 'lemonade', 'tonic', 'smoothie']],
  ['Hot Drinks', ['coffee', 'tea', 'tea bags', 'pg tips', 'espresso', 'latte', 'cappuccino', 'hot chocolate', 'cocoa']],
  ['Dairy', ['milk', 'cheese', 'yoghurt', 'yogurt', 'butter', 'cream']],
  ['Bakery', ['bread', 'bun', 'roll', 'bagel', 'croissant', 'cake', 'muffin', 'pastry']],
  ['Snacks', ['crisps', 'chips', 'chocolate', 'bar', 'biscuit', 'cookie', 'sweets', 'candy', 'nuts', 'popcorn']],
  ['Health & Beauty', ['shampoo', 'soap', 'toothpaste', 'deodorant', 'cream', 'lotion', 'sun cream', 'spf']],
  ['Health', ['paracetamol', 'ibuprofen', 'medicine', 'vitamin', 'plaster', 'tablet', 'tabs']],
  ['Stationery', ['pen', 'pencil', 'notebook', 'paper', 'card', 'envelope']],
  ['Seasonal', ['mince pie', 'christmas', 'easter', 'halloween', 'valentine']],
];

function inferManualCategory(productName) {
  const normalized = ` ${String(productName || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ')} `;
  if (!normalized.trim()) return '';
  const match = MANUAL_CATEGORY_RULES.find(([, keywords]) =>
    keywords.some(keyword => normalized.includes(` ${keyword.toLowerCase().replace(/[^a-z0-9]+/g, ' ')} `))
  );
  return match ? match[0] : 'General';
}

function bindManualCategoryAutofill() {
  const nameEl = document.getElementById('manual-product-name');
  const categoryEl = document.getElementById('manual-product-category');
  if (!nameEl || !categoryEl || nameEl.dataset.categoryAutofillBound === '1') return;

  nameEl.dataset.categoryAutofillBound = '1';

  nameEl.addEventListener('input', () => {
    const inferred = inferManualCategory(nameEl.value);
    const current = categoryEl.value.trim();
    const previousAuto = categoryEl.dataset.autoCategory || '';
    if (!inferred || (current && current !== previousAuto)) return;
    categoryEl.value = inferred;
    categoryEl.dataset.autoCategory = inferred;
  });

  categoryEl.addEventListener('input', () => {
    if (categoryEl.value.trim() !== categoryEl.dataset.autoCategory) {
      delete categoryEl.dataset.autoCategory;
    }
  });
}

/* ── Tab entry point ────────────────────────────────────────── */
async function loadManualEntry() {
  setTodayDate();
  bindManualCategoryAutofill();
  await refreshManualProductList();
}

/* ── Create-product form toggle ─────────────────────────────── */
window.toggleManualCreateForm = function() {
  const form = document.getElementById('manual-create-form');
  if (!form) return;
  const isOpen = form.style.display !== 'none';
  form.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) {
    bindManualCategoryAutofill();
    document.getElementById('manual-product-name')?.focus();
    document.getElementById('manual-create-result').innerHTML = '';
  }
};

/* ── Submit new product ─────────────────────────────────────── */
window.submitManualProduct = async function() {
  const btn      = document.getElementById('manual-create-btn');
  const resultEl = document.getElementById('manual-create-result');
  const name     = document.getElementById('manual-product-name')?.value.trim();
  const categoryEl = document.getElementById('manual-product-category');
  const category = categoryEl?.value.trim() || inferManualCategory(name);
  const stock    = parseInt(document.getElementById('manual-product-stock')?.value || '0', 10);
  const purchaseCostRaw = document.getElementById('manual-product-purchase-cost')?.value.trim();
  const sellingPriceRaw = document.getElementById('manual-product-selling-price')?.value.trim();
  const purchaseCost = purchaseCostRaw ? parseFloat(purchaseCostRaw) : null;
  const sellingPrice = sellingPriceRaw ? parseFloat(sellingPriceRaw) : null;

  if (!name) {
    resultEl.innerHTML = `<div class="manual-result-err">${t('manual.errorName')}</div>`;
    return;
  }

  btn.disabled = true;
  resultEl.innerHTML = '';

  const res  = await fetch('/api/manual/product', {
    method:      'POST',
    credentials: 'include',
    headers:     { 'Content-Type': 'application/json' },
    body:        JSON.stringify({
      name,
      category,
      current_stock: stock,
      purchase_cost: purchaseCost,
      selling_price: sellingPrice,
    }),
  });
  const data = await res.json().catch(() => ({}));

  if (res.ok) {
    resultEl.innerHTML = `<div class="manual-result-ok">✓ ${escapeHtml(translateServerMessage(data.message))}</div>`;
    document.getElementById('manual-product-name').value    = '';
    document.getElementById('manual-product-category').value = '';
    delete document.getElementById('manual-product-category').dataset.autoCategory;
    document.getElementById('manual-product-stock').value   = '0';
    document.getElementById('manual-product-purchase-cost').value = '';
    document.getElementById('manual-product-selling-price').value = '';
    showToast(data.message, 'success');
    await refreshManualProductList();
    // auto-select the new product
    if (data.product_id) selectManualProduct(data.product_id, data.product_name);
  } else {
    resultEl.innerHTML = `<div class="manual-result-err">✗ ${escapeHtml(translateServerMessage(data.message || t('msg.failedCreateProduct')))}</div>`;
  }
  btn.disabled = false;
};

/* ── Refresh product list ───────────────────────────────────── */
async function refreshManualProductList() {
  const listEl = document.getElementById('manual-product-list');
  if (!listEl) return;

  const data = await apiFetch('/api/manual/products');
  if (!data) return;

  if (!data.length) {
    listEl.innerHTML = `
      <div class="empty-state" style="padding:24px 0;">
        <div class="empty-state-icon">
          <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" fill="none">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
        </div>
        <p class="empty-state-title">${t('manual.noProducts')}</p>
        <p class="empty-state-body">${t('manual.noProductsHint')}</p>
      </div>`;
    return;
  }

  listEl.innerHTML = data.map(p => {
    const days       = p.total_days || 0;
    const isReady    = days >= 30;
    const pillClass  = isReady ? 'ready' : 'warn';
    const pillLabel  = isReady
      ? `${days} ${t('manual.daysReady')}`
      : `${days}/30 ${t('manual.daysNeeded')}`;
    const decBadge   = p.decision ? decisionBadge(p.decision) : '';
    const lastEntry  = p.last_entry || '—';
    const isSelected = p.product_id === _manualSelectedProductId;

    return `
      <div class="manual-product-card ${isSelected ? 'selected' : ''}"
           onclick="selectManualProduct(${p.product_id}, ${JSON.stringify(escapeHtml(p.product_name))})">
        <div>
          <div class="manual-product-card-name">${escapeHtml(p.product_name)}</div>
          <div class="manual-product-card-meta">
            ${escapeHtml(p.category || '—')} &bull;
            ${p.stock_on_hand} ${t('manual.inStock')} &bull;
            ${t('manual.lastEntry')}: ${lastEntry}
            ${decBadge ? ' &bull; ' + decBadge : ''}
          </div>
        </div>
        <span class="manual-days-pill ${pillClass}">${pillLabel}</span>
      </div>`;
  }).join('');
}

/* ── Select a product to work on ───────────────────────────── */
window.selectManualProduct = async function(productId, productName) {
  _manualSelectedProductId   = productId;
  _manualSelectedProductName = productName;

  const workspace = document.getElementById('manual-product-workspace');
  const nameEl    = document.getElementById('manual-selected-name');
  if (workspace) workspace.style.display = 'block';
  if (nameEl)    nameEl.textContent = productName;

  // Reset pipeline result
  const pipelineResult = document.getElementById('manual-pipeline-result');
  if (pipelineResult) { pipelineResult.style.display = 'none'; pipelineResult.innerHTML = ''; }

  // Refresh product card highlights
  document.querySelectorAll('.manual-product-card').forEach(el => {
    el.classList.remove('selected');
  });

  await refreshManualTimeline();
  workspace?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.clearManualSelection = function() {
  _manualSelectedProductId   = null;
  _manualSelectedProductName = null;
  const workspace = document.getElementById('manual-product-workspace');
  if (workspace) workspace.style.display = 'none';
  document.querySelectorAll('.manual-product-card').forEach(el => el.classList.remove('selected'));
};

/* ── Set today's date in the date picker ────────────────────── */
window.setTodayDate = function() {
  const dateInput = document.getElementById('manual-sales-date');
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
};

/* ── Submit a sales entry ───────────────────────────────────── */
window.submitManualSales = async function() {
  if (!_manualSelectedProductId) {
    showToast(t('manual.selectProductFirst'), 'error');
    return;
  }

  const resultEl   = document.getElementById('manual-sales-result');
  const dateVal    = document.getElementById('manual-sales-date')?.value;
  const unitsVal   = document.getElementById('manual-sales-units')?.value;

  if (!dateVal) {
    resultEl.innerHTML = `<div class="manual-result-err">✗ ${t('manual.errorDate')}</div>`;
    return;
  }
  const units = parseInt(unitsVal, 10);
  if (isNaN(units) || units < 0) {
    resultEl.innerHTML = `<div class="manual-result-err">✗ ${t('manual.errorUnits')}</div>`;
    return;
  }

  resultEl.innerHTML = '';

  const res  = await fetch('/api/manual/sales', {
    method:      'POST',
    credentials: 'include',
    headers:     { 'Content-Type': 'application/json' },
    body:        JSON.stringify({
      product_id: _manualSelectedProductId,
      date:       dateVal,
      units_sold: units,
    }),
  });
  const data = await res.json().catch(() => ({}));

  if (res.ok) {
    let html = `<div class="manual-result-ok">✓ ${escapeHtml(data.message)}</div>`;
    if (data.filled_gaps > 0) {
      html += `<div class="manual-gap-note">${data.filled_gaps} ${t('manual.gapsFilled')}</div>`;
    }
    // Progress towards 30-day threshold
    const pct     = Math.min(100, Math.round((data.total_days / 30) * 100));
    const barColor = data.pipeline_ready ? 'var(--semantic-positive)' : 'var(--accent)';
    html += `
      <div style="margin-top:8px;">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">
          ${data.total_days}/30 ${t('manual.daysProgress')}
          ${data.pipeline_ready ? ' — <strong style="color:var(--semantic-positive);">' + t('manual.readyToForecast') + '</strong>' : ''}
        </div>
        <div class="manual-progress-bar">
          <div class="manual-progress-fill" style="width:${pct}%;background:${barColor};"></div>
        </div>
      </div>`;
    resultEl.innerHTML = html;

    document.getElementById('manual-sales-units').value = '';
    await refreshManualTimeline();
    await refreshManualProductList();
  } else {
    resultEl.innerHTML = `<div class="manual-result-err">✗ ${escapeHtml(translateServerMessage(data.message || t('common.failed')))}</div>`;
  }
};

/* ── Refresh the timeline table for the selected product ────── */
async function refreshManualTimeline() {
  if (!_manualSelectedProductId) return;

  const tbody   = document.getElementById('manual-timeline-body');
  const metaEl  = document.getElementById('manual-timeline-meta');
  const statusEl = document.getElementById('manual-data-status');

  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="3" class="loading-cell">${t('common.loading')}</td></tr>`;

  const data = await apiFetch(`/api/manual/sales/${_manualSelectedProductId}`);
  if (!data) return;

  // Update status line
  if (statusEl) {
    const daysNeeded = Math.max(0, 30 - data.total_days);
    statusEl.textContent = data.pipeline_ready
      ? `${data.total_days} ${t('manual.daysRecorded')} — ${t('manual.readyToForecast')}`
      : `${data.total_days} ${t('manual.daysRecorded')} — ${daysNeeded} ${t('manual.daysUntilReady')}`;
  }

  // Meta info
  if (metaEl) {
    metaEl.textContent = data.filled_days > 0
      ? `${data.total_days} ${t('manual.days')} (${data.filled_days} ${t('manual.autoFilled')})`
      : `${data.total_days} ${t('manual.days')}`;
  }

  if (!data.rows || !data.rows.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="loading-cell">${t('manual.noEntries')}</td></tr>`;
    return;
  }

  tbody.innerHTML = data.rows.map(r => {
    const isFilled = r.units_sold === 0 && r.data_source === 'manual';
    const typeBadge = isFilled
      ? `<span class="type-badge-filled">${t('manual.autoZero')}</span>`
      : `<span class="type-badge-manual">${t('manual.manual')}</span>`;
    return `
      <tr style="${isFilled ? 'opacity:.55;' : ''}">
        <td>${r.date}</td>
        <td><strong>${r.units_sold}</strong></td>
        <td>${typeBadge}</td>
      </tr>`;
  }).join('');
}

/* ── Run forecast+decision pipeline for selected product ────── */
window.runManualPipeline = async function() {
  if (!_manualSelectedProductId) return;

  const btn      = document.getElementById('manual-pipeline-btn');
  const resultEl = document.getElementById('manual-pipeline-result');
  if (!resultEl) return;

  btn.disabled = true;
  resultEl.style.display = 'block';
  resultEl.innerHTML     = `<div class="manual-pipeline-warn">${t('manual.pipelineRunning')}</div>`;

  const res  = await fetch(`/api/manual/pipeline/${_manualSelectedProductId}`, {
    method:      'POST',
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));

  if (res.ok) {
    const evalNote = data.evaluated
      ? t('manual.pipelineWithEval')
      : t('manual.pipelineNoEval');
    resultEl.innerHTML = `
      <div class="manual-pipeline-ok">
        ✓ ${escapeHtml(translateServerMessage(data.message))}<br>
        <span style="font-size:12px;opacity:.8;">${evalNote}</span>
      </div>`;
    showToast(data.message, 'success');

    // Refresh parent tabs that may now have data
    invalidateTabs(['overview', 'decisions', 'forecast', 'inventory']);
    await refreshManualProductList();
  } else {
    resultEl.innerHTML = `
      <div class="manual-pipeline-err">
        ✗ ${escapeHtml(translateServerMessage(data.message || t('msg.pipelineFailed')))}
      </div>`;
    showToast(data.message || t('msg.pipelineFailed'), 'error');
  }

  btn.disabled = false;
};

document.addEventListener('DOMContentLoaded', () => {
  // Theme toggle
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);

  // Role-based UI safeguards
  enforceRoleUiGuards();

  // Language
  initLang();

  // Tabs
  initTabs();
  if (window.STOCKLENS_ROLE !== 'manager') {
    switchTab('decisions');
  }

  // Logout
  initLogout();

  // Mobile sidebar
  initSidebar();
  initMobileMoreDrawer();

  // Upload (manager only)
  prepareUploadTab();
  initUpload();
  loadUploadHistory();

  const verificationUrl = sessionStorage.getItem('pending_verification_url');
  if (verificationUrl) {
    sessionStorage.removeItem('pending_verification_url');
    showToast(tf('team.verificationReady', { url: verificationUrl }));
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeProductModal();
      const previewModal = document.getElementById('upload-preview-modal');
      if (previewModal) previewModal.style.display = 'none';
    }
  });
  document.getElementById('reorder-modal')?.addEventListener('click', e => {
    if (e.target.id === 'reorder-modal') closeProductModal();
  });
});
