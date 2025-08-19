#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DocumentAnalyzerStack } from '../lib/document-analyzer-stack';

const app = new cdk.App();
new DocumentAnalyzerStack(app, 'DocumentAnalyzerStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});