# Task 6 — Infrastructure

## Incident 1 — the invisible deploy

1. I would first confirm the deployed revision, image digest, build artefact version, or commit SHA against the commit containing the fix. A green deployment only proves that something was deployed; it does not prove that the intended commit or artefact was deployed.

2. I would confirm the browser is reaching the expected environment and deployment URL, including hostname, branch/preview environment, and any redirect. This rules out checking a stale preview URL, a different environment, or a cached DNS/CDN route.

3. I would inspect the browser Network panel and response headers, then test with a hard refresh or a private window. I would check for browser cache, service-worker cache, CDN cache, and cache-control headers. The fact that it works for one colleague makes a client-specific or cache-specific cause likely.

4. I would request the affected asset or API response directly with cache-busting or from another network location. If the direct response contains the new code/data while the browser does not, the problem is caching rather than deployment.

5. If the deployed artefact is correct but the behaviour remains absent, I would check configuration and feature-flag values in the deployed environment. This rules out a feature being built correctly but disabled or configured differently in production.

I would document the deployed revision and the actual response version before invalidating a cache or redeploying, so the incident has a clear cause rather than an unverified workaround.

## Incident 2 — 502 after deploy

1. I would check the gateway/load-balancer error details, deployment events, and application container logs first. A 502 means the gateway could not obtain a valid response from its upstream; it does not necessarily mean the container process is healthy.

2. I would confirm the application is listening on the expected port and interface, and that the health endpoint responds from inside the container. A container can show as running while the application process has crashed, is listening on the wrong port, or is only bound to localhost.

3. Because the only change reads configuration, I would check that the required configuration variable exists in the deployed environment, has the expected name and format, and is available to the running process. A missing, invalid, or incorrectly typed configuration value can make the application fail during startup or on the first API request.

4. I would compare the running deployment’s configuration names and image revision with the last known working deployment, without exposing secret values in logs or tickets. This isolates the new feature/configuration change from unrelated infrastructure causes.

5. I would check application startup logs for configuration-validation errors, DNS failures, authentication errors, or upstream connection failures introduced by the new feature. If the app starts but the feature calls another service, I would test that service’s host, credentials, and network access from the container.

6. If necessary, I would roll back to the known-good image to restore service while continuing diagnosis. I would then add explicit startup-time validation and a useful health/readiness failure message for required configuration, so a future bad configuration does not present only as a generic 502.

## Incident 3 — the vanishing change

A running container is disposable. The tool was installed into that specific container’s writable filesystem, not into the image definition or deployment configuration. The next deployment created a new container from the original image, so the manual installation disappeared.

The correct fix depends on what the tool or change was for. A required runtime dependency should be added to the Dockerfile or build definition, pinned as appropriate, rebuilt into a new image, tested, and deployed through the normal pipeline. A configuration change should be placed in managed environment configuration or infrastructure-as-code. A one-time data/schema change should be a versioned migration.

For temporary debugging, I would use an approved ephemeral debug container or a documented runbook rather than modifying the application container. Any real fix should be committed, reviewed, reproducible from a clean environment, and verified after redeployment.