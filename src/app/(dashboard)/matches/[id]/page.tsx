"use client";

import { useEffect, useState, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Calendar, Award, Target, BookOpen, ChevronLeft, Activity, Users, Download, Share2, TrendingUp, BarChart3, ListTree, Star, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { toPng } from 'html-to-image';

interface Match {
  id: number;
  team_a_name: string;
  team_b_name: string;
  overs_limit: number;
  status: string;
  winner: string;
  date: string;
  team_a_runs: number;
  team_a_wickets: number;
  team_a_balls: number;
  team_b_runs: number;
  team_b_wickets: number;
  team_b_balls: number;
  balls_log?: string;
  toss_winner_id?: number;
  toss_decision?: string;
  bowler_overs_limit?: number;
}

interface PlayerMatchStat {
  id: number;
  match_id: number;
  player_id: number;
  team_name: string;
  runs_scored: number;
  balls_faced: number;
  fours: number;
  sixes: number;
  wickets_taken: number;
  runs_conceded: number;
  balls_bowled: number;
  wicket_how: string;
  name: string;
  role: string;
}

interface BallLogEntry {
  innings: 1 | 2;
  over: number;
  ball: number;
  strikerName: string;
  bowlerName: string;
  runs: number;
  extra: "wide" | "noball" | "bye" | "six_out" | null;
  isWicket: boolean;
  wicketHow?: string;
}

export default function MatchScorecardPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const matchId = resolvedParams.id;
  const resultCardRef = useRef<HTMLDivElement>(null);

  const [match, setMatch] = useState<Match | null>(null);
  const [stats, setStats] = useState<PlayerMatchStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"scorecard" | "partnerships" | "analytics">("scorecard");

  useEffect(() => {
    fetch(`/api/matches?id=${matchId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.match) {
          setMatch(data.match);
          setStats(data.stats || []);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load match scorecard:", err);
        setLoading(false);
      });
  }, [matchId]);

  const getOvers = (balls: number) => {
    const overs = Math.floor(balls / 6);
    const remainingBalls = balls % 6;
    return `${overs}.${remainingBalls}`;
  };

  const downloadResultCard = () => {
    if (resultCardRef.current === null) return;
    toPng(resultCardRef.current, { cacheBust: true })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `match-${matchId}-summary.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => console.error('Error generating image:', err));
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 text-sm italic">Loading stats & charts...</p>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="py-20 text-center space-y-4">
        <p className="text-slate-400 text-sm italic">Scorecard not found.</p>
        <button onClick={() => router.push("/")} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold text-xs text-white cursor-pointer transition-all">Go to Dashboard</button>
      </div>
    );
  }

  const teamAStats = stats.filter((s) => s.team_name === match.team_a_name).filter((v, i, a) => a.findIndex(t => t.player_id === v.player_id) === i);
  const teamBStats = stats.filter((s) => s.team_name === match.team_b_name).filter((v, i, a) => a.findIndex(t => t.player_id === v.player_id) === i);

  let parsedBallsLog: BallLogEntry[] = [];
  if (match.balls_log) {
    try { parsedBallsLog = JSON.parse(match.balls_log) as BallLogEntry[]; } catch (e) { console.error(e); }
  }

  const innings1Timeline = parsedBallsLog.filter(b => b.innings === 1);
  const innings2Timeline = parsedBallsLog.filter(b => b.innings === 2);

  // --- ANALYTICS CALCULATIONS ---
  
  // 1. MVP Calculation
  const calculateMVP = () => {
    const players = [...teamAStats, ...teamBStats];
    const scoredPlayers = players.map(p => {
      // Simple MVP algorithm: 1 pt per run, 25 per wicket, 5 per four, 10 per six
      const score = p.runs_scored + (p.wickets_taken * 25) + (p.fours * 5) + (p.sixes * 10);
      return { ...p, mvpScore: score };
    });
    return scoredPlayers.sort((a, b) => b.mvpScore - a.mvpScore)[0];
  };
  const mvp = calculateMVP();

  // 2. Worm Chart (Cumulative Runs)
  const getWormData = () => {
    const maxBalls = Math.max(match.team_a_balls, match.team_b_balls);
    const data = [];
    let cumulativeA = 0;
    let cumulativeB = 0;

    for (let i = 0; i <= maxBalls; i++) {
      const ballA = innings1Timeline[i - 1];
      if (ballA) cumulativeA += ballA.runs + (ballA.extra === 'wide' || ballA.extra === 'noball' ? 1 : 0);
      
      const ballB = innings2Timeline[i - 1];
      if (ballB) cumulativeB += ballB.runs + (ballB.extra === 'wide' || ballB.extra === 'noball' ? 1 : 0);

      const overLabel = `${Math.floor(i / 6)}.${i % 6}`;
      data.push({
        ball: i,
        over: overLabel,
        [match.team_a_name]: i <= match.team_a_balls ? cumulativeA : null,
        [match.team_b_name]: i <= match.team_b_balls ? cumulativeB : null,
      });
    }
    return data.filter((_, idx) => idx % 6 === 0 || idx === maxBalls); // Simplify to over-by-over
  };

  // 3. Manhattan Chart (Runs per Over)
  const getManhattanData = (timeline: BallLogEntry[]) => {
    const overs = [];
    for (let i = 0; i < match.overs_limit; i++) {
      const overBalls = timeline.filter(b => b.over === i);
      const runs = overBalls.reduce((acc, b) => acc + b.runs + (b.extra === 'wide' || b.extra === 'noball' ? 1 : 0), 0);
      const wickets = overBalls.filter(b => b.isWicket).length;
      overs.push({ over: i + 1, runs, wickets });
    }
    return overs;
  };

  // 4. Fall of Wickets
  const getFOW = (timeline: BallLogEntry[]) => {
    const fow = [];
    let currentScore = 0;
    let currentWickets = 0;
    timeline.forEach((ball) => {
      currentScore += ball.runs + (ball.extra === 'wide' || ball.extra === 'noball' ? 1 : 0);
      if (ball.isWicket) {
        currentWickets++;
        fow.push({
          wicket: currentWickets,
          score: currentScore,
          player: ball.strikerName,
          over: `${ball.over}.${ball.ball}`
        });
      }
    });
    return fow;
  };

  // 5. Partnerships
  const calculatePartnerships = (timeline: BallLogEntry[]) => {
    const ps: any[] = [];
    if (timeline.length === 0) return ps;
    let currentP = { total: 0, balls: 0, p1Name: "", p1Runs: 0, p1Balls: 0, p2Name: "", p2Runs: 0, p2Balls: 0, wicket: "" };
    let p1Name = ""; let p2Name = "";

    timeline.forEach((ball, index) => {
      if (!p1Name) p1Name = ball.strikerName;
      if (!p2Name && ball.strikerName !== p1Name) p2Name = ball.strikerName;
      if (ball.strikerName === p1Name) {
        currentP.p1Runs += ball.runs;
        currentP.p1Balls += (ball.extra === "wide" || ball.extra === "noball" ? 0 : 1);
      } else {
        if (!p2Name) p2Name = ball.strikerName;
        currentP.p2Runs += ball.runs;
        currentP.p2Balls += (ball.extra === "wide" || ball.extra === "noball" ? 0 : 1);
      }
      currentP.total += ball.runs + (ball.extra === "wide" || ball.extra === "noball" ? 1 : 0);
      currentP.balls += (ball.extra === "wide" || ball.extra === "noball" ? 0 : 1);
      if (ball.isWicket) {
        currentP.p1Name = p1Name; currentP.p2Name = p2Name || "(batting alone)"; currentP.wicket = ball.wicketHow || "out";
        ps.push({ ...currentP });
        currentP = { total: 0, balls: 0, p1Name: "", p1Runs: 0, p1Balls: 0, p2Name: "", p2Runs: 0, p2Balls: 0, wicket: "" };
        p1Name = ""; p2Name = ""; 
      } else if (index === timeline.length - 1) {
        currentP.p1Name = p1Name; currentP.p2Name = p2Name || "(batting alone)"; currentP.wicket = "not out";
        ps.push({ ...currentP });
      }
    });
    return ps;
  };

  const wormData = getWormData();
  const manhattanA = getManhattanData(innings1Timeline);
  const manhattanB = getManhattanData(innings2Timeline);
  const fowA = getFOW(innings1Timeline);
  const fowB = getFOW(innings2Timeline);
  const p1 = calculatePartnerships(innings1Timeline);
  const p2 = calculatePartnerships(innings2Timeline);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/")} className="h-10 w-10 border border-slate-900 bg-slate-950 hover:bg-slate-900 rounded-xl flex items-center justify-center text-slate-300 hover:text-white cursor-pointer transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter">MATCH RECAP</h1>
            <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">
              <Calendar className="w-3 h-3 text-emerald-500/50" /> {match.date}
            </div>
          </div>
        </div>
        <button onClick={downloadResultCard} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-black text-white shadow-lg shadow-indigo-600/20 transition-all active:scale-95">
          <Download className="w-4 h-4" /> Download Summary
        </button>
      </div>

      {/* RESULT CARD (FOR DOWNLOAD) */}
      <div ref={resultCardRef} className="p-1 rounded-[2.5rem] bg-gradient-to-br from-slate-800 to-slate-950 shadow-2xl overflow-hidden border border-slate-800/50">
        <section className="p-8 sm:p-10 rounded-[2.2rem] bg-slate-950 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-12 relative z-10">
            {/* Team A */}
            <div className="text-center md:text-left flex-1">
              <h2 className="text-4xl font-black text-white tracking-tighter mb-2">{match.team_a_name}</h2>
              <div className="text-5xl font-black text-emerald-400 tracking-tight">
                {match.team_a_runs} <span className="text-2xl text-slate-600">/ {match.team_a_wickets}</span>
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">{getOvers(match.team_a_balls)} Overs</p>
            </div>

            {/* VS & Result */}
            <div className="flex flex-col items-center gap-4 py-6 px-10 rounded-3xl bg-slate-900/30 border border-slate-800/50 backdrop-blur-sm min-w-[240px]">
              <div className="text-xs font-black text-slate-600 uppercase tracking-[0.3em]">Final Result</div>
              <div className="h-0.5 w-12 bg-emerald-500/30 rounded-full" />
              <div className="text-center">
                <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-3 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]" />
                <p className="text-sm font-black text-white uppercase tracking-wider">{match.winner} WON</p>
              </div>
            </div>

            {/* Team B */}
            <div className="text-center md:text-right flex-1">
              <h2 className="text-4xl font-black text-white tracking-tighter mb-2">{match.team_b_name}</h2>
              <div className="text-5xl font-black text-indigo-400 tracking-tight">
                {match.team_b_runs} <span className="text-2xl text-slate-600">/ {match.team_b_wickets}</span>
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">{getOvers(match.team_b_balls)} Overs</p>
            </div>
          </div>

          {/* MVP Spotlight */}
          {mvp && (
            <div className="mt-12 pt-8 border-t border-slate-900/60 flex flex-col items-center">
              <div className="flex items-center gap-3 px-6 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-4">
                <Star className="w-4 h-4 fill-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest">Player of the Match</span>
              </div>
              <p className="text-2xl font-black text-white tracking-tight">{mvp.name}</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                {mvp.runs_scored} Runs • {mvp.wickets_taken} Wickets • {mvp.fours} Fours
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-4 border-b border-slate-900/60 pb-1">
        {[
          { id: 'scorecard', label: 'Full Scorecard', icon: BookOpen },
          { id: 'partnerships', label: 'Partnerships', icon: Users },
          { id: 'analytics', label: 'Insights & Charts', icon: BarChart3 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all relative ${
              activeTab === tab.id ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {activeTab === tab.id && <motion.div layoutId="tab-u" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 shadow-[0_-4px_12px_rgba(16,185,129,0.3)]" />}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "scorecard" ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="space-y-8">
            {/* INNINGS 1 */}
            <section className="p-6 sm:p-8 rounded-3xl border border-slate-900 glass-card space-y-8">
              <div className="flex justify-between items-center border-b border-slate-900 pb-4">
                <h3 className="text-lg font-black text-white flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-emerald-500" /> {match.team_a_name} Innings</h3>
                <div className="text-sm font-black text-slate-400">{match.team_a_runs}/{match.team_a_wickets} <span className="text-xs text-slate-600">({getOvers(match.team_a_balls)})</span></div>
              </div>
              <div className="overflow-x-auto"><table className="w-full text-left text-xs min-w-[500px]">
                <thead><tr className="text-slate-600 font-bold uppercase tracking-wider border-b border-slate-900/50"><th className="pb-3 px-1">Batsman</th><th className="pb-3 px-1">Status</th><th className="pb-3 px-1 text-right">R</th><th className="pb-3 px-1 text-right">B</th><th className="pb-3 px-1 text-right">4s</th><th className="pb-3 px-1 text-right">6s</th><th className="pb-3 px-1 text-right">SR</th></tr></thead>
                <tbody className="divide-y divide-slate-900/40">{teamAStats.map((s) => (
                  <tr key={s.id} className="text-slate-300"><td className="py-4 px-1 font-bold text-slate-100">{s.name}</td><td className="py-4 px-1 text-slate-500 italic capitalize">{s.wicket_how.replace("_", " ")}</td><td className="py-4 px-1 text-right font-black text-white">{s.runs_scored}</td><td className="py-4 px-1 text-right">{s.balls_faced}</td><td className="py-4 px-1 text-right">{s.fours}</td><td className="py-4 px-1 text-right">{s.sixes}</td><td className="py-4 px-1 text-right font-bold text-emerald-500">{s.balls_faced > 0 ? ((s.runs_scored/s.balls_faced)*100).toFixed(1) : "0.0"}</td></tr>
                ))}</tbody>
              </table></div>
              {fowA.length > 0 && (
                <div className="pt-6 border-t border-slate-900/50">
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">Fall of Wickets</p>
                  <div className="flex flex-wrap gap-4 text-[11px]">
                    {fowA.map(w => (
                      <div key={w.wicket} className="px-3 py-1.5 rounded-lg bg-slate-900/40 border border-slate-800/60 text-slate-400">
                        <span className="font-black text-emerald-400 mr-2">{w.wicket}-{w.score}</span>
                        <span>{w.player} ({w.over})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* INNINGS 2 */}
            <section className="p-6 sm:p-8 rounded-3xl border border-slate-900 glass-card space-y-8">
              <div className="flex justify-between items-center border-b border-slate-900 pb-4">
                <h3 className="text-lg font-black text-white flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-indigo-500" /> {match.team_b_name} Innings</h3>
                <div className="text-sm font-black text-slate-400">{match.team_b_runs}/{match.team_b_wickets} <span className="text-xs text-slate-600">({getOvers(match.team_b_balls)})</span></div>
              </div>
              <div className="overflow-x-auto"><table className="w-full text-left text-xs min-w-[500px]">
                <thead><tr className="text-slate-600 font-bold uppercase tracking-wider border-b border-slate-900/50"><th className="pb-3 px-1">Batsman</th><th className="pb-3 px-1">Status</th><th className="pb-3 px-1 text-right">R</th><th className="pb-3 px-1 text-right">B</th><th className="pb-3 px-1 text-right">4s</th><th className="pb-3 px-1 text-right">6s</th><th className="pb-3 px-1 text-right">SR</th></tr></thead>
                <tbody className="divide-y divide-slate-900/40">{teamBStats.map((s) => (
                  <tr key={s.id} className="text-slate-300"><td className="py-4 px-1 font-bold text-slate-100">{s.name}</td><td className="py-4 px-1 text-slate-500 italic capitalize">{s.wicket_how.replace("_", " ")}</td><td className="py-4 px-1 text-right font-black text-white">{s.runs_scored}</td><td className="py-4 px-1 text-right">{s.balls_faced}</td><td className="py-4 px-1 text-right">{s.fours}</td><td className="py-4 px-1 text-right">{s.sixes}</td><td className="py-4 px-1 text-right font-bold text-indigo-400">{s.balls_faced > 0 ? ((s.runs_scored/s.balls_faced)*100).toFixed(1) : "0.0"}</td></tr>
                ))}</tbody>
              </table></div>
              {fowB.length > 0 && (
                <div className="pt-6 border-t border-slate-900/50">
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">Fall of Wickets</p>
                  <div className="flex flex-wrap gap-4 text-[11px]">
                    {fowB.map(w => (
                      <div key={w.wicket} className="px-3 py-1.5 rounded-lg bg-slate-900/40 border border-slate-800/60 text-slate-400">
                        <span className="font-black text-indigo-400 mr-2">{w.wicket}-{w.score}</span>
                        <span>{w.player} ({w.over})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </motion.div>
        ) : activeTab === "partnerships" ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="space-y-12">
            {[ { team: match.team_a_name, data: p1, color: 'emerald' }, { team: match.team_b_name, data: p2, color: 'indigo' } ].map((innings, idx) => (
              <section key={idx} className="space-y-6">
                <h3 className={`text-base font-black text-white flex items-center gap-2 border-b border-slate-900 pb-3`}>
                  <Users className={`w-5 h-5 text-${innings.color}-400`} /> {innings.team} Partnerships
                </h3>
                <div className="grid gap-4">
                  {innings.data.length > 0 ? innings.data.map((p: any, i: number) => (
                    <div key={i} className="p-6 rounded-3xl border border-slate-900 bg-slate-900/20 hover:bg-slate-900/40 transition-all group relative overflow-hidden">
                      <div className={`absolute top-0 left-0 w-1 h-full bg-${innings.color}-500/30 group-hover:w-1.5 transition-all`} />
                      <div className="flex flex-col lg:flex-row justify-between items-center gap-8">
                        <div className="text-center lg:text-left min-w-[200px]">
                          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Partnership</p>
                          <div className="text-3xl font-black text-white">{p.total} <span className="text-sm font-medium text-slate-500">({p.balls})</span></div>
                          <div className={`text-[10px] font-bold uppercase mt-1 italic text-${innings.color}-400`}>{p.wicket === 'not out' ? 'Unbroken' : `End: ${p.wicket}`}</div>
                        </div>
                        <div className="flex-1 w-full flex items-center gap-6">
                          <div className="flex-1 text-right"><p className="text-sm font-black text-slate-100 truncate">{p.p1Name}</p><p className="text-xs text-slate-500 font-bold">{p.p1Runs} ({p.p1Balls})</p></div>
                          <div className="flex-[2] h-2 rounded-full bg-slate-950 flex overflow-hidden border border-slate-800 shadow-inner">
                            <div style={{ width: `${(p.p1Runs/(p.total||1))*100}%` }} className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]" />
                            <div style={{ width: `${(p.p2Runs/(p.total||1))*100}%` }} className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.2)]" />
                          </div>
                          <div className="flex-1 text-left"><p className="text-sm font-black text-slate-100 truncate">{p.p2Name}</p><p className="text-xs text-slate-500 font-bold">{p.p2Runs} ({p.p2Balls})</p></div>
                        </div>
                      </div>
                    </div>
                  )) : <p className="py-12 text-center text-slate-500 italic">No partnerships recorded.</p>}
                </div>
              </section>
            ))}
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="space-y-12">
            {/* Worm Chart */}
            <section className="p-8 rounded-[2.5rem] border border-slate-900 bg-slate-900/10 shadow-xl">
              <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3 mb-10">
                <TrendingUp className="w-5 h-5 text-emerald-400" /> Run Chase Progress (Worm Chart)
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={wormData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="over" stroke="#64748b" fontSize={10} tickMargin={10} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px' }} />
                    <Line type="monotone" dataKey={match.team_a_name} stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey={match.team_b_name} stroke="#6366f1" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Manhattan Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {[ { team: match.team_a_name, data: manhattanA, color: '#10b981' }, { team: match.team_b_name, data: manhattanB, color: '#6366f1' } ].map((m, i) => (
                <section key={i} className="p-8 rounded-[2.5rem] border border-slate-900 bg-slate-900/10 shadow-xl">
                  <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-3 mb-8">
                    <BarChart3 className="w-4 h-4 text-slate-500" /> {m.team} Runs Per Over
                  </h3>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={m.data}>
                        <XAxis dataKey="over" stroke="#64748b" fontSize={9} />
                        <YAxis stroke="#64748b" fontSize={9} />
                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }} />
                        <Bar dataKey="runs" radius={[4, 4, 0, 0]}>
                          {m.data.map((entry, index) => (
                            <Cell key={index} fill={entry.wickets > 0 ? '#ef4444' : m.color} fillOpacity={0.8} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
