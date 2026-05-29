/**
 * StockLens — Chart rendering layer.
 * Uses Chart.js 4.x. Called from app.js after data is fetched.
 *
 * Functions exported (attached to window):
 *   renderSalesChart(data)
 *   renderFvaChart(data)
 *   renderInventoryChart(data)
 *   renderScenarioChart(data)
 *   renderCategoryChart(data)
 *   renderTopProductsChart(data)
 */

// Chart.js global defaults
Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
Chart.defaults.font.size   = 12;

/** Resolves chart colours based on current theme */
function chartColors() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    grid:    dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
    tick:    dark ? '#8B949E' : '#64748B',
    tooltip: dark ? '#1C2128' : '#FFFFFF',
  };
}

function legendPos() {
  return window.innerWidth <= 768 ? 'bottom' : 'top';
}

// Track instances so we can destroy before re-render (exposed for theme updates)
const _charts = {};
window._charts = _charts;

function destroyChart(id) {
  if (_charts[id]) {
    _charts[id].destroy();
    delete _charts[id];
  }
}

/* ── Colour palette for multi-series ──────────────────────────────────────── */
const PALETTE = [
  '#2563EB', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#06B6D4', '#EC4899', '#F97316',
];

/* ──────────────────────────────────────────────────────────────────────────
   1. SALES TREND — Line chart, last 30 days, top-5 products
   ────────────────────────────────────────────────────────────────────────── */
window.renderSalesChart = function(data) {
  destroyChart('sales');
  const canvas = document.getElementById('chart-sales');
  if (!canvas || !data || Object.keys(data).length === 0) return;

  const cc      = chartColors();
  const names   = Object.keys(data);
  const dates   = data[names[0]].dates;

  const datasets = names.map((name, i) => ({
    label:           name,
    data:            data[name].units,
    borderColor:     PALETTE[i % PALETTE.length],
    backgroundColor: PALETTE[i % PALETTE.length] + '20',
    borderWidth:     2,
    pointRadius:     2,
    tension:         0.35,
    fill:            false,
  }));

  _charts['sales'] = new Chart(canvas, {
    type: 'line',
    data: { labels: dates, datasets },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: legendPos(),
          labels:   { boxWidth: 12, padding: 16, color: cc.tick },
        },
        tooltip: {
          backgroundColor: cc.tooltip,
          titleColor:      cc.tick,
          bodyColor:       cc.tick,
          borderColor:     '#E2E8F0',
          borderWidth:     1,
        },
      },
      scales: {
        x: {
          grid:  { color: cc.grid },
          ticks: { color: cc.tick, maxTicksLimit: 8,
                   callback: (_, i) => dates[i] ? dates[i].slice(5) : '' },
        },
        y: {
          grid:         { color: cc.grid },
          ticks:        { color: cc.tick },
          beginAtZero:  true,
          title:        { display: true, text: t('chart.unitsSold'), color: cc.tick },
        },
      },
    },
  });
};


/* ──────────────────────────────────────────────────────────────────────────
   2. FORECAST vs ACTUAL — Grouped bar chart per product
   ────────────────────────────────────────────────────────────────────────── */
window.renderFvaChart = function(data) {
  destroyChart('fva');
  const canvas = document.getElementById('chart-fva');
  if (!canvas || !data || data.length === 0) return;

  const cc     = chartColors();
  const labels = data.map(d => d.product_name.split(' ').slice(0, 2).join(' '));

  _charts['fva'] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label:           t('chart.predicted'),
          data:            data.map(d => d.predicted_demand),
          backgroundColor: '#2563EB99',
          borderColor:     '#2563EB',
          borderWidth:     1,
        },
        {
          label:           t('chart.actual'),
          data:            data.map(d => d.actual_demand),
          backgroundColor: '#10B98199',
          borderColor:     '#10B981',
          borderWidth:     1,
        },
      ],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: legendPos(), labels: { boxWidth: 12, color: cc.tick } },
        tooltip: {
          backgroundColor: cc.tooltip,
          titleColor:      cc.tick,
          bodyColor:       cc.tick,
          borderColor:     '#E2E8F0',
          borderWidth:     1,
        },
      },
      scales: {
        x: {
          grid:  { display: false },
          ticks: { color: cc.tick, maxRotation: 35 },
        },
        y: {
          grid:         { color: cc.grid },
          ticks:        { color: cc.tick },
          beginAtZero:  true,
          title:        { display: true, text: t('chart.dailyUnits'), color: cc.tick },
        },
      },
    },
  });
};


/* ──────────────────────────────────────────────────────────────────────────
   3. INVENTORY LEVELS — Horizontal bar: stock vs reorder point
   ────────────────────────────────────────────────────────────────────────── */
window.renderInventoryChart = function(data) {
  destroyChart('inventory');
  const canvas = document.getElementById('chart-inventory');
  if (!canvas || !data || data.length === 0) return;

  const cc     = chartColors();
  const labels = data.map(d => d.product_name.split(' ').slice(0, 2).join(' '));

  const stockColors = data.map(d => {
    const rf = (d.risk_flag || '').toLowerCase();
    if (rf === 'high')     return '#EF444499';
    if (rf === 'medium')   return '#F59E0B99';
    if (rf === 'inactive') return '#94A3B899';
    return '#22C55E99';
  });

  _charts['inventory'] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label:           t('chart.stockOnHand'),
          data:            data.map(d => d.stock_on_hand),
          backgroundColor: stockColors,
          borderRadius:    4,
        },
        {
          label:           t('chart.reorderPoint'),
          data:            data.map(d => d.reorder_point || 0),
          backgroundColor: 'transparent',
          borderColor:     '#F59E0B',
          borderWidth:     2,
          type:            'line',
          pointRadius:     3,
          pointBackgroundColor: '#F59E0B',
          order:           0,
        },
      ],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      indexAxis:           'x',
      plugins: {
        legend: { position: legendPos(), labels: { boxWidth: 12, color: cc.tick } },
        tooltip: {
          backgroundColor: cc.tooltip,
          titleColor:      cc.tick,
          bodyColor:       cc.tick,
          borderColor:     '#E2E8F0',
          borderWidth:     1,
        },
      },
      scales: {
        x: {
          grid:  { display: false },
          ticks: { color: cc.tick, maxRotation: 35 },
        },
        y: {
          grid:         { color: cc.grid },
          ticks:        { color: cc.tick },
          beginAtZero:  true,
          title:        { display: true, text: t('chart.units'), color: cc.tick },
        },
      },
    },
  });
};


/* ──────────────────────────────────────────────────────────────────────────
   4. SCENARIO — Grouped bar: stockout days with vs without system
   ────────────────────────────────────────────────────────────────────────── */
window.renderScenarioChart = function(data) {
  destroyChart('scenario');
  const canvas = document.getElementById('chart-scenario');
  if (!canvas || !data || data.length === 0) return;

  const cc     = chartColors();
  const labels = data.map(d => d.product_name.split(' ').slice(0, 2).join(' '));

  _charts['scenario'] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label:           t('chart.withoutSystem'),
          data:            data.map(d => d.without_system.stockout_days),
          backgroundColor: '#EF444488',
          borderColor:     '#EF4444',
          borderWidth:     1,
          borderRadius:    4,
        },
        {
          label:           t('chart.withStockLens'),
          data:            data.map(d => d.with_system.stockout_days),
          backgroundColor: '#22C55E88',
          borderColor:     '#22C55E',
          borderWidth:     1,
          borderRadius:    4,
        },
      ],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: legendPos(), labels: { boxWidth: 12, color: cc.tick } },
        tooltip: {
          backgroundColor: cc.tooltip,
          titleColor:      cc.tick,
          bodyColor:       cc.tick,
          borderColor:     '#E2E8F0',
          borderWidth:     1,
        },
      },
      scales: {
        x: {
          grid:  { display: false },
          ticks: { color: cc.tick, maxRotation: 35 },
        },
        y: {
          grid:         { color: cc.grid },
          ticks:        { color: cc.tick },
          beginAtZero:  true,
          title:        { display: true, text: t('chart.stockoutDays90'), color: cc.tick },
        },
      },
    },
  });
};

/* ──────────────────────────────────────────────────────────────────────────
   5. CATEGORY BREAKDOWN — Doughnut chart by product category
   ────────────────────────────────────────────────────────────────────────── */
window.renderCategoryChart = function(products) {
  destroyChart('category');
  const canvas = document.getElementById('chart-category');
  if (!canvas || !Array.isArray(products) || products.length === 0) return;

  const cc = chartColors();
  const counts = {};
  products.forEach((p) => {
    const key = p.category || t('chart.uncategorized');
    counts[key] = (counts[key] || 0) + 1;
  });
  const labels = Object.keys(counts);
  const values = labels.map((k) => counts[k]);

  _charts['category'] = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: labels.map((_, i) => PALETTE[i % PALETTE.length] + 'CC'),
        borderWidth: 1,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: legendPos(), labels: { boxWidth: 12, color: cc.tick } },
      },
    },
  });
};

/* ──────────────────────────────────────────────────────────────────────────
   6. TOP PRODUCTS — Bar chart from analytics sales totals
   ────────────────────────────────────────────────────────────────────────── */
window.renderTopProductsChart = function(salesData) {
  destroyChart('topProducts');
  const canvas = document.getElementById('chart-top-products');
  if (!canvas || !salesData || Object.keys(salesData).length === 0) return;

  const cc = chartColors();
  const rows = Object.entries(salesData).map(([name, v]) => ({
    name,
    total: (v.units || []).reduce((a, b) => a + Number(b || 0), 0),
  })).sort((a, b) => b.total - a.total).slice(0, 8);

  _charts['topProducts'] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: rows.map((r) => r.name),
      datasets: [{
        label: t('chart.units30d'),
        data: rows.map((r) => r.total),
        backgroundColor: rows.map((_, i) => PALETTE[i % PALETTE.length] + 'CC'),
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: legendPos(), labels: { boxWidth: 12, color: cc.tick } },
      },
      scales: {
        x: { ticks: { color: cc.tick, maxRotation: 35 }, grid: { display: false } },
        y: { ticks: { color: cc.tick }, grid: { color: cc.grid }, beginAtZero: true },
      },
    },
  });
};
