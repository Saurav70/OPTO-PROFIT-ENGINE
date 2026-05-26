# OPTO-PROFIT: Step-by-Step Free Deployment Guide

Deploy the full OPTO-PROFIT stack to production — **completely free** — using three platforms:

| Layer | Platform | Cost | URL You Will Get |
| :---: | :--- | :---: | :--- |
| 🗄️ **Database** | MongoDB Atlas (M0 Free Tier) | **$0** | Cloud-managed MongoDB cluster |
| ⚙️ **Backend API** | Render (Free Web Service) | **$0** | `https://opto-profit-backend.onrender.com` |
| 🌐 **Frontend** | Vercel (Free Hobby Plan) | **$0** | `https://opto-profit.vercel.app` |

**Total time**: ~30 minutes. **Prerequisites**: A GitHub account and your code already pushed to `https://github.com/Teirac2025/Opto-Profit-Engine`.

---

## Architecture Overview

```
  Browser
     │
     │  HTTPS (Let's Encrypt SSL — Auto-Issued)
     ▼
┌──────────────────────────────┐
│  Vercel  ·  Global CDN Edge  │  ← React + Vite Frontend
│  https://opto-profit.vercel.app│
└──────────────┬───────────────┘
               │
               │  HTTPS REST API calls (VITE_API_BASE_URL)
               ▼
┌──────────────────────────────┐
│  Render  ·  Docker Container │  ← FastAPI Backend (Python)
│  opto-profit-backend.onrender│
└──────────────┬───────────────┘
               │
               │  TLS (mongodb+srv://)
               ▼
┌──────────────────────────────┐
│  MongoDB Atlas  ·  M0 Cluster│  ← Production Database
└──────────────────────────────┘
```

---

## PHASE 1 — Set Up the Database (MongoDB Atlas)

> **Time**: ~10 minutes

### Step 1 — Create Your Atlas Account

1. Go to **[mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register)**.
2. Sign up with your email (or continue with Google).
3. When asked "What is your goal?", select **"Learn MongoDB"** or **"Build an App"** — it does not matter.
4. Click **"Finish"** to reach the Atlas dashboard.

---

### Step 2 — Create a Free Cluster

1. Click the green **"Create"** button (or **"Build a Database"**).
2. Select the **M0 FREE** plan (the leftmost card). It says "Free Forever".
3. Choose your provider and region:
   - **Provider**: AWS
   - **Region**: Pick whichever is closest to you (e.g., `Mumbai (ap-south-1)` for India)
4. Leave the **Cluster Name** as `Cluster0`.
5. Click **"Create Deployment"**.

---

### Step 3 — Create a Database User

A dialog will appear asking you to secure your cluster.

1. Under **"Username and Password"** authentication:
   - **Username**: `opto_admin`
   - **Password**: Click **"Autogenerate Secure Password"** → **Copy and save this password** somewhere safe (e.g., Notepad).
2. Click **"Create Database User"**.

---

### Step 4 — Allow Network Access from Anywhere

Because Render uses dynamic IPs, you must allow all IPs.

1. In the left sidebar, go to **Security → Network Access**.
2. Click **"+ Add IP Address"**.
3. Click **"Allow Access from Anywhere"**.
   - This auto-fills `0.0.0.0/0`.
4. Click **"Confirm"**.

---

### Step 5 — Get Your Connection String

1. In the left sidebar, go to **Database** (under Deployments).
2. Click **"Connect"** next to your `Cluster0`.
3. Choose **"Drivers"**.
4. Under **Driver**, select **Python** / Version **3.11 or later**.
5. Copy the connection string. It will look like:
   ```
   mongodb+srv://opto_admin:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<password>` with the password you saved in Step 3.
7. The final string is your **`MONGODB_URI`** — save it.

> ✅ **Phase 1 Complete.** Your database is live and ready to accept connections.

---

## PHASE 2 — Deploy the Backend (Render)

> **Time**: ~10 minutes

### Step 6 — Create a Render Account

1. Go to **[render.com](https://render.com)** and click **"Get Started for Free"**.
2. Sign up using your **GitHub account** (recommended for automatic repo linking).
3. Authorize Render to access your GitHub repositories.

---

### Step 7 — Create a New Web Service

1. On the Render dashboard, click **"+ New"** → **"Web Service"**.
2. Under **"Connect a repository"**, find and select **`Teirac2025/Opto-Profit-Engine`**.
3. Click **"Connect"**.

---

### Step 8 — Configure the Backend Service Settings

Fill in the settings form exactly as follows:

| Field | Value |
| :--- | :--- |
| **Name** | `opto-profit-backend` |
| **Region** | Singapore (or whichever is closest to you) |
| **Branch** | `master` |
| **Root Directory** | `backend` ← **Critical: type this exactly** |
| **Runtime** | `Docker` |
| **Instance Type** | `Free` |

Leave **"Docker Command"** blank — Render reads the `CMD` from your `backend/Dockerfile` automatically.

---

### Step 9 — Set Environment Variables on Render

Scroll down to the **"Environment Variables"** section and add each variable:

Click **"Add Environment Variable"** for each row:

| Key | Value |
| :--- | :--- |
| `MONGODB_URI` | The full `mongodb+srv://...` string from Step 5 |
| `SESSION_SECRET` | Generate one (see below) |
| `ENV` | `production` |
| `ENABLE_HSTS` | `true` |
| `FRONTEND_ORIGIN` | `https://opto-profit.vercel.app` ← (your future Vercel URL) |
| `FRONTEND_ORIGINS` | `https://opto-profit.vercel.app` |

> **How to generate SESSION_SECRET**: Open any terminal and run:
> ```bash
> python -c "import secrets; print(secrets.token_hex(32))"
> ```
> Copy the output (a 64-character hex string) and paste it as the value.

---

### Step 10 — Deploy the Backend

1. Scroll to the bottom and click **"Create Web Service"**.
2. Render will now:
   - Pull your code from GitHub
   - Run `docker build` using `backend/Dockerfile`
   - Install all Python packages from `requirements.txt`
   - Start the Uvicorn server on the dynamic `$PORT`
3. Watch the build logs scroll. Wait for the green **"Live"** status badge.
4. Your backend URL will be: **`https://opto-profit-backend.onrender.com`**

### Step 11 — Verify the Backend is Working

Open your browser and visit:
```
https://opto-profit-backend.onrender.com/api/status
```

You should see this JSON response:
```json
{"status": "ok", "version": "1.0.0"}
```

> ✅ **Phase 2 Complete.** Your FastAPI backend is live with a free HTTPS URL.

---

## PHASE 3 — Deploy the Frontend (Vercel)

> **Time**: ~5 minutes

### Step 12 — Update the Frontend Production Environment Variable

Before deploying, you must tell the frontend where the backend lives.

Open `s:\OPTO-PROFIT\frontend\.env.production` and set it to:

```env
# ==============================================================================
# OPTO-PROFIT Frontend Production Environment Configuration
# ==============================================================================
VITE_API_BASE_URL=https://opto-profit-backend.onrender.com
```

Then push this change to GitHub:

```powershell
cd s:\OPTO-PROFIT
git add frontend/.env.production
git commit -m "Set production API URL to Render backend"
git push origin master
```

---

### Step 13 — Create a Vercel Account

1. Go to **[vercel.com](https://vercel.com)** and click **"Start Deploying"**.
2. Sign up with your **GitHub account**.
3. Authorize Vercel to access your repositories.

---

### Step 14 — Import the OPTO-PROFIT Project

1. On the Vercel dashboard, click **"Add New..."** → **"Project"**.
2. Find **`Teirac2025/Opto-Profit-Engine`** and click **"Import"**.

---

### Step 15 — Configure the Vercel Build Settings

On the configuration screen, fill in:

| Field | Value |
| :--- | :--- |
| **Framework Preset** | `Vite` (auto-detected) |
| **Root Directory** | Click **"Edit"** → type `frontend` → click **"Continue"** |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm ci` |

---

### Step 16 — Add Environment Variable on Vercel

Under the **"Environment Variables"** section before deploying:

| Name | Value |
| :--- | :--- |
| `VITE_API_BASE_URL` | `https://opto-profit-backend.onrender.com` |

Make sure the scope is set to **Production** (and optionally Preview/Development).

---

### Step 17 — Deploy

1. Click **"Deploy"**.
2. Vercel will:
   - Clone your `frontend/` directory
   - Run `npm ci` to install dependencies
   - Run `npm run build` (Vite compiler — 3,395 modules)
   - Serve the `dist/` output across its global edge CDN
3. Wait ~60 seconds. A confetti animation will appear when it's done.
4. Your frontend URL will be: **`https://opto-profit.vercel.app`**

### Step 18 — Verify the Full Application

Open **`https://opto-profit.vercel.app`** in your browser:

- [ ] The OPTO-PROFIT login page loads correctly
- [ ] You can register a new account
- [ ] You can log in and see the dashboard
- [ ] Tasks and config save correctly (data persists in MongoDB)
- [ ] All navigation links work (Process Planning, Floor Layout, Analytics)

> ✅ **Phase 3 Complete.** Your full-stack app is live on the internet — 100% free.

---

## PHASE 4 — (Optional) Connect a Custom Domain

> **Time**: ~15 minutes + DNS propagation (up to 48 hours)

If you own a custom domain (e.g. `optoprofit.com`), follow these steps.

### Step 19 — Add Domain to Vercel (Frontend)

1. In your Vercel project dashboard → **"Settings"** → **"Domains"**.
2. Type your domain: `optoprofit.com` and click **"Add"**.
3. Vercel will show you the DNS records to configure.

### Step 20 — Add Domain to Render (Backend)

1. In your Render backend service → **"Settings"** → **"Custom Domains"**.
2. Type `api.optoprofit.com` and click **"Save"**.
3. Render will show you a CNAME target to point to.

### Step 21 — Configure DNS at Your Registrar

Log in to your domain registrar (e.g., GoDaddy, Namecheap, Cloudflare) and add:

| Record Type | Host / Name | Points To / Value |
| :---: | :---: | :--- |
| **A** | `@` | `76.76.21.21` (Vercel's IP) |
| **CNAME** | `www` | `cname.vercel-dns.com` |
| **CNAME** | `api` | `opto-profit-backend.onrender.com` |

### Step 22 — SSL Auto-Issue (Automatic)

Once DNS propagates (10 min – 48 hours):
- Vercel auto-issues a **Let's Encrypt TLS certificate** for `optoprofit.com`
- Render auto-issues a **Let's Encrypt TLS certificate** for `api.optoprofit.com`
- All HTTP requests automatically redirect to HTTPS

No manual steps required for SSL — both platforms handle it entirely.

---

## Quick Reference: All URLs at a Glance

| Service | Free URL | Custom Domain (Optional) |
| :--- | :--- | :--- |
| **Frontend** | `https://opto-profit.vercel.app` | `https://optoprofit.com` |
| **Backend API** | `https://opto-profit-backend.onrender.com` | `https://api.optoprofit.com` |
| **Health Check** | `https://opto-profit-backend.onrender.com/api/status` | `https://api.optoprofit.com/api/status` |
| **API Docs** | `https://opto-profit-backend.onrender.com/docs` | `https://api.optoprofit.com/docs` |

---

## Environment Variables: Complete Reference

### Backend (Set on Render Dashboard)

| Variable | Required | Example Value | Purpose |
| :--- | :---: | :--- | :--- |
| `MONGODB_URI` | ✅ | `mongodb+srv://opto_admin:pass@...` | Database connection |
| `SESSION_SECRET` | ✅ | `a3f8b2c1...` (64 hex chars) | Session encryption key |
| `ENV` | ✅ | `production` | Production mode toggle |
| `ENABLE_HSTS` | ✅ | `true` | Force HTTPS headers |
| `FRONTEND_ORIGIN` | ✅ | `https://opto-profit.vercel.app` | CORS allowed origin |
| `FRONTEND_ORIGINS` | ⬜ | `https://opto-profit.vercel.app` | Additional CORS origins |
| `PORT` | Auto | (injected by Render) | Uvicorn bind port |

### Frontend (Set on Vercel Dashboard)

| Variable | Required | Value | Purpose |
| :--- | :---: | :--- | :--- |
| `VITE_API_BASE_URL` | ✅ | `https://opto-profit-backend.onrender.com` | API endpoint |

---

## Troubleshooting

| Problem | Likely Cause | Fix |
| :--- | :--- | :--- |
| Backend shows "Service Unavailable" | Render free tier sleeps after 15 min inactivity | Wait ~30 seconds for cold start, or upgrade to Starter plan |
| CORS error in browser | `FRONTEND_ORIGIN` mismatch | Ensure the Render env var exactly matches your Vercel URL (no trailing `/`) |
| Login fails / 500 error | `MONGODB_URI` incorrect | Copy the URI fresh from Atlas and paste it again on Render |
| Frontend shows blank page | Wrong Root Directory in Vercel | Ensure Root Directory is set to `frontend`, not the repo root |
| `VITE_API_BASE_URL` undefined | Env var not set before build | Add `VITE_API_BASE_URL` to Vercel environment variables and redeploy |
| API docs inaccessible | FastAPI docs disabled in prod | Visit `/docs` — FastAPI shows docs by default on all environments |

---

## CI/CD: Automatic Redeploys (Already Configured)

Every time you run `git push origin master`:

1. **GitHub Actions CI** runs your test suite (`.github/workflows/ci.yml`)
2. On success, **GitHub Actions CD** builds and pushes Docker images to GHCR
3. **Render** automatically detects the new push to `master` and redeploys the backend
4. **Vercel** automatically detects the new push and rebuilds + redeploys the frontend

Zero manual steps needed after the initial setup.
