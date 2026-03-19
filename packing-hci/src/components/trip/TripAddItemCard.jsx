import React from "react";
import { CATEGORIES } from "../../lib/suggestions";
import { CATEGORY_LABELS } from "../../app/routes/tripConstants";

export default function TripAddItemCard({ newItem, setNewItem, onAddItem, busy }) {
  return (
    <div className="card card-modern mb-3">
      <div className="card-body py-3">
        <form onSubmit={onAddItem} className="row g-2 align-items-end">
          <div className="col-12 col-md-7">
            <label className="form-label">Add item</label>
            <input
              className="form-control"
              value={newItem.name}
              onChange={(e) => setNewItem((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Phone charger"
            />
          </div>

          <div className="col-12 col-md-3">
            <label className="form-label">Category</label>
            <select
              className="form-select"
              value={newItem.category}
              onChange={(e) => setNewItem((prev) => ({ ...prev, category: e.target.value }))}
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
  );
}