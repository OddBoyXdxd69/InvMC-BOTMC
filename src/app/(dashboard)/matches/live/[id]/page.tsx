"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Trophy, RefreshCw, Undo2, Award, Zap, AlertTriangle, Plus, ChevronRight, UserPlus, Edit3, Target, Activity, Settings, Check, ZapOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  commonPlayerIds?: number[];
  oversLimit: number;
  bowlerLimit: number;
  singleMan?: boolean;
  singleManMode?: boolean;
  teamABatsFirst?: boolean;
}

interface BatsmanState {
  playerId: number;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  out: boolean;
  wicketHow?: string;
}

interface BowlerState {
  playerId: number;
  runs: number;
  balls: number;
  wickets: number;
  dot_balls_bowled: number;
  hatricks: number;
}

interface BallLogEntry {
  innings: 1 | 2;
  over: number;
  ball: number;
  strikerName: string;
  bowlerName: string;
  bowlerId: number;
  runs: number;
  extra: "wide" | "noball" | "bye" | "six_out" | null;
  isWicket: boolean;
  wicketHow?: string;
  isDot: boolean;
}

interface ScorerState {
  innings: 1 | 2;
  score: number;
  wickets: number;
  balls: number;
  overHistory: string[];
  strikerId: number | null;
  nonStrikerId: number | null;
  currentBowlerId: number | null;
  lastBowlerId: number | null;
  batsmen: Record<number, BatsmanState>;
  bowlers: Record<number, BowlerState>;
  innings1Total: number;
  ballsLog: BallLogEntry[];
}

export default function LiveScorerPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const matchId = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [lineup, setLineup] = useState<MatchLineup | null>(null);
  const [playersMap, setPlayersMap] = useState<Record<number, Player>>({});

  // Core Scoring States
  const [innings, setInnings] = useState<1 | 2>(1);
  const [score, setScore] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [balls, setBalls] = useState(0);
  const [overHistory, setOverHistory] = useState<string[]>([]);
  const [strikerId, setStrikerId] = useState<number | null>(null);
  const [nonStrikerId, setNonStrikerId] = useState<number | null>(null);
  const [currentBowlerId, setCurrentBowlerId] = useState<number | null>(null);
  const [lastBowlerId, setLastBowlerId] = useState<number | null>(null);
  const [batsmenStats, setBatsmenStats] = useState<Record<number, BatsmanState>>({});
  const [bowlerStats, setBowlerStats] = useState<Record<number, BowlerState>>({});
  const [innings1Total, setInnings1Total] = useState(0);
  const [ballsLog, setBallsLog] = useState<BallLogEntry[]>([]);
  const [isSuspended, setIsSuspended] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);
  const [showExtraType, setShowExtraType] = useState<"wide" | "noball" | "bye" | null>(null);

  // Scorer history stack for undo support
  const [history, setHistory] = useState<ScorerState[]>([]);

  // Selection Modal states
  const [showBowlerSelect, setShowBowlerSelect] = useState(false);
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [wicketType, setWicketType] = useState<string>("bowled");
  
  const [showNextBatsmanSelect, setShowNextBatsmanSelect] = useState(false);
  const [replacingSlot, setReplacingSlot] = useState<"striker" | "non-striker">("striker");
  const [showRunOutModal, setShowRunOutModal] = useState(false);
  const [runOutBatsmanId, setRunOutBatsmanId] = useState<number | null>(null);
  const [runOutRuns, setRunOutRuns] = useState(0);

  const [showTieModal, setShowTieModal] = useState(false);

  // Helper temporary stores for Innings 1 stats
  const [finalInnings1Batsmen, setFinalInnings1Batsmen] = useState<Record<number, BatsmanState>>({});
  const [finalInnings1Bowlers, setFinalInnings1Bowlers] = useState<Record<number, BowlerState>>({});
  const [innings1Wkts, setInnings1Wkts] = useState(0);
  const [innings1B, setInnings1B] = useState(0);

  const [showSettings, setShowSettings] = useState(false);
  const [showMobileBowling, setShowMobileBowling] = useState(false);
  const [showMobileBallLog, setShowMobileBallLog] = useState(false);

  useEffect(() => {
    fetch("/api/players")
      .then((res) => res.json())
      .then((data) => {
        const map: Record<number, Player> = {};
        if (Array.isArray(data)) {
          data.forEach((p) => { map[p.id] = p; });
        }
        setPlayersMap(map);
        const savedLineup = localStorage.getItem(`match_lineup_${matchId}`);
        if (savedLineup) {
          const lineupConfig = JSON.parse(savedLineup) as MatchLineup;
          setLineup(lineupConfig);
          const savedState = localStorage.getItem(`match_state_${matchId}`);
          if (savedState) {
            const parsedState = JSON.parse(savedState);
            setInnings(parsedState.innings); setScore(parsedState.score); setWickets(parsedState.wickets); setBalls(parsedState.balls);
            setOverHistory(parsedState.overHistory || []); setStrikerId(parsedState.strikerId); setNonStrikerId(parsedState.nonStrikerId);
            setCurrentBowlerId(parsedState.currentBowlerId); setBatsmenStats(parsedState.batsmenStats || parsedState.batsmen || {});
            setBowlerStats(parsedState.bowlerStats || parsedState.bowlers || {}); setInnings1Total(parsedState.innings1Total);
            setFinalInnings1Batsmen(parsedState.finalInnings1Batsmen || {}); setFinalInnings1Bowlers(parsedState.finalInnings1Bowlers || {});
            setInnings1Wkts(parsedState.innings1Wkts || 0); setInnings1B(parsedState.innings1B || 0); setBallsLog(parsedState.ballsLog || []);
            setHistory(parsedState.history || []); setIsSuspended(parsedState.isSuspended || false); setSuspendReason(parsedState.suspendReason || "");
            setLastBowlerId(parsedState.lastBowlerId || null);
          } else {
            initializeScoring(lineupConfig);
          }
        } else {
          router.push("/matches/new");
        }
        setLoading(false);
      })
      .catch((err) => { console.error(err); setLoading(false); });
  }, [matchId, router]);

  useEffect(() => {
    if (!lineup || loading) return;
    const stateToSave = {
      innings, score, wickets, balls, overHistory, strikerId, nonStrikerId,
      currentBowlerId, batsmenStats, bowlerStats, innings1Total, 
      finalInnings1Batsmen, finalInnings1Bowlers, innings1Wkts, innings1B,
      ballsLog, history, isSuspended, suspendReason, lastBowlerId
    };
    localStorage.setItem(`match_state_${matchId}`, JSON.stringify(stateToSave));
  }, [
    innings, score, wickets, balls, overHistory, strikerId, nonStrikerId,
    currentBowlerId, batsmenStats, bowlerStats, innings1Total, 
    finalInnings1Batsmen, finalInnings1Bowlers, innings1Wkts, innings1B,
    ballsLog, history, isSuspended, suspendReason, lastBowlerId, lineup, loading, matchId
  ]);

  const initializeScoring = (lineupConfig: MatchLineup) => {
    const battingPlayerIds = lineupConfig.teamABatsFirst ? lineupConfig.teamAPlayerIds : lineupConfig.teamBPlayerIds;
    const bowlingPlayerIds = lineupConfig.teamABatsFirst ? lineupConfig.teamBPlayerIds : lineupConfig.teamAPlayerIds;
    const initialBatsmen: Record<number, BatsmanState> = {};
    battingPlayerIds.forEach((id) => { initialBatsmen[id] = { playerId: id, runs: 0, balls: 0, fours: 0, sixes: 0, out: false }; });
    const initialBowlers: Record<number, BowlerState> = {};
    bowlingPlayerIds.forEach((id) => { initialBowlers[id] = { playerId: id, runs: 0, balls: 0, wickets: 0, dot_balls_bowled: 0, hatricks: 0 }; });
    setBatsmenStats(initialBatsmen); setBowlerStats(initialBowlers);
    setStrikerId(battingPlayerIds[0] || null);
    setNonStrikerId(lineupConfig.singleManMode ? null : (battingPlayerIds[1] || null));
    setCurrentBowlerId(bowlingPlayerIds[0] || null);
  };

  const getActiveState = (): ScorerState => ({
    innings, score, wickets, balls, overHistory, strikerId, nonStrikerId,
    currentBowlerId, lastBowlerId,
    batsmen: JSON.parse(JSON.stringify(batsmenStats)),
    bowlers: JSON.parse(JSON.stringify(bowlerStats)),
    innings1Total,
    ballsLog: JSON.parse(JSON.stringify(ballsLog))
  });

  const saveHistory = () => { setHistory((prev) => [...prev, getActiveState()]); };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prevState = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setInnings(prevState.innings); setScore(prevState.score); setWickets(prevState.wickets); setBalls(prevState.balls);
    setOverHistory(prevState.overHistory); setStrikerId(prevState.strikerId); setNonStrikerId(prevState.nonStrikerId);
    setCurrentBowlerId(prevState.currentBowlerId); setLastBowlerId(prevState.lastBowlerId);
    setBatsmenStats(prevState.batsmen); setBowlerStats(prevState.bowlers); setInnings1Total(prevState.innings1Total);
    setBallsLog(prevState.ballsLog || []);
  };

  const checkForHattrick = (logs: BallLogEntry[], bId: number) => {
    const bowlerBalls = logs.filter(l => l.bowlerId === bId && l.extra !== 'wide' && l.extra !== 'noball');
    if (bowlerBalls.length < 3) return false;
    const last3 = bowlerBalls.slice(-3);
    return last3.every(b => b.isWicket && b.wicketHow !== 'run_out');
  };

  const handleScoreBall = (runs: number, isExtra: "wide" | "noball" | "bye" | null = null) => {
    if (!strikerId || !currentBowlerId || !lineup) return;
    saveHistory();
    let newScore = score; let newBalls = balls; let nextStrikerId = strikerId; let nextNonStrikerId = nonStrikerId; let isDot = false;
    const updatedBatsmen = { ...batsmenStats }; const updatedBowlers = { ...bowlerStats };
    const striker = { ...updatedBatsmen[strikerId] }; const bowler = { ...updatedBowlers[currentBowlerId] };
    let overSymbol = runs.toString();
    const rotate = () => { if (!nextStrikerId || !nextNonStrikerId) return; const temp = nextStrikerId; nextStrikerId = nextNonStrikerId; nextNonStrikerId = temp; };
    if (isExtra === "wide") {
      newScore += runs + 1; bowler.runs += runs + 1; overSymbol = runs > 0 ? `${runs}Wd` : "Wd"; setOverHistory((prev) => [...prev, overSymbol]);
    } else if (isExtra === "noball") {
      newScore += runs + 1; bowler.runs += runs + 1; striker.runs += runs; striker.balls += 1;
      if (runs === 4) striker.fours++; if (runs === 6) striker.sixes++;
      overSymbol = runs > 0 ? `${runs}Nb` : "Nb"; setOverHistory((prev) => [...prev, overSymbol]);
    } else if (isExtra === "bye") {
      newScore += runs; newBalls += 1; bowler.balls += 1; striker.balls += 1;
      if (runs === 0) { bowler.dot_balls_bowled += 1; isDot = true; }
      overSymbol = `${runs}B`; setOverHistory((prev) => [...prev, overSymbol]); if (runs % 2 !== 0) rotate();
    } else {
      newScore += runs; newBalls += 1; bowler.runs += runs; bowler.balls += 1; striker.runs += runs; striker.balls += 1;
      if (runs === 0) { bowler.dot_balls_bowled += 1; isDot = true; }
      if (runs === 4) striker.fours++; if (runs === 6) striker.sixes++;
      setOverHistory((prev) => [...prev, overSymbol]); if (runs % 2 !== 0) rotate();
    }
    updatedBatsmen[strikerId] = striker; updatedBowlers[currentBowlerId] = bowler;
    setScore(newScore); setBalls(newBalls); setBatsmenStats(updatedBatsmen); setBowlerStats(updatedBowlers);
    const newEntry: BallLogEntry = {
      innings, over: Math.floor(balls / 6), ball: (balls % 6) + 1, strikerName: playersMap[strikerId]?.name || "Batsman",
      bowlerName: playersMap[currentBowlerId]?.name || "Bowler", bowlerId: currentBowlerId, runs: isExtra === "bye" ? 0 : runs, extra: isExtra, isWicket: false, isDot
    };
    const newLogs = [...ballsLog, newEntry]; setBallsLog(newLogs);
    const validBallsInOver = newBalls % 6;
    if (validBallsInOver === 0 && isExtra !== "wide" && isExtra !== "noball") {
      setOverHistory([]); if (!lineup.singleManMode) rotate(); setLastBowlerId(currentBowlerId);
      if (newBalls / 6 >= lineup.oversLimit) { setStrikerId(nextStrikerId); setNonStrikerId(nextNonStrikerId); handleInningsComplete(newScore, wickets, newBalls, updatedBatsmen, updatedBowlers); }
      else { setStrikerId(nextStrikerId); setNonStrikerId(nextNonStrikerId); setShowBowlerSelect(true); }
    } else { setStrikerId(nextStrikerId); setNonStrikerId(nextNonStrikerId); }
  };

  const handleWicket = () => { saveHistory(); setShowWicketModal(true); };
  const handleRunOut = () => { saveHistory(); setRunOutBatsmanId(strikerId); setRunOutRuns(0); setShowRunOutModal(true); };

  const handleConfirmWicket = () => {
    if (!strikerId || !currentBowlerId || !lineup) return;
    setShowWicketModal(false);
    const newWickets = wickets + 1; const newBalls = balls + 1;
    const updatedBatsmen = { ...batsmenStats }; const updatedBowlers = { ...bowlerStats };
    const striker = { ...updatedBatsmen[strikerId] }; const bowler = { ...updatedBowlers[currentBowlerId] };
    striker.balls += 1; striker.out = true; striker.wicketHow = wicketType;
    bowler.balls += 1; bowler.wickets += 1; bowler.dot_balls_bowled += 1;
    const newEntry: BallLogEntry = {
      innings, over: Math.floor(balls / 6), ball: (balls % 6) + 1, strikerName: playersMap[strikerId]?.name || "Batsman",
      bowlerName: playersMap[currentBowlerId]?.name || "Bowler", bowlerId: currentBowlerId, runs: 0, extra: null, isWicket: true, wicketHow: wicketType, isDot: true
    };
    const newLogs = [...ballsLog, newEntry]; setBallsLog(newLogs);
    if (checkForHattrick(newLogs, currentBowlerId)) { bowler.hatricks += 1; alert(`HAT-TRICK! Amazing bowling by ${playersMap[currentBowlerId]?.name}!`); }
    updatedBatsmen[strikerId] = striker; updatedBowlers[currentBowlerId] = bowler;
    setWickets(newWickets); setBalls(newBalls); setBatsmenStats(updatedBatsmen); setBowlerStats(updatedBowlers); setOverHistory((prev) => [...prev, "W"]);
    const teamSize = innings === 1 ? lineup.teamAPlayerIds.length : lineup.teamBPlayerIds.length;
    const maxWickets = lineup.singleMan ? teamSize : teamSize - 1;
    const currentOvers = newBalls / 6; const isOversEnd = newBalls % 6 === 0;
    if (newWickets >= maxWickets || currentOvers >= lineup.oversLimit) { handleInningsComplete(score, newWickets, newBalls, updatedBatsmen, updatedBowlers); }
    else {
      const squadIds = innings === 1 ? lineup.teamAPlayerIds : lineup.teamBPlayerIds;
      const waitingPlayers = squadIds.filter(id => !updatedBatsmen[id]?.out && id !== nonStrikerId);
      if (waitingPlayers.length === 0 && (lineup.singleMan || lineup.singleManMode)) {
        if (!lineup.singleManMode) { setStrikerId(nonStrikerId); setNonStrikerId(null); }
        if (isOversEnd) { setLastBowlerId(currentBowlerId); setShowBowlerSelect(true); }
      } else {
        if (lineup.singleManMode) { setStrikerId(null); setNonStrikerId(null); setReplacingSlot("striker"); setShowNextBatsmanSelect(true); if (isOversEnd) { setLastBowlerId(currentBowlerId); setShowBowlerSelect(true); } }
        else { if (isOversEnd) { setLastBowlerId(currentBowlerId); setStrikerId(nonStrikerId); setNonStrikerId(null); setReplacingSlot("non-striker"); setShowNextBatsmanSelect(true); setShowBowlerSelect(true); } else { setStrikerId(null); setReplacingSlot("striker"); setShowNextBatsmanSelect(true); } }
      }
    }
  };

  const handleConfirmRunOut = () => {
    if (!strikerId || !currentBowlerId || !runOutBatsmanId || !lineup) return;
    setShowRunOutModal(false);
    const newWickets = wickets + 1; const newBalls = balls + 1; const newScore = score + runOutRuns;
    const updatedBatsmen = { ...batsmenStats }; const updatedBowlers = { ...bowlerStats };
    const striker = { ...updatedBatsmen[strikerId] }; const nonStriker = nonStrikerId ? { ...updatedBatsmen[nonStrikerId] } : null;
    const bowler = { ...updatedBowlers[currentBowlerId] };
    striker.runs += runOutRuns; striker.balls += 1; if (runOutRuns === 4) striker.fours++; if (runOutRuns === 6) striker.sixes++;
    if (runOutBatsmanId === strikerId) { striker.out = true; striker.wicketHow = "run_out"; }
    else if (nonStrikerId && runOutBatsmanId === nonStrikerId && nonStriker) { nonStriker.out = true; nonStriker.wicketHow = "run_out"; }
    bowler.balls += 1; if (runOutRuns === 0) bowler.dot_balls_bowled += 1;
    updatedBatsmen[strikerId] = striker; if (nonStrikerId && nonStriker) { updatedBatsmen[nonStrikerId] = nonStriker; }
    updatedBowlers[currentBowlerId] = bowler;
    setScore(newScore); setWickets(newWickets); setBalls(newBalls); setBatsmenStats(updatedBatsmen); setBowlerStats(updatedBowlers); setOverHistory((prev) => [...prev, `${runOutRuns}W`]);
    const newEntry: BallLogEntry = {
      innings, over: Math.floor(balls / 6), ball: (balls % 6) + 1, strikerName: playersMap[strikerId]?.name || "Batsman",
      bowlerName: playersMap[currentBowlerId]?.name || "Bowler", bowlerId: currentBowlerId, runs: runOutRuns, extra: null, isWicket: true, wicketHow: "run_out", isDot: runOutRuns === 0
    };
    setBallsLog((prev) => [...prev, newEntry]);
    const teamSize = innings === 1 ? lineup.teamAPlayerIds.length : lineup.teamBPlayerIds.length;
    const maxWickets = lineup.singleMan ? teamSize : teamSize - 1;
    const currentOvers = newBalls / 6; const wasOversEnd = newBalls % 6 === 0;
    if (newWickets >= maxWickets || currentOvers >= lineup.oversLimit) { handleInningsComplete(newScore, newWickets, newBalls, updatedBatsmen, updatedBowlers); }
    else {
      const squadIds = innings === 1 ? lineup.teamAPlayerIds : lineup.teamBPlayerIds;
      if (lineup.singleManMode) { setStrikerId(null); setNonStrikerId(null); setReplacingSlot("striker"); setShowNextBatsmanSelect(true); if (wasOversEnd) { setLastBowlerId(currentBowlerId); setShowBowlerSelect(true); } return; }
      let finalStrikerId: number | null = null; let finalNonStrikerId: number | null = null; let slotToFill: "striker" | "non-striker" = "striker";
      const isOddRuns = runOutRuns % 2 !== 0;
      if (runOutBatsmanId === strikerId) { if (isOddRuns) { finalStrikerId = nonStrikerId; finalNonStrikerId = null; slotToFill = "non-striker"; } else { finalStrikerId = null; finalNonStrikerId = nonStrikerId; slotToFill = "striker"; } }
      else { if (isOddRuns) { finalStrikerId = null; finalNonStrikerId = strikerId; slotToFill = "striker"; } else { finalStrikerId = strikerId; finalNonStrikerId = null; slotToFill = "non-striker"; } }
      const waitingPlayers = squadIds.filter(id => !updatedBatsmen[id]?.out && id !== finalStrikerId && id !== finalNonStrikerId);
      if (waitingPlayers.length === 0 && lineup.singleMan) { setStrikerId(finalStrikerId || finalNonStrikerId); setNonStrikerId(null); if (wasOversEnd) { setLastBowlerId(currentBowlerId); setShowBowlerSelect(true); } }
      else { if (wasOversEnd) { setLastBowlerId(currentBowlerId); if (slotToFill === "striker") { setStrikerId(finalNonStrikerId); setNonStrikerId(null); setReplacingSlot("non-striker"); } else { setStrikerId(null); setNonStrikerId(finalStrikerId); setReplacingSlot("striker"); } setShowNextBatsmanSelect(true); setShowBowlerSelect(true); }
      else { setStrikerId(finalStrikerId); setNonStrikerId(finalNonStrikerId); setReplacingSlot(slotToFill); setShowNextBatsmanSelect(true); } }
    }
  };

  const handleSixAndOut = () => {
    if (!strikerId || !currentBowlerId || !lineup) return;
    saveHistory();
    const newBalls = balls + 1; const newWickets = wickets + 1;
    const updatedBatsmen = { ...batsmenStats }; const updatedBowlers = { ...bowlerStats };
    const striker = { ...updatedBatsmen[strikerId] }; const bowler = { ...updatedBowlers[currentBowlerId] };
    striker.balls += 1; striker.out = true; striker.wicketHow = "six_out";
    bowler.balls += 1; bowler.wickets += 1; bowler.dot_balls_bowled += 1;
    updatedBatsmen[strikerId] = striker; updatedBowlers[currentBowlerId] = bowler;
    setBalls(newBalls); setWickets(newWickets); setBatsmenStats(updatedBatsmen); setBowlerStats(updatedBowlers); setOverHistory((prev) => [...prev, "6W"]);
    const newEntry: BallLogEntry = {
      innings, over: Math.floor(balls / 6), ball: (balls % 6) + 1, strikerName: playersMap[strikerId]?.name || "Batsman",
      bowlerName: playersMap[currentBowlerId]?.name || "Bowler", bowlerId: currentBowlerId, runs: 0, extra: "six_out", isWicket: true, wicketHow: "six_out", isDot: true
    };
    const newLogs = [...ballsLog, newEntry]; setBallsLog(newLogs);
    if (checkForHattrick(newLogs, currentBowlerId)) { bowler.hatricks += 1; alert(`HAT-TRICK! Amazing bowling by ${playersMap[currentBowlerId]?.name}!`); }
    const teamSize = innings === 1 ? lineup.teamAPlayerIds.length : lineup.teamBPlayerIds.length;
    const maxWickets = lineup.singleMan ? teamSize : teamSize - 1;
    const currentOvers = newBalls / 6; const isOversEnd = newBalls % 6 === 0;
    if (newWickets >= maxWickets || currentOvers >= lineup.oversLimit) { handleInningsComplete(score, newWickets, newBalls, updatedBatsmen, updatedBowlers); }
    else {
      const squadIds = innings === 1 ? lineup.teamAPlayerIds : lineup.teamBPlayerIds;
      const waitingPlayers = squadIds.filter(id => !updatedBatsmen[id]?.out && id !== nonStrikerId);
      if (lineup.singleManMode) { setStrikerId(null); setNonStrikerId(null); setReplacingSlot("striker"); setShowNextBatsmanSelect(true); if (isOversEnd) { setLastBowlerId(currentBowlerId); setShowBowlerSelect(true); } return; }
      if (waitingPlayers.length === 0 && (lineup.singleMan || lineup.singleManMode)) { if (!lineup.singleManMode) { setStrikerId(nonStrikerId); setNonStrikerId(null); } if (isOversEnd) { setLastBowlerId(currentBowlerId); setShowBowlerSelect(true); } }
      else { if (isOversEnd) { setLastBowlerId(currentBowlerId); setStrikerId(nonStrikerId); setNonStrikerId(null); setReplacingSlot("non-striker"); setShowNextBatsmanSelect(true); setShowBowlerSelect(true); } else { setStrikerId(null); setReplacingSlot("striker"); setShowNextBatsmanSelect(true); } }
    }
  };

  const handleSuspendMatch = () => { setIsSuspended(true); setSuspendReason("Rain Delay"); };
  const handleResumeMatch = () => { setIsSuspended(false); setSuspendReason(""); };
  const swapStriker = () => { if (!strikerId || !nonStrikerId) return; const s = strikerId; const ns = nonStrikerId; setStrikerId(ns); setNonStrikerId(s); };

  const handleInningsComplete = (fScore: number, fWkts: number, fBalls: number, fBats: Record<number, BatsmanState>, fBowls: Record<number, BowlerState>) => {
    if (!lineup) return;
    if (innings === 1) {
      alert(`Innings 1 Complete! ${lineup.teamAName} scored ${fScore}/${fWkts} in ${getOvers(fBalls)} overs.`);
      setFinalInnings1Batsmen(fBats); setFinalInnings1Bowlers(fBowls); setInnings1Wkts(fWkts); setInnings1B(fBalls);
      setInnings(2); setInnings1Total(fScore); setScore(0); setWickets(0); setBalls(0); setOverHistory([]); setLastBowlerId(null);
      const teamBIds = lineup.teamABatsFirst ? lineup.teamBPlayerIds : lineup.teamAPlayerIds;
      const initialBatsmen: Record<number, BatsmanState> = {};
      teamBIds.forEach((id) => { initialBatsmen[id] = { playerId: id, runs: 0, balls: 0, fours: 0, sixes: 0, out: false }; });
      const teamAIds = lineup.teamABatsFirst ? lineup.teamAPlayerIds : lineup.teamBPlayerIds;
      const initialBowlers: Record<number, BowlerState> = {};
      teamAIds.forEach((id) => { initialBowlers[id] = { playerId: id, runs: 0, balls: 0, wickets: 0, dot_balls_bowled: 0, hatricks: 0 }; });
      setBatsmenStats(initialBatsmen); setBowlerStats(initialBowlers);
      setStrikerId(teamBIds[0] || null); setNonStrikerId(lineup.singleManMode ? null : (teamBIds[1] || null)); setCurrentBowlerId(teamAIds[0] || null);
      setHistory([]);
    } else {
      if (fScore === innings1Total) { setShowTieModal(true); }
      else { handleMatchEnd(fScore, fWkts, fBalls, fBats, fBowls); }
    }
  };

  const handleMatchEnd = async (fScore: number, fWkts: number, fBalls: number, fBats: Record<number, BatsmanState>, fBowls: Record<number, BowlerState>) => {
    if (!lineup || isCompleting) return;
    setIsCompleting(true);
    let winner = fScore > innings1Total ? lineup.teamBName : (fScore < innings1Total ? lineup.teamAName : "Tie");
    alert(`Match Completed! Winner: ${winner}. Saving match details...`);
    const pStats: any[] = [];
    lineup.teamAPlayerIds.forEach((id) => {
      const bat = finalInnings1Batsmen[id] || fBats[id] || { runs: 0, balls: 0, fours: 0, sixes: 0, out: false };
      const bowl = fBowls[id] || finalInnings1Bowlers[id] || { runs: 0, balls: 0, wickets: 0, dot_balls_bowled: 0, hatricks: 0 };
      pStats.push({ player_id: id, team_name: lineup.teamAName, runs_scored: bat.runs, balls_faced: bat.balls, fours: bat.fours, sixes: bat.sixes, wickets_taken: bowl.wickets, runs_conceded: bowl.runs, balls_bowled: bowl.balls, dot_balls_bowled: bowl.dot_balls_bowled || 0, hatricks: bowl.hatricks || 0, wicket_how: bat.wicketHow || (bat.out ? "out" : "not_out") });
    });
    lineup.teamBPlayerIds.forEach((id) => {
      const bat = fBats[id] || finalInnings1Batsmen[id] || { runs: 0, balls: 0, fours: 0, sixes: 0, out: false };
      const bowl = finalInnings1Bowlers[id] || fBowls[id] || { runs: 0, balls: 0, wickets: 0, dot_balls_bowled: 0, hatricks: 0 };
      pStats.push({ player_id: id, team_name: lineup.teamBName, runs_scored: bat.runs, balls_faced: bat.balls, fours: bat.fours, sixes: bat.sixes, wickets_taken: bowl.wickets, runs_conceded: bowl.runs, balls_bowled: bowl.balls, dot_balls_bowled: bowl.dot_balls_bowled || 0, hatricks: bowl.hatricks || 0, wicket_how: bat.wicketHow || (bat.out ? "out" : "not_out") });
    });
    try {
      const res = await fetch("/api/matches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "complete", match_id: Number(matchId), winner, team_a_runs: innings1Total, team_a_wickets: innings1Wkts, team_a_balls: innings1B, team_b_runs: fScore, team_b_wickets: fWkts, team_b_balls: fBalls, player_stats: pStats, balls_log: JSON.stringify(ballsLog) }), });
      if (res.ok) { localStorage.removeItem(`match_lineup_${matchId}`); localStorage.removeItem(`match_state_${matchId}`); router.push(`/matches/${matchId}`); }
      else { alert("Failed to save match statistics."); setIsCompleting(false); }
    } catch (err) { console.error(err); alert("Error saving match."); setIsCompleting(false); }
  };

  const startSuperOver = () => {
    saveHistory();
    const superLineup = { ...lineup!, oversLimit: 1, teamABatsFirst: true };
    setLineup(superLineup);
    setInnings(1); setScore(0); setWickets(0); setBalls(0); setInnings1Total(0); setOverHistory([]); setBallsLog([]); setHistory([]);
    initializeScoring(superLineup);
    setShowTieModal(false);
  };

  const getEconomy = (runs: number, b: number) => (b === 0 ? "0.00" : (runs / (b / 6)).toFixed(2));
  const getStrikeRate = (runs: number, b: number) => (b === 0 ? "0.0" : ((runs / b) * 100).toFixed(1));
  const getOvers = (b: number) => `${Math.floor(b / 6)}.${b % 6}`;

  const requiredRuns = innings === 2 ? (innings1Total + 1) - score : 0;
  const totalBalls = lineup ? (lineup.oversLimit * 6) : 0;
  const remBalls = totalBalls - balls;
  const reqRunRate = remBalls > 0 ? ((requiredRuns * 6) / remBalls).toFixed(2) : "0.00";
  const currRunRate = balls > 0 ? ((score * 6) / balls).toFixed(2) : "0.00";
  const projectedScore = innings === 1 ? (balls > 0 ? Math.round((score / balls) * totalBalls) : 0) : null;
  
  const calculateWinProb = () => {
    if (innings === 1) return null;
    if (score > innings1Total) return 100;
    if (remBalls <= 0 && score < innings1Total) return 0;
    const rr = parseFloat(currRunRate); const rrr = parseFloat(reqRunRate);
    if (rrr > 24) return 5; if (rrr <= 0) return 100;
    let prob = 50 + (rr - rrr) * 5; prob -= (wickets * 7);
    return Math.min(Math.max(Math.round(prob), 1), 99);
  };
  const winProb = calculateWinProb();

  if (loading || !lineup) return <div className="py-20 text-center"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" /></div>;

  const battingTeamName = innings === 1 ? (lineup.teamABatsFirst ? lineup.teamAName : lineup.teamBName) : (lineup.teamABatsFirst ? lineup.teamBName : lineup.teamAName);
  const bowlingTeamName = innings === 1 ? (lineup.teamABatsFirst ? lineup.teamBName : lineup.teamAName) : (lineup.teamABatsFirst ? lineup.teamAName : lineup.teamBName);

  return (
    <div className="max-w-5xl mx-auto select-none px-4 md:px-0 pb-20">
      <AnimatePresence>
        {isSuspended && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3"><Activity className="w-6 h-6 text-amber-400 animate-pulse" /><div><p className="text-sm font-bold text-amber-300 uppercase tracking-tighter">Rain Delay</p></div></div>
            <button onClick={handleResumeMatch} className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer shadow-lg">Resume</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== DESKTOP LAYOUT (md and up) ==================== */}
      <div className="hidden md:block space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 rounded-2xl border border-slate-900 glass-card gap-4 shadow-xl">
          <div>
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2 mb-1"><span className={`h-2 w-2 rounded-full ${isSuspended ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`} />{isSuspended ? 'Suspended' : 'Live'} — Innings {innings}</p>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">{lineup.teamAName} vs {lineup.teamBName}</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowSettings(true)} className="h-10 px-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-xs font-black cursor-pointer"><Settings className="w-4 h-4" /></button>
            <button onClick={handleUndo} disabled={history.length === 0} className="h-10 px-3 rounded-xl border border-slate-800 bg-slate-900/40 text-slate-300 disabled:opacity-30 text-xs font-black cursor-pointer"><Undo2 className="w-4 h-4" /></button>
            <button onClick={isSuspended ? handleResumeMatch : handleSuspendMatch} className="h-10 px-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-black"><Activity className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <section className="md:col-span-2 p-5 sm:p-8 rounded-3xl border border-slate-900 glass-card shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{battingTeamName} batting</p>
                <h2 className="text-5xl sm:text-6xl md:text-7xl font-black text-white tracking-tighter mt-2">{score} <span className="text-2xl sm:text-3xl text-slate-600 font-light">/ {wickets}</span></h2>
                {innings === 2 && <div className="mt-4 px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 inline-block"><p className="text-xs font-black text-indigo-400 uppercase">{battingTeamName} need {requiredRuns} in {remBalls} balls</p></div>}
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Overs</p>
                <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tighter mt-2">{getOvers(balls)} <span className="text-sm sm:text-base font-bold text-slate-700">/ {lineup.oversLimit}</span></h3>
                {innings === 1 && projectedScore !== null && <p className="text-[10px] font-black text-slate-500 uppercase mt-4">Proj. Score: <span className="text-emerald-400 text-sm ml-1">{projectedScore}</span></p>}
                {innings === 2 && winProb !== null && <p className="text-[10px] font-black text-slate-500 uppercase mt-4">Win Prob: <span className="text-indigo-400 text-sm ml-1">{winProb}%</span></p>}
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-900/60">
              <div><span className="text-[9px] text-slate-600 uppercase font-black block mb-1">CRR</span><span className="text-sm font-black text-emerald-400">{currRunRate}</span></div>
              {innings === 1 ? (
                <>
                  <div><span className="text-[9px] text-slate-600 uppercase font-black block mb-1">@ 10 RR</span><span className="text-sm font-black text-white">{Math.round(score + (remBalls/6)*10)}</span></div>
                  <div><span className="text-[9px] text-slate-600 uppercase font-black block mb-1">@ 12 RR</span><span className="text-sm font-black text-white">{Math.round(score + (remBalls/6)*12)}</span></div>
                </>
              ) : (
                <>
                  <div><span className="text-[9px] text-slate-600 uppercase font-black block mb-1">RRR</span><span className="text-sm font-black text-indigo-400">{reqRunRate}</span></div>
                  <div><span className="text-[9px] text-slate-600 uppercase font-black block mb-1">Target</span><span className="text-sm font-black text-white">{innings1Total + 1}</span></div>
                </>
              )}
            </div>
          </section>

          <section className="p-5 sm:p-6 rounded-3xl border border-slate-900 glass-card shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-900 pb-2">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Active Field</h3>
              <button onClick={() => { saveHistory(); swapStriker(); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase hover:bg-indigo-500/20 transition-all cursor-pointer"><RefreshCw className="w-3.5 h-3.5" /> Swap</button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2.5">
                {strikerId && batsmenStats[strikerId] && (
                  <div onClick={() => setShowSettings(true)} className="flex justify-between items-center p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 hover:bg-emerald-500/10 transition-all cursor-pointer group">
                    <span className="text-sm font-black text-emerald-400 flex items-center gap-2">
                      <Zap className="w-4 h-4 fill-emerald-500 animate-pulse text-emerald-400" />
                      <span>{playersMap[strikerId]?.name}*</span>
                      <Edit3 className="w-3 h-3 text-emerald-500/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </span>
                    <div className="text-right">
                      <p className="text-sm font-black text-emerald-400">{batsmenStats[strikerId].runs}({batsmenStats[strikerId].balls})</p>
                      <p className="text-[8px] font-black text-emerald-500/50 uppercase tracking-wider mt-0.5">SR: {getStrikeRate(batsmenStats[strikerId].runs, batsmenStats[strikerId].balls)}</p>
                    </div>
                  </div>
                )}
                {nonStrikerId && batsmenStats[nonStrikerId] && (
                  <div onClick={() => setShowSettings(true)} className="flex justify-between items-center p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800 hover:bg-slate-900/60 transition-all cursor-pointer group">
                    <span className="text-sm font-bold text-slate-300 flex items-center gap-2">
                      <span className="w-4 h-4" /> {/* align with striker icon */}
                      <span>{playersMap[nonStrikerId]?.name}</span>
                      <Edit3 className="w-3 h-3 text-emerald-550/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </span>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-400">{batsmenStats[nonStrikerId].runs}({batsmenStats[nonStrikerId].balls})</p>
                      <p className="text-[8px] font-black text-slate-500/50 uppercase tracking-wider mt-0.5">SR: {getStrikeRate(batsmenStats[nonStrikerId].runs, batsmenStats[nonStrikerId].balls)}</p>
                    </div>
                  </div>
                )}
              </div>
              {currentBowlerId && bowlerStats[currentBowlerId] && (
                <div onClick={() => setShowBowlerSelect(true)} className="flex justify-between items-center p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800 hover:bg-slate-900/60 transition-all cursor-pointer pt-2.5 border-t border-slate-900/60 group">
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <Target className="w-4 h-4 text-slate-400" />
                    <span>{playersMap[currentBowlerId]?.name}</span>
                    <Edit3 className="w-3 h-3 text-slate-505/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-300">{getOvers(bowlerStats[currentBowlerId].balls)}-{bowlerStats[currentBowlerId].runs}-{bowlerStats[currentBowlerId].wickets}</p>
                    <p className="text-[8px] font-black text-slate-500/50 uppercase tracking-wider mt-0.5">Econ: {getEconomy(bowlerStats[currentBowlerId].runs, bowlerStats[currentBowlerId].balls)}</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="p-4 rounded-xl border border-slate-900 bg-slate-900/20 flex items-center justify-between gap-4 overflow-hidden select-none">
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest shrink-0">This Over:</span>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none py-1 justify-end flex-1 scroll-smooth">
            {overHistory.length > 0 ? overHistory.map((sym, i) => (
              <span key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border shrink-0 ${sym === "W" || sym.includes("W") ? "bg-rose-500/20 border-rose-500/40 text-rose-455" : sym.includes("Wd") || sym.includes("Nb") ? "bg-amber-500/20 border-amber-500/40 text-amber-400" : sym === "4" || sym === "6" ? "bg-emerald-500/25 border-emerald-500/50 text-emerald-400 scale-110" : "bg-slate-900 border-slate-800 text-slate-500"}`}>{sym}</span>
            )) : <span className="text-xs text-slate-700 italic">Waiting...</span>}
          </div>
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${isSuspended ? "opacity-30 pointer-events-none" : ""}`}>
          <section className="md:col-span-2 p-5 sm:p-6 rounded-3xl border border-slate-900 glass-card space-y-4 shadow-xl select-none">
            <div className="flex justify-between items-center border-b border-slate-900 pb-2">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tactile Runs Pad</h3>
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">Tap value to record ball</span>
            </div>
            
            <div className="grid grid-cols-4 gap-2.5">
              {[0, 1, 2, 3].map((r) => (
                <motion.button 
                  key={r} 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleScoreBall(r)} 
                  className={`h-16 sm:h-20 rounded-2xl border font-black transition-all cursor-pointer flex flex-col items-center justify-center select-none ${
                    r === 0 
                      ? "bg-slate-950/60 border-slate-900 text-slate-400 hover:border-slate-800" 
                      : "bg-slate-900/40 border-slate-800 text-slate-200 hover:border-slate-700"
                  }`}
                >
                  <span className="text-xl sm:text-2xl">{r}</span>
                  <span className="text-[7px] sm:text-[8px] font-black text-slate-500 uppercase tracking-wider mt-0.5">
                    {r === 0 ? 'DOT' : r === 1 ? 'SINGLE' : r === 2 ? 'DOUBLE' : 'TRIPLE'}
                  </span>
                </motion.button>
              ))}

              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => handleScoreBall(4)} 
                className="h-16 sm:h-20 rounded-2xl border font-black transition-all cursor-pointer flex flex-col items-center justify-center bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.08)] hover:bg-emerald-500/20 select-none"
              >
                <span className="text-xl sm:text-2xl">4</span>
                <span className="text-[7px] sm:text-[8px] font-black text-emerald-500/70 uppercase tracking-widest mt-0.5">FOUR</span>
              </motion.button>

              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => handleScoreBall(6)} 
                className="h-16 sm:h-20 rounded-2xl border font-black transition-all cursor-pointer flex flex-col items-center justify-center bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.08)] hover:bg-indigo-500/20 select-none"
              >
                <span className="text-xl sm:text-2xl">6</span>
                <span className="text-[7px] sm:text-[8px] font-black text-indigo-400/70 uppercase tracking-widest mt-0.5">SIX</span>
              </motion.button>

              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => handleScoreBall(5)} 
                className="h-16 sm:h-20 rounded-2xl border font-black transition-all cursor-pointer flex flex-col items-center justify-center bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-700 select-none"
              >
                <span className="text-xl sm:text-2xl">5</span>
                <span className="text-[7px] sm:text-[8px] font-black text-slate-550 uppercase tracking-widest mt-0.5">FIVE</span>
              </motion.button>

              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={handleUndo}
                disabled={history.length === 0}
                className="h-16 sm:h-20 rounded-2xl border font-black transition-all cursor-pointer flex flex-col items-center justify-center bg-rose-950/20 border-rose-900/30 text-rose-450 disabled:opacity-20 hover:bg-rose-950/35 select-none"
              >
                <Undo2 className="w-5 h-5 sm:w-6 sm:h-6 mb-0.5" />
                <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest">UNDO</span>
              </motion.button>
            </div>
          </section>

          <section className="p-5 sm:p-6 rounded-3xl border border-slate-900 glass-card space-y-4 shadow-xl">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-900 pb-2">Scoring Events</h3>
            <div className="grid grid-cols-2 gap-2.5">
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => setShowExtraType("wide")} className="h-12 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-400 font-black text-[10px] uppercase tracking-wider hover:bg-amber-500/10 cursor-pointer">Wide</motion.button>
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => setShowExtraType("noball")} className="h-12 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-400 font-black text-[10px] uppercase tracking-wider hover:bg-amber-500/10 cursor-pointer">No Ball</motion.button>
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => setShowExtraType("bye")} className="h-12 rounded-xl border border-slate-800 bg-slate-900/50 text-slate-300 font-black text-[10px] uppercase tracking-wider hover:bg-slate-900/60 cursor-pointer">Bye / Leg-Bye</motion.button>
              <motion.button whileTap={{ scale: 0.96 }} onClick={handleWicket} className="h-12 rounded-xl bg-rose-600/10 border border-rose-500/30 text-rose-500 font-black text-[10px] uppercase tracking-wider hover:bg-rose-600/20 cursor-pointer">Wicket</motion.button>
              <motion.button whileTap={{ scale: 0.96 }} onClick={handleRunOut} className="h-12 rounded-xl bg-amber-600/10 border border-amber-500/30 text-amber-500 font-black text-[10px] uppercase tracking-wider hover:bg-amber-600/20 cursor-pointer">Run Out</motion.button>
              <motion.button whileTap={{ scale: 0.96 }} onClick={handleSixAndOut} className="col-span-2 h-14 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-600/10 hover:brightness-110 cursor-pointer">💥 Six & Out</motion.button>
            </div>
          </section>
        </div>

        <section className="p-6 rounded-3xl border border-slate-900 glass-card shadow-xl space-y-4">
          <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-slate-900"><Activity className="w-4 h-4" /> Bowling Analysis ({bowlingTeamName})</h3>
          <div className="overflow-x-auto"><table className="w-full text-left text-[11px]"><thead className="text-slate-600 font-black uppercase tracking-widest border-b border-slate-900/60"><tr><th className="py-2 px-1">Bowler</th><th className="py-2 px-1 text-center">O</th><th className="py-2 px-1 text-center">R</th><th className="py-2 px-1 text-center">W</th><th className="py-2 px-1 text-center">Dots</th><th className="py-2 px-1 text-center">HT</th><th className="py-2 px-1 text-right">Econ</th></tr></thead>
            <tbody className="divide-y divide-slate-900/40">
              {(innings === 1 ? (lineup.teamABatsFirst ? lineup.teamBPlayerIds : lineup.teamAPlayerIds) : (lineup.teamABatsFirst ? lineup.teamAPlayerIds : lineup.teamBPlayerIds)).filter(id => bowlerStats[id] && bowlerStats[id].balls > 0).map(id => (
                <tr key={id} className={`transition-colors ${id === currentBowlerId ? 'bg-emerald-500/5' : ''}`}>
                  <td className="py-4 px-1 font-bold text-slate-200"><div className="flex items-center gap-2">{id === currentBowlerId && <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}{playersMap[id]?.name}</div></td>
                  <td className="py-4 px-1 text-center font-bold text-slate-400">{getOvers(bowlerStats[id].balls)}</td>
                  <td className="py-4 px-1 text-center font-bold text-slate-100">{bowlerStats[id].runs}</td>
                  <td className="py-4 px-1 text-center font-black text-white">{bowlerStats[id].wickets}</td>
                  <td className="py-4 px-1 text-center text-slate-500 font-bold">{bowlerStats[id].dot_balls_bowled || 0}</td>
                  <td className="py-4 px-1 text-center font-black text-amber-500">{bowlerStats[id].hatricks > 0 ? bowlerStats[id].hatricks : '-'}</td>
                  <td className="py-4 px-1 text-right font-bold text-emerald-500">{getEconomy(bowlerStats[id].runs, bowlerStats[id].balls)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </section>
      </div>

      {/* ==================== MOBILE LAYOUT (sm and down) ==================== */}
      <div className="block md:hidden space-y-4 pb-36">
        {/* Sticky Header Strip */}
        <div className="flex justify-between items-center py-2.5 border-b border-slate-900 bg-slate-950/90 backdrop-blur sticky top-0 z-30">
          <div>
            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest block">Innings {innings}</span>
            <h1 className="text-sm font-black text-white truncate max-w-[160px]">{lineup.teamAName} v {lineup.teamBName}</h1>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => setShowSettings(true)} className="h-8 px-2.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-black flex items-center justify-center cursor-pointer active:scale-95"><Settings className="w-3.5 h-3.5" /></button>
            <button onClick={handleUndo} disabled={history.length === 0} className="h-8 px-2.5 rounded-lg border border-slate-800 bg-slate-900/40 text-slate-350 disabled:opacity-20 text-xs font-black flex items-center justify-center cursor-pointer active:scale-95"><Undo2 className="w-3.5 h-3.5" /></button>
            <button onClick={isSuspended ? handleResumeMatch : handleSuspendMatch} className="h-8 px-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-black flex items-center justify-center cursor-pointer active:scale-95"><Activity className="w-3.5 h-3.5" /></button>
          </div>
        </div>

        {/* Compact Match Score Panel */}
        <div className="p-4 rounded-2xl border border-slate-900 bg-gradient-to-br from-emerald-500/5 via-slate-900/20 to-indigo-500/5 flex justify-between items-center shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
          <div>
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block">{battingTeamName} batting</span>
            <h2 className="text-4xl font-black text-white tracking-tighter mt-1">{score} <span className="text-base text-slate-600 font-light">/ {wickets}</span></h2>
            {innings === 2 && <span className="text-[9px] font-bold text-indigo-400 block mt-1.5 uppercase">Need {requiredRuns} runs in {remBalls} balls</span>}
          </div>
          <div className="text-right">
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block">Overs</span>
            <h3 className="text-2xl font-black text-white tracking-tighter mt-1">{getOvers(balls)} <span className="text-xs text-slate-700 font-bold">/ {lineup.oversLimit}</span></h3>
            {innings === 1 && projectedScore !== null && <span className="text-[9px] font-bold text-emerald-400 block mt-1.5 uppercase">Proj: {projectedScore}</span>}
            {innings === 2 && winProb !== null && <span className="text-[9px] font-bold text-indigo-400 block mt-1.5 uppercase">Win Prob: {winProb}%</span>}
          </div>
        </div>

        {/* CRR & RRR stats bar */}
        <div className="grid grid-cols-3 gap-2 px-1 text-center">
          <div className="py-2.5 rounded-xl bg-slate-900/20 border border-slate-900/60"><span className="text-[8px] text-slate-500 uppercase font-black block mb-0.5">CRR</span><span className="text-xs font-black text-emerald-400">{currRunRate}</span></div>
          {innings === 1 ? (
            <>
              <div className="py-2.5 rounded-xl bg-slate-900/20 border border-slate-900/60"><span className="text-[8px] text-slate-500 uppercase font-black block mb-0.5">@ 10 RR</span><span className="text-xs font-black text-white">{Math.round(score + (remBalls/6)*10)}</span></div>
              <div className="py-2.5 rounded-xl bg-slate-900/20 border border-slate-900/60"><span className="text-[8px] text-slate-500 uppercase font-black block mb-0.5">@ 12 RR</span><span className="text-xs font-black text-white">{Math.round(score + (remBalls/6)*12)}</span></div>
            </>
          ) : (
            <>
              <div className="py-2.5 rounded-xl bg-slate-900/20 border border-slate-900/60"><span className="text-[8px] text-slate-500 uppercase font-black block mb-0.5">RRR</span><span className="text-xs font-black text-indigo-400">{reqRunRate}</span></div>
              <div className="py-2.5 rounded-xl bg-slate-900/20 border border-slate-900/60"><span className="text-[8px] text-slate-500 uppercase font-black block mb-0.5">Target</span><span className="text-xs font-black text-white">{innings1Total + 1}</span></div>
            </>
          )}
        </div>

        {/* Active Player Cards (Compact view) */}
        <div className="grid grid-cols-2 gap-2">
          {strikerId && batsmenStats[strikerId] && (
            <div 
              onClick={() => { saveHistory(); swapStriker(); }}
              className="p-3 rounded-xl bg-emerald-500/10 border-2 border-emerald-500 text-left transition-all active:scale-[0.98] cursor-pointer relative overflow-hidden"
            >
              <div className="absolute top-1 right-1">
                <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-500 animate-pulse" />
              </div>
              <span className="text-[8px] font-black text-emerald-500 uppercase tracking-wider block mb-0.5">Striker</span>
              <p className="text-xs font-black text-white truncate pr-4">{playersMap[strikerId]?.name}</p>
              <p className="text-sm font-black text-emerald-400 mt-1">{batsmenStats[strikerId].runs} <span className="text-[10px] text-slate-400 font-normal">({batsmenStats[strikerId].balls})</span></p>
            </div>
          )}

          {nonStrikerId && batsmenStats[nonStrikerId] && (
            <div 
              onClick={() => { saveHistory(); swapStriker(); }}
              className="p-3 rounded-xl bg-slate-900 border border-slate-850 text-left transition-all active:scale-[0.98] cursor-pointer relative"
            >
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block mb-0.5">Non-Striker</span>
              <p className="text-xs font-bold text-slate-305 truncate">{playersMap[nonStrikerId]?.name}</p>
              <p className="text-sm font-black text-slate-400 mt-1">{batsmenStats[nonStrikerId].runs} <span className="text-[10px] text-slate-500 font-normal">({batsmenStats[nonStrikerId].balls})</span></p>
            </div>
          )}
        </div>

        {/* Bowler Card & Swap Striker Row */}
        <div className="flex gap-2 items-center">
          {currentBowlerId && bowlerStats[currentBowlerId] && (
            <div 
              onClick={() => setShowBowlerSelect(true)}
              className="flex-1 p-3 rounded-xl bg-slate-900 border border-slate-850 flex justify-between items-center cursor-pointer active:scale-[0.98] transition-all"
            >
              <div>
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block mb-0.5">Bowler</span>
                <p className="text-xs font-bold text-white truncate flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-slate-400" />
                  {playersMap[currentBowlerId]?.name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-slate-300">{getOvers(bowlerStats[currentBowlerId].balls)} - {bowlerStats[currentBowlerId].runs} - {bowlerStats[currentBowlerId].wickets}</p>
                <p className="text-[8px] font-bold text-slate-500 mt-0.5">Econ: {getEconomy(bowlerStats[currentBowlerId].runs, bowlerStats[currentBowlerId].balls)}</p>
              </div>
            </div>
          )}
          <button 
            onClick={() => { saveHistory(); swapStriker(); }}
            className="h-12 px-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/35 text-indigo-400 text-[10px] font-black uppercase tracking-wider flex flex-col items-center justify-center cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="text-[7px] font-black mt-0.5">Swap</span>
          </button>
        </div>

        {/* Over History Tracker */}
        <div className="p-3 rounded-xl border border-slate-900 bg-slate-950 flex items-center justify-between gap-3 select-none">
          <span className="text-[8px] font-black text-slate-550 uppercase tracking-widest shrink-0">This Over:</span>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none py-0.5 justify-end flex-1 scroll-smooth">
            {overHistory.length > 0 ? overHistory.map((sym, i) => (
              <span key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black border shrink-0 ${sym === "W" || sym.includes("W") ? "bg-rose-500/20 border-rose-500/40 text-rose-450" : sym.includes("Wd") || sym.includes("Nb") ? "bg-amber-500/20 border-amber-500/40 text-amber-400" : sym === "4" || sym === "6" ? "bg-emerald-500/20 border-emerald-500/45 text-emerald-450 scale-105" : "bg-slate-900 border-slate-800 text-slate-500"}`}>{sym}</span>
            )) : <span className="text-[10px] text-slate-700 italic">Waiting...</span>}
          </div>
        </div>

        {/* Accordion 1: Bowling stats */}
        <section className="p-4 rounded-2xl border border-slate-900 bg-slate-900/10 space-y-2">
          <button 
            type="button"
            onClick={() => setShowMobileBowling(!showMobileBowling)}
            className="w-full flex justify-between items-center text-[10px] font-black text-emerald-400 uppercase tracking-widest cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" /> Bowling Analysis ({bowlingTeamName})
            </span>
            <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${showMobileBowling ? 'rotate-90' : ''}`} />
          </button>
          
          <AnimatePresence>
            {showMobileBowling && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden pt-2"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[10px]">
                    <thead className="text-slate-605 font-black uppercase border-b border-slate-900/60">
                      <tr>
                        <th className="py-1.5 px-0.5">Bowler</th>
                        <th className="py-1.5 px-0.5 text-center">O</th>
                        <th className="py-1.5 px-0.5 text-center">R</th>
                        <th className="py-1.5 px-0.5 text-center">W</th>
                        <th className="py-1.5 px-0.5 text-right">Econ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/40">
                      {(innings === 1 ? (lineup.teamABatsFirst ? lineup.teamBPlayerIds : lineup.teamAPlayerIds) : (lineup.teamABatsFirst ? lineup.teamAPlayerIds : lineup.teamBPlayerIds)).filter(id => bowlerStats[id] && bowlerStats[id].balls > 0).map(id => (
                        <tr key={id} className={`transition-colors ${id === currentBowlerId ? 'bg-emerald-500/5' : ''}`}>
                          <td className="py-2.5 px-0.5 font-bold text-slate-300">
                            <div className="flex items-center gap-1.5 truncate max-w-[110px]">
                              {id === currentBowlerId && <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />}
                              {playersMap[id]?.name}
                            </div>
                          </td>
                          <td className="py-2.5 px-0.5 text-center font-bold text-slate-450">{getOvers(bowlerStats[id].balls)}</td>
                          <td className="py-2.5 px-0.5 text-center font-bold text-slate-100">{bowlerStats[id].runs}</td>
                          <td className="py-2.5 px-0.5 text-center font-black text-white">{bowlerStats[id].wickets}</td>
                          <td className="py-2.5 px-0.5 text-right font-bold text-emerald-450">{getEconomy(bowlerStats[id].runs, bowlerStats[id].balls)}</td>
                        </tr>
                      ))}
                      {(innings === 1 ? (lineup.teamABatsFirst ? lineup.teamBPlayerIds : lineup.teamAPlayerIds) : (lineup.teamABatsFirst ? lineup.teamAPlayerIds : lineup.teamBPlayerIds)).filter(id => bowlerStats[id] && bowlerStats[id].balls > 0).length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-600 italic">No bowling stats logged yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Accordion 2: Recent ball logs */}
        <section className="p-4 rounded-2xl border border-slate-900 bg-slate-900/10 space-y-2">
          <button 
            type="button"
            onClick={() => setShowMobileBallLog(!showMobileBallLog)}
            className="w-full flex justify-between items-center text-[10px] font-black text-indigo-400 uppercase tracking-widest cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" /> Recent Ball Logs
            </span>
            <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${showMobileBallLog ? 'rotate-90' : ''}`} />
          </button>
          
          <AnimatePresence>
            {showMobileBallLog && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden pt-2"
              >
                <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1">
                  {ballsLog.length > 0 ? ballsLog.filter(l => l.innings === innings).slice().reverse().map((entry, index) => {
                    let extraText = "";
                    if (entry.extra) {
                      extraText = `(${entry.extra.toUpperCase()})`;
                    }
                    return (
                      <div key={index} className="flex justify-between items-center p-2 rounded-xl bg-slate-950 border border-slate-900 text-[10px]">
                        <div>
                          <span className="font-bold text-slate-500">Ov {entry.over}.{entry.ball}</span>
                          <span className="ml-2 font-black text-slate-300">{entry.strikerName} vs {entry.bowlerName}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {entry.isWicket && <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-black">{entry.wicketHow?.replace("_", " ")}</span>}
                          {entry.runs > 0 && <span className="font-black text-white">+{entry.runs} Runs</span>}
                          {extraText && <span className="font-bold text-amber-500">{extraText}</span>}
                          {!entry.isWicket && entry.runs === 0 && !entry.extra && <span className="text-slate-600 font-bold">Dot</span>}
                        </div>
                      </div>
                    );
                  }) : (
                    <p className="text-slate-600 italic text-center text-[10px] py-2">No balls logged in this innings.</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Pinned Bottom Controls Pad */}
        <div className={`fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-900 p-3 pb-6 md:hidden backdrop-blur-md space-y-2 select-none shadow-[0_-8px_30px_rgba(0,0,0,0.5)] ${isSuspended ? "opacity-35 pointer-events-none" : ""}`}>
          {/* Row 1: Giant Runs buttons */}
          <div className="grid grid-cols-6 gap-1.5">
            {[0, 1, 2, 3, 4, 6].map((r) => {
              const isBoundary = r === 4 || r === 6;
              const isDot = r === 0;
              return (
                <motion.button 
                  key={r}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleScoreBall(r)}
                  className={`h-11 rounded-xl border text-sm font-black flex flex-col items-center justify-center cursor-pointer transition-all ${
                    isBoundary 
                      ? r === 4 
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                        : "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                      : isDot 
                        ? "bg-slate-900/60 border-slate-850 text-slate-450" 
                        : "bg-slate-900/40 border-slate-850 text-slate-200"
                  }`}
                >
                  <span className="text-base leading-none">{r}</span>
                  <span className="text-[6px] font-black text-slate-500 tracking-wider">
                    {r === 0 ? 'DOT' : r === 4 ? 'FOUR' : r === 6 ? 'SIX' : 'RUN'}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Row 2: Extras & Wickets */}
          <div className="grid grid-cols-5 gap-1.5">
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowExtraType("wide")} className="h-9 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-400 font-black text-[9px] uppercase tracking-wider cursor-pointer">Wide</motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowExtraType("noball")} className="h-9 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-400 font-black text-[9px] uppercase tracking-wider cursor-pointer">No Ball</motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowExtraType("bye")} className="h-9 rounded-xl border border-slate-800 bg-slate-900/40 text-slate-350 font-black text-[9px] uppercase tracking-wider cursor-pointer">Bye</motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleWicket} className="h-9 rounded-xl bg-rose-600/10 border border-rose-500/30 text-rose-500 font-black text-[9px] uppercase tracking-wider cursor-pointer">Wicket</motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleRunOut} className="h-9 rounded-xl bg-amber-600/10 border border-amber-500/30 text-amber-500 font-black text-[9px] uppercase tracking-wider cursor-pointer">Run Out</motion.button>
          </div>

          {/* Row 3: Six & Out and Undo */}
          <div className="grid grid-cols-4 gap-1.5">
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleSixAndOut} className="col-span-3 h-9 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 text-white font-black text-[9px] uppercase tracking-wider shadow cursor-pointer">💥 Six & Out</motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleUndo} disabled={history.length === 0} className="h-9 rounded-xl border border-rose-950/30 bg-rose-950/10 text-rose-400 disabled:opacity-20 font-black text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer">
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* TIE / SUPER OVER MODAL */}
      <AnimatePresence>
        {showTieModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-slate-900 border-2 border-indigo-500/50 p-10 rounded-[3rem] shadow-[0_0_50px_rgba(99,102,241,0.2)] text-center max-w-sm">
              <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-6 animate-bounce" />
              <h2 className="text-3xl font-black text-white tracking-tighter mb-2 uppercase">IT'S A TIE!</h2>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed">The scores are level. Do you want to settle this with a Super Over?</p>
              <div className="space-y-3">
                <button onClick={startSuperOver} className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/30">Start Super Over</button>
                <button onClick={() => { setShowTieModal(false); handleMatchEnd(score, wickets, balls, batsmenStats, bowlerStats); }} className="w-full py-4 rounded-2xl border border-slate-800 text-slate-500 font-bold uppercase tracking-widest hover:text-white transition-all">End as Draw</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODALS (Settings, Extras, etc) */}
      <AnimatePresence>
        {showWicketModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => setShowWicketModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }} className="relative w-full max-w-sm bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl z-10 glass-card">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-tighter"><AlertTriangle className="w-5 h-5 text-rose-500" /> Wicket Details</h3>
              <div className="space-y-4">
                <select value={wicketType} onChange={(e) => setWicketType(e.target.value)} className="w-full h-14 rounded-xl border border-slate-800 bg-slate-950 px-4 text-sm text-slate-100 font-bold outline-none cursor-pointer">
                  <option value="bowled">Bowled</option><option value="caught">Caught</option><option value="lbw">LBW</option><option value="run_out">Run Out</option><option value="stumped">Stumped</option>
                </select>
                <button onClick={handleConfirmWicket} className="w-full h-14 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black uppercase tracking-widest shadow-lg">Confirm</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRunOutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => setShowRunOutModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }} className="relative w-full max-w-sm bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl z-10 glass-card space-y-6">
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-tighter flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" />
                  Run Out Details
                </h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Select batsman out and completed runs</p>
              </div>

              {/* Batsman Selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Who is out?</label>
                <div className="flex gap-2">
                  {strikerId && (
                    <button
                      type="button"
                      onClick={() => setRunOutBatsmanId(strikerId)}
                      className={`flex-1 p-3.5 rounded-xl border text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        runOutBatsmanId === strikerId 
                          ? "bg-rose-500/10 border-rose-500/40 text-rose-450" 
                          : "bg-slate-905 border-slate-850 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      {playersMap[strikerId]?.name} (Striker)
                    </button>
                  )}
                  {nonStrikerId && (
                    <button
                      type="button"
                      onClick={() => setRunOutBatsmanId(nonStrikerId)}
                      className={`flex-1 p-3.5 rounded-xl border text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        runOutBatsmanId === nonStrikerId 
                          ? "bg-rose-500/10 border-rose-500/40 text-rose-450" 
                          : "bg-slate-905 border-slate-850 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      {playersMap[nonStrikerId]?.name} (Non-Striker)
                    </button>
                  )}
                </div>
              </div>

              {/* Completed Runs */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Runs Completed</label>
                <div className="grid grid-cols-5 gap-2">
                  {[0, 1, 2, 3, 4].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRunOutRuns(r)}
                      className={`h-11 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                        runOutRuns === r 
                          ? "bg-indigo-500/20 border-indigo-500/45 text-white font-black" 
                          : "bg-slate-905 border-slate-850 text-slate-400 hover:border-slate-800"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRunOutModal(false)}
                  className="flex-1 h-12 rounded-xl border border-slate-850 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRunOut}
                  className="flex-1 h-12 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black uppercase tracking-wider shadow-lg cursor-pointer"
                >
                  Confirm Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExtraType && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowExtraType(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-sm bg-slate-900 border border-amber-500/30 p-6 sm:p-8 rounded-3xl sm:rounded-[2rem] shadow-2xl z-10">
              <h3 className="text-xl font-black text-amber-400 mb-5 flex items-center gap-3 uppercase tracking-tighter"><Plus className="w-6 h-6" /> {showExtraType} Extra</h3>
              <div className="grid grid-cols-2 gap-3">
                {(showExtraType === "bye" ? [1, 2, 3, 4] : [0, 1, 2, 3, 4]).map((r) => {
                  let mainLabel = `${r}`;
                  let subLabel = "Runs";
                  if (showExtraType === "wide" || showExtraType === "noball") {
                    mainLabel = `+${r}`;
                    subLabel = `${r + 1} Run${r + 1 !== 1 ? 's' : ''} Total`;
                  } else if (showExtraType === "bye") {
                    mainLabel = `${r}`;
                    subLabel = `${r} Bye${r !== 1 ? 's' : ''}`;
                  }
                  return (
                    <button 
                      key={r} 
                      onClick={() => { handleScoreBall(r, showExtraType); setShowExtraType(null); }} 
                      className="h-20 rounded-2xl border border-amber-500/20 bg-slate-950 text-amber-305 font-black hover:bg-amber-500/10 flex flex-col items-center justify-center p-2 transition-all cursor-pointer"
                    >
                      <span className="text-xl font-extrabold">{mainLabel}</span>
                      <span className="text-[7.5px] text-amber-500/60 uppercase font-black tracking-wider mt-1">{subLabel}</span>
                    </button>
                  );
                })}
                <button onClick={() => setShowExtraType(null)} className="col-span-2 h-14 rounded-2xl border border-slate-800 text-slate-500 font-black text-xs uppercase tracking-widest hover:text-white transition-all cursor-pointer">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBowlerSelect && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/75 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }} className="relative w-full max-w-sm bg-slate-900 border border-slate-800 p-5 sm:p-8 rounded-3xl sm:rounded-[2.5rem] shadow-2xl z-10">
              <h3 className="text-lg font-black text-white mb-1 uppercase tracking-tighter">Next Bowler</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase mb-5">{bowlingTeamName} to bowl</p>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {(innings === 1 ? (lineup.teamABatsFirst ? lineup.teamBPlayerIds : lineup.teamAPlayerIds) : (lineup.teamABatsFirst ? lineup.teamAPlayerIds : lineup.teamBPlayerIds)).map((id) => {
                  const isLast = id === lastBowlerId;
                  const overs = bowlerStats[id] ? Math.floor(bowlerStats[id].balls / 6) : 0;
                  const limited = lineup.bowlerLimit > 0 && overs >= lineup.bowlerLimit;
                  const disabled = isLast || limited;
                  return (<button key={id} disabled={disabled} onClick={() => { if (disabled) return; saveHistory(); setCurrentBowlerId(id); setShowBowlerSelect(false); if (!bowlerStats[id]) { setBowlerStats(prev => ({ ...prev, [id]: { playerId: id, runs: 0, balls: 0, wickets: 0, dot_balls_bowled: 0, hatricks: 0 } })); } }} className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${disabled ? "opacity-30 border-slate-800 bg-slate-950" : "border-slate-800 bg-slate-900 hover:border-emerald-500/50"}`}>
                      <div className="text-left"><p className="text-sm font-black text-white">{playersMap[id]?.name}</p>{isLast && <p className="text-[8px] text-rose-500 font-black uppercase mt-0.5">Last Over</p>}{limited && <p className="text-[8px] text-amber-500 font-black uppercase mt-0.5">Limit Reach</p>}</div>
                      <span className="text-[10px] font-black text-slate-500">{bowlerStats[id] ? `${getOvers(bowlerStats[id].balls)}` : '0.0'}</span>
                    </button>);
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNextBatsmanSelect && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/75 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }} className="relative w-full max-w-sm bg-slate-900 border border-slate-800 p-5 sm:p-8 rounded-3xl sm:rounded-[2.5rem] shadow-2xl z-10">
              <h3 className="text-lg font-black text-white mb-1 uppercase tracking-tighter">Next Batsman</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase mb-5">{battingTeamName} to bat</p>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {(innings === 1 ? lineup.teamAPlayerIds : lineup.teamBPlayerIds).map((id) => {
                  const out = batsmenStats[id]?.out; const playing = id === strikerId || id === nonStrikerId;
                  return (<button key={id} disabled={out || playing} onClick={() => { if (out || playing) return; if (replacingSlot === "striker") { setStrikerId(id); } else { setNonStrikerId(id); } setBatsmenStats(prev => ({ ...prev, [id]: prev[id] || { playerId: id, runs: 0, balls: 0, fours: 0, sixes: 0, out: false } })); setShowNextBatsmanSelect(false); }} className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${out || playing ? "opacity-30 border-slate-800 bg-slate-955" : "border-slate-800 bg-slate-900 hover:border-emerald-500/50"}`}>
                      <div className="text-left"><p className="text-sm font-black text-white">{playersMap[id]?.name}</p>{out && <p className="text-[8px] text-rose-500 font-black uppercase mt-0.5">Out</p>} {playing && <p className="text-[8px] text-emerald-500 font-black uppercase mt-0.5">Active</p>}</div>
                    </button>);
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => setShowSettings(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }} className="relative w-full max-w-md bg-slate-900 border border-slate-800 p-5 sm:p-8 rounded-3xl sm:rounded-[2.5rem] shadow-2xl z-10 overflow-y-auto max-h-[90vh]">
              <h3 className="text-lg font-black text-white mb-6 uppercase tracking-tighter">Match Settings</h3>
              <div className="space-y-6">
                <div><label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block mb-3">Striker</label>
                  <div className="grid grid-cols-1 gap-2">{(innings === 1 ? lineup.teamAPlayerIds : lineup.teamBPlayerIds).map(id => (<button key={id} disabled={batsmenStats[id]?.out && id !== strikerId} onClick={() => { if (id === nonStrikerId) setNonStrikerId(strikerId); setStrikerId(id); setBatsmenStats(prev => ({ ...prev, [id]: prev[id] || { playerId: id, runs: 0, balls: 0, fours: 0, sixes: 0, out: false } })); }} className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${id === strikerId ? "border-emerald-500 bg-emerald-500/10 text-white" : "border-slate-800 text-slate-500 hover:border-slate-700"}`}>{playersMap[id]?.name}</button>))}</div>
                </div>
                <div><label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-3">Non-Striker</label>
                  <div className="grid grid-cols-1 gap-2">{(innings === 1 ? lineup.teamAPlayerIds : lineup.teamBPlayerIds).map(id => (<button key={id} disabled={batsmenStats[id]?.out && id !== nonStrikerId} onClick={() => { if (id === strikerId) setStrikerId(nonStrikerId); setNonStrikerId(id); setBatsmenStats(prev => ({ ...prev, [id]: prev[id] || { playerId: id, runs: 0, balls: 0, fours: 0, sixes: 0, out: false } })); }} className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${id === nonStrikerId ? "border-indigo-500 bg-indigo-550/10 text-white" : "border-slate-800 text-slate-550 hover:border-slate-700"}`}>{playersMap[id]?.name}</button>))}</div>
                </div>
                <button onClick={() => setShowSettings(false)} className="w-full py-4 rounded-2xl bg-slate-800 text-white font-black uppercase tracking-widest hover:bg-slate-700 transition-all cursor-pointer">Done</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
