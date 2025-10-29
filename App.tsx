import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
  softSkills: string;
  technicalSkills: string;
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
  softSkillsScore: number;
  technicalSkillsScore: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  topSkills: string[];
  suggestedQuestions: string[];
  scoreExplanations: ScoreExplanation;
  rankingJustification: string;
}

interface RankedResume extends ResumeFile {
  analysis: AnalysisReport;
}

type SortKey = "overallFitScore" | "skillMatchScore" | "experienceRelevanceScore" | "technicalSkillsScore";
type FilterKey = 'all' | 'topPicks';


// --- ICON COMPONENTS ---
const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>);
const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}><path fillRule="evenodd" d="M10 2a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 2zM5.404 4.343a.75.75 0 010 1.06l-2.475 2.475a.75.75 0 11-1.06-1.06L4.343 4.343a.75.75 0 011.06 0zm9.192 0a.75.75 0 011.06 0l2.475 2.475a.75.75 0 11-1.06 1.06L15.657 5.404a.75.75 0 010-1.06zM2 10a.75.75 0 01.75-.75h3.5a.75.75 0 010 1.5h-3.5A.75.75 0 012 10zM17 10a.75.75 0 01.75-.75h3.5a.75.75 0 010 1.5h-3.5A.75.75 0 0117 10zM5.404 15.657a.75.75 0 010-1.06l-2.475-2.475a.75.75 0 01-1.06 1.06L4.343 15.657a.75.75 0 011.06 0zm9.192 0a.75.75 0 011.06 0l2.475-2.475a.75.75 0 11-1.06-1.06L15.657 14.596a.75.75 0 010 1.06zM10 17a.75.75 0 01.75-.75h3.5a.75.75 0 010 1.5h-3.5A.75.75 0 0110 17z" clipRule="evenodd" /></svg>);
const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>);
const EyeIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0L8 8m4 4v-4m-4 4h8" /></svg>;
const InfoIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ThumbsUpIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}><path d="M1 8.25a1.25 1.25 0 112.5 0v7.5a1.25 1.25 0 11-2.5 0v-7.5zM11 3V1.7c0-.268.14-.516.372-.648A.755.755 0 0112 1.7v1.362c0 .332.174.647.458.822l5.013 2.924a1.25 1.25 0 01.529 1.043v4.288a1.25 1.25 0 01-1.25 1.25h-3.336a1.25 1.25 0 01-1.158-.808l-1.425-4.274a.25.25 0 00-.472-.036l-1.29 4.84A1.25 1.25 0 017.25 16h-1.5a.75.75 0 01-.75-.75V8.25a.75.75 0 01.75-.75h2a.75.75 0 01.75.75v5.336l1.01-3.786a1.25 1.25 0 012.366.632L11 12.75V3z" /></svg>;
const ThumbsDownIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}><path d="M1 11.75a1.25 1.25 0 102.5 0V4.25a1.25 1.25 0 10-2.5 0v7.5zM11 17v1.3c0 .268-.14.516-.372-.648A.755.755 0 0012 18.3v-1.362a1.25 1.25 0 00-.458-.822L6.529 13.192a1.25 1.25 0 00-.529-1.043V7.86a1.25 1.25 0 001.25-1.25h3.336a1.25 1.25 0 001.158.808l1.425 4.274a.25.25 0 01.472.036l1.29-4.84A1.25 1.25 0 0014.75 4h1.5a.75.75 0 00.75.75v7.5a.75.75 0 00-.75.75h-2a.75.75 0 00-.75-.75V6.664l-1.01 3.786a1.25 1.25 0 00-2.366-.632L11 7.25V17z" /></svg>;
const StarIcon: React.FC<{ className?: string; filled?: boolean }> = ({ className, filled }) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>{filled ? (<path fillRule="evenodd" d="M10.868 2.884c.321-.662 1.215-.662 1.536 0l1.822 3.755 4.132.602c.73.107 1.022.992.494 1.503l-2.99 2.913.706 4.116c.124.727-.638 1.283-1.296.952L10 15.127l-3.673 1.93c-.658.332-1.42-.225-1.296-.952l.706-4.116-2.99-2.913c-.528-.511-.236-1.396.494-1.503l4.132-.602 1.822-3.755z" clipRule="evenodd" />) : (<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />)}</svg>);
const SunIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.95-4.243-1.591 1.591M5.25 12H3m4.243-4.95-1.591-1.591M12 12a2.25 2.25 0 0 0-2.25 2.25c0 1.242 1.008 2.25 2.25 2.25s2.25-1.008 2.25-2.25a2.25 2.25 0 0 0-2.25-2.25Z" /></svg>);
const MoonIcon: React.FC<{ className?: string }> = ({ className }) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25c0 5.385 4.365 9.75 9.75 9.75 2.138 0 4.127-.693 5.752-1.848Z" /></svg>);


// --- UI HELPER COMPONENTS ---
const getScoreColor = (score: number): string => {
  if (score >= 75) return 'bg-green-500';
  if (score >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
};

const InitialsAvatar: React.FC<{ name: string; score: number }> = ({ name, score }) => {
    const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    const bgColor = getScoreColor(score);
    return (
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${bgColor} text-white font-bold text-xl`}>
            {initials}
        </div>
    );
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
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs hidden group-hover:block px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm opacity-95 dark:bg-gray-200 dark:text-gray-900 z-10">
      <div className="flex items-start gap-2">
        <InfoIcon className="w-5 h-5 flex-shrink-0" />
        <span>{explanation}</span>
      </div>
    </div>
  </div>
);

// --- CANDIDATE INSIGHTS MODAL ---
const InsightModal: React.FC<{ result: RankedResume; onClose: () => void; jobDescription: string }> = ({ result, onClose, jobDescription }) => {
    const { analysis } = result;
    const [activeTab, setActiveTab] = useState<'analysis' | 'resume'>('analysis');

    const HighlightedText = useMemo(() => {
      const text = result.content;
      const queryTokens = new Set(jobDescription.toLowerCase().split(/\s+/).filter(t => t.length > 3));
      const words = text.split(/(\s+)/);
      return words.map((word, i) => {
          const cleanWord = word.toLowerCase().replace(/[.,;:"()?!\[\]{}]+$/, '');
          if(queryTokens.has(cleanWord)) {
              return <mark key={i} className="bg-yellow-300 dark:bg-yellow-500 rounded">{word}</mark>
          }
          return word;
      })
    }, [result.content, jobDescription]);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={onClose}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
          <header className="flex justify-between items-center p-4 border-b dark:border-gray-700">
            <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white truncate">{analysis.candidateName}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{analysis.currentTitle}</p>
            </div>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><CloseIcon className="w-6 h-6 text-gray-600 dark:text-gray-300"/></button>
          </header>
          
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px px-4" aria-label="Tabs">
              <button onClick={() => setActiveTab('analysis')} className={`shrink-0 border-b-2 py-3 px-4 text-sm font-medium ${activeTab === 'analysis' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'}`}>AI Analysis</button>
              <button onClick={() => setActiveTab('resume')} className={`shrink-0 border-b-2 py-3 px-4 text-sm font-medium ${activeTab === 'resume' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'}`}>Full Resume</button>
            </nav>
          </div>

          <main className="p-6 overflow-y-auto">
            {activeTab === 'analysis' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-4">
                  <h4 className="font-semibold text-gray-800 dark:text-white">Fit Scores</h4>
                  <ProgressBar label="Overall Fit" score={analysis.overallFitScore} explanation={analysis.scoreExplanations.overall} />
                  <ProgressBar label="Skill Match" score={analysis.skillMatchScore} explanation={analysis.scoreExplanations.skill} />
                  <ProgressBar label="Technical Skills" score={analysis.technicalSkillsScore} explanation={analysis.scoreExplanations.technicalSkills} />
                  <ProgressBar label="Experience" score={analysis.experienceRelevanceScore} explanation={analysis.scoreExplanations.experience} />
                  <ProgressBar label="Soft Skills" score={analysis.softSkillsScore} explanation={analysis.scoreExplanations.softSkills} />
                  <ProgressBar label="Education Fit" score={analysis.educationFitScore} explanation={analysis.scoreExplanations.education} />
                </div>
                <div className="md:col-span-2 space-y-6">
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-white mb-2">AI Summary</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{analysis.summary}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-800 dark:text-white mb-2 flex items-center gap-2"><ThumbsUpIcon className="w-5 h-5 text-green-500"/>Strengths</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-300">
                        {analysis.strengths.map(s => <li key={s}>{s}</li>)}
                      </ul>
                    </div>
                     <div>
                      <h4 className="font-semibold text-gray-800 dark:text-white mb-2 flex items-center gap-2"><ThumbsDownIcon className="w-5 h-5 text-red-500"/>Potential Gaps</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-300">
                        {analysis.gaps.map(g => <li key={g}>{g}</li>)}
                      </ul>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-white mb-2">Suggested Interview Questions</h4>
                    <ul className="list-decimal list-inside space-y-2 text-sm text-gray-600 dark:text-gray-300">
                      {analysis.suggestedQuestions.map(q => <li key={q}>{q}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'resume' && (
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 dark:text-gray-300">{HighlightedText}</pre>
            )}
          </main>
        </div>
      </div>
    );
};

// --- CANDIDATE CARD COMPONENT ---
const RankedResultCard: React.FC<{ 
    result: RankedResume; 
    rank: number; 
    onViewInsights: () => void;
    onTopPickToggle: (id: string) => void;
    isTopPick: boolean;
}> = ({ result, rank, onViewInsights, onTopPickToggle, isTopPick }) => {
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

  const handleTopPickClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onTopPickToggle(result.id);
  }

  return (
    <li className={`bg-white dark:bg-gray-800 rounded-lg shadow-md transition-all duration-300 hover:shadow-xl ${isTopPick ? 'ring-2 ring-yellow-400' : 'hover:ring-2 hover:ring-blue-400/50'}`}>
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Rank, Avatar */}
          <div className="flex-shrink-0 flex flex-col items-center gap-2">
            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">#{rank}</span>
            <InitialsAvatar name={analysis.candidateName} score={analysis.overallFitScore} />
          </div>

          {/* Candidate Info */}
          <div className="flex-grow min-w-0">
            <div className="flex flex-col sm:flex-row justify-between items-start">
                <div className="min-w-0">
                    <p className="text-xl font-bold text-gray-900 dark:text-white truncate" title={analysis.candidateName}>{analysis.candidateName}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{analysis.currentTitle}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{analysis.location} • {analysis.yearsOfExperience} years exp.</p>
                </div>
                <div className="flex items-center gap-1 mt-2 sm:mt-0">
                   <button onClick={handleTopPickClick} title="Mark as Top Pick" className={`p-2 rounded-full transition-colors ${isTopPick ? 'text-yellow-400 hover:text-yellow-500 bg-yellow-400/10' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                       <StarIcon className="w-5 h-5" filled={isTopPick} />
                   </button>
                   <button onClick={onViewInsights} title="View AI Insights" className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"><EyeIcon className="w-5 h-5"/></button>
                   <button onClick={handleDownload} title="Download Resume" className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"><DownloadIcon className="w-5 h-5"/></button>
                </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 dark:bg-gray-700/50 rounded-lg text-sm">
              <p className="text-gray-800 dark:text-gray-200 flex items-start gap-2">
                <InfoIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5"/>
                <span className="font-semibold">Justification:</span>
                <span>{analysis.rankingJustification}</span>
              </p>
            </div>
             
             <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                <ProgressBar label="Overall Fit" score={analysis.overallFitScore} explanation={analysis.scoreExplanations.overall} />
                <ProgressBar label="Skill Match" score={analysis.skillMatchScore} explanation={analysis.scoreExplanations.skill} />
            </div>
          </div>
        </div>
      </div>
    </li>
  );
};

// --- LAYOUT COMPONENTS ---
const Header: React.FC<{ theme: string; toggleTheme: () => void; }> = ({ theme, toggleTheme }) => {
    return (
        <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-40 w-full border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center gap-2">
                        <SparklesIcon className="w-7 h-7 text-blue-500" />
                        <span className="text-xl font-bold text-gray-800 dark:text-white">AI Resume Ranker</span>
                    </div>
                    <button onClick={toggleTheme} title="Toggle Theme" className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors">
                        <span className="sr-only">Toggle Theme</span>
                        {theme === 'dark' ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
                    </button>
                </div>
            </div>
        </header>
    );
};

const Footer: React.FC = () => {
    return (
        <footer className="py-6 px-4">
            <div className="max-w-5xl mx-auto text-center text-sm text-gray-500 dark:text-gray-400">
                &copy; {new Date().getFullYear()} Resume Ranker. All Rights Reserved.
            </div>
        </footer>
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
  const [selectedInsight, setSelectedInsight] = useState<RankedResume | null>(null);
  const [progress, setProgress] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('overallFitScore');
  const [topPickIds, setTopPickIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterKey>('all');
  const [apiKey] = useState<string>('AIzaSyD2oXJKgbwwslDxhSZsm8F9ZuPdCFjmidA');
  const [theme, setTheme] = useState(() => {
    if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        return 'dark';
    }
    return 'light';
  });
  const [countdown, setCountdown] = useState(0);
  const timerRef = React.useRef<number | null>(null);


  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(t => t === 'light' ? 'dark' : 'light');
  };
  
  useEffect(() => {
    if (isLoading) {
        timerRef.current = window.setInterval(() => {
            setCountdown(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);
    } else {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
    }
    return () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
    };
  }, [isLoading]);

  // --- AI & ANALYSIS UTILITY FUNCTIONS ---
  const getAiAnalysis = async (jobDescription: string, resumeContent: string): Promise<AnalysisReport> => {
    if (!apiKey) {
        throw new Error("API Key is missing. Please enter your Gemini API Key.");
    }
    const ai = new GoogleGenAI({ apiKey });

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
        softSkillsScore: { type: Type.NUMBER, description: "A score from 0-100 evaluating soft skills like communication, teamwork, and leadership." },
        technicalSkillsScore: { type: Type.NUMBER, description: "A score from 0-100 measuring the presence of specific tools and technologies from the job description." },
        summary: { type: Type.STRING, description: "A 2-3 sentence summary of the candidate's profile and suitability." },
        strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Key strengths of the candidate for this role." },
        gaps: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Potential gaps or missing qualifications compared to the job description." },
        topSkills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "The top 3-5 most relevant skills found in the resume." },
        suggestedQuestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Insightful interview questions to ask the candidate." },
        scoreExplanations: {
            type: Type.OBJECT,
            properties: {
                overall: { type: Type.STRING, description: "A 1-sentence explanation for the Overall Fit score." },
                skill: { type: Type.STRING, description: "A 1-sentence explanation for the Skill Match score." },
                experience: { type: Type.STRING, description: "A 1-sentence explanation for the Experience Relevance score." },
                education: { type: Type.STRING, description: "A 1-sentence explanation for the Education Fit score." },
                softSkills: { type: Type.STRING, description: "A 1-sentence explanation for the Soft Skills score." },
                technicalSkills: { type: Type.STRING, description: "A 1-sentence explanation for the Technical Skills score." },
            },
            required: ["overall", "skill", "experience", "education", "softSkills", "technicalSkills"]
        },
        rankingJustification: { type: Type.STRING, description: "A concise, one-sentence explanation for why this candidate is a strong or weak fit, summarizing the key factors that influenced their ranking." },
      },
      required: ["candidateName", "currentTitle", "location", "yearsOfExperience", "overallFitScore", "skillMatchScore", "experienceRelevanceScore", "educationFitScore", "softSkillsScore", "technicalSkillsScore", "summary", "strengths", "gaps", "topSkills", "suggestedQuestions", "scoreExplanations", "rankingJustification"],
    };

    const prompt = `
      You are an expert HR recruitment analyst. Your task is to perform a detailed, multi-faceted semantic analysis of a resume against a job description.
      Your analysis must be completely objective and free of bias. Do not consider any personal identifiers like name, gender, or ethnicity in your scoring.
      Focus on the contextual meaning and relevance of the candidate's experience and skills, not just keyword matching.
      Return a single, structured JSON object that strictly adheres to the provided schema. Do not include any introductory text, markdown formatting, or backticks.

      **Job Description:**
      ---
      ${jobDescription}
      ---

      **Resume Content:**
      ---
      ${resumeContent}
      ---

      Analyze the resume and provide scores and text for all fields in the JSON schema. Be critical and realistic in your scoring. Provide a concise, one-sentence justification for the candidate's overall fit, suitable for explaining their rank.
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
    if (!resumes.length || !jobDescription.trim() || !apiKey.trim()) return;

    const estimatedSeconds = 5 + resumes.length * 2; // 5s base + 2s per resume
    setCountdown(estimatedSeconds);

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
  
  const handleTopPickToggle = (id: string) => {
      setTopPickIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(id)) {
              newSet.delete(id);
          } else {
              newSet.add(id);
          }
          return newSet;
      });
  };

  const displayedResults = useMemo(() => {
    const sorted = [...rankedResults].sort((a, b) => b.analysis[sortKey] - a.analysis[sortKey]);
    if (filter === 'topPicks') {
        return sorted.filter(r => topPickIds.has(r.id));
    }
    return sorted;
  }, [rankedResults, sortKey, filter, topPickIds]);


  const downloadCSV = () => {
    const headers = [
      "Rank", "Candidate Name", "Overall Fit", "Skill Match", "Tech Skills", "Soft Skills", "Experience", "Education",
      "Current Title", "Location", "Years of Exp", "Summary", "Top Skills", "Strengths", "Gaps", "File Name", "Top Pick"
    ];
    const rows = displayedResults.map((result, index) => [
      index + 1,
      `"${result.analysis.candidateName.replace(/"/g, '""')}"`,
      result.analysis.overallFitScore,
      result.analysis.skillMatchScore,
      result.analysis.technicalSkillsScore,
      result.analysis.softSkillsScore,
      result.analysis.experienceRelevanceScore,
      result.analysis.educationFitScore,
      `"${result.analysis.currentTitle.replace(/"/g, '""')}"`,
      `"${result.analysis.location.replace(/"/g, '""')}"`,
      result.analysis.yearsOfExperience,
      `"${result.analysis.summary.replace(/"/g, '""')}"`,
      `"${result.analysis.topSkills.join(', ').replace(/"/g, '""')}"`,
      `"${result.analysis.strengths.join('; ').replace(/"/g, '""')}"`,
      `"${result.analysis.gaps.join('; ').replace(/"/g, '""')}"`,
      `"${result.file.name.replace(/"/g, '""')}"`,
      topPickIds.has(result.id) ? "Yes" : "No"
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
    <div className="flex flex-col min-h-screen transition-colors duration-300">
      <Header theme={theme} toggleTheme={toggleTheme} />
      <main className="flex-grow w-full p-4">
        <div className="w-full max-w-5xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-8">
              <header className="text-center mb-8">
                <h2 className="text-3xl font-extrabold text-gray-800 dark:text-white flex items-center justify-center gap-3">
                  <SparklesIcon className="w-8 h-8 text-blue-500" />
                  AI-Powered Resume Analysis
                </h2>
                <p className="mt-2 text-md text-gray-600 dark:text-gray-400">Upload resumes, paste a job description, and get an instant, bias-free ranking.</p>
              </header>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col">
                      <label className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">1. Upload Resumes</label>
                      <label htmlFor="file-upload" onDragEnter={handleDragEvents} onDragLeave={handleDragEvents} onDragOver={handleDragEvents} onDrop={handleDrop} className={`flex flex-col justify-center items-center w-full flex-grow px-4 transition bg-white dark:bg-gray-700 border-2 ${isDragging ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600'} border-dashed rounded-lg appearance-none cursor-pointer hover:border-gray-400 focus:outline-none`}>
                          <UploadIcon className="w-10 h-10 text-gray-600 dark:text-gray-400" />
                          <span className="mt-2 font-medium text-gray-600 dark:text-gray-400 text-center">Drop resumes here or <span className="text-blue-600 underline">browse</span></span>
                          <input type="file" id="file-upload" multiple accept=".pdf,.docx" className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
                      </label>
                       {resumes.length > 0 && <div className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300 animate-fade-in">✅ {resumes.length} resume(s) uploaded</div>}
                  </div>
                  
                  <div className="flex flex-col">
                      <label htmlFor="job-desc" className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">2. Paste Job Description</label>
                      <textarea id="job-desc" placeholder="Paste the full Job Description here..." value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} rows={8} className="w-full flex-grow p-4 text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
              </div>
              
              <div className="mt-6">
                  <button onClick={handleAnalyze} disabled={!resumes.length || !jobDescription.trim() || !apiKey.trim() || isLoading} className="w-full flex justify-center items-center gap-3 py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed dark:disabled:bg-gray-500 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/30">
                      {isLoading ? `Analyzing... (${progress}/${resumes.length})` : `Rank ${resumes.length} Resumes`}
                  </button>
              </div>

              {isLoading && (
                  <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400 animate-fade-in">
                    <p>Processing — we’re calling AI. If busy, results will appear in {countdown} seconds.</p>
                  </div>
              )}

              {error && <div className="mt-4 text-center text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-lg">{error}</div>}

              {rankedResults.length > 0 && (
                  <div className="mt-10 animate-slide-up">
                      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                          <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Ranked Candidates</h2>
                          <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                 <span className="isolate inline-flex rounded-md shadow-sm">
                                  <button onClick={() => setFilter('all')} type="button" className={`relative inline-flex items-center rounded-l-md px-3 py-2 text-sm font-semibold ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>All ({rankedResults.length})</button>
                                  <button onClick={() => setFilter('topPicks')} type="button" className={`relative -ml-px inline-flex items-center rounded-r-md px-3 py-2 text-sm font-semibold ${filter === 'topPicks' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}><StarIcon className="w-4 h-4 mr-1.5 -ml-0.5 text-yellow-300" filled/>Top Picks ({topPickIds.size})</button>
                                 </span>
                              </div>
                               <div className="flex items-center gap-2">
                                  <label htmlFor="sort" className="text-sm font-medium text-gray-600 dark:text-gray-300">Sort by:</label>
                                  <select id="sort" value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white">
                                      <option value="overallFitScore">Overall Fit</option>
                                      <option value="skillMatchScore">Skill Match</option>
                                      <option value="technicalSkillsScore">Tech Skills</option>
                                      <option value="experienceRelevanceScore">Experience</option>
                                  </select>
                              </div>
                              <button onClick={downloadCSV} title="Export current view to CSV" className="p-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700">
                                  <DownloadIcon className="w-5 h-5"/>
                              </button>
                          </div>
                      </div>
                      
                      <ul className="space-y-4">
                          {displayedResults.map((result, index) => (
                            <RankedResultCard 
                              key={result.id} 
                              result={result} 
                              rank={index + 1}
                              onViewInsights={() => setSelectedInsight(result)}
                              onTopPickToggle={handleTopPickToggle}
                              isTopPick={topPickIds.has(result.id)}
                            />
                          ))}
                      </ul>
                      {displayedResults.length === 0 && (
                          <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                              <p>No candidates match the current filter.</p>
                          </div>
                      )}
                  </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {selectedInsight && (
        <InsightModal 
            result={selectedInsight} 
            onClose={() => setSelectedInsight(null)}
            jobDescription={jobDescription}
        />
      )}
    </div>
  );
}

export default App;
