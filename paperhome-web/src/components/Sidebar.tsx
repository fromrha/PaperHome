import { Home, Search, BookOpen, Settings, FileText } from 'lucide-react';
import Link from 'next/link';

export default function Sidebar() {
    return (
        <aside className="w-64 bg-white border-r border-slate-200 h-full flex flex-col shadow-sm z-10">
            <div className="p-6 border-b border-slate-100 flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                    P
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
                    PaperHome
                </h1>
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
                    <button className="w-full flex items-center gap-3 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm transition-colors">
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
                        <p className="text-sm font-semibold text-slate-700">Rahma A.</p>
                        <p className="text-xs text-slate-500">Researcher</p>
                    </div>
                </div>
            </div>
        </aside>
    )
}
