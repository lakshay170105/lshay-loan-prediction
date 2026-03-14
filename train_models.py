<<<<<<< HEAD
import numpy as np
import pandas as pd
import joblib
import json
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.naive_bayes import GaussianNB
from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering

# ── Generate 1000-row realistic dataset ──────────────────────────────────────
np.random.seed(42)
n = 1000

age        = np.random.randint(21, 65, n)
income     = np.random.randint(15000, 250000, n)
credit     = np.random.randint(300, 900, n)
experience = np.random.randint(0, 40, n)
loan_amt   = np.random.randint(10000, 1200000, n)
existing   = np.random.randint(0, 2, n)
education  = np.random.randint(0, 3, n)   # 0=HS, 1=Graduate, 2=PostGrad
married    = np.random.randint(0, 2, n)

approved = (
    (credit     >= 650) &
    (income     >= 25000) &
    (loan_amt   <= income * 12) &
    (experience >= 1) &
    (age        >= 22)
).astype(int)

noise = np.random.rand(n) < 0.07
approved = np.where(noise, 1 - approved, approved)

df = pd.DataFrame({
    'Age': age, 'Income': income, 'CreditScore': credit,
    'Experience': experience, 'LoanAmount': loan_amt,
    'ExistingLoan': existing, 'Education': education,
    'Married': married, 'Approved': approved
})

df.to_csv('dataset.csv', index=False)
print(f"Dataset saved — {n} rows, approval rate: {approved.mean()*100:.1f}%")

# ── Supervised Training ───────────────────────────────────────────────────────
X = df.drop('Approved', axis=1)
y = df['Approved']
feature_names = list(X.columns)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

scaler = StandardScaler()
X_train_s = scaler.fit_transform(X_train)
X_test_s  = scaler.transform(X_test)

supervised = {
    "Logistic Regression":   LogisticRegression(max_iter=1000),
    "Decision Tree":         DecisionTreeClassifier(random_state=42),
    "Random Forest":         RandomForestClassifier(n_estimators=100, random_state=42),
    "Gradient Boosting":     GradientBoostingClassifier(n_estimators=100, random_state=42),
    "KNN":                   KNeighborsClassifier(n_neighbors=7),
    "SVM":                   SVC(probability=True, random_state=42),
    "Naive Bayes":           GaussianNB(),
}

scores = {}
trained = {}
print("\n── SUPERVISED MODEL RESULTS ──")
for name, model in supervised.items():
    model.fit(X_train_s, y_train)
    acc = accuracy_score(y_test, model.predict(X_test_s))
    scores[name] = round(acc * 100, 2)
    trained[name] = model
    print(f"  {name:25s}: {acc*100:.2f}%")

best_name  = max(scores, key=scores.get)
best_model = trained[best_name]
print(f"\n  BEST MODEL → {best_name} ({scores[best_name]}%)")

# Feature importance (Random Forest)
rf = trained["Random Forest"]
importances = dict(zip(feature_names, [round(float(v)*100, 2) for v in rf.feature_importances_]))

# Save artifacts
joblib.dump(best_model, 'loan_model.pkl')
joblib.dump(scaler,     'scaler.pkl')
with open('model_scores.json', 'w') as f:
    json.dump({"scores": scores, "best": best_name, "importances": importances}, f)
print("  Artifacts saved.\n")

# ── Unsupervised Clustering ───────────────────────────────────────────────────
X_scaled = scaler.transform(X)
print("── UNSUPERVISED CLUSTERING ──")

km = KMeans(n_clusters=2, random_state=42, n_init=10)
km_labels = km.fit_predict(X_scaled)
print(f"  KMeans clusters       : {dict(zip(*np.unique(km_labels, return_counts=True)))}")

db = DBSCAN(eps=2.5, min_samples=5)
db_labels = db.fit_predict(X_scaled)
print(f"  DBSCAN clusters       : {set(db_labels)}")

hc = AgglomerativeClustering(n_clusters=2)
hc_labels = hc.fit_predict(X_scaled)
print(f"  Hierarchical clusters : {dict(zip(*np.unique(hc_labels, return_counts=True)))}")
print("\nAll done.")
=======
import numpy as np
import pandas as pd
import joblib
import json
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.naive_bayes import GaussianNB
from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering

# ── Generate 1000-row realistic dataset ──────────────────────────────────────
np.random.seed(42)
n = 1000

age        = np.random.randint(21, 65, n)
income     = np.random.randint(15000, 250000, n)
credit     = np.random.randint(300, 900, n)
experience = np.random.randint(0, 40, n)
loan_amt   = np.random.randint(10000, 1200000, n)
existing   = np.random.randint(0, 2, n)
education  = np.random.randint(0, 3, n)   # 0=HS, 1=Graduate, 2=PostGrad
married    = np.random.randint(0, 2, n)

approved = (
    (credit     >= 650) &
    (income     >= 25000) &
    (loan_amt   <= income * 12) &
    (experience >= 1) &
    (age        >= 22)
).astype(int)

noise = np.random.rand(n) < 0.07
approved = np.where(noise, 1 - approved, approved)

df = pd.DataFrame({
    'Age': age, 'Income': income, 'CreditScore': credit,
    'Experience': experience, 'LoanAmount': loan_amt,
    'ExistingLoan': existing, 'Education': education,
    'Married': married, 'Approved': approved
})

df.to_csv('dataset.csv', index=False)
print(f"Dataset saved — {n} rows, approval rate: {approved.mean()*100:.1f}%")

# ── Supervised Training ───────────────────────────────────────────────────────
X = df.drop('Approved', axis=1)
y = df['Approved']
feature_names = list(X.columns)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

scaler = StandardScaler()
X_train_s = scaler.fit_transform(X_train)
X_test_s  = scaler.transform(X_test)

supervised = {
    "Logistic Regression":   LogisticRegression(max_iter=1000),
    "Decision Tree":         DecisionTreeClassifier(random_state=42),
    "Random Forest":         RandomForestClassifier(n_estimators=100, random_state=42),
    "Gradient Boosting":     GradientBoostingClassifier(n_estimators=100, random_state=42),
    "KNN":                   KNeighborsClassifier(n_neighbors=7),
    "SVM":                   SVC(probability=True, random_state=42),
    "Naive Bayes":           GaussianNB(),
}

scores = {}
trained = {}
print("\n── SUPERVISED MODEL RESULTS ──")
for name, model in supervised.items():
    model.fit(X_train_s, y_train)
    acc = accuracy_score(y_test, model.predict(X_test_s))
    scores[name] = round(acc * 100, 2)
    trained[name] = model
    print(f"  {name:25s}: {acc*100:.2f}%")

best_name  = max(scores, key=scores.get)
best_model = trained[best_name]
print(f"\n  BEST MODEL → {best_name} ({scores[best_name]}%)")

# Feature importance (Random Forest)
rf = trained["Random Forest"]
importances = dict(zip(feature_names, [round(float(v)*100, 2) for v in rf.feature_importances_]))

# Save artifacts
joblib.dump(best_model, 'loan_model.pkl')
joblib.dump(scaler,     'scaler.pkl')
with open('model_scores.json', 'w') as f:
    json.dump({"scores": scores, "best": best_name, "importances": importances}, f)
print("  Artifacts saved.\n")

# ── Unsupervised Clustering ───────────────────────────────────────────────────
X_scaled = scaler.transform(X)
print("── UNSUPERVISED CLUSTERING ──")

km = KMeans(n_clusters=2, random_state=42, n_init=10)
km_labels = km.fit_predict(X_scaled)
print(f"  KMeans clusters       : {dict(zip(*np.unique(km_labels, return_counts=True)))}")

db = DBSCAN(eps=2.5, min_samples=5)
db_labels = db.fit_predict(X_scaled)
print(f"  DBSCAN clusters       : {set(db_labels)}")

hc = AgglomerativeClustering(n_clusters=2)
hc_labels = hc.fit_predict(X_scaled)
print(f"  Hierarchical clusters : {dict(zip(*np.unique(hc_labels, return_counts=True)))}")
print("\nAll done.")
>>>>>>> 9f0dc4fbe2558693855a50fc425a4f1978d581a7
