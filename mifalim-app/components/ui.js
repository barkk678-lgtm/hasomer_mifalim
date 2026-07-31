'use client';
import { ChevronDown, X } from 'lucide-react';
import { C } from '../lib/designSystem';

export function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold tracking-wide" style={{ color: C.inkSoft }}>{label}</span>
      {children}
    </label>
  );
}

const inputBase = 'w-full rounded-md px-3 py-2 text-sm outline-none transition-colors';
const inputStyle = { background: C.surface, border: `1px solid ${C.line}`, color: C.ink };

export function TextInput(props) {
  return <input {...props} className={`${inputBase} ${props.className || ''}`} style={inputStyle} />;
}

export function TextArea(props) {
  return <textarea {...props} className={`${inputBase} ${props.className || ''}`} style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }} />;
}

export function Select({ children, ...props }) {
  return (
    <div className="relative">
      <select {...props} className={`${inputBase} appearance-none pl-8 pr-3`} style={inputStyle}>
        {children}
      </select>
      <ChevronDown size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.inkSoft }} />
    </div>
  );
}

const BADGE_TONES = {
  forest: { bg: '#E3E8DD', fg: C.forestDark },
  ochre: { bg: C.ochreSoft, fg: '#6B4C16' },
  rust: { bg: C.rustSoft, fg: C.rust },
  good: { bg: C.greenGoodSoft, fg: C.greenGood },
  amber: { bg: C.amberSoft, fg: '#6B4C16' },
};

export function Badge({ children, tone = 'forest' }) {
  const t = BADGE_TONES[tone];
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap" style={{ background: t.bg, color: t.fg }}>
      {children}
    </span>
  );
}

export function IconButton({ icon: Icon, onClick, title, tone = 'ghost', size = 15 }) {
  const color = tone === 'danger' ? C.rust : C.inkSoft;
  return (
    <button type="button" onClick={onClick} title={title} className="p-1.5 rounded-md hover:opacity-70 transition-opacity" style={{ color }}>
      <Icon size={size} />
    </button>
  );
}

export function Card({ children, title, right }) {
  return (
    <div className="rounded-xl p-5 mb-4" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
      {(title || right) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="text-sm font-bold" style={{ color: C.forestDark }}>{title}</h3>}
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: '#1A1F1650' }} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-2xl shadow-2xl" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={{ background: C.forest }}>
          <h2 className="text-white font-bold" style={{ fontFamily: 'Rubik, sans-serif' }}>{title}</h2>
          <button onClick={onClose} className="text-white opacity-80 hover:opacity-100"><X size={18} /></button>
        </div>
        <div className="p-6">{children}</div>
        {footer && <div className="px-6 py-4 border-t flex justify-end gap-2" style={{ borderColor: C.line }}>{footer}</div>}
      </div>
    </div>
  );
}
