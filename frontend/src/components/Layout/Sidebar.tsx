import React from 'react';
import { motion } from 'framer-motion';

type NavItem = { id: string; name: string; icon?: React.ComponentType<any>; description?: string };

interface SidebarProps {
  navigation: NavItem[];
  currentPage: string;
  onPageChange: (id: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function Sidebar({ navigation, currentPage, onPageChange }: SidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-72 bg-white/80 backdrop-blur border-r border-slate-200 hidden lg:flex flex-col">
      <div className="p-4 text-xl font-semibold text-slate-700">Umbler Dashboard</div>
      <nav className="flex-1 overflow-y-auto">
        <ul className="space-y-1 p-2">
          {navigation.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onPageChange(item.id)}
                className={`w-full text-left px-4 py-2 rounded-lg transition ${
                  currentPage === item.id ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                {item.name}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}