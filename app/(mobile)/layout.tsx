import { MobileLayout } from "@/components/layout/MobileLayout";

export default function MobileGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MobileLayout>{children}</MobileLayout>;
}
