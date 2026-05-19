import { useMemo, useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildCellMap,
  buildColumnTypeMap,
  colLetter,
  evaluateCell,
  formatCurrencyBRL,
  normalizeColumn,
  normalizeTable,
  parseCurrencyInput,
  type ColumnType,
  type TableColumn,
  type TableData,
} from "@/lib/sheetFormula";

interface Props {
  value: TableData;
  onChange: (v: TableData) => void;
  readOnly?: boolean;
}

const makeId = () => Math.random().toString(36).slice(2, 10);
export const emptyTable = (): TableData => ({ columns: [], rows: [] });

const TYPE_LABEL: Record<ColumnType, string> = {
  text: "Texto",
  number: "Número",
  currency: "Real (R$)",
  checkbox: "Checkbox",
  select: "Lista suspensa",
};

export const SheetEditor = ({ value: rawValue, onChange, readOnly = false }: Props) => {
  const value = useMemo(() => normalizeTable(rawValue), [rawValue]);
  const cellMap = useMemo(() => buildCellMap(value), [value]);
  const typeMap = useMemo(() => buildColumnTypeMap(value), [value]);

  const addColumn = () => {
    const col: TableColumn = {
      id: makeId(),
      label: `Coluna ${value.columns.length + 1}`,
      type: "text",
    };
    onChange({
      ...value,
      columns: [...value.columns, col],
      rows: value.rows.map((r) => ({ ...r, cells: { ...r.cells, [col.id]: "" } })),
    });
  };

  const updateColumn = (id: string, patch: Partial<TableColumn>) => {
    onChange({
      ...value,
      columns: value.columns.map((c) => (c.id === id ? { ...normalizeColumn(c), ...patch } : c)),
    });
  };

  const removeColumn = (id: string) => {
    onChange({
      ...value,
      columns: value.columns.filter((c) => c.id !== id),
      rows: value.rows.map((r) => {
        const { [id]: _, ...rest } = r.cells;
        return { ...r, cells: rest };
      }),
    });
  };

  const addRow = () => {
    const cells: Record<string, string> = {};
    value.columns.forEach((c) => (cells[c.id] = ""));
    onChange({ ...value, rows: [...value.rows, { id: makeId(), cells }] });
  };

  const removeRow = (id: string) => {
    onChange({ ...value, rows: value.rows.filter((r) => r.id !== id) });
  };

  const setCell = (rowId: string, colId: string, v: string) => {
    onChange({
      ...value,
      rows: value.rows.map((r) =>
        r.id === rowId ? { ...r, cells: { ...r.cells, [colId]: v } } : r,
      ),
    });
  };

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="w-10 px-2 py-1.5 text-[11px] font-medium text-muted-foreground text-center">#</th>
              {value.columns.map((c, idx) => (
                <th key={c.id} className="px-2 py-1.5 border-l min-w-[140px]">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground font-mono w-4">
                      {colLetter(idx)}
                    </span>
                    <span className="text-xs font-medium truncate flex-1" title={c.label}>
                      {c.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground hidden md:inline">
                      {TYPE_LABEL[normalizeColumn(c).type ?? "text"]}
                    </span>
                    {!readOnly && (
                      <>
                        <ColumnConfigPopover
                          column={normalizeColumn(c)}
                          onSave={(patch) => updateColumn(c.id, patch)}
                        />
                        <button
                          onClick={() => removeColumn(c.id)}
                          className="text-muted-foreground hover:text-destructive"
                          title="Remover coluna"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>
                </th>
              ))}
              {!readOnly && (
                <th className="w-10 px-1 py-1.5 border-l">
                  <button
                    onClick={addColumn}
                    className="text-muted-foreground hover:text-foreground"
                    title="Adicionar coluna"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {value.rows.map((row, rIdx) => (
              <tr key={row.id} className="border-b group">
                <td className="px-2 py-1 text-[11px] text-muted-foreground text-center tabular-nums bg-muted/20">
                  {rIdx + 1}
                </td>
                {value.columns.map((col) => {
                  const ncol = normalizeColumn(col);
                  const raw = row.cells[col.id] ?? "";
                  return (
                    <td key={col.id} className="border-l p-0 align-top">
                      <TypedCell
                        column={ncol}
                        raw={raw}
                        cellMap={cellMap}
                        typeMap={typeMap}
                        readOnly={readOnly}
                        onCommit={(v) => setCell(row.id, col.id, v)}
                      />
                    </td>
                  );
                })}
                {!readOnly && (
                  <td className="border-l text-center">
                    <button
                      onClick={() => removeRow(row.id)}
                      className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 p-1"
                      title="Remover linha"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {value.rows.length === 0 && (
              <tr>
                <td
                  colSpan={value.columns.length + 2}
                  className="px-3 py-6 text-center text-xs text-muted-foreground"
                >
                  Nenhuma linha. {!readOnly && "Use \"Adicionar linha\" para começar."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={addRow} disabled={value.columns.length === 0}>
            <Plus className="h-3.5 w-3.5" /> Linha
          </Button>
          <Button size="sm" variant="outline" onClick={addColumn}>
            <Plus className="h-3.5 w-3.5" /> Coluna
          </Button>
        </div>
      )}
    </div>
  );
};

// =================== Column configuration popover ===================

const ColumnConfigPopover = ({
  column,
  onSave,
}: {
  column: TableColumn;
  onSave: (patch: Partial<TableColumn>) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(column.label);
  const [type, setType] = useState<ColumnType>(column.type ?? "text");
  const [options, setOptions] = useState<string[]>(column.options ?? []);
  const [newOpt, setNewOpt] = useState("");

  useEffect(() => {
    if (open) {
      setLabel(column.label);
      setType(column.type ?? "text");
      setOptions(column.options ?? []);
      setNewOpt("");
    }
  }, [open, column]);

  const canSave =
    label.trim().length > 0 &&
    label.length <= 60 &&
    (type !== "select" || options.filter((o) => o.trim()).length > 0);

  const save = () => {
    const patch: Partial<TableColumn> = {
      label: label.trim().slice(0, 60),
      type,
      options:
        type === "select"
          ? options.map((o) => o.trim()).filter(Boolean).slice(0, 50)
          : undefined,
    };
    onSave(patch);
    setOpen(false);
  };

  const addOpt = () => {
    const v = newOpt.trim().slice(0, 30);
    if (!v) return;
    if (options.length >= 50) return;
    setOptions([...options, v]);
    setNewOpt("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="text-muted-foreground hover:text-foreground"
          title="Configurar coluna"
        >
          <Settings2 className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3" align="end">
        <div className="space-y-1.5">
          <Label className="text-xs">Nome da coluna</Label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={60}
            className="h-8"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Tipo</Label>
          <Select value={type} onValueChange={(v) => setType(v as ColumnType)}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Texto</SelectItem>
              <SelectItem value="number">Número</SelectItem>
              <SelectItem value="currency">Real (R$)</SelectItem>
              <SelectItem value="checkbox">Checkbox</SelectItem>
              <SelectItem value="select">Lista suspensa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {type === "select" && (
          <div className="space-y-1.5">
            <Label className="text-xs">Opções</Label>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {options.map((o, i) => (
                <div key={i} className="flex items-center gap-1">
                  <Input
                    value={o}
                    onChange={(e) => {
                      const next = [...options];
                      next[i] = e.target.value.slice(0, 30);
                      setOptions(next);
                    }}
                    className="h-7 text-xs"
                    maxLength={30}
                  />
                  <button
                    onClick={() => setOptions(options.filter((_, j) => j !== i))}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {options.length === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Adicione pelo menos uma opção.
                </p>
              )}
            </div>
            <div className="flex gap-1">
              <Input
                value={newOpt}
                onChange={(e) => setNewOpt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addOpt();
                  }
                }}
                placeholder="Nova opção"
                maxLength={30}
                className="h-7 text-xs"
              />
              <Button size="sm" variant="outline" onClick={addOpt} className="h-7">
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={save} disabled={!canSave}>
            Salvar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// =================== Typed cell renderers ===================

const TypedCell = ({
  column,
  raw,
  cellMap,
  typeMap,
  readOnly,
  onCommit,
}: {
  column: TableColumn;
  raw: string;
  cellMap: Record<string, string>;
  typeMap: Record<string, ColumnType>;
  readOnly: boolean;
  onCommit: (v: string) => void;
}) => {
  const t = column.type ?? "text";

  if (t === "checkbox") {
    const checked = raw === "true";
    return (
      <div className="flex items-center justify-center py-1.5">
        <Checkbox
          checked={checked}
          disabled={readOnly}
          onCheckedChange={(v) => onCommit(v ? "true" : "false")}
        />
      </div>
    );
  }

  if (t === "select") {
    if (readOnly) {
      return <div className="px-2 py-1.5 text-sm">{raw}</div>;
    }
    const opts = column.options ?? [];
    const NONE = "__none__";
    return (
      <Select
        value={raw || NONE}
        onValueChange={(v) => onCommit(v === NONE ? "" : v)}
      >
        <SelectTrigger className="h-8 border-none rounded-none shadow-none focus:ring-1 focus:ring-ring bg-transparent text-sm">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>—</SelectItem>
          {opts.map((o) => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // text / number / currency — share an editable input with type-aware behavior.
  return (
    <ScalarCell
      type={t}
      raw={raw}
      cellMap={cellMap}
      typeMap={typeMap}
      readOnly={readOnly}
      onCommit={onCommit}
    />
  );
};

const ScalarCell = ({
  type,
  raw,
  cellMap,
  typeMap,
  readOnly,
  onCommit,
}: {
  type: ColumnType;
  raw: string;
  cellMap: Record<string, string>;
  typeMap: Record<string, ColumnType>;
  readOnly: boolean;
  onCommit: (v: string) => void;
}) => {
  const isFormula = raw.startsWith("=");
  const allowsFormula = type === "number" || type === "currency";

  // Computed display when not focused.
  const display = (() => {
    if (allowsFormula && isFormula) {
      const r = evaluateCell(raw, cellMap, undefined, undefined, typeMap);
      if (r.error) return { text: "#ERRO", error: r.error };
      if (type === "currency" && r.numeric != null) {
        return { text: formatCurrencyBRL(r.numeric) };
      }
      return { text: r.display };
    }
    if (type === "currency" && raw !== "") {
      const n = parseCurrencyInput(raw);
      if (n != null) return { text: formatCurrencyBRL(n) };
    }
    return { text: raw };
  })();

  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(raw);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!focused) setDraft(raw); }, [raw, focused]);

  if (readOnly) {
    return (
      <div
        className={cn(
          "px-2 py-1.5 text-sm",
          (type === "number" || type === "currency") && "text-right tabular-nums",
          display.error && "text-destructive",
        )}
        title={display.error || (isFormula ? raw : undefined)}
      >
        {display.text}
      </div>
    );
  }

  const commit = () => {
    if (draft === raw) return;
    if (type === "currency" && !draft.startsWith("=") && draft.trim() !== "") {
      const n = parseCurrencyInput(draft);
      onCommit(n == null ? draft : String(n));
      return;
    }
    if (type === "number" && !draft.startsWith("=") && draft.trim() !== "") {
      // Allow comma decimals on input; store with dot.
      const n = parseCurrencyInput(draft);
      onCommit(n == null ? draft : String(n));
      return;
    }
    onCommit(draft);
  };

  const shown = focused ? draft : display.text;

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode={type === "number" || type === "currency" ? "decimal" : undefined}
      value={shown}
      onChange={(e) => {
        let v = e.target.value;
        if ((type === "number" || type === "currency") && !v.startsWith("=")) {
          // Restrict to digits, decimal separators, sign, currency cosmetics.
          v = v.replace(/[^0-9.,\-R$\s]/g, "");
        }
        setDraft(v);
      }}
      onFocus={() => { setDraft(raw); setFocused(true); }}
      onBlur={() => { setFocused(false); commit(); }}
      onKeyDown={(e) => {
        if (e.key === "Enter") inputRef.current?.blur();
        if (e.key === "Escape") { setDraft(raw); inputRef.current?.blur(); }
      }}
      className={cn(
        "w-full px-2 py-1.5 text-sm bg-transparent outline-none focus:bg-accent/30 focus:ring-1 focus:ring-ring",
        (type === "number" || type === "currency") && "text-right tabular-nums",
        !focused && isFormula && "text-primary",
        display.error && "text-destructive",
      )}
      title={display.error || (isFormula ? `Fórmula: ${raw} = ${display.text}` : undefined)}
    />
  );
};
