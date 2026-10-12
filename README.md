# Stock Screener • Moteur d'Analyse Fondamentale & Solvabilité

Application complète de Stock Screener (Scanner d'Actions) conçue pour repérer les entreprises de grande qualité financière (*Quality Compounders*), analyser leurs bilans et ratios financiers sur 5 à 10 ans, et faciliter la constitution d'un portefeuille d'investissement axé sur la valeur et la profitabilité.

---

## 1. Architecture & Piliers d'Analyse

### 1.1 Algorithme de Qualité (Score sur 100)
Le système évalue automatiquement chaque entreprise selon 4 piliers fondamentaux :
- **Santé financière & Solvabilité (25 pts)** :
  - Dette Nette / EBITDA ≤ 2.5x (ou Trésorerie nette positive)
  - Ratio de liquidité générale (*Current Ratio*) ≥ 1.5
  - Couverture des intérêts (*Interest Coverage*) ≥ 5.0x
- **Rentabilité & Profitabilité (30 pts)** :
  - Rentabilité des capitaux propres (*ROE*) ≥ 15%
  - Rentabilité du capital investi (*ROIC*) ≥ 12%
  - Marge opérationnelle stable ou en expansion sur 5 ans (≥ 15%)
- **Croissance & Génération de Cash (25 pts)** :
  - Taux de croissance annuel composé (CAGR) du Chiffre d'Affaires sur 5 ans ≥ 5%
  - CAGR du Bénéfice par Action (BPA) sur 5 ans ≥ 7%
  - Taux de conversion du résultat net en Free Cash Flow (FCF / Net Income) ≥ 80%
- **Valorisation (20 pts)** :
  - Multiple de cours sur bénéfices (*P/E ratio*) raisonnable (&lt; 25x)
  - Multiple de cours sur Free Cash Flow (*P/FCF*) attractif (&lt; 25-30x)

---

## 2. Stack Technique

- **Backend** : FastAPI (Python 3.12), SQLAlchemy 2.0, Pydantic v2, Pandas, APScheduler (automatisation quotidienne).
- **Frontend** : React 19, TypeScript, Vite, Tailwind CSS, Recharts (visualisation interactive des marges, du cash-flow et des cours), Lucide Icons.
- **Data Pipeline** : Intégration `yfinance` avec mise en cache relationnelle SQL des états financiers historiques et séries temporelles de cours.

---

## 3. Lancement Local

### Backend (FastAPI)
```bash
cd backend
python3 -m pip install -r requirements.txt
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```
- API Docs Swagger : `http://localhost:8000/docs`

### Frontend (React / Vite)
```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```
- Interface Web : `http://localhost:5173`

---

## 4. Tests
Exécuter la suite de tests automatisés backend (Pytest) :
```bash
cd backend
python3 -m pytest tests/
```
