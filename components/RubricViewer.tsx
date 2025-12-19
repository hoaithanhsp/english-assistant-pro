import React from 'react';
import { ExamData } from '../types';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface RubricViewerProps {
  data: ExamData;
  className?: string;
}

const RubricViewer: React.FC<RubricViewerProps> = ({ data, className }) => {
  
  // Helper to format dense text into readable lines
  const formatRubricText = (text: string) => {
    if (!text) return "";
    return text
      // Add newline before major sections if missing
      .replace(/([.:;])\s*(Mở bài|Thân bài|Kết bài|Mở đoạn|Thân đoạn|Kết đoạn|Yêu cầu chung|Yêu cầu cụ thể|Introduction|Body|Conclusion|General Requirements|Specific Requirements)/gi, '$1\n\n$2')
      // Add newline before list items like a. b. c. or 1. 2. 3.
      .replace(/([.:;])\s*([a-d]\.|[1-4]\.)\s/gi, '$1\n$2 ')
      // Add newline before bullets
      .replace(/([.:;])\s*(-|\+)\s/g, '$1\n$2 ');
  };

  return (
    <div className={`bg-white shadow-md rounded-lg overflow-hidden border border-gray-200 ${className}`}>
       <div className="bg-emerald-50 p-4 border-b border-emerald-100 flex items-center justify-between">
          <h3 className="font-bold text-emerald-800 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" /> Answer Key & Scoring Rubric
          </h3>
          <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-1 rounded">
             AI Generated
          </span>
       </div>

       <div className="p-6 overflow-y-auto max-h-[750px]">
          {/* Summary Matrix */}
          {data.matrixMapping && data.matrixMapping.length > 0 && (
             <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100 text-sm">
                <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Reference Matrix
                </h4>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  {data.matrixMapping.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
             </div>
          )}

          {/* Answer List */}
          <div className="space-y-6">
            {data.answers?.map((ans, idx) => (
              <div key={idx} className="rubric-item group">
                 <div className="flex justify-between items-baseline border-b border-gray-200 pb-2 mb-3">
                    <div className="flex items-center gap-2">
                       <span className="bg-slate-100 text-slate-700 font-bold px-3 py-1 rounded text-sm border border-slate-200">
                          {ans.questionId}
                       </span>
                    </div>
                    <span className="font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full text-sm border border-red-100">
                       {ans.pointsDetail}
                    </span>
                 </div>
                 
                 <div className="text-slate-700 leading-relaxed whitespace-pre-wrap pl-1 text-[15px] text-justify">
                    {formatRubricText(ans.answer)}
                 </div>
              </div>
            ))}
          </div>
       </div>
    </div>
  );
};

export default RubricViewer;