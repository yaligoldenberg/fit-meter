import AuthForm from "@/components/AuthForm";
import { getAudience } from "@/lib/audience";

export default async function LoginPage() {
  const { locale } = await getAudience();
  return <AuthForm mode="login" locale={locale} />;
}
