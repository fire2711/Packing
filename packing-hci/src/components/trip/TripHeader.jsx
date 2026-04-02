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
  onConfirmEdit,
  refreshItems,
}) {
  return (
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-1">
      <div>
        {isDraft ? <div className="d-flex align-items-center gap-2">
          <h1 className="h2 mb-0 text-white">New Trip</h1>
        </div>
        : <div className="d-flex align-items-center gap-2">
          <h1 className="h2 mb-0 trip-name">{activeTrip.name || "Untitled trip"}</h1>
        </div>}

        {(!isEdit && !isDraft) && <div className="text-secondary small mt-1">
          <p className="m-0">{activeTrip.trip_type && `${tripTypeLabel(activeTrip.trip_type)}`} • {activeTrip.days} day{activeTrip.days > 1 ? "s" : ""}</p>
          <p className="m-0">Let's pack! Mark the items in this list as you pack them.</p>
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
              onClick={async () => {
                await refreshItems();
                nav(isEdit ? `/trip/${tripId}` : "/");
              }}
            >
              Back
            </button>

            {isEdit ? (
              <button
                className="btn btn-primary btn-modern"
                onClick={onConfirmEdit}
                disabled={busy}
              >
                {busy ? "Saving…" : "Confirm"}
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