# GitHub Actions CI/CD Setup Guide

Complete guide to setting up automated deployment pipelines for the AI Interview Backend.

---

## Overview

This repository includes 3 GitHub Actions workflows:

1. **PR Checks** (`.github/workflows/pr-checks.yml`) - Runs on every PR to main/staging
2. **Staging Deployment** (`.github/workflows/deploy-staging.yml`) - Deploys to staging on push to `staging` branch
3. **Production Deployment** (`.github/workflows/deploy-production.yml`) - Deploys to production on push to `main` branch

---

## Prerequisites

Before setting up CI/CD, ensure you have:

- [x] GCP project created (Project ID: `rehears3`)
- [x] Cloud Run enabled
- [x] Artifact Registry enabled
- [x] Secret Manager enabled
- [x] All secrets created in GCP Secret Manager
- [x] Docker images can be built locally
- [x] Health check endpoints implemented

---

## Part 1: GCP Infrastructure Setup

### 1.1 Enable Required APIs

```bash
# Set your project ID
export PROJECT_ID=rehears3
export REGION=us-central1

# Enable APIs
gcloud services enable run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  iamcredentials.googleapis.com \
  cloudresourcemanager.googleapis.com
```

### 1.2 Create Artifact Registry Repository

```bash
# Create Docker repository
gcloud artifacts repositories create ai-interview-backend \
  --repository-format=docker \
  --location=$REGION \
  --description="AI Interview Backend Docker images"

# Verify creation
gcloud artifacts repositories list --location=$REGION
```

### 1.3 Create Service Accounts for Cloud Run

```bash
# Staging service account
gcloud iam service-accounts create ai-interview-backend-staging \
  --display-name="AI Interview Backend - Staging" \
  --description="Service account for Cloud Run staging environment"

# Production service account
gcloud iam service-accounts create ai-interview-backend-production \
  --display-name="AI Interview Backend - Production" \
  --description="Service account for Cloud Run production environment"
```

### 1.4 Grant Service Accounts Access to Secrets

```bash
# List of all secrets
SECRETS=(
  "mongodb-uri"
  "redis-url"
  "jwt-access-secret"
  "jwt-refresh-secret"
  "openai-api-key"
  "livekit-url"
  "livekit-api-key"
  "livekit-api-secret"
  "transcription-service-url"
  "transcription-service-api-key"
  "transcription-jwt-secret"
)

# Grant staging service account access
for secret in "${SECRETS[@]}"; do
  gcloud secrets add-iam-policy-binding "ai-interview-${secret}-staging" \
    --member="serviceAccount:ai-interview-backend-staging@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
done

# Grant production service account access
for secret in "${SECRETS[@]}"; do
  gcloud secrets add-iam-policy-binding "ai-interview-${secret}-production" \
    --member="serviceAccount:ai-interview-backend-production@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
done
```

---

## Part 2: GitHub Actions Authentication (Workload Identity Federation)

**Recommended approach**: Use Workload Identity Federation instead of service account keys for security.

### 2.1 Create Workload Identity Pool

```bash
# Create workload identity pool
gcloud iam workload-identity-pools create "github-actions-pool" \
  --location="global" \
  --display-name="GitHub Actions Pool"

# Get the pool ID
gcloud iam workload-identity-pools describe "github-actions-pool" \
  --location="global" \
  --format="value(name)"

# Output will be: projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions-pool
```

### 2.2 Create Workload Identity Provider

```bash
# Replace with your GitHub org/username and repository
export GITHUB_REPO="YOUR_GITHUB_USERNAME/ai-interview-backend"

# Create provider
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --location="global" \
  --workload-identity-pool="github-actions-pool" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"
```

### 2.3 Create Service Account for GitHub Actions

```bash
# Create service account
gcloud iam service-accounts create github-actions-deployer \
  --display-name="GitHub Actions Deployer"

# Grant permissions to push to Artifact Registry
gcloud artifacts repositories add-iam-policy-binding ai-interview-backend \
  --location=$REGION \
  --member="serviceAccount:github-actions-deployer@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# Grant permissions to deploy to Cloud Run
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions-deployer@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin"

# Grant service account user role (to deploy as service account)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions-deployer@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Grant access to act as staging service account
gcloud iam service-accounts add-iam-policy-binding \
  ai-interview-backend-staging@${PROJECT_ID}.iam.gserviceaccount.com \
  --member="serviceAccount:github-actions-deployer@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Grant access to act as production service account
gcloud iam service-accounts add-iam-policy-binding \
  ai-interview-backend-production@${PROJECT_ID}.iam.gserviceaccount.com \
  --member="serviceAccount:github-actions-deployer@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

### 2.4 Allow GitHub to Impersonate Service Account

```bash
# Get your project number
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

# Allow GitHub Actions to impersonate the service account
gcloud iam service-accounts add-iam-policy-binding \
  github-actions-deployer@${PROJECT_ID}.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-actions-pool/attribute.repository/${GITHUB_REPO}"
```

### 2.5 Get Workload Identity Provider Resource Name

```bash
# Get the full resource name (you'll need this for GitHub secrets)
gcloud iam workload-identity-pools providers describe "github-provider" \
  --location="global" \
  --workload-identity-pool="github-actions-pool" \
  --format="value(name)"

# Output example:
# projects/123456789/locations/global/workloadIdentityPools/github-actions-pool/providers/github-provider
```

---

## Part 3: Configure GitHub Repository Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add the following secrets:

### Required Secrets

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions-pool/providers/github-provider` | Workload Identity Provider resource name |
| `GCP_SERVICE_ACCOUNT` | `github-actions-deployer@rehears3.iam.gserviceaccount.com` | Service account email for GitHub Actions |

### Optional Secrets

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `CODECOV_TOKEN` | Your Codecov token | For test coverage reporting (optional) |

---

## Part 4: Create Initial Cloud Run Services

Before the first deployment, create the Cloud Run services manually:

### 4.1 Deploy Staging Service

```bash
gcloud run services replace cloud-run-staging.yaml --region=$REGION
```

If you prefer to deploy directly:

```bash
# Build and push initial image
docker build -t $REGION-docker.pkg.dev/$PROJECT_ID/ai-interview-backend/backend:staging-v1 .
docker push $REGION-docker.pkg.dev/$PROJECT_ID/ai-interview-backend/backend:staging-v1

# Deploy to Cloud Run
gcloud run deploy ai-interview-backend-staging \
  --image=$REGION-docker.pkg.dev/$PROJECT_ID/ai-interview-backend/backend:staging-v1 \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --service-account=ai-interview-backend-staging@${PROJECT_ID}.iam.gserviceaccount.com \
  --cpu=1 \
  --memory=1Gi \
  --timeout=300 \
  --concurrency=80 \
  --min-instances=0 \
  --max-instances=10
```

### 4.2 Deploy Production Service

```bash
gcloud run services replace cloud-run-production.yaml --region=$REGION
```

Or manually:

```bash
# Build and push initial image
docker build -t $REGION-docker.pkg.dev/$PROJECT_ID/ai-interview-backend/backend:production-v1 .
docker push $REGION-docker.pkg.dev/$PROJECT_ID/ai-interview-backend/backend:production-v1

# Deploy to Cloud Run
gcloud run deploy ai-interview-backend-production \
  --image=$REGION-docker.pkg.dev/$PROJECT_ID/ai-interview-backend/backend:production-v1 \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --service-account=ai-interview-backend-production@${PROJECT_ID}.iam.gserviceaccount.com \
  --cpu=2 \
  --memory=2Gi \
  --timeout=300 \
  --concurrency=80 \
  --min-instances=1 \
  --max-instances=100 \
  --no-cpu-throttling
```

---

## Part 5: Branch Strategy & Workflow

### Recommended Git Workflow

```
main (production)
  └── staging
       └── feature/your-feature
```

### Deployment Flow

1. **Feature Development**:
   ```bash
   git checkout -b feature/new-feature staging
   # Make changes
   git commit -m "Add new feature"
   git push origin feature/new-feature
   # Create PR to staging branch
   ```

2. **PR to Staging**:
   - Create PR: `feature/new-feature` → `staging`
   - PR checks run automatically (lint, test, build, Docker)
   - Merge after approval

3. **Auto-Deploy to Staging**:
   - Push to `staging` branch triggers automatic deployment
   - Workflow: lint → test → security audit → build → deploy → health checks

4. **Promote to Production**:
   ```bash
   git checkout main
   git merge staging
   git push origin main
   ```
   - Push to `main` triggers production deployment
   - Workflow: lint → test → security → build → deploy (no traffic) → health checks → route traffic → verify

---

## Part 6: Workflow Triggers & Usage

### PR Checks Workflow

**Triggers**:
- Pull requests to `main` or `staging` branches

**What it does**:
- ✅ Runs linter
- ✅ Runs unit tests with coverage
- ✅ Security audit (npm audit)
- ✅ TypeScript type checking
- ✅ Build verification
- ✅ Docker build test
- ✅ Generates coverage summary

**Status**: Must pass before merging

---

### Staging Deployment Workflow

**Triggers**:
- Push to `staging` branch
- Manual trigger via GitHub UI

**What it does**:
1. **Quality checks**: Lint, test, security audit
2. **Build**: Create Docker image tagged with commit SHA
3. **Security scan**: Trivy vulnerability scan
4. **Push**: Upload image to Artifact Registry
5. **Deploy**: Deploy to Cloud Run staging
6. **Verify**: Health checks (liveness, readiness, API docs)
7. **Notify**: Deployment status

**Environment**: `staging`

**Service URL**: Auto-generated Cloud Run URL (e.g., `https://ai-interview-backend-staging-abc123.a.run.app`)

---

### Production Deployment Workflow

**Triggers**:
- Push to `main` branch
- Manual trigger via GitHub UI (with optional skip tests flag for emergencies)

**What it does**:
1. **Quality checks**: Lint, test (with coverage threshold), security audit (fails on high/critical)
2. **Build**: Create Docker image tagged with `production-{commit-sha}`
3. **Security scan**: Trivy scan (fails on critical vulnerabilities)
4. **Push**: Upload to Artifact Registry with both SHA and `production-latest` tags
5. **Blue-Green Deploy**:
   - Deploy new revision with **0% traffic** (candidate)
   - Health check candidate revision
   - If healthy: Route 100% traffic to new revision
   - If unhealthy: **Automatic rollback** to previous revision
6. **Verify**: Final health check on live production
7. **Notify**: Deployment status

**Safety Features**:
- Deploys with no traffic initially
- Extensive health checks before routing traffic
- Automatic rollback on failure
- Manual rollback capability
- Environment protection (requires manual approval in GitHub settings)

---

## Part 7: Monitoring & Troubleshooting

### View Deployment Logs

**In GitHub**:
- Go to Actions tab
- Click on the workflow run
- View logs for each step

**In GCP**:
```bash
# View Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=ai-interview-backend-staging" \
  --limit=50 \
  --format=json

# Follow logs in real-time
gcloud run services logs tail ai-interview-backend-staging --region=$REGION
```

### Manual Rollback

If you need to manually rollback a deployment:

```bash
# List recent revisions
gcloud run revisions list \
  --service=ai-interview-backend-production \
  --region=$REGION

# Rollback to specific revision
gcloud run services update-traffic ai-interview-backend-production \
  --region=$REGION \
  --to-revisions=REVISION_NAME=100
```

### Common Issues

#### 1. Workflow fails on "Authenticate to Google Cloud"

**Problem**: Workload Identity Federation not configured correctly

**Solution**:
- Verify `GCP_WORKLOAD_IDENTITY_PROVIDER` secret matches the provider resource name
- Ensure GitHub repository name in IAM binding matches your repo exactly
- Check service account has `roles/iam.workloadIdentityUser` for the correct principal

#### 2. Health checks fail after deployment

**Problem**: Service not responding to health endpoints

**Solution**:
```bash
# Check Cloud Run logs
gcloud run services logs read ai-interview-backend-staging --region=$REGION --limit=100

# Common issues:
# - Secret Manager secrets not accessible (check service account permissions)
# - MongoDB/Redis connection timeout (check connection strings)
# - Port mismatch (ensure app listens on $PORT)
```

#### 3. Docker build fails in workflow

**Problem**: Missing build context or dependencies

**Solution**:
- Ensure `.dockerignore` doesn't exclude required files (tsconfig.json, nest-cli.json)
- Check Dockerfile stages are correct
- Test build locally: `docker build -t test .`

#### 4. npm audit fails with vulnerabilities

**Problem**: Dependencies have security issues

**Solution**:
```bash
# Check vulnerabilities locally
npm audit

# Auto-fix where possible
npm audit fix

# For breaking changes
npm audit fix --force

# Update specific package
npm update <package-name>
```

---

## Part 8: Cost Optimization

### Estimated GitHub Actions Costs

- **Free tier**: 2,000 minutes/month for private repos
- **Typical usage**:
  - PR checks: ~5 minutes per PR
  - Staging deployment: ~8 minutes
  - Production deployment: ~10 minutes

**Monthly estimate** (assuming 20 deployments):
- 20 PRs × 5 min = 100 min
- 10 staging deploys × 8 min = 80 min
- 10 production deploys × 10 min = 100 min
- **Total**: ~280 minutes (~14% of free tier)

### Artifact Registry Costs

- **Storage**: $0.10 per GB/month
- **Network egress**: $0.12 per GB (after 1GB free)

**Optimization**:
```bash
# Delete old images (keep last 10 per environment)
gcloud artifacts docker images list $REGION-docker.pkg.dev/$PROJECT_ID/ai-interview-backend/backend \
  --sort-by=~CREATE_TIME \
  --limit=999999 \
  --format="get(version)" | tail -n +11 | xargs -I {} \
  gcloud artifacts docker images delete $REGION-docker.pkg.dev/$PROJECT_ID/ai-interview-backend/backend:{} --quiet
```

---

## Part 9: Security Best Practices

### ✅ Implemented

- [x] Workload Identity Federation (no service account keys)
- [x] Trivy container scanning in CI/CD
- [x] npm audit in workflows
- [x] Secrets stored in GCP Secret Manager
- [x] Non-root user in Docker container
- [x] Blue-green deployments with health checks
- [x] Automatic rollback on failure

### 🔒 Recommended Additions

1. **Branch Protection Rules**:
   - Go to Settings → Branches → Add rule
   - Require PR reviews before merging to `main`
   - Require status checks to pass (PR checks workflow)
   - Require branches to be up to date

2. **Environment Protection**:
   - Go to Settings → Environments → production
   - Add required reviewers (manual approval before production deploy)
   - Add deployment branch rule (only `main` can deploy)

3. **Secret Rotation**:
   ```bash
   # Rotate JWT secrets quarterly
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))" | \
     gcloud secrets versions add ai-interview-jwt-access-secret-production --data-file=-
   ```

4. **Audit Logging**:
   - Enable Cloud Audit Logs for Cloud Run and Secret Manager
   - Set up alerts for unauthorized access attempts

---

## Part 10: Quick Reference

### Deploy Manually (Emergency)

```bash
# Build and deploy staging
docker build -t $REGION-docker.pkg.dev/$PROJECT_ID/ai-interview-backend/backend:manual-$(date +%s) .
docker push $REGION-docker.pkg.dev/$PROJECT_ID/ai-interview-backend/backend:manual-$(date +%s)
gcloud run deploy ai-interview-backend-staging \
  --image=$REGION-docker.pkg.dev/$PROJECT_ID/ai-interview-backend/backend:manual-$(date +%s) \
  --region=$REGION
```

### Test Workflows Locally

Use [act](https://github.com/nektos/act) to test GitHub Actions locally:

```bash
# Install act
brew install act

# Test PR checks
act pull_request -W .github/workflows/pr-checks.yml

# Test staging deployment (requires GCP credentials)
act push -W .github/workflows/deploy-staging.yml
```

### Health Check Endpoints

```bash
# Test staging
export STAGING_URL=$(gcloud run services describe ai-interview-backend-staging --region=$REGION --format='value(status.url)')

curl $STAGING_URL/health/liveness
curl $STAGING_URL/health/readiness
curl $STAGING_URL/health

# Test production
export PROD_URL=$(gcloud run services describe ai-interview-backend-production --region=$REGION --format='value(status.url)')

curl $PROD_URL/health/liveness
curl $PROD_URL/health/readiness
```

---

## Checklist: Pre-Deployment

- [ ] GCP APIs enabled (Cloud Run, Artifact Registry, Secret Manager)
- [ ] Artifact Registry repository created
- [ ] Service accounts created (staging, production, GitHub Actions)
- [ ] All secrets created in GCP Secret Manager
- [ ] Service accounts have access to secrets
- [ ] Workload Identity Pool and Provider created
- [ ] GitHub Actions service account has correct IAM roles
- [ ] GitHub repository secrets configured
- [ ] Initial Cloud Run services deployed
- [ ] Health check endpoints tested locally
- [ ] Docker build tested locally
- [ ] `.env.staging` and `.env.production` configured
- [ ] CORS `ALLOWED_ORIGINS` set correctly in Cloud Run YAML files

---

## Next Steps

1. **Complete GCP setup** using commands in Parts 1-2
2. **Configure GitHub secrets** (Part 3)
3. **Deploy initial services** (Part 4)
4. **Set up branch protection** (Part 9)
5. **Create staging branch**: `git checkout -b staging`
6. **Test deployment**: Push to staging branch and watch workflow run
7. **Monitor first deployment** in GitHub Actions and GCP Console

---

## Support & Resources

- **GitHub Actions Docs**: https://docs.github.com/en/actions
- **Cloud Run Docs**: https://cloud.google.com/run/docs
- **Workload Identity Federation**: https://cloud.google.com/iam/docs/workload-identity-federation
- **Artifact Registry**: https://cloud.google.com/artifact-registry/docs

---

**Last Updated**: December 29, 2025
**Status**: ✅ Ready for deployment
**Contact**: Check repository issues for questions
