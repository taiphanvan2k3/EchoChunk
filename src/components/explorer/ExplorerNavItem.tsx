"use client";

import React from "react";

export type SidebarSection = "ALL" | "DUE" | "CUSTOM" | string;

interface ExplorerNavItemProps {
  id: SidebarSection;
  icon: React.ReactNode;
  label: string;
  count?: number;
  badge?: React.ReactNode;
  activeSection: SidebarSection;
  onSelect: (id: SidebarSection) => void;
}

export const ExplorerNavItem: React.FC<ExplorerNavItemProps> = ({
  id,
  icon,
  label,
  count,
  badge,
  activeSection,
  onSelect
}) => {
  const isActive = activeSection === id;
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 text-left group ${
        isActive ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      <span className={`flex-shrink-0 ${isActive ? "text-white" : "text-gray-400 group-hover:text-gray-600"}`}>
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {badge}
      {count !== undefined && (
        <span
          className={`text-xs font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
            isActive ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
};
