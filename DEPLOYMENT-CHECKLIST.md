# Deployment Checklist - Quick Reference

Use this checklist to track your deployment progress. Check off items as you complete them.

**Start Time**: _________________

---

## ✅ Pre-Deployment (5 min)

- [ ] GCP account with billing enabled
- [ ] GitHub access to repository
- [ ] Local development environment tested
- [ ] MongoDB Atlas clusters ready (staging + production)
- [ ] Upstash Redis databases created (staging + production)
- [ ] OpenAI API key obtained
- [ ] LiveKit credentials ready
- [ ] gcloud CLI installed and authenticated (`gcloud auth login`)

---

## 🔧 Step 1: GCP Project Setup (5 min)

- [ ] Set project ID: `gcloud config set project rehears3`
- [ ] Enable required APIs (run.googleapis.com, artifactregistry.googleapis.com, etc.)
- [ ] Create Artifact Registry repository: `ai-interview-backend`
- [ ] Configure Docker: `gcloud auth configure-docker us-central1-docker.pkg.dev`

**Verify**: Run `gcloud artifacts repositories list --location=us-central1`

---

## 👤 Step 2: Service Accounts (5 min)

- [ ] Create `ai-interview-backend-staging` service account
- [ ] Create `ai-interview-backend-production` service account
- [ ] Create `github-actions-deployer` service account
- [ ] Grant Artifact Registry writer role to github-actions-deployer
- [ ] Grant Cloud Run admin role to github-actions-deployer
- [ ] Grant serviceAccountUser role to github-actions-deployer
- [ ] Allow github-actions-deployer to impersonate staging SA
- [ ] Allow github-actions-deployer to impersonate production SA

**Verify**: Run `gcloud iam service-accounts list | grep ai-interview`

---

## 🔐 Step 3: Secrets Management (15 min)

### Generate New Secrets
- [ ] Generate JWT access secret (staging)
- [ ] Generate JWT refresh secret (staging)
- [ ] Generate JWT access secret (production)
- [ ] Generate JWT refresh secret (production)
- [ ] Generate transcription API key (staging)
- [ ] Generate transcription JWT secret (staging)
- [ ] Generate transcription API key (production)
- [ ] Generate transcription JWT secret (production)

**Command**: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### Staging Secrets
- [ ] Create `ai-interview-mongodb-uri-staging`
- [ ] Create `ai-interview-redis-url-staging`
- [ ] Create `ai-interview-jwt-access-secret-staging`
- [ ] Create `ai-interview-jwt-refresh-secret-staging`
- [ ] Create `ai-interview-openai-api-key-staging`
- [ ] Create `ai-interview-livekit-url-staging`
- [ ] Create `ai-interview-livekit-api-key-staging`
- [ ] Create `ai-interview-livekit-api-secret-staging`
- [ ] Create `ai-interview-transcription-service-url-staging`
- [ ] Create `ai-interview-transcription-service-api-key-staging`
- [ ] Create `ai-interview-transcription-jwt-secret-staging`
- [ ] Grant staging service account access to all staging secrets

**Verify**: Run `gcloud secrets list | grep staging | wc -l` (should show 11)

### Production Secrets
- [ ] Create `ai-interview-mongodb-uri-production`
- [ ] Create `ai-interview-redis-url-production`
- [ ] Create `ai-interview-jwt-access-secret-production`
- [ ] Create `ai-interview-jwt-refresh-secret-production`
- [ ] Create `ai-interview-openai-api-key-production`
- [ ] Create `ai-interview-livekit-url-production`
- [ ] Create `ai-interview-livekit-api-key-production`
- [ ] Create `ai-interview-livekit-api-secret-production`
- [ ] Create `ai-interview-transcription-service-url-production`
- [ ] Create `ai-interview-transcription-service-api-key-production`
- [ ] Create `ai-interview-transcription-jwt-secret-production`
- [ ] Grant production service account access to all production secrets

**Verify**: Run `gcloud secrets list | grep production | wc -l` (should show 11)

---

## 🔑 Step 4: Workload Identity Federation (5 min)

- [ ] Create workload identity pool: `github-actions-pool`
- [ ] Create OIDC provider: `github-provider`
- [ ] Allow GitHub repo to impersonate github-actions-deployer
- [ ] Get Workload Identity Provider resource name and save it

**Save this value**: `projects/[NUMBER]/locations/global/workloadIdentityPools/github-actions-pool/providers/github-provider`

**Verify**: Run `gcloud iam workload-identity-pools describe github-actions-pool --location=global`

---

## 🐙 Step 5: GitHub Configuration (3 min)

- [ ] Add `GCP_WORKLOAD_IDENTITY_PROVIDER` secret to GitHub
- [ ] Add `GCP_SERVICE_ACCOUNT` secret to GitHub (value: `github-actions-deployer@rehears3.iam.gserviceaccount.com`)
- [ ] (Optional) Add `CODECOV_TOKEN` for coverage reporting
- [ ] Set up branch protection on `main` branch
- [ ] Set up branch protection on `staging` branch

**Verify**: Go to Settings → Secrets and variables → Actions (should see 2 secrets)

---

## 📝 Step 6: Update Configuration (5 min)

- [ ] Update CORS origins in `cloud-run-staging.yaml` (ALLOWED_ORIGINS)
- [ ] Update CORS origins in `cloud-run-production.yaml` (ALLOWED_ORIGINS)
- [ ] Verify service account emails in `cloud-run-staging.yaml`
- [ ] Verify service account emails in `cloud-run-production.yaml`
- [ ] Commit changes: `git add . && git commit -m "Update Cloud Run configuration"`

---

## 🚀 Step 7: First Manual Deployment (10 min)

- [ ] Build Docker image: `docker build -t us-central1-docker.pkg.dev/rehears3/ai-interview-backend/backend:staging-v1 .`
- [ ] Push to Artifact Registry: `docker push ...`
- [ ] Update image reference in `cloud-run-staging.yaml`
- [ ] Deploy to Cloud Run: `gcloud run services replace cloud-run-staging.yaml --region=us-central1`
- [ ] Get service URL and save it

**Staging URL**: _________________________________________________

**Verify**:
- [ ] Test `/health/liveness` - should return 200 OK
- [ ] Test `/health/readiness` - should return 200 OK with MongoDB + Redis status
- [ ] Test `/health` - should show detailed health info
- [ ] Test `/api/docs` - should show Swagger UI

---

## 🌿 Step 8: Git Branches (2 min)

- [ ] Create staging branch: `git checkout -b staging`
- [ ] Push staging branch: `git push -u origin staging`
- [ ] Return to main: `git checkout main`

**Verify**: Run `git branch -a` (should see main, staging, and remotes)

---

## 🤖 Step 9: Test Automated Deployment (10 min)

### Test Staging Deployment
- [ ] Checkout staging: `git checkout staging`
- [ ] Make a test change: `echo "// Test" >> src/main.ts`
- [ ] Commit: `git commit -am "Test staging deployment"`
- [ ] Push: `git push origin staging`
- [ ] Go to GitHub Actions and monitor workflow
- [ ] Wait for green checkmark (6-8 minutes)
- [ ] Verify staging URL still works

### Test Production Deployment
- [ ] Checkout main: `git checkout main`
- [ ] Merge staging: `git merge staging`
- [ ] Push: `git push origin main`
- [ ] Go to GitHub Actions and monitor workflow
- [ ] Wait for green checkmark (8-12 minutes)
- [ ] Get production URL

**Production URL**: _________________________________________________

**Verify**:
- [ ] Test production `/health/liveness`
- [ ] Test production `/health/readiness`
- [ ] Test production `/health`
- [ ] Test production `/api/docs`

---

## ✅ Step 10: Final Verification (5 min)

- [ ] Both staging and production are accessible
- [ ] Health endpoints return 200 OK
- [ ] API documentation is visible
- [ ] GitHub Actions show all green checkmarks
- [ ] No errors in Cloud Run logs
- [ ] MongoDB connections working
- [ ] Redis connections working

---

## 🎉 Post-Deployment Tasks

- [ ] Update frontend environment variables with API URLs
- [ ] Deploy frontend with new backend URLs
- [ ] Test end-to-end flow (signup, login, create interview)
- [ ] Set up Cloud Monitoring alerts
- [ ] Document production URLs

---

## 📊 Important URLs

| Environment | URL |
|-------------|-----|
| **Staging API** | _________________________________ |
| **Production API** | _________________________________ |
| **GitHub Actions** | https://github.com/devBamidele/ai-interview-backend/actions |
| **Cloud Run Console** | https://console.cloud.google.com/run?project=rehears3 |

---

**Completion Time**: _________________
**Total Duration**: _________________