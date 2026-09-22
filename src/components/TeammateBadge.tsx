import React from 'react';

export function getTeammateColors(name: string) {
  const themes = [
    { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', circle: 'bg-red-500/20' },
    { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', circle: 'bg-blue-500/20' },
    { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', circle: 'bg-emerald-500/20' },
    { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', circle: 'bg-amber-500/20' },
    { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20', circle: 'bg-violet-500/20' },
    { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20', circle: 'bg-pink-500/20' },
    { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20', circle: 'bg-cyan-500/20' },
    { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', circle: 'bg-orange-500/20' },
  ];

  let hash = 0;
  const cleanName = name || 'Unknown';
  for (let i = 0; i < cleanName.length; i++) {
    hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % themes.length;
  return themes[index];
}

export function getInitials(name: string): string {
  const parts = (name || '').trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '??';
  if (parts.length === 1) {
    const single = parts[0];
    return single.length >= 2 ? single.substring(0, 2).toUpperCase() : single.toUpperCase();
  }
  const first = parts[0][0] || '';
  const last = parts[parts.length - 1][0] || '';
  return (first + last).toUpperCase();
}

interface TeammateBadgeProps {
  name: string;
  email?: string;
  className?: string;
}

export default function TeammateBadge({ name, email, className = '' }: TeammateBadgeProps) {
  const colors = getTeammateColors(name);
  const initials = getInitials(name);
  const tooltipText = email ? `${name} (${email})` : name;

  return (
    <div
      title={tooltipText}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium max-w-[150px] shrink-0 select-none ${colors.bg} ${colors.text} ${colors.border} ${className}`}
    >
      <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold ${colors.circle} shrink-0`}>
        {initials}
      </span>
      <span className="truncate">{name}</span>
    </div>
  );
}
