"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Play, Award, Target, Calendar, ChevronRight, Sparkles, Activity } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

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
}

interface Player {
  id: number;
  name: string;
  role: string;
  matches_played: number;
  runs_scored: number;
  balls_faced: number;
  wickets_taken: number;
  runs_conceded: number;
  balls_bowled: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/matches").then((res) => res.json()),
      fetch("/api/players").then((res) => res.json())
    ])
      .then(([matchesData, playersData]) => {
        setMatches(Array.isArray(matchesData) ? matchesData : []);
        setPlayers(Array.isArray(playersData) ? playersData : []);
        setLoading(false)
      })
      .catch((err) => {
        console.error("Failed to load dashboard data:", err);
        setLoading(false);
      });
  }, []);

  const getOvers = (balls: number) => {
    const overs = Math.floor(balls / 6);
    const remainingBalls = balls % 6;
    return `${overs}.${remainingBalls}`;
  };

  // Compute leaderboards
  const topBatsmen = [...players]
    .filter(p => p.runs_scored > 0)
    .sort((a, b) => b.runs_scored - a.runs_scored)
    .slice(0, 3);

  const topBowlers = [...players]
    .filter(p => p.wickets_taken > 0)
    .sort((a, b) => b.wickets_taken - a.wickets_taken)
    .slice(0, 3);

  const liveMatches = matches.filter((m) => m.status === "live");
  const completedMatches = matches.filter((m) => m.status === "completed");

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 text-sm italic">Loading dashboard statistics...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Welcome Banner */}
      <section className="p-6 sm:p-8 rounded-2xl border border-slate-900 bg-gradient-to-r from-emerald-500/10 via-indigo-500/5 to-transparent relative overflow-hidden shadow-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="absolute right-0 top-0 w-36 h-36 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" style={{ animationDuration: '3s' }} />
            Automatic Scorer Live
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Cricket Match Center</h1>
          <p className="text-slate-400 text-sm font-light">Score local cricket matches and save persistent squad statistics.</p>
        </div>
        <button
          onClick={() => router.push("/matches/new")}
          className="h-12 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-emerald-600/15 transition-all flex items-center gap-2 hover:scale-105 active:scale-[0.98] z-10"
        >
          <Play className="w-4 h-4 fill-white text-white" /> Create New Match
        </button>
      </section>

      {/* Live Matches Panel */}
      {liveMatches.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" /> Live In-Progress Matches
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveMatches.map((m) => (
              <div 
                key={m.id} 
                className="p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex justify-between items-center hover:border-emerald-500/40 transition-all duration-300 group"
              >
                <div>
                  <h3 className="font-extrabold text-white text-base leading-tight">
                    {m.team_a_name} vs {m.team_b_name}
                  </h3>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-1 block">
                    {m.overs_limit} Overs Match
                  </span>
                </div>
                <Link
                  href={`/matches/live/${m.id}`}
                  className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-all shadow-md shadow-emerald-600/10"
                >
                  Join Scoring <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Grid: Match History & Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Match History */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-emerald-400" /> Completed Matches
          </h2>
          {completedMatches.length > 0 ? (
            <div className="space-y-4">
              {completedMatches.map((m) => (
                <div 
                  key={m.id}
                  className="p-5 rounded-xl border border-slate-900 bg-slate-900/20 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:border-emerald-500/15 transition-all duration-300 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-500 text-[10px] font-medium uppercase tracking-wider">
                      <Calendar className="w-3.5 h-3.5 text-slate-600" />
                      {m.date}
                    </div>
                    <h3 className="font-black text-white text-lg tracking-tight">
                      {m.team_a_name} vs {m.team_b_name}
                    </h3>
                    <p className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 uppercase">
                      <Trophy className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                      Winner: {m.winner}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-6 justify-between sm:justify-end border-t sm:border-t-0 border-slate-900 pt-3 sm:pt-0">
                    <div className="flex gap-4 text-right">
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold block">{m.team_a_name}</span>
                        <span className="text-sm font-bold text-slate-300">{m.team_a_runs}/{m.team_a_wickets}</span>
                        <span className="text-[10px] text-slate-500 font-light block">{getOvers(m.team_a_balls)} ov</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold block">{m.team_b_name}</span>
                        <span className="text-sm font-bold text-slate-300">{m.team_b_runs}/{m.team_b_wickets}</span>
                        <span className="text-[10px] text-slate-500 font-light block">{getOvers(m.team_b_balls)} ov</span>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/matches/${m.id}`)}
                      className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 cursor-pointer transition-all"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl border border-slate-900 bg-slate-900/10 text-slate-500 italic text-sm font-light">
              No completed matches found yet. Start scoring to see them here!
            </div>
          )}
        </div>

        {/* Leaderboards */}
        <div className="space-y-6">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Award className="w-4 h-4 text-emerald-400" /> Squad Leaderboards
          </h2>

          {players.length > 0 ? (
            <div className="space-y-6">
              {/* Batting Leaderboard */}
              <section className="p-5 rounded-2xl border border-slate-900 glass-card space-y-4 shadow-xl">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-900 pb-2 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-500" /> Orange Cap (Top Batsmen)
                </h3>
                <div className="space-y-3">
                  {topBatsmen.map((p, index) => {
                    const sr = p.balls_faced > 0 ? ((p.runs_scored / p.balls_faced) * 100).toFixed(1) : "0.0";
                    return (
                      <div key={p.id} className="flex justify-between items-center text-sm p-2 rounded-lg hover:bg-slate-900/30 transition-all">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-bold text-slate-500">#{index + 1}</span>
                          <span className="font-semibold text-slate-200">{p.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-white block">{p.runs_scored} Runs</span>
                          <span className="text-[10px] text-slate-500 font-light block">SR {sr}</span>
                        </div>
                      </div>
                    );
                  })}
                  {topBatsmen.length === 0 && (
                    <p className="text-[10px] text-slate-500 italic font-light">Waiting for runs to be scored...</p>
                  )}
                </div>
              </section>

              {/* Bowling Leaderboard */}
              <section className="p-5 rounded-2xl border border-slate-900 glass-card space-y-4 shadow-xl">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-900 pb-2 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-blue-500" /> Purple Cap (Top Bowlers)
                </h3>
                <div className="space-y-3">
                  {topBowlers.map((p, index) => {
                    const econ = p.balls_bowled > 0 ? ((p.runs_conceded * 6) / p.balls_bowled).toFixed(2) : "0.00";
                    return (
                      <div key={p.id} className="flex justify-between items-center text-sm p-2 rounded-lg hover:bg-slate-900/30 transition-all">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-bold text-slate-500">#{index + 1}</span>
                          <span className="font-semibold text-slate-200">{p.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-white block">{p.wickets_taken} Wickets</span>
                          <span className="text-[10px] text-slate-500 font-light block">Econ {econ}</span>
                        </div>
                      </div>
                    );
                  })}
                  {topBowlers.length === 0 && (
                    <p className="text-[10px] text-slate-500 italic font-light">Waiting for wickets to be taken...</p>
                  )}
                </div>
              </section>
            </div>
          ) : (
            <div className="p-6 text-center rounded-2xl border border-slate-900 bg-slate-900/10 text-slate-500 italic text-sm font-light">
              No registered players in squad.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
