import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./app/ProtectedRoute.jsx";

import Auth from "./app/routes/Auth.jsx";
import Dashboard from "./app/routes/Dashboard.jsx";
import Trip from "./app/routes/Trip.jsx";

export default function App() {
  return (
    <>
      <Navbar />

      <Routes>
        <Route path="/auth" element={<Auth />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Draft: New Trip (no DB write until Done) */}
        <Route
          path="/trip/new"
          element={
            <ProtectedRoute>
              <Trip mode="draft" />
            </ProtectedRoute>
          }
        />

        {/* View trip */}
        <Route
          path="/trip/:tripId"
          element={
            <ProtectedRoute>
              <Trip mode="view" />
            </ProtectedRoute>
          }
        />

        {/* Edit trip */}
        <Route
          path="/trip/:tripId/edit"
          element={
            <ProtectedRoute>
              <Trip mode="edit" />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}