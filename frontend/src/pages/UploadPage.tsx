import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';
import FileUpload from '../components/FileUpload';
import { initiateUpload, uploadToS3, processDocument } from '../services/api';

// Main upload page with file selection, upload progress, and processing status
const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError(null);
    setUploadStatus('idle');
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploadStatus('uploading');
      setError(null);
      setProgress(25);

      // Step 1: Initiate upload and get presigned URL
      const uploadResponse = await initiateUpload(
        selectedFile.name,
        selectedFile.size,
        selectedFile.type
      );
      
      setDocumentId(uploadResponse.documentId);
      setProgress(50);

      // Step 2: Upload file to S3
      await uploadToS3(uploadResponse.uploadUrl, selectedFile);
      setProgress(75);

      // Step 3: Process document with AI
      setUploadStatus('processing');
      await processDocument(uploadResponse.documentId);
      
      setProgress(100);
      setUploadStatus('completed');

      // Navigate to results after a brief delay
      setTimeout(() => {
        navigate(`/results/${uploadResponse.documentId}`);
      }, 1500);

    } catch (err) {
      console.error('Upload/processing error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setUploadStatus('error');
      setProgress(0);
    }
  };

  const getStatusMessage = () => {
    switch (uploadStatus) {
      case 'uploading':
        return 'Uploading document to secure storage...';
      case 'processing':
        return 'Analyzing contract with AI (this may take up to 60 seconds)...';
      case 'completed':
        return 'Analysis complete! Redirecting to results...';
      case 'error':
        return 'An error occurred during processing';
      default:
        return '';
    }
  };

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'uploading':
      case 'processing':
        return <Loader className="h-5 w-5 animate-spin text-primary-600" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-success-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-danger-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Upload Contract for Analysis
        </h1>
        <p className="text-lg text-gray-600">
          Upload your legal contract and get AI-powered analysis including risk assessment, 
          key term extraction, and compliance checking.
        </p>
      </div>

      <div className="space-y-6">
        <FileUpload 
          onFileSelect={handleFileSelect}
          isUploading={uploadStatus === 'uploading' || uploadStatus === 'processing'}
        />

        {selectedFile && (
          <div className="card">
            <h3 className="font-medium text-gray-900 mb-3">Selected File</h3>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {selectedFile.type}
                </p>
              </div>
              {uploadStatus === 'idle' && (
                <button
                  onClick={handleUpload}
                  className="btn-primary"
                >
                  Analyze Contract
                </button>
              )}
            </div>
          </div>
        )}

        {(uploadStatus === 'uploading' || uploadStatus === 'processing' || uploadStatus === 'completed') && (
          <div className="card">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                {getStatusIcon()}
                <span className="font-medium text-gray-900">
                  {getStatusMessage()}
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              
              <div className="text-sm text-gray-600">
                {uploadStatus === 'processing' && (
                  <p>
                    Our AI is extracting key terms, assessing risks, analyzing clauses, 
                    and checking compliance. This typically takes 30-60 seconds.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="card bg-danger-50 border-danger-200">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-danger-600" />
              <div>
                <h3 className="font-medium text-danger-900">Processing Error</h3>
                <p className="text-sm text-danger-700 mt-1">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    setUploadStatus('idle');
                    setProgress(0);
                  }}
                  className="text-sm text-danger-600 hover:text-danger-800 mt-2 underline"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="text-center text-sm text-gray-500">
          <p>
            Supported formats: PDF, DOCX, TXT • Maximum file size: 10MB
          </p>
          <p className="mt-1">
            Your documents are processed securely and automatically deleted after 90 days.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;