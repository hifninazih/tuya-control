import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IoT Control",
    short_name: "IoT Control",
    description: "For bulb control",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      {
        src: "/bulb.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        src: "/bulb.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
    ],
  };
}
