import React from "react";
import { tripTypeLabel } from "../../app/routes/tripUtils";

export default function TripHeader({
  activeTrip,
  stats,
  tagCount,
  isDraft,
  isEdit,
  busy,
  tripId,
  nav,
  onCancelDraft,
  onConfirmDraft,
}) {
  return (
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-1">
      <div>
        {isDraft ? <div className="d-flex align-items-center gap-2">
          <h1 className="h2 mb-0 text-white">New Trip</h1>
        </div>
        : <div className="d-flex align-items-center gap-2">
          <h1 className="h2 mb-0">{activeTrip.name || "Untitled trip"}</h1>
          <span className="badge text-bg-secondary">
            {tripTypeLabel(activeTrip.trip_type)} • {activeTrip.days}d
            {tagCount ? ` • ${tagCount} tags` : ""}
          </span>
        </div>}

        {!isDraft && <div className="text-secondary small mt-1">
          {stats.packed}/{stats.total} packed • {stats.percent}%
          {isDraft ? <span className="ms-2 badge text-bg-secondary">Draft</span> : null}
        </div>}
      </div>

      <div className="d-flex gap-2">
        {isDraft ? (
          <>
            <button
              className="btn btn-outline-secondary btn-modern-outline"
              onClick={onCancelDraft}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary btn-modern"
              onClick={onConfirmDraft}
              disabled={busy}
            >
              {busy ? "Saving…" : "Confirm"}
            </button>
          </>
        ) : (
          <>
            <button
              className="btn btn-outline-secondary btn-modern-outline"
              onClick={() => nav("/")}
            >
              Back
            </button>

            {isEdit ? (
              <button
                className="btn btn-primary btn-modern"
                onClick={() => nav(`/trip/${tripId}`)}
              >
                Confirm
              </button>
            ) : (
              <button
                className="btn btn-primary btn-modern"
                onClick={() => nav(`/trip/${tripId}/edit`)}
              >
                Edit
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}