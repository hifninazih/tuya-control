"use client"; // Wajib ada

import { useState } from "react";

export default function Home() {
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  const handleControl = async (state: boolean) => {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/control", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ state: state }),
      });

      const data: { success: boolean; error?: string } = await res.json();

      if (data.success) {
        setMessage(
          state ? "Lampu berhasil Dinyalakan!" : "Lampu berhasil Dimatikan!"
        );
      } else {
        throw new Error(data.error || "Gagal mengirim perintah");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setMessage(`Error: ${errorMessage}`);
    }

    setLoading(false);
  };

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: "1.5rem",
        fontFamily: "sans-serif",
      }}
    >
      <h1>Kontrol Lampu Kamar Hifni/Isal</h1>

      <div style={{ display: "flex", gap: "1rem" }}>
        <button
          onClick={() => handleControl(true)} // Kirim 'true' untuk ON
          disabled={loading}
          style={{
            padding: "1rem",
            fontSize: "1rem",
            background: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "5px",
          }}
        >
          {loading ? "Memproses..." : "NYALAKAN (ON)"}
        </button>

        <button
          onClick={() => handleControl(false)} // Kirim 'false' untuk OFF
          disabled={loading}
          style={{
            padding: "1rem",
            fontSize: "1rem",
            background: "#f44336",
            color: "white",
            border: "none",
            borderRadius: "5px",
          }}
        >
          {loading ? "Memproses..." : "MATIKAN (OFF)"}
        </button>
      </div>

      {message && <p>{message}</p>}
    </main>
  );
}
