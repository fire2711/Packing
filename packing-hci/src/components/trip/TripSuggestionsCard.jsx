import React from "react";
import { CATEGORY_LABELS } from "../../app/routes/tripConstants";

export default function TripSuggestionsCard({
  suggestions,
  busy,
  generating,
  onGenerateStarterList,
  onAddSuggestion,
}) {
  return (
    <div className="card card-modern mb-3">
      <div className="card-body py-3">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
          <div>
            <div className="fw-semibold">Starter checklist for this trip</div>
            <div className="text-secondary small">
              Generated from trip type, trip length, tags, and your past similar trips.
            </div>
          </div>

          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onGenerateStarterList}
              disabled={busy || generating || suggestions.length === 0}
            >
              {generating ? "Generating…" : "Generate Starter List"}
            </button>
          </div>
        </div>

        {suggestions.length ? (
          <div className="d-flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={`${s.category}_${s.name}`}
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={() => onAddSuggestion(s)}
                disabled={busy || generating}
              >
                + {s.name}
                {s.learned ? <span className="ms-1 badge text-bg-light">Past trip</span> : null}
                <span className="text-secondary ms-1">({CATEGORY_LABELS[s.category]})</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-secondary small">
            Your starter list is already covered, or there are no new suggestions for this trip setup.
          </div>
        )}
      </div>
    </div>
  );
}