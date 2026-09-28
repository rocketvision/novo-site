import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Não gerar AGENTS.md/CLAUDE.md automaticamente durante o `next dev`.
  agentRules: false,
};

export default nextConfig;
