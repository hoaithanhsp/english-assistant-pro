import React, { useState, useEffect } from 'react';
import { Layout, Printer, RefreshCw, PenTool, FileDown, Languages, FileText, Zap, Settings, X, ExternalLink, Key } from 'lucide-react';
import ExamForm from './components/ExamForm';
import ExamViewer from './components/ExamViewer';
import RubricViewer from './components/RubricViewer';
import { generateExam } from './services/geminiService';
import { ExamConfig, ExamData, AppView } from './types';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  WidthType,
  Table,
  TableRow,
  TableCell
} from "docx";

const MODELS = [
  { id: "gemini-3-flash-preview", name: "Gemini 3.0 Flash", desc: "Fastest standard model (Recommended)" },
  { id: "gemini-3-pro-preview", name: "Gemini 3.0 Pro", desc: "High intelligence for complex logic" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", desc: "Legacy fast model" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", desc: "Legacy pro model" }
];

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.INPUT);
  const [examData, setExamData] = useState<ExamData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("Generating English Exam...");

  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-3-flash-preview");

  useEffect(() => {
    const storedKey = localStorage.getItem('user_gemini_api_key');
    const storedModel = localStorage.getItem('preferred_model');

    if (storedKey) setApiKey(storedKey);
    else setShowSettings(true); // Force open if no key

    if (storedModel) setSelectedModel(storedModel);
  }, []);

  const handleSaveSettings = () => {
    if (!apiKey.trim()) {
      alert("Please enter a valid API Key");
      return;
    }
    localStorage.setItem('user_gemini_api_key', apiKey);
    localStorage.setItem('preferred_model', selectedModel);
    setShowSettings(false);
  };

  const handleGenerate = async (config: ExamConfig) => {
    setView(AppView.LOADING);
    setLoadingMessage("Waking up Flash AI Engine...");
    setError(null);
    try {
      const result = await generateExam(config, (msg) => {
        setLoadingMessage(msg);
      });
      setExamData(result);
      setView(AppView.RESULT);
    } catch (err: any) {
      setError(err.message || "Error generating exam. Please try again.");
      setView(AppView.INPUT);
    }
  };

  const handleReset = () => {
    if (confirm("Create a new exam? Current progress will be lost.")) {
      setView(AppView.INPUT);
      setExamData(null);
    }
  };

  const handleExportWord = async () => {
    if (!examData) return;
    setIsExporting(true);

    try {
      const children: any[] = [];
      const fontName = "Times New Roman";

      // 1. Header
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE },
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 40, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "EDUCATION DEPARTMENT", bold: true, font: fontName, size: 24 })] }),
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "__________________", bold: true, font: fontName })] })
                  ],
                }),
                new TableCell({
                  width: { size: 60, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: examData.examTitle?.toUpperCase() || "EXAM PAPER", bold: true, font: fontName, size: 28 })] }),
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Subject: English | Time: ${examData.duration}`, italics: true, font: fontName, size: 24 })] }),
                  ],
                }),
              ],
            }),
          ],
        }),
        new Paragraph({ text: "", spacing: { after: 200 } })
      );

      // 2. Exam Content
      examData.content?.forEach((section) => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: section.section, bold: true, font: fontName, size: 26 })],
            spacing: { before: 200, after: 100 },
          })
        );

        if (section.text) {
          section.text.split('\n').forEach(line => {
            children.push(new Paragraph({ children: [new TextRun({ text: line, font: fontName, size: 24 })], spacing: { after: 100 } }));
          });
        }

        section.questions?.forEach((q) => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${q.id}. `, bold: true, font: fontName, size: 24 }),
                new TextRun({ text: q.text, font: fontName, size: 24 }),
                new TextRun({ text: q.points ? ` (${q.points} pts)` : "", italics: true, font: fontName, size: 20 }),
              ],
              spacing: { before: 100, after: 50 },
            })
          );

          if (q.parts && q.parts.length > 0) {
            const isOptions = q.parts.length === 4 && q.parts.every(p => /^[A-D]\./.test(p.label || ""));
            if (isOptions) {
              children.push(
                new Paragraph({
                  children: q.parts.flatMap(p => [
                    new TextRun({ text: `${p.label} ${p.content}    `, font: fontName, size: 24 }),
                  ]),
                  indent: { left: 720 }
                })
              );
            } else {
              q.parts.forEach(p => {
                children.push(
                  new Paragraph({
                    children: [new TextRun({ text: `${p.label || ""} ${p.content}`, font: fontName, size: 24 })],
                    indent: { left: 720 },
                  })
                );
              });
            }
          }
        });
      });

      children.push(new Paragraph({ text: "--- THE END ---", alignment: AlignmentType.CENTER, spacing: { before: 400 }, font: fontName, size: 24, italics: true }));

      // 3. Answer Key Section
      children.push(new Paragraph({ text: "", pageBreakBefore: true }));
      children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "ANSWER KEY", bold: true, font: fontName, size: 28 })], spacing: { after: 300 } }));

      examData.answers?.forEach(ans => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${ans.questionId}: `, bold: true, font: fontName, size: 24 }),
              new TextRun({ text: ans.answer, font: fontName, size: 24 }),
              new TextRun({ text: ` (${ans.pointsDetail})`, italics: true, font: fontName, size: 20 }),
            ],
            spacing: { after: 100 }
          })
        );
      });

      const doc = new Document({ sections: [{ children }] });
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `English_Exam_${Date.now()}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Failed to export Word document.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView(AppView.INPUT)}>
              <div className="bg-green-600 text-white p-2 rounded-lg">
                <Languages size={20} />
              </div>
              <span className="font-bold text-xl tracking-tight hidden sm:block">
                <span className="text-green-600">ENGLISH ASSISTANT</span> <span className="text-red-600">PRO</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <Settings size={18} />
                <span className="text-sm font-medium hidden md:block">Settings</span>
                {!apiKey && <span className="text-xs text-red-500 font-bold whitespace-nowrap">Lấy API key để sử dụng app</span>}
              </button>

              {view === AppView.RESULT && (
                <>
                  <button onClick={handleReset} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition" title="Start Over">
                    <RefreshCw size={20} />
                  </button>
                  <div className="h-6 w-px bg-gray-300"></div>
                  <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-black transition text-sm font-medium">
                    <Printer size={16} /> Print/PDF
                  </button>
                  <button
                    onClick={handleExportWord}
                    disabled={isExporting}
                    className={`flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium ${isExporting ? 'opacity-70 cursor-wait' : ''}`}
                  >
                    {isExporting ? <RefreshCw size={16} className="animate-spin" /> : <FileDown size={16} />}
                    Export Word
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto py-8 px-4 w-full">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded flex justify-between items-center animate-in fade-in slide-in-from-top-4">
            <span className="font-medium">{error}</span>
            <button onClick={() => setError(null)} className="text-xl">&times;</button>
          </div>
        )}

        {view === AppView.INPUT && <ExamForm onSubmit={handleGenerate} isGenerating={false} />}

        {view === AppView.LOADING && (
          <div className="flex flex-col items-center justify-center py-32 animate-in fade-in zoom-in duration-300">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-green-100 border-t-green-600 rounded-full animate-spin"></div>
              <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-green-600 w-8 h-8 fill-green-600" />
            </div>
            <h2 className="mt-8 text-2xl font-bold text-slate-800">{loadingMessage}</h2>
            <p className="text-slate-500 mt-2 text-center max-w-md">
              Turbo Mode: Optimized 2-step pipeline for faster results.
            </p>
            <div className="mt-6 flex gap-3">
              <div className={`h-1.5 w-12 rounded-full transition-all duration-500 ${loadingMessage.includes('Step 1') || loadingMessage.includes('Step 2') ? 'bg-green-600' : 'bg-gray-200'}`}></div>
              <div className={`h-1.5 w-12 rounded-full transition-all duration-500 ${loadingMessage.includes('Step 2') ? 'bg-green-600' : 'bg-gray-200'}`}></div>
            </div>
          </div>
        )}

        {view === AppView.RESULT && examData && (
          <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in duration-500">
            <div className="lg:w-7/12 w-full">
              <div className="mb-4 flex items-center justify-between no-print">
                <h3 className="font-bold text-slate-700 flex items-center gap-2 uppercase tracking-wider text-sm">
                  <FileText className="w-4 h-4" /> Exam Paper Preview
                </h3>
              </div>
              <ExamViewer data={examData} className="exam-paper" />
            </div>
            <div className="lg:w-5/12 w-full no-print">
              <RubricViewer data={examData} />
            </div>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-2 text-slate-800">
                <Settings className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-lg">Configuration</h3>
              </div>
              {!apiKey ? null : (
                <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600 transition">
                  <X size={20} />
                </button>
              )}
            </div>

            <div className="p-6 space-y-6">

              {/* API Key Section */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-700">
                  Google Gemini API Key <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your AI Studio API Key"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                </div>
                <div className="text-xs text-slate-500 flex justify-between items-center">
                  <span>Required for AI generation</span>
                  <a href="https://aistudio.google.com/api-keys" target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium">
                    Get API Key <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              {/* Model Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-700">
                  Preferred AI Model
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                  {MODELS.map(model => (
                    <div
                      key={model.id}
                      onClick={() => setSelectedModel(model.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${selectedModel === model.id ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500' : 'border-slate-200 hover:border-blue-300'}`}
                    >
                      <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${selectedModel === model.id ? 'border-blue-500' : 'border-slate-300'}`}>
                        {selectedModel === model.id && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                      </div>
                      <div>
                        <div className="font-medium text-sm text-slate-900">{model.name}</div>
                        <div className="text-xs text-slate-500">{model.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={handleSaveSettings}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition shadow-sm"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Promotion */}
      <footer className="bg-slate-800 text-slate-300 py-8 px-4 mt-auto border-t border-slate-700 no-print">
        <div className="max-w-5xl mx-auto text-center">
          <div className="mb-6 p-6 bg-gradient-to-r from-blue-900/40 to-indigo-900/40 rounded-2xl border border-blue-500/20 backdrop-blur-sm">
            <p className="font-bold text-lg md:text-xl text-blue-200 mb-3 leading-relaxed">
              ĐĂNG KÝ KHOÁ HỌC THỰC CHIẾN VIẾT SKKN, TẠO APP DẠY HỌC, TẠO MÔ PHỎNG TRỰC QUAN <br className="hidden md:block" />
              <span className="text-yellow-400">CHỈ VỚI 1 CÂU LỆNH</span>
            </p>
            <a
              href="https://tinyurl.com/khoahocAI2025"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full transition-all transform hover:-translate-y-1 shadow-lg shadow-blue-900/50"
            >
              ĐĂNG KÝ NGAY
            </a>
          </div>

          <div className="space-y-2 text-sm md:text-base">
            <p className="font-medium text-slate-400">Mọi thông tin vui lòng liên hệ:</p>
            <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-6">
              <a
                href="https://www.facebook.com/tranhoaithanhvicko/"
                target="_blank"
                rel="noreferrer"
                className="hover:text-blue-400 transition-colors duration-200 flex items-center gap-2"
              >
                <span className="font-bold">Facebook:</span> tranhoaithanhvicko
              </a>
              <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-slate-600"></div>
              <span className="hover:text-emerald-400 transition-colors duration-200 cursor-default flex items-center gap-2">
                <span className="font-bold">Zalo:</span> 0348296773
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;