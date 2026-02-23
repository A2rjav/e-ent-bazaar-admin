"use client";

import { useRouter } from "next/navigation";
import { Menu, LogOut, User } from "lucide-react";
import { useUIStore } from "@/store/ui.store";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/utils";

/**
 * Compact top bar visible ONLY on mobile (< lg breakpoint).
 * Contains the hamburger menu toggle and a profile avatar icon.
 * On desktop the sidebar is always visible so this bar is hidden.
 */
export function MobileTopBar() {
  const router = useRouter();
  const { toggleSidebar, currentUser, viewAsUser, logout } = useUIStore();
  const effectiveUser = viewAsUser ?? currentUser;

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("ent-bazaar-auth");
    }
    logout();
    router.push("/login");
  };

  return (
    <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:hidden">
      {/* Hamburger */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle navigation</span>
      </Button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Compact profile icon */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {effectiveUser ? getInitials(effectiveUser.name) : "SA"}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
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
  );
}
