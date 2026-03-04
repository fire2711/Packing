import { supabase } from "./supabase";

export async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

// Trips
export async function fetchTrips() {
  const user = await getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function createTrip({ name, trip_type, days }) {
  const user = await getUser();
  if (!user) throw new Error("Not logged in");

  const { data, error } = await supabase
    .from("trips")
    .insert({
      user_id: user.id,
      name: name ?? "",
      trip_type: trip_type ?? "general",
      days: days ?? 3,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateTrip(tripId, patch) {
  const { data, error } = await supabase
    .from("trips")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", tripId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTrip(tripId) {
  const { error } = await supabase.from("trips").delete().eq("id", tripId);
  if (error) throw error;
}

// Items
export async function fetchTrip(tripId) {
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .single();

  if (error) throw error;
  return data;
}

export async function fetchItems(tripId) {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function addItem(tripId, item) {
  const user = await getUser();
  if (!user) throw new Error("Not logged in");

  const { data, error } = await supabase
    .from("items")
    .insert({
      user_id: user.id,
      trip_id: tripId,
      name: item.name,
      category: item.category,
      packed: !!item.packed,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateItem(itemId, patch) {
  const { data, error } = await supabase
    .from("items")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", itemId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteItem(itemId) {
  const { error } = await supabase.from("items").delete().eq("id", itemId);
  if (error) throw error;
}

export async function resetTripPacked(tripId) {
  const { error } = await supabase
    .from("items")
    .update({ packed: false, updated_at: new Date().toISOString() })
    .eq("trip_id", tripId);

  if (error) throw error;
}