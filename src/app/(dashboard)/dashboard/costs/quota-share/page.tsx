import CostsSubnav from "../CostsSubnav";
import QuotaSharePageClient from "./QuotaSharePageClient";

export const dynamic = "force-dynamic";

export default function QuotaSharePage() {
  return (
    <>
      <CostsSubnav />
      <QuotaSharePageClient />
    </>
  );
}
