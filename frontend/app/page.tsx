'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line, ReferenceLine
} from 'recharts';
import {
  Leaf, Activity, History, ShieldCheck, Plus, Globe,
  X, ExternalLink, Percent, Zap, Database, Navigation
} from 'lucide-react';

export default function CarbonOracleMaster() {
  // State for Bonds and Selection
  const [bonds, setBonds] = useState<any[]>([]);
  const [selectedBond, setSelectedBond] = useState<any>(null);
  const [manualInput, setManualInput] = useState('');
  const [timeWarpData, setTimeWarpData] = useState([]);
  const [showCreate, setShowCreate] = useState(false);

  // New Bond Form State
  const [newBond, setNewBond] = useState({
    name: '',
    lat: 24.0,
    lon: 32.0,
    capacity_kw: 500,
    threshold: 75,
    base_interest_rate: 5.5,
    contract_address: '0x78efd50b1607a9b0a350849202111e6ac7255d50'
  });

  const socketRef = useRef<WebSocket | null>(null);

  // Fetch initial registry
  const fetchBonds = () => {
    fetch('http://localhost:8000/api/v1/bonds')
      .then(res => res.json())
      .then(setBonds)
      .catch(err => console.error("API Error:", err));
  };

  useEffect(() => { fetchBonds(); }, []);

  // Handle Selection, History, and WebSockets
  useEffect(() => {
    if (!selectedBond) return;

    // 1. Fetch 30-Day Historical "Time Warp" Data
    fetch(`http://localhost:8000/api/v1/oracle/time-warp/${selectedBond.id}`)
      .then(res => res.json())
      .then(data => {
        // Sort by date and ensure numerical values for proper scaling
        const formatted = data.audit_log.map((d: any) => ({
          ...d,
          performance_ratio: parseFloat(d.performance_ratio).toFixed(2)
        })).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setTimeWarpData(formatted);
      });

    // 2. Initialize Real-Time WebSocket for the "Live Ledger" Graph
    socketRef.current = new WebSocket(`ws://localhost:8000/ws/oracle/${selectedBond.id}`);

    socketRef.current.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "ORACLE_UPDATE") {
        setSelectedBond((prev: any) => ({
          ...prev,
          live_feed: [...(prev.live_feed || []), msg.data]
        }));
      }
    };

    return () => socketRef.current?.close();
  }, [selectedBond?.id]);

  const handleCreateBond = async (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(newBond as any);
    const res = await fetch(`http://localhost:8000/api/v1/bonds?${params.toString()}`, { method: 'POST' });
    if (res.ok) {
      setShowCreate(false);
      fetchBonds();
    }
  };

  const submitProductionLog = async () => {
    if (!manualInput) return;
    await fetch(`http://localhost:8000/api/v1/bonds/${selectedBond.id}/log-manual?actual_energy=${manualInput}`, { method: 'POST' });
    setManualInput('');
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-slate-900 p-4 md:p-10 font-sans selection:bg-emerald-100">

      {/* Navigation Header */}
      <nav className="max-w-7xl mx-auto mb-10 flex justify-between items-center bg-white border border-slate-200 p-5 rounded-[2.5rem] shadow-sm">
        <div className="flex items-center gap-4 pl-4">
          <div className="bg-emerald-500 p-2.5 rounded-2xl text-white shadow-lg shadow-emerald-100">
            <Leaf size={22} fill="currentColor" />
          </div>
          <div>
            <h1 className="font-black text-xl tracking-tight leading-none">CarbonOracle</h1>
            <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase tracking-tighter">Decentralized Satellite Verification</p>
          </div>
        </div>
        <div className="flex items-center gap-3 pr-2">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl text-xs font-bold hover:bg-black transition-all active:scale-95"
          >
            <Plus size={16} /> INITIALIZE_ASSET
          </button>
          {selectedBond && (
            <button
              onClick={() => setSelectedBond(null)}
              className="px-5 py-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50"
            >
              BACK
            </button>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto">
        {!selectedBond ? (
          /* Portfolio Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {bonds.length === 0 ? (
              <div className="col-span-full py-32 text-center border-2 border-dashed border-slate-200 rounded-[4rem] bg-white/50">
                <Globe className="mx-auto text-slate-200 mb-6 animate-pulse" size={60} />
                <p className="text-slate-400 font-mono text-xs uppercase tracking-widest">Oracle_Registry_Awaiting_Data</p>
              </div>
            ) : (
              bonds.map(b => (
                <div
                  key={b.id}
                  onClick={() => setSelectedBond(b)}
                  className="group bg-white border border-slate-100 p-10 rounded-[3.5rem] hover:shadow-2xl hover:border-emerald-200 transition-all cursor-pointer relative overflow-hidden shadow-sm"
                >
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Zap size={80} />
                  </div>
                  <p className="text-[10px] font-mono text-slate-400 mb-4 tracking-tighter">{b.id}</p>
                  <h3 className="text-2xl font-black mb-8 group-hover:text-emerald-600 transition-colors">{b.name}</h3>
                  <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-8">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Capacity</p>
                      <p className="text-lg font-bold">{b.capacity_kw} <span className="text-[10px] text-slate-400">kW</span></p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Coupon</p>
                      <p className="text-lg font-bold">{b.base_interest_rate}<span className="text-[10px] text-slate-400">%</span></p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Detailed Asset View */
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">

            {/* Top Info Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white border border-slate-100 p-12 rounded-[4rem] shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black px-3 py-1 rounded-full uppercase">Active_Vault</span>
                    <span className="text-[10px] font-mono text-slate-300">#{selectedBond.id}</span>
                  </div>
                  <h2 className="text-5xl font-black text-slate-900 tracking-tight leading-none mb-8">{selectedBond.name}</h2>
                </div>
                <div className="flex gap-12 border-t border-slate-50 pt-8">
                  <div className="flex items-center gap-3">
                    <Navigation size={18} className="text-slate-300" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Geospatial</span>
                      <span className="text-xs font-mono font-bold text-slate-700">{selectedBond.lat}, {selectedBond.lon}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Percent size={18} className="text-emerald-400" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Compliance_Floor</span>
                      <span className="text-xs font-mono font-bold text-slate-700">{selectedBond.threshold}% PR</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Manual Submission Signer */}
              <div className="bg-slate-900 text-white p-12 rounded-[4rem] shadow-2xl flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
                <p className="text-[10px] font-mono text-emerald-400 uppercase mb-6 tracking-widest">Sign_Daily_Proof</p>
                {selectedBond.live_feed?.some((x: any) => x.date === new Date().toISOString().split('T')[0]) ? (
                  <div className="bg-white/10 backdrop-blur-md border border-white/10 p-6 rounded-[2rem] flex items-center justify-center gap-3">
                    <ShieldCheck className="text-emerald-400" size={24} />
                    <span className="font-bold text-sm tracking-tight">VERIFIED_ON_CHAIN</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      <input
                        type="number"
                        value={manualInput}
                        onChange={e => setManualInput(e.target.value)}
                        placeholder="Actual kWh Produced"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 outline-none focus:ring-2 ring-emerald-500/50 font-mono text-white placeholder:text-slate-600"
                      />
                      <Zap className="absolute right-6 top-5 text-slate-700" size={18} />
                    </div>
                    <button
                      onClick={submitProductionLog}
                      className="w-full bg-emerald-500 text-slate-900 font-black py-5 rounded-2xl hover:bg-emerald-400 transition-all active:scale-95 shadow-xl shadow-emerald-500/20"
                    >
                      EXECUTE_ORACLE_PROOF
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Graphs Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Historical 30-Day Efficiency */}
              <div className="bg-white border border-slate-100 p-10 rounded-[4rem] shadow-sm">
                <div className="flex justify-between items-center mb-10">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2 tracking-widest">
                    <History size={14} /> Performance_Archive_30D
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-mono text-slate-400 uppercase">Synced</span>
                  </div>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeWarpData}>
                      <defs>
                        <linearGradient id="colorPr" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="date" hide />
                      <YAxis domain={[0, 100]} fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                        labelStyle={{ display: 'none' }}
                      />
                      <Area type="monotone" dataKey="performance_ratio" stroke="#10B981" fill="url(#colorPr)" strokeWidth={3} animationDuration={1500} />
                      <ReferenceLine y={selectedBond.threshold} stroke="#FCA5A5" strokeDasharray="5 5" label={{ value: 'Floor', position: 'right', fontSize: 9, fill: '#FCA5A5' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Real-time Ledger Chart */}
              <div className="bg-white border border-slate-100 p-10 rounded-[4rem] shadow-sm">
                <div className="flex justify-between items-center mb-10">
                  <h4 className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-2 tracking-widest">
                    <Activity size={14} /> Dynamic_Session_Ledger
                  </h4>
                  <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-full">
                    <span className="text-[9px] font-mono text-emerald-600 uppercase">Live_WebSocket</span>
                  </div>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={selectedBond.live_feed || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="date" hide />
                      <YAxis domain={[0, 100]} fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                      />
                      <Line type="stepAfter" dataKey="performance_ratio" stroke="#0F172A" strokeWidth={3} dot={{ r: 4, fill: '#0F172A' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Blockchain Evidence Table */}
            <div className="bg-white border border-slate-100 rounded-[4rem] shadow-sm overflow-hidden mb-20">
              <div className="p-10 border-b border-slate-50 flex justify-between items-center">
                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                  <Database className="text-emerald-500" size={18} /> Sepolia_Audit_Evidence
                </h4>
                <span className="text-[10px] font-mono text-slate-400">Total Records: {selectedBond.live_feed?.length || 0}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 uppercase">
                      <th className="px-10 py-5">Verification_Date</th>
                      <th className="px-10 py-5">Performance_Score</th>
                      <th className="px-10 py-5">Oracle_Verdict</th>
                      <th className="px-10 py-5 text-right">Etherscan_Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(selectedBond.live_feed || []).slice().reverse().map((log: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-10 py-6 text-slate-500">{log.date}</td>
                        <td className="px-10 py-6">
                          <span className="font-black text-slate-900">{log.performance_ratio}%</span>
                        </td>
                        <td className="px-10 py-6">
                          <span className={`px-4 py-1.5 rounded-full text-[9px] font-black ${log.verdict === 'COMPLIANT' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {log.verdict}
                          </span>
                        </td>
                        <td className="px-10 py-6 text-right">
                          <a href={log.tx_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-slate-400 hover:text-emerald-600 transition-colors font-bold">
                            TX_HASH: {log.tx_link?.split('/').pop()?.slice(0, 10)}...
                            <ExternalLink size={12} />
                          </a>
                        </td>
                      </tr>
                    ))}
                    {(!selectedBond.live_feed || selectedBond.live_feed.length === 0) && (
                      <tr>
                        <td colSpan={4} className="px-10 py-20 text-center text-slate-300 italic uppercase tracking-widest">
                          Awaiting_Daily_Oracle_Signature...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Asset Initialization Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl flex items-center justify-center p-6 z-[100] animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[4rem] p-12 shadow-2xl relative animate-in zoom-in-95 duration-500">
            <button
              onClick={() => setShowCreate(false)}
              className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 p-2 rounded-full hover:bg-slate-50 transition-all"
            >
              <X size={24} />
            </button>
            <h2 className="text-3xl font-black mb-2 text-slate-900 tracking-tight">Initialize Asset</h2>
            <p className="text-slate-400 text-sm mb-10 font-medium">Configure new solar facility parameters for on-chain tracking.</p>

            <form onSubmit={handleCreateBond} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Asset Name</label>
                <input
                  required
                  className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] p-5 outline-none focus:ring-2 ring-emerald-500/20 font-bold placeholder:text-slate-300"
                  placeholder="e.g. Sahara Solar Park"
                  onChange={e => setNewBond({ ...newBond, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Capacity (kW)</label>
                  <input
                    type="number"
                    defaultValue={500}
                    className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] p-5 outline-none focus:ring-2 ring-emerald-500/20 font-bold"
                    onChange={e => setNewBond({ ...newBond, capacity_kw: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Base Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    defaultValue={5.5}
                    className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] p-5 outline-none focus:ring-2 ring-emerald-500/20 font-bold"
                    onChange={e => setNewBond({ ...newBond, base_interest_rate: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="24.0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] p-5 outline-none font-mono"
                    onChange={e => setNewBond({ ...newBond, lat: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="32.0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] p-5 outline-none font-mono"
                    onChange={e => setNewBond({ ...newBond, lon: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Threshold (%)</label>
                <input
                  type="number"
                  defaultValue={75}
                  className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] p-5 outline-none font-bold text-emerald-600"
                  onChange={e => setNewBond({ ...newBond, threshold: parseFloat(e.target.value) })}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-500 text-white font-black py-6 rounded-[2rem] mt-6 shadow-2xl shadow-emerald-500/30 hover:bg-emerald-600 hover:shadow-emerald-600/40 transition-all active:scale-[0.98]"
              >
                INITIALIZE & REGISTER
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
