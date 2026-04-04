/* ============================================================
   L-Shay Loan Prediction — script.js
   Handles form submission, gauge chart, result display,
   all-models grid, credit score hint, and error states.
   ============================================================ */

'use strict';

// ── Gauge chart instance (kept so we can destroy/recreate) ──────────────────
let gaugeChart = null;

// ── Credit score hint ───────────────────────────────────────────────────────
function updateCreditHint(val) {
  const hint = document.getElementById('credit-hint');
  if (!hint) return;
  const v = parseInt(val, 10);
  if (!val || isNaN(v)) { hint.textContent = ''; hint.className = 'input-hint'; return; }
  if (v >= 750) {
    hint.textContent = '✅ Excellent — top-tier creditworthiness';
    hint.className = 'input-hint hint-good';
  } else if (v >= 650) {
    hint.textContent = '👍 Good — acceptable by most lenders';
    hint.className = 'input-hint hint-ok';
  } else if (v >= 550) {
    hint.textContent = '⚠️ Fair — some lenders may hesitate';
    hint.className = 'input-hint hint-ok';
  } else {
    hint.textContent = '❌ Poor — high rejection risk';
    hint.className = 'input-hint hint-bad';
  }
}

// ── Gauge chart renderer ────────────────────────────────────────────────────
function renderGauge(chance) {
  const ctx = document.getElementById('gaugeChart');
  if (!ctx) return;

  if (gaugeChart) { gaugeChart.destroy(); gaugeChart = null; }

  // Colour based on chance
  let colour;
  if (chance >= 80)      colour = '#22c55e';
  else if (chance >= 50) colour = '#f59e0b';
  else                   colour = '#ef4444';

  const remaining = 100 - chance;

  gaugeChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [chance, remaining],
        backgroundColor: [colour, 'rgba(255,255,255,0.06)'],
        borderWidth: 0,
        circumference: 270,
        rotation: 225,
      }]
    },
    options: {
      responsive: false,
      cutout: '72%',
      animation: { duration: 700, easing: 'easeOutQuart' },
      plugins: { legend: { display: false }, tooltip: { enabled: false } }
    }
  });

  // Animate the percentage counter
  const pctEl = document.getElementById('gauge-pct');
  if (!pctEl) return;
  let current = 0;
  const step  = Math.ceil(chance / 40);
  const timer = setInterval(() => {
    current = Math.min(current + step, chance);
    pctEl.textContent = current + '%';
    if (current >= chance) clearInterval(timer);
  }, 18);
}

// ── Decision badge helper ───────────────────────────────────────────────────
function decisionClass(decision) {
  if (decision === 'Approved')        return 'badge-approved';
  if (decision === 'Moderate Chance') return 'badge-moderate';
  return 'badge-rejected';
}

// ── Risk pill helper ────────────────────────────────────────────────────────
function riskClass(risk) {
  if (risk === 'Low')    return 'risk-pill-low';
  if (risk === 'Medium') return 'risk-pill-medium';
  return 'risk-pill-high';
}
function dotClass(risk) {
  if (risk === 'Low')    return 'dot-low';
  if (risk === 'Medium') return 'dot-medium';
  return 'dot-high';
}

// ── Factor status → CSS class ───────────────────────────────────────────────
function factorValueClass(status) {
  const map = { good: 'fv-good', ok: 'fv-ok', warn: 'fv-warn', bad: 'fv-bad' };
  return map[status] || 'fv-ok';
}

// ── Build factors HTML ──────────────────────────────────────────────────────
function buildFactors(factors) {
  return factors.map(f => `
    <div class="factor-row">
      <div class="factor-label">${escHtml(f.label)}</div>
      <div class="factor-value ${factorValueClass(f.status)}">${escHtml(f.value)}</div>
      <div class="factor-detail">${escHtml(f.detail)}</div>
    </div>`).join('');
}

// ── Build advice HTML ───────────────────────────────────────────────────────
function buildAdvice(advice) {
  return advice.map(a => `<li class="advice-item">${escHtml(a)}</li>`).join('');
}

// ── Build input summary chips ───────────────────────────────────────────────
function buildInputSummary(inputs) {
  const labels = {
    age: 'Age', income: 'Income', credit: 'Credit', loan: 'Loan', experience: 'Exp'
  };
  return Object.entries(inputs).map(([k, v]) =>
    `<span class="summary-chip"><b>${labels[k] || k}:</b> ${escHtml(String(v))}</span>`
  ).join('');
}

// ── Build all-models grid ───────────────────────────────────────────────────
function buildAllModelsGrid(models) {
  return Object.entries(models).map(([name, m]) => {
    let cls = 'amc-rejected';
    if (m.decision === 'Approved')        cls = 'amc-approved';
    else if (m.decision === 'Moderate Chance') cls = 'amc-moderate';
    return `
      <div class="amc-item ${cls}">
        <div class="amc-name">${escHtml(name)}</div>
        <div class="amc-chance">${m.chance}%</div>
        <div class="amc-decision">${escHtml(m.decision)}</div>
        <div class="amc-risk">Risk: ${escHtml(m.risk)}</div>
      </div>`;
  }).join('');
}

// ── Simple HTML escaper ─────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Show / hide loading state ───────────────────────────────────────────────
function setLoading(on) {
  const btn     = document.getElementById('submit-btn');
  const btnText = document.getElementById('btn-text');
  if (!btn || !btnText) return;
  if (on) {
    btn.classList.add('loading');
    btn.disabled  = true;
    btnText.textContent = '⏳ Analysing…';
  } else {
    btn.classList.remove('loading');
    btn.disabled  = false;
    btnText.textContent = '🔍 Predict Approval';
  }
}

// ── Show error ──────────────────────────────────────────────────────────────
function showError(msg) {
  const box = document.getElementById('err-box');
  if (!box) return;
  const text = Array.isArray(msg) ? msg.join('<br>') : String(msg);
  box.innerHTML = text;
}

function clearError() {
  const box = document.getElementById('err-box');
  if (box) box.innerHTML = '';
}

// ── Render the full result panel ────────────────────────────────────────────
function renderResult(data) {
  // Hide placeholder, show result card
  const placeholder = document.getElementById('placeholder-card');
  const resultCard  = document.getElementById('result-card');
  if (placeholder) placeholder.style.display = 'none';
  if (resultCard)  { resultCard.style.display = 'block'; resultCard.classList.add('animate-in'); }

  // Gauge
  renderGauge(data.chance);

  // Applicant name
  const nameEl = document.getElementById('res-name');
  if (nameEl) nameEl.textContent = data.name || 'Applicant';

  // Decision badge
  const decEl = document.getElementById('res-decision');
  if (decEl) {
    decEl.textContent  = data.decision;
    decEl.className    = `decision-badge ${decisionClass(data.decision)}`;
  }

  // Risk pill
  const riskEl = document.getElementById('res-risk');
  if (riskEl) {
    riskEl.className = `risk-pill ${riskClass(data.risk)}`;
    riskEl.innerHTML = `<span class="risk-dot ${dotClass(data.risk)}"></span>Risk: ${escHtml(data.risk)}`;
  }

  // EMI
  const emiEl = document.getElementById('res-emi');
  if (emiEl) emiEl.innerHTML = `💰 Est. EMI: <span>${escHtml(data.emi)}</span>`;

  // Best model tag
  const modelEl = document.getElementById('res-model');
  if (modelEl) modelEl.textContent = data.best_model || '';

  // Input summary
  const summaryEl = document.getElementById('input-summary');
  if (summaryEl && data.inputs) summaryEl.innerHTML = buildInputSummary(data.inputs);

  // Factors & advice — inject into result-top-card after input-summary
  const topCard = document.querySelector('.result-top-card');
  if (topCard) {
    // Remove any previously injected sections
    ['js-factors-card', 'js-advice-card'].forEach(id => {
      const old = document.getElementById(id);
      if (old) old.remove();
    });

    if (data.factors && data.factors.length) {
      const fc = document.createElement('div');
      fc.id        = 'js-factors-card';
      fc.className = 'card';
      fc.style.marginTop = '16px';
      fc.innerHTML = `<div class="card-header">📊 Profile Analysis</div>
        <div class="factor-table">${buildFactors(data.factors)}</div>`;
      topCard.insertAdjacentElement('afterend', fc);
    }

    if (data.advice && data.advice.length) {
      const ac = document.createElement('div');
      ac.id        = 'js-advice-card';
      ac.className = 'card';
      ac.style.marginTop = '16px';
      ac.innerHTML = `<div class="card-header">💡 Recommendations</div>
        <ul class="advice-list">${buildAdvice(data.advice)}</ul>
        ${data.rec_loan ? `<div class="rec-loan-box">💡 Recommended max loan: <b>${escHtml(data.rec_loan)}</b></div>` : ''}`;

      const factorsCard = document.getElementById('js-factors-card');
      const insertAfter = factorsCard || topCard;
      insertAfter.insertAdjacentElement('afterend', ac);
    }
  }
}

// ── Fetch all-model predictions and render grid ─────────────────────────────
async function fetchAllModels(formData) {
  try {
    const res  = await fetch('/all-predictions', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.error) return;

    const grid = document.getElementById('all-models-grid');
    const card = document.getElementById('all-models-card');
    if (grid && card) {
      grid.innerHTML   = buildAllModelsGrid(data);
      card.style.display = 'block';
      card.classList.add('animate-in');
    }
  } catch (_) {
    // Non-critical — silently ignore
  }
}

// ── Main form submit handler ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loanForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();
    setLoading(true);

    const formData = new FormData(form);

    try {
      const res  = await fetch('/predict', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok || data.error) {
        showError(data.error || 'Something went wrong. Please try again.');
        setLoading(false);
        return;
      }

      renderResult(data);

      // Fire off all-models fetch in parallel (non-blocking)
      fetchAllModels(new FormData(form));

    } catch (err) {
      showError('Network error — please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  });
});
