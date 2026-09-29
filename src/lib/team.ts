// คำนวณผังสายงาน (ฟังก์ชันล้วน ไม่แตะฐานข้อมูล)

export type TeamMemberLike = {
  id: string;
  parentId: string | null;
  name: string;
  selfForty: boolean;
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

  const roots = build(null, 1);

  const legs: LegSummary<T>[] = roots.map((root) => {
    let people = 0;
    let selfForty = 0;
    let depth = 0;
    let selfFortyDepth = 0;
    walk(root, (n) => {
      people++;
      depth = Math.max(depth, n.depth);
      if (n.selfForty) {
        selfForty++;
        selfFortyDepth = Math.max(selfFortyDepth, n.depth);
      }
    });
    return { root, people, selfForty, depth, selfFortyDepth };
  });

  return {
    roots,
    legs,
    totals: {
      people: legs.reduce((s, l) => s + l.people, 0),
      selfForty: legs.reduce((s, l) => s + l.selfForty, 0),
      legs: legs.length,
      legsWithSelfForty: legs.filter((l) => l.selfForty > 0).length,
      depth: Math.max(0, ...legs.map((l) => l.depth)),
      selfFortyDepth: Math.max(0, ...legs.map((l) => l.selfFortyDepth)),
    },
  };
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
