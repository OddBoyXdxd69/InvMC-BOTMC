"use client";

import { useEffect, useState } from "react";
import { Users, Plus, Target, Award, Sparkles, TrendingUp, Search, ArrowUpDown, Filter, Edit, Trash2, X, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Player {
  id: number;
  name: string;
  role: "batsman" | "bowler" | "all_rounder";
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
  thirties?: number;
  fifties?: number;
  hatricks?: number;
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(true);
  
  // Search, Filter and Sort
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "batsman" | "bowler" | "all_rounder">("all");
  const [sortBy, setSortBy] = useState<"name" | "runs" | "wickets" | "matches" | "economy" | "strike_rate">("name");

  // Admin States
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPasscode, setAdminPasscode] = useState("");
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editName, setEditName] = useState("");
  const [deletingPlayer, setDeletingPlayer] = useState<Player | null>(null);

  useEffect(() => {
    fetchPlayers();
    setIsAdmin(localStorage.getItem("isAdmin") === "true");
    setAdminPasscode(localStorage.getItem("adminPasscode") || "");
  }, []);

  const fetchPlayers = () => {
    fetch("/api/players")
      .then((res) => res.json())
      .then((data) => {
        setPlayers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch players:", err);
        setLoading(false);
      });
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), role: "all_rounder" }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: `Player ${name} added successfully!` });
        setName("");
        fetchPlayers();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to add player." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Something went wrong." });
    }

    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  const handleEditPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer || !editName.trim()) return;

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit_player",
          passcode: adminPasscode,
          id: editingPlayer.id,
          name: editName.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Player renamed successfully!" });
        setEditingPlayer(null);
        fetchPlayers();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to rename player." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Rename failed." });
    }
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  const handleDeletePlayer = async () => {
    if (!deletingPlayer) return;

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_player",
          passcode: adminPasscode,
          id: deletingPlayer.id
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Player deleted successfully!" });
        setDeletingPlayer(null);
        fetchPlayers();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to delete player." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Delete failed." });
    }
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  const getOvers = (balls: number) => {
    const overs = Math.floor(balls / 6);
    const remainingBalls = balls % 6;
    return `${overs}.${remainingBalls}`;
  };

  // Filter and sort players
  const processedPlayers = players
    .filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesRole = filterRole === "all" || p.role === filterRole;
      return matchesSearch && matchesRole;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "runs") return b.runs_scored - a.runs_scored;
      if (sortBy === "wickets") return b.wickets_taken - a.wickets_taken;
      if (sortBy === "matches") return b.matches_played - a.matches_played;
      if (sortBy === "economy") {
        const econA = a.balls_bowled > 0 ? (a.runs_conceded * 6) / a.balls_bowled : 999;
        const econB = b.balls_bowled > 0 ? (b.runs_conceded * 6) / b.balls_bowled : 999;
        return econA - econB; // Lower economy is better
      }
      if (sortBy === "strike_rate") {
        const srA = a.balls_faced > 0 ? (a.runs_scored / a.balls_faced) * 100 : 0;
        const srB = b.balls_faced > 0 ? (b.runs_scored / b.balls_faced) * 100 : 0;
        return srB - srA; // Higher strike rate is better
      }
      return 0;
    });

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Player Squad</h1>
            <p className="text-slate-400 text-sm font-light mt-1">Manage team profiles and track aggregate career statistics.</p>
          </div>
        </div>
      </div>

      {message.text && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl text-sm font-medium border ${
            message.type === "success" 
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
          }`}
        >
          {message.text}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Add Player Form */}
        <section className="p-6 rounded-2xl border border-slate-900 glass-card space-y-4 shadow-xl lg:sticky lg:top-24">
          <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Plus className="w-4 h-4 text-emerald-400" />
            </div>
            Add New Player
          </h2>
          <form onSubmit={handleAddPlayer} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Display Name</label>
              <input
                type="text"
                placeholder="e.g. MS Dhoni"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="flex h-12 w-full rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/25 transition-all duration-300"
              />
              <p className="text-[10px] text-slate-500 italic mt-1.5 leading-normal">
                💡 Player creation is quick! All players start with an all-rounder base profile.
              </p>
            </div>
            <button 
              type="submit" 
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm cursor-pointer shadow-lg shadow-emerald-600/15 hover:shadow-emerald-600/25 transition-all active:scale-[0.98]"
            >
              Add Player
            </button>
          </form>
        </section>

        {/* Players Directory List */}
        <div className="lg:col-span-2 space-y-6">
          {/* Controls Panel */}
          <section className="p-4 rounded-2xl border border-slate-900/60 bg-slate-950/40 backdrop-blur-sm grid grid-cols-1 md:grid-cols-12 gap-4 items-center shadow-lg">
            {/* Search */}
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search players..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-900 bg-slate-900/25 text-xs text-slate-200 placeholder:text-slate-500 focus-visible:outline-none focus:border-emerald-500/50 transition-all duration-200"
              />
            </div>

            {/* Filter by Role */}
            <div className="md:col-span-4 flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as any)}
                className="w-full h-10 px-3 rounded-xl border border-slate-900 bg-slate-900/25 text-xs text-slate-300 focus-visible:outline-none focus:border-emerald-500/50 transition-all duration-200 cursor-pointer"
              >
                <option value="all">All Roles</option>
                <option value="all_rounder">All-Rounder</option>
                <option value="batsman">Batsman</option>
                <option value="bowler">Bowler</option>
              </select>
            </div>

            {/* Sort by */}
            <div className="md:col-span-3 flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full h-10 px-3 rounded-xl border border-slate-900 bg-slate-900/25 text-xs text-slate-300 focus-visible:outline-none focus:border-emerald-500/50 transition-all duration-200 cursor-pointer"
              >
                <option value="name">Sort: Name</option>
                <option value="runs">Sort: Runs</option>
                <option value="wickets">Sort: Wickets</option>
                <option value="matches">Sort: Matches</option>
                <option value="strike_rate">Sort: Strike Rate</option>
                <option value="economy">Sort: Economy</option>
              </select>
            </div>
          </section>

          <section className="p-6 rounded-2xl border border-slate-900 glass-card shadow-xl">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              Registered Squad ({processedPlayers.length})
            </h2>

            {loading ? (
              <div className="py-20 text-center">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-500 text-sm italic">Loading players...</p>
              </div>
            ) : processedPlayers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {processedPlayers.map((p, i) => {
                  const strikeRate = p.balls_faced > 0 ? ((p.runs_scored / p.balls_faced) * 100).toFixed(1) : "0.0";
                  const economy = p.balls_bowled > 0 ? ((p.runs_conceded * 6) / p.balls_bowled).toFixed(2) : "0.00";
                  
                  // Role specific styling
                  const roleColors = {
                    all_rounder: "border-emerald-500/20 text-emerald-400 bg-emerald-500/5",
                    batsman: "border-indigo-500/20 text-indigo-400 bg-indigo-500/5",
                    bowler: "border-sky-500/20 text-sky-400 bg-sky-500/5",
                  };

                  const roleLabel = p.role === "all_rounder" ? "All-Rounder" : p.role === "batsman" ? "Batsman" : "Bowler";
                  
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.3 }}
                      className={`p-5 rounded-xl border bg-slate-900/10 flex flex-col justify-between transition-all duration-300 group ${
                        p.role === "all_rounder" ? "hover:shadow-emerald-950/10 border-slate-900 hover:border-emerald-500/30" : 
                        p.role === "batsman" ? "hover:shadow-indigo-950/10 border-slate-900 hover:border-indigo-500/30" : 
                        "hover:shadow-sky-950/10 border-slate-900 hover:border-sky-500/30"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className={`font-black text-white text-base leading-tight transition-colors ${
                              p.role === "all_rounder" ? "group-hover:text-emerald-400" :
                              p.role === "batsman" ? "group-hover:text-indigo-400" :
                              "group-hover:text-sky-400"
                            }`}>{p.name}</h4>
                            <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1.5 ${roleColors[p.role]}`}>
                              {roleLabel}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {isAdmin && (
                              <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity mr-1">
                                <button
                                  onClick={() => {
                                    setEditingPlayer(p);
                                    setEditName(p.name);
                                  }}
                                  className="p-1 rounded bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                                  title="Edit Name"
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setDeletingPlayer(p)}
                                  className="p-1 rounded bg-slate-950 hover:bg-rose-950/30 border border-slate-800 text-slate-400 hover:text-rose-400"
                                  title="Delete Player"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                            <div className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-900/80 text-[10px] text-slate-400 font-extrabold shadow-sm">
                              {p.matches_played} {p.matches_played === 1 ? 'Match' : 'Matches'}
                            </div>
                          </div>
                        </div>

                        {/* Career Stats Section */}
                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-900/60 mt-2">
                          {/* Batting Stats */}
                          <div className="space-y-1.5">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                              <Award className="w-3.5 h-3.5 text-amber-500" /> Batting
                            </p>
                            <p className="text-xs font-bold text-slate-200">{p.runs_scored} Runs</p>
                            <p className="text-[10px] text-slate-400 font-medium">SR: {strikeRate}</p>
                            <p className="text-[10px] text-slate-400 font-medium">HS: {p.highest_score || "0"}</p>
                            <p className="text-[10px] text-slate-400 font-medium">30s/50s: {p.thirties || 0}/{p.fifties || 0}</p>
                            <p className="text-[9px] text-slate-500 font-light">
                              {p.fours}x4 / {p.sixes}x6
                            </p>
                          </div>
                          
                          {/* Bowling Stats */}
                          <div className="space-y-1.5">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                              <Target className="w-3.5 h-3.5 text-blue-500" /> Bowling
                            </p>
                            <p className="text-xs font-bold text-slate-200">{p.wickets_taken} Wkts</p>
                            <p className="text-[10px] text-slate-400 font-medium">Econ: {economy}</p>
                            <p className="text-[10px] text-slate-400 font-medium">BBI: {p.best_bowling || "0/0"}</p>
                            <p className="text-[10px] text-slate-400 font-medium">HT: {p.hatricks || 0}</p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              Overs: {getOvers(p.balls_bowled)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="py-20 text-center text-slate-500 italic text-sm font-light">
                {search || filterRole !== "all" 
                  ? "No players match the search/filter criteria." 
                  : "No players added to the squad yet. Add players on the left to start!"}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Edit Player Modal */}
      <AnimatePresence>
        {editingPlayer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-2xl border border-slate-900 bg-slate-950 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit className="w-4 h-4 text-emerald-400" /> Rename Player
                </h3>
                <button
                  onClick={() => setEditingPlayer(null)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleEditPlayer} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Display Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="flex h-12 w-full rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm text-slate-100 focus-visible:outline-none focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/25 transition-all duration-300"
                  />
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingPlayer(null)}
                    className="h-10 px-4 rounded-xl border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Player Confirmation Modal */}
      <AnimatePresence>
        {deletingPlayer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-2xl border border-rose-950/20 bg-slate-950 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" /> Delete Player Profile
                </h3>
                <button
                  onClick={() => setDeletingPlayer(null)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2 text-sm text-slate-400 font-light leading-relaxed">
                <p>Are you sure you want to delete <span className="text-white font-bold">{deletingPlayer.name}</span>?</p>
                <p className="text-xs text-rose-400 font-medium">⚠️ This will permanently remove their profile and delete all of their matching statistics from previous matches. This action is irreversible.</p>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingPlayer(null)}
                  className="h-10 px-4 rounded-xl border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeletePlayer}
                  className="h-10 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                >
                  Delete Profile
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
