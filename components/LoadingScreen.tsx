import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center mb-8">
        {/* Pulsing background circle */}
        <div className="absolute w-24 h-24 bg-indigo-100 rounded-full animate-ping opacity-75"></div>
        
        {/* Main Logo Container */}
        <div className="relative z-10 bg-gradient-to-br from-indigo-600 to-violet-600 p-5 rounded-2xl shadow-xl shadow-indigo-200">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      </div>
      
      <div className="text-center space-y-3">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">FinAgent</h2>
        <div className="flex items-center gap-2 justify-center text-sm font-medium text-slate-500 uppercase tracking-widest">
            <span>Reconciliation Workspace</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-12 w-64 h-1 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-600 animate-[loading_1.5s_ease-in-out_infinite] w-1/3 rounded-full"></div>
      </div>
      
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;