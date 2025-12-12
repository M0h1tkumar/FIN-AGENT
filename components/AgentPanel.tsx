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
  const [autoPilotSteps, setAutoPilotSteps] = useState<AutoPilotPlan['steps']>([]);
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
    setAutoPilotSteps([]);
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

      // 1. Get Plan
      const plan = await generateAutoPilotPlan(transaction);
      setAutoPilotSteps(plan.steps);
      
      // Execute steps sequentially with simulated delays
      for (let i = 0; i < plan.steps.length; i++) {
          setCurrentStepIndex(i);
          const step = plan.steps[i];
          
          await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate thinking

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
    <div className="bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col h-[600px] overflow-hidden relative">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 shrink-0 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
                <div className="bg-indigo-500 rounded p-1 shadow-lg shadow-indigo-900/50">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
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
      <div className="flex-1 relative overflow-hidden flex flex-col">
        
        {/* === ACTION VIEW (Default) === */}
        <div className="flex-1 flex flex-col overflow-hidden">
             
             {/* ML Prediction Banner */}
             {isFailed && prediction && !autoPilotActive && (
                 <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                         <div className={`text-xs font-bold px-2 py-0.5 rounded border ${
                             prediction.label === 'High' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                             prediction.label === 'Medium' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                             'bg-rose-100 text-rose-700 border-rose-200'
                         }`}>
                             {prediction.score}% Success Probability
                         </div>
                         <span className="text-[10px] text-slate-400">ML Confidence Score</span>
                     </div>
                     <button 
                        onClick={handleAutoResolve}
                        className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg border border-indigo-100">
                         <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                         Auto-Resolve
                     </button>
                 </div>
             )}

             {/* Auto Pilot Overlay */}
             {autoPilotActive && (
                 <div className="p-5 bg-indigo-50/50 border-b border-indigo-100">
                     <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                         <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                         </span>
                         Agent Working
                     </h4>
                     <div className="space-y-2">
                         {autoPilotSteps.map((step, idx) => (
                             <div key={idx} className={`flex items-center gap-3 text-sm p-2 rounded-lg border transition-all ${
                                 idx === currentStepIndex ? 'bg-white border-indigo-200 shadow-sm text-indigo-700 font-medium' :
                                 idx < currentStepIndex ? 'bg-emerald-50 border-emerald-100 text-emerald-700 opacity-75' :
                                 'bg-transparent border-transparent text-slate-400'
                             }`}>
                                 <div className="w-5 h-5 flex items-center justify-center">
                                     {idx < currentStepIndex ? (
                                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                     ) : idx === currentStepIndex ? (
                                         <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                     ) : (
                                         <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
                                     )}
                                 </div>
                                 <span>{step.description}</span>
                             </div>
                         ))}
                     </div>
                 </div>
             )}

             <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50 space-y-4">
                {loading && !autoPilotActive && !isChatOpen && (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 animate-pulse space-y-3">
                    <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <span className="text-xs font-medium">Processing request...</span>
                </div>
                )}

                {!loading && analysis && (
                <div className="bg-white border border-rose-100 rounded-lg shadow-sm overflow-hidden animate-fade-in">
                    <div className="bg-rose-50 px-4 py-2 border-b border-rose-100 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        <span className="text-xs font-bold text-rose-700 uppercase">Auditor Report</span>
                    </div>
                    <div className="p-4 prose prose-sm prose-slate text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                        {analysis}
                    </div>
                </div>
                )}

                {!loading && emailDraft && (
                    <div className="bg-white border border-indigo-100 rounded-lg shadow-sm overflow-hidden animate-fade-in">
                        <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-100 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                <span className="text-xs font-bold text-indigo-700 uppercase">Email Draft</span>
                            </div>
                        {!autoPilotActive && (
                            <button onClick={handleSendEmail} className="text-[10px] bg-indigo-600 text-white px-2.5 py-1 rounded-full hover:bg-indigo-700 font-medium shadow-sm transition-colors">
                                Send Email
                            </button>
                        )}
                    </div>
                    <div className="p-4 space-y-3">
                        <div>
                            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">Subject</span>
                            <div className="text-sm font-semibold text-slate-800">{emailDraft.subject}</div>
                        </div>
                        <div>
                                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block mb-1">Message</span>
                                <div className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{emailDraft.body}</div>
                        </div>
                    </div>
                    </div>
                )}
                
                {!loading && !analysis && !emailDraft && !autoPilotActive && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        <div className="bg-white p-3 rounded-full mb-3 shadow-sm border border-slate-100">
                            <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                        </div>
                        <h4 className="text-sm font-medium text-slate-900 mb-1">How can I help?</h4>
                        <p className="text-xs text-slate-500 max-w-[200px]">
                            I can analyze failures, draft communications, or validate your rectifications.
                        </p>
                    </div>
                )}
            </div>

            {/* Actions Footer */}
            <div className="p-4 bg-white border-t border-slate-100 shrink-0 z-10 relative">
                {/* Gradient fade above footer to signal scroll */}
                <div className="absolute -top-4 left-0 right-0 h-4 bg-gradient-to-t from-slate-50/50 to-transparent pointer-events-none"></div>
                
                {isFailed && !autoPilotActive && (
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={handleAnalyze}
                            className="flex flex-col items-center justify-center gap-1.5 px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md transition-all group">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-rose-500 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                            <span className="text-xs font-semibold">Auditor Analysis</span>
                        </button>
                        <button 
                            onClick={handleDraftEmail}
                            className="flex flex-col items-center justify-center gap-1.5 px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md transition-all group">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            <span className="text-xs font-semibold">Contact Vendor</span>
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
                            <div className="absolute bottom-2 right-2 text-[10px] text-slate-400 font-medium">Controller</div>
                        </div>
                        <button 
                            onClick={handleRectify}
                            disabled={!rectificationNote.trim()}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-200 transition-all font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Submit for Approval
                        </button>
                    </div>
                )}
                
                {(!isFailed && !isRectifying) || autoPilotActive ? (
                    <div className="text-center py-2">
                         {autoPilotActive ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100 animate-pulse">
                                Executing Auto-Pilot Protocol...
                            </span>
                         ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
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
                            placeholder="Ask about this transaction..."
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

        {/* === FLOATING CHAT BUTTON (FAB) === */}
        {!isChatOpen && (
             <button
                onClick={() => setIsChatOpen(true)}
                className="absolute bottom-6 right-6 w-14 h-14 bg-indigo-600 rounded-full shadow-xl shadow-indigo-200 text-white flex items-center justify-center hover:bg-indigo-700 hover:scale-105 transition-all z-30 group"
                aria-label="Open Chat Assistant"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                {/* Notification indicator */}
                <span className="absolute top-0 right-0 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 border-2 border-white"></span>
                </span>
             </button>
        )}

      </div>
    </div>
  );
};

export default AgentPanel;