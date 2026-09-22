import React, { useState, useMemo, useEffect } from 'react';
import { Project, TimesheetEntry, RateCard } from '../types';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Save,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Building2,
  Sparkles,
  Layers,
  Trash2,
  Check,
  RotateCcw
} from 'lucide-react';

interface WeeklyMatrixGridProps {
  entries: TimesheetEntry[];
  projects: Project[];
  rateCards: RateCard[];
  globalMembers: string[];
  currentUserEmail?: string;
  currentUserName?: string;
  isConnected: boolean;
  onConnectSheet?: () => void;
  onBatchUpsertEntries: (entriesToUpsert: TimesheetEntry[], entryIdsToDelete: string[]) => Promise<void> | void;
}

interface CellValue {
  hours: number;
  description: string;
  entryId?: string;
  isDirty?: boolean;
}

export default function WeeklyMatrixGrid({
  entries,
  projects,
  rateCards,
  globalMembers,
  currentUserEmail,
  currentUserName,
  isConnected,
  onConnectSheet,
  onBatchUpsertEntries,
}: WeeklyMatrixGridProps) {
  // 1. Current week selection state (defaults to current date's week)
  const [selectedWeekDate, setSelectedWeekDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // 2. Selected Team Member
  const allTeamMembers = useMemo(() => {
    const memberSet = new Set<string>();
    globalMembers.forEach((m) => {
      if (m && m.trim()) memberSet.add(m.trim());
    });
    projects.forEach((p) => {
      p.teamMembers?.forEach((tm) => {
        if (tm.memberName && tm.memberName.trim()) memberSet.add(tm.memberName.trim());
      });
    });
    entries.forEach((e) => {
      if (e.teamMember && e.teamMember.trim()) memberSet.add(e.teamMember.trim());
    });
    return Array.from(memberSet).sort((a, b) => a.localeCompare(b));
  }, [globalMembers, projects, entries]);

  const [selectedMember, setSelectedMember] = useState<string>(() => {
    if (currentUserName && allTeamMembers.includes(currentUserName)) return currentUserName;
    return allTeamMembers[0] || '';
  });

  // Ensure selectedMember is valid when members list changes
  useEffect(() => {
    if (!selectedMember && allTeamMembers.length > 0) {
      if (currentUserName && allTeamMembers.includes(currentUserName)) {
        setSelectedMember(currentUserName);
      } else {
        setSelectedMember(allTeamMembers[0]);
      }
    }
  }, [allTeamMembers, currentUserName, selectedMember]);

  // 3. Helper to get Monday of a date
  const getMonday = (dStr: string) => {
    const d = new Date(dStr);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d.setDate(diff));
    return mon;
  };

  const monday = useMemo(() => getMonday(selectedWeekDate), [selectedWeekDate]);

  // Format YYYY-MM-DD
  const formatYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayStr = useMemo(() => formatYMD(new Date()), []);

  // 7 Days: Monday - Sunday
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      const dateStr = formatYMD(d);
      return {
        dateStr,
        dayName: d.toLocaleDateString('en-GB', { weekday: 'short' }),
        shortDate: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        isToday: dateStr === todayStr,
      };
    });
  }, [monday, todayStr]);

  const weekRangeLabel = useMemo(() => {
    const sun = new Date(monday);
    sun.setDate(monday.getDate() + 6);
    return `${monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${sun.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }, [monday]);

  const handlePrevWeek = () => {
    const prev = new Date(monday);
    prev.setDate(monday.getDate() - 7);
    setSelectedWeekDate(formatYMD(prev));
  };

  const handleNextWeek = () => {
    const next = new Date(monday);
    next.setDate(monday.getDate() + 7);
    setSelectedWeekDate(formatYMD(next));
  };

  const handleCurrentWeek = () => {
    setSelectedWeekDate(formatYMD(new Date()));
  };

  // Additional projects manually added by user for this week
  const [extraProjectIds, setExtraProjectIds] = useState<string[]>([]);

  // Project rows for the selected member
  const matrixProjects = useMemo(() => {
    if (!selectedMember) return [];

    const normMember = selectedMember.toLowerCase();

    // 1. Projects where member is explicitly assigned
    const assignedProjects = projects.filter((p) => {
      return p.teamMembers?.some((tm) => tm.memberName.toLowerCase() === normMember);
    });

    // 2. Extra manually added projects
    const extraProjects = projects.filter(
      (p) => extraProjectIds.includes(p.id) && !assignedProjects.some((ap) => ap.id === p.id)
    );

    // 3. Projects that already have entries logged for this member this week
    const weekStart = weekDays[0].dateStr;
    const weekEnd = weekDays[6].dateStr;
    const loggedProjectIds = new Set(
      entries
        .filter(
          (e) =>
            e.teamMember.toLowerCase() === normMember &&
            e.date >= weekStart &&
            e.date <= weekEnd &&
            e.hours > 0
        )
        .map((e) => e.projectId)
    );

    const loggedProjects = projects.filter(
      (p) =>
        loggedProjectIds.has(p.id) &&
        !assignedProjects.some((ap) => ap.id === p.id) &&
        !extraProjects.some((ep) => ep.id === p.id)
    );

    const combined = [...assignedProjects, ...extraProjects, ...loggedProjects];

    // Sort: Active first, then by Client and Name
    return combined.sort((a, b) => {
      if (!!a.isCompleted !== !!b.isCompleted) return a.isCompleted ? 1 : -1;
      const c = a.clientName.localeCompare(b.clientName);
      if (c !== 0) return c;
      return a.name.localeCompare(b.name);
    });
  }, [selectedMember, projects, extraProjectIds, entries, weekDays]);

  // Matrix State: map of `projectId__dateStr` -> CellValue
  const [matrixCells, setMatrixCells] = useState<Record<string, CellValue>>({});
  const [activeCellKey, setActiveCellKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Synchronize local matrix state with entries whenever week, member, or entries change
  useEffect(() => {
    if (!selectedMember) return;

    const normMember = selectedMember.toLowerCase();
    const weekStart = weekDays[0].dateStr;
    const weekEnd = weekDays[6].dateStr;

    const relevantEntries = entries.filter(
      (e) =>
        e.teamMember.toLowerCase() === normMember &&
        e.date >= weekStart &&
        e.date <= weekEnd
    );

    const newCells: { [key: string]: CellValue } = {};

    relevantEntries.forEach((e) => {
      const key = `${e.projectId}__${e.date}`;
      newCells[key] = {
        hours: e.hours,
        description: e.description || '',
        entryId: e.id,
        isDirty: false,
      };
    });

    setMatrixCells(newCells);
  }, [selectedMember, weekDays, entries]);

  // Cell change handler
  const handleHoursChange = (projectId: string, dateStr: string, rawVal: string) => {
    const key = `${projectId}__${dateStr}`;
    const parsed = parseFloat(rawVal);
    const newHours = isNaN(parsed) ? 0 : Math.max(0, Math.min(24, parsed));

    setMatrixCells((prev) => {
      const existing = prev[key] || { hours: 0, description: '' };
      return {
        ...prev,
        [key]: {
          ...existing,
          hours: newHours,
          isDirty: true,
        },
      };
    });
  };

  const handleDescriptionChange = (projectId: string, dateStr: string, desc: string) => {
    const key = `${projectId}__${dateStr}`;
    setMatrixCells((prev) => {
      const existing = prev[key] || { hours: 0, description: '' };
      return {
        ...prev,
        [key]: {
          ...existing,
          description: desc,
          isDirty: true,
        },
      };
    });
  };

  // Quick fill helper: Fill Mon-Fri with specified hours (e.g., 7h)
  const handleQuickFillWeek = (projectId: string, fillHours = 7) => {
    setMatrixCells((prev) => {
      const updated = { ...prev };
      // Mon-Fri (idx 0 to 4)
      for (let i = 0; i < 5; i++) {
        const dateStr = weekDays[i].dateStr;
        const key = `${projectId}__${dateStr}`;
        const existing = updated[key] || { hours: 0, description: '' };
        updated[key] = {
          ...existing,
          hours: fillHours,
          description: existing.description || `Standard ${fillHours}h delivery log for ${selectedMember}`,
          isDirty: true,
        };
      }
      return updated;
    });
  };

  // Clear row hours
  const handleClearRow = (projectId: string) => {
    setMatrixCells((prev) => {
      const updated = { ...prev };
      weekDays.forEach((d) => {
        const key = `${projectId}__${d.dateStr}`;
        if (updated[key]) {
          updated[key] = {
            ...updated[key],
            hours: 0,
            isDirty: true,
          };
        }
      });
      return updated;
    });
  };

  // Check if there are dirty unsaved changes
  const hasDirtyChanges = useMemo(() => {
    return (Object.values(matrixCells) as CellValue[]).some((c) => Boolean(c.isDirty));
  }, [matrixCells]);

  // Save changes to Google Sheets & database
  const handleSaveChanges = async () => {
    if (!selectedMember) return;
    if (!isConnected && onConnectSheet) {
      onConnectSheet();
      return;
    }

    setIsSaving(true);
    setSaveSuccessMsg(null);

    try {
      const entriesToUpsert: TimesheetEntry[] = [];
      const entryIdsToDelete: string[] = [];

      (Object.entries(matrixCells) as [string, CellValue][]).forEach(([key, cell]) => {
        if (!cell.isDirty) return;

        const [projId, dateStr] = key.split('__');
        const proj = projects.find((p) => p.id === projId);
        const rateCard = rateCards.find((rc) => rc.id === proj?.rateCardId);

        // Find member's assigned role for this project
        const memberAssignment = proj?.teamMembers?.find(
          (tm) => tm.memberName.toLowerCase() === selectedMember.toLowerCase()
        );
        const roleObj = rateCard?.roles.find((r) => r.id === memberAssignment?.roleId);

        if (cell.hours > 0) {
          const entryId = cell.entryId || `entry-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          const dayName = new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'short' });
          const defaultDesc = `Weekly matrix log: ${proj?.name || 'Project'} (${dayName} - ${cell.hours}h)`;

          const entry: TimesheetEntry = {
            id: entryId,
            projectId: projId,
            teamMember: selectedMember,
            roleId: memberAssignment?.roleId || roleObj?.id,
            roleName: roleObj?.role || 'Advisory',
            dayRate: roleObj?.hourlyCost || 0,
            hours: cell.hours,
            date: dateStr,
            description: cell.description.trim() || defaultDesc,
            loggedByName: currentUserName || selectedMember,
            loggedByEmail: currentUserEmail,
          };
          entriesToUpsert.push(entry);
        } else if (cell.entryId) {
          // If hours is 0 and entry previously existed, delete it
          entryIdsToDelete.push(cell.entryId);
        }
      });

      if (entriesToUpsert.length > 0 || entryIdsToDelete.length > 0) {
        await onBatchUpsertEntries(entriesToUpsert, entryIdsToDelete);
      }

      // Mark cells as clean
      setMatrixCells((prev) => {
        const clean: Record<string, CellValue> = {};
        (Object.entries(prev) as [string, CellValue][]).forEach(([k, v]) => {
          clean[k] = { ...v, isDirty: false };
        });
        return clean;
      });

      setSaveSuccessMsg(`Weekly timesheet synced to Google Sheets (${entriesToUpsert.length} updated/added)`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to save matrix entries:', err);
      alert(`Error saving weekly timesheet: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate Column Totals (per day)
  const dailyTotals = useMemo(() => {
    return weekDays.map((day) => {
      let totalHours = 0;
      matrixProjects.forEach((proj) => {
        const key = `${proj.id}__${day.dateStr}`;
        const cell = matrixCells[key];
        if (cell && cell.hours > 0) {
          totalHours += cell.hours;
        }
      });
      return totalHours;
    });
  }, [weekDays, matrixProjects, matrixCells]);

  const grandTotalWeeklyHours = useMemo(() => {
    return dailyTotals.reduce((sum, h) => sum + h, 0);
  }, [dailyTotals]);

  // Estimated gross billable spend for the week
  const weeklyEstimatedSpend = useMemo(() => {
    let spend = 0;
    matrixProjects.forEach((proj) => {
      if (proj.isNonBillable) return;
      const rateCard = rateCards.find((rc) => rc.id === proj.rateCardId);
      const memberAssignment = proj.teamMembers?.find(
        (tm) => tm.memberName.toLowerCase() === selectedMember.toLowerCase()
      );
      const dayRate = rateCard?.roles.find((r) => r.id === memberAssignment?.roleId)?.hourlyCost || 0;
      const hourlyRate = dayRate / 7;

      weekDays.forEach((day) => {
        const key = `${proj.id}__${day.dateStr}`;
        const cell = matrixCells[key];
        if (cell && cell.hours > 0) {
          spend += cell.hours * hourlyRate;
        }
      });
    });
    return spend;
  }, [matrixProjects, rateCards, selectedMember, weekDays, matrixCells]);

  return (
    <div id="timesheet-weekly-matrix-grid" className="no-print bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden space-y-6">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#F5720A]"></div>

      {/* Top Header Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <span className="eyebrow-label block mb-1">Weekly Logging</span>
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#F5720A]" />
            Weekly Timesheet Matrix
          </h2>
        </div>

        {/* Member Selector + Week Traversal + Save Action */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Member Picker */}
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 h-10">
            <User className="h-4 w-4 text-[#F5720A] shrink-0" />
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="bg-transparent text-xs font-bold text-zinc-200 focus:outline-none cursor-pointer pr-2"
            >
              {allTeamMembers.map((m) => (
                <option key={m} value={m} className="bg-zinc-900 text-zinc-200">
                  {m} {m === currentUserName ? '(You)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Week Traversal Controls */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1 h-10">
            <button
              type="button"
              onClick={handlePrevWeek}
              className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-lg transition-all cursor-pointer"
              title="Previous Week"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-xs font-mono font-bold text-zinc-200 whitespace-nowrap">
              {weekRangeLabel}
            </span>
            <button
              type="button"
              onClick={handleNextWeek}
              className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-lg transition-all cursor-pointer"
              title="Next Week"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleCurrentWeek}
              className="ml-1 px-2.5 py-1 text-[11px] font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-all cursor-pointer"
              title="Jump to Current Week"
            >
              This Week
            </button>
          </div>

          {/* Save Button - Only shown when changes need to be saved or while syncing */}
          {(hasDirtyChanges || isSaving) && (
            <button
              type="button"
              id="btn-save-weekly-matrix"
              onClick={handleSaveChanges}
              disabled={isSaving}
              className="h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md bg-[#F5720A] hover:bg-[#e06606] text-zinc-950 font-black animate-pulse shadow-[#F5720A]/20"
            >
              {isSaving ? (
                <>
                  <RotateCcw className="h-4 w-4 animate-spin text-zinc-950" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 text-zinc-950 stroke-[2.5px]" />
                  <span>Save to Sheets</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Save Success Alert Banner */}
      {saveSuccessMsg && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2.5 rounded-xl text-xs font-mono font-semibold">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Disconnected Warning Alert */}
      {!isConnected && (
        <div className="flex items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 px-4 py-2.5 rounded-xl text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>Google Sheets not connected. Connect your Google account to sync timesheet logs directly to the spreadsheet.</span>
          </div>
          {onConnectSheet && (
            <button
              onClick={onConnectSheet}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs shrink-0 cursor-pointer"
            >
              Connect Sheets
            </button>
          )}
        </div>
      )}

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
          <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold block">Weekly Hours</span>
          <div className="text-xl font-black font-mono text-zinc-100 mt-0.5">
            {grandTotalWeeklyHours.toFixed(1)} <span className="text-xs text-zinc-400">hrs</span>
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
          <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold block">Billable Value</span>
          <div className="text-xl font-black font-mono text-[#F5720A] mt-0.5">
            £{weeklyEstimatedSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
          <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold block">Active Project Rows</span>
          <div className="text-xl font-black font-mono text-zinc-200 mt-0.5">
            {matrixProjects.length}
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
          <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold block">Standard Day Pace</span>
          <div className="text-xs font-mono font-semibold text-zinc-300 mt-1 flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
              7.0h / day target
            </span>
          </div>
        </div>
      </div>

      {/* THE MONDAY - SUNDAY MATRIX TABLE */}
      <div className="overflow-x-auto border border-zinc-800 rounded-xl bg-zinc-950">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 font-mono text-[11px] uppercase">
              <th className="py-3 px-4 min-w-[240px]">Project & Role</th>
              {weekDays.map((day) => (
                <th
                  key={day.dateStr}
                  className={`py-3 px-2 text-center min-w-[85px] transition-all ${
                    day.isToday ? 'bg-[#F5720A]/10 text-[#F5720A] border-b-2 border-[#F5720A]' : ''
                  }`}
                >
                  <div className="font-bold">{day.dayName}</div>
                  <div className="text-[9px] text-zinc-500 normal-case">{day.shortDate}</div>
                </th>
              ))}
              <th className="py-3 px-3 text-center min-w-[75px] bg-zinc-900 text-zinc-200 border-l border-zinc-800">Total</th>
              <th className="py-3 px-3 text-right min-w-[90px] bg-zinc-900 text-[#F5720A] border-l border-zinc-800">Spend (£)</th>
              <th className="py-3 px-2 text-center min-w-[65px] border-l border-zinc-800">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-800/60 font-mono text-xs">
            {matrixProjects.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-zinc-500 italic">
                  <div className="space-y-2">
                    <p>No assigned projects found for {selectedMember} this week.</p>
                    <p className="text-[11px] text-zinc-600">Use the selector below to add any project to this week's grid.</p>
                  </div>
                </td>
              </tr>
            ) : (
              matrixProjects.map((proj) => {
                const rateCard = rateCards.find((rc) => rc.id === proj.rateCardId);
                const memberAssignment = proj.teamMembers?.find(
                  (tm) => tm.memberName.toLowerCase() === selectedMember.toLowerCase()
                );
                const roleObj = rateCard?.roles.find((r) => r.id === memberAssignment?.roleId);
                const dayRate = roleObj?.hourlyCost || 0;
                const hourlyRate = dayRate / 7;

                // Row total hours
                let rowHours = 0;
                weekDays.forEach((day) => {
                  const key = `${proj.id}__${day.dateStr}`;
                  rowHours += matrixCells[key]?.hours || 0;
                });

                const rowSpend = proj.isNonBillable ? 0 : rowHours * hourlyRate;

                return (
                  <tr key={proj.id} className="hover:bg-zinc-900/30 transition-all group">
                    {/* Project & Role Info */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-zinc-100 flex items-center gap-1.5">
                        <span>{proj.name}</span>
                        {proj.isCompleted && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-zinc-900 text-zinc-400 border border-zinc-800 rounded">
                            Done
                          </span>
                        )}
                        {proj.isNonBillable && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
                            Non-billable
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[10px] text-zinc-400">
                        <span className="bg-zinc-900 px-1.5 py-0.2 rounded font-semibold text-zinc-300">
                          {proj.clientName}
                        </span>
                        <span>•</span>
                        <span className="text-[#F5720A]">{roleObj?.role || 'Advisory'}</span>
                        {!proj.isNonBillable && dayRate > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-zinc-500">£{dayRate}/d</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* 7 Day Matrix Inputs */}
                    {weekDays.map((day) => {
                      const cellKey = `${proj.id}__${day.dateStr}`;
                      const cell = matrixCells[cellKey] || { hours: 0, description: '' };
                      const hasNote = cell.description && cell.description.trim().length > 0;
                      const isCellActive = activeCellKey === cellKey;

                      return (
                        <td
                          key={day.dateStr}
                          className={`p-1.5 text-center relative ${
                            day.isToday ? 'bg-[#F5720A]/5' : ''
                          }`}
                        >
                          <div className="relative flex flex-col items-center">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max="24"
                              value={cell.hours === 0 ? '' : cell.hours}
                              placeholder="-"
                              onChange={(e) => handleHoursChange(proj.id, day.dateStr, e.target.value)}
                              onFocus={() => setActiveCellKey(cellKey)}
                              className={`matrix-cell-input w-14 h-9 text-center rounded-lg font-mono text-xs font-bold transition-all focus:outline-none focus:ring-1 ${
                                cell.hours > 0
                                  ? cell.hours >= 7
                                    ? 'hours-target bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 focus:ring-emerald-400'
                                    : 'hours-entered bg-zinc-900 border border-zinc-700 text-zinc-100 focus:ring-[#F5720A]'
                                  : 'hours-empty bg-zinc-900/40 border border-zinc-800/60 text-zinc-500 hover:border-zinc-700 focus:border-[#F5720A]'
                              } ${cell.isDirty ? 'cell-dirty ring-1 ring-amber-400/80 border-amber-400' : ''}`}
                            />

                            {/* Note indicator badge / toggle */}
                            {cell.hours > 0 && (
                              <button
                                type="button"
                                onClick={() => setActiveCellKey(isCellActive ? null : cellKey)}
                                className={`absolute -bottom-1 -right-1 p-0.5 rounded cursor-pointer ${
                                  hasNote ? 'text-[#F5720A]' : 'text-zinc-600 hover:text-zinc-400'
                                }`}
                                title={hasNote ? `Note: "${cell.description}"` : 'Add note/narrative'}
                              >
                                <FileText className="h-3 w-3" />
                              </button>
                            )}

                            {/* Inline Note Drawer Popup */}
                            {isCellActive && cell.hours > 0 && (
                              <div className="task-narrative-popover absolute top-11 z-30 w-56 p-2.5 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl text-left space-y-2 left-1/2 -translate-x-1/2">
                                <div className="flex items-center justify-between text-[10px] text-zinc-400 font-sans">
                                  <span className="font-bold text-zinc-200">Task Narrative</span>
                                  <button
                                    type="button"
                                    onClick={() => setActiveCellKey(null)}
                                    className="text-zinc-400 hover:text-white cursor-pointer"
                                  >
                                    ✕
                                  </button>
                                </div>
                                <textarea
                                  rows={2}
                                  value={cell.description}
                                  placeholder="Describe deliverables / milestone achieved..."
                                  onChange={(e) => handleDescriptionChange(proj.id, day.dateStr, e.target.value)}
                                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-1.5 text-[11px] text-zinc-200 font-sans focus:outline-none focus:border-[#F5720A]"
                                />
                                <div className="flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => setActiveCellKey(null)}
                                    className="px-2 py-0.5 bg-[#F5720A] text-zinc-950 font-bold text-[10px] rounded cursor-pointer"
                                  >
                                    Done
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    {/* Row Total Hours */}
                    <td className="py-3 px-3 text-center font-mono font-black text-zinc-100 bg-zinc-900/40">
                      {rowHours > 0 ? (
                        <span className={rowHours >= 35 ? 'text-emerald-400' : 'text-zinc-200'}>
                          {rowHours.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>

                    {/* Row Total Spend */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#F5720A] bg-zinc-900/40">
                      {rowSpend > 0 ? (
                        `£${rowSpend.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>

                    {/* Row Quick Action Tools */}
                    <td className="py-3 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleQuickFillWeek(proj.id, 7)}
                          className="px-1.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded text-[10px] font-mono transition-all cursor-pointer"
                          title="Fill Mon-Fri with standard 7h per day"
                        >
                          7h×5
                        </button>
                        <button
                          type="button"
                          onClick={() => handleClearRow(proj.id)}
                          className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-rose-400 rounded transition-all cursor-pointer"
                          title="Clear row hours"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}

            {/* Column Totals Row */}
            {matrixProjects.length > 0 && (
              <tr className="bg-zinc-900/80 font-bold border-t-2 border-zinc-800 font-mono">
                <td className="py-3 px-4 text-right text-zinc-400 text-xs">
                  Daily Hours Logged:
                </td>
                {dailyTotals.map((tot, idx) => (
                  <td
                    key={idx}
                    className={`py-3 px-2 text-center transition-all ${
                      weekDays[idx].isToday ? 'bg-[#F5720A]/10 text-[#F5720A]' : 'text-zinc-200'
                    }`}
                  >
                    <div className="font-mono text-xs font-black">
                      {tot > 0 ? tot.toFixed(1) : '-'}
                    </div>
                    {tot >= 7 && (
                      <span className="text-[9px] text-emerald-400 flex items-center justify-center gap-0.5">
                        <CheckCircle2 className="h-2.5 w-2.5 inline" /> Target
                      </span>
                    )}
                  </td>
                ))}
                <td className="py-3 px-3 text-center font-mono font-black text-emerald-400 bg-zinc-900 text-sm">
                  {grandTotalWeeklyHours.toFixed(1)}
                </td>
                <td className="py-3 px-3 text-right font-mono font-black text-[#F5720A] bg-zinc-900 text-sm">
                  £{weeklyEstimatedSpend.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </td>
                <td className="py-3 px-2"></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Action Footer: Add Project to Row Matrix */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-zinc-900/60">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 font-mono">Add project row:</span>
          <select
            onChange={(e) => {
              if (e.target.value) {
                setExtraProjectIds((prev) => [...prev, e.target.value]);
                e.target.value = '';
              }
            }}
            defaultValue=""
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-[#F5720A] cursor-pointer"
          >
            <option value="" disabled>
              + Select project to add to this week...
            </option>
            {projects
              .filter((p) => !matrixProjects.some((mp) => mp.id === p.id))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.clientName} - {p.name} {p.isCompleted ? '(Completed)' : ''}
                </option>
              ))}
          </select>
        </div>

        <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono">
          <span>Tip: Click cell to edit hours • Hover speech bubble to write narrative</span>
          {hasDirtyChanges && (
            <span className="text-amber-400 font-bold animate-pulse">
              ● Unsaved changes
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
