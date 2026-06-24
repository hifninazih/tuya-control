import { tuya } from "@/lib/tuyaConnector";
import { TUYA_DEVICES } from "@/lib/config";

export const dynamic = "force-dynamic";

async function fetchAllDevices() {
  const devices = [];
  for (const deviceId of TUYA_DEVICES) {
    try {
      const [info, status] = await Promise.all([
        tuya.request({ method: "GET", path: `/v1.0/iot-03/devices/${deviceId}` }),
        tuya.request({ method: "GET", path: `/v1.0/iot-03/devices/${deviceId}/status` }),
      ]);
      if (info.success && info.result) {
        devices.push({
          ...info.result,
          status: status.success ? status.result : [],
        });
      }
    } catch (e) {
      console.error(`[SSE] fetch failed for ${deviceId}:`, e);
    }
  }
  return devices;
}

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = async () => {
        if (closed) return;
        try {
          const devices = await fetchAllDevices();
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ devices })}\n\n`)
          );
        } catch (e) {
          console.error("[SSE] send error:", e);
        }
      };

      // Initial fetch immediately
      await send();

      // Then poll every 5 seconds
      const interval = setInterval(send, 5000);

      request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Important: disable nginx/proxy buffering
    },
  });
}
