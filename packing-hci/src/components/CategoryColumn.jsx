import React, { useMemo, useState } from "react";
import ItemRow from "./ItemRow.jsx";
import { uid } from "../lib/ids.js";

export default function CategoryColumn({
  title,
  categoryKey,
  items,
  onAddItem,
  onToggleItem,
  onRenameItem,
  onDeleteItem,
  suggestions = [],
  onAddSuggestion,
}) {
  const [newName, setNewName] = useState("");

  const filteredSuggestions = useMemo(() => {
    const existing = new Set(items.map((i) => i.name.toLowerCase()));
    return suggestions
      .filter((s) => s.category === categoryKey)
      .filter((s) => !existing.has(s.name.toLowerCase()))
      .slice(0, 6);
  }, [suggestions, items, categoryKey]);

  function submit(e) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    onAddItem({
      id: uid("item"),
      name,
      category: categoryKey,
      packed: false,
    });
    setNewName("");
  }

  return (
    <section className="category-card">
      <div className="category-head">
        <h3>{title}</h3>
        <span className="muted">{items.length} items</span>
      </div>

      <form onSubmit={submit} className="add-row">
        <input
          className="input"
          placeholder={`Add to ${title}...`}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button className="btn" type="submit">
          Add
        </button>
      </form>

      {filteredSuggestions.length > 0 && (
        <div className="suggestions">
          <div className="suggestions-title">Suggestions</div>
          <div className="suggestion-chips">
            {filteredSuggestions.map((s) => (
              <button
                key={s.name}
                className="chip"
                type="button"
                onClick={() => onAddSuggestion(s, categoryKey)}
              >
                + {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="items-list">
        {items.length === 0 ? (
          <div className="empty muted">No items yet.</div>
        ) : (
          items.map((it) => (
            <ItemRow
              key={it.id}
              item={it}
              onToggle={onToggleItem}
              onRename={onRenameItem}
              onDelete={onDeleteItem}
            />
          ))
        )}
      </div>
    </section>
  );
}