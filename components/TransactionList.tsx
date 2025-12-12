import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import StatusBadge from './StatusBadge';

interface Props {
  transactions: Transaction[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const TransactionList: React.FC<Props> = ({ transactions, selectedId, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTransactions = useMemo(() => {
    if (!searchTerm) return transactions;
    const lowerTerm = searchTerm.toLowerCase();
    return transactions.filter(t => 
        t.vendorName.toLowerCase().includes(lowerTerm) ||
        t.invoiceId.toLowerCase().includes(lowerTerm) ||
        t.amount.toString().includes(lowerTerm)
    );
  }, [transactions, searchTerm]);

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-6 py-4 border-b border-slate-100 bg-white sticky top-0 z-20 space-y-3">
        <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Transactions</h2>
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">{filteredTransactions.length}</span>
        </div>
        <div className="relative">
            <input 
                type="text" 
                placeholder="Search vendor, invoice..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-transparent outline-none transition-all placeholder:text-slate-400"
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
                No transactions found.
            </div>
        ) : (
            filteredTransactions.map((txn) => {
            const isSelected = selectedId === txn.id;
            return (
                <div
                key={txn.id}
                onClick={() => onSelect(txn.id)}
                className={`group px-6 py-4 border-b border-slate-50 cursor-pointer transition-all duration-200 relative ${
                    isSelected 
                    ? 'bg-indigo-50/40' 
                    : 'hover:bg-slate-50'
                }`}
                >
                {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 rounded-r-sm"></div>
                )}
                <div className="flex justify-between items-start mb-1.5">
                    <span className={`font-semibold text-sm truncate w-32 ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                        {txn.vendorName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">{txn.date}</span>
                </div>
                <div className="flex justify-between items-center mb-2.5">
                    <span className={`text-sm font-bold tracking-tight ${isSelected ? 'text-indigo-700' : 'text-slate-900'}`}>
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: txn.currency }).format(txn.amount)}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <StatusBadge status={txn.status} />
                    <span className="text-[10px] font-mono text-slate-300 group-hover:text-slate-400 transition-colors">#{txn.invoiceId.split('-').pop()}</span>
                </div>
                </div>
            );
            })
        )}
        {/* Padding at bottom for scroll */}
        <div className="h-10"></div>
      </div>
    </div>
  );
};

export default TransactionList;