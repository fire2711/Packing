import React from "react";
import { TRIP_TYPES, TRIP_TAGS } from "../../app/routes/tripConstants";

export default function TripDetailsCard({ activeTrip, patchActiveTrip, toggleTag }) {
  return (
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
              onChange={(e) => patchActiveTrip({ days: Number(e.target.value) || 1 })}
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
              Suggestions update based on trip type, trip length, tags, and past similar trips.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}