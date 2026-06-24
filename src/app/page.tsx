"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Power, RefreshCw, Wifi, WifiOff, Sun, Thermometer,
  Home, Loader2, SlidersHorizontal, X, Clock, Palette, Sparkles, Plus, Trash2
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────
interface StatusItem { code: string; value: string | number | boolean; }
interface TuyaDevice { id: string; name: string; status: StatusItem[]; online: boolean; }
interface HSV { h: number; s: number; v: number; }
type ModalTab = "white" | "colour" | "scene" | "schedule";

// ─── Constants ──────────────────────────────────────────────────────────────
const CODES = {
  switch:      "switch_led",
  brightness:  "bright_value_v2",
  temperature: "temp_value_v2",
  workMode:    "work_mode",
  colour:      "colour_data_v2",
  scene:       "scene_data_v2",
  countdown:   "countdown_1",
} as const;

const TIMER_OPTIONS = [
  { label: "15 min", value: 900 },
  { label: "30 min", value: 1800 },
  { label: "1 hour", value: 3600 },
  { label: "2 hours", value: 7200 },
];

const SCENE_PRESETS = [
  {
    name: "Warm Glow", emoji: "🌅", color: "#ff8c42",
    data: { scene_num: 1, scene_units: [{ bright: 700, h: 28, s: 600, temperature: 0, unit_change_mode: "static", unit_gradient_duration: 10, unit_switch_duration: 10, v: 700 }] },
  },
  {
    name: "Cool Focus", emoji: "🧊", color: "#7dd3fc",
    data: { scene_num: 1, scene_units: [{ bright: 1000, h: 210, s: 100, temperature: 0, unit_change_mode: "static", unit_gradient_duration: 10, unit_switch_duration: 10, v: 1000 }] },
  },
  {
    name: "Ocean", emoji: "🌊", color: "#2563eb",
    data: { scene_num: 2, scene_units: [
      { bright: 500, h: 200, s: 1000, temperature: 0, unit_change_mode: "gradient", unit_gradient_duration: 50, unit_switch_duration: 50, v: 800 },
      { bright: 500, h: 225, s: 1000, temperature: 0, unit_change_mode: "gradient", unit_gradient_duration: 50, unit_switch_duration: 50, v: 600 },
    ]},
  },
  {
    name: "Campfire", emoji: "🔥", color: "#ef4444",
    data: { scene_num: 3, scene_units: [
      { bright: 600, h: 10,  s: 900, temperature: 0, unit_change_mode: "gradient", unit_gradient_duration: 20, unit_switch_duration: 20, v: 800 },
      { bright: 400, h: 25,  s: 1000,temperature: 0, unit_change_mode: "gradient", unit_gradient_duration: 15, unit_switch_duration: 15, v: 600 },
      { bright: 700, h: 5,   s: 800, temperature: 0, unit_change_mode: "gradient", unit_gradient_duration: 25, unit_switch_duration: 25, v: 900 },
    ]},
  },
  {
    name: "Rainbow", emoji: "🌈", color: "rainbow",
    data: { scene_num: 6, scene_units: [
      { bright: 0, h: 0,   s: 1000, temperature: 0, unit_change_mode: "jump", unit_gradient_duration: 100, unit_switch_duration: 100, v: 1000 },
      { bright: 0, h: 60,  s: 1000, temperature: 0, unit_change_mode: "jump", unit_gradient_duration: 100, unit_switch_duration: 100, v: 1000 },
      { bright: 0, h: 120, s: 1000, temperature: 0, unit_change_mode: "jump", unit_gradient_duration: 100, unit_switch_duration: 100, v: 1000 },
      { bright: 0, h: 180, s: 1000, temperature: 0, unit_change_mode: "jump", unit_gradient_duration: 100, unit_switch_duration: 100, v: 1000 },
      { bright: 0, h: 240, s: 1000, temperature: 0, unit_change_mode: "jump", unit_gradient_duration: 100, unit_switch_duration: 100, v: 1000 },
      { bright: 0, h: 300, s: 1000, temperature: 0, unit_change_mode: "jump", unit_gradient_duration: 100, unit_switch_duration: 100, v: 1000 },
    ]},
  },
  {
    name: "Neon Night", emoji: "🌃", color: "#a855f7",
    data: { scene_num: 3, scene_units: [
      { bright: 0, h: 280, s: 1000, temperature: 0, unit_change_mode: "gradient", unit_gradient_duration: 80, unit_switch_duration: 80, v: 800 },
      { bright: 0, h: 200, s: 1000, temperature: 0, unit_change_mode: "gradient", unit_gradient_duration: 80, unit_switch_duration: 80, v: 800 },
      { bright: 0, h: 320, s: 1000, temperature: 0, unit_change_mode: "gradient", unit_gradient_duration: 80, unit_switch_duration: 80, v: 800 },
    ]},
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getStatus(device: TuyaDevice, code: string) {
  return (device.status || []).find((s) => s.code === code);
}
function pct(val: number, max = 1000) {
  return Math.round((val / max) * 100);
}
function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if      (h < 60)  { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else              { r = c; g = 0; b = x; }
  const hex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}
function parseColour(val: string | number | boolean | undefined): HSV {
  if (typeof val === "string") {
    try { return JSON.parse(val) as HSV; } catch { /* ignore */ }
  }
  return { h: 0, s: 1000, v: 1000 };
}
function modeToTab(mode: string): ModalTab {
  if (mode === "colour") return "colour";
  if (mode === "scene")  return "scene";
  return "white";
}
function haptic() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(40);
  }
}

// ─── ControlPanel ─────────────────────────────────────────────────────────────
function ControlPanel({
  device,
  onClose,
  onControl,
}: {
  device: TuyaDevice;
  onClose: () => void;
  onControl: (payload: Record<string, unknown>) => void;
}) {
  const switchItem    = getStatus(device, CODES.switch);
  const brightItem    = getStatus(device, CODES.brightness);
  const tempItem      = getStatus(device, CODES.temperature);
  const modeItem      = getStatus(device, CODES.workMode);
  const colourItem    = getStatus(device, CODES.colour);
  const countdownItem = getStatus(device, CODES.countdown);

  const isOn         = switchItem    ? Boolean(switchItem.value)      : false;
  const brightness   = brightItem    ? Number(brightItem.value)       : 500;
  const temperature  = tempItem      ? Number(tempItem.value)         : 500;
  const currentMode  = (modeItem?.value as string)                   || "white";
  const countdownVal = countdownItem ? Number(countdownItem.value)    : 0;
  const initColour   = parseColour(colourItem?.value);

  const [activeTab, setActiveTab] = useState<ModalTab>(modeToTab(currentMode));
  const [colH, setColH] = useState(initColour.h);
  const [colS, setColS] = useState(initColour.s);
  const [colV, setColV] = useState(initColour.v);
  const [sceneLoading, setSceneLoading] = useState<number | null>(null); // idx of loading scene
  const [sceneFeedback, setSceneFeedback] = useState<{ idx: number; ok: boolean; error?: string } | null>(null);

  // Schedules state
  const [schedules, setSchedules] = useState<any[]>([]);
  const [schedLoading, setSchedLoading] = useState(false);
  const [schedActionLoading, setSchedActionLoading] = useState<string | null>(null);
  const [showAddSched, setShowAddSched] = useState(false);
  const [newSchedTime, setNewSchedTime] = useState("08:00");
  const [newSchedAction, setNewSchedAction] = useState<boolean>(true); // true = on, false = off

  useEffect(() => {
    if (activeTab === "schedule") fetchSchedules();
  }, [activeTab]);

  async function fetchSchedules() {
    setSchedLoading(true);
    try {
      const res = await fetch(`/api/schedule?deviceId=${device.id}`);
      const data = await res.json();
      if (data.success) setSchedules(data.schedules);
    } catch (e) { console.error(e); }
    setSchedLoading(false);
  }

  async function handleToggleSchedule(timer_id: string, enable: boolean) {
    haptic();
    setSchedActionLoading(timer_id);
    try {
      await fetch(`/api/schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: device.id, timer_id, enable }),
      });
      await fetchSchedules();
    } catch (e) { console.error(e); }
    setSchedActionLoading(null);
  }

  async function handleDeleteSchedule(timer_id: string) {
    haptic();
    setSchedActionLoading(timer_id);
    try {
      await fetch(`/api/schedule?deviceId=${device.id}&timer_ids=${timer_id}`, { method: "DELETE" });
      await fetchSchedules();
    } catch (e) { console.error(e); }
    setSchedActionLoading(null);
  }

  async function handleAddSchedule() {
    haptic();
    setSchedActionLoading("add");
    try {
      await fetch(`/api/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: device.id,
          alias_name: newSchedAction ? "Turn On" : "Turn Off",
          time: newSchedTime,
          loops: "1111111", // Everyday
          functions: [{ code: CODES.switch, value: newSchedAction }],
        }),
      });
      setShowAddSched(false);
      await fetchSchedules();
    } catch (e) { console.error(e); }
    setSchedActionLoading(null);
  }

  const colourHex = hsvToHex(colH, colS / 1000, colV / 1000);

  function switchTab(tab: ModalTab) {
    haptic();
    setActiveTab(tab);
    if (tab === "white")  onControl({ workMode: "white" });
    if (tab === "colour") onControl({ workMode: "colour", colourHsv: { h: colH, s: colS, v: colV } });
  }

  async function handleSceneClick(scene: typeof SCENE_PRESETS[0], idx: number) {
    haptic();
    setSceneLoading(idx);
    setSceneFeedback(null);
    try {
      const res = await fetch("/api/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: device.id, scene: scene.data }), // Send object directly
      });
      const data = await res.json();
      setSceneFeedback({ idx, ok: data.success, error: data.error });
      if (!data.success) console.warn("[scene] Tuya error:", data.error);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setSceneFeedback({ idx, ok: false, error: msg });
    } finally {
      setSceneLoading(null);
      setTimeout(() => setSceneFeedback(null), 4000);
    }
  }

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  const TABS: { id: ModalTab; label: string; icon: React.ReactNode }[] = [
    { id: "white",    label: "White",    icon: <Sun      size={11} /> },
    { id: "colour",   label: "Colour",   icon: <Palette  size={11} /> },
    { id: "scene",    label: "Scene",    icon: <Sparkles size={11} /> },
    { id: "schedule", label: "Schedule", icon: <Clock    size={11} /> },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}
    >
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        style={{ background: "var(--card)", border: "1px solid var(--card-border)", boxShadow: "0 32px 80px rgba(0,0,0,0.5)" }}
        className="w-full max-w-sm rounded-3xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>{device.name}</h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                {isOn ? `On · ${currentMode}` : "Off — turn on to use controls"}
              </p>
            </div>
            <button onClick={onClose}
              style={{ background: "var(--border)", color: "var(--muted-foreground)" }}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70 transition-opacity"
            >
              <X size={14} />
            </button>
          </div>

          {/* Tab pills */}
          <div style={{ background: "var(--muted)", border: "1px solid var(--border)" }} className="flex rounded-xl p-1 gap-1 relative">
            {TABS.map((tab) => (
              <button key={tab.id} onClick={() => switchTab(tab.id)}
                style={{
                  color: activeTab === tab.id ? "var(--foreground)" : "var(--muted-foreground)",
                  transition: "color 0.2s ease",
                }}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium relative z-10"
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTabBg"
                    className="absolute inset-0 rounded-lg"
                    style={{ background: "var(--card)", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1">{tab.icon}{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6" style={{ opacity: isOn ? 1 : 0.3, pointerEvents: isOn ? "auto" : "none", transition: "opacity 0.3s" }}>

          {/* ── WHITE ── */}
          {activeTab === "white" && (
            <div className="space-y-5">
              {brightItem && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sun size={13} style={{ color: "#fbbf24" }} />
                      <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Brightness</span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--foreground)" }}>{pct(brightness)}%</span>
                  </div>
                  <div className="[&_[data-slot=slider-range]]:bg-amber-400">
                    <Slider value={[brightness]} min={10} max={1000} step={1}
                      onValueChange={([v]) => onControl({ brightness: v })}
                      onValueCommit={([v]) => onControl({ brightness: v })} />
                  </div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} style={{ flex: 1, height: "3px", borderRadius: "2px",
                        background: i < Math.round(pct(brightness) / 10) ? "#fbbf24" : "var(--border)",
                        transition: "background 0.1s" }} />
                    ))}
                  </div>
                </div>
              )}

              {tempItem && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Thermometer size={13} style={{ color: "#38bdf8" }} />
                      <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Color Temperature</span>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                      {temperature < 334 ? "🟠 Warm" : temperature < 667 ? "⬜ Neutral" : "🔵 Cool"}
                    </span>
                  </div>
                  <div className="[&_[data-slot=slider-range]]:bg-sky-400">
                    <Slider value={[temperature]} min={0} max={1000} step={1}
                      onValueChange={([v]) => onControl({ temperature: v })}
                      onValueCommit={([v]) => onControl({ temperature: v })} />
                  </div>
                  <div style={{ height: "3px", borderRadius: "2px", background: "linear-gradient(to right, #fb923c, #fef3c7, #bae6fd)", opacity: 0.5 }} />
                </div>
              )}
            </div>
          )}

          {/* ── COLOUR ── */}
          {activeTab === "colour" && (
            <div className="space-y-5">
              {/* Preview swatch */}
              <div className="flex items-center gap-4">
                <div style={{
                  width: 60, height: 60, borderRadius: 16, flexShrink: 0,
                  background: colourHex,
                  boxShadow: `0 0 28px ${colourHex}80`,
                  border: "3px solid rgba(255,255,255,0.1)",
                  transition: "all 0.2s ease",
                }} />
                <div>
                  <p className="text-sm font-semibold font-mono" style={{ color: "var(--foreground)" }}>{colourHex.toUpperCase()}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                    H {colH}° · S {pct(colS)}% · V {pct(colV)}%
                  </p>
                </div>
              </div>

              {/* Hue */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>Hue</span>
                  <span className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>{colH}°</span>
                </div>
                <div style={{ height: 4, borderRadius: 999, marginBottom: 6,
                  background: "linear-gradient(to right,hsl(0,100%,50%),hsl(60,100%,50%),hsl(120,100%,50%),hsl(180,100%,50%),hsl(240,100%,50%),hsl(300,100%,50%),hsl(360,100%,50%))" }} />
                <Slider value={[colH]} min={0} max={359} step={1}
                  className="[&_[data-slot=slider-track]]:!bg-transparent [&_[data-slot=slider-range]]:!bg-transparent [&_[data-slot=slider-thumb]]:!border-white/50"
                  onValueChange={([v]) => { setColH(v); onControl({ workMode: "colour", colourHsv: { h: v, s: colS, v: colV } }); }}
                  onValueCommit={([v]) => { setColH(v); onControl({ workMode: "colour", colourHsv: { h: v, s: colS, v: colV } }); }} />
              </div>

              {/* Saturation */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>Saturation</span>
                  <span className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>{pct(colS)}%</span>
                </div>
                <div style={{ height: 4, borderRadius: 999, marginBottom: 6, background: `linear-gradient(to right, white, ${hsvToHex(colH, 1, 1)})` }} />
                <Slider value={[colS]} min={0} max={1000} step={1}
                  className="[&_[data-slot=slider-track]]:!bg-transparent [&_[data-slot=slider-range]]:!bg-transparent"
                  onValueChange={([v]) => { setColS(v); onControl({ workMode: "colour", colourHsv: { h: colH, s: v, v: colV } }); }}
                  onValueCommit={([v]) => { setColS(v); onControl({ workMode: "colour", colourHsv: { h: colH, s: v, v: colV } }); }} />
              </div>

              {/* Value/Brightness */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>Brightness</span>
                  <span className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>{pct(colV)}%</span>
                </div>
                <div style={{ height: 4, borderRadius: 999, marginBottom: 6, background: `linear-gradient(to right, black, ${hsvToHex(colH, colS / 1000, 1)})` }} />
                <Slider value={[colV]} min={0} max={1000} step={1}
                  className="[&_[data-slot=slider-track]]:!bg-transparent [&_[data-slot=slider-range]]:!bg-transparent"
                  onValueChange={([v]) => { setColV(v); onControl({ workMode: "colour", colourHsv: { h: colH, s: colS, v } }); }}
                  onValueCommit={([v]) => { setColV(v); onControl({ workMode: "colour", colourHsv: { h: colH, s: colS, v } }); }} />
              </div>
            </div>
          )}

          {/* ── SCENE ── */}
          {activeTab === "scene" && (
            <div className="space-y-3">
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                Tap a scene to apply. The lamp will switch to scene mode automatically.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {SCENE_PRESETS.map((scene, idx) => {
                  const isLoading = sceneLoading === idx;
                  const feedback = sceneFeedback?.idx === idx ? sceneFeedback : null;
                  return (
                    <button key={idx}
                      onClick={() => handleSceneClick(scene, idx)}
                      disabled={sceneLoading !== null}
                      style={{
                        background: scene.color === "rainbow"
                          ? "linear-gradient(135deg, #ff0000, #ff8c00, #ffd700, #00c000, #0000ff, #8b00ff)"
                          : `${scene.color}1a`,
                        border: `2px solid ${
                          feedback?.ok === true  ? "#10b981" :
                          feedback?.ok === false ? "#ef4444" :
                          scene.color === "rainbow" ? "transparent" : scene.color + "40"
                        }`,
                        opacity: sceneLoading !== null && !isLoading ? 0.5 : 1,
                        transition: "all 0.2s",
                      }}
                      className="flex flex-col items-start gap-1 p-3 rounded-xl text-left active:scale-95"
                    >
                      <span className="text-xl leading-none">
                        {isLoading ? "⏳" : feedback?.ok === true ? "✅" : feedback?.ok === false ? "❌" : scene.emoji}
                      </span>
                      <span className="text-xs font-semibold mt-1"
                        style={{ color: scene.color === "rainbow" ? "white" : "var(--foreground)" }}>
                        {isLoading ? "Applying…" : scene.name}
                      </span>
                    </button>
                  );
                })}
              </div>
              {/* Show Tuya error message if scene fails */}
              {sceneFeedback && !sceneFeedback.ok && sceneFeedback.error && (
                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 12px" }}>
                  <p className="text-xs font-medium" style={{ color: "#ef4444" }}>Scene failed</p>
                  <p className="text-xs mt-0.5 font-mono break-all" style={{ color: "var(--muted-foreground)" }}>{sceneFeedback.error}</p>
                </div>
              )}
            </div>
          )}

          {/* ── SCHEDULE ── */}
          {activeTab === "schedule" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>Cloud Schedules</p>
                <button onClick={() => setShowAddSched(!showAddSched)}
                  className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md active:scale-95 transition-all"
                  style={{ background: showAddSched ? "var(--border)" : "var(--foreground)", color: showAddSched ? "var(--foreground)" : "var(--background)" }}>
                  {showAddSched ? <X size={12} /> : <Plus size={12} />}
                  {showAddSched ? "Cancel" : "Add"}
                </button>
              </div>

              <AnimatePresence>
                {showAddSched && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div style={{ background: "var(--muted)", border: "1px solid var(--border)" }} className="p-4 rounded-2xl space-y-4 mb-4">
                      <div>
                        <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--muted-foreground)" }}>Time</label>
                        <input type="time" value={newSchedTime} onChange={e => setNewSchedTime(e.target.value)}
                          style={{ background: "var(--card)", border: "1px solid var(--card-border)", color: "var(--foreground)" }}
                          className="w-full p-2.5 rounded-xl text-sm font-semibold focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--muted-foreground)" }}>Action (Everyday)</label>
                        <div className="flex gap-2">
                          <button onClick={() => setNewSchedAction(true)}
                            style={{ background: newSchedAction ? "rgba(251,191,36,0.15)" : "var(--card)", border: `1px solid ${newSchedAction ? "rgba(251,191,36,0.3)" : "var(--card-border)"}`, color: newSchedAction ? "#fbbf24" : "var(--muted-foreground)" }}
                            className="flex-1 py-2 rounded-xl text-sm font-medium transition-all">Turn On</button>
                          <button onClick={() => setNewSchedAction(false)}
                            style={{ background: !newSchedAction ? "var(--card-on-border)" : "var(--card)", border: `1px solid ${!newSchedAction ? "var(--muted-foreground)" : "var(--card-border)"}`, color: !newSchedAction ? "var(--foreground)" : "var(--muted-foreground)" }}
                            className="flex-1 py-2 rounded-xl text-sm font-medium transition-all">Turn Off</button>
                        </div>
                      </div>
                      <button onClick={handleAddSchedule} disabled={schedActionLoading === "add"}
                        style={{ background: "var(--foreground)", color: "var(--background)" }}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 active:scale-95 transition-all">
                        {schedActionLoading === "add" ? "Saving..." : "Save Schedule"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {schedLoading ? (
                <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
              ) : schedules.length === 0 ? (
                <div className="text-center py-8">
                  <Clock size={24} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>No schedules</p>
                  <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>Add one to automate this device</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {schedules.map((s: any) => {
                    const isEnabled = s.enable;
                    const actionFn = (s.functions || []).find((f: any) => f.code === CODES.switch);
                    const isTurnOn = actionFn ? actionFn.value : false;

                    return (
                      <div key={s.timer_id} style={{ background: "var(--card)", border: "1px solid var(--border)", opacity: isEnabled ? 1 : 0.6 }} className="flex items-center justify-between p-4 rounded-2xl transition-opacity">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xl font-semibold tabular-nums" style={{ color: "var(--foreground)" }}>{s.time}</h4>
                            <span style={{ background: isTurnOn ? "rgba(251,191,36,0.15)" : "var(--muted)", color: isTurnOn ? "#fbbf24" : "var(--muted-foreground)" }} className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase">
                              {isTurnOn ? "ON" : "OFF"}
                            </span>
                          </div>
                          <p className="text-xs font-medium mt-0.5" style={{ color: "var(--muted-foreground)" }}>{s.alias_name} • Everyday</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => handleDeleteSchedule(s.timer_id)} disabled={schedActionLoading === s.timer_id} className="p-2 text-red-500 hover:bg-red-500/10 rounded-full active:scale-90 transition-all disabled:opacity-50">
                            {schedActionLoading === s.timer_id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                          </button>
                          <button onClick={() => handleToggleSchedule(s.timer_id, !isEnabled)} disabled={schedActionLoading === s.timer_id}
                            style={{ background: isEnabled ? "#10b981" : "var(--muted)", border: `1px solid ${isEnabled ? "#10b981" : "var(--border)"}` }}
                            className="w-11 h-6 rounded-full flex items-center px-1 transition-colors disabled:opacity-50">
                            <div style={{ transform: isEnabled ? "translateX(20px)" : "translateX(0)", background: isEnabled ? "white" : "var(--muted-foreground)" }} className="w-4 h-4 rounded-full transition-transform" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── DeviceCard ────────────────────────────────────────────────────────────
function DeviceCard({ device, onToggle, onOpenControls }: {
  device: TuyaDevice;
  onToggle: () => void;
  onOpenControls: () => void;
}) {
  const switchItem = getStatus(device, CODES.switch);
  const brightItem = getStatus(device, CODES.brightness);
  const colourItem = getStatus(device, CODES.colour);
  const modeItem   = getStatus(device, CODES.workMode);

  const isOn      = switchItem ? Boolean(switchItem.value) : false;
  const brightness = brightItem ? Number(brightItem.value) : 500;
  const workMode  = (modeItem?.value as string) || "white";

  const colourHex = (workMode === "colour" && colourItem?.value)
    ? (() => { const c = parseColour(colourItem.value); return hsvToHex(c.h, c.s / 1000, c.v / 1000); })()
    : null;

  const accent = isOn ? (colourHex || "#fbbf24") : null;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      style={{
        background: isOn
          ? (colourHex ? `linear-gradient(145deg, ${colourHex}18, ${colourHex}08)` : "var(--card-on-bg)")
          : "var(--card)",
        border: `1px solid ${isOn ? (colourHex ? colourHex + "35" : "var(--card-on-border)") : "var(--card-border)"}`,
        boxShadow: isOn ? `0 0 0 1px ${accent}20, 0 8px 24px rgba(0,0,0,0.1)` : "0 1px 3px rgba(0,0,0,0.06)",
        transition: "all 0.4s ease",
      }} 
      className="rounded-2xl p-5 flex flex-col gap-4"
    >

      {/* Top row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div style={{
            background: isOn ? (colourHex ? colourHex + "22" : "rgba(251,191,36,0.12)") : "var(--border)",
            color: isOn ? (colourHex || "#fbbf24") : "var(--muted-foreground)",
            boxShadow: isOn ? `0 0 18px ${accent}28` : "none",
            transition: "all 0.4s ease",
          }} className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill={isOn ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
              <path d="M9 21h6m-6 0v-3m6 3v-3M9 18h6M12 3a6 6 0 0 1 6 6c0 2.22-1.2 4.16-3 5.19V18H9v-3.81A6 6 0 0 1 6 9a6 6 0 0 1 6-6z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{device.name}</p>
            <div className="flex items-center gap-1 mt-0.5">
              {device.online
                ? <Wifi size={10} className="text-emerald-500" />
                : <WifiOff size={10} style={{ color: "var(--muted-foreground)" }} />}
              <span className="text-xs" style={{ color: device.online ? "#10b981" : "var(--muted-foreground)" }}>
                {device.online ? "Online" : "Offline"}
              </span>
            </div>
          </div>
        </div>

        <motion.button 
          onClick={() => { haptic(); onToggle(); }} 
          disabled={!device.online}
          whileTap={{ scale: 0.85 }}
          whileHover={{ scale: 1.05 }}
          style={{
            background: isOn ? (colourHex || "#fbbf24") : "var(--muted)",
            color: isOn ? "#09090b" : "var(--muted-foreground)",
            boxShadow: isOn ? `0 0 20px ${accent}45` : "none",
            transition: "background 0.3s ease, color 0.3s ease, box-shadow 0.3s ease",
          }}
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 disabled:opacity-30 disabled:cursor-not-allowed">
          <Power size={16} strokeWidth={2.5} />
        </motion.button>
      </div>

      {/* State badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center w-4 h-4">
            {isOn && <span className="absolute inline-flex h-3 w-3 rounded-full animate-ping"
              style={{ background: (accent || "#fbbf24") + "50" }} />}
            <span className="relative inline-flex rounded-full h-2 w-2"
              style={{ background: isOn ? (accent || "#fbbf24") : "var(--muted-foreground)", opacity: isOn ? 1 : 0.4 }} />
          </div>
          <span className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: isOn ? (accent || "#fbbf24") : "var(--muted-foreground)", opacity: isOn ? 1 : 0.5 }}>
            {isOn ? workMode : "Off"}
          </span>
        </div>
        {isOn && workMode !== "colour" && brightItem && (
          <span className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>{pct(brightness)}%</span>
        )}
        {isOn && workMode === "colour" && colourHex && (
          <span className="text-xs font-mono font-medium" style={{ color: "var(--muted-foreground)" }}>{colourHex.toUpperCase()}</span>
        )}
      </div>

      {/* Visual bar */}
      {isOn && workMode === "colour" && colourHex ? (
        <div style={{ height: 3, borderRadius: 999, background: `linear-gradient(to right, ${colourHex}60, ${colourHex})` }} />
      ) : (
        <div className="flex gap-0.5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: isOn && i < Math.round(pct(brightness) / 10) ? (accent || "#fbbf24") : "var(--border)",
              transition: "background 0.15s",
            }} />
          ))}
        </div>
      )}

      {/* Full Controls button */}
      <motion.button 
        onClick={() => { haptic(); onOpenControls(); }} 
        disabled={!device.online}
        whileHover={{ opacity: 0.8 }}
        whileTap={{ scale: 0.97 }}
        style={{ background: "var(--border)", color: "var(--muted-foreground)", border: "1px solid var(--card-border)" }}
        className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
        <SlidersHorizontal size={12} />
        Full Controls
      </motion.button>
    </motion.div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [devices, setDevices]       = useState<TuyaDevice[]>([]);
  const [loading, setLoading]       = useState(true);
  const [sseStatus, setSseStatus]   = useState<"connecting" | "live" | "error">("connecting");
  const [selected, setSelected]     = useState<TuyaDevice | null>(null);
  const debounceRefs = useRef<Record<string, NodeJS.Timeout>>({});
  const pendingLocks = useRef<Record<string, number>>({});

  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Good Night" : hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";

  // ── SSE: real-time updates from server → all clients stay in sync ──────────
  useEffect(() => {
    let es: EventSource;
    let retryTimeout: NodeJS.Timeout;

    function connect() {
      es = new EventSource("/api/stream");

      es.onopen = () => setSseStatus("live");

      es.onmessage = (event) => {
        try {
          const { devices: fresh } = JSON.parse(event.data) as { devices: TuyaDevice[] };
          const now = Date.now();
          
          setDevices(prev => {
            return fresh.map(f => {
              // Ignore SSE updates for devices that have pending optimistic updates (<4s old)
              if (pendingLocks.current[f.id] && now - pendingLocks.current[f.id] < 4000) {
                return prev.find(p => p.id === f.id) || f;
              }
              return f;
            });
          });
          
          setLoading(false);
          setSseStatus("live");
          
          // Keep modal in sync, also respecting the lock
          setSelected((prevSel) => {
            if (!prevSel) return null;
            if (pendingLocks.current[prevSel.id] && now - pendingLocks.current[prevSel.id] < 4000) {
              return prevSel;
            }
            return fresh.find((d) => d.id === prevSel.id) ?? null;
          });
        } catch { /* ignore parse errors */ }
      };

      es.onerror = () => {
        setSseStatus("error");
        es.close();
        // Auto-reconnect after 5 seconds
        retryTimeout = setTimeout(connect, 5000);
      };
    }

    connect();
    return () => { es?.close(); clearTimeout(retryTimeout); };
  }, []);

  // Manual refresh (force an immediate fetch)
  async function manualRefresh() {
    try {
      const res = await fetch("/api/devices");
      const data = await res.json();
      if (data.success && data.devices) {
        setDevices(data.devices);
        setSelected((prev) => prev ? (data.devices.find((d: TuyaDevice) => d.id === prev.id) ?? null) : null);
      }
    } catch (e) { console.error(e); }
  }

  function patchDevice(deviceId: string, code: string, value: string | number | boolean) {
    // Mark device as "in-flight" so SSE doesn't overwrite our optimistic state
    pendingLocks.current[deviceId] = Date.now();
    
    const fn = (prev: TuyaDevice[]) =>
      prev.map((d) => d.id !== deviceId ? d : {
        ...d,
        status: (d.status || []).map((s) => s.code === code ? { ...s, value } : s),
      });
    setDevices(fn);
    setSelected((prev) => prev?.id === deviceId ? {
      ...prev,
      status: (prev.status || []).map((s) => s.code === code ? { ...s, value } : s),
    } : prev);
  }

  function sendControl(deviceId: string, payload: Record<string, unknown>) {
    const key = deviceId + JSON.stringify(Object.keys(payload).sort());
    if (debounceRefs.current[key]) clearTimeout(debounceRefs.current[key]);
    debounceRefs.current[key] = setTimeout(async () => {
      try {
        await fetch("/api/control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId, ...payload }),
        });
      } catch (e) { console.error(e); }
    }, 300);
  }

  function handleControl(deviceId: string, payload: Record<string, unknown>) {
    // Optimistic patches
    if (payload.brightness  !== undefined) patchDevice(deviceId, CODES.brightness,  payload.brightness  as number);
    if (payload.temperature !== undefined) patchDevice(deviceId, CODES.temperature, payload.temperature as number);
    if (payload.workMode    !== undefined) patchDevice(deviceId, CODES.workMode,    payload.workMode    as string);
    if (payload.countdown   !== undefined) patchDevice(deviceId, CODES.countdown,   payload.countdown   as number);
    if (payload.colourHsv   !== undefined) {
      patchDevice(deviceId, CODES.colour, JSON.stringify(payload.colourHsv));
    }
    sendControl(deviceId, payload);
  }

  async function allOn() {
    haptic();
    for (const d of devices) {
      patchDevice(d.id, CODES.switch, true);
      await fetch("/api/control", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deviceId: d.id, state: true }) });
    }
  }
  async function allOff() {
    haptic();
    for (const d of devices) {
      patchDevice(d.id, CODES.switch, false);
      await fetch("/api/control", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deviceId: d.id, state: false }) });
    }
  }

  const onDevices = devices.filter((d) =>
    (d.status || []).some((s) => s.code === CODES.switch && s.value === true)
  );

  // ── Ambient Background Glow ──
  const activeColors = devices
    .filter(d => getStatus(d, CODES.switch)?.value)
    .map(d => {
      const mode = getStatus(d, CODES.workMode)?.value;
      if (mode === "colour") {
        const cVal = getStatus(d, CODES.colour)?.value;
        if (cVal) {
          const c = parseColour(cVal);
          return hsvToHex(c.h, c.s / 1000, c.v / 1000);
        }
      }
      return "#fbbf24";
    }).slice(0, 2);

  return (
    <div className="relative z-10 min-h-screen flex flex-col overflow-hidden">
      {/* Ambient Glow Effects */}
      <div className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-1000 opacity-15 md:opacity-[0.08]">
        {activeColors.map((color, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute rounded-full blur-[90px] md:blur-[140px]"
            style={{
              background: color,
              width: "70vw", height: "70vw",
              top: i === 0 ? "-20%" : "auto",
              bottom: i === 1 ? "-20%" : "auto",
              left: i === 0 ? "-10%" : "auto",
              right: i === 1 ? "-10%" : "auto",
              transition: "background 2s ease",
            }}
          />
        ))}
      </div>

      {/* ── Header ── */}
      <header style={{ borderBottom: "1px solid var(--header-border)" }} className="relative z-10 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <Home size={16} className="text-amber-400" />
          <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Smart Home</span>
        </div>
        <div className="flex items-center gap-2">
          {/* SSE live indicator */}
          <div
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 500,
              background: sseStatus === "live" ? "rgba(16,185,129,0.1)" : sseStatus === "error" ? "rgba(239,68,68,0.1)" : "rgba(251,191,36,0.1)",
              color: sseStatus === "live" ? "#10b981" : sseStatus === "error" ? "#ef4444" : "#fbbf24",
              border: `1px solid ${
                sseStatus === "live" ? "rgba(16,185,129,0.25)" :
                sseStatus === "error" ? "rgba(239,68,68,0.25)" :
                "rgba(251,191,36,0.25)"
              }`,
            }}
          >
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: sseStatus === "live" ? "#10b981" : sseStatus === "error" ? "#ef4444" : "#fbbf24",
              animation: sseStatus === "live" ? "pulse 2s infinite" : "none",
              display: "inline-block",
            }} />
            {sseStatus === "live" ? "Live" : sseStatus === "error" ? "Reconnecting…" : "Connecting…"}
          </div>
          <button onClick={manualRefresh}
            className="flex items-center gap-1.5 text-xs"
            style={{ color: "var(--muted-foreground)" }}>
            <RefreshCw size={12} />
            Refresh
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* ── Body ── */}
      <main className="relative z-10 flex-1 px-6 py-8 max-w-2xl mx-auto w-full">
        {/* Greeting */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold" style={{ color: "var(--foreground)" }}>{greeting}</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            {loading ? "Loading…" : `${onDevices.length} of ${devices.length} device${devices.length !== 1 ? "s" : ""} active`}
          </p>
        </div>

        {/* Summary + All On/Off */}
        {!loading && devices.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-8">
            <span style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.2)" }} className="text-xs px-3 py-1 rounded-full font-medium">{onDevices.length} On</span>
            <span style={{ background: "var(--border)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }} className="text-xs px-3 py-1 rounded-full font-medium">{devices.length - onDevices.length} Off</span>
            <span style={{ background: "rgba(16,185,129,0.07)", color: "#10b981", border: "1px solid rgba(16,185,129,0.15)" }} className="text-xs px-3 py-1 rounded-full font-medium">{devices.filter((d) => d.online).length} Online</span>
            <div className="flex-1" />
            <button onClick={allOn}
              style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.2)" }}
              className="text-xs px-3 py-1.5 rounded-full font-medium hover:opacity-80 active:scale-95 transition-all">
              All On
            </button>
            <button onClick={allOff}
              style={{ background: "var(--border)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
              className="text-xs px-3 py-1.5 rounded-full font-medium hover:opacity-80 active:scale-95 transition-all">
              All Off
            </button>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2].map(i => (
              <div key={i} className="rounded-2xl p-5 flex flex-col gap-4 animate-pulse" style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl" style={{ background: "var(--border)" }} />
                    <div className="space-y-2">
                      <div className="w-24 h-4 rounded" style={{ background: "var(--border)" }} />
                      <div className="w-12 h-3 rounded" style={{ background: "var(--border)", opacity: 0.5 }} />
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full" style={{ background: "var(--border)" }} />
                </div>
                <div className="w-16 h-5 rounded-full" style={{ background: "var(--border)" }} />
                <div className="w-full h-8 rounded-xl mt-2" style={{ background: "var(--border)", opacity: 0.7 }} />
              </div>
            ))}
          </div>
        )}

        {!loading && devices.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <div style={{ background: "var(--border)" }} className="w-16 h-16 rounded-2xl flex items-center justify-center mb-2">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5">
                <path d="M9 21h6m-6 0v-3m6 3v-3M9 18h6M12 3a6 6 0 0 1 6 6c0 2.22-1.2 4.16-3 5.19V18H9v-3.81A6 6 0 0 1 6 9a6 6 0 0 1 6-6z" />
              </svg>
            </div>
            <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>No devices found</p>
            <p className="text-xs max-w-xs" style={{ color: "var(--muted-foreground)" }}>Add Device IDs in <span style={{ color: "var(--foreground)" }}>src/lib/config.ts</span></p>
          </div>
        )}

        {!loading && devices.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {devices.map((device) => (
              <DeviceCard
                key={device.id}
                device={device}
                onToggle={() => {
                  const sw = (device.status || []).find((s) => s.code === CODES.switch);
                  const isOn = sw ? Boolean(sw.value) : false;
                  patchDevice(device.id, CODES.switch, !isOn);
                  sendControl(device.id, { state: !isOn });
                }}
                onOpenControls={() => setSelected(device)}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid var(--header-border)" }} className="px-6 py-4 text-center">
        <p className="text-xs" style={{ color: "var(--muted-foreground)", opacity: 0.35 }}>Smart Home · Powered by Tuya</p>
      </footer>

      {/* ── Modal ── */}
      <AnimatePresence>
        {selected && (
          <ControlPanel
            device={selected}
            onClose={() => setSelected(null)}
            onControl={(payload) => handleControl(selected.id, payload)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
