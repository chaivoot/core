// คำนวณผังสายงาน (ฟังก์ชันล้วน ไม่แตะฐานข้อมูล)

export type TeamStatus = "product" | "sop" | "business" | "forty";
export type StatusCounts = Record<TeamStatus, number>;

const emptyCounts = (): StatusCounts => ({ product: 0, sop: 0, business: 0, forty: 0 });

export type TeamMemberLike = {
  id: string;
  parentId: string | null;
  name: string;
  status: TeamStatus;
};

export type TeamNode<T extends TeamMemberLike> = T & {
  /** ชั้นที่ 1 = อยู่ใต้ผู้ใช้โดยตรง */
  depth: number;
  children: TeamNode<T>[];
};

export type LegSummary<T extends TeamMemberLike> = {
  root: TeamNode<T>;
  /** จำนวนคนในสายนี้ (รวมหัวสาย) */
  people: number;
  selfForty: number;
  statusCounts: StatusCounts;
  /** ชั้นลึกสุดของสายนี้ */
  depth: number;
  /** ชั้นลึกสุดที่มีคนทำ 40 คะแนนได้เอง (0 = ยังไม่มี) */
  selfFortyDepth: number;
};

export function buildTeamTree<T extends TeamMemberLike>(members: T[]) {
  const ids = new Set(members.map((m) => m.id));
  const childrenOf = new Map<string | null, T[]>();
  for (const m of members) {
    // parent ที่หาไม่เจอ ถือว่าอยู่ใต้ผู้ใช้โดยตรง
    const parent = m.parentId && ids.has(m.parentId) ? m.parentId : null;
    const list = childrenOf.get(parent) ?? [];
    list.push(m);
    childrenOf.set(parent, list);
  }

  const visited = new Set<string>();
  const build = (parent: string | null, depth: number): TeamNode<T>[] =>
    (childrenOf.get(parent) ?? [])
      .filter((m) => !visited.has(m.id))
      .map((m) => {
        visited.add(m.id);
        return { ...m, depth, children: build(m.id, depth + 1) };
      });

  const roots = sortBranches(build(null, 1));

  const legs: LegSummary<T>[] = roots.map((root) => {
    let people = 0;
    let selfForty = 0;
    let depth = 0;
    let selfFortyDepth = 0;
    const statusCounts = emptyCounts();
    walk(root, (n) => {
      people++;
      statusCounts[n.status]++;
      depth = Math.max(depth, n.depth);
      if (n.status === "forty") {
        selfForty++;
        selfFortyDepth = Math.max(selfFortyDepth, n.depth);
      }
    });
    return { root, people, selfForty, statusCounts, depth, selfFortyDepth };
  });

  return {
    roots,
    legs,
    totals: {
      people: legs.reduce((s, l) => s + l.people, 0),
      selfForty: legs.reduce((s, l) => s + l.selfForty, 0),
      statusCounts: legs.reduce((acc, l) => {
        for (const k of Object.keys(acc) as TeamStatus[]) acc[k] += l.statusCounts[k];
        return acc;
      }, emptyCounts()),
      legs: legs.length,
      legsWithSelfForty: legs.filter((l) => l.selfForty > 0).length,
      depth: Math.max(0, ...legs.map((l) => l.depth)),
      selfFortyDepth: Math.max(0, ...legs.map((l) => l.selfFortyDepth)),
    },
  };
}

/**
 * เรียงสายจากซ้ายไปขวา (ทุกชั้น):
 * 1) มีคนทำ 40 ได้เองมากกว่าอยู่ก่อน  2) ลึกกว่าอยู่ก่อน  3) ตามลำดับที่เพิ่ม
 */
function sortBranches<T extends TeamMemberLike>(nodes: TeamNode<T>[]): TeamNode<T>[] {
  const stats = new Map<TeamNode<T>, { forty: number; depth: number }>();
  const measure = (n: TeamNode<T>): { forty: number; depth: number } => {
    let forty = n.status === "forty" ? 1 : 0;
    let depth = n.depth;
    for (const c of n.children) {
      const s = measure(c);
      forty += s.forty;
      depth = Math.max(depth, s.depth);
    }
    const s = { forty, depth };
    stats.set(n, s);
    return s;
  };
  nodes.forEach(measure);

  const sort = (list: TeamNode<T>[]): TeamNode<T>[] => {
    for (const n of list) n.children = sort(n.children);
    return list
      .map((n, i) => ({ n, i, s: stats.get(n)! }))
      .sort((a, b) => b.s.forty - a.s.forty || b.s.depth - a.s.depth || a.i - b.i)
      .map((x) => x.n);
  };
  return sort(nodes);
}

export function walk<T extends TeamMemberLike>(node: TeamNode<T>, fn: (n: TeamNode<T>) => void) {
  fn(node);
  for (const c of node.children) walk(c, fn);
}

/** id ของคนนี้และทุกคนที่อยู่ใต้ (ใช้กันไม่ให้ย้ายไปอยู่ใต้ลูกทีมตัวเอง) */
export function subtreeIds(members: TeamMemberLike[], id: string): Set<string> {
  const out = new Set<string>([id]);
  let added = true;
  while (added) {
    added = false;
    for (const m of members) {
      if (m.parentId && out.has(m.parentId) && !out.has(m.id)) {
        out.add(m.id);
        added = true;
      }
    }
  }
  return out;
}

// ---------- จัดตำแหน่งสำหรับวาดชาร์ต ----------

export type ChartNode = {
  id: string | null; // null = ตัวผู้ใช้เอง (บนสุด)
  name: string;
  /** null = ตัวผู้ใช้ */
  status: TeamStatus | null;
  /** ตำแหน่งแนวนอน หน่วยเป็นช่อง (slot) */
  x: number;
  /** ชั้น: 0 = ผู้ใช้ */
  level: number;
};

export type ChartLink = { parent: ChartNode; children: ChartNode[] };

/**
 * จัดตำแหน่งแบบต้นไม้: ใบไม้เรียงช่องละคนจากซ้ายไปขวา
 * แม่อยู่กึ่งกลางเหนือลูกคนแรกกับคนสุดท้าย
 */
export function layoutChart<T extends TeamMemberLike>(roots: TeamNode<T>[], me: string) {
  const nodes: ChartNode[] = [];
  const links: ChartLink[] = [];
  let nextSlot = 0;

  const place = (
    item: { id: string | null; name: string; status: TeamStatus | null },
    children: TeamNode<T>[],
    level: number,
  ): ChartNode => {
    const placed = children.map((c) => place(c, c.children, level + 1));
    const x =
      placed.length === 0
        ? nextSlot++
        : (placed[0].x + placed[placed.length - 1].x) / 2;
    const node: ChartNode = { id: item.id, name: item.name, status: item.status, x, level };
    nodes.push(node);
    if (placed.length > 0) links.push({ parent: node, children: placed });
    return node;
  };

  place({ id: null, name: me, status: null }, roots, 0);
  return {
    nodes,
    links,
    slots: Math.max(nextSlot, 1),
    levels: Math.max(...nodes.map((n) => n.level)) + 1,
  };
}
