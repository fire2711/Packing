import React from "react";
import { TRIP_TYPES, TRIP_TAGS } from "../../app/routes/tripConstants";

export default function TripDetailsCard({ activeTrip, patchActiveTrip, toggleTag }) {
  return (
    <div className="mb-3">
      <div className="row py-2 align-items-start">
        <div className="col col-7 align-items-start">
          <div className="m-0 col-12 pb-2">
            <label className="form-label">Name</label>
            <input
              className="form-control"
              value={activeTrip.name}
              onChange={(e) => patchActiveTrip({ name: e.target.value })}
            />
          </div>
          
          <div className="row m-0 col-12">
            <div className="col-9 px-0">
              <label className="form-label">Type</label>
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

            <div className="col-3 ps-3 pe-0">
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
          </div>
        </div>
        
        <div className="ms-0 ps-0 col-5">
          <label className="form-label mb-2">Tags (Optional)</label>
          <div className="d-flex flex-wrap gap-2">
            {TRIP_TAGS.map((t) => {
              const checked = Array.isArray(activeTrip.tags) && activeTrip.tags.includes(t.id);

              return (
                <button
                  key={t.id}
                  type="button"
                  className={`tag d-flex btn btn-sm ${checked ? "btn-primary tag-checked" : "btn-outline-primary"}`}
                  onClick={() => toggleTag(t.id)}
                >
                  <p className="m-0 ms-1 p-0 tag-icon">
                    {checked ? "✓ " : "+ "}
                  </p>
                  <p className="m-0 me-1 p-0">
                    {t.label}
                  </p>
                </button>
              );
            })}
          </div>

          {/*<div className="text-secondary small mt-2">
            Suggestions update based on trip type, trip length, tags, and past similar trips.
          </div>*/}
        </div>
      </div>
    </div>
  );
}