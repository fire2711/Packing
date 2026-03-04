import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteTrip, fetchItems, fetchTrips, resetTripPacked, updateItem } from "../../lib/db";
import { CATEGORIES } from "../../lib/suggestions";

const CATEGORY_LABELS = {
  all: "All categories",
  electronics: "Electronics",
  clothes: "Clothes",
  toiletries: "Toiletries",
  documents: "Documents",
  misc: "Misc",
};

function pct(packed, total) {
  if (total <= 0) return 0;
  return Math.round((packed / total) * 100);
}

function safeMsg(e, fallback) {
  return (e && e.message) || fallback;
}

export default function Dashboard() {
  const nav = useNavigate();

  const [trips, setTrips] = useState([]);
  const [query, setQuery] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const [selectedTripId, setSelectedTripId] = useState(null);
  const [previewItems, setPreviewItems] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  // preview filters
  const [onlyUnpacked, setOnlyUnpacked] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");

  const selectedTrip = useMemo(() => {
    return trips.find((t) => t.id === selectedTripId) || null;
  }, [trips, selectedTripId]);

  const filteredTrips = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return trips;
    return trips.filter((t) => (t.name || "").toLowerCase().includes(q));
  }, [trips, query]);

  const previewStats = useMemo(() => {
    const total = previewItems.length;
    const packed = previewItems.filter((i) => !!i.packed).length;
    return { total, packed, percent: pct(packed, total) };
  }, [previewItems]);

  const previewItemsFiltered = useMemo(() => {
    let out = previewItems;

    if (onlyUnpacked) out = out.filter((i) => !i.packed);
    if (categoryFilter !== "all") out = out.filter((i) => i.category === categoryFilter);

    // unpacked first
    return [...out].sort((a, b) => Number(a.packed) - Number(b.packed));
  }, [previewItems, onlyUnpacked, categoryFilter]);

  async function refreshTrips() {
    setErr("");

    try {
      const data = await fetchTrips();
      setTrips(data);

      // pick a sane selected trip
      if (!data.length) {
        setSelectedTripId(null);
        return;
      }

      // if nothing selected yet, pick first
      if (!selectedTripId) {
        setSelectedTripId(data[0].id);
        return;
      }

      const stillExists = data.some((t) => t.id === selectedTripId);
      if (!stillExists) setSelectedTripId(data[0].id);
    } catch (e) {
      setErr(safeMsg(e, "Failed to load trips"));
    }
  }

  async function refreshPreview(tripId) {
    if (!tripId) {
      setPreviewItems([]);
      return;
    }

    setPreviewLoading(true);
    try {
      const its = await fetchItems(tripId);
      setPreviewItems(its);
    } catch {
      setPreviewItems([]);
    } finally {
      setPreviewLoading(false);
    }
  }

  useEffect(() => {
    refreshTrips();
  }, []);

  useEffect(() => {
    refreshPreview(selectedTripId);
  }, [selectedTripId]);

  async function togglePacked(item) {
    const nextPacked = !item.packed;

    setPreviewItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, packed: nextPacked } : x)));

    try {
      await updateItem(item.id, { packed: nextPacked });
    } catch (e) {
      setPreviewItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, packed: item.packed } : x)));
      setErr(safeMsg(e, "Failed to update item"));
    }
  }

  function goNewTrip() {
    nav("/trip/new");
  }

  function goEditTrip(tripId) {
    nav(`/trip/${tripId}/edit`);
  }

  async function onDeleteTrip(tripId) {
    const ok = window.confirm("Delete this trip? This cannot be undone.");
    if (!ok) return;

    setBusy(true);
    setErr("");

    try {
      await deleteTrip(tripId);
      await refreshTrips();

      if (selectedTripId === tripId) setPreviewItems([]);
      else await refreshPreview(selectedTripId);
    } catch (e) {
      setErr(safeMsg(e, "Failed to delete trip"));
    } finally {
      setBusy(false);
    }
  }

  async function onResetChecks() {
    if (!selectedTripId) return;

    const ok = window.confirm("Reset trip?");
    if (!ok) return;

    setBusy(true);
    setErr("");

    try {
      await resetTripPacked(selectedTripId);
      await refreshPreview(selectedTripId);
    } catch (e) {
      setErr(safeMsg(e, "Failed to reset checkmarks"));
    } finally {
      setBusy(false);
    }
  }

  function clearFilters() {
    setCategoryFilter("all");
    setOnlyUnpacked(false);
  }

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
        <div>
          <h1 className="h3 mb-1">Dashboard</h1>
          <div className="text-secondary">Pick a trip to preview and check items off.</div>
        </div>

        <div className="d-flex gap-2 align-items-center">
          <input
            className="form-control"
            style={{ minWidth: 240 }}
            placeholder="Search trips..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn btn-primary btn-modern" style={{ whiteSpace: "nowrap" }} onClick={goNewTrip}>
            New Trip
          </button>
        </div>
      </div>

      {err ? <div className="alert alert-danger">{err}</div> : null}

      {filteredTrips.length === 0 ? (
        <div className="card card-modern">
          <div className="card-body">
            <h5 className="card-title">No trips yet</h5>
            <p className="card-text text-secondary">Create your first list and it’ll show up here.</p>
            <button className="btn btn-primary btn-modern" onClick={goNewTrip}>
              Create a trip
            </button>
          </div>
        </div>
      ) : (
        <div className="row g-3">
          {/* Trip list */}
          <div className="col-12 col-lg-5">
            <div className="card card-modern">
              <div className="card-body">
                <div className="fw-semibold mb-2">Your trips</div>

                <div className="list-group list-group-modern">
                  {filteredTrips.map((t) => {
                    const active = t.id === selectedTripId;

                    return (
                      <button
                        key={t.id}
                        type="button"
                        className={`list-group-item list-group-item-action d-flex justify-content-between align-items-start ${
                          active ? "active" : ""
                        }`}
                        onClick={() => setSelectedTripId(t.id)}
                      >
                        <div className="me-2">
                          <div className="fw-semibold">{t.name || "Untitled trip"}</div>
                          <div className={`${active ? "text-white-50" : "text-secondary"} small`}>
                            {t.trip_type} • {t.days} days
                          </div>
                        </div>

                        {/* 3 dots menu: Edit / Delete */}
                        <details className="kebab" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                          <summary className="kebab-btn">⋮</summary>
                          <div className="kebab-menu">
                            <button
                              className="kebab-item"
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                goEditTrip(t.id);
                              }}
                            >
                              Edit
                            </button>
                            <div className="kebab-divider" />
                            <button
                              className="kebab-item kebab-danger"
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onDeleteTrip(t.id);
                              }}
                              disabled={busy}
                            >
                              Delete
                            </button>
                          </div>
                        </details>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Preview panel */}
          <div className="col-12 col-lg-7">
            <div className="card card-modern h-100">
              <div className="card-body">
                {!selectedTrip ? (
                  <div className="text-secondary">Select a trip to preview it.</div>
                ) : (
                  <>
                    <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                      <div>
                        <div className="fw-semibold fs-5">{selectedTrip.name || "Untitled trip"}</div>
                        <div className="text-secondary">
                          {selectedTrip.trip_type} • {selectedTrip.days} days
                        </div>
                      </div>

                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-outline-secondary btn-modern-outline"
                          onClick={() => goEditTrip(selectedTrip.id)}
                        >
                          Edit
                        </button>
                        <button className="btn btn-outline-danger btn-modern-outline" onClick={onResetChecks} disabled={busy}>
                          Reset
                        </button>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="mb-3">
                      <div className="d-flex justify-content-between small text-secondary mb-1">
                        <span>
                          {previewStats.packed}/{previewStats.total} packed
                        </span>
                        <span>{previewStats.percent}%</span>
                      </div>
                      <div
                        className="progress progress-modern"
                        role="progressbar"
                        aria-valuenow={previewStats.percent}
                        aria-valuemin="0"
                        aria-valuemax="100"
                      >
                        <div className="progress-bar progress-bar-modern" style={{ width: `${previewStats.percent}%` }} />
                      </div>
                    </div>

                    {/* Filters */}
                    <div className="card card-modern mb-3">
                      <div className="card-body py-3">
                        <div className="row g-2 align-items-end">
                          <div className="col-12 col-md-5">
                            <label className="form-label mb-1">Category</label>
                            <select className="form-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                              <option value="all">All categories</option>
                              {CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                  {CATEGORY_LABELS[c]}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="col-12 col-md-5">
                            <label className="form-label mb-1">View</label>
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={onlyUnpacked}
                                onChange={(e) => setOnlyUnpacked(e.target.checked)}
                                id="onlyUnpackedDash"
                              />
                              <label className="form-check-label" htmlFor="onlyUnpackedDash">
                                Show only unpacked
                              </label>
                            </div>
                          </div>

                          <div className="col-12 col-md-2 d-grid">
                            <button className="btn btn-outline-secondary btn-modern-outline" type="button" onClick={clearFilters}>
                              Clear
                            </button>
                          </div>
                        </div>

                        <div className="text-secondary small mt-2">
                          Showing {previewItemsFiltered.length} item(s)
                          {onlyUnpacked ? " (unpacked only)" : ""}
                          {categoryFilter !== "all" ? ` in ${CATEGORY_LABELS[categoryFilter]}` : ""}.
                        </div>
                      </div>
                    </div>

                    {/* Checklist */}
                    <div className="fw-semibold mb-2">Checklist</div>

                    {previewLoading ? (
                      <div className="text-secondary">Loading items…</div>
                    ) : previewItemsFiltered.length === 0 ? (
                      <div className="text-secondary">No items match your filters. Try clearing filters or editing the trip.</div>
                    ) : (
                      <div className="list-group">
                        {previewItemsFiltered.map((it) => (
                          <div key={it.id} className="list-group-item d-flex justify-content-between align-items-center gap-2">
                            <div className="form-check m-0">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={!!it.packed}
                                onChange={() => togglePacked(it)}
                                id={`dash_${it.id}`}
                              />
                              <label
                                className={`form-check-label ${it.packed ? "text-decoration-line-through text-secondary" : ""}`}
                                htmlFor={`dash_${it.id}`}
                              >
                                {it.name}
                              </label>
                            </div>

                            <span className="badge rounded-pill text-bg-light">{it.category}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}