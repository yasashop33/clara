import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, ClipboardPlus, FileBarChart, Car, Settings } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/peminjaman", label: "Input Peminjaman", icon: ClipboardPlus },
  { to: "/report", label: "Report", icon: FileBarChart },
  { to: "/settings", label: "Pengaturan API", icon: Settings },
];

export default function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-5">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent">
            <Car className="h-5 w-5 text-sidebar-primary" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-bold leading-tight text-sidebar-accent-foreground">CLARA</h1>
              <p className="truncate text-xs text-sidebar-muted">Car Log & Reservation App</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="p-3">
        <SidebarMenu>
          {navItems.map((item) => {
            const active = location.pathname === item.to;

            return (
              <SidebarMenuItem key={item.to}>
                <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                  <NavLink to={item.to} className="flex items-center gap-3">
                    <item.icon className="h-5 w-5" />
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-3 py-4">
        {!collapsed && <p className="text-center text-xs text-sidebar-muted">© 2026 CLARA</p>}
      </SidebarFooter>
    </Sidebar>
  );
}
