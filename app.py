from flask import Flask, render_template, request, jsonify
import numpy as np
import joblib
import json
import os
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.naive_bayes import GaussianNB

app = Flask(__name__)

# ── Load primary model + scaler ───────────────────────────────────────────────
model  = joblib.load('loan_model.pkl')
scaler = joblib.load('scaler.pkl')

with open('model_scores.json') as f:
    meta = json.load(f)

# ── Re-train all models in memory for /all-predictions ───────────────────────
# (lightweight — uses same dataset that was used during build)
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler as _SS

_df = pd.read_csv('dataset.csv')
_X  = _df.drop('Approved', axis=1)
_y  = _df['Approved']
_Xtr, _Xte, _ytr, _yte = train_test_split(_X, _y, test_size=0.2,
                                            random_state=42, stratify=_y)
_sc      = _SS()
_Xtr_s   = _sc.fit_transform(_Xtr)

ALL_MODELS = {
    "Logistic Regression": LogisticRegression(max_iter=1000),
    "Decision Tree":       DecisionTreeClassifier(max_depth=8, random_state=42),
    "Random Forest":       RandomForestClassifier(n_estimators=200, max_depth=10, random_state=42),
    "Gradient Boosting":   GradientBoostingClassifier(n_estimators=150, learning_rate=0.1, random_state=42),
    "KNN":                 KNeighborsClassifier(n_neighbors=7),
    "SVM":                 SVC(probability=True, kernel='rbf', random_state=42),
    "Naive Bayes":         GaussianNB(),
}
for _name, _clf in ALL_MODELS.items():
    _clf.fit(_Xtr_s, _ytr)


# ── Helpers ───────────────────────────────────────────────────────────────────
def validate(d):
    errs = []
    if not (18 <= d['age'] <= 100):     errs.append("Age must be between 18 and 100.")
    if not (300 <= d['credit'] <= 900): errs.append("Credit score must be between 300 and 900.")
    if d['income'] <= 0:                errs.append("Income must be greater than 0.")
    if d['experience'] < 0:            errs.append("Experience cannot be negative.")
    if d['loan'] <= 0:                  errs.append("Loan amount must be greater than 0.")
    return errs


def score_factor(label, value, status, detail):
    return {"label": label, "value": value, "status": status, "detail": detail}


def analyze_profile(d, chance):
    factors, advice = [], []

    c = d['credit']
    if c >= 750:
        factors.append(score_factor("Credit Score", str(c), "good", "Excellent — top-tier creditworthiness"))
    elif c >= 650:
        factors.append(score_factor("Credit Score", str(c), "ok", "Good — acceptable by most lenders"))
    elif c >= 550:
        factors.append(score_factor("Credit Score", str(c), "warn", "Fair — some lenders may hesitate"))
        advice.append("💳 Improve credit score to 650+ by paying bills on time.")
    else:
        factors.append(score_factor("Credit Score", str(c), "bad", "Poor — high rejection risk"))
        advice.append("💳 Credit score critically low. Pay off debts and avoid new credit inquiries for 6 months.")

    ratio = round(d['loan'] / d['income'], 1) if d['income'] > 0 else 999
    if ratio <= 5:
        factors.append(score_factor("Loan-to-Income", f"{ratio}×", "good", "Very manageable — well within safe limits"))
    elif ratio <= 8:
        factors.append(score_factor("Loan-to-Income", f"{ratio}×", "ok", "Acceptable — within standard bank limits"))
    elif ratio <= 12:
        factors.append(score_factor("Loan-to-Income", f"{ratio}×", "warn", "High — lenders may ask for collateral"))
        advice.append(f"📉 Loan is {ratio}× your income. Consider reducing loan amount.")
    else:
        factors.append(score_factor("Loan-to-Income", f"{ratio}×", "bad", "Very high — exceeds safe lending threshold"))
        advice.append(f"📉 Reduce loan to ₹{int(d['income']*8):,} or increase income documentation.")

    inc = d['income']
    if inc >= 100000:
        factors.append(score_factor("Annual Income", f"₹{inc:,.0f}", "good", "High income — strong repayment capacity"))
    elif inc >= 40000:
        factors.append(score_factor("Annual Income", f"₹{inc:,.0f}", "ok", "Moderate income — adequate for most loans"))
    elif inc >= 20000:
        factors.append(score_factor("Annual Income", f"₹{inc:,.0f}", "warn", "Low income — limits loan eligibility"))
        advice.append("💰 Low income. Adding a co-applicant can improve chances.")
    else:
        factors.append(score_factor("Annual Income", f"₹{inc:,.0f}", "bad", "Very low — high repayment risk"))
        advice.append("💰 Income too low. Consider a smaller loan or a guarantor.")

    exp = d['experience']
    if exp >= 5:
        factors.append(score_factor("Job Experience", f"{exp} yrs", "good", "Stable employment history"))
    elif exp >= 2:
        factors.append(score_factor("Job Experience", f"{exp} yrs", "ok", "Decent experience — acceptable"))
    elif exp >= 1:
        factors.append(score_factor("Job Experience", f"{exp} yrs", "warn", "Limited experience — minor risk"))
        advice.append("🧑‍💼 Less than 2 years experience. A salary slip or job letter helps.")
    else:
        factors.append(score_factor("Job Experience", f"{exp} yrs", "bad", "No experience — high employment risk"))
        advice.append("🧑‍💼 No job experience. Banks prefer at least 1 year of stable employment.")

    age = d['age']
    if 25 <= age <= 50:
        factors.append(score_factor("Age", str(age), "good", "Prime working age — ideal for long-term loans"))
    elif age < 25:
        factors.append(score_factor("Age", str(age), "ok", "Young applicant — shorter credit history"))
    else:
        factors.append(score_factor("Age", str(age), "ok", "Senior applicant — shorter loan tenure preferred"))

    if d['existing'] == 1:
        factors.append(score_factor("Existing Loan", "Yes", "warn", "Active loan reduces new loan eligibility"))
        advice.append("🔁 Existing loan detected. Clearing it first will significantly improve approval chances.")
    else:
        factors.append(score_factor("Existing Loan", "No", "good", "No existing debt — clean liability profile"))

    edu_map = {0: ("High School", "ok", "Basic education"),
               1: ("Graduate", "good", "Graduate — preferred by lenders"),
               2: ("Post Graduate", "good", "Highly educated — strong profile")}
    el, es, ed = edu_map.get(d['education'], ("Unknown", "ok", ""))
    factors.append(score_factor("Education", el, es, ed))

    if not advice:
        advice.append("✅ Excellent profile! Apply with confidence." if chance >= 80
                      else "👍 Profile looks decent. Keep documents ready.")

    safe_loan = int(d['income'] * 8)
    rec_loan  = f"₹{safe_loan:,}" if d['loan'] > safe_loan else None
    return factors, advice, rec_loan


def parse_input(form):
    return {
        'name':       form.get('name', 'Applicant').strip() or 'Applicant',
        'age':        int(form['age']),
        'income':     float(form['income']),
        'credit':     int(form['credit']),
        'experience': int(form['experience']),
        'loan':       float(form['loan']),
        'existing':   int(form.get('existing', 0)),
        'education':  int(form.get('education', 1)),
        'married':    int(form.get('married', 0)),
    }


# ── Routes ────────────────────────────────────────────────────────────────────
@app.route('/')
def home():
    return render_template('index.html', meta=meta)

@app.route('/predict-page')
def predict_page():
    return render_template('predict.html', meta=meta)


@app.route('/predict', methods=['POST'])
def predict():
    try:
        d = parse_input(request.form)
    except (KeyError, ValueError) as e:
        return jsonify({'error': str(e)}), 400

    errs = validate(d)
    if errs:
        return jsonify({'error': errs}), 400

    feat   = np.array([[d['age'], d['income'], d['credit'], d['experience'],
                         d['loan'], d['existing'], d['education'], d['married']]])
    feat_s = scaler.transform(feat)
    prob   = model.predict_proba(feat_s)[0][1]
    chance = round(prob * 100, 1)

    if chance >= 80:   decision, risk = "Approved",        "Low"
    elif chance >= 50: decision, risk = "Moderate Chance", "Medium"
    else:              decision, risk = "Risky / Rejected", "High"

    factors, advice, rec_loan = analyze_profile(d, chance)

    tenure_months = min(max((d['experience'] + 2) * 12, 12), 60)
    monthly_rate  = 0.085 / 12
    emi = d['loan'] * monthly_rate * (1 + monthly_rate)**tenure_months / \
          ((1 + monthly_rate)**tenure_months - 1)

    return jsonify({
        'name':       d['name'],
        'chance':     chance,
        'decision':   decision,
        'risk':       risk,
        'factors':    factors,
        'advice':     advice,
        'rec_loan':   rec_loan,
        'emi':        f"₹{emi:,.0f}/month for {tenure_months} months",
        'best_model': meta['best'],
        'inputs': {
            'age':        d['age'],
            'income':     f"₹{d['income']:,.0f}",
            'credit':     d['credit'],
            'loan':       f"₹{d['loan']:,.0f}",
            'experience': f"{d['experience']} yrs",
        }
    })


@app.route('/all-predictions', methods=['POST'])
def all_predictions():
    """Run all 7 models on the same input — returns each model's chance + decision."""
    try:
        d = parse_input(request.form)
    except (KeyError, ValueError) as e:
        return jsonify({'error': str(e)}), 400

    errs = validate(d)
    if errs:
        return jsonify({'error': errs}), 400

    feat   = np.array([[d['age'], d['income'], d['credit'], d['experience'],
                         d['loan'], d['existing'], d['education'], d['married']]])
    feat_s = _sc.transform(feat)   # use the scaler fitted on training data

    results = {}
    for name, clf in ALL_MODELS.items():
        prob   = clf.predict_proba(feat_s)[0][1]
        chance = round(prob * 100, 1)
        if chance >= 80:   dec, risk = "Approved",        "Low"
        elif chance >= 50: dec, risk = "Moderate Chance", "Medium"
        else:              dec, risk = "Risky / Rejected", "High"
        results[name] = {"chance": chance, "decision": dec, "risk": risk}

    return jsonify(results)


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
    app.run(debug=False)
