// src/app/routes/Trip.jsx

import React, { act, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DragDropProvider } from "@dnd-kit/react";
import { move } from "@dnd-kit/helpers";
import {
  addItem,
  createTrip,
  deleteItem,
  fetchListItems,
  fetchTrip,
  fetchTrips,
  resetTripPacked,
  updateItem,
  updateTrip,
  addListItem,
  deleteListItem,
  addContainer,
  deleteContainer,
  updateContainer,
} from "../../lib/db";
import { buildSuggestions } from "../../lib/suggestions";
import { normalizeName, pct, safeMsg, tmpId } from "./tripUtils";
import TripHeader from "../../components/trip/TripHeader";
import TripProgressCard from "../../components/trip/TripProgressCard";
import TripDetailsCard from "../../components/trip/TripDetailsCard";
import TripSuggestionsCard from "../../components/trip/TripSuggestionsCard";
import Item from "../../components/Item";

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
  const [focusOnNewItems, setFocusOnNewItems] = useState(false);

  const [draftTrip, setDraftTrip] = useState({
    name: "New Trip",
    trip_type: "general",
    days: 1,
    tags: [],
  });

  const [draftItems, setDraftItems] = useState([]);
  const [deletedItems, setDeletedItems] = useState([]);

  const activeTrip = isDraft ? draftTrip : trip;
  const activeItems = isDraft ? draftItems : items;

  async function loadTripAndItems() {
    if (isDraft) return;

    setErr("");
    try {
      const t = await fetchTrip(tripId);
      if (!t.tags) t.tags = [];

      const its = await fetchListItems(tripId);
      setTrip(t);
      setItems(its);
    } catch (e) {
      setErr(safeMsg(e, "Failed to load trip"));
    }
  }

  async function refreshItems() {
    if (isDraft) return;

    try {
      const its = await fetchListItems(tripId);
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
        const tripItems = await fetchListItems(t.id);

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

  async function onAddItem(isContainer, container_id) {
    setFocusOnNewItems(true);
    if (isDraft) {
      setDraftItems((prev) => [
        ...prev,
        { draft: true, index: activeItems.length + (container_id ? 1000 : 0), _tmpId: tmpId(), name: "", category: isContainer ? "Container" : "General", size: "medium", packed: false, container_id: container_id, },
      ]);
    } else {
      setItems((prev) => [
        ...prev,
        { draft: true, index: activeItems.length + (container_id ? 1000 : 0), id: tmpId(), name: "", category: isContainer ? "Container" : "General", size: "medium", packed: false, container_id: container_id, },
      ]);
    }
  }

  function addDeletedItem(item_id) {
    setDeletedItems(prev => [...prev, item_id]);
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

      const trueIds = {}

      for (const [index, it] of draftItems.filter(item => item.category == "Container").entries()) {
        const data = await addContainer(t.id, { name: it.name, size: it.size, packed: !!it.packed, index: items.indexOf(it) });
        trueIds[it._tmpId] = data.id;
        it.id = data.id;
        await addListItem(t.id, data.id, true);
      }

      for (const [index, it] of draftItems.filter(item => item.category != "Container").entries()) {
        if (it.container_id) it.container_id = trueIds[it.container_id];
        const data = await addItem(t.id, { name: it.name, size: it.size, category: it.category, packed: !!it.packed, container_id: it.container_id, index: items.indexOf(it) + (it.container_id ? 1000 : 0) });
        it.id = data.id;
        await addListItem(t.id, data.id, false);
      }
      setDeletedItems([]);

      nav(`/trip/${t.id}`);
    } catch (e) {
      setErr(safeMsg(e, "Failed to create trip"));
    } finally {
      setBusy(false);
    }
  }

  async function onConfirmEdit() {
    setBusy(true);
    setErr("");

    try {
      const trueIds = {}

      for (const [index, it] of items.filter(item => item.category == "Container").entries()) {
        if (it.draft) {
          const data = await addContainer(tripId, { name: it.name, size: it.size, packed: !!it.packed, index: items.indexOf(it) });
          trueIds[it.id] = data.id;
          const listItemData = await addListItem(tripId, data.id, true);
          it.draft = false;
          it.id = data.id;
          it.listItemId = listItemData.listItemId;
        } else {
          trueIds[it.id] = it.id;
          await updateContainer(it.id, {name: it.name, size: it.size, index: items.indexOf(it)});
        }
      }

      for (const [index, it] of items.filter(item => item.category != "Container").entries()) {
        if (it.container_id) it.container_id = trueIds[it.container_id];
        if (it.draft) {
          const data = await addItem(tripId, { name: it.name, size: it.size, category: it.category, packed: !!it.packed, container_id: it.container_id, index: items.indexOf(it) + (it.container_id ? 1000 : 0) });
          const listItemData = await addListItem(tripId, data.id, false);
          it.draft = false;
          it.id = data.id;
          it.listItemId = listItemData.listItemId;
        } else {
          await updateItem(it.id, {name: it.name, size: it.size, category: it.category, container_id: it.container_id, index: items.indexOf(it) + (it.container_id ? 1000 : 0)});
        }
      }

      for (const deleted of deletedItems) {
        await deleteListItem(deleted.listItemId);
        if (deleted.category == "Container") await deleteContainer(deleted.id);
        else await deleteItem(deleted.id);
      }
      setDeletedItems([]);

      nav(`/trip/${tripId}`);
    } catch (e) {
      setErr(safeMsg(e, "Failed to edit trip"));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {console.log(activeItems)})

  if (!activeTrip) {
    return (
      <div className="container py-4">
        <div className="text-secondary">{err || "Loading…"}</div>
      </div>
    );
  }

  const tagCount = Array.isArray(activeTrip.tags) ? activeTrip.tags.length : 0;

  return (
    <DragDropProvider
      onDragEnd={(event) => {
        if (event.canceled) return;
        const {source, target} = event.operation;
        if (source?.id && target?.id) {
          const targetId = target.id.split("%")[0];
          const targetType = target.id.split("%")[1];
          const sourceId = source.id.split("%")[0];
          const sourceType = source.id.split("%")[1];
          if (targetType == "drop" && sourceType == "item") {
            if (isDraft) setDraftItems(
              prev => prev.map(
                item => item._tmpId == sourceId ? {
                  ...item, container_id: targetId, index: item.index + 1000,
                } : item
              )
            );
            else setItems(
              prev => prev.map(
                item => item.id == sourceId ? {
                  ...item, container_id: targetId, index: item.index + 1000,
                } : item
              )
            );
          }
        }
        const setActiveItems = isDraft ? setDraftItems : setItems;
        setActiveItems(items => [...move(items.filter(item => !item.container_id), event), ...items.filter(item => item.container_id)]);
    }}
    >
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
          onConfirmEdit={onConfirmEdit}
        />

        {err ? <div className="alert alert-danger">{err}</div> : null}

        {!isEditLike && <TripProgressCard
          stats={stats}
          busy={busy}
          isEditLike={isEditLike}
          onResetChecks={onResetChecks}
          onClearAllItems={onClearAllItems}
        />}

        {isEditLike ? (
          <>
            <TripDetailsCard
              activeTrip={activeTrip}
              patchActiveTrip={patchActiveTrip}
              toggleTag={toggleTag}
            />

            {/*<TripSuggestionsCard
              suggestions={suggestions}
              busy={busy}
              generating={generating}
              onGenerateStarterList={onGenerateStarterList}
              onAddSuggestion={onAddSuggestion}
            />*/}
          </>
        ) : null}

        <div className="card card-modern">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="fw-semibold fs-5">Checklist</div>
              <span className="badge text-bg-secondary">{sortedItems.length}</span>
            </div>

            <div className="col checklist">
              {activeItems.filter(item => !item.container_id).map((item, index) =>
                <Item
                  key={`${isDraft ? item._tmpId : item.id}%${item.category == "Container" ? "container" : "item"}`}
                  item={item}
                  setDraftItems={setDraftItems}
                  listItems={item.category == "Container" ? activeItems.filter(other => other.container_id == (isDraft ? item._tmpId : item.id)) : null}
                  onAddItem={onAddItem}
                  isEditLike={isEditLike}
                  isDraft={isDraft}
                  setItems={setItems}
                  addDeletedItem={addDeletedItem}
                  focusOnNewItems={focusOnNewItems}
                  index={index}
                  group="column1"
                />
              )}
              {isEditLike && <div className="row gx-0">
                <div className="col-6 pe-1">
                  <button onClick={() => onAddItem(false)} className="col-12 btn btn-outline-primary btn-sm">Add Item</button>
                </div>
                <div className="col-6 ps-1 pe-0">
                  <button onClick={() => onAddItem(true)} className="col-12 btn btn-outline-primary btn-sm">Add Container</button>
                </div>
              </div>}
            </div>
          </div>
        </div>
      </div>
    </DragDropProvider>
  );
}