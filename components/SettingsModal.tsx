import React, { useState, useEffect } from 'react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (key: string) => void;
}

const SettingsModal: React.FC<Props> = ({ isOpen, onClose, onSave }) => {
    const [key, setKey] = useState('');

    useEffect(() => {
        const stored = localStorage.getItem('user_gemini_api_key');
        if(stored) setKey(stored);
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-[slideUp_0.3s_ease-out]">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">System Configuration</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                
                <div className="p-6 space-y-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                             <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Gemini API Key</label>
                             <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-indigo-600 hover:text-indigo-700 font-semibold hover:underline flex items-center gap-1">
                                Get Key <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                             </a>
                        </div>
                        <div className="relative">
                            <input 
                                type="password" 
                                value={key}
                                onChange={(e) => setKey(e.target.value)}
                                placeholder="Paste your AIzaSy... key here"
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-transparent outline-none transition-all placeholder:text-slate-400 font-mono text-slate-700"
                            />
                            <svg className="w-5 h-5 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                            Leave empty to use <strong>Demo Mode</strong> (Simulated Data). Enter a valid Google Gemini API key to enable live reasoning, email drafting, and chat.
                        </p>
                    </div>
                    
                    <div className="flex gap-3 pt-2">
                         <button 
                            onClick={() => {
                                onSave(key);
                                onClose();
                            }}
                            className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3 rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-indigo-200 transition-all active:scale-[0.98]"
                        >
                            Save Configuration
                        </button>
                    </div>
                </div>
            </div>
             <style>{`
                  @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                  }
                `}</style>
        </div>
    )
}

export default SettingsModal;