import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, AuditLog } from './types';
import { INITIAL_TRANSACTIONS, INITIAL_AUDIT_LOGS } from './constants';
import TransactionList from './components/TransactionList';
import AuditLogView from './components/AuditLogView';
import AgentPanel from './components/AgentPanel';
import StatusBadge from './components/StatusBadge';
import LoadingScreen from './components/LoadingScreen';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [selectedId, setSelectedId] = useState<string | null>(INITIAL_TRANSACTIONS[0].id);

  // Simulate initial data fetching
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const selectedTransaction = useMemo(
    () => transactions.find((t) => t.id === selectedId),
    [transactions, selectedId]
  );

  const transactionLogs = useMemo(
    () => auditLogs.filter((log) => log.transactionId === selectedId),
    [auditLogs, selectedId]
  );

  // Computed vendor stats
  const vendorStats = useMemo(() => {
      if (!selectedTransaction) return null;
      const vendorTxns = transactions.filter(t => t.vendorName === selectedTransaction.vendorName);
      const totalSpend = vendorTxns.reduce((sum, t) => sum + t.amount, 0);
      const failedCount = vendorTxns.filter(t => t.status === 'FAILED').length;
      return {
          count: vendorTxns.length,
          total: totalSpend,
          reliability: Math.round(((vendorTxns.length - failedCount) / vendorTxns.length) * 100)
      };
  }, [selectedTransaction, transactions]);

  const handleAddLog = (newLog: AuditLog) => {
    setAuditLogs((prev) => [...prev, newLog]);
  };

  const handleUpdateStatus = (newStatus: any) => {
      if(selectedId) {
          setTransactions(prev => prev.map(t => t.id === selectedId ? { ...t, status: newStatus } : t));
      }
  }

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden text-slate-800 font-sans">
      {/* Sidebar */}
      <div className="w-80 flex-shrink-0 bg-white h-full z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] border-r border-slate-100 flex flex-col">
         <div className="h-20 px-6 border-b border-slate-100 flex items-center gap-3 bg-white">
             <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-lg p-2 shadow-lg shadow-indigo-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
             </div>
             <div>
                <h1 className="font-bold text-slate-900 tracking-tight text-lg leading-none">FinAgent</h1>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Workspace</span>
             </div>
         </div>
         <div className="flex-1 overflow-hidden">
            <TransactionList 
                transactions={transactions} 
                selectedId={selectedId} 
                onSelect={setSelectedId} 
            />
         </div>
         <div className="p-4 border-t border-slate-100 bg-slate-50">
            {/* Project Description & Link */}
            <div className="mb-4 p-3 bg-white rounded-lg border border-indigo-50 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                     <h4 className="text-[10px] font-bold text-indigo-900 uppercase tracking-widest">About Project</h4>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">
                    A Next-Gen Autonomous Reconciliation Agent powered by <strong>Gemini 3 Pro</strong> and <strong>Gemini 2.5 Flash</strong>.
                </p>
                <a href="https://ai.google.dev/gemini-api" target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors">
                    <span>PROJECT LINK</span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
            </div>

            <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs border border-indigo-200">
                    JD
                </div>
                <div className="text-xs">
                    <p className="font-medium text-slate-700">John Doe</p>
                    <p className="text-slate-400">Senior Controller</p>
                </div>
            </div>
         </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {selectedTransaction ? (
          <>
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 p-6 flex justify-between items-start z-10 sticky top-0">
              <div>
                <div className="flex items-center gap-4 mb-2">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{selectedTransaction.invoiceId}</h1>
                    <StatusBadge status={selectedTransaction.status} />
                </div>
                <div className="text-sm text-slate-500 flex items-center gap-6">
                    <div className="flex items-center gap-2 group">
                        <div className="p-1.5 bg-slate-100 rounded-md text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        </div>
                        <span className="font-medium">{selectedTransaction.vendorName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                         <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        <span>{selectedTransaction.date}</span>
                    </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-slate-900 tracking-tight">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedTransaction.currency }).format(selectedTransaction.amount)}
                </div>
                <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mt-1">Invoice Amount</div>
              </div>
            </header>

            {/* Scrollable Work Area */}
            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-7xl mx-auto grid grid-cols-12 gap-8 h-full">
                    
                    {/* Left Column: Details & Audit Log */}
                    <div className="col-span-12 lg:col-span-7 space-y-6">
                        
                        {/* New Vendor Stats Card */}
                        {vendorStats && (
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/60">
                                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Total Spend</div>
                                    <div className="text-lg font-bold text-slate-800">
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(vendorStats.total)}
                                    </div>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/60">
                                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Reliability</div>
                                    <div className={`text-lg font-bold ${vendorStats.reliability > 90 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                        {vendorStats.reliability}%
                                    </div>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/60">
                                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Transactions</div>
                                    <div className="text-lg font-bold text-slate-800">
                                        {vendorStats.count}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Failure Details Card */}
                        {selectedTransaction.status === 'FAILED' && (
                             <div className="bg-rose-50 border border-rose-100 rounded-xl p-6 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <svg className="w-24 h-24 text-rose-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                </div>
                                <h3 className="text-rose-900 font-bold mb-2 flex items-center gap-2 text-lg">
                                     <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    Exception Detected
                                </h3>
                                <p className="text-rose-800 text-sm leading-relaxed max-w-md font-medium">{selectedTransaction.failureReason}</p>
                             </div>
                        )}

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-0 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Audit Trail</h3>
                                <span className="text-xs font-medium text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">ID: {selectedTransaction.id}</span>
                            </div>
                            <div className="p-6">
                                <AuditLogView logs={transactionLogs} />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: AI Workspace */}
                    <div className="col-span-12 lg:col-span-5 h-full">
                        <div className="sticky top-6">
                           <AgentPanel 
                                transaction={selectedTransaction} 
                                onAddLog={handleAddLog}
                                onUpdateStatus={handleUpdateStatus}
                           />
                        </div>
                    </div>

                </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/30">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                 <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
            </div>
            <p className="text-sm font-medium">Select a transaction to view details</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;