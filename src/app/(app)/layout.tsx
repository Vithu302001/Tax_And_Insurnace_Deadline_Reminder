import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/lib/hooks/useAuth";

export default function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <AppShell>
        {children}
      </AppShell>
    </ProtectedRoute>
  );
}
