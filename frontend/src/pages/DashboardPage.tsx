import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Clock, CheckCircle, XCircle, Eye, Upload } from 'lucide-react';
import { getAllDocuments } from '../services/api';
import { DocumentMetadata } from '../../../types';

// Dashboard page showing all processed documents with status indicators
const DashboardPage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        const docs = await getAllDocuments();
        // Sort by upload date, newest first
        docs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        setDocuments(docs);
      } catch (err) {
        console.error('Failed to fetch documents:', err);
        setError(err instanceof Error ? err.message : 'Failed to load documents');
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-success-600" />;
      case 'processing':
        return <Clock className="h-5 w-5 text-warning-600 animate-pulse" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-danger-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Analysis Complete';
      case 'processing':
        return 'Processing...';
      case 'failed':
        return 'Analysis Failed';
      default:
        return 'Unknown Status';
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-success-600 bg-success-50';
      case 'processing':
        return 'text-warning-600 bg-warning-50';
      case 'failed':
        return 'text-danger-600 bg-danger-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading documents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card bg-danger-50 border-danger-200">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-danger-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-danger-900 mb-2">Error Loading Dashboard</h2>
            <p className="text-danger-700 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Document Dashboard</h1>
          <p className="text-gray-600 mt-2">
            View and manage your analyzed contracts
          </p>
        </div>
        <Link to="/" className="btn-primary flex items-center space-x-2">
          <Upload className="h-4 w-4" />
          <span>Upload New Document</span>
        </Link>
      </div>

      {documents.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Documents Yet</h2>
          <p className="text-gray-600 mb-6">
            Upload your first contract to get started with AI-powered analysis.
          </p>
          <Link to="/" className="btn-primary">
            Upload Document
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => (
            <div key={doc.id} className="card hover:shadow-lg transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="flex-shrink-0">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {doc.fileName}
                    </h3>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                      <span>Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>•</span>
                      <span className="capitalize">
                        {doc.contentType.includes('pdf') ? 'PDF' : 
                         doc.contentType.includes('word') ? 'DOCX' : 'TXT'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusClass(doc.status)}`}>
                    {getStatusIcon(doc.status)}
                    <span>{getStatusText(doc.status)}</span>
                  </div>

                  {doc.status === 'completed' && (
                    <Link
                      to={`/results/${doc.id}`}
                      className="btn-primary flex items-center space-x-2"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View Results</span>
                    </Link>
                  )}

                  {doc.status === 'processing' && (
                    <button
                      disabled
                      className="btn-secondary opacity-50 cursor-not-allowed flex items-center space-x-2"
                    >
                      <Clock className="h-4 w-4" />
                      <span>Processing</span>
                    </button>
                  )}

                  {doc.status === 'failed' && (
                    <button
                      onClick={() => {
                        // Could implement retry functionality here
                        alert('Retry functionality would be implemented here');
                      }}
                      className="btn-secondary flex items-center space-x-2"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>Retry</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {documents.length > 0 && (
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Showing {documents.length} document{documents.length !== 1 ? 's' : ''}
          </p>
          <p className="mt-1">
            Documents are automatically deleted after 90 days for security.
          </p>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;