interface D1Result<T = Record<string, unknown>> { results: T[] }
interface D1Database {
  prepare(query: string): {
    bind(...values: unknown[]): {
      first<T = Record<string, unknown>>(): Promise<T | null>
      all<T = Record<string, unknown>>(): Promise<D1Result<T>>
      run(): Promise<unknown>
    }
  }
}
interface Env {
  DB?: D1Database
  ASSETS: { fetch(request: Request): Promise<Response> }
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  })

const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
const allowedPayments = new Set(["JazzCash", "Easypaisa", "Bank Transfer"])

async function api(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request)

  if (request.method === "GET" && url.pathname === "/api/health") {
    return json({ ok: true, service: "GAMEVOLT API", database: env.DB ? "configured" : "not_configured" })
  }

  if (!env.DB) return json({ error: "Database is not connected yet." }, 503)

  if (request.method === "GET" && url.pathname === "/api/packages") {
    const { results } = await env.DB.prepare(
      "SELECT id, game, title, denomination, price_pkr FROM products WHERE is_active = 1 ORDER BY sort_order, price_pkr"
    ).bind().all()
    return json({ packages: results })
  }

  if (request.method === "POST" && url.pathname === "/api/orders") {
    const length = Number(request.headers.get("content-length") || 0)
    if (length > 8000) return json({ error: "Request is too large." }, 413)

    let body: Record<string, unknown>
    try {
      body = await request.json() as Record<string, unknown>
    } catch {
      return json({ error: "Invalid JSON body." }, 400)
    }

    const productId = typeof body.productId === "string" ? body.productId.trim() : ""
    const playerId = typeof body.playerId === "string" ? body.playerId.trim() : ""
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const paymentMethod = typeof body.paymentMethod === "string" ? body.paymentMethod : ""

    if (!productId || playerId.length < 4 || playerId.length > 32 || !/^[a-zA-Z0-9_-]+$/.test(playerId)) {
      return json({ error: "Please check the package and Player ID." }, 400)
    }
    if (!validEmail(email) || email.length > 254) return json({ error: "Please enter a valid email address." }, 400)
    if (!allowedPayments.has(paymentMethod)) return json({ error: "Unsupported payment method." }, 400)

    const product = await env.DB.prepare(
      "SELECT id, game, title, denomination, price_pkr FROM products WHERE id = ? AND is_active = 1"
    ).bind(productId).first<{id:string;game:string;title:string;denomination:string;price_pkr:number}>()

    if (!product) return json({ error: "This package is unavailable. Please refresh and try again." }, 400)

    const orderId = crypto.randomUUID()
    const reference = "GV-" + crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()
    await env.DB.prepare(
      "INSERT INTO orders (id, public_reference, product_id, game, player_id, customer_email, amount_pkr, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(orderId, reference, product.id, product.game, playerId, email, product.price_pkr, paymentMethod).run()
    await env.DB.prepare(
      "INSERT INTO order_events (id, order_id, actor_type, event_type, note) VALUES (?, ?, 'system', 'order_created', 'Order created; payment has not been verified.')"
    ).bind(crypto.randomUUID(), orderId).run()

    return json({
      ok: true,
      reference,
      amountPkr: product.price_pkr,
      paymentStatus: "unverified",
      fulfillmentStatus: "pending",
      message: "Order created. Payment is not confirmed until an admin verifies it.",
    }, 201)
  }

  const match = url.pathname.match(/^\/api\/orders\/([A-Z0-9-]{6,40})$/i)
  if (request.method === "GET" && match) {
    const order = await env.DB.prepare(
      "SELECT public_reference, game, denomination, amount_pkr, payment_status, fulfillment_status, created_at FROM orders JOIN products ON products.id = orders.product_id WHERE public_reference = ?"
    ).bind(match[1]).first()
    if (!order) return json({ error: "Order not found." }, 404)
    return json({ order })
  }

  return json({ error: "API route not found." }, 404)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await api(request, env)
    } catch {
      return json({ error: "An unexpected server error occurred." }, 500)
    }
  },
}
