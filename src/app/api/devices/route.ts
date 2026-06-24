import { NextResponse } from "next/server";
import { tuya } from "@/lib/tuyaConnector";
import { TUYA_DEVICES } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const devices = [];

    for (const deviceId of TUYA_DEVICES) {
      try {
        // Fetch device info AND status in parallel
        const [infoResult, statusResult] = await Promise.all([
          tuya.request({
            method: "GET",
            path: `/v1.0/iot-03/devices/${deviceId}`,
          }),
          tuya.request({
            method: "GET",
            path: `/v1.0/iot-03/devices/${deviceId}/status`,
          }),
        ]);

        if (infoResult.success && infoResult.result) {
          devices.push({
            ...infoResult.result,
            // Merge status array into device object
            status: statusResult.success ? statusResult.result : [],
          });
        } else {
          console.error(`Failed to fetch device ${deviceId}:`, infoResult.msg);
        }
      } catch (err) {
        console.error(`Error fetching device ${deviceId}:`, err);
      }
    }

    return NextResponse.json({ success: true, devices });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
