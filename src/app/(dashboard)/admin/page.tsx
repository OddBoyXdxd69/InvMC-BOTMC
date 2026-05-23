"use client";

import { useEffect, useState } from "react";
import { Lock, Trash2, Edit, AlertTriangle, KeyRound, CheckCircle, RefreshCw, Users, Calendar } from "lucide-react";
import { motion } from "framer-motion";

interface Player {
  id: number;
  name: string;
}

interface Match {
  id: number;
  team_a_name: string;
  team_b_name: string;
  date: string;
  status: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [editingPlayerId, setEditingPlayerId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmResetText, setConfirmResetText] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    const adminSession = localStorage.getItem("isAdmin") === "true";
    setIsAuthorized(adminSession);
    if (adminSession) {
      fetchPlayers();
      fetchMatches();
    }
  }, []);

  const fetchPlayers = () => {
    fetch("/api/players")
      .then((res) => res.json())
      .then((data) => {
        setPlayers(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error("Error fetching players:", err));
  };

  const fetchMatches = () => {
    fetch("/api/matches")
      .then((res) => res.json())
      .then((data) => {
        setMatches(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error("Error fetching matches:", err));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", passcode }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("isAdmin", "true");
        localStorage.setItem("adminPasscode", passcode);
        setIsAuthorized(true);
        fetchPlayers();
        fetchMatches();
      } else {
        setError(data.error || "Login failed.");
      }
    } catch (err) {
      setError("Something went wrong. Please check your connection.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("adminPasscode");
    setIsAuthorized(false);
    setPasscode("");
  };

  const handleRenamePlayer = async (id: number) => {
    if (!editName.trim()) return;
    const adminPass = localStorage.getItem("adminPasscode") || "";

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit_player",
          passcode: adminPass,
          id,
          name: editName.trim()
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: "Player renamed successfully!" });
        setEditingPlayerId(null);
        setEditName("");
        fetchPlayers();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to rename player." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Rename request failed." });
    }

    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  const handleDeletePlayer = async (id: number, name: string) => {
    if (!confirm(`Are you absolutely sure you want to delete ${name}? This will delete all of their match records as well.`)) return;
    const adminPass = localStorage.getItem("adminPasscode") || "";

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_player",
          passcode: adminPass,
          id
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: "Player deleted successfully!" });
        fetchPlayers();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to delete player." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Delete request failed." });
    }

    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  const handleDeleteMatch = async (id: number, teams: string) => {
    if (!confirm(`Are you sure you want to delete the match: ${teams}? This will delete all stats associated with it.`)) return;
    const adminPass = localStorage.getItem("adminPasscode") || "";

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_match",
          passcode: adminPass,
          id
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: "Match deleted successfully!" });
        fetchMatches();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to delete match." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Delete request failed." });
    }

    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  const handleResetDatabase = async () => {
    if (confirmResetText !== "RESET") {
      alert("Please type 'RESET' to confirm.");
      return;
    }

    const adminPass = localStorage.getItem("adminPasscode") || "";

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_db",
          passcode: adminPass
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Database cleared completely! Restarting...");
        localStorage.removeItem("isAdmin");
        localStorage.removeItem("adminPasscode");
        window.location.href = "/";
      } else {
        alert(data.error || "Failed to reset database.");
      }
    } catch (err) {
      alert("Error resetting database.");
    }
  };

  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl border border-slate-900 glass-card space-y-6 shadow-2xl"
        >
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6 text-indigo-400 animate-pulse" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Admin Portal</h1>
            <p className="text-slate-400 text-xs font-light">Access restricted controls to manage players and reset stats.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Enter Admin Passcode</label>
              <input
                type="password"
                placeholder="••••"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                required
                className="flex h-12 w-full rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus-visible:outline-none focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/25 transition-all text-center tracking-[0.3em] font-mono"
              />
            </div>

            {error && (
              <p className="text-rose-400 text-xs font-medium text-center">{error}</p>
            )}

            <button 
              type="submit" 
              className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm cursor-pointer shadow-lg shadow-indigo-600/15 transition-all active:scale-[0.98]"
            >
              Authorize Access
            </button>
          </form>
        </motion.section>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center">
            <Lock className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Admin Controls</h1>
            <p className="text-slate-400 text-sm font-light mt-1">Delete or rename players and reset match aggregates.</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="h-10 px-4 rounded-xl border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white font-semibold text-xs cursor-pointer transition-all self-start sm:self-center"
        >
          Logout Admin
        </button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl text-sm font-medium border ${
          message.type === "success" 
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* Reset DB Card */}
        <section className="p-6 rounded-2xl border border-rose-950/20 bg-slate-950/40 backdrop-blur-md space-y-4 shadow-xl">
          <h2 className="text-lg font-bold text-rose-400 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-500 animate-bounce" /> Database Maintenance
          </h2>
          <p className="text-slate-400 text-xs font-light leading-relaxed">
            Resetting the database clears all matches, delete all players, and resets the aggregate statistics tables. This cannot be undone.
          </p>

          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full h-11 rounded-xl bg-rose-950/30 hover:bg-rose-950/50 border border-rose-900/40 text-rose-400 font-semibold text-xs cursor-pointer transition-all active:scale-[0.98]"
            >
              Reset Database...
            </button>
          ) : (
            <div className="space-y-3 pt-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block">Type "RESET" to confirm</label>
              <input
                type="text"
                placeholder="RESET"
                value={confirmResetText}
                onChange={(e) => setConfirmResetText(e.target.value)}
                className="w-full h-10 rounded-lg border border-rose-900/40 bg-slate-900/40 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-700 font-mono text-center tracking-widest focus-visible:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowResetConfirm(false);
                    setConfirmResetText("");
                  }}
                  className="flex-1 h-9 rounded-lg border border-slate-800 text-slate-400 hover:text-white text-[10px] font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetDatabase}
                  className="flex-1 h-9 rounded-lg bg-rose-700 hover:bg-rose-600 text-white text-[10px] font-bold"
                >
                  Confirm Reset
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Players List with Actions */}
        <section className="p-6 rounded-2xl border border-slate-900 glass-card shadow-xl md:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" /> Roster Management ({players.length})
          </h2>

          <div className="border border-slate-900/60 rounded-xl overflow-hidden divide-y divide-slate-900/60 bg-slate-950/20 max-h-[500px] overflow-y-auto pr-1">
            {players.length > 0 ? (
              players.map((p) => (
                <div key={p.id} className="flex justify-between items-center p-3.5 hover:bg-slate-900/10 transition-colors">
                  {editingPlayerId === p.id ? (
                    <div className="flex-1 flex gap-2 items-center">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 h-9 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus-visible:outline-none focus:border-indigo-500"
                        placeholder="New Name"
                      />
                      <button
                        onClick={() => handleRenamePlayer(p.id)}
                        className="px-3 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold transition-all"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingPlayerId(null);
                          setEditName("");
                        }}
                        className="px-3 h-9 rounded-lg border border-slate-800 text-slate-400 hover:text-white text-[10px] font-bold transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-semibold text-slate-200">{p.name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingPlayerId(p.id);
                            setEditName(p.name);
                          }}
                          className="p-2 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-900/80 text-slate-400 hover:text-white transition-all"
                          title="Rename Player"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePlayer(p.id, p.name)}
                          className="p-2 rounded-lg bg-slate-950 hover:bg-rose-950/30 border border-slate-900/80 text-slate-400 hover:text-rose-400 transition-all"
                          title="Delete Player"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            ) : (
              <p className="p-8 text-center text-slate-500 italic text-xs font-light">No players registered yet.</p>
            )}
          </div>
        </section>
      </div>

      {/* Match Management Section */}
      <section className="p-6 rounded-2xl border border-slate-900 glass-card shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-900 pb-4">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-indigo-400" /> Match History ({matches.length})
          </h2>
          <div className="hidden sm:block text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-950 px-3 py-1 rounded-full border border-slate-900">
            Records found
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {matches.length > 0 ? (
            matches.map((m) => (
              <div 
                key={m.id} 
                className="group p-5 rounded-2xl border border-slate-900 bg-slate-950/20 hover:bg-slate-900/10 hover:border-indigo-500/20 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-lg overflow-hidden relative"
              >
                <div className="absolute left-0 top-0 w-1 h-full bg-slate-900 group-hover:bg-indigo-500/40 transition-colors" />
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-lg font-black text-white tracking-tight leading-none uppercase">
                      {m.team_a_name}
                    </span>
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-2 py-0.5 rounded-md bg-slate-950 border border-slate-900">VS</span>
                    <span className="text-lg font-black text-white tracking-tight leading-none uppercase">
                      {m.team_b_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Calendar className="w-3 h-3 text-indigo-400/60" />
                      <span className="text-[11px] font-semibold">{m.date}</span>
                    </div>
                    <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest ${
                      m.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    }`}>
                      {m.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto border-t sm:border-t-0 border-slate-900 pt-4 sm:pt-0">
                  <button
                    onClick={() => router.push(`/matches/${m.id}`)}
                    className="flex-1 sm:flex-none h-10 px-5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-sm shadow-slate-950"
                  >
                    View Scorecard
                  </button>
                  <button
                    onClick={() => handleDeleteMatch(m.id, `${m.team_a_name} vs ${m.team_b_name}`)}
                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-rose-600/10 border border-rose-500/20 text-rose-500 hover:bg-rose-600 hover:text-white transition-all shadow-lg shadow-rose-600/5 active:scale-95"
                    title="Delete Match"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center bg-slate-950/20 rounded-3xl border-2 border-dashed border-slate-900/50">
              <RefreshCw className="w-12 h-12 text-slate-800 mx-auto mb-4 opacity-40" />
              <p className="text-slate-500 italic text-sm font-light uppercase tracking-widest">No match records found in history.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
