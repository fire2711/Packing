// src/lib/suggestions.js

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
    learned: learnedSet.has(normalizeSuggestionName(name)),
  }));
}