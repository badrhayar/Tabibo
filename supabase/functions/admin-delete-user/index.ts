// ─────────────────────────────────────────────────────────────────────────────
// Tabibo · Edge Function · admin-delete-user
// Fully deletes an account: the auth.users row (login) AND the public.users
// profile. Deleting only the profile via the REST API left an orphaned auth
// login that could sign back in. ADMIN-ONLY (caller is authorized first).
//
// Deploy:  supabase functions deploy admin-delete-user
//   (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically.)
//
// Body: { userId: "<public.users.id>" }
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SB_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SERVICE_KEYS = [
  SERVICE_KEY, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), Deno.env.get("SB_SECRET_KEY"),
].filter(Boolean) as string[];

// Origines autorisées à lire nos réponses depuis un navigateur. « * » laissait
// n'importe quelle page tierce appeler ces fonctions avec le jeton de la victime
// et LIRE le résultat. Le jeton étant porté en en-tête (pas en cookie), ce
// n'était pas une faille CSRF — mais restreindre l'origine coûte trois lignes et
// ferme la porte. ALLOWED_ORIGINS permet d'ajouter un domaine sans redéployer.
const ORIGINS = new Set(
  (Deno.env.get("ALLOWED_ORIGINS") ?? "https://tabibo.ma,https://www.tabibo.ma")
    .split(",").map((s) => s.trim()).filter(Boolean),
);
function corsFor(req: Request) {
  const o = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ORIGINS.has(o) ? o : [...ORIGINS][0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}
const cors = {
  "Access-Control-Allow-Origin": [...ORIGINS][0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Vary": "Origin",
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function authorize(req: Request, admin: ReturnType<typeof createClient>) {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false, isAdmin: false, meId: null as string | null };
  if (SERVICE_KEYS.includes(token)) return { ok: true, isAdmin: true, meId: null };
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return { ok: false, isAdmin: false, meId: null };
  const { data: me } = await admin.from("users").select("id, role").eq("auth_id", user.id).maybeSingle();
  return { ok: !!me, isAdmin: (me as any)?.role === "admin", meId: (me as any)?.id ?? null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsFor(req) });
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const authz = await authorize(req, admin);
    if (!authz.ok) return json({ ok: false, error: "unauthorized" }, 401);
    if (!authz.isAdmin) return json({ ok: false, error: "forbidden" }, 403);

    const { userId } = await req.json().catch(() => ({}));
    if (!userId) return json({ ok: false, error: "userId requis" }, 400);
    if (userId === authz.meId) return json({ ok: false, error: "Un admin ne peut pas supprimer son propre compte." }, 400);

    // Resolve the auth_id for this profile, then delete the auth user (this
    // cascades to public.users via the on-delete-cascade FK). If there's no
    // auth_id (rare), delete the profile row directly.
    const { data: row } = await admin.from("users").select("auth_id, role").eq("id", userId).maybeSingle();
    if (!row) return json({ ok: false, error: "Compte introuvable." }, 404);
    if ((row as any).role === "admin") return json({ ok: false, error: "Compte admin protégé." }, 400);

    const authId = (row as any).auth_id as string | null;
    if (authId) {
      const { error } = await admin.auth.admin.deleteUser(authId);
      if (error) return json({ ok: false, error: error.message }, 500);
    } else {
      const { error } = await admin.from("users").delete().eq("id", userId);
      if (error) return json({ ok: false, error: error.message }, 500);
    }
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: (e as Error)?.message || "server error" }, 500);
  }
});
