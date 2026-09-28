import { LogoMark } from "@/components/ui/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-12">
      <div className="w-full max-w-[22rem]">
        <div className="mb-8 flex items-center gap-2.5 text-zinc-900">
          <LogoMark className="size-7" />
          <span className="text-[15px] font-semibold tracking-tight">
            Rocket <span className="font-normal text-zinc-500">CMS</span>
          </span>
        </div>
        {children}
      </div>
    </main>
  );
}
