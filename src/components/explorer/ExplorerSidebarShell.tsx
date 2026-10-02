"use client";

import { BookOpen } from "lucide-react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { ExplorerSidebar, ExplorerSidebarProps } from "./ExplorerSidebar";

export interface ExplorerSidebarShellProps extends ExplorerSidebarProps {
  totalChunks: number;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export function ExplorerSidebarShell({
  totalChunks,
  isMobileOpen,
  onCloseMobile,
  ...sidebarProps
}: ExplorerSidebarShellProps) {
  useBodyScrollLock(isMobileOpen);

  return (
    <>
      {/* Mobile drawer overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={onCloseMobile} />
          <div className="mobile-sidebar-panel absolute left-0 top-0 bottom-0 w-72 bg-notion-surface shadow-xl overflow-y-auto">
            <div className="p-4 border-b border-notion-border flex items-center justify-between">
              <span className="font-bold text-notion-text text-sm">📚 Kho Từ Vựng</span>
              <button onClick={onCloseMobile} className="p-1 rounded hover:bg-notion-hover cursor-pointer">
                <BookOpen size={18} className="text-notion-secondary" />
              </button>
            </div>
            <ExplorerSidebar {...sidebarProps} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 xl:w-64 flex-shrink-0 border-r border-notion-border bg-notion-surface overflow-y-auto">
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-bold text-notion-text flex items-center gap-1.5">
            <BookOpen size={13} className="text-notion-primary" />
            Kho Từ Vựng · {totalChunks} cụm
          </p>
        </div>
        <ExplorerSidebar {...sidebarProps} />
      </aside>
    </>
  );
}
