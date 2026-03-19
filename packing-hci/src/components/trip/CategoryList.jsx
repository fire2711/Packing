import React from "react";
import { CATEGORIES } from "../../lib/suggestions";
import { CATEGORY_LABELS } from "../../app/routes/tripConstants";

export default function CategoryList({
  items,
  isEditLike,
  onTogglePacked,
  onChangeCategory,
  onRenameItem,
  onDeleteItem,
}) {
  if (!items.length) {
    return <div className="text-secondary">No items in this category yet.</div>;
  }

  return (
    <div className="list-group">
      {items.map((it) => {
        const key = it.id ?? it._tmpId;
        const chkId = `chk_${key}`;

        return (
          <div
            key={key}
            className="list-group-item d-flex justify-content-between align-items-center gap-2"
          >
            <div className="form-check m-0">
              <input
                className="form-check-input"
                type="checkbox"
                checked={!!it.packed}
                onChange={() => onTogglePacked(it)}
                id={chkId}
              />
              <label
                className={`form-check-label ${
                  it.packed ? "text-decoration-line-through text-secondary" : ""
                }`}
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
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => onRenameItem(it)}
                  >
                    Rename
                  </button>
                  <button
                    className="btn btn-outline-danger"
                    type="button"
                    onClick={() => onDeleteItem(it)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <span className="badge rounded-pill text-bg-light">
                {CATEGORY_LABELS[it.category] || it.category}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}