import { describe, expect, it } from "vitest";
import { buildTeamTree, subtreeIds } from "@/lib/team";

const m = (id: string, parentId: string | null, selfForty = false) => ({
  id,
  parentId,
  name: id,
  selfForty,
});

describe("ผังสายงาน", () => {
  const members = [
    m("A", null, true),
    m("A1", "A"),
    m("A11", "A1", true),
    m("A111", "A11"),
    m("B", null),
    m("B1", "B"),
    m("C", null),
  ];

  it("นับสาย ความลึก และคนที่ทำ 40 ได้เอง", () => {
    const { legs, totals } = buildTeamTree(members);
    expect(totals).toEqual({
      people: 7,
      selfForty: 2,
      legs: 3,
      legsWithSelfForty: 1,
      depth: 4,
      selfFortyDepth: 3,
    });
    expect(legs.map((l) => [l.root.id, l.people, l.selfForty, l.depth, l.selfFortyDepth])).toEqual([
      ["A", 4, 2, 4, 3],
      ["B", 2, 0, 2, 0],
      ["C", 1, 0, 1, 0],
    ]);
  });

  it("ไม่มีคนเลย", () => {
    expect(buildTeamTree([]).totals.depth).toBe(0);
  });

  it("parent ที่หาไม่เจอถือเป็นหัวสาย และไม่วนลูป", () => {
    const { totals } = buildTeamTree([m("X", "missing"), m("P", "Q"), m("Q", "P")]);
    expect(totals.legs).toBe(1);
    expect(totals.people).toBe(1);
  });

  it("หาคนที่อยู่ใต้ทั้งหมด", () => {
    expect([...subtreeIds(members, "A1")].sort()).toEqual(["A1", "A11", "A111"]);
  });
});

describe("จัดตำแหน่งชาร์ต", () => {
  it("แม่อยู่กึ่งกลางเหนือลูก และใบไม้เรียงช่องละคน", async () => {
    const { layoutChart } = await import("@/lib/team");
    // ตามรูป: ผู้ใช้มี 4 สาย สายที่ 2 มีลูก 1 คน
    const { roots } = buildTeamTree([
      m("A", null),
      m("B", null),
      m("B1", "B"),
      m("C", null),
      m("D", null),
    ]);
    const { nodes, links, slots, levels } = layoutChart(roots, "ฉัน");
    const pos = Object.fromEntries(nodes.map((n) => [n.id ?? "me", [n.x, n.level]]));
    expect(pos).toEqual({
      A: [0, 1],
      B1: [1, 2],
      B: [1, 1],
      C: [2, 1],
      D: [3, 1],
      me: [1.5, 0],
    });
    expect(slots).toBe(4);
    expect(levels).toBe(3);
    expect(links.map((l) => [l.parent.id, l.children.map((c) => c.id)])).toEqual([
      ["B", ["B1"]],
      [null, ["A", "B", "C", "D"]],
    ]);
  });

  it("ยังไม่มีใครในผัง", async () => {
    const { layoutChart } = await import("@/lib/team");
    const { nodes, slots, levels } = layoutChart([], "ฉัน");
    expect(nodes).toHaveLength(1);
    expect(slots).toBe(1);
    expect(levels).toBe(1);
  });
});
