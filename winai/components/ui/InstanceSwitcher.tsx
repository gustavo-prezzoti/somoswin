import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Smartphone } from 'lucide-react';
import { useInstance } from '../../contexts/InstanceContext';

const STATUS_COLORS: Record<string, string> = {
  ready: 'bg-emerald-500',
  warming: 'bg-amber-500',
  paused: 'bg-rose-500',
  unknown: 'bg-gray-300',
};

const InstanceSwitcher: React.FC = () => {
  const { instances, selectedInstance, setSelectedInstance, loading } = useInstance();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!loading && instances.length === 0) return null;
  if (instances.length === 1) {
    const only = instances[0];
    return (
      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-100 text-xs text-slate-700">
        <Smartphone size={14} className="text-emerald-600" />
        <span className="font-bold truncate max-w-[180px]">{only.instanceName}</span>
        {only.phoneDisplay ? <span className="text-gray-400">· {only.phoneDisplay}</span> : null}
      </div>
    );
  }

  const current = instances.find((i) => i.instanceName === selectedInstance) || instances[0] || null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors text-xs font-bold text-slate-800"
      >
        <Smartphone size={14} className="text-emerald-600" />
        <span className="truncate max-w-[180px]">{current?.instanceName ?? 'Selecionar instância'}</span>
        {current?.phoneDisplay ? (
          <span className="text-[10px] text-gray-400 font-medium">{current.phoneDisplay}</span>
        ) : null}
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-2xl shadow-xl z-[300] overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">
            Instâncias da empresa
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {instances.map((inst) => {
              const isSel = inst.instanceName === selectedInstance;
              const statusKey = (inst.status || 'unknown').toLowerCase();
              const statusColor = STATUS_COLORS[statusKey] || STATUS_COLORS.unknown;
              return (
                <li key={inst.connectionId}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedInstance(inst.instanceName);
                      setOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center gap-3 transition-colors ${
                      isSel ? 'bg-emerald-50/80' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${statusColor}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-800 truncate">{inst.instanceName}</p>
                      <p className="text-[10px] text-gray-500 truncate">
                        {inst.phoneDisplay || '—'}
                        {inst.profileName ? ` · ${inst.profileName}` : ''}
                      </p>
                    </div>
                    {isSel ? <Check size={14} className="text-emerald-600 shrink-0" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default InstanceSwitcher;
