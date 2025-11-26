import React, { useEffect, useState, useRef } from 'react';
import api from './api';

function useSound() {
  // simple WebAudio generator for click and win sounds (no external files)
  const ctxRef = useRef(null);
  useEffect(() => {
    try {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      ctxRef.current = null;
    }
  }, []);
  function clickSound() {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 550;
    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(ctx.destination);
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    o.start(now);
    o.stop(now + 0.2);
  }
  function winSound() {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    o1.frequency.value = 660;
    o2.frequency.value = 880;
    o1.connect(g); o2.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.4, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    o1.start(now); o2.start(now + 0.05);
    o1.stop(now + 0.6); o2.stop(now + 0.6);
  }
  return { clickSound, winSound };
}

export default function Game({ level, onBack, onComplete }) {
  const [rows, setRows] = useState(level);
  const [board, setBoard] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const { clickSound, winSound } = useSound();

  useEffect(() => {
    setRows(level);
    load();
  }, [level]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get(`/api/levels/${level}/state`);
      const data = res.data;
      setRows(level);
      if (data.board) setBoard(data.board);
      else setBoard(Array.from({ length: level }, () => Array(level).fill(0)));
      setMessage('');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function toggleAt(bd, r, c) {
    const R = bd.length, C = bd[0].length;
    const copy = bd.map(row => row.slice());
    function flip(i, j) {
      if (i >= 0 && i < R && j >= 0 && j < C) copy[i][j] = copy[i][j] ? 0 : 1;
    }
    flip(r, c);
    flip(r - 1, c);
    flip(r + 1, c);
    flip(r, c - 1);
    flip(r, c + 1);
    return copy;
  }

  async function onCellClick(r, c) {
    clickSound();
    const next = toggleAt(board, r, c);
    setBoard(next);
    // save state (fire-and-forget)
    api.post(`/api/levels/${level}/state`, { board: next }).catch(() => {});
    const won = next.every(row => row.every(cell => cell === 1));
    if (won) {
      setMessage('Level Complete!');
      winSound();
      await api.post(`/api/levels/${level}/complete`).catch(() => {});
      onComplete?.();
    }
  }

  function restart() {
    setBoard(Array.from({ length: rows }, () => Array(rows).fill(0)));
    setMessage('');
    api.post(`/api/levels/${level}/state`, { board: Array.from({ length: rows }, () => Array(rows).fill(0)) }).catch(() => {});
  }

  function nextLevel() {
    const next = Math.min(100, level + 1);
    // load frontend route by replacing global location (top-level app will update)
    window.location.reload(); // simple; parent app will refresh levels when user returns
  }

  if (loading) return <div className="game-area">Loading...</div>;

  // responsive cell size
  const cellSize = Math.max(32, Math.floor(Math.min(480 / rows, 64)));

  return (
    <div className="game-area">
      <div className="game-top">
        <div>Level {level} ({rows}×{rows})</div>
        <div className="game-controls">
          <button className="btn small" onClick={onBack}>Back</button>
          <button className="btn small" onClick={restart}>Play again</button>
          <button className="btn small" onClick={nextLevel}>Next Level</button>
        </div>
      </div>

      <div
        className="board"
        style={{
          gridTemplateColumns: `repeat(${rows}, ${cellSize}px)`,
          gap: Math.max(4, Math.floor(cellSize * 0.08)),
        }}
      >
        {board.map((row, i) => row.map((cell, j) => (
          <div
            key={`${i}-${j}`}
            role="button"
            tabIndex={0}
            className={`cell ${cell ? 'on' : 'off'}`}
            onClick={() => onCellClick(i, j)}
            onTouchStart={() => onCellClick(i, j)}
            style={{
              width: `${cellSize}px`,
              height: `${cellSize}px`,
              borderRadius: Math.max(6, Math.floor(cellSize * 0.12))
            }}
          />
        )))}
      </div>

      {message && <div className="message success">{message}</div>}
    </div>
  );
}
