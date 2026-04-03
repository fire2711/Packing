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

export async function createTrip({ name, trip_type, days, tags }) {
  const user = await getUser();
  if (!user) throw new Error("Not logged in");

  const { data, error } = await supabase
    .from("trips")
    .insert({
      user_id: user.id,
      name: name ?? "",
      trip_type: trip_type ?? "general",
      days: days ?? 1,
      tags: tags ?? [],
      last_used_at: new Date().toISOString(),
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

export async function useTrip(tripId) {
  const { data, error } = await supabase
    .from("trips")
    .update({ last_used_at: new Date().toISOString() })
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

export async function fetchListItems(tripId) {
  const { data, error } = await supabase
    .from("list_items")
    .select("*, container:container_id(*), item:item_id(*)")
    .eq("trip_id", tripId);

  if (error) throw error;
  return data.map(listItem => listItem.item ? {
    ...listItem.item,
    listItemId: listItem.id,
  } : {
    ...listItem.container,
    category: "Container",
    listItemId: listItem.id,
  }).sort((a, b) => a.index - b.index);
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
      size: item.size,
      packed: !!item.packed,
      container_id: item.container_id,
      index: item.index,
      column: item.column,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function addContainer(tripId, item) {
  const user = await getUser();
  if (!user) throw new Error("Not logged in");

  const { data, error } = await supabase
    .from("containers")
    .insert({
      user_id: user.id,
      trip_id: tripId,
      name: item.name,
      size: item.size,
      packed: !!item.packed,
      index: item.index,
      column: item.column,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function addListItem(tripId, listItemId, isContainer) {
  const user = await getUser();
  if (!user) throw new Error("Not logged in");

  const { data, error } = await supabase
    .from("list_items")
    .insert({
      user_id: user.id,
      trip_id: tripId,
      container_id: isContainer ? listItemId : null,
      item_id: !isContainer ? listItemId : null
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

export async function updateContainer(itemId, patch) {
  const { data, error } = await supabase
    .from("containers")
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

export async function deleteContainer(itemId) {
  const { error } = await supabase.from("containers").delete().eq("id", itemId);
  if (error) throw error;
}

export async function deleteListItem(itemId) {
  const { error } = await supabase.from("list_items").delete().eq("id", itemId);
  if (error) throw error;
}

export async function resetTripItemsPacked(tripId) {
  const { error } = await supabase
    .from("items")
    .update({ packed: false, updated_at: new Date().toISOString() })
    .eq("trip_id", tripId);

  if (error) throw error;
}

export async function resetTripContainersPacked(tripId) {
  const { error } = await supabase
    .from("containers")
    .update({ packed: false, updated_at: new Date().toISOString() })
    .eq("trip_id", tripId);

  if (error) throw error;
}