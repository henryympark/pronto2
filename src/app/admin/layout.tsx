"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon, LayoutDashboard, Calendar, Settings, Users, LogOut } from "lucide-react";
import { AuthGuard } from "@/domains/auth";

type SidebarItem = {
  name: string;
  href: string;
  icon: LucideIcon;
};

const sidebarItems: SidebarItem[] = [
  {
    name: "예약 현황",
    href: "/admin/reservations",
    icon: Calendar,
  },
  {
    name: "서비스 관리", 
    href: "/admin/services",
    icon: Settings,
  },
  {
    name: "고객 관리",
    href: "/admin/customers", 
    icon: Users,
  },
];

function AdminSidebar() {
  const pathname = usePathname();
  
  return (
    <aside className="w-64 bg-gray-900 text-white">
      <div className="p-4 border-b border-gray-800">
        <Link href="/admin/reservations" className="flex items-center space-x-2">
          <LayoutDashboard className="w-6 h-6" />
          <span className="text-lg font-bold">프론토 관리자</span>
        </Link>
      </div>
      <nav className="mt-6 px-4">
        <ul className="space-y-1">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-8 border-t border-gray-800 pt-4">
          <Link
            href="/"
            className="flex items-center px-4 py-3 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span>메인으로 이동</span>
          </Link>
        </div>
      </nav>
    </aside>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ✅ 200줄 → 10줄로 단순화!
  return (
    <AuthGuard requiredRole="admin" fallback="/service/pronto-b">
      <div className="flex min-h-screen">
        <AdminSidebar />
        <main className="flex-1 bg-gray-100 overflow-y-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </AuthGuard>
  );
}
