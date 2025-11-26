import React, { useState } from 'react';
import api from './api';

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState('login'); // login | register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    setErr('');
    try {
      if (mode === 'login') {
        const res = await api.post('/auth/login', { email, password });
        onAuth({ email: res.data.email, id: res.data.id });
      } else {
        const res = await api.post('/auth/register', { email, password });
        onAuth({ email: res.data.email, id: res.data.id });
      }
    } catch (e) {
      setErr(e?.response?.data?.error || 'Auth error');
    }
  }

  function openGoogle() {
    // redirect to backend Google OAuth endpoint
    window.location.href = '/auth/google';
  }

  return (
    <div className="auth-card">
      <h2>{mode === 'login' ? 'Login' : 'Register'}</h2>
      <form onSubmit={submit} className="auth-form">
        <input type="email" placeholder="Email" required value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" required value={password} onChange={e => setPassword(e.target.value)} />
        <div className="row">
          <button className="btn" type="submit">{mode === 'login' ? 'Login' : 'Register'}</button>
          <button type="button" className="btn alt" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Switch to Register' : 'Switch to Login'}
          </button>
        </div>
      </form>
      <div className="oauth-row">
        <button className="btn google" onClick={openGoogle}>Sign in with Google</button>
      </div>
      {err && <div className="error">{err}</div>}
      <div className="hint">Note: For Google OAuth to work, the backend must be configured with GOOGLE_CLIENT_ID/SECRET in .env</div>
    </div>
  );
}
