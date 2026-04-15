import { useEffect, useState } from 'react';

import { Header } from '@/components/Header';
import { solveLightsOut, type CellPosition } from '@/lib/lightsOut';

type Theme = 'light' | 'dark';
type GameStatus = 'playing' | 'won';
type GameView = 'home' | 'playing' | 'summary';

interface HintState {
  message: string;
  targetCell?: CellPosition;
  remainingMoves?: number;
}

interface GameState {
  grid: boolean[][];
  size: number;
  level: number;
  moves: number;
  status: GameStatus;
  view: GameView;
  optimalForLevel: number;
  hint?: HintState;
}

interface GameSession {
  game: GameState;
  history: boolean[][][];
}

interface LevelStats {
  level: number;
  bestMoves: number | null;
  optimalMoves: number;
  completed: boolean;
}

const MIN_LEVEL = 3;
const MAX_LEVEL = 27;
const LEVELS = Array.from({ length: MAX_LEVEL - MIN_LEVEL + 1 }, (_, index) => MIN_LEVEL + index);
const STATS_STORAGE_KEY = 'discoloration_stats';
const THEME_STORAGE_KEY = 'discoloration_theme';
const LARGE_HINT_WARNING_LEVEL = 15;

const OPTIMAL_MOVES_BY_LEVEL: Record<number, number> = {
  3: 5,
  4: 4,
  5: 15,
  6: 28,
  7: 33,
  8: 40,
  9: 25,
  10: 44,
  11: 55,
  12: 72,
  13: 105,
  14: 56,
  15: 117,
  16: 104,
  17: 147,
  18: 188,
  19: 141,
  20: 224,
  21: 245,
  22: 276,
  23: 231,
  24: 270,
  25: 353,
  26: 356,
  27: 405,
};

function createEmptyGrid(size: number) {
  return Array.from({ length: size }, () => Array(size).fill(false));
}

function cloneGrid(grid: boolean[][]) {
  return grid.map((row) => [...row]);
}

function toggleCells(grid: boolean[][], row: number, column: number) {
  for (const [nextRow, nextColumn] of [
    [row, column],
    [row - 1, column],
    [row + 1, column],
    [row, column - 1],
    [row, column + 1],
  ]) {
    if (
      nextRow >= 0 &&
      nextRow < grid.length &&
      nextColumn >= 0 &&
      nextColumn < grid.length
    ) {
      grid[nextRow][nextColumn] = !grid[nextRow][nextColumn];
    }
  }
}

function isSolved(grid: boolean[][]) {
  return grid.every((row) => row.every(Boolean));
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function createDefaultLevelStats(): Record<number, LevelStats> {
  const stats = {} as Record<number, LevelStats>;

  for (const level of LEVELS) {
    stats[level] = {
      level,
      bestMoves: null,
      optimalMoves: OPTIMAL_MOVES_BY_LEVEL[level],
      completed: false,
    };
  }

  return stats;
}

function getStoredLevelStats() {
  const baseStats = createDefaultLevelStats();

  if (typeof window === 'undefined') {
    return baseStats;
  }

  const rawStats = window.localStorage.getItem(STATS_STORAGE_KEY);

  if (!rawStats) {
    return baseStats;
  }

  try {
    const parsed = JSON.parse(rawStats) as Record<string, Partial<LevelStats>>;

    for (const level of LEVELS) {
      const savedLevel = parsed[String(level)];

      if (!savedLevel) {
        continue;
      }

      baseStats[level] = {
        ...baseStats[level],
        bestMoves: typeof savedLevel.bestMoves === 'number' ? savedLevel.bestMoves : null,
        completed: savedLevel.completed === true,
      };
    }
  } catch {
    return baseStats;
  }

  return baseStats;
}

function createGame(level: number): GameState {
  return {
    grid: createEmptyGrid(level),
    size: level,
    level,
    moves: 0,
    status: 'playing',
    view: 'playing',
    optimalForLevel: OPTIMAL_MOVES_BY_LEVEL[level],
  };
}

function createInitialSession(): GameSession {
  return {
    game: {
      grid: [],
      size: MIN_LEVEL,
      level: MIN_LEVEL,
      moves: 0,
      status: 'playing',
      view: 'home',
      optimalForLevel: OPTIMAL_MOVES_BY_LEVEL[MIN_LEVEL],
    },
    history: [],
  };
}

function getHintMessage(minMoves: number) {
  return minMoves === 1 ? 'One perfect move remains.' : 'Optimal shift identified.';
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);
  const [levelStats, setLevelStats] = useState<Record<number, LevelStats>>(getStoredLevelStats);
  const [session, setSession] = useState<GameSession>(createInitialSession);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    document.body.className = `${theme === 'dark' ? 'theme-dark' : 'theme-light'} bg-matrix`;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(levelStats));
  }, [levelStats]);

  const isDark = theme === 'dark';
  const { game, history } = session;

  const startLevel = (level: number) => {
    setSession({
      game: createGame(level),
      history: [],
    });
  };

  const resetLevel = () => {
    setSession({
      game: createGame(game.size),
      history: [],
    });
    setIsAnalyzing(false);
  };

  const returnHome = () => {
    setSession((current) => ({
      ...current,
      game: {
        ...current.game,
        view: 'home',
      },
    }));
    setIsAnalyzing(false);
  };

  const goToNextLevel = () => {
    const nextLevel = game.level + 1;

    if (nextLevel > MAX_LEVEL) {
      returnHome();
      return;
    }

    startLevel(nextLevel);
  };

  const handleCellClick = (row: number, column: number) => {
    if (isAnalyzing) {
      return;
    }

    setSession((current) => {
      if (current.game.view !== 'playing' || current.game.status !== 'playing') {
        return current;
      }

      const nextGrid = cloneGrid(current.game.grid);
      const nextHistory = [...current.history, cloneGrid(current.game.grid)];
      const nextMoves = current.game.moves + 1;

      toggleCells(nextGrid, row, column);

      if (!isSolved(nextGrid)) {
        return {
          history: nextHistory,
          game: {
            ...current.game,
            grid: nextGrid,
            moves: nextMoves,
            hint: undefined,
          },
        };
      }

      setLevelStats((existing) => {
        const level = existing[current.game.level];
        const bestMoves =
          level.bestMoves === null ? nextMoves : Math.min(level.bestMoves, nextMoves);

        return {
          ...existing,
          [current.game.level]: {
            ...level,
            completed: true,
            bestMoves,
          },
        };
      });

      return {
        history: nextHistory,
        game: {
          ...current.game,
          grid: nextGrid,
          moves: nextMoves,
          status: 'won',
          view: 'summary',
          hint: undefined,
        },
      };
    });
  };

  const handleUndo = () => {
    if (isAnalyzing) {
      return;
    }

    setSession((current) => {
      if (current.game.view !== 'playing' || current.history.length === 0) {
        return current;
      }

      const nextHistory = [...current.history];
      const previousGrid = nextHistory.pop();

      if (!previousGrid) {
        return current;
      }

      return {
        history: nextHistory,
        game: {
          ...current.game,
          grid: previousGrid,
          moves: Math.max(0, current.game.moves - 1),
          hint: undefined,
        },
      };
    });
  };

  const handleHint = () => {
    if (game.view !== 'playing' || isAnalyzing) {
      return;
    }

    if (
      game.size > LARGE_HINT_WARNING_LEVEL &&
      !window.confirm('Analyzing higher-level sectors can take a few seconds. Continue?')
    ) {
      return;
    }

    setIsAnalyzing(true);
    const gridSnapshot = cloneGrid(game.grid);
    const levelSnapshot = game.level;

    window.setTimeout(() => {
      try {
        const solution = solveLightsOut(gridSnapshot);

        setSession((current) => {
          if (
            current.game.view !== 'playing' ||
            current.game.level !== levelSnapshot ||
            current.game.status !== 'playing'
          ) {
            return current;
          }

          if (!solution || solution.clickPositions.length === 0) {
            return {
              ...current,
              game: {
                ...current.game,
                hint: {
                  message: 'No valid restoration path was found for the current state.',
                },
              },
            };
          }

          return {
            ...current,
            game: {
              ...current.game,
              hint: {
                message: getHintMessage(solution.minMoves),
                targetCell: solution.clickPositions[0],
                remainingMoves: solution.minMoves,
              },
            },
          };
        });
      } finally {
        setIsAnalyzing(false);
      }
    }, 50);
  };

  const renderHome = () => (
    <main className="flex-grow flex flex-col items-center p-6 pb-20">
      <div className="w-full max-w-6xl">
        <div className="mb-12 text-center">
          <h2
            className={`text-6xl font-black italic tracking-tighter mb-4 ${
              isDark ? 'text-indigo-400' : 'text-amber-900'
            }`}
          >
            LEVEL SELECT
          </h2>
          <p
            className={`${
              isDark ? 'text-indigo-300' : 'text-amber-600'
            } font-bold tracking-[0.4em] uppercase text-xs`}
          >
            Select an authorized sector for restoration
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {LEVELS.map((level) => {
            const stats = levelStats[level];
            const previousLevel = levelStats[level - 1];
            const isUnlocked = level === MIN_LEVEL || previousLevel?.completed === true;
            const isPerfect =
              stats.bestMoves !== null && stats.bestMoves === stats.optimalMoves;
            const cardTone = isPerfect
              ? isDark
                ? 'border-emerald-500/40 bg-emerald-500/5'
                : 'border-emerald-500/40 bg-emerald-50/50'
              : stats.completed
                ? isDark
                  ? 'border-rose-500/40 bg-rose-500/5'
                  : 'border-rose-500/40 bg-rose-50/50'
                : isDark
                  ? 'border-indigo-500/20 shadow-indigo-500/5'
                  : 'border-amber-500/10 shadow-amber-500/5';
            const labelTone = isPerfect
              ? 'text-emerald-500'
              : stats.completed
                ? 'text-rose-500'
                : isDark
                  ? 'text-indigo-400'
                  : 'text-amber-700';

            return (
              <button
                key={level}
                type="button"
                disabled={!isUnlocked}
                onClick={() => startLevel(level)}
                className={`glass p-6 rounded-[2rem] text-left transition-all relative overflow-hidden group border-2 ${cardTone} ${
                  isUnlocked
                    ? 'hover:scale-[1.03] cursor-pointer'
                    : 'opacity-40 grayscale cursor-not-allowed'
                }`}
              >
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[9px] font-black tracking-widest uppercase ${labelTone}`}>
                      LVL {level}
                    </span>
                    {!isUnlocked ? (
                      <svg
                        className="w-3.5 h-3.5 text-slate-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    ) : null}
                    {isPerfect ? <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> : null}
                  </div>

                  <h3 className={`text-3xl font-black mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {level}
                    <span className="text-sm opacity-30 px-1">x</span>
                    {level}
                  </h3>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-bold uppercase tracking-widest text-[8px]">
                        Best
                      </span>
                      <span
                        className={`text-xs font-black ${
                          stats.bestMoves !== null
                            ? isPerfect
                              ? 'text-emerald-500'
                              : 'text-rose-500'
                            : isDark
                              ? 'text-slate-600'
                              : 'text-slate-300'
                        }`}
                      >
                        {stats.bestMoves ?? '--'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-bold uppercase tracking-widest text-[8px]">
                        Optimal
                      </span>
                      <span className={`text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {stats.optimalMoves}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );

  const renderSummary = () => {
    const isPerfectClear = game.moves === game.optimalForLevel;
    const titleTone = isPerfectClear
      ? isDark
        ? 'text-emerald-400'
        : 'text-emerald-500'
      : 'text-rose-500';
    const badgeTone = isPerfectClear
      ? isDark
        ? 'text-emerald-300'
        : 'text-emerald-500'
      : 'text-rose-500';
    const frameTone = isPerfectClear
      ? isDark
        ? 'border-emerald-500/40 shadow-emerald-500/10'
        : 'border-emerald-500/30 shadow-emerald-500/10'
      : isDark
        ? 'border-rose-500/40 shadow-rose-500/10'
        : 'border-rose-500/30 shadow-rose-500/10';
    const statTone = isPerfectClear
      ? isDark
        ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-400'
        : 'bg-emerald-50 border-emerald-200 text-emerald-500'
      : isDark
        ? 'bg-rose-900/20 border-rose-500/30 text-rose-500'
        : 'bg-rose-50 border-rose-200 text-rose-500';

    return (
      <main className="flex-grow flex flex-col items-center justify-center p-4">
        <div className={`w-full max-w-md glass rounded-[3rem] p-10 text-center shadow-2xl border-2 ${frameTone}`}>
          <h2 className={`text-6xl font-black italic tracking-tighter mb-2 ${titleTone}`}>
            {isPerfectClear ? 'PERFECT' : 'SUCCESS'}
          </h2>
          <p className={`${badgeTone} font-bold tracking-[0.4em] uppercase text-[10px] mb-10`}>
            Grid {game.level}x{game.level} restored
          </p>

          <div className="grid grid-cols-2 gap-4 mb-12">
            <div
              className={`p-6 rounded-3xl border shadow-sm ${
                isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-white border-slate-200'
              }`}
            >
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Your Execution
              </p>
              <p className={`text-4xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {game.moves}
              </p>
            </div>

            <div className={`p-6 rounded-3xl border ${statTone}`}>
              <p className="text-[9px] font-black uppercase tracking-widest mb-1">Optimal Range</p>
              <p className="text-4xl font-black">{game.optimalForLevel}</p>
            </div>
          </div>

          <div className="space-y-4">
            {game.level < MAX_LEVEL ? (
              <button
                type="button"
                onClick={goToNextLevel}
                className={`w-full py-5 rounded-2xl font-black text-xl tracking-widest transition-all active:scale-95 shadow-xl ${
                  isDark
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/40'
                    : 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/40'
                }`}
              >
                NEXT LEVEL
              </button>
            ) : null}

            <button
              type="button"
              onClick={returnHome}
              className={`w-full py-4 rounded-2xl border transition-all text-xs uppercase tracking-widest font-black opacity-40 hover:opacity-100 ${
                isDark
                  ? 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white'
                  : 'border-slate-200 text-slate-400 hover:bg-white hover:text-slate-900'
              }`}
            >
              Select Level
            </button>

            <button
              type="button"
              onClick={resetLevel}
              className={`w-full py-4 rounded-2xl border transition-all text-xs uppercase tracking-widest font-black opacity-40 hover:opacity-100 ${
                isDark
                  ? 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white'
                  : 'border-slate-200 text-slate-400 hover:bg-white hover:text-slate-900'
              }`}
            >
              Replay Level
            </button>
          </div>
        </div>
      </main>
    );
  };

  const renderHintPanel = () => {
    if (!game.hint) {
      return null;
    }

    const hintTone = isDark
      ? 'border-indigo-500/20 bg-indigo-500/5 text-indigo-100'
      : 'border-amber-600/20 bg-amber-50 text-amber-900';

    return (
      <div className={`rounded-2xl border p-4 shadow-sm ${hintTone}`}>
        <p className="text-sm font-semibold">{game.hint.message}</p>
        {game.hint.remainingMoves !== undefined ? (
          <p className="mt-2 text-xs uppercase tracking-widest text-slate-400">
            Estimated moves to solve: {game.hint.remainingMoves}
          </p>
        ) : null}
        {game.hint.targetCell ? (
          <p className="mt-2 text-sm">
            Suggested start: row {game.hint.targetCell[0] + 1}, column {game.hint.targetCell[1] + 1}
          </p>
        ) : null}
      </div>
    );
  };

  const renderBoard = () => (
    <main className="flex-grow flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md flex justify-between items-end mb-8 px-4">
        <button
          type="button"
          onClick={returnHome}
          className={`flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest hover:opacity-70 transition-opacity ${
            isDark ? 'text-indigo-400' : 'text-amber-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          <span>Exit</span>
        </button>

        <div
          className={`text-right glass px-4 py-2 rounded-xl border shadow-sm ${
            isDark ? 'border-indigo-500/20' : 'border-amber-500/20'
          }`}
        >
          <p
            className={`text-[9px] font-black tracking-[0.2em] uppercase ${
              isDark ? 'text-indigo-400' : 'text-amber-700'
            }`}
          >
            Sector {game.level} output
          </p>
          <p className={`text-3xl font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {game.moves}
          </p>
        </div>
      </div>

      <div
        className={`grid gap-3 p-6 glass rounded-[2.5rem] shadow-2xl mb-8 transition-all duration-500 ${
          isDark ? 'border-indigo-500/10 shadow-indigo-500/5' : 'border-white shadow-amber-500/5'
        }`}
        style={{
          gridTemplateColumns: `repeat(${game.size}, minmax(0, 1fr))`,
          width: '100%',
          maxWidth: 'min(90vw, 450px)',
          aspectRatio: '1 / 1',
        }}
      >
        {game.grid.map((row, rowIndex) =>
          row.map((cell, columnIndex) => {
            const isHintCell =
              game.hint?.targetCell?.[0] === rowIndex &&
              game.hint?.targetCell?.[1] === columnIndex;
            const activeClasses = isDark
              ? 'bg-gradient-to-br from-indigo-600 to-indigo-400 shadow-indigo-600/40'
              : 'bg-gradient-to-br from-amber-500 to-yellow-400 shadow-amber-600/40';
            const inactiveClasses = isDark
              ? 'bg-slate-900/50 border border-slate-800 hover:border-indigo-800/50'
              : 'bg-white border border-slate-200 hover:border-amber-300';

            return (
              <button
                key={`${rowIndex}-${columnIndex}`}
                type="button"
                disabled={isAnalyzing}
                onClick={() => handleCellClick(rowIndex, columnIndex)}
                aria-label={`Toggle row ${rowIndex + 1}, column ${columnIndex + 1}. Cell is ${
                  cell ? 'restored' : 'corrupted'
                }.`}
                className={`relative rounded-2xl transition-all duration-500 active:scale-90 overflow-hidden disabled:opacity-70 ${
                  cell ? activeClasses : inactiveClasses
                } ${isHintCell ? 'target-pulse' : ''}`}
              >
                <div
                  className={`absolute inset-0 bg-white/20 transition-opacity duration-500 ${
                    cell ? 'opacity-100' : 'opacity-0'
                  }`}
                />
                {isHintCell ? (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div
                      className={`w-3 h-3 rounded-full shadow-lg border-2 border-white ${
                        isDark ? 'bg-indigo-400' : 'bg-amber-900'
                      }`}
                    />
                  </div>
                ) : null}
              </button>
            );
          }),
        )}
      </div>

      <div className="w-full max-w-md space-y-4 px-2">
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            disabled={isAnalyzing}
            onClick={resetLevel}
            className={`py-4 rounded-2xl border transition-all text-[10px] uppercase tracking-widest font-black shadow-sm disabled:opacity-20 disabled:cursor-not-allowed ${
              isDark
                ? 'border-slate-800 bg-slate-900/50 text-slate-500 hover:text-white hover:bg-slate-800'
                : 'border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Reset
          </button>
          <button
            type="button"
            disabled={history.length === 0 || isAnalyzing}
            onClick={handleUndo}
            className={`py-4 rounded-2xl border transition-all text-[10px] uppercase tracking-widest font-black shadow-sm disabled:opacity-20 disabled:cursor-not-allowed ${
              isDark
                ? 'border-slate-800 bg-slate-900/50 text-slate-500 hover:text-white hover:bg-slate-800'
                : 'border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Undo
          </button>
        </div>

        <button
          type="button"
          disabled={isAnalyzing}
          onClick={handleHint}
          className={`w-full py-5 rounded-2xl font-black border flex items-center justify-center gap-2 transition-all text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed ${
            isDark
              ? 'bg-indigo-600/5 hover:bg-indigo-600/10 text-indigo-400 border-indigo-600/20 shadow-indigo-500/5'
              : 'bg-amber-600/5 hover:bg-amber-600/10 text-amber-700 border-amber-600/20 shadow-amber-500/5'
          }`}
        >
          {isAnalyzing ? (
            <div
              className={`w-5 h-5 border-2 border-t-transparent rounded-full animate-spin ${
                isDark ? 'border-indigo-500' : 'border-amber-600'
              }`}
            />
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Hint
            </>
          )}
        </button>

        {renderHintPanel()}
      </div>
    </main>
  );

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-500 ${
        isDark ? 'text-white selection:bg-indigo-500/30' : 'text-slate-900 selection:bg-amber-200'
      }`}
    >
      <Header
        theme={theme}
        onToggleTheme={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
      />

      {game.view === 'home' && renderHome()}
      {game.view === 'summary' && renderSummary()}
      {game.view === 'playing' && renderBoard()}

      <footer className="py-8" />
    </div>
  );
}
