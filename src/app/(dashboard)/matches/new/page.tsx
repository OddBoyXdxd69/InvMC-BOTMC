"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Users, Play, Sparkles, ArrowLeftRight, Lock, Unlock, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Player {
  id: number;
  name: string;
  role: string;
}

export default function NewMatchPage({ searchParams }: { searchParams: Promise<{ seriesId?: string }> }) {
  const router = useRouter();
  const resolvedSearchParams = use(searchParams);
  const seriesId = resolvedSearchParams.seriesId;

  const [players, setPlayers] = useState<Player[]>([]);
  const [teamAName, setTeamAName] = useState("Team A");
  const [teamBName, setTeamBName] = useState("Team B");
  const [overs, setOvers] = useState(5);
  const [bowlerLimit, setBowlerLimit] = useState(2);
  const [singleMan, setSingleMan] = useState(true); // This will be labeled "Last Man Standing"
  const [singleManMode, setSingleManMode] = useState(false); // New: everyone bats alone
  const [teamAPlayers, setTeamAPlayers] = useState<number[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<number[]>([]);
  
  // Toss
  const [tossWinner, setTossWinner] = useState<"A" | "B" | null>(null);
  const [tossDecision, setTossDecision] = useState<"bat" | "bowl" | null>(null);
  const [commonPlayers, setCommonPlayers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const playersRes = await fetch("/api/players");
        const playersData = await playersRes.json();
        setPlayers(Array.isArray(playersData) ? playersData : []);

        if (seriesId) {
          const seriesRes = await fetch(`/api/series?id=${seriesId}`);
          if (seriesRes.ok) {
            const seriesData = await seriesRes.json();
            const s = seriesData.series;
            setTeamAName(s.team_a_name);
            setTeamBName(s.team_b_name);
            setOvers(s.overs_limit);
            setBowlerLimit(s.bowler_overs_limit || 2);
            setSingleMan(s.single_man !== 0);
            setSingleManMode(s.single_man_mode === 1);
            
            const teamAPlayerIds = JSON.parse(s.team_a_player_ids || "[]");
            const teamBPlayerIds = JSON.parse(s.team_b_player_ids || "[]");
            const commonPlayerIds = JSON.parse(s.common_player_ids || "[]");
            setTeamAPlayers(teamAPlayerIds);
            setTeamBPlayers(teamBPlayerIds);
            setCommonPlayers(commonPlayerIds);
          }
        }
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [seriesId]);

  const toggleCommonPlayer = (playerId: number) => {
    setCommonPlayers((prev) => {
      const isCurrentlyCommon = prev.includes(playerId);
      if (isCurrentlyCommon) {
        // Removing from common — also remove from both teams
        setTeamAPlayers((ta) => ta.filter((id) => id !== playerId));
        setTeamBPlayers((tb) => tb.filter((id) => id !== playerId));
        return prev.filter((id) => id !== playerId);
      } else {
        // Adding to common — auto-add to both teams
        setTeamAPlayers((ta) => (ta.includes(playerId) ? ta : [...ta, playerId]));
        setTeamBPlayers((tb) => (tb.includes(playerId) ? tb : [...tb, playerId]));
        return [...prev, playerId];
      }
    });
  };

  const handleTogglePlayer = (team: "A" | "B", playerId: number) => {
    const isCommon = commonPlayers.includes(playerId);
    
    if (team === "A") {
      const isInA = teamAPlayers.includes(playerId);
      if (isInA) {
        // Deselecting from A
        setTeamAPlayers((prev) => prev.filter((id) => id !== playerId));
        // If common, also remove from B and un-common
        if (isCommon) {
          setTeamBPlayers((prev) => prev.filter((id) => id !== playerId));
          setCommonPlayers((prev) => prev.filter((id) => id !== playerId));
        }
      } else {
        // Check if already in B and not common → block
        if (teamBPlayers.includes(playerId) && !isCommon) return;
        setTeamAPlayers((prev) => [...prev, playerId]);
      }
    } else {
      const isInB = teamBPlayers.includes(playerId);
      if (isInB) {
        // Deselecting from B
        setTeamBPlayers((prev) => prev.filter((id) => id !== playerId));
        // If common, also remove from A and un-common
        if (isCommon) {
          setTeamAPlayers((prev) => prev.filter((id) => id !== playerId));
          setCommonPlayers((prev) => prev.filter((id) => id !== playerId));
        }
      } else {
        // Check if already in A and not common → block
        if (teamAPlayers.includes(playerId) && !isCommon) return;
        setTeamBPlayers((prev) => [...prev, playerId]);
      }
    }
  };

  const isDisabledForTeam = (team: "A" | "B", playerId: number): boolean => {
    const isCommon = commonPlayers.includes(playerId);
    if (isCommon) return false;
    if (team === "A") {
      return teamBPlayers.includes(playerId) && !teamAPlayers.includes(playerId);
    } else {
      return teamAPlayers.includes(playerId) && !teamBPlayers.includes(playerId);
    }
  };

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!teamAName.trim() || !teamBName.trim()) {
      setError("Please enter names for both teams.");
      return;
    }

    if (teamAPlayers.length === 0 || teamBPlayers.length === 0) {
      setError("Each team must have at least one player selected.");
      return;
    }

    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          team_a_name: teamAName.trim(),
          team_b_name: teamBName.trim(),
          overs_limit: Number(overs),
          single_man: singleMan,
          single_man_mode: singleManMode,
          toss_winner_id: tossWinner === "A" ? 1 : (tossWinner === "B" ? 2 : null), // Temporary logic for API
          toss_decision: tossDecision,
          bowler_overs_limit: Number(bowlerLimit),
          series_id: seriesId ? Number(seriesId) : null
        }),
      });

      const data = await res.json();

      if (res.ok && data.match_id) {
        // Determine who bats first based on toss
        let teamABatsFirst = true;
        if (tossWinner === "A") {
          teamABatsFirst = tossDecision === "bat";
        } else if (tossWinner === "B") {
          teamABatsFirst = tossDecision === "bowl";
        }

        const lineupData = {
          teamAName: teamAName.trim(),
          teamBName: teamBName.trim(),
          teamAPlayerIds: teamAPlayers,
          teamBPlayerIds: teamBPlayers,
          commonPlayerIds: commonPlayers,
          oversLimit: Number(overs),
          singleMan: singleMan,
          singleManMode: singleManMode,
          tossWinner: tossWinner === "A" ? teamAName : teamBName,
          tossDecision: tossDecision,
          bowlerLimit: Number(bowlerLimit),
          teamABatsFirst: teamABatsFirst
        };
        localStorage.setItem(`match_lineup_${data.match_id}`, JSON.stringify(lineupData));

        router.push(`/matches/live/${data.match_id}`);
      } else {
        setError(data.error || "Failed to initialize match.");
      }
    } catch (err) {
      setError("An error occurred during match initialization.");
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 text-sm italic">Loading squads...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center">
          <Play className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Create Match</h1>
          <p className="text-slate-400 text-sm font-light mt-1">Configure teams, select players, and set match over limits.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-sm font-medium">
          {error}
        </div>
      )}

      {players.length < 2 ? (
        <div className="p-8 rounded-2xl border border-slate-900 glass-card text-center text-slate-400 space-y-4">
          <p className="text-sm font-light leading-relaxed">
            You need at least <span className="text-emerald-400 font-semibold">2 registered players</span> in the squad directory before starting a match.
          </p>
          <button 
            onClick={() => router.push("/players")}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs cursor-pointer transition-all shadow-md shadow-emerald-600/15"
          >
            Go to Player Directory
          </button>
        </div>
      ) : (
        <form onSubmit={handleCreateMatch} className="space-y-8">
          {/* Match Settings Card */}
          <section className="p-6 rounded-2xl border border-slate-900 glass-card space-y-6 shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-emerald-400" />
              </div>
              Match Settings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Team A Name</label>
                <input
                  type="text"
                  value={teamAName}
                  onChange={(e) => setTeamAName(e.target.value)}
                  required
                  className="flex h-12 w-full rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/25 transition-all duration-300"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Team B Name</label>
                <input
                  type="text"
                  value={teamBName}
                  onChange={(e) => setTeamBName(e.target.value)}
                  required
                  className="flex h-12 w-full rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/25 transition-all duration-300"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Overs Format</label>
                <select
                  value={overs}
                  onChange={(e) => setOvers(Number(e.target.value))}
                  className="flex h-12 w-full rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2 text-sm text-slate-100 focus-visible:outline-none focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/25 transition-all duration-300 cursor-pointer"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map((ov) => (
                    <option key={ov} value={ov}>
                      {ov} Overs
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Bowler Over Limit</label>
                <select
                  value={bowlerLimit}
                  onChange={(e) => setBowlerLimit(Number(e.target.value))}
                  className="flex h-12 w-full rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2 text-sm text-slate-100 focus-visible:outline-none focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/25 transition-all duration-300 cursor-pointer"
                >
                  {[1, 2, 3, 4, 5, 10].map((lim) => (
                    <option key={lim} value={lim}>
                      Max {lim} Overs
                    </option>
                  ))}
                  <option value={0}>Unlimited</option>
                </select>
              </div>
            </div>

            {/* Toss Management */}
            <div className="p-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-indigo-400" /> Match Toss
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Who won the toss?</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTossWinner("A")}
                      className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                        tossWinner === "A" ? "bg-emerald-500 border-emerald-400 text-white" : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      {teamAName}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTossWinner("B")}
                      className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                        tossWinner === "B" ? "bg-indigo-500 border-indigo-400 text-white" : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      {teamBName}
                    </button>
                  </div>
                </div>
                {tossWinner && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Elected to?</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setTossDecision("bat")}
                        className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                          tossDecision === "bat" ? "bg-amber-500 border-amber-400 text-white" : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        Bat First
                      </button>
                      <button
                        type="button"
                        onClick={() => setTossDecision("bowl")}
                        className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                          tossDecision === "bowl" ? "bg-amber-500 border-amber-400 text-white" : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        Bowl First
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Last Man Standing Toggle */}
              <div 
                onClick={() => setSingleMan(!singleMan)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                  singleMan 
                    ? "bg-emerald-500/10 border-emerald-500/30" 
                    : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                    singleMan ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-500"
                  }`}>
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${singleMan ? "text-emerald-400" : "text-slate-300"}`}>
                      Last Man Standing
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {singleMan 
                        ? "Enabled: Last player bats alone." 
                        : "Disabled: Standard rules."}
                    </p>
                  </div>
                </div>
                <div className={`w-12 h-6 rounded-full relative transition-colors ${
                  singleMan ? "bg-emerald-600" : "bg-slate-700"
                }`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                    singleMan ? "left-7" : "left-1"
                  }`} />
                </div>
              </div>

              {/* Single Man Mode Toggle */}
              <div 
                onClick={() => setSingleManMode(!singleManMode)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                  singleManMode 
                    ? "bg-amber-500/10 border-amber-500/30" 
                    : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                    singleManMode ? "bg-amber-500 text-white" : "bg-slate-800 text-slate-500"
                  }`}>
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${singleManMode ? "text-amber-400" : "text-slate-300"}`}>
                      Single Man Mode
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {singleManMode 
                        ? "Every player bats alone (No non-striker)." 
                        : "Standard pairs batting."}
                    </p>
                  </div>
                </div>
                <div className={`w-12 h-6 rounded-full relative transition-colors ${
                  singleManMode ? "bg-amber-600" : "bg-slate-700"
                }`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                    singleManMode ? "left-7" : "left-1"
                  }`} />
                </div>
              </div>
            </div>
          </section>

          {/* Common Players Section */}
          <section className="p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 glass-card space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <ArrowLeftRight className="w-4 h-4 text-amber-400" />
              </div>
              Common Players
              <span className="text-xs text-amber-400/80 font-normal ml-2">(plays for both teams)</span>
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Mark players who will play in <span className="text-amber-400 font-semibold">both teams</span>. 
              Common players are auto-added to both lineups. Other players can only be in one team at a time.
            </p>
            <div className="flex flex-wrap gap-2">
              {players.map((p) => {
                const isCommon = commonPlayers.includes(p.id);
                return (
                  <motion.button
                    key={p.id}
                    type="button"
                    onClick={() => toggleCommonPlayer(p.id)}
                    whileTap={{ scale: 0.95 }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                      isCommon
                        ? "bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-md shadow-amber-500/10"
                        : "bg-slate-900/30 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                    }`}
                  >
                    {isCommon ? (
                      <Unlock className="w-3.5 h-3.5" />
                    ) : (
                      <Lock className="w-3.5 h-3.5" />
                    )}
                    {p.name}
                    {isCommon && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                        Both
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
            {commonPlayers.length > 0 && (
              <div className="text-xs text-amber-400/70 mt-1">
                ⚡ {commonPlayers.length} common player{commonPlayers.length !== 1 ? "s" : ""} will appear in both lineups
              </div>
            )}
          </section>

          {/* Lineup Selection Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Team A Roster Selection */}
            <section className="p-6 rounded-2xl border border-slate-900 glass-card space-y-4 shadow-xl">
              <h3 className="text-base font-bold text-white flex items-center justify-between">
                <span>Select {teamAName} Lineup</span>
                <span className="text-xs text-emerald-400 font-bold">{teamAPlayers.length} Selected</span>
              </h3>
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {players.map((p) => {
                  const isSelected = teamAPlayers.includes(p.id);
                  const isCommon = commonPlayers.includes(p.id);
                  const isDisabled = isDisabledForTeam("A", p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => !isDisabled && handleTogglePlayer("A", p.id)}
                      disabled={isDisabled}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left ${
                        isDisabled
                          ? "bg-slate-900/10 border-slate-800/50 text-slate-600 cursor-not-allowed opacity-40"
                          : isSelected
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : "bg-slate-900/30 border-slate-800 text-slate-300 hover:border-slate-700 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{p.name}</span>
                        {isCommon && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                            Common
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isDisabled && (
                          <span className="text-[9px] text-rose-400/60 uppercase tracking-wider font-bold">
                            In {teamBName}
                          </span>
                        )}
                        {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Team B Roster Selection */}
            <section className="p-6 rounded-2xl border border-slate-900 glass-card space-y-4 shadow-xl">
              <h3 className="text-base font-bold text-white flex items-center justify-between">
                <span>Select {teamBName} Lineup</span>
                <span className="text-xs text-indigo-400 font-bold">{teamBPlayers.length} Selected</span>
              </h3>
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {players.map((p) => {
                  const isSelected = teamBPlayers.includes(p.id);
                  const isCommon = commonPlayers.includes(p.id);
                  const isDisabled = isDisabledForTeam("B", p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => !isDisabled && handleTogglePlayer("B", p.id)}
                      disabled={isDisabled}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left ${
                        isDisabled
                          ? "bg-slate-900/10 border-slate-800/50 text-slate-600 cursor-not-allowed opacity-40"
                          : isSelected
                          ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                          : "bg-slate-900/30 border-slate-800 text-slate-300 hover:border-slate-700 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{p.name}</span>
                        {isCommon && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                            Common
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isDisabled && (
                          <span className="text-[9px] text-rose-400/60 uppercase tracking-wider font-bold">
                            In {teamAName}
                          </span>
                        )}
                        {isSelected && <Check className="w-4 h-4 text-indigo-400" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <button
            type="submit"
            className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm uppercase tracking-wider cursor-pointer shadow-xl shadow-emerald-600/15 hover:shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
          >
            <Sparkles className="w-5 h-5 animate-pulse" />
            Start Match Scoring
          </button>
        </form>
      )}
    </div>
  );
}
