import { NextResponse } from "next/server";

export async function GET() {
  const turnTokenId = process.env.CLOUDFLARE_TURN_KEY_ID;
  const apiToken = process.env.CLOUDFLARE_TURN_API_TOKEN;

  if (!turnTokenId || !apiToken) {
    console.error("Missing Cloudflare TURN credentials in environment");
    return NextResponse.json(
      { error: "TURN server configuration missing" },
      { status: 500 }
    );
  }

  try {
    // Generate short-lived credentials from Cloudflare using the generate-ice-servers endpoint
    // This returns the full iceServers configuration ready for WebRTC
    // Docs: https://developers.cloudflare.com/realtime/turn/
    const response = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${turnTokenId}/credentials/generate-ice-servers`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // TTL in seconds - max is 48 hours (172800)
          // Using 24 hours for reasonable session duration
          ttl: 86400,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Cloudflare TURN API error:", response.status, errorText);
      return NextResponse.json(
        { error: "Failed to generate TURN credentials" },
        { status: response.status }
      );
    }

    const data = await response.json();

    // The generate-ice-servers endpoint returns { iceServers: [...] }
    // which is ready to use directly in RTCPeerConnection config
    // Response format:
    // {
    //   "iceServers": [{
    //     "urls": ["stun:...", "turn:...", "turns:..."],
    //     "username": "...",
    //     "credential": "..."
    //   }]
    // }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error generating TURN credentials:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
