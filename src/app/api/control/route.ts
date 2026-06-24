import { NextRequest, NextResponse } from "next/server";
import { tuya } from "@/lib/tuyaConnector";
import { TUYA_DEVICES } from "@/lib/config";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function sendCommands(
  deviceId: string,
  commands: { code: string; value: string | number | boolean }[]
) {
  const result = await tuya.request({
    method: "POST",
    path: `/v1.0/iot-03/devices/${deviceId}/commands`,
    body: { commands },
  });
  if (!result.success) {
    const msg = result.msg || `Tuya error code: ${result.code}`;
    console.error("[control]", msg, JSON.stringify(commands));
    throw new Error(msg);
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const {
      deviceId: reqDeviceId,
      state,
      brightness,
      temperature,
      workMode,
      colourHsv,
      scene,
      countdown,
    }: {
      deviceId?: string;
      state?: boolean;
      brightness?: number;
      temperature?: number;
      workMode?: string;
      colourHsv?: { h: number; s: number; v: number };
      scene?: string;
      countdown?: number;
    } = await request.json();

    const deviceId = reqDeviceId || TUYA_DEVICES[0];

    // ── Scene: MUST be sent in two separate requests ────────────────────────
    // Step 1: switch work_mode to "scene" first
    // Step 2: wait, then send scene_data_v2
    if (scene !== undefined) {
      console.log("[scene] Switching mode...");
      await sendCommands(deviceId, [{ code: "work_mode", value: "scene" }]);
      await sleep(800);

      console.log("[scene] Sending scene data:", JSON.stringify(scene));
      try {
        // Try passing as object (expected by some devices)
        await sendCommands(deviceId, [{ code: "scene_data_v2", value: typeof scene === 'string' ? JSON.parse(scene) : scene }]);
      } catch (e: any) {
        if (e.message?.includes("type is incorrect") || e.message?.includes("type")) {
           console.log("[scene] Fallback: sending as string...");
           await sendCommands(deviceId, [{ code: "scene_data_v2", value: typeof scene === 'string' ? scene : JSON.stringify(scene) }]);
        } else {
          throw e;
        }
      }
      return NextResponse.json({ success: true });
    }

    // ── Colour: set mode, then colour data ─────────────────────────────────
    if (colourHsv !== undefined && workMode === "colour") {
      await sendCommands(deviceId, [{ code: "work_mode", value: "colour" }]);
      await sleep(300);
      await sendCommands(deviceId, [
        { code: "colour_data_v2", value: JSON.stringify(colourHsv) },
      ]);
      return NextResponse.json({ success: true });
    }

    // ── All other commands ──────────────────────────────────────────────────
    const commands: { code: string; value: string | number | boolean }[] = [];
    if (state       !== undefined) commands.push({ code: "switch_led",      value: state       });
    if (brightness  !== undefined) commands.push({ code: "bright_value_v2", value: brightness  });
    if (temperature !== undefined) commands.push({ code: "temp_value_v2",   value: temperature });
    if (workMode    !== undefined) commands.push({ code: "work_mode",        value: workMode    });
    if (countdown   !== undefined) commands.push({ code: "countdown_1",      value: countdown   });

    if (commands.length === 0) throw new Error("No control data provided");

    await sendCommands(deviceId, commands);
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
