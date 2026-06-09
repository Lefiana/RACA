// File: apps/frontend/app/(auth)/layout.tsx
// Purpose: Layout for unauthenticated pages — centered card, no sidebar
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-4">
        {children}
      </div>
    </div>
  );
}