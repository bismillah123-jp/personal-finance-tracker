// src/app/api/wa/route.ts
// Webhook endpoint for GOWA WhatsApp messages

import { NextRequest, NextResponse } from "next/server";
import { handleWhatsAppMessage } from "@/lib/wa-handler";

export const runtime = "nodejs";

// ─── Extract message text from various payload formats ──────
function extractMessageText(payload: Record<string, unknown>): string {
  // GOWA can send text in multiple formats:
  // 1. payload.text as string: "hello"
  // 2. payload.text as object: {"message": "hello"} or {"conversation": "hello"}
  // 3. payload.message as string
  // 4. payload.body as string
  // 5. payload.conversation as string (WhatsApp protobuf)

  if (typeof payload.text === "string" && payload.text.trim()) {
    return payload.text.trim();
  }
  if (typeof payload.text === "object" && payload.text !== null) {
    const textObj = payload.text as Record<string, unknown>;
    return (
      (textObj.message as string) ||
      (textObj.conversation as string) ||
      (textObj.extendedTextMessage as Record<string, unknown>)?.text as string ||
      ""
    ).trim();
  }
  if (typeof payload.message === "string" && payload.message.trim()) {
    return payload.message.trim();
  }
  if (typeof payload.body === "string" && payload.body.trim()) {
    return payload.body.trim();
  }
  if (typeof payload.conversation === "string" && payload.conversation.trim()) {
    return payload.conversation.trim();
  }
  return "";
}

// ─── Extract sender phone from payload ──────────────────────
function extractSenderPhone(payload: Record<string, unknown>): string {
  const raw =
    (payload.from as string) ||
    (payload.sender as string) ||
    (payload.remote_jid as string) ||
    "";
  return raw.replace(/@.*$/, "");
}

// ═════════════════════════════════════════════════════════════
// POST /api/wa — Receive webhook from GOWA
// ═════════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    let webhook: Record<string, unknown>;

    try {
      webhook = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const event = webhook.event as string;

    // Only process message events
    if (event !== "message") {
      console.log("[WA] Ignored event:", event);
      return NextResponse.json({ status: "ignored", event });
    }

    const payload = (webhook.payload || webhook) as Record<string, unknown>;
    const messageText = extractMessageText(payload);
    const senderPhone = extractSenderPhone(payload);
    const deviceId = (webhook.device_id as string) || undefined;

    console.log("[WA] Event:", event, "| From:", senderPhone, "| Text:", messageText?.substring(0, 80) || "(empty)");

    // Skip empty or self messages
    if (!messageText || !senderPhone) {
      console.log("[WA] Skipped: empty text or phone");
      return NextResponse.json({ status: "skipped", reason: "empty" });
    }

    // Process asynchronously
    handleWhatsAppMessage(senderPhone, messageText, deviceId).catch((err) => {
      console.error("[WA] Handler error:", err);
    });

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("[WA] Webhook error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
