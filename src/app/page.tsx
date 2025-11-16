"use client";
import { Slider } from "@/components/ui/slider";
import { useState, useEffect, useRef } from "react";
// import { ToggleButton } from "@/components/ToggleButton";
import { Button } from "@/components/ui/button";
import { RotateCcw, Loader2 } from "lucide-react";
// Types for API status response
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
  const [brightness, setBrightness] = useState(0);
  const [temperature, setTemperature] = useState(0);
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
        setBrightness(Number(brightStatus?.value ?? 1000));

        const tempStatus = data.all_status.find(
          (s) => s.code === "temp_value_v2"
        );
        setTemperature(Number(tempStatus?.value ?? 1000));

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
    temperature?: number;
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
          if (control.temperature !== undefined)
            setTemperature(control.temperature);
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
    <main className="flex flex-col items-center justify-center h-dvh bg-gray-100 p-6 relative">
      <div className="bg-white p-8 rounded-3xl shadow-xl flex flex-col items-center gap-6 w-full max-w-md relative z-20">
        <h1 className="text-3xl text-gray-800 font-sans font-normal">
          Bedroom Light
        </h1>

        <button
          onClick={() => sendControl({ state: !isOn })}
          disabled={loading}
          className={`
    w-28 h-28 hover:cursor-pointer rounded-full flex items-center justify-center text-4xl font-bold
    transition-all duration-300 shadow-lg active:scale-95
    ${loading ? "opacity-50" : ""}
    ${
      isOn
        ? "bg-linear-to-b from-yellow-200 to-yellow-400 text-yellow-700"
        : "bg-linear-to-b from-gray-300 to-gray-500 text-gray-700"
    }
  `}
        >
          {isOn === null ? "..." : isOn ? "💡" : "⚫"}
        </button>

        {/* <ToggleButton
          isOn={Boolean(isOn)}
          loading={loading}
          onToggle={(val) => sendControl({ state: val })}
        /> */}

        {/* Brightness */}
        <div className="flex flex-col gap-2 w-full">
          <label className="font-semibold text-gray-700">Brightness</label>
          <Slider
            value={[brightness]}
            max={1000}
            min={10}
            step={1}
            onValueChange={(val) => setBrightness(val[0])}
            onValueCommit={(val) => sendControl({ brightness: val[0] })}
            className="w-full from-yellow-900 to-yellow-100"
            disabled={loading}
          />
        </div>

        {/* Temperature */}
        <div className="flex flex-col gap-2 w-full">
          <label className="font-semibold text-gray-700">Temperature</label>
          <Slider
            value={[temperature]}
            max={1000}
            step={1}
            onValueChange={(val) => setTemperature(val[0])}
            onValueCommit={(val) => sendControl({ temperature: val[0] })}
            className="w-full from-yellow-500 to-slate-100"
            disabled={loading}
          />
        </div>

        {/* {mounted && (
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
        )} */}

        <Button
          onClick={fetchStatus}
          disabled={loading}
          variant="outline"
          className="flex mt-4 items-center hover:cursor-pointer gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RotateCcw className="h-4 w-4" />
              Refresh
            </>
          )}
        </Button>
      </div>
    </main>
  );
}

// HSV → HEX conversion
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
