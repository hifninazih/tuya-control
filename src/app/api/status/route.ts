import { NextResponse } from "next/server";
import { tuya } from "@/lib/tuyaConnector";

// api/status
export async function GET() {
  try {
    const deviceId = process.env.TUYA_DEVICE_ID!;
    const result = await tuya.request({
      method: "GET",
      path: `/v1.0/iot-03/devices/${deviceId}/status`,
    });

    if (!result.success) {
      throw new Error(result.msg || `Tuya API error: ${result.code}`);
    }

    return NextResponse.json({
      success: true,
      all_status: result.result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
