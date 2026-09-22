import React, { useState, useEffect } from 'react';
import { Project, TimesheetEntry, RateCard } from '../types';
import { Clock, Calendar, MessageSquare, Plus, CheckCircle, AlertTriangle, LogIn, Undo2 } from 'lucide-react';
import { formatDateDisplay, formatMondayDisplay } from '../lib/dateUtils';

interface TimesheetFormProps {
  projects: Project[];
  rateCards?: RateCard[];
  onAddEntry: (entry: Omit<TimesheetEntry, 'id'>) => string | null | void;
  onDeleteEntry?: (id: string) => void;
  isConnected?: boolean;
  onConnectSheet?: () => void;
}

export default function TimesheetForm({
  projects,
  rateCards = [],
  onAddEntry,
  onDeleteEntry,
  isConnected = false,
  onConnectSheet,
}: TimesheetFormProps) {
  const [projectId, setProjectId] = useState<string>('');
  const [selectedMemberKey, setSelectedMemberKey] = useState<string>('');
  const [hours, setHours] = useState<string>('');
  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [description, setDescription] = useState<string>('');
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [lastLogged, setLastLogged] = useState<Omit<TimesheetEntry, 'id'> | null>(null);
  const [lastLoggedId, setLastLoggedId] = useState<string | null>(null);

  // Handle auto-selecting team member when project changes
  const activeProject = projects.find((p) => p.id === projectId);
  const activeRateCard = rateCards.find((rc) => rc.id === activeProject?.rateCardId);

  const teamList = activeProject 
    ? [...activeProject.teamMembers]
        .map((m, idx) => {
          let roleObj = activeRateCard?.roles.find((r) => r.id === m.roleId);
          if (!roleObj && m.roleId) {
            for (const card of rateCards) {
              const found = card.roles.find((r) => r.id === m.roleId);
              if (found) {
                roleObj = found;
                break;
              }
            }
          }
          const roleName = roleObj?.role || 'Advisory';
          const hourlyCost = roleObj?.hourlyCost || 0;
          const label = `${roleName} - ${m.memberName}`;
          const key = `${m.memberName}::${m.roleId || idx}`;
          return {
            ...m,
            roleName,
            hourlyCost,
            label,
            key,
          };
        })
        .sort((a, b) => a.label.localeCompare(b.label)) 
    : [];

  // Sort projects: Active first, then alphabetically by clientName then name
  const sortedProjects = [...projects].sort((a, b) => {
    const aDone = a.isCompleted ? 1 : 0;
    const bDone = b.isCompleted ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    const clientCompare = a.clientName.localeCompare(b.clientName);
    if (clientCompare !== 0) return clientCompare;
    return a.name.localeCompare(b.name);
  });

  useEffect(() => {
    // Reset selected team member key if not in new project team list
    if (teamList.length > 0) {
      const exists = teamList.some((m) => m.key === selectedMemberKey);
      if (!exists) {
        setSelectedMemberKey(teamList[0].key);
      }
    } else {
      setSelectedMemberKey('');
    }
  }, [projectId, projects, rateCards, teamList]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected) {
      if (onConnectSheet) {
        onConnectSheet();
      } else {
        alert('Google Sheet connection required to log hours. Please connect to Google Sheets first.');
      }
      return;
    }

    if (!projectId) {
      alert('Please select a project');
      return;
    }
    const selectedItem = teamList.find((m) => m.key === selectedMemberKey);
    if (!selectedItem) {
      alert('Please select a team member');
      return;
    }
    const parsedHours = parseFloat(hours);
    if (isNaN(parsedHours) || parsedHours <= 0 || parsedHours > 168) {
      alert('Please enter a valid amount of hours');
      return;
    }
    if (!description.trim()) {
      alert('Please enter a description');
      return;
    }

    const entryData: Omit<TimesheetEntry, 'id'> = {
      projectId,
      teamMember: selectedItem.memberName,
      roleId: selectedItem.roleId,
      roleName: selectedItem.roleName,
      dayRate: selectedItem.hourlyCost,
      hours: parsedHours,
      date,
      description: description.trim(),
    };

    const createdId = onAddEntry(entryData);
    if (typeof createdId === 'string') {
      setLastLoggedId(createdId);
    }
    setLastLogged(entryData);

    // Reset Form Fields (preserving project & member choice for faster sequential logging, but clearing description and hours)
    setHours('');
    setDescription('');

    // Trigger success modal
    setShowSuccessModal(true);
  };

  const handleCancelLastLogged = () => {
    if (lastLoggedId && onDeleteEntry) {
      onDeleteEntry(lastLoggedId);
    }
    // Restore fields so user can fix their mistake easily
    if (lastLogged) {
      setHours(lastLogged.hours.toString());
      setDescription(lastLogged.description);
      if (lastLogged.date) setDate(lastLogged.date);
    }
    setShowSuccessModal(false);
    setLastLoggedId(null);
  };

  // Helper to format date nicely
  const formatLoggedDate = (dStr: string) => formatDateDisplay(dStr);

  const getMondayOfDate = (dStr: string) => formatMondayDisplay(dStr);

  const lastLoggedRoleName = (() => {
    if (!lastLogged) return '';
    if (lastLogged.roleName) return lastLogged.roleName;
    if (lastLogged.roleId) {
      for (const card of rateCards) {
        const found = card.roles.find((r) => r.id === lastLogged.roleId);
        if (found) return found.role;
      }
    }
    const proj = projects.find((p) => p.id === lastLogged.projectId);
    const member = proj?.teamMembers.find((m) => m.memberName.toLowerCase() === lastLogged.teamMember.toLowerCase());
    if (member?.roleId) {
      for (const card of rateCards) {
        const found = card.roles.find((r) => r.id === member.roleId);
        if (found) return found.role;
      }
    }
    return '';
  })();

  return (
    <div id="timesheet-single-entry-form" className="no-print bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#F5720A]"></div>

      <span className="eyebrow-label block mb-1">Weekly Logging</span>
      <h2 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5 text-[#F5720A]" />
        Log Effort Form
      </h2>



      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Project Selection */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 font-mono">
              Select Project <span className="text-red-500">*</span>
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-[#F5720A] focus:ring-1 focus:ring-[#F5720A] transition-all"
            >
              <option value="" disabled>-- Select Project --</option>
              {sortedProjects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.clientName} - {proj.name}{proj.isCompleted ? ' (Completed)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Team Selection */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 font-mono">
              Team Member <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedMemberKey}
              onChange={(e) => setSelectedMemberKey(e.target.value)}
              disabled={!projectId}
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-[#F5720A] focus:ring-1 focus:ring-[#F5720A] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {!projectId ? (
                <option value="">Select a project first...</option>
              ) : teamList.length === 0 ? (
                <option value="">No team members allocated to this project</option>
              ) : (
                teamList.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Work Week Date */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 font-mono">
              Work Week Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                onClick={(e) => {
                  try {
                    (e.target as any).showPicker();
                  } catch (err) {}
                }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-[#F5720A] focus:ring-1 focus:ring-[#F5720A] transition-all cursor-pointer"
              />
              <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500 pointer-events-none" />
            </div>
            <p className="text-[10px] text-zinc-500 mt-1 font-mono">
              Week of {getMondayOfDate(date)}
            </p>
          </div>

          {/* Hours Logged */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 font-mono">
              Hours Logged <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.25"
                min="0.25"
                max="168"
                required
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="e.g. 7.5"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-[#F5720A] focus:ring-1 focus:ring-[#F5720A] transition-all"
              />
              <Clock className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
            </div>
          </div>
        </div>

        {/* Description / Accomplishment */}
        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 font-mono">
            Accomplishment Description <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <textarea
              required
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail daily accomplishments or focus areas..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-[#F5720A] focus:ring-1 focus:ring-[#F5720A] transition-all resize-none"
            />
            <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
          </div>
        </div>

        {/* Submit */}
        {!isConnected ? (
          <button
            type="button"
            id="btn-connect-sheet-timesheet"
            onClick={onConnectSheet}
            className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold py-3.5 px-6 rounded-2xl transition-all flex items-center justify-center gap-2.5 cursor-pointer mt-2 shadow-lg shadow-amber-500/5 group"
          >
            <LogIn className="h-5 w-5 text-amber-400 group-hover:scale-110 transition-transform" />
            Connect Central Google Sheet to Enable Entry Logging
          </button>
        ) : (
          <button
            type="submit"
            id="btn-submit-timesheet-entry"
            className="w-full bg-[#F5720A] hover:bg-orange-hover text-zinc-950 font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-[#F5720A]/10 flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <Plus className="h-4.5 w-4.5 stroke-[2.5px]" />
            Record Effort Entry
          </button>
        )}
      </form>

      {/* Success Modal (Backdrop-Blurred overlay) */}
      {showSuccessModal && lastLogged && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-250">
            <div className="absolute top-0 left-0 right-0 h-[4px] bg-[#F5720A]"></div>

            <div className="flex items-center gap-3.5 mb-4 text-[#F5720A]">
              <CheckCircle className="h-8 w-8 stroke-[2px]" />
              <div>
                <h3 className="text-lg font-bold text-zinc-100">Timesheet Logged!</h3>
                <p className="text-xs text-zinc-400">Successfully committed to local state</p>
              </div>
            </div>

            {/* Recapped Information */}
            <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800/80 space-y-3 mb-6">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-zinc-500 font-medium">Project:</span>
                  <p className="text-zinc-300 font-semibold mt-0.5">
                    {projects.find((p) => p.id === lastLogged.projectId)?.name || 'Unknown'}
                  </p>
                </div>
                <div>
                  <span className="text-zinc-500 font-medium">Team Member:</span>
                  <p className="text-zinc-300 font-semibold mt-0.5">
                    {lastLoggedRoleName ? `${lastLoggedRoleName} - ${lastLogged.teamMember}` : lastLogged.teamMember}
                  </p>
                </div>
                <div>
                  <span className="text-zinc-500 font-medium">Hours Logged:</span>
                  <p className="text-[#F5720A] font-bold mt-0.5">{lastLogged.hours.toFixed(2)} hrs</p>
                </div>
                <div>
                  <span className="text-zinc-500 font-medium">Date:</span>
                  <p className="text-zinc-300 font-semibold mt-0.5">{formatLoggedDate(lastLogged.date)}</p>
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-2.5">
                <span className="text-zinc-500 text-xs font-medium">Accomplishment:</span>
                <p className="text-zinc-300 text-xs mt-1 italic line-clamp-2">
                  "{lastLogged.description}"
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCancelLastLogged}
                className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-semibold py-2.5 px-3 rounded-xl transition-all cursor-pointer text-xs flex items-center justify-center gap-1.5"
                title="Cancel this entry and restore inputs to fix mistake"
              >
                <Undo2 className="h-4 w-4 shrink-0" />
                Cancel / Undo Entry
              </button>
              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="flex-1 bg-[#F5720A] hover:bg-orange-hover text-zinc-955 font-bold py-2.5 px-3 rounded-xl transition-all cursor-pointer text-xs shadow-md shadow-[#F5720A]/10 text-center"
              >
                Got it, continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
