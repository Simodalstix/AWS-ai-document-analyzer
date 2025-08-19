import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { DocumentMetadata, APIResponse } from '../types';

const s3Client = new S3Client({});
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// Lambda function that generates presigned URLs for secure file uploads and creates document metadata
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const { fileName, fileSize, contentType } = JSON.parse(event.body || '{}');
    
    if (!fileName || !fileSize || !contentType) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: false,
          error: 'Missing required fields: fileName, fileSize, contentType'
        } as APIResponse<never>)
      };
    }

    // Validate file type (PDF, DOCX, TXT only)
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(contentType)) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: false,
          error: 'Unsupported file type. Only PDF, DOCX, and TXT files are allowed.'
        } as APIResponse<never>)
      };
    }

    const documentId = uuidv4();
    const s3Key = `documents/${documentId}/${fileName}`;

    // Generate presigned URL for direct upload to S3
    const putObjectCommand = new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME!,
      Key: s3Key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, putObjectCommand, { expiresIn: 3600 });

    // Store document metadata in DynamoDB
    const documentMetadata: DocumentMetadata = {
      id: documentId,
      fileName,
      fileSize,
      uploadedAt: new Date().toISOString(),
      status: 'processing',
      s3Key,
      contentType
    };

    await dynamoClient.send(new PutCommand({
      TableName: process.env.TABLE_NAME!,
      Item: documentMetadata
    }));

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        data: {
          documentId,
          uploadUrl,
          metadata: documentMetadata
        }
      } as APIResponse<any>)
    };

  } catch (error) {
    console.error('Upload error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      } as APIResponse<never>)
    };
  }
};