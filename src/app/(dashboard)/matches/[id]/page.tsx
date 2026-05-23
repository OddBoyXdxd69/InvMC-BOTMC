"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Calendar, Award, Target, BookOpen, ChevronLeft, Activity, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

  const [match, setMatch] = useState<Match | null>(null);
  const [stats, setStats] = useState<PlayerMatchStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"scorecard" | "partnerships">("scorecard");

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

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 text-sm italic">Loading scorecard...</p>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="py-20 text-center space-y-4">
        <p className="text-slate-400 text-sm italic">Scorecard not found.</p>
        <button 
          onClick={() => router.push("/")}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold text-xs text-white cursor-pointer transition-all"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  // Filter stats by team and deduplicate by player_id for safety
  const teamAStats = stats
    .filter((s) => s.team_name === match.team_a_name)
    .filter((v, i, a) => a.findIndex(t => t.player_id === v.player_id) === i);
  const teamBStats = stats
    .filter((s) => s.team_name === match.team_b_name)
    .filter((v, i, a) => a.findIndex(t => t.player_id === v.player_id) === i);

  // Parse balls log
  let parsedBallsLog: BallLogEntry[] = [];
  if (match.balls_log) {
    try {
      parsedBallsLog = JSON.parse(match.balls_log) as BallLogEntry[];
    } catch (e) {
      console.error("Error parsing balls log:", e);
    }
  }

  const innings1Timeline = parsedBallsLog.filter(b => b.innings === 1);
  const innings2Timeline = parsedBallsLog.filter(b => b.innings === 2);

  // --- Partnership Calculation ---
  const calculatePartnerships = (timeline: BallLogEntry[]) => {
    const ps: {
      total: number;
      balls: number;
      p1Name: string;
      p1Runs: number;
      p1Balls: number;
      p2Name: string;
      p2Runs: number;
      p2Balls: number;
      wicket?: string;
    }[] = [];

    if (timeline.length === 0) return ps;

    let currentP = {
      total: 0,
      balls: 0,
      p1Name: "",
      p1Runs: 0,
      p1Balls: 0,
      p2Name: "",
      p2Runs: 0,
      p2Balls: 0,
      wicket: ""
    };

    let p1Name = "";
    let p2Name = "";

    timeline.forEach((ball, index) => {
      if (!p1Name) p1Name = ball.strikerName;
      if (!p2Name && ball.strikerName !== p1Name) p2Name = ball.strikerName;

      // Contribution
      if (ball.strikerName === p1Name) {
        currentP.p1Runs += ball.runs;
        currentP.p1Balls += (ball.extra === "wide" || ball.extra === "noball" ? 0 : 1);
      } else {
        // If it's not p1, it's either p2 or the first time p2 is seen
        if (!p2Name) p2Name = ball.strikerName;
        currentP.p2Runs += ball.runs;
        currentP.p2Balls += (ball.extra === "wide" || ball.extra === "noball" ? 0 : 1);
      }

      currentP.total += ball.runs + (ball.extra === "wide" || ball.extra === "noball" ? 1 : 0);
      currentP.balls += (ball.extra === "wide" || ball.extra === "noball" ? 0 : 1);

      if (ball.isWicket) {
        currentP.p1Name = p1Name;
        currentP.p2Name = p2Name || "(batting alone)";
        currentP.wicket = ball.wicketHow || "out";
        ps.push({ ...currentP });
        
        currentP = { total: 0, balls: 0, p1Name: "", p1Runs: 0, p1Balls: 0, p2Name: "", p2Runs: 0, p2Balls: 0, wicket: "" };
        p1Name = ""; 
        p2Name = ""; 
      } else if (index === timeline.length - 1) {
        currentP.p1Name = p1Name;
        currentP.p2Name = p2Name || "(batting alone)";
        currentP.wicket = "not out";
        ps.push({ ...currentP });
      }
    });

    return ps;
  };

  const p1 = calculatePartnerships(innings1Timeline);
  const p2 = calculatePartnerships(innings2Timeline);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.push("/")}
          className="h-10 w-10 border border-slate-900 bg-slate-950 hover:bg-slate-900 rounded-xl flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Match Scorecard</h1>
          <p className="text-slate-400 text-sm font-light mt-1">Full match stats, batsman score sheets, and bowler statistics.</p>
        </div>
      </div>

      {/* Result Card Banner */}
      <section className="p-6 sm:p-8 rounded-2xl border border-slate-900 bg-gradient-to-r from-emerald-500/10 via-indigo-500/5 to-transparent relative overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 w-36 h-36 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              {match.date}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 flex-wrap">
              <span>{match.team_a_name}</span>
              <span className="text-slate-500 font-light text-base px-1">vs</span>
              <span>{match.team_b_name}</span>
            </h2>
            <p className="text-emerald-400 font-extrabold text-sm uppercase mt-4 tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 fill-emerald-500 text-emerald-400" /> 
              Winner: {match.winner}
            </p>
          </div>
          <div className="flex gap-8 border-t sm:border-t-0 sm:border-l border-slate-900 pt-4 sm:pt-0 sm:pl-8 flex-wrap">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{match.team_a_name}</p>
              <p className="text-2xl font-black text-white mt-1">
                {match.team_a_runs} <span className="text-sm font-semibold text-slate-400">/ {match.team_a_wickets}</span>
              </p>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">{getOvers(match.team_a_balls)} Overs</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{match.team_b_name}</p>
              <p className="text-2xl font-black text-white mt-1">
                {match.team_b_runs} <span className="text-sm font-semibold text-slate-400">/ {match.team_b_wickets}</span>
              </p>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">{getOvers(match.team_b_balls)} Overs</p>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs Selector */}
      <div className="flex gap-6 border-b border-slate-900 pb-0.5">
        <button
          onClick={() => setActiveTab("scorecard")}
          className={`pb-3 text-sm font-bold transition-all relative cursor-pointer ${
            activeTab === "scorecard" ? "text-emerald-400 font-extrabold" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          Full Scorecard
          {activeTab === "scorecard" && (
            <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("partnerships")}
          className={`pb-3 text-sm font-bold transition-all relative cursor-pointer ${
            activeTab === "partnerships" ? "text-emerald-400 font-extrabold" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          Partnerships
          {activeTab === "partnerships" && (
            <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "scorecard" ? (
          <motion.div
            key="scorecard-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="space-y-8"
          >
            {/* Innings 1 scorecard */}
            <section className="p-6 rounded-2xl border border-slate-900 glass-card space-y-6 shadow-xl">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2 border-b border-slate-900 pb-3">
                <BookOpen className="w-5 h-5 text-emerald-400" /> {match.team_a_name} Innings Scorecard
              </h3>
              
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Batting</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[500px]">
                    <thead>
                      <tr className="border-b border-slate-900 text-slate-500">
                        <th className="pb-2 font-semibold">Batsman</th>
                        <th className="pb-2 font-semibold">Dismissal</th>
                        <th className="pb-2 font-semibold text-right">Runs</th>
                        <th className="pb-2 font-semibold text-right">Balls</th>
                        <th className="pb-2 font-semibold text-right">4s</th>
                        <th className="pb-2 font-semibold text-right">6s</th>
                        <th className="pb-2 font-semibold text-right">SR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/60">
                      {teamAStats.map((s) => {
                        const strikeRate = s.balls_faced > 0 ? ((s.runs_scored / s.balls_faced) * 100).toFixed(1) : "0.0";
                        return (
                          <tr key={s.id} className="text-slate-300">
                            <td className="py-3 font-semibold text-white">{s.name}</td>
                            <td className="py-3 text-slate-500 font-light capitalize">
                              {s.wicket_how === "six_out" ? "OUT (Six & Out)" : s.wicket_how.replace("_", " ")}
                            </td>
                            <td className="py-3 text-right font-bold text-white">{s.runs_scored}</td>
                            <td className="py-3 text-right">{s.balls_faced}</td>
                            <td className="py-3 text-right">{s.fours}</td>
                            <td className="py-3 text-right">{s.sixes}</td>
                            <td className="py-3 text-right font-medium text-emerald-400">{strikeRate}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-900/60">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bowling (by {match.team_b_name})</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[500px]">
                    <thead>
                      <tr className="border-b border-slate-900 text-slate-500">
                        <th className="pb-2 font-semibold">Bowler</th>
                        <th className="pb-2 font-semibold text-right">Overs</th>
                        <th className="pb-2 font-semibold text-right">Runs</th>
                        <th className="pb-2 font-semibold text-right">Wickets</th>
                        <th className="pb-2 font-semibold text-right">Economy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/60">
                      {teamBStats.filter(s => s.balls_bowled > 0).map((s) => {
                        const economy = s.balls_bowled > 0 ? ((s.runs_conceded * 6) / s.balls_bowled).toFixed(2) : "0.00";
                        return (
                          <tr key={s.id} className="text-slate-300">
                            <td className="py-3 font-semibold text-white">{s.name}</td>
                            <td className="py-3 text-right">{getOvers(s.balls_bowled)}</td>
                            <td className="py-3 text-right">{s.runs_conceded}</td>
                            <td className="py-3 text-right font-bold text-white">{s.wickets_taken}</td>
                            <td className="py-3 text-right font-medium text-emerald-400">{economy}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Innings 2 scorecard */}
            <section className="p-6 rounded-2xl border border-slate-900 glass-card space-y-6 shadow-xl">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2 border-b border-slate-900 pb-3">
                <BookOpen className="w-5 h-5 text-indigo-400" /> {match.team_b_name} Innings Scorecard
              </h3>
              
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Batting</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[500px]">
                    <thead>
                      <tr className="border-b border-slate-900 text-slate-500">
                        <th className="pb-2 font-semibold">Batsman</th>
                        <th className="pb-2 font-semibold">Dismissal</th>
                        <th className="pb-2 font-semibold text-right">Runs</th>
                        <th className="pb-2 font-semibold text-right">Balls</th>
                        <th className="pb-2 font-semibold text-right">4s</th>
                        <th className="pb-2 font-semibold text-right">6s</th>
                        <th className="pb-2 font-semibold text-right">SR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/60">
                      {teamBStats.map((s) => {
                        const strikeRate = s.balls_faced > 0 ? ((s.runs_scored / s.balls_faced) * 100).toFixed(1) : "0.0";
                        return (
                          <tr key={s.id} className="text-slate-300">
                            <td className="py-3 font-semibold text-white">{s.name}</td>
                            <td className="py-3 text-slate-500 font-light capitalize">
                              {s.wicket_how === "six_out" ? "OUT (Six & Out)" : s.wicket_how.replace("_", " ")}
                            </td>
                            <td className="py-3 text-right font-bold text-white">{s.runs_scored}</td>
                            <td className="py-3 text-right">{s.balls_faced}</td>
                            <td className="py-3 text-right">{s.fours}</td>
                            <td className="py-3 text-right">{s.sixes}</td>
                            <td className="py-3 text-right font-medium text-emerald-400">{strikeRate}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-900/60">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bowling (by {match.team_a_name})</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[500px]">
                    <thead>
                      <tr className="border-b border-slate-900 text-slate-500">
                        <th className="pb-2 font-semibold">Bowler</th>
                        <th className="pb-2 font-semibold text-right">Overs</th>
                        <th className="pb-2 font-semibold text-right">Runs</th>
                        <th className="pb-2 font-semibold text-right">Wickets</th>
                        <th className="pb-2 font-semibold text-right">Economy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/60">
                      {teamAStats.filter(s => s.balls_bowled > 0).map((s) => {
                        const economy = s.balls_bowled > 0 ? ((s.runs_conceded * 6) / s.balls_bowled).toFixed(2) : "0.00";
                        return (
                          <tr key={s.id} className="text-slate-300">
                            <td className="py-3 font-semibold text-white">{s.name}</td>
                            <td className="py-3 text-right">{getOvers(s.balls_bowled)}</td>
                            <td className="py-3 text-right">{s.runs_conceded}</td>
                            <td className="py-3 text-right font-bold text-white">{s.wickets_taken}</td>
                            <td className="py-3 text-right font-medium text-emerald-400">{economy}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </motion.div>
        ) : (
          <motion.div
            key="partnerships-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="space-y-12"
          >
            <section className="space-y-6">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2 border-b border-slate-900 pb-3">
                <Users className="w-5 h-5 text-emerald-400" /> {match.team_a_name} Batting Partnerships
              </h3>
              <div className="space-y-4">
                {p1.length > 0 ? (
                  p1.map((p, i) => (
                    <div key={i} className="p-6 rounded-2xl border border-slate-900 glass-card bg-slate-900/10 shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/40" />
                      <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                        <div className="flex-1 text-center md:text-left">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Partnership</p>
                          <h4 className="text-3xl font-black text-white">{p.total} <span className="text-base font-medium text-slate-500">runs off {p.balls} balls</span></h4>
                          <p className="text-[10px] text-emerald-400 font-bold uppercase mt-1 italic">{p.wicket === 'not out' ? 'Unbroken' : `End: ${(p.wicket || 'out').replace('_', ' ')}`}</p>
                        </div>
                        <div className="flex items-center gap-4 w-full md:w-auto min-w-[300px]">
                          <div className="flex-1 text-right">
                            <p className="text-sm font-bold text-white truncate">{p.p1Name}</p>
                            <p className="text-xs text-slate-400">{p.p1Runs} ({p.p1Balls})</p>
                          </div>
                          <div className="flex-[2] h-2.5 rounded-full bg-slate-950 border border-slate-800 flex overflow-hidden">
                            <div style={{ width: `${(p.p1Runs / (p.total || 1)) * 100}%` }} className="h-full bg-emerald-500/80" />
                            <div style={{ width: `${(p.p2Runs / (p.total || 1)) * 100}%` }} className="h-full bg-indigo-500/80" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-bold text-white truncate">{p.p2Name}</p>
                            <p className="text-xs text-slate-400">{p.p2Runs} ({p.p2Balls})</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-12 text-center text-slate-500 italic text-sm font-light">No partnerships recorded.</p>
                )}
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2 border-b border-slate-900 pb-3">
                <Users className="w-5 h-5 text-indigo-400" /> {match.team_b_name} Batting Partnerships
              </h3>
              <div className="space-y-4">
                {p2.length > 0 ? (
                  p2.map((p, i) => (
                    <div key={i} className="p-6 rounded-2xl border border-slate-900 glass-card bg-slate-900/10 shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/40" />
                      <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                        <div className="flex-1 text-center md:text-left">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Partnership</p>
                          <h4 className="text-3xl font-black text-white">{p.total} <span className="text-base font-medium text-slate-500">runs off {p.balls} balls</span></h4>
                          <p className="text-[10px] text-indigo-400 font-bold uppercase mt-1 italic">{p.wicket === 'not out' ? 'Unbroken' : `End: ${(p.wicket || 'out').replace('_', ' ')}`}</p>
                        </div>
                        <div className="flex items-center gap-4 w-full md:w-auto min-w-[300px]">
                          <div className="flex-1 text-right">
                            <p className="text-sm font-bold text-white truncate">{p.p1Name}</p>
                            <p className="text-xs text-slate-400">{p.p1Runs} ({p.p1Balls})</p>
                          </div>
                          <div className="flex-[2] h-2.5 rounded-full bg-slate-950 border border-slate-800 flex overflow-hidden">
                            <div style={{ width: `${(p.p1Runs / (p.total || 1)) * 100}%` }} className="h-full bg-emerald-500/80" />
                            <div style={{ width: `${(p.p2Runs / (p.total || 1)) * 100}%` }} className="h-full bg-indigo-500/80" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-bold text-white truncate">{p.p2Name}</p>
                            <p className="text-xs text-slate-400">{p.p2Runs} ({p.p2Balls})</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-12 text-center text-slate-500 italic text-sm font-light">No partnerships recorded.</p>
                )}
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
