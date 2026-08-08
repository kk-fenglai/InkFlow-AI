import { redirect } from "next/navigation";
import { getSessionUserWithRole } from "@/lib/auth/admin";
import AdminSidebar from "@/components/admin/AdminSidebar";

// Middleware already gates /admin/*; this is defense in depth with a fresh
// role read from the database.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUserWithRole();
  if (!user || user.role !== "admin") {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar email={user.email} />
      <div className="flex-1 min-w-0 flex flex-col">{children}</div>
    </div>
  );
}
