import numpy as np
import pandas as pd
import joblib
import json
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.naive_bayes import GaussianNB
from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering

np.random.seed(42)
n = 1000
age        = np.random.randint(21, 65, n)
income     = np.random.randint(15000, 250000, n)
credit     = np.random.randint(300, 900, n)
experience = np.random.randint(0, 40, n)
loan_amt   = np.random.randint(10000, 1200000, n)
existing   = np.random.randint(0, 2, n)
education  = np.random.randint(0, 3, n)
married    = np.random.randint(0, 2, n)

approved = ((credit>=650)&(income>=25000)&(loan_amt<=income*12)&(experience>=1)&(age>=22)).astype(int)
noise    = np.random.rand(n) < 0.07
approved = np.where(noise, 1-approved, approved)

df = pd.DataFrame({'Age':age,'Income':income,'CreditScore':credit,'Experience':experience,
                   'LoanAmount':loan_amt,'ExistingLoan':existing,'Education':education,
                   'Married':married,'Approved':approved})
df.to_csv('dataset.csv', index=False)
print(f"Dataset: {n} rows, approval rate: {approved.mean()*100:.1f}%")

X = df.drop('Approved', axis=1)
y = df['Approved']
feature_names = list(X.columns)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
scaler    = StandardScaler()
X_train_s = scaler.fit_transform(X_train)
X_test_s  = scaler.transform(X_test)

MODEL_DESC = {
    "Logistic Regression": "Uses sigmoid function for binary classification. Fast and interpretable.",
    "Decision Tree":       "Splits data using Gini impurity. Creates if-else rules. Easy to visualize.",
    "Random Forest":       "Builds 200 trees on random data subsets. Final = majority vote. Best accuracy.",
    "Gradient Boosting":   "Builds trees sequentially, each correcting previous errors. Very accurate.",
    "KNN":                 "Finds 7 nearest neighbors and votes. No training phase needed.",
    "SVM":                 "Finds optimal hyperplane with max margin. Uses RBF kernel.",
    "Naive Bayes":         "Applies Bayes theorem assuming feature independence. Very fast.",
}

MODELS = {
    "Logistic Regression": LogisticRegression(max_iter=1000),
    "Decision Tree":       DecisionTreeClassifier(max_depth=8, random_state=42),
    "Random Forest":       RandomForestClassifier(n_estimators=200, max_depth=10, random_state=42),
    "Gradient Boosting":   GradientBoostingClassifier(n_estimators=150, learning_rate=0.1, random_state=42),
    "KNN":                 KNeighborsClassifier(n_neighbors=7),
    "SVM":                 SVC(probability=True, kernel='rbf', random_state=42),
    "Naive Bayes":         GaussianNB(),
}

scores_data, trained = {}, {}
print("\n-- SUPERVISED RESULTS --")
for name, clf in MODELS.items():
    clf.fit(X_train_s, y_train)
    y_pred = clf.predict(X_test_s)
    acc  = round(accuracy_score(y_test, y_pred)*100, 2)
    prec = round(precision_score(y_test, y_pred, zero_division=0)*100, 2)
    rec  = round(recall_score(y_test, y_pred, zero_division=0)*100, 2)
    f1   = round(f1_score(y_test, y_pred, zero_division=0)*100, 2)
    scores_data[name] = {"accuracy":acc,"precision":prec,"recall":rec,"f1":f1,"desc":MODEL_DESC[name]}
    trained[name] = clf
    print(f"  {name:22s}: acc={acc}%")

best_name  = max(scores_data, key=lambda k: scores_data[k]["accuracy"])
best_model = trained[best_name]
print(f"\n  BEST -> {best_name} ({scores_data[best_name]['accuracy']}%)")

rf          = trained["Random Forest"]
importances = {n: round(float(v)*100,2) for n,v in zip(feature_names, rf.feature_importances_)}
flat_scores = {k: v["accuracy"] for k,v in scores_data.items()}

joblib.dump(best_model, 'loan_model.pkl')
joblib.dump(scaler,     'scaler.pkl')
with open('model_scores.json','w') as f:
    json.dump({"scores":flat_scores,"best":best_name,"importances":importances,"details":scores_data}, f)
print("  Artifacts saved.")

X_all = scaler.transform(X)
km = KMeans(n_clusters=2, random_state=42, n_init=10)
print(f"  KMeans: {dict(zip(*np.unique(km.fit_predict(X_all), return_counts=True)))}")
db = DBSCAN(eps=2.5, min_samples=5)
print(f"  DBSCAN: {set(db.fit_predict(X_all))}")
hc = AgglomerativeClustering(n_clusters=2)
print(f"  Hierarchical: {dict(zip(*np.unique(hc.fit_predict(X_all), return_counts=True)))}")
print("Done.")