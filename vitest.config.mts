import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // "server-only" só existe para o bundler do Next; nos testes (Node) é um módulo vazio.
      "server-only": fileURLToPath(new URL("./tests/support/empty.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // Testes de integração compartilham o banco de teste: rodam em sequência.
    fileParallelism: false,
    setupFiles: ["./tests/support/setup.ts"],
    testTimeout: 20_000,
  },
});
