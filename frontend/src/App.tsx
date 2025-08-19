import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { FileText, Brain } from 'lucide-react';
import UploadPage from './pages/UploadPage';
import ResultsPage from './pages/ResultsPage';
import DashboardPage from './pages/DashboardPage';

// Main App component with navigation and routing
function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Brain className="h-8 w-8 text-primary-600" />
                <FileText className="h-8 w-8 text-primary-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Document Contract Analyzer
                </h1>
                <p className="text-sm text-gray-600">
                  AI-powered legal contract analysis
                </p>
              </div>
            </div>
            <nav className="flex space-x-4">
              <a href="/" className="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium">
                Upload
              </a>
              <a href="/dashboard" className="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium">
                Dashboard
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/results/:id" element={<ResultsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;