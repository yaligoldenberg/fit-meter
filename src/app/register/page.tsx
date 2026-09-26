import AuthForm from "@/components/AuthForm";
import { getAudience } from "@/lib/audience";
import { safeNextPath } from "@/lib/auth";

export default async function RegisterPage({ searchParams }: { searchParams: { next?: string | string[] } }) {
  const { locale } = await getAudience();
  return <AuthForm mode="register" locale={locale} next={safeNextPath(searchParams.next)} />;
}
