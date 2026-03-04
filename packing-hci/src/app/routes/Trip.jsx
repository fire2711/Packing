// src/app/routes/Trip.jsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  addItem,
  createTrip,
  deleteItem,
  fetchItems,
  fetchTrip,
  resetTripPacked,
  updateItem,
  updateTrip,
} from "../../lib/db";
import { buildSuggestions, CATEGORIES } from "../../lib/suggestions";

const CATEGORY_LABELS = {
  all: "All categories",
  electronics: "Electronics",
  clothes: "Clothes",
  toiletries: "Toiletries",
  documents: "Documents",
  misc: "Misc",
};

// Fixed trip types (streamlined + readable labels)
const TRIP_TYPES = [
  { id: "general", label: "General" },
  { id: "leisure", label: "Leisure / Weekend" },
  { id: "vacation", label: "Vacation" },
  { id: "work", label: "Work" },
  { id: "beach", label: "Beach" },
  { id: "cold", label: "Winter / Ski" },
  { id: "gym", label: "Gym / Fitness" },
  { id: "outdoors", label: "Outdoors / Camping" },
  { id: "other", label: "Other" },
];

// Simple tags (checkboxes) that make suggestions feel smarter
const TRIP_TAGS = [
  { id: "flying", label: "Flying" },
  { id: "international", label: "International" },
  { id: "formal", label: "Formal event" },
  { id: "rain", label: "Rainy weather" },
  { id: "hiking", label: "Hiking" },
  { id: "swimming", label: "Swimming" },
];

function tripTypeLabel(id) {
  const t = TRIP_TYPES.find((x) => x.id === id);
  return t ? t.label : id;
}

function pct(packed, total) {
  if (total <= 0) return 0;
  return Math.round((packed / total) * 100);
}

function safeMsg(e, fallback) {
  return (e && e.message) || fallback;
}

function tmpId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `tmp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function CategoryList({ items, isEditLike, onTogglePacked, onChangeCategory, onRenameItem, onDeleteItem }) {
  if (!items.length) return <div className="text-secondary">No items match the current filters.</div>;

  return (
    <div className="list-group">
      {items.map((it) => {
        const key = it.id ?? it._tmpId;
        const chkId = `chk_${key}`;

        return (
          <div key={key} className="list-group-item d-flex justify-content-between align-items-center gap-2">
            <div className="form-check m-0">
              <input
                className="form-check-input"
                type="checkbox"
                checked={!!it.packed}
                onChange={() => onTogglePacked(it)}
                id={chkId}
              />
              <label
                className={`form-check-label ${it.packed ? "text-decoration-line-through text-secondary" : ""}`}
                htmlFor={chkId}
              >
                {it.name}
              </label>
            </div>

            {isEditLike ? (
              <div className="d-flex align-items-center gap-2">
                <select
                  className="form-select form-select-sm"
                  style={{ width: 160 }}
                  value={it.category}
                  onChange={(e) => onChangeCategory(it, e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>

                <div className="btn-group btn-group-sm">
                  <button className="btn btn-outline-secondary" type="button" onClick={() => onRenameItem(it)}>
                    Rename
                  </button>
                  <button className="btn btn-outline-danger" type="button" onClick={() => onDeleteItem(it)}>
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <span className="badge rounded-pill text-bg-light">{it.category}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Trip({ mode = "view" }) {
  const { tripId } = useParams();
  const nav = useNavigate();

  const isDraft = mode === "draft"; // /trip/new
  const isEdit = mode === "edit"; // /trip/:id/edit
  const isView = mode === "view"; // /trip/:id
  const isEditLike = isDraft || isEdit;

  const [trip, setTrip] = useState(null);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const [draftTrip, setDraftTrip] = useState({
    name: "New Trip",
    trip_type: "general",
    days: 3,
    tags: [], // <-- NEW
  });
  const [draftItems, setDraftItems] = useState([]);

  const [newItem, setNewItem] = useState({ name: "", category: "misc" });

  const [onlyUnpacked, setOnlyUnpacked] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");

  const activeTrip = isDraft ? draftTrip : trip;
  const activeItems = isDraft ? draftItems : items;

  async function loadTripAndItems() {
    if (isDraft) return;

    setErr("");
    try {
      const t = await fetchTrip(tripId);

      // Backwards compat: ensure tags exists
      if (!t.tags) t.tags = [];

      const its = await fetchItems(tripId);
      setTrip(t);
      setItems(its);
    } catch (e) {
      setErr(safeMsg(e, "Failed to load trip"));
    }
  }

  async function refreshItems() {
    if (isDraft) return;
    try {
      const its = await fetchItems(tripId);
      setItems(its);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadTripAndItems();
  }, [tripId, isDraft]);

  const stats = useMemo(() => {
    const total = activeItems.length;
    const packed = activeItems.filter((i) => !!i.packed).length;
    return { total, packed, percent: pct(packed, total) };
  }, [activeItems]);

  const filteredItems = useMemo(() => {
    let out = activeItems;

    if (onlyUnpacked) out = out.filter((i) => !i.packed);
    if (categoryFilter !== "all") out = out.filter((i) => i.category === categoryFilter);

    return [...out].sort((a, b) => Number(a.packed) - Number(b.packed));
  }, [activeItems, onlyUnpacked, categoryFilter]);

  const itemsByCategory = useMemo(() => {
    const map = Object.fromEntries(CATEGORIES.map((c) => [c, []]));
    for (const it of filteredItems) {
      const cat = map[it.category] ? it.category : "misc";
      map[cat].push(it);
    }
    return map;
  }, [filteredItems]);

  const suggestions = useMemo(() => {
    if (!activeTrip || !isEditLike) return [];

    const sug = buildSuggestions({
      trip_type: activeTrip.trip_type,
      days: activeTrip.days,
      tags: Array.isArray(activeTrip.tags) ? activeTrip.tags : [],
      frequentNames: [],
    });

    const existing = new Set(activeItems.map((i) => (i.name || "").toLowerCase()));
    return sug.filter((s) => !existing.has(s.name.toLowerCase())).slice(0, 16);
  }, [activeTrip, activeItems, isEditLike]);

  function clearFilters() {
    setCategoryFilter("all");
    setOnlyUnpacked(false);
  }

  function patchActiveTrip(patch) {
    if (isDraft) {
      setDraftTrip((p) => ({ ...p, ...patch }));
      return;
    }

    setErr("");
    updateTrip(tripId, patch)
      .then((t) => {
        if (!t.tags) t.tags = [];
        setTrip(t);
      })
      .catch((e) => setErr(safeMsg(e, "Failed to update trip")));
  }

  function toggleTag(tagId) {
    const curr = Array.isArray(activeTrip.tags) ? activeTrip.tags : [];
    const next = curr.includes(tagId) ? curr.filter((t) => t !== tagId) : [...curr, tagId];
    patchActiveTrip({ tags: next });
  }

  async function onTogglePacked(item) {
    setErr("");
    const nextPacked = !item.packed;

    if (isDraft) {
      setDraftItems((prev) => prev.map((x) => (x._tmpId === item._tmpId ? { ...x, packed: nextPacked } : x)));
      return;
    }

    setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, packed: nextPacked } : x)));

    try {
      await updateItem(item.id, { packed: nextPacked });
    } catch (e) {
      setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, packed: item.packed } : x)));
      setErr(safeMsg(e, "Failed to update item"));
    }
  }

  async function onAddItem(e) {
    e.preventDefault();

    const name = newItem.name.trim();
    if (!name) return;

    setErr("");

    if (isDraft) {
      setDraftItems((prev) => [...prev, { _tmpId: tmpId(), name, category: newItem.category, packed: false }]);
      setNewItem((p) => ({ ...p, name: "" }));
      return;
    }

    setBusy(true);
    try {
      await addItem(tripId, { name, category: newItem.category, packed: false });
      setNewItem((p) => ({ ...p, name: "" }));
      await refreshItems();
    } catch (e) {
      setErr(safeMsg(e, "Failed to add item"));
    } finally {
      setBusy(false);
    }
  }

  async function onAddSuggestion(s) {
    setErr("");

    if (isDraft) {
      setDraftItems((prev) => [...prev, { _tmpId: tmpId(), name: s.name, category: s.category, packed: false }]);
      return;
    }

    setBusy(true);
    try {
      await addItem(tripId, { name: s.name, category: s.category, packed: false });
      await refreshItems();
    } catch (e) {
      setErr(safeMsg(e, "Failed to add suggestion"));
    } finally {
      setBusy(false);
    }
  }

  function onRenameItem(item) {
    const next = window.prompt("Rename item:", item.name);
    if (next == null) return;

    const name = next.trim();
    if (!name) return;

    if (isDraft) {
      setDraftItems((prev) => prev.map((x) => (x._tmpId === item._tmpId ? { ...x, name } : x)));
      return;
    }

    setErr("");
    updateItem(item.id, { name })
      .then(() => setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, name } : x))))
      .catch((e) => setErr(safeMsg(e, "Failed to rename item")));
  }

  function onChangeCategory(item, category) {
    if (isDraft) {
      setDraftItems((prev) => prev.map((x) => (x._tmpId === item._tmpId ? { ...x, category } : x)));
      return;
    }

    setErr("");
    updateItem(item.id, { category })
      .then(() => setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, category } : x))))
      .catch((e) => setErr(safeMsg(e, "Failed to update category")));
  }

  function onDeleteItem(item) {
    const ok = window.confirm("Delete this item?");
    if (!ok) return;

    if (isDraft) {
      setDraftItems((prev) => prev.filter((x) => x._tmpId !== item._tmpId));
      return;
    }

    setErr("");
    deleteItem(item.id)
      .then(() => setItems((prev) => prev.filter((x) => x.id !== item.id)))
      .catch((e) => setErr(safeMsg(e, "Failed to delete item")));
  }

  async function onResetChecks() {
    const ok = window.confirm("Reset all checkmarks for this trip? (Items will stay.)");
    if (!ok) return;

    if (isDraft) {
      setDraftItems((prev) => prev.map((x) => ({ ...x, packed: false })));
      return;
    }

    setBusy(true);
    setErr("");

    try {
      await resetTripPacked(tripId);
      await refreshItems();
    } catch (e) {
      setErr(safeMsg(e, "Failed to reset checkmarks"));
    } finally {
      setBusy(false);
    }
  }

  async function clearPackedItems() {
    if (!isEditLike) return;

    const ok = window.confirm("Remove all packed items from this trip?");
    if (!ok) return;

    if (isDraft) {
      setDraftItems((prev) => prev.filter((x) => !x.packed));
      return;
    }

    setBusy(true);
    setErr("");

    try {
      const packedItems = items.filter((i) => !!i.packed);
      for (const it of packedItems) {
        await deleteItem(it.id);
      }
      await refreshItems();
    } catch (e) {
      setErr(safeMsg(e, "Failed to clear packed items"));
    } finally {
      setBusy(false);
    }
  }

  function onCancelDraft() {
    nav("/");
  }

  async function onConfirmDraft() {
    setBusy(true);
    setErr("");

    try {
      const t = await createTrip({
        name: (draftTrip.name || "New Trip").trim() || "New Trip",
        trip_type: draftTrip.trip_type,
        days: Number(draftTrip.days) || 3,
        tags: Array.isArray(draftTrip.tags) ? draftTrip.tags : [],
      });

      for (const it of draftItems) {
        await addItem(t.id, { name: it.name, category: it.category, packed: !!it.packed });
      }

      nav("/");
    } catch (e) {
      setErr(safeMsg(e, "Failed to create trip"));
    } finally {
      setBusy(false);
    }
  }

  if (!activeTrip) {
    return (
      <div className="container py-4">
        <div className="text-secondary">{err || "Loading…"}</div>
      </div>
    );
  }

  const tagCount = Array.isArray(activeTrip.tags) ? activeTrip.tags.length : 0;

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h1 className="h3 mb-0">{activeTrip.name || "Untitled trip"}</h1>
            <span className="badge text-bg-secondary">
              {tripTypeLabel(activeTrip.trip_type)} • {activeTrip.days}d{tagCount ? ` • ${tagCount} tags` : ""}
            </span>
          </div>

          <div className="text-secondary small mt-1">
            {stats.packed}/{stats.total} packed • {stats.percent}%
            {isDraft ? <span className="ms-2 badge text-bg-secondary">Draft</span> : null}
          </div>
        </div>

        <div className="d-flex gap-2">
          {isDraft ? (
            <>
              <button className="btn btn-outline-secondary btn-modern-outline" onClick={onCancelDraft} disabled={busy}>
                Cancel
              </button>
              <button className="btn btn-primary btn-modern" onClick={onConfirmDraft} disabled={busy}>
                {busy ? "Saving…" : "Confirm"}
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-outline-secondary btn-modern-outline" onClick={() => nav("/")}>
                Back
              </button>

              {isEdit ? (
                <button className="btn btn-primary btn-modern" onClick={() => nav(`/trip/${tripId}`)}>
                  Confirm
                </button>
              ) : (
                <button className="btn btn-primary btn-modern" onClick={() => nav(`/trip/${tripId}/edit`)}>
                  Edit
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {err ? <div className="alert alert-danger">{err}</div> : null}

      {/* Progress + actions */}
      <div className="card card-modern mb-3">
        <div className="card-body py-3">
          <div className="d-flex justify-content-between small text-secondary mb-1">
            <span>
              {stats.packed}/{stats.total} packed
            </span>
            <span>{stats.percent}%</span>
          </div>

          <div className="progress progress-modern" role="progressbar" aria-valuenow={stats.percent} aria-valuemin="0" aria-valuemax="100">
            <div className="progress-bar progress-bar-modern" style={{ width: `${stats.percent}%` }} />
          </div>

          <div className="d-flex flex-wrap gap-2 mt-3">
            <button className="btn btn-outline-danger btn-sm" onClick={onResetChecks} disabled={busy}>
              Reset
            </button>
            {isEditLike ? (
              <button className="btn btn-outline-danger btn-sm" onClick={clearPackedItems} disabled={busy}>
                Clear Items
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Edit-like: meta + add item + suggestions */}
      {isEditLike ? (
        <>
          <div className="card card-modern mb-3">
            <div className="card-body py-3">
              <div className="row g-2 align-items-end">
                <div className="col-12 col-md-6">
                  <label className="form-label">Trip name</label>
                  <input
                    className="form-control"
                    value={activeTrip.name}
                    onChange={(e) => patchActiveTrip({ name: e.target.value })}
                  />
                </div>

                <div className="col-6 col-md-3">
                  <label className="form-label">Trip type</label>
                  <select
                    className="form-select"
                    value={activeTrip.trip_type}
                    onChange={(e) => patchActiveTrip({ trip_type: e.target.value })}
                  >
                    {TRIP_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-6 col-md-3">
                  <label className="form-label">Days</label>
                  <input
                    className="form-control"
                    type="number"
                    min={1}
                    max={60}
                    value={activeTrip.days}
                    onChange={(e) => patchActiveTrip({ days: Number(e.target.value) })}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label mb-1">Trip tags (optional)</label>
                  <div className="d-flex flex-wrap gap-2">
                    {TRIP_TAGS.map((t) => {
                      const checked = Array.isArray(activeTrip.tags) && activeTrip.tags.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          className={`btn btn-sm ${checked ? "btn-primary" : "btn-outline-primary"}`}
                          onClick={() => toggleTag(t.id)}
                        >
                          {checked ? "✓ " : "+ "}
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="text-secondary small mt-2">
                    Tags change your suggestions (e.g., “Flying” adds boarding pass + headphones).
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card card-modern mb-3">
            <div className="card-body py-3">
              <form onSubmit={onAddItem} className="row g-2 align-items-end">
                <div className="col-12 col-md-7">
                  <label className="form-label">Add item</label>
                  <input
                    className="form-control"
                    value={newItem.name}
                    onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g., Phone charger"
                  />
                </div>

                <div className="col-12 col-md-3">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={newItem.category}
                    onChange={(e) => setNewItem((p) => ({ ...p, category: e.target.value }))}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-12 col-md-2 d-grid">
                  <button className="btn btn-primary btn-modern" disabled={busy}>
                    {busy ? "Adding…" : "Add"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {suggestions.length ? (
            <div className="card card-modern mb-3">
              <div className="card-body py-3">
                <div className="fw-semibold mb-2">Suggestions</div>
                <div className="d-flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={`${s.category}_${s.name}`}
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => onAddSuggestion(s)}
                      disabled={busy}
                    >
                      + {s.name} <span className="text-secondary">({CATEGORY_LABELS[s.category]})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {/* Mobile accordion (no bootstrap JS needed) */}
      <div className="d-lg-none">
        {CATEGORIES.map((cat, idx) => (
          <details key={cat} open={idx === 0} className="card card-modern mb-2">
            <summary className="d-flex justify-content-between align-items-center px-3 py-3" style={{ cursor: "pointer" }}>
              <span className="fw-semibold">{CATEGORY_LABELS[cat]}</span>
              <span className="badge text-bg-secondary">{itemsByCategory[cat].length}</span>
            </summary>
            <div className="px-3 pb-3">
              <CategoryList
                items={itemsByCategory[cat]}
                isEditLike={isEditLike}
                onTogglePacked={onTogglePacked}
                onChangeCategory={onChangeCategory}
                onRenameItem={onRenameItem}
                onDeleteItem={onDeleteItem}
              />
            </div>
          </details>
        ))}
      </div>

      {/* Desktop grid */}
      <div className="row g-3 d-none d-lg-flex">
        {CATEGORIES.map((cat) => (
          <div className="col-12 col-lg-6" key={cat}>
            <div className="card card-modern h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div className="fw-semibold">{CATEGORY_LABELS[cat]}</div>
                  <span className="badge text-bg-secondary">{itemsByCategory[cat].length}</span>
                </div>

                <CategoryList
                  items={itemsByCategory[cat]}
                  isEditLike={isEditLike}
                  onTogglePacked={onTogglePacked}
                  onChangeCategory={onChangeCategory}
                  onRenameItem={onRenameItem}
                  onDeleteItem={onDeleteItem}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {isView ? null : null}
    </div>
  );
}