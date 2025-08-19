import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { APIResponse } from '../types';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// Results Lambda function - retrieves document analysis results and metadata from DynamoDB
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const documentId = event.pathParameters?.id;

    if (documentId) {
      // Get specific document analysis
      const result = await dynamoClient.send(new GetCommand({
        TableName: process.env.TABLE_NAME!,
        Key: { id: documentId }
      }));

      if (!result.Item) {
        return {
          statusCode: 404,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            success: false,
            error: 'Document not found'
          } as APIResponse<never>)
        };
      }

      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: true,
          data: result.Item
        } as APIResponse<any>)
      };

    } else {
      // Get all documents (for dashboard listing)
      const result = await dynamoClient.send(new ScanCommand({
        TableName: process.env.TABLE_NAME!,
        ProjectionExpression: 'id, fileName, uploadedAt, #status, fileSize',
        ExpressionAttributeNames: {
          '#status': 'status'
        }
      }));

      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: true,
          data: result.Items || []
        } as APIResponse<any[]>)
      };
    }

  } catch (error) {
    console.error('Results error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: false,
        error: 'Failed to retrieve results'
      } as APIResponse<never>)
    };
  }
};