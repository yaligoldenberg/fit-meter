import ResetForm from "@/components/ResetForm";
import { getAudience } from "@/lib/audience";

export default async function ResetPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = typeof searchParams?.token === "string" ? searchParams.token : "";
  const { locale } = await getAudience();
  return <ResetForm token={token} locale={locale} />;
}
