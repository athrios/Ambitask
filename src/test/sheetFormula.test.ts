import { describe, it, expect } from "vitest";
import {
  evaluateCell,
  buildCellMap,
  buildColumnTypeMap,
  colLetter,
  colIndex,
  parseCurrencyInput,
  formatCurrencyBRL,
  normalizeColumn,
} from "@/lib/sheetFormula";

describe("sheetFormula", () => {
  it("colLetter / colIndex", () => {
    expect(colLetter(0)).toBe("A");
    expect(colLetter(25)).toBe("Z");
    expect(colLetter(26)).toBe("AA");
    expect(colIndex("A")).toBe(0);
    expect(colIndex("AA")).toBe(26);
  });

  it("literal text", () => {
    expect(evaluateCell("hello", {}).display).toBe("hello");
  });

  it("arithmetic", () => {
    const c = { A1: "10", B1: "3" };
    expect(evaluateCell("=A1+B1", c).display).toBe("13");
    expect(evaluateCell("=A1-B1", c).display).toBe("7");
    expect(evaluateCell("=A1*B1", c).display).toBe("30");
    expect(evaluateCell("=A1/B1", c).display).toBe("3.3333");
  });

  it("SOMA / MEDIA range and aliases", () => {
    const c = { A1: "1", A2: "2", A3: "3" };
    expect(evaluateCell("=SOMA(A1:A3)", c).display).toBe("6");
    expect(evaluateCell("=SUM(A1:A3)", c).display).toBe("6");
    expect(evaluateCell("=MEDIA(A1:A3)", c).display).toBe("2");
    expect(evaluateCell("=AVERAGE(A1:A3)", c).display).toBe("2");
  });

  it("empty cell as zero", () => {
    expect(evaluateCell("=A1+5", {}).display).toBe("5");
  });

  it("cycle detection", () => {
    const c = { A1: "=A1+1" };
    const r = evaluateCell(c.A1, c, new Set(), "A1");
    expect(r.error).toBeTruthy();
  });

  it("invalid formula", () => {
    const r = evaluateCell("=SOMA(", {});
    expect(r.display).toBe("#ERRO");
  });

  it("buildCellMap", () => {
    const m = buildCellMap({
      columns: [{ id: "c1", label: "A" }, { id: "c2", label: "B" }],
      rows: [{ id: "r1", cells: { c1: "1", c2: "2" } }],
    });
    expect(m.A1).toBe("1");
    expect(m.B1).toBe("2");
  });

  it("normalizeColumn derives type from legacy kind", () => {
    expect(normalizeColumn({ id: "x", label: "n", kind: "number" }).type).toBe("number");
    expect(normalizeColumn({ id: "x", label: "n" }).type).toBe("text");
    expect(normalizeColumn({ id: "x", label: "n", type: "currency" }).type).toBe("currency");
  });

  it("type-aware formulas ignore non-numeric columns", () => {
    const data = {
      columns: [
        { id: "a", label: "Desc", type: "text" as const },
        { id: "b", label: "Qtd", type: "number" as const },
        { id: "c", label: "Valor", type: "currency" as const },
        { id: "d", label: "Ok", type: "checkbox" as const },
        { id: "e", label: "St", type: "select" as const, options: ["X"] },
      ],
      rows: [
        { id: "r1", cells: { a: "linha 1", b: "10", c: "1250.50", d: "true", e: "X" } },
        { id: "r2", cells: { a: "linha 2", b: "5",  c: "100",     d: "false", e: "X" } },
      ],
    };
    const cells = buildCellMap(data);
    const tmap = buildColumnTypeMap(data);
    expect(evaluateCell("=SOMA(A1:A2)", cells, undefined, undefined, tmap).numeric).toBe(0);
    expect(evaluateCell("=SOMA(B1:B2)", cells, undefined, undefined, tmap).numeric).toBe(15);
    expect(evaluateCell("=SOMA(C1:C2)", cells, undefined, undefined, tmap).numeric).toBe(1350.5);
    expect(evaluateCell("=SOMA(D1:D2)", cells, undefined, undefined, tmap).numeric).toBe(0);
    expect(evaluateCell("=SOMA(E1:E2)", cells, undefined, undefined, tmap).numeric).toBe(0);
  });

  it("parseCurrencyInput handles BR and plain formats", () => {
    expect(parseCurrencyInput("R$ 1.250,50")).toBe(1250.5);
    expect(parseCurrencyInput("1250.50")).toBe(1250.5);
    expect(parseCurrencyInput("1.234")).toBe(1234);
    expect(parseCurrencyInput("")).toBeNull();
    expect(parseCurrencyInput("abc")).toBeNull();
  });

  it("formatCurrencyBRL formats as pt-BR", () => {
    const s = formatCurrencyBRL(1250.5);
    expect(s).toContain("1.250,50");
    expect(s).toContain("R$");
  });
});
