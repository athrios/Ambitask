import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Check, Sun, Moon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkspacesPanel } from "@/components/workspace/WorkspacesPanel";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Avatar color palette ─────────────────────────────────────────────────────
const AVATAR_COLORS = [
  { id: "moss",  bg: "hsl(96 24% 27%)",  label: "Musgo"    },
  { id: "gold",  bg: "hsl(42 42% 50%)",  label: "Dourado"  },
  { id: "slate", bg: "hsl(215 20% 40%)", label: "Ardósia"  },
  { id: "rose",  bg: "hsl(350 55% 45%)", label: "Rosa"     },
  { id: "teal",  bg: "hsl(175 40% 36%)", label: "Teal"     },
  { id: "amber", bg: "hsl(35 80% 45%)",  label: "Âmbar"    },
];

function getInitials(name?: string, email?: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    return parts.length === 1
      ? parts[0].slice(0, 2).toUpperCase()
      : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return email?.slice(0, 2).toUpperCase() ?? "??";
}

// ── Perfil ───────────────────────────────────────────────────────────────────
function ProfileTab() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(
    user?.user_metadata?.display_name ?? ""
  );
  const [avatarColor, setAvatarColor] = useState(
    user?.user_metadata?.avatar_color ?? "moss"
  );
  const [saving, setSaving] = useState(false);

  const activeColor =
    AVATAR_COLORS.find((c) => c.id === avatarColor) ?? AVATAR_COLORS[0];
  const initials = getInitials(displayName, user?.email);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { display_name: displayName, avatar_color: avatarColor },
    });
    setSaving(false);
    if (error) toast.error("Erro ao salvar: " + error.message);
    else toast.success("Perfil atualizado!");
  };

  return (
    <div className="space-y-6 max-w-sm">
      {/* Avatar preview */}
      <div className="flex items-center gap-4">
        <div
          className="h-14 w-14 rounded-full flex items-center justify-center text-lg font-semibold text-white shrink-0 transition-colors duration-200"
          style={{ backgroundColor: activeColor.bg }}
        >
          {initials}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            {displayName || user?.email}
          </p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      {/* Display name */}
      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Nome de exibição
        </Label>
        <Input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Seu nome"
          className="focus-visible:ring-[hsl(96,24%,27%)]"
        />
      </div>

      {/* Color picker */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Cor do avatar
        </Label>
        <div className="flex gap-2 flex-wrap">
          {AVATAR_COLORS.map((c) => (
            <button
              key={c.id}
              title={c.label}
              onClick={() => setAvatarColor(c.id)}
              className="h-7 w-7 rounded-full flex items-center justify-center transition-transform hover:scale-110"
              style={{ backgroundColor: c.bg }}
            >
              {avatarColor === c.id && (
                <Check className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
              )}
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={save}
        disabled={saving}
        className="bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        {saving ? "Salvando..." : "Salvar"}
      </Button>
    </div>
  );
}

// ── Aparência ────────────────────────────────────────────────────────────────
function AppearanceTab() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const options = [
    { id: "light", label: "Claro",  Icon: Sun  },
    { id: "dark",  label: "Escuro", Icon: Moon },
  ] as const;

  return (
    <div className="space-y-4 max-w-sm">
      <p className="text-sm text-muted-foreground">
        Escolha a aparência do Ambitask.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {options.map(({ id, label, Icon }) => {
          const active = theme === id;
          return (
            <button
              key={id}
              onClick={() => setTheme(id)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-6 transition-all duration-150",
                active
                  ? "border-[hsl(42,42%,50%)] bg-[hsl(42,42%,50%)]/[0.08]"
                  : "border-border hover:border-[hsl(42,42%,50%)]/40 hover:bg-muted/40"
              )}
            >
              {active && (
                <span className="absolute top-2 right-2">
                  <Check
                    className="h-3.5 w-3.5 text-[hsl(42,42%,50%)]"
                    strokeWidth={2.5}
                  />
                </span>
              )}
              <Icon
                className={cn(
                  "h-6 w-6",
                  active ? "text-[hsl(42,42%,50%)]" : "text-muted-foreground"
                )}
              />
              <span
                className={cn(
                  "text-sm font-medium",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── SettingsPanel (exported) ─────────────────────────────────────────────────
export const SettingsPanel = () => {
  const { isOwnerOfAny } = useWorkspace();

  return (
    <Tabs defaultValue="perfil" className="w-full">
      <TabsList className="mb-6 bg-muted/60">
        <TabsTrigger value="perfil">Perfil</TabsTrigger>
        <TabsTrigger value="aparencia">Aparência</TabsTrigger>
        {isOwnerOfAny && (
          <TabsTrigger value="ambientes">Ambientes</TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="perfil">
        <ProfileTab />
      </TabsContent>

      <TabsContent value="aparencia">
        <AppearanceTab />
      </TabsContent>

      {isOwnerOfAny && (
        <TabsContent value="ambientes">
          <WorkspacesPanel />
        </TabsContent>
      )}
    </Tabs>
  );
};
