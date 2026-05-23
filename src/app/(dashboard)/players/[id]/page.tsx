"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, TrendingUp, Target, Award, Trophy, Users, ShieldCheck, History, Star, Medal } from "lucide-react";
import { motion } from "framer-motion";

interface PlayerData {
  player: {
    id: number;
    name: string;
    role: string;
    matches_played: number;
    runs_scored: number;
    balls_faced: number;
    fours: number;
    sixes: number;
    wickets_taken: number;
    runs_conceded: number;
    balls_bowled: number;
    highest_score?: string;
    best_bowling?: string;
    batting_avg?: string;
    bowling_avg?: string;
    dot_balls_bowled?: number;
    hatricks?: number;
  };
  match_history: Array<{
    id: number;
    team_a_name: string;
    team_b_name: string;
    date: string;
    winner: string;
    runs_scored: number;
    balls_faced: number;
    wickets_taken: number;
    runs_conceded: number;
    team_name: string;
  }>;
  badges: Array<{
    id: string;
    name: string;
    desc: string;
    icon: string;
  }>;
}

export default function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const playerId = resolvedParams.id;

  const [data, setData] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);

  const getOvers = (ballsCount: number) => {
    const oversCount = Math.floor(ballsCount / 6);
    const remainingBalls = ballsCount % 6;
    return `${oversCount}.${remainingBalls}`;
  };

  useEffect(() => {
    fetch(`/api/players/${playerId}`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      });
  }, [playerId]);

  if (loading) return <div className="py-20 text-center"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" /></div>;
  if (!data || !data.player) return <div className="py-20 text-center text-slate-500">Player not found.</div>;

  const p = data.player;
  const history = data.match_history;
  const sr = p.balls_faced > 0 ? ((p.runs_scored / p.balls_faced) * 100).toFixed(1) : "0.0";
  const econ = p.balls_bowled > 0 ? ((p.runs_conceded * 6) / p.balls_bowled).toFixed(2) : "0.00";

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 px-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/players")} className="h-10 w-10 border border-slate-900 bg-slate-950 hover:bg-slate-900 rounded-xl flex items-center justify-center text-slate-300 hover:text-white cursor-pointer transition-all">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Player Profile</h1>
          <p className="text-slate-400 text-sm font-light">Comprehensive career performance and achievements.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <section className="lg:col-span-1 space-y-6">
          <div className="p-8 rounded-[2.5rem] border border-slate-900 glass-card bg-gradient-to-br from-emerald-500/10 to-indigo-500/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-3xl bg-slate-950 border-2 border-emerald-500/30 flex items-center justify-center mb-6 shadow-emerald-500/10 shadow-2xl">
                <Users className="w-12 h-12 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight mb-1">{p.name}</h2>
              <span className="px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">{p.role.replace("_", " ")}</span>
              
              <div className="grid grid-cols-2 gap-4 w-full mt-10">
                <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-900/60">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Matches</p>
                  <p className="text-xl font-black text-white">{p.matches_played}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-900/60">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Runs</p>
                  <p className="text-xl font-black text-emerald-400">{p.runs_scored}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-900/60">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Wkts</p>
                  <p className="text-xl font-black text-indigo-400">{p.wickets_taken}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-900/60">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Strike Rate</p>
                  <p className="text-xl font-black text-white">{sr}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Badges Section */}
          <div className="p-8 rounded-[2.5rem] border border-slate-900 glass-card space-y-6">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
              <Medal className="w-4 h-4 text-amber-500" /> Achievements
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {data.badges.length > 0 ? data.badges.map((b) => (
                <div key={b.id} className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-center gap-4">
                  <div className="text-2xl">{b.icon}</div>
                  <div>
                    <p className="text-xs font-black text-amber-400 uppercase">{b.name}</p>
                    <p className="text-[10px] text-slate-500 font-medium">{b.desc}</p>
                  </div>
                </div>
              )) : <p className="text-xs text-slate-600 italic">No achievements yet. Keep playing!</p>}
            </div>
          </div>
        </section>

        {/* Stats & History */}
        <section className="lg:col-span-2 space-y-8">
          {/* Summary Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl border border-slate-900 bg-slate-900/10 space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Star className="w-4 h-4 text-emerald-500" /> Batting Summary</h3>
              <div className="grid grid-cols-2 gap-y-4">
                <div><p className="text-[9px] font-bold text-slate-600 uppercase">Runs Scored</p><p className="text-lg font-black text-white">{p.runs_scored}</p></div>
                <div><p className="text-[9px] font-bold text-slate-600 uppercase">Strike Rate</p><p className="text-lg font-black text-white">{sr}</p></div>
                <div><p className="text-[9px] font-bold text-slate-600 uppercase">Average</p><p className="text-lg font-black text-white">{p.batting_avg}</p></div>
                <div><p className="text-[9px] font-bold text-slate-600 uppercase">Fours / Sixes</p><p className="text-lg font-black text-white">{p.fours} / {p.sixes}</p></div>
                <div><p className="text-[9px] font-bold text-slate-600 uppercase">Highest Score</p><p className="text-lg font-black text-emerald-500">{p.highest_score || '0'}</p></div>
              </div>
            </div>
            <div className="p-6 rounded-3xl border border-slate-900 bg-slate-900/10 space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Target className="w-4 h-4 text-indigo-500" /> Bowling Summary</h3>
              <div className="grid grid-cols-2 gap-y-4">
                <div><p className="text-[9px] font-bold text-slate-600 uppercase">Wickets</p><p className="text-lg font-black text-white">{p.wickets_taken}</p></div>
                <div><p className="text-[9px] font-bold text-slate-600 uppercase">Economy</p><p className="text-lg font-black text-white">{econ}</p></div>
                <div><p className="text-[9px] font-bold text-slate-600 uppercase">Average</p><p className="text-lg font-black text-white">{p.bowling_avg}</p></div>
                <div><p className="text-[9px] font-bold text-slate-600 uppercase">Dot Balls</p><p className="text-lg font-black text-white">{p.dot_balls_bowled || 0}</p></div>
                <div><p className="text-[9px] font-bold text-slate-600 uppercase">Hat-tricks</p><p className="text-lg font-black text-amber-400">{p.hatricks || 0}</p></div>
                <div><p className="text-[9px] font-bold text-slate-600 uppercase">Best Figures</p><p className="text-lg font-black text-indigo-400">{p.best_bowling || '0/0'}</p></div>
                <div><p className="text-[9px] font-bold text-slate-600 uppercase">Overs</p><p className="text-lg font-black text-white">{getOvers(p.balls_bowled)}</p></div>
              </div>
            </div>
          </div>

          {/* Match History */}
          <div className="space-y-6">
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2"><History className="w-5 h-5 text-slate-500" /> Recent Match History</h3>
            <div className="space-y-4">
              {history.map((m, idx) => (
                <div key={idx} className="p-6 rounded-[2rem] border border-slate-900 bg-slate-950 hover:border-emerald-500/20 transition-all group shadow-xl">
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase mb-2">
                        {m.date} • {m.team_name}
                      </div>
                      <h4 className="text-lg font-black text-white group-hover:text-emerald-400 transition-colors">{m.team_a_name} vs {m.team_b_name}</h4>
                      <p className="text-[10px] font-bold text-emerald-500 uppercase mt-1 italic">Match won by {m.winner}</p>
                    </div>
                    <div className="flex gap-4 md:border-l border-slate-900 md:pl-6">
                      <div className="text-center min-w-[70px]">
                        <p className="text-[9px] font-black text-slate-600 uppercase">Runs</p>
                        <p className="text-xl font-black text-white">{m.runs_scored}</p>
                        <p className="text-[9px] text-slate-500">({m.balls_faced} balls)</p>
                      </div>
                      <div className="text-center min-w-[70px]">
                        <p className="text-[9px] font-black text-slate-600 uppercase">Wkts</p>
                        <p className="text-xl font-black text-indigo-400">{m.wickets_taken}</p>
                        <p className="text-[9px] text-slate-500">{m.runs_conceded} runs</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
