"use client";

import { PanelLeft } from "lucide-react";
import { useUIStore } from "@/store/ui.store";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  const { sidebarCollapsed, toggleSidebarCollapsed } = useUIStore();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        {/* PanelLeft toggle — only shows on desktop when sidebar is collapsed */}
        {sidebarCollapsed && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebarCollapsed}
                  className="mt-0.5 hidden h-8 w-8 shrink-0 lg:flex"
                  aria-label="Open sidebar"
                >
                  <PanelLeft className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="font-medium">
                Open sidebar
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
