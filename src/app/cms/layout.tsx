import type { Metadata } from "next";
import { ToastProvider } from "@/components/cms/ui/toast";

export const metadata: Metadata = {
  title: { template: "%s | CMS Rocket Vision", default: "CMS Rocket Vision" },
  robots: { index: false, follow: false },
};

export default function CmsRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-zinc-50 font-sans text-sm text-zinc-900 antialiased">
      <ToastProvider>{children}</ToastProvider>
    </div>
  );
}
