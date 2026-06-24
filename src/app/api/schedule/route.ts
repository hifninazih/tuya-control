import { NextRequest, NextResponse } from "next/server";
import { tuya } from "@/lib/tuyaConnector";

// ── GET: List Schedules ───────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("deviceId");
    const timer_ids = searchParams.get("timer_ids");

    if (!deviceId) return NextResponse.json({ success: false, error: "Missing deviceId" }, { status: 400 });

    let path = `/v2.0/cloud/timer/device/${deviceId}`;
    if (timer_ids) path += `?timer_ids=${timer_ids}`;

    const result = await tuya.request({ method: "GET", path });

    if (!result.success) {
      const msg = result.msg || `Tuya error code: ${result.code}`;
      return NextResponse.json({ success: false, error: msg }, { status: 400 });
    }
    return NextResponse.json({ success: true, schedules: result.result || [] });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// ── POST: Add Schedule ────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, alias_name, time, loops, functions, timezone_id = "Asia/Jakarta" } = body;

    if (!deviceId || !time || !functions) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const payload: any = {
      alias_name: alias_name || "New Schedule",
      time,
      timezone_id,
      functions,
    };
    if (loops) payload.loops = loops;

    const result = await tuya.request({
      method: "POST",
      path: `/v2.0/cloud/timer/device/${deviceId}`,
      body: payload,
    });

    if (!result.success) {
      const msg = result.msg || `Tuya error code: ${result.code}`;
      return NextResponse.json({ success: false, error: msg }, { status: 400 });
    }
    return NextResponse.json({ success: true, result: result.result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// ── PUT: Modify or Enable/Disable Schedule ────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    // If 'enable' is provided and 'functions' is not, it's just a state change.
    const { deviceId, timer_id, enable, alias_name, time, loops, functions, timezone_id = "Asia/Jakarta" } = body;

    if (!deviceId || !timer_id) {
      return NextResponse.json({ success: false, error: "Missing deviceId or timer_id" }, { status: 400 });
    }

    let path = "";
    let payload: any = {};

    if (enable !== undefined && !functions) {
      // Just enable/disable
      path = `/v2.0/cloud/timer/device/${deviceId}/state`;
      payload = { timer_id, enable };
    } else {
      // Full modify
      path = `/v2.0/cloud/timer/device/${deviceId}`;
      payload = {
        timer_id,
        alias_name: alias_name || "Modified Schedule",
        time,
        timezone_id,
        functions,
      };
      if (loops) payload.loops = loops;
    }

    const result = await tuya.request({ method: "PUT", path, body: payload });

    if (!result.success) {
      const msg = result.msg || `Tuya error code: ${result.code}`;
      return NextResponse.json({ success: false, error: msg }, { status: 400 });
    }
    return NextResponse.json({ success: true, result: result.result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// ── DELETE: Delete Schedule(s) ────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("deviceId");
    const timer_ids = searchParams.get("timer_ids"); // Comma-separated

    if (!deviceId) return NextResponse.json({ success: false, error: "Missing deviceId" }, { status: 400 });

    let path = `/v2.0/cloud/timer/device/${deviceId}`;
    let body: any = undefined;

    if (timer_ids) {
      // Bulk delete (Tuya requires it in both query and body based on docs)
      path = `/v2.0/cloud/timer/device/${deviceId}/batch?timer_ids=${timer_ids}`;
      body = { timer_ids };
    } else {
      // Clear all
      path = `/v2.0/cloud/timer/device/${deviceId}`;
    }

    const result = await tuya.request({
      method: "DELETE",
      path,
      body,
    });

    if (!result.success) {
      const msg = result.msg || `Tuya error code: ${result.code}`;
      return NextResponse.json({ success: false, error: msg }, { status: 400 });
    }
    return NextResponse.json({ success: true, result: result.result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
