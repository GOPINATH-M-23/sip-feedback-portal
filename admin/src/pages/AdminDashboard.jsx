import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import adminApi from '../api/adminApi';
import adminConfig from '../config/adminConfig';
import SurveyAnalytics from '../components/SurveyAnalytics';
import ExcelToBarGraphReport from '../components/ExcelToBarGraphReport';
import {
  LogOut,
  RefreshCw,
  Download,
  Search,
  Filter,
  Users,
  CheckCircle2,
  FileSpreadsheet,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Building2,
  Calendar,
  Sparkles,
  Printer
} from 'lucide-react';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showQuestionsRef, setShowQuestionsRef] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    if (!adminApi.isAdmin()) {
      navigate('/');
      return;
    }
    loadData();
  }, [navigate]);

  const loadData = async () => {
    setLoading(true);
    const data = await adminApi.getFeedback();
    setFeedbacks(data);
    setLoading(false);
  };

  const handleLogout = () => {
    adminApi.logout();
    navigate('/');
  };

  // Filtered feedback list
  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter(item => {
      // Department filter
      if (selectedDept && item.dept?.toUpperCase() !== selectedDept.toUpperCase()) {
        return false;
      }
      // Day filter
      if (selectedDay && item.day !== selectedDay) {
        return false;
      }
      // Search query filter (matches name, reg, dept, session topic, answers)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const nameMatch = item.name?.toLowerCase().includes(query);
        const regMatch = item.reg?.toLowerCase().includes(query);
        const deptMatch = item.dept?.toLowerCase().includes(query);
        const topicMatch = item.session?.topic?.toLowerCase().includes(query);
        const slotMatch = item.slot?.toLowerCase().includes(query);
        return nameMatch || regMatch || deptMatch || topicMatch || slotMatch;
      }
      return true;
    });
  }, [feedbacks, selectedDept, selectedDay, searchQuery]);

  // Department statistics breakdown
  const deptStats = useMemo(() => {
    const counts = {};
    adminConfig.DEPARTMENTS.forEach(dept => {
      counts[dept] = 0;
    });

    feedbacks.forEach(item => {
      const d = item.dept?.toUpperCase();
      if (d && counts[d] !== undefined) {
        counts[d] += 1;
      } else if (d) {
        counts[d] = (counts[d] || 0) + 1;
      }
    });
    return counts;
  }, [feedbacks]);

  // Export filtered feedback data to Excel (.xlsx)
  const exportToExcel = () => {
    if (filteredFeedbacks.length === 0) {
      alert("No data available to export.");
      return;
    }

    const exportData = filteredFeedbacks.map((item, index) => {
      const answers = item.answers || [];
      return {
        "S.No": index + 1,
        "Academic Year": item.academicYear || "2026",
        "Student Name": item.name || "N/A",
        "Department": item.dept || "N/A",
        "Slot": item.slot || "N/A",
        "Day": item.day || "N/A",
        "Session Topic": item.session?.topic || "N/A",
        "Session Time": item.session?.time || "N/A",
        "Session Venue": item.session?.venue || "N/A",
        "Q1 (Overall Session)": answers[0] || "N/A",
        "Q2 (Clarity)": answers[1] || "N/A",
        "Q3 (Interaction)": answers[2] || "N/A",
        "Q4 (Expected Info)": answers[3] || "N/A",
        "Q5 (Expectations)": answers[4] || "N/A",
        "Q6 (Suggestions/Questions/Feedback)": answers[5] || answers[answers.length - 1] || "N/A",
        "Submitted At": item.submitted_at ? new Date(item.submitted_at).toLocaleString() : "N/A"
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "SIP Feedback Responses");

    // Auto-fit column widths
    const max_width = exportData.reduce((w, r) => {
      return Object.keys(r).map((key, i) => {
        const val = String(r[key] || '');
        return Math.max(w[i] || 10, val.length + 3);
      });
    }, []);
    worksheet['!cols'] = max_width.map(w => ({ wch: w }));

    const fileName = `SIP_Feedback_Report_${selectedDept || 'AllDepts'}_${selectedDay || 'AllDays'}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Reset all filters
  const resetFilters = () => {
    setSelectedDept('');
    setSelectedDay('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredFeedbacks.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredFeedbacks.slice(start, start + itemsPerPage);
  }, [filteredFeedbacks, currentPage]);

  return (
    <div className="min-h-screen p-4 sm:p-8">
      {/* Top Header Navigation */}
      <header className="max-w-7xl mx-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-5 mb-6 border border-white/40 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <img
            src="/images/college_logo.png"
            alt="College Logo"
            className="w-14 h-auto rounded-lg shadow"
          />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
              <span>{adminConfig.PORTAL_TITLE}</span>
              <span className="text-xs bg-yellow-100 text-yellow-800 font-semibold px-2.5 py-0.5 rounded-full border border-yellow-300">
                2026
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 font-medium">
              {adminConfig.COLLEGE_NAME} • {adminConfig.PROGRAM_NAME}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-xl transition cursor-pointer text-sm"
            title="Refresh submissions data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-xl shadow transition cursor-pointer text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Feedback Questions Reference Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-white/40 overflow-hidden">
          <button
            onClick={() => setShowQuestionsRef(!showQuestionsRef)}
            className="w-full p-4 bg-gradient-to-r from-yellow-500 to-amber-500 text-white font-bold flex justify-between items-center cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              <span>Feedback Questions Reference Guide (Q1 – Q6)</span>
            </div>
            {showQuestionsRef ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {showQuestionsRef && (
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 bg-amber-50/50 text-sm">
              {Object.entries(adminConfig.QUESTIONS).map(([code, text]) => (
                <div key={code} className="p-3 bg-white rounded-xl border border-amber-200/60 shadow-sm flex items-start gap-2.5">
                  <span className="font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded text-xs shrink-0">
                    {code}
                  </span>
                  <span className="text-gray-700 font-medium leading-snug">{text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary Stats Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-yellow-500 to-amber-600 text-white rounded-2xl shadow-lg p-6 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-semibold text-amber-100">Total Feedback Submissions</span>
              <Users className="w-7 h-7 text-amber-200" />
            </div>
            <div>
              <div className="text-4xl font-extrabold">{feedbacks.length}</div>
              <p className="text-xs text-amber-100 mt-1 font-medium">
                {filteredFeedbacks.length} responses matching active filters
              </p>
            </div>
          </div>

          <div className="lg:col-span-3 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg p-5 border border-white/40">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
                <Building2 className="w-5 h-5 text-yellow-600" />
                <span>Department Submissions Breakdown</span>
              </h3>
              <span className="text-xs text-gray-500 font-medium">13 Departments</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {adminConfig.DEPARTMENTS.map(dept => {
                const count = deptStats[dept] || 0;
                const isSelected = selectedDept === dept;
                return (
                  <button
                    key={dept}
                    onClick={() => setSelectedDept(isSelected ? '' : dept)}
                    className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                      isSelected
                        ? 'bg-yellow-500 text-white border-yellow-600 shadow-md font-bold'
                        : 'bg-gray-50 hover:bg-yellow-50 border-gray-200 text-gray-700'
                    }`}
                  >
                    <div className="text-xs font-semibold uppercase tracking-wider">{dept}</div>
                    <div className="text-lg font-bold mt-0.5">{count}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg p-5 border border-white/40 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto flex-1">
            {/* Filter by Day */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-yellow-600" /> Filter by Day
              </label>
              <select
                value={selectedDay}
                onChange={(e) => {
                  setSelectedDay(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white"
              >
                <option value="">All Days</option>
                {adminConfig.DAYS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Department */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-yellow-600" /> Filter by Department
              </label>
              <select
                value={selectedDept}
                onChange={(e) => {
                  setSelectedDept(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white"
              >
                <option value="">All Departments</option>
                {adminConfig.DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Live Search Input */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                <Search className="w-3.5 h-3.5 text-yellow-600" /> Search Submissions
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search name, dept, topic..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full p-2.5 pr-8 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            {(selectedDept || selectedDay || searchQuery) && (
              <button
                onClick={resetFilters}
                className="px-3.5 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
              >
                Reset Filters
              </button>
            )}

            <button
              onClick={exportToExcel}
              disabled={filteredFeedbacks.length === 0}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl shadow hover:shadow-lg transition cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel ({filteredFeedbacks.length})</span>
            </button>
          </div>
        </div>

        {/* Matplotlib Style 3x2 Excel Bar Graph Converter & PDF Generator */}
        <ExcelToBarGraphReport
          filteredFeedbacks={filteredFeedbacks}
          selectedDept={selectedDept}
          selectedDay={selectedDay}
        />

        {/* Bar Graph Survey Analytics & PDF Export */}
        <SurveyAnalytics
          filteredFeedbacks={filteredFeedbacks}
          selectedDept={selectedDept}
          selectedDay={selectedDay}
        />

        {/* Feedback Responses Data Table */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/40 overflow-hidden">
          <div className="p-5 border-b flex justify-between items-center bg-gray-50/80">
            <div>
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Feedback Submissions ({filteredFeedbacks.length})</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Showing page {currentPage} of {totalPages}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-yellow-500 mb-3" />
              <p className="font-semibold text-base">Loading feedback submissions...</p>
            </div>
          ) : paginatedData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 text-xs font-bold uppercase tracking-wider border-b">
                    <th className="p-3.5 pl-5">#</th>
                    <th className="p-3.5">Student Details</th>
                    <th className="p-3.5">Day & Session Topic</th>
                    <th className="p-3.5">Q1</th>
                    <th className="p-3.5">Q2</th>
                    <th className="p-3.5">Q3</th>
                    <th className="p-3.5">Q4</th>
                    <th className="p-3.5">Q5</th>
                    <th className="p-3.5">Q6</th>
                    <th className="p-3.5 pr-5 min-w-[200px]">Suggestions / Feedback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {paginatedData.map((item, index) => {
                    const serialNo = (currentPage - 1) * itemsPerPage + index + 1;
                    const answers = item.answers || [];
                    const q7Text = answers[6] || answers[answers.length - 1] || '-';

                    return (
                      <tr key={item._id || index} className="hover:bg-yellow-50/40 transition">
                        <td className="p-3.5 pl-5 font-semibold text-gray-500 text-xs">
                          {serialNo}
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-gray-900">{item.name || 'Anonymous'}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <span className="font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                              {item.dept}
                            </span>
                            {item.slot && <span className="text-gray-400">• {item.slot}</span>}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-gray-800 max-w-xs truncate">
                            {item.session?.topic || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                            <span className="font-medium bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                              {item.day}
                            </span>
                            {item.session?.time && <span className="text-gray-400">({item.session.time})</span>}
                          </div>
                        </td>
                        <td className="p-3.5 font-medium text-xs text-gray-700">{answers[0] || '-'}</td>
                        <td className="p-3.5 font-medium text-xs text-gray-700">{answers[1] || '-'}</td>
                        <td className="p-3.5 font-medium text-xs text-gray-700">{answers[2] || '-'}</td>
                        <td className="p-3.5 font-medium text-xs text-gray-700">{answers[3] || '-'}</td>
                        <td className="p-3.5 font-medium text-xs text-gray-700">{answers[4] || '-'}</td>
                        <td className="p-3.5 font-medium text-xs text-gray-700">{answers[5] || '-'}</td>
                        <td className="p-3.5 pr-5 text-xs text-gray-700 max-w-xs italic leading-relaxed">
                          {q7Text}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <Sparkles className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="font-semibold text-base">No feedback submissions found matching your active filters.</p>
              <button
                onClick={resetFilters}
                className="mt-3 text-xs text-yellow-700 font-bold underline cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
          )}

          {/* Table Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-3.5 py-1.5 text-xs font-bold bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 cursor-pointer"
              >
                Previous
              </button>
              <span className="text-xs font-semibold text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3.5 py-1.5 text-xs font-bold bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
