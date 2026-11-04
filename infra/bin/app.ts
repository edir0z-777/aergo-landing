#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { GithubOidcStack } from '../lib/github-oidc-stack';
import { LandingStack } from '../lib/landing-stack';

const app = new cdk.App();

const env: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? 'il-central-1',
};

const repository = app.node.tryGetContext('githubRepository') ?? 'edir0z-777/aergo-landing';

new GithubOidcStack(app, 'AergoLandingGithubOidc', {
  env,
  repository,
  description: 'GitHub Actions OIDC deploy role for the AERGO LLC landing page',
});

new LandingStack(app, 'AergoLandingSite', {
  env,
  description: 'AERGO LLC landing page: S3 + CloudFront static hosting',
});

cdk.Tags.of(app).add('Project', 'aergo-landing');
cdk.Tags.of(app).add('Owner', 'AERGO LLC');
