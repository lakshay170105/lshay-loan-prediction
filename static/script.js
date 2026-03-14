/* ═══════════════════════════════════════════════════════
   L-Shay Loan Prediction — script.js  (fixed)
   ═══════════════════════════════════════════════════════ */

let gaugeChart  = null;
let barChart    = null;
let featChart   = null;
let scoresData  = null;
let chartsReady = false;

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
  if (!hint) return;
  if (!val) { hint.textContent = ''; return; }
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

  if (name === 'models' || name === 'features') {
    // setTimeout ensures tab is display:block before Chart.js measures canvas size
    setTimeout(() => {
      if (!scoresData) {
        loadScores().then(() => buildCharts());
      } else {
        buildCharts(); // always rebuild so canvas is fresh
      }
    }, 60);
  }
}

/* ── Fetch /scores ──────────────────────────────────────────────────────── */
async function loadScores() {
  try {
    const res  = await fetch('/scores');
    scoresData = await res.json();
  } catch(e) {
    console.error('Failed to load scores:', e);
  }
}

/* ── Build charts (called once after data is ready) ─────────────────────── */
function buildCharts() {
  if (!scoresData) return;
  const { scores, best, importances } = scoresData;

  // Best model badge
  const tag = document.getElementById('best-tag-models');
  if (tag) tag.textContent = '🏆 ' + best;

  /* ── Bar chart ── */
  const bCanvas = document.getElementById('barChart');
  if (bCanvas) {
    if (barChart) { barChart.destroy(); barChart = null; }
    const names  = Object.keys(scores);
    const vals   = Object.values(scores);
    barChart = new Chart(bCanvas, {
      type: 'bar',
      data: {
        labels: names,
        datasets: [{
          label: 'Accuracy (%)',
          data: vals,
          backgroundColor: names.map(n => n === best ? 'rgba(34,197,94,0.85)' : 'rgba(59,130,246,0.75)'),
          borderColor:     names.map(n => n === best ? '#22c55e' : '#3b82f6'),
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600 },
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
          x: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { min: 50, max: 100,
               ticks: { color: '#94a3b8', callback: v => v + '%', font: { size: 11 } },
               grid: { color: 'rgba(255,255,255,0.06)' } }
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
  }

  /* ── Feature importance chart ── */
  const fCanvas = document.getElementById('featChart');
  if (fCanvas) {
    if (featChart) { featChart.destroy(); featChart = null; }
    const fNames = Object.keys(importances);
    const fVals  = Object.values(importances);
    const fColors = fVals.map(v =>
      v >= 30 ? 'rgba(239,68,68,0.85)'   :
      v >= 15 ? 'rgba(245,158,11,0.85)'  :
      v >= 8  ? 'rgba(59,130,246,0.85)'  :
                'rgba(100,116,139,0.75)'
    );

    featChart = new Chart(fCanvas, {
      type: 'bar',
      data: {
        labels: fNames,
        datasets: [{
          label: 'Importance (%)',
          data: fVals,
          backgroundColor: fColors,
          borderWidth: 0,
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600 },
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
          x: { ticks: { color: '#94a3b8', callback: v => v + '%', font: { size: 11 } },
               grid: { color: 'rgba(255,255,255,0.06)' } },
          y: { ticks: { color: '#e2e8f0', font: { size: 12 } }, grid: { display: false } }
        }
      }
    });

    // Feature desc cards
    const fdg = document.getElementById('feat-desc-grid');
    if (fdg) {
      fdg.innerHTML = fNames.map((n, i) => `
        <div class="feat-desc-item">
          <div class="feat-desc-name">${n} <span class="feat-pct">${fVals[i]}%</span></div>
          <div class="feat-desc-text">${FEAT_DESC[n] || ''}</div>
        </div>`).join('');
    }
  }

  chartsReady = true;
}

/* ── Gauge chart ────────────────────────────────────────────────────────── */
function drawGauge(val) {
  const color  = val >= 80 ? '#22c55e' : val >= 50 ? '#f59e0b' : '#ef4444';
  const canvas = document.getElementById('gaugeChart');
  if (!canvas) return;
  if (gaugeChart) { gaugeChart.destroy(); gaugeChart = null; }
  gaugeChart = new Chart(canvas, {
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

/* ── Render full result card ────────────────────────────────────────────── */
function renderResult(d) {
  // Hide placeholder, show result
  document.getElementById('placeholder-card').style.display = 'none';
  const card = document.getElementById('result-card');
  card.style.display = 'block';

  /* Gauge */
  document.getElementById('gauge-pct').textContent = d.chance + '%';
  drawGauge(d.chance);

  /* Name */
  document.getElementById('res-name').textContent = d.name || 'Applicant';

  /* Decision badge */
  const badge = document.getElementById('res-decision');
  badge.textContent = d.decision;
  badge.className = 'decision-badge ' + (
    d.decision === 'Approved'        ? 'badge-approved'  :
    d.decision === 'Moderate Chance' ? 'badge-moderate'  : 'badge-rejected'
  );

  /* Risk pill */
  const riskEl  = document.getElementById('res-risk');
  const low     = d.risk === 'Low', med = d.risk === 'Medium';
  riskEl.className = 'risk-pill ' + (low ? 'risk-pill-low' : med ? 'risk-pill-medium' : 'risk-pill-high');
  riskEl.innerHTML = `<span class="risk-dot ${low ? 'dot-low' : med ? 'dot-medium' : 'dot-high'}"></span> Risk: ${d.risk}`;

  /* EMI */
  document.getElementById('res-emi').innerHTML = `💰 Est. EMI: <span>${d.emi}</span>`;

  /* Model */
  document.getElementById('res-model').textContent = d.best_model;

  /* Input summary chips */
  const inp = d.inputs;
  document.getElementById('input-summary').innerHTML = [
    ['Age', inp.age], ['Income', inp.income],
    ['Credit', inp.credit], ['Loan', inp.loan], ['Exp', inp.experience]
  ].map(([k, v]) => `<div class="summary-chip"><b>${k}:</b> ${v}</div>`).join('');

  /* Factor table */
  const ft = document.getElementById('factor-table');
  if (d.factors && d.factors.length) {
    ft.innerHTML = d.factors.map(f => `
      <div class="factor-row">
        <div class="factor-label">${f.label}</div>
        <div class="factor-value fv-${f.status}">${f.value}</div>
        <div class="factor-detail">${f.detail}</div>
      </div>`).join('');
  } else {
    ft.innerHTML = '<p style="color:#64748b;font-size:0.85rem;padding:8px">No factor data.</p>';
  }

  /* Advice */
  const al = document.getElementById('advice-list');
  if (d.advice && d.advice.length) {
    al.innerHTML = d.advice.map(a => `<li class="advice-item">${a}</li>`).join('');
  } else {
    al.innerHTML = '<li class="advice-item">✅ Profile looks good. Apply with confidence.</li>';
  }

  /* Recommended loan */
  const rlb = document.getElementById('rec-loan-box');
  if (d.rec_loan) {
    rlb.style.display = 'block';
    rlb.innerHTML = `💡 Recommended max loan for your income: <b>${d.rec_loan}</b>`;
  } else {
    rlb.style.display = 'none';
  }

  // Scroll result into view on mobile
  if (window.innerWidth < 1024) {
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/* ── Form submit ────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  loadScores(); // pre-fetch in background

  const form    = document.getElementById('loanForm');
  const errBox  = document.getElementById('err-box');
  const btnText = document.getElementById('btn-text');
  const btn     = document.getElementById('submit-btn');
  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    errBox.textContent  = '';
    btn.disabled        = true;
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
    } catch (err) {
      errBox.textContent = 'Network error. Please try again.';
    } finally {
      btn.disabled        = false;
      btn.classList.remove('loading');
      btnText.textContent = '🔍 Predict Approval';
    }
  });
});
