import React, { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthProvider";

export default function Auth() {
  const nav = useNavigate();
  const { user } = useAuth();

  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // If already logged in, bounce to dashboard
  if (user) {
    nav("/", { replace: true });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setMsg("");

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        setMsg("Account created. Check your email to confirm (if confirmations are enabled).");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        nav("/", { replace: true });
      }
    } catch (e2) {
      setErr(e2.message || "Auth failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 520 }}>
      <div className="card">
        <div className="card-body">
          <h1 className="h4 mb-1">PackRight</h1>
          <p className="text-secondary mb-4">
            {mode === "login" ? "Log in to your packing lists" : "Create an account"}
          </p>

          <div className="btn-group w-100 mb-3">
            <button
              type="button"
              className={`btn ${mode === "login" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setMode("login")}
            >
              Log in
            </button>
            <button
              type="button"
              className={`btn ${mode === "signup" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setMode("signup")}
            >
              Sign up
            </button>
          </div>

          {err && <div className="alert alert-danger">{err}</div>}
          {msg && <div className="alert alert-success">{msg}</div>}

          <form onSubmit={onSubmit} className="d-flex flex-column gap-3">
            <div>
              <label className="form-label">Email</label>
              <input
                className="form-control"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="form-label">Password</label>
              <input
                className="form-control"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
              />
              <div className="form-text">
                Use at least 6 characters.
              </div>
            </div>

            <button className="btn btn-primary" disabled={busy}>
              {busy ? "Working..." : mode === "login" ? "Log in" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}