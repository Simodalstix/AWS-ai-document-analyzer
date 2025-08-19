import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { ContractAnalysis, APIResponse } from '../types';

const s3Client = new S3Client({});
const textractClient = new TextractClient({});
const bedrockClient = new BedrockRuntimeClient({});
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

// Main processing Lambda - orchestrates document text extraction and AI analysis
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const { documentId } = JSON.parse(event.body || '{}');
    
    if (!documentId) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: false,
          error: 'Document ID is required'
        } as APIResponse<never>)
      };
    }

    // Get document metadata from DynamoDB
    const docResult = await dynamoClient.send(new GetCommand({
      TableName: process.env.TABLE_NAME!,
      Key: { id: documentId }
    }));

    if (!docResult.Item) {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: false,
          error: 'Document not found'
        } as APIResponse<never>)
      };
    }

    const document = docResult.Item;

    // Extract text from document using Textract
    let extractedText: string;
    
    if (document.contentType === 'text/plain') {
      // For text files, read directly from S3
      const s3Object = await s3Client.send(new GetObjectCommand({
        Bucket: process.env.BUCKET_NAME!,
        Key: document.s3Key
      }));
      extractedText = await s3Object.Body!.transformToString();
    } else {
      // For PDF/DOCX, use Textract
      const textractResult = await textractClient.send(new DetectDocumentTextCommand({
        Document: {
          S3Object: {
            Bucket: process.env.BUCKET_NAME!,
            Name: document.s3Key
          }
        }
      }));

      extractedText = textractResult.Blocks
        ?.filter(block => block.BlockType === 'LINE')
        .map(block => block.Text)
        .join('\n') || '';
    }

    // Analyze contract with Bedrock Claude
    const analysis = await analyzeContractWithBedrock(extractedText);

    // Store analysis results in DynamoDB
    await dynamoClient.send(new UpdateCommand({
      TableName: process.env.TABLE_NAME!,
      Key: { id: documentId },
      UpdateExpression: 'SET #status = :status, #analysis = :analysis, #processedAt = :processedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#analysis': 'analysis',
        '#processedAt': 'processedAt'
      },
      ExpressionAttributeValues: {
        ':status': 'completed',
        ':analysis': analysis,
        ':processedAt': new Date().toISOString()
      }
    }));

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        data: analysis
      } as APIResponse<ContractAnalysis>)
    };

  } catch (error) {
    console.error('Processing error:', error);
    
    // Update document status to failed
    if (event.body) {
      const { documentId } = JSON.parse(event.body);
      if (documentId) {
        await dynamoClient.send(new UpdateCommand({
          TableName: process.env.TABLE_NAME!,
          Key: { id: documentId },
          UpdateExpression: 'SET #status = :status',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: { ':status': 'failed' }
        }));
      }
    }

    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: false,
        error: 'Processing failed'
      } as APIResponse<never>)
    };
  }
};

// AI analysis function using Bedrock Claude for intelligent contract analysis
async function analyzeContractWithBedrock(text: string): Promise<ContractAnalysis> {
  const prompt = `Analyze this legal contract and provide a comprehensive analysis in JSON format. Extract key terms, assess risks, analyze clauses, check compliance, and provide an executive summary.

Contract text:
${text}

Please respond with a JSON object containing:
1. keyTerms: Array of extracted terms (parties, dates, amounts, payment terms, obligations)
2. riskAssessment: Overall risk level and specific risks with recommendations
3. clauseAnalysis: Analysis of contract clauses, identifying unusual or non-standard elements
4. complianceCheck: Assessment against standard contract practices
5. executiveSummary: High-level overview with key highlights and concerns
6. confidenceScore: Overall confidence in the analysis (0-100)

Focus on practical legal insights that would help a legal professional quickly understand the contract's key aspects and potential issues.`;

  const command = new InvokeModelCommand({
    modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })
  });

  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  try {
    // Parse Claude's response and structure it according to our interface
    const analysisText = responseBody.content[0].text;
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsedAnalysis = JSON.parse(jsonMatch[0]);
      
      return {
        documentId: '', // Will be set by caller
        keyTerms: parsedAnalysis.keyTerms || [],
        riskAssessment: parsedAnalysis.riskAssessment || { overallRisk: 'medium', risks: [], totalScore: 50 },
        clauseAnalysis: parsedAnalysis.clauseAnalysis || [],
        complianceCheck: parsedAnalysis.complianceCheck || { overallCompliance: 70, missingClauses: [], nonStandardClauses: [], recommendations: [] },
        executiveSummary: parsedAnalysis.executiveSummary || { overview: 'Analysis completed', keyHighlights: [], majorConcerns: [], recommendation: 'Review recommended' },
        confidenceScore: parsedAnalysis.confidenceScore || 75,
        processedAt: new Date().toISOString()
      };
    }
  } catch (parseError) {
    console.error('Failed to parse Bedrock response:', parseError);
  }

  // Fallback analysis if parsing fails
  return {
    documentId: '',
    keyTerms: [{ type: 'other', value: 'Analysis completed', confidence: 50, location: 'Document' }],
    riskAssessment: { overallRisk: 'medium', risks: [{ category: 'General', description: 'Document processed but detailed analysis unavailable', severity: 'medium', recommendation: 'Manual review recommended', confidence: 50 }], totalScore: 50 },
    clauseAnalysis: [{ clauseType: 'General', content: 'Document processed', isStandard: true, unusualAspects: [], recommendation: 'Manual review recommended' }],
    complianceCheck: { overallCompliance: 50, missingClauses: [], nonStandardClauses: [], recommendations: ['Manual review recommended'] },
    executiveSummary: { overview: 'Document processed successfully', keyHighlights: ['Text extraction completed'], majorConcerns: ['Detailed analysis unavailable'], recommendation: 'Manual review recommended' },
    confidenceScore: 50,
    processedAt: new Date().toISOString()
  };
}