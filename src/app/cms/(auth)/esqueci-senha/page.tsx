import type { Metadata } from "next";
import { ForgotForm } from "@/components/cms/auth/forgot-form";

export const metadata: Metadata = { title: "Redefinir senha" };

export default function ForgotPage() {
  return <ForgotForm />;
}
