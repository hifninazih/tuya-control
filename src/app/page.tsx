"use client";
import { useState, useEffect, useRef } from "react";

// tipe untuk status dari API
interface StatusItem {
  code: string;
  value?: string | number | boolean;
}

interface StatusResponse {
  success: boolean;
  all_status: StatusItem[];
}

export default function LampControl() {
  const [isOn, setIsOn] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [brightness, setBrightness] = useState(500);
  const [color, setColor] = useState("#ffffff");
  const [mounted, setMounted] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/status");
      const data: StatusResponse = await res.json();
      if (data.success) {
        const switchStatus = data.all_status.find(
          (s) => s.code === "switch_led"
        );
        setIsOn(Boolean(switchStatus?.value));

        const brightStatus = data.all_status.find(
          (s) => s.code === "bright_value_v2"
        );
        setBrightness(Number(brightStatus?.value ?? 500));

        const colorStatus = data.all_status.find(
          (s) => s.code === "colour_data_v2"
        );
        if (colorStatus?.value && typeof colorStatus.value === "string") {
          const hsv = JSON.parse(colorStatus.value) as {
            h: number;
            s: number;
            v: number;
          };
          setColor(hsvToHex(hsv.h, hsv.s / 1000, hsv.v / 1000));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sendControl = async (control: {
    state?: boolean;
    brightness?: number;
    color?: string;
  }) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(control),
        });
        const data = await res.json();
        if (data.success) {
          if (control.state !== undefined) setIsOn(control.state);
          if (control.brightness !== undefined)
            setBrightness(control.brightness);
          if (control.color) setColor(control.color);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6 relative">
      {loading && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-10">
          <span className="text-white font-semibold text-lg">Loading...</span>
        </div>
      )}

      <div className="bg-white p-8 rounded-3xl shadow-xl flex flex-col items-center gap-6 w-full max-w-md relative z-20">
        <h1 className="text-3xl font-bold text-gray-800">Lampu Kamar</h1>
        <div
          className={`w-28 h-28 rounded-full flex items-center justify-center text-3xl font-bold transition-colors duration-300 ${
            isOn ? "bg-yellow-400" : "bg-gray-400"
          }`}
        >
          {isOn === null ? "..." : isOn ? "💡" : "⚫"}
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => sendControl({ state: true })}
            disabled={loading}
            className="px-6 py-2 rounded-full bg-green-600 text-white font-semibold shadow hover:bg-green-700 transition disabled:opacity-50"
          >
            Nyalakan
          </button>
          <button
            onClick={() => sendControl({ state: false })}
            disabled={loading}
            className="px-6 py-2 rounded-full bg-red-600 text-white font-semibold shadow hover:bg-red-700 transition disabled:opacity-50"
          >
            Matikan
          </button>
        </div>

        <div className="flex flex-col gap-2 w-full">
          <label className="font-semibold text-gray-700">Brightness</label>
          <input
            type="range"
            min={0}
            max={1000}
            value={brightness}
            onChange={(e) =>
              sendControl({ brightness: parseInt(e.target.value) })
            }
            className="w-full"
            disabled={loading}
          />
        </div>

        {mounted && (
          <div className="flex flex-col gap-2 w-full">
            <label className="font-semibold text-gray-700">Color</label>
            <input
              type="color"
              value={color}
              onChange={(e) => sendControl({ color: e.target.value })}
              className="w-full h-10 rounded-lg border-0 cursor-pointer"
              disabled={loading}
            />
          </div>
        )}

        <button
          onClick={fetchStatus}
          className="mt-4 text-sm text-blue-600 underline hover:text-blue-800 transition disabled:opacity-50"
          disabled={loading}
        >
          Refresh Status 🔄
        </button>
      </div>
    </main>
  );
}

// HSV -> HEX
function hsvToHex(h: number, s: number, v: number) {
  h = h / 360;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  let r = 0,
    g = 0,
    b = 0;

  switch (i % 6) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v;
      b = p;
      break;
    case 2:
      r = p;
      g = v;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v;
      break;
    case 4:
      r = t;
      g = p;
      b = v;
      break;
    case 5:
      r = v;
      g = p;
      b = q;
      break;
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
