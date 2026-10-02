"use client";

import type { ReactNode } from "react";

export type SidebarSection = "ALL" | "DUE" | "CUSTOM" | string;

interface ExplorerNavItemProps {
  id: SidebarSection;
  icon: ReactNode;
  label: string;
  count?: number;
  badge?: ReactNode;
  activeSection: SidebarSection;
  onSelect: (id: SidebarSection) => void;
}

export function ExplorerNavItem({
  id,
  icon,
  label,
  count,
  badge,
  activeSection,
  onSelect
}: ExplorerNavItemProps) {
  const isActive = activeSection === id;
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 text-left group cursor-pointer ${
        isActive ? "bg-notion-primary text-white shadow-sm" : "text-notion-secondary hover:bg-notion-hover hover:text-notion-text"
      }`}
    >
      <span className={`flex-shrink-0 ${isActive ? "text-white" : "text-notion-muted group-hover:text-notion-secondary"}`}>
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {badge}
      {count !== undefined && (
        <span
          className={`text-xs font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
            isActive ? "bg-white/20 text-white" : "bg-notion-hover text-notion-secondary"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

