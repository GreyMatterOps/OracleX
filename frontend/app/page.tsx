'use client';

import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, AreaChart, Area
} from 'recharts';
import {
  Plus, Activity, Database, ShieldCheck,
  ArrowLeft, Zap, BarChart3, Globe
} from 'lucide-react';

// Ensure this matches your FastAPI server port exactly
const API = "http://127.0.0.1:8000";

export default function CarbonOracleIntegrated() {
  const [bonds, setBonds] = useState<any[]>([]);
  const [selectedBond, setSelectedBond] = useState<any | null>(null);
  const [auditData, setAuditData] = useState<any[]>([]);
  const [todayResult, setTodayResult] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Initial form state
  const [newBond, setNewBond] = useState({
    name: "",
    lat: 12.97,
    lon: 77.59,
    capacity_kw: 100,
    threshold: 75,
    contract_address: "0x" + Math.random().toString(16).slice(2, 42)
  });

  /* ---------------- 1. FETCH ALL ASSETS ---------------- */
  const fetchBonds = async () => {
    try {
      const res = await fetch(`${API}/api/v1/bonds`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setBonds(Array.isArray(data) ? data : data.bonds || []);
    } catch (err) {
      console.error("Dashboard Fetch Error:", err);
      setBonds([]);
    }
  };

  useEffect(() => { fetchBonds(); }, []);

  /* ---------------- 2. FETCH ORACLE SPECIFICS ---------------- */
  const loadBondDetails = async (bondId: string) => {
    try {
      // 1. Get History: GET /oracle/audit/{bond_id}
      const auditRes = await fetch(`${API}/oracle/audit/${bondId}`);
      const auditJson = await auditRes.json();
      setAuditData((auditJson.audit_log || []).map((e: any) => ({
        ...e,
        performance_ratio: Number(e.performance_ratio)
      })));

      // 2. Get Today: GET /oracle/pr/{bond_id}/{date}
      const today = new Date().toISOString().split("T")[0];
      const prRes = await fetch(`${API}/oracle/pr/${bondId}/${today}`);
      const prData = await prRes.json();
      setTodayResult(prData);
    } catch (err) {
      console.error("Oracle Detail Fetch Error:", err);
    }
  };

  useEffect(() => {
    if (selectedBond) loadBondDetails(selectedBond.id);
  }, [selectedBond]);

  /* ---------------- 3. CREATE ASSET (FIXED BUTTON LOGIC) ---------------- */
  const handleCreateBond = async (e: React.FormEvent) => {
    e.preventDefault(); // Stop page refresh
    console.log("🚀 Initializing Asset Creation...", newBond);

    try {
      // Standard FastAPI POST: JSON Body
      const res = await fetch(`${API}/api/v1/bonds`, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBond)
      });

      if (res.ok) {
        console.log("✅ Asset Created Successfully!");
        setIsCreating(false);
        fetchBonds(); // Refresh the list
      } else {
        const errorDetail = await res.json();
        console.error("❌ Backend Rejected Creation:", errorDetail);
        alert(`Creation Failed: ${JSON.stringify(errorDetail.detail)}`);
      }
    } catch (err) {
      console.error("💥 Network/CORS Error:", err);
      alert("Cannot connect to backend. Check if the server is running and CORS is enabled.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 md:p-12 font-sans selection:bg-emerald-100">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-xl text-white shadow-lg shadow-emerald-200">
              <Zap size={24} fill="currentColor" />
            </div>
            <h1 className="text-2xl font-black tracking-tighter uppercase">OracleX <span className="text-emerald-600">Lite</span></h1>
          </div>

          {!selectedBond ? (
            <button onClick={() => setIsCreating(true)} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-all shadow-xl shadow-slate-200">
              <Plus size={18} /> INITIALIZE_ASSET
            </button>
          ) : (
            <button onClick={() => setSelectedBond(null)} className="bg-white border border-slate-200 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all">
              <ArrowLeft size={18} /> DASHBOARD
            </button>
          )}
        </header>

        {!selectedBond ? (
          /* --- LIST VIEW --- */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {bonds.length === 0 && (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-[3rem]">
                <p className="text-slate-400 font-bold uppercase tracking-widest">No active assets detected on node</p>
              </div>
            )}
            {bonds.map((bond) => (
              <div key={bond.id} onClick={() => setSelectedBond(bond)} className="bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer group">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-emerald-50 transition-colors">
                    <BarChart3 className="text-slate-400 group-hover:text-emerald-600" size={20} />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-400">ID: {bond.id.slice(0, 8)}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">{bond.name}</h3>
                <div className="grid grid-cols-2 gap-4 mt-6 border-t border-slate-50 pt-6">
                  <div><p className="text-[10px] uppercase font-bold text-slate-400">Capacity</p><p className="font-bold">{bond.capacity_kw}kW</p></div>
                  <div><p className="text-[10px] uppercase font-bold text-slate-400">Floor</p><p className="font-bold text-emerald-600">{bond.threshold}%</p></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* --- DETAIL VIEW --- */
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Verified Node</p>
                <h2 className="text-5xl font-black text-slate-900">{selectedBond.name}</h2>
                <div className="mt-8 flex gap-4"><span className="bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2"><ShieldCheck size={14} /> REDIS_SYNC_ACTIVE</span></div>
              </div>

              <div className="bg-emerald-600 text-white p-10 rounded-[3rem] shadow-xl shadow-emerald-100">
                <p className="text-emerald-100 text-xs font-bold uppercase mb-4">Daily Performance</p>
                <div className="text-6xl font-black">{todayResult?.performance_ratio || '--'}%</div>
                <p className="mt-4 text-xs font-bold bg-white/20 inline-block px-3 py-1 rounded-lg uppercase">{todayResult?.verdict || 'PENDING'}</p>
              </div>

              <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-xl">
                <p className="text-slate-400 text-xs font-bold uppercase mb-4">GHI Theoretical Max</p>
                <div className="text-4xl font-mono font-bold text-emerald-400">{todayResult?.theoretical_max_kwh || '0.00'}<span className='text-sm text-slate-500 ml-1'>kWh</span></div>
                <p className="text-slate-500 text-[10px] mt-2 font-mono opacity-60 truncate">LOC: {selectedBond.lat}, {selectedBond.lon}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm h-[400px]">
                <h4 className="text-xs font-black uppercase text-slate-400 flex items-center gap-2 mb-8"><Activity size={16} className="text-emerald-500" /> Performance_Archive</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={auditData}>
                    <defs><linearGradient id="colorPr" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="date" hide />
                    <YAxis domain={[0, 100]} fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                    <ReferenceLine y={selectedBond.threshold} stroke="#FDA4AF" strokeDasharray="5 5" />
                    <Area type="monotone" dataKey="performance_ratio" stroke="#10B981" fillOpacity={1} fill="url(#colorPr)" strokeWidth={4} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-8 border-b border-slate-50 bg-slate-50/50"><h4 className="text-xs font-black uppercase text-slate-900 flex items-center gap-2"><Database size={16} className="text-emerald-600" /> Audit_Ledger</h4></div>
                <div className="overflow-y-auto flex-1">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="text-slate-400 bg-slate-50/30 uppercase"><tr className="text-slate-400"><th className="p-6">Time</th><th className="p-6">PR</th><th className="p-6">Verdict</th></tr></thead>
                    <tbody className="divide-y divide-slate-50">
                      {auditData.slice().reverse().map((log: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-6 text-slate-500">{log.date}</td>
                          <td className="p-6 font-bold">{log.performance_ratio}%</td>
                          <td className="p-6"><span className={`px-3 py-1 rounded-full text-[9px] font-black ${log.verdict === 'COMPLIANT' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{log.verdict}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- MODAL: INITIALIZE ASSET --- */}
        {isCreating && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 z-50 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-xl rounded-[3.5rem] p-12 shadow-2xl animate-in zoom-in-95 duration-200">
              <h2 className="text-3xl font-black mb-8 text-slate-900">Initialize Asset</h2>
              <form onSubmit={handleCreateBond} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Name</label>
                  <input required className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-bold outline-none focus:ring-2 ring-emerald-500/20"
                    value={newBond.name} onChange={e => setNewBond({ ...newBond, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Capacity (kW)</label>
                    <input type="number" required className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-bold"
                      value={newBond.capacity_kw} onChange={e => setNewBond({ ...newBond, capacity_kw: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Floor (%)</label>
                    <input type="number" required className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-bold"
                      value={newBond.threshold} onChange={e => setNewBond({ ...newBond, threshold: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="Lat" type="number" step="any" required className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-mono" value={newBond.lat} onChange={e => setNewBond({ ...newBond, lat: Number(e.target.value) })} />
                  <input placeholder="Lon" type="number" step="any" required className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-mono" value={newBond.lon} onChange={e => setNewBond({ ...newBond, lon: Number(e.target.value) })} />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsCreating(false)} className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600 transition-colors">CANCEL</button>
                  <button type="submit" className="flex-2 px-10 py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all">REGISTER_ASSET</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
