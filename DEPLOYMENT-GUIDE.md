# Complete Deployment Guide - Step by Step

This guide will walk you through deploying your AI Interview Backend to Google Cloud Run with full CI/CD automation.

**Current Status**: ✅ All 4 phases complete, ready for deployment!

---

## 📋 Pre-Deployment Checklist

Before starting, verify you have:
- [x] Phases 1-4 completed
- [ ] GCP account with billing enabled
- [ ] GitHub account with access to repository
- [ ] Local development environment working
- [ ] MongoDB Atlas cluster(s) set up
- [ ] Upstash Redis account for staging/production
- [ ] OpenAI API key
- [ ] LiveKit account (Cloud or self-hosted)

---

## 🎯 Deployment Overview

You'll complete these major steps:
1. **GCP Setup** - Configure cloud infrastructure
2. **Secrets Management** - Store all sensitive credentials
3. **GitHub Actions** - Set up CI/CD authentication
4. **Initial Deployment** - Deploy first version manually
5. **Automation** - Enable automated deployments
6. **Verification** - Test everything works

**Estimated Time**: 45-60 minutes

---

## Step 1: Set Up GCP Project

### 1.1 Set Your Project ID

```bash
# Set your GCP project (you mentioned it's "rehears3")
export PROJECT_ID=rehears3
export REGION=us-central1

# Configure gcloud CLI to use this project
gcloud config set project $PROJECT_ID

# Verify it's set correctly
gcloud config get-value project
```

**Expected Output**: `rehears3`

### 1.2 Enable Required APIs

```bash
# Enable all necessary GCP services
gcloud services enable run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  iamcredentials.googleapis.com \
  cloudresourcemanager.googleapis.com

# This will take 1-2 minutes
```

**Expected Output**: `Operation "operations/..." finished successfully.`

### 1.3 Create Artifact Registry Repository

```bash
# Create Docker repository for your images
gcloud artifacts repositories create ai-interview-backend \
  --repository-format=docker \
  --location=$REGION \
  --description="AI Interview Backend Docker images"

# Verify creation
gcloud artifacts repositories list --location=$REGION
```

**Expected Output**: You should see `ai-interview-backend` listed.

### 1.4 Configure Docker for Artifact Registry

```bash
# Configure Docker to authenticate with Artifact Registry
gcloud auth configure-docker ${REGION}-docker.pkg.dev

# Test authentication
docker info | grep Registry
```

✅ **Checkpoint**: You now have a GCP project ready for deployment.

---

## Step 2: Create Service Accounts

### 2.1 Create Cloud Run Service Accounts

```bash
# Staging service account (runs your staging app)
gcloud iam service-accounts create ai-interview-backend-staging \
  --display-name="AI Interview Backend - Staging" \
  --description="Service account for Cloud Run staging environment"

# Production service account (runs your production app)
gcloud iam service-accounts create ai-interview-backend-production \
  --display-name="AI Interview Backend - Production" \
  --description="Service account for Cloud Run production environment"

# Verify creation
gcloud iam service-accounts list | grep ai-interview
```

**Expected Output**: You should see both service accounts listed.

### 2.2 Create GitHub Actions Deployer Service Account

```bash
# This service account will be used by GitHub Actions to deploy
gcloud iam service-accounts create github-actions-deployer \
  --display-name="GitHub Actions Deployer" \
  --description="Service account for GitHub Actions CI/CD"

# Grant permissions to push to Artifact Registry
gcloud artifacts repositories add-iam-policy-binding ai-interview-backend \
  --location=$REGION \
  --member="serviceAccount:github-actions-deployer@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# Grant permissions to manage Cloud Run services
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions-deployer@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin"

# Grant service account user role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions-deployer@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Allow GitHub Actions to act as staging service account
gcloud iam service-accounts add-iam-policy-binding \
  ai-interview-backend-staging@${PROJECT_ID}.iam.gserviceaccount.com \
  --member="serviceAccount:github-actions-deployer@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Allow GitHub Actions to act as production service account
gcloud iam service-accounts add-iam-policy-binding \
  ai-interview-backend-production@${PROJECT_ID}.iam.gserviceaccount.com \
  --member="serviceAccount:github-actions-deployer@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

✅ **Checkpoint**: Three service accounts created with proper permissions.

---

## Step 3: Generate and Store Secrets

### 3.1 Generate New Production Secrets

**⚠️ SECURITY WARNING**: The secrets in your `.env.local` are exposed in your repo. Generate NEW secrets for staging and production!

```bash
# Generate new JWT secrets (64+ characters)
echo "JWT_ACCESS_SECRET (staging):"
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

echo -e "\nJWT_REFRESH_SECRET (staging):"
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

echo -e "\nJWT_ACCESS_SECRET (production):"
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

echo -e "\nJWT_REFRESH_SECRET (production):"
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate new API keys
echo -e "\nTRANSCRIPTION_SERVICE_API_KEY (staging):"
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

echo -e "\nTRANSCRIPTION_JWT_SECRET (staging):"
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

echo -e "\nTRANSCRIPTION_SERVICE_API_KEY (production):"
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

echo -e "\nTRANSCRIPTION_JWT_SECRET (production):"
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**📝 Action Required**: Copy these values somewhere safe (password manager). You'll need them in the next step.

### 3.2 Get Your External Service Credentials

You'll need:

1. **MongoDB Atlas Connection Strings**
   - Create separate clusters for staging and production (recommended)
   - Or use same cluster with different databases
   - Get connection strings from MongoDB Atlas dashboard

2. **Upstash Redis URLs**
   - Go to https://upstash.com
   - Create two databases: `ai-interview-staging` and `ai-interview-production`
   - Copy the `rediss://` connection strings

3. **OpenAI API Keys**
   - Use same key for both environments (or create separate keys)
   - Get from https://platform.openai.com/api-keys

4. **LiveKit Credentials**
   - Use same credentials for both (or create separate projects)
   - Get from https://cloud.livekit.io

5. **Transcription Service URL**
   - URL where your transcription service is deployed
   - If not deployed yet, use placeholder: `http://transcription-placeholder.example.com`

### 3.3 Create GCP Secrets (Staging)

```bash
# Set environment
export ENV=staging

# MongoDB URI - REPLACE WITH YOUR STAGING CONNECTION STRING
echo -n "mongodb+srv://user:pass@staging-cluster.mongodb.net/ai-interview?retryWrites=true&w=majority" | \
  gcloud secrets create ai-interview-mongodb-uri-${ENV} \
  --data-file=- \
  --replication-policy=automatic

# Redis URL - REPLACE WITH YOUR UPSTASH STAGING URL
echo -n "rediss://default:YOUR_PASSWORD@staging-endpoint.upstash.io:6379" | \
  gcloud secrets create ai-interview-redis-url-${ENV} \
  --data-file=-

# JWT Access Secret - USE GENERATED VALUE FROM STEP 3.1
echo -n "PASTE_YOUR_JWT_ACCESS_SECRET_HERE" | \
  gcloud secrets create ai-interview-jwt-access-secret-${ENV} \
  --data-file=-

# JWT Refresh Secret - USE GENERATED VALUE FROM STEP 3.1
echo -n "PASTE_YOUR_JWT_REFRESH_SECRET_HERE" | \
  gcloud secrets create ai-interview-jwt-refresh-secret-${ENV} \
  --data-file=-

# OpenAI API Key - USE YOUR OPENAI KEY
echo -n "sk-proj-YOUR_KEY_HERE" | \
  gcloud secrets create ai-interview-openai-api-key-${ENV} \
  --data-file=-

# LiveKit URL
echo -n "wss://your-project.livekit.cloud" | \
  gcloud secrets create ai-interview-livekit-url-${ENV} \
  --data-file=-

# LiveKit API Key
echo -n "YOUR_LIVEKIT_API_KEY" | \
  gcloud secrets create ai-interview-livekit-api-key-${ENV} \
  --data-file=-

# LiveKit API Secret
echo -n "YOUR_LIVEKIT_API_SECRET" | \
  gcloud secrets create ai-interview-livekit-api-secret-${ENV} \
  --data-file=-

# Transcription Service URL
echo -n "https://transcription-staging.yourdomain.com" | \
  gcloud secrets create ai-interview-transcription-service-url-${ENV} \
  --data-file=-

# Transcription Service API Key - USE GENERATED VALUE FROM STEP 3.1
echo -n "PASTE_YOUR_TRANSCRIPTION_API_KEY_HERE" | \
  gcloud secrets create ai-interview-transcription-service-api-key-${ENV} \
  --data-file=-

# Transcription JWT Secret - USE GENERATED VALUE FROM STEP 3.1
echo -n "PASTE_YOUR_TRANSCRIPTION_JWT_SECRET_HERE" | \
  gcloud secrets create ai-interview-transcription-jwt-secret-${ENV} \
  --data-file=-

# Verify all secrets were created
gcloud secrets list | grep ai-interview.*staging
```

**Expected Output**: You should see 11 secrets listed (all ending with `-staging`)

### 3.4 Grant Staging Service Account Access to Secrets

```bash
# Grant access to all staging secrets
for secret in mongodb-uri redis-url jwt-access-secret jwt-refresh-secret \
              openai-api-key livekit-url livekit-api-key livekit-api-secret \
              transcription-service-url transcription-service-api-key \
              transcription-jwt-secret; do
  gcloud secrets add-iam-policy-binding ai-interview-${secret}-staging \
    --member="serviceAccount:ai-interview-backend-staging@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
done
```

### 3.5 Create GCP Secrets (Production)

```bash
# Repeat for production environment
export ENV=production

# IMPORTANT: Use DIFFERENT values from staging!
# MongoDB - use production cluster
# Redis - use production Upstash database
# JWT secrets - use the production values generated in step 3.1
# All other credentials - use production versions

# Follow same pattern as staging (commands from 3.3)
# Then grant production service account access (commands from 3.4)
```

**📝 I recommend running the production setup commands one by one to avoid mistakes.**

✅ **Checkpoint**: All secrets stored securely in GCP Secret Manager.

---

## Step 4: Set Up Workload Identity Federation

This allows GitHub Actions to authenticate to GCP without storing service account keys (more secure!).

### 4.1 Create Workload Identity Pool

```bash
# Create workload identity pool
gcloud iam workload-identity-pools create "github-actions-pool" \
  --location="global" \
  --display-name="GitHub Actions Pool"

# Verify creation
gcloud iam workload-identity-pools describe "github-actions-pool" \
  --location="global"
```

### 4.2 Create Workload Identity Provider

```bash
# Your GitHub repository (from git remote output earlier)
export GITHUB_REPO="devBamidele/ai-interview-backend"

# Create OIDC provider for GitHub
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --location="global" \
  --workload-identity-pool="github-actions-pool" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"
```

### 4.3 Allow GitHub to Impersonate Service Account

```bash
# Get your project number
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

echo "Project Number: $PROJECT_NUMBER"

# Allow GitHub Actions from your repo to impersonate the deployer service account
gcloud iam service-accounts add-iam-policy-binding \
  github-actions-deployer@${PROJECT_ID}.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-actions-pool/attribute.repository/${GITHUB_REPO}"
```

### 4.4 Get Workload Identity Provider Resource Name

```bash
# Get the full resource name - YOU'LL NEED THIS FOR GITHUB!
gcloud iam workload-identity-pools providers describe "github-provider" \
  --location="global" \
  --workload-identity-pool="github-actions-pool" \
  --format="value(name)"
```

**📝 IMPORTANT**: Copy this output! It will look like:
```
projects/123456789/locations/global/workloadIdentityPools/github-actions-pool/providers/github-provider
```

You'll add this to GitHub secrets in Step 5.

✅ **Checkpoint**: GitHub Actions can now securely authenticate to GCP.

---

## Step 5: Configure GitHub Repository

### 5.1 Add Repository Secrets

1. Go to https://github.com/devBamidele/ai-interview-backend
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

Add these two secrets:

| Secret Name | Value |
|-------------|-------|
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | The output from step 4.4 (projects/123.../github-provider) |
| `GCP_SERVICE_ACCOUNT` | `github-actions-deployer@rehears3.iam.gserviceaccount.com` |

**Optional**: Add `CODECOV_TOKEN` if you want coverage reporting.

### 5.2 Set Up Branch Protection (Recommended)

1. Go to **Settings** → **Branches**
2. Click **Add rule**
3. Branch name pattern: `main`
4. Check:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
5. Click **Create**

Repeat for `staging` branch.

✅ **Checkpoint**: GitHub is configured and secure.

---

## Step 6: Update Configuration Files

### 6.1 Update CORS Origins

```bash
# Edit cloud-run-staging.yaml
# Find the ALLOWED_ORIGINS environment variable and update it
# Replace "https://staging.yourdomain.com" with your actual staging frontend URL

# Edit cloud-run-production.yaml
# Replace "https://app.yourdomain.com" with your actual production frontend URL
```

If you don't have frontend URLs yet, use placeholders for now:
- Staging: `https://staging-ai-interview.vercel.app`
- Production: `https://ai-interview.vercel.app`

### 6.2 Verify Service Account Emails

Open [cloud-run-staging.yaml](cloud-run-staging.yaml) and verify:
```yaml
serviceAccountName: ai-interview-backend-staging@rehears3.iam.gserviceaccount.com
```

Open [cloud-run-production.yaml](cloud-run-production.yaml) and verify:
```yaml
serviceAccountName: ai-interview-backend-production@rehears3.iam.gserviceaccount.com
```

✅ **Checkpoint**: Configuration files updated.

---

## Step 7: First Deployment (Manual)

Let's deploy staging manually first to verify everything works.

### 7.1 Build Docker Image

```bash
# Build the Docker image locally
docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/ai-interview-backend/backend:staging-v1 .

# This will take 2-5 minutes on first build
```

**Expected Output**: `Successfully built...` and `Successfully tagged...`

### 7.2 Push to Artifact Registry

```bash
# Push the image to GCP
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/ai-interview-backend/backend:staging-v1

# This will take 1-3 minutes depending on your upload speed
```

### 7.3 Deploy to Cloud Run (Staging)

```bash
# Update the image reference in cloud-run-staging.yaml first
# Replace the image line with your built image
sed -i.bak "s|image:.*|image: ${REGION}-docker.pkg.dev/${PROJECT_ID}/ai-interview-backend/backend:staging-v1|" cloud-run-staging.yaml

# Deploy using the YAML configuration
gcloud run services replace cloud-run-staging.yaml --region=$REGION

# Wait for deployment (1-2 minutes)
```

**Expected Output**: `Done. Service [ai-interview-backend-staging] revision [ai-interview-backend-staging-00001] has been deployed...`

### 7.4 Get Service URL

```bash
# Get the staging service URL
export STAGING_URL=$(gcloud run services describe ai-interview-backend-staging \
  --region=$REGION \
  --format='value(status.url)')

echo "Staging URL: $STAGING_URL"
```

### 7.5 Test Deployment

```bash
# Test health endpoints
echo "Testing liveness probe..."
curl -i $STAGING_URL/api/health/liveness

echo -e "\nTesting readiness probe..."
curl -i $STAGING_URL/api/health/readiness

echo -e "\nTesting full health check..."
curl $STAGING_URL/api/health | jq .

echo -e "\nTesting API docs..."
curl -i $STAGING_URL/api/docs
```

**Expected Output**:
- Liveness: `200 OK` with `{"status":"ok"}`
- Readiness: `200 OK` with MongoDB and Redis status
- Health: JSON with detailed health info
- API docs: `200 OK` with HTML

**⚠️ If health checks fail**: Check logs:
```bash
gcloud run services logs read ai-interview-backend-staging --region=$REGION --limit=50
```

Common issues:
- Secret Manager access denied → Check service account permissions (Step 3.4)
- MongoDB connection timeout → Verify MongoDB connection string and network access
- Redis connection failed → Verify Upstash Redis URL

✅ **Checkpoint**: Staging is deployed and healthy!

---

## Step 8: Create Git Branches

### 8.1 Create Staging Branch

```bash
# Create staging branch from main
git checkout -b staging

# Push to GitHub
git push -u origin staging
```

### 8.2 Update Workflow Branch References (If Needed)

Your workflows already reference the correct branches, but verify:
- [.github/workflows/deploy-staging.yml](.github/workflows/deploy-staging.yml) triggers on `staging` branch ✅
- [.github/workflows/deploy-production.yml](.github/workflows/deploy-production.yml) triggers on `main` branch ✅

---

## Step 9: Test Automated Deployment

### 9.1 Test Staging Deployment

```bash
# Make a small change (e.g., add a comment to main.ts)
echo "// Test deployment" >> src/main.ts

# Commit and push to staging
git add .
git commit -m "Test automated staging deployment"
git push origin staging
```

**What happens**:
1. GitHub Actions workflow starts automatically
2. Runs lint, tests, security audit
3. Builds Docker image
4. Pushes to Artifact Registry
5. Deploys to Cloud Run staging
6. Runs health checks

**Monitor**: Go to https://github.com/devBamidele/ai-interview-backend/actions

**Expected Result**: Green checkmark ✅ after ~6-8 minutes

### 9.2 Test Production Deployment (When Ready)

```bash
# After staging is verified, merge to main
git checkout main
git merge staging
git push origin main
```

**What happens**:
1. Same quality checks as staging
2. Stricter security audit (fails on high/critical vulnerabilities)
3. Builds Docker image with `production-*` tag
4. Deploys new revision with 0% traffic (blue-green)
5. Tests the new revision
6. Routes 100% traffic if healthy
7. Automatic rollback if unhealthy

**Monitor**: GitHub Actions tab

**Expected Result**: Green checkmark ✅ after ~8-12 minutes

✅ **Checkpoint**: CI/CD is fully automated!

---

## Step 10: Verify Production

### 10.1 Get Production URL

```bash
export PROD_URL=$(gcloud run services describe ai-interview-backend-production \
  --region=$REGION \
  --format='value(status.url)')

echo "Production URL: $PROD_URL"
```

### 10.2 Test Production Health

```bash
curl $PROD_URL/api/health/liveness
curl $PROD_URL/api/health/readiness
curl $PROD_URL/api/health | jq .
```

### 10.3 Test API Endpoints

```bash
# Get Swagger docs
curl $PROD_URL/api/docs

# Test signup (optional)
curl -X POST $PROD_URL/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "name": "Test User"
  }'
```

✅ **Checkpoint**: Production is live and working!

---

## 🎉 Deployment Complete!

Your AI Interview Backend is now fully deployed with:

- ✅ **Staging environment** - Auto-deploys on push to `staging` branch
- ✅ **Production environment** - Auto-deploys on push to `main` branch with blue-green deployment
- ✅ **CI/CD pipeline** - Automated testing, building, and deployment
- ✅ **Security** - Secrets in Secret Manager, Workload Identity Federation
- ✅ **Monitoring** - Health checks, Cloud Run metrics
- ✅ **Rollback capability** - Automatic on failure, manual option available

---

## 📊 Next Steps

### Update Your Frontend

Update your frontend environment variables:

**Staging**:
```env
VITE_API_URL=<STAGING_URL>
```

**Production**:
```env
VITE_API_URL=<PROD_URL>
```

### Monitor Your Application

**Cloud Run Console**:
- https://console.cloud.google.com/run?project=rehears3

**View Logs**:
```bash
# Staging logs
gcloud run services logs tail ai-interview-backend-staging --region=$REGION

# Production logs
gcloud run services logs tail ai-interview-backend-production --region=$REGION
```

**Metrics**:
- Request count, latency, error rate in Cloud Run console

### Set Up Alerts (Recommended)

1. Go to Cloud Console → Monitoring → Alerting
2. Create alert for:
   - Error rate > 5%
   - Response time > 2s
   - CPU utilization > 80%

---

## 🔧 Common Operations

### Manual Deployment (Emergency)

```bash
# Deploy to staging manually
gcloud run deploy ai-interview-backend-staging \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/ai-interview-backend/backend:staging-latest \
  --region=$REGION

# Deploy to production manually
gcloud run deploy ai-interview-backend-production \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/ai-interview-backend/backend:production-latest \
  --region=$REGION
```

### Rollback Production

```bash
# List revisions
gcloud run revisions list \
  --service=ai-interview-backend-production \
  --region=$REGION

# Rollback to previous revision
gcloud run services update-traffic ai-interview-backend-production \
  --region=$REGION \
  --to-revisions=<PREVIOUS_REVISION_NAME>=100
```

### Update Secrets

```bash
# Update a secret (creates new version)
echo -n "NEW_SECRET_VALUE" | \
  gcloud secrets versions add ai-interview-jwt-access-secret-production \
  --data-file=-

# Cloud Run will automatically pick up new version on next deployment
```

### Scale Production

```bash
# Increase max instances
gcloud run services update ai-interview-backend-production \
  --region=$REGION \
  --max-instances=200

# Increase resources
gcloud run services update ai-interview-backend-production \
  --region=$REGION \
  --cpu=4 \
  --memory=4Gi
```

---

## 🆘 Troubleshooting

### Deployment fails with "Permission denied"

**Fix**: Check service account permissions (Step 2.2)

### Health checks fail

**Fix**: Check logs for connection errors:
```bash
gcloud run services logs read ai-interview-backend-staging --region=$REGION --limit=100
```

### GitHub Actions fails at "Authenticate to Google Cloud"

**Fix**: Verify GitHub secrets are correct (Step 5.1)

### Container crashes immediately

**Fix**: Check environment variables in Cloud Run YAML files

---

## 📚 Resources

- **Your Services**:
  - Staging: Run `echo $STAGING_URL` to see URL
  - Production: Run `echo $PROD_URL` to see URL

- **GCP Console**:
  - [Cloud Run](https://console.cloud.google.com/run?project=rehears3)
  - [Artifact Registry](https://console.cloud.google.com/artifacts?project=rehears3)
  - [Secret Manager](https://console.cloud.google.com/security/secret-manager?project=rehears3)

- **GitHub**:
  - [Actions](https://github.com/devBamidele/ai-interview-backend/actions)
  - [Settings](https://github.com/devBamidele/ai-interview-backend/settings)

---

**Date Created**: December 29, 2025
**Status**: Ready to execute
**Estimated Time**: 45-60 minutes