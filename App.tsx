import React, { useState, useCallback, useMemo } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

// Declare global libraries from CDN
declare var pdfjsLib: any;
declare var mammoth: any;

// --- TYPE DEFINITIONS ---
interface ResumeFile {
  id: string;
  file: File;
  content: string;
}

interface AnalysisReport {
  candidateName: string;
  overallScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  standoutSkills: string[];
  suggestedQuestions: string[];
}

interface RankedResume extends ResumeFile {
  analysis: AnalysisReport;
}

// --- AI & ANALYSIS UTILITY FUNCTIONS ---
const getAiAnalysis = async (jobDescription: string, resumeContent: string): Promise<AnalysisReport> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const analysisSchema = {
    type: Type.OBJECT,
    properties: {
      candidateName: { type: Type.STRING, description: "The full name of the candidate." },
      matchScore: { type: Type.NUMBER, description: "A score from 0 to 100 representing how well the resume matches the job description." },
      summary: { type: Type.STRING, description: "A 2-3 sentence summary of the candidate's profile and suitability." },
      strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Key strengths of the candidate for the role, based on the job description." },
      weaknesses: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Potential weaknesses or missing qualifications based on the job description." },
      standoutSkills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "1-3 unique skills or experiences not required by the job description but are valuable assets." },
      suggestedQuestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Insightful interview questions to ask based on the resume and job description." },
    },
    required: ["candidateName", "matchScore", "summary", "strengths", "weaknesses", "standoutSkills", "suggestedQuestions"],
  };

  const prompt = `
    You are an expert HR assistant. Your task is to analyze a resume based on a provided job description and return a structured JSON analysis. Do not include any introductory text, markdown formatting, or backticks in your response.

    **Job Description:**
    ---
    ${jobDescription}
    ---

    **Resume Content:**
    ---
    ${resumeContent}
    ---

    Based on the above, provide a JSON object that strictly follows the defined schema. Identify any standout skills or experiences that are not explicitly in the job description but would be a major asset for the role.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: analysisSchema,
    },
  });

  // The response.text is already a parsed JSON object when schema is used
  const analysisResult = JSON.parse(response.text);

  return {
    candidateName: analysisResult.candidateName,
    overallScore: analysisResult.matchScore,
    summary: analysisResult.summary,
    strengths: analysisResult.strengths,
    weaknesses: analysisResult.weaknesses,
    standoutSkills: analysisResult.standoutSkills,
    suggestedQuestions: analysisResult.suggestedQuestions,
  };
};


// --- ICON COMPONENTS ---
const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>);
const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}><path fillRule="evenodd" d="M10 2a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 2zM5.404 4.343a.75.75 0 010 1.06l-2.475 2.475a.75.75 0 11-1.06-1.06L4.343 4.343a.75.75 0 011.06 0zm9.192 0a.75.75 0 011.06 0l2.475 2.475a.75.75 0 11-1.06 1.06L15.657 5.404a.75.75 0 010-1.06zM2 10a.75.75 0 01.75-.75h3.5a.75.75 0 010 1.5h-3.5A.75.75 0 012 10zM17 10a.75.75 0 01.75-.75h3.5a.75.75 0 010 1.5h-3.5A.75.75 0 0117 10zM5.404 15.657a.75.75 0 010-1.06l-2.475-2.475a.75.75 0 01-1.06 1.06L4.343 15.657a.75.75 0 011.06 0zm9.192 0a.75.75 0 011.06 0l2.475-2.475a.75.75 0 11-1.06-1.06L15.657 14.596a.75.75 0 010 1.06zM10 17a.75.75 0 01.75-.75h3.5a.75.75 0 010 1.5h-3.5A.75.75 0 0110 17z" clipRule="evenodd" /></svg>);
const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>);
const XCircleIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" /></svg>);
const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>);
const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>);
const StarIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}><path fillRule="evenodd" d="M10.868 2.884c.321-.662 1.215-.662 1.536 0l1.681 3.46c.154.316.46.533.805.572l3.81.554c.732.106 1.023.99.494 1.503l-2.756 2.686c-.24.234-.35.58-.3.922l.65 3.793c.125.728-.638 1.283-1.296.952l-3.4-1.787a1.125 1.125 0 00-1.036 0l-3.4 1.787c-.658.331-1.421-.224-1.296-.952l.65-3.793c.05-.341-.06-.688-.3-.922L1.84 9.077c-.529-.513-.238-1.397.494-1.503l3.81-.554c.345-.039.65-.256.805-.572l1.681-3.46z" clipRule="evenodd" /></svg>);


// --- MAIN APP COMPONENT ---
function App() {
  const [resumes, setResumes] = useState<ResumeFile[]>([]);
  const [jobDescription, setJobDescription] = useState('');
  const [rankedResults, setRankedResults] = useState<RankedResume[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedResume, setSelectedResume] = useState<RankedResume | null>(null);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleFiles = useCallback(async (files: FileList) => {
    setIsLoading(true);
    setError(null);
    const newResumes: ResumeFile[] = [];

    for (const file of Array.from(files)) {
      try {
        let content = '';
        if (file.type === 'application/pdf') {
          const reader = new FileReader();
          content = await new Promise<string>((resolve, reject) => {
            reader.onload = async (e) => {
              try {
                const doc = await pdfjsLib.getDocument(new Uint8Array(e.target?.result as ArrayBuffer)).promise;
                let text = '';
                for (let i = 1; i <= doc.numPages; i++) {
                  const page = await doc.getPage(i);
                  const content = await page.getTextContent();
                  text += content.items.map((item: any) => item.str).join(' ');
                }
                resolve(text);
              } catch (pdfError) {
                reject(pdfError);
              }
            };
            reader.onerror = () => reject(new Error(`Error reading file: ${file.name}`));
            reader.readAsArrayBuffer(file);
          });
        } else if (file.name.endsWith('.docx')) {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          content = result.value;
        } else {
            console.warn(`Unsupported file type: ${file.name}`);
            continue;
        }
        newResumes.push({ id: `${file.name}-${file.lastModified}`, file, content });
      } catch (err: any) {
        setError(`Failed to process ${file.name}: ${err.message}`);
      }
    }
    setResumes(prev => [...prev.filter(r => !newResumes.some(nr => nr.id === r.id)), ...newResumes]);
    setIsLoading(false);
  }, []);

  const handleDragEvents = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setIsDragging(true);
    else if (e.type === 'dragleave') setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };
  
  const handleAnalyze = async () => {
    if (!resumes.length || !jobDescription.trim()) return;
    setIsLoading(true);
    setRankedResults([]);
    setError(null);
    setProgress(0);

    try {
      const analysisPromises = resumes.map(resume => 
        getAiAnalysis(jobDescription, resume.content)
          .then(analysis => {
            setProgress(p => p + 1);
            return { ...resume, analysis };
          })
      );
      
      const results = await Promise.all(analysisPromises);
      results.sort((a, b) => b.analysis.overallScore - a.analysis.overallScore);
      setRankedResults(results);

    } catch (err: any) {
        setError(`An AI analysis error occurred: ${err.message}`);
    } finally {
        setIsLoading(false);
        setProgress(0);
    }
  };
  
  const HighlightedText = useMemo(() => {
    if (!selectedResume) return null;
    const text = selectedResume.content;
    const queryTokens = new Set(jobDescription.toLowerCase().split(/\s+/).filter(t => t.length > 3));
    const words = text.split(/(\s+)/);
    return words.map((word, i) => {
        if(queryTokens.has(word.toLowerCase().replace(/[.,;:"()?!\[\]{}]+$/, ''))) {
            return <mark key={i} className="bg-yellow-300 dark:bg-yellow-500 rounded">{word}</mark>
        }
        return word;
    })
  }, [selectedResume, jobDescription]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4 font-sans transition-colors duration-300">
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white text-center mb-6 flex items-center justify-center gap-3">
              <SparklesIcon className="w-8 h-8 text-blue-500" />
              AI Resume Ranker
            </h1>
            
            <div className="space-y-6">
                {/* File Upload */}
                <div>
                    <label htmlFor="file-upload" onDragEnter={handleDragEvents} onDragLeave={handleDragEvents} onDragOver={handleDragEvents} onDrop={handleDrop} className={`flex justify-center w-full h-32 px-4 transition bg-white dark:bg-gray-700 border-2 ${isDragging ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600'} border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none`}>
                        <span className="flex items-center space-x-2"><UploadIcon className="w-8 h-8 text-gray-600 dark:text-gray-400" /><span className="font-medium text-gray-600 dark:text-gray-400">Drop resumes or <span className="text-blue-600 underline">browse</span></span></span>
                        <input type="file" id="file-upload" multiple accept=".pdf,.docx" className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
                    </label>
                     {resumes.length > 0 && <div className="mt-4"><h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Uploaded {resumes.length} resume(s)</h3></div>}
                </div>
                
                {/* Job Description Input */}
                <div>
                    <textarea placeholder="Paste the full Job Description here..." value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} rows={6} className="w-full p-4 text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                
                <button onClick={handleAnalyze} disabled={!resumes.length || !jobDescription.trim() || isLoading} className="w-full flex justify-center items-center gap-3 py-3 px-4 border border-transparent rounded-lg shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed dark:disabled:bg-gray-500 transition-all">
                    {isLoading ? `Analyzing... (${progress}/${resumes.length})` : `Analyze ${resumes.length} Resumes with AI`}
                </button>
            </div>

            {error && <div className="mt-4 text-center text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-lg">{error}</div>}

            {/* Results */}
            {rankedResults.length > 0 && (
                <div className="mt-8 animate-fade-in">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Ranked Results</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 italic">
                      Ranking is determined by an AI-powered holistic analysis of the candidate's skills, experience, and overall alignment with your job description.
                    </p>
                    <ul className="space-y-3">
                        {rankedResults.map((result, index) => (
                           <li key={result.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg shadow-sm transition-all duration-300">
                                <button onClick={() => setExpandedResult(expandedResult === result.id ? null : result.id)} className="w-full p-4 text-left flex items-center justify-between">
                                    <div className="flex items-center min-w-0">
                                        <span className="text-xl font-bold text-blue-600 dark:text-blue-400 mr-4">#{index + 1}</span>
                                        <div className="min-w-0">
                                            <p className="text-md font-semibold text-gray-800 dark:text-gray-200 truncate" title={result.analysis.candidateName}>{result.analysis.candidateName}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={result.file.name}>{result.file.name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">{result.analysis.overallScore}%</p>
                                        <ChevronDownIcon className={`w-6 h-6 text-gray-500 dark:text-gray-400 transition-transform ${expandedResult === result.id ? 'rotate-180' : ''}`} />
                                    </div>
                                </button>
                                {expandedResult === result.id && (
                                    <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-600 animate-fade-in space-y-4">
                                        <div className="pt-4">
                                            <h4 className="font-semibold text-gray-800 dark:text-white mb-2">AI Summary</h4>
                                            <p className="text-sm text-gray-600 dark:text-gray-300">{result.analysis.summary}</p>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <h4 className="font-semibold text-gray-800 dark:text-white mb-2 flex items-center gap-2"><CheckCircleIcon className="w-5 h-5 text-green-500"/> Strengths</h4>
                                                <ul className="list-disc list-inside space-y-1 pl-2">
                                                    {result.analysis.strengths.map((s, i) => <li key={i} className="text-sm text-gray-600 dark:text-gray-300">{s}</li>)}
                                                </ul>
                                            </div>
                                             <div>
                                                <h4 className="font-semibold text-gray-800 dark:text-white mb-2 flex items-center gap-2"><XCircleIcon className="w-5 h-5 text-red-500"/> Weaknesses</h4>
                                                <ul className="list-disc list-inside space-y-1 pl-2">
                                                    {result.analysis.weaknesses.map((w, i) => <li key={i} className="text-sm text-gray-600 dark:text-gray-300">{w}</li>)}
                                                </ul>
                                            </div>
                                        </div>

                                        {result.analysis.standoutSkills && result.analysis.standoutSkills.length > 0 && (
                                          <div>
                                              <h4 className="font-semibold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                                                <StarIcon className="w-5 h-5 text-yellow-400"/> Standout Skills
                                              </h4>
                                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Unique skills or experiences not required by the job description.</p>
                                              <ul className="list-disc list-inside space-y-1 pl-2">
                                                  {result.analysis.standoutSkills.map((s, i) => <li key={i} className="text-sm text-gray-600 dark:text-gray-300">{s}</li>)}
                                              </ul>
                                          </div>
                                        )}

                                        <div>
                                            <h4 className="font-semibold text-gray-800 dark:text-white mb-2">Suggested Interview Questions</h4>
                                            <ul className="list-disc list-inside space-y-1">
                                                {result.analysis.suggestedQuestions.map((q, i) => <li key={i} className="text-sm text-gray-600 dark:text-gray-300">{q}</li>)}
                                            </ul>
                                        </div>

                                        <div className="text-center pt-2">
                                            <button onClick={() => setSelectedResume(result)} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">View Full Resume with Highlights</button>
                                        </div>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal for viewing resume text */}
      {selectedResume && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={() => setSelectedResume(null)}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b dark:border-gray-600"><h3 className="text-lg font-semibold text-gray-800 dark:text-white truncate">{selectedResume.analysis.candidateName}</h3><button onClick={() => setSelectedResume(null)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><CloseIcon className="w-6 h-6 text-gray-600 dark:text-gray-300"/></button></div>
                <div className="p-6 overflow-y-auto"><pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 dark:text-gray-300">{HighlightedText}</pre></div>
            </div>
        </div>
      )}
    </div>
  );
}

export default App;
