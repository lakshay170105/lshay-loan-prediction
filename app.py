<<<<<<< HEAD
from flask import Flask, render_template, request, jsonify
import numpy as np
import joblib
import json

app = Flask(__name__)

model  = joblib.load('loan_model.pkl')
scaler = joblib.load('scaler.pkl')

with open('model_scores.json') as f:
    meta = json.load(f)


def validate(d):
    errs = []
    if not (18 <= d['age'] <= 100):     errs.append("Age must be between 18 and 100.")
    if not (300 <= d['credit'] <= 900): errs.append("Credit score must be between 300 and 900.")
    if d['income'] <= 0:                errs.append("Income must be greater than 0.")
    if d['experience'] < 0:            errs.append("Experience cannot be negative.")
    if d['loan'] <= 0:                  errs.append("Loan amount must be greater than 0.")
    return errs


def score_factor(label, value, status, detail):
    """Returns a factor dict for the breakdown table."""
    return {"label": label, "value": value, "status": status, "detail": detail}


def analyze_profile(d, chance):
    """Deep analysis of each input field — returns factors + smart advice."""
    factors = []
    advice  = []

    # ── Credit Score ──────────────────────────────────────────────────────────
    c = d['credit']
    if c >= 750:
        factors.append(score_factor("Credit Score", str(c), "good",
            "Excellent — top-tier creditworthiness"))
    elif c >= 650:
        factors.append(score_factor("Credit Score", str(c), "ok",
            "Good — acceptable by most lenders"))
    elif c >= 550:
        factors.append(score_factor("Credit Score", str(c), "warn",
            "Fair — some lenders may hesitate"))
        advice.append("💳 Improve credit score to 650+ by paying bills on time and reducing credit utilization.")
    else:
        factors.append(score_factor("Credit Score", str(c), "bad",
            "Poor — high rejection risk"))
        advice.append("💳 Credit score is critically low. Pay off existing debts and avoid new credit inquiries for 6 months.")

    # ── Income vs Loan Ratio ──────────────────────────────────────────────────
    ratio = round(d['loan'] / d['income'], 1) if d['income'] > 0 else 999
    if ratio <= 5:
        factors.append(score_factor("Loan-to-Income Ratio", f"{ratio}×", "good",
            "Very manageable — well within safe limits"))
    elif ratio <= 8:
        factors.append(score_factor("Loan-to-Income Ratio", f"{ratio}×", "ok",
            "Acceptable — within standard bank limits"))
    elif ratio <= 12:
        factors.append(score_factor("Loan-to-Income Ratio", f"{ratio}×", "warn",
            "High — lenders may ask for collateral"))
        advice.append(f"📉 Loan is {ratio}× your income. Consider reducing loan by ₹{int(d['loan'] - d['income']*8):,} to stay under 8× limit.")
    else:
        factors.append(score_factor("Loan-to-Income Ratio", f"{ratio}×", "bad",
            "Very high — exceeds safe lending threshold"))
        advice.append(f"📉 Loan amount is too high vs income. Reduce to ₹{int(d['income']*8):,} or increase income documentation.")

    # ── Income ────────────────────────────────────────────────────────────────
    inc = d['income']
    if inc >= 100000:
        factors.append(score_factor("Annual Income", f"₹{inc:,.0f}", "good", "High income — strong repayment capacity"))
    elif inc >= 40000:
        factors.append(score_factor("Annual Income", f"₹{inc:,.0f}", "ok", "Moderate income — adequate for most loans"))
    elif inc >= 20000:
        factors.append(score_factor("Annual Income", f"₹{inc:,.0f}", "warn", "Low income — limits loan eligibility"))
        advice.append("💰 Low income detected. Adding a co-applicant with higher income can improve chances.")
    else:
        factors.append(score_factor("Annual Income", f"₹{inc:,.0f}", "bad", "Very low — high repayment risk"))
        advice.append("💰 Income is very low for this loan. Consider a smaller loan or a guarantor.")

    # ── Experience ────────────────────────────────────────────────────────────
    exp = d['experience']
    if exp >= 5:
        factors.append(score_factor("Job Experience", f"{exp} yrs", "good", "Stable employment history"))
    elif exp >= 2:
        factors.append(score_factor("Job Experience", f"{exp} yrs", "ok", "Decent experience — acceptable"))
    elif exp >= 1:
        factors.append(score_factor("Job Experience", f"{exp} yrs", "warn", "Limited experience — minor risk"))
        advice.append("🧑‍💼 Less than 2 years experience. A stable job letter or salary slip helps.")
    else:
        factors.append(score_factor("Job Experience", f"{exp} yrs", "bad", "No experience — high employment risk"))
        advice.append("🧑‍💼 No job experience. Banks prefer at least 1 year of stable employment.")

    # ── Age ───────────────────────────────────────────────────────────────────
    age = d['age']
    if 25 <= age <= 50:
        factors.append(score_factor("Age", str(age), "good", "Prime working age — ideal for long-term loans"))
    elif age < 25:
        factors.append(score_factor("Age", str(age), "ok", "Young applicant — shorter credit history"))
    else:
        factors.append(score_factor("Age", str(age), "ok", "Senior applicant — shorter loan tenure preferred"))

    # ── Existing Loan ─────────────────────────────────────────────────────────
    if d['existing'] == 1:
        factors.append(score_factor("Existing Loan", "Yes", "warn", "Active loan reduces new loan eligibility"))
        advice.append("🔁 You have an existing loan. Clearing it first will significantly improve approval chances.")
    else:
        factors.append(score_factor("Existing Loan", "No", "good", "No existing debt — clean liability profile"))

    # ── Education ─────────────────────────────────────────────────────────────
    edu_map = {0: ("High School", "ok", "Basic education"), 1: ("Graduate", "good", "Graduate — preferred by lenders"),
               2: ("Post Graduate", "good", "Highly educated — strong profile")}
    el, es, ed = edu_map.get(d['education'], ("Unknown", "ok", ""))
    factors.append(score_factor("Education", el, es, ed))

    # ── Final advice if all good ───────────────────────────────────────────────
    if not advice:
        if chance >= 80:
            advice.append("✅ Excellent profile! Your loan is very likely to be approved. Apply with confidence.")
        else:
            advice.append("👍 Profile looks decent. Ensure all documents (salary slips, ITR) are ready.")

    # ── Recommended loan amount ───────────────────────────────────────────────
    safe_loan = int(d['income'] * 8)
    rec_loan  = None
    if d['loan'] > safe_loan:
        rec_loan = f"₹{safe_loan:,}"

    return factors, advice, rec_loan


@app.route('/')
def home():
    return render_template('index.html', meta=meta)

@app.route('/predict-page')
def predict_page():
    return render_template('predict.html', meta=meta)


@app.route('/predict', methods=['POST'])
def predict():
    try:
        d = {
            'name':       request.form.get('name', 'Applicant').strip() or 'Applicant',
            'age':        int(request.form['age']),
            'income':     float(request.form['income']),
            'credit':     int(request.form['credit']),
            'experience': int(request.form['experience']),
            'loan':       float(request.form['loan']),
            'existing':   int(request.form.get('existing', 0)),
            'education':  int(request.form.get('education', 1)),
            'married':    int(request.form.get('married', 0)),
        }
    except (KeyError, ValueError) as e:
        return jsonify({'error': str(e)}), 400

    errs = validate(d)
    if errs:
        return jsonify({'error': errs}), 400

    features   = np.array([[d['age'], d['income'], d['credit'], d['experience'],
                             d['loan'], d['existing'], d['education'], d['married']]])
    features_s = scaler.transform(features)
    prob       = model.predict_proba(features_s)[0][1]
    chance     = round(prob * 100, 1)

    if chance >= 80:   decision, risk, risk_color = "Approved",        "Low",    "green"
    elif chance >= 50: decision, risk, risk_color = "Moderate Chance", "Medium", "yellow"
    else:              decision, risk, risk_color = "Risky / Rejected", "High",   "red"

    factors, advice, rec_loan = analyze_profile(d, chance)

    # EMI estimate (simple: loan / (experience+1 * 12), capped 12–60 months)
    tenure_months = min(max((d['experience'] + 2) * 12, 12), 60)
    monthly_rate  = 0.085 / 12   # 8.5% annual
    if monthly_rate > 0:
        emi = d['loan'] * monthly_rate * (1 + monthly_rate)**tenure_months / \
              ((1 + monthly_rate)**tenure_months - 1)
    else:
        emi = d['loan'] / tenure_months
    emi_str = f"₹{emi:,.0f}/month for {tenure_months} months"

    return jsonify({
        'name':       d['name'],
        'chance':     chance,
        'decision':   decision,
        'risk':       risk,
        'risk_color': risk_color,
        'factors':    factors,
        'advice':     advice,
        'rec_loan':   rec_loan,
        'emi':        emi_str,
        'best_model': meta['best'],
        'inputs': {
            'age': d['age'], 'income': f"₹{d['income']:,.0f}",
            'credit': d['credit'], 'loan': f"₹{d['loan']:,.0f}",
            'experience': f"{d['experience']} yrs"
        }
    })


@app.route('/scores')
def scores():
    return jsonify(meta)

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/contact')
def contact():
    return render_template('contact.html')

@app.route('/privacy')
def privacy():
    return render_template('privacy.html')

@app.route('/terms')
def terms():
    return render_template('terms.html')

@app.route('/cookies')
def cookies():
    return render_template('cookies.html')

@app.route('/security')
def security():
    return render_template('security.html')

if __name__ == '__main__':
    app.run(debug=True)
=======
from flask import Flask, render_template, request, jsonify
import numpy as np
import joblib
import json

app = Flask(__name__)

model  = joblib.load('loan_model.pkl')
scaler = joblib.load('scaler.pkl')

with open('model_scores.json') as f:
    meta = json.load(f)


def validate(d):
    errs = []
    if not (18 <= d['age'] <= 100):     errs.append("Age must be between 18 and 100.")
    if not (300 <= d['credit'] <= 900): errs.append("Credit score must be between 300 and 900.")
    if d['income'] <= 0:                errs.append("Income must be greater than 0.")
    if d['experience'] < 0:            errs.append("Experience cannot be negative.")
    if d['loan'] <= 0:                  errs.append("Loan amount must be greater than 0.")
    return errs


def score_factor(label, value, status, detail):
    """Returns a factor dict for the breakdown table."""
    return {"label": label, "value": value, "status": status, "detail": detail}


def analyze_profile(d, chance):
    """Deep analysis of each input field — returns factors + smart advice."""
    factors = []
    advice  = []

    # ── Credit Score ──────────────────────────────────────────────────────────
    c = d['credit']
    if c >= 750:
        factors.append(score_factor("Credit Score", str(c), "good",
            "Excellent — top-tier creditworthiness"))
    elif c >= 650:
        factors.append(score_factor("Credit Score", str(c), "ok",
            "Good — acceptable by most lenders"))
    elif c >= 550:
        factors.append(score_factor("Credit Score", str(c), "warn",
            "Fair — some lenders may hesitate"))
        advice.append("💳 Improve credit score to 650+ by paying bills on time and reducing credit utilization.")
    else:
        factors.append(score_factor("Credit Score", str(c), "bad",
            "Poor — high rejection risk"))
        advice.append("💳 Credit score is critically low. Pay off existing debts and avoid new credit inquiries for 6 months.")

    # ── Income vs Loan Ratio ──────────────────────────────────────────────────
    ratio = round(d['loan'] / d['income'], 1) if d['income'] > 0 else 999
    if ratio <= 5:
        factors.append(score_factor("Loan-to-Income Ratio", f"{ratio}×", "good",
            "Very manageable — well within safe limits"))
    elif ratio <= 8:
        factors.append(score_factor("Loan-to-Income Ratio", f"{ratio}×", "ok",
            "Acceptable — within standard bank limits"))
    elif ratio <= 12:
        factors.append(score_factor("Loan-to-Income Ratio", f"{ratio}×", "warn",
            "High — lenders may ask for collateral"))
        advice.append(f"📉 Loan is {ratio}× your income. Consider reducing loan by ₹{int(d['loan'] - d['income']*8):,} to stay under 8× limit.")
    else:
        factors.append(score_factor("Loan-to-Income Ratio", f"{ratio}×", "bad",
            "Very high — exceeds safe lending threshold"))
        advice.append(f"📉 Loan amount is too high vs income. Reduce to ₹{int(d['income']*8):,} or increase income documentation.")

    # ── Income ────────────────────────────────────────────────────────────────
    inc = d['income']
    if inc >= 100000:
        factors.append(score_factor("Annual Income", f"₹{inc:,.0f}", "good", "High income — strong repayment capacity"))
    elif inc >= 40000:
        factors.append(score_factor("Annual Income", f"₹{inc:,.0f}", "ok", "Moderate income — adequate for most loans"))
    elif inc >= 20000:
        factors.append(score_factor("Annual Income", f"₹{inc:,.0f}", "warn", "Low income — limits loan eligibility"))
        advice.append("💰 Low income detected. Adding a co-applicant with higher income can improve chances.")
    else:
        factors.append(score_factor("Annual Income", f"₹{inc:,.0f}", "bad", "Very low — high repayment risk"))
        advice.append("💰 Income is very low for this loan. Consider a smaller loan or a guarantor.")

    # ── Experience ────────────────────────────────────────────────────────────
    exp = d['experience']
    if exp >= 5:
        factors.append(score_factor("Job Experience", f"{exp} yrs", "good", "Stable employment history"))
    elif exp >= 2:
        factors.append(score_factor("Job Experience", f"{exp} yrs", "ok", "Decent experience — acceptable"))
    elif exp >= 1:
        factors.append(score_factor("Job Experience", f"{exp} yrs", "warn", "Limited experience — minor risk"))
        advice.append("🧑‍💼 Less than 2 years experience. A stable job letter or salary slip helps.")
    else:
        factors.append(score_factor("Job Experience", f"{exp} yrs", "bad", "No experience — high employment risk"))
        advice.append("🧑‍💼 No job experience. Banks prefer at least 1 year of stable employment.")

    # ── Age ───────────────────────────────────────────────────────────────────
    age = d['age']
    if 25 <= age <= 50:
        factors.append(score_factor("Age", str(age), "good", "Prime working age — ideal for long-term loans"))
    elif age < 25:
        factors.append(score_factor("Age", str(age), "ok", "Young applicant — shorter credit history"))
    else:
        factors.append(score_factor("Age", str(age), "ok", "Senior applicant — shorter loan tenure preferred"))

    # ── Existing Loan ─────────────────────────────────────────────────────────
    if d['existing'] == 1:
        factors.append(score_factor("Existing Loan", "Yes", "warn", "Active loan reduces new loan eligibility"))
        advice.append("🔁 You have an existing loan. Clearing it first will significantly improve approval chances.")
    else:
        factors.append(score_factor("Existing Loan", "No", "good", "No existing debt — clean liability profile"))

    # ── Education ─────────────────────────────────────────────────────────────
    edu_map = {0: ("High School", "ok", "Basic education"), 1: ("Graduate", "good", "Graduate — preferred by lenders"),
               2: ("Post Graduate", "good", "Highly educated — strong profile")}
    el, es, ed = edu_map.get(d['education'], ("Unknown", "ok", ""))
    factors.append(score_factor("Education", el, es, ed))

    # ── Final advice if all good ───────────────────────────────────────────────
    if not advice:
        if chance >= 80:
            advice.append("✅ Excellent profile! Your loan is very likely to be approved. Apply with confidence.")
        else:
            advice.append("👍 Profile looks decent. Ensure all documents (salary slips, ITR) are ready.")

    # ── Recommended loan amount ───────────────────────────────────────────────
    safe_loan = int(d['income'] * 8)
    rec_loan  = None
    if d['loan'] > safe_loan:
        rec_loan = f"₹{safe_loan:,}"

    return factors, advice, rec_loan


@app.route('/')
def home():
    return render_template('index.html', meta=meta)

@app.route('/predict-page')
def predict_page():
    return render_template('predict.html', meta=meta)


@app.route('/predict', methods=['POST'])
def predict():
    try:
        d = {
            'name':       request.form.get('name', 'Applicant').strip() or 'Applicant',
            'age':        int(request.form['age']),
            'income':     float(request.form['income']),
            'credit':     int(request.form['credit']),
            'experience': int(request.form['experience']),
            'loan':       float(request.form['loan']),
            'existing':   int(request.form.get('existing', 0)),
            'education':  int(request.form.get('education', 1)),
            'married':    int(request.form.get('married', 0)),
        }
    except (KeyError, ValueError) as e:
        return jsonify({'error': str(e)}), 400

    errs = validate(d)
    if errs:
        return jsonify({'error': errs}), 400

    features   = np.array([[d['age'], d['income'], d['credit'], d['experience'],
                             d['loan'], d['existing'], d['education'], d['married']]])
    features_s = scaler.transform(features)
    prob       = model.predict_proba(features_s)[0][1]
    chance     = round(prob * 100, 1)

    if chance >= 80:   decision, risk, risk_color = "Approved",        "Low",    "green"
    elif chance >= 50: decision, risk, risk_color = "Moderate Chance", "Medium", "yellow"
    else:              decision, risk, risk_color = "Risky / Rejected", "High",   "red"

    factors, advice, rec_loan = analyze_profile(d, chance)

    # EMI estimate (simple: loan / (experience+1 * 12), capped 12–60 months)
    tenure_months = min(max((d['experience'] + 2) * 12, 12), 60)
    monthly_rate  = 0.085 / 12   # 8.5% annual
    if monthly_rate > 0:
        emi = d['loan'] * monthly_rate * (1 + monthly_rate)**tenure_months / \
              ((1 + monthly_rate)**tenure_months - 1)
    else:
        emi = d['loan'] / tenure_months
    emi_str = f"₹{emi:,.0f}/month for {tenure_months} months"

    return jsonify({
        'name':       d['name'],
        'chance':     chance,
        'decision':   decision,
        'risk':       risk,
        'risk_color': risk_color,
        'factors':    factors,
        'advice':     advice,
        'rec_loan':   rec_loan,
        'emi':        emi_str,
        'best_model': meta['best'],
        'inputs': {
            'age': d['age'], 'income': f"₹{d['income']:,.0f}",
            'credit': d['credit'], 'loan': f"₹{d['loan']:,.0f}",
            'experience': f"{d['experience']} yrs"
        }
    })


@app.route('/scores')
def scores():
    return jsonify(meta)

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/contact')
def contact():
    return render_template('contact.html')

@app.route('/privacy')
def privacy():
    return render_template('privacy.html')

@app.route('/terms')
def terms():
    return render_template('terms.html')

@app.route('/cookies')
def cookies():
    return render_template('cookies.html')

@app.route('/security')
def security():
    return render_template('security.html')

if __name__ == '__main__':
    app.run(debug=True)
>>>>>>> 9f0dc4fbe2558693855a50fc425a4f1978d581a7
