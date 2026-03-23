import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthProvider";

export default function Auth() {
  const nav = useNavigate();
  const { user } = useAuth();

  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (user) {
      nav("/", { replace: true });
    }
  }, [user, nav]);

  useEffect(() => {
    setName("");
    setEmail("");
    setPassword("");
    setErr("");
    setMsg("");
  }, [mode]);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setMsg("");

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name.trim(),
            },
          },
        });

        if (error) throw error;

        setMsg("Account created. Check your email to confirm if email confirmations are enabled.");
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

  const isLogin = mode === "login";

  return (
    <div className="auth-page">
      <div className="container py-5">
        <div className="auth-card mx-auto">
          <div className="auth-card-body">
            <div className="auth-header">
              <h1 className="auth-title">{isLogin ? "Login" : "Register"}</h1>
              <p className="auth-subtitle">
                {isLogin
                  ? "Log in to continue managing your packing lists."
                  : "Create an account to save trips and reuse past packing lists."}
              </p>
            </div>

            {err && <div className="alert alert-danger">{err}</div>}
            {msg && <div className="alert alert-success">{msg}</div>}

            <form key={mode} onSubmit={onSubmit} className="auth-form">
              {!isLogin && (
                <div className="auth-field">
                  <label className="auth-label">Name</label>
                  <input
                    className="auth-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    placeholder="Enter your name"
                    required
                  />
                </div>
              )}

              <div className="auth-field">
                <label className="auth-label">Email</label>
                <input
                  className="auth-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="auth-field">
                <label className="auth-label">Password</label>
                <input
                  className="auth-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  placeholder={isLogin ? "Enter your password" : "Create a password"}
                  required
                />
              </div>

              <button className="auth-submit-btn" disabled={busy}>
                {busy ? "Working..." : isLogin ? "Login" : "Register"}
              </button>
            </form>

            <div className="auth-switch-text">
              {isLogin ? (
                <>
                  No account?{" "}
                  <button
                    type="button"
                    className="auth-switch-link"
                    onClick={() => setMode("signup")}
                    disabled={busy}
                  >
                    Register here
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="auth-switch-link"
                    onClick={() => setMode("login")}
                    disabled={busy}
                  >
                    Login here
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}