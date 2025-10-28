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

interface ScoreExplanation {
  overall: string;
  skill: string;
  experience: string;
  education: string;
}

interface AnalysisReport {
  candidateName: string;
  currentTitle: string;
  location: string;
  yearsOfExperience: number;
  overallFitScore: number;
  skillMatchScore: number;
  experienceRelevanceScore: number;
  educationFitScore: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  topSkills: string[];
  suggestedQuestions: string[];
  scoreExplanations: ScoreExplanation;
}


interface RankedResume extends ResumeFile {
  analysis: AnalysisReport;
}

type SortKey = "overallFitScore" | "skillMatchScore" | "experienceRelevanceScore";


// --- AI & ANALYSIS UTILITY FUNCTIONS ---
const getAiAnalysis = async (jobDescription: string, resumeContent: string): Promise<AnalysisReport> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const analysisSchema = {
    type: Type.OBJECT,
    properties: {
      candidateName: { type: Type.STRING, description: "Candidate's full name. If not found, use the filename." },
      currentTitle: { type: Type.STRING, description: "Candidate's most recent or current job title. If not found, state 'Not specified'." },
      location: { type: Type.STRING, description: "Candidate's city/state. If not found, state 'Not specified'." },
      yearsOfExperience: { type: Type.NUMBER, description: "Total years of professional experience relevant to the job description." },
      overallFitScore: { type: Type.NUMBER, description: "A holistic score from 0-100 for overall fit, considering all factors." },
      skillMatchScore: { type: Type.NUMBER, description: "A score from 0-100 on how well the candidate's skills match the job description's requirements." },
      experienceRelevanceScore: { type: Type.NUMBER, description: "A score from 0-100 based on the relevance of job titles, companies, and duration of experience." },
      educationFitScore: { type: Type.NUMBER, description: "A score from 0-100 on how well the candidate's education aligns with the job requirements." },
      summary: { type: Type.STRING, description: "A 2-3 sentence summary of the candidate's profile and suitability." },
      strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Key strengths of the candidate for the role." },
      gaps: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Potential gaps or missing qualifications compared to the job description." },
      topSkills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "The top 3-5 most relevant skills found in the resume." },
      suggestedQuestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Insightful interview questions to ask." },
      scoreExplanations: {
          type: Type.OBJECT,
          properties: {
              overall: { type: Type.STRING, description: "A 1-sentence explanation for the Overall Fit score." },
              skill: { type: Type.STRING, description: "A 1-sentence explanation for the Skill Match score." },
              experience: { type: Type.STRING, description: "A 1-sentence explanation for the Experience Relevance score." },
              education: { type: Type.STRING, description: "A 1-sentence explanation for the Education Fit score." },
          },
          required: ["overall", "skill", "experience", "education"]
      }
    },
    required: ["candidateName", "currentTitle", "location", "yearsOfExperience", "overallFitScore", "skillMatchScore", "experienceRelevanceScore", "educationFitScore", "summary", "strengths", "gaps", "topSkills", "suggestedQuestions", "scoreExplanations"],
  };

  const prompt = `
    You are an expert HR recruitment analyst. Your task is to perform a detailed, multi-faceted analysis of a resume against a job description.
    Your analysis must be completely objective and free of bias. Do not consider any personal identifiers like name, gender, or ethnicity in your scoring.
    Return a single, structured JSON object that strictly adheres to the provided schema. Do not include any introductory text, markdown formatting, or backticks.

    **Job Description:**
    ---
    ${jobDescription}
    ---

    **Resume Content:**
    ---
    ${resumeContent}
    ---

    Analyze the resume and provide scores and text for all fields in the JSON schema.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: analysisSchema,
    },
  });

  return JSON.parse(response.text);
};


// --- ICON COMPONENTS ---
const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>);
const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}><path fillRule="evenodd" d="M10 2a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 2zM5.404 4.343a.75.75 0 010 1.06l-2.475 2.475a.75.75 0 11-1.06-1.06L4.343 4.343a.75.75 0 011.06 0zm9.192 0a.75.75 0 011.06 0l2.475 2.475a.75.75 0 11-1.06 1.06L15.657 5.404a.75.75 0 010-1.06zM2 10a.75.75 0 01.75-.75h3.5a.75.75 0 010 1.5h-3.5A.75.75 0 012 10zM17 10a.75.75 0 01.75-.75h3.5a.75.75 0 010 1.5h-3.5A.75.75 0 0117 10zM5.404 15.657a.75.75 0 010-1.06l-2.475-2.475a.75.75 0 01-1.06 1.06L4.343 15.657a.75.75 0 011.06 0zm9.192 0a.75.75 0 011.06 0l2.475-2.475a.75.75 0 11-1.06-1.06L15.657 14.596a.75.75 0 010 1.06zM10 17a.75.75 0 01.75-.75h3.5a.75.75 0 010 1.5h-3.5A.75.75 0 0110 17z" clipRule="evenodd" /></svg>);
const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>);
const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>);
const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0L8 8m4 4v-4m-4 4h8" /></svg>;
const InfoIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

// --- UI HELPER COMPONENTS ---
const getScoreColor = (score: number): string => {
  if (score >= 75) return 'bg-green-500';
  if (score >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
};

const ProgressBar: React.FC<{ label: string; score: number; explanation: string; }> = ({ label, score, explanation }) => (
  <div className="group relative">
    <div className="flex justify-between mb-1">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{score}%</span>
    </div>
    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
      <div className={`${getScoreColor(score)} h-2.5 rounded-full`} style={{ width: `${score}%` }}></div>
    </div>
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs hidden group-hover:block px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm opacity-90 dark:bg-gray-200 dark:text-gray-900 z-10">
      <div className="flex items-start gap-2">
        <InfoIcon className="w-5 h-5 flex-shrink-0" />
        <span>{explanation}</span>
      </div>
      <div className="tooltip-arrow" data-popper-arrow></div>
    </div>
  </div>
);

// --- CANDIDATE CARD COMPONENT ---
const RankedResultCard: React.FC<{ result: RankedResume; rank: number; onSelect: () => void }> = ({ result, rank, onSelect }) => {
  const { analysis, file } = result;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const scoreColor = getScoreColor(analysis.overallFitScore);
  const scoreTextColor = scoreColor.replace('bg-', 'text-').replace('-500', '-600 dark:text-') + '-400';

  return (
    <li className="bg-white dark:bg-gray-800 rounded-lg shadow-md transition-all duration-300 hover:shadow-lg hover:ring-2 hover:ring-blue-500">
      <div className="p-5 cursor-pointer" onClick={onSelect}>
        <div className="flex flex-col sm:flex-row items-start gap-4">
          {/* Score & Rank */}
          <div className="flex-shrink-0 flex flex-col items-center">
             <div className={`w-20 h-20 rounded-full flex flex-col items-center justify-center border-4 ${scoreColor.replace('bg-','border-')}`}>
              <span className={`text-3xl font-bold ${scoreTextColor}`}>{analysis.overallFitScore}</span>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Overall Fit</span>
            </div>
            <span className="mt-2 text-sm font-bold text-gray-600 dark:text-gray-300">Rank #{rank}</span>
          </div>

          {/* Candidate Info */}
          <div className="flex-grow min-w-0">
            <div className="flex flex-col sm:flex-row justify-between items-start">
                <div className="min-w-0">
                    <p className="text-xl font-bold text-gray-900 dark:text-white truncate" title={analysis.candidateName}>{analysis.candidateName}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{analysis.currentTitle}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{analysis.location} • {analysis.yearsOfExperience} years experience</p>
                </div>
                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                   <button onClick={handleDownload} className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"><DownloadIcon className="w-5 h-5"/></button>
                   <ChevronDownIcon className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                </div>
            </div>
            <div className="mt-3">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-white mb-2">Top Skills</h4>
              <div className="flex flex-wrap gap-2">
                {analysis.topSkills.slice(0, 3).map(skill => (
                  <span key={skill} className="px-2.5 py-1 text-xs font-medium text-blue-800 bg-blue-100 dark:bg-blue-900 dark:text-blue-300 rounded-full">{skill}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
            <ProgressBar label="Skill Match" score={analysis.skillMatchScore} explanation={analysis.scoreExplanations.skill} />
            <ProgressBar label="Experience Relevance" score={analysis.experienceRelevanceScore} explanation={analysis.scoreExplanations.experience} />
            <ProgressBar label="Education Fit" score={analysis.educationFitScore} explanation={analysis.scoreExplanations.education} />
        </div>
      </div>
    </li>
  );
};


// --- MAIN APP COMPONENT ---
function App() {
  const [resumes, setResumes] = useState<ResumeFile[]>([]);
  const [jobDescription, setJobDescription] = useState('');
  const [rankedResults, setRankedResults] = useState<RankedResume[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedResume, setSelectedResume] = useState<RankedResume | null>(null);
  const [progress, setProgress] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('overallFitScore');

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
      setRankedResults(results);

    } catch (err: any) {
        setError(`An AI analysis error occurred: ${err.message}`);
    } finally {
        setIsLoading(false);
        setProgress(0);
    }
  };
  
  const sortedResults = useMemo(() => {
    return [...rankedResults].sort((a, b) => b.analysis[sortKey] - a.analysis[sortKey]);
  }, [rankedResults, sortKey]);

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

  const downloadCSV = () => {
    const headers = [
      "Rank", "Candidate Name", "Overall Fit Score", "Skill Match Score", "Experience Relevance Score", "Education Fit Score",
      "Current Title", "Location", "Years of Experience", "Summary", "Top Skills", "Strengths", "Gaps", "File Name"
    ];
    const rows = sortedResults.map((result, index) => [
      index + 1,
      `"${result.analysis.candidateName.replace(/"/g, '""')}"`,
      result.analysis.overallFitScore,
      result.analysis.skillMatchScore,
      result.analysis.experienceRelevanceScore,
      result.analysis.educationFitScore,
      `"${result.analysis.currentTitle.replace(/"/g, '""')}"`,
      `"${result.analysis.location.replace(/"/g, '""')}"`,
      result.analysis.yearsOfExperience,
      `"${result.analysis.summary.replace(/"/g, '""')}"`,
      `"${result.analysis.topSkills.join(', ').replace(/"/g, '""')}"`,
      `"${result.analysis.strengths.join('; ').replace(/"/g, '""')}"`,
      `"${result.analysis.gaps.join('; ').replace(/"/g, '""')}"`,
      `"${result.file.name.replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "resume_ranking_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4 font-sans transition-colors duration-300">
      <div className="w-full max-w-5xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-8">
            <header className="text-center mb-8">
              <h1 className="text-4xl font-extrabold text-gray-800 dark:text-white flex items-center justify-center gap-3">
                <SparklesIcon className="w-9 h-9 text-blue-500" />
                AI Resume Ranker
              </h1>
              <p className="mt-2 text-md text-gray-600 dark:text-gray-400">Upload resumes, paste a job description, and get an instant, bias-free ranking.</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* File Upload */}
                <div className="flex flex-col">
                    <label className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">1. Upload Resumes</label>
                    <label htmlFor="file-upload" onDragEnter={handleDragEvents} onDragLeave={handleDragEvents} onDragOver={handleDragEvents} onDrop={handleDrop} className={`flex flex-col justify-center items-center w-full flex-grow px-4 transition bg-white dark:bg-gray-700 border-2 ${isDragging ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600'} border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none`}>
                        <UploadIcon className="w-10 h-10 text-gray-600 dark:text-gray-400" />
                        <span className="mt-2 font-medium text-gray-600 dark:text-gray-400 text-center">Drop resumes here or <span className="text-blue-600 underline">browse</span></span>
                        <input type="file" id="file-upload" multiple accept=".pdf,.docx" className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
                    </label>
                     {resumes.length > 0 && <div className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">✅ {resumes.length} resume(s) uploaded</div>}
                </div>
                
                {/* Job Description Input */}
                <div className="flex flex-col">
                    <label htmlFor="job-desc" className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">2. Paste Job Description</label>
                    <textarea id="job-desc" placeholder="Paste the full Job Description here..." value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} rows={8} className="w-full flex-grow p-4 text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
            </div>
            
            <div className="mt-6">
                <button onClick={handleAnalyze} disabled={!resumes.length || !jobDescription.trim() || isLoading} className="w-full flex justify-center items-center gap-3 py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed dark:disabled:bg-gray-500 transition-all">
                    {isLoading ? `Analyzing... (${progress}/${resumes.length})` : `Rank ${resumes.length} Resumes with AI`}
                </button>
            </div>


            {error && <div className="mt-4 text-center text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-lg">{error}</div>}

            {/* Results */}
            {rankedResults.length > 0 && (
                <div className="mt-10 animate-fade-in">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
                        <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Ranked Candidates</h2>
                        <div className="flex items-center gap-4 mt-2 sm:mt-0">
                            <div className="flex items-center gap-2">
                                <label htmlFor="sort" className="text-sm font-medium text-gray-600 dark:text-gray-300">Sort by:</label>
                                <select id="sort" value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
                                    <option value="overallFitScore">Overall Fit</option>
                                    <option value="skillMatchScore">Skill Match</option>
                                    <option value="experienceRelevanceScore">Experience</option>
                                </select>
                            </div>
                            <button onClick={downloadCSV} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700">
                                <DownloadIcon className="w-4 h-4"/>
                                Export CSV
                            </button>
                        </div>
                    </div>
                    
                    <ul className="space-y-4">
                        {sortedResults.map((result, index) => (
                          <RankedResultCard 
                            key={result.id} 
                            result={result} 
                            rank={index + 1}
                            onSelect={() => setSelectedResume(result)}
                          />
                        ))}
                    </ul>
                </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal for viewing resume text */}
      {selectedResume && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={() => setSelectedResume(null)}>
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
