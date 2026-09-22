# Timesheet Recorder

> **Enterprise-grade collaborative timesheet recording, project accounting, and executive analytics powered by Google Sheets.**

[![React](https://img.shields.io/badge/React-19.0-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.1-38B2AC.svg)](https://tailwindcss.com/)
[![Google Sheets API](https://img.shields.io/badge/Google_Sheets_API-v4-34A853.svg)](https://developers.google.com/sheets/api)
[![Firebase](https://img.shields.io/badge/Firebase_Auth-v12-FFCA28.svg)](https://firebase.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Timesheet Recorder is a web application designed for consulting teams, agencies, and professional services firms. It combines client-side timesheet entry with a live **Google Sheets** database, automated project budget tracking, rate cards, executive KPIs, and printable PDF invoices.

---

## Key Features

- **Bi-Directional Google Sheets Database**:
  - Live two-way synchronization using the Google Sheets REST API v4.
  - Automatically provisions and updates 7 organized tabs:
    1. `Timesheet Logs`: Raw activity entries with hours, narratives, and calculated financial values.
    2. `Projects`: Engagement tracking, start/target end dates, billable status, and budgets.
    3. `Rate Cards`: Team roles, day rates, hourly rates (Day Rate / 7), cost rates, and sell rates.
    4. `Clients`: Client directory, billing contacts, and metadata.
    5. `Members`: Team roster and assigned default roles.
    6. `Roles`: Standard seniority and practice classifications.
    7. `Executive Summary`: Live CEO dashboard with side-by-side tables and portfolio aggregates.
  - Smart timestamp-based merging to prevent data overwrites across concurrent team members.
  - Background polling (every 30 seconds) plus instant write-through.

- **CEO & Executive Summary Dashboard**:
  - **Zero `#REF!` Spill Collisions**: Side-by-side architecture separating Project Deliverables (Cols A–K), Team Capacity (Cols M–Q), and Recent Activity Logs (Cols S–W).
  - **Live Financial Burn Calculations**: Gross Spend (`£`), Expenses, Discounts, and Net Total Burn computed dynamically.
  - **Clean Formats**: Formatted calendar dates (`YYYY-MM-DD`) and currency (`£#,##0.00`).
  - High-level KPI cards for Total Hours, Submissions, Active Projects, and Completed Engagements.

- **Dual Timesheet Entry Modes**:
  - **Weekly Matrix Grid**: Quick matrix view for logging hours across multiple projects and days of the week.
  - **Daily Activity Log**: Detailed entry mode with project selection, hours, and accomplishment narratives.

- **Rate Cards & Commercial Margins**:
  - Configurable Day Rates, Hourly Rates, and Margin percentages.
  - Multi-currency support (£ GBP, $ USD, € EUR).
  - Real-time project cost and burn calculations.

- **Printable Invoices & PDF Reports**:
  - Instant PDF export of weekly timesheets and executive summaries with client-ready branding via `jspdf` and `html2canvas`.

- **Ergonomic Design & Theming**:
  - Responsive design optimized for both desktop and mobile devices.
  - Instant toggle between Dark Mode and Light Mode with persistent preference.

---

## Architecture & Tech Stack

- **Frontend Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Dev Server**: [Vite 6](https://vitejs.dev/) with `@tailwindcss/vite`
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons & Animation**: [Lucide React](https://lucide.dev/) and [Motion](https://motion.dev/)
- **Charts & Data Visualization**: [Recharts](https://recharts.org/)
- **Document Generation**: [jsPDF](https://github.com/parallax/jsPDF) & [html2canvas](https://html2canvas.hertzen.com/)
- **Authentication**: [Firebase Auth](https://firebase.google.com/docs/auth) with Google Sign-In Popup & Google Sheets OAuth scope (`https://www.googleapis.com/auth/spreadsheets`)
- **Data Persistence**: Google Sheets API v4 (REST) + browser local storage fallback

---

## Prerequisites

Before running the application, make sure you have:

- **Node.js**: v18.0.0 or later (v20+ recommended).
- **Package Manager**: `npm`, `pnpm`, or `bun`.
- **Google Account**: To create and link your Google Sheet.
- **Firebase Project**: For Google Authentication (free tier / Spark plan is sufficient).

---

## Quick Start Guide

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/timesheet-recorder.git
cd timesheet-recorder
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Firebase & Google OAuth

The application uses Firebase Authentication with a Google OAuth provider configured with Google Sheets read/write permissions.

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project (or select an existing one).
2. Under **Project Settings > General**, add a **Web App** to obtain your Firebase configuration.
3. Under **Authentication > Sign-in method**:
   - Enable **Google** as a Sign-in provider.
4. Go to the [Google Cloud Console](https://console.cloud.google.com/) for your Firebase project:
   - Navigate to **APIs & Services > Library**.
   - Search for **Google Sheets API** and click **Enable**.
   - Navigate to **APIs & Services > Credentials**.
   - Under **OAuth 2.0 Client IDs**, edit the Web client used by Firebase:
     - Under **Authorized JavaScript origins**, add:
       - `http://localhost:3000`
       - `http://127.0.0.1:3000`
       - Your production deployment domain (e.g., `https://your-domain.com`).
     - Under **Authorized redirect URIs**, ensure your Firebase auth handler is listed:
       - `https://<YOUR-FIREBASE-PROJECT-ID>.firebaseapp.com/__/auth/handler`
5. Copy the configuration template:
   ```bash
   cp firebase-applet-config.example.json firebase-applet-config.json
   ```
6. Edit `firebase-applet-config.json` with your Firebase web credentials:
   ```json
   {
     "projectId": "your-firebase-project-id",
     "appId": "1:000000000000:web:0000000000000000000000",
     "apiKey": "AIzaSyYourApiKeyHere",
     "authDomain": "your-firebase-project-id.firebaseapp.com",
     "storageBucket": "your-firebase-project-id.firebasestorage.app",
     "messagingSenderId": "000000000000",
     "measurementId": "",
     "oAuthClientId": "000000000000-xxxx.apps.googleusercontent.com",
     "recaptchaSiteKey": ""
   }
   ```

### 4. Configure Environment Variables (Optional)

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

If you plan to use Gemini AI features or custom server hosting:
- `GEMINI_API_KEY`: Your Google AI Studio / Gemini API key.
- `APP_URL`: The public URL of the application.

### 5. Launch Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Connecting Your Google Sheet

1. Open the application at `http://localhost:3000`.
2. Click **Connect Google Sheets** in the top navigation bar.
3. Sign in with your Google account and grant spreadsheet permissions.
4. **Choose your spreadsheet**:
   - Use the default auto-created spreadsheet, or
   - Create a blank Google Sheet in your Google Drive, copy its URL or Spreadsheet ID, and paste it into the **Google Sheets Sync Settings** card.
5. Click **Apply to Google Sheet Now** or **Sync Now**:
   - The app will automatically generate the required tabs (`Timesheet Logs`, `Projects`, `Rate Cards`, `Clients`, `Members`, `Roles`, `Executive Summary`).
   - Formulas, headers, validation, and executive KPI queries will be initialized immediately.

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Vite development server on `http://0.0.0.0:3000`. |
| `npm run build` | Compiles TypeScript and builds production assets into `dist/`. |
| `npm run preview` | Previews the production build locally. |
| `npm run lint` | Runs the TypeScript compiler (`tsc --noEmit`) to validate type safety. |
| `npm run clean` | Cleans up the `dist/` build directory. |

---

## Project Structure

```
├── .env.example                     # Environment variables template
├── firebase-applet-config.json      # Active Firebase client configuration
├── firebase-applet-config.example.json # Firebase config template
├── index.html                       # HTML entry point
├── metadata.json                    # App metadata and platform capabilities
├── package.json                     # NPM packages, dependencies, scripts
├── tsconfig.json                    # TypeScript compiler configuration
├── vite.config.ts                   # Vite + Tailwind + alias configuration
└── src/
    ├── App.tsx                      # Primary application controller & state
    ├── main.tsx                     # React root DOM mount
    ├── index.css                    # Tailwind CSS v4 styling entry point
    ├── types.ts                     # Core TypeScript data models & interfaces
    ├── version.ts                   # Version tracking and release tags
    ├── components/
    │   ├── Header.tsx               # Top navigation, Google account, and sync triggers
    │   ├── TimeTracker.tsx          # Daily timesheet entry form
    │   ├── WeeklyMatrixGrid.tsx     # Matrix grid view for fast weekly logging
    │   ├── WeeklyReport.tsx         # Detailed timesheet reports with PDF generation
    │   ├── RateCardsManager.tsx     # Role day rates, cost rates, and margin controls
    │   ├── ProjectManager.tsx       # Project creation, status, and budget tracking
    │   ├── MetricsBento.tsx         # Dashboard metrics and burn breakdown
    │   └── SyncIndicator.tsx        # Real-time sync status badges
    └── lib/
        ├── firebase.ts              # Firebase auth & Google OAuth token management
        └── sheetsDb.ts              # Google Sheets REST API v4 client, queries, and templates
```

---

## Google Sheet Schema Reference

When the app synchronizes with your Google Sheet, the following tabs and headers are maintained:

1. **`Timesheet Logs`**
   - Columns: `Submission ID`, `Project ID`, `Team Member`, `Hours`, `Date`, `Accomplishment Narrative`, `Client Name`, `Role`, `Currency`, `Day Rate`, `Effective Hourly Rate`, `Calculated Line Total (£)`
2. **`Projects`**
   - Columns: `Project ID`, `Project Name`, `Client Name`, `Start Date`, `Target End Date`, `Budget Hours`, `Budget Amount`, `Hourly Rate`, `Currency`, `Description`, `Billable`, `Total Hours Logged`, `Status`
3. **`Rate Cards`**
   - Columns: `Role ID`, `Role Name`, `Day Rate (£)`, `Hourly Rate (£)`, `Cost Rate (£)`, `Margin (%)`, `Currency`, `Notes`
4. **`Clients`**
   - Columns: `Client ID`, `Client Name`, `Primary Contact`, `Email`, `Notes`
5. **`Members`**
   - Columns: `Member ID`, `Name`, `Email`, `Default Role`, `Active`
6. **`Roles`**
   - Columns: `Role ID`, `Title`, `Department`, `Seniority Level`
7. **`Executive Summary`**
   - Columns A–K: Project Delivery Status & Financial Performance (CEO View)
   - Columns M–Q: Team Member Recorded Capacity & Logs Breakdown (Live Query)
   - Columns S–W: Recent Activity Timeline (Last 20 Calendar Logs)

---

## Deployment

### Deploying to Cloud Run / Docker

This app can be deployed as a static Single Page Application (SPA) on Cloud Run, Vercel, Netlify, or AWS S3/CloudFront.

To build the static distribution:
```bash
npm run build
```
Deploy the resulting `dist/` directory to any static hosting provider.

### Production OAuth Configuration Note
When deploying to production, ensure that your custom domain (e.g. `https://timesheet.yourcompany.com`) is added to:
1. **Firebase Authentication > Authorized Domains** in the Firebase Console.
2. **Authorized JavaScript Origins** in Google Cloud Console under your OAuth 2.0 Client credentials.

---

## Security & Best Practices

- **Token Storage**: OAuth access tokens for the Google Sheets API are maintained in browser `sessionStorage` with a 55-minute Time-To-Live (TTL) and refreshed upon interactive user request.
- **Client-Side Privacy**: All data is read from and written directly to your private Google Sheet without passing through intermediate third-party servers.
- **Role-Based Access**: Rate cards and projects can be locked or updated as your organization requires directly within Google Sheets or via the in-app management panels.

---

## Contributing

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

---

## License

Distributed under the MIT License. See `LICENSE` for more information.

---

**Developed for The Uplift Partnership** • Collaborative Project Intelligence & Timesheet Recording
