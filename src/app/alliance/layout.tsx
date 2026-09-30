import type { Metadata } from "next";
import { ToastProvider } from "@/components/cms/ui/toast";
import { PROGRAM } from "@/lib/alliance/constants";

export const metadata: Metadata = {
  title: { template: `%s | ${PROGRAM.hubName}`, default: PROGRAM.hubName },
  robots: { index: false, follow: false },
};

/** Alliance Hub: o portal dos parceiros. Sessão própria (independente do CMS), nunca indexado. */
export default function HubRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-zinc-50 font-sans text-sm text-zinc-900 antialiased">
      <ToastProvider>{children}</ToastProvider>
    </div>
  );
}
