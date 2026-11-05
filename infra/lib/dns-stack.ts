import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';

export interface DnsStackProps extends cdk.StackProps {
  readonly zoneName: string;
}

/** Public hosted zone for the landing-page domain. Namecheap delegates to these nameservers. */
export class DnsStack extends cdk.Stack {
  public readonly zone: route53.PublicHostedZone;

  constructor(scope: Construct, id: string, props: DnsStackProps) {
    super(scope, id, props);

    this.zone = new route53.PublicHostedZone(this, 'Zone', {
      zoneName: props.zoneName,
      comment: 'AERGO LLC landing page',
    });

    new cdk.CfnOutput(this, 'ZoneName', { value: this.zone.zoneName });
    new cdk.CfnOutput(this, 'ZoneId', { value: this.zone.hostedZoneId });
    new cdk.CfnOutput(this, 'NameServers', {
      value: cdk.Fn.join(', ', this.zone.hostedZoneNameServers ?? []),
      description: 'Set these as custom nameservers at Namecheap',
    });
  }
}
