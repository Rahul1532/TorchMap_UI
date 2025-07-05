import axios from "axios";
import { useEffect, useState } from "react";
import "./App.css";

const BACKEND_URL = "https://qual-manager-api.onrender.com";
const API = `${BACKEND_URL}/api`;

function App() {
  const [csvFiles, setCsvFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [csvData, setCsvData] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterReviewed, setFilterReviewed] = useState(null);
  const [columnFilters, setColumnFilters] = useState({});
  const [showColumnFilters, setShowColumnFilters] = useState(false);
  const [columnData, setColumnData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    fetchCSVFiles();
  }, []);

  const fetchCSVFiles = async () => {
    try {
      const response = await axios.get(`${API}/csv-files`);
      setCsvFiles(response.data);
    } catch (error) {
      console.error("Error fetching CSV files:", error);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(`${API}/upload-csv`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      alert(`CSV uploaded successfully! ${response.data.row_count} rows imported.`);
      await fetchCSVFiles();
      event.target.value = "";
    } catch (error) {
      console.error("Error uploading CSV:", error);
      alert("Error uploading CSV file");
    } finally {
      setIsUploading(false);
    }
  };

  const loadCSVData = async (csvId) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterReviewed !== null) params.append("reviewed_only", filterReviewed);
      if (searchTerm) params.append("search_term", searchTerm);
      if (Object.keys(columnFilters).length > 0) {
        params.append("column_filters", JSON.stringify(columnFilters));
      }

      const response = await axios.get(`${API}/csv-data/${csvId}?${params}`);
      setCsvData(response.data);
      setSelectedRows([]);

      // Load column data for filters
      const columnResponse = await axios.get(`${API}/csv-columns/${csvId}`);
      setColumnData(columnResponse.data);
    } catch (error) {
      console.error("Error loading CSV data:", error);
      alert("Error loading CSV data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRowSelect = (rowId) => {
    setSelectedRows(prev => 
      prev.includes(rowId) 
        ? prev.filter(id => id !== rowId)
        : [...prev, rowId]
    );
  };

  const handleSelectAll = () => {
    if (selectedRows.length === csvData.rows.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(csvData.rows.map(row => row.id));
    }
  };

  const markAsReviewed = async (isReviewed = true) => {
    if (selectedRows.length === 0) {
      alert("Please select rows to mark as reviewed");
      return;
    }

    try {
      await axios.post(`${API}/update-review-status`, {
        row_ids: selectedRows,
        is_reviewed: isReviewed
      });
      
      alert(`${selectedRows.length} rows marked as ${isReviewed ? 'reviewed' : 'unreviewed'}`);
      await loadCSVData(selectedFile);
    } catch (error) {
      console.error("Error updating review status:", error);
      alert("Error updating review status");
    }
  };

  const exportReviewedData = async () => {
    if (!selectedFile) {
      alert("Please select a CSV file first");
      return;
    }

    try {
      const response = await axios.get(`${API}/export-reviewed/${selectedFile}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reviewed_${csvData.csv_file.filename}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting data:", error);
      alert("Error exporting reviewed data");
    }
  };

  const applyFilters = () => {
    if (selectedFile) {
      loadCSVData(selectedFile);
    }
  };

  const handleColumnFilterChange = (column, value) => {
    setColumnFilters(prev => ({
      ...prev,
      [column]: value
    }));
  };

  const clearColumnFilters = () => {
    setColumnFilters({});
    if (selectedFile) {
      loadCSVData(selectedFile);
    }
  };

  const clearAllFilters = () => {
    setColumnFilters({});
    setSearchTerm("");
    setFilterReviewed(null);
    if (selectedFile) {
      loadCSVData(selectedFile);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-2xl border-b border-slate-700">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  TorchMap
                </h1>
                <p className="text-sm text-slate-400"> Mapped Data Validator | Upload, review, and export your data with ease</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors duration-200"
                title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                <svg 
                  className={`w-5 h-5 text-slate-300 transition-transform duration-200 ${sidebarCollapsed ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
              <div className="hidden sm:flex items-center space-x-2 text-sm text-slate-400">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span>Ready to upload</span>
              </div>
              <label className="relative group cursor-pointer">
                <div className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 ${
                  isUploading 
                    ? "bg-gray-400 text-white cursor-not-allowed" 
                    : "bg-yellow-400 text-black hover:bg-yellow-600"
                }`}>
                  <div className="flex items-center space-x-2">
                    {isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span>Upload CSV</span>
                      </>
                    )}
                  </div>
                </div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-screen">
        {/* Left Sidebar */}
        <div className={`${sidebarCollapsed ? 'w-16' : 'w-80'} bg-gradient-to-b from-slate-800 to-slate-900 shadow-2xl border-r border-slate-700 overflow-y-auto transition-all duration-300 ease-in-out relative`}>
          
          {/* Sidebar Toggle Button */}
          <div className="absolute top-4 right-2 z-20">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors duration-200 shadow-lg"
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <svg 
                className={`w-4 h-4 text-slate-300 transition-transform duration-200 ${sidebarCollapsed ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* Sidebar Content */}
          <div className={`p-6 space-y-6 ${sidebarCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'} transition-opacity duration-300`}>
            
            {/* File Selection Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-yellow-400 rounded-lg flex items-center justify-center">
                  <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-white">Select CSV File</h2>
              </div>
              
              {csvFiles.length > 0 ? (
                <>
                  <select
                    value={selectedFile || ""}
                    onChange={(e) => {
                      if (e.target.value) {
                        setSelectedFile(e.target.value);
                        setColumnFilters({});
                        setSearchTerm("");
                        setFilterReviewed(null);
                        loadCSVData(e.target.value);
                      }
                    }}
                    className="w-full px-4 py-3 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-slate-700 text-white"
                  >
                    <option value="">Choose a CSV file...</option>
                    {csvFiles.map((file) => (
                      <option key={file.id} value={file.id}>
                        {file.filename} ({file.headers?.length || 0} columns)
                      </option>
                    ))}
                  </select>
                  
                  {selectedFile && (
                    <div className="bg-slate-700 px-3 py-2 rounded-lg">
                      <p className="text-sm text-slate-300">
                        <span className="font-medium text-yellow-400">Selected:</span> {csvFiles.find(f => f.id === selectedFile)?.filename}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {csvFiles.find(f => f.id === selectedFile)?.row_count || 0} rows
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-400">Upload your first CSV file to get started</p>
                </div>
              )}
            </div>

            {/* Filters Section */}
            {csvData && (
              <>
                <div className="border-t border-slate-700 pt-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-6 h-6 bg-yellow-400 rounded-lg flex items-center justify-center">
                      <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-white">Search & Filter</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Global Search */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Global Search</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          placeholder="Search across all data..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all bg-slate-700 text-white placeholder-slate-400"
                        />
                      </div>
                    </div>

                    {/* Status Filter */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Review Status</label>
                      <select
                        value={filterReviewed || ""}
                        onChange={(e) => setFilterReviewed(e.target.value === "" ? null : e.target.value === "true")}
                        className="w-full px-4 py-3 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all bg-slate-700 text-white"
                      >
                        <option value="">All Status</option>
                        <option value="true">✓ Reviewed Only</option>
                        <option value="false">⏳ Pending Only</option>
                      </select>
                    </div>

                    {/* Apply Filters Button */}
                    <button
                      onClick={applyFilters}
                      className="w-full px-4 py-3 bg-yellow-400 text-black rounded-xl hover:bg-yellow-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 font-medium"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>

                {/* Column Filters Section */}
                <div className="border-t border-slate-700 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-yellow-400 rounded-lg flex items-center justify-center">
                        <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-white">Column Filters</h3>
                    </div>
                    <button
                      onClick={() => setShowColumnFilters(!showColumnFilters)}
                      className="text-yellow-400 hover:text-yellow-300 transition-colors"
                    >
                      {showColumnFilters ? '🔽' : '▶️'}
                    </button>
                  </div>

                  {showColumnFilters && (
                    <div className="space-y-4">
                      {csvData.csv_file.headers.map((header) => (
                        <div key={header}>
                          <label className="block text-sm font-medium text-slate-300 mb-2 truncate" title={header}>
                            {header}
                          </label>
                          <select
                            value={columnFilters[header] || ""}
                            onChange={(e) => handleColumnFilterChange(header, e.target.value)}
                            className="w-full px-3 py-2.5 text-sm border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all bg-slate-700 text-white"
                          >
                            <option value="">All values</option>
                            {columnData[header]?.slice(0, 50).map((value) => (
                              <option key={value} value={value}>
                                {value.length > 25 ? `${value.substring(0, 25)}...` : value}
                              </option>
                            ))}
                            {columnData[header]?.length > 50 && (
                              <option disabled>... and {columnData[header].length - 50} more</option>
                            )}
                          </select>
                        </div>
                      ))}
                      
                      <div className="space-y-2 pt-2">
                        <button
                          onClick={applyFilters}
                          className="w-full px-4 py-2.5 bg-yellow-400 text-black rounded-xl hover:bg-yellow-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 font-medium"
                        >
                          🎯 Apply Column Filters
                        </button>
                        <button
                          onClick={clearColumnFilters}
                          className="w-full px-4 py-2.5 bg-slate-600 text-white rounded-xl hover:bg-slate-500 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 font-medium"
                        >
                          🔄 Clear Column Filters
                        </button>
                      </div>
                    </div>
                  )}

                  {Object.keys(columnFilters).length > 0 && (
                    <div className="mt-3 bg-yellow-400/20 text-yellow-300 px-3 py-2 rounded-lg text-sm">
                      {Object.keys(columnFilters).length} column filter{Object.keys(columnFilters).length !== 1 ? 's' : ''} active
                    </div>
                  )}
                </div>

                {/* Actions Section */}
                <div className="border-t border-slate-700 pt-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-6 h-6 bg-yellow-400 rounded-lg flex items-center justify-center">
                      <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-white">Actions</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {selectedRows.length > 0 && (
                      <div className="bg-yellow-400/20 text-yellow-300 px-3 py-2 rounded-lg text-sm font-medium text-center">
                        {selectedRows.length} row{selectedRows.length !== 1 ? 's' : ''} selected
                      </div>
                    )}
                    
                    <button
                      onClick={() => markAsReviewed(true)}
                      disabled={selectedRows.length === 0}
                      className="w-full px-4 py-3 bg-yellow-400 text-black rounded-xl hover:bg-yellow-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:-translate-y-0.5 font-medium"
                    >
                      ✓ Mark as Reviewed
                    </button>
                    
                    <button
                      onClick={() => markAsReviewed(false)}
                      disabled={selectedRows.length === 0}
                      className="w-full px-4 py-3 bg-yellow-400 text-black rounded-xl hover:bg-yellow-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:-translate-y-0.5 font-medium"
                    >
                      ✗ Mark as Unreviewed
                    </button>
                    
                    <button
                      onClick={exportReviewedData}
                      className="w-full px-4 py-3 bg-yellow-400 text-black rounded-xl hover:bg-yellow-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 font-medium"
                    >
                      📁 Export Reviewed Data
                    </button>
                    
                    {(Object.keys(columnFilters).length > 0 || searchTerm || filterReviewed !== null) && (
                      <button
                        onClick={clearAllFilters}
                        className="w-full px-4 py-3 bg-slate-600 text-white rounded-xl hover:bg-slate-500 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 font-medium"
                      >
                        🗑️ Clear All Filters
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Collapsed Sidebar Icons */}
          {sidebarCollapsed && (
            <div className="absolute inset-0 flex flex-col items-center pt-16 space-y-6">
              {/* File Icon */}
              <div className="p-3 bg-yellow-400 rounded-lg" title="CSV Files">
                <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              
              {csvData && (
                <>
                  {/* Search Icon */}
                  <div className="p-3 bg-slate-700 rounded-lg" title="Search & Filter">
                    <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  
                  {/* Filter Icon */}
                  <div className="p-3 bg-slate-700 rounded-lg" title="Column Filters">
                    <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
                    </svg>
                  </div>
                  
                  {/* Actions Icon */}
                  <div className="p-3 bg-slate-700 rounded-lg" title="Actions">
                    <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                    </svg>
                  </div>

                  {/* Selected rows indicator when collapsed */}
                  {selectedRows.length > 0 && (
                    <div className="bg-yellow-400 text-black rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold" title={`${selectedRows.length} rows selected`}>
                      {selectedRows.length}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          {csvData ? (
            <div className="h-full flex flex-col">
              {/* Table Header */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 border-b border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5h8M8 3h8" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">
                        {csvData.csv_file.filename}
                      </h3>
                      <p className="text-sm text-slate-400">
                        {isLoading ? "Loading..." : `${csvData.rows.length} row${csvData.rows.length !== 1 ? 's' : ''} displayed • ${csvData.csv_file.headers.length} columns`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-4">
                      {csvData.rows.filter(row => row.is_reviewed).length > 0 && (
                        <div className="flex items-center space-x-2 text-emerald-400">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          <span className="text-sm font-medium">
                            {csvData.rows.filter(row => row.is_reviewed).length} reviewed
                          </span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2 text-slate-400">
                        <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                        <span className="text-sm">
                          {csvData.rows.filter(row => !row.is_reviewed).length} pending
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table Content */}
              <div className="flex-1 overflow-auto bg-gradient-to-r from-slate-800 to-slate-900">
                {isLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="inline-flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
                      <span className="text-slate-400 font-medium text-lg">Loading your data...</span>
                    </div>
                  </div>
                ) : csvData.rows.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-medium text-white mb-2">No data found</h3>
                      <p className="text-slate-400">No rows match your current filters. Try adjusting your search criteria.</p>
                    </div>
                  </div>
                ) : (
                  <div className="min-w-full">
                    <table className="min-w-full divide-y divide-slate-700">
                      <thead className="bg-gradient-to-r from-slate-900 to-slate-800 sticky top-0 z-10">
                        <tr>
                          <th className="sticky left-0 bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider border-r border-slate-700 z-20">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={selectedRows.length === csvData.rows.length && csvData.rows.length > 0}
                                onChange={handleSelectAll}
                                className="h-4 w-4 text-yellow-400 focus:ring-yellow-400 border-slate-600 rounded transition-colors bg-slate-700"
                              />
                              <span>Select</span>
                            </div>
                          </th>
                          <th className="sticky left-28 bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider border-r border-slate-700 z-20">
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"></div>
                              <span>Status</span>
                            </div>
                          </th>
                          {csvData.csv_file.headers.map((header, index) => (
                            <th
                              key={header}
                              className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider border-r border-slate-700 last:border-r-0 min-w-40"
                            >
                              <div className="flex items-center space-x-2">
                                <span className="truncate" title={header}>{header}</span>
                                {columnFilters[header] && (
                                  <div className="flex-shrink-0">
                                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" title="Filtered"></div>
                                  </div>
                                )}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-gradient-to-r from-slate-800 to-slate-900 divide-y divide-slate-700">
                        {csvData.rows.map((row, rowIndex) => (
                          <tr
                            key={row.id}
                            className={`transition-all duration-150 hover:bg-slate-700 ${
                              selectedRows.includes(row.id) 
                                ? "bg-gradient-to-r from-yellow-400/20 to-yellow-500/20 border-l-4 border-yellow-400" 
                                : rowIndex % 2 === 0 ? "bg-slate-800" : "bg-slate-850"
                            }`}
                          >
                            <td className="sticky left-0 bg-inherit px-6 py-4 whitespace-nowrap border-r border-slate-700 z-10">
                              <input
                                type="checkbox"
                                checked={selectedRows.includes(row.id)}
                                onChange={() => handleRowSelect(row.id)}
                                className="h-4 w-4 text-yellow-400 focus:ring-yellow-400 border-slate-600 rounded transition-colors bg-slate-700"
                              />
                            </td>
                            <td className="sticky left-28 bg-inherit px-6 py-4 whitespace-nowrap border-r border-slate-700 z-10">
                              <div className="flex items-center space-x-2">
                                <div
                                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                    row.is_reviewed
                                      ? "bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/50"
                                      : "bg-slate-600"
                                  }`}
                                />
                                <span className={`text-xs font-medium ${
                                  row.is_reviewed ? "text-emerald-400" : "text-slate-500"
                                }`}>
                                  {row.is_reviewed ? "✓" : "⏳"}
                                </span>
                              </div>
                            </td>
                            {csvData.csv_file.headers.map((header) => (
                              <td
                                key={header}
                                className="px-6 py-4 text-sm text-slate-300 border-r border-slate-700 last:border-r-0 max-w-60"
                              >
                                <div className="truncate" title={row.row_data[header] || ""}>
                                  {row.row_data[header] || (
                                    <span className="text-slate-500 italic">—</span>
                                  )}
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Table Footer */}
              {csvData.rows.length > 0 && (
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 border-t border-slate-700">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-6 text-slate-400">
                      <span>
                        Showing <span className="font-medium text-white">{csvData.rows.length}</span> row{csvData.rows.length !== 1 ? 's' : ''}
                      </span>
                      <span>
                        <span className="font-medium text-white">{csvData.csv_file.headers.length}</span> column{csvData.csv_file.headers.length !== 1 ? 's' : ''}
                      </span>
                      {(Object.keys(columnFilters).length > 0 || searchTerm || filterReviewed !== null) && (
                        <span className="text-yellow-400 font-medium">
                          • Filtered results
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center bg-gradient-to-r from-slate-800 to-slate-900">
              <div className="text-center">
                <div className="w-24 h-24 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-medium text-white mb-3">Select a CSV File</h3>
                <p className="text-slate-400 max-w-md mx-auto">
                  Choose a CSV file from the sidebar to view and manage your data. You can upload, filter, review, and export your data efficiently.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
