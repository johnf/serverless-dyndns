import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigwv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';

import config from '../config.json';

const {
  API_HOSTNAME,
  API_ZONENAME,
  DYNDNS_USERNAME,
  DYNDNS_PASSWORD,
  HOSTNAMES,
} = config;

export class ServerlessDyndnsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const zone = route53.HostedZone.fromLookup(this, 'Zone', {
      domainName: API_ZONENAME,
    });

    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName: API_HOSTNAME,
      validation: acm.CertificateValidation.fromDns(zone),
    });

    // /////////
    // Lambda
    // /////////

    const func = new nodejs.NodejsFunction(this, 'DynDnsFunction', {
      functionName: 'dyndns',
      entry: 'src/handler.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      memorySize: 512,
      environment: {
        API_HOSTNAME,
        API_ZONENAME,
        DYNDNS_USERNAME,
        DYNDNS_PASSWORD,
        HOSTNAMES: HOSTNAMES.join(','),
      },
    });

    const listPolicy = new iam.PolicyStatement({
      actions: ['route53:ListHostedZones'],
      resources: ['*'],
    });
    func.addToRolePolicy(listPolicy);

    const changePolicy = new iam.PolicyStatement({
      actions: ['route53:ChangeResourceRecordSets'],
      resources: ['*'], // TODO: Base this on the domains
    });
    func.addToRolePolicy(changePolicy);

    // /////////
    // API Gateway
    // /////////

    const integration = new apigwv2Integrations.HttpLambdaIntegration('Integration', func);

    const customDomain = new apigwv2.DomainName(this, 'CustomDomain', {
      domainName: API_HOSTNAME,
      certificate,
    });

    const httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      apiName: 'dyndns',
      defaultDomainMapping: {
        domainName: customDomain,
      },
    });

    httpApi.addRoutes({
      path: '/nic/update',
      methods: [apigwv2.HttpMethod.GET],
      integration,
    });

    // /////////
    // DNS
    // /////////

    const target = route53.RecordTarget.fromAlias(new route53Targets.ApiGatewayv2DomainProperties(customDomain.regionalDomainName, customDomain.regionalHostedZoneId));

    new route53.ARecord(this, 'ARecord', {
      zone,
      target,
      recordName: API_HOSTNAME.replace(`.${API_ZONENAME}`, ''),
    });

    // API gateway does not support AAAA records
    // new route53.AaaaRecord(this, 'AAAARecord', {
    //   zone,
    //   target,
    //   recordName: API_HOSTNAME.replace(`.${API_ZONENAME}`, ''),
    // });
  }
}
