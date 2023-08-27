#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ServerlessDyndnsStack } from '../lib/serverless-dyndns-stack';

const app = new cdk.App();
new ServerlessDyndnsStack(app, 'ServerlessDyndnsStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
