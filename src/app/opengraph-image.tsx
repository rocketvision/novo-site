import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = site.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "#0a0a0b",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, letterSpacing: -0.5 }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, background: "#ff5b1f" }} />
          Rocket Vision
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 72, fontWeight: 600, lineHeight: 1.05, letterSpacing: -2.5 }}>
          <span>A tecnologia certa</span>
          <span>muda o rumo do seu negócio.</span>
        </div>
        <div style={{ fontSize: 28, color: "rgba(255,255,255,0.55)" }}>
          Sites, lojas virtuais, sistemas e aplicativos para empresas.
        </div>
      </div>
    ),
    size,
  );
}
