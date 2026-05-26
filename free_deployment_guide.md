# OPTO-PROFIT: Complete Zero-Cost Production Deployment Blueprint

This manual provides a step-by-step technical blueprint to deploy the **OPTO-PROFIT full-stack application** to production **completely for free**, leveraging modern cloud platforms (Vercel, Render, and MongoDB Atlas) with automated CI/CD and secure SSL/TLS encryptions.

---

## 1. Global Deployment Architecture

```
                               ┌────────────────────────┐
                               │  Vercel (Free Tier)    │
                               │  Vite-React Frontend   │
                               └───────────┬────────────┘
                                           │
                                   HTTPS   │ API Requests
                                   (SSL)   ▼
┌──────────────────────┐  HTTPS  ┌────────────────────────┐
│  MongoDB Atlas       │◄────────┤  Render (Free Tier)    │
│  Free M0 Cluster     │  (TLS)  │  Docker FastAPI Server │
└──────────────────────┘         └────────────────────────┘
```

---

## 2. Step 1: Database Deployment (MongoDB Atlas — Free M0 Cluster)

MongoDB Atlas offers a fully managed sandbox database instance that is **100% free forever**, which is perfect for storing OPTO-PROFIT tasks, config variables, user sessions, and profiles.

1.  **Register Account**: Create a free account at [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas/register).
2.  **Create Cluster**: 
    *   Select the **M0 Free Shared Tier** (provides 512MB storage).
    *   Choose a region close to your user base (e.g., AWS `us-east-1` or `eu-central-1`).
    *   Set the provider to **AWS** or **GCP**.
3.  **Network Access (IP Whitelist)**:
    *   Under *Security > Network Access*, add `0.0.0.0/0` (Allow Access from Anywhere). This is necessary because free backend services like Render utilize dynamic outbound IP ranges.
4.  **Database Access (User Credentials)**:
    *   Create a database user (e.g., `opto_admin`) and generate a secure password.
5.  **Get Connection String**:
    *   Click *Connect > Drivers*, select *Python (version 3.11+)*, and copy the connection URI.
    *   *Connection Format*:
        ```
        mongodb+srv://opto_admin:<password>@cluster0.abcde.mongodb.net/optoprofit?retryWrites=true&w=majority
        ```

---

## 3. Step 2: Back-End Deployment (Render — Free Docker Web Service)

Render provides free hosting for containerized applications directly from a GitHub repository, building them automatically using the project's native `Dockerfile`.

1.  **Create Render Account**: Link your GitHub repository at [render.com](https://render.com).
2.  **Initialize Web Service**:
    *   Click **New + > Web Service**.
    *   Select your linked **OPTO-PROFIT** repository.
3.  **Configure Service Build Parameters**:
    *   **Name**: `opto-profit-backend`
    *   **Language**: `Docker`
    *   **Docker Command**: (Leave blank — it will use the `CMD` from your Dockerfile)
    *   **Instance Type**: `Free` (provides 512MB RAM, 0.1 CPU).
    *   **Root Directory**: `backend` (This is critical: tells Render to build from the `/backend` subdirectory containing your backend code and requirements).
4.  **Environment Variables**:
    *   Click **Advanced** and define the following variables:

| Variable Key | Suggested Production Value | Purpose |
| :--- | :--- | :--- |
| `MONGODB_URI` | `mongodb+srv://opto_admin:<password>@...` | MongoDB connection string |
| `SESSION_SECRET`| `[Generated-64-Character-Random-Hex]` | Secures cookie-based user authentication sessions |
| `ENV` | `production` | Enables production database schemas and suppresses debug traces |
| `PYTHON_VERSION`| `3.12.4` | Enforces python compiler execution matching the venv |

5.  **Build & Deploy**: Click **Create Web Service**. Render will parse `backend/Dockerfile`, pull the `python:3.12-slim` base, cache requirements, set up the non-root `appuser`, and deploy the server.
    *   *Resulting Endpoint*: `https://opto-profit-backend.onrender.com`

---

## 4. Step 3: Front-End Deployment (Vercel — Free SPA Hosting)

Vercel provides blazing-fast CDN hosting for React Single Page Applications (SPAs) with absolute zero cost and automated Git triggers.

### 4.1 SPA Routing Rule Configuration
To ensure React client-side routing works properly when users hit subpages directly (like `/planning` or `/layout`), we must configure a rewrite rule that redirects all directory requests back to the master `index.html` entrypoint.

Create a `vercel.json` file in the **frontend root directory** (`s:\OPTO-PROFIT\frontend\vercel.json`):

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 4.2 Deploying to Vercel
1.  **Register Account**: Connect your GitHub account at [vercel.com](https://vercel.com).
2.  **Import Project**: Click **Add New > Project**, select your **OPTO-PROFIT** repository.
3.  **Project Build Settings**:
    *   **Framework Preset**: `Vite` (automatically detected).
    *   **Root Directory**: Click *Edit* and select **`frontend`** (This tells Vercel to compile files in `/frontend`).
    *   **Build Command**: `npm run build`
    *   **Output Directory**: `dist`
4.  **Configure Environment Variables**:
    *   Under *Environment Variables*, add:
        *   `VITE_API_URL` = `https://opto-profit-backend.onrender.com` (Points to the active Render backend API endpoint).
5.  **Deploy**: Click **Deploy**. Vercel will run compilation scripts, bundle React assets, split vendor files, apply the routing rewrites, and host the app on a globally distributed Edge Network.
    *   *Resulting Endpoint*: `https://opto-profit.vercel.app`

---

## 5. Step 4: DNS, Custom Domains & SSL Setup

Vercel and Render handle SSL/TLS certificate issuing **automatically and for free** via Let's Encrypt.

1.  **Custom Domain Configuration**:
    *   If you own a custom domain (e.g. `optoprofit.com`), you can bind it to both platforms.
2.  **DNS Records Setup**:
    *   To point your frontend to Vercel:
        *   Add an **A Record** pointing `@` to Vercel's IP `76.76.21.21` in your registrar (e.g. GoDaddy, Namecheap, Cloudflare).
        *   Add a **CNAME Record** pointing `www` to `cname.vercel-dns.com`.
    *   To point a subdomain (like `api.optoprofit.com`) to the backend on Render:
        *   Add a **CNAME Record** pointing `api` to `opto-profit-backend.onrender.com`.
3.  **Automated SSL Certificates**:
    *   Once DNS propagates, Vercel and Render will auto-verify ownership, issue free Let's Encrypt certificates, configure active port redirection (HTTP to HTTPS), and enable HTTP/2 protocols automatically.
