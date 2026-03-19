// src/lib/suggestions.js

export const CATEGORIES = ["electronics", "clothes", "toiletries", "documents", "misc"];

const BASE_ITEMS_BY_TYPE = {
  general: ["Phone charger", "Wallet", "Keys", "Phone"],
  leisure: ["Phone charger", "Wallet", "Keys", "Sunglasses", "Phone"],
  vacation: ["Phone charger", "Wallet", "Sunglasses", "Portable charger", "Phone"],
  work: ["Laptop", "Laptop charger", "Notebook", "Work badge/ID", "Phone"],
  beach: ["Swimsuit", "Flip flops", "Sunscreen", "Beach towel", "Phone"],
  cold: ["Jacket", "Gloves", "Beanie", "Thermal layers", "Phone"],
  gym: ["Gym shoes", "Workout clothes", "Water bottle", "Deodorant", "Phone"],
  outdoors: ["Hiking shoes", "Water bottle", "Bug spray", "Sunscreen", "Phone"],
  other: ["Phone charger", "Wallet", "Keys", "Phone"],
};

const TAG_ITEMS = {
  flying: ["Boarding pass", "Headphones", "Neck pillow", "Empty water bottle", "TSA liquids bag"],
  international: ["Passport", "Travel adapter", "Visa/entry docs", "Travel insurance", "Backup card/cash"],
  formal: ["Formal outfit", "Dress shoes", "Belt", "Steamer/lint roller"],
  rain: ["Umbrella", "Rain jacket", "Waterproof shoes"],
  hiking: ["Hiking socks", "First aid kit", "Hat", "Sunglasses"],
  swimming: ["Swimsuit", "Goggles", "Swim cap"],
};

function qtyLabel(name, qty) {
  return `${qty} ${name}`;
}

function uniqStrings(list) {
  const seen = new Set();
  const out = [];

  for (const raw of list) {
    const s = String(raw || "").trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }

  return out;
}

export function normalizeSuggestionName(name) {
  return String(name || "").trim().toLowerCase();
}

export function guessCategory(name) {
  const n = String(name || "").toLowerCase();

  if (
    /(charger|laptop|phone|adapter|camera|airpods|headphones|power bank|portable charger|battery|tablet|watch charger)/.test(n)
  ) {
    return "electronics";
  }

  if (
    /(passport|id|ticket|boarding pass|visa|insurance|reservation|itinerary|badge|travel docs|entry docs)/.test(n)
  ) {
    return "documents";
  }

  if (
    /(tooth|shampoo|soap|deodorant|razor|lotion|sunscreen|conditioner|face wash|contacts|toiletry|detergent|bug spray)/.test(n)
  ) {
    return "toiletries";
  }

  if (
    /(shirt|pants|shorts|socks|underwear|jacket|hoodie|shoe|shoes|swimsuit|dress|belt|beanie|gloves|hat|outfit|thermal|layers|sleepwear|flip flops)/.test(n)
  ) {
    return "clothes";
  }

  return "misc";
}

function buildQuantityItems(days) {
  const d = Math.max(1, Number(days) || 1);

  return [
    qtyLabel("shirts", d),
    qtyLabel("underwear", d),
    qtyLabel("pairs of socks", d),
    qtyLabel("pairs of pants", Math.max(1, Math.ceil(d / 2))),
    "Sleepwear",
  ];
}

function buildDurationExtras(days) {
  const d = Math.max(1, Number(days) || 1);
  const extras = [];

  if (d >= 3) {
    extras.push("Toothbrush", "Toothpaste", "Toiletry bag");
  }

  if (d >= 5) {
    extras.push("Laundry bag", "Extra pair of shoes");
  }

  if (d >= 7) {
    extras.push("Detergent pods");
  }

  return extras;
}

export function buildSuggestions({ trip_type, days, tags = [], frequentNames = [] }) {
  const type = trip_type || "general";
  const base = BASE_ITEMS_BY_TYPE[type] || BASE_ITEMS_BY_TYPE.general;

  const learnedSet = new Set((frequentNames || []).map((x) => normalizeSuggestionName(x)));

  const out = [
    ...buildQuantityItems(days),
    ...base,
    ...buildDurationExtras(days),
  ];

  const tagList = Array.isArray(tags) ? tags : [];
  for (const t of tagList) {
    const items = TAG_ITEMS[t];
    if (items?.length) out.push(...items);
  }

  out.push(...(frequentNames || []).slice(0, 10));

  const unique = uniqStrings(out);

  return unique.map((name) => ({
    name,
    category: guessCategory(name),
    learned: learnedSet.has(normalizeSuggestionName(name)),
  }));
}