import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, UserPlus } from "lucide-react";
import { StateCityField, type StateCityValue } from "./StateCityField";
import { AddressField, type AddressValue } from "./AddressField";
import {
  DEFAULT_PARTNER_SCHEMA,
  isMarriedLike,
  resolvePartnerSchema,
  type PartnerSubfield,
} from "./partnerSchema";
import { maskCpf, maskCnpj, onlyDigits } from "@/lib/documents";

// A partner is now a free-form record keyed by subfield id.
export type Partner = Record<string, unknown> & {
  // Common builtin keys (kept for type ergonomics; runtime is schema-driven)
  nome?: string;
  data_nascimento?: string;
  nacionalidade?: string;
  naturalidade?: StateCityValue;
  profissao?: string;
  estado_civil?: string;
  regime_bens?: string;
  endereco?: AddressValue;
  etnia?: string;
  participacao?: string;
};

const maskPhone = (v: string): string => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) {
    const p1 = d.slice(0, 2);
    const p2 = d.slice(2, 6);
    const p3 = d.slice(6, 10);
    let out = p1 ? `(${p1}` : "";
    if (d.length > 2) out += `) ${p2}`;
    if (d.length > 6) out += `-${p3}`;
    return out;
  }
  const p1 = d.slice(0, 2);
  const p2 = d.slice(2, 7);
  const p3 = d.slice(7, 11);
  let out = `(${p1}`;
  if (d.length > 2) out += `) ${p2}`;
  if (d.length > 7) out += `-${p3}`;
  return out;
};

const FieldRow = ({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <div className="space-y-1">
    <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      {label}
      {required && <span className="text-destructive"> *</span>}
    </label>
    {children}
  </div>
);

const SubfieldInput = ({
  sub,
  value,
  onChange,
}: {
  sub: PartnerSubfield;
  value: unknown;
  onChange: (v: unknown) => void;
}) => {
  const str = typeof value === "string" ? value : value == null ? "" : String(value);
  switch (sub.type) {
    case "long_text":
      return (
        <Textarea
          value={str}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          maxLength={2000}
        />
      );
    case "date":
      return <Input type="date" value={str} onChange={(e) => onChange(e.target.value)} />;
    case "email":
      return (
        <Input
          type="email"
          value={str}
          onChange={(e) => onChange(e.target.value)}
          maxLength={200}
        />
      );
    case "phone":
      return (
        <Input
          inputMode="tel"
          value={maskPhone(str)}
          onChange={(e) => onChange(maskPhone(e.target.value))}
          maxLength={16}
        />
      );
    case "number":
      return (
        <Input
          inputMode="decimal"
          value={str}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "currency":
      return (
        <Input
          inputMode="decimal"
          placeholder="0,00"
          value={str}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "cpf":
      return (
        <Input
          inputMode="numeric"
          placeholder="000.000.000-00"
          value={maskCpf(str)}
          onChange={(e) => onChange(onlyDigits(e.target.value))}
          maxLength={14}
        />
      );
    case "cnpj":
      return (
        <Input
          inputMode="numeric"
          placeholder="00.000.000/0000-00"
          value={maskCnpj(str)}
          onChange={(e) => onChange(onlyDigits(e.target.value))}
          maxLength={18}
        />
      );
    case "checkbox":
      return (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={value === true || value === "true"}
            onCheckedChange={(c) => onChange(c === true)}
          />
          <span className="text-muted-foreground">{sub.label}</span>
        </label>
      );
    case "select":
      return (
        <Select value={str} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            {(sub.options ?? []).map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "state_city":
      return (
        <StateCityField
          value={(value as StateCityValue | undefined) ?? undefined}
          onChange={(v) => onChange(v)}
        />
      );
    case "address":
      return (
        <AddressField
          value={typeof value === "object" && value !== null ? (value as AddressValue) : undefined}
          onChange={(v) => onChange(v)}
        />
      );
    case "text":
    default:
      return (
        <Input
          value={str}
          onChange={(e) => onChange(e.target.value)}
          maxLength={300}
        />
      );
  }
};

export const PartnerGroupField = ({
  value,
  onChange,
  addButtonLabel,
  schema,
  fieldOptions,
}: {
  value: Partner[] | undefined;
  onChange: (v: Partner[]) => void;
  addButtonLabel?: string;
  /** Resolved schema; takes precedence over `fieldOptions`. */
  schema?: PartnerSubfield[];
  /** Raw form_fields.options JSON — will be resolved into a schema if `schema` is not provided. */
  fieldOptions?: unknown;
}) => {
  const partners = Array.isArray(value) ? value : [];
  const buttonLabel = addButtonLabel?.trim() || "Adicionar sócio";
  const resolved =
    schema ?? (fieldOptions !== undefined ? resolvePartnerSchema(fieldOptions) : DEFAULT_PARTNER_SCHEMA);
  const visible = resolved.filter((s) => !s.hidden);

  const update = (i: number, key: string, v: unknown) => {
    const next = partners.map((p, idx) => (idx === i ? { ...p, [key]: v } : p));
    onChange(next);
  };
  const add = () => onChange([...partners, {}]);
  const remove = (i: number) => onChange(partners.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      {partners.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Nenhum sócio adicionado. Clique em "{buttonLabel}".
        </p>
      )}
      {partners.map((p, i) => {
        const showRegime = isMarriedLike(p.estado_civil);
        return (
          <div key={i} className="rounded-lg border p-3 space-y-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Sócio {i + 1}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {visible.map((sub) => {
                // Conditional builtin: regime_bens visible only when married/união estável
                if (sub.id === "regime_bens" && !showRegime) return null;
                // Full-width compound fields
                const fullWidth =
                  sub.type === "address" ||
                  sub.type === "long_text" ||
                  sub.type === "state_city";
                return (
                  <div key={sub.id} className={fullWidth ? "sm:col-span-2" : undefined}>
                    {sub.type === "checkbox" ? (
                      <SubfieldInput
                        sub={sub}
                        value={p[sub.id]}
                        onChange={(v) => update(i, sub.id, v)}
                      />
                    ) : (
                      <FieldRow label={sub.label} required={sub.required}>
                        <SubfieldInput
                          sub={sub}
                          value={p[sub.id]}
                          onChange={(v) => update(i, sub.id, v)}
                        />
                      </FieldRow>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <Button type="button" variant="outline" size="sm" onClick={add}>
        <UserPlus className="h-4 w-4" /> {buttonLabel}
      </Button>
    </div>
  );
};

/** Validate required subfields across all partners. Returns first error message or null. */
export const validatePartnerGroup = (
  partners: Partner[],
  schema: PartnerSubfield[],
): string | null => {
  for (let i = 0; i < partners.length; i++) {
    const p = partners[i] ?? {};
    for (const sub of schema) {
      if (sub.hidden || !sub.required) continue;
      if (sub.id === "regime_bens" && !isMarriedLike(p.estado_civil)) continue;
      const v = p[sub.id];
      const empty =
        v == null ||
        (typeof v === "string" && v.trim() === "") ||
        (typeof v === "object" && v !== null && Object.values(v as object).every((x) => !x));
      if (empty) {
        return `Sócio ${i + 1}: preencha "${sub.label}".`;
      }
    }
  }
  return null;
};
