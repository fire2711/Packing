// src/lib/suggestions.js

const BASE_ITEMS_BY_TYPE = {
  general: [
    {"name": "Phone charger", size: "small"},
    {"name": "Wallet", size: "small"},
    {"name": "Keys", size: "small"},
    {"name": "Phone", size: "small"}
  ],
  leisure: [
    {"name": "Phone charger", size: "small"},
    {"name": "Wallet", size: "small"},
    {"name": "Keys", size: "small"},
    {"name": "Sunglasses", size: "small"},
    {"name": "Phone", size: "small"}
  ],
  vacation: [
    {"name": "Phone charger", size: "small"},
    {"name": "Wallet", size: "small"},
    {"name": "Sunglasses", size: "small"},
    {"name": "Portable charger", size: "small"},
    {"name": "Phone", size: "small"}
  ],
  work: [
    {"name": "Laptop", size: "medium"},
    {"name": "Laptop charger", size: "small"},
    {"name": "Notebook", size: "medium"},
    {"name": "Work badge/ID", size: "small"},
    {"name": "Phone", size: "small"}
  ],
  beach: [
    {"name": "Swimsuit", size: "medium"},
    {"name": "Flip flops", size: "medium"},
    {"name": "Sunscreen", size: "small"},
    {"name": "Beach towel", size: "medium"},
    {"name": "Phone", size: "small"}
  ],
  cold: [
    {"name": "Jacket", size: "large"},
    {"name": "Gloves", size: "small"},
    {"name": "Beanie", size: "small"},
    {"name": "Thermal layers", size: "medium"},
    {"name": "Phone", size: "small"}
  ],
  gym: [
    {"name": "Gym shoes", size: "medium"},
    {"name": "Workout clothes", size: "medium"},
    {"name": "Water bottle", size: "small"},
    {"name": "Deodorant", size: "small"},
    {"name": "Phone", size: "small"}
  ],
  outdoors: [
    {"name": "Hiking shoes", size: "medium"},
    {"name": "Water bottle", size: "small"}, 
    {"name": "Bug spray", size: "small"},
    {"name": "Sunscreen", size: "small"},
    {"name": "Phone", size: "small"}
  ],
  other: [
    {"name": "Phone charger", size: "small"},
    {"name": "Wallet", size: "small"},
    {"name": "Keys", size: "small"},
    {"name": "Phone", size: "small"}
  ],
};

const TAG_ITEMS = {
  flying: [
    {name: "Boarding pass", size: "small"},
    {name: "Headphones", size: "medium"},
    {name: "Neck pillow", size: "medium"},
    {name: "Empty water bottle", size: "small"},
    {name: "TSA liquids bag", size: "medium"}
  ],
  international: [
    {name: "Passport", size: "small"},
    {name: "Travel adapter", size: "small"},
    {name: "Visa/entry docs", size: "small"},
    {name: "Travel insurance", size: "medium"},
    {name: "Backup card/cash", size: "small"}
  ],
  formal: [
    {name: "Formal outfit", size: "large"},
    {name: "Dress shoes", size: "medium"},
    {name: "Belt", size: "medium"},
    {name: "Steamer/lint roller", size: "medium"}
  ],
  rain: [
    {name: "Umbrella", size: "medium"},
    {name: "Rain jacket", size: "large"},
    {name: "Waterproof shoes", size: "medium"}
  ],
  hiking: [
    {name: "Hiking socks", size: "small"},
    {name: "First aid kit", size: "medium"},
    {name: "Hat", size: "medium"},
    {name: "Sunglasses", size: "small"}
  ],
  swimming: [
    {name: "Swimsuit", size: "medium"},
    {name: "Goggles", size: "small"},
    {name: "Swim cap", size: "small"}
  ],
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
    { name: qtyLabel(`shirt${d > 1 ? 's' : ''}`, d), size: "medium" },
    { name: qtyLabel("underwear", d), size: "small" },
    { name: qtyLabel(`pair${d > 1 ? 's' : ''} of socks`, d), size: "small" },
    { name: qtyLabel(`pair${d > 1 ? 's' : ''} of pants`, Math.max(1, Math.ceil(d / 2))), size: "medium" },
    { name: "Sleepwear", size: "medium" },
  ];
}

function buildDurationExtras(days) {
  const d = Math.max(1, Number(days) || 1);
  const extras = [];

  if (d >= 3) {
    extras.push(
      { name: "Toothbrush", size: "small" },
      { name: "Toothpaste", size: "small" },
      { name: "Toiletry bag", size: "medium" }
    );
  }

  if (d >= 5) {
    extras.push(
      { name: "Laundry bag", size: "large" },
      { name: "Extra pair of shoes", size: "medium" }
    );
  }

  if (d >= 7) {
    extras.push({ name: "Detergent pods", size: "small" });
  }

  return extras;
}

export function buildSuggestions({ trip_type, days, tags = [], frequent = [] }) {
  const type = trip_type || "general";
  const base = BASE_ITEMS_BY_TYPE[type].map(item => {return {...item, category: categoryOf(item.name)}})
  || BASE_ITEMS_BY_TYPE.general.map(item => {return {...item, category: categoryOf(item.name)}});

  const out = [
    ...buildQuantityItems(days).map(item => {return {...item, category: categoryOf(item.name)}}),
    ...base,
    ...buildDurationExtras(days).map(item => {return {...item, category: categoryOf(item.name)}}),
  ];

  const tagList = Array.isArray(tags) ? tags : [];
  for (const t of tagList) {
    const items = TAG_ITEMS[t];
    if (items?.length) out.push(...items);
  }

  out.push(...(frequent || []).filter(
    item => !out.some(i => normalizeSuggestionName(i.name) === normalizeSuggestionName(item.name))
  ).slice(0, 15));

  return out.map((item) => ({
    name: item.name,
    learned: frequent.includes(item),
    category: item.category,
    size: item.size,
  }));
}

export function categoryOf(name) {
  const n = String(name || "").toLowerCase();

  if (
    /(charger|laptop|phone|adapter|camera|airpods|headphones|power bank|portable charger|battery|tablet|watch charger)/.test(n)
  ) {
    return "Electronics";
  }

  if (
    /(passport|id|ticket|boarding pass|visa|insurance|reservation|itinerary|badge|travel docs|entry docs)/.test(n)
  ) {
    return "Documents";
  }

  if (
    /(tooth|shampoo|soap|deodorant|razor|lotion|sunscreen|conditioner|face wash|contacts|toiletry|detergent|bug spray)/.test(n)
  ) {
    return "Toiletries";
  }

  if (
    /(shirt|pants|shorts|socks|underwear|jacket|hoodie|shoe|shoes|swimsuit|dress|belt|beanie|gloves|hat|outfit|thermal|layers|sleepwear|flip flops)/.test(n)
  ) {
    return "Clothes";
  }

  return "General";
}