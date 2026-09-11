import AuthForm from "@/components/AuthForm";
import { getAudience } from "@/lib/audience";

export default async function RegisterPage() {
  const { locale } = await getAudience();
  return <AuthForm mode="register" locale={locale} />;
}
