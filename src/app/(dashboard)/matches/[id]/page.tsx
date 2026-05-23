"use client";

import { useEffect, useState, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Calendar, Award, Target, BookOpen, ChevronLeft, Activity, Users, Download, TrendingUp, BarChart3, Star, ShieldCheck, Zap } from "lucide-react";
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
    toPng(resultCardRef.current, { cacheBust: true, pixelRatio: 2 })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `Match-${matchId}-Summary.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => console.error('Error generating image:', err));
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">Processing Results</p>
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

  const calculateMVP = () => {
    const players = [...teamAStats, ...teamBStats];
    if (players.length === 0) return null;
    const scoredPlayers = players.map(p => {
      const score = p.runs_scored + (p.wickets_taken * 25) + (p.fours * 5) + (p.sixes * 10);
      return { ...p, mvpScore: score };
    });
    return scoredPlayers.sort((a, b) => b.mvpScore - a.mvpScore)[0];
  };
  const mvp = calculateMVP();

  const getWormData = () => {
    const maxBalls = Math.max(match.team_a_balls, match.team_b_balls);
    const data = [];
    let cumulativeA = 0; let cumulativeB = 0;
    for (let i = 0; i <= maxBalls; i++) {
      const ballA = innings1Timeline[i - 1];
      if (ballA) cumulativeA += ballA.runs + (ballA.extra === 'wide' || ballA.extra === 'noball' ? 1 : 0);
      const ballB = innings2Timeline[i - 1];
      if (ballB) cumulativeB += ballB.runs + (ballB.extra === 'wide' || ballB.extra === 'noball' ? 1 : 0);
      if (i % 6 === 0 || i === maxBalls) {
        data.push({ over: Math.floor(i / 6), [match.team_a_name]: i <= match.team_a_balls ? cumulativeA : null, [match.team_b_name]: i <= match.team_b_balls ? cumulativeB : null });
      }
    }
    return data;
  };

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

  const getFOW = (timeline: BallLogEntry[]) => {
    const fow: { wicket: number; score: number; player: string; over: string }[] = [];
    let currentScore = 0; let currentWickets = 0;
    timeline.forEach((ball) => {
      currentScore += ball.runs + (ball.extra === 'wide' || ball.extra === 'noball' ? 1 : 0);
      if (ball.isWicket) {
        currentWickets++;
        fow.push({ wicket: currentWickets, score: currentScore, player: ball.strikerName, over: `${ball.over}.${ball.ball}` });
      }
    });
    return fow;
  };

  const calculatePartnerships = (timeline: BallLogEntry[]) => {
    const ps: any[] = [];
    if (timeline.length === 0) return ps;
    let currentP = { total: 0, balls: 0, p1Name: "", p1Runs: 0, p1Balls: 0, p2Name: "", p2Runs: 0, p2Balls: 0, wicket: "" };
    let p1Name = ""; let p2Name = "";
    timeline.forEach((ball, index) => {
      if (!p1Name) p1Name = ball.strikerName;
      if (!p2Name && ball.strikerName !== p1Name) p2Name = ball.strikerName;
      if (ball.strikerName === p1Name) { currentP.p1Runs += ball.runs; currentP.p1Balls += (ball.extra === "wide" || ball.extra === "noball" ? 0 : 1); }
      else { if (!p2Name) p2Name = ball.strikerName; currentP.p2Runs += ball.runs; currentP.p2Balls += (ball.extra === "wide" || ball.extra === "noball" ? 0 : 1); }
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
    <div className="max-w-5xl mx-auto space-y-10 pb-24 px-4 pt-4 select-none">
      {/* Dynamic Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <button onClick={() => router.push("/")} className="h-12 w-12 bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl flex items-center justify-center text-slate-400 hover:text-emerald-400 cursor-pointer transition-all shadow-xl"><ChevronLeft className="w-6 h-6" /></button>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">Match Result</h1>
            <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2"><Calendar className="w-3.5 h-3.5 text-emerald-500" /> {match.date}</div>
          </div>
        </div>
        <button onClick={downloadResultCard} className="flex items-center justify-center gap-2 px-6 h-12 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all active:scale-95"><Download className="w-4 h-4" /> Save Summary</button>
      </div>

      {/* Hero Result Banner */}
      <div ref={resultCardRef} className="rounded-3xl md:rounded-[3.5rem] p-0.5 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 shadow-2xl border border-slate-800/40">
        <section className="p-5 sm:p-8 md:p-14 rounded-[1.4rem] md:rounded-[3.3rem] bg-slate-955 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 md:gap-10 relative z-10">
            <div className="text-center md:text-left space-y-2 flex-1 w-full">
              <h2 className="text-lg md:text-xl font-black text-slate-500 uppercase tracking-[0.2em] md:tracking-[0.3em]">{match.team_a_name}</h2>
              <div className="text-5xl sm:text-6xl md:text-7xl font-black text-white tracking-tight">{match.team_a_runs}<span className="text-xl sm:text-2xl text-slate-700 ml-1">/ {match.team_a_wickets}</span></div>
              <p className="text-[10px] font-black text-slate-650 uppercase tracking-[0.4em]">{getOvers(match.team_a_balls)} Overs</p>
            </div>
            
            <div className="flex flex-col items-center gap-4 py-8 px-6 sm:py-10 sm:px-12 rounded-3xl sm:rounded-[3.5rem] bg-slate-900/40 border border-slate-800/50 backdrop-blur-md w-full sm:w-auto sm:min-w-[320px] shadow-2xl shrink-0">
              <div className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.5em] mb-1">Match Report</div>
              <Trophy className="w-12 h-12 sm:w-16 sm:h-16 text-amber-400 filter drop-shadow-[0_0_25px_rgba(251,191,36,0.3)]" />
              <div className="text-center space-y-1.5">
                <p className="text-xl sm:text-2xl font-black text-white uppercase tracking-tighter italic">{match.winner} WON</p>
                <div className="h-0.5 w-12 bg-emerald-500/20 mx-auto" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">Match Summary</p>
              </div>
            </div>
 
            <div className="text-center md:text-right space-y-2 flex-1 w-full">
              <h2 className="text-lg md:text-xl font-black text-slate-500 uppercase tracking-[0.2em] md:tracking-[0.3em]">{match.team_b_name}</h2>
              <div className="text-5xl sm:text-6xl md:text-7xl font-black text-white tracking-tight">{match.team_b_runs}<span className="text-xl sm:text-2xl text-slate-700 ml-1">/ {match.team_b_wickets}</span></div>
              <p className="text-[10px] font-black text-slate-650 uppercase tracking-[0.4em]">{getOvers(match.team_b_balls)} Overs</p>
            </div>
          </div>
 
          {mvp && (
            <div className="mt-8 md:mt-12 pt-8 md:pt-10 border-t border-slate-900/80 flex flex-col items-center">
              <div className="flex items-center gap-3 px-6 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-4">
                <Star className="w-4 h-4 fill-amber-500" />
                <span className="text-[9px] font-black uppercase tracking-[0.4em]">Man of the Match</span>
              </div>
              <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tighter uppercase text-center">{mvp.name}</h3>
              <div className="flex flex-wrap justify-center gap-4 sm:gap-8 mt-4 text-slate-550 font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[10px]">
                <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {mvp.runs_scored} Runs</span>
                <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> {mvp.wickets_taken} Wkts</span>
                <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> {mvp.fours} Fours</span>
              </div>
            </div>
          )}
        </section>
      </div>
 
      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-10 border-b border-slate-900 pb-0.5 select-none">
        {[ 
          { id: 'scorecard', label: 'Scorecard', icon: BookOpen }, 
          { id: 'partnerships', label: 'Partnerships', icon: Users }, 
          { id: 'analytics', label: 'Analysis', icon: BarChart3 } 
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`pb-3 sm:pb-5 flex items-center gap-2.5 text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.4em] transition-all relative cursor-pointer ${activeTab === tab.id ? "text-emerald-400" : "text-slate-650 hover:text-slate-350"}`}>
            <tab.icon className="w-4 h-4" />{tab.label}
            {activeTab === tab.id && <motion.div layoutId="tab-u" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full shadow-[0_-5px_20px_rgba(16,185,129,0.5)]" />}
          </button>
        ))}
      </div>
 
      <AnimatePresence mode="wait">
        {activeTab === "scorecard" ? (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 15 }} className="space-y-8 md:space-y-12">
            {[ 
              { team: match.team_a_name, runs: match.team_a_runs, wkts: match.team_a_wickets, balls: match.team_a_balls, stats: teamAStats, bowlStats: teamBStats, fow: fowA, color: 'emerald' },
              { team: match.team_b_name, runs: match.team_b_runs, wkts: match.team_b_wickets, balls: match.team_b_balls, stats: teamBStats, bowlStats: teamAStats, fow: fowB, color: 'indigo' } 
            ].map((inn, idx) => (
              <section key={idx} className="p-4 sm:p-8 md:p-14 rounded-3xl md:rounded-[3.5rem] border border-slate-900 glass-card space-y-8 md:space-y-12 shadow-xl relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-80 h-84 bg-${inn.color}-500/5 rounded-full blur-[120px] pointer-events-none`} />
                <div className="flex justify-between items-end border-b border-slate-900 pb-6 md:pb-10 relative z-10">
                  <div className="space-y-1">
                    <p className={`text-[10px] font-black text-${inn.color}-500 uppercase tracking-[0.4em]`}>{idx === 0 ? 'First' : 'Second'} Innings</p>
                    <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tighter uppercase">{inn.team}</h3>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-3xl sm:text-4xl md:text-5xl font-black text-white">{inn.runs}<span className="text-xl sm:text-2xl text-slate-700 ml-1">/{inn.wkts}</span></div>
                    <p className="text-[10px] md:text-[11px] font-black text-slate-650 uppercase tracking-[0.3em] md:tracking-[0.4em]">{getOvers(inn.balls)} Overs</p>
                  </div>
                </div>
 
                <div className="space-y-6 md:space-y-10 relative z-10">
                  <div className="flex items-center gap-3"><div className={`h-6 w-1 rounded-full bg-${inn.color}-500`} /><h4 className="text-[11px] md:text-[12px] font-black text-slate-350 uppercase tracking-[0.2em] md:tracking-[0.3em]">Batting Analysis</h4></div>
                  <div className="overflow-x-auto"><table className="w-full text-left border-separate border-spacing-y-3 min-w-[600px] sm:min-w-0">
                      <thead><tr className="text-slate-650 text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em]"><th className="px-3 sm:px-8 pb-2">Batsman</th><th className="px-3 sm:px-8 pb-2">How Out</th><th className="px-3 sm:px-8 pb-2 text-right">R</th><th className="px-3 sm:px-8 pb-2 text-right">B</th><th className="px-3 sm:px-8 pb-2 text-right">4s</th><th className="px-3 sm:px-8 pb-2 text-right">6s</th><th className="px-3 sm:px-8 pb-2 text-right">SR</th></tr></thead>
                      <tbody className="text-[12px] font-black">
                        {inn.stats.map((s) => (
                          <tr key={s.id} className="bg-slate-900/40 group hover:bg-slate-900/60 transition-all shadow-sm">
                            <td className="px-3 sm:px-8 py-4 sm:py-6 rounded-l-2xl sm:rounded-l-[1.8rem] text-slate-100 group-hover:text-white border-y border-l border-slate-900/50">{s.name}</td>
                            <td className="px-3 sm:px-8 py-4 sm:py-6 text-slate-650 italic font-medium uppercase tracking-widest border-y border-slate-900/50">{s.wicket_how.replace("_", " ")}</td>
                            <td className="px-3 sm:px-8 py-4 sm:py-6 text-right font-black text-white border-y border-slate-900/50 text-base">{s.runs_scored}</td>
                            <td className="px-3 sm:px-8 py-4 sm:py-6 text-right text-slate-500 border-y border-slate-900/50">{s.balls_faced}</td>
                            <td className="px-3 sm:px-8 py-4 sm:py-6 text-right text-slate-600 border-y border-slate-900/50">{s.fours}</td>
                            <td className="px-3 sm:px-8 py-4 sm:py-6 text-right text-slate-600 border-y border-slate-900/50">{s.sixes}</td>
                            <td className={`px-3 sm:px-8 py-4 sm:py-6 text-right font-black text-${inn.color}-500 rounded-r-2xl sm:rounded-r-[1.8rem] border-y border-r border-slate-900/50`}>{s.balls_faced > 0 ? ((s.runs_scored/s.balls_faced)*100).toFixed(1) : "0.0"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table></div>
                </div>
 
                <div className="space-y-6 md:space-y-10 pt-10 md:pt-14 border-t border-slate-900/60 relative z-10">
                  <div className="flex items-center gap-3"><div className={`h-6 w-1 rounded-full bg-${inn.color === 'emerald' ? 'indigo' : 'emerald'}-500`} /><h4 className="text-[11px] md:text-[12px] font-black text-slate-350 uppercase tracking-[0.2em] md:tracking-[0.3em]">Bowling Figures</h4></div>
                  <div className="overflow-x-auto"><table className="w-full text-left border-separate border-spacing-y-3 min-w-[500px] sm:min-w-0">
                      <thead><tr className="text-slate-655 text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em]"><th className="px-3 sm:px-8 pb-2">Bowler</th><th className="px-3 sm:px-8 pb-2 text-right">O</th><th className="px-3 sm:px-8 pb-2 text-right">R</th><th className="px-3 sm:px-8 pb-2 text-right">W</th><th className="px-3 sm:px-8 pb-2 text-right">Econ</th></tr></thead>
                      <tbody className="text-[12px] font-black">
                        {inn.bowlStats.filter(s => s.balls_bowled > 0).map((s) => (
                          <tr key={s.id} className="bg-slate-900/40 group hover:bg-slate-900/60 transition-all shadow-sm">
                            <td className="px-3 sm:px-8 py-4 sm:py-6 rounded-l-2xl sm:rounded-l-[1.8rem] text-slate-100 group-hover:text-white border-y border-l border-slate-900/50">{s.name}</td>
                            <td className="px-3 sm:px-8 py-4 sm:py-6 text-right text-slate-500 border-y border-slate-900/50">{getOvers(s.balls_bowled)}</td>
                            <td className="px-3 sm:px-8 py-4 sm:py-6 text-right text-slate-200 border-y border-slate-900/50 text-base">{s.runs_conceded}</td>
                            <td className="px-3 sm:px-8 py-4 sm:py-6 text-right font-black text-white border-y border-slate-900/50 text-base">{s.wickets_taken}</td>
                            <td className={`px-3 sm:px-8 py-4 sm:py-6 text-right font-black text-${inn.color === 'emerald' ? 'indigo' : 'emerald'}-500 rounded-r-2xl sm:rounded-r-[1.8rem] border-y border-r border-slate-900/50`}>{s.balls_bowled > 0 ? ((s.runs_conceded * 6) / s.balls_bowled).toFixed(2) : "0.00"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table></div>
                </div>
 
                {inn.fow.length > 0 && (
                  <div className="pt-10 md:pt-14 border-t border-slate-900/60 relative z-10">
                    <p className="text-[11px] font-black text-slate-650 uppercase tracking-[0.4em] mb-6 md:mb-8 text-center">Fall of Wickets</p>
                    <div className="flex flex-wrap justify-center gap-4 sm:gap-6">{inn.fow.map(w => (<div key={w.wicket} className="px-4 py-3 sm:px-6 sm:py-4 rounded-2xl sm:rounded-[1.5rem] bg-slate-900/40 border border-slate-800/80 flex items-center gap-3 sm:gap-5 group hover:border-slate-700 transition-all shadow-xl"><div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl bg-${inn.color}-500/10 flex items-center justify-center text-xs font-black text-${inn.color}-400 border border-${inn.color}-500/20 shrink-0`}>{w.wicket}</div><div><p className="text-sm sm:text-base font-black text-white leading-none">{w.score}</p><p className="text-[9px] sm:text-[10px] font-black text-slate-600 uppercase mt-2 leading-none">{w.player} ({w.over})</p></div></div>))}</div>
                  </div>
                )}
              </section>
            ))}
          </motion.div>
        ) : activeTab === "partnerships" ? (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 15 }} className="space-y-12">
            {[ { team: match.team_a_name, data: p1, color: 'emerald' }, { team: match.team_b_name, data: p2, color: 'indigo' } ].map((innings, idx) => (
              <section key={idx} className="space-y-8 md:space-y-10">
                <div className="flex items-center justify-center gap-6 pb-6 border-b border-slate-900"><h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tighter">{innings.team} Partnerships</h3></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                  {innings.data.length > 0 ? innings.data.map((p: any, i: number) => (
                    <div key={i} className="p-6 sm:p-10 rounded-3xl md:rounded-[3.5rem] border border-slate-900 bg-slate-900/10 hover:bg-slate-900/30 transition-all group relative overflow-hidden flex flex-col justify-between min-h-[220px] sm:min-h-[250px] shadow-2xl">
                      <div className={`absolute top-0 left-0 w-2 h-full bg-${innings.color}-500/10 group-hover:bg-${innings.color}-500/40 transition-all`} />
                      <div className="space-y-1.5 mb-6 sm:mb-12"><p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">Total Stand</p><div className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tighter leading-none">{p.total}<span className="text-sm sm:text-lg font-bold text-slate-700 ml-3 italic">off {p.balls}b</span></div><p className={`text-[10px] md:text-[11px] font-black uppercase italic mt-3 text-${innings.color}-500 tracking-widest`}>{p.wicket === 'not out' ? 'Partnership Unbroken' : `Innings Break: ${p.wicket.replace('_', ' ')}`}</p></div>
                      <div className="space-y-6"><div className="flex justify-between items-end gap-6"><div className="flex-1 space-y-1"><p className="text-sm sm:text-base font-black text-slate-200 truncate">{p.p1Name}</p><p className="text-[9px] sm:text-[10px] font-black text-slate-600 uppercase tracking-widest">{p.p1Runs} runs</p></div><div className="flex-1 text-right space-y-1"><p className="text-sm sm:text-base font-black text-slate-200 truncate">{p.p2Name}</p><p className="text-[9px] sm:text-[10px] font-black text-slate-650 uppercase tracking-widest">{p.p2Runs} runs</p></div></div>
                        <div className="h-2 rounded-full bg-slate-950 flex overflow-hidden border border-slate-900 p-[1.5px] shadow-2xl shadow-black"><div style={{ width: `${(p.p1Runs/(p.total||1))*100}%` }} className="h-full bg-emerald-500 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all duration-1000" /><div style={{ width: `${(p.p2Runs/(p.total||1))*100}%` }} className="h-full bg-indigo-500 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all duration-1000" /></div>
                      </div>
                    </div>
                  )) : <p className="py-16 md:py-24 text-center text-slate-700 font-black uppercase tracking-[0.5em] text-xs sm:text-sm italic">No data recorded.</p>}
                </div>
              </section>
            ))}
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 15 }} className="space-y-12">
            <section className="p-5 sm:p-8 md:p-16 rounded-3xl md:rounded-[4rem] border border-slate-900 bg-slate-950 shadow-2xl relative overflow-hidden"><div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8 sm:mb-16 relative z-10"><div><h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-white uppercase tracking-tighter">Performance Charts</h3><p className="text-[10px] md:text-[11px] font-black text-slate-700 uppercase tracking-[0.4em] flex items-center gap-2.5 mt-2"><TrendingUp className="w-4 h-4 text-emerald-500" /> Run Chase Worm Chart</p></div>
                <div className="flex gap-4 sm:gap-8"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{match.team_a_name}</span></div><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-500" /><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{match.team_b_name}</span></div></div></div>
              <div className="h-[280px] sm:h-[400px] w-full relative z-10"><ResponsiveContainer width="100%" height="100%"><LineChart data={wormData}><CartesianGrid strokeDasharray="5 5" stroke="#1e293b" vertical={false} strokeOpacity={0.3} /><XAxis dataKey="over" stroke="#475569" fontSize={11} tickMargin={20} axisLine={false} tickLine={false} /><YAxis stroke="#475569" fontSize={11} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ backgroundColor: '#020617', border: '2px solid #1e293b', borderRadius: '24px', padding: '15px', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase' }} /><Line type="monotone" dataKey={match.team_a_name} stroke="#10b981" strokeWidth={5} dot={false} activeDot={{ r: 10, fill: '#10b981', stroke: '#fff', strokeWidth: 3 }} /><Line type="monotone" dataKey={match.team_b_name} stroke="#6366f1" strokeWidth={5} dot={false} activeDot={{ r: 10, fill: '#6366f1', stroke: '#fff', strokeWidth: 3 }} /></LineChart></ResponsiveContainer></div>
            </section>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
              {[ { team: match.team_a_name, data: manhattanA, color: '#10b981' }, { team: match.team_b_name, data: manhattanB, color: '#6366f1' } ].map((m, i) => (
                <section key={i} className="p-5 sm:p-8 md:p-12 rounded-3xl md:rounded-[3.5rem] border border-slate-900 bg-slate-955 shadow-xl relative overflow-hidden"><div className="space-y-2 mb-8 md:mb-12 text-center md:text-left"><h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tighter">{m.team}</h3><p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em] flex items-center justify-center md:justify-start gap-2.5">Runs Per Over Manhattan</p></div>
                  <div className="h-[220px] sm:h-[280px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={m.data}><XAxis dataKey="over" stroke="#475569" fontSize={11} axisLine={false} tickLine={false} /><YAxis stroke="#475569" fontSize={11} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} contentStyle={{ backgroundColor: '#020617', border: '2px solid #1e293b', borderRadius: '20px', fontWeight: '900' }} /><Bar dataKey="runs" radius={[8, 8, 0, 0]}>{m.data.map((entry, index) => (<Cell key={index} fill={entry.wickets > 0 ? '#ef4444' : m.color} fillOpacity={0.8} />))}</Bar></BarChart></ResponsiveContainer></div>
                </section>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
