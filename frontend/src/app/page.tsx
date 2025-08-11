'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ChartBarIcon, 
  ChatBubbleLeftRightIcon, 
  UserGroupIcon, 
  TagIcon,
  Cog6ToothIcon,
  BellIcon
} from '@heroicons/react/24/outline';

import Sidebar from '@/components/Layout/Sidebar';
import Header from '@/components/Layout/Header';
import DashboardOverview from '@/components/Dashboard/DashboardOverview';
import ContactsPage from '@/components/Contacts/ContactsPage';
import ConversationsPage from '@/components/Conversations/ConversationsPage';
import TagsPage from '@/components/Tags/TagsPage';
import SettingsPage from '@/components/Settings/SettingsPage';

const navigation = [
  { 
    name: 'Dashboard', 
    icon: ChartBarIcon, 
    id: 'dashboard',
    description: 'Visão geral e estatísticas'
  },
  { 
    name: 'Conversas', 
    icon: ChatBubbleLeftRightIcon, 
    id: 'conversations',
    description: 'Gerenciar conversas ativas'
  },
  { 
    name: 'Contatos', 
    icon: UserGroupIcon, 
    id: 'contacts',
    description: 'Gerenciar contatos'
  },
  { 
    name: 'Etiquetas', 
    icon: TagIcon, 
    id: 'tags',
    description: 'Sistema de etiquetas'
  },
  { 
    name: 'Configurações', 
    icon: Cog6ToothIcon, 
    id: 'settings',
    description: 'Configurações do sistema'
  },
];

export default function Dashboard() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'conversations':
        return <ConversationsPage />;
      case 'contacts':
        return <ContactsPage />;
      case 'tags':
        return <TagsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardOverview />;
    }
  };

  const currentPageData = navigation.find(item => item.id === currentPage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Sidebar */}
      <Sidebar
        navigation={navigation}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Header */}
        <Header
          currentPage={currentPageData}
          setSidebarOpen={setSidebarOpen}
        />

        {/* Page content */}
        <main className="py-6">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
          >
            {renderCurrentPage()}
          </motion.div>
        </main>
      </div>
    </div>
  );
}