import { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload as UploadIcon, FileText, Download, AlertCircle, CheckCircle, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { batchPredict } from '../services/api';

/**
 * Upload Page
 * 
 * Batch prediction using CSV file upload - Connected to Real API
 * Upload a CSV with planet parameters and get habitability predictions for all
 */
const Upload = () => {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [detailedResults, setDetailedResults] = useState(null); // Store detailed predictions

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Handle drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Handle file selection
  const handleFileChange = (selectedFile) => {
    setError(null);
    
    // Validate file type
    if (selectedFile && !selectedFile.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }
    
    // Validate file size (max 5MB)
    if (selectedFile && selectedFile.size > 5 * 1024 * 1024) {
      setError('File size should be less than 5MB');
      return;
    }
    
    setFile(selectedFile);
  };

  // Handle file upload and processing
  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Read CSV file
      const text = await file.text();
      const lines = text.trim().split('\n');
      
      if (lines.length < 2) {
        throw new Error('CSV file must have at least a header and one data row');
      }

      // Parse CSV header
      const headers = lines[0].split(',').map(h => h.trim());
      
      // Validate required columns
      const requiredColumns = ['pl_rade', 'pl_eqt', 'st_teff'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));
      if (missingColumns.length > 0) {
        throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
      }

      // Parse planet data
      const planetsData = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length !== headers.length) continue; // Skip malformed rows
        
        const planetParams = {};
        headers.forEach((header, idx) => {
          const value = (values[idx] || '').trim();
          // Only include numeric fields if the value is a valid number (skip NaN/empty)
          if (['pl_rade', 'pl_eqt', 'pl_insol', 'pl_orbper', 'st_teff', 'st_rad', 'st_mass'].includes(header)) {
            const num = parseFloat(value);
            if (!isNaN(num)) planetParams[header] = num;
          } else if (header !== 'planet_name' && header !== 'name') {
            // Skip non-numeric non-name columns (mission string etc. could fail serializer)
            // Only keep known numeric columns
          }
        });
        // Always include planet_name for reference if present
        const nameIdx = headers.indexOf('planet_name');
        if (nameIdx !== -1) planetParams.planet_name = (values[nameIdx] || '').trim();
        
        planetsData.push(planetParams);
      }

      if (planetsData.length === 0) {
        throw new Error('No valid planet data found in CSV');
      }

      // Call batch prediction API
      const response = await batchPredict(planetsData);
      
      // Process results from API response
      const apiResults = response.results || [];
      let habitableCount = 0;
      let totalScore = 0;
      
      const processedResults = apiResults.map((result, idx) => {
        if (result.classification === 'POTENTIALLY_HABITABLE') {
          habitableCount++;
        }
        totalScore += result.habitability_score || 0;
        return {
          ...planetsData[idx],
          ...result
        };
      });

      // Set results summary
      setResults({
        totalPlanets: response.total_planets || processedResults.length,
        processed: response.successful_predictions || processedResults.length,
        habitableCount: habitableCount,
        nonHabitableCount: processedResults.length - habitableCount,
        averageScore: totalScore / processedResults.length,
        downloadUrl: '#' // Will be used for download
      });
      
      setDetailedResults(processedResults);

    } catch (err) {
      console.error('Upload processing error:', err);
      // Show actual API validation errors if available
      const apiDetail = err?.response?.data?.field_errors
        ? JSON.stringify(err.response.data.field_errors)
        : err?.response?.data?.detail || err?.response?.data?.error;
      setError(apiDetail || err.message || 'Failed to process CSV file. Please check the format and try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Clear file and results
  const handleClear = () => {
    setFile(null);
    setResults(null);
    setError(null);
    setDetailedResults(null);
  };

  // Download results as CSV
  const handleDownloadResults = () => {
    if (!detailedResults) return;

    // Create CSV header
    const headers = ['planet_name', 'pl_rade', 'pl_eqt', 'pl_insol', 'pl_orbper', 
                    'st_teff', 'st_rad', 'st_mass', 'habitability_score', 'classification'];
    
    // Create CSV rows
    const rows = detailedResults.map(planet => {
      return headers.map(header => {
        const value = planet[header];
        return value !== undefined && value !== null ? value : '';
      }).join(',');
    });

    // Combine into CSV content
    const csvContent = [headers.join(','), ...rows].join('\n');

    // Create and download blob
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habitability_predictions_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Download sample CSV template
  const handleDownloadTemplate = () => {
    // Create sample CSV content
    const csvContent = `planet_name,pl_rade,pl_eqt,pl_insol,pl_orbper,st_teff,st_rad,st_mass
Sample Planet 1,1.2,288,1.0,365,5778,1.0,1.0
Sample Planet 2,0.9,251,0.66,6.1,2566,0.117,0.089
Sample Planet 3,1.6,265,1.1,384.8,5757,1.11,1.04`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'planet_parameters_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-16">
      <Navbar />
      
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border 
                            border-cyan-500/30 rounded-full text-cyan-400 text-sm mb-6">
              <UploadIcon className="w-4 h-4" />
              Batch Analysis
            </div>
            <h1 className="text-5xl font-bold text-white mb-4">
              Batch <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Prediction</span>
            </h1>
            <p className="text-xl text-slate-300">
              Upload a CSV file to predict habitability for multiple exoplanets at once
            </p>
          </motion.div>
        </div>

        {/* CSV Template Download */}
        <div className="mb-8 bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-slate-400 mb-2">
                <strong>CSV Format Required:</strong> Your CSV file must include the following columns:
              </p>
              <div className="text-sm text-cyan-300/80 mb-3 font-mono bg-slate-900/50 p-2 rounded">
                planet_name, pl_rade, pl_eqt, pl_insol, pl_orbper, st_teff, st_rad, st_mass
              </div>
              <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 
                           text-white rounded-lg transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                Download Sample Template
              </button>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        {!results && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 mb-8">
            {/* Drag and Drop Area */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-all ${
                dragActive
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-slate-600 hover:border-slate-500'
              }`}
            >
              {!file ? (
                <>
                  <UploadIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <p className="text-white text-lg mb-2">
                    Drag and drop your CSV file here
                  </p>
                  <p className="text-slate-400 mb-4">or</p>
                  <label className="inline-block px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white 
                                    rounded-lg cursor-pointer transition-colors">
                    Browse Files
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => handleFileChange(e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                  <p className="text-slate-500 text-sm mt-4">
                    Maximum file size: 5MB
                  </p>
                </>
              ) : (
                <div className="flex items-center justify-center gap-4">
                  <FileText className="w-12 h-12 text-cyan-400" />
                  <div className="text-left">
                    <p className="text-white font-medium">{file.name}</p>
                    <p className="text-slate-400 text-sm">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <button
                    onClick={handleClear}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400 hover:text-white" />
                  </button>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg 
                              flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-red-200">{error}</p>
              </div>
            )}

            {/* Upload Button */}
            {file && !error && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleUpload}
                  disabled={processing}
                  className="flex items-center gap-2 px-8 py-3 bg-cyan-500 hover:bg-cyan-600 
                             text-white rounded-lg transition-all disabled:opacity-50 
                             disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
                >
                  {processing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent 
                                      rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <UploadIcon className="w-5 h-5" />
                      Upload and Process
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Results Section */}
        {results && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="bg-slate-800/50 border border-slate-700 rounded-xl p-8">
            {/* Success Header */}
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-700">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <div>
                <h2 className="text-2xl font-bold text-white">Processing Complete!</h2>
                <p className="text-slate-400">
                  Successfully processed {results.processed} exoplanets from your CSV file
                </p>
              </div>
            </div>

            {/* Results Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-slate-900/50 border border-slate-600 rounded-lg p-6">
                <div className="text-4xl font-bold text-white mb-2">{results.totalPlanets}</div>
                <div className="text-slate-400 text-sm">Total Exoplanets</div>
              </div>

              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
                <div className="text-4xl font-bold text-green-400 mb-2">
                  {results.habitableCount}
                </div>
                <div className="text-green-300 text-sm">Potentially Habitable</div>
              </div>

              <div className="bg-slate-900/50 border border-slate-600 rounded-lg p-6">
                <div className="text-4xl font-bold text-white mb-2">
                  {(results.averageScore * 100).toFixed(0)}%
                </div>
                <div className="text-slate-400 text-sm">Average Habitability Score</div>
              </div>
            </div>

            {/* Download Results */}
            <div className="flex gap-4">
              <button
                onClick={handleDownloadResults}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 
                           bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg 
                           transition-colors shadow-lg shadow-cyan-500/20"
              >
                <Download className="w-5 h-5" />
                Download Results (CSV)
              </button>

              <button
                onClick={handleClear}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg 
                           transition-colors"
              >
                Upload Another File
              </button>
            </div>

            {/* Processing Note */}
            <div className="mt-6 p-4 bg-slate-900/50 border border-slate-600 rounded-lg">
              <p className="text-slate-400 text-sm text-center">
                📊 The results CSV includes all input parameters plus predicted habitability scores
                and classifications for each exoplanet.
              </p>
            </div>
          </motion.div>
        )}

        {/* Info Section */}
        <div className="mt-12 bg-slate-800/30 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-3">How It Works</h3>
          <ol className="space-y-2 text-slate-300">
            <li className="flex gap-3">
              <span className="text-cyan-400 font-bold">1.</span>
              <span>Download the CSV template to see the required format</span>
            </li>
            <li className="flex gap-3">
              <span className="text-cyan-400 font-bold">2.</span>
              <span>Fill in your planet parameters (radius, temperature, orbital period, etc.)</span>
            </li>
            <li className="flex gap-3">
              <span className="text-cyan-400 font-bold">3.</span>
              <span>Upload your CSV file using the upload area above</span>
            </li>
            <li className="flex gap-3">
              <span className="text-cyan-400 font-bold">4.</span>
              <span>Our AI models will analyze each planet and predict habitability scores</span>
            </li>
            <li className="flex gap-3">
              <span className="text-cyan-400 font-bold">5.</span>
              <span>Download the results CSV with predictions for all planets</span>
            </li>
          </ol>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Upload;
