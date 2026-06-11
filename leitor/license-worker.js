/**
 * FaturaLite — License Validation Worker
 * Deploy: Cloudflare Workers + KV Namespace "FL_LICENSES"
 *
 * KV structure:
 *   key:   license code  (ex: "JPRO-2026-FULL-0001")
 *   value: JSON string   { "name": "Empresa X", "expiry": "2026-12-31", "active": true, "email": "x@y.pt" }
 */

const ALLOWED_ORIGINS = [
  // Adiciona aqui os domínios onde o HTML está alojado
  // Ex: "https://faturas.tuaempresa.pt"
  // Durante desenvolvimento, podes deixar "*" mas remove em produção
  "*"
];

export default {
  async fetch(request, env) {
    // ── CORS ──
    const origin = request.headers.get("Origin") || "";
    const allowOrigin = ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(origin)
      ? (ALLOWED_ORIGINS.includes("*") ? "*" : origin)
      : "";

    const corsHeaders = {
      "Access-Control-Allow-Origin":  allowOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405, corsHeaders);
    }

    // ── Parse body ──
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ valid: false, error: "Invalid JSON" }, 400, corsHeaders);
    }

    const { action, key, adminSecret } = body;

    // ══════════════════════════════════════
    //  VALIDATE — chamado pelo HTML cliente
    // ══════════════════════════════════════
    if (action === "validate") {
      if (!key || typeof key !== "string") {
        return json({ valid: false, error: "Missing key" }, 400, corsHeaders);
      }

      const raw = await env.FL_LICENSES.get(key.trim().toUpperCase());
      if (!raw) {
        return json({ valid: false, reason: "not_found" }, 200, corsHeaders);
      }

      let license;
      try { license = JSON.parse(raw); } catch {
        return json({ valid: false, reason: "corrupt" }, 200, corsHeaders);
      }

      if (!license.active) {
        return json({ valid: false, reason: "inactive", name: license.name }, 200, corsHeaders);
      }

      const today = new Date().toISOString().slice(0, 10);
      if (license.expiry < today) {
        return json({ valid: false, reason: "expired", expiry: license.expiry, name: license.name }, 200, corsHeaders);
      }

      // Registar último uso (fire-and-forget)
      const updated = { ...license, lastSeen: today };
      env.FL_LICENSES.put(key.trim().toUpperCase(), JSON.stringify(updated));

      return json({
        valid:  true,
        name:   license.name,
        expiry: license.expiry,
        plan:   license.plan || "standard",
      }, 200, corsHeaders);
    }

    // ══════════════════════════════════════
    //  ADMIN ACTIONS — protegidos por secret
    // ══════════════════════════════════════
    if (!adminSecret || adminSecret !== env.ADMIN_SECRET) {
      return json({ error: "Unauthorized" }, 401, corsHeaders);
    }

    // ── CREATE ──
    if (action === "create") {
      const { name, expiry, plan, email } = body;
      if (!key || !name || !expiry) {
        return json({ error: "Missing key/name/expiry" }, 400, corsHeaders);
      }
      const license = { name, expiry, plan: plan || "standard", email: email || "", active: true, created: new Date().toISOString().slice(0,10), lastSeen: null };
      await env.FL_LICENSES.put(key.trim().toUpperCase(), JSON.stringify(license));
      return json({ ok: true, key: key.trim().toUpperCase(), license }, 200, corsHeaders);
    }

    // ── REVOKE ──
    if (action === "revoke") {
      const raw = await env.FL_LICENSES.get(key.trim().toUpperCase());
      if (!raw) return json({ error: "Key not found" }, 404, corsHeaders);
      const license = JSON.parse(raw);
      license.active = false;
      await env.FL_LICENSES.put(key.trim().toUpperCase(), JSON.stringify(license));
      return json({ ok: true, key, revoked: true }, 200, corsHeaders);
    }

    // ── LIST ──
    if (action === "list") {
      const list = await env.FL_LICENSES.list();
      const items = [];
      for (const { name: k } of list.keys) {
        const raw = await env.FL_LICENSES.get(k);
        try { items.push({ key: k, ...JSON.parse(raw) }); } catch {}
      }
      return json({ ok: true, licenses: items }, 200, corsHeaders);
    }

    // ── DELETE ──
    if (action === "delete") {
      await env.FL_LICENSES.delete(key.trim().toUpperCase());
      return json({ ok: true, deleted: key }, 200, corsHeaders);
    }

    return json({ error: "Unknown action" }, 400, corsHeaders);
  }
};

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers }
  });
}
