import React, { useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';
import { ContractAnalysis } from '../../../types';

interface AnalysisResultsProps {
  analysis: ContractAnalysis;
}

// Comprehensive analysis results display with expandable sections and color-coded risk indicators
const AnalysisResults: React.FC<AnalysisResultsProps> = ({ analysis }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary']));

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getRiskIcon = (severity: string) => {
    switch (severity) {
      case 'low': return <CheckCircle className="h-4 w-4 text-success-600" />;
      case 'medium': return <Info className="h-4 w-4 text-warning-600" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-danger-600" />;
      case 'critical': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRiskClass = (severity: string) => {
    switch (severity) {
      case 'low': return 'risk-low';
      case 'medium': return 'risk-medium';
      case 'high': return 'risk-high';
      case 'critical': return 'risk-critical';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const Section: React.FC<{ title: string; id: string; children: React.ReactNode }> = ({ title, id, children }) => {
    const isExpanded = expandedSections.has(id);
    
    return (
      <div className="card">
        <button
          onClick={() => toggleSection(id)}
          className="flex items-center justify-between w-full text-left"
        >
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-500" />
          )}
        </button>
        
        {isExpanded && (
          <div className="mt-4">
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Confidence Score */}
      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Analysis Complete</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Confidence:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              analysis.confidenceScore >= 80 ? 'bg-success-100 text-success-800' :
              analysis.confidenceScore >= 60 ? 'bg-warning-100 text-warning-800' :
              'bg-danger-100 text-danger-800'
            }`}>
              {analysis.confidenceScore}%
            </span>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <Section title="Executive Summary" id="summary">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Overview</h4>
            <p className="text-gray-700">{analysis.executiveSummary.overview}</p>
          </div>
          
          {analysis.executiveSummary.keyHighlights.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Key Highlights</h4>
              <ul className="list-disc list-inside space-y-1">
                {analysis.executiveSummary.keyHighlights.map((highlight, index) => (
                  <li key={index} className="text-gray-700">{highlight}</li>
                ))}
              </ul>
            </div>
          )}
          
          {analysis.executiveSummary.majorConcerns.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Major Concerns</h4>
              <ul className="list-disc list-inside space-y-1">
                {analysis.executiveSummary.majorConcerns.map((concern, index) => (
                  <li key={index} className="text-danger-700">{concern}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="p-4 bg-primary-50 rounded-lg">
            <h4 className="font-medium text-primary-900 mb-2">Recommendation</h4>
            <p className="text-primary-800">{analysis.executiveSummary.recommendation}</p>
          </div>
        </div>
      </Section>

      {/* Risk Assessment */}
      <Section title="Risk Assessment" id="risks">
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-600">Overall Risk:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRiskClass(analysis.riskAssessment.overallRisk)}`}>
              {analysis.riskAssessment.overallRisk.toUpperCase()}
            </span>
            <span className="text-sm text-gray-500">Score: {analysis.riskAssessment.totalScore}/100</span>
          </div>
          
          <div className="space-y-3">
            {analysis.riskAssessment.risks.map((risk, index) => (
              <div key={index} className={`p-4 rounded-lg border ${getRiskClass(risk.severity)}`}>
                <div className="flex items-start space-x-3">
                  {getRiskIcon(risk.severity)}
                  <div className="flex-1">
                    <h5 className="font-medium">{risk.category}</h5>
                    <p className="text-sm mt-1">{risk.description}</p>
                    <p className="text-sm mt-2 font-medium">Recommendation: {risk.recommendation}</p>
                    <span className="text-xs opacity-75">Confidence: {risk.confidence}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Key Terms */}
      <Section title="Key Terms Extracted" id="terms">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analysis.keyTerms.map((term, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {term.type.replace('_', ' ')}
                </span>
                <span className="text-xs text-gray-400">{term.confidence}%</span>
              </div>
              <p className="font-medium text-gray-900">{term.value}</p>
              <p className="text-xs text-gray-500 mt-1">{term.location}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Clause Analysis */}
      <Section title="Clause Analysis" id="clauses">
        <div className="space-y-4">
          {analysis.clauseAnalysis.map((clause, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium text-gray-900">{clause.clauseType}</h5>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  clause.isStandard ? 'bg-success-100 text-success-800' : 'bg-warning-100 text-warning-800'
                }`}>
                  {clause.isStandard ? 'Standard' : 'Non-standard'}
                </span>
              </div>
              
              <p className="text-sm text-gray-700 mb-3">{clause.content}</p>
              
              {clause.unusualAspects.length > 0 && (
                <div className="mb-3">
                  <h6 className="text-sm font-medium text-gray-900 mb-1">Unusual Aspects:</h6>
                  <ul className="list-disc list-inside text-sm text-gray-600">
                    {clause.unusualAspects.map((aspect, i) => (
                      <li key={i}>{aspect}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="p-3 bg-blue-50 rounded">
                <p className="text-sm text-blue-800">
                  <strong>Recommendation:</strong> {clause.recommendation}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Compliance Check */}
      <Section title="Compliance Assessment" id="compliance">
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-600">Overall Compliance:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              analysis.complianceCheck.overallCompliance >= 80 ? 'bg-success-100 text-success-800' :
              analysis.complianceCheck.overallCompliance >= 60 ? 'bg-warning-100 text-warning-800' :
              'bg-danger-100 text-danger-800'
            }`}>
              {analysis.complianceCheck.overallCompliance}%
            </span>
          </div>
          
          {analysis.complianceCheck.missingClauses.length > 0 && (
            <div>
              <h5 className="font-medium text-gray-900 mb-2">Missing Clauses</h5>
              <ul className="list-disc list-inside space-y-1">
                {analysis.complianceCheck.missingClauses.map((clause, index) => (
                  <li key={index} className="text-danger-700">{clause}</li>
                ))}
              </ul>
            </div>
          )}
          
          {analysis.complianceCheck.nonStandardClauses.length > 0 && (
            <div>
              <h5 className="font-medium text-gray-900 mb-2">Non-Standard Clauses</h5>
              <ul className="list-disc list-inside space-y-1">
                {analysis.complianceCheck.nonStandardClauses.map((clause, index) => (
                  <li key={index} className="text-warning-700">{clause}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div>
            <h5 className="font-medium text-gray-900 mb-2">Recommendations</h5>
            <ul className="list-disc list-inside space-y-1">
              {analysis.complianceCheck.recommendations.map((rec, index) => (
                <li key={index} className="text-gray-700">{rec}</li>
              ))}
            </ul>
          </div>
        </div>
      </Section>
    </div>
  );
};

export default AnalysisResults;