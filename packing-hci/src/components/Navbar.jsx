import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../app/AuthProvider";

function safeNav(to, nav) {
  nav(to, { replace: true });
}

export default function Navbar() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();

  async function onLogout() {
    try {
      await signOut();
    } finally {
      safeNav("/auth", nav);
    }
  }

  return (
    <nav className="navbar navbar-expand-lg border-bottom">
      <div className="container">
        <Link className="navbar-brand lalezar-regular" to="/">
          PackRight
        </Link>

        <div className="d-flex align-items-center gap-2">
          {user ? (
            <>
              <NavLink className="btn btn-outline-secondary btn-sm" to="/">
                Dashboard
              </NavLink>

              <span className="text-secondary small d-none d-md-inline">{user.email}</span>

              <button className="btn btn-outline-danger btn-sm" type="button" onClick={onLogout}>
                Log out
              </button>
            </>
          ) : (
            <NavLink className="btn btn-primary btn-sm" to="/auth">
              Log in
            </NavLink>
          )}
        </div>
      </div>
    </nav>
  );
}