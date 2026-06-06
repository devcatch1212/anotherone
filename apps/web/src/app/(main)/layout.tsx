import { BottomNav } from '@/components/layout';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="page-container">{children}</main>
      <BottomNav />
    </>
  );
}
