"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Trophy, 
  Play, 
  Plus, 
  Trash2, 
  Edit3, 
  Calendar, 
  X,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowLeftRight,
  Users
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Player {
  id: number;
  name: string;
  role: string;
}

interface Match {
  id: number;
  team_a_name: string;
  team_b_name: string;
  team_a_runs: number;
  team_a_wickets: number;
  team_a_balls: number;
  team_b_runs: number;
  team_b_wickets: number;
  team_b_balls: number;
  status: string;
  winner: string;
  date: string;
}

interface Series {
  id: number;
  name: string;
  team_a_name: string;
  team_b_name: string;
  team_a_player_ids: string; // JSON string
  team_b_player_ids: string; // JSON string
  common_player_ids?: string; // JSON string
  overs_limit: number;
  bowler_overs_limit: number;
  single_man?: number;
  single_man_mode: number;
  status: string;
  created_at: string;
  team_a_wins: number;
  team_b_wins: number;
}

export default function SeriesPage() {
  const router = useRouter();
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);
  const [expandedSeriesId, setExpandedSeriesId] = useState<number | null>(null);
  const [seriesMatches, setSeriesMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [teamAName, setTeamAName] = useState("Team A");
  const [teamBName, setTeamBName] = useState("Team B");
  const [overs, setOvers] = useState(5);
  const [bowlerLimit, setBowlerLimit] = useState(2);
  const [singleMan, setSingleMan] = useState(true);
  const [singleManMode, setSingleManMode] = useState(false);
  const [teamAPlayers, setTeamAPlayers] = useState<number[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<number[]>([]);
  const [commonPlayers, setCommonPlayers] = useState<number[]>([]);
  
  const loadInitialData = async () => {
    try {
      const [seriesRes, playersRes] = await Promise.all([
        fetch("/api/series"),
        fetch("/api/players")
      ]);
      const seriesData = await seriesRes.json();
      const playersData = await playersRes.json();

      setSeriesList(Array.isArray(seriesData) ? seriesData : []);
      setPlayers(Array.isArray(playersData) ? playersData : []);
    } catch (err) {
      console.error("Failed to load initial data", err);
      setError("Failed to load data from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleExpandSeries = async (id: number) => {
    if (expandedSeriesId === id) {
      setExpandedSeriesId(null);
      setSeriesMatches([]);
      return;
    }

    setExpandedSeriesId(id);
    setLoadingMatches(true);
    try {
      const res = await fetch(`/api/series?id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setSeriesMatches(data.matches || []);
      }
    } catch (err) {
      console.error("Failed to fetch series matches", err);
    } finally {
      setLoadingMatches(false);
    }
  };

  const openCreateModal = () => {
    setName("");
    setTeamAName("Team A");
    setTeamBName("Team B");
    setOvers(5);
    setBowlerLimit(2);
    setSingleMan(true);
    setSingleManMode(false);
    setTeamAPlayers([]);
    setTeamBPlayers([]);
    setCommonPlayers([]);
    setEditingSeries(null);
    setShowCreateModal(true);
  };

  const openEditModal = (series: Series) => {
    setEditingSeries(series);
    setName(series.name);
    setTeamAName(series.team_a_name);
    setTeamBName(series.team_b_name);
    setOvers(series.overs_limit);
    setBowlerLimit(series.bowler_overs_limit);
    setSingleMan(series.single_man !== 0);
    setSingleManMode(series.single_man_mode === 1);
    setTeamAPlayers(JSON.parse(series.team_a_player_ids || "[]"));
    setTeamBPlayers(JSON.parse(series.team_b_player_ids || "[]"));
    setCommonPlayers(JSON.parse(series.common_player_ids || "[]"));
    setShowCreateModal(true);
  };

  const togglePlayerSelection = (team: "A" | "B" | "Common", playerId: number) => {
    if (team === "Common") {
      setCommonPlayers(prev => {
        const isCurrentlyCommon = prev.includes(playerId);
        if (isCurrentlyCommon) {
          setTeamAPlayers(ta => ta.filter(id => id !== playerId));
          setTeamBPlayers(tb => tb.filter(id => id !== playerId));
          return prev.filter(id => id !== playerId);
        } else {
          setTeamAPlayers(ta => ta.includes(playerId) ? ta : [...ta, playerId]);
          setTeamBPlayers(tb => tb.includes(playerId) ? tb : [...tb, playerId]);
          return [...prev, playerId];
        }
      });
      return;
    }

    if (team === "A") {
      setTeamAPlayers(prev => {
        const isSelected = prev.includes(playerId);
        if (isSelected) {
          if (commonPlayers.includes(playerId)) {
            setCommonPlayers(c => c.filter(id => id !== playerId));
            setTeamBPlayers(tb => tb.filter(id => id !== playerId));
          }
          return prev.filter(id => id !== playerId);
        } else {
          if (teamBPlayers.includes(playerId) && !commonPlayers.includes(playerId)) return prev;
          return [...prev, playerId];
        }
      });
    } else {
      setTeamBPlayers(prev => {
        const isSelected = prev.includes(playerId);
        if (isSelected) {
          if (commonPlayers.includes(playerId)) {
            setCommonPlayers(c => c.filter(id => id !== playerId));
            setTeamAPlayers(ta => ta.filter(id => id !== playerId));
          }
          return prev.filter(id => id !== playerId);
        } else {
          if (teamAPlayers.includes(playerId) && !commonPlayers.includes(playerId)) return prev;
          return [...prev, playerId];
        }
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !teamAName.trim() || !teamBName.trim()) {
      setError("Please fill out all names.");
      return;
    }

    if (teamAPlayers.length === 0 || teamBPlayers.length === 0) {
      setError("Each team must have at least one player selected.");
      return;
    }

    const payload = {
      action: editingSeries ? "update" : "create",
      id: editingSeries?.id,
      name: name.trim(),
      team_a_name: teamAName.trim(),
      team_b_name: teamBName.trim(),
      team_a_player_ids: teamAPlayers,
      team_b_player_ids: teamBPlayers,
      common_player_ids: commonPlayers,
      overs_limit: Number(overs),
      bowler_overs_limit: Number(bowlerLimit),
      single_man: singleMan,
      single_man_mode: singleManMode ? 1 : 0,
      status: editingSeries ? editingSeries.status : "active"
    };

    try {
      const res = await fetch("/api/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowCreateModal(false);
        setEditingSeries(null);
        loadInitialData();
      } else {
        const data = await res.json();
        setError(data.error || "An error occurred.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to save series details.");
    }
  };

  const handleDeleteSeries = async (id: number) => {
    if (!confirm("Are you sure you want to delete this series? Matches will not be deleted, but they will no longer be grouped under this series.")) return;
    
    try {
      const res = await fetch("/api/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id })
      });

      if (res.ok) {
        if (expandedSeriesId === id) setExpandedSeriesId(null);
        loadInitialData();
      } else {
        alert("Failed to delete series.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting series.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center">
            <Calendar className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Cricket Series</h1>
            <p className="text-slate-400 text-sm font-light mt-1">Manage tournaments, set default squads, and launch matches.</p>
          </div>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-5 h-12 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-lg active:scale-95 transition-transform duration-75"
        >
          <Plus className="w-4 h-4" /> New Series
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-sm font-medium">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm italic">Loading series list...</p>
        </div>
      ) : seriesList.length === 0 ? (
        <div className="p-12 rounded-3xl border border-slate-900 glass-card text-center text-slate-400 space-y-4">
          <p className="text-sm font-light leading-relaxed">
            No series created yet. Start a tournament to track multi-match scores, save templates, and select squads.
          </p>
          <button 
            onClick={openCreateModal}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs cursor-pointer transition-all"
          >
            Create Your First Series
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {seriesList.map((series) => {
            const isExpanded = expandedSeriesId === series.id;
            return (
              <div 
                key={series.id}
                className={`rounded-3xl border transition-all duration-300 overflow-hidden ${
                  isExpanded ? "border-emerald-500/30 bg-slate-950/60 shadow-xl" : "border-slate-900 bg-slate-900/10 hover:border-slate-800"
                }`}
              >
                {/* Header Card Area */}
                <div 
                  onClick={() => handleExpandSeries(series.id)}
                  className="p-6 cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className={`h-2 w-2 rounded-full ${series.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        {series.status === 'active' ? 'Ongoing Series' : 'Completed'}
                      </span>
                    </div>
                    <h2 className="text-xl font-black text-white truncate leading-tight uppercase tracking-tight">
                      {series.name}
                    </h2>
                    <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                      Format: {series.overs_limit} Overs • {series.single_man_mode === 1 ? 'Last Man Standing' : 'Standard'}
                    </p>
                  </div>

                  {/* Standing score display */}
                  <div className="flex items-center gap-6 py-2.5 px-5 rounded-2xl bg-slate-950/60 border border-slate-900/80 shadow-inner">
                    <div className="text-center">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block">{series.team_a_name}</span>
                      <span className="text-2xl font-black text-white">{series.team_a_wins}</span>
                    </div>
                    <div className="h-6 w-[1px] bg-slate-800" />
                    <div className="text-center">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block">{series.team_b_name}</span>
                      <span className="text-2xl font-black text-white">{series.team_b_wins}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => router.push(`/matches/new?seriesId=${series.id}`)}
                      className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-transform"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" /> Start Match
                    </button>
                    <button 
                      onClick={() => openEditModal(series)}
                      className="h-10 w-10 rounded-xl border border-slate-800 bg-slate-900/40 text-slate-400 hover:text-slate-200 flex items-center justify-center hover:bg-slate-900 active:scale-95 transition-all"
                      title="Edit Series"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteSeries(series.id)}
                      className="h-10 w-10 rounded-xl border border-rose-950/40 bg-rose-950/10 text-rose-450 hover:text-rose-400 flex items-center justify-center hover:bg-rose-950/30 active:scale-95 transition-all"
                      title="Delete Series"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="ml-1 text-slate-500">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded matches list area */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-slate-900 bg-slate-950/40 p-6 space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-slate-900 pb-2.5">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Match History</h3>
                        <span className="text-[10px] text-slate-600 font-medium">Total Matches: {seriesMatches.length}</span>
                      </div>

                      {loadingMatches ? (
                        <div className="py-8 text-center">
                          <div className="w-6 h-6 border-2 border-emerald-500/40 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          <p className="text-slate-600 text-xs italic">Fetching matches...</p>
                        </div>
                      ) : seriesMatches.length === 0 ? (
                        <p className="text-slate-600 text-xs italic py-4 text-center">No matches recorded for this series yet.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {seriesMatches.map((match) => (
                            <div 
                              key={match.id}
                              onClick={() => router.push(match.status === 'live' ? `/matches/live/${match.id}` : `/matches/${match.id}`)}
                              className="p-4 rounded-2xl border border-slate-900 bg-slate-900/20 hover:border-slate-800 transition-all cursor-pointer flex justify-between items-center group"
                            >
                              <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{match.date}</p>
                                <div className="text-sm font-black text-white flex items-center gap-1.5">
                                  <span>{match.team_a_name}</span>
                                  <span className="text-xs font-light text-slate-600">v</span>
                                  <span>{match.team_b_name}</span>
                                </div>
                                <p className="text-[10px] font-bold text-emerald-450 uppercase group-hover:text-emerald-400 transition-colors">
                                  {match.status === 'live' ? (
                                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Scoring</span>
                                  ) : (
                                    `${match.winner} won`
                                  )}
                                </p>
                              </div>
                              <div className="text-right space-y-1 font-mono">
                                <p className="text-xs font-black text-slate-200">{match.team_a_runs}/{match.team_a_wickets}</p>
                                <p className="text-xs font-black text-slate-400">{match.team_b_runs}/{match.team_b_wickets}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE & EDIT MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-3xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-3xl overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 p-6 md:p-8 shadow-2xl flex flex-col justify-between"
            >
              <div>
                {/* Modal Header */}
                <div className="flex justify-between items-center border-b border-slate-850 pb-4 mb-6">
                  <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-emerald-400" />
                    {editingSeries ? "Edit Series" : "Create Series"}
                  </h2>
                  <button 
                    onClick={() => setShowCreateModal(false)}
                    className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-200 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Series Name</label>
                      <input 
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Ashes Cup"
                        required
                        className="flex h-12 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/25 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Team A Name</label>
                      <input 
                        type="text"
                        value={teamAName}
                        onChange={(e) => setTeamAName(e.target.value)}
                        placeholder="Team A"
                        required
                        className="flex h-12 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/25 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Team B Name</label>
                      <input 
                        type="text"
                        value={teamBName}
                        onChange={(e) => setTeamBName(e.target.value)}
                        placeholder="Team B"
                        required
                        className="flex h-12 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/25 transition-all"
                      />
                    </div>
                  </div>

                  {/* Format Settings */}
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-2xl bg-slate-950/40 border border-slate-850">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Overs Limit</label>
                        <select 
                          value={overs}
                          onChange={(e) => setOvers(Number(e.target.value))}
                          className="flex h-12 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map(o => (
                            <option key={o} value={o}>{o} Overs</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Bowler Limit</label>
                        <select 
                          value={bowlerLimit}
                          onChange={(e) => setBowlerLimit(Number(e.target.value))}
                          className="flex h-12 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                        >
                          {[1, 2, 3, 4, 5, 10].map(o => (
                            <option key={o} value={o}>{o} Overs max</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Sliding Toggles */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Last Man Standing Toggle */}
                      <div 
                        onClick={() => setSingleMan(!singleMan)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                          singleMan 
                            ? "bg-emerald-500/10 border-emerald-500/30" 
                            : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
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
                              {singleMan ? "Enabled: Last bats alone." : "Disabled: Standard rules."}
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
                            : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
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
                              {singleManMode ? "Every player bats alone." : "Standard pairs batting."}
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
                  </div>

                  {/* Squad Selections */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-850 pb-2">
                      Squad Select
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Team A Squad */}
                      <div className="space-y-3 p-4 rounded-2xl border border-slate-850 bg-slate-950/20">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black text-emerald-455 uppercase">{teamAName} Squad</span>
                          <span className="text-[10px] text-slate-500 font-semibold">{teamAPlayers.length} selected</span>
                        </div>
                        <div className="h-52 overflow-y-auto scrollbar-thin border border-slate-850 rounded-xl divide-y divide-slate-850 bg-slate-950/40 p-2">
                          {players.map(p => {
                            const isSelected = teamAPlayers.includes(p.id);
                            const disabled = teamBPlayers.includes(p.id) && !commonPlayers.includes(p.id);
                            return (
                              <div 
                                key={p.id}
                                onClick={() => !disabled && togglePlayerSelection("A", p.id)}
                                className={`flex justify-between items-center p-2 rounded-lg cursor-pointer ${
                                  isSelected ? "bg-emerald-500/10 text-emerald-450" : disabled ? "opacity-30 cursor-not-allowed" : "text-slate-300 hover:bg-slate-900"
                                }`}
                              >
                                <span className="text-xs font-semibold">{p.name} <span className="text-[9px] text-slate-500 font-light uppercase">({p.role.replace('_', ' ')})</span></span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Team B Squad */}
                      <div className="space-y-3 p-4 rounded-2xl border border-slate-850 bg-slate-950/20">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black text-indigo-400 uppercase">{teamBName} Squad</span>
                          <span className="text-[10px] text-slate-500 font-semibold">{teamBPlayers.length} selected</span>
                        </div>
                        <div className="h-52 overflow-y-auto scrollbar-thin border border-slate-850 rounded-xl divide-y divide-slate-850 bg-slate-950/40 p-2">
                          {players.map(p => {
                            const isSelected = teamBPlayers.includes(p.id);
                            const disabled = teamAPlayers.includes(p.id) && !commonPlayers.includes(p.id);
                            return (
                              <div 
                                key={p.id}
                                onClick={() => !disabled && togglePlayerSelection("B", p.id)}
                                className={`flex justify-between items-center p-2 rounded-lg cursor-pointer ${
                                  isSelected ? "bg-indigo-500/10 text-indigo-400" : disabled ? "opacity-30 cursor-not-allowed" : "text-slate-300 hover:bg-slate-900"
                                }`}
                              >
                                <span className="text-xs font-semibold">{p.name} <span className="text-[9px] text-slate-500 font-light uppercase">({p.role.replace('_', ' ')})</span></span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Common Players Squad */}
                      <div className="space-y-3 p-4 rounded-2xl border border-slate-850 bg-slate-950/20">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black text-amber-550 uppercase">Common Players</span>
                          <span className="text-[10px] text-slate-500 font-semibold">{commonPlayers.length} selected</span>
                        </div>
                        <div className="h-52 overflow-y-auto scrollbar-thin border border-slate-850 rounded-xl divide-y divide-slate-850 bg-slate-950/40 p-2">
                          {players.map(p => {
                            const isSelected = commonPlayers.includes(p.id);
                            return (
                              <div 
                                key={p.id}
                                onClick={() => togglePlayerSelection("Common", p.id)}
                                className={`flex justify-between items-center p-2 rounded-lg cursor-pointer ${
                                  isSelected ? "bg-amber-500/10 text-amber-500" : "text-slate-300 hover:bg-slate-900"
                                }`}
                              >
                                <span className="text-xs font-semibold">{p.name} <span className="text-[9px] text-slate-500 font-light uppercase">({p.role.replace('_', ' ')})</span></span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-amber-500" />}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-850">
                    <button 
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-5 h-11 border border-slate-800 rounded-xl bg-slate-900 text-slate-400 hover:text-slate-200 text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="px-6 h-11 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg active:scale-95 transition-transform"
                    >
                      {editingSeries ? "Save Changes" : "Create Series"}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
