"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Users, Save, ArrowLeft, Plus } from "lucide-react";
import { motion } from "framer-motion";

interface Player {
  id: number;
  name: string;
  role: string;
}

interface MatchLineup {
  teamAName: string;
  teamBName: string;
  teamAPlayerIds: number[];
  teamBPlayerIds: number[];
  oversLimit: number;
}

export default function EditRunningMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const matchId = resolvedParams.id;

  const [players, setPlayers] = useState<Player[]>([]);
  const [teamAName, setTeamAName] = useState("");
  const [teamBName, setTeamBName] = useState("");
  const [overs, setOvers] = useState(5);
  const [teamAPlayers, setTeamAPlayers] = useState<number[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [playerMessage, setPlayerMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // 1. Fetch player directory
    fetchPlayers();
  }, []);

  const fetchPlayers = (selectNewPlayerIdForTeam?: "A" | "B") => {
    fetch("/api/players")
      .then((res) => res.json())
      .then((data) => {
        setPlayers(Array.isArray(data) ? data : []);
        
        // 2. Load lineup from localStorage
        const cached = localStorage.getItem(`match_lineup_${matchId}`);
        if (cached) {
          const parsed = JSON.parse(cached) as MatchLineup;
          setTeamAName(parsed.teamAName);
          setTeamBName(parsed.teamBName);
          setOvers(parsed.oversLimit);
          setTeamAPlayers(parsed.teamAPlayerIds);
          setTeamBPlayers(parsed.teamBPlayerIds);
        } else {
          setError("Match lineup configurations not found.");
        }
        
        if (selectNewPlayerIdForTeam && Array.isArray(data)) {
          // If we just added a late player, find their ID and append them to the roster selection
          const latestPlayer = data[data.length - 1]; // Sorted by name but we can find the exact match or max ID
          const sortedById = [...data].sort((a, b) => b.id - a.id);
          const newlyCreated = sortedById[0];
          if (newlyCreated) {
            if (selectNewPlayerIdForTeam === "A") {
              setTeamAPlayers((prev) => [...prev, newlyCreated.id]);
            } else {
              setTeamBPlayers((prev) => [...prev, newlyCreated.id]);
            }
          }
        }
        
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load players:", err);
        setLoading(false);
      });
  };

  const handleTogglePlayer = (team: "A" | "B", playerId: number) => {
    if (team === "A") {
      setTeamAPlayers((prev) =>
        prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
      );
    } else {
      setTeamBPlayers((prev) =>
        prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
      );
    }
  };

  const handleAddLatePlayer = async (team: "A" | "B") => {
    if (!newPlayerName.trim()) return;
    setPlayerMessage("");

    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPlayerName.trim(), role: "all_rounder" }),
      });
      const data = await res.json();

      if (res.ok) {
        setNewPlayerName("");
        setPlayerMessage(`Player ${newPlayerName} added and placed in Team ${team}!`);
        // Refresh players and automatically place the new player in the team roster
        fetchPlayers(team);
        setTimeout(() => setPlayerMessage(""), 3000);
      } else {
        alert(data.error || "Failed to add late player.");
      }
    } catch (err) {
      alert("Error adding player.");
    }
  };

  const handleSaveLineup = (e: React.FormEvent) => {
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

    const lineupData: MatchLineup = {
      teamAName: teamAName.trim(),
      teamBName: teamBName.trim(),
      teamAPlayerIds: teamAPlayers,
      teamBPlayerIds: teamBPlayers,
      oversLimit: Number(overs)
    };

    localStorage.setItem(`match_lineup_${matchId}`, JSON.stringify(lineupData));
    
    // Alert the live scorer component of lineup change (if it is open, or it will sync on mount)
    // We can also trigger a state check
    router.push(`/matches/live/${matchId}`);
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 text-sm italic">Loading rosters...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/matches/live/${matchId}`)}
            className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Edit Match Setup</h1>
            <p className="text-slate-400 text-sm font-light mt-1">Modify team details and rosters during the active match.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-sm font-medium">
          {error}
        </div>
      )}

      {playerMessage && (
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-sm font-medium">
          {playerMessage}
        </div>
      )}

      <form onSubmit={handleSaveLineup} className="space-y-8">
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
                {[3, 4, 5, 6, 7, 10, 12, 15, 20].map((ov) => (
                  <option key={ov} value={ov}>
                    {ov} Overs
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Quick Add Late Player Panel */}
        <section className="p-4 rounded-2xl border border-slate-900 bg-slate-950/40 backdrop-blur-sm flex flex-col md:flex-row gap-4 items-center justify-between shadow-md">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="text-sm font-bold text-slate-200">Register Late Friend</h3>
            <p className="text-[11px] text-slate-500 font-light">Register a friend who arrived late, and directly put them in a team lineup.</p>
          </div>
          <div className="flex w-full md:w-auto gap-2">
            <input
              type="text"
              placeholder="Friend's Name"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              className="flex-1 md:w-48 h-10 rounded-xl border border-slate-800 bg-slate-900/40 px-3 text-xs text-slate-100 placeholder:text-slate-600 focus-visible:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => handleAddLatePlayer("A")}
              className="h-10 px-3 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 hover:border-emerald-500/50 text-[10px] font-bold uppercase transition-all flex items-center gap-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Team A
            </button>
            <button
              type="button"
              onClick={() => handleAddLatePlayer("B")}
              className="h-10 px-3 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/30 hover:border-indigo-500/50 text-[10px] font-bold uppercase transition-all flex items-center gap-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Team B
            </button>
          </div>
        </section>

        {/* Lineup Selection Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Team A Roster Selection */}
          <section className="p-6 rounded-2xl border border-slate-900 glass-card space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-white flex items-center justify-between">
              <span>Select {teamAName || "Team A"} Lineup</span>
              <span className="text-xs text-emerald-400 font-bold">{teamAPlayers.length} Selected</span>
            </h3>
            <p className="text-[10px] text-slate-500 italic mt-0.5 leading-normal">
              💡 Gully Cricket: Check common players in BOTH teams to let them play for both sides.
            </p>
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {players.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleTogglePlayer("A", p.id)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left ${
                    teamAPlayers.includes(p.id)
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-slate-900/30 border-slate-800 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <span className="text-sm font-semibold">{p.name}</span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest">
                    {p.role === "all_rounder" ? "All-Rounder" : p.role === "batsman" ? "Batsman" : "Bowler"}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Team B Roster Selection */}
          <section className="p-6 rounded-2xl border border-slate-900 glass-card space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-white flex items-center justify-between">
              <span>Select {teamBName || "Team B"} Lineup</span>
              <span className="text-xs text-indigo-400 font-bold">{teamBPlayers.length} Selected</span>
            </h3>
            <p className="text-[10px] text-slate-500 italic mt-0.5 leading-normal">
              💡 Gully Cricket: Check common players in BOTH teams to let them play for both sides.
            </p>
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {players.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleTogglePlayer("B", p.id)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left ${
                    teamBPlayers.includes(p.id)
                      ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                      : "bg-slate-900/30 border-slate-800 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <span className="text-sm font-semibold">{p.name}</span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest">
                    {p.role === "all_rounder" ? "All-Rounder" : p.role === "batsman" ? "Batsman" : "Bowler"}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <button
          type="submit"
          className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm uppercase tracking-wider cursor-pointer shadow-xl shadow-emerald-600/15 hover:shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
        >
          <Save className="w-5 h-5" />
          Save Lineups & Resume Match
        </button>
      </form>
    </div>
  );
}
