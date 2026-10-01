import type { Metadata } from "next";
import { HubForgotForm } from "@/components/hub/auth-forms";

export const metadata: Metadata = { title: "Esqueci minha senha" };

export default function HubForgotPage() {
  return <HubForgotForm />;
}
