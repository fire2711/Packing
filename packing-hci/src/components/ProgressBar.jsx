import React from "react";

export default function ProgressBar({ packed, total }) {
  const pct = total > 0 ? Math.round((packed / total) * 100) : 0;

  return (
    <div className="progress-wrap">
      <div className="progress-top">
        <span className="muted">
          {packed}/{total} packed
        </span>
        <span className="muted">{pct}%</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}