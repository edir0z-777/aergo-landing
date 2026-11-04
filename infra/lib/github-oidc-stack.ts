import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface GithubOidcStackProps extends cdk.StackProps {
  /** GitHub "owner/repo" allowed to assume the deploy role. */
  readonly repository: string;
  /** Branch allowed to deploy (default: main). */
  readonly branch?: string;
}

/**
 * Keyless CI/CD: GitHub Actions assumes this role via OIDC (no long-lived AWS keys in GitHub).
 * The role is scoped to a single repository + branch and can only drive CDK deployments.
 */
export class GithubOidcStack extends cdk.Stack {
  public readonly deployRole: iam.Role;

  constructor(scope: Construct, id: string, props: GithubOidcStackProps) {
    super(scope, id, props);

    const branch = props.branch ?? 'main';
    const [owner, repo] = props.repository.split('/');
    if (!owner || !repo) {
      throw new Error(`repository must be "owner/repo", got "${props.repository}"`);
    }

    // GitHub issues the subject either as "repo:owner/repo:ref:..." (classic) or
    // "repo:owner@<id>/repo@<id>:ref:..." (ID-qualified). "@" is not a legal character in
    // GitHub owner or repository names, so matching both forms stays scoped to this repo.
    const allowedSubjects = [
      `repo:${owner}/${repo}:ref:refs/heads/${branch}`,
      `repo:${owner}@*/${repo}@*:ref:refs/heads/${branch}`,
    ];

    const provider = new iam.OpenIdConnectProvider(this, 'GithubProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
    });

    this.deployRole = new iam.Role(this, 'DeployRole', {
      roleName: 'aergo-landing-github-deploy',
      description: `GitHub Actions deploy role for ${props.repository}`,
      maxSessionDuration: cdk.Duration.hours(1),
      assumedBy: new iam.WebIdentityPrincipal(provider.openIdConnectProviderArn, {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
        },
        StringLike: {
          'token.actions.githubusercontent.com:sub': allowedSubjects,
        },
      }),
    });

    // CDK deploys by assuming the bootstrap roles; CI only needs permission to assume them.
    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['sts:AssumeRole'],
        resources: [`arn:aws:iam::${this.account}:role/cdk-hnb659fds-*-role-${this.account}-*`],
      }),
    );

    new cdk.CfnOutput(this, 'DeployRoleArn', {
      value: this.deployRole.roleArn,
      description: 'Set as the AWS_ROLE_ARN repository variable in GitHub',
    });
  }
}
