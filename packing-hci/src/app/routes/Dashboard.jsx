import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteTrip, fetchListItems, fetchTrips, resetTripItemsPacked } from "../../lib/db";
import { useAuth } from "../AuthProvider";

const PINNED_STORAGE_KEY = "packright:pinnedTrips";

function pct(packed, total) {
  if (total <= 0) return 0;
  return Math.round((packed / total) * 100);
}

function safeMsg(e, fallback) {
  return (e && e.message) || fallback;
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function readPinnedTrips() {
  try {
    const raw = localStorage.getItem(PINNED_STORAGE_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePinnedTrips(ids) {
  localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(ids));
}

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const menuRef = useRef(null);

  const [trips, setTrips] = useState([]);
  const [tripStats, setTripStats] = useState({});
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("modified");
  const [pinnedTripIds, setPinnedTripIds] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    setPinnedTripIds(readPinnedTrips());
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    }

    function handleEscape(e) {
      if (e.key === "Escape") {
        setOpenMenuId(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function refreshTrips() {
    setLoading(true);
    setErr("");

    try {
      const data = await fetchTrips();
      const safeTrips = Array.isArray(data) ? data : [];
      setTrips(safeTrips);

      const statsEntries = await Promise.all(
        safeTrips.map(async (trip) => {
          try {
            const items = await fetchListItems(trip.id);
            const total = items.length;
            const packed = items.filter((i) => !!i.packed).length;

            return [
              trip.id,
              {
                total,
                packed,
                percent: pct(packed, total),
              },
            ];
          } catch {
            return [
              trip.id,
              {
                total: 0,
                packed: 0,
                percent: 0,
              },
            ];
          }
        })
      );

      setTripStats(Object.fromEntries(statsEntries));
    } catch (e) {
      setErr(safeMsg(e, "Failed to load trips"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshTrips();
  }, []);

  function isPinned(tripId) {
    return pinnedTripIds.includes(tripId);
  }

  function togglePin(tripId) {
    setPinnedTripIds((prev) => {
      const next = prev.includes(tripId)
        ? prev.filter((id) => id !== tripId)
        : [...prev, tripId];

      writePinnedTrips(next);
      return next;
    });
  }

  const filteredTrips = useMemo(() => {
    const q = query.trim().toLowerCase();

    let out = [...trips];

    if (q) {
      out = out.filter((t) => {
        const name = (t.name || "").toLowerCase();
        const type = (t.trip_type || "").toLowerCase();
        return name.includes(q) || type.includes(q);
      });
    }

    out.sort((a, b) => {
      const aPinned = isPinned(a.id) ? 1 : 0;
      const bPinned = isPinned(b.id) ? 1 : 0;

      if (aPinned !== bPinned) return bPinned - aPinned;

      if (sortBy === "alpha") {
        return (a.name || "").localeCompare(b.name || "");
      }

      if (sortBy === "days") {
        return (b.days || 0) - (a.days || 0);
      }

      if (sortBy === "created") {
        const aTime = new Date(a.created_at || 0).getTime();
        const bTime = new Date(b.created_at || 0).getTime();
        return bTime - aTime;
      }

      if (sortBy === "used") {
        const aTime = new Date(a.last_used_at || a.updated_at || a.created_at || 0).getTime();
        const bTime = new Date(b.last_used_at || b.updated_at || b.created_at || 0).getTime();
        return bTime - aTime;
      }

      const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
      const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
      return bTime - aTime;
    });

    return out;
  }, [trips, query, sortBy, pinnedTripIds]);

  function goNewTrip() {
    nav("/trip/new");
  }

  function goPackTrip(tripId) {
    nav(`/trip/${tripId}`);
  }

  function goEditTrip(tripId) {
    nav(`/trip/${tripId}/edit`);
  }

  async function onDeleteTrip(tripId) {
    const ok = window.confirm("Delete this trip? This cannot be undone.");
    if (!ok) return;

    setBusyId(tripId);
    setErr("");
    setOpenMenuId(null);

    try {
      await deleteTrip(tripId);

      setPinnedTripIds((prev) => {
        const next = prev.filter((id) => id !== tripId);
        writePinnedTrips(next);
        return next;
      });

      await refreshTrips();
    } catch (e) {
      setErr(safeMsg(e, "Failed to delete trip"));
    } finally {
      setBusyId(null);
    }
  }

  async function onResetTrip(tripId) {
    const ok = window.confirm("Reset all packed items for this trip?");
    if (!ok) return;

    setBusyId(tripId);
    setErr("");
    setOpenMenuId(null);

    try {
      await resetTripItemsPacked(tripId);

      setTripStats((prev) => {
        const current = prev[tripId] || { total: 0, packed: 0, percent: 0 };
        return {
          ...prev,
          [tripId]: {
            ...current,
            packed: 0,
            percent: 0,
          },
        };
      });
    } catch (e) {
      setErr(safeMsg(e, "Failed to reset checkmarks"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="container py-4 d-flex flex-column" style={{ minHeight: "calc(100vh - 60px)" }}>
      {/* Header */}
      <div className="mb-4">
        <h1 className="h3 mb-1">Dashboard</h1>
        <div className="text-secondary">
          <div>
            Welcome back, {user?.user_metadata?.name || user?.email}!
          </div>
          <div>
            Browse and manage your trips, then open a trip to pack.
          </div>
        </div>
      </div>

      {err ? <div className="alert alert-danger">{err}</div> : null}

      {/* Search and sort */}
      <div className="row g-2 mb-3 flex-nowrap">
        <div className="col-7">
          <label className="form-label mb-1">Search</label>
          <input
            className="form-control"
            placeholder="Search trips..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="col-5">
          <label className="form-label mb-1">Sort by</label>
          <select
            className="form-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="modified">Last modified</option>
            <option value="created">Creation date</option>
            <option value="used">Last used</option>
            <option value="alpha">Alphabetical</option>
            <option value="days">Trip length</option>
          </select>
        </div>
        
      </div>

      {/* Trip List */}
      <div className="flex-grow-1">
        {loading ? (
          <div className="card card-modern">
            <div className="card-body text-secondary">Loading trips…</div>
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="card card-modern">
            <div className="card-body">
              <h5 className="card-title mb-2">No trips found</h5>
              <p className="card-text text-secondary mb-3">
                Create a trip to get started, or try a different search.
              </p>
            </div>
          </div>
        ) : (
          <div
            className="card card-modern"
            style={{ overflow: "visible", maxHeight: "50vh", overflowY: "auto" }}
          >
            {filteredTrips.map((trip, idx) => {
              const stats = tripStats[trip.id] || { total: 0, packed: 0, percent: 0 };
              const pinned = isPinned(trip.id);
              const isBusy = busyId === trip.id;
              const menuOpen = openMenuId === trip.id;
              const isLast = idx === filteredTrips.length - 1;

              return (
                <div
                  key={trip.id}
                  style={{
                    position: "relative",
                    zIndex: menuOpen ? 50 : 1,
                    borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div
                    className="d-flex align-items-center gap-3 px-3 py-3"
                    style={{ cursor: "pointer" }}
                    onClick={() => goPackTrip(trip.id)}
                  >

                    {/* Trip */}
                    <div className="flex-grow-1 min-w-0">
                      <div className="fw-semibold d-flex align-items-center gap-2" style={{ fontSize: "0.95rem" }}>
                    
                        {/* star */}
                        <button
                          type="button"
                          className="btn btn-sm p-0"
                          style={{
                            background: "transparent",
                            border: "none",
                            color: pinned ? "#f5c518" : "rgba(255,255,255,0.3)",
                            fontSize: "1.1rem",
                            lineHeight: 1,
                            flexShrink: 0,
                          }}
                          onClick={(e) => { e.stopPropagation(); togglePin(trip.id); }}
                          title={pinned ? "Unpin" : "Pin"}
                        >
                          {pinned ? "★ " : "☆"}
                        </button>

                    {trip.name || "Untitled trip"}
                      </div>
                      <div className="text-secondary" style={{ fontSize: "0.8rem" }}>
                        {(trip.trip_type || "General").charAt(0).toUpperCase() +
                          (trip.trip_type || "General").slice(1)}{" "}
                        • {trip.days || 0} {(trip.days || 0) === 1 ? "day" : "days"}
                      </div>

                      {/* Progress bar */}
                      <div className="mt-1" style={{ maxWidth: 200 }}>
                        <div
                          className="progress progress-modern"
                          style={{ height: 4 }}
                          role="progressbar"
                          aria-valuenow={stats.percent}
                          aria-valuemin="0"
                          aria-valuemax="100"
                        >
                          <div
                            className="progress-bar progress-bar-modern"
                            style={{ width: `${stats.percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  
                    <div
                      className="text-secondary d-none d-sm-block"
                      style={{ fontSize: "0.8rem", flexShrink: 0 }}
                    >
                      Last modified {formatDate(trip.updated_at || trip.created_at)}
                    </div>

                    <div
                      className="position-relative"
                      ref={menuOpen ? menuRef : null}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary btn-modern-outline"
                        style={{ flexShrink: 0 }}
                        onClick={() =>
                          setOpenMenuId((prev) => (prev === trip.id ? null : trip.id))
                        }
                        aria-label="More actions"
                      >
                        ⋯
                      </button>

                      {menuOpen && (
                        <div
                          className="position-absolute end-0 mt-2 p-2 rounded-4"
                          style={{
                            minWidth: 170,
                            background: "rgba(20, 27, 45, 0.98)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            boxShadow: "0 10px 30px rgba(0,0,0,0.28)",
                            zIndex: 1000,
                          }}
                        >
                          <button
                            type="button"
                            className="btn w-100 text-start mb-1"
                            style={{ color: "var(--text)", background: "transparent", border: "none" }}
                            onClick={() => { setOpenMenuId(null); goEditTrip(trip.id); }}
                            disabled={isBusy}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn w-100 text-start mb-1"
                            style={{ color: "var(--text)", background: "transparent", border: "none" }}
                            onClick={() => onResetTrip(trip.id)}
                            disabled={isBusy}
                          >
                            Reset
                          </button>
                          <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "0.35rem 0 0.5rem" }} />
                          <button
                            type="button"
                            className="btn w-100 text-start"
                            style={{ color: "#ff8f8f", background: "transparent", border: "none" }}
                            onClick={() => onDeleteTrip(trip.id)}
                            disabled={isBusy}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New trip button*/}
      <div className="mt-4">
        <button
          className="btn btn-primary btn-modern w-100 py-3 mb-3"
          style={{ fontSize: "1rem", fontWeight: 600 }}
          onClick={goNewTrip}
        >
          New Trip
        </button>
      </div>
    </div>
  );
}