import React from 'react';
import { ExamData } from '../types';

interface ExamViewerProps {
  data: ExamData;
  className?: string;
}

const ExamViewer: React.FC<ExamViewerProps> = ({ data, className }) => {
  return (
    <div className={`bg-white p-10 sm:p-14 min-h-[1100px] border border-gray-300 font-serif text-black leading-relaxed shadow-2xl relative ${className}`}>
      {/* Header Section */}
      <div className="flex justify-between items-start mb-6">
        <div className="text-center w-5/12 text-[12px] font-bold uppercase">
          <p>SỞ GIÁO DỤC VÀ ĐÀO TẠO</p>
          <p>--------------------</p>
          <p className="text-[10px] normal-case font-normal">(Đề thi có 04 trang)</p>
        </div>
        <div className="text-center w-6/12">
          <h2 className="uppercase font-bold text-[14px] leading-tight">{data.examTitle || "EXAM PAPER"}</h2>
          <p className="text-[13px] font-bold mt-1 uppercase">MÔN: TIẾNG ANH</p>
          <p className="text-[11px] mt-1 italic">Thời gian làm bài: {data.duration}</p>
          <p className="text-[10px] mt-0.5 italic text-gray-600">(không kể thời gian phát đề)</p>
        </div>
      </div>

      {/* Student Details Section */}
      <div className="border-t border-b border-black py-3 mb-8 text-[12px] flex justify-between items-center">
        <div className="flex-1 space-y-2">
          <p>Họ và tên: ............................................................................................</p>
          <p>Số báo danh: ........................................................................................</p>
        </div>
        <div className="ml-4">
          <div className="border-2 border-black p-3 text-center min-w-[120px]">
            <p className="font-bold text-[14px]">Mã đề thi: 101</p>
          </div>
        </div>
      </div>

      {/* Exam Content */}
      <div className="space-y-12">
        {data.content?.map((section, idx) => (
          <div key={idx} className="exam-section">
            <h3 className="text-[14px] font-bold uppercase mb-4 tracking-tight border-b border-black pb-1">
              {section.section}
            </h3>
            
            {section.text && (
              <div className="mb-6 italic text-[13px] whitespace-pre-wrap leading-relaxed text-justify px-2 font-sans border-l-2 border-gray-100 py-1">
                {section.text}
              </div>
            )}

            <div className="space-y-8">
              {section.questions?.map((q) => (
                <div key={q.id} className="exam-question text-[13.5px]">
                  <div className="flex gap-2 mb-1.5">
                    <span className="font-bold whitespace-nowrap">{q.id}.</span>
                    <div className="flex-1">
                      <span className="text-justify leading-tight">{q.text}</span>
                      {q.points && <span className="text-[10px] font-bold italic text-gray-500 ml-2">({q.points} pts)</span>}
                    </div>
                  </div>
                  
                  {q.parts && q.parts.length > 0 && (
                    <div className="ml-10 mt-1">
                      {/* Grid 4 columns for A/B/C/D if appropriate */}
                      {q.parts.length === 4 && q.parts.every(p => /^[A-D]\./.test(p.label || "")) ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                           {q.parts.map((part, pIdx) => (
                              <div key={pIdx} className="flex gap-1.5">
                                <span className="font-bold">{part.label}</span>
                                <span>{part.content}</span>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2">
                          {q.parts.map((part, pIdx) => (
                            <div key={pIdx} className="flex gap-2">
                              {part.label && <span className="font-bold min-w-[20px]">{part.label}</span>}
                              <span className="text-justify">{part.content}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Decoration */}
      <div className="text-center mt-24 text-[12px] font-bold italic pt-8 border-t border-gray-100 uppercase tracking-[0.3em]">
        ------ THE END ------
      </div>
      
      {/* Page counter at bottom */}
      <div className="absolute bottom-6 right-10 text-[10px] font-bold">
        Mã đề 101 Page 1/1
      </div>
    </div>
  );
};

export default ExamViewer;