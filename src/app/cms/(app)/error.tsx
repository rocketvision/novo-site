"use client";

import { Button } from "@/components/cms/ui/button";

export default function CmsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <h1 className="text-base font-semibold">Não foi possível carregar esta página</h1>
      <p className="mt-1 text-sm text-zinc-500">Tente novamente em instantes.</p>
      <Button variant="secondary" className="mt-5" onClick={reset}>
        Tentar de novo
      </Button>
    </div>
  );
}
