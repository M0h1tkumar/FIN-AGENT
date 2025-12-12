import React, { useState, useRef, useEffect } from 'react';
import { Transaction, AgentRole, AuditLog, ChatMessage, PredictionResult, AutoPilotPlan } from '../types';
import { analyzeFailure, draftVendorEmail, validateRectification, askTransactionQuestion, predictResolutionLikelihood, generateAutoPilotPlan } from '../services/geminiService';

interface Props {
  transaction: Transaction;
  onAddLog: (log: AuditLog) => void;
  onUpdateStatus: (status: any) => void;
}

const AgentPanel: React.FC<Props> = ({ transaction, onAddLog, onUpdateStatus }) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Action State
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState<{ subject: string; body: string } | null>(null);
  const [rectificationNote, setRectificationNote] = useState('');

  // ML & Agentic State
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [autoPilotActive, setAutoPilotActive] = useState(false);
  const [autoPilotPlan, setAutoPilotPlan] = useState<AutoPilotPlan | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);

  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Reset state when transaction changes
  useEffect(() => {
    setAnalysis(null);
    setEmailDraft(null);
    setRectificationNote('');
    setPrediction(null);
    setAutoPilotActive(false);
    setAutoPilotPlan(null);
    setCurrentStepIndex(-1);

    setChatHistory([{
        id: 'welcome',
        role: 'assistant',
        content: `Hello! I'm reviewing invoice ${transaction.invoiceId} from ${transaction.vendorName}. How can I assist you?`,
        timestamp: new Date()
    }]);
    setIsChatOpen(false);

    // Run background ML prediction
    if(transaction.status === 'FAILED') {
        predictResolutionLikelihood(transaction).then(setPrediction);
    }
  }, [transaction.id, transaction.status]);

  useEffect(() => {
      if (isChatOpen) {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
  }, [chatHistory, isChatOpen]);

  const handleAnalyze = async () => {
    setLoading(true);
    setAnalysis(null);
    setEmailDraft(null);
    
    const result = await analyzeFailure(transaction);
    setAnalysis(result);
    setLoading(false);

    onAddLog({
      id: `LOG-${Date.now()}`,
      transactionId: transaction.id,
      timestamp: new Date().toISOString(),
      agent: AgentRole.AUDITOR,
      action: 'Analyzed Failure',
      details: 'Automated analysis of failure reason requested by user.',
      metadata: { content: result }
    });
  };

  const handleDraftEmail = async () => {
    setLoading(true);
    setAnalysis(null);
    setEmailDraft(null);

    const draft = await draftVendorEmail(transaction);
    setEmailDraft(draft);
    setLoading(false);

    onUpdateStatus('RECTIFYING');
    onAddLog({
        id: `LOG-${Date.now()}`,
        transactionId: transaction.id,
        timestamp: new Date().toISOString(),
        agent: AgentRole.LIAISON,
        action: 'Drafted Communication',
        details: 'Drafted email to vendor regarding exception.',
        metadata: { content: `Subject: ${draft.subject}\nBody: ${draft.body}` }
    });
  };

  const handleSendEmail = () => {
      onAddLog({
        id: `LOG-${Date.now()}`,
        transactionId: transaction.id,
        timestamp: new Date().toISOString(),
        agent: AgentRole.LIAISON,
        action: 'Sent Email',
        details: `Email sent to ${transaction.vendorEmail}`,
    });
    setEmailDraft(null);
    alert("Email simulated sent to " + transaction.vendorEmail);
  }

  const handleRectify = async () => {
      if(!rectificationNote) return;
      setLoading(true);

      const validation = await validateRectification(transaction, rectificationNote);
      
      setLoading(false);
      
      if(validation.includes("APPROVED")) {
          onUpdateStatus('RECTIFIED');
          onAddLog({
            id: `LOG-${Date.now()}`,
            transactionId: transaction.id,
            timestamp: new Date().toISOString(),
            agent: AgentRole.CONTROLLER,
            action: 'Rectification Approved',
            details: `Correction approved: ${rectificationNote}. Validation: ${validation}`,
          });
          setRectificationNote('');
      } else {
           onAddLog({
            id: `LOG-${Date.now()}`,
            transactionId: transaction.id,
            timestamp: new Date().toISOString(),
            agent: AgentRole.CONTROLLER,
            action: 'Rectification Rejected',
            details: `Correction rejected. Validation: ${validation}`,
          });
          alert(`Controller Validation Failed: ${validation}`);
      }
  }

  // --- AGENTIC WORKFLOW ---
  const handleAutoResolve = async () => {
      setAutoPilotActive(true);
      setLoading(true);

      // 1. Get Plan from Gemini 3
      const plan = await generateAutoPilotPlan(transaction);
      setAutoPilotPlan(plan);
      
      // Execute steps sequentially with simulated delays
      for (let i = 0; i < plan.steps.length; i++) {
          setCurrentStepIndex(i);
          const step = plan.steps[i];
          
          await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate complex thinking

          if (step.action === 'ANALYZE') {
              const analysis = await analyzeFailure(transaction);
              onAddLog({
                id: `LOG-${Date.now()}`,
                transactionId: transaction.id,
                timestamp: new Date().toISOString(),
                agent: AgentRole.SYSTEM,
                action: 'Auto-Pilot: Analysis',
                details: step.description,
                metadata: { content: analysis }
              });
              setAnalysis(analysis); // Show in UI
          } 
          else if (step.action === 'EMAIL_VENDOR') {
              const draft = await draftVendorEmail(transaction);
              onAddLog({
                id: `LOG-${Date.now()}`,
                transactionId: transaction.id,
                timestamp: new Date().toISOString(),
                agent: AgentRole.SYSTEM,
                action: 'Auto-Pilot: Contact',
                details: 'Automated vendor outreach initiated based on analysis.',
                metadata: { content: `Subject: ${draft.subject}\nBody: ${draft.body}` }
              });
              setEmailDraft(draft);
          }
          else if (step.action === 'RECTIFY') {
             onUpdateStatus('RECTIFYING');
             onAddLog({
                id: `LOG-${Date.now()}`,
                transactionId: transaction.id,
                timestamp: new Date().toISOString(),
                agent: AgentRole.SYSTEM,
                action: 'Auto-Pilot: Status Update',
                details: 'Status updated to RECTIFYING pending vendor response.',
             });
          }
      }

      setLoading(false);
      setCurrentStepIndex(plan.steps.length); // Done
  }


  const handleChatSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!chatInput.trim() || loading) return;

      const userMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'user',
          content: chatInput,
          timestamp: new Date()
      };

      setChatHistory(prev => [...prev, userMsg]);
      setChatInput('');
      setLoading(true);

      const responseText = await askTransactionQuestion(transaction, userMsg.content);

      const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseText,
          timestamp: new Date()
      };

      setChatHistory(prev => [...prev, aiMsg]);
      setLoading(false);
  }

  const isFailed = transaction.status === 'FAILED';
  const isRectifying = transaction.status === 'RECTIFYING';

  return (
    <div className="bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col h-[650px] overflow-hidden relative transition-all duration-300">
      
      {/* Premium Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 shrink-0 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
                <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500 blur opacity-50 rounded-full animate-pulse"></div>
                    <div className="relative bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg p-1.5 shadow-lg border border-white/10">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                    </div>
                </div>
                <div>
                     <h3 className="text-sm font-bold text-white tracking-wide">AI Agent</h3>
                     <p className="text-[10px] text-indigo-300 font-medium tracking-wider uppercase">Powered by Gemini 3</p>
                </div>
          </div>
          
          {/* Header Controls */}
          {isChatOpen && (
              <button 
                  onClick={() => setIsChatOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
              </button>
          )}
      </div>

      {/* Main Container */}
      <div className="flex-1 relative overflow-hidden flex flex-col bg-slate-50/30">
        
        {/* === ACTION VIEW (Default) === */}
        <div className="flex-1 flex flex-col overflow-hidden">
             
             {/* ML Prediction Banner - Premium Look */}
             {isFailed && prediction && !autoPilotActive && (
                 <div className="bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between shadow-sm">
                     <div className="flex flex-col gap-1">
                         <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">AI Confidence</span>
                         <div className="flex items-center gap-2">
                            <div className={`h-2.5 w-24 rounded-full overflow-hidden bg-slate-100`}>
                                <div 
                                    className={`h-full rounded-full ${
                                        prediction.label === 'High' ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 
                                        prediction.label === 'Medium' ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                                        'bg-gradient-to-r from-rose-400 to-rose-500'
                                    }`} 
                                    style={{ width: `${prediction.score}%` }}
                                ></div>
                            </div>
                            <span className="text-xs font-bold text-slate-700">{prediction.score}%</span>
                         </div>
                     </div>
                     <button 
                        onClick={handleAutoResolve}
                        className="group relative flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg overflow-hidden transition-all hover:shadow-lg hover:shadow-indigo-500/30"
                     >
                         <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                         <span className="relative z-10 text-xs font-bold flex items-center gap-2">
                             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                             Auto-Resolve with Gemini
                         </span>
                     </button>
                 </div>
             )}

             {/* Auto Pilot Overlay - Cinematic */}
             {autoPilotActive && (
                 <div className="p-5 bg-white/80 backdrop-blur-sm border-b border-indigo-100 animate-in fade-in slide-in-from-top-4 duration-500">
                     <div className="mb-4">
                        <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                            </span>
                            Gemini 3 Agent Active
                        </h4>
                        {/* REASONING CARD */}
                        {autoPilotPlan?.reasoning ? (
                             <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100 text-sm text-indigo-900 leading-relaxed shadow-sm">
                                <span className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Strategic Reasoning</span>
                                {autoPilotPlan.reasoning}
                             </div>
                        ) : (
                             <div className="h-16 bg-slate-100 rounded-xl animate-pulse"></div>
                        )}
                     </div>
                     
                     <div className="space-y-2 pl-1">
                         {autoPilotPlan ? autoPilotPlan.steps.map((step, idx) => (
                             <div key={idx} className={`flex items-center gap-3 text-sm transition-all duration-500 ${
                                 idx === currentStepIndex ? 'text-slate-900 font-semibold scale-105 origin-left' :
                                 idx < currentStepIndex ? 'text-emerald-600' :
                                 'text-slate-300'
                             }`}>
                                 <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                                     idx === currentStepIndex ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-200' :
                                     idx < currentStepIndex ? 'border-emerald-500 bg-emerald-50 text-emerald-600' :
                                     'border-slate-200 bg-white'
                                 }`}>
                                     {idx < currentStepIndex ? (
                                         <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                     ) : idx === currentStepIndex ? (
                                         <span className="text-[10px]">AI</span>
                                     ) : (
                                         <span className="text-[10px]">{idx + 1}</span>
                                     )}
                                 </div>
                                 <span>{step.description}</span>
                                 {idx === currentStepIndex && <span className="ml-auto text-xs text-indigo-500 animate-pulse font-medium">Processing...</span>}
                             </div>
                         )) : (
                            <div className="space-y-2">
                                <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse"></div>
                                <div className="h-4 w-1/2 bg-slate-100 rounded animate-pulse"></div>
                            </div>
                         )}
                     </div>
                 </div>
             )}

             <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {loading && !autoPilotActive && !isChatOpen && (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 animate-pulse space-y-3">
                    <div className="relative">
                        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                        </div>
                    </div>
                    <span className="text-xs font-bold text-indigo-900 tracking-wide">GEMINI 3 IS THINKING...</span>
                </div>
                )}

                {!loading && analysis && (
                <div className="bg-white border border-rose-100 rounded-xl shadow-lg shadow-rose-100/50 overflow-hidden animate-[slideUp_0.4s_ease-out]">
                    <div className="bg-gradient-to-r from-rose-50 to-white px-5 py-3 border-b border-rose-100 flex items-center gap-2">
                        <div className="bg-rose-100 p-1 rounded">
                             <svg className="w-3.5 h-3.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <span className="text-xs font-bold text-rose-800 uppercase tracking-wide">Auditor Report</span>
                    </div>
                    <div className="p-5 prose prose-sm prose-slate text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                        {analysis}
                    </div>
                </div>
                )}

                {!loading && emailDraft && (
                    <div className="bg-white border border-indigo-100 rounded-xl shadow-lg shadow-indigo-100/50 overflow-hidden animate-[slideUp_0.4s_ease-out]">
                        <div className="bg-gradient-to-r from-indigo-50 to-white px-5 py-3 border-b border-indigo-100 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <div className="bg-indigo-100 p-1 rounded">
                                     <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                </div>
                                <span className="text-xs font-bold text-indigo-800 uppercase tracking-wide">Vendor Draft</span>
                            </div>
                        {!autoPilotActive && (
                            <button onClick={handleSendEmail} className="text-[10px] bg-indigo-600 text-white px-3 py-1.5 rounded-full hover:bg-indigo-700 font-bold shadow-md shadow-indigo-200 transition-all hover:scale-105">
                                Send Now
                            </button>
                        )}
                    </div>
                    <div className="p-5 space-y-4">
                        <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Subject</span>
                            <div className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">{emailDraft.subject}</div>
                        </div>
                        <div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Message Body</span>
                                <div className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed font-medium">{emailDraft.body}</div>
                        </div>
                    </div>
                    </div>
                )}
                
                {!loading && !analysis && !emailDraft && !autoPilotActive && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6">
                        <div className="bg-white p-4 rounded-full mb-4 shadow-lg shadow-slate-100 border border-slate-50">
                             <svg className="w-8 h-8 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mb-1">Awaiting Command</h4>
                        <p className="text-xs text-slate-500 max-w-[200px] leading-relaxed">
                            I am ready to analyze complex discrepancies using Gemini 3's advanced reasoning capabilities.
                        </p>
                    </div>
                )}
            </div>

            {/* Actions Footer */}
            <div className="p-4 bg-white border-t border-slate-100 shrink-0 z-10 relative">
                <div className="absolute -top-6 left-0 right-0 h-6 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none"></div>
                
                {isFailed && !autoPilotActive && (
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={handleAnalyze}
                            className="flex flex-col items-center justify-center gap-1.5 px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md transition-all group">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-rose-500 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                            <span className="text-xs font-bold text-slate-700">Auditor Analysis</span>
                        </button>
                        <button 
                            onClick={handleDraftEmail}
                            className="flex flex-col items-center justify-center gap-1.5 px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md transition-all group">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            <span className="text-xs font-bold text-slate-700">Contact Vendor</span>
                        </button>
                    </div>
                )}

                {isRectifying && !autoPilotActive && (
                    <div className="space-y-3">
                        <div className="relative">
                            <textarea
                                value={rectificationNote}
                                onChange={(e) => setRectificationNote(e.target.value)}
                                placeholder="Describe the correction made..."
                                className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:border-transparent outline-none resize-none h-24 placeholder:text-slate-400"
                            />
                            <div className="absolute bottom-2 right-2 text-[10px] text-slate-400 font-bold uppercase">Controller Note</div>
                        </div>
                        <button 
                            onClick={handleRectify}
                            disabled={!rectificationNote.trim()}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-200 transition-all font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Submit for Approval
                        </button>
                    </div>
                )}
                
                {(!isFailed && !isRectifying) || autoPilotActive ? (
                    <div className="text-center py-2">
                         {autoPilotActive ? (
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 text-white text-xs font-medium shadow-md">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                </span>
                                Executing Auto-Pilot Protocol...
                            </div>
                         ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                Case Closed
                            </span>
                         )}
                    </div>
                ) : null}
            </div>
        </div>

        {/* === CHAT POP-UP OVERLAY === */}
        {isChatOpen && (
             <div className="absolute inset-0 bg-slate-50 z-20 flex flex-col animate-[slideUp_0.3s_ease-out]">
                <style>{`
                  @keyframes slideUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                  }
                `}</style>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {chatHistory.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                                msg.role === 'user' 
                                ? 'bg-indigo-600 text-white rounded-br-none' 
                                : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'
                            }`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                             <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-none border border-slate-200 shadow-sm flex space-x-1">
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></div>
                             </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
                <div className="p-3 bg-white border-t border-slate-200 shrink-0">
                    <form onSubmit={handleChatSubmit} className="relative">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Ask Gemini about this transaction..."
                            className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-full text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
                            disabled={loading}
                        />
                        <button 
                            type="submit" 
                            disabled={!chatInput.trim() || loading}
                            className="absolute right-2 top-2 p-1.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-300 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        </button>
                    </form>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default AgentPanel;