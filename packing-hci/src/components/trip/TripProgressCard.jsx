import React from "react";

export default function TripProgressCard({
  stats,
  busy,
  isEditLike,
  onResetChecks,
  onClearAllItems,
}) {
  return (
    <div className="card card-modern mb-3">
      <div className="card-body py-3">
        <div className="d-flex justify-content-between small text-secondary mb-1">
          <span>
            {stats.packed}/{stats.total} packed
          </span>
          <span>{stats.percent}%</span>
        </div>

        <div
          className="progress progress-modern"
          role="progressbar"
          aria-valuenow={stats.percent}
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div className="progress-bar progress-bar-modern" style={{ width: `${stats.percent}%` }} />
        </div>

        <div className="d-flex flex-wrap gap-2 mt-3">
          <button className="btn btn-outline-danger btn-sm" onClick={onResetChecks} disabled={busy}>
            {busy ? "Resetting..." : "Reset"}
          </button>

          {isEditLike ? (
            <button className="btn btn-outline-danger btn-sm" onClick={onClearAllItems} disabled={busy}>
              Delete All Items
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}