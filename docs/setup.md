# Tashgheel HRMS — Local Development Setup Guide

Welcome to the **Tashgheel HRMS** developer setup guide. This document contains all instructions necessary to run and develop the single-tenant Recruitment & Placement Management System locally.

---

## 1. System Requirements

Ensure the following tools are installed on your machine:
- **Node.js**: `v18.x` or higher (Recommended: `v20.x` LTS)
- **pnpm**: `v9.x` or higher (Package Manager)
- **Docker & Docker Compose**: For running local Postgres (with pgvector) and Redis
- **Postgres Client (Optional)**: e.g., TablePlus, DBeaver, or pgAdmin for database inspection

---

## 2. Monorepo Architecture

This project is organized as a Turborepo monorepo:
```
├── apps
│   ├── api          # NestJS Backend API
│   └── web          # Next.js 15 Frontend Web Application
├── packages
│   ├── database     # Shared Prisma schema, migrations, and seed scripts
│   ├── typescript-config # Shared TypeScript configuration files
│   ├── eslint-config # Shared ESLint rules
│   └── ui           # Shared design components
├── docker-compose.yml # Dev environment (Postgres + Redis)
├── docker-compose.prod.yml # Production environment validation
├── package.json     # Monorepo scripts
└── pnpm-workspace.yaml # Monorepo workspaces definition
```

---

## 3. Initial Setup Instructions

Follow these steps sequentially to set up the development environment:

### Step 1: Clone and Install Dependencies
Install all package dependencies from the root directory:
```bash
pnpm install
```

### Step 2: Spin Up Infrastructure Services (Docker)
Start the local PostgreSQL database (with `pgvector` enabled) and Redis cache:
```bash
docker compose up -d
```
This starts:
- **PostgreSQL** on port `5432` (credentials: `tashgheel_user` / `tashgheel_password`)
- **Redis** on port `6379` (no password)

Verify the services are running:
```bash
docker compose ps
```

### Step 3: Configure Environment Variables
Create a `.env` file in the **root** folder or configure individual environment files in `apps/api/.env` and `apps/web/.env.local`.

For **packages/database** (Prisma migration database url):
Create `packages/database/.env`:
```env
DATABASE_URL="postgresql://tashgheel_user:tashgheel_password@localhost:5432/tashgheel_db?schema=public"
```

For **apps/api** (NestJS):
Create `apps/api/.env`:
```env
PORT=4000
DATABASE_URL="postgresql://tashgheel_user:tashgheel_password@localhost:5432/tashgheel_db?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET="tashgheel-local-jwt-secret-key-12345!"
R2_ACCESS_KEY_ID="your_r2_access_key"
R2_SECRET_ACCESS_KEY="your_r2_secret_key"
R2_BUCKET_NAME="tashgheel-hrms-local"
R2_ENDPOINT="https://<account_id>.r2.cloudflarestorage.com"
GEMINI_API_KEY="your_google_gemini_api_key"
OPENAI_API_KEY="your_openai_api_key"
```

For **apps/web** (Next.js):
Create `apps/web/.env.local`:
```env
NEXT_PUBLIC_API_URL="http://localhost:4000/api"
```

### Step 4: Database Migrations and Seeding
Push the database schema structure to Postgres and run the seed script:
```bash
# Push schema to database
pnpm --filter @repo/database db:push

# Generate client
pnpm --filter @repo/database db:generate

# Seed initial seed data (Roles, Permissions, Admin account)
pnpm --filter @repo/database db:seed
```

Seeded credentials:
- **Admin Email:** `admin@tashgheel.com`
- **Admin Password:** `AdminTashgheel2026!`

---

## 4. Running the Application

You can develop both applications concurrently using Turborepo from the root folder:

### Dev Mode (Concurrent)
Start development servers for backend (port 4000) and frontend (port 3000):
```bash
pnpm run dev
```

### Build & Validate Production Bundle
Validate the monorepo compile-time type-safety and builds:
```bash
# Run linting across all packages
pnpm run lint

# Compile typescript types
pnpm run check-types

# Build production assets
pnpm run build
```
Once built, you can run the production build locally:
```bash
pnpm run start
```
This starts the applications in production mode.
