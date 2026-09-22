import React, { useState, useRef, useMemo } from 'react';
import { Project, TimesheetEntry, RateCard } from '../types';
import TeammateBadge from './TeammateBadge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line
} from 'recharts';
import { Download, BarChart2, PieChart as PieIcon, ChevronLeft, ChevronRight, FileText, ChevronDown, Award, CheckCircle, CheckCircle2, RotateCcw, AlertTriangle, TrendingUp, TrendingDown, DollarSign, Calendar, ListTodo, Users, Briefcase, Search, ArrowUpDown, ShieldCheck, Layers } from 'lucide-react';

const ROLE_COLORS = [
  '#F5720A', // Orange theme primary accent
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#14b8a6', // Teal
  '#a855f7', // Purple
  '#6366f1', // Indigo
];

interface WeeklyReportProps {
  entries: TimesheetEntry[];
  projects: Project[];
  rateCards: RateCard[];
  onUpdateProject?: (project: Project) => void;
}

export default function WeeklyReport({ entries, projects, rateCards, onUpdateProject }: WeeklyReportProps) {
  const dateInputRef = useRef<HTMLInputElement>(null);
  // Current week state (defaults to current date, aligning with this week)
  const [selectedWeekDate, setSelectedWeekDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [periodMode, setPeriodMode] = useState<'timeline' | 'profitability' | 'monthly' | 'weekly'>('timeline');

  const activeProject = projects.find((p) => p.id === selectedProjectId);

  const getTodayYmd = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isProjectDone = (proj: Project) => {
    return !!proj.isCompleted;
  };

  const hasEndDatePassed = (proj: Project) => {
    if (proj.isCompleted) return false;
    if (!proj.endDate) return false;
    return proj.endDate < getTodayYmd();
  };

  const getProjectFinancials = (proj: Project) => {
    if (proj.isNonBillable) {
      return { budget: 0, actualLoggedCost: 0, backlogEarnings: 0 };
    }

    const rc = rateCards.find((card) => card.id === proj.rateCardId);
    
    // Scoped Budget based on number of allocated days * day rate - discount + expense
    const budget = proj.teamMembers.reduce((sum, m) => {
      const dayRate = rc?.roles.find((r) => r.id === m.roleId)?.hourlyCost || 0;
      const allocatedDays = m.hoursAllocated / 7;
      return sum + allocatedDays * dayRate;
    }, 0) - (proj.discount || 0) + (proj.expense || 0);

    // Actual Logged Cost (across all timesheet entries ever logged)
    const actualLoggedCost = entries
      .filter((e) => e.projectId === proj.id)
      .reduce((sum, e) => {
        const projMember = proj.teamMembers.find((m) => m.memberName.toLowerCase() === e.teamMember.toLowerCase());
        const dayRate = rc?.roles.find((r) => r.id === projMember?.roleId)?.hourlyCost || 0;
        const hourlyRate = dayRate / 7;
        return sum + e.hours * hourlyRate;
      }, 0);

    const backlogEarnings = Math.max(0, budget - actualLoggedCost);
    
    return { budget, actualLoggedCost, backlogEarnings };
  };

  const getEntryFinancialDetails = (entry: TimesheetEntry) => {
    const proj = projects.find(p => p.id === entry.projectId);
    if (proj?.isNonBillable) {
      return {
        rate: 0,
        dayRate: 0,
        role: entry.roleName || 'Non-billable',
        spend: 0,
        rateCardName: 'Non-billable',
        project: proj
      };
    }

    const rc = proj ? rateCards.find(c => c.id === proj.rateCardId) : undefined;
    
    let roleName = entry.roleName;
    let dayRate = entry.dayRate;

    if (!roleName || dayRate === undefined) {
      let roleObj: { id?: string; role: string; hourlyCost: number } | undefined = undefined;

      if (entry.roleId) {
        if (rc) {
          roleObj = rc.roles.find(r => r.id === entry.roleId);
        }
        if (!roleObj) {
          for (const card of rateCards) {
            const found = card.roles.find(r => r.id === entry.roleId);
            if (found) {
              roleObj = found;
              break;
            }
          }
        }
      }

      if (!roleObj && proj) {
        const projMember = proj.teamMembers.find(m => m.memberName.toLowerCase() === entry.teamMember.toLowerCase());
        if (projMember?.roleId) {
          if (rc) {
            roleObj = rc.roles.find(r => r.id === projMember.roleId);
          }
          if (!roleObj) {
            for (const card of rateCards) {
              const found = card.roles.find(r => r.id === projMember.roleId);
              if (found) {
                roleObj = found;
                break;
              }
            }
          }
        }
      }

      if (!roleName) roleName = roleObj?.role || 'Advisory';
      if (dayRate === undefined) dayRate = roleObj?.hourlyCost || 0;
    }

    const hourlyRate = dayRate / 7;
    const spend = entry.hours * hourlyRate;
    return {
      rate: hourlyRate,
      dayRate,
      role: roleName,
      spend,
      rateCardName: rc?.name || 'N/A',
      project: proj
    };
  };

  const getMonthRange = (dStr: string) => {
    const d = new Date(dStr);
    const year = d.getFullYear();
    const month = d.getMonth(); // 0-indexed
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const firstStr = firstDay.toISOString().split('T')[0];
    const lastStr = lastDay.toISOString().split('T')[0];
    return { firstStr, lastStr, year, monthLabel: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) };
  };

  // Helper to get Monday of a date
  const getMonday = (dStr: string) => {
    const d = new Date(dStr);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d.setDate(diff));
    return mon;
  };

  const monday = getMonday(selectedWeekDate);

  // Generate date strings for Mon-Sun
  const weekDays = Array.from({ length: 7 }, (_, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    return {
      dateStr: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('en-GB', { weekday: 'short' }),
      label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    };
  });

  // Traversing weeks
  const handlePrevWeek = () => {
    const prev = new Date(monday);
    prev.setDate(monday.getDate() - 7);
    setSelectedWeekDate(prev.toISOString().split('T')[0]);
  };

  const handleNextWeek = () => {
    const next = new Date(monday);
    next.setDate(monday.getDate() + 7);
    setSelectedWeekDate(next.toISOString().split('T')[0]);
  };

  // Group actual logged entries of the selected week by Project + Team Member
  const weekStartStr = weekDays[0].dateStr;
  const weekEndStr = weekDays[6].dateStr;

  const currentWeekEntries = entries.filter(
    (e) => e.date >= weekStartStr && e.date <= weekEndStr && (!selectedProjectId || e.projectId === selectedProjectId)
  );

  // Rows of grid: Unique combinations of (projectId + teamMember)
  const rowKeys: { projectId: string; teamMember: string }[] = [];
  currentWeekEntries.forEach((e) => {
    if (
      !rowKeys.some(
        (rk) => rk.projectId === e.projectId && rk.teamMember === e.teamMember
      )
    ) {
      rowKeys.push({ projectId: e.projectId, teamMember: e.teamMember });
    }
  });

  // Calculate day-by-day hours for each unique row combination
  const gridData = rowKeys.map(({ projectId, teamMember }) => {
    const projObj = projects.find((p) => p.id === projectId);
    const memberEntries = currentWeekEntries.filter(
      (e) => e.projectId === projectId && e.teamMember === teamMember
    );

    const hoursByDay = weekDays.map((day) => {
      const dayHours = memberEntries
        .filter((e) => e.date === day.dateStr)
        .reduce((sum, e) => sum + e.hours, 0);
      return dayHours;
    });

    const totalHours = hoursByDay.reduce((a, b) => a + b, 0);

    return {
      projectId,
      projectName: projObj?.name || 'Unknown Project',
      clientName: projObj?.clientName || 'N/A',
      teamMember,
      hoursByDay,
      totalHours,
    };
  });

  // Grand totals across columns (Monday-Sunday)
  const columnTotals = weekDays.map((_, dayIdx) => {
    return gridData.reduce((sum, row) => sum + row.hoursByDay[dayIdx], 0);
  });

  const grandTotalHours = columnTotals.reduce((a, b) => a + b, 0);

  // --- Historical analytical data: Hours Logged Per Week ---
  const getWeekLabel = (monDate: Date) => {
    const sunDate = new Date(monDate);
    sunDate.setDate(monDate.getDate() + 6);
    return `${monDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${sunDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
  };

  const getWeekRange = (monDate: Date) => {
    const monStr = monDate.toISOString().split('T')[0];
    const sun = new Date(monDate);
    sun.setDate(monDate.getDate() + 6);
    const sunStr = sun.toISOString().split('T')[0];
    return { monStr, sunStr };
  };

  const weekOffsets = [-2, -1, 0, 1];
  const weeklyTrendData = weekOffsets.map((offset) => {
    const targetMon = new Date(monday);
    targetMon.setDate(monday.getDate() + offset * 7);
    const { monStr, sunStr } = getWeekRange(targetMon);
    const weekLogs = entries.filter((e) => e.date >= monStr && e.date <= sunStr && (!selectedProjectId || e.projectId === selectedProjectId));
    const totalHrs = weekLogs.reduce((sum, e) => sum + e.hours, 0);
    return {
      name: offset === 0 ? 'Current' : `Wk ${offset > 0 ? '+' : ''}${offset}`,
      label: getWeekLabel(targetMon),
      hours: totalHrs,
    };
  });

  // --- Distribution of hours by Project or by Role (for selected week/project) ---
  let distributionLabel = "Distribution of Hours by Project (Active Week)";
  let projectDistributionData: { name: string; value: number }[] = [];

  if (!selectedProjectId) {
    distributionLabel = "Distribution of Hours by Project (Active Week)";
    projectDistributionData = projects.map((p) => {
      const projectHrs = currentWeekEntries
        .filter((e) => e.projectId === p.id)
        .reduce((sum, e) => sum + e.hours, 0);
      return {
        name: p.name,
        value: projectHrs,
      };
    }).filter((p) => p.value > 0);
  } else {
    const proj = projects.find(p => p.id === selectedProjectId);
    distributionLabel = `Distribution of Hours by Role for ${proj?.name || ''} (Active Week)`;
    const roleHoursMap: { [role: string]: number } = {};
    currentWeekEntries.forEach(e => {
      const fin = getEntryFinancialDetails(e);
      roleHoursMap[fin.role] = (roleHoursMap[fin.role] || 0) + e.hours;
    });
    projectDistributionData = Object.entries(roleHoursMap).map(([role, hours]) => ({
      name: role,
      value: hours
    })).filter(r => r.value > 0);
  }

  // Monthly Analytics calculation block
  const { firstStr: monthStartStr, lastStr: monthEndStr, monthLabel } = getMonthRange(selectedWeekDate);
  const monthEntries = entries.filter(
    (e) => e.date >= monthStartStr && e.date <= monthEndStr && (!selectedProjectId || e.projectId === selectedProjectId)
  );

  // Split into Billable and Non-Billable entries
  const billableMonthEntries = monthEntries.filter((e) => {
    const proj = projects.find((p) => p.id === e.projectId);
    return !proj?.isNonBillable;
  });

  const nonBillableMonthEntries = monthEntries.filter((e) => {
    const proj = projects.find((p) => p.id === e.projectId);
    return !!proj?.isNonBillable;
  });

  const monthRoleMap: { [role: string]: { hours: number; spend: number; rate: number } } = {};
  billableMonthEntries.forEach(e => {
    const fin = getEntryFinancialDetails(e);
    if (!monthRoleMap[fin.role]) {
      monthRoleMap[fin.role] = { hours: 0, spend: 0, rate: fin.rate };
    }
    monthRoleMap[fin.role].hours += e.hours;
    monthRoleMap[fin.role].spend += fin.spend;
  });

  const monthRolesList = Object.entries(monthRoleMap).map(([role, val]) => ({
    role,
    hours: val.hours,
    rate: val.rate,
    spend: val.spend
  }));

  const monthTotalHours = billableMonthEntries.reduce((sum, e) => sum + e.hours, 0);
  const monthTotalSpend = billableMonthEntries.reduce((sum, e) => sum + getEntryFinancialDetails(e).spend, 0);

  const monthRateCards = Array.from(new Set(
    billableMonthEntries.map(e => getEntryFinancialDetails(e).rateCardName)
  )).filter(name => name !== 'N/A' && name !== 'Non-billable');

  let monthLeftToSpend = 0;
  if (selectedProjectId) {
    const proj = projects.find(p => p.id === selectedProjectId);
    if (proj && !proj.isNonBillable) {
      const fin = getProjectFinancials(proj);
      monthLeftToSpend = Math.max(0, fin.budget - fin.actualLoggedCost);
    }
  } else {
    monthLeftToSpend = projects
      .filter(p => !isProjectDone(p) && !p.isNonBillable)
      .reduce((sum, p) => {
        const fin = getProjectFinancials(p);
        return sum + Math.max(0, fin.budget - fin.actualLoggedCost);
      }, 0);
  }

  const daysInMonth = new Date(new Date(selectedWeekDate).getFullYear(), new Date(selectedWeekDate).getMonth() + 1, 0).getDate();
  const monthlyBurnData = [];
  let cumulativeSpendAcc = 0;
  const dObj = new Date(selectedWeekDate);
  const y = dObj.getFullYear();
  const mIndex = dObj.getMonth();

  for (let d = 1; d <= daysInMonth; d++) {
    const dateString = `${y}-${String(mIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayEntries = billableMonthEntries.filter(e => e.date === dateString);
    const daySpend = dayEntries.reduce((sum, e) => sum + getEntryFinancialDetails(e).spend, 0);
    cumulativeSpendAcc += daySpend;

    monthlyBurnData.push({
      day: d,
      dateLabel: `${d} ${dObj.toLocaleDateString('en-GB', { month: 'short' })}`,
      'Cumulative Spend': cumulativeSpendAcc,
      'Daily Spend': daySpend
    });
  }

  // Non-Billable Monthly Analytics & Graph Data
  const nonBillableTotalHours = nonBillableMonthEntries.reduce((sum, e) => sum + e.hours, 0);
  const nonBillableMonthlyBurnData = [];
  let cumulativeNonBillableHoursAcc = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateString = `${y}-${String(mIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayEntries = nonBillableMonthEntries.filter(e => e.date === dateString);
    const dayHours = dayEntries.reduce((sum, e) => sum + e.hours, 0);
    cumulativeNonBillableHoursAcc += dayHours;

    nonBillableMonthlyBurnData.push({
      day: d,
      dateLabel: `${d} ${dObj.toLocaleDateString('en-GB', { month: 'short' })}`,
      'Cumulative Hours': cumulativeNonBillableHoursAcc,
      'Daily Hours': dayHours
    });
  }

  const nonBillableProjectMap: { [projectName: string]: { project: string; hours: number } } = {};
  nonBillableMonthEntries.forEach((e) => {
    const proj = projects.find((p) => p.id === e.projectId);
    const pName = proj?.name || 'Unknown Non-Billable Project';
    if (!nonBillableProjectMap[pName]) {
      nonBillableProjectMap[pName] = { project: pName, hours: 0 };
    }
    nonBillableProjectMap[pName].hours += e.hours;
  });
  const nonBillableProjectsList = Object.values(nonBillableProjectMap).sort((a, b) => b.hours - a.hours);

  // ============================================================
  // PROJECT TIMELINE ANALYTICS BLOCK
  // ============================================================
  let timelineStartStr = '';
  let timelineEndStr = '';

  if (selectedProjectId && activeProject) {
    timelineStartStr = activeProject.startDate || '';
    timelineEndStr = activeProject.endDate || '';
  }

  const projectEntriesForTimeline = entries.filter((e) => !selectedProjectId || e.projectId === selectedProjectId);
  const entryDates = projectEntriesForTimeline.map((e) => e.date).sort();

  if (!timelineStartStr) {
    if (entryDates.length > 0) {
      timelineStartStr = entryDates[0];
    } else {
      timelineStartStr = monthStartStr;
    }
  }

  if (!timelineEndStr) {
    if (entryDates.length > 0) {
      timelineEndStr = entryDates[entryDates.length - 1];
    } else {
      timelineEndStr = monthEndStr;
    }
  }

  if (timelineEndStr < timelineStartStr) {
    timelineEndStr = timelineStartStr;
  }

  const timelineEntries = entries.filter(
    (e) => e.date >= timelineStartStr && e.date <= timelineEndStr && (!selectedProjectId || e.projectId === selectedProjectId)
  );

  const billableTimelineEntries = timelineEntries.filter((e) => {
    const proj = projects.find((p) => p.id === e.projectId);
    return !proj?.isNonBillable;
  });

  const nonBillableTimelineEntries = timelineEntries.filter((e) => {
    const proj = projects.find((p) => p.id === e.projectId);
    return !!proj?.isNonBillable;
  });

  const timelineTotalHours = billableTimelineEntries.reduce((sum, e) => sum + e.hours, 0);
  const timelineTotalSpend = billableTimelineEntries.reduce((sum, e) => sum + getEntryFinancialDetails(e).spend, 0);

  interface RoleDetail {
    roleName: string;
    estimatedHours: number;
    estimatedDays: number;
    estimatedCost: number;
    loggedHours: number;
    daysLogged: number;
    totalSpend: number;
    internalCost: number;
    grossMargin: number;
    marginPercent: number;
    hoursRemaining: number;
  }

  const roleDataMap: { [role: string]: RoleDetail } = {};

  // 1. Process estimated allocations from project team members
  const targetProjectsForRoles = selectedProjectId && activeProject 
    ? [activeProject] 
    : projects.filter(p => !p.isNonBillable);

  targetProjectsForRoles.forEach((proj) => {
    const rc = rateCards.find((card) => card.id === proj.rateCardId);
    proj.teamMembers?.forEach((m) => {
      const rcRole = rc?.roles.find((r) => r.id === m.roleId);
      const rName = rcRole?.role || 'Unassigned Role';
      const dayRate = rcRole?.hourlyCost || 0;
      const estHours = m.hoursAllocated || 0;
      const estDays = estHours / 7;
      const estCost = estDays * dayRate;

      if (!roleDataMap[rName]) {
        roleDataMap[rName] = {
          roleName: rName,
          estimatedHours: 0,
          estimatedDays: 0,
          estimatedCost: 0,
          loggedHours: 0,
          daysLogged: 0,
          totalSpend: 0,
          internalCost: 0,
          grossMargin: 0,
          marginPercent: 0,
          hoursRemaining: 0,
        };
      }
      roleDataMap[rName].estimatedHours += estHours;
      roleDataMap[rName].estimatedDays += estDays;
      roleDataMap[rName].estimatedCost += estCost;
    });
  });

  // 2. Process actual timesheet entries logged during this timeline
  billableTimelineEntries.forEach((e) => {
    const fin = getEntryFinancialDetails(e);
    const rName = fin.role || 'Unassigned Role';
    const hours = e.hours || 0;
    const spend = fin.spend || 0;

    const proj = projects.find((p) => p.id === e.projectId);
    const rc = proj ? rateCards.find((c) => c.id === proj.rateCardId) : undefined;
    const rcRole = rc?.roles.find((r) => r.id === e.roleId || r.role === rName);
    const internalDayRate = rcRole?.internalCost !== undefined ? rcRole.internalCost : (rcRole?.hourlyCost || fin.dayRate || 0);
    const internalCost = hours * (internalDayRate / 7);

    if (!roleDataMap[rName]) {
      roleDataMap[rName] = {
        roleName: rName,
        estimatedHours: 0,
        estimatedDays: 0,
        estimatedCost: 0,
        loggedHours: 0,
        daysLogged: 0,
        totalSpend: 0,
        internalCost: 0,
        grossMargin: 0,
        marginPercent: 0,
        hoursRemaining: 0,
      };
    }

    roleDataMap[rName].loggedHours += hours;
    roleDataMap[rName].daysLogged += hours / 7;
    roleDataMap[rName].totalSpend += spend;
    roleDataMap[rName].internalCost += internalCost;
  });

  // 3. Finalize derived metrics per role
  const timelineRoleDetailsList: RoleDetail[] = Object.values(roleDataMap).map((item) => {
    const hoursRemaining = Math.max(0, item.estimatedHours - item.loggedHours);
    const revenue = item.estimatedCost > 0 ? item.estimatedCost : item.totalSpend;
    const grossMargin = revenue - item.internalCost;
    const marginPercent = revenue > 0 ? (grossMargin / revenue) * 100 : 0;
    return {
      ...item,
      hoursRemaining,
      grossMargin,
      marginPercent,
    };
  }).sort((a, b) => b.totalSpend - a.totalSpend || b.estimatedCost - a.estimatedCost);

  const totalEstimatedDays = timelineRoleDetailsList.reduce((sum, r) => sum + r.estimatedDays, 0);
  const totalDaysLogged = timelineRoleDetailsList.reduce((sum, r) => sum + r.daysLogged, 0);
  const totalEstimatedCost = timelineRoleDetailsList.reduce((sum, r) => sum + r.estimatedCost, 0);
  const totalLoggedHours = timelineRoleDetailsList.reduce((sum, r) => sum + r.loggedHours, 0);
  const totalHoursRemaining = timelineRoleDetailsList.reduce((sum, r) => sum + r.hoursRemaining, 0);
  const totalInternalCost = timelineRoleDetailsList.reduce((sum, r) => sum + r.internalCost, 0);

  let timelineTotalBudget = 0;
  if (selectedProjectId && activeProject && !activeProject.isNonBillable) {
    timelineTotalBudget = getProjectFinancials(activeProject).budget;
  } else {
    timelineTotalBudget = projects
      .filter((p) => !p.isNonBillable)
      .reduce((sum, p) => sum + getProjectFinancials(p).budget, 0);
  }
  const timelineLeftToSpend = Math.max(0, timelineTotalBudget - timelineTotalSpend);
  const timelineBurnPercent = timelineTotalBudget > 0 ? (timelineTotalSpend / timelineTotalBudget) * 100 : 0;
  const timelineGrossMargin = timelineTotalBudget - totalInternalCost;
  const timelineGrossMarginPercent = timelineTotalBudget > 0 ? (timelineGrossMargin / timelineTotalBudget) * 100 : 0;

  // Project Timeline Burndown Chart Data
  const todayYmd = getTodayYmd();
  const maxLoggedEntryDate = entryDates.length > 0 ? entryDates[entryDates.length - 1] : todayYmd;
  const actualCutoffDate = maxLoggedEntryDate > todayYmd ? maxLoggedEntryDate : todayYmd;

  const startDateObj = new Date(timelineStartStr);
  const endDateObj = new Date(timelineEndStr);
  const diffTime = Math.abs(endDateObj.getTime() - startDateObj.getTime());
  const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
  const stepDays = diffDays <= 45 ? 1 : diffDays <= 180 ? 7 : 14;

  const totalTimeSpanMs = Math.max(1, endDateObj.getTime() - startDateObj.getTime());

  interface BurndownPoint {
    dateLabel: string;
    currentYMD: string;
    'Budget Line (Target)': number;
    'Actual Remaining': number | null;
    'Cumulative Spend': number;
    'Interval Spend': number;
  }

  const timelineBurndownData: BurndownPoint[] = [];
  let timelineCumulativeSpend = 0;
  let currDate = new Date(startDateObj);

  const formatYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  let prevYMD = '';
  while (currDate <= endDateObj || formatYMD(currDate) === formatYMD(endDateObj)) {
    const currentYMD = formatYMD(currDate);
    if (currentYMD === prevYMD) break;

    const intervalEntries = billableTimelineEntries.filter((e) => {
      if (prevYMD) {
        return e.date > prevYMD && e.date <= currentYMD;
      }
      return e.date <= currentYMD;
    });

    const intervalSpend = intervalEntries.reduce((sum, e) => sum + getEntryFinancialDetails(e).spend, 0);
    timelineCumulativeSpend += intervalSpend;

    // Linear Target Remaining Calculation from Total Budget -> 0
    const elapsedMs = Math.min(totalTimeSpanMs, Math.max(0, currDate.getTime() - startDateObj.getTime()));
    const progressRatio = totalTimeSpanMs > 0 ? elapsedMs / totalTimeSpanMs : 1;
    const targetRemaining = Math.max(0, Math.round(timelineTotalBudget * (1 - progressRatio)));

    // Actual Remaining (only up to current date / cutoff date)
    const isPastOrToday = currentYMD <= actualCutoffDate;
    const actualRemainingVal = isPastOrToday ? Math.max(0, timelineTotalBudget - timelineCumulativeSpend) : null;

    timelineBurndownData.push({
      dateLabel: currDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: diffDays > 120 ? '2-digit' : undefined }),
      currentYMD,
      'Budget Line (Target)': targetRemaining,
      'Actual Remaining': actualRemainingVal,
      'Cumulative Spend': timelineCumulativeSpend,
      'Interval Spend': intervalSpend,
    });

    prevYMD = currentYMD;
    if (currentYMD === formatYMD(endDateObj)) break;

    currDate.setDate(currDate.getDate() + stepDays);
    if (currDate > endDateObj && formatYMD(currDate) !== formatYMD(endDateObj)) {
      currDate = new Date(endDateObj);
    }
  }

  // Calculate current pace status & variance
  const latestValidPoint = [...timelineBurndownData].reverse().find(p => p['Actual Remaining'] !== null);
  const latestTargetVal = latestValidPoint ? latestValidPoint['Budget Line (Target)'] : 0;
  const latestActualVal = latestValidPoint ? (latestValidPoint['Actual Remaining'] ?? 0) : 0;
  const burndownPaceVariance = latestActualVal - latestTargetVal;

  // Check if current timeline project view is for an internal or non-billable project
  const isInternalProjectChart = Boolean(
    (selectedProjectId && activeProject?.isNonBillable) ||
    (activeProject?.clientName === 'Internal') ||
    (timelineTotalBudget === 0)
  );

  // Option A: Cumulative Effort & Activity Burnup Data for Internal/Non-Billable Projects
  interface InternalBurnupPoint {
    dateLabel: string;
    currentYMD: string;
    'Cumulative Hours': number;
    'Interval Hours': number;
    'Cumulative Days': number;
  }

  const timelineInternalBurnupData: InternalBurnupPoint[] = [];
  let internalCumulativeHoursAcc = 0;
  let intCurrDate = new Date(startDateObj);
  let intPrevYMD = '';

  while (intCurrDate <= endDateObj || formatYMD(intCurrDate) === formatYMD(endDateObj)) {
    const currentYMD = formatYMD(intCurrDate);
    if (currentYMD === intPrevYMD) break;

    const intervalEntries = timelineEntries.filter((e) => {
      if (intPrevYMD) {
        return e.date > intPrevYMD && e.date <= currentYMD;
      }
      return e.date <= currentYMD;
    });

    const intervalHours = intervalEntries.reduce((sum, e) => sum + e.hours, 0);
    internalCumulativeHoursAcc += intervalHours;

    timelineInternalBurnupData.push({
      dateLabel: intCurrDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: diffDays > 120 ? '2-digit' : undefined }),
      currentYMD,
      'Cumulative Hours': Number(internalCumulativeHoursAcc.toFixed(1)),
      'Interval Hours': Number(intervalHours.toFixed(1)),
      'Cumulative Days': Number((internalCumulativeHoursAcc / 7).toFixed(1)),
    });

    intPrevYMD = currentYMD;
    if (currentYMD === formatYMD(endDateObj)) break;

    intCurrDate.setDate(intCurrDate.getDate() + stepDays);
    if (intCurrDate > endDateObj && formatYMD(intCurrDate) !== formatYMD(endDateObj)) {
      intCurrDate = new Date(endDateObj);
    }
  }

  const totalInternalTimelineHours = timelineEntries.reduce((sum, e) => sum + e.hours, 0);
  const totalInternalTimelineDays = (totalInternalTimelineHours / 7).toFixed(1);

  // Non-Billable Timeline Analytics & Graph
  const nonBillableTimelineTotalHours = nonBillableTimelineEntries.reduce((sum, e) => sum + e.hours, 0);
  const nonBillableTimelineBurnData: { dateLabel: string; 'Cumulative Hours': number; 'Interval Hours': number }[] = [];
  let nonBillableCumulativeHours = 0;
  currDate = new Date(startDateObj);
  prevYMD = '';

  while (currDate <= endDateObj || formatYMD(currDate) === formatYMD(endDateObj)) {
    const currentYMD = formatYMD(currDate);
    if (currentYMD === prevYMD) break;

    const intervalEntries = nonBillableTimelineEntries.filter((e) => {
      if (prevYMD) {
        return e.date > prevYMD && e.date <= currentYMD;
      }
      return e.date <= currentYMD;
    });

    const intervalHours = intervalEntries.reduce((sum, e) => sum + e.hours, 0);
    nonBillableCumulativeHours += intervalHours;

    nonBillableTimelineBurnData.push({
      dateLabel: currDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: diffDays > 120 ? '2-digit' : undefined }),
      'Cumulative Hours': nonBillableCumulativeHours,
      'Interval Hours': intervalHours,
    });

    prevYMD = currentYMD;
    if (currentYMD === formatYMD(endDateObj)) break;

    currDate.setDate(currDate.getDate() + stepDays);
    if (currDate > endDateObj && formatYMD(currDate) !== formatYMD(endDateObj)) {
      currDate = new Date(endDateObj);
    }
  }

  const nonBillableTimelineProjectMap: { [projectName: string]: { project: string; hours: number } } = {};
  nonBillableTimelineEntries.forEach((e) => {
    const proj = projects.find((p) => p.id === e.projectId);
    const pName = proj?.name || 'Unknown Non-Billable Project';
    if (!nonBillableTimelineProjectMap[pName]) {
      nonBillableTimelineProjectMap[pName] = { project: pName, hours: 0 };
    }
    nonBillableTimelineProjectMap[pName].hours += e.hours;
  });
  const nonBillableTimelineProjectsList = Object.values(nonBillableTimelineProjectMap).sort((a, b) => b.hours - a.hours);

  // Modern amber-orange monochromatic color scale
  const COLORS = ['#F5720A', '#E06400', '#C95600', '#B04900', '#963C00', '#7A3000'];

  // Handle printing via browser print dialog
  const handlePrint = () => {
    window.print();
  };

  // ============================================================
  // CLIENT & PROJECT PROFITABILITY AND MARGIN METRICS
  // ============================================================
  interface ProjectProfitability {
    id: string;
    name: string;
    clientName: string;
    isCompleted: boolean;
    isNonBillable: boolean;
    hoursLogged: number;
    contractBudget: number;
    billableRevenue: number;
    internalLaborCost: number;
    expense: number;
    discount: number;
    grossProfit: number;
    marginPercent: number;
    marginHealth: 'high' | 'healthy' | 'low' | 'deficit';
  }

  interface ClientProfitability {
    clientName: string;
    projectCount: number;
    activeCount: number;
    completedCount: number;
    hoursLogged: number;
    contractBudget: number;
    billableRevenue: number;
    internalLaborCost: number;
    expense: number;
    grossProfit: number;
    marginPercent: number;
    marginHealth: 'high' | 'healthy' | 'low' | 'deficit';
    projects: ProjectProfitability[];
  }

  const projectProfitabilityList: ProjectProfitability[] = useMemo(() => {
    return projects.map((proj) => {
      const projEntries = entries.filter((e) => e.projectId === proj.id);
      const hoursLogged = projEntries.reduce((sum, e) => sum + e.hours, 0);
      const financials = getProjectFinancials(proj);
      const contractBudget = financials.budget;
      const rc = rateCards.find((c) => c.id === proj.rateCardId);

      let billableRevenue = 0;
      let internalLaborCost = 0;

      if (!proj.isNonBillable) {
        projEntries.forEach((e) => {
          const fin = getEntryFinancialDetails(e);
          billableRevenue += fin.spend;

          // Compute internal labor cost per role
          const rcRole = rc?.roles.find((r) => r.id === e.roleId || r.role === fin.role);
          const internalDayRate = rcRole?.internalCost !== undefined
            ? rcRole.internalCost
            : (rcRole?.hourlyCost !== undefined ? rcRole.hourlyCost * 0.5 : (fin.dayRate ? fin.dayRate * 0.5 : 0));
          const internalHourly = internalDayRate / 7;
          internalLaborCost += e.hours * internalHourly;
        });
      }

      const expense = proj.expense || 0;
      const discount = proj.discount || 0;
      const grossProfit = billableRevenue - internalLaborCost - expense;
      const marginPercent = billableRevenue > 0 ? (grossProfit / billableRevenue) * 100 : 0;

      let marginHealth: 'high' | 'healthy' | 'low' | 'deficit' = 'healthy';
      if (grossProfit < 0) marginHealth = 'deficit';
      else if (marginPercent >= 45) marginHealth = 'high';
      else if (marginPercent >= 25) marginHealth = 'healthy';
      else marginHealth = 'low';

      return {
        id: proj.id,
        name: proj.name,
        clientName: proj.clientName,
        isCompleted: !!proj.isCompleted,
        isNonBillable: !!proj.isNonBillable,
        hoursLogged,
        contractBudget,
        billableRevenue,
        internalLaborCost,
        expense,
        discount,
        grossProfit,
        marginPercent,
        marginHealth,
      };
    }).sort((a, b) => b.grossProfit - a.grossProfit);
  }, [projects, entries, rateCards]);

  const clientProfitabilityList: ClientProfitability[] = useMemo(() => {
    const clientMap: { [client: string]: ClientProfitability } = {};

    projectProfitabilityList.forEach((p) => {
      const cName = p.clientName || 'Unassigned';
      if (!clientMap[cName]) {
        clientMap[cName] = {
          clientName: cName,
          projectCount: 0,
          activeCount: 0,
          completedCount: 0,
          hoursLogged: 0,
          contractBudget: 0,
          billableRevenue: 0,
          internalLaborCost: 0,
          expense: 0,
          grossProfit: 0,
          marginPercent: 0,
          marginHealth: 'healthy',
          projects: [],
        };
      }

      const c = clientMap[cName];
      c.projectCount += 1;
      if (p.isCompleted) c.completedCount += 1;
      else c.activeCount += 1;

      c.hoursLogged += p.hoursLogged;
      c.contractBudget += p.contractBudget;
      c.billableRevenue += p.billableRevenue;
      c.internalLaborCost += p.internalLaborCost;
      c.expense += p.expense;
      c.grossProfit += p.grossProfit;
      c.projects.push(p);
    });

    return Object.values(clientMap).map((c) => {
      const marginPercent = c.billableRevenue > 0 ? (c.grossProfit / c.billableRevenue) * 100 : 0;
      let marginHealth: 'high' | 'healthy' | 'low' | 'deficit' = 'healthy';
      if (c.grossProfit < 0) marginHealth = 'deficit';
      else if (marginPercent >= 45) marginHealth = 'high';
      else if (marginPercent >= 25) marginHealth = 'healthy';
      else marginHealth = 'low';

      return {
        ...c,
        marginPercent,
        marginHealth,
      };
    }).sort((a, b) => b.grossProfit - a.grossProfit);
  }, [projectProfitabilityList]);

  // Overall Portfolio Profitability Totals
  const portfolioProfitability = useMemo(() => {
    const totalRevenue = clientProfitabilityList.reduce((sum, c) => sum + c.billableRevenue, 0);
    const totalInternalCost = clientProfitabilityList.reduce((sum, c) => sum + c.internalLaborCost, 0);
    const totalExpenses = clientProfitabilityList.reduce((sum, c) => sum + c.expense, 0);
    const totalGrossProfit = totalRevenue - totalInternalCost - totalExpenses;
    const overallMarginPercent = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;
    const totalHours = clientProfitabilityList.reduce((sum, c) => sum + c.hoursLogged, 0);
    const topClient = clientProfitabilityList.length > 0 ? clientProfitabilityList[0] : null;

    return {
      totalRevenue,
      totalInternalCost,
      totalExpenses,
      totalGrossProfit,
      overallMarginPercent,
      totalHours,
      topClient,
    };
  }, [clientProfitabilityList]);

  // Search & Filter state for Profitability view
  const [profitSearchTerm, setProfitSearchTerm] = useState<string>('');
  const [profitSortBy, setProfitSortBy] = useState<'profit' | 'margin' | 'revenue'>('profit');

  // Filtered Project Profitability list
  const filteredProjectProfitability = useMemo(() => {
    return projectProfitabilityList.filter((p) => {
      if (selectedProjectId && p.id !== selectedProjectId) return false;
      if (!profitSearchTerm) return true;
      const term = profitSearchTerm.toLowerCase();
      return p.name.toLowerCase().includes(term) || p.clientName.toLowerCase().includes(term);
    }).sort((a, b) => {
      if (profitSortBy === 'margin') return b.marginPercent - a.marginPercent;
      if (profitSortBy === 'revenue') return b.billableRevenue - a.billableRevenue;
      return b.grossProfit - a.grossProfit;
    });
  }, [projectProfitabilityList, selectedProjectId, profitSearchTerm, profitSortBy]);

  // ============================================================
  // EXECUTIVE PRINT & PDF REPORT GENERATION DATA
  // ============================================================
  const printEntries = periodMode === 'weekly' ? currentWeekEntries : periodMode === 'timeline' ? timelineEntries : monthEntries;
  const printBillableEntries = printEntries.filter((e) => {
    const proj = projects.find((p) => p.id === e.projectId);
    return !proj?.isNonBillable;
  });
  const printNonBillableEntries = printEntries.filter((e) => {
    const proj = projects.find((p) => p.id === e.projectId);
    return !!proj?.isNonBillable;
  });

  const printTotalBillableHours = printBillableEntries.reduce((sum, e) => sum + e.hours, 0);
  const printTotalSpend = printBillableEntries.reduce((sum, e) => sum + getEntryFinancialDetails(e).spend, 0);

  let printTotalBudget = 0;
  if (selectedProjectId && activeProject && !activeProject.isNonBillable) {
    printTotalBudget = getProjectFinancials(activeProject).budget;
  } else {
    printTotalBudget = projects
      .filter((p) => !p.isNonBillable && (!selectedProjectId || p.id === selectedProjectId))
      .reduce((sum, p) => sum + getProjectFinancials(p).budget, 0);
  }

  const printRemainingBudget = Math.max(0, printTotalBudget - printTotalSpend);
  const printBurnPercent = printTotalBudget > 0 ? (printTotalSpend / printTotalBudget) * 100 : 0;

  // Role Breakdown
  const printRoleMap: { [key: string]: { role: string; teamMember: string; hours: number; rate: number; spend: number } } = {};
  printBillableEntries.forEach((e) => {
    const fin = getEntryFinancialDetails(e);
    const key = `${fin.role}___${e.teamMember}`;
    if (!printRoleMap[key]) {
      printRoleMap[key] = { role: fin.role, teamMember: e.teamMember, hours: 0, rate: fin.rate, spend: 0 };
    }
    printRoleMap[key].hours += e.hours;
    printRoleMap[key].spend += fin.spend;
  });
  const printRolesList = Object.values(printRoleMap).sort((a, b) => b.spend - a.spend);

  // Non-Billable Breakdown
  const printNonBillableMap: { [projectName: string]: { project: string; hours: number; teamMembers: Set<string> } } = {};
  printNonBillableEntries.forEach((e) => {
    const proj = projects.find((p) => p.id === e.projectId);
    const pName = proj?.name || 'Non-Billable Task';
    if (!printNonBillableMap[pName]) {
      printNonBillableMap[pName] = { project: pName, hours: 0, teamMembers: new Set() };
    }
    printNonBillableMap[pName].hours += e.hours;
    printNonBillableMap[pName].teamMembers.add(e.teamMember);
  });
  const printNonBillableList = Object.values(printNonBillableMap).sort((a, b) => b.hours - a.hours);
  const printTotalNonBillableHours = printNonBillableEntries.reduce((sum, e) => sum + e.hours, 0);

  // Active Period Labels
  let printPeriodLabel = '';
  let printReportTitle = '';
  if (periodMode === 'timeline') {
    printReportTitle = 'Project Lifecycle Financial Statement';
    printPeriodLabel = `Span: ${new Date(timelineStartStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} – ${new Date(timelineEndStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  } else if (periodMode === 'monthly') {
    printReportTitle = 'Executive Monthly Financial Statement';
    printPeriodLabel = `Month: ${monthLabel}`;
  } else {
    printReportTitle = 'Executive Weekly Audit & Timesheet Transcript';
    printPeriodLabel = `Week of: ${monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} – ${weekDays[6].dateStr}`;
  }

  const printClientRecipient = selectedProjectId && activeProject
    ? `${activeProject.clientName} (${activeProject.name})`
    : 'The Uplift Partnership / Stakeholders';

  // Double-Quote Escaped CSV Export
  const handleExportCSV = () => {
    const targetEntries = periodMode === 'weekly' ? currentWeekEntries : periodMode === 'timeline' ? timelineEntries : monthEntries;

    const escapeField = (val: any): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = [
      'Entry ID',
      'Date of Log',
      'Project Client',
      'Project Name',
      'Team Member',
      'Hours Logged',
      'Hourly Rate (£)',
      'Total Calculated Billing (£)',
      'Accomplishment Narrative',
      'Logged By (Name)',
      'Logged By (Email)'
    ];

    const csvRows = [headers.join(',')];

    targetEntries.forEach((e) => {
      const fin = getEntryFinancialDetails(e);
      const row = [
        e.id,
        e.date,
        fin.project?.clientName || 'N/A',
        fin.project?.name || 'N/A',
        e.teamMember,
        e.hours,
        fin.rate,
        fin.spend,
        e.description,
        e.loggedByName || '',
        e.loggedByEmail || ''
      ];
      csvRows.push(row.map(escapeField).join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `consulting_timesheet_${periodMode}_export_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#0a0a0a] border border-zinc-900 rounded-2xl p-6 shadow-2xl space-y-6 relative">
      {/* 
        ============================================================
        PRINT-ONLY EXECUTIVE FINANCIAL STATEMENT
        ============================================================
      */}
      <div className="hidden print-only max-w-4xl mx-auto p-8 bg-white text-black print-card print-text space-y-8">
        {/* EXECUTIVE HEADER & LETTERHEAD */}
        <div className="flex justify-between items-start border-b-2 border-zinc-800 pb-6 print-border">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-zinc-900 print-text">
              {printReportTitle}
            </h1>
            <p className="text-xs text-zinc-600 font-semibold mt-0.5">{printPeriodLabel}</p>
            <div className="text-xs mt-3 space-y-1">
              <p><span className="font-semibold text-zinc-700">Issued On:</span> {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p><span className="font-semibold text-zinc-700">Active View Mode:</span> <span className="uppercase font-mono font-bold text-zinc-800">{periodMode}</span></p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-black text-[#F5720A]">The Uplift Partnership</h2>
            <p className="text-xs text-zinc-600">Consulting & Performance Engine</p>
            <p className="text-xs text-zinc-500 font-mono">chris@theupliftpartnership.com</p>
          </div>
        </div>

        {/* SCOPE & RECIPIENT INFORMATION RECAP */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200 print-border">
            <h3 className="font-bold text-zinc-800 mb-1 uppercase tracking-wider text-[10px]">Client / Recipient Scope</h3>
            <p className="text-zinc-900 font-semibold">{printClientRecipient}</p>
            <p className="text-zinc-600 mt-1">
              Scope Filter: <span className="font-mono font-bold">{selectedProjectId ? activeProject?.name : 'All Portfolio Projects'}</span>
            </p>
          </div>
          <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200 print-border text-right">
            <h3 className="font-bold text-zinc-800 mb-1 uppercase tracking-wider text-[10px]">Financial Summary</h3>
            <p className="text-zinc-600">Total Entries Logged: {printEntries.length} items</p>
            <p className="text-lg font-black text-[#F5720A] mt-0.5 font-mono">
              £{printTotalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Total Spend
            </p>
          </div>
        </div>

        {/* FINANCIAL KPI BREAKDOWN TABLE (BUDGET VS ACTUAL) */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 border-b pb-1 border-zinc-200">
            Budget vs. Actual Performance
          </h3>
          <table className="w-full text-xs text-left border border-zinc-300">
            <thead>
              <tr className="bg-zinc-100 border-b border-zinc-300 font-bold text-zinc-800">
                <th className="p-2 border-r">Contract Budget</th>
                <th className="p-2 border-r">Total Billable Spend</th>
                <th className="p-2 border-r">Remaining Backlog</th>
                <th className="p-2 border-r text-center">Budget Burned</th>
                <th className="p-2 text-center">Billable Hours</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2.5 border-r font-mono font-bold text-zinc-800">
                  £{printTotalBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="p-2.5 border-r font-mono font-bold text-[#F5720A]">
                  £{printTotalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="p-2.5 border-r font-mono font-bold text-zinc-700">
                  £{printRemainingBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="p-2.5 border-r text-center font-mono font-bold text-zinc-800">
                  {printBurnPercent.toFixed(1)}%
                </td>
                <td className="p-2.5 text-center font-mono font-bold text-zinc-900 bg-zinc-50">
                  {printTotalBillableHours.toFixed(1)} hrs
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ROLE & RESOURCE COST ALLOCATION TABLE */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 border-b pb-1 border-zinc-200">
            Resource Cost Allocation
          </h3>
          <table className="w-full text-xs text-left border border-zinc-300">
            <thead>
              <tr className="bg-zinc-100 border-b border-zinc-300 font-bold text-zinc-800">
                <th className="p-2 border-r">Team Member</th>
                <th className="p-2 border-r">Consulting Role</th>
                <th className="p-2 border-r text-center">Hourly Rate</th>
                <th className="p-2 border-r text-center">Day Rate (8h)</th>
                <th className="p-2 border-r text-center">Logged Hours</th>
                <th className="p-2 text-right">Total Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 font-mono">
              {printRolesList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-zinc-500 italic font-sans">
                    No billable resources recorded for this active scope
                  </td>
                </tr>
              ) : (
                printRolesList.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-2 border-r font-semibold text-zinc-900 font-sans">{item.teamMember}</td>
                    <td className="p-2 border-r text-zinc-700 font-sans">{item.role}</td>
                    <td className="p-2 border-r text-center text-zinc-600">£{item.rate}</td>
                    <td className="p-2 border-r text-center text-zinc-600">£{item.rate * 8}</td>
                    <td className="p-2 border-r text-center font-bold text-zinc-900">{item.hours.toFixed(1)}</td>
                    <td className="p-2 text-right font-bold text-[#F5720A]">
                      £{item.spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
              {/* Table Total Row */}
              <tr className="bg-zinc-100 font-bold font-mono">
                <td colSpan={4} className="p-2 border-r text-right font-sans">Total Resource Spend:</td>
                <td className="p-2 border-r text-center">{printTotalBillableHours.toFixed(1)}</td>
                <td className="p-2 text-right text-[#F5720A]">
                  £{printTotalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* DEDICATED NON-BILLABLE SECTION */}
        {printTotalNonBillableHours > 0 && (
          <div className="space-y-2 pt-2">
            <div className="flex justify-between items-center border-b pb-1 border-zinc-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Non-Billable Effort & Internal Investment
              </h3>
              <span className="text-[10px] text-zinc-500 font-mono">Isolated from Billable Financials</span>
            </div>
            <table className="w-full text-xs text-left border border-amber-200 bg-amber-50/20">
              <thead>
                <tr className="bg-amber-100/50 border-b border-amber-200 font-bold text-amber-900">
                  <th className="p-2 border-r">Non-Billable Project / Task</th>
                  <th className="p-2 border-r">Contributing Team Members</th>
                  <th className="p-2 text-right">Non-Billable Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-200/60 font-mono">
                {printNonBillableList.map((nb, idx) => (
                  <tr key={idx}>
                    <td className="p-2 border-r font-semibold text-zinc-900 font-sans">{nb.project}</td>
                    <td className="p-2 border-r text-zinc-700 font-sans">{Array.from(nb.teamMembers).join(', ')}</td>
                    <td className="p-2 text-right font-bold text-amber-900">{nb.hours.toFixed(1)} hrs</td>
                  </tr>
                ))}
                <tr className="bg-amber-100/80 font-bold">
                  <td colSpan={2} className="p-2 border-r text-right font-sans">Total Non-Billable Effort:</td>
                  <td className="p-2 text-right font-mono text-amber-950">{printTotalNonBillableHours.toFixed(1)} hrs</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* NARRATIVE DELIVERABLES APPENDIX */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 border-b pb-1 border-zinc-200">
            Narrative Deliverables Appendix
          </h3>
          <div className="space-y-2">
            {printEntries.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">No narrative logs recorded for this period</p>
            ) : (
              printEntries
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((e, idx) => {
                  const proj = projects.find((p) => p.id === e.projectId);
                  return (
                    <div key={idx} className="border-b pb-2 text-xs border-zinc-200 print-border">
                      <div className="flex justify-between font-semibold text-zinc-900">
                        <span>
                          {proj?.name} — <span className="text-zinc-700">{e.teamMember}</span>
                          {proj?.isNonBillable && (
                            <span className="ml-2 text-[9px] px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-mono">
                              Non-Billable
                            </span>
                          )}
                        </span>
                        <span className="font-mono text-zinc-600">
                          {e.hours} hrs ({new Date(e.date).toLocaleDateString('en-GB')})
                        </span>
                      </div>
                      <p className="text-zinc-600 italic mt-0.5 font-sans">"{e.description}"</p>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>

      {/* 
        ============================================================
        STANDARD SCREEN INTERFACE (Hidden when printing)
        ============================================================
      */}
      <div className="no-print space-y-8">
        {/* REPORT CONFIGURATION BAR */}
        <div className="bg-zinc-950/70 border border-zinc-900 rounded-2xl p-5 sm:p-6 space-y-5">
          {/* Top Row: Title + Header Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900/80 pb-4">
            <div>
              <span className="eyebrow-label block mb-1 text-[#F5720A]">Financial Audits & Analytics</span>
              <h2 className="text-2xl font-display font-bold text-zinc-100 flex items-center gap-2.5">
                <FileText className="h-6 w-6 text-[#F5720A]" />
                Performance Reports
              </h2>
              <p className="text-xs text-zinc-400 mt-1 font-sans">
                Analyse project burns, role spend, and budget utilisation.
              </p>
            </div>

            {/* Export trigger */}
            <div className="flex items-center gap-3 self-start md:self-auto">
              <button
                onClick={handleExportCSV}
                className="h-10 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-zinc-700 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                title="Download double-quote escaped CSV for active view"
              >
                <Download className="h-4 w-4 text-[#F5720A]" />
                Download CSV
              </button>
            </div>
          </div>

          {/* Bottom Row: Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Filter by Project Dropdown (4 cols) */}
            <div className="md:col-span-4 flex items-center gap-2.5">
              <span className="text-zinc-400 text-xs font-semibold uppercase font-mono tracking-wider shrink-0">Inspect:</span>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-200 font-medium focus:outline-none focus:border-[#F5720A] focus:ring-1 focus:ring-[#F5720A] transition-all cursor-pointer h-10"
              >
                <option value="">-- All Projects Burn --</option>
                <optgroup label="Live Projects">
                  {projects.filter(p => !isProjectDone(p)).map(p => (
                    <option key={p.id} value={p.id}>
                      {p.clientName} - {p.name} (Live)
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Completed Projects">
                  {projects.filter(p => isProjectDone(p)).map(p => (
                    <option key={p.id} value={p.id}>
                      {p.clientName} - {p.name} (Done)
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* View Mode Toggle (5 cols: Project Timeline | Profit & Margins | Monthly View | Weekly View) */}
            <div className="md:col-span-5 flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs h-10 items-center justify-between gap-0.5">
              <button
                type="button"
                onClick={() => setPeriodMode('timeline')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition-all cursor-pointer text-center text-[11px] whitespace-nowrap ${
                  periodMode === 'timeline'
                    ? 'bg-[#F5720A] text-zinc-950 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Timeline
              </button>
              <button
                type="button"
                onClick={() => setPeriodMode('profitability')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition-all cursor-pointer text-center text-[11px] whitespace-nowrap ${
                  periodMode === 'profitability'
                    ? 'bg-[#F5720A] text-zinc-950 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Profit & Margins
              </button>
              <button
                type="button"
                onClick={() => setPeriodMode('monthly')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition-all cursor-pointer text-center text-[11px] whitespace-nowrap ${
                  periodMode === 'monthly'
                    ? 'bg-[#F5720A] text-zinc-950 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Monthly View
              </button>
              <button
                type="button"
                onClick={() => setPeriodMode('weekly')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition-all cursor-pointer text-center text-[11px] whitespace-nowrap ${
                  periodMode === 'weekly'
                    ? 'bg-[#F5720A] text-zinc-950 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Weekly View
              </button>
            </div>

            {/* Date Traversal / Active Range Badge (3 cols) */}
            <div className="md:col-span-3 flex items-center justify-end gap-2">
              {periodMode === 'weekly' || periodMode === 'monthly' ? (
                <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs h-10 w-full justify-between">
                  <button
                    onClick={handlePrevWeek}
                    className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg cursor-pointer"
                    title="Previous Period"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  
                  <div 
                    className="relative flex items-center justify-center gap-2 px-3 py-1 bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700/80 rounded-lg transition-all cursor-pointer group shadow-sm"
                    onClick={() => {
                      try {
                        if (dateInputRef.current && typeof dateInputRef.current.showPicker === 'function') {
                          dateInputRef.current.showPicker();
                        }
                      } catch (err) {}
                    }}
                  >
                    <Calendar className="h-3.5 w-3.5 text-[#F5720A] shrink-0" />
                    <span className="font-semibold font-mono text-xs text-zinc-200 group-hover:text-white transition-colors">
                      {periodMode === 'monthly'
                        ? new Date(selectedWeekDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
                        : `Week of ${monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                    </span>
                    <input
                      ref={dateInputRef}
                      type="date"
                      value={selectedWeekDate}
                      onChange={(e) => {
                        if (e.target.value) {
                          setSelectedWeekDate(e.target.value);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10 [color-scheme:dark]"
                      title="Select date via calendar"
                    />
                  </div>

                  <button
                    onClick={handleNextWeek}
                    className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg cursor-pointer"
                    title="Next Period"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              ) : periodMode === 'profitability' ? (
                <div className="bg-zinc-900 px-3 py-2 border border-zinc-800 rounded-xl text-zinc-300 font-mono text-xs h-10 flex items-center justify-center w-full gap-1.5">
                  <span className="text-[#F5720A] font-bold">Scope:</span>
                  <span className="truncate">{selectedProjectId ? (activeProject?.name || 'Selected') : 'All Portfolio Clients'}</span>
                </div>
              ) : (
                <div className="bg-zinc-900 px-3 py-2 border border-zinc-800 rounded-xl text-zinc-300 font-mono text-xs h-10 flex items-center justify-center w-full gap-1.5">
                  <span className="text-[#F5720A] font-bold">Span:</span>
                  <span>
                    {new Date(timelineStartStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    {' - '}
                    {new Date(timelineEndStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============================================================
            WEEKLY MODE INTERFACE
            ============================================================ */}
        {periodMode === 'weekly' && (
          <div className="space-y-6">
            {/* WEEKLY TIMESHEET GRID */}
            <div className="overflow-x-auto border border-zinc-900 rounded-xl bg-zinc-950/20">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-950 text-zinc-400 border-b border-zinc-900 font-semibold tracking-wider font-mono">
                    <th className="p-3.5">Client & Project</th>
                    <th className="p-3.5">Resource</th>
                    {weekDays.map((day) => (
                      <th key={day.dateStr} className="p-3.5 text-center w-14">
                        <span className="block text-zinc-400">{day.dayName}</span>
                        <span className="block text-[9px] text-zinc-500 mt-0.5">{day.label}</span>
                      </th>
                    ))}
                    <th className="p-3.5 text-center w-20">Total hrs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/60">
                  {gridData.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-12 text-center text-zinc-500 italic">
                        No active timesheet logs found for the week of {monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}. Traverse weeks or select another project filter.
                      </td>
                    </tr>
                  ) : (
                    gridData.map((row, idx) => {
                      const matchingEntry = currentWeekEntries.find((e) => e.teamMember.toLowerCase() === row.teamMember.toLowerCase());

                      return (
                        <tr key={idx} className="hover:bg-zinc-900/30 transition-colors">
                          <td className="p-3.5">
                            <div className="font-bold text-zinc-200">{row.projectName}</div>
                            <div className="text-[10px] text-zinc-500 font-mono">{row.clientName}</div>
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <TeammateBadge name={row.teamMember} email={matchingEntry?.loggedByEmail} />
                          </td>
                          {row.hoursByDay.map((hrs, i) => (
                            <td key={i} className="p-3.5 text-center font-mono text-zinc-300">
                              {hrs > 0 ? (
                                <span className="bg-zinc-900 px-2 py-1 rounded border border-zinc-800 text-zinc-200 font-semibold">
                                  {hrs.toFixed(1)}
                                </span>
                              ) : (
                                <span className="text-zinc-700">-</span>
                              )}
                            </td>
                          ))}
                          <td className="p-3.5 text-center font-mono font-black text-[#F5720A] bg-zinc-950/60">
                            {row.totalHours.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })
                  )}

                  {/* Column Totals Row */}
                  {gridData.length > 0 && (
                    <tr className="bg-zinc-950 font-bold border-t border-zinc-900">
                      <td colSpan={2} className="p-3.5 text-right text-zinc-400 font-mono">Weekly Column Totals:</td>
                      {columnTotals.map((tot, idx) => (
                        <td key={idx} className="p-3.5 text-center font-mono text-zinc-200">
                          {tot > 0 ? tot.toFixed(1) : '-'}
                        </td>
                      ))}
                      <td className="p-3.5 text-center font-mono font-black text-zinc-100 bg-zinc-900 border-l border-zinc-800 text-[#F5720A]">
                        {grandTotalHours.toFixed(2)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* ANALYTICAL VISUALIZATIONS CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 1: Hours Logged Per Week (Historical Run-rate) */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <BarChart2 className="h-4 w-4 text-[#F5720A]" />
                  Hours Logged Per Week (Run-Rate Trend)
                </h3>
                <div className="h-60 w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#52525b" fontSize={11} tickLine={false} />
                      <YAxis stroke="#52525b" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#18181b', borderRadius: '10px' }}
                        labelStyle={{ color: '#a1a1aa', fontWeight: 'bold' }}
                        itemStyle={{ color: '#F5720A' }}
                      />
                      <Bar dataKey="hours" name="Hours Logged" fill="#F5720A" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-zinc-500 italic text-center font-mono">Historical trend of weekly billable timesheet hours</p>
              </div>

              {/* Chart 2: Project Allocation Distribution */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <PieIcon className="h-4 w-4 text-[#F5720A]" />
                  {distributionLabel}
                </h3>
                <div className="h-60 w-full flex items-center justify-center text-xs">
                  {projectDistributionData.length === 0 ? (
                    <span className="text-zinc-500 italic text-xs font-mono">No hours recorded in the active week to display</span>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={projectDistributionData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name.substring(0,12)} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={65}
                          fill="#F5720A"
                          dataKey="value"
                        >
                          {projectDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#18181b', borderRadius: '10px' }}
                          itemStyle={{ color: '#fff' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <p className="text-[10px] text-zinc-500 italic text-center font-mono">Relative share of recorded hours for the active week</p>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            PROJECT TIMELINE MODE INTERFACE
            ============================================================ */}
        {periodMode === 'timeline' && (
          <div className="space-y-6">
            {/* TIMELINE SUMMARY CARD HEADLINE */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-baseline gap-2.5">
                  <h3 className="text-xl sm:text-2xl font-black text-zinc-100 font-display tracking-tight">
                    {selectedProjectId && activeProject ? (
                      <span>{activeProject.name}</span>
                    ) : (
                      <span>All Projects Portfolio</span>
                    )}
                  </h3>
                  {selectedProjectId && activeProject && (
                    <span className="text-xs text-zinc-400 font-mono">
                      (Client: <strong className="text-zinc-200">{activeProject.clientName}</strong>)
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-400">
                  {selectedProjectId && activeProject
                    ? `Progressive burn, role allocation, and budget metrics spanning start date (${new Date(timelineStartStr).toLocaleDateString('en-GB')}) to end date (${new Date(timelineEndStr).toLocaleDateString('en-GB')})`
                    : `Aggregated burn and portfolio metrics across all projects spanning start date (${new Date(timelineStartStr).toLocaleDateString('en-GB')}) to end date (${new Date(timelineEndStr).toLocaleDateString('en-GB')})`}
                </p>
              </div>

              {/* Action: Approve project as done / Reopen toggle */}
              <div className="flex items-center gap-2.5 w-full md:w-auto justify-start md:justify-end shrink-0 pt-2 md:pt-0">
                {activeProject && onUpdateProject ? (
                  isProjectDone(activeProject) ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3.5 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-1.5 font-mono">
                        <CheckCircle2 className="h-4 w-4" />
                        Completed & Approved
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateProject({ ...activeProject, isCompleted: false });
                        }}
                        className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Reopen Project"
                      >
                        <RotateCcw className="h-3.5 w-3.5 text-zinc-400" />
                        <span>Reopen Project</span>
                      </button>
                    </div>
                  ) : hasEndDatePassed(activeProject) ? (
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateProject({ ...activeProject, isCompleted: true });
                      }}
                      className="w-full sm:w-auto px-4.5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/15 active:scale-95"
                    >
                      <CheckCircle2 className="h-4 w-4 stroke-[2.5px]" />
                      <span>Approve Project as Done</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800/80 px-3 py-2 rounded-xl text-xs font-mono text-zinc-400">
                      <Calendar className="h-3.5 w-3.5 text-[#F5720A]" />
                      <span>
                        {activeProject.endDate ? `Active (Ends ${new Date(activeProject.endDate).toLocaleDateString('en-GB')})` : 'Active (Ongoing)'}
                      </span>
                    </div>
                  )
                ) : (
                  projects.length > 0 && (
                    <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800/80 px-3 py-1.5 rounded-xl text-[11px] font-mono text-zinc-400">
                      <span className="text-emerald-400 font-bold">{projects.filter(p => isProjectDone(p)).length}</span>
                      <span>of</span>
                      <span className="text-zinc-200 font-bold">{projects.length}</span>
                      <span>Projects Done</span>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* FINANCIAL KPI CARDS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Card 1: Total Project Budget */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Total Contract Budget</span>
                  <div className="p-1.5 bg-purple-500/5 rounded-lg border border-purple-500/10">
                    <Briefcase className="h-4 w-4 text-purple-400" />
                  </div>
                </div>
                <div>
                  <h4 className="text-xl sm:text-2xl font-black text-zinc-100 font-mono">
                    £{timelineTotalBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h4>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Scoped budget for project span</p>
                </div>
              </div>

              {/* Card 2: Total Spend Logged */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Total Spend Logged</span>
                  <div className="p-1.5 bg-amber-500/5 rounded-lg border border-amber-500/10">
                    <DollarSign className="h-4 w-4 text-[#F5720A]" />
                  </div>
                </div>
                <div>
                  <h4 className="text-xl sm:text-2xl font-black text-zinc-100 font-mono">
                    £{timelineTotalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h4>
                  <p className="text-[10px] text-[#F5720A] font-mono mt-0.5 font-bold">
                    {timelineBurnPercent.toFixed(1)}% of budget consumed
                  </p>
                </div>
              </div>

              {/* Card 3: Remaining Budget */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Remaining Budget</span>
                  <div className="p-1.5 bg-blue-500/5 rounded-lg border border-blue-500/10">
                    <TrendingUp className="h-4 w-4 text-blue-400" />
                  </div>
                </div>
                <div>
                  <h4 className="text-xl sm:text-2xl font-black text-zinc-100 font-mono">
                    £{timelineLeftToSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h4>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Remaining unallocated budget</p>
                </div>
              </div>

              {/* Card 4: Project Gross Margin */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Project Gross Margin</span>
                  <div className="p-1.5 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                    <Award className="h-4 w-4 text-emerald-400" />
                  </div>
                </div>
                <div>
                  <h4 className={`text-xl sm:text-2xl font-black font-mono ${timelineGrossMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    £{timelineGrossMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h4>
                  <p className="text-[10px] font-mono mt-0.5 font-bold text-emerald-400">
                    {timelineGrossMarginPercent.toFixed(1)}% gross margin ({timelineGrossMargin >= 0 ? 'Profitable' : 'Deficit'})
                  </p>
                </div>
              </div>

              {/* Card 5: Total Hours Logged */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Total Hours Logged</span>
                  <div className="p-1.5 bg-[#F5720A]/5 rounded-lg border border-[#F5720A]/10">
                    <Calendar className="h-4 w-4 text-[#F5720A]" />
                  </div>
                </div>
                <div>
                  <h4 className="text-xl sm:text-2xl font-black text-zinc-100 font-mono">{timelineTotalHours.toFixed(1)} hrs</h4>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Across entire project duration</p>
                </div>
              </div>
            </div>

            {/* PORTFOLIO PROJECT STATUS & APPROVALS (Visible when All Projects is selected) */}
            {!selectedProjectId && projects.length > 0 && (
              <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 space-y-4 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-900 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono flex items-center gap-2">
                      <ListTodo className="h-4 w-4 text-[#F5720A]" />
                      Portfolio Projects Delivery & Completion Status
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                      Review all projects across your organization and approve completed deliveries
                    </p>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[10px]">
                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg font-bold">
                      {projects.filter(p => isProjectDone(p)).length} Completed
                    </span>
                    <span className="px-2.5 py-1 bg-[#F5720A]/10 text-[#F5720A] border border-[#F5720A]/20 rounded-lg font-bold">
                      {projects.filter(p => !isProjectDone(p)).length} Active
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-900 text-zinc-500 font-mono text-[10px] uppercase">
                        <th className="py-2.5 px-3">Project & Client</th>
                        <th className="py-2.5 px-3">Timeline Span</th>
                        <th className="py-2.5 px-3 text-right">Contract Budget</th>
                        <th className="py-2.5 px-3 text-right">Logged Spend</th>
                        <th className="py-2.5 px-3 text-center">Burn %</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/40 font-mono">
                      {projects.map((proj) => {
                        const fin = getProjectFinancials(proj);
                        const isDone = isProjectDone(proj);
                        const burnPct = fin.budget > 0 ? (fin.actualLoggedCost / fin.budget) * 100 : 0;

                        return (
                          <tr key={proj.id} className="hover:bg-zinc-900/20 transition-all">
                            <td className="py-3 px-3">
                              <div className="font-bold text-zinc-100">{proj.name}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[9px] font-black text-zinc-950 bg-[#F5720A] px-1.5 py-0.2 rounded uppercase">
                                  {proj.clientName}
                                </span>
                                {proj.isNonBillable && (
                                  <span className="text-[9px] text-zinc-400 bg-zinc-900 px-1.5 py-0.2 rounded border border-zinc-800">
                                    Non-billable
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-zinc-400 text-[11px]">
                              {proj.startDate ? (
                                <span>{proj.startDate} to {proj.endDate || 'Ongoing'}</span>
                              ) : (
                                <span className="text-zinc-600">Unspecified</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right text-zinc-300">
                              {proj.isNonBillable ? '£0' : `£${fin.budget.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-zinc-100">
                              £{fin.actualLoggedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                burnPct > 100 ? 'text-red-400 bg-red-500/10' : 'text-zinc-300 bg-zinc-900'
                              }`}>
                                {burnPct.toFixed(0)}%
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              {isDone ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-bold">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Done
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-[10px] font-bold">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                                  Live
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedProjectId(proj.id)}
                                  className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                                  title="Inspect project timeline"
                                >
                                  Inspect
                                </button>
                                {onUpdateProject && (
                                  isDone ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onUpdateProject({ ...proj, isCompleted: false });
                                      }}
                                      className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg text-[11px] flex items-center gap-1 transition-all cursor-pointer"
                                      title="Reopen project as active"
                                    >
                                      <RotateCcw className="h-3 w-3" />
                                      <span>Reopen</span>
                                    </button>
                                  ) : hasEndDatePassed(proj) ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onUpdateProject({ ...proj, isCompleted: true });
                                      }}
                                      className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-lg text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-sm shadow-emerald-500/10"
                                      title="End date passed: Approve and mark project as done"
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5 stroke-[2.5px]" />
                                      <span>Approve as Done</span>
                                    </button>
                                  ) : null
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* FULL-WIDTH PROJECT ROLE DAYS & SPEND BREAKDOWN TABLE */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 space-y-4 w-full">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-[#F5720A]" />
                  Project Role Days & Spend Breakdown
                </h3>
                <span className="text-[10px] text-zinc-500 font-mono">Entire Project Timeline</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-900 text-zinc-500 font-mono text-[10px] uppercase">
                      <th className="py-2.5 px-3">Role Name</th>
                      <th className="py-2.5 px-3 text-center">Estimated Days</th>
                      <th className="py-2.5 px-3 text-center">Days Logged</th>
                      <th className="py-2.5 px-3 text-right">Estimated Cost</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-emerald-400">Internal Spend</th>
                      <th className="py-2.5 px-3 text-center">Logged Hours</th>
                      <th className="py-2.5 px-3 text-center font-semibold">Hours Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/40 font-mono">
                    {timelineRoleDetailsList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-zinc-600 italic">
                          No activity recorded for this timeline
                        </td>
                      </tr>
                    ) : (
                      timelineRoleDetailsList.map((roleObj, idx) => (
                        <tr key={idx} className="hover:bg-zinc-900/20 transition-all">
                          <td className="py-3 px-3 font-semibold text-zinc-200">{roleObj.roleName}</td>
                          <td className="py-3 px-3 text-center text-zinc-400">{roleObj.estimatedDays.toFixed(1)}</td>
                          <td className="py-3 px-3 text-center text-zinc-300 font-semibold">{roleObj.daysLogged.toFixed(1)}</td>
                          <td className="py-3 px-3 text-right text-zinc-400">
                            £{roleObj.estimatedCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-emerald-400">
                            £{roleObj.internalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-zinc-200">{roleObj.loggedHours.toFixed(1)}</td>
                          <td className="py-3 px-3 text-center font-bold text-emerald-400">{roleObj.hoursRemaining.toFixed(1)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {timelineRoleDetailsList.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-zinc-900 bg-zinc-900/30 font-mono text-xs font-bold">
                        <td className="py-3 px-3 text-zinc-300 uppercase text-[10px]">Total</td>
                        <td className="py-3 px-3 text-center text-zinc-300">{totalEstimatedDays.toFixed(1)}</td>
                        <td className="py-3 px-3 text-center text-zinc-200">{totalDaysLogged.toFixed(1)}</td>
                        <td className="py-3 px-3 text-right text-zinc-300">
                          £{totalEstimatedCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-400">
                          £{totalInternalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-center text-zinc-200">{totalLoggedHours.toFixed(1)}</td>
                        <td className="py-3 px-3 text-center text-emerald-400">{totalHoursRemaining.toFixed(1)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* 2-COLUMN GRID: BURNDOWN CHART & ROLE MARGIN CONTRIBUTION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Timeline Chart: Option A (Cumulative Effort Trend for Internal Projects) OR Burndown Chart (for Billable Projects) */}
              {isInternalProjectChart ? (
                <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-900 pb-3">
                    <div>
                      <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-[#F5720A]" />
                        Internal Project Cumulative Effort & Activity Trend
                      </h3>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        Progressive Cumulative Hours & Internal Effort Trajectory
                      </p>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[10px]">
                      <span className="px-2.5 py-1 bg-[#F5720A]/10 text-[#F5720A] border border-[#F5720A]/20 rounded-lg font-bold flex items-center gap-1">
                        <BarChart2 className="h-3 w-3" />
                        Total Internal Effort: {totalInternalTimelineHours.toFixed(1)} hrs ({totalInternalTimelineDays} days)
                      </span>
                    </div>
                  </div>

                  {/* Legend Header */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 px-1">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-0.5 bg-[#F5720A]"></span>
                        <span className="text-[#F5720A] font-semibold">Cumulative Hours (Burnup)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-0.5 bg-cyan-400 border-t border-dashed border-cyan-400"></span>
                        <span className="text-cyan-400 font-semibold">Interval Effort (hrs)</span>
                      </div>
                    </div>
                    <span className="text-zinc-500 text-[10px]">
                      Non-Billable / Internal Project Track
                    </span>
                  </div>

                  <div className="h-64 w-full text-xs">
                    {totalInternalTimelineHours === 0 ? (
                      <div className="h-full flex items-center justify-center text-zinc-600 italic font-mono text-xs">
                        No effort logged for this internal project timeline
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={timelineInternalBurnupData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorInternalCumulative" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#F5720A" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="#F5720A" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="dateLabel" stroke="#52525b" fontSize={10} tickLine={false} />
                          <YAxis
                            stroke="#52525b"
                            fontSize={11}
                            tickLine={false}
                            tickFormatter={(v) => `${v}h`}
                          />
                          <Tooltip
                            content={({ active, payload, label }) => {
                              if (!active || !payload || !payload.length) return null;
                              const data = payload[0]?.payload as InternalBurnupPoint;
                              if (!data) return null;
                              const cumHrs = data['Cumulative Hours'];
                              const intervalHrs = data['Interval Hours'];
                              const cumDays = data['Cumulative Days'];

                              return (
                                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 shadow-2xl text-xs space-y-2 font-mono">
                                  <div className="border-b border-zinc-800 pb-1 text-zinc-400 font-bold">
                                    Date: {label}
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between gap-4 text-[#F5720A]">
                                      <span>Cumulative Effort:</span>
                                      <span className="font-bold">{cumHrs} hrs ({cumDays} days)</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4 text-cyan-400 text-[11px]">
                                      <span>Interval Logged:</span>
                                      <span className="font-semibold">{intervalHrs} hrs</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="Cumulative Hours"
                            stroke="#F5720A"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorInternalCumulative)"
                            name="Cumulative Hours"
                          />
                          <Line
                            type="monotone"
                            dataKey="Interval Hours"
                            stroke="#06b6d4"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            dot={false}
                            name="Interval Hours"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-500 italic text-center font-mono">
                    Upward progressive cumulative effort trajectory (orange fill) with interval activity cadence (cyan dashed)
                  </p>
                </div>
              ) : (
                <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-900 pb-3">
                    <div>
                      <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-[#F5720A]" />
                        Project Burndown Chart
                      </h3>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        Target Cost Baseline vs. Actual Remaining Budget
                      </p>
                    </div>

                    {/* Pace Badge */}
                    {timelineTotalBudget > 0 && (
                      <div className="flex items-center gap-2 font-mono text-[10px]">
                        {burndownPaceVariance >= 0 ? (
                          <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg font-bold flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Under Budget Pace (+£{burndownPaceVariance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg font-bold flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Over Budget Pace (-£{Math.abs(burndownPaceVariance).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Legend Header */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 px-1">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-0.5 bg-cyan-400 border-t border-dashed border-cyan-400"></span>
                        <span className="text-cyan-400 font-semibold">Budget Line (Target)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-0.5 bg-[#F5720A]"></span>
                        <span className="text-[#F5720A] font-semibold">Actual Remaining</span>
                      </div>
                    </div>
                    <span className="text-zinc-500 text-[10px]">
                      Total Budget: £{timelineTotalBudget.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>

                  <div className="h-64 w-full text-xs">
                    {timelineTotalBudget === 0 && timelineTotalSpend === 0 ? (
                      <div className="h-full flex items-center justify-center text-zinc-600 italic font-mono text-xs">
                        No budget or spend activity recorded for this project timeline
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={timelineBurndownData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                          <XAxis dataKey="dateLabel" stroke="#52525b" fontSize={10} tickLine={false} />
                          <YAxis
                            stroke="#52525b"
                            fontSize={11}
                            tickLine={false}
                            tickFormatter={(v) => `£${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                          />
                          <Tooltip
                            content={({ active, payload, label }) => {
                              if (!active || !payload || !payload.length) return null;
                              const data = payload[0]?.payload as BurndownPoint;
                              if (!data) return null;
                              const target = data['Budget Line (Target)'];
                              const actual = data['Actual Remaining'];
                              const cumSpend = data['Cumulative Spend'];

                              return (
                                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 shadow-2xl text-xs space-y-2 font-mono">
                                  <div className="border-b border-zinc-800 pb-1 text-zinc-400 font-bold">
                                    Date: {label}
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between gap-4 text-cyan-400">
                                      <span>Target Budget Line:</span>
                                      <span className="font-bold">£{target.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    {actual !== null ? (
                                      <div className="flex items-center justify-between gap-4 text-[#F5720A]">
                                        <span>Actual Remaining:</span>
                                        <span className="font-bold">£{actual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                      </div>
                                    ) : (
                                      <div className="text-zinc-600 italic text-[10px]">Actual: Future date</div>
                                    )}
                                    <div className="flex items-center justify-between gap-4 text-zinc-400 text-[11px] pt-1 border-t border-zinc-900">
                                      <span>Cumulative Spend:</span>
                                      <span className="font-semibold text-zinc-200">£{cumSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }}
                          />
                          {/* Target Line (Planned Baseline downward slope) */}
                          <Line
                            type="monotone"
                            dataKey="Budget Line (Target)"
                            stroke="#06b6d4"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={false}
                            activeDot={{ r: 4, fill: '#06b6d4' }}
                            name="Budget Line (Target)"
                          />
                          {/* Actual Remaining Line */}
                          <Line
                            type="monotone"
                            dataKey="Actual Remaining"
                            stroke="#F5720A"
                            strokeWidth={3}
                            dot={{ r: 3, fill: '#F5720A', strokeWidth: 0 }}
                            activeDot={{ r: 6, fill: '#F5720A' }}
                            connectNulls={false}
                            name="Actual Remaining"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-500 italic text-center font-mono">
                    Downward sloping cost baseline (cyan dashed) vs actual remaining budget trajectory (orange solid)
                  </p>
                </div>
              )}

              {/* Proportion of Logged Hours per Role (Donut / Pie Chart) */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-900 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono flex items-center gap-2">
                      <PieIcon className="h-4 w-4 text-[#F5720A]" />
                      Logged Hours by Role & Discipline
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                      Proportion of total logged hours per role
                    </p>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[10px]">
                    <span className="px-2.5 py-1 bg-[#F5720A]/10 text-[#F5720A] border border-[#F5720A]/20 rounded-lg font-bold">
                      {totalLoggedHours.toFixed(1)} hrs total ({(totalLoggedHours / 7).toFixed(1)} days)
                    </span>
                  </div>
                </div>

                <div className="h-64 w-full text-xs flex flex-col md:flex-row items-center justify-between gap-4">
                  {timelineRoleDetailsList.filter((r) => r.loggedHours > 0).length === 0 ? (
                    <div className="h-full w-full flex items-center justify-center text-zinc-600 italic font-mono text-xs">
                      No logged hours recorded for any role in this timeline
                    </div>
                  ) : (
                    <>
                      <div className="h-full w-full md:w-1/2 relative min-h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={timelineRoleDetailsList
                                .filter((r) => r.loggedHours > 0)
                                .map((r) => ({
                                  name: r.roleName,
                                  value: Number(r.loggedHours.toFixed(1)),
                                  daysLogged: Number(r.daysLogged.toFixed(1)),
                                  totalSpend: Number(r.totalSpend.toFixed(2)),
                                }))}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {timelineRoleDetailsList
                                .filter((r) => r.loggedHours > 0)
                                .map((_, index) => (
                                  <Cell
                                    key={`role-cell-${index}`}
                                    fill={ROLE_COLORS[index % ROLE_COLORS.length]}
                                    stroke="#09090b"
                                    strokeWidth={2}
                                  />
                                ))}
                            </Pie>
                            <Tooltip
                              content={({ active, payload }) => {
                                if (!active || !payload || !payload.length) return null;
                                const data = payload[0]?.payload;
                                if (!data) return null;
                                const hrs = data.value;
                                const pct = totalLoggedHours > 0 ? (hrs / totalLoggedHours) * 100 : 0;

                                return (
                                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 font-mono">
                                    <div className="border-b border-zinc-800 pb-1 text-zinc-200 font-bold">
                                      {data.name}
                                    </div>
                                    <div className="flex items-center justify-between gap-4 text-zinc-300">
                                      <span>Logged Hours:</span>
                                      <span className="font-bold text-[#F5720A]">{hrs.toFixed(1)} hrs</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4 text-zinc-400">
                                      <span>Share of Total:</span>
                                      <span className="font-semibold text-emerald-400">{pct.toFixed(1)}%</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4 text-zinc-400">
                                      <span>Days Logged:</span>
                                      <span className="font-semibold">{data.daysLogged.toFixed(1)} days</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4 text-zinc-400 pt-1 border-t border-zinc-900">
                                      <span>Total Client Spend:</span>
                                      <span className="font-semibold text-zinc-200">£{data.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                  </div>
                                );
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Side Legend & Percentage List */}
                      <div className="w-full md:w-1/2 max-h-56 overflow-y-auto space-y-2 pr-1 text-xs font-mono">
                        {timelineRoleDetailsList
                          .filter((r) => r.loggedHours > 0)
                          .map((roleObj, index) => {
                            const pct = totalLoggedHours > 0 ? (roleObj.loggedHours / totalLoggedHours) * 100 : 0;
                            const color = ROLE_COLORS[index % ROLE_COLORS.length];
                            return (
                              <div
                                key={roleObj.roleName}
                                className="bg-zinc-900/30 border border-zinc-900 rounded-lg p-2 flex items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-2 truncate min-w-0">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: color }}
                                  />
                                  <span className="text-zinc-200 font-semibold truncate">{roleObj.roleName}</span>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 text-right">
                                  <span className="text-zinc-400 text-[11px]">{roleObj.loggedHours.toFixed(1)}h</span>
                                  <span
                                    className="px-2 py-0.5 rounded text-[10px] font-bold"
                                    style={{ backgroundColor: `${color}15`, color: color, border: `1px solid ${color}30` }}
                                  >
                                    {pct.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-zinc-500 italic text-center font-mono">
                  Relative proportion of total recorded hours allocated across each role type in the project timeline
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            PROFITABILITY & GROSS MARGIN SUITE INTERFACE
            ============================================================ */}
        {periodMode === 'profitability' && (
          <div className="space-y-6">
            {/* PROFITABILITY HEADLINE SUMMARY CARD */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-baseline gap-2.5">
                  <h3 className="text-xl sm:text-2xl font-black text-zinc-100 font-display tracking-tight">
                    Portfolio & Client Profitability Analysis
                  </h3>
                </div>

                <p className="text-xs text-zinc-400 max-w-3xl leading-relaxed">
                  Real-time gross profit and margin calculations derived from actual billable timesheets against internal role delivery rates and direct project expenses.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-mono font-bold flex items-center gap-2 border border-zinc-800 transition-all cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-[#F5720A]" />
                  Export Ledger CSV
                </button>
              </div>
            </div>

            {/* PORTFOLIO PROFITABILITY KPI CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-mono text-zinc-500 font-bold block">
                  Billable Revenue
                </span>
                <p className="text-xl font-black font-mono text-zinc-100">
                  £{portfolioProfitability.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <span className="text-[10px] text-zinc-500 font-mono">Actual realized value</span>
              </div>

              <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-mono text-zinc-500 font-bold block">
                  Delivery Labor Cost
                </span>
                <p className="text-xl font-black font-mono text-zinc-300">
                  £{portfolioProfitability.totalInternalCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <span className="text-[10px] text-zinc-500 font-mono">Internal rate card cost</span>
              </div>

              <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-mono text-zinc-500 font-bold block">
                  Net Gross Profit
                </span>
                <p className={`text-xl font-black font-mono ${
                  portfolioProfitability.totalGrossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  £{portfolioProfitability.totalGrossProfit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <span className="text-[10px] text-zinc-500 font-mono">Revenue - Delivery - Exp.</span>
              </div>

              <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-mono text-zinc-500 font-bold block">
                  Profit Margin
                </span>
                <div className="flex items-center gap-1.5">
                  <p className={`text-xl font-black font-mono ${
                    portfolioProfitability.overallMarginPercent >= 40
                      ? 'text-emerald-400'
                      : portfolioProfitability.overallMarginPercent >= 20
                      ? 'text-[#F5720A]'
                      : 'text-rose-400'
                  }`}>
                    {portfolioProfitability.overallMarginPercent.toFixed(1)}%
                  </p>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">Overall portfolio margin</span>
              </div>

              <div className="col-span-2 md:col-span-1 bg-zinc-950 border border-zinc-900 p-4 rounded-xl space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-mono text-zinc-500 font-bold block">
                  Logged Delivery
                </span>
                <p className="text-xl font-black font-mono text-zinc-100">
                  {portfolioProfitability.totalHours.toFixed(1)} <span className="text-xs text-zinc-400">hrs</span>
                </p>
                <span className="text-[10px] text-zinc-500 font-mono">{(portfolioProfitability.totalHours / 7).toFixed(1)} days logged</span>
              </div>
            </div>

            {/* SECTION 1: CLIENT PROFITABILITY & GROSS MARGIN MATRIX */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-900 pb-4">
                <div>
                  <h4 className="text-base font-bold text-zinc-100 font-display flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-[#F5720A]" />
                    Client Gross Profit & Margin Breakdown
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Aggregated financial return, delivery labor costs, and profit margin performance per client.
                  </p>
                </div>
                <span className="text-xs font-mono text-zinc-500">
                  {clientProfitabilityList.length} Active Accounts
                </span>
              </div>

              <div className="overflow-x-auto border border-zinc-900 rounded-xl">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead>
                    <tr className="bg-zinc-900/80 border-b border-zinc-900 text-zinc-400 text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-4">Client Name</th>
                      <th className="py-3 px-3 text-center">Projects</th>
                      <th className="py-3 px-3 text-center">Logged Hours</th>
                      <th className="py-3 px-3 text-right">Billable Revenue</th>
                      <th className="py-3 px-3 text-right">Internal Cost</th>
                      <th className="py-3 px-3 text-right">Expenses</th>
                      <th className="py-3 px-3 text-right text-emerald-400">Gross Profit (£)</th>
                      <th className="py-3 px-3 text-right text-[#F5720A]">Margin (%)</th>
                      <th className="py-3 px-4 text-center">Margin Health</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/60 text-xs">
                    {clientProfitabilityList.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-zinc-500 italic">
                          No client financial data logged yet.
                        </td>
                      </tr>
                    ) : (
                      clientProfitabilityList.map((client) => {
                        return (
                          <tr key={client.clientName} className="hover:bg-zinc-900/40 transition-colors">
                            <td className="py-3 px-4 font-sans font-bold text-zinc-100">
                              <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-[#F5720A]" />
                                <span>{client.clientName}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center text-zinc-300">
                              <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[11px]">
                                {client.projectCount} ({client.activeCount} live, {client.completedCount} done)
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center text-zinc-300 font-bold">
                              {client.hoursLogged.toFixed(1)}h
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-zinc-100">
                              £{client.billableRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </td>
                            <td className="py-3 px-3 text-right text-zinc-400">
                              £{client.internalLaborCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </td>
                            <td className="py-3 px-3 text-right text-zinc-500">
                              {client.expense > 0 ? `£${client.expense.toLocaleString()}` : '£0'}
                            </td>
                            <td className={`py-3 px-3 text-right font-black ${
                              client.grossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              £{client.grossProfit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </td>
                            <td className="py-3 px-3 text-right font-black text-zinc-100">
                              {client.billableRevenue > 0 ? (
                                <span className={
                                  client.marginPercent >= 45
                                    ? 'text-emerald-400'
                                    : client.marginPercent >= 25
                                    ? 'text-[#F5720A]'
                                    : 'text-rose-400'
                                }>
                                  {client.marginPercent.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-zinc-600">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {client.marginHealth === 'high' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  High Margin (≥45%)
                                </span>
                              )}
                              {client.marginHealth === 'healthy' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                  Healthy (25–45%)
                                </span>
                              )}
                              {client.marginHealth === 'low' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  Low (&lt;25%)
                                </span>
                              )}
                              {client.marginHealth === 'deficit' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                  Deficit (&lt;0%)
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 2: PROJECT-LEVEL GROSS PROFIT & MARGIN AUDIT */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
                <div>
                  <h4 className="text-base font-bold text-zinc-100 font-display flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#F5720A]" />
                    Project-by-Project Profitability Ledger
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Individual project gross margin calculations, contract budgets vs. realized revenue, and delivery variance.
                  </p>
                </div>

                {/* Filter & Sort Controls */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-300">
                    <Search className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                    <input
                      type="text"
                      placeholder="Filter project or client..."
                      value={profitSearchTerm}
                      onChange={(e) => setProfitSearchTerm(e.target.value)}
                      className="bg-transparent focus:outline-none text-zinc-200 placeholder-zinc-500 text-xs w-36"
                    />
                  </div>

                  <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1 text-[11px] font-mono">
                    <button
                      type="button"
                      onClick={() => setProfitSortBy('profit')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        profitSortBy === 'profit' ? 'bg-[#F5720A] text-zinc-950 font-bold' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Sort Profit (£)
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfitSortBy('margin')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        profitSortBy === 'margin' ? 'bg-[#F5720A] text-zinc-950 font-bold' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Sort Margin (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfitSortBy('revenue')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        profitSortBy === 'revenue' ? 'bg-[#F5720A] text-zinc-950 font-bold' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Sort Revenue
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto border border-zinc-900 rounded-xl">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead>
                    <tr className="bg-zinc-900/80 border-b border-zinc-900 text-zinc-400 text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-4">Project & Client</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-center">Hours</th>
                      <th className="py-3 px-3 text-right">Budget (£)</th>
                      <th className="py-3 px-3 text-right">Revenue (£)</th>
                      <th className="py-3 px-3 text-right">Internal Cost</th>
                      <th className="py-3 px-3 text-right">Exp.</th>
                      <th className="py-3 px-3 text-right text-emerald-400">Gross Profit (£)</th>
                      <th className="py-3 px-3 text-right text-[#F5720A]">Margin (%)</th>
                      <th className="py-3 px-4 text-center">Health</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/60 text-xs">
                    {filteredProjectProfitability.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-zinc-500 italic">
                          No matching projects found.
                        </td>
                      </tr>
                    ) : (
                      filteredProjectProfitability.map((p) => {
                        return (
                          <tr key={p.id} className="hover:bg-zinc-900/40 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-zinc-100 font-sans">{p.name}</div>
                              <div className="text-[10px] text-zinc-400">{p.clientName}</div>
                            </td>
                            <td className="py-3 px-3 text-center">
                              {p.isCompleted ? (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-900 text-zinc-400 border border-zinc-800">
                                  Done
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  Live
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center text-zinc-300">
                              {p.hoursLogged.toFixed(1)}h
                            </td>
                            <td className="py-3 px-3 text-right text-zinc-400">
                              {p.isNonBillable ? (
                                <span className="text-zinc-600">Non-billable</span>
                              ) : (
                                `£${p.contractBudget.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-zinc-100">
                              {p.isNonBillable ? (
                                <span className="text-zinc-600">£0</span>
                              ) : (
                                `£${p.billableRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                              )}
                            </td>
                            <td className="py-3 px-3 text-right text-zinc-400">
                              £{p.internalLaborCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </td>
                            <td className="py-3 px-3 text-right text-zinc-500">
                              {p.expense > 0 ? `£${p.expense.toLocaleString()}` : '£0'}
                            </td>
                            <td className={`py-3 px-3 text-right font-black ${
                              p.grossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              £{p.grossProfit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </td>
                            <td className="py-3 px-3 text-right font-black">
                              {p.billableRevenue > 0 ? (
                                <span className={
                                  p.marginPercent >= 45
                                    ? 'text-emerald-400'
                                    : p.marginPercent >= 25
                                    ? 'text-[#F5720A]'
                                    : 'text-rose-400'
                                }>
                                  {p.marginPercent.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-zinc-600">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {p.marginHealth === 'high' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  High
                                </span>
                              )}
                              {p.marginHealth === 'healthy' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                  Healthy
                                </span>
                              )}
                              {p.marginHealth === 'low' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  Low
                                </span>
                              )}
                              {p.marginHealth === 'deficit' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                  Deficit
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {periodMode === 'monthly' && (
          <div className="space-y-6">
            {/* MONTHLY SUMMARY CARD HEADLINE */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-baseline gap-2.5">
                  <h3 className="text-xl sm:text-2xl font-black text-zinc-100 font-display tracking-tight">
                    {selectedProjectId && activeProject ? (
                      <span>{activeProject.name}</span>
                    ) : (
                      <span>All Active Projects</span>
                    )}
                  </h3>
                  {selectedProjectId && activeProject && (
                    <span className="text-xs text-zinc-400 font-mono">
                      (Client: <strong className="text-zinc-200">{activeProject.clientName}</strong>)
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-400">
                  Budget analytics and consulting margins generated between {new Date(monthStartStr).toLocaleDateString('en-GB')} and {new Date(monthEndStr).toLocaleDateString('en-GB')}
                </p>
              </div>

              {/* Action: Approve project as done / Reopen toggle */}
              <div className="flex items-center gap-2.5 w-full md:w-auto justify-start md:justify-end shrink-0 pt-2 md:pt-0">
                {activeProject && onUpdateProject && (
                  isProjectDone(activeProject) ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3.5 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-1.5 font-mono">
                        <CheckCircle2 className="h-4 w-4" />
                        Completed & Approved
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateProject({ ...activeProject, isCompleted: false });
                        }}
                        className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Reopen Project"
                      >
                        <RotateCcw className="h-3.5 w-3.5 text-zinc-400" />
                        <span>Reopen Project</span>
                      </button>
                    </div>
                  ) : hasEndDatePassed(activeProject) ? (
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateProject({ ...activeProject, isCompleted: true });
                      }}
                      className="w-full sm:w-auto px-4.5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/15 active:scale-95"
                    >
                      <CheckCircle2 className="h-4 w-4 stroke-[2.5px]" />
                      <span>Approve Project as Done</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800/80 px-3 py-2 rounded-xl text-xs font-mono text-zinc-400">
                      <Calendar className="h-3.5 w-3.5 text-[#F5720A]" />
                      <span>
                        {activeProject.endDate ? `Active (Ends ${new Date(activeProject.endDate).toLocaleDateString('en-GB')})` : 'Active (Ongoing)'}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* FINANCIAL KPI CARDS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Monthly Hours */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Monthly Hours Logged</span>
                  <div className="p-1.5 bg-[#F5720A]/5 rounded-lg border border-[#F5720A]/10">
                    <Calendar className="h-4 w-4 text-[#F5720A]" />
                  </div>
                </div>
                <div>
                  <h4 className="text-2xl font-black text-zinc-100 font-mono">{monthTotalHours.toFixed(1)}</h4>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Total billable hours this month</p>
                </div>
              </div>

              {/* Card 2: Total spend (Advisor Hours) */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Monthly Hours Spend</span>
                  <div className="p-1.5 bg-green-500/5 rounded-lg border border-green-500/10">
                    <DollarSign className="h-4 w-4 text-green-500" />
                  </div>
                </div>
                <div>
                  <h4 className="text-2xl font-black text-zinc-100 font-mono">£{monthTotalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h4>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Discounts & expenses outside this total</p>
                </div>
              </div>

              {/* Card 3: Remaining Capacity */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Total Left to Spend</span>
                  <div className="p-1.5 bg-blue-500/5 rounded-lg border border-blue-500/10">
                    <TrendingUp className="h-4 w-4 text-blue-400" />
                  </div>
                </div>
                <div>
                  <h4 className="text-2xl font-black text-zinc-100 font-mono">£{monthLeftToSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h4>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Remaining contract allocation budget</p>
                </div>
              </div>

              {/* Card 4: Active Rate Cards */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Active Rate Cards</span>
                  <div className="p-1.5 bg-purple-500/5 rounded-lg border border-purple-500/10">
                    <Award className="h-4 w-4 text-purple-400" />
                  </div>
                </div>
                <div>
                  <h4 className="text-base font-bold text-zinc-200 truncate mt-1">
                    {monthRateCards.length > 0 ? monthRateCards.join(', ') : 'No logs'}
                  </h4>
                  <p className="text-[10px] text-zinc-500 font-mono mt-2">Active card pricing schemas applied</p>
                </div>
              </div>
            </div>

            {/* MONTHLY DATA VISUALIZATION BLOCK */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Table of spends by Role */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-[#F5720A]" />
                    Hours & Days Spend by Role
                  </h3>
                  <span className="text-[10px] text-zinc-500 font-mono">Sorted by role spend</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-900 pb-2 text-zinc-500 font-mono text-[10px] uppercase">
                        <th className="py-2">Role Title</th>
                        <th className="py-2 text-center">Days Logged</th>
                        <th className="py-2 text-center">Logged Hours</th>
                        <th className="py-2 text-right font-semibold">Total Spend</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/40">
                      {monthRolesList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-zinc-600 italic">
                            No monthly records logged for the selected filter
                          </td>
                        </tr>
                      ) : (
                        monthRolesList
                          .sort((a, b) => b.spend - a.spend)
                          .map((roleObj, idx) => (
                            <tr key={idx} className="hover:bg-zinc-900/10 transition-all">
                              <td className="py-3 font-semibold text-zinc-300">{roleObj.role}</td>
                              <td className="py-3 text-center font-mono text-zinc-300 font-semibold">{(roleObj.hours / 7).toFixed(2)}</td>
                              <td className="py-3 text-center font-mono font-bold text-zinc-200">{roleObj.hours.toFixed(1)}</td>
                              <td className="py-3 text-right font-mono font-black text-[#F5720A]">£{roleObj.spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Monthly Cumulative Burn Graph */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-[#F5720A]" />
                    Progressive Monthly Burn Graph
                  </h3>
                  <span className="text-[10px] text-zinc-500 font-mono">Cumulative Hours Spend (£)</span>
                </div>

                <div className="h-64 w-full text-xs">
                  {monthTotalSpend === 0 ? (
                    <div className="h-full flex items-center justify-center text-zinc-600 italic font-mono text-xs">
                      No billing activity detected in the selected month
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyBurnData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#F5720A" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#F5720A" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="day" stroke="#52525b" fontSize={11} tickLine={false} />
                        <YAxis stroke="#52525b" fontSize={11} tickLine={false} tickFormatter={(v) => `£${v}`} />
                        <Tooltip
                          formatter={(value: any) => [`£${Number(value).toFixed(2)}`, 'Cumulative Spend']}
                          labelFormatter={(label) => `Day ${label} of Month`}
                          contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#18181b', borderRadius: '10px' }}
                          labelStyle={{ color: '#a1a1aa', fontWeight: 'bold' }}
                          itemStyle={{ color: '#F5720A' }}
                        />
                        <Area type="monotone" dataKey="Cumulative Spend" stroke="#F5720A" strokeWidth={2} fillOpacity={1} fill="url(#colorSpend)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <p className="text-[10px] text-zinc-500 italic text-center font-mono">Day-by-day continuous burn tracking for selected criteria</p>
              </div>
            </div>
          </div>
        )}


      </div>

    </div>
  );
}
