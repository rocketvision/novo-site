import { authedRoute } from "@/server/http/handler";
import { exportDiagnosticsCsv } from "@/server/diagnostics/service";

/** GET /api/cms/diagnostics/export: todos os diagnósticos numa planilha CSV. */
export const GET = authedRoute({ permission: "diagnostics.view" }, async () => {
  const csv = await exportDiagnosticsCsv();
  const day = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="diagnosticos-${day}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
