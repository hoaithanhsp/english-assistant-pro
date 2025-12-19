
import React, { useState, useRef, useEffect } from 'react';
import { FileText, BookOpen, Clock, FileUp, Flame, School, Languages, RefreshCw, Upload, Library, X, Trash2, LayoutTemplate, AlertTriangle } from 'lucide-react';
import { ExamConfig } from '../types';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// PDFJS worker config
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs`;

interface ExamFormProps {
  onSubmit: (config: ExamConfig) => void;
  isGenerating: boolean;
}

interface ReferenceItem {
  id: string;
  name: string;
  content: string;
}

const LEVELS = {
  PRIMARY: 'Primary',
  MIDDLE: 'Middle School',
  HIGH: 'High School'
};

const DATA = {
  [LEVELS.PRIMARY]: {
    grades: ['Grade 3', 'Grade 4', 'Grade 5'],
    times: ['45 minutes', '60 minutes'],
    trends: ['AI Generated', 'Greetings & Introductions', 'Family & Friends', 'School & Classroom', 'Animals & Pets', 'Food & Drinks', 'Hobbies & Sports', 'Weather & Seasons']
  },
  [LEVELS.MIDDLE]: {
    grades: ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10 Entrance'],
    times: ['45 minutes', '60 minutes', '90 minutes'],
    trends: ['AI Generated', 'Personal Information', 'Education & School Life', 'Environment & Nature', 'Entertainment & Media', 'Health & Lifestyle', 'Technology & Communication']
  },
  [LEVELS.HIGH]: {
    grades: ['Grade 10', 'Grade 11', 'Grade 12', 'National High School Exam'],
    times: ['60 minutes (National)', '90 minutes'],
    trends: ['AI Generated', 'Education & Career', 'Science & Technology', 'Global Issues & Environment', 'Cultural Diversity', 'Economics & Business', 'Social Problems']
  }
};

const ExamForm: React.FC<ExamFormProps> = ({ onSubmit, isGenerating }) => {
  const [level, setLevel] = useState<string>(LEVELS.MIDDLE);
  const [gradeLevel, setGradeLevel] = useState(DATA[LEVELS.MIDDLE].grades[3]);
  const [examType, setExamType] = useState(DATA[LEVELS.MIDDLE].times[1]);
  const [topic, setTopic] = useState('');
  const [trendingTopic, setTrendingTopic] = useState(DATA[LEVELS.MIDDLE].trends[0]);
  
  const [matrixContent, setMatrixContent] = useState('');
  const [specificationContent, setSpecificationContent] = useState('');
  const [structureContent, setStructureContent] = useState('');
  const [references, setReferences] = useState<ReferenceItem[]>([]);
  
  const [isParsingMatrix, setIsParsingMatrix] = useState(false);
  const [isParsingSpec, setIsParsingSpec] = useState(false);
  const [isParsingStructure, setIsParsingStructure] = useState(false);
  const [isParsingRef, setIsParsingRef] = useState(false);

  const matrixFileInputRef = useRef<HTMLInputElement>(null);
  const specFileInputRef = useRef<HTMLInputElement>(null);
  const structureFileInputRef = useRef<HTMLInputElement>(null);
  const refFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const data = DATA[level as keyof typeof DATA];
    setGradeLevel(data.grades[0]);
    setExamType(data.times[Math.min(1, data.times.length - 1)]);
    setTrendingTopic(data.trends[0]);
  }, [level]);

  const extractTextFromFile = async (file: File): Promise<string> => {
    const fileType = file.name.split('.').pop()?.toLowerCase();
    
    if (fileType === 'docx') {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } else if (fileType === 'pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        fullText += pageText + "\n";
      }
      return fullText;
    }
    throw new Error("Unsupported format (use .docx, .pdf)");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'matrix' | 'spec' | 'ref' | 'structure') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (target === 'matrix') {
      setIsParsingMatrix(true);
      try {
        const text = await extractTextFromFile(files[0]);
        setMatrixContent(text);
      } catch (err: any) { alert(err.message); }
      finally { setIsParsingMatrix(false); }
    } else if (target === 'spec') {
      setIsParsingSpec(true);
      try {
        const text = await extractTextFromFile(files[0]);
        setSpecificationContent(text);
      } catch (err: any) { alert(err.message); }
      finally { setIsParsingSpec(false); }
    } else if (target === 'structure') {
      setIsParsingStructure(true);
      try {
        const text = await extractTextFromFile(files[0]);
        setStructureContent(text);
      } catch (err: any) { alert(err.message); }
      finally { setIsParsingStructure(false); }
    } else if (target === 'ref') {
      setIsParsingRef(true);
      try {
        const newRefs: ReferenceItem[] = [];
        for (let i = 0; i < files.length; i++) {
          const text = await extractTextFromFile(files[i]);
          newRefs.push({
            id: Math.random().toString(36).substr(2, 9),
            name: files[i].name,
            content: text.slice(0, 10000) // Cap individual training files to 10k chars
          });
        }
        setReferences(prev => [...prev, ...newRefs]);
      } catch (err: any) { alert(err.message); }
      finally { setIsParsingRef(false); }
    }
    e.target.value = '';
  };

  const removeReference = (id: string) => {
    setReferences(prev => prev.filter(r => r.id !== id));
  };

  const totalRefLength = references.reduce((acc, r) => acc + r.content.length, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalRefLength > 50000) {
      if (!confirm("Your training data is very large. This might cause the AI to fail or take a long time. Proceed?")) return;
    }

    const combinedRefs = references
      .map(r => `--- SOURCE: ${r.name} ---\n${r.content}`)
      .join('\n\n');

    onSubmit({ 
      level, 
      gradeLevel, 
      examType, 
      topic, 
      trendingTopic, 
      matrixContent, 
      specificationContent,
      structureContent,
      referenceContent: combinedRefs 
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-3">
          <div className="p-3 bg-green-100 rounded-full">
            <Languages className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-2">
          <span className="text-green-600">ENGLISH ASSISTANT</span> <span className="text-red-600">PRO</span>
        </h1>
        <p className="text-slate-600 font-medium italic">Developed by Tran Hoai Thanh</p>
        <p className="text-slate-500 text-sm mt-1">AI-Powered Exam Generation System | Multi-Reference Support</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {Object.values(LEVELS).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => !isGenerating && setLevel(lvl)}
              className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors ${
                level === lvl
                  ? 'bg-green-50 text-green-700 border-b-2 border-green-600'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-gray-50'
              } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {lvl}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <School className="w-4 h-4" /> Grade Level
              </label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-green-500 outline-none bg-slate-50"
              >
                {DATA[level as keyof typeof DATA].grades.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <Clock className="w-4 h-4" /> Duration
              </label>
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-green-500 outline-none bg-slate-50"
              >
                {DATA[level as keyof typeof DATA].times.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            <div className="lg:col-span-2">
               <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                  <Flame className="w-4 h-4 text-orange-500" /> Topic Trend
               </label>
               <select
                value={trendingTopic}
                onChange={(e) => setTrendingTopic(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-orange-200 focus:ring-2 focus:ring-orange-500 outline-none bg-orange-50 text-orange-900 font-medium"
               >
                 {DATA[level as keyof typeof DATA].trends.map(opt => <option key={opt} value={opt}>{opt}</option>)}
               </select>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Library className="w-4 h-4 text-emerald-600" /> Training Data (Stylistic Context Only)
              </label>
              <div className="flex gap-2">
                {references.length > 0 && (
                  <button 
                    type="button"
                    onClick={() => setReferences([])}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition"
                  >
                    <Trash2 className="w-3 h-3" /> Clear All
                  </button>
                )}
                <button 
                  type="button"
                  onClick={() => refFileInputRef.current?.click()}
                  disabled={isParsingRef}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
                >
                  {isParsingRef ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  Add Training Files
                </button>
              </div>
              <input 
                type="file" 
                ref={refFileInputRef} 
                className="hidden" 
                multiple
                accept=".docx,.pdf"
                onChange={(e) => handleFileUpload(e, 'ref')} 
              />
            </div>

            {totalRefLength > 40000 && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-800 rounded-lg text-xs border border-amber-100 mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Large training data detected. AI output may be slow or prone to errors. Consider removing some files.</span>
              </div>
            )}

            {references.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                {references.map((ref) => (
                  <div key={ref.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-emerald-200 text-xs shadow-sm">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <FileText className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span className="truncate font-medium text-emerald-900">{ref.name}</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => removeReference(ref.id)}
                      className="text-emerald-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-sm">
                Optional: Upload previous exams to teach the AI your specific style.
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 pt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-3">
               <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <FileText className="w-4 h-4 text-blue-600" /> Exam Matrix
                  </label>
                  <button 
                    type="button"
                    onClick={() => matrixFileInputRef.current?.click()}
                    disabled={isParsingMatrix}
                    className="px-2 py-1 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    {isParsingMatrix ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  </button>
                  <input type="file" ref={matrixFileInputRef} className="hidden" accept=".docx,.pdf" onChange={(e) => handleFileUpload(e, 'matrix')} />
               </div>
               <textarea
                  value={matrixContent}
                  onChange={(e) => setMatrixContent(e.target.value)}
                  rows={5}
                  placeholder="Paste or upload matrix..."
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-xs font-mono bg-slate-50"
               />
            </div>

            <div className="space-y-3">
               <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <FileUp className="w-4 h-4 text-orange-600" /> Specification
                  </label>
                  <button 
                    type="button"
                    onClick={() => specFileInputRef.current?.click()}
                    disabled={isParsingSpec}
                    className="px-2 py-1 text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 rounded-lg"
                  >
                    {isParsingSpec ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  </button>
                  <input type="file" ref={specFileInputRef} className="hidden" accept=".docx,.pdf" onChange={(e) => handleFileUpload(e, 'spec')} />
               </div>
               <textarea
                  value={specificationContent}
                  onChange={(e) => setSpecificationContent(e.target.value)}
                  rows={5}
                  placeholder="Paste or upload specification..."
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500 outline-none text-xs font-mono bg-slate-50"
               />
            </div>

            <div className="space-y-3">
               <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <LayoutTemplate className="w-4 h-4 text-purple-600" /> Target Structure
                  </label>
                  <button 
                    type="button"
                    onClick={() => structureFileInputRef.current?.click()}
                    disabled={isParsingStructure}
                    className="px-2 py-1 text-xs font-bold text-purple-600 bg-purple-50 border border-purple-200 rounded-lg"
                  >
                    {isParsingStructure ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  </button>
                  <input type="file" ref={structureFileInputRef} className="hidden" accept=".docx,.pdf" onChange={(e) => handleFileUpload(e, 'structure')} />
               </div>
               <textarea
                  value={structureContent}
                  onChange={(e) => setStructureContent(e.target.value)}
                  rows={5}
                  placeholder="Upload an exam to use its exact section structure..."
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none text-xs font-mono bg-slate-50"
               />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isGenerating}
              className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all transform hover:-translate-y-1 ${
                isGenerating
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
              }`}
            >
              {isGenerating ? "Analyzing Inputs & Training Data..." : "GENERATE FINAL EXAM"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExamForm;
