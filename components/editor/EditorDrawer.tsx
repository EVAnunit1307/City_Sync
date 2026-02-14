'use client';

import React, { useState, useCallback } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

const PEEK_HEIGHT_PX = 88;
const EXPANDED_PCT = 40; // 40% of viewport height

interface EditorDrawerProps {
  children: React.ReactNode;
  /** Top row: title, mode text, and optional actions (e.g. Cancel, Clear) */
  title?: string;
  modeLabel?: string;
  actions?: React.ReactNode;
}

export function EditorDrawer({ children, title = 'Editor', modeLabel, actions }: EditorDrawerProps) {
  const [expanded, setExpanded] = useState(false);

  const toggle = useCallback(() => {
    setExpanded((e) => !e);
  }, []);

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-20 flex flex-col rounded-t-2xl overflow-hidden transition-[height] duration-300 ease-out"
      style={{
        height: expanded ? `${EXPANDED_PCT}vh` : `${PEEK_HEIGHT_PX}px`,
        maxHeight: expanded ? '45vh' : undefined,
        background: 'rgba(255, 255, 255, 0.82)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.08)',
      }}
    >
      {/* Handle + top row (always visible) */}
      <div
        className="shrink-0 flex flex-col items-center pt-2 pb-1 cursor-pointer select-none touch-manipulation"
        onClick={toggle}
        onKeyDown={(e) => e.key === 'Enter' && toggle()}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse drawer' : 'Expand drawer'}
      >
        <div className="w-12 h-1 rounded-full bg-slate-300/80 mb-3" aria-hidden />
        <div className="w-full px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-base font-semibold text-slate-800 truncate">{title}</h2>
            {modeLabel && (
              <span className="text-xs font-medium text-slate-500 truncate tabular-nums">
                {modeLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
          <div className="shrink-0 text-slate-400" aria-hidden>
            {expanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </div>
        </div>
      </div>

      {/* Scrollable content (visible when expanded) */}
      <div
        className={`flex-1 min-h-0 overflow-y-auto overscroll-contain transition-opacity duration-200 ${
          expanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="p-4 pt-2">{children}</div>
      </div>
    </div>
  );
}
