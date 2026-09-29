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
