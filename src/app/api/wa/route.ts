// src/app/api/wa/route.ts
// Webhook endpoint for GOWA WhatsApp messages

import { NextRequest, NextResponse } from "next/server";
import { handleWhatsAppMessage } from "@/lib/wa-handler";

// Disable body parsing so we can read raw body for HMAC verification
export const runtime = "nodejs";

// ─── Webhook payload types ──────────────────────────────────
interface GOWAWebhookPayload {
  event: string;
  device_id?: string;
  payload: {
    id?: string;
    from?: string;
    sender?: string;
    push_name?: string;
    text?: string;
    message?: string;
    body?: string;
    type?: string;
    timestamp?: string;
    [key: string]: unknown;
  };
}

// ─── Verify webhook signature (optional but recommended) ───
function verifySignature(body: string, signature: string | null): boolean {
  const secret = process.env.GOWA_WEBHOOK_SECRET;
  if (!secret) return true; // Skip verification if no secret configured

  if (!signature) return false;

  const crypto = require("crypto");
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body, "utf-8")
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature.replace("sha256=", ""), "hex"),
    Buffer.from(expected, "hex")
  );
}

// ─── Extract message text from various payload formats ──────
function extractMessageText(payload: GOWAWebhookPayload["payload"]): string {
  // GOWA sends text in various fields depending on message type
  return (
    payload.text?.trim() ||
    payload.message?.trim() ||
    payload.body?.trim() ||
    ""
  );
}

// ─── Extract sender phone from payload ──────────────────────
function extractSenderPhone(payload: GOWAWebhookPayload["payload"]): string {
  // "from" or "sender" field, format: "628123456789@s.whatsapp.net"
  const raw = payload.from || payload.sender || "";
  // Strip @s.whatsapp.net suffix
  return raw.replace(/@.*$/, "");
}

// ═════════════════════════════════════════════════════════════
// POST /api/wa — Receive webhook from GOWA
// ═════════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  try {
    // Read raw body for signature verification
    const rawBody = await request.text();

    // Verify HMAC signature
    const signature = request.headers.get("x-hub-signature-256");
    if (!verifySignature(rawBody, signature)) {
      console.warn("Webhook signature verification failed");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Parse body
    let webhook: GOWAWebhookPayload;
    try {
      webhook = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON" },
        { status: 400 }
      );
    }

    // Only process message events
    if (webhook.event !== "message") {
      return NextResponse.json({ status: "ignored", event: webhook.event });
    }

    const messageText = extractMessageText(webhook.payload);
    const senderPhone = extractSenderPhone(webhook.payload);
    const deviceId = webhook.device_id;

    // Skip empty messages or messages from self
    if (!messageText || !senderPhone) {
      return NextResponse.json({ status: "skipped", reason: "empty" });
    }

    // Process message asynchronously (don't block the webhook response)
    // GOWA expects a quick 200 response
    handleWhatsAppMessage(senderPhone, messageText, deviceId).catch((err) => {
      console.error("Async message handling error:", err);
    });

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ═════════════════════════════════════════════════════════════
// GET /api/wa — Health check
// ═════════════════════════════════════════════════════════════
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "FinTrack WhatsApp AI Assistant",
    version: "1.0.0",
  });
}
