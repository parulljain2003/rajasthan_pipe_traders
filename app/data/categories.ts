export interface CategoryConfig {
  id: string;
  slug: string;
  name: string;
  /** Admin display order (1+). If omitted, auto-assigned in declaration order. */
  sortOrder?: number;
  image: string;
  bgColor: string;
  description: string;
}

const categorySeed: CategoryConfig[] = [
  {
    id: 'Cable Clips',
    slug: 'cable-clips',
    name: 'Cable Clips',
    image: '/Cable_Clip.png',
    bgColor: '#ffccd5',
    description: 'Nail clips, double nail clamps, UPVC & CPVC pipe clamps, nylon cable ties and more for secure wire management.',
  },
  {
    id: 'Fasteners & Hardware',
    slug: 'fasteners-hardware',
    name: 'Fasteners & Hardware',
    image: '/Nail_Cable_Clip.png',
    bgColor: '#b3e5fc',
    description: 'Heavy-duty wall plugs, concrete nails and anchoring fasteners for masonry and concrete surfaces.',
  },
  {
    id: 'Electrical Accessories',
    slug: 'electrical-accessories',
    name: 'Electrical Accessories',
    image: '/Cable_Clip.png',
    bgColor: '#c8e6c9',
    description: 'FR insulation tapes, bulb holders, ceiling roses, modular switches, sockets and complete wiring accessories.',
  },
  {
    id: 'Boxes & Plates',
    slug: 'boxes-plates',
    name: 'Boxes & Plates',
    image: '/Cable_Clip.png',
    bgColor: '#e1bee7',
    description: 'ABS modular gang boxes, surface boxes, metal concealed boxes, distribution boxes and modular plates.',
  },
  {
    id: 'Sanitaryware',
    slug: 'sanitaryware',
    name: 'Sanitaryware',
    image: '/Cable_Clip.png',
    bgColor: '#ffe0b2',
    description: 'PP & UPVC ball valves, bib cocks, health faucets, nani traps, waste couplings and complete plumbing fittings.',
  },
];

function withAutoSortOrder(input: CategoryConfig[]): CategoryConfig[] {
  const highestManualSortOrder = input.reduce((max, category) => {
    if (typeof category.sortOrder !== "number" || category.sortOrder <= 0) {
      return max;
    }
    return Math.max(max, category.sortOrder);
  }, 0);

  let nextSortOrder = highestManualSortOrder + 1;

  return input.map((category) => {
    if (typeof category.sortOrder === "number" && category.sortOrder > 0) {
      return category;
    }
    const assignedSortOrder = nextSortOrder;
    nextSortOrder += 1;
    return { ...category, sortOrder: assignedSortOrder };
  });
}

export const categories: CategoryConfig[] = withAutoSortOrder(categorySeed);

export function getCategoryBySlug(slug: string): CategoryConfig | undefined {
  return categories.find(c => c.slug === slug);
}

export function categoryToSlug(category: string): string {
  return category
    .toLowerCase()
    .replace(/[&]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}
