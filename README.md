# AERGO LLC — Corporate Landing Page

Single-page corporate site for **AERGO LLC**, a B2B software development and technology consulting company registered in Wyoming, USA.

- **Frontend:** pure HTML + Tailwind CSS (compiled to a static `styles.css`, no runtime framework)
- **Hosting:** AWS S3 (private, encrypted) behind CloudFront (HTTPS-only, strict security headers)
- **Infra as code:** AWS CDK (TypeScript) in [`infra/`](infra)
- **CI/CD:** GitHub Actions deploys on every push to `main` using keyless OIDC (no AWS keys stored in GitHub)

## Local development

```bash
npm ci
npm run dev        # rebuilds site/styles.css on change
npm run serve      # serves ./site on http://localhost:3000
```

## Deploy

Pushing to `main` triggers [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which builds the CSS and runs `cdk deploy AergoLandingSite`.

Manual deploy (requires AWS credentials for the target account):

```bash
npm ci && npm run build
cd infra && npm ci
npx cdk deploy --all --require-approval never
```

### One-time setup (per AWS account)

1. `npx cdk bootstrap` in the target account/region.
2. `npx cdk deploy AergoLandingGithubOidc` — creates the GitHub OIDC provider and the `aergo-landing-github-deploy` role.
3. Save the `DeployRoleArn` output as the `AWS_ROLE_ARN` repository variable in GitHub.

## Stacks

| Stack | Purpose |
| --- | --- |
| `AergoLandingSite` | S3 bucket, CloudFront distribution, security headers, asset deployment |
| `AergoLandingGithubOidc` | GitHub OIDC provider + scoped deploy role for CI |
