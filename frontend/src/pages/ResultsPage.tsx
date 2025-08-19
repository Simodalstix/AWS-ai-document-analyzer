import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, Loader, AlertCircle } from 'lucide-react';
import AnalysisResults from '../components/AnalysisResults';
import { getDocumentResults } from '../services/api';
import { DocumentMetadata, ContractAnalysis } from '../../../types';

// Results page displaying comprehensive contract analysis with export options
const ResultsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [document, setDocument] = useState<DocumentMetadata | null>(null);
  const [analysis, setAnalysis] = useState<ContractAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const result = await getDocumentResults(id);
        setDocument(result);
        setAnalysis(result.analysis || null);
      } catch (err) {
        console.error('Failed to fetch results:', err);
        setError(err instanceof Error ? err.message : 'Failed to load results');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [id]);

  const exportToPDF = () => {
    // Create a comprehensive PDF report
    const printWindow = window.open('', '_blank');
    if (printWindow && document && analysis) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Contract Analysis Report - ${document.fileName}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
              .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
              .section { margin-bottom: 30px; }
              .risk-high { color: #dc2626; }
              .risk-medium { color: #d97706; }
              .risk-low { color: #16a34a; }
              .confidence { background: #f3f4f6; padding: 10px; border-radius: 5px; }
              @media print { body { margin: 20px; } }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Contract Analysis Report</h1>
              <p><strong>Document:</strong> ${document.fileName}</p>
              <p><strong>Analyzed:</strong> ${new Date(analysis.processedAt).toLocaleDateString()}</p>
              <p><strong>Confidence Score:</strong> ${analysis.confidenceScore}%</p>
            </div>
            
            <div class="section">
              <h2>Executive Summary</h2>
              <p>${analysis.executiveSummary.overview}</p>
              <h3>Key Highlights</h3>
              <ul>${analysis.executiveSummary.keyHighlights.map(h => `<li>${h}</li>`).join('')}</ul>
              <h3>Major Concerns</h3>
              <ul>${analysis.executiveSummary.majorConcerns.map(c => `<li class="risk-high">${c}</li>`).join('')}</ul>
              <div class="confidence">
                <strong>Recommendation:</strong> ${analysis.executiveSummary.recommendation}
              </div>
            </div>
            
            <div class="section">
              <h2>Risk Assessment</h2>
              <p><strong>Overall Risk:</strong> <span class="risk-${analysis.riskAssessment.overallRisk}">${analysis.riskAssessment.overallRisk.toUpperCase()}</span></p>
              <p><strong>Risk Score:</strong> ${analysis.riskAssessment.totalScore}/100</p>
              ${analysis.riskAssessment.risks.map(risk => `
                <div style="margin: 15px 0; padding: 10px; border-left: 4px solid #ccc;">
                  <h4>${risk.category} <span class="risk-${risk.severity}">(${risk.severity})</span></h4>
                  <p>${risk.description}</p>
                  <p><strong>Recommendation:</strong> ${risk.recommendation}</p>
                </div>
              `).join('')}
            </div>
            
            <div class="section">
              <h2>Key Terms</h2>
              ${analysis.keyTerms.map(term => `
                <div style="margin: 10px 0; padding: 8px; background: #f9f9f9;">
                  <strong>${term.type.replace('_', ' ').toUpperCase()}:</strong> ${term.value}
                  <br><small>Location: ${term.location} | Confidence: ${term.confidence}%</small>
                </div>
              `).join('')}
            </div>
            
            <div class="section">
              <h2>Compliance Assessment</h2>
              <p><strong>Overall Compliance:</strong> ${analysis.complianceCheck.overallCompliance}%</p>
              ${analysis.complianceCheck.missingClauses.length > 0 ? `
                <h3>Missing Clauses</h3>
                <ul>${analysis.complianceCheck.missingClauses.map(c => `<li class="risk-high">${c}</li>`).join('')}</ul>
              ` : ''}
              <h3>Recommendations</h3>
              <ul>${analysis.complianceCheck.recommendations.map(r => `<li>${r}</li>`).join('')}</ul>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const exportToJSON = () => {
    if (document && analysis) {
      const exportData = {
        document: {
          id: document.id,
          fileName: document.fileName,
          uploadedAt: document.uploadedAt,
          processedAt: analysis.processedAt
        },
        analysis
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${document.fileName.replace(/\.[^/.]+$/, '')}_analysis.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading analysis results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card bg-danger-50 border-danger-200">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-6 w-6 text-danger-600" />
            <div>
              <h2 className="text-lg font-semibold text-danger-900">Error Loading Results</h2>
              <p className="text-danger-700 mt-1">{error}</p>
              <Link to="/" className="text-danger-600 hover:text-danger-800 mt-2 inline-block underline">
                Return to Upload
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!document || !analysis) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Analysis Not Available</h2>
            <p className="text-gray-600 mb-4">
              The document analysis is not yet complete or may have failed.
            </p>
            <Link to="/" className="btn-primary">
              Upload New Document
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{document.fileName}</h1>
            <p className="text-sm text-gray-500">
              Analyzed on {new Date(analysis.processedAt).toLocaleDateString()} at{' '}
              {new Date(analysis.processedAt).toLocaleTimeString()}
            </p>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={exportToJSON}
            className="btn-secondary flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export JSON</span>
          </button>
          <button
            onClick={exportToPDF}
            className="btn-primary flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Analysis Results */}
      <AnalysisResults analysis={analysis} />

      {/* Footer Actions */}
      <div className="mt-12 text-center">
        <Link to="/" className="btn-primary">
          Analyze Another Document
        </Link>
      </div>
    </div>
  );
};

export default ResultsPage;