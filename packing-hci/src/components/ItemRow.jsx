import React from "react";

export default function ItemRow({ item, onToggle, onRename, onDelete }) {
  return (
    <div className={`item-row ${item.packed ? "packed" : ""}`}>
      <label className="item-left">
        <input
          type="checkbox"
          checked={!!item.packed}
          onChange={() => onToggle(item.id)}
        />
        <span className="item-name">{item.name}</span>
      </label>

      <div className="item-actions">
        <button className="btn ghost" onClick={() => onRename(item.id)}>
          Rename
        </button>
        <button className="btn danger ghost" onClick={() => onDelete(item.id)}>
          Delete
        </button>
      </div>
    </div>
  );
}