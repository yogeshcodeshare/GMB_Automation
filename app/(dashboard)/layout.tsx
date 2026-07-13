import { AppShell } from "@/components/shell/app-shell";
import { AppStateProvider } from "@/components/shell/app-state";
import { ToastProvider } from "@/components/ui/toast";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AppStateProvider>
      <ToastProvider>
        <AppShell>{children}</AppShell>
      </ToastProvider>
    </AppStateProvider>
  );
}
