# 🛒 Shared Grocery Tracker Telegram Bot

A production-ready Telegram bot built with **TypeScript**, **grammY**, **Google Sheets API v4**, and **Gemini 1.5 Flash AI** that enables co-managing users (e.g. husband & wife) to track shared grocery spending within custom salary-to-salary budget windows.

---

## ✨ Features

- **Custom Salary-to-Salary Budget Windows (`/setbudget`):** Allocate budgets across arbitrary date ranges (e.g., 25th of month to 24th of next month).
- **Real-Time Balance & Summary (`/summary`):** Track total spending, remaining balance, and over-budget alerts.
- **Natural Language Text Ingestion:** Parse informal single/multiple expense texts (e.g., `ayam RM25.50`, `ikan 30 and bayam 10`) using Gemini 1.5 Flash.
- **Photo Receipt OCR Upload:** Upload receipt images for Gemini Vision OCR parsing, generating an interactive itemized preview card with `[✅ Confirm All]` and `[❌ Cancel]` inline buttons.
- **Category Management & Breakdown (`/categories`, `/breakdown`):** Manage custom categories and view percentage breakdown reports per active budget.
- **Data Persistence & Archival:** Google Sheets API v4 integration with automatic annual archiving (`Transactions_Archive_YYYY`).
- **Security & Authorization:** Whitelisted Telegram User IDs middleware (`authorizeUser`).
- **Modular & Platform-Agnostic:** Containerized via Docker for zero-downtime 24/7 deployment on **Render.com Free Tier** or any cloud host.

---

## 🤖 Bot Commands

| Command | Usage Example | Description |
|---|---|---|
| `/setbudget` | `/setbudget 1500 25/03/2026 24/04/2026` | Set active budget window amount and date range |
| `/summary` | `/summary` | View active budget summary card |
| `/categories` | `/categories` | List all active spending categories |
| `/addcategory` | `/addcategory Organic & Specialty` | Add a new custom category |
| `/deletecategory` | `/deletecategory Snacks` | Remove an existing category |
| `/breakdown` | `/breakdown` | Display category spending breakdown & percentage report |

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory (for local development):

```env
NODE_ENV=development
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_from_botfather
ALLOWED_USER_IDS=12345678,87654321
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_SPREADSHEET_ID=your_google_spreadsheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email@iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
LOG_LEVEL=info
```

---

## 🛠️ Local Development & Testing

### Installation
```bash
npm install
```

### Development Mode (Hot-Reloading)
```bash
npm run dev
```

### Run Unit & Integration Tests
```bash
npm test
```

### Run Test Coverage Report
```bash
npm run test:coverage
```

### Run Pre-Deploy Verification Pipeline
```bash
npm run predeploy
```
*(Executes `typecheck`, `test:coverage`, `security:audit`, and TypeScript build compilation to `dist/`.)*

---

## 🚀 Deployment Guide (Render.com Free Tier)

Deploy your bot 24/7 for **free** on Render.com using Docker containerization.

### Step 1: Push Repository to GitHub
Ensure all code, `Dockerfile`, and `render.yaml` are pushed to GitHub:
```bash
git add .
git commit -m "feat: render deployment setup"
git push origin main
```

### Step 2: Create Web Service on Render
1. Open **[dashboard.render.com](https://dashboard.render.com)** and log in.
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository (`shared-grocery-spending-telegram-bot`).
4. Set **Runtime** to **Docker** *(Render auto-detects `Dockerfile` and `render.yaml`)*.
5. Set **Instance Type** to **Free**.

### Step 3: Configure Environment Variables
Add the following Environment Variables under **Environment**:

```env
NODE_ENV=production
TELEGRAM_BOT_TOKEN=<your-telegram-bot-token>
ALLOWED_USER_IDS=<husband_id,wife_id>
GEMINI_API_KEY=<your-gemini-api-key>
GOOGLE_SPREADSHEET_ID=<your-spreadsheet-id>
GOOGLE_SERVICE_ACCOUNT_EMAIL=<your-service-account-email>
GOOGLE_PRIVATE_KEY=<your-service-account-private-key>
LOG_LEVEL=info
```

### Step 4: Configure Health Check Path
Under **Advanced**:
- **Health Check Path:** `/health`

Click **Create Web Service**. Render will build the Docker container and start your service!

---

## ⏰ Step 5: Keep Instance Awake 24/7 (Free Ping)

Render free web services spin down after 15 minutes of HTTP inactivity. To keep your long-polling Telegram bot online **24/7 with zero cold starts**:

1. Go to **[UptimeRobot.com](https://uptimerobot.com)** (or **[cron-job.org](https://cron-job.org)**) and create a free account.
2. Click **Add New Monitor**:
   - **Monitor Type:** `HTTP(s)`
   - **Friendly Name:** `Grocery Telegram Bot Ping`
   - **URL / IP:** `https://<your-app-name>.onrender.com/health`
   - **Monitoring Interval:** Every `5 minutes` or `10 minutes`
3. Click **Create Monitor**.

This continuous lightweight `/health` ping keeps your Render instance awake 24/7 for zero cost!
