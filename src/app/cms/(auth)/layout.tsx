import { StudioLogo } from "@/components/cms/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-12">
      <div className="w-full max-w-[22rem]">
        <div className="mb-8">
          <StudioLogo />
        </div>
        {children}
      </div>
    </main>
  );
}
