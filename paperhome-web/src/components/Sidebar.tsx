'use client';

import { Home, BookOpen, Settings, FileText, Check } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const [showCitationModal, setShowCitationModal] = useState(false);
    const [citationStyle, setCitationStyle] = useState('APA 7th Edition');

    const styles = [
        "APA 7th Edition",
        "MLA 9th Edition",
        "Chicago Author-Date",
        "Harvard",
        "IEEE"
    ];

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={onClose}
                />
            )}

            <aside className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 h-full flex flex-col shadow-xl lg:shadow-sm transition-transform duration-300 ease-in-out
                lg:static lg:translate-x-0
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img
                            src="/logomark.png"
                            alt="PaperHome Logo"
                            className="h-11 w-auto object-contain"
                        />
                    </div>
                    {/* Mobile Close Button */}
                    <button
                        onClick={onClose}
                        className="lg:hidden p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </button>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    <Link href="/" className="flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-700 rounded-xl font-medium transition-all shadow-sm">
                        <Home size={20} />
                        Find Journal
                    </Link>
                    <Link href="#" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all font-medium">
                        <BookOpen size={20} />
                        My Library
                    </Link>
                    <Link href="#" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all font-medium">
                        <FileText size={20} />
                        Drafts
                    </Link>

                    <div className="pt-6 mt-2">
                        <p className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Settings</p>
                        <button
                            onClick={() => setShowCitationModal(true)}
                            className="w-full flex items-center gap-3 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm transition-colors"
                        >
                            <Settings size={18} />
                            Citation Style
                        </button>
                    </div>
                </nav>
                <div className="p-4 border-t border-slate-100">
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">
                            RA
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-700">Rahman H.</p>
                            <p className="text-xs text-slate-500">Researcher</p>
                        </div>
                    </div>
                </div>
            </aside>

            {showCitationModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Select Citation Style</h3>
                        <div className="space-y-2">
                            {styles.map((style) => (
                                <button
                                    key={style}
                                    onClick={() => {
                                        setCitationStyle(style);
                                        setShowCitationModal(false);
                                    }}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm font-medium transition-all ${citationStyle === style
                                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                                        : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    {style}
                                    {citationStyle === style && <Check size={16} />}
                                </button>
                            ))}
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setShowCitationModal(false)}
                                className="px-4 py-2 text-slate-500 hover:text-slate-700 text-sm font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
