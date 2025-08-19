import axios from 'axios';
import { DocumentMetadata, ContractAnalysis, APIResponse } from '../../../types';

// API service layer - handles all communication with our AWS Lambda backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export interface UploadResponse {
  documentId: string;
  uploadUrl: string;
  metadata: DocumentMetadata;
}

// Upload a document and get presigned URL for S3 upload
export const initiateUpload = async (fileName: string, fileSize: number, contentType: string): Promise<UploadResponse> => {
  const response = await api.post<APIResponse<UploadResponse>>('/documents', {
    fileName,
    fileSize,
    contentType
  });
  
  if (!response.data.success) {
    throw new Error(response.data.error || 'Upload initiation failed');
  }
  
  return response.data.data!;
};

// Upload file directly to S3 using presigned URL
export const uploadToS3 = async (uploadUrl: string, file: File): Promise<void> => {
  await axios.put(uploadUrl, file, {
    headers: {
      'Content-Type': file.type,
    },
  });
};

// Trigger document processing with AI analysis
export const processDocument = async (documentId: string): Promise<ContractAnalysis> => {
  const response = await api.post<APIResponse<ContractAnalysis>>('/documents/process', {
    documentId
  });
  
  if (!response.data.success) {
    throw new Error(response.data.error || 'Processing failed');
  }
  
  return response.data.data!;
};

// Get analysis results for a specific document
export const getDocumentResults = async (documentId: string): Promise<DocumentMetadata & { analysis?: ContractAnalysis }> => {
  const response = await api.get<APIResponse<DocumentMetadata & { analysis?: ContractAnalysis }>>(`/documents/${documentId}`);
  
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to get results');
  }
  
  return response.data.data!;
};

// Get all documents for dashboard listing
export const getAllDocuments = async (): Promise<DocumentMetadata[]> => {
  const response = await api.get<APIResponse<DocumentMetadata[]>>('/documents');
  
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to get documents');
  }
  
  return response.data.data!;
};