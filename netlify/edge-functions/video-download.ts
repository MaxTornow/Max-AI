// Streams a video from its CDN URL back to the browser, server-side, so the client
// avoids Instagram/TikTok CDN CORS blocks without buffering the whole file into memory.
// Runs on the edge runtime (unlike netlify/functions/video-proxy.js, which buffered the
// full response as base64 and hit Netlify Functions' ~4.5MB response cap on larger clips).
export default async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("", {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Accept",
      },
    });
  }

  const videoUrl = new URL(request.url).searchParams.get("url");

  if (!videoUrl) {
    return new Response(JSON.stringify({ error: "Missing url parameter" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  try {
    const parsed = new URL(videoUrl);
    const isTikTok =
      parsed.hostname.includes("tiktok") ||
      parsed.hostname.includes("tikwm") ||
      parsed.hostname.includes("musical.ly");
    const referer = isTikTok ? "https://www.tiktok.com/" : "https://www.instagram.com/";

    console.log("Streaming video from:", parsed.hostname);

    const response = await fetch(videoUrl, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "*/*",
        Referer: referer,
      },
    });

    console.log("Upstream response status:", response.status);

    if (!response.ok || !response.body) {
      return new Response(
        JSON.stringify({
          error: `Failed to fetch video: ${response.status} ${response.statusText}`,
        }),
        {
          status: response.status || 502,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Pipe the body straight through - no buffering, so there's no size cap here.
    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "video/mp4",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error streaming video:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
};

export const config = {
  path: "/api/video-download",
};
