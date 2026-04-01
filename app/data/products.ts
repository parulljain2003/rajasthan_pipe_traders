export interface ProductSize {
  size: string;
  basicPrice: number;
  withGST: number;
  qtyPerBag: number;
  pcsPerPacket: number;
  note?: string;
}

export interface DiscountTier {
  qty: string;
  discount: string;
}

export interface Product {
  id: number;
  slug: string;
  name: string;
  brand: string;
  brandCode?: string;
  category: string;
  subCategory: string;
  description: string;
  longDescription: string;
  features: string[];
  image: string;
  images: string[];
  isNew: boolean;
  isBestseller?: boolean;
  tags: string[];
  sizes: ProductSize[];
  discountTiers: DiscountTier[];
  note?: string;
  minOrder: string;
  certifications?: string[];
  material?: string;
}

export const discountTiers: DiscountTier[] = [
  { qty: "15 Cartons / Bags", discount: "7%" },
  { qty: "30 Cartons / Bags", discount: "8%" },
  { qty: "50 Cartons / Bags", discount: "9%" },
  { qty: "85 Cartons / Bags", discount: "12%" },
];

export const tapeDiscountNote =
  "Only 2% discount on Hitech/Tejas Electric Tapes, Ronela Electric Accessories, Wires, and N-Star Bibcock/Ball Valve Range.";

export const products: Product[] = [
  /* ─────────────── CABLE NAIL CLIPS ─────────────── */
  {
    id: 1,
    slug: "cable-nail-clips",
    name: "Premium Cable Nail Clips",
    brand: "Hitech Square / Tejas Craft",
    brandCode: "HITECH / TEJAS",
    category: "Cable Clips",
    subCategory: "Nail Cable Clips",
    description:
      "Premium quality cable nail clips for secure and neat wire management on walls and ceilings.",
    longDescription:
      "Hitech Square and Tejas Craft Premium Cable Nail Clips are manufactured from high-grade virgin PP material, ensuring durability and long service life. Ideal for fixing electrical cables and wires to walls, ceilings, and other surfaces. Available in a wide range of sizes to accommodate different cable diameters. ISI certified, UV-stabilised material resists brittleness over time.",
    features: [
      "High-grade virgin PP material",
      "Wide size range: 4MM – 25MM",
      "ISI certified quality",
      "UV-stabilised for outdoor use",
      "Easy nail-drive installation",
      "COMBO & NO COMBO options available",
    ],
    image: "/Cable_Clip.png",
    images: ["/Cable_Clip.png", "/Nail_Cable_Clip.png"],
    isNew: true,
    isBestseller: true,
    tags: ["cable-clip", "nail-clip", "wire-management", "electrical"],
    certifications: ["ISI Certified"],
    material: "Virgin PP (Polypropylene)",
    sizes: [
      { size: "4MM", basicPrice: 7.88, withGST: 9.30, qtyPerBag: 750, pcsPerPacket: 100 },
      { size: "5MM", basicPrice: 9.07, withGST: 10.70, qtyPerBag: 550, pcsPerPacket: 100 },
      { size: "6MM", basicPrice: 10.88, withGST: 12.84, qtyPerBag: 450, pcsPerPacket: 100 },
      { size: "7MM", basicPrice: 13.53, withGST: 15.97, qtyPerBag: 400, pcsPerPacket: 100 },
      { size: "8MM", basicPrice: 17.49, withGST: 20.64, qtyPerBag: 300, pcsPerPacket: 100 },
      { size: "9MM", basicPrice: 23.43, withGST: 27.65, qtyPerBag: 220, pcsPerPacket: 100 },
      { size: "10MM", basicPrice: 23.49, withGST: 27.72, qtyPerBag: 200, pcsPerPacket: 100 },
      { size: "12MM", basicPrice: 39.15, withGST: 46.20, qtyPerBag: 140, pcsPerPacket: 100 },
      { size: "14MM", basicPrice: 46.78, withGST: 55.20, qtyPerBag: 100, pcsPerPacket: 100 },
      { size: "16MM", basicPrice: 60.13, withGST: 70.95, qtyPerBag: 80, pcsPerPacket: 100 },
      { size: "18MM", basicPrice: 62.79, withGST: 74.09, qtyPerBag: 60, pcsPerPacket: 100 },
      { size: "20MM COMBO", basicPrice: 50.30, withGST: 59.35, qtyPerBag: 50, pcsPerPacket: 100, note: "Net Price" },
      { size: "25MM COMBO", basicPrice: 70.25, withGST: 82.90, qtyPerBag: 35, pcsPerPacket: 100, note: "Net Price" },
      { size: "20MM NO COMBO", basicPrice: 67.42, withGST: 79.56, qtyPerBag: 50, pcsPerPacket: 100 },
      { size: "25MM NO COMBO", basicPrice: 93.89, withGST: 110.79, qtyPerBag: 35, pcsPerPacket: 100 },
      { size: "Oval Batten", basicPrice: 9.35, withGST: 11.03, qtyPerBag: 700, pcsPerPacket: 50 },
      { size: "Flat Batten", basicPrice: 9.35, withGST: 11.03, qtyPerBag: 700, pcsPerPacket: 100 },
    ],
    discountTiers,
    minOrder: "₹25,000 (Including GST)",
  },

  /* ─────────────── DOUBLE NAIL CLAMPS ─────────────── */
  {
    id: 2,
    slug: "double-nail-clamp",
    name: "RPT Premium Double Nail Clamps",
    brand: "RPT",
    brandCode: "RPT-DNC",
    category: "Cable Clips",
    subCategory: "Double Nail Clamps",
    description:
      "Heavy-duty double nail clamps providing extra-strong, vibration-resistant cable fastening.",
    longDescription:
      "RPT Premium Double Nail Clamps are engineered for heavy-duty applications where extra holding strength is required. The twin-nail design ensures clamps stay firmly fixed even on rough or plastered surfaces. Ideal for larger-diameter pipes and conduits.",
    features: [
      "Twin-nail design for extra holding",
      "Sizes 20MM – 50MM",
      "Vibration-resistant grip",
      "High-impact PP construction",
      "Suitable for pipes & conduits",
    ],
    image: "/Nail_Cable_Clip.png",
    images: ["/Nail_Cable_Clip.png"],
    isNew: false,
    tags: ["double-nail", "clamp", "cable-clip", "heavy-duty"],
    material: "High-Impact Polypropylene",
    sizes: [
      { size: "20MM", basicPrice: 78.96, withGST: 93.17, qtyPerBag: 65, pcsPerPacket: 50 },
      { size: "25MM", basicPrice: 104.35, withGST: 123.13, qtyPerBag: 45, pcsPerPacket: 50 },
      { size: "32MM", basicPrice: 170.57, withGST: 201.27, qtyPerBag: 32, pcsPerPacket: 50 },
      { size: "35MM", basicPrice: 194.32, withGST: 229.30, qtyPerBag: 24, pcsPerPacket: 50 },
      { size: "40MM", basicPrice: 234.35, withGST: 276.53, qtyPerBag: 20, pcsPerPacket: 50 },
      { size: "50MM", basicPrice: 179.28, withGST: 211.55, qtyPerBag: 24, pcsPerPacket: 25 },
    ],
    discountTiers,
    minOrder: "₹25,000 (Including GST)",
  },

  /* ─────────────── WALL PLUG (GITTI HEAVY) ─────────────── */
  {
    id: 3,
    slug: "wall-plug-gitti",
    name: "RPT Premium Wall Plug (Gitti Heavy)",
    brand: "RPT",
    brandCode: "RPT-WPG",
    category: "Fasteners & Hardware",
    subCategory: "Wall Plugs",
    description:
      "Heavy-duty square head wall plugs (Gitti) for concrete and masonry fastening.",
    longDescription:
      "RPT Premium Wall Plugs are made from high-density polyethylene and are designed for heavy anchoring in concrete, brick, and masonry walls. The square head design allows precise insertion and prevents rotation. Available in light and heavy variants for different load requirements.",
    features: [
      "Heavy-duty Gitti design",
      "Square head for anti-rotation",
      "Suitable for concrete & masonry",
      "Both light and heavy options",
      "Sizes 35MM – 50MM",
    ],
    image: "/Nail_Cable_Clip.png",
    images: ["/Nail_Cable_Clip.png"],
    isNew: false,
    tags: ["wall-plug", "gitti", "fastener", "anchor"],
    material: "High-Density Polyethylene",
    sizes: [
      { size: "35MM GH Square Head", basicPrice: 13.03, withGST: 15.38, qtyPerBag: 350, pcsPerPacket: 50 },
      { size: "40MM GH Square Head", basicPrice: 17.66, withGST: 20.84, qtyPerBag: 280, pcsPerPacket: 50 },
      { size: "50MM GH Square Head", basicPrice: 19.76, withGST: 23.32, qtyPerBag: 220, pcsPerPacket: 25 },
      { size: "50MM GL Light Sq Head", basicPrice: 13.59, withGST: 16.04, qtyPerBag: 220, pcsPerPacket: 25 },
    ],
    discountTiers,
    minOrder: "₹25,000 (Including GST)",
  },

  /* ─────────────── UPVC PIPE FITTING CLAMPS ─────────────── */
  {
    id: 4,
    slug: "upvc-pipe-clamp",
    name: "RPT UPVC Pipe Fitting Clamps",
    brand: "RPT",
    brandCode: "RPT-UPVC",
    category: "Cable Clips",
    subCategory: "UPVC Clamps",
    description:
      "Specially designed clamps for secure fixing of UPVC pipe fittings to walls and surfaces.",
    longDescription:
      "RPT UPVC Pipe Fitting Clamps are manufactured to perfectly grip UPVC pipes and conduit fittings. Designed for plumbing and electrical conduit installations, these clamps provide a clean, professional finish while ensuring a secure hold.",
    features: [
      "Designed for UPVC pipes",
      "Sizes 1/2\" to 2\"",
      "Secure grip with nail fastening",
      "UV-resistant material",
      "Smooth finish",
    ],
    image: "/Cable_Clip.png",
    images: ["/Cable_Clip.png"],
    isNew: false,
    tags: ["upvc", "pipe-clamp", "plumbing", "conduit"],
    material: "Virgin PP",
    sizes: [
      { size: "U-1/2", basicPrice: 141.90, withGST: 167.44, qtyPerBag: 35, pcsPerPacket: 100 },
      { size: "U-3/4", basicPrice: 222.76, withGST: 262.86, qtyPerBag: 20, pcsPerPacket: 100 },
      { size: "U-1", basicPrice: 310.81, withGST: 366.76, qtyPerBag: 14, pcsPerPacket: 100 },
      { size: "U-1-1/4", basicPrice: 210.32, withGST: 248.18, qtyPerBag: 20, pcsPerPacket: 50 },
      { size: "U-1-1/2", basicPrice: 128.55, withGST: 151.69, qtyPerBag: 32, pcsPerPacket: 25 },
      { size: "U-2", basicPrice: 200.09, withGST: 236.11, qtyPerBag: 20, pcsPerPacket: 25 },
    ],
    discountTiers,
    minOrder: "₹25,000 (Including GST)",
  },

  /* ─────────────── CPVC PIPE FITTING CLAMPS ─────────────── */
  {
    id: 5,
    slug: "cpvc-pipe-clamp",
    name: "RPT CPVC Pipe Fitting Clamps",
    brand: "RPT",
    brandCode: "RPT-CPVC",
    category: "Cable Clips",
    subCategory: "CPVC Clamps",
    description:
      "Premium CPVC pipe fitting clamps for hot and cold water pipe installations.",
    longDescription:
      "RPT CPVC Pipe Fitting Clamps are heat-resistant and designed specifically for CPVC hot and cold water pipelines. Made from high-quality impact-resistant polymer, they maintain their shape even at elevated temperatures.",
    features: [
      "Heat-resistant design for CPVC",
      "Suitable for hot & cold water pipes",
      "Sizes 3/4\" to 2\"",
      "High-impact polymer construction",
      "Corrosion-resistant",
    ],
    image: "/Cable_Clip.png",
    images: ["/Cable_Clip.png"],
    isNew: false,
    tags: ["cpvc", "pipe-clamp", "plumbing", "hot-water"],
    material: "Heat-Resistant Polymer",
    sizes: [
      { size: "C-3/4", basicPrice: 144.33, withGST: 170.31, qtyPerBag: 35, pcsPerPacket: 100 },
      { size: "C-1", basicPrice: 237.41, withGST: 280.14, qtyPerBag: 20, pcsPerPacket: 100 },
      { size: "C-1-1/4", basicPrice: 169.15, withGST: 199.60, qtyPerBag: 24, pcsPerPacket: 50 },
      { size: "C-1-1/2", basicPrice: 109.33, withGST: 129.01, qtyPerBag: 40, pcsPerPacket: 25 },
      { size: "C-2", basicPrice: 170.00, withGST: 200.60, qtyPerBag: 24, pcsPerPacket: 25 },
    ],
    discountTiers,
    minOrder: "₹25,000 (Including GST)",
  },

  /* ─────────────── NYLON CABLE TIES ─────────────── */
  {
    id: 6,
    slug: "nylon-cable-ties",
    name: "Premium Nylon Cable Ties",
    brand: "Hitech Square",
    brandCode: "HITECH",
    category: "Cable Clips",
    subCategory: "Cable Ties",
    description:
      "High-tensile nylon cable ties for bundling, organising, and securing cables and wires.",
    longDescription:
      "Hitech Square Premium Nylon Cable Ties are made from self-locking 66 Nylon for high tensile strength and temperature resistance. Available in a comprehensive range of sizes from 100×1.8mm to 450×4.8mm, these ties are suitable for both indoor and outdoor electrical and industrial applications.",
    features: [
      "Self-locking 66 Nylon",
      "High tensile strength",
      "Temperature resistant (-40°C to +85°C)",
      "UV-stabilised options available",
      "Wide size range: 100×1.8mm to 450×4.8mm",
      "100 pcs per packet",
    ],
    image: "/Cable_Clip.png",
    images: ["/Cable_Clip.png"],
    isNew: false,
    isBestseller: true,
    tags: ["cable-tie", "nylon", "wire-management", "bundling"],
    material: "66 Nylon (PA66)",
    sizes: [
      { size: "100 × 1.8mm (4\")", basicPrice: 9.28, withGST: 10.95, qtyPerBag: 600, pcsPerPacket: 100 },
      { size: "100 × 2.5mm (4\")", basicPrice: 11.18, withGST: 13.19, qtyPerBag: 600, pcsPerPacket: 100 },
      { size: "150 × 2.5mm (6\")", basicPrice: 15.52, withGST: 18.31, qtyPerBag: 300, pcsPerPacket: 100 },
      { size: "150 × 3.0mm (6\")", basicPrice: 20.56, withGST: 24.26, qtyPerBag: 400, pcsPerPacket: 100 },
      { size: "150 × 3.6mm (6\")", basicPrice: 22.94, withGST: 27.07, qtyPerBag: 200, pcsPerPacket: 100 },
      { size: "200 × 2.5mm (8\")", basicPrice: 21.34, withGST: 25.18, qtyPerBag: 240, pcsPerPacket: 100 },
      { size: "200 × 3.0mm (8\")", basicPrice: 23.24, withGST: 27.42, qtyPerBag: 200, pcsPerPacket: 100 },
      { size: "200 × 3.6mm (8\")", basicPrice: 30.60, withGST: 36.11, qtyPerBag: 180, pcsPerPacket: 100 },
      { size: "200 × 4.8mm (8\")", basicPrice: 39.92, withGST: 47.11, qtyPerBag: 180, pcsPerPacket: 100 },
      { size: "250 × 3.0mm (10\")", basicPrice: 32.85, withGST: 38.76, qtyPerBag: 140, pcsPerPacket: 100 },
      { size: "250 × 3.6mm (10\")", basicPrice: 36.65, withGST: 43.25, qtyPerBag: 120, pcsPerPacket: 100 },
      { size: "250 × 4.8mm (10\")", basicPrice: 47.76, withGST: 56.36, qtyPerBag: 100, pcsPerPacket: 100 },
      { size: "300 × 3.2mm (12\")", basicPrice: 34.99, withGST: 41.29, qtyPerBag: 140, pcsPerPacket: 100 },
      { size: "300 × 3.6mm (12\")", basicPrice: 44.37, withGST: 52.36, qtyPerBag: 100, pcsPerPacket: 100 },
      { size: "300 × 4.8mm (12\")", basicPrice: 58.98, withGST: 69.60, qtyPerBag: 100, pcsPerPacket: 100 },
      { size: "350 × 3.6mm (14\")", basicPrice: 50.13, withGST: 59.15, qtyPerBag: 100, pcsPerPacket: 100 },
      { size: "350 × 4.8mm (14\")", basicPrice: 63.20, withGST: 74.58, qtyPerBag: 120, pcsPerPacket: 100 },
      { size: "400 × 3.6mm (16\")", basicPrice: 67.23, withGST: 79.33, qtyPerBag: 130, pcsPerPacket: 100 },
      { size: "400 × 4.8mm (16\")", basicPrice: 78.16, withGST: 92.23, qtyPerBag: 80, pcsPerPacket: 100 },
      { size: "450 × 4.8mm (18\")", basicPrice: 97.16, withGST: 114.65, qtyPerBag: 60, pcsPerPacket: 100 },
    ],
    discountTiers,
    minOrder: "₹25,000 (Including GST)",
  },

  /* ─────────────── FR ELECTRIC TAPE ─────────────── */
  {
    id: 7,
    slug: "electric-insulation-tape",
    name: "FR Self Adhesive Electrical Insulation Tape",
    brand: "Hitech Square / Tejas Craft",
    brandCode: "HITECH / TEJAS",
    category: "Electrical Accessories",
    subCategory: "Insulation Tape",
    description:
      "Premium quality FR (Flame Retardant) self-adhesive PVC electrical insulation tape, 5.5 meters, 16MM wide.",
    longDescription:
      "Hitech Square and Tejas Craft FR Self Adhesive Electrical Insulation Tape is manufactured from flame-retardant hot-fusible pressure-sensitive adhesive PVC. Available in MIX, WHITE, and BLACK colours. Ideal for insulating electrical wires, repairing cable insulation, and colour-coding circuits. 5.5 metres length, 16MM width, 30 pcs per box.",
    features: [
      "Flame Retardant (FR) grade",
      "Hot-fusible pressure sensitive adhesive",
      "5.5 metres per roll",
      "16MM width",
      "Available in MIX / WHITE / BLACK",
      "30 pcs per master box",
    ],
    image: "/Cable_Clip.png",
    images: ["/Cable_Clip.png"],
    isNew: false,
    tags: ["tape", "insulation", "electrical", "fr-tape"],
    material: "PVC with FR Adhesive",
    note: "Only 2% discount applicable on electric tapes.",
    sizes: [
      { size: "Hitech MIX/WHITE/BLACK (5.5M × 16MM)", basicPrice: 154.91, withGST: 182.79, qtyPerBag: 20, pcsPerPacket: 30 },
      { size: "Tejas Craft (5.5M × 16MM)", basicPrice: 139.42, withGST: 164.52, qtyPerBag: 20, pcsPerPacket: 30 },
    ],
    discountTiers: [{ qty: "Any Quantity", discount: "2%" }],
    minOrder: "₹25,000 (Including GST)",
  },

  /* ─────────────── PLAIN MODULAR GANG BOX ─────────────── */
  {
    id: 8,
    slug: "plain-modular-gang-box",
    name: "Plain Modular Gang Box (ABS)",
    brand: "RPT",
    brandCode: "PMB",
    category: "Boxes & Plates",
    subCategory: "Modular Gang Boxes",
    description:
      "High-quality ABS plain modular gang boxes for concealed wiring, available in 1M to 18M sizes.",
    longDescription:
      "RPT Plain Modular Gang Boxes are manufactured from premium ABS plastic for high impact resistance and flame retardancy. Compatible with standard modular switch plates and designed for neat concealed wiring installations. Available from 1 Modular to 18 Modular sizes.",
    features: [
      "Premium ABS material",
      "Flame retardant",
      "Compatible with all standard modular plates",
      "Sizes from 1M to 18M",
      "Precise dimensions for perfect fit",
      "Easy installation",
    ],
    image: "/Cable_Clip.png",
    images: ["/Cable_Clip.png"],
    isNew: false,
    tags: ["modular-box", "gang-box", "electrical", "abs"],
    material: "ABS Plastic",
    sizes: [
      { size: "1 Modular (PMB1)", basicPrice: 17.27, withGST: 20.38, qtyPerBag: 690, pcsPerPacket: 10 },
      { size: "2 Modular (PMB2)", basicPrice: 21.06, withGST: 24.85, qtyPerBag: 490, pcsPerPacket: 10 },
      { size: "3 Modular (PMB3)", basicPrice: 24.79, withGST: 29.25, qtyPerBag: 380, pcsPerPacket: 10 },
      { size: "4 Modular (PMB4)", basicPrice: 30.78, withGST: 36.32, qtyPerBag: 310, pcsPerPacket: 10 },
      { size: "6 Modular (PMB6)", basicPrice: 36.32, withGST: 42.86, qtyPerBag: 210, pcsPerPacket: 10 },
      { size: "8 Modular HZ (PMB8HZ)", basicPrice: 45.20, withGST: 53.34, qtyPerBag: 150, pcsPerPacket: 10 },
      { size: "8 Modular SQ (PMB8SQ)", basicPrice: 47.07, withGST: 55.54, qtyPerBag: 180, pcsPerPacket: 5 },
      { size: "9 Modular (PMB9)", basicPrice: 49.73, withGST: 58.68, qtyPerBag: 150, pcsPerPacket: 10 },
      { size: "12 Modular (PMB12)", basicPrice: 53.97, withGST: 63.68, qtyPerBag: 150, pcsPerPacket: 5 },
      { size: "16 Modular (PMB16)", basicPrice: 71.04, withGST: 83.83, qtyPerBag: 120, pcsPerPacket: 5 },
      { size: "18 Modular (PMB18)", basicPrice: 75.23, withGST: 88.77, qtyPerBag: 105, pcsPerPacket: 5 },
    ],
    discountTiers,
    minOrder: "₹25,000 (Including GST)",
  },

  /* ─────────────── PP SOLID WHITE BALL VALVE ─────────────── */
  {
    id: 9,
    slug: "ball-valve-white",
    name: "PP Solid White Ball Valve",
    brand: "N-Star",
    brandCode: "N-STAR",
    category: "Sanitaryware",
    subCategory: "Ball Valves",
    description:
      "N-Star premium quality PP solid white ball valve — available in short/long handle and plain/threaded variants.",
    longDescription:
      "N-Star PP Solid White Ball Valves are manufactured from 100% virgin polypropylene for chemical resistance and long service life. Available in sizes 15MM (1/2\") to 100MM (4\") in both short and long handle styles, and in plain or threaded end configurations. Suitable for water supply, irrigation, and industrial fluid control.",
    features: [
      "100% virgin polypropylene",
      "Sizes: 15MM (1/2\") – 100MM (4\")",
      "Short & Long handle options",
      "Plain & Threaded end options",
      "Corrosion and chemical resistant",
      "Smooth quarter-turn operation",
    ],
    image: "/Cable_Clip.png",
    images: ["/Cable_Clip.png"],
    isNew: false,
    tags: ["ball-valve", "plumbing", "water-supply", "n-star"],
    material: "100% Virgin Polypropylene",
    note: "Only 2% discount applicable on N-Star Ball Valve Range.",
    sizes: [
      { size: "15MM (1/2\") Short Handle Plain", basicPrice: 27.94, withGST: 32.97, qtyPerBag: 216, pcsPerPacket: 36 },
      { size: "20MM (3/4\") Short Handle Plain", basicPrice: 34.07, withGST: 40.20, qtyPerBag: 168, pcsPerPacket: 28 },
      { size: "25MM (1\") Short Handle Plain", basicPrice: 40.88, withGST: 48.24, qtyPerBag: 108, pcsPerPacket: 18 },
      { size: "32MM (1-1/4\") Short Handle Plain", basicPrice: 81.75, withGST: 96.47, qtyPerBag: 98, pcsPerPacket: 12 },
      { size: "40MM (1-1/2\") Short Handle Plain", basicPrice: 88.56, withGST: 104.50, qtyPerBag: 72, pcsPerPacket: 12 },
      { size: "50MM (2\") Short Handle Plain", basicPrice: 108.99, withGST: 128.61, qtyPerBag: 42, pcsPerPacket: 12 },
      { size: "65MM (2-1/2\") Short Handle Plain", basicPrice: 153.26, withGST: 180.85, qtyPerBag: 26, pcsPerPacket: 12 },
      { size: "80MM (3\") Short Handle Plain", basicPrice: 231.58, withGST: 273.26, qtyPerBag: 14, pcsPerPacket: 12 },
      { size: "100MM (4\") Short Handle Plain", basicPrice: 363.71, withGST: 429.18, qtyPerBag: 16, pcsPerPacket: 12 },
    ],
    discountTiers: [{ qty: "Any Quantity", discount: "2%" }],
    minOrder: "₹25,000 (Including GST)",
  },

  /* ─────────────── PP SOLID GREY BALL VALVE ─────────────── */
  {
    id: 10,
    slug: "ball-valve-grey",
    name: "PP Solid Grey Ball Valve",
    brand: "N-Star",
    brandCode: "N-STAR",
    category: "Sanitaryware",
    subCategory: "Ball Valves",
    description:
      "N-Star PP solid grey ball valve for agricultural and industrial fluid control applications.",
    longDescription:
      "N-Star PP Solid Grey Ball Valves are designed for agricultural irrigation systems and industrial water control. Made from high-quality grey polypropylene, these valves offer excellent chemical resistance at economical pricing. Available in sizes 15MM (1/2\") to 100MM (4\") in multiple handle and end-connection configurations.",
    features: [
      "Grey PP for agri & industrial use",
      "Sizes: 15MM (1/2\") – 100MM (4\")",
      "Short & Long handle options",
      "Plain & Threaded end options",
      "Chemical and corrosion resistant",
      "Economical pricing",
    ],
    image: "/Cable_Clip.png",
    images: ["/Cable_Clip.png"],
    isNew: false,
    tags: ["ball-valve", "grey", "agri-valve", "plumbing", "n-star"],
    material: "Grey Polypropylene",
    note: "Only 2% discount applicable on N-Star Ball Valve Range.",
    sizes: [
      { size: "15MM (1/2\") Short Handle Plain", basicPrice: 21.81, withGST: 25.74, qtyPerBag: 216, pcsPerPacket: 36 },
      { size: "20MM (3/4\") Short Handle Plain", basicPrice: 28.62, withGST: 33.77, qtyPerBag: 168, pcsPerPacket: 28 },
      { size: "25MM (1\") Short Handle Plain", basicPrice: 29.99, withGST: 35.39, qtyPerBag: 108, pcsPerPacket: 18 },
      { size: "32MM (1-1/4\") Short Handle Plain", basicPrice: 56.55, withGST: 66.73, qtyPerBag: 98, pcsPerPacket: 12 },
      { size: "40MM (1-1/2\") Short Handle Plain", basicPrice: 61.32, withGST: 72.36, qtyPerBag: 72, pcsPerPacket: 12 },
      { size: "50MM (2\") Short Handle Plain", basicPrice: 85.15, withGST: 100.48, qtyPerBag: 42, pcsPerPacket: 12 },
      { size: "65MM (2-1/2\") Short Handle Plain", basicPrice: 127.72, withGST: 150.71, qtyPerBag: 26, pcsPerPacket: 12 },
      { size: "80MM (3\") Short Handle Plain", basicPrice: 177.10, withGST: 208.98, qtyPerBag: 14, pcsPerPacket: 12 },
      { size: "100MM (4\") Short Handle Plain", basicPrice: 292.88, withGST: 345.60, qtyPerBag: 16, pcsPerPacket: 12 },
    ],
    discountTiers: [{ qty: "Any Quantity", discount: "2%" }],
    minOrder: "₹25,000 (Including GST)",
  },

  /* ─────────────── PP SOLID BLACK BALL VALVE ─────────────── */
  {
    id: 11,
    slug: "ball-valve-black",
    name: "PP Solid Black Ball Valve",
    brand: "N-Star",
    brandCode: "N-STAR",
    category: "Sanitaryware",
    subCategory: "Ball Valves",
    description:
      "N-Star PP solid black ball valve — UV-stable, ideal for outdoor and underground applications.",
    longDescription:
      "N-Star PP Solid Black Ball Valves incorporate carbon black for superior UV resistance, making them ideal for outdoor and underground water supply lines. Manufactured from high-quality black polypropylene, these valves maintain structural integrity under prolonged UV exposure.",
    features: [
      "Carbon black for UV resistance",
      "Ideal for outdoor & underground use",
      "Sizes: 15MM (1/2\") – 100MM (4\")",
      "Short & Long handle options",
      "Plain & Threaded end options",
    ],
    image: "/Cable_Clip.png",
    images: ["/Cable_Clip.png"],
    isNew: false,
    tags: ["ball-valve", "black", "uv-resistant", "outdoor", "n-star"],
    material: "UV-Stabilised Black Polypropylene",
    note: "Only 2% discount applicable on N-Star Ball Valve Range.",
    sizes: [
      { size: "15MM (1/2\") Short Handle Plain", basicPrice: 21.81, withGST: 25.74, qtyPerBag: 216, pcsPerPacket: 36 },
      { size: "20MM (3/4\") Short Handle Plain", basicPrice: 28.62, withGST: 33.77, qtyPerBag: 168, pcsPerPacket: 28 },
      { size: "25MM (1\") Short Handle Plain", basicPrice: 29.99, withGST: 35.39, qtyPerBag: 108, pcsPerPacket: 18 },
      { size: "32MM (1-1/4\") Short Handle Plain", basicPrice: 56.55, withGST: 66.73, qtyPerBag: 98, pcsPerPacket: 12 },
      { size: "40MM (1-1/2\") Short Handle Plain", basicPrice: 61.32, withGST: 72.36, qtyPerBag: 72, pcsPerPacket: 12 },
      { size: "50MM (2\") Short Handle Plain", basicPrice: 85.15, withGST: 100.48, qtyPerBag: 42, pcsPerPacket: 12 },
      { size: "65MM (2-1/2\") Short Handle Plain", basicPrice: 127.72, withGST: 150.71, qtyPerBag: 26, pcsPerPacket: 12 },
      { size: "80MM (3\") Short Handle Plain", basicPrice: 177.10, withGST: 208.98, qtyPerBag: 14, pcsPerPacket: 12 },
      { size: "100MM (4\") Short Handle Plain", basicPrice: 292.88, withGST: 345.60, qtyPerBag: 16, pcsPerPacket: 12 },
    ],
    discountTiers: [{ qty: "Any Quantity", discount: "2%" }],
    minOrder: "₹25,000 (Including GST)",
  },

  /* ─────────────── UPVC BALL VALVE ─────────────── */
  {
    id: 12,
    slug: "upvc-ball-valve",
    name: "UPVC-PP Ball Valve",
    brand: "N-Star",
    brandCode: "N-STAR",
    category: "Sanitaryware",
    subCategory: "Ball Valves",
    description:
      "N-Star UPVC-PP ball valve — high-pressure rated with plain and threaded end options.",
    longDescription:
      "N-Star UPVC-PP Ball Valves are designed for high-pressure water supply and industrial fluid control. Available in both short and long handle variants with plain or threaded ends. Ideal for municipal water supply, chemical processing, and HVAC systems.",
    features: [
      "High-pressure rated",
      "Sizes: 15MM (1/2\") – 80MM (3\")",
      "Short & Long handle variants",
      "Plain & Threaded ends",
      "Chemical resistant UPVC body",
    ],
    image: "/Cable_Clip.png",
    images: ["/Cable_Clip.png"],
    isNew: false,
    tags: ["ball-valve", "upvc", "high-pressure", "plumbing", "n-star"],
    material: "UPVC (Unplasticised PVC)",
    note: "Only 2% discount applicable on N-Star Ball Valve Range.",
    sizes: [
      { size: "15MM (1/2\") Short Handle Plain", basicPrice: 27.94, withGST: 32.97, qtyPerBag: 216, pcsPerPacket: 36 },
      { size: "20MM (3/4\") Short Handle Plain", basicPrice: 34.07, withGST: 40.20, qtyPerBag: 168, pcsPerPacket: 28 },
      { size: "25MM (1\") Short Handle Plain", basicPrice: 41.56, withGST: 49.04, qtyPerBag: 108, pcsPerPacket: 18 },
      { size: "32MM (1-1/4\") Short Handle Plain", basicPrice: 83.45, withGST: 98.47, qtyPerBag: 98, pcsPerPacket: 12 },
      { size: "40MM (1-1/2\") Short Handle Plain", basicPrice: 96.05, withGST: 113.34, qtyPerBag: 72, pcsPerPacket: 12 },
      { size: "50MM (2\") Short Handle Plain", basicPrice: 122.61, withGST: 144.68, qtyPerBag: 42, pcsPerPacket: 12 },
      { size: "65MM (2-1/2\") Short Handle Plain", basicPrice: 286.07, withGST: 337.56, qtyPerBag: 26, pcsPerPacket: 12 },
      { size: "80MM (3\") Short Handle Plain", basicPrice: 366.09, withGST: 431.99, qtyPerBag: 14, pcsPerPacket: 12 },
    ],
    discountTiers: [{ qty: "Any Quantity", discount: "2%" }],
    minOrder: "₹25,000 (Including GST)",
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getRelatedProducts(product: Product, limit = 4): Product[] {
  return products
    .filter(
      (p) => p.id !== product.id && p.category === product.category
    )
    .slice(0, limit);
}
