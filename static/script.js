/* L-Shay Loan Prediction */
var gaugeChart = null;

function updateCreditHint(val) {
  var h = document.getElementById('credit-hint');
  if (!h || !val) { if (h) h.textContent = ''; return; }
  var v = parseInt(val);
  if (v >= 750)      { h.textContent = 'Excellent'; h.className = 'input-hint hint-good'; }
  else if (v >= 650) { h.textContent = 'Good';      h.className = 'input-hint hint-ok'; }
  else if (v >= 550) { h.textContent = 'Fair';      h.className = 'input-hint hint-ok'; }
  else               { h.textContent = 'Poor';      h.className = 'input-hint hint-bad'; }
}

function drawGauge(val) {
  var color  = val >= 80 ? '#22c55e' : val >= 50 ? '#f59e0b' : '#ef4444';
  var canvas = document.getElementById('gaugeChart');
  if (!canvas) return;
  if (gaugeChart) { gaugeChart.destroy(); gaugeChart = null; }
  gaugeChart = new Chart(canvas, {
    type: 'doughnut',
    data: { datasets: [{ data: [val, 100 - val],
      backgroundColor: [color, 'rgba(255,255,255,0.05)'],
      borderWidth: 0, circumference: 270, rotation: 225 }] },
    options: {
      cutout: '78%',
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      animation: { duration: 900 }
    }
  });
}

function renderResult(d) {
  document.getElementById('placeholder-card').style.display = 'none';
  var card = document.getElementById('result-card');
  card.style.display = 'block';
  document.getElementById('gauge-pct').textContent = d.chance + '%';
  drawGauge(d.chance);
  document.getElementById('res-name').textContent = d.name || 'Applicant';
  var badge = document.getElementById('res-decision');
  badge.textContent = d.decision;
  badge.className = 'decision-badge ' + (d.decision === 'Approved' ? 'badge-approved' : d.decision === 'Moderate Chance' ? 'badge-moderate' : 'badge-rejected');
  var riskEl = document.getElementById('res-risk');
  var low = d.risk === 'Low', med = d.risk === 'Medium';
  riskEl.className = 'risk-pill ' + (low ? 'risk-pill-low' : med ? 'risk-pill-medium' : 'risk-pill-high');
  riskEl.innerHTML = '<span class="risk-dot ' + (low ? 'dot-low' : med ? 'dot-medium' : 'dot-high') + '"></span> Risk: ' + d.risk;
  document.getElementById('res-emi').innerHTML = 'EMI: <span>' + d.emi + '</span>';
  document.getElementById('res-model').textContent = d.best_model;
  var inp = d.inputs;
  document.getElementById('input-summary').innerHTML =
    [['Age',inp.age],['Income',inp.income],['Credit',inp.credit],['Loan',inp.loan],['Exp',inp.experience]]
    .map(function(kv){return '<div class="summary-chip"><b>'+kv[0]+':</b> '+kv[1]+'</div>';}).join('');
  if (window.innerWidth < 1024) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderAllModels(results) {
  var card = document.getElementById('all-models-card');
  var grid = document.getElementById('all-models-grid');
  if (!card || !grid) return;
  card.style.display = 'block';
  var html = '';
  for (var name in results) {
    var r = results[name];
    var cls = r.decision === 'Approved' ? 'amc-approved' : r.decision === 'Moderate Chance' ? 'amc-moderate' : 'amc-rejected';
    html += '<div class="amc-item '+cls+'"><div class="amc-name">'+name+'</div><div class="amc-chance">'+r.chance+'%</div><div class="amc-decision">'+r.decision+'</div><div class="amc-risk">Risk: '+r.risk+'</div></div>';
  }
  grid.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', function() {
  var form = document.getElementById('loanForm');
  var errBox = document.getElementById('err-box');
  var btnText = document.getElementById('btn-text');
  var btn = document.getElementById('submit-btn');
  if (!form) return;
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    errBox.textContent = '';
    btn.disabled = true;
    btnText.textContent = 'Analyzing...';
    fetch('/predict', { method: 'POST', body: new FormData(form) })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.error) { errBox.textContent = Array.isArray(d.error) ? d.error.join(' ') : d.error; btn.disabled=false; btnText.textContent='Predict Approval'; return; }
        renderResult(d);
        fetch('/all-predictions', { method: 'POST', body: new FormData(form) })
          .then(function(r2){return r2.json();})
          .then(function(all){if(!all.error)renderAllModels(all);})
          .finally(function(){btn.disabled=false;btnText.textContent='Predict Approval';});
      })
      .catch(function(){ errBox.textContent='Network error.'; btn.disabled=false; btnText.textContent='Predict Approval'; });
  });
});