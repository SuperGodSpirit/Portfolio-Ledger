<div align="center">
  <h1>📈 Portfolio Ledger</h1>
  <p><strong>A private, invite-only platform for independent Indian IPO investors.</strong></p>
  
  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](#)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](#)
  [![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](#)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](#)
  [![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=white)](#)
</div>

<br />

## 📖 Overview

**Portfolio Ledger** is a sophisticated, centralized record-keeping and mathematical utility designed to help families and private investor groups manage and track their distributed household demat accounts during Initial Public Offerings (IPOs) in the Indian stock market. 

Instead of messy spreadsheets, Portfolio Ledger provides a secure, role-based dashboard to manage the entire IPO lifecycle: from automated market research and AI-driven forecasting to recording family allotments, calculating household profit/loss, and orchestrating complex internal financial reconciliations.

---

## ✨ Core Features

*   🔐 **Role-Based Governance:** Hierarchical access control (`Platform Admin`, `Manager`, `Viewer`) with strict data scoping so users only see portfolios they are authorized to view.
*   🤖 **AI-Powered IPO Outlooks:** Autonomous Node.js scrapers fetch live market data and pipe it into the **Google Gemini AI**, which probabilistically models Bear, Base, and Bull listing-gain scenarios.
*   📊 **Automated Ledgers & Analytics:** Instantly calculates P&L, per-member entitlements, and cross-member reconciliation. Features dense analytical dashboards with animated `CountUp` numbers and `Recharts` visual data.
*   📱 **Progressive Web App (PWA):** Fully installable on iOS, Android, and Desktop with advanced Service Worker caching and Firestore offline persistence. Works flawlessly without internet access!
*   🔔 **Push Notifications:** Native Firebase Cloud Messaging (FCM) keeps investors instantly updated on new IPOs and pending settlement requests.
*   📥 **Excel Exports:** Single-click generation of audit-ready Excel workbooks summarizing member distributions and overall portfolio health.
*   🎨 **Premium Dark Mode UI:** A gorgeous, meticulously designed dark-themed interface utilizing a custom `ledger-*` color system for a professional financial terminal aesthetic.

---

## 🛠️ Tech Stack

| Domain | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS, Lucide React (Icons) |
| **Backend & DB** | Firebase Firestore, Firebase Authentication |
| **Cloud Functions** | Netlify Functions |
| **AI Integration** | Google Gemini API |
| **Data Pipelines** | Node.js, Cheerio (Web Scraping) |
| **PWA & Offline** | `vite-plugin-pwa`, FCM Service Workers |

---

## 🚀 Local Setup & Installation

### Prerequisites
* Node.js (v18+ recommended)
* NPM or Yarn
* A Firebase Project with Firestore and Auth enabled
* A Google Gemini API Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/supergodspirit/portfolio-ledger.git
   cd portfolio-ledger
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add your Firebase and Gemini credentials:
   ```env
   VITE_FIREBASE_API_KEY="your_api_key"
   VITE_FIREBASE_AUTH_DOMAIN="your_auth_domain"
   VITE_FIREBASE_PROJECT_ID="your_project_id"
   VITE_FIREBASE_STORAGE_BUCKET="your_storage_bucket"
   VITE_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
   VITE_FIREBASE_APP_ID="your_app_id"
   
   GEMINI_API_KEY="your_gemini_api_key"
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **(Optional) Run AI Scrapers:**
   ```bash
   node scripts/scrape-ipos.js
   node scripts/generate-outlooks.js
   ```

---

## 📄 License
This is a private, proprietary application. All rights reserved.
