#!/usr/bin/env node
/**
 * FaturaLite — License Manager CLI
 * Uso: node manage-licenses.js <action> [opções]
 *
 * Requer: WORKER_URL e ADMIN_SECRET nas variáveis de ambiente
 *   export WORKER_URL=https://faturalite-licenses.SEU_SUBDOMINIO.workers.dev
 *   export ADMIN_SECRET=o_teu_secret_aqui
 *
 * Exemplos:
 *   node manage-licenses.js create --key JPRO-2026-STD-0042 --name "Empresa ABC" --expiry 2026-12-31 --plan standard --email abc@empresa.pt
 *   node manage-licenses.js list
 *   node manage-licenses.js revoke --key JPRO-2026-STD-0042
 *   node manage-licenses.js delete --key JPRO-2026-STD-0042
 *   node manage-licenses.js generate --prefix JPRO --plan full --expiry 2026-12-31 --count 5
 */

const WORKER_URL   = process.env.WORKER_URL;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

if (!WORKER_URL || !ADMIN_SECRET) {
  console.error("❌  Define WORKER_URL e ADMIN_SECRET como variáveis de ambiente.");
  process.exit(1);
}

const args = process.argv.slice(2);
const action = args[0];
const opts = {};
for (let i = 1; i < args.length; i += 2) {
  if (args[i]?.startsWith("--")) opts[args[i].slice(2)] = args[i + 1];
}

async function call(body) {
  const res = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, adminSecret: ADMIN_SECRET })
  });
  return res.json();
}

function generateKey(prefix = "JPRO", plan = "STD") {
  const planCode = plan.slice(0, 4).toUpperCase().padEnd(4, "X");
  const year = new Date().getFullYear() + 1;
  const seq  = String(Math.floor(Math.random() * 9000) + 1000);
  return `${prefix.slice(0,4).toUpperCase()}-${year}-${planCode}-${seq}`;
}

(async () => {
  if (action === "create") {
    if (!opts.key || !opts.name || !opts.expiry) {
      console.error("❌  Requer --key --name --expiry");
      process.exit(1);
    }
    const r = await call({ action: "create", key: opts.key, name: opts.name, expiry: opts.expiry, plan: opts.plan || "standard", email: opts.email || "" });
    console.log(r.ok ? `✅  Criada: ${r.key}` : `❌  Erro: ${r.error}`);

  } else if (action === "generate") {
    const count = parseInt(opts.count || "1");
    console.log(`\n🔑  Gerando ${count} licença(s)...\n`);
    for (let i = 0; i < count; i++) {
      const key = generateKey(opts.prefix || "JPRO", opts.plan || "STD");
      const r = await call({ action: "create", key, name: opts.name || `Licença ${i+1}`, expiry: opts.expiry, plan: opts.plan || "standard", email: opts.email || "" });
      console.log(r.ok ? `  ✅  ${key}` : `  ❌  Erro: ${r.error}`);
    }

  } else if (action === "revoke") {
    if (!opts.key) { console.error("❌  Requer --key"); process.exit(1); }
    const r = await call({ action: "revoke", key: opts.key });
    console.log(r.ok ? `🚫  Revogada: ${opts.key}` : `❌  ${r.error}`);

  } else if (action === "delete") {
    if (!opts.key) { console.error("❌  Requer --key"); process.exit(1); }
    const r = await call({ action: "delete", key: opts.key });
    console.log(r.ok ? `🗑️   Eliminada: ${opts.key}` : `❌  ${r.error}`);

  } else if (action === "list") {
    const r = await call({ action: "list" });
    if (!r.ok) { console.error("❌", r.error); return; }
    const today = new Date().toISOString().slice(0,10);
    console.log(`\n📋  ${r.licenses.length} licença(s):\n`);
    console.log("  Código                      Nome                    Plano      Expira      Estado    Último uso");
    console.log("  " + "─".repeat(100));
    r.licenses.forEach(l => {
      const estado  = !l.active ? "🚫 REVOGADA" : l.expiry < today ? "⏰ EXPIRADA" : "✅ ATIVA   ";
      const lastSeen = l.lastSeen || "nunca";
      console.log(`  ${l.key.padEnd(28)} ${(l.name||"").padEnd(23)} ${(l.plan||"").padEnd(10)} ${l.expiry}  ${estado}  ${lastSeen}`);
    });
    console.log();

  } else {
    console.log(`
FaturaLite License Manager

  create    --key XXXX-XXXX-XXXX-XXXX --name "Nome" --expiry YYYY-MM-DD [--plan standard|full] [--email x@y.pt]
  generate  --prefix JPRO --plan full --expiry YYYY-MM-DD --count 5 [--name "Base name"]
  revoke    --key XXXX-XXXX-XXXX-XXXX
  delete    --key XXXX-XXXX-XXXX-XXXX
  list
`);
  }
})();
