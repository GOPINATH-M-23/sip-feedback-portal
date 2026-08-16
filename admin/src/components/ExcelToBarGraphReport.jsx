import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Upload,
  FileSpreadsheet,
  BarChart2,
  Printer,
  Sparkles,
  RefreshCw,
  FileText,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import adminConfig from '../config/adminConfig';

export const ExcelToBarGraphReport = ({ filteredFeedbacks, selectedDept, selectedDay }) => {
  const [fileName, setFileName] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const chartGridRef = useRef(null);

  // 5 target survey questions
  const questionsList = [
    { code: 'Q1', title: 'Opinion about overall session' },
    { code: 'Q2', title: 'Clarity in the speech' },
    { code: 'Q3', title: "Speaker's interaction with the students" },
    { code: 'Q4', title: 'Was the session informative and clear?' },
    { code: 'Q5', title: 'Did the session meet your expectations?' }
  ];

  // Default response categories matching Matplotlib screenshot
  const categories = ['Poor', 'Average', 'Good', 'Very Good'];

  // Handle uploaded Excel file (.xlsx)
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        if (json && json.length > 0) {
          setParsedData(json);
        } else {
          alert("Uploaded Excel file is empty or could not be parsed.");
        }
      } catch (err) {
        console.error("Error parsing Excel file:", err);
        alert("Failed to parse Excel file. Please ensure it is a valid .xlsx file.");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Switch back to active dashboard filtered data
  const handleUseDashboardData = () => {
    setParsedData(null);
    setFileName('');
  };

  // Process rows into counts & percentages for Q1-Q5
  const chartData = useMemo(() => {
    const sourceRows = parsedData || filteredFeedbacks || [];

    return questionsList.map((q, qIndex) => {
      const counts = { 'Poor': 0, 'Average': 0, 'Good': 0, 'Very Good': 0 };
      let totalCount = 0;

      sourceRows.forEach(row => {
        // If parsed from Excel JSON object or from API answers array
        let rawVal = '';

        if (parsedData) {
          // Check common column keys in exported Excel
          const colKeys = Object.keys(row);
          const matchedKey = colKeys.find(k =>
            k.toLowerCase().includes(q.code.toLowerCase()) ||
            k.toLowerCase().includes(q.title.toLowerCase().substring(0, 10))
          );
          if (matchedKey) {
            rawVal = row[matchedKey];
          } else {
            // Fallback by column order
            rawVal = row[colKeys[qIndex + 6]] || row[colKeys[qIndex + 1]] || '';
          }
        } else {
          const answers = row.answers || [];
          rawVal = answers[qIndex];
        }

        if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
          const strVal = String(rawVal).trim().toLowerCase();

          if (strVal.includes('poor') || strVal === '1') {
            counts['Poor'] += 1;
          } else if (strVal.includes('average') || strVal === '2') {
            counts['Average'] += 1;
          } else if (strVal.includes('very good') || strVal.includes('excellent') || strVal === '4') {
            counts['Very Good'] += 1;
          } else if (strVal.includes('good') || strVal === '3') {
            counts['Good'] += 1;
          } else {
            counts['Good'] += 1; // Default fallthrough
          }
          totalCount += 1;
        }
      });

      return {
        ...q,
        counts,
        totalCount
      };
    });
  }, [parsedData, filteredFeedbacks]);

  // Export 3x2 Matplotlib Chart Grid to PDF
  const exportChartGridToPdf = async () => {
    if (!chartGridRef.current) return;

    setIsProcessing(true);
    try {
      const element = chartGridRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
          const allEls = clonedDoc.querySelectorAll('*');
          allEls.forEach(el => {
            const view = clonedDoc.defaultView || window;
            const comp = view.getComputedStyle(el);
            
            // Override styles inline if they contain oklch
            if (comp.backgroundColor && comp.backgroundColor.includes('oklch')) {
              el.style.backgroundColor = '#ffffff';
            }
            if (comp.color && comp.color.includes('oklch')) {
              el.style.color = '#000000';
            }
            if (comp.borderColor && comp.borderColor.includes('oklch')) {
              el.style.borderColor = '#000000';
            }
          });
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape orientation like screenshot
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pdfWidth - 20; // 10mm margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 10, 10, imgWidth, Math.min(imgHeight, pdfHeight - 20));
      const titleName = fileName || `Survey_Responses_${selectedDept || 'All'}_${selectedDay || 'All'}.pdf`;
      pdf.save(titleName.replace('.xlsx', '') + '_BarGraphs.pdf');
    } catch (err) {
      console.error("PDF Export error:", err);
      alert("Failed to export PDF chart grid.");
    } finally {
      setIsProcessing(false);
    }
  };

  const activeTitle = fileName
    ? `Survey Responses from ${fileName}`
    : `Survey Responses from ${selectedDept || 'All Departments'} - ${selectedDay || 'All Days'} (${filteredFeedbacks.length} records)`;

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/40 overflow-hidden mb-6">
      {/* Top Header & Controls */}
      <div className="p-5 border-b bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <BarChart2 className="w-5 h-5" />
            <span>Excel Feedback Bar Graph Extraction (Matplotlib Style)</span>
          </h2>
          <p className="text-xs text-blue-100 mt-0.5">
            Extracts survey feedback columns from Excel files or active dashboard data into 3x2 bar chart figures
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Upload Excel Button */}
          <label className="flex items-center gap-2 bg-white text-blue-900 hover:bg-blue-50 font-bold py-2 px-3.5 rounded-xl shadow cursor-pointer text-xs transition">
            <Upload className="w-4 h-4 text-blue-700" />
            <span>{fileName ? "Change Excel File" : "Extract from Excel File (.xlsx)"}</span>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {parsedData && (
            <button
              onClick={handleUseDashboardData}
              className="px-3 py-2 bg-blue-800 hover:bg-blue-900 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Use Dashboard Filtered Data
            </button>
          )}

          <button
            onClick={exportChartGridToPdf}
            disabled={isProcessing}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-3.5 rounded-xl shadow transition cursor-pointer text-xs disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>Export Bar Graph PDF</span>
          </button>
        </div>
      </div>

      {/* Main Matplotlib Style 3x2 Chart Figure Container */}
      <div className="p-6 bg-white overflow-x-auto">
        <div
          ref={chartGridRef}
          style={{ backgroundColor: '#ffffff', minWidth: '950px', padding: '24px' }}
          className="mx-auto space-y-6"
        >
          {/* Main Top Figure Title */}
          <div className="text-center">
            <h1 style={{ color: '#000000', fontSize: '20px', fontWeight: 'bold' }}>
              {activeTitle}
            </h1>
          </div>

          {/* 3 Columns x 2 Rows Grid of Vertical Bar Charts */}
          <div className="grid grid-cols-3 gap-x-8 gap-y-10">
            {chartData.map((q) => {
              // Calculate dynamic max height for Y-axis scaling (e.g. 200)
              const maxVal = Math.max(...Object.values(q.counts), 1);
              let yAxisMax = 200;
              if (maxVal > 200) yAxisMax = Math.ceil(maxVal / 50) * 50;
              if (maxVal < 50) yAxisMax = 50;

              const yTicks = [0, yAxisMax * 0.25, yAxisMax * 0.5, yAxisMax * 0.75, yAxisMax];

              return (
                <div key={q.code} className="flex flex-col items-center">
                  {/* Subplot Title */}
                  <div className="text-center h-12 flex items-center justify-center mb-2 px-2">
                    <h3 style={{ color: '#000000', fontSize: '13px', fontWeight: 'bold', lineHeight: '1.2' }}>
                      {q.title}
                    </h3>
                  </div>

                  {/* Matplotlib Plot Area Container */}
                  <div className="w-full flex items-stretch" style={{ height: '220px' }}>
                    {/* Y-Axis Label & Ticks */}
                    <div className="flex items-center mr-1">
                      <span
                        style={{
                          transform: 'rotate(-90deg)',
                          fontSize: '11px',
                          color: '#000000',
                          fontWeight: '500',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Count
                      </span>
                    </div>

                    <div className="flex flex-col justify-between items-end pr-1 text-[10px] text-black font-mono" style={{ height: '180px', marginTop: '10px' }}>
                      {yTicks.slice().reverse().map(tick => (
                        <span key={tick}>{Math.round(tick)}</span>
                      ))}
                    </div>

                    {/* Chart Plot Area Box with Crisp Black Border */}
                    <div
                      className="flex-1 relative flex items-end justify-around px-3 pt-6 pb-0 border-l border-b border-r border-t border-black"
                      style={{ height: '190px', backgroundColor: '#ffffff' }}
                    >
                      {/* Horizontal Grid lines (optional light gray) */}
                      {yTicks.slice(1, -1).map(tick => {
                        const bottomPct = (tick / yAxisMax) * 100;
                        return (
                          <div
                            key={tick}
                            className="absolute left-0 right-0 border-t border-gray-100 pointer-events-none"
                            style={{ bottom: `${bottomPct}%` }}
                          ></div>
                        );
                      })}

                      {/* Render Vertical Bars */}
                      {categories.map(cat => {
                        const count = q.counts[cat] || 0;
                        const pct = q.totalCount > 0 ? ((count / q.totalCount) * 100).toFixed(1) : '0.0';
                        const barHeightPct = (count / yAxisMax) * 100;

                        return (
                          <div key={cat} className="flex flex-col items-center relative flex-1 max-w-[55px] h-full justify-end">
                            {/* Data Annotation above bar (Count & Percentage) */}
                            <div
                              className="text-center absolute w-20 pointer-events-none"
                              style={{
                                bottom: `${Math.min(barHeightPct + 2, 82)}%`,
                                color: '#000000',
                                fontSize: '10px',
                                lineHeight: '1.1'
                              }}
                            >
                              <div style={{ fontWeight: 'bold' }}>{count}</div>
                              <div style={{ fontWeight: '600' }}>({pct}%)</div>
                            </div>

                            {/* Vertical Blue Bar Column (#1f77b4 - Matplotlib Default Blue) */}
                            <div
                              className="w-full transition-all duration-300 shadow-sm"
                              style={{
                                height: `${Math.max(barHeightPct, 2)}%`,
                                backgroundColor: '#1f77b4',
                                borderRadius: '1px 1px 0 0'
                              }}
                            ></div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* X-Axis Ticks (Categories) */}
                  <div className="w-full pl-10 pr-2 flex justify-around text-[11px] text-black font-semibold mt-1">
                    {categories.map(cat => (
                      <span key={cat} className="w-14 text-center">{cat}</span>
                    ))}
                  </div>

                  {/* X-Axis Label */}
                  <div className="text-center mt-1">
                    <span style={{ fontSize: '11px', color: '#000000', fontWeight: '500' }}>
                      Response
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExcelToBarGraphReport;
