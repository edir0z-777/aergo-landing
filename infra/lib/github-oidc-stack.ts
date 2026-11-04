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
          'token.actions.githubusercontent.com:sub': `repo:${props.repository}:ref:refs/heads/${branch}`,
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
