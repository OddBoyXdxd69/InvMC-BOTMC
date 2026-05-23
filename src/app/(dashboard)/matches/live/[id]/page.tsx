"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Trophy, RefreshCw, Undo2, Award, Zap, AlertTriangle, Plus, ChevronRight, UserPlus, Edit3, Target, Activity, CloudRain, Settings, Play, Pause, Check } from "lucide-react";
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

  const [lineup, setLineup] = useState<MatchLineup | null>(null);
  const [playersMap, setPlayersMap] = useState<Record<number, Player>>({});
  const [loading, setLoading] = useState(true);

  const getOvers = (ballsCount: number) => {
    const oversCount = Math.floor(ballsCount / 6);
    const remainingBalls = ballsCount % 6;
    return `${oversCount}.${remainingBalls}`;
  };

  const getEconomy = (runs: number, ballsCount: number) => {
    if (ballsCount === 0) return "0.00";
    const overs = ballsCount / 6;
    return (runs / overs).toFixed(2);
  };

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
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [wicketType, setWicketType] = useState<string>("bowled");
  
  const [showBowlerSelect, setShowBowlerSelect] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNextBatsmanSelect, setShowNextBatsmanSelect] = useState(false);
  const [replacingSlot, setReplacingSlot] = useState<"striker" | "non-striker">("striker");
  const [showRunOutModal, setShowRunOutModal] = useState(false);
  const [runOutBatsmanId, setRunOutBatsmanId] = useState<number | null>(null);
  const [runOutRuns, setRunOutRuns] = useState(0);

  // Helper temporary stores for Innings 1 stats
  const [finalInnings1Batsmen, setFinalInnings1Batsmen] = useState<Record<number, BatsmanState>>({});
  const [finalInnings1Bowlers, setFinalInnings1Bowlers] = useState<Record<number, BowlerState>>({});
  const [innings1Wkts, setInnings1Wkts] = useState(0);
  const [innings1B, setInnings1B] = useState(0);

  useEffect(() => {
    // 1. Fetch player details
    fetch("/api/players")
      .then((res) => res.json())
      .then((data) => {
        const mapping: Record<number, Player> = {};
        if (Array.isArray(data)) {
          data.forEach((p) => {
            mapping[p.id] = p;
          });
        }
        setPlayersMap(mapping);

        // 2. Load lineup from localStorage
        const cachedLineup = localStorage.getItem(`match_lineup_${matchId}`);
        if (cachedLineup) {
          const parsedLineup = JSON.parse(cachedLineup) as MatchLineup;
          setLineup(parsedLineup);

          // 3. Load saved match state if it exists (so edits or refreshes don't lose score)
          const cachedState = localStorage.getItem(`match_state_${matchId}`);
          if (cachedState) {
            const parsedState = JSON.parse(cachedState);
            setInnings(parsedState.innings);
            setScore(parsedState.score);
            setWickets(parsedState.wickets);
            setBalls(parsedState.balls);
            setOverHistory(parsedState.overHistory || []);
            setStrikerId(parsedState.strikerId);
            setNonStrikerId(parsedState.nonStrikerId);
            setCurrentBowlerId(parsedState.currentBowlerId);
            setBatsmenStats(parsedState.batsmenStats || parsedState.batsmen || {});
            setBowlerStats(parsedState.bowlerStats || parsedState.bowlers || {});
            setInnings1Total(parsedState.innings1Total);
            setFinalInnings1Batsmen(parsedState.finalInnings1Batsmen || {});
            setFinalInnings1Bowlers(parsedState.finalInnings1Bowlers || {});
            setInnings1Wkts(parsedState.innings1Wkts || 0);
            setInnings1B(parsedState.innings1B || 0);
            setBallsLog(parsedState.ballsLog || []);
            setHistory(parsedState.history || []);
            setIsSuspended(parsedState.isSuspended || false);
            setSuspendReason(parsedState.suspendReason || "");
            setLastBowlerId(parsedState.lastBowlerId || null);
            
            // Sync statistics arrays if players were added in editing mid-match
            syncLineupStats(
              parsedLineup, 
              parsedState.innings, 
              parsedState.batsmenStats || parsedState.batsmen || {}, 
              parsedState.bowlerStats || parsedState.bowlers || {}
            );
          } else {
            initializeScoring(parsedLineup);
          }
        } else {
          router.push("/matches/new");
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [matchId]);

  // Sync state to local storage to make scoring refresh-proof
  useEffect(() => {
    if (!lineup || loading) return;
    const matchState = {
      innings,
      score,
      wickets,
      balls,
      overHistory,
      strikerId,
      nonStrikerId,
      currentBowlerId,
      batsmenStats,
      bowlerStats,
      innings1Total,
      finalInnings1Batsmen,
      finalInnings1Bowlers,
      innings1Wkts,
      innings1B,
      ballsLog,
      history,
      isSuspended,
      suspendReason,
      lastBowlerId
    };
    localStorage.setItem(`match_state_${matchId}`, JSON.stringify(matchState));
  }, [
    innings,
    score,
    wickets,
    balls,
    overHistory,
    strikerId,
    nonStrikerId,
    currentBowlerId,
    batsmenStats,
    bowlerStats,
    innings1Total,
    finalInnings1Batsmen,
    finalInnings1Bowlers,
    innings1Wkts,
    innings1B,
    ballsLog,
    history,
    isSuspended,
    suspendReason,
    lastBowlerId,
    lineup,
    loading,
    matchId
  ]);

  const syncLineupStats = (
    currentLineup: MatchLineup, 
    currentInnings: number,
    currentBatsmenStats: Record<number, BatsmanState>, 
    currentBowlerStats: Record<number, BowlerState>
  ) => {
    const updatedBatsmen = { ...currentBatsmenStats };
    const updatedBowlers = { ...currentBowlerStats };
    let changed = false;

    const battingPlayerIds = currentInnings === 1 ? currentLineup.teamAPlayerIds : currentLineup.teamBPlayerIds;
    const bowlingPlayerIds = currentInnings === 1 ? currentLineup.teamBPlayerIds : currentLineup.teamAPlayerIds;

    battingPlayerIds.forEach((id) => {
      if (!updatedBatsmen[id]) {
        updatedBatsmen[id] = { playerId: id, runs: 0, balls: 0, fours: 0, sixes: 0, out: false };
        changed = true;
      }
    });

    bowlingPlayerIds.forEach((id) => {
      if (!updatedBowlers[id]) {
        updatedBowlers[id] = { playerId: id, runs: 0, balls: 0, wickets: 0 };
        changed = true;
      }
    });

    if (changed) {
      setBatsmenStats(updatedBatsmen);
      setBowlerStats(updatedBowlers);
    }
  };

  const initializeScoring = (lineupConfig: MatchLineup) => {
    const battingPlayerIds = lineupConfig.teamABatsFirst 
      ? lineupConfig.teamAPlayerIds 
      : lineupConfig.teamBPlayerIds;
    
    const bowlingPlayerIds = lineupConfig.teamABatsFirst
      ? lineupConfig.teamBPlayerIds
      : lineupConfig.teamAPlayerIds;

    const initialBatsmen: Record<number, BatsmanState> = {};
    battingPlayerIds.forEach((id) => {
      initialBatsmen[id] = { playerId: id, runs: 0, balls: 0, fours: 0, sixes: 0, out: false };
    });

    const initialBowlers: Record<number, BowlerState> = {};
    bowlingPlayerIds.forEach((id) => {
      initialBowlers[id] = { playerId: id, runs: 0, balls: 0, wickets: 0 };
    });

    setBatsmenStats(initialBatsmen);
    setBowlerStats(initialBowlers);

    setStrikerId(battingPlayerIds[0] || null);
    setNonStrikerId(lineupConfig.singleManMode ? null : (battingPlayerIds[1] || null));
    setCurrentBowlerId(bowlingPlayerIds[0] || null);
  };

  const getActiveState = (): ScorerState => ({
    innings,
    score,
    wickets,
    balls,
    overHistory,
    strikerId,
    nonStrikerId,
    currentBowlerId,
    lastBowlerId,
    batsmen: JSON.parse(JSON.stringify(batsmenStats)),
    bowlers: JSON.parse(JSON.stringify(bowlerStats)),
    innings1Total,
    ballsLog: JSON.parse(JSON.stringify(ballsLog))
  });

  const saveHistory = () => {
    setHistory((prev) => [...prev, getActiveState()]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prevState = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));

    setInnings(prevState.innings);
    setScore(prevState.score);
    setWickets(prevState.wickets);
    setBalls(prevState.balls);
    setOverHistory(prevState.overHistory);
    setStrikerId(prevState.strikerId);
    setNonStrikerId(prevState.nonStrikerId);
    setCurrentBowlerId(prevState.currentBowlerId);
    setLastBowlerId(prevState.lastBowlerId);
    setBatsmenStats(prevState.batsmen);
    setBowlerStats(prevState.bowlers);
    setInnings1Total(prevState.innings1Total);
    setBallsLog(prevState.ballsLog || []);
  };

  const handleScoreBall = (runs: number, isExtra: "wide" | "noball" | "bye" | null = null) => {
    if (!strikerId || !currentBowlerId || !lineup) return;
    saveHistory();

    let newScore = score;
    let newBalls = balls;

    const updatedBatsmen = { ...batsmenStats };
    const updatedBowlers = { ...bowlerStats };

    const striker = { ...updatedBatsmen[strikerId] };
    const bowler = { ...updatedBowlers[currentBowlerId] };

    let overSymbol = runs.toString();

    if (isExtra === "wide") {
      newScore += runs + 1;
      bowler.runs += runs + 1;
      overSymbol = runs > 0 ? `${runs}Wd` : "Wd";
      setOverHistory((prev) => [...prev, overSymbol]);
    } else if (isExtra === "noball") {
      newScore += runs + 1;
      bowler.runs += runs + 1;
      striker.runs += runs;
      striker.balls += 1;
      if (runs === 4) striker.fours++;
      if (runs === 6) striker.sixes++;
      overSymbol = runs > 0 ? `${runs}Nb` : "Nb";
      setOverHistory((prev) => [...prev, overSymbol]);
    } else if (isExtra === "bye") {
      newScore += runs;
      newBalls += 1;
      bowler.balls += 1;
      striker.balls += 1;
      overSymbol = `${runs}B`;
      setOverHistory((prev) => [...prev, overSymbol]);
      if (runs % 2 !== 0) swapStriker();
    } else {
      newScore += runs;
      newBalls += 1;
      bowler.runs += runs;
      bowler.balls += 1;
      striker.runs += runs;
      striker.balls += 1;
      if (runs === 4) striker.fours++;
      if (runs === 6) striker.sixes++;
      setOverHistory((prev) => [...prev, overSymbol]);
      if (runs % 2 !== 0) swapStriker();
    }

    updatedBatsmen[strikerId] = striker;
    updatedBowlers[currentBowlerId] = bowler;
    setScore(newScore);
    setBalls(newBalls);
    setBatsmenStats(updatedBatsmen);
    setBowlerStats(updatedBowlers);

    // Add ball entry
    const overNum = Math.floor(balls / 6);
    const ballNum = (balls % 6) + 1;
    const newEntry: BallLogEntry = {
      innings,
      over: overNum,
      ball: ballNum,
      strikerName: playersMap[strikerId]?.name || "Batsman",
      bowlerName: playersMap[currentBowlerId]?.name || "Bowler",
      runs: isExtra === "bye" ? 0 : runs,
      extra: isExtra,
      isWicket: false
    };
    setBallsLog((prev) => [...prev, newEntry]);

    // Over complete checking (6 valid balls)
    const validBallsInOver = newBalls % 6;
    if (validBallsInOver === 0 && isExtra !== "wide" && isExtra !== "noball") {
      setOverHistory([]);
      if (!lineup.singleManMode) {
        swapStriker();
      }
      setLastBowlerId(currentBowlerId);
      
      const currentOvers = newBalls / 6;
      if (currentOvers >= lineup.oversLimit) {
        handleInningsComplete(newScore, wickets, newBalls, updatedBatsmen, updatedBowlers);
      } else {
        setShowBowlerSelect(true);
      }
    }
  };

  const handleWicket = () => {
    saveHistory();
    setShowWicketModal(true);
  };

  const handleRunOut = () => {
    saveHistory();
    setRunOutBatsmanId(strikerId);
    setRunOutRuns(0);
    setShowRunOutModal(true);
  };

  const handleConfirmWicket = () => {
    if (!strikerId || !currentBowlerId || !lineup) return;
    setShowWicketModal(false);

    const newWickets = wickets + 1;
    const newBalls = balls + 1;

    const updatedBatsmen = { ...batsmenStats };
    const updatedBowlers = { ...bowlerStats };

    const striker = { ...updatedBatsmen[strikerId] };
    const bowler = { ...updatedBowlers[currentBowlerId] };

    striker.balls += 1;
    striker.out = true;
    striker.wicketHow = wicketType;

    bowler.balls += 1;
    bowler.wickets += 1;

    updatedBatsmen[strikerId] = striker;
    updatedBowlers[currentBowlerId] = bowler;

    setWickets(newWickets);
    setBalls(newBalls);
    setBatsmenStats(updatedBatsmen);
    setBowlerStats(updatedBowlers);
    setOverHistory((prev) => [...prev, "W"]);

    // Add ball entry
    const overNum = Math.floor(balls / 6);
    const ballNum = (balls % 6) + 1;
    const newEntry: BallLogEntry = {
      innings,
      over: overNum,
      ball: ballNum,
      strikerName: playersMap[strikerId]?.name || "Batsman",
      bowlerName: playersMap[currentBowlerId]?.name || "Bowler",
      runs: 0,
      extra: null,
      isWicket: true,
      wicketHow: wicketType
    };
    setBallsLog((prev) => [...prev, newEntry]);

    const teamSize = innings === 1 ? lineup.teamAPlayerIds.length : lineup.teamBPlayerIds.length;
    const maxWickets = lineup.singleMan ? teamSize : teamSize - 1;
    const currentOvers = newBalls / 6;
    const isOversEnd = newBalls % 6 === 0;

    if (newWickets >= maxWickets || currentOvers >= lineup.oversLimit) {
      handleInningsComplete(score, newWickets, newBalls, updatedBatsmen, updatedBowlers);
    } else {
      const squadIds = innings === 1 ? lineup.teamAPlayerIds : lineup.teamBPlayerIds;
      const waitingPlayers = squadIds.filter(id => !updatedBatsmen[id]?.out && id !== strikerId && id !== nonStrikerId);
      
      if (waitingPlayers.length === 0 && (lineup.singleMan || lineup.singleManMode)) {
        // Last man standing case (or single man mode with no one left)
        if (!lineup.singleManMode) {
          setStrikerId(nonStrikerId);
          setNonStrikerId(null);
        } else {
          // In single man mode, if waiting is 0, innings should probably end, 
          // but maxWickets check above handles it.
        }
        if (isOversEnd) {
          setLastBowlerId(currentBowlerId);
          setShowBowlerSelect(true);
        }
      } else {
        if (lineup.singleManMode) {
          // Replace lone striker
          setStrikerId(null);
          setNonStrikerId(null);
          setReplacingSlot("striker");
          setShowNextBatsmanSelect(true);
          if (isOversEnd) {
            setLastBowlerId(currentBowlerId);
            setShowBowlerSelect(true);
          }
        } else {
          // Standard pairs/last man logic
          if (isOversEnd) {
            setLastBowlerId(currentBowlerId);
            setStrikerId(nonStrikerId);
            setNonStrikerId(null);
            setReplacingSlot("non-striker");
            setShowNextBatsmanSelect(true);
            setShowBowlerSelect(true);
          } else {
            setStrikerId(null);
            setReplacingSlot("striker");
            setShowNextBatsmanSelect(true);
          }
        }
      }
    }
  };

  const handleConfirmRunOut = () => {
    if (!strikerId || !currentBowlerId || !runOutBatsmanId || !lineup) return;
    // Note: nonStrikerId can be null in single-man case
    setShowRunOutModal(false);

    const newWickets = wickets + 1;
    const newBalls = balls + 1; // Run out happens on a ball
    const newScore = score + runOutRuns;

    const updatedBatsmen = { ...batsmenStats };
    const updatedBowlers = { ...bowlerStats };

    const striker = { ...updatedBatsmen[strikerId] };
    const nonStriker = nonStrikerId ? { ...updatedBatsmen[nonStrikerId] } : null;
    const bowler = { ...updatedBowlers[currentBowlerId] };

    // Striker gets the runs scored on the ball
    striker.runs += runOutRuns;
    striker.balls += 1;
    if (runOutRuns === 4) striker.fours++;
    if (runOutRuns === 6) striker.sixes++;

    // Mark selected batsman as out
    if (runOutBatsmanId === strikerId) {
      striker.out = true;
      striker.wicketHow = "run_out";
    } else if (nonStrikerId && runOutBatsmanId === nonStrikerId && nonStriker) {
      nonStriker.out = true;
      nonStriker.wicketHow = "run_out";
    }

    // Bowler gets the ball but NO wicket (run out is not bowler's wicket)
    bowler.balls += 1;

    updatedBatsmen[strikerId] = striker;
    if (nonStrikerId && nonStriker) {
      updatedBatsmen[nonStrikerId] = nonStriker;
    }
    updatedBowlers[currentBowlerId] = bowler;

    setScore(newScore);
    setWickets(newWickets);
    setBalls(newBalls);
    setBatsmenStats(updatedBatsmen);
    setBowlerStats(updatedBowlers);
    setOverHistory((prev) => [...prev, `${runOutRuns}W`]);

    // Add ball entry
    const overNum = Math.floor(balls / 6);
    const ballNum = (balls % 6) + 1;
    const newEntry: BallLogEntry = {
      innings,
      over: overNum,
      ball: ballNum,
      strikerName: playersMap[strikerId]?.name || "Batsman",
      bowlerName: playersMap[currentBowlerId]?.name || "Bowler",
      runs: runOutRuns,
      extra: null,
      isWicket: true,
      wicketHow: "run_out"
    };
    setBallsLog((prev) => [...prev, newEntry]);

    const teamSize = innings === 1 ? lineup.teamAPlayerIds.length : lineup.teamBPlayerIds.length;
    const maxWickets = lineup.singleMan ? teamSize : teamSize - 1;
    const currentOvers = newBalls / 6;
    const isOversEnd = newBalls % 6 === 0;

    if (newWickets >= maxWickets || currentOvers >= lineup.oversLimit) {
      handleInningsComplete(newScore, newWickets, newBalls, updatedBatsmen, updatedBowlers);
    } else {
      const isOutStriker = runOutBatsmanId === strikerId;
      const wasOversEnd = newBalls % 6 === 0;
      
      const squadIds = innings === 1 ? lineup.teamAPlayerIds : lineup.teamBPlayerIds;

      if (lineup.singleManMode) {
        setStrikerId(null);
        setNonStrikerId(null);
        setReplacingSlot("striker");
        setShowNextBatsmanSelect(true);
        if (wasOversEnd) {
          setLastBowlerId(currentBowlerId);
          setShowBowlerSelect(true);
        }
        return;
      }

      // Determine who stayed in
      const remainingBatsmanId = isOutStriker ? nonStrikerId : strikerId;
      
      // Handle Strike Rotation based on runs completed
      let finalStrikerId: number | null = null;
      let finalNonStrikerId: number | null = null;
      let slotToFill: "striker" | "non-striker" = "striker";

      const isOddRuns = runOutRuns % 2 !== 0;

      if (isOutStriker) {
        // Striker is out. 
        if (isOddRuns) {
          // They crossed. Remaining (old non-striker) is now STRIKER.
          finalStrikerId = nonStrikerId;
          finalNonStrikerId = null;
          slotToFill = "non-striker";
        } else {
          // They didn't cross. Remaining (old non-striker) stays NON-STRIKER.
          finalStrikerId = null;
          finalNonStrikerId = nonStrikerId;
          slotToFill = "striker";
        }
      } else {
        // Non-striker is out.
        if (isOddRuns) {
          // They crossed. Remaining (old striker) is now NON-STRIKER.
          finalStrikerId = null;
          finalNonStrikerId = strikerId;
          slotToFill = "striker";
        } else {
          // They didn't cross. Remaining (old striker) stays STRIKER.
          finalStrikerId = strikerId;
          finalNonStrikerId = null;
          slotToFill = "non-striker";
        }
      }

      const waitingPlayers = squadIds.filter(id => !updatedBatsmen[id]?.out && id !== finalStrikerId && id !== finalNonStrikerId);

      if (waitingPlayers.length === 0 && lineup.singleMan) {
        // Last man standing case
        setStrikerId(finalStrikerId || finalNonStrikerId);
        setNonStrikerId(null);
        if (wasOversEnd) {
          setLastBowlerId(currentBowlerId);
          setShowBowlerSelect(true);
        }
      } else {
        // If it's the end of the over, everyone rotates again
        if (wasOversEnd) {
          setLastBowlerId(currentBowlerId);
          // Swap slots: current striker becomes non-striker, and vice-versa
          // But one is null.
          if (slotToFill === "striker") {
            // non-striker is occupied. It becomes the NEW striker end after over rotation.
            setStrikerId(finalNonStrikerId);
            setNonStrikerId(null);
            setReplacingSlot("non-striker");
          } else {
            // striker is occupied. It becomes the NEW non-striker end.
            setStrikerId(null);
            setNonStrikerId(finalStrikerId);
            setReplacingSlot("striker");
          }
          setShowNextBatsmanSelect(true);
          setShowBowlerSelect(true);
        } else {
          setStrikerId(finalStrikerId);
          setNonStrikerId(finalNonStrikerId);
          setReplacingSlot(slotToFill);
          setShowNextBatsmanSelect(true);
        }
      }
    }
  };

  const handleSixAndOut = () => {
    if (!strikerId || !currentBowlerId || !lineup) return;
    saveHistory();

    // In gully cricket: six means OUT, but 0 runs scored (six not counted)
    const newScore = score; // NO runs added
    const newBalls = balls + 1;
    const newWickets = wickets + 1;

    const updatedBatsmen = { ...batsmenStats };
    const updatedBowlers = { ...bowlerStats };

    const striker = { ...updatedBatsmen[strikerId] };
    const bowler = { ...updatedBowlers[currentBowlerId] };

    // Striker: 0 runs, 1 ball, NO six counted, OUT
    striker.balls += 1;
    striker.out = true;
    striker.wicketHow = "six_out";

    // Bowler: 0 runs conceded, 1 ball, 1 wicket
    bowler.balls += 1;
    bowler.wickets += 1;

    updatedBatsmen[strikerId] = striker;
    updatedBowlers[currentBowlerId] = bowler;

    setScore(newScore);
    setBalls(newBalls);
    setWickets(newWickets);
    setBatsmenStats(updatedBatsmen);
    setBowlerStats(updatedBowlers);
    setOverHistory((prev) => [...prev, "6W"]);

    // Add ball entry
    const overNum = Math.floor(balls / 6);
    const ballNum = (balls % 6) + 1;
    const newEntry: BallLogEntry = {
      innings,
      over: overNum,
      ball: ballNum,
      strikerName: playersMap[strikerId]?.name || "Batsman",
      bowlerName: playersMap[currentBowlerId]?.name || "Bowler",
      runs: 0,
      extra: "six_out",
      isWicket: true,
      wicketHow: "six_out"
    };
    setBallsLog((prev) => [...prev, newEntry]);

    const teamSize = innings === 1 ? lineup.teamAPlayerIds.length : lineup.teamBPlayerIds.length;
    const maxWickets = lineup.singleMan ? teamSize : teamSize - 1;
    const currentOvers = newBalls / 6;
    const isOversEnd = newBalls % 6 === 0;

    if (newWickets >= maxWickets || currentOvers >= lineup.oversLimit) {
      handleInningsComplete(newScore, newWickets, newBalls, updatedBatsmen, updatedBowlers);
    } else {
      const squadIds = innings === 1 ? lineup.teamAPlayerIds : lineup.teamBPlayerIds;
      const waitingPlayers = squadIds.filter(id => !updatedBatsmen[id]?.out && id !== nonStrikerId);

      if (lineup.singleManMode) {
        setStrikerId(null);
        setNonStrikerId(null);
        setReplacingSlot("striker");
        setShowNextBatsmanSelect(true);
        if (isOversEnd) {
          setLastBowlerId(currentBowlerId);
          setShowBowlerSelect(true);
        }
        return;
      }

      if (waitingPlayers.length === 0 && (lineup.singleMan || lineup.singleManMode)) {
        // Last man standing case
        if (!lineup.singleManMode) {
          setStrikerId(nonStrikerId);
          setNonStrikerId(null);
        }
        if (isOversEnd) {
          setLastBowlerId(currentBowlerId);
          setShowBowlerSelect(true);
        }
      } else {
        if (isOversEnd) {
          setLastBowlerId(currentBowlerId);
          setStrikerId(nonStrikerId);
          setNonStrikerId(null);
          setReplacingSlot("non-striker");
          setShowNextBatsmanSelect(true);
          setShowBowlerSelect(true);
        } else {
          setStrikerId(null);
          setReplacingSlot("striker");
          setShowNextBatsmanSelect(true);
        }
      }
    }
  };

  const handleSuspendMatch = () => {
    setIsSuspended(true);
    setSuspendReason("Rain Delay");
  };

  const handleResumeMatch = () => {
    setIsSuspended(false);
    setSuspendReason("");
  };

  const swapStriker = () => {
    if (!strikerId || !nonStrikerId) return;
    setStrikerId((prev) => {
      const next = nonStrikerId;
      setNonStrikerId(prev);
      return next;
    });
  };

  const handleInningsComplete = (
    finalScore: number, 
    finalWickets: number, 
    finalBalls: number,
    finalBatsmen: Record<number, BatsmanState>,
    finalBowlers: Record<number, BowlerState>
  ) => {
    if (!lineup) return;

    if (innings === 1) {
      alert(`Innings 1 Complete! ${lineup.teamAName} scored ${finalScore}/${finalWickets} in ${getOvers(finalBalls)} overs.`);
      
      // Store temporary final stats of Innings 1
      setFinalInnings1Batsmen(finalBatsmen);
      setFinalInnings1Bowlers(finalBowlers);
      setInnings1Wkts(finalWickets);
      setInnings1B(finalBalls);
      
      setInnings(2);
      setInnings1Total(finalScore);

      // Reset score, wickets, balls for Innings 2
      setScore(0);
      setWickets(0);
      setBalls(0);
      setOverHistory([]);
      setLastBowlerId(null);

      // Initialize Innings 2: Team B bats, Team A bowls
      const initialBatsmen: Record<number, BatsmanState> = {};
      lineup.teamBPlayerIds.forEach((id) => {
        initialBatsmen[id] = { playerId: id, runs: 0, balls: 0, fours: 0, sixes: 0, out: false };
      });

      const initialBowlers: Record<number, BowlerState> = {};
      lineup.teamAPlayerIds.forEach((id) => {
        initialBowlers[id] = { playerId: id, runs: 0, balls: 0, wickets: 0 };
      });

      setBatsmenStats(initialBatsmen);
      setBowlerStats(initialBowlers);
      setStrikerId(lineup.teamBPlayerIds[0] || null);
      setNonStrikerId(lineup.singleManMode ? null : (lineup.teamBPlayerIds[1] || null));
      setCurrentBowlerId(lineup.teamAPlayerIds[0] || null);
      
      setHistory([]);
    } else {
      handleMatchEnd(finalScore, finalWickets, finalBalls, finalBatsmen, finalBowlers);
    }
  };

  const handleMatchEnd = async (
    finalScore: number, 
    finalWickets: number, 
    finalBalls: number,
    finalBatsmen: Record<number, BatsmanState>,
    finalBowlers: Record<number, BowlerState>
  ) => {
    if (!lineup || isCompleting) return;
    setIsCompleting(true);

    let winner = "Tie";
    if (finalScore > innings1Total) {
      winner = lineup.teamBName;
    } else if (finalScore < innings1Total) {
      winner = lineup.teamAName;
    }

    alert(`Match Completed! Winner: ${winner}. Saving match details...`);

    const playerStats: any[] = [];
    
    // Process Team A stats (First innings batting, second innings bowling)
    lineup.teamAPlayerIds.forEach((id) => {
      const bat = finalInnings1Batsmen[id] || finalBatsmen[id] || { runs: 0, balls: 0, fours: 0, sixes: 0, out: false };
      const bowl = finalBowlers[id] || { runs: 0, balls: 0, wickets: 0 };
      playerStats.push({
        player_id: id,
        team_name: lineup.teamAName,
        runs_scored: bat.runs,
        balls_faced: bat.balls,
        fours: bat.fours,
        sixes: bat.sixes,
        wickets_taken: bowl.wickets,
        runs_conceded: bowl.runs,
        balls_bowled: bowl.balls,
        wicket_how: bat.wicketHow || (bat.out ? "out" : "not_out")
      });
    });

    // Process Team B stats (First innings bowling, second innings batting)
    lineup.teamBPlayerIds.forEach((id) => {
      const bat = finalBatsmen[id] || finalInnings1Batsmen[id] || { runs: 0, balls: 0, fours: 0, sixes: 0, out: false };
      const bowl = finalInnings1Bowlers[id] || { runs: 0, balls: 0, wickets: 0 };
      playerStats.push({
        player_id: id,
        team_name: lineup.teamBName,
        runs_scored: bat.runs,
        balls_faced: bat.balls,
        fours: bat.fours,
        sixes: bat.sixes,
        wickets_taken: bowl.wickets,
        runs_conceded: bowl.runs,
        balls_bowled: bowl.balls,
        wicket_how: bat.wicketHow || (bat.out ? "out" : "not_out")
      });
    });

    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          match_id: Number(matchId),
          winner,
          team_a_runs: innings1Total,
          team_a_wickets: innings1Wkts,
          team_a_balls: innings1B,
          team_b_runs: finalScore,
          team_b_wickets: finalWickets,
          team_b_balls: finalBalls,
          player_stats: playerStats,
          balls_log: JSON.stringify(ballsLog)
        }),
      });

      if (res.ok) {
        localStorage.removeItem(`match_lineup_${matchId}`);
        localStorage.removeItem(`match_state_${matchId}`);
        router.push(`/matches/${matchId}`);
      } else {
        alert("Failed to save match statistics to database.");
      }
    } catch (err) {
      alert("Error saving match details.");
    }
  };

  // Intercept Innings 1 metrics on mount/reloads if already in Innings 2
  useEffect(() => {
    if (innings === 2 && Object.keys(finalInnings1Batsmen).length === 0 && history.length > 0) {
      setFinalInnings1Batsmen(history[history.length - 1]?.batsmen || {});
      setFinalInnings1Bowlers(history[history.length - 1]?.bowlers || {});
      setInnings1Wkts(history[history.length - 1]?.wickets || 0);
      setInnings1B(history[history.length - 1]?.balls || 0);
    }
  }, [innings, history]);

  // Live Score calculations
  const runRate = balls > 0 ? ((score * 6) / balls).toFixed(2) : "0.00";
  const requiredRuns = innings === 2 ? (innings1Total + 1) - score : 0;
  const remainingBalls = lineup ? (lineup.oversLimit * 6) - balls : 0;
  const requiredRate = remainingBalls > 0 ? ((requiredRuns * 6) / remainingBalls).toFixed(2) : "0.00";

  // Match complete checking for live innings 2 runs chase
  useEffect(() => {
    if (innings === 2 && !isCompleting) {
      if (score > innings1Total || remainingBalls <= 0) {
        setIsCompleting(true);
        handleMatchEnd(score, wickets, balls, batsmenStats, bowlerStats);
      }
    }
  }, [innings, score, remainingBalls, innings1Total, isCompleting, wickets, balls, batsmenStats, bowlerStats]);

  if (loading || !lineup) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 text-sm italic">Initializing Live Scorer...</p>
      </div>
    );
  }

  const battingTeamName = innings === 1 ? lineup.teamAName : lineup.teamBName;
  const bowlingTeamName = innings === 1 ? lineup.teamBName : lineup.teamAName;

  // Filter out recent balls log for the current innings to display
  const currentInningsBallsLog = ballsLog.filter(b => b.innings === innings).reverse();

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 select-none">
      {/* Suspended Banner */}
      {isSuspended && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <CloudRain className="w-6 h-6 text-amber-400 animate-pulse" />
            <div>
              <p className="text-sm font-bold text-amber-300">Match Suspended — {suspendReason || "Rain Delay"}</p>
              <p className="text-xs text-amber-400/70">All scoring is paused. Resume when ready.</p>
            </div>
          </div>
          <button
            onClick={handleResumeMatch}
            className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5 shadow-lg"
          >
            <Play className="w-4 h-4" /> Resume Match
          </button>
        </motion.div>
      )}

      {/* Live Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 rounded-2xl border border-slate-900 glass-card gap-4 shadow-xl relative overflow-hidden">
        <div className="z-10">
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
            <span className={`h-2 w-2 rounded-full ${isSuspended ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`} />
            {isSuspended ? 'Suspended' : 'Live Scorer'} — Innings {innings}
          </p>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {lineup.teamAName} vs {lineup.teamBName}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 z-10">
          <button
            onClick={() => setShowSettings(true)}
            className="h-10 px-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <Settings className="w-4 h-4" /> Settings
          </button>
          <button
            onClick={() => router.push(`/matches/live/${matchId}/edit`)}
            className="h-10 px-3 rounded-xl border border-slate-800 bg-slate-900/40 text-slate-300 hover:text-white hover:border-slate-700 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <Edit3 className="w-4 h-4" /> Edit
          </button>
          <button
            onClick={handleUndo}
            disabled={history.length === 0 || isSuspended}
            className="h-10 px-3 rounded-xl border border-slate-800 bg-slate-900/40 text-slate-300 hover:text-white hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <Undo2 className="w-4 h-4" /> Undo
          </button>
          {!isSuspended ? (
            <button
              onClick={handleSuspendMatch}
              className="h-10 px-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            >
              <CloudRain className="w-4 h-4" /> Rain
            </button>
          ) : (
            <button
              onClick={handleResumeMatch}
              className="h-10 px-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            >
              <Play className="w-4 h-4" /> Resume
            </button>
          )}
        </div>
      </div>

      {/* Main Scoreboard Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Score & Run Rate Display */}
        <section className="md:col-span-2 p-6 sm:p-8 rounded-2xl border border-slate-900 glass-card shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute right-0 top-0 w-36 h-36 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{battingTeamName} batting</p>
              <h2 className="text-5xl sm:text-6xl font-black text-white tracking-tighter mt-2">
                {score} <span className="text-3xl text-slate-500 font-light">/ {wickets}</span>
              </h2>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Overs</p>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-2">
                {getOvers(balls)} <span className="text-sm font-semibold text-slate-500">/ {lineup.oversLimit}</span>
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-900/60">
            <div>
              <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold block mb-1">Run Rate</span>
              <span className="text-base font-extrabold text-emerald-400">{runRate}</span>
            </div>
            
            {innings === 2 && (
              <>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold block mb-1">Target</span>
                  <span className="text-base font-extrabold text-indigo-400">{innings1Total + 1}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold block mb-1">Runs Required</span>
                  <span className="text-base font-extrabold text-white">{requiredRuns}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold block mb-1">Req. Rate</span>
                  <span className="text-base font-extrabold text-indigo-400">{requiredRate}</span>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Batsmen & Bowlers Active Panel */}
        <section className="p-6 rounded-2xl border border-slate-900 glass-card shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-900 pb-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Field</h3>
            <button 
              onClick={() => { saveHistory(); swapStriker(); }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-all text-[10px] font-black uppercase tracking-tighter"
            >
              <RefreshCw className="w-3 h-3" /> Swap
            </button>
          </div>
          <div className="space-y-4">
            {/* Batsmen */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Batsman</span>
                <span>R (B)</span>
              </div>
              
              {strikerId && batsmenStats[strikerId] && (
                <div 
                  onClick={() => setShowSettings(true)}
                  className="flex justify-between items-center p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 cursor-pointer hover:border-emerald-500/40 transition-all"
                >
                  <span className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    {playersMap[strikerId]?.name} *
                  </span>
                  <span className="text-sm font-bold text-emerald-400">
                    {batsmenStats[strikerId].runs} ({batsmenStats[strikerId].balls})
                  </span>
                </div>
              )}

              {nonStrikerId && batsmenStats[nonStrikerId] && (
                <div 
                  onClick={() => setShowSettings(true)}
                  className="flex justify-between items-center p-2 rounded-lg bg-slate-900/50 border border-slate-800 cursor-pointer hover:border-slate-700 transition-all"
                >
                  <span className="text-sm font-semibold text-slate-300">
                    {playersMap[nonStrikerId]?.name}
                  </span>
                  <span className="text-sm font-bold text-slate-400">
                    {batsmenStats[nonStrikerId].runs} ({batsmenStats[nonStrikerId].balls})
                  </span>
                </div>
              )}
            </div>

            {/* Bowler */}
            <div className="space-y-2 pt-2 border-t border-slate-900/60">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Bowler</span>
                <span>O-R-W</span>
              </div>
              {currentBowlerId && bowlerStats[currentBowlerId] && (
                <div 
                  onClick={() => setShowBowlerSelect(true)}
                  className="flex justify-between items-center p-2 rounded-lg bg-slate-900/50 border border-slate-800 cursor-pointer hover:border-emerald-500/30 transition-all"
                >
                  <span className="text-sm font-semibold text-white">
                    {playersMap[currentBowlerId]?.name}
                  </span>
                  <span className="text-sm font-bold text-slate-300">
                    {getOvers(bowlerStats[currentBowlerId].balls)} - {bowlerStats[currentBowlerId].runs} - {bowlerStats[currentBowlerId].wickets}
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Ball History Over Feed */}
      <div className="p-4 rounded-xl border border-slate-900 bg-slate-900/10 flex items-center justify-between gap-4">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">This Over:</span>
        <div className="flex flex-wrap gap-1.5 flex-1 justify-end">
          {overHistory.length > 0 ? (
            overHistory.map((val, i) => (
              <span 
                key={i} 
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold border ${
                  val === "W" || val.includes("W")
                    ? "bg-rose-500/20 border-rose-500/40 text-rose-400"
                    : val.includes("Wd") || val.includes("Nb")
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                    : val === "4" || val === "6"
                    ? "bg-emerald-500/25 border-emerald-500/50 text-emerald-400 font-black scale-110"
                    : "bg-slate-900 border-slate-800 text-slate-400"
                }`}
              >
                {val}
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-600 font-light italic">Waiting for first ball...</span>
          )}
        </div>
      </div>

      {/* Scoring Controller Button Pads */}
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${isSuspended ? 'opacity-30 pointer-events-none' : ''}`}>
        {/* Run Clickers */}
        <section className="md:col-span-2 p-6 rounded-2xl border border-slate-900 glass-card space-y-4 shadow-xl">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-900 pb-2">Runs Pad <span className="text-slate-600">(Max boundary: 4)</span></h3>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {[0, 1, 2, 3, 4].map((r) => (
              <button
                key={r}
                onClick={() => handleScoreBall(r)}
                disabled={isSuspended}
                className={`h-16 rounded-xl border font-black text-xl transition-all cursor-pointer flex flex-col items-center justify-center ${
                  r === 4
                    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 hover:scale-105 active:scale-95"
                    : "bg-slate-900 border-slate-800 text-white hover:bg-slate-800 hover:scale-105 active:scale-95"
                }`}
              >
                <span>{r}</span>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{r === 4 ? 'FOUR' : 'Runs'}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Extras, Wickets & Six and Out Pad */}
        <section className="p-6 rounded-2xl border border-slate-900 glass-card space-y-4 shadow-xl">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-900 pb-2">Dismissals & Extras</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowExtraType(showExtraType === "wide" ? null : "wide")}
              disabled={isSuspended}
              className={`h-12 rounded-xl border transition-all font-semibold text-xs cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 ${
                showExtraType === "wide" 
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300" 
                  : "border-slate-800 bg-slate-900 text-amber-400 hover:bg-slate-800"
              }`}
            >
              Wide
            </button>
            <button
              onClick={() => setShowExtraType(showExtraType === "noball" ? null : "noball")}
              disabled={isSuspended}
              className={`h-12 rounded-xl border transition-all font-semibold text-xs cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 ${
                showExtraType === "noball" 
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300" 
                  : "border-slate-800 bg-slate-900 text-amber-400 hover:bg-slate-800"
              }`}
            >
              No Ball
            </button>

            <button
              onClick={() => setShowExtraType(showExtraType === "bye" ? null : "bye")}
              disabled={isSuspended}
              className={`h-12 rounded-xl border transition-all font-semibold text-xs cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 ${
                showExtraType === "bye" 
                  ? "bg-slate-700 border-slate-600 text-white" 
                  : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
            >
              Bye
            </button>
            <button
              onClick={handleWicket}
              disabled={isSuspended}
              className="h-12 rounded-xl bg-rose-650 hover:bg-rose-550 text-white border border-rose-900/40 transition-all font-extrabold text-xs cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/10"
            >
              OUT / Wicket
            </button>
            <button
              onClick={handleRunOut}
              disabled={isSuspended}
              className="h-12 rounded-xl bg-amber-600 hover:bg-amber-500 text-white border border-amber-900/40 transition-all font-extrabold text-xs cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 shadow-md shadow-amber-600/10"
            >
              Run Out
            </button>
            <button
              onClick={handleSixAndOut}
              disabled={isSuspended}
              className="col-span-2 h-14 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white transition-all font-black text-xs cursor-pointer active:scale-95 flex flex-col items-center justify-center shadow-lg shadow-rose-600/15"
            >
              <span>💥 Common Out</span>
              <span className="text-[8px] font-bold uppercase tracking-widest text-white/80 mt-0.5">Hits Boundary → OUT (0 runs counted)</span>
            </button>
          </div>
        </section>
      </div>

      {/* PRO Bowling Scorecard panel */}
      <section className="p-6 rounded-2xl border border-slate-900 glass-card space-y-4 shadow-xl">
        <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-900">
          <Activity className="w-4 h-4" /> PRO BOWLING SCORECARD ({bowlingTeamName})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-500 font-bold uppercase tracking-wider border-b border-slate-900/60">
                <th className="py-2 px-1">Bowler</th>
                <th className="py-2 px-1 text-center">O</th>
                <th className="py-2 px-1 text-center">R</th>
                <th className="py-2 px-1 text-center">W</th>
                <th className="py-2 px-1 text-right">Econ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/40">
              {(innings === 1 ? lineup.teamBPlayerIds : lineup.teamAPlayerIds)
                .filter(id => bowlerStats[id] && bowlerStats[id].balls > 0)
                .map(id => (
                  <tr key={id} className={`transition-colors ${id === currentBowlerId ? 'bg-emerald-500/5' : ''}`}>
                    <td className="py-3 px-1 font-semibold text-slate-200">
                      <div className="flex items-center gap-1.5">
                        {id === currentBowlerId && <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                        {playersMap[id]?.name}
                      </div>
                    </td>
                    <td className="py-3 px-1 text-center font-medium text-slate-400">{getOvers(bowlerStats[id].balls)}</td>
                    <td className="py-3 px-1 text-center font-bold text-slate-300">{bowlerStats[id].runs}</td>
                    <td className="py-3 px-1 text-center font-black text-white">{bowlerStats[id].wickets}</td>
                    <td className="py-3 px-1 text-right font-medium text-emerald-400/80">{getEconomy(bowlerStats[id].runs, bowlerStats[id].balls)}</td>
                  </tr>
                ))}
              {Object.values(bowlerStats).filter(b => b.balls > 0).length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 italic font-light">
                    No bowlers have delivered yet in this innings.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODALS & OVERLAYS */}
      
      {/* 1. Wicket Modal */}
      <AnimatePresence>
        {showWicketModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
              onClick={() => setShowWicketModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl z-10 glass-card"
            >
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse" /> Dismissal Details
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Dismissal How</label>
                  <select
                    value={wicketType}
                    onChange={(e) => setWicketType(e.target.value)}
                    className="flex h-12 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-rose-500 transition-all cursor-pointer"
                  >
                    <option value="bowled">Bowled</option>
                    <option value="caught">Caught</option>
                    <option value="lbw">LBW</option>
                    <option value="run_out">Run Out</option>
                    <option value="stumped">Stumped</option>
                  </select>
                </div>
                <button
                  onClick={handleConfirmWicket}
                  className="w-full h-12 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm cursor-pointer shadow-lg transition-all active:scale-[0.98]"
                >
                  Confirm Dismissal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 1.5 Run Out Modal */}
      <AnimatePresence>
        {showRunOutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
              onClick={() => setShowRunOutModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl z-10 glass-card"
            >
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" /> Run Out Details
              </h3>
              
              <div className="space-y-6">
                {/* 1. Who is out */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Who is out?</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[strikerId, nonStrikerId].map(id => id && (
                      <button
                        key={id}
                        onClick={() => setRunOutBatsmanId(id)}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                          runOutBatsmanId === id 
                            ? "bg-amber-500/20 border-amber-500/50 text-amber-400" 
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        {playersMap[id]?.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Runs completed */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Runs Completed (0-6)</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 1, 2, 3, 4, 5, 6].map(r => (
                      <button
                        key={r}
                        onClick={() => setRunOutRuns(r)}
                        className={`h-10 rounded-lg border text-sm font-black transition-all ${
                          runOutRuns === r 
                            ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" 
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleConfirmRunOut}
                  disabled={!runOutBatsmanId}
                  className="w-full h-12 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm cursor-pointer shadow-lg transition-all active:scale-[0.98] disabled:opacity-30"
                >
                  Confirm Run Out
                </button>
                <button
                  onClick={() => setShowRunOutModal(false)}
                  className="w-full text-slate-500 hover:text-slate-300 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Bowler Selection Modal */}
      <AnimatePresence>
        {showBowlerSelect && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl z-10 glass-card"
            >
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-400" /> Select Bowler
              </h3>
              <p className="text-xs text-slate-400 mb-4 font-light leading-relaxed">
                Over completed! Select bowler for the next over from {bowlingTeamName}.
              </p>
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {(innings === 1 ? (lineup.teamABatsFirst ? lineup.teamBPlayerIds : lineup.teamAPlayerIds) : (lineup.teamABatsFirst ? lineup.teamAPlayerIds : lineup.teamBPlayerIds))
                  .map((id) => {
                    const isLastBowler = id === lastBowlerId;
                    const oversDone = bowlerStats[id] ? Math.floor(bowlerStats[id].balls / 6) : 0;
                    const hasReachedLimit = lineup.bowlerLimit > 0 && oversDone >= lineup.bowlerLimit;
                    const isDisabled = isLastBowler || hasReachedLimit;

                    return (
                      <button
                        key={id}
                        disabled={isDisabled}
                        onClick={() => {
                          if (isDisabled) return;
                          saveHistory();
                          setCurrentBowlerId(id);
                          if (!bowlerStats[id]) {
                            setBowlerStats(prev => ({
                              ...prev,
                              [id]: { playerId: id, runs: 0, balls: 0, wickets: 0 }
                            }));
                          }
                          setShowBowlerSelect(false);
                        }}
                        className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left ${
                          isDisabled
                            ? "border-slate-800/50 bg-slate-900/10 text-slate-600 cursor-not-allowed opacity-40"
                            : "border-slate-800 bg-slate-900/30 text-white hover:border-emerald-500/30 hover:bg-emerald-500/5 cursor-pointer"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{playersMap[id]?.name}</span>
                          {isLastBowler && (
                            <span className="text-[9px] bg-rose-500/15 text-rose-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                              Last Over
                            </span>
                          )}
                          {hasReachedLimit && (
                            <span className="text-[9px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                              Limit Reached
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {bowlerStats[id] ? `${getOvers(bowlerStats[id].balls)}-${bowlerStats[id].runs}-${bowlerStats[id].wickets}` : '0.0-0-0'}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Next Batsman Selection Modal */}
      <AnimatePresence>
        {showNextBatsmanSelect && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl z-10 glass-card"
            >
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" /> Select Next Batsman
              </h3>
              <p className="text-xs text-slate-400 mb-4 font-light leading-relaxed">
                Wicket fell! Select the next batsman from {battingTeamName} to walk out onto the pitch.
              </p>
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {(innings === 1 ? lineup.teamAPlayerIds : lineup.teamBPlayerIds)
                  .map((id) => {
                    const isOut = batsmenStats[id]?.out;
                    const isCurrent = id === strikerId || id === nonStrikerId;
                    const isDisabled = isOut || isCurrent;
                    
                    return (
                      <button
                        key={id}
                        disabled={isDisabled}
                        onClick={() => {
                          if (isDisabled) return;
                          if (replacingSlot === "striker") {
                            setStrikerId(id);
                          } else {
                            setNonStrikerId(id);
                          }
                          
                          setBatsmenStats(prev => ({
                            ...prev,
                            [id]: prev[id] || { playerId: id, runs: 0, balls: 0, fours: 0, sixes: 0, out: false }
                          }));
                          
                          setShowNextBatsmanSelect(false);
                        }}
                        className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left ${
                          isDisabled
                            ? "border-slate-800/50 bg-slate-900/10 text-slate-600 cursor-not-allowed opacity-40"
                            : "border-slate-800 bg-slate-900/30 text-white hover:border-emerald-500/30 hover:bg-emerald-500/5 cursor-pointer"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{playersMap[id]?.name}</span>
                          {isOut && (
                            <span className="text-[9px] bg-rose-500/15 text-rose-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                              OUT
                            </span>
                          )}
                          {isCurrent && (
                            <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                              Playing
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest">
                          {playersMap[id]?.role === "all_rounder" ? "All-Rounder" : playersMap[id]?.role === "batsman" ? "Batsman" : "Bowler"}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Unified Settings Modal — Change Striker, Non-Striker, Bowler */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
              onClick={() => setShowSettings(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl z-10 glass-card max-h-[85vh] overflow-y-auto"
            >
              <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-400" /> Match Settings
              </h3>
              <p className="text-xs text-slate-400 mb-6">Change the current striker, non-striker, and bowler.</p>

              {/* Striker Selection */}
              <div className="space-y-2 mb-6">
                <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Zap className="w-3 h-3" /> Striker (Facing)
                </label>
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {(innings === 1 ? lineup.teamAPlayerIds : lineup.teamBPlayerIds)
                    .map(id => {
                      const isOut = batsmenStats[id]?.out && id !== strikerId;
                      return (
                        <button
                          key={id}
                          disabled={isOut}
                          onClick={() => {
                            if (isOut) return;
                            if (id === nonStrikerId) {
                              setNonStrikerId(strikerId);
                            }
                            setStrikerId(id);
                            setBatsmenStats(prev => ({
                              ...prev,
                              [id]: prev[id] || { playerId: id, runs: 0, balls: 0, fours: 0, sixes: 0, out: false }
                            }));
                          }}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm font-semibold text-left transition-all ${
                            isOut
                              ? "border-slate-800/50 bg-slate-900/10 text-slate-600 cursor-not-allowed opacity-40"
                              : id === strikerId 
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                                : "bg-slate-900/30 border-slate-800 text-slate-300 hover:border-slate-700 cursor-pointer"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{playersMap[id]?.name}</span>
                            {isOut && (
                              <span className="text-[9px] bg-rose-500/15 text-rose-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                OUT
                              </span>
                            )}
                          </div>
                          {id === strikerId && <Check className="w-4 h-4 text-emerald-400" />}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Non-Striker Selection */}
              <div className="space-y-2 mb-6">
                <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <UserPlus className="w-3 h-3" /> Non-Striker
                </label>
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {(innings === 1 ? lineup.teamAPlayerIds : lineup.teamBPlayerIds)
                    .map(id => {
                      const isOut = batsmenStats[id]?.out && id !== nonStrikerId;
                      return (
                        <button
                          key={id}
                          disabled={isOut}
                          onClick={() => {
                            if (isOut) return;
                            if (id === strikerId) {
                              setStrikerId(nonStrikerId);
                            }
                            setNonStrikerId(id);
                            setBatsmenStats(prev => ({
                              ...prev,
                              [id]: prev[id] || { playerId: id, runs: 0, balls: 0, fours: 0, sixes: 0, out: false }
                            }));
                          }}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm font-semibold text-left transition-all ${
                            isOut
                              ? "border-slate-800/50 bg-slate-900/10 text-slate-600 cursor-not-allowed opacity-40"
                              : id === nonStrikerId 
                                ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" 
                                : "bg-slate-900/30 border-slate-800 text-slate-300 hover:border-slate-700 cursor-pointer"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{playersMap[id]?.name}</span>
                            {isOut && (
                              <span className="text-[9px] bg-rose-500/15 text-rose-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                OUT
                              </span>
                            )}
                          </div>
                          {id === nonStrikerId && <Check className="w-4 h-4 text-indigo-400" />}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Bowler Selection */}
              <div className="space-y-2 mb-6">
                <label className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Target className="w-3 h-3" /> Current Bowler
                </label>
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {(innings === 1 ? (lineup.teamABatsFirst ? lineup.teamBPlayerIds : lineup.teamAPlayerIds) : (lineup.teamABatsFirst ? lineup.teamAPlayerIds : lineup.teamBPlayerIds))
                    .map(id => {
                      const isLastBowler = id === lastBowlerId;
                      const oversDone = bowlerStats[id] ? Math.floor(bowlerStats[id].balls / 6) : 0;
                      const hasReachedLimit = lineup.bowlerLimit > 0 && oversDone >= lineup.bowlerLimit;
                      const isDisabled = isLastBowler || hasReachedLimit;
                      
                      return (
                        <button
                          key={id}
                          disabled={isDisabled}
                          onClick={() => {
                            if (isDisabled) return;
                            saveHistory();
                            setCurrentBowlerId(id);
                            if (!bowlerStats[id]) {
                              setBowlerStats(prev => ({
                                ...prev,
                                [id]: { playerId: id, runs: 0, balls: 0, wickets: 0 }
                              }));
                            }
                          }}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm font-semibold text-left transition-all ${
                            isDisabled
                              ? "border-slate-800/50 bg-slate-900/10 text-slate-600 cursor-not-allowed opacity-40"
                              : id === currentBowlerId 
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-400" 
                                : "bg-slate-900/30 border-slate-800 text-slate-300 hover:border-slate-700 cursor-pointer"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{playersMap[id]?.name}</span>
                            {isLastBowler && (
                              <span className="text-[9px] bg-rose-500/15 text-rose-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                Last Over
                              </span>
                            )}
                            {hasReachedLimit && (
                              <span className="text-[9px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                Limit Reached
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {bowlerStats[id] && (
                              <span className="text-[10px] text-slate-500">
                                {getOvers(bowlerStats[id].balls)}-{bowlerStats[id].runs}-{bowlerStats[id].wickets}
                              </span>
                            )}
                            {id === currentBowlerId && <Check className="w-4 h-4 text-amber-400" />}
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>

              <button
                onClick={() => setShowSettings(false)}
                className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm cursor-pointer shadow-lg transition-all active:scale-[0.98]"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* 5. Extra Runs Selection Modal */}
      <AnimatePresence>
        {showExtraType && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowExtraType(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xs bg-slate-900 border border-amber-500/30 p-6 rounded-2xl shadow-2xl z-10 glass-card"
            >
              <h3 className="text-base font-bold text-amber-400 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5" /> {showExtraType === "wide" ? "Wide Ball" : showExtraType === "noball" ? "No Ball" : "Bye"} Runs
              </h3>
              <p className="text-[10px] text-slate-400 mb-6 font-medium uppercase tracking-widest">
                Select runs scored ({showExtraType === "bye" ? "1-4" : "0-4"}):
              </p>
              
              <div className="grid grid-cols-3 gap-3">
                {(showExtraType === "bye" ? [1, 2, 3, 4] : [0, 1, 2, 3, 4]).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      handleScoreBall(r, showExtraType);
                      setShowExtraType(null);
                    }}
                    className={`h-16 rounded-xl border border-amber-500/20 bg-slate-950 text-amber-300 hover:bg-amber-500/10 transition-all font-black text-lg cursor-pointer active:scale-95 flex flex-col items-center justify-center ${r === 0 ? 'col-span-1' : ''}`}
                  >
                    <span>{r}</span>
                    <span className="text-[8px] font-bold text-amber-500/40 mt-1">
                      {showExtraType === "bye" ? `${r} Run${r !== 1 ? 's' : ''}` : `Total ${r + 1}`}
                    </span>
                  </button>
                ))}
                <button
                  onClick={() => setShowExtraType(null)}
                  className="col-span-1 h-16 rounded-xl border border-slate-800 bg-slate-900 text-slate-500 hover:text-slate-300 font-bold text-xs cursor-pointer active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
