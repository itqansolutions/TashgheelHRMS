# Tashgheel HRMS — Production Deployment Guide

Tashgheel HRMS is architected as a **Single-Tenant application**. Each client organization receives a separate database, independent API and Web servers, and isolated file storage. 

This guide describes how to deploy the system to **Railway Cloud** and configure **Cloudflare R2** for object storage.

---

## 1. Cloud Infrastructure Architecture

A production deployment consists of:
1. **Frontend App:** Next.js 15 (standalone node server) running on Railway.
2. **Backend API:** NestJS running on Railway.
3. **Database:** PostgreSQL instance with `pgvector` extension enabled on Railway.
4. **Cache & Queue:** Redis instance on Railway.
5. **Storage:** Cloudflare R2 Bucket for contracts, avatars, and candidate resumes.

---

## 2. Step-by-Step Railway Deployment

### Step 1: Set Up PostgreSQL with pgvector
1. Log into your Railway console and create a new project.
2. Click **+ Add Service** -> **Database** -> **PostgreSQL**.
3. Once created, go to the Postgres service **Variables** and verify connection strings.
4. **CRITICAL:** Connect to your production database using a client (e.g., TablePlus) and enable the vector extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
   *(This is required for candidate semantic matching to work).*

### Step 2: Set Up Redis
1. In your Railway project, click **+ Add Service** -> **Database** -> **Redis**.
2. Save the host and port credentials from the Redis dashboard.

### Step 3: Deploy NestJS API Service
1. Click **+ Add Service** -> **GitHub Repo** -> Choose `Tashgheel HRMS`.
2. In the service settings, rename the service to `api`.
3. Set the **Root Directory** settings to: `apps/api`.
4. Go to **Settings** -> **Build & Deploy** -> Verify that the builder automatically detects the `Dockerfile` in `apps/api/Dockerfile` (or set it manually).
5. Add the **Environment Variables** (see Section 4).

### Step 4: Deploy Next.js Web Service
1. Click **+ Add Service** -> **GitHub Repo** -> Choose `Tashgheel HRMS`.
2. Rename the service to `web`.
3. Set the **Root Directory** settings to: `apps/web`.
4. Go to **Settings** -> **Build & Deploy** -> Set the **Dockerfile** path to `apps/web/Dockerfile`.
5. Add the **Environment Variables** (see Section 4).

---

## 3. Storage Setup: Cloudflare R2

Since the system runs in ephemeral containers, all permanent file uploads must be stored on Cloudflare R2.

### Step 1: Create a Bucket
1. Log in to your Cloudflare Dashboard.
2. Go to **R2 Object Storage** -> **Create bucket**.
3. Name your bucket (e.g., `tashgheel-hrms-clientname`).

### Step 2: Generate R2 API Credentials
1. Under R2 settings, click **Manage R2 API Tokens**.
2. Click **Create API Token**.
3. Give it **Edit** permissions (Read/Write) for the bucket you created.
4. Note down:
   - **Access Key ID**
   - **Secret Access Key**
   - **Endpoint** (format: `https://<account_id>.r2.cloudflarestorage.com`)

---

## 4. Production Environment Variables Checklist

### Backend API Variables (`api` service on Railway)
Configure these variables in the **Variables** tab of the `api` service:

| Variable Name | Example Value | Description |
|---|---|---|
| `PORT` | `4000` | Port the NestJS API listens on |
| `NODE_ENV` | `production` | Enables production optimizations |
| `DATABASE_URL` | `postgresql://...` | Connection URL to your Railway Postgres |
| `REDIS_HOST` | `redis` | Internal hostname of Railway Redis service |
| `REDIS_PORT` | `6379` | Port of Redis service |
| `JWT_SECRET` | `super-secret-random-jwt-key` | Long random key for JWT generation |
| `R2_ACCESS_KEY_ID` | `ab12...` | Cloudflare R2 Access Key |
| `R2_SECRET_ACCESS_KEY` | `xy34...` | Cloudflare R2 Secret Key |
| `R2_BUCKET_NAME` | `tashgheel-hrms-client` | Cloudflare R2 Bucket Name |
| `R2_ENDPOINT` | `https://account.r2.cloudflarestorage.com` | R2 API Endpoint |
| `GEMINI_API_KEY` | `AIzaSy...` | Gemini key for AI resume parser |
| `OPENAI_API_KEY` | `sk-proj-...` | OpenAI key for generating embeddings |

### Frontend Web Variables (`web` service on Railway)
Configure these variables in the **Variables** tab of the `web` service:

| Variable Name | Example Value | Description |
|---|---|---|
| `PORT` | `3000` | Port NextJS runs on |
| `NODE_ENV` | `production` | Production mode |
| `NEXT_PUBLIC_API_URL` | `https://api.tashgheel-client.railway.app` | Public URL of your API service |

---

## 5. Running Database Migrations in Production

During deployment, Railway builds the app. To apply database migrations before running the NestJS API, you should add a pre-deploy or release script.
On Railway, you can achieve this by configuring a **Custom Deploy Command** in the `api` service settings or using a start script:

```bash
pnpm --filter @repo/database db:push && node apps/api/dist/main
```
This guarantees the database schema is updated and fully matches the codebase on every deployment before traffic starts.
