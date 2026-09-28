import type { Metadata } from "next";
import { STUDIO_NAME } from "@/lib/cms/brand";
import { ToastProvider } from "@/components/cms/ui/toast";

export const metadata: Metadata = {
  title: { template: `%s | ${STUDIO_NAME}`, default: STUDIO_NAME },
  robots: { index: false, follow: false },
};

export default function CmsRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-zinc-50 font-sans text-sm text-zinc-900 antialiased">
      <ToastProvider>{children}</ToastProvider>
    </div>
  );
}
