import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

export class DocumentAnalyzerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 bucket for document storage with encryption and lifecycle policies
    const documentBucket = new s3.Bucket(this, 'DocumentBucket', {
      bucketName: `document-analyzer-${this.account}-${this.region}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [{
        id: 'DeleteOldDocuments',
        expiration: cdk.Duration.days(90), // Cost optimization
        transitions: [{
          storageClass: s3.StorageClass.INFREQUENT_ACCESS,
          transitionAfter: cdk.Duration.days(30)
        }]
      }],
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
      }],
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // DynamoDB table for storing document metadata and analysis results
    const documentsTable = new dynamodb.Table(this, 'DocumentsTable', {
      tableName: 'document-analyzer-documents',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // Cost-effective for variable workloads
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // IAM role for Lambda functions with minimal required permissions
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
      ],
      inlinePolicies: {
        DocumentAnalyzerPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject'
              ],
              resources: [documentBucket.bucketArn + '/*']
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan'
              ],
              resources: [documentsTable.tableArn]
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'bedrock:InvokeModel'
              ],
              resources: ['*'] // Bedrock models require wildcard
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'textract:DetectDocumentText',
                'textract:AnalyzeDocument'
              ],
              resources: ['*']
            })
          ]
        })
      }
    });

    // Lambda function for handling document uploads and generating presigned URLs
    const uploadFunction = new lambda.Function(this, 'UploadFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'upload.handler',
      code: lambda.Code.fromAsset('lambda'),
      role: lambdaRole,
      environment: {
        BUCKET_NAME: documentBucket.bucketName,
        TABLE_NAME: documentsTable.tableName
      },
      timeout: cdk.Duration.seconds(30),
      tracing: lambda.Tracing.ACTIVE // X-Ray tracing for monitoring
    });

    // Lambda function for processing documents with Textract and Bedrock
    const processFunction = new lambda.Function(this, 'ProcessFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'process.handler',
      code: lambda.Code.fromAsset('lambda'),
      role: lambdaRole,
      environment: {
        BUCKET_NAME: documentBucket.bucketName,
        TABLE_NAME: documentsTable.tableName
      },
      timeout: cdk.Duration.minutes(5), // Longer timeout for AI processing
      memorySize: 1024, // More memory for document processing
      tracing: lambda.Tracing.ACTIVE
    });

    // Lambda function for retrieving analysis results
    const resultsFunction = new lambda.Function(this, 'ResultsFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'results.handler',
      code: lambda.Code.fromAsset('lambda'),
      role: lambdaRole,
      environment: {
        TABLE_NAME: documentsTable.tableName
      },
      timeout: cdk.Duration.seconds(30),
      tracing: lambda.Tracing.ACTIVE
    });

    // API Gateway for REST endpoints with CORS support
    const api = new apigateway.RestApi(this, 'DocumentAnalyzerApi', {
      restApiName: 'Document Analyzer API',
      description: 'API for intelligent document contract analysis',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key']
      }
    });

    // API endpoints for document operations
    const documentsResource = api.root.addResource('documents');
    documentsResource.addMethod('POST', new apigateway.LambdaIntegration(uploadFunction));
    documentsResource.addMethod('GET', new apigateway.LambdaIntegration(resultsFunction));

    const processResource = documentsResource.addResource('process');
    processResource.addMethod('POST', new apigateway.LambdaIntegration(processFunction));

    const documentResource = documentsResource.addResource('{id}');
    documentResource.addMethod('GET', new apigateway.LambdaIntegration(resultsFunction));

    // S3 bucket for hosting the React frontend
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `document-analyzer-web-${this.account}-${this.region}`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'error.html',
      publicReadAccess: true,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false
      }),
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // Output important values for frontend configuration
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL for frontend integration'
    });

    new cdk.CfnOutput(this, 'WebsiteUrl', {
      value: websiteBucket.bucketWebsiteUrl,
      description: 'Website URL for the React frontend'
    });

    new cdk.CfnOutput(this, 'BucketName', {
      value: documentBucket.bucketName,
      description: 'S3 bucket name for document storage'
    });
  }
}