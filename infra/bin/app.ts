#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CertStack } from '../lib/cert-stack';
import { DnsStack } from '../lib/dns-stack';
import { GithubOidcStack } from '../lib/github-oidc-stack';
import { LandingStack } from '../lib/landing-stack';

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION ?? 'il-central-1';
const domainName = 'aergo.tech';

const repository = app.node.tryGetContext('githubRepository') ?? 'edir0z-777/aergo-landing';

new GithubOidcStack(app, 'AergoLandingGithubOidc', {
  env: { account, region },
  repository,
  description: 'GitHub Actions OIDC deploy role for the AERGO LLC landing page',
});

const dns = new DnsStack(app, 'AergoLandingDns', {
  env: { account, region },
  crossRegionReferences: true,
  zoneName: domainName,
  description: `Route 53 zone for ${domainName}`,
});

// CloudFront requires the certificate to live in us-east-1.
const cert = new CertStack(app, 'AergoLandingCert', {
  env: { account, region: 'us-east-1' },
  crossRegionReferences: true,
  zone: dns.zone,
  domainName,
  description: `ACM certificate for ${domainName} (us-east-1, required by CloudFront)`,
});

const site = new LandingStack(app, 'AergoLandingSite', {
  env: { account, region },
  crossRegionReferences: true,
  domainName,
  certificate: cert.certificate,
  zone: dns.zone,
  description: 'AERGO LLC landing page: S3 + CloudFront static hosting',
});
site.addStackDependency(cert);

cdk.Tags.of(app).add('Project', 'aergo-landing');
cdk.Tags.of(app).add('Owner', 'AERGO LLC');
