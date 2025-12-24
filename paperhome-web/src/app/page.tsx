'use client';

import { useState } from 'react';
import { Upload, FileText, Check, Search, Globe, MapPin, ExternalLink, Loader2, Sparkles, BookOpen } from 'lucide-react';
import clsx from 'clsx'; // Assumes clsx installed, or I'll use template literals if not sure. 
// I'll stick to template literals if clsx isn't guaranteed, but I queued installation. 
// Let's use standard string concat for safety or checking valid syntax.

type Journal = {
  name: string;
  rank: string;
  issn: string;
  publisher: string;
  broad_field: string;
  specific_focus: string[] | string; // Normalized later
  avg_processing_time: string;
  url: string;
  source?: string;
};

type AnalysisResult = {
  field: string;
  keywords: string[];
  summary: string;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [results, setResults] = useState<{ national: Journal[], international: Journal[] } | null>(null);
  const [activeTab, setActiveTab] = useState<'national' | 'international'>('national');
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setAnalysis(null);
      setResults(null);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setAnalyzing(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const dat = await res.json();
        throw new Error(dat.error || 'Analysis failed');
      }

      const data = await res.json();
      setAnalysis(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSearch = async () => {
    if (!analysis) return;

    setSearching(true);
    setError(null);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: analysis.field, keywords: analysis.keywords }),
      });

      if (!res.ok) throw new Error('Search failed');

      const data = await res.json();
      setResults(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="space-y-2 mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-slate-800">
          Find the Perfect Journal
        </h2>
        <p className="text-slate-500 text-lg">
          Upload your manuscript and let PaperHome identify the best publishing venues for you.
        </p>
      </header>

      {/* Upload Section */}
      <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity -mr-16 -mt-16"></div>

        <div className="relative z-10 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-12 bg-slate-50/50 hover:bg-white hover:border-blue-400 transition-all duration-300">
          <input
            type="file"
            accept=".pdf,.txt" // Only accept PDF or Text
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          {!file ? (
            <>
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
                <Upload size={32} />
              </div>
              <h3 className="text-xl font-semibold text-slate-700 mb-2">Upload your Manuscript</h3>
              <p className="text-slate-500 text-center max-w-md">
                Drag and drop your PDF here, or click to browse. We'll analyze it locally and securely.
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 shadow-sm animate-bounce-short">
                <FileText size={32} />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-1">{file.name}</h3>
              <p className="text-slate-500 text-sm mb-6">{(file.size / 1024 / 1024).toFixed(2)} MB</p>

              <div className="flex gap-3">
                <button
                  onClick={() => setFile(null)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium text-sm"
                >
                  Change File
                </button>
                {!analysis && (
                  <button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-200 flex items-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {analyzing ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                    Analyze Paper
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-center gap-2">
          <span className="font-bold">Error:</span> {error}
        </div>
      )}

      {/* Analysis Results */}
      {analysis && (
        <section className="animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="text-purple-500" size={24} />
                Analysis Results
              </h3>
              {!results && (
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all disabled:opacity-70"
                >
                  {searching ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                  Find Matching Journals
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Detected Field</p>
                  <p className="text-2xl font-bold text-slate-800">{analysis.field}</p>
                </div>
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Summary</p>
                  <p className="text-slate-700 leading-relaxed">{analysis.summary}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 h-full">
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Keywords</p>
                  <div className="flex flex-wrap gap-2">
                    {analysis.keywords.map((k, i) => (
                      <span key={i} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 font-medium shadow-sm">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Search Results */}
      {results && (
        <section className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
          <div className="flex items-center gap-4 border-b border-slate-200 pb-1">
            <button
              onClick={() => setActiveTab('national')}
              className={`px-6 py-3 font-medium text-lg relative ${activeTab === 'national' ? 'text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              National (SINTA)
              {activeTab === 'national' && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-t-full"></div>}
            </button>
            <button
              onClick={() => setActiveTab('international')}
              className={`px-6 py-3 font-medium text-lg relative ${activeTab === 'international' ? 'text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              International (Scopus/DOAJ)
              {activeTab === 'international' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"></div>}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {(activeTab === 'national' ? results.national : results.international).length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                No journals found in this category.
              </div>
            ) : (
              (activeTab === 'national' ? results.national : results.international).map((journal, idx) => (
                <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${activeTab === 'national' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
                    {activeTab === 'national' ? <MapPin size={24} /> : <Globe size={24} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-lg font-bold text-slate-800 truncate pr-4" title={journal.name}>{journal.name}</h4>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                          <span>{journal.publisher}</span>
                          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                          <span className="font-mono bg-slate-100 px-1.5 rounded">{journal.issn}</span>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${journal.rank.includes('SINTA 1') || journal.rank.includes('SINTA 2') ? 'bg-green-100 text-green-700' :
                          journal.rank.includes('Scopus') ? 'bg-purple-100 text-purple-700' :
                            'bg-slate-100 text-slate-600'
                        }`}>
                        {journal.rank}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {(Array.isArray(journal.specific_focus) ? journal.specific_focus : [journal.specific_focus]).map((tag: any, i: number) => (
                        typeof tag === 'string' && (
                          <span key={i} className="px-2.5 py-1 bg-slate-50 text-slate-600 text-xs rounded-md border border-slate-100 truncate max-w-[200px]">
                            {tag}
                          </span>
                        )
                      ))}
                    </div>
                  </div>

                  <div className="self-center pl-4 border-l border-slate-100 flex flex-col items-center gap-2">
                    <a
                      href={journal.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Visit Website"
                    >
                      <ExternalLink size={20} />
                    </a>
                    <div className="text-xs text-center font-medium text-slate-400 w-20">
                      {journal.avg_processing_time}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}
