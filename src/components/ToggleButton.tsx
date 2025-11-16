"use client";

interface ToggleButtonProps {
  isOn: boolean;
  loading?: boolean;
  onToggle: (value: boolean) => void;
}

export function ToggleButton({ isOn, loading, onToggle }: ToggleButtonProps) {
  return (
    <button
      onClick={() => onToggle(!isOn)}
      disabled={loading}
      className={`
        relative hover:cursor-pointer flex items-center w-16 h-8 rounded-full transition 
        ${isOn ? "bg-yellow-300" : "bg-gray-400"}
        ${loading ? "opacity-50" : ""}
      `}
    >
      <div
        className={`
          w-7 h-7 bg-white rounded-full shadow transform transition 
          ${isOn ? "translate-x-8" : "translate-x-1"}
        `}
      ></div>
    </button>
  );
}
