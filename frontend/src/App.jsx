import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ShieldAlert, Activity, Database, Network, BarChart2, ShieldBan, Search, CheckCircle, X, List, ShieldCheck, Eye } from 'lucide-react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const socket = io(API_BASE_URL);

// --- AXIS FORMATTERS & TOOLTIP ---
const featureDictionary = {
  amount: "Transaction Value (INR)",
  time_delta_mins: "Minutes since last transaction",
  velocity_1hr: "Transactions attempted in the last hour",
  location_mismatch: "IP Geolocation vs. Registered Address"
};

const formatYAxisLabel = (label) => {
  const shortLabels = {
    amount: "Amount",
    time_delta_mins: "Time Delta",
    velocity_1hr: "Velocity",
    location_mismatch: "Location"
  };
  return shortLabels[label] || label;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    const isPositive = val > 0;
    const readableLabel = featureDictionary[label] || label;

    return (
      <div className="bg-slate-800 border-2 border-slate-600 p-3 rounded shadow-lg z-50 max-w-xs text-white">
        <p className="font-bold mb-1 border-b border-slate-600 pb-1">{readableLabel}</p>
        <p className="text-sm">
          Impact: <span className={isPositive ? 'text-red-400 font-bold' : 'text-green-400 font-bold'}>
            {isPositive ? '+' : ''}{val.toFixed(4)}
          </span>
        </p>
      </div>
    );
  }
  return null;
};

function App() {
  const [transactions, setTransactions] = useState([]);
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [activeTab, setActiveTab] = useState('shap'); 
  
  // UNIFIED ACTION STATE: Stores both 'BLOCK' and 'SUPERVISE' actions
  const [actionedTxns, setActionedTxns] = useState([]);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  const { data: historyData, isLoading } = useQuery({
    queryKey: ['txHistory'],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/api/transactions/history`);
      return res.data;
    }
  });

  useEffect(() => {
    socket.on('new_transaction', (txn) => {
      setTransactions((prev) => [txn, ...prev].slice(0, 50));
    });
    return () => socket.off('new_transaction');
  }, []);

  const handleAction = (e, txn, actionType) => {
    e.stopPropagation();
    if (!actionedTxns.some(a => a.txn_id === txn.txn_id)) {
      setActionedTxns((prev) => [{ ...txn, actionType }, ...prev]);
    }
    setSelectedTxn(txn); 
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-6 font-sans relative">
      
      {/* HEADER */}
      <header className="flex justify-between items-center mb-6 pb-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <ShieldAlert className="text-blue-500" size={28} />
          <h1 className="text-xl font-bold text-white">FraudLens AI</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-slate-800 border border-slate-600 px-3 py-1 rounded text-sm text-slate-300">
            <Database size={14} className="inline mr-2" />
            DB Status: {isLoading ? 'Connecting...' : `${historyData?.length || 0} Records`}
          </div>

          <button 
            onClick={() => setIsOverlayOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-4 rounded flex items-center gap-2 border border-blue-800 transition-colors"
          >
            <List size={16} />
            Action Log ({actionedTxns.length})
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* TABLE PANEL */}
        <div className="lg:col-span-2 bg-slate-800 border border-slate-700 rounded shadow h-[700px] flex flex-col">
          <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Activity className="text-green-500 animate-pulse" size={18} /> Live Stream
            </h2>
            <span className="text-xs text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-700 font-mono">&lt; 200ms Latency</span>
          </div>
          
          <div className="flex-1 overflow-y-auto overflow-x-auto relative">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead className="bg-slate-900 sticky top-0 z-10 border-b-2 border-slate-700">
                <tr className="text-slate-300 text-sm">
                  <th className="p-3">TXN ID</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Risk Score</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {transactions.map((txn) => {
                    const actionRecord = actionedTxns.find(a => a.txn_id === txn.txn_id);
                    const isBlocked = actionRecord?.actionType === 'BLOCK';
                    const isSupervised = actionRecord?.actionType === 'SUPERVISE';
                    const isHigh = txn.flag === 'HIGH';
                    
                    return (
                      <motion.tr 
                        key={txn.txn_id} 
                        initial={{ opacity: 0, y: -20, backgroundColor: isHigh ? 'rgba(153, 27, 27, 0.8)' : 'rgba(71, 85, 105, 0.8)' }}
                        animate={{ opacity: 1, y: 0, backgroundColor: 'transparent' }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        onClick={() => setSelectedTxn(txn)}
                        className={`border-b border-slate-700 cursor-pointer transition-colors ${
                          isBlocked ? 'bg-slate-900 opacity-60' : 
                          isSupervised ? 'bg-yellow-900/10 border-l-2 border-l-yellow-500' :
                          isHigh ? 'bg-red-900/30 hover:bg-red-900/50 shadow-[inset_4px_0_0_0_rgba(239,68,68,1)]' : 'hover:bg-slate-700'
                        }`}
                      >
                        <td className="p-3 font-mono text-sm">{txn.txn_id}</td>
                        <td className="p-3">₹{(txn.amount || 0).toLocaleString()}</td>
                        <td className="p-3">
                          <div className="w-full bg-slate-900 h-2 rounded overflow-hidden border border-slate-700">
                            <div 
                              className={`h-full ${isHigh ? 'bg-red-500' : txn.flag === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500'}`}
                              style={{ width: `${txn.risk_score}%` }}
                            />
                          </div>
                          <span className="text-xs mt-1 text-slate-400 font-mono">{txn.risk_score} / 100</span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            isHigh ? 'bg-red-600 text-white' : txn.flag === 'MEDIUM' ? 'bg-yellow-600 text-white' : 'bg-green-600 text-white'
                          }`}>
                            {txn.flag}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {isBlocked ? (
                            <div className="text-green-500 font-bold text-xs flex items-center justify-end gap-1 uppercase tracking-wide">
                              <CheckCircle size={14} /> Blocked
                            </div>
                          ) : isSupervised ? (
                            <div className="text-yellow-500 font-bold text-xs flex items-center justify-end gap-1 uppercase tracking-wide">
                              <Eye size={14} /> Tagged
                            </div>
                          ) : isHigh ? (
                            <button 
                              onClick={(e) => handleAction(e, txn, 'BLOCK')}
                              className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded font-bold border border-red-800 flex items-center gap-1 justify-end w-full md:w-auto ml-auto transition-all"
                            >
                              <ShieldBan size={14} /> Block
                            </button>
                          ) : (
                            <button 
                              onClick={(e) => handleAction(e, txn, 'SUPERVISE')}
                              className="bg-slate-800 hover:bg-yellow-700 text-slate-300 hover:text-white text-xs px-3 py-1 rounded border border-slate-600 hover:border-yellow-600 flex items-center gap-1 justify-end w-full md:w-auto ml-auto transition-all"
                            >
                              <Eye size={14} /> Watch
                            </button>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>

        {/* ANALYSIS PANEL */}
        <div className="bg-slate-800 border border-slate-700 rounded shadow flex flex-col h-[700px]">
          <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
            <h2 className="text-lg font-bold">Analysis Engine</h2>
            
            <div className="flex bg-slate-900 rounded border border-slate-700">
              <div className="relative group">
                <button 
                  onClick={() => setActiveTab('shap')}
                  className={`px-3 py-1 text-sm transition-colors ${activeTab === 'shap' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  SHAP
                </button>
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-slate-200 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none border border-slate-700">
                  Feature Importance Matrix
                </div>
              </div>
              <div className="relative group">
                <button 
                  onClick={() => setActiveTab('network')}
                  className={`px-3 py-1 text-sm border-l border-slate-700 transition-colors ${activeTab === 'network' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Graph
                </button>
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-slate-200 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none border border-slate-700">
                  Network Node Analysis
                </div>
              </div>
            </div>
          </div>

          {selectedTxn ? (
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="bg-slate-900 border border-slate-700 p-3 rounded mb-4 flex justify-between items-center">
                <div>
                  <span className="text-xs text-slate-500 block">Targeting</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-lg text-white">{selectedTxn.txn_id}</span>
                    
                    {/* DYNAMIC ACTION BADGES */}
                    {actionedTxns.find(a => a.txn_id === selectedTxn.txn_id)?.actionType === 'BLOCK' && (
                      <span className="bg-red-900/50 text-red-400 text-[10px] px-2 py-0.5 rounded border border-red-700 uppercase font-bold">Blocked</span>
                    )}
                    {actionedTxns.find(a => a.txn_id === selectedTxn.txn_id)?.actionType === 'SUPERVISE' && (
                      <span className="bg-yellow-900/50 text-yellow-400 text-[10px] px-2 py-0.5 rounded border border-yellow-700 uppercase font-bold">Tagged for further investigation</span>
                    )}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  selectedTxn.flag === 'HIGH' ? 'bg-red-600 text-white' : selectedTxn.flag === 'MEDIUM' ? 'bg-yellow-600 text-white' : 'bg-green-600 text-white'
                }`}>
                  {selectedTxn.flag} RISK
                </span>
              </div>
              
              {/* SHAP VIEW */}
              {activeTab === 'shap' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <p className="text-sm font-bold text-slate-400 mb-2 border-b border-slate-700 pb-2">Isolation Forest Output</p>
                  <div className="h-64 w-full bg-slate-900 p-2 rounded border border-slate-700 mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={selectedTxn.explanations} layout="vertical" margin={{ left: 10, right: 10 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="feature" type="category" stroke="#94a3b8" fontSize={11} width={100} axisLine={false} tickLine={false} tickFormatter={formatYAxisLabel} />
                        <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                        <Bar dataKey="value" radius={2} barSize={20}>
                          {selectedTxn.explanations?.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.value > 0 ? '#dc2626' : '#16a34a'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              )}

              {/* NETWORK GRAPH VIEW */}
              {activeTab === 'network' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <p className="text-sm font-bold text-slate-400 mb-2 border-b border-slate-700 pb-2">Multi-hop Fingerprinting</p>
                  <div className="relative w-full h-48 bg-slate-900 rounded border border-slate-700 mb-4">
                    <svg className="absolute inset-0 w-full h-full">
                      <line x1="50%" y1="50%" x2="20%" y2="25%" stroke="#475569" strokeWidth="2" strokeDasharray="4" />
                      <line x1="50%" y1="50%" x2="80%" y2="25%" stroke="#475569" strokeWidth="2" />
                      <line x1="50%" y1="50%" x2="70%" y2="80%" stroke="#475569" strokeWidth="2" />
                      <line x1="50%" y1="50%" x2="25%" y2="75%" stroke="#dc2626" strokeWidth="3" />
                    </svg>
                    
                    <div className={`absolute top-[35%] left-[38%] w-16 h-16 ${selectedTxn.flag === 'HIGH' ? 'bg-red-900 border-red-500' : 'bg-blue-600 border-blue-400'} border-2 rounded-full flex items-center justify-center z-10 cursor-help transition-all duration-300 hover:scale-105`} title="Target Transaction Node">
                      <span className="text-[10px] font-mono font-bold text-white text-center">Target<br/>{selectedTxn.txn_id.split('-')[1]}</span>
                    </div>
                    
                    <div className="absolute top-[15%] left-[15%] w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center border border-slate-500 z-10 cursor-help hover:border-slate-300 transition-colors" title="Safe Account History">
                      <span className="text-[8px] text-slate-300">A-22</span>
                    </div>
                    <div className="absolute top-[15%] right-[15%] w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center border border-yellow-600 z-10 cursor-help hover:border-yellow-400 transition-colors" title="Medium Risk Behavior Flag">
                      <span className="text-[8px] text-yellow-500">M-43</span>
                    </div>
                    <div className="absolute bottom-[10%] right-[25%] w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center border border-slate-500 z-10 cursor-help hover:border-slate-300 transition-colors" title="Unverified Device Node">
                      <span className="text-[8px] text-slate-400">U-91</span>
                    </div>
                    <div className="absolute bottom-[15%] left-[20%] w-12 h-12 bg-red-900 rounded-full flex items-center justify-center border-2 border-red-500 z-10 cursor-help hover:border-red-400 transition-colors" title="Confirmed Fraudulent Node">
                      <span className="text-[9px] font-bold text-red-400">TX-76</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-slate-900 border border-slate-700 p-2 rounded">
                      <p className="text-[10px] text-slate-400 uppercase">Velocity (1 Hr)</p>
                      <p className="font-mono text-white text-lg">{selectedTxn.velocity_1hr !== undefined ? selectedTxn.velocity_1hr : "N/A"} <span className="text-xs text-slate-500">attempts</span></p>
                    </div>
                    <div className="bg-slate-900 border border-slate-700 p-2 rounded">
                      <p className="text-[10px] text-slate-400 uppercase">Time Delta</p>
                      <p className="font-mono text-white text-lg">{selectedTxn.time_delta_mins !== undefined ? selectedTxn.time_delta_mins : "N/A"} <span className="text-xs text-slate-500">mins ago</span></p>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-3 rounded border border-slate-700 text-sm text-slate-300">
                    <h3 className="font-bold text-white mb-2 border-b border-slate-700 pb-1 flex justify-between items-center">
                      <span>Behavioral Analysis</span>
                      {selectedTxn.location_mismatch === 1 && <span className="text-red-400 flex items-center gap-1 text-xs"><ShieldBan size={12}/> VPN/Proxy Detected</span>}
                    </h3>
                    <ul className="text-xs text-slate-400 space-y-2 list-none">
                      <li className="flex gap-2">
                        <span className="text-blue-500">►</span> 
                        <span><strong>Amount:</strong> ₹{(selectedTxn.amount || 0).toLocaleString()} is {selectedTxn.amount < 1000 ? "unusually low, typical of card-testing micro-transactions." : "within standard deviation for this user profile."}</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-500">►</span> 
                        <span><strong>Velocity:</strong> {selectedTxn.velocity_1hr !== undefined ? selectedTxn.velocity_1hr : 0} transactions in 60 mins indicates {selectedTxn.velocity_1hr > 5 ? <span className="text-red-400 font-bold">automated bot behavior.</span> : "standard human pacing."}</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-500">►</span> 
                        <span><strong>Location:</strong> {selectedTxn.location_mismatch === 1 ? <span className="text-red-400 font-bold">IP address does not match the cardholder's billing state.</span> : "IP geolocation matches registered address."}</span>
                      </li>
                    </ul>
                  </div>

                  {/* DYNAMIC POST-ACTION FEEDBACK */}
                  {selectedTxn.flag === 'HIGH' && !actionedTxns.some(b => b.txn_id === selectedTxn.txn_id) && (
                    <div className="mt-4 p-2 bg-red-900/30 border border-red-800 rounded text-center">
                      <p className="text-xs text-red-400 font-bold">CRITICAL ALARM: Multi-factor anomaly detected. Recommend immediate account freeze.</p>
                    </div>
                  )}
                  {actionedTxns.find(b => b.txn_id === selectedTxn.txn_id)?.actionType === 'BLOCK' && (
                    <div className="mt-4 p-2 bg-slate-800 border border-green-700 rounded text-center">
                      <p className="text-xs text-green-400 font-bold flex items-center justify-center gap-2">
                        <CheckCircle size={14} /> ACTION TAKEN: Transaction blocked. Account frozen.
                      </p>
                    </div>
                  )}
                  {actionedTxns.find(b => b.txn_id === selectedTxn.txn_id)?.actionType === 'SUPERVISE' && (
                    <div className="mt-4 p-2 bg-slate-800 border border-yellow-700 rounded text-center">
                      <p className="text-xs text-yellow-400 font-bold flex items-center justify-center gap-2">
                        <Eye size={14} /> TAGGED FOR FURTHER INVESTIGATION: Account flagged for detailed review.
                      </p>
                    </div>
                  )}

                </motion.div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
              <p>Waiting for transaction selection...</p>
            </div>
          )}
        </div>
      </div>

      {/* DUAL ACTION LOG OVERLAY */}
      {isOverlayOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-800 border-2 border-slate-600 rounded w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-900">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="text-blue-500" size={20} /> Action Log
              </h2>
              <button onClick={() => setIsOverlayOpen(false)} className="text-slate-400 hover:text-white bg-slate-800 px-2 py-1 rounded border border-slate-600 text-xs font-bold transition-colors">
                CLOSE
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {actionedTxns.length === 0 ? (
                <p className="text-center text-slate-500 mt-10">No actions logged yet.</p>
              ) : (
                <table className="w-full text-left border-collapse border border-slate-700">
                  <thead className="bg-slate-900 text-slate-400 text-xs sticky top-0">
                    <tr>
                      <th className="p-2 border border-slate-700">TXN ID</th>
                      <th className="p-2 border border-slate-700">Amount</th>
                      <th className="p-2 border border-slate-700">Score</th>
                      <th className="p-2 border border-slate-700">Velocity</th>
                      <th className="p-2 border border-slate-700 text-center">Action Taken</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actionedTxns.map((txn, idx) => (
                      <tr key={idx} className="text-sm bg-slate-800 hover:bg-slate-700">
                        <td className="p-2 border border-slate-700 font-mono text-blue-400">{txn.txn_id}</td>
                        <td className="p-2 border border-slate-700">₹{(txn.amount || 0).toLocaleString()}</td>
                        <td className="p-2 border border-slate-700 font-bold text-slate-300">{txn.risk_score}</td>
                        <td className="p-2 border border-slate-700">{txn.velocity_1hr}</td>
                        <td className="p-2 border border-slate-700 text-center">
                          {txn.actionType === 'BLOCK' ? (
                            <span className="text-green-500 font-bold text-xs bg-green-900/30 px-2 py-1 rounded">BLOCKED</span>
                          ) : (
                            <span className="text-yellow-500 font-bold text-xs bg-yellow-900/30 px-2 py-1 rounded">TAGGED</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;