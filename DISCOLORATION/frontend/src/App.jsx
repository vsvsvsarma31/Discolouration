import React, { useEffect, useState } from 'react';
import api from './api';
import Auth from './Auth';
import Game from './Game';

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('menu'); // 'menu' or 'game' or 'auth'
  const [levels, setLevels] = useState([]);
  const [currentLevel, setCurrentLevel] = useState(1);

  useEffect(() => {
    fetchUser();
  }, []);

  async function fetchUser() {
    try {
      const res = await api.get('/auth/me');
      if (res.data && res.data.user) setUser(res.data.user);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchLevels() {
    if (!user) return;
    try {
      const res = await api.get('/api/levels');
      setLevels(res.data.levels);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    if (user) fetchLevels();
  }, [user]);

  function onLogin(userObj) {
    setUser(userObj);
    setView('menu');
    fetchLevels();
  }

  function onLogout() {
    api.post('/auth/logout').finally(() => {
      setUser(null);
      setLevels([]);
      setView('auth');
    });
  }

  return (
    <div className="app-root">
      <header className="header">
        <h1 className="title">DISCOLORATION</h1>
        <div className="header-right">
          {user ? (
            <>
              <div className="user">Hello, {user.email}</div>
              <button className="btn small" onClick={() => { onLogout(); }}>Logout</button>
            </>
          ) : (
            <button className="btn" onClick={() => setView('auth')}>Login / Register</button>
          )}
        </div>
      </header>

      <main className="main">
        {!user && view === 'auth' && <Auth onAuth={onLogin} />}
        {user && view === 'menu' && (
          <div className="levels-grid">
            {levels.length === 0 ? (
              <div>Loading...</div>
            ) : (
              levels.map(l => {
                const locked = l.n > 1 && !levels[l.n - 2]?.completed;
                return (
                  <button
                    key={l.n}
                    className={`level-btn ${locked ? 'locked' : ''} ${l.completed ? 'completed' : ''}`}
                    onClick={() => { if (!locked) { setCurrentLevel(l.n); setView('game'); } }}
                    aria-disabled={locked}
                  >
                    <div className="level-num">Level {l.n}</div>
                    {l.completed && <div className="tick">✔</div>}
                  </button>
                );
              })
            )}
          </div>
        )}

        {user && view === 'game' && (
          <Game
            level={currentLevel}
            onBack={() => { setView('menu'); fetchLevels(); }}
            onComplete={() => { fetchLevels(); }}
            api={api}
          />
        )}
      </main>
    </div>
  );
}
