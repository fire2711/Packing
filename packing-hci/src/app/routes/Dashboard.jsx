import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteTrip, fetchListItems, fetchTrips, resetTripPacked } from "../../lib/db";

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
      await resetTripPacked(tripId);

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
    <div className="container py-4">
      <div className="d-flex flex-wrap gap-3 align-items-start justify-content-between mb-4">
        <div>
          <h1 className="h3 mb-1">Dashboard</h1>
          <div className="text-secondary">
            Browse and manage your trips, then open a trip to pack.
          </div>
        </div>

        <button
          className="btn btn-primary btn-modern"
          style={{ whiteSpace: "nowrap" }}
          onClick={goNewTrip}
        >
          New Trip
        </button>
      </div>

      {err ? <div className="alert alert-danger">{err}</div> : null}

      <div className="card card-modern mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-md-7">
              <label className="form-label mb-1">Search</label>
              <input
                className="form-control"
                placeholder="Search trips..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="col-12 col-md-5">
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
        </div>
      </div>

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
            <button className="btn btn-primary btn-modern" onClick={goNewTrip}>
              Create a trip
            </button>
          </div>
        </div>
      ) : (
        <div className="row g-3" style={{ overflow: "visible" }}>
          {filteredTrips.map((trip) => {
            const stats = tripStats[trip.id] || { total: 0, packed: 0, percent: 0 };
            const pinned = isPinned(trip.id);
            const isBusy = busyId === trip.id;
            const menuOpen = openMenuId === trip.id;

            return (
              <div
                key={trip.id}
                className="col-12 col-xl-6"
                style={{ overflow: "visible" }}
              >
                <div
                  className="card card-modern h-100"
                  style={{
                    overflow: "visible",
                    position: "relative",
                    zIndex: menuOpen ? 50 : 1,
                  }}
                >
                  <div className="card-body d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                      <div className="d-flex align-items-start gap-2">
                        <button
                          type="button"
                          className={`btn btn-sm ${
                            pinned ? "btn-warning" : "btn-outline-secondary btn-modern-outline"
                          }`}
                          onClick={() => togglePin(trip.id)}
                          title={pinned ? "Unpin trip" : "Pin trip"}
                          aria-label={pinned ? "Unpin trip" : "Pin trip"}
                        >
                          {pinned ? "★" : "☆"}
                        </button>

                        <div>
                          <div className="fw-semibold fs-5">
                            {trip.name || "Untitled trip"}
                          </div>
                          <div className="text-secondary">
                            {trip.trip_type || "general"} • {trip.days || 0} days
                          </div>
                        </div>
                      </div>

                      <div
                        className="d-flex align-items-center gap-2"
                        ref={menuOpen ? menuRef : null}
                      >
                        <button
                          className="btn btn-primary btn-modern"
                          onClick={() => goPackTrip(trip.id)}
                        >
                          Pack
                        </button>

                        <div className="position-relative">
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-modern-outline"
                            onClick={() =>
                              setOpenMenuId((prev) => (prev === trip.id ? null : trip.id))
                            }
                            aria-label="More actions"
                            title="More actions"
                          >
                            ⋯
                          </button>

                          {menuOpen ? (
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
                                style={{
                                  color: "var(--text)",
                                  background: "transparent",
                                  border: "none",
                                }}
                                onClick={() => {
                                  setOpenMenuId(null);
                                  goEditTrip(trip.id);
                                }}
                                disabled={isBusy}
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                className="btn w-100 text-start mb-1"
                                style={{
                                  color: "var(--text)",
                                  background: "transparent",
                                  border: "none",
                                }}
                                onClick={() => onResetTrip(trip.id)}
                                disabled={isBusy}
                              >
                                Reset
                              </button>

                              <div
                                style={{
                                  height: 1,
                                  background: "rgba(255,255,255,0.08)",
                                  margin: "0.35rem 0 0.5rem",
                                }}
                              />

                              <button
                                type="button"
                                className="btn w-100 text-start"
                                style={{
                                  color: "#ff8f8f",
                                  background: "transparent",
                                  border: "none",
                                }}
                                onClick={() => onDeleteTrip(trip.id)}
                                disabled={isBusy}
                              >
                                Delete
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="d-flex justify-content-between small text-secondary mb-1">
                        <span>
                          {stats.packed}/{stats.total} packed
                        </span>
                        <span>{stats.percent}%</span>
                      </div>

                      <div
                        className="progress progress-modern"
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

                    <div className="row g-2 text-secondary small mt-auto">
                      <div className="col-12 col-sm-6">
                        <span className="fw-semibold">Created:</span>{" "}
                        {formatDate(trip.created_at)}
                      </div>
                      <div className="col-12 col-sm-6">
                        <span className="fw-semibold">Updated:</span>{" "}
                        {formatDate(trip.updated_at || trip.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}