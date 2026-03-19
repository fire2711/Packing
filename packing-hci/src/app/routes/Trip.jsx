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
import { buildSuggestions, CATEGORIES } from "../../lib/suggestions";
import { CATEGORY_LABELS } from "./tripConstants";
import { normalizeName, pct, safeMsg, tmpId } from "./tripUtils";
import CategoryList from "../../components/trip/CategoryList";
import TripHeader from "../../components/trip/TripHeader";
import TripProgressCard from "../../components/trip/TripProgressCard";
import TripDetailsCard from "../../components/trip/TripDetailsCard";
import TripAddItemCard from "../../components/trip/TripAddItemCard";
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
  const [newItem, setNewItem] = useState({ name: "", category: "misc" });

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

  const itemsByCategory = useMemo(() => {
    const map = Object.fromEntries(CATEGORIES.map((c) => [c, []]));

    for (const it of activeItems) {
      const cat = map[it.category] ? it.category : "misc";
      map[cat].push(it);
    }

    for (const cat of CATEGORIES) {
      map[cat] = [...map[cat]].sort((a, b) => {
        if (Number(a.packed) !== Number(b.packed)) return Number(a.packed) - Number(b.packed);
        return (a.name || "").localeCompare(b.name || "");
      });
    }

    return map;
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

    const name = newItem.name.trim();
    if (!name) return;

    setErr("");

    if (isDraft) {
      const exists = draftItems.some((x) => normalizeName(x.name) === normalizeName(name));
      if (exists) return;

      setDraftItems((prev) => [
        ...prev,
        { _tmpId: tmpId(), name, category: newItem.category, packed: false },
      ]);
      setNewItem((prev) => ({ ...prev, name: "" }));
      return;
    }

    setBusy(true);
    try {
      await addItem(tripId, { name, category: newItem.category, packed: false });
      setNewItem((prev) => ({ ...prev, name: "" }));
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
        { _tmpId: tmpId(), name: s.name, category: s.category, packed: false },
      ]);
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
            category: s.category,
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
          category: s.category,
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

  function onChangeCategory(item, category) {
    if (isDraft) {
      setDraftItems((prev) =>
        prev.map((x) => (x._tmpId === item._tmpId ? { ...x, category } : x))
      );
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

          <TripAddItemCard
            newItem={newItem}
            setNewItem={setNewItem}
            onAddItem={onAddItem}
            busy={busy}
          />

          <TripSuggestionsCard
            suggestions={suggestions}
            busy={busy}
            generating={generating}
            onGenerateStarterList={onGenerateStarterList}
            onAddSuggestion={onAddSuggestion}
          />
        </>
      ) : null}

      <div className="d-lg-none">
        {CATEGORIES.map((cat, idx) => (
          <details key={cat} open={idx === 0} className="card card-modern mb-2">
            <summary
              className="d-flex justify-content-between align-items-center px-3 py-3"
              style={{ cursor: "pointer" }}
            >
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
    </div>
  );
}