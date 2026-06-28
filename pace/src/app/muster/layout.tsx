import { MusterBottomNav } from "@/components/muster-bottom-nav";

export default function MusterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-dark">
      <div className="app-screen">
        {children}
      </div>
      <MusterBottomNav />
    </div>
  );
}
