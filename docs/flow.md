# System Flow

## Deploy flow
1. GitHub sends a push webhook to the API.
2. API validates signature, stores a Deploy record, enqueues a build job.
3. Worker pulls the job, clones the repo, builds in Docker.
4. Worker streams logs and uploads artifact to MinIO.
5. API updates Deploy status and writes Traefik config for preview URL.
6. Preview URL serves the artifact.

## Dashboard flow (v1)
1. /dashboard shows projects and recent deploys.
2. User selects a project to see deploy history and status.
3. User opens a deploy to see metadata and preview URL.

## Edge cases to handle
- Invalid webhook signature → reject with 401
- Build failure → Deploy status FAILED, capture error
- Artifact upload failure → Deploy status FAILED
- Traefik config write failure → Deploy status FAILED
- Empty state → show helpful message in dashboard
