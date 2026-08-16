import React, { useRef, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  BarChart,
  Printer
} from 'lucide-react';
import adminConfig from '../config/adminConfig';

export const SurveyAnalytics = ({ filteredFeedbacks, selectedDept, selectedDay }) => {
  const reportRef = useRef(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Compute rating metrics for Q1 through Q5
  const questionKeys = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'];
  const ratingCategories = ['Excellent', 'Very Good', 'Good', 'Average', 'Poor'];

  const analyticsData = questionKeys.map((qKey, qIndex) => {
    const counts = { 'Excellent': 0, 'Very Good': 0, 'Good': 0, 'Average': 0, 'Poor': 0 };
    let totalRated = 0;

    filteredFeedbacks.forEach(item => {
      const answers = item.answers || [];
      const val = answers[qIndex];
      if (val !== undefined && val !== null && val !== '') {
        const strVal = String(val).trim();
        if (counts[strVal] !== undefined) {
          counts[strVal] += 1;
        } else if (strVal === '4' || strVal.toLowerCase().includes('excellent')) {
          counts['Excellent'] += 1;
        } else if (strVal === '3' || strVal.toLowerCase().includes('very good')) {
          counts['Very Good'] += 1;
        } else if (strVal === '2' || strVal.toLowerCase().includes('good')) {
          counts['Good'] += 1;
        } else if (strVal === '1' || strVal.toLowerCase().includes('average')) {
          counts['Average'] += 1;
        } else if (strVal.toLowerCase().includes('poor')) {
          counts['Poor'] += 1;
        } else {
          counts['Good'] += 1;
        }
        totalRated += 1;
      }
    });

    const questionTitle = adminConfig.QUESTIONS[qKey] || `Question ${qIndex + 1}`;

    return {
      qKey,
      qIndex,
      title: questionTitle,
      counts,
      totalRated
    };
  });

  // Handle Export to PDF with html2canvas fallback for Tailwind CSS v4 oklch colors
  const handleExportPdf = async () => {
    if (filteredFeedbacks.length === 0) {
      alert("No survey feedback data available to generate PDF.");
      return;
    }

    setGeneratingPdf(true);
    try {
      const element = reportRef.current;
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          // Convert any oklch color references in cloned document to safe RGB/HEX
          const allEls = clonedDoc.querySelectorAll('*');
          allEls.forEach(el => {
            const comp = clonedDoc.defaultView.getComputedStyle(el);
            if (comp.backgroundColor && comp.backgroundColor.includes('oklch')) {
              el.style.backgroundColor = '#ffffff';
            }
            if (comp.color && comp.color.includes('oklch')) {
              el.style.color = '#111827';
            }
            if (comp.borderColor && comp.borderColor.includes('oklch')) {
              el.style.borderColor = '#e5e7eb';
            }
          });
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const fileName = `SIP_Survey_BarGraph_Report_${selectedDept || 'AllDepts'}_${selectedDay || 'AllDays'}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Could not generate PDF report. Please try again.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const colors = {
    'Excellent': { hex: '#10b981', textHex: '#047857', bgHex: '#ecfdf5' },
    'Very Good': { hex: '#3b82f6', textHex: '#1d4ed8', bgHex: '#eff6ff' },
    'Good': { hex: '#eab308', textHex: '#a16207', bgHex: '#fefce8' },
    'Average': { hex: '#f97316', textHex: '#c2410c', bgHex: '#fff7ed' },
    'Poor': { hex: '#ef4444', textHex: '#b91c1c', bgHex: '#fef2f2' }
  };

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/40 overflow-hidden mb-6">
      {/* Panel Top Action Header */}
      <div className="p-5 border-b bg-gradient-to-r from-amber-500 to-yellow-600 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <BarChart className="w-5 h-5" />
            <span>Survey Analytics & Bar Graph Conversion</span>
          </h2>
          <p className="text-xs text-amber-100 mt-0.5">
            Generates statistical bar graphs across standard feedback questions (Q1 - Q5)
          </p>
        </div>

        <button
          onClick={handleExportPdf}
          disabled={generatingPdf || filteredFeedbacks.length === 0}
          className="flex items-center gap-2 bg-white text-amber-900 hover:bg-amber-50 font-bold py-2.5 px-4 rounded-xl shadow-lg transition cursor-pointer text-sm disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
        >
          {generatingPdf ? (
            <>
              <div className="w-4 h-4 border-2 border-amber-800 border-t-transparent rounded-full animate-spin"></div>
              <span>Generating PDF...</span>
            </>
          ) : (
            <>
              <Printer className="w-4 h-4 text-amber-800" />
              <span>Export PDF with Bar Graphs</span>
            </>
          )}
        </button>
      </div>

      {/* Main Report Canvas (Target for html2canvas PDF Export) */}
      <div ref={reportRef} style={{ backgroundColor: '#ffffff', color: '#1f2937' }} className="p-6 space-y-6">

        {/* PDF Document Title Banner */}
        <div style={{ borderColor: '#f59e0b' }} className="border-b-2 pb-4 flex justify-between items-end">
          <div>
            <div className="flex items-center gap-3">
              <img src="/images/college_logo.png" alt="Logo" className="w-12 h-auto" />
              <div>
                <h1 style={{ color: '#111827' }} className="text-xl font-black tracking-tight">
                  {adminConfig.COLLEGE_NAME}
                </h1>
                <h2 style={{ color: '#b45309' }} className="text-sm font-bold">
                  {adminConfig.PROGRAM_NAME} • Survey Analytics Report
                </h2>
              </div>
            </div>
          </div>

          <div style={{ color: '#4b5563' }} className="text-right text-xs">
            <div><span style={{ color: '#1f2937' }} className="font-bold">Department:</span> {selectedDept || 'All Departments'}</div>
            <div><span style={{ color: '#1f2937' }} className="font-bold">Viewing Day:</span> {selectedDay || 'All Days'}</div>
            <div><span style={{ color: '#1f2937' }} className="font-bold">Total Responses Analyzed:</span> <span style={{ color: '#92400e' }} className="font-extrabold">{filteredFeedbacks.length}</span></div>
            <div><span style={{ color: '#1f2937' }} className="font-bold">Generated On:</span> {new Date().toLocaleDateString()}</div>
          </div>
        </div>

        {/* Bar Graphs Grid for Q1 through Q6 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {analyticsData.map(q => {
            const maxCount = Math.max(...Object.values(q.counts), 1);

            return (
              <div
                key={q.qKey}
                style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}
                className="p-4 rounded-xl border shadow-sm space-y-3"
              >
                <div style={{ borderColor: '#e5e7eb' }} className="flex items-center justify-between border-b pb-2">
                  <span
                    style={{ backgroundColor: '#fef3c7', color: '#78350f' }}
                    className="font-black text-xs px-2 py-0.5 rounded"
                  >
                    {q.qKey}
                  </span>
                  <h3 style={{ color: '#1f2937' }} className="font-bold text-xs flex-1 ml-2 truncate" title={q.title}>
                    {q.title}
                  </h3>
                </div>

                {/* Custom Styled Visual Bar Chart */}
                <div className="space-y-2">
                  {ratingCategories.map(cat => {
                    const count = q.counts[cat] || 0;
                    const pct = q.totalRated > 0 ? Math.round((count / q.totalRated) * 100) : 0;
                    const barWidthPct = Math.round((count / maxCount) * 100);
                    const colorScheme = colors[cat];

                    return (
                      <div key={cat} className="space-y-0.5">
                        <div style={{ color: '#4b5563' }} className="flex justify-between items-center text-[11px] font-medium">
                          <span>{cat}</span>
                          <span style={{ color: '#111827' }} className="font-bold">{count} ({pct}%)</span>
                        </div>
                        <div style={{ backgroundColor: '#e5e7eb' }} className="w-full rounded-full h-3.5 overflow-hidden flex items-center">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.max(barWidthPct, count > 0 ? 5 : 0)}%`,
                              backgroundColor: colorScheme.hex
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default SurveyAnalytics;
