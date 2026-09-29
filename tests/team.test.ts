import { describe, expect, it } from "vitest";
import { buildTeamTree, subtreeIds, type TeamStatus } from "@/lib/team";

const m = (
  id: string,
  parentId: string | null,
  selfForty = false,
  status: TeamStatus = selfForty ? "forty" : "business",
) => ({ id, parentId, name: id, status });

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
      statusCounts: { none: 0, product: 0, sop: 0, business: 5, forty: 2 },
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

  it("นับตามสถานะ และเปลี่ยนสถานะกลับได้", () => {
    const { totals, legs } = buildTeamTree([
      m("A", null, false, "product"),
      m("A1", "A", false, "sop"),
      m("B", null, false, "forty"),
    ]);
    expect(totals.statusCounts).toEqual({ none: 0, product: 1, sop: 1, business: 0, forty: 1 });
    expect(legs.find((l) => l.root.id === "A")?.selfForty).toBe(0);
    expect(totals.legsWithSelfForty).toBe(1);
  });

  it("เรียงสาย: 40 มากสุดอยู่ซ้าย ถ้าเท่ากันเอาสายที่ลึกกว่า ถ้าเท่ากันอีกตามลำดับที่เพิ่ม", () => {
    const { roots } = buildTeamTree([
      m("P", null), // ไม่มี 40 ลึก 1
      m("Q", null), // ไม่มี 40 ลึก 3
      m("Q1", "Q"),
      m("Q11", "Q1"),
      m("R", null), // 40 สองคน
      m("R1", "R", true),
      m("R2", "R", true),
      m("S", null, true), // 40 หนึ่งคน ลึก 1
      m("T", null), // 40 หนึ่งคน ลึก 2
      m("T1", "T", true),
      m("U", null), // ไม่มี 40 ลึก 1 (เพิ่มหลัง P)
    ]);
    expect(roots.map((r) => r.id)).toEqual(["R", "T", "S", "Q", "P", "U"]);
  });

  it("เรียงลูกทีมในแต่ละชั้นด้วยกฎเดียวกัน", () => {
    const { roots } = buildTeamTree([
      m("A", null),
      m("A1", "A"),
      m("A2", "A"),
      m("A21", "A2"),
      m("A3", "A", true),
    ]);
    expect(roots[0].children.map((c) => c.id)).toEqual(["A3", "A2", "A1"]);
  });

  it("คนที่ไม่มีสถานะ (เป็นแค่อัพไลน์) นับแยก และไม่นับเป็น 40", () => {
    const { totals } = buildTeamTree([
      m("A", null, false, "none"),
      m("A1", "A", true),
    ]);
    expect(totals.statusCounts.none).toBe(1);
    expect(totals.selfForty).toBe(1);
    expect(totals.selfFortyDepth).toBe(2);
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
    // ผู้ใช้มี 4 สาย สาย B ลึกกว่าจึงถูกเรียงไปซ้ายสุด
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
      B1: [0, 2],
      B: [0, 1],
      A: [1, 1],
      C: [2, 1],
      D: [3, 1],
      me: [1.5, 0],
    });
    expect(slots).toBe(4);
    expect(levels).toBe(3);
    expect(links.map((l) => [l.parent.id, l.children.map((c) => c.id)])).toEqual([
      ["B", ["B1"]],
      [null, ["B", "A", "C", "D"]],
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
