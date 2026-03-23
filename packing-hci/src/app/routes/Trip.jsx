// src/app/routes/Trip.jsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  addItem,
  createTrip,
  deleteItem,
  fetchItems,
  fetchTrip,
  fetchTrips,
  resetTripPacked,
  updateItem,
  updateTrip,
} from "../../lib/db";
import { buildSuggestions } from "../../lib/suggestions";
import { normalizeName, pct, safeMsg, tmpId } from "./tripUtils";
import TripHeader from "../../components/trip/TripHeader";
import TripProgressCard from "../../components/trip/TripProgressCard";
import TripDetailsCard from "../../components/trip/TripDetailsCard";
import TripSuggestionsCard from "../../components/trip/TripSuggestionsCard";

export default function Trip({ mode = "view" }) {
  const { tripId } = useParams();
  const nav = useNavigate();

  const isDraft = mode === "draft";
  const isEdit = mode === "edit";
  const isEditLike = isDraft || isEdit;

  const [trip, setTrip] = useState(null);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [learnedNames, setLearnedNames] = useState([]);

  const [draftTrip, setDraftTrip] = useState({
    name: "New Trip",
    trip_type: "general",
    days: 3,
    tags: [],
  });

  const [draftItems, setDraftItems] = useState([]);
  const [newItemName, setNewItemName] = useState("");

  const activeTrip = isDraft ? draftTrip : trip;
  const activeItems = isDraft ? draftItems : items;

  async function loadTripAndItems() {
    if (isDraft) return;

    setErr("");
    try {
      const t = await fetchTrip(tripId);
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

  async function loadPastTripLearning(currentTrip) {
    if (!currentTrip?.trip_type) {
      setLearnedNames([]);
      return;
    }

    try {
      const allTrips = await fetchTrips();

      const similarTrips = allTrips.filter((t) => {
        if (!t) return false;
        if (!isDraft && tripId && t.id === tripId) return false;
        return t.trip_type === currentTrip.trip_type;
      });

      const counts = {};

      for (const t of similarTrips) {
        const tripItems = await fetchItems(t.id);

        const uniqueTripNames = new Set(
          tripItems.map((item) => normalizeName(item.name)).filter(Boolean)
        );

        for (const name of uniqueTripNames) {
          counts[name] = (counts[name] || 0) + 1;
        }
      }

      const topNames = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name]) => name);

      setLearnedNames(topNames);
    } catch {
      setLearnedNames([]);
    }
  }

  useEffect(() => {
    loadTripAndItems();
  }, [tripId, isDraft]);

  useEffect(() => {
    if (!activeTrip || !isEditLike) return;
    loadPastTripLearning(activeTrip);
  }, [activeTrip?.trip_type, isEditLike, tripId]);

  const stats = useMemo(() => {
    const total = activeItems.length;
    const packed = activeItems.filter((i) => !!i.packed).length;
    return { total, packed, percent: pct(packed, total) };
  }, [activeItems]);

  const sortedItems = useMemo(() => {
    return [...activeItems].sort((a, b) => {
      if (Number(a.packed) !== Number(b.packed)) return Number(a.packed) - Number(b.packed);
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [activeItems]);

  const suggestions = useMemo(() => {
    if (!activeTrip || !isEditLike) return [];

    const generated = buildSuggestions({
      trip_type: activeTrip.trip_type,
      days: activeTrip.days,
      tags: Array.isArray(activeTrip.tags) ? activeTrip.tags : [],
      frequentNames: learnedNames,
    });

    const existing = new Set(activeItems.map((i) => normalizeName(i.name)));
    return generated.filter((s) => !existing.has(normalizeName(s.name)));
  }, [activeTrip, activeItems, isEditLike, learnedNames]);

  function patchActiveTrip(patch) {
    if (isDraft) {
      setDraftTrip((prev) => ({ ...prev, ...patch }));
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
      setDraftItems((prev) =>
        prev.map((x) => (x._tmpId === item._tmpId ? { ...x, packed: nextPacked } : x))
      );
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

    const name = newItemName.trim();
    if (!name) return;

    setErr("");

    if (isDraft) {
      const exists = draftItems.some((x) => normalizeName(x.name) === normalizeName(name));
      if (exists) return;

      setDraftItems((prev) => [
        ...prev,
        { _tmpId: tmpId(), name, packed: false },
      ]);
      setNewItemName("");
      return;
    }

    setBusy(true);
    try {
      await addItem(tripId, { name, packed: false });
      setNewItemName("");
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
      const exists = draftItems.some((x) => normalizeName(x.name) === normalizeName(s.name));
      if (exists) return;

      setDraftItems((prev) => [
        ...prev,
        { _tmpId: tmpId(), name: s.name, packed: false },
      ]);
      return;
    }

    setBusy(true);
    try {
      await addItem(tripId, { name: s.name, packed: false });
      await refreshItems();
    } catch (e) {
      setErr(safeMsg(e, "Failed to add suggestion"));
    } finally {
      setBusy(false);
    }
  }

  async function onGenerateStarterList() {
    if (!activeTrip || !isEditLike || suggestions.length === 0) return;

    setErr("");
    setGenerating(true);

    try {
      if (isDraft) {
        const existing = new Set(draftItems.map((x) => normalizeName(x.name)));
        const toAdd = suggestions
          .filter((s) => !existing.has(normalizeName(s.name)))
          .map((s) => ({
            _tmpId: tmpId(),
            name: s.name,
            packed: false,
          }));

        setDraftItems((prev) => [...prev, ...toAdd]);
        return;
      }

      const existing = new Set(items.map((x) => normalizeName(x.name)));
      const toAdd = suggestions.filter((s) => !existing.has(normalizeName(s.name)));

      for (const s of toAdd) {
        await addItem(tripId, {
          name: s.name,
          packed: false,
        });
      }

      await refreshItems();
    } catch (e) {
      setErr(safeMsg(e, "Failed to generate starter list"));
    } finally {
      setGenerating(false);
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
    const ok = window.confirm("Reset checked items for this trip? (Items will stay.)");
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

  async function onClearAllItems() {
    if (!isEditLike) return;

    const ok = window.confirm("Remove all items from this trip?");
    if (!ok) return;

    if (isDraft) {
      setDraftItems([]);
      return;
    }

    setBusy(true);
    setErr("");

    try {
      for (const it of items) {
        await deleteItem(it.id);
      }
      await refreshItems();
    } catch (e) {
      setErr(safeMsg(e, "Failed to clear items"));
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
        await addItem(t.id, { name: it.name, packed: !!it.packed });
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
      <TripHeader
        activeTrip={activeTrip}
        stats={stats}
        tagCount={tagCount}
        isDraft={isDraft}
        isEdit={isEdit}
        busy={busy}
        tripId={tripId}
        nav={nav}
        onCancelDraft={onCancelDraft}
        onConfirmDraft={onConfirmDraft}
      />

      {err ? <div className="alert alert-danger">{err}</div> : null}

      <TripProgressCard
        stats={stats}
        busy={busy}
        isEditLike={isEditLike}
        onResetChecks={onResetChecks}
        onClearAllItems={onClearAllItems}
      />

      {isEditLike ? (
        <>
          <TripDetailsCard
            activeTrip={activeTrip}
            patchActiveTrip={patchActiveTrip}
            toggleTag={toggleTag}
          />

          <div className="card card-modern mb-3">
            <div className="card-body">
              <div className="fw-semibold mb-2">Add item</div>

              <form onSubmit={onAddItem} className="d-flex flex-wrap gap-2">
                <input
                  className="form-control"
                  style={{ flex: "1 1 260px" }}
                  placeholder="Add an item..."
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                />
                <button className="btn btn-primary btn-modern" disabled={busy}>
                  Add
                </button>
              </form>
            </div>
          </div>

          <TripSuggestionsCard
            suggestions={suggestions}
            busy={busy}
            generating={generating}
            onGenerateStarterList={onGenerateStarterList}
            onAddSuggestion={onAddSuggestion}
          />
        </>
      ) : null}

      <div className="card card-modern">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="fw-semibold fs-5">Checklist</div>
            <span className="badge text-bg-secondary">{sortedItems.length}</span>
          </div>

          {sortedItems.length === 0 ? (
            <div className="text-secondary">No items yet.</div>
          ) : (
            <div className="d-flex flex-column gap-2">
              {sortedItems.map((item) => {
                const key = item.id ?? item._tmpId;

                return (
                  <div
                    key={key}
                    className="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 rounded"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <label className="d-flex align-items-center gap-2 flex-grow-1 m-0">
                      <input
                        type="checkbox"
                        checked={!!item.packed}
                        onChange={() => onTogglePacked(item)}
                      />
                      <span
                        style={{
                          textDecoration: item.packed ? "line-through" : "none",
                          opacity: item.packed ? 0.65 : 1,
                        }}
                      >
                        {item.name}
                      </span>
                    </label>

                    {isEditLike ? (
                      <div className="d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary btn-modern-outline"
                          onClick={() => onRenameItem(item)}
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger btn-modern-outline"
                          onClick={() => onDeleteItem(item)}
                        >
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}