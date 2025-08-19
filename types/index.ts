// Shared TypeScript interfaces used across Lambda functions and frontend
export interface DocumentMetadata {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  status: 'processing' | 'completed' | 'failed';
  s3Key: string;
  contentType: string;
}

export interface ContractAnalysis {
  documentId: string;
  keyTerms: KeyTerm[];
  riskAssessment: RiskAssessment;
  clauseAnalysis: ClauseAnalysis[];
  complianceCheck: ComplianceResult;
  executiveSummary: ExecutiveSummary;
  confidenceScore: number;
  processedAt: string;
}

export interface KeyTerm {
  type: 'party' | 'date' | 'amount' | 'payment_term' | 'obligation' | 'other';
  value: string;
  confidence: number;
  location: string; // Page/section reference
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  risks: Risk[];
  totalScore: number;
}

export interface Risk {
  category: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
  confidence: number;
}

export interface ClauseAnalysis {
  clauseType: string;
  content: string;
  isStandard: boolean;
  unusualAspects: string[];
  recommendation: string;
}

export interface ComplianceResult {
  overallCompliance: number;
  missingClauses: string[];
  nonStandardClauses: string[];
  recommendations: string[];
}

export interface ExecutiveSummary {
  overview: string;
  keyHighlights: string[];
  majorConcerns: string[];
  recommendation: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}