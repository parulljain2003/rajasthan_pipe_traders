// Lean search index — only what the header search needs.
// Importing this instead of products.ts keeps it out of the heavy client bundle.
export interface SearchEntry {
  name: string;
  slug: string;
  category: string;
  brand: string;
}

export const searchData: SearchEntry[] = [
  { name: "Premium Cable Nail Clips",        slug: "cable-nail-clips",          category: "Cable Clips",            brand: "Hitech Square / Tejas Craft" },
  { name: "RPT Premium Double Nail Clamps",  slug: "double-nail-clamp",         category: "Cable Clips",            brand: "RPT"                         },
  { name: "RPT Premium Wall Plug (Gitti)",   slug: "wall-plug-gitti",           category: "Fasteners & Hardware",   brand: "RPT"                         },
  { name: "RPT UPVC Pipe Fitting Clamps",    slug: "upvc-pipe-clamp",           category: "Cable Clips",            brand: "RPT"                         },
  { name: "RPT CPVC Pipe Fitting Clamps",    slug: "cpvc-pipe-clamp",           category: "Cable Clips",            brand: "RPT"                         },
  { name: "Premium Nylon Cable Ties",        slug: "nylon-cable-ties",          category: "Cable Clips",            brand: "Hitech Square"               },
  { name: "Plain Modular Gang Box",          slug: "plain-modular-gang-box",    category: "Electrical Accessories", brand: "RPT"                         },
  { name: "FR Electric Insulation Tape",     slug: "electric-insulation-tape",  category: "Electrical Accessories", brand: "Hitech Square / Tejas Craft" },
  { name: "PP Solid White Ball Valve",       slug: "ball-valve-white",          category: "Sanitaryware",           brand: "N-Star"                      },
  { name: "PP Solid Grey Ball Valve",        slug: "ball-valve-grey",           category: "Sanitaryware",           brand: "N-Star"                      },
  { name: "PP Solid Black Ball Valve",       slug: "ball-valve-black",          category: "Sanitaryware",           brand: "N-Star"                      },
  { name: "UPVC Ball Valve",                 slug: "upvc-ball-valve",           category: "Sanitaryware",           brand: "N-Star"                      },
];
