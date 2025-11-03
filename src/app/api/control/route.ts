import { TuyaContext } from "@tuya/tuya-connector-nodejs";
import { NextRequest, NextResponse } from "next/server";

// Inisialisasi konektor Tuya
const tuya = new TuyaContext({
  baseUrl: process.env.TUYA_API_REGION!,
  accessKey: process.env.TUYA_CLIENT_ID!,
  secretKey: process.env.TUYA_SECRET!,
});

export async function POST(request: NextRequest) {
  try {
    const { state }: { state: boolean } = await request.json();
    const deviceId = process.env.TUYA_DEVICE_ID!;

    const commands: { code: string; value: boolean }[] = [
      {
        code: "switch_led",
        value: state,
      },
    ];

    const result = await tuya.request({
      method: "POST",
      path: `/v1.0/iot-03/devices/${deviceId}/commands`,
      body: {
        commands: commands,
      },
    });

    if (!result.success) {
      console.error("Tuya API Error:", result);
      throw new Error(result.msg || `Tuya API error code: ${result.code}`);
    }

    return NextResponse.json({ success: true, tuya_response: result.result });
  } catch (error) {
    console.error("API Route Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
