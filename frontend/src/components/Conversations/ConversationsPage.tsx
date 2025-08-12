'use client';
import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';

interface ContactLite {
  id: string;
  name?: string;
  phone: string;
  tags?: string[];
  last_message?: { content?: string; created_at?: string } | null;
  last_interaction?: string;
}

export default function ConversationsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // List contacts (uses backend mock mode if Supabase off)
  const { data: contactsResp } = useSWR(['/api/contacts'], async () => {
    const res = await fetch(`/api/contacts`);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  }, { refreshInterval: 5000 });

  const contacts: ContactLite[] = contactsResp?.contacts || [];

  // Default to first contact
  useEffect(() => {
    if (!selectedId && contacts.length > 0) {
      setSelectedId(contacts[0].id);
    }
  }, [contacts, selectedId]);

  // Messages for selected contact
  const { data: messagesResp } = useSWR(
    () => (selectedId ? ['/api/contacts', selectedId, 'messages'] : null),
    async () => {
      const res = await fetch(`/api/contacts/${selectedId}/messages`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    },
    { refreshInterval: 4000 }
  );

  const messages = messagesResp?.messages || [];
  const selectedContact = messagesResp?.contact || contacts.find((c) => c.id === selectedId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left: Messages list */}
      <div className="lg:col-span-1 rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="text-slate-800 font-semibold">Chat em Tempo Real</div>
          <div className="text-slate-500 text-sm">Visualize mensagens dos clientes</div>
        </div>
        <div className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
          {contacts.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`w-full text-left p-4 hover:bg-slate-50 transition ${selectedId === c.id ? 'bg-slate-50' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-slate-800">{c.name || c.phone}</div>
                <div className="text-xs text-slate-400">{c.last_message?.created_at ? new Date(c.last_message.created_at).toLocaleTimeString() : ''}</div>
              </div>
              <div className="text-slate-500 text-sm line-clamp-1">{c.last_message?.content || '—'}</div>
              <div className="mt-2 flex gap-2">
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">WhatsApp</span>
                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">in_progress</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Chat window */}
      <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white flex flex-col max-h-[70vh]">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-slate-200" />
          <div>
            <div className="font-semibold text-slate-800">{selectedContact?.name || selectedContact?.phone || 'Selecione um contato'}</div>
            <div className="text-xs text-slate-500">WhatsApp • Pendente</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
          {messages.map((m: any) => (
            <div key={m.id} className={`max-w-[75%] ${m.direction === 'inbound' ? '' : 'ml-auto'}`}>
              <div className={`rounded-2xl px-4 py-2 shadow-sm ${m.direction === 'inbound' ? 'bg-white text-slate-800' : 'bg-blue-600 text-white'}`}>
                {m.content || '—'}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {m.created_at ? new Date(m.created_at).toLocaleString() : ''}
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="text-slate-500 text-sm">Nenhuma mensagem para este contato.</div>
          )}
        </div>
        <div className="p-3 border-t border-slate-100">
          <div className="text-xs text-slate-400">Em progresso</div>
        </div>
      </div>
    </div>
  );
}