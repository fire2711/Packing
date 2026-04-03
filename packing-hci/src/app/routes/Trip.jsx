// src/app/routes/Trip.jsx

import React, { act, useEffect, useMemo, useState, useRef } from "react";
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
  resetTripItemsPacked,
  resetTripContainersPacked,
  updateItem,
  updateTrip,
  addListItem,
  deleteListItem,
  addContainer,
  deleteContainer,
  updateContainer,
  useTrip,
} from "../../lib/db";
import { buildSuggestions } from "../../lib/suggestions";
import { normalizeName, pct, safeMsg, tmpId } from "./tripUtils";
import TripHeader from "../../components/trip/TripHeader";
import TripProgressCard from "../../components/trip/TripProgressCard";
import TripDetailsCard from "../../components/trip/TripDetailsCard";
import TripSuggestionsCard from "../../components/trip/TripSuggestionsCard";
import { Column } from "../../components/Column";

export default function Trip({ mode = "view" }) {
  const { tripId } = useParams();
  const nav = useNavigate();

  const isDraft = mode === "draft";
  const isEdit = mode === "edit";
  const isEditLike = isDraft || isEdit;

  const [trip, setTrip] = useState(isDraft ? {
    name: "",
    trip_type: "general",
    days: 1,
    tags: [],
  } : {loading: true});
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [learnedNames, setLearnedNames] = useState([]);
  const [focusOnNewItems, setFocusOnNewItems] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [hoverGroup, setHoverGroup] = useState(null);
  const [columnSizes, setColumnSizes] = useState({ left: 0, right: 0 });

  const [deletedItems, setDeletedItems] = useState([]);
  const [items, setItems] = useState({ left: [], right: [] });

  const leftColumnRef = useRef(null);
  const rightColumnRef = useRef(null);

  async function loadTripAndItems() {
    if (isDraft) return;

    setErr("");
    try {
      const t = await fetchTrip(tripId);
      if (!t.tags) t.tags = [];

      const its = await fetchListItems(tripId);
      setTrip(t);
      const newItems = { left: [], right: [] };
      its.forEach(it => {
        newItems[it.column] = its.filter(item => item.column == it.column);
        if (it.category == "Container" && !newItems[it.id + "%list"]) newItems[it.id + "%list"] = [];
      });
      setItems(newItems);
    } catch (e) {
      setErr(safeMsg(e, "Failed to load trip"));
    }
  }

  async function refreshItems() {
    if (isDraft) return;

    try {
      const t = await fetchTrip(tripId);
      if (!t.tags) t.tags = [];

      const its = await fetchListItems(tripId);
      setTrip(t);
      const newItems = { left: [], right: [] };
      its.forEach(it => {
        newItems[it.column] = its.filter(item => item.column == it.column);
        if (it.category == "Container" && !newItems[it.id + "%list"]) newItems[it.id + "%list"] = [];
      });
      setItems(newItems);
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
      const learnedCategories = {};
      const learnedSizes = {};
      const learnedNames = {};

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
          tripItems.map((item) => {
            const name = normalizeName(item.name);
            learnedCategories[name] = {...learnedCategories[name], [item.category]: (learnedCategories[name]?.[item.category] || 0) + 1};
            learnedSizes[name] = {...learnedSizes[name], [item.size]: (learnedSizes[name]?.[item.size] || 0) + 1};
            learnedNames[name] = {...learnedNames[name], [item.name]: (learnedNames[name]?.[item.name] || 0) + 1};
            return name;
          }).filter(Boolean)
        );

        for (const name of uniqueTripNames) {
          counts[name] = (counts[name] || 0) + 1;
        }
      }

      const topNames = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([name]) => {return {
          name: Object.entries(learnedNames[name]).sort((a, b) => b[1] - a[1])[0][0],
          category: Object.entries(learnedCategories[name]).sort((a, b) => b[1] - a[1])[0][0],
          size: Object.entries(learnedSizes[name]).sort((a, b) => b[1] - a[1])[0][0],
        }});

      setLearnedNames(topNames);
    } catch {
      setLearnedNames([]);
    }
  }

  useEffect(() => {
    loadTripAndItems();
  }, [tripId, isDraft]);

  useEffect(() => {
    if (!trip || !isEditLike) return;
    loadPastTripLearning(trip);
  }, [trip?.trip_type, isEditLike, tripId]);

  const stats = useMemo(() => {
    const uniqueItems = [
      ...new Map(
        Object.values(items)
          .flat()
          .filter(Boolean)
          .map((item) => [item.id, item])
      ).values(),
    ];

    const total = uniqueItems.length;
    const packed = uniqueItems.filter((item) => item.packed).length;

    return { total, packed, percent: pct(packed, total) };
  }, [items]);

  useEffect(() => {
    const leftResizeObserver = new ResizeObserver(() => {
      setColumnSizes(s => ({...s, left: leftColumnRef.current?.offsetHeight || 0}));
    });
    const rightResizeObserver = new ResizeObserver(() => {
      setColumnSizes(s => ({...s, right: rightColumnRef.current?.offsetHeight || 0}));
    });
    
    if (leftColumnRef.current) leftResizeObserver.observe(leftColumnRef.current);
    if (rightColumnRef.current) rightResizeObserver.observe(rightColumnRef.current);
  }, [leftColumnRef.current, rightColumnRef.current]);

  const suggestions = useMemo(() => {
    if (!trip || !isEditLike) return [];

    const generated = buildSuggestions({
      trip_type: trip.trip_type,
      days: trip.days,
      tags: Array.isArray(trip.tags) ? trip.tags : [],
      frequent: learnedNames,
    });

    const existing = new Set(Object.values(items).flat().map((i) => normalizeName(i.name)));
    const all = generated.filter((s) => !existing.has(normalizeName(s.name)));
    return {
      "learned": all.filter(s => s.learned),
      "generated": all.filter(s => !s.learned),
    }
  }, [trip, items, isEditLike, learnedNames]);

  function toggleTag(tagId) {
    const curr = Array.isArray(trip.tags) ? trip.tags : [];
    const next = curr.includes(tagId) ? curr.filter((t) => t !== tagId) : [...curr, tagId];
    setTrip((prev) => ({ ...prev, tags: next }));
  }

  async function onAddItem(isContainer, column, addToContainer, info) {
    setFocusOnNewItems(true);
    const newItem = {
      id: tmpId(),
      draft: true,
      name: info?.name || "",
      category: isContainer ? "Container" : info?.category || "General",
      size: info?.size || "medium",
      packed: false,
      container_id: addToContainer ? column.split("%")[0] : null,
      column: column,
    };
    setItems(prev => {
      const newItems = {
        ...prev,
        [column]: prev[column] ? [...prev[column], newItem] : [newItem],
      };
      if (isContainer) newItems[newItem.id + "%list"] = [];
      return newItems;
    });
  }

  function addDeletedItem(item_id) {
    setDeletedItems(prev => [...prev, item_id]);
  }

  async function onItemPacked() {
    if (isDraft || !tripId) return;
    try {
      await useTrip(tripId);
    } catch {
      // ignore - just a timestamp update
    }
  }

  async function onGenerateStarterList() {
    if (!trip || !isEditLike || suggestions.length === 0) return;

    setErr("");
    setGenerating(true);

    try {
      if (isDraft) {
        const existing = new Set(items.map((x) => normalizeName(x.name)));
        const toAdd = suggestions
          .filter((s) => !existing.has(normalizeName(s.name)))
          .map((s) => ({
            id: tmpId(),
            name: s.name,
            packed: false,
          }));

        setItems((prev) => [...prev, ...toAdd]);
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
    setBusy(true);
    setErr("");

    try {
      await resetTripItemsPacked(tripId);
      await resetTripContainersPacked(tripId);
      await useTrip(tripId);
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
      setItems([]);
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

  async function onCancelDraft() {
    await refreshItems();
    nav("/");
  }

  async function onConfirmDraft() {
    setBusy(true);
    setErr("");

    try {
      const t = await createTrip({
        name: (trip.name || "New Trip").trim() || "New Trip",
        trip_type: trip.trip_type,
        days: Number(trip.days) || 1,
        tags: Array.isArray(trip.tags) ? trip.tags : [],
      });

      const trueIds = {left: "left", right: "right"};
      const normalItems = [...items.left, ...items.right];

      for (const it of normalItems.filter(item => item.category == "Container")) {
        const data = await addContainer(t.id, { name: it.name, size: it.size, packed: !!it.packed, index: normalItems.indexOf(it), column: items.left.includes(it) ? "left" : "right" });
        trueIds[it.id] = data.id;
        trueIds[it.id + "%list"] = data.id + "%list";
        it.id = data.id;
        await addListItem(t.id, data.id, true);
      }

      for (const [column, group] of Object.entries(items)) {
        for (const [i, it] of group.entries()) {
          if (it.category == "Container") continue;
          const isContainerGroup = column.endsWith("%list");
          it.container_id = isContainerGroup ? trueIds[column.split("%", 1)[0]] : null;
          it.column = trueIds[column] ?? column;
          const data = await addItem(t.id, { name: it.name, size: it.size, category: it.category, packed: !!it.packed, container_id: it.container_id, index: normalItems.includes(it) ? normalItems.indexOf(it) : i, column: it.column });
          it.id = data.id;
          await addListItem(t.id, data.id, false);
        }
      }

      setItems(items => {
        const newItems = items;
        for (const [column, group] of Object.entries(items)) {
          if (column == "left" && column == "right") {
            newItems[column] = group;
          } else {
            newItems[trueIds[column]] = group;
          }
        }
        return newItems;
      });

      setDeletedItems([]);

      await refreshItems();
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
      await updateTrip(tripId, {
        name: (trip.name || "New Trip").trim() || "New Trip",
        trip_type: trip.trip_type,
        days: Number(trip.days) || 1,
        tags: Array.isArray(trip.tags) ? trip.tags : [],
      });

      const trueIds = {left: "left", right: "right"};

      const normalItems = [...items.left, ...items.right];

      for (const it of normalItems.filter(item => item.category == "Container")) {
        if (it.draft) {
          const data = await addContainer(tripId, { name: it.name, size: it.size, packed: !!it.packed, index: normalItems.indexOf(it), column: items.left.includes(it) ? "left" : "right" });
          trueIds[it.id] = data.id;
          trueIds[it.id + "%list"] = data.id + "%list";
          const listItemData = await addListItem(tripId, data.id, true);
          it.draft = false;
          it.id = data.id;
          it.listItemId = listItemData.listItemId;
        } else {
          trueIds[it.id] = it.id;
          trueIds[it.id + "%list"] = it.id + "%list";
          await updateContainer(it.id, { name: it.name, size: it.size, index: normalItems.indexOf(it), column: items.left.includes(it) ? "left" : "right" });
        }
      }

      for (const [column, group] of Object.entries(items)) {
        for (const [i, it] of group.entries()) {
          if (it.category == "Container") continue;
          const isContainerGroup = column.endsWith("%list");
          it.container_id = isContainerGroup ? trueIds[column.split("%", 1)[0]] : null;
          it.column = trueIds[column] ?? column;
          if (it.draft) {
            const data = await addItem(tripId, { name: it.name, size: it.size, category: it.category, packed: !!it.packed, container_id: it.container_id, index: normalItems.includes(it) ? normalItems.indexOf(it) : i, column: it.column });
            const listItemData = await addListItem(tripId, data.id, false);
            it.draft = false;
            it.id = data.id;
            it.listItemId = listItemData.listItemId;
          } else {
            await updateItem(it.id, { name: it.name, size: it.size, category: it.category, container_id: it.container_id, index: normalItems.includes(it) ? normalItems.indexOf(it) : i, column: it.column });
          }
        }
      }

      for (const deleted of deletedItems) {
        await deleteListItem(deleted.listItemId);
        if (deleted.category == "Container") await deleteContainer(deleted.id);
        else await deleteItem(deleted.id);
      }
      setDeletedItems([]);

      setItems(items => {
        const newItems = items;
        for (const [column, group] of Object.entries(items)) {
          if (column == "left" && column == "right") {
            newItems[column] = group;
          } else {
            newItems[trueIds[column]] = group;
          }
        }
        return newItems;
      });

      await refreshItems();
      nav(`/trip/${tripId}`);
    } catch (e) {
      setErr(safeMsg(e, "Failed to edit trip"));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    console.log(items);
  });

  const [test, setTest] = useState("");

  if (!trip) {
    return (
      <div className="container py-4">
        <div className="text-secondary">{err || "Loading…"}</div>
      </div>
    );
  }

  const tagCount = Array.isArray(trip.tags) ? trip.tags.length : 0;

  return (
    <DragDropProvider
      onDragStart={(event) => {
        const activeId = event?.operation?.source.id;

        setDragging(activeId
          ? Object.values(items).flat().find(i => i?.id === activeId)?.category
          : null);
        setHoverGroup(event?.operation?.source?.group || null);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setItems(items => move(items, event));
        setHoverGroup(event?.operation?.target?.group || null);
      }}
      onDragEnd={(event) => {
        if (event?.operation?.target?.id && event?.operation?.source?.id && event.operation.target.id.endsWith("%drop")) {
          const initialGroup = event.operation.source.initialGroup;
          const group = event.operation.target.id.split("%", 1)[0];
          const item = Object.values(items).flat().find(i => i?.id === event.operation.source.id);
          setItems(items => {return {
            ...items,
            [initialGroup]: items[initialGroup]?.filter(x => x.id !== item.id),
            [group + "%list"]: items[group + "%list"] ? [...items[group + "%list"], item] : [item]}}
          );
        }
        setDragging(false);
        setHoverGroup(null);
      }}
    >
      <div className="container py-4 trip">
        <TripHeader
          trip={trip}
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
          refreshItems={refreshItems}
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
              trip={trip}
              setTrip={setTrip}
              toggleTag={toggleTag}
            />
          </>
        ) : null}

        <div className="card card-modern">
          <h1>{test}</h1>
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="fw-semibold fs-5">Checklist</div>
              <span className="badge text-bg-secondary">{stats.total}</span>
            </div>

            <div className="checklist-columns">
              {["left", "right"].map(side => <div className="column-space">
                <Column
                  key={side}
                  onAddItem={onAddItem}
                  isEditLike={isEditLike}
                  isDraft={isDraft}
                  items={items}
                  setItems={setItems}
                  addDeletedItem={addDeletedItem}
                  focusOnNewItems={focusOnNewItems}
                  side={side}
                  children={items[side]}
                  dragging={dragging}
                  hoverGroup={hoverGroup}
                  columnSizes={columnSizes}
                  columnRef={side == "left" ? leftColumnRef : rightColumnRef}
                  suggestions={suggestions}
                  onItemPacked={onItemPacked}
                />
              </div>)}
            </div>
          </div>
        </div>
      </div>
    </DragDropProvider>
  );
}