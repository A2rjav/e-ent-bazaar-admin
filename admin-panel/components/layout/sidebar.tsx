"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  Star,
  ChevronDown,
  Package,
  Factory,
  ShoppingCart,
  Flame,
  Truck,
  HardHat,
  FlaskConical,
  ClipboardList,
  LogOut,
  User,
  ShieldCheck,
  PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";
import { useUIStore } from "@/store/ui.store";
import { useRolePermissionsStore } from "@/store/role-permissions.store";
import { getModuleAccessFromRoles } from "@/lib/rbac";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavChild {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  matchPrefix?: string;
  children?: NavChild[];
  /** RBAC: which section this belongs to; visibility filtered by access config / role */
  section: keyof typeof import("@/lib/rbac").ROLE_ACCESS;
}

const allNavItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    section: "dashboard",
  },
  {
    label: "Requests",
    href: "/requests/orders",
    icon: FileText,
    matchPrefix: "/requests",
    section: "requests",
    children: [
      { label: "Orders", href: "/requests/orders", icon: ClipboardList },
      { label: "Sample Orders", href: "/requests/sample-orders", icon: FlaskConical },
    ],
  },
  {
    label: "Participants",
    href: "/participants/manufacturers",
    icon: Users,
    matchPrefix: "/participants",
    section: "participants",
    children: [
      { label: "Manufacturers", href: "/participants/manufacturers", icon: Factory },
      { label: "Customers", href: "/participants/customers", icon: ShoppingCart },
      { label: "Coal Providers", href: "/participants/coal-providers", icon: Flame },
      { label: "Transport Providers", href: "/participants/transport-providers", icon: Truck },
      { label: "Labour Contractors", href: "/participants/labour-contractors", icon: HardHat },
    ],
  },
  {
    label: "Reviews",
    href: "/reviews",
    icon: Star,
    section: "reviews",
  },
  {
    label: "Access Control",
    href: "/access-control",
    icon: ShieldCheck,
    section: "admin",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    sidebarCollapsed,
    toggleSidebarCollapsed,
    sidebarOpen,
    setSidebarOpen,
    currentUser,
    viewAsUser,
    logout,
  } = useUIStore();
  const rolePermissions = useRolePermissionsStore((s) => s.roles);
  /** For testing: when "View as" is set, sidebar and access use this user. */
  const effectiveUser = viewAsUser ?? currentUser;

  // Generic open state for any nav item with children, keyed by label
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  // RBAC: show only nav items the user can access (role permissions; admin section = super_admin only)
  const navItems = useMemo(
    () =>
      allNavItems.filter((item) => {
        if (item.section === "admin")
          return effectiveUser?.role === "super_admin";
        const level = getModuleAccessFromRoles(
          effectiveUser?.role,
          item.section as import("@/lib/types").ModuleId,
          rolePermissions
        );
        return level === "view" || level === "edit";
      }),
    [effectiveUser?.role, rolePermissions]
  );

  // Auto-expand dropdown when the user is on a matching route
  useEffect(() => {
    navItems.forEach((item) => {
      if (item.children && item.matchPrefix && pathname.startsWith(item.matchPrefix)) {
        setOpenMenus((prev) => ({ ...prev, [item.label]: true }));
      }
    });
  }, [pathname, navItems]);

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("ent-bazaar-auth");
    }
    logout();
    router.push("/login");
  };

  const roleLabel =
    effectiveUser?.role === "super_admin"
      ? "Super Admin"
      : effectiveUser?.role === "admin"
        ? "Admin"
        : effectiveUser?.role === "operation_manager"
          ? "Ops Manager"
          : effectiveUser?.role === "content_team"
            ? "Content Team"
            : effectiveUser?.role || "Admin";

  return (
    <>
    <TooltipProvider delayDuration={0}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen flex-col border-r bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] transition-all duration-300",
          sidebarCollapsed ? "w-[68px]" : "w-64",
          "lg:relative lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header: Logo (expanded) or PanelLeft toggle (collapsed) */}
        <div className="flex h-16 items-center border-b border-white/10 px-4">
          {sidebarCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleSidebarCollapsed}
                  className="mx-auto hidden h-9 w-9 items-center justify-center rounded-md text-white/70 transition-colors hover:bg-white/10 hover:text-white lg:flex"
                >
                  <PanelLeft className="h-5 w-5" />
                  <span className="sr-only">Expand sidebar</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                Expand sidebar
              </TooltipContent>
            </Tooltip>
          ) : (
            <>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div className="ml-3 flex flex-col flex-1 min-w-0">
                <span className="text-sm font-bold tracking-wide">e-ENT Bazaar</span>
                <span className="text-[10px] text-white/60 uppercase tracking-wider">
                  Admin Panel
                </span>
              </div>
              <button
                onClick={toggleSidebarCollapsed}
                className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/10 hover:text-white lg:flex"
              >
                <PanelLeft className="h-[18px] w-[18px]" />
                <span className="sr-only">Collapse sidebar</span>
              </button>
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {navItems.map((item) => {
              const matchBase = item.matchPrefix || item.href;
              const isActive =
                pathname === item.href ||
                (matchBase !== "/dashboard" && pathname.startsWith(matchBase));

              // --- Items WITH children (dropdown) ---
              if (item.children) {
                const isExpanded = !!openMenus[item.label] && !sidebarCollapsed;

                // Collapsed sidebar: icon with tooltip flyout listing sub-items
                if (sidebarCollapsed) {
                  return (
                    <Tooltip key={item.label}>
                      <TooltipTrigger asChild>
                        <Link
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-[hsl(var(--sidebar-accent))] text-white"
                              : "text-white/70 hover:bg-[hsl(var(--sidebar-accent))] hover:text-white"
                          )}
                        >
                          <item.icon className="h-5 w-5 shrink-0" />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="p-0">
                        <div className="flex flex-col py-1">
                          <span className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {item.label}
                          </span>
                          {item.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={() => setSidebarOpen(false)}
                              className={cn(
                                "flex items-center gap-2 px-3 py-1.5 text-sm transition-colors",
                                pathname === child.href
                                  ? "text-foreground font-medium"
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              <child.icon className="h-3.5 w-3.5" />
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                // Expanded sidebar: toggle button + animated child list
                return (
                  <div key={item.label}>
                    <button
                      onClick={() => toggleMenu(item.label)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-[hsl(var(--sidebar-accent))] text-white"
                          : "text-white/70 hover:bg-[hsl(var(--sidebar-accent))] hover:text-white"
                      )}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform duration-200",
                          isExpanded && "rotate-180"
                        )}
                      />
                    </button>

                    <div
                      className={cn(
                        "overflow-hidden transition-all duration-200",
                        isExpanded ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
                      )}
                    >
                      <div className="ml-4 mt-1 space-y-0.5 border-l border-white/10 pl-3">
                        {item.children.map((child) => {
                          const isChildActive = pathname === child.href;

                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={() => setSidebarOpen(false)}
                              className={cn(
                                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors",
                                isChildActive
                                  ? "bg-[hsl(var(--sidebar-accent))] text-white"
                                  : "text-white/60 hover:bg-[hsl(var(--sidebar-accent))]/50 hover:text-white"
                              )}
                            >
                              <child.icon className="h-4 w-4 shrink-0" />
                              <span>{child.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              }

              // --- Items WITHOUT children (simple link) ---
              const linkContent = (
                <Link
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[hsl(var(--sidebar-accent))] text-white"
                      : "text-white/70 hover:bg-[hsl(var(--sidebar-accent))] hover:text-white"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </Link>
              );

              if (sidebarCollapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <div key={item.href}>{linkContent}</div>
              );
            })}
        </nav>

        {/* Bottom section: Profile + Collapse toggle */}
        <div className="border-t border-white/10">
          {/* Profile widget */}
          <div className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                {sidebarCollapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="flex w-full items-center justify-center rounded-lg p-2 transition-colors hover:bg-[hsl(var(--sidebar-accent))]">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {effectiveUser ? getInitials(effectiveUser.name) : "SA"}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {effectiveUser?.name || "Super Admin"}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[hsl(var(--sidebar-accent))]">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {effectiveUser ? getInitials(effectiveUser.name) : "SA"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start text-left min-w-0">
                      <span className="text-sm font-medium text-white truncate w-full">
                        {effectiveUser?.name || "Super Admin"}
                      </span>
                      <span className="text-[11px] text-white/50">
                        {roleLabel}
                      </span>
                    </div>
                  </button>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side={sidebarCollapsed ? "right" : "top"}
                align={sidebarCollapsed ? "start" : "start"}
                className="w-56"
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">
                      {effectiveUser?.name || "Super Admin"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {effectiveUser?.email || "admin@entbazaar.com"}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/settings")}>
                  <User className="mr-2 h-4 w-4" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

        </div>
      </aside>
    </TooltipProvider>
    </>
  );
}
