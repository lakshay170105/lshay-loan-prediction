/* ═══════════════════════════════════════════════════════
   L-Shay Loan Prediction — script.js
   ═══════════════════════════════════════════════════════ */

let gaugeChart = null;
let barChart   = null;
let featChart  = null;
let scoresData = null;   // cached from /scores

const FEAT_DESC = {
  Age:          "Applicant's age — younger applicants may have less credit history.",
  Income:       "Annual income — higher income improves repayment capacity.",
  CreditScore:  "Credit score (300–900) — the single most critical factor for approval.",
  Experience:   "Years of employment — indicates job stability and repayment reliability.",
  LoanAmount:   "Requested loan amount — compared against income for risk assessment.",
  ExistingLoan: "Whether applicant already has an active loan (increases risk).",
  Education:    "Education level — High School / Graduate / Post-Graduate.",
  Married:      "Marital status — affects financial responsibility profile.",
};

/* ── Credit score live hint ─────────────────────────────────────────────── */
function updateCreditHint(val) {
  const hint = document.getElementById('credit-hint');
  if (!hint || !val) { if (hint) hint.textContent = ''; return; }
  const v = parseInt(val);
  if (v >= 750)      { hint.textContent = '✅ Excellent'; hint.className = 'input-hint hint-good'; }
  else if (v >= 650) { hint.textContent = '👍 Good';      hint.className = 'input-hint hint-ok'; }
  else if (v >= 550) { hint.textContent = '⚠️ Fair';      hint.className = 'input-hint hint-ok'; }
  else               { hint.textContent = '❌ Poor';       hint.className = 'input-hint hint-bad'; }
}

/* ── Tab switching ──────────────────────────────────────────────────────── */
function showTab(name, btn) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  btn.classList.add('active');

  if ((name === 'models' || name === 'features') && !scoresData) {
    loadScores().then(() => renderCharts());
  } else if ((name === 'models' || name === 'features') && scoresData) {
    renderCharts();
  }
}

/* ── Fetch /scores once ─────────────────────────────────────────────────── */
async function loadScores() {
  try {
    const res  = await fetch('/scores');
    scoresData = await res.json();
  } catch(e) {
    console.error('Failed to load scores', e);
  }
}

/* ── Render bar + feature charts ────────────────────────────────────────── */
function renderCharts() {
  if (!scoresData) return;
  const { scores, best, importances } = scoresData;

  // Update best model badge
  const tag = document.getElementById('best-tag-models');
  if (tag) tag.textContent = '🏆 ' + best;

  // ── Bar chart (Model Comparison) ──────────────────────────────────────
  const names  = Object.keys(scores);
  const vals   = Object.values(scores);
  const colors = names.map(n =>
    n === best ? 'rgba(34,197,94,0.85)' : 'rgba(59,130,246,0.75)'
  );
  const borderColors = names.map(n =>
    n === best ? '#22c55e' : '#3b82f6'
  );

  const bCtx = document.getElementById('barChart');
  if (!bCtx) return;
  if (barChart) barChart.destroy();
  barChart = new Chart(bCtx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: names,
      datasets: [{
        label: 'Accuracy (%)',
        data: vals,
        backgroundColor: colors,
        borderColor: borderColors,
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 700, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1e293b',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          callbacks: {
            label: ctx => ` Accuracy: ${ctx.parsed.y}%`,
            afterLabel: ctx => ctx.label === best ? ' 🏆 Best Model' : ''
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#94a3b8', font: { size: 11 } },
          grid:  { color: 'rgba(255,255,255,0.04)' }
        },
        y: {
          min: 50, max: 100,
          ticks: { color: '#94a3b8', callback: v => v + '%', font: { size: 11 } },
          grid:  { color: 'rgba(255,255,255,0.06)' }
        }
      }
    }
  });

  // Algo chips
  const grid = document.getElementById('algo-grid');
  if (grid) {
    grid.innerHTML = names.map(n => `
      <div class="algo-chip ${n === best ? 'best' : ''}">
        <div class="algo-chip-name">${n}</div>
        <div class="algo-chip-score">${scores[n]}%</div>
      </div>`).join('');
  }

  // ── Feature importance chart (horizontal bar) ─────────────────────────
  const fNames  = Object.keys(importances);
  const fVals   = Object.values(importances);
  const fColors = fVals.map(v =>
    v >= 30 ? 'rgba(239,68,68,0.8)' :
    v >= 15 ? 'rgba(245,158,11,0.8)' :
    v >= 8  ? 'rgba(59,130,246,0.8)' :
              'rgba(100,116,139,0.7)'
  );

  const fCtx = document.getElementById('featChart');
  if (!fCtx) return;
  if (featChart) featChart.destroy();
  featChart = new Chart(fCtx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: fNames,
      datasets: [{
        label: 'Importance (%)',
        data: fVals,
        backgroundColor: fColors,
        borderColor: fColors.map(c => c.replace('0.8','1').replace('0.7','1')),
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 700, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1e293b',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          callbacks: { label: ctx => ` ${ctx.parsed.x}% importance` }
        }
      },
      scales: {
        x: {
          ticks: { color: '#94a3b8', callback: v => v + '%', font: { size: 11 } },
          grid:  { color: 'rgba(255,255,255,0.06)' }
        },
        y: {
          ticks: { color: '#e2e8f0', font: { size: 12, weight: '500' } },
          grid:  { display: false }
        }
      }
    }
  });

  // Feature description cards
  const fdg = document.getElementById('feat-desc-grid');
  if (fdg) {
    fdg.innerHTML = fNames.map((n, i) => `
      <div class="feat-desc-item">
        <div class="feat-desc-name">${n} <span class="feat-pct">${fVals[i]}%</span></div>
        <div class="feat-desc-text">${FEAT_DESC[n] || ''}</div>
      </div>`).join('');
  }
}

/* ── Gauge chart ────────────────────────────────────────────────────────── */
function drawGauge(val) {
  const color = val >= 80 ? '#22c55e' : val >= 50 ? '#f59e0b' : '#ef4444';
  const ctx   = document.getElementById('gaugeChart');
  if (!ctx) return;
  if (gaugeChart) gaugeChart.destroy();
  gaugeChart = new Chart(ctx.getContext('2d'), {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [val, 100 - val],
        backgroundColor: [color, 'rgba(255,255,255,0.05)'],
        borderWidth: 0,
        circumference: 270,
        rotation: 225,
      }]
    },
    options: {
      cutout: '78%',
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      animation: { duration: 900, easing: 'easeOutCubic' }
    }
  });
}

/* ── Render result card ─────────────────────────────────────────────────── */
function renderResult(d) {
  document.getElementById('placeholder-card').style.display = 'none';
  const card = document.getElementById('result-card');
  card.style.display = 'block';
  card.classList.add('animate-in');

  // Gauge
  document.getElementById('gauge-pct').textContent = d.chance + '%';
  drawGauge(d.chance);

  // Name
  document.getElementById('res-name').textContent = d.name;

  // Decision badge
  const badge = document.getElementById('res-decision');
  badge.textContent = d.decision;
  badge.className   = 'decision-badge ' + (
    d.decision === 'Approved'        ? 'badge-approved' :
    d.decision === 'Moderate Chance' ? 'badge-moderate' : 'badge-rejected'
  );

  // Risk pill
  const riskEl = document.getElementById('res-risk');
  const riskLow = d.risk === 'Low', riskMed = d.risk === 'Medium';
  riskEl.className = 'risk-pill ' + (riskLow ? 'risk-pill-low' : riskMed ? 'risk-pill-medium' : 'risk-pill-high');
  const dotColor   = riskLow ? 'dot-low' : riskMed ? 'dot-medium' : 'dot-high';
  riskEl.innerHTML = `<span class="risk-dot ${dotColor}"></span> Risk: ${d.risk}`;

  // EMI
  document.getElementById('res-emi').innerHTML = `💰 Est. EMI: <span>${d.emi}</span>`;

  // Model tag
  document.getElementById('res-model').textContent = d.best_model;

  // Input summary chips
  const inp = d.inputs;
  document.getElementById('input-summary').innerHTML = [
    ['Age', inp.age], ['Income', inp.income],
    ['Credit', inp.credit], ['Loan', inp.loan], ['Exp', inp.experience]
  ].map(([k,v]) => `<div class="summary-chip"><b>${k}:</b> ${v}</div>`).join('');

  // Factor table
  const ft = document.getElementById('factor-table');
  ft.innerHTML = d.factors.map(f => `
    <div class="factor-row">
      <div class="factor-label">${f.label}</div>
      <div class="factor-value fv-${f.status}">${f.value}</div>
      <div class="factor-detail">${f.detail}</div>
    </div>`).join('');

  // Advice list
  const al = document.getElementById('advice-list');
  al.innerHTML = d.advice.map(a => `
    <li class="advice-item">${a}</li>`).join('');

  // Recommended loan
  const rlb = document.getElementById('rec-loan-box');
  if (d.rec_loan) {
    rlb.style.display = 'block';
    rlb.innerHTML = `💡 Recommended max loan for your income: <b>${d.rec_loan}</b>`;
  } else {
    rlb.style.display = 'none';
  }
}

/* ── Form submit ────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Pre-load scores in background
  loadScores();

  const form    = document.getElementById('loanForm');
  const errBox  = document.getElementById('err-box');
  const btnText = document.getElementById('btn-text');
  const btn     = document.getElementById('submit-btn');

  if (!form) return;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    errBox.textContent = '';
    btn.classList.add('loading');
    btnText.textContent = '⏳ Analyzing...';

    try {
      const res = await fetch('/predict', { method: 'POST', body: new FormData(this) });
      const d   = await res.json();

      if (d.error) {
        errBox.textContent = Array.isArray(d.error) ? d.error.join(' ') : d.error;
      } else {
        renderResult(d);
      }
    } catch(err) {
      errBox.textContent = 'Network error. Please try again.';
    } finally {
      btn.classList.remove('loading');
      btnText.textContent = '🔍 Predict Approval';
    }
  });
});
