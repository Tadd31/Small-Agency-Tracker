import React, { useState, useMemo } from 'react';
import { Project, TimesheetEntry, RateCard } from '../types';
import { Edit2, Check, X, Trash2, Undo2, Calendar, User, Layers, ChevronDown, RotateCcw } from 'lucide-react';
import TeammateBadge from './TeammateBadge';
import { formatDateDisplay, getMondayDateStr, formatMondayDisplay, parseLocalDate } from '../lib/dateUtils';

interface LedgerTableProps {
  entries: TimesheetEntry[];
  projects: Project[];
  rateCards?: RateCard[];
  onUpdateEntry: (updated: TimesheetEntry) => void;
  onDeleteEntry: (id: string) => void;
  onRestoreEntry: (entry: TimesheetEntry) => void;
}

export default function LedgerTable({
  entries,
  projects,
  rateCards = [],
  onUpdateEntry,
  onDeleteEntry,
  onRestoreEntry,
}: LedgerTableProps) {
  // Filters State
  const [scope, setScope] = useState<'all' | 'week' | 'month'>('all');
  const [selectedWeekDate, setSelectedWeekDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth());
  const [filterProjectId, setFilterProjectId] = useState<string>('all');
  const [filterMember, setFilterMember] = useState<string>('all');
  const [displayLimit, setDisplayLimit] = useState<number>(21);

  // Automatically reset pagination limit when any filter changes
  React.useEffect(() => {
    setDisplayLimit(21);
  }, [filterProjectId, filterMember, scope, selectedWeekDate, selectedMonth]);

  // Extract all unique team members across entries and project allocations
  const uniqueTeamMembers = useMemo(() => {
    return Array.from(
      new Set([
        ...entries.map((e) => e.teamMember),
        ...projects.flatMap((p) => p.teamMembers.map((m) => m.memberName)),
      ])
    )
      .filter((name): name is string => Boolean(name && name.trim()))
      .sort((a, b) => a.localeCompare(b));
  }, [entries, projects]);

  // Inline Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editProject, setEditProject] = useState<string>('');
  const [editMember, setEditMember] = useState<string>('');
  const [editRoleId, setEditRoleId] = useState<string>('');
  const [editRoleName, setEditRoleName] = useState<string>('');
  const [editDayRate, setEditDayRate] = useState<number | undefined>(undefined);
  const [editHours, setEditHours] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');

  // Undo Toast State
  const [toastEntry, setToastEntry] = useState<TimesheetEntry | null>(null);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastTimeoutId, setToastTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // Deletion Confirmation State
  const [entryToDelete, setEntryToDelete] = useState<TimesheetEntry | null>(null);

  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper to format actual entry date nicely
  const formatActualDate = (dStr: string) => formatDateDisplay(dStr);

  // Helper to resolve the Monday date of a week string
  const getMondayDate = (dStr: string) => getMondayDateStr(dStr);

  // Helper to format date nicely for rendering
  const formatMondayOfDate = (dStr: string) => formatMondayDisplay(dStr);

  // Apply filters with memoization
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // 1. Project Filter
      if (filterProjectId !== 'all' && entry.projectId !== filterProjectId) {
        return false;
      }

      // 2. Team Member Filter
      if (filterMember !== 'all' && entry.teamMember.toLowerCase() !== filterMember.toLowerCase()) {
        return false;
      }

      // 3. Scope Filter (All, Week, Month)
      if (scope === 'week') {
        const entryMonday = getMondayDateStr(entry.date);
        const filterMonday = getMondayDateStr(selectedWeekDate);
        if (entryMonday !== filterMonday) return false;
      } else if (scope === 'month') {
        const entryDateObj = parseLocalDate(entry.date);
        if (entryDateObj.getMonth() !== selectedMonth) return false;
      }

      return true;
    });
  }, [entries, filterProjectId, filterMember, scope, selectedWeekDate, selectedMonth]);

  // Sort entries chronologically descending (latest entries first)
  const sortedEntries = useMemo(() => {
    return [...filteredEntries].sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.id.localeCompare(a.id);
    });
  }, [filteredEntries]);

  // Limit to last 21 entries by default (increments by 21 on demand)
  const displayedEntries = sortedEntries.slice(0, displayLimit);
  const hasMore = displayLimit < sortedEntries.length;
  const nextCount = Math.min(21, sortedEntries.length - displayLimit);

  // Handle Edit click
  const startEdit = (entry: TimesheetEntry) => {
    setEditingId(entry.id);
    setEditProject(entry.projectId);
    setEditMember(entry.teamMember);
    setEditRoleId(entry.roleId || '');
    setEditRoleName(entry.roleName || '');
    setEditDayRate(entry.dayRate);
    setEditHours(entry.hours.toString());
    setEditDate(entry.date);
    setEditDescription(entry.description);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = (id: string) => {
    if (!editDescription.trim()) {
      alert('Description cannot be empty');
      return;
    }
    const parsedHours = parseFloat(editHours);
    if (isNaN(parsedHours) || parsedHours <= 0) {
      alert('Please enter a valid amount of hours');
      return;
    }
    if (!editProject) {
      alert('Please select a project');
      return;
    }
    if (!editMember) {
      alert('Please select a team member');
      return;
    }

    const updatedEntry: TimesheetEntry = {
      id,
      projectId: editProject,
      teamMember: editMember,
      roleId: editRoleId || undefined,
      roleName: editRoleName || undefined,
      dayRate: editDayRate !== undefined ? editDayRate : undefined,
      hours: parsedHours,
      date: editDate,
      description: editDescription.trim(),
    };

    onUpdateEntry(updatedEntry);
    setEditingId(null);
  };

  // Trigger confirmation modal
  const handleDeleteTrigger = (entry: TimesheetEntry) => {
    setEntryToDelete(entry);
  };

  // Perform actual deletion after confirmation
  const executeDelete = () => {
    if (!entryToDelete) return;

    // Clear existing toast timers
    if (toastTimeoutId) {
      clearTimeout(toastTimeoutId);
    }

    // Delete item
    onDeleteEntry(entryToDelete.id);

    // Cache the deleted entry and display toast
    setToastEntry(entryToDelete);
    setShowToast(true);

    // Close modal
    setEntryToDelete(null);

    // Hide toast after 6 seconds
    const timeout = setTimeout(() => {
      setShowToast(false);
      setToastEntry(null);
    }, 6000);
    setToastTimeoutId(timeout);
  };

  // Trigger undo restore
  const handleUndo = () => {
    if (toastEntry) {
      onRestoreEntry(toastEntry);
      setShowToast(false);
      setToastEntry(null);
      if (toastTimeoutId) clearTimeout(toastTimeoutId);
    }
  };

  return (
    <div className="no-print bg-[#0a0a0a] border border-zinc-900 rounded-2xl p-6 shadow-2xl space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="eyebrow-label block mb-1">Weekly Records</span>
          <h2 className="text-xl font-display text-zinc-100 flex items-center gap-2">
            <Layers className="h-5 w-5 text-[#F5720A]" />
            Time <span className="text-[#F5720A]">Ledger</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5 font-sans">Explore, search, edit, and validate logged entries inline</p>
        </div>

        {/* Total stats computed over the filtered ledger */}
        <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl px-4 py-2 flex items-center gap-4 text-xs font-mono">
          <div>
            <span className="text-zinc-500 block">Total Logs</span>
            <span className="text-zinc-200 font-bold text-sm">{filteredEntries.length}</span>
          </div>
          <div className="border-l border-zinc-800 h-8"></div>
          <div>
            <span className="text-zinc-500 block">Total Hours</span>
            <span className="text-[#F5720A] font-bold text-sm">
              {filteredEntries.reduce((acc, curr) => acc + curr.hours, 0).toFixed(2)} hrs
            </span>
          </div>
        </div>
      </div>

      {/* FILTERS PANEL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-zinc-950/40 p-4 border border-zinc-900 rounded-xl">
        {/* Scope quick-toggle buttons */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 font-mono">
            Scope Filter
          </label>
          <div className="grid grid-cols-3 bg-zinc-950 rounded-lg p-1 border border-zinc-900">
            <button
              onClick={() => setScope('all')}
              className={`py-1.5 px-2 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                scope === 'all'
                  ? 'bg-[#F5720A]/10 text-[#F5720A] border border-[#F5720A]/20 shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              All Weeks
            </button>
            <button
              onClick={() => setScope('week')}
              className={`py-1.5 px-2 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                scope === 'week'
                  ? 'bg-[#F5720A]/10 text-[#F5720A] border border-[#F5720A]/20 shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              Selected Week
            </button>
            <button
              onClick={() => setScope('month')}
              className={`py-1.5 px-2 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                scope === 'month'
                  ? 'bg-[#F5720A]/10 text-[#F5720A] border border-[#F5720A]/20 shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              Select Month
            </button>
          </div>
        </div>

        {/* Dynamic Scope Details (Date picker/Month picker depending on scope selection) */}
        <div>
          {scope === 'week' && (
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 font-mono">
                Pick Filter Week
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={selectedWeekDate}
                  onChange={(e) => setSelectedWeekDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-[#F5720A] transition-all"
                />
                <p className="text-[10px] text-zinc-500 mt-1 font-mono">
                  Filtering week of: <span className="font-semibold text-[#F5720A]">{formatMondayOfDate(selectedWeekDate)}</span>
                </p>
              </div>
            </div>
          )}

          {scope === 'month' && (
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 font-mono">
                Choose Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-[#F5720A] transition-all"
              >
                {MONTHS.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m} (2026)
                  </option>
                ))}
              </select>
            </div>
          )}

          {scope === 'all' && (
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 font-mono">
                Scope Active
              </label>
              <div className="text-zinc-400 text-xs py-1.5 italic font-mono">
                Showing all history of logs.
              </div>
            </div>
          )}
        </div>

        {/* Project Filter */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 font-mono flex items-center justify-between">
            <span>Project Filter</span>
            {filterProjectId !== 'all' && (
              <button
                onClick={() => setFilterProjectId('all')}
                className="text-[9px] text-[#F5720A] hover:underline normal-case font-normal cursor-pointer"
              >
                Clear
              </button>
            )}
          </label>
          <select
            value={filterProjectId}
            onChange={(e) => setFilterProjectId(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-[#F5720A] transition-all"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.clientName} - {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Team Member Filter */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 font-mono flex items-center justify-between">
            <span>Team Member Filter</span>
            {filterMember !== 'all' && (
              <button
                onClick={() => setFilterMember('all')}
                className="text-[9px] text-[#F5720A] hover:underline normal-case font-normal cursor-pointer"
              >
                Clear
              </button>
            )}
          </label>
          <select
            value={filterMember}
            onChange={(e) => setFilterMember(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-[#F5720A] transition-all"
          >
            <option value="all">All Team Members</option>
            {uniqueTeamMembers.map((member) => (
              <option key={member} value={member}>
                {member}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* LEDGER ENTRIES LIST HEADER BAR */}
      <div className="flex items-center justify-between px-1 text-xs font-mono">
        <span className="text-zinc-400">
          Showing <span className="text-zinc-100 font-bold">{displayedEntries.length}</span> of <span className="text-zinc-100 font-bold">{sortedEntries.length}</span> entries
          {sortedEntries.length > 21 && (
            <span className="text-zinc-500 text-[11px] ml-2">
              {hasMore ? `(${sortedEntries.length - displayedEntries.length} more available below)` : '(All loaded)'}
            </span>
          )}
        </span>
      </div>

      {/* LEDGER ENTRIES TABLE */}
      <div className="overflow-x-auto border border-zinc-900 rounded-xl bg-zinc-950/20">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-zinc-950 text-zinc-400 border-b border-zinc-900 font-semibold tracking-wider font-mono">
              <th className="p-3.5">Details (Date / Member / Role)</th>
              <th className="p-3.5">Project</th>
              <th className="p-3.5">Accomplishment description</th>
              <th className="p-3.5 text-center">Hours</th>
              <th className="p-3.5 text-right font-mono">Burn</th>
              <th className="p-3.5 text-center w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900/60">
            {displayedEntries.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-zinc-500 italic">
                  No matching entries found for selected filters. Use the form above to record work logs.
                </td>
              </tr>
            ) : (
              displayedEntries.map((entry) => {
                const isEditing = editingId === entry.id;
                const projectObj = projects.find((p) => p.id === (isEditing ? editProject : entry.projectId));
                const activeRateCard = rateCards.find((rc) => rc.id === projectObj?.rateCardId);
                const activeTeamList = projectObj ? projectObj.teamMembers : [];

                let roleName = '';
                let dayRate = 0;

                if (isEditing) {
                  const currentRoleId = editRoleId;
                  let roleObj: { id?: string; role: string; hourlyCost: number } | undefined = undefined;
                  if (currentRoleId) {
                    roleObj = activeRateCard?.roles.find((r) => r.id === currentRoleId);
                    if (!roleObj) {
                      for (const card of rateCards) {
                        const found = card.roles.find((r) => r.id === currentRoleId);
                        if (found) {
                          roleObj = found;
                          break;
                        }
                      }
                    }
                  }
                  roleName = editRoleName || roleObj?.role || 'Advisory';
                  dayRate = editDayRate !== undefined ? editDayRate : (roleObj?.hourlyCost || 0);
                } else {
                  roleName = entry.roleName || '';
                  dayRate = entry.dayRate !== undefined ? entry.dayRate : 0;

                  if (!roleName || entry.dayRate === undefined) {
                    let roleObj: { id?: string; role: string; hourlyCost: number } | undefined = undefined;
                    if (entry.roleId) {
                      roleObj = activeRateCard?.roles.find((r) => r.id === entry.roleId);
                      if (!roleObj) {
                        for (const card of rateCards) {
                          const found = card.roles.find((r) => r.id === entry.roleId);
                          if (found) {
                            roleObj = found;
                            break;
                          }
                        }
                      }
                    }

                    if (!roleObj) {
                      const teamMemberObj = activeTeamList.find(
                        (m) => m.memberName.toLowerCase() === entry.teamMember.toLowerCase()
                      );
                      if (teamMemberObj?.roleId) {
                        roleObj = activeRateCard?.roles.find((r) => r.id === teamMemberObj.roleId);
                        if (!roleObj) {
                          for (const card of rateCards) {
                            const found = card.roles.find((r) => r.id === teamMemberObj.roleId);
                            if (found) {
                              roleObj = found;
                              break;
                            }
                          }
                        }
                      }
                    }

                    if (!roleName) roleName = roleObj?.role || 'Advisory';
                    if (entry.dayRate === undefined) dayRate = roleObj?.hourlyCost || 0;
                  }
                }

                const isNonBillable = !!projectObj?.isNonBillable;
                const hourlyRate = isNonBillable ? 0 : dayRate / 7;
                const displayHours = isEditing ? (parseFloat(editHours) || 0) : entry.hours;
                const burnCost = isNonBillable ? 0 : displayHours * hourlyRate;

                const sortedTeamListWithLabels = activeTeamList
                  .map((m, idx) => {
                    let rObj = activeRateCard?.roles.find((r) => r.id === m.roleId);
                    if (!rObj && m.roleId) {
                      for (const card of rateCards) {
                        const found = card.roles.find((r) => r.id === m.roleId);
                        if (found) {
                          rObj = found;
                          break;
                        }
                      }
                    }
                    const rName = rObj?.role || 'Advisory';
                    const hourlyCost = rObj?.hourlyCost || 0;
                    const label = `${rName} - ${m.memberName}`;
                    const key = `${m.memberName}::${m.roleId || idx}`;
                    return { ...m, roleName: rName, hourlyCost, label, key };
                  })
                  .sort((a, b) => a.label.localeCompare(b.label));

                const currentEditKey = sortedTeamListWithLabels.find(
                  (m) =>
                    m.memberName.toLowerCase() === editMember.toLowerCase() &&
                    (editRoleId ? m.roleId === editRoleId : true)
                )?.key || (sortedTeamListWithLabels[0]?.key || '');

                return (
                  <tr
                    key={entry.id}
                    className="hover:bg-zinc-900/40 transition-colors group"
                  >
                    {/* Column 1: Details (Week / Member / Role) */}
                    <td className="p-3.5 whitespace-nowrap">
                      {isEditing ? (
                        <div className="space-y-1.5 max-w-[170px]">
                          <div>
                            <span className="text-[10px] text-zinc-500 block font-mono">Date</span>
                            <input
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded p-1 text-[11px] text-zinc-200 focus:outline-none focus:border-[#F5720A]"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-500 block font-mono">Member</span>
                            <select
                              value={currentEditKey}
                              onChange={(e) => {
                                const selectedOpt = sortedTeamListWithLabels.find((m) => m.key === e.target.value);
                                if (selectedOpt) {
                                  setEditMember(selectedOpt.memberName);
                                  setEditRoleId(selectedOpt.roleId || '');
                                  setEditRoleName(selectedOpt.roleName);
                                  setEditDayRate(selectedOpt.hourlyCost);
                                }
                              }}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded p-1 text-[11px] text-zinc-200 focus:outline-none focus:border-[#F5720A]"
                            >
                              {sortedTeamListWithLabels.length === 0 ? (
                                <option value={entry.teamMember}>{entry.teamMember}</option>
                              ) : (
                                sortedTeamListWithLabels.map((m) => (
                                  <option key={m.key} value={m.key}>
                                    {m.label}
                                  </option>
                                ))
                              )}
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1.5 font-bold text-white font-mono">
                            <Calendar className="h-3 w-3 text-[#F5720A]" />
                            {formatActualDate(entry.date)}
                          </span>
                          <span className="text-[10px] text-zinc-400 block font-mono">
                            week starting: {formatMondayOfDate(entry.date)}
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <TeammateBadge name={entry.teamMember} email={entry.loggedByEmail} />
                            <span className="text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded font-mono font-medium">
                              {roleName}
                            </span>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Column 2: Project Selection */}
                    <td className="p-3.5 whitespace-nowrap">
                      {isEditing ? (
                        <select
                          value={editProject}
                          onChange={(e) => setEditProject(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded p-1 text-[11px] text-zinc-200 focus:outline-none focus:border-[#F5720A] max-w-[160px]"
                        >
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="space-y-1">
                          <span className="font-bold text-zinc-200 block">
                            {projects.find((p) => p.id === entry.projectId)?.name || 'Unknown Project'}
                          </span>
                          <span className="text-[10px] text-zinc-500 block font-mono">
                            {projects.find((p) => p.id === entry.projectId)?.clientName || 'N/A'}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Column 3: Comment / Description */}
                    <td className="p-3.5">
                      {isEditing ? (
                        <textarea
                          rows={2}
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-xs text-zinc-200 focus:outline-none focus:border-[#F5720A] resize-none min-w-[200px]"
                        />
                      ) : (
                        <p className="text-zinc-300 leading-relaxed text-xs break-words max-w-[320px]">
                          {entry.description}
                        </p>
                      )}
                    </td>

                    {/* Column 4: Hours */}
                    <td className="p-3.5 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.25"
                          min="0.25"
                          value={editHours}
                          onChange={(e) => setEditHours(e.target.value)}
                          className="w-16 bg-zinc-950 border border-zinc-800 rounded p-1 text-center text-[11px] text-[#F5720A] font-bold focus:outline-none focus:border-[#F5720A]"
                        />
                      ) : (
                        <span className="font-mono font-black text-[#F5720A] bg-[#F5720A]/10 px-2.5 py-1 rounded-md border border-[#F5720A]/15 block w-fit mx-auto text-center">
                          {entry.hours.toFixed(2)}
                        </span>
                      )}
                    </td>

                    {/* Column 5: Burn Cost */}
                    <td className="p-3.5 text-right font-mono whitespace-nowrap">
                      <span className={`font-bold block text-xs ${isNonBillable ? 'text-emerald-200/50' : 'text-emerald-400'}`}>
                        £{burnCost.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-zinc-500 block font-normal">
                        {isNonBillable ? '(Non-billable)' : dayRate > 0 ? `(£${dayRate.toLocaleString('en-GB')}/day)` : 'No rate card'}
                      </span>
                    </td>

                    {/* Column 5: Actions */}
                    <td className="p-3.5 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => saveEdit(entry.id)}
                            className="p-1 text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20 rounded transition-all cursor-pointer"
                            title="Save changes"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1 text-zinc-400 hover:bg-zinc-800 border border-zinc-700 rounded transition-all cursor-pointer"
                            title="Cancel edit"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEdit(entry)}
                            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-all cursor-pointer"
                            title="Edit entry"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTrigger(entry)}
                            className="p-1.5 text-red-500 hover:text-red-400 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/20 rounded-lg transition-all cursor-pointer"
                            title="Delete entry"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {sortedEntries.length > 0 && (
          <div className="border-t border-zinc-900 bg-zinc-950/70 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-zinc-400 font-mono flex flex-wrap items-center gap-2">
              <span>
                Showing <strong className="text-zinc-200">{displayedEntries.length}</strong> of <strong className="text-zinc-200">{sortedEntries.length}</strong> {sortedEntries.length === 1 ? 'record' : 'records'}
                {sortedEntries.length !== entries.length && (
                  <span className="text-zinc-500 text-[11px] ml-1">({entries.length} total across database)</span>
                )}
              </span>
              {(filterProjectId !== 'all' || filterMember !== 'all' || scope !== 'all') && (
                <span className="text-[11px] text-[#F5720A] bg-[#F5720A]/10 border border-[#F5720A]/20 px-2 py-0.5 rounded-md font-mono">
                  Filters Active
                </span>
              )}
            </div>

            {sortedEntries.length > 21 && (
              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                {hasMore && (
                  <button
                    onClick={() => setDisplayLimit((prev) => prev + 21)}
                    className="flex-1 sm:flex-none px-4 py-2 bg-[#F5720A] hover:bg-orange-hover text-zinc-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-[#F5720A]/10"
                  >
                    <ChevronDown className="h-3.5 w-3.5 stroke-[2.5px]" />
                    <span>Show Next {nextCount}</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    if (!hasMore) {
                      setDisplayLimit(21);
                    } else {
                      setDisplayLimit(sortedEntries.length);
                    }
                  }}
                  className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {!hasMore ? (
                    <>
                      <RotateCcw className="h-3.5 w-3.5 text-zinc-400" />
                      <span>Show First 21</span>
                    </>
                  ) : (
                    <span>Show All ({sortedEntries.length})</span>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* UNDO DELETION TOAST (Floating at the bottom right) */}
      {showToast && toastEntry && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 border border-zinc-800 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom duration-300">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
          <div>
            <p className="text-xs text-zinc-200 font-semibold">Effort entry deleted</p>
            <p className="text-[10px] text-zinc-400 italic truncate max-w-[200px]">
              "{toastEntry.description}"
            </p>
          </div>
          <button
            onClick={handleUndo}
            className="px-3 py-1.5 bg-[#F5720A] hover:bg-orange-hover text-zinc-950 font-bold rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer shadow-md"
          >
            <Undo2 className="h-3 w-3 stroke-[2.5px]" />
            Undo
          </button>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {entryToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div id="delete-confirm-modal" className="bg-zinc-900 border border-zinc-800 max-w-md w-full rounded-2xl p-6 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Top red bar for danger context */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-red-500"></div>

            <div className="flex items-center gap-3 text-red-500 mb-3.5">
              <Trash2 className="h-6 w-6" />
              <h3 className="text-md font-bold text-zinc-100">Delete Timesheet Entry?</h3>
            </div>

            <div className="text-xs text-zinc-400 space-y-3 mb-6 leading-relaxed">
              <p>
                Are you sure you want to delete this log? This action will remove the record from the shared ledger.
              </p>
              
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-850 space-y-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-zinc-500 font-mono">Date:</span>
                  <span className="text-zinc-300 font-mono font-medium">{new Date(entryToDelete.date).toLocaleDateString('en-GB')}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-zinc-500 font-mono">Team Member:</span>
                  <span className="text-zinc-300 font-medium">{entryToDelete.teamMember}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-zinc-500 font-mono">Project:</span>
                  <span className="text-zinc-300 font-medium truncate max-w-[200px]">
                    {projects.find((p) => p.id === entryToDelete.projectId)?.name || 'Unknown Project'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-zinc-500 font-mono">Hours Logged:</span>
                  <span className="text-[#F5720A] font-bold font-mono bg-[#F5720A]/10 px-1.5 py-0.5 rounded border border-[#F5720A]/10">
                    {entryToDelete.hours.toFixed(2)} hrs
                  </span>
                </div>
                {entryToDelete.description && (
                  <div className="pt-1.5 border-t border-zinc-900">
                    <span className="text-[10px] text-zinc-500 block font-mono mb-1">Description:</span>
                    <p className="text-[11px] text-zinc-300 italic line-clamp-2">
                      "{entryToDelete.description}"
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                id="cancel-delete-btn"
                onClick={() => setEntryToDelete(null)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold py-2.5 rounded-xl border border-zinc-700 text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-btn"
                onClick={executeDelete}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
