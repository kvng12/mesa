// supabase/functions/verify-bank-account/index.ts
// Calls the Paystack resolve-account endpoint server-side so the secret key
// never reaches the browser.
//
// Deploy:
//   supabase functions deploy verify-bank-account --no-verify-jwt
//
// Required env var (set in Supabase dashboard → Edge Functions → Secrets):
//   PAYSTACK_SECRET_KEY = sk_live_xxxx  (or sk_test_xxxx for staging)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  let body: { account_number?: string; bank_code?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const { account_number, bank_code } = body;
  if (!account_number || !bank_code) {
    return new Response(JSON.stringify({ error: "account_number and bank_code are required" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!secretKey) {
    console.error("[verify-bank-account] PAYSTACK_SECRET_KEY not set");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const url = `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(account_number)}&bank_code=${encodeURIComponent(bank_code)}`;
  const paystackRes = await fetch(url, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });

  const data = await paystackRes.json();

  if (!paystackRes.ok || !data.status) {
    return new Response(JSON.stringify({
      error: data.message || "Could not verify account",
      verified: false,
    }), {
      status: 200, // return 200 so the frontend can read the error message
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    verified: true,
    account_name: data.data?.account_name ?? "",
    account_number: data.data?.account_number ?? account_number,
  }), {
    status: 200, headers: { ...CORS, "Content-Type": "application/json" },
  });
});
