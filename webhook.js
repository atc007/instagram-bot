// ============================================================
//  Seja Minimalista — Bot de comentários Instagram
//  Deploy: Vercel (gratuito)
// ============================================================

// ── REGRAS DE PALAVRAS-CHAVE ─────────────────────────────────
// Edite aqui para adicionar/remover regras sem mexer no resto.
const RULES = [
  {
    keywords: ["link", "quero", "manda", "me envia", "como compro"],
    comment: "Oi! Mandei o link por DM pra você. 🖤",
    dm: "Oi! Aqui está o link que você pediu 👉 https://sejaminimalista.com.br — qualquer dúvida é só falar!",
    match: "contains", // "contains" | "exact" | "starts"
  },
  {
    keywords: ["preço", "quanto custa", "valor", "promoção"],
    comment: "Mandei os detalhes por DM! 🖤",
    dm: "Oi! Você pode ver todos os preços e condições em https://sejaminimalista.com.br 😊 Qualquer dúvida estou aqui!",
    match: "contains",
  },
  {
    keywords: ["planner"],
    comment: "Oi! Te mandei o link do Planner por DM 🖤",
    dm: "Oi! O Planner Minimalista está aqui 👉 https://sejaminimalista.com.br/planner — espero que goste!",
    match: "contains",
  },
];

// ── VARIÁVEIS DE AMBIENTE (configure no Vercel Dashboard) ────
// VERIFY_TOKEN     → token que você escolhe e coloca no Meta
// ACCESS_TOKEN     → Page Access Token do Meta for Developers
// INSTAGRAM_ID     → ID numérico da sua conta Instagram profissional

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const INSTAGRAM_ID = process.env.INSTAGRAM_ID;

// ── HELPERS ──────────────────────────────────────────────────
function matchRule(text) {
  const lower = text.toLowerCase().trim();
  for (const rule of RULES) {
    const hit = rule.keywords.some((kw) => {
      const k = kw.toLowerCase().trim();
      if (rule.match === "exact") return lower === k;
      if (rule.match === "starts") return lower.startsWith(k);
      return lower.includes(k);
    });
    if (hit) return rule;
  }
  return null;
}

async function replyComment(commentId, message) {
  const url = `https://graph.facebook.com/v19.0/${commentId}/replies`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, access_token: ACCESS_TOKEN }),
  });
  return res.json();
}

async function sendDM(userId, message) {
  const url = `https://graph.facebook.com/v19.0/${INSTAGRAM_ID}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: userId },
      message: { text: message },
      access_token: ACCESS_TOKEN,
    }),
  });
  return res.json();
}

// ── HANDLER PRINCIPAL ─────────────────────────────────────────
export default async function handler(req, res) {

  // ── GET: verificação do webhook pelo Meta ──────────────────
  if (req.method === "GET") {
    const mode      = req.query["hub.mode"];
    const token     = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Webhook verificado com sucesso.");
      return res.status(200).send(challenge);
    }
    return res.status(403).send("Token inválido.");
  }

  // ── POST: evento recebido do Instagram ─────────────────────
  if (req.method === "POST") {
    const body = req.body;

    // Confirma que é do Instagram
    if (body.object !== "instagram") {
      return res.status(400).send("Objeto não suportado.");
    }

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {

        // Evento de comentário em post
        if (change.field === "comments") {
          const val       = change.value;
          const commentId = val.id;
          const userId    = val.from?.id;
          const text      = val.text || "";

          console.log(`Comentário recebido: "${text}" (user: ${userId})`);

          const rule = matchRule(text);
          if (!rule) {
            console.log("Nenhuma regra ativada.");
            continue;
          }

          console.log(`Regra ativada: [${rule.keywords.join(", ")}]`);

          // Responde o comentário publicamente
          const commentResult = await replyComment(commentId, rule.comment);
          console.log("Resposta comentário:", JSON.stringify(commentResult));

          // Envia DM
          if (userId) {
            const dmResult = await sendDM(userId, rule.dm);
            console.log("DM enviada:", JSON.stringify(dmResult));
          }
        }
      }
    }

    return res.status(200).send("EVENT_RECEIVED");
  }

  return res.status(405).send("Método não permitido.");
}
