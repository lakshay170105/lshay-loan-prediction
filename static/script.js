let gaugeChart = null, barChart = null, featChart = null;

const FEAT_DESC = {
  Age:          "Applicant's age — younger applicants may have less credit history.",
  Income:       "Annual income — higher income improves repayment capacity.",
  CreditScore:  "Credit score (300–900) — most critical factor for approval.",
  Experience:   "Years of employment — indicates job stability.",
  LoanAmount:   "Requested loan — compared against income for risk.",
  ExistingLoan: "Whether applicant already has an active loan.",
  Education:    "Education level — HS / Graduate / Post-Graduate.",
  Married:      "Marital status — affects financial responsibility profile.",
};

// ── Tab switching ─────────────────────────────────────────────────────────────
function showTab(name) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  event.target.classList.add('active');
  if (name === 'models' && !barChart)   loadCharts();
  if (name === 'features' && !featChart) loadCharts();
}

// ── Load scores & draw charts ─────────────────────────────────────────────────
async function loadCharts() {
  const res  = await fetch('/scores');
  const data = await res.json();
  const { scores, best, importances } = data;

  document.getElementById('best-tag').textContent = best;

  // Bar chart
  const names  = Object.keys(scores);
  const vals   = Object.values(scores);
  const colors = names.map(n => n === best ? '#22c55e' : '#3b82f6');

  const bCtx = document.getElementById('barChart').getContext('2d');
  if (barChart) barChart.destroy();
  barChart = new Chart(bCtx, {
    type: 'bar',
    data: {
      labels: names,
      datasets: [{ label: 'Accuracy (%)', data: vals, backgroundColor: colors,
        borderRadius: 6, borderSkipped: false }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y}%` } } },
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { min: 50, max: 100, ticks: { color: '#94a3b8', callback: v => v + '%' },
          grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });

  // Algo chips
  const grid = document.getElementById('algo-grid');
  grid.innerHTML = names.map(n => `
    <div class="algo-chip ${n === best ? 'best' : ''}">
      <div class="algo-chip-name">${n}</div>
      <div class="algo-chip-score">${scores[n]}%</div>
    </div>`).join('');

  // Feature importance chart
  const fNames = Object.keys(importances);
  const fVals  = Object.values(importances);
  const fCtx   = document.getElementById('featChart').getContext('2d');
  if (featChart) featChart.destroy();
  featChart = new Chart(fCtx, {
    type: 'bar',
    data: {
      labels: fNames,
      datasets: [{ label: 'Importance (%)', data: fVals,
        backgroundColor: '#818cf8', borderRadius: 6, borderSkipped: false }]
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.x}%` } } },
      scales: {
        x: { ticks: { color: '#94a3b8', callback: v => v + '%' },
          grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#94a3b8' }, grid: { display: false } }
      }
    }
  });

  // Feature desc cards
  const fdg = document.getElementById('feat-desc-grid');
  fdg.innerHTML = fNames.map(n => `
    <div class="feat-desc-item">
      <div class="feat-desc-name">${n}</div>
      <div class="feat-desc-text">${FEAT_DESC[n] || ''}</div>
    </div>`).join('');
}

// ── Gauge chart ───────────────────────────────────────────────────────────────
function drawGauge(val) {
  const color = val >= 80 ? '#22c55e' : val >= 50 ? '#f59e0b' : '#ef4444';
  const ctx   = document.getElementById('gaugeChart').getContext('2d');
  if (gaugeChart) gaugeChart.destroy();
  gaugeChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [val, 100 - val],
        backgroundColor: [color, 'rgba(255,255,255,0.06)'],
        borderWidth: 0, circumference: 270, rotation: 225
      }]
    },
    options: {
      cutout: '76%',
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      animation: { duration: 900 }
    }
  });
}

// ── Form submit ───────────────────────────────────────────────────────────────
document.getElementById('loanForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  document.getElementById('err-box').textContent = '';

  const fd  = new FormData(this);
  const res = await fetch('/predict', { method: 'POST', body: fd });
  const d   = await res.json();

  if (d.error) {
    document.getElementById('err-box').textContent =
      Array.isArray(d.error) ? d.error.join(' ') : d.error;
    return;
  }

  // Show result, hide placeholder
  document.getElementById('placeholder-card').style.display = 'none';
  const card = document.getElementById('result-card');
  card.style.display = 'block';

  document.getElementById('gauge-pct').textContent  = d.chance + '%';
  document.getElementById('res-name').textContent   = d.name;
  document.getElementById('res-model').textContent  = d.best_model;
  drawGauge(d.chance);

  const badge = document.getElementById('res-decision');
  badge.textContent = d.decision;
  badge.className   = 'decision-badge';
  badge.classList.add(
    d.decision === 'Approved' ? 'badge-approved' :
    d.decision === 'Moderate Chance' ? 'badge-moderate' : 'badge-rejected'
  );

  const dot = document.getElementById('risk-dot');
  dot.className = 'risk-dot risk-' + d.risk.toLowerCase();
  document.getElementById('risk-label').textContent = 'Risk Level: ' + d.risk;

  document.getElementById('advice-list').innerHTML =
    d.advice.map(a => `<li>${a}</li>`).join('');

  // Update best tag
  document.getElementById('best-tag').textContent = d.best_model;
});

// Load scores on page ready (for nav badge)
window.addEventListener('DOMContentLoaded', async () => {
  const res  = await fetch('/scores');
  const data = await res.json();
  document.getElementById('best-tag').textContent = data.best;
});
