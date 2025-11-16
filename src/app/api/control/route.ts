import { NextRequest, NextResponse } from "next/server";
import { tuya } from "@/lib/tuyaConnector";

export async function POST(request: NextRequest) {
  try {
    const {
      state,
      brightness,
      temperature,
      color,
    }: {
      state?: boolean;
      brightness?: number;
      color?: string;
      temperature?: number;
    } = await request.json();
    const deviceId = process.env.TUYA_DEVICE_ID!;
    const commands: any[] = [];

    if (state !== undefined)
      commands.push({ code: "switch_led", value: state });
    if (brightness !== undefined)
      commands.push({ code: "bright_value_v2", value: brightness });
    if (temperature !== undefined)
      commands.push({ code: "temp_value_v2", value: temperature });

    if (color) {
      const hsv = hexToHsv(color);
      commands.push({ code: "colour_data_v2", value: JSON.stringify(hsv) });
    }

    if (commands.length === 0) throw new Error("No control data provided");

    const result = await tuya.request({
      method: "POST",
      path: `/v1.0/iot-03/devices/${deviceId}/commands`,
      body: { commands },
    });

    if (!result.success)
      throw new Error(result.msg || `Tuya API error code: ${result.code}`);

    return NextResponse.json({ success: true, tuya_response: result.result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(errorMessage);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// Helper konversi HEX -> HSV (Tuya format)
function hexToHsv(hex: string) {
  let r = parseInt(hex.substr(1, 2), 16) / 255;
  let g = parseInt(hex.substr(3, 2), 16) / 255;
  let b = parseInt(hex.substr(5, 2), 16) / 255;

  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    v = max;
  const d = max - min;

  s = max === 0 ? 0 : d / max;

  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 1000),
    v: Math.round(v * 1000),
  };
}
