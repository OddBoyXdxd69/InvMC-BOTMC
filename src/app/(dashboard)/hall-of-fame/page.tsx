"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Star, Target, Zap, Award, Medal, Crown, Flame, ChevronRight, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export default function HallOfFamePage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/hall-of-fame")
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="py-20 text-center"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" /><p className="text-slate-500 text-sm italic">Gathering legends...</p></div>;

  const bScore = data?.allTimeBest?.score;
  const bBowl = data?.allTimeBest?.bowling;

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24 px-4">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-2">
          <Trophy className="w-5 h-5 fill-amber-500" />
          <span className="text-xs font-black uppercase tracking-[0.3em]">All-Time Records</span>
        </div>
        <h1 className="text-5xl font-black text-white tracking-tighter">HALL OF FAME</h1>
        <p className="text-slate-500 text-sm font-light max-w-lg mx-auto italic">Celebrating the greatest performances in CricketScorer history.</p>
      </div>

      {/* Top 1 Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Highest Score */}
        <div className="p-6 rounded-[2rem] border border-slate-900 bg-slate-900/10 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
          <Award className="w-8 h-8 text-emerald-400 mb-4" />
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Highest Innings</p>
          <p className="text-2xl font-black text-white">{bScore ? bScore.runs_scored : 0}</p>
          <p className="text-sm font-bold text-emerald-400 mt-2 truncate">{bScore ? bScore.name : 'No records'}</p>
          <p className="text-[10px] text-slate-500 mt-1">{bScore ? bScore.date : '-'}</p>
        </div>

        {/* Best Bowling */}
        <div className="p-6 rounded-[2rem] border border-slate-900 bg-slate-900/10 relative overflow-hidden group hover:border-indigo-500/30 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-indigo-500/10 transition-colors" />
          <Target className="w-8 h-8 text-indigo-400 mb-4" />
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Best Bowling</p>
          <p className="text-2xl font-black text-white">{bBowl ? `${bBowl.wickets_taken}/${bBowl.runs_conceded}` : '0/0'}</p>
          <p className="text-sm font-bold text-indigo-400 mt-2 truncate">{bBowl ? bBowl.name : 'No records'}</p>
          <p className="text-[10px] text-slate-500 mt-1">{bBowl ? bBowl.date : '-'}</p>
        </div>

        {/* Best Career Avg */}
        <div className="p-6 rounded-[2rem] border border-slate-900 bg-slate-900/10 relative overflow-hidden group hover:border-amber-500/30 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-amber-500/10 transition-colors" />
          <Medal className="w-8 h-8 text-amber-400 mb-4" />
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Elite Average</p>
          <p className="text-2xl font-black text-white">{data?.allTimeBest?.avg ? parseFloat(data.allTimeBest.avg).toFixed(2) : '0.00'}</p>
          <p className="text-sm font-bold text-amber-400 mt-2 truncate">{data?.allTimeBest?.avg ? data.allTimeBest.name : 'No records'}</p>
          <p className="text-[10px] text-slate-500 mt-1">Min. 3 matches</p>
        </div>

        {/* Best career Econ */}
        <div className="p-6 rounded-[2rem] border border-slate-900 bg-slate-900/10 relative overflow-hidden group hover:border-rose-500/30 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-rose-500/10 transition-colors" />
          <Flame className="w-8 h-8 text-rose-400 mb-4" />
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Tightest Bowler</p>
          <p className="text-2xl font-black text-white">{data?.allTimeBest?.econ ? parseFloat(data.allTimeBest.econ).toFixed(2) : '0.00'}</p>
          <p className="text-sm font-bold text-rose-400 mt-2 truncate">{data?.allTimeBest?.econ ? data.allTimeBest.name : 'No records'}</p>
          <p className="text-[10px] text-slate-500 mt-1">Min. 10 overs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Career Run Leaders */}
        <section className="space-y-6">
          <h2 className="text-xl font-black text-white flex items-center gap-3"><Crown className="w-6 h-6 text-amber-400" /> Career Run Leaders</h2>
          <div className="space-y-4">
            {data?.topRuns?.map((p: any, i: number) => (
              <div key={p.id} onClick={() => router.push(`/players/${p.id}`)} className="p-5 rounded-3xl border border-slate-900 bg-slate-950 hover:bg-slate-900/40 transition-all flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-black text-slate-500">{i+1}</div>
                  <p className="font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">{p.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-white">{p.runs_scored}</p>
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">Total Runs</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Career Wicket Leaders */}
        <section className="space-y-6">
          <h2 className="text-xl font-black text-white flex items-center gap-3"><Crown className="w-6 h-6 text-indigo-400" /> Career Wicket Leaders</h2>
          <div className="space-y-4">
            {data?.topWickets?.map((p: any, i: number) => (
              <div key={p.id} onClick={() => router.push(`/players/${p.id}`)} className="p-5 rounded-3xl border border-slate-900 bg-slate-950 hover:bg-slate-900/40 transition-all flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-black text-slate-500">{i+1}</div>
                  <p className="font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">{p.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-white">{p.wickets_taken}</p>
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">Total Wickets</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
