import React, { useState, useEffect } from 'react';
import { RateCard, Project, TimesheetEntry, ProjectTeamMember, RoleCost } from '../types';
import { Plus, FolderPlus, CreditCard, DollarSign, ListTodo, Users, ArrowUpRight, TrendingUp, HelpCircle, Trash2, Edit, Check, X, Calendar, CheckCircle2, AlertCircle, Clock, LayoutGrid, List, AlertTriangle, RotateCcw } from 'lucide-react';

interface ProjectManagerProps {
  projects: Project[];
  rateCards: RateCard[];
  entries: TimesheetEntry[];
  clients: string[];
  globalMembers: string[];
  globalRoles: string[];
  onCreateClient: (clientName: string) => void;
  onCreateMember: (memberName: string) => void;
  onCreateRole: (roleName: string) => void;
  onCreateRateCard: (card: RateCard) => void;
  onUpdateRateCard?: (card: RateCard) => void;
  onCreateProject: (project: Project) => void;
  onUpdateProject?: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onDeleteClient: (clientName: string) => void;
  onDeleteRateCard: (cardId: string) => void;
  onDeleteRole: (cardId: string, roleId: string) => void;
  onUpdateRole: (cardId: string, updatedRole: RoleCost) => void;
  onDeleteMember: (memberName: string) => void;
  onDeleteRoleName: (roleName: string) => void;
  onUpdateClient: (oldName: string, newName: string) => void;
  onUpdateMember: (oldName: string, newName: string) => void;
  onUpdateRoleName: (oldName: string, newName: string) => void;
}

export default function ProjectManager({
  projects,
  rateCards,
  entries,
  clients,
  globalMembers,
  globalRoles,
  onCreateClient,
  onCreateMember,
  onCreateRole,
  onCreateRateCard,
  onUpdateRateCard,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onDeleteClient,
  onDeleteRateCard,
  onDeleteRole,
  onUpdateRole,
  onDeleteMember,
  onDeleteRoleName,
  onUpdateClient,
  onUpdateMember,
  onUpdateRoleName,
}: ProjectManagerProps) {
  // --- Create Rate Card State ---
  const [rcName, setRcName] = useState('');
  const [rcClientName, setRcClientName] = useState('');
  const [roles, setRoles] = useState<Omit<RoleCost, 'id'>[]>([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleCost, setNewRoleCost] = useState('');
  const [newRoleInternalCost, setNewRoleInternalCost] = useState('');

  // --- Create Project State ---
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [selectedRateCardId, setSelectedRateCardId] = useState('');
  const [teamMembers, setTeamMembers] = useState<ProjectTeamMember[]>([]);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRoleId, setNewMemberRoleId] = useState('');
  const [newMemberAllocatedDays, setNewMemberAllocatedDays] = useState('');
  const [scopeBacklog, setScopeBacklog] = useState('');
  const [discount, setDiscount] = useState('');
  const [expense, setExpense] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isNonBillable, setIsNonBillable] = useState(false);

  // --- Popup Modals States ---
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [showCreateMemberModal, setShowCreateMemberModal] = useState(false);
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);
  const [popupRoleName, setPopupRoleName] = useState('');
  const [popupMemberName, setPopupMemberName] = useState('');
  const [popupClientName, setPopupClientName] = useState('');

  // --- Inline Editing States ---
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editRoleName, setEditRoleName] = useState('');
  const [editRoleCost, setEditRoleCost] = useState('');
  const [editRoleInternalCost, setEditRoleInternalCost] = useState('');

  // --- Master Directory Inline States ---
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [editClientVal, setEditClientVal] = useState('');
  const [newClientVal, setNewClientVal] = useState('');

  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [editMemberVal, setEditMemberVal] = useState('');
  const [newMemberVal, setNewMemberVal] = useState('');

  const [editingRoleNameState, setEditingRoleNameState] = useState<string | null>(null);
  const [editRoleNameVal, setEditRoleNameVal] = useState('');
  const [newRoleNameVal, setNewRoleNameVal] = useState('');

  // --- Toggle state ---
  const [activeTab, setActiveTab] = useState<'portfolio' | 'create_project' | 'create_rate_card' | 'directory'>('portfolio');

  // --- Project Editing State ---
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  // --- Multiple Role Confirmation State ---
  const [multipleRoleConfirm, setMultipleRoleConfirm] = useState<{
    memberName: string;
    roleId: string;
    hours: number;
  } | null>(null);

  // --- Quick Edit Allocation Modal State ---
  const [quickEditAllocation, setQuickEditAllocation] = useState<{
    projectId: string;
    projectName: string;
    memberName: string;
    roleId: string;
    roleName: string;
    hours: number;
  } | null>(null);

  // --- View Mode & Edit Rate Card States ---
  const [liveProjectsViewMode, setLiveProjectsViewMode] = useState<'card' | 'list'>('list');
  const [completedProjectsViewMode, setCompletedProjectsViewMode] = useState<'card' | 'list'>('list');
  const [editingRateCard, setEditingRateCard] = useState<RateCard | null>(null);
  const [editCardNewRoleName, setEditCardNewRoleName] = useState('');
  const [editCardNewRoleCost, setEditCardNewRoleCost] = useState('');
  const [editCardNewRoleInternalCost, setEditCardNewRoleInternalCost] = useState('');

  // --- Extend Date State ---
  const [extendDateProject, setExtendDateProject] = useState<Project | null>(null);
  const [newEndDateVal, setNewEndDateVal] = useState<string>('');

  // --- Toast State ---
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
  };

  const resetProjectForm = () => {
    setEditingProjectId(null);
    setProjectName('');
    setClientName('');
    setSelectedRateCardId('');
    setTeamMembers([]);
    setScopeBacklog('');
    setDiscount('');
    setExpense('');
    setStartDate('');
    setEndDate('');
    setIsNonBillable(false);
  };

  const handleStartEditProject = (proj: Project) => {
    setEditingProjectId(proj.id);
    setProjectName(proj.name);
    setClientName(proj.clientName);
    setSelectedRateCardId(proj.rateCardId);
    setTeamMembers(proj.teamMembers);
    setScopeBacklog(proj.scopeBacklog);
    setDiscount(proj.discount ? proj.discount.toString() : '');
    setExpense(proj.expense ? proj.expense.toString() : '');
    setStartDate(proj.startDate || '');
    setEndDate(proj.endDate || '');
    setIsNonBillable(!!proj.isNonBillable);
    setActiveTab('create_project');
  };

  // --- Beautiful Custom Deletion Modal State ---
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'project' | 'client' | 'rateCard' | 'rateCardRole' | 'globalMember' | 'globalRole';
    id: string; // id or name
    name: string;
    extraId?: string; // used for cardId when deleting a role inside rateCard
  } | null>(null);

  const triggerDelete = (
    type: 'project' | 'client' | 'rateCard' | 'rateCardRole' | 'globalMember' | 'globalRole',
    id: string,
    name: string,
    extraId?: string
  ) => {
    setDeleteTarget({ type, id, name, extraId });
  };

  // --- Rate Card Helpers ---
  const handleAddRoleToDraft = () => {
    if (!newRoleName.trim()) return;
    const cost = parseFloat(newRoleCost);
    if (isNaN(cost) || cost <= 0) {
      showToast('error', 'Please enter a valid billing rate');
      return;
    }
    const internalVal = parseFloat(newRoleInternalCost);
    setRoles([
      ...roles,
      {
        role: newRoleName.trim(),
        hourlyCost: cost,
        internalCost: !isNaN(internalVal) ? internalVal : undefined,
      },
    ]);
    setNewRoleName('');
    setNewRoleCost('');
    setNewRoleInternalCost('');
  };

  const handleRemoveRoleFromDraft = (index: number) => {
    setRoles(roles.filter((_, idx) => idx !== index));
  };

  const handleSaveRateCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rcName.trim()) {
      showToast('error', 'Rate card name is required');
      return;
    }
    if (roles.length === 0) {
      showToast('error', 'Please add at least one role to the rate card');
      return;
    }

    const card: RateCard = {
      id: `rc-${Date.now()}`,
      name: rcName.trim(),
      roles: roles.map((r, i) => ({ id: `role-${Date.now()}-${i}`, ...r })),
      clientName: rcClientName || undefined,
    };

    onCreateRateCard(card);
    setRcName('');
    setRcClientName('');
    setRoles([]);
    showToast('success', 'Rate Card created successfully!');
    setActiveTab('portfolio');
  };

  const handleAddRoleToEditingCard = () => {
    if (!editCardNewRoleName.trim()) {
      showToast('error', 'Please choose a role to add');
      return;
    }
    const cost = parseFloat(editCardNewRoleCost);
    if (isNaN(cost) || cost <= 0) {
      showToast('error', 'Please enter a valid billing rate');
      return;
    }
    const internalVal = parseFloat(editCardNewRoleInternalCost);
    if (!editingRateCard) return;
    setEditingRateCard({
      ...editingRateCard,
      roles: [
        ...editingRateCard.roles,
        {
          id: `role_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          role: editCardNewRoleName.trim(),
          hourlyCost: cost,
          internalCost: !isNaN(internalVal) ? internalVal : undefined,
        },
      ],
    });
    setEditCardNewRoleName('');
    setEditCardNewRoleCost('');
    setEditCardNewRoleInternalCost('');
  };

  const handleSaveEditingRateCard = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingRateCard) return;
    if (!editingRateCard.name.trim()) {
      showToast('error', 'Rate card name cannot be empty');
      return;
    }
    if (editingRateCard.roles.length === 0) {
      showToast('error', 'Please add at least one role to the rate card');
      return;
    }
    if (onUpdateRateCard) {
      onUpdateRateCard(editingRateCard);
    }
    showToast('success', `Rate Card "${editingRateCard.name}" updated successfully!`);
    setEditingRateCard(null);
    setEditCardNewRoleName('');
    setEditCardNewRoleCost('');
    setEditCardNewRoleInternalCost('');
  };

  // --- Project Allocation Helpers ---
  const addTeamMemberDirectly = (name: string, rId: string, hrs: number) => {
    setTeamMembers([
      ...teamMembers,
      {
        memberName: name,
        roleId: rId,
        hoursAllocated: hrs,
      },
    ]);
    setNewMemberName('');
    setNewMemberRoleId('');
    setNewMemberAllocatedDays('');
  };

  const roundUpToQuarterDay = (days: number): number => {
    if (days <= 0 || isNaN(days)) return 0;
    return Math.ceil(days * 4) / 4;
  };

  const handleAddTeamMemberToDraft = () => {
    if (!newMemberName.trim()) {
      showToast('error', 'Please enter a team member name');
      return;
    }
    if (!newMemberRoleId) {
      showToast('error', 'Please select a role for the team member');
      return;
    }
    const days = parseFloat(newMemberAllocatedDays);
    if (!isNonBillable && (isNaN(days) || days <= 0)) {
      showToast('error', 'Please enter allocated days');
      return;
    }
    const roundedDays = (isNaN(days) || days <= 0) ? 0 : roundUpToQuarterDay(days);
    const hours = roundedDays * 7;

    // Check if member already exists in project team draft with the SAME role
    const alreadyHasRole = teamMembers.some(
      (m) =>
        m.memberName.toLowerCase() === newMemberName.trim().toLowerCase() &&
        m.roleId === newMemberRoleId
    );
    if (alreadyHasRole) {
      showToast('error', 'Team member is already added to this project draft with this exact role');
      return;
    }

    // Check if member has other role in project draft and ask for confirmation
    const hasOtherRole = teamMembers.some(
      (m) => m.memberName.toLowerCase() === newMemberName.trim().toLowerCase()
    );
    if (hasOtherRole) {
      setMultipleRoleConfirm({
        memberName: newMemberName.trim(),
        roleId: newMemberRoleId,
        hours: hours,
      });
      return;
    }

    addTeamMemberDirectly(newMemberName.trim(), newMemberRoleId, hours);
  };

  const handleRemoveMemberFromDraft = (memberName: string, roleId: string) => {
    setTeamMembers(teamMembers.filter((m) => !(m.memberName === memberName && m.roleId === roleId)));
  };

  const handleUpdateDraftMemberDays = (memberName: string, roleId: string, newDays: number) => {
    const roundedDays = roundUpToQuarterDay(newDays);
    const newHours = roundedDays * 7;
    setTeamMembers((prev) =>
      prev.map((m) =>
        m.memberName === memberName && m.roleId === roleId
          ? { ...m, hoursAllocated: newHours }
          : m
      )
    );
  };

  const handleSaveQuickAllocation = (newHours: number, displayDays?: number) => {
    if (!quickEditAllocation) return;
    const targetProj = projects.find((p) => p.id === quickEditAllocation.projectId);
    if (!targetProj) return;

    const rawDays = displayDays !== undefined ? displayDays : newHours / 7;
    const roundedDays = roundUpToQuarterDay(rawDays);
    const finalHours = roundedDays * 7;

    const updatedTeamMembers = targetProj.teamMembers.map((tm) =>
      tm.memberName === quickEditAllocation.memberName && tm.roleId === quickEditAllocation.roleId
        ? { ...tm, hoursAllocated: finalHours }
        : tm
    );

    const updatedProject = {
      ...targetProj,
      teamMembers: updatedTeamMembers,
    };

    if (onUpdateProject) {
      onUpdateProject(updatedProject);
    }
    showToast('success', `Updated ${quickEditAllocation.memberName}'s allocation to ${roundedDays} day(s)`);
    setQuickEditAllocation(null);
  };

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !clientName.trim()) {
      showToast('error', 'Project Name and Client Name are mandatory');
      return;
    }
    if (!selectedRateCardId) {
      showToast('error', 'Rate Card selection is mandatory');
      return;
    }
    if (teamMembers.length === 0) {
      showToast('error', 'Please add at least one team member to the project');
      return;
    }
    if (!scopeBacklog.trim()) {
      showToast('error', 'Detailed Scope Backlog is mandatory');
      return;
    }

    const project: Project = {
      id: editingProjectId || `proj-${Date.now()}`,
      name: projectName.trim(),
      clientName: clientName.trim(),
      rateCardId: selectedRateCardId,
      teamMembers,
      scopeBacklog: scopeBacklog.trim(),
      discount: discount ? parseFloat(discount) : 0,
      expense: expense ? parseFloat(expense) : 0,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      isNonBillable,
    };

    if (editingProjectId) {
      if (onUpdateProject) {
        onUpdateProject(project);
      }
      showToast('success', 'Project updated successfully!');
    } else {
      onCreateProject(project);
      showToast('success', 'Project created successfully!');
    }

    // Reset draft fields
    resetProjectForm();

    setActiveTab('portfolio');
  };

  // Auto-fill first role of selected rate card in project member draft
  const activeRateCardForProject = rateCards.find((rc) => rc.id === selectedRateCardId);
  const rolesInActiveCard = activeRateCardForProject ? activeRateCardForProject.roles : [];

  // Sorted Registries for Alphabetical Display
  const sortedClients = [...clients].sort((a, b) => a.localeCompare(b));
  const sortedGlobalMembers = [...globalMembers].sort((a, b) => a.localeCompare(b));
  const sortedGlobalRoles = [...globalRoles].sort((a, b) => a.localeCompare(b));
  const sortedRateCards = [...rateCards].sort((a, b) => a.name.localeCompare(b.name));
  const sortedRolesInActiveCard = [...rolesInActiveCard].sort((a, b) => a.role.localeCompare(b.role));

  // --- Financial Stats Calculators (over existing data) ---
  const getProjectFinancials = (proj: Project) => {
    const rc = rateCards.find((card) => card.id === proj.rateCardId);
    const projEntries = entries.filter((e) => e.projectId === proj.id);
    const hoursLogged = projEntries.reduce((sum, e) => sum + e.hours, 0);

    if (proj.isNonBillable) {
      return { budget: 0, actualLoggedCost: 0, actualInternalCost: 0, backlogEarnings: 0, hoursLogged, remainingHrs: 0 };
    }

    if (!rc) return { budget: 0, actualLoggedCost: 0, actualInternalCost: 0, backlogEarnings: 0, hoursLogged, remainingHrs: 0 };

    // 1. Total Planned Budget = Sum over team allocation (Allocated Days * Day Rate) - discount + expense
    let plannedBudget = 0;
    proj.teamMembers.forEach((m) => {
      const dayRate = rc.roles.find((r) => r.id === m.roleId)?.hourlyCost || 0;
      const allocatedDays = m.hoursAllocated / 7;
      plannedBudget += allocatedDays * dayRate;
    });
    plannedBudget = plannedBudget - (proj.discount || 0) + (proj.expense || 0);

    // 2. Actual Hours and Cost logged in Timesheet Entries
    let actualLoggedCost = 0;
    let actualInternalCost = 0;

    projEntries.forEach((entry) => {
      // Find team member's role in the project definition
      const memberAllocation = proj.teamMembers.find(
        (m) => m.memberName.toLowerCase() === entry.teamMember.toLowerCase()
      );
      const roleObj = memberAllocation
        ? rc.roles.find((r) => r.id === memberAllocation.roleId)
        : rc.roles.find((r) => r.role === entry.roleName);

      const dayRate = roleObj?.hourlyCost || 0;
      const internalDayRate = roleObj?.internalCost !== undefined ? roleObj.internalCost : dayRate;

      actualLoggedCost += entry.hours * (dayRate / 7);
      actualInternalCost += entry.hours * (internalDayRate / 7);
    });

    // 3. Potential Earnings Backlog = Value of remaining allocated days for each member
    let backlogEarnings = 0;
    let remainingHrs = 0;

    proj.teamMembers.forEach((m) => {
      const memberLoggedHrs = projEntries
        .filter((e) => e.teamMember.toLowerCase() === m.memberName.toLowerCase())
        .reduce((sum, e) => sum + e.hours, 0);

      const dayRate = rc.roles.find((r) => r.id === m.roleId)?.hourlyCost || 0;
      const remainingForMember = Math.max(0, m.hoursAllocated - memberLoggedHrs);
      const remainingDays = remainingForMember / 7;
      backlogEarnings += remainingDays * dayRate;
      remainingHrs += remainingForMember;
    });

    // Adjust for discount and expense in backlog calculation if appropriate
    backlogEarnings = Math.max(0, backlogEarnings - (proj.discount || 0) + (proj.expense || 0));

    return {
      budget: plannedBudget,
      actualLoggedCost,
      actualInternalCost,
      backlogEarnings,
      hoursLogged,
      remainingHrs,
    };
  };

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

  const handleToggleProjectCompleted = (proj: Project) => {
    if (!onUpdateProject) return;
    const nextState = !proj.isCompleted;
    onUpdateProject({ ...proj, isCompleted: nextState });
    showToast(
      'success',
      nextState ? `Marked "${proj.name}" as completed` : `Reopened "${proj.name}" as active`
    );
  };

  const renderProjectCard = (proj: Project) => {
    const fin = getProjectFinancials(proj);
    const rc = rateCards.find((card) => card.id === proj.rateCardId);
    const percentBurned = fin.budget > 0 ? Math.min(100, Math.round((fin.actualLoggedCost / fin.budget) * 100)) : 0;

    return (
      <div
        key={proj.id}
        className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 hover:border-zinc-800 transition-all space-y-4"
      >
        {/* Project Row Header */}
        <div className="flex flex-col gap-3.5 border-b border-zinc-900 pb-3.5">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[9px] font-black text-zinc-950 bg-[#F5720A] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {proj.clientName}
                </span>
                {proj.isNonBillable && (
                  <span className="text-[9px] font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Non-billable
                  </span>
                )}
                <span className="text-zinc-500 text-[10px] font-mono">
                  Rate Card: <span className="text-zinc-300">{rc?.name || 'Unknown'}</span>
                </span>
                {proj.startDate && (
                  <span className="text-zinc-500 text-[9px] font-mono flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-[#F5720A]" />
                    <span className="text-zinc-300">
                      {proj.startDate} {proj.endDate ? `to ${proj.endDate}` : ''}
                    </span>
                  </span>
                )}
              </div>
              <h4 className="text-md font-bold text-zinc-100 tracking-tight">{proj.name}</h4>
            </div>
            <div className="flex items-center gap-1.5">
              {!isProjectDone(proj) ? (
                hasEndDatePassed(proj) && (
                  <button
                    type="button"
                    onClick={() => handleToggleProjectCompleted(proj)}
                    className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/30 rounded-lg transition-all cursor-pointer shadow-sm"
                    title="End Date Passed: Approve Project as Completed"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </button>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => handleToggleProjectCompleted(proj)}
                  className="p-1.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg transition-all cursor-pointer hover:bg-zinc-800"
                  title="Reopen Project (Mark Active)"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleStartEditProject(proj)}
                className="p-1.5 text-zinc-500 hover:text-[#F5720A] hover:bg-[#F5720A]/10 border border-zinc-900 hover:border-[#F5720A]/20 rounded-lg transition-all cursor-pointer"
                title="Edit Project Scope"
              >
                <Edit className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => triggerDelete('project', proj.id, proj.name)}
                className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 border border-zinc-900 hover:border-red-500/20 rounded-lg transition-all cursor-pointer"
                title="Delete Project"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {hasEndDatePassed(proj) && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 space-y-2 mt-1">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold font-mono">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                <span>Project End Date Passed ({proj.endDate})</span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-snug">
                Please confirm if this project is completed or update the end date to extend allocation.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleToggleProjectCompleted(proj)}
                  className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-[11px] rounded-lg transition-all cursor-pointer shadow-sm flex items-center gap-1"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Confirm Completed
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExtendDateProject(proj);
                    setNewEndDateVal(proj.endDate || getTodayYmd());
                  }}
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-amber-300 font-semibold text-[11px] border border-amber-500/30 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Update End Date
                </button>
              </div>
            </div>
          )}

          {/* Project Financial Breakdown widgets */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono w-full">
            <div className="bg-zinc-900/40 px-2.5 py-1 border border-zinc-900 rounded-lg">
              <span className="text-zinc-500 text-[8px] uppercase tracking-wider block">Budget</span>
              <span className="text-zinc-200 font-bold">
                £{fin.budget.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </span>
            </div>
            <div className="bg-zinc-900/40 px-2.5 py-1 border border-zinc-900 rounded-lg">
              <span className="text-zinc-500 text-[8px] uppercase tracking-wider block">Internal Cost</span>
              <span className={`font-bold ${proj.isNonBillable ? 'text-emerald-200/50' : 'text-emerald-400'}`}>
                £{fin.actualInternalCost.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </span>
            </div>
            <div className="bg-zinc-900/40 px-2.5 py-1 border border-zinc-900 rounded-lg">
              <span className="text-zinc-500 text-[8px] uppercase tracking-wider block">Gross Margin</span>
              <span className={`font-bold ${(fin.budget - fin.actualInternalCost) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {fin.budget > 0 
                  ? `${(((fin.budget - fin.actualInternalCost) / fin.budget) * 100).toFixed(1)}%` 
                  : '0.0%'}
              </span>
            </div>
            <div className="bg-[#F5720A]/10 px-2.5 py-1 border border-[#F5720A]/20 rounded-lg">
              <span className="text-[#F5720A] text-[8px] uppercase tracking-wider block font-bold">Backlog</span>
              <span className="text-[#F5720A] font-bold">
                £{fin.backlogEarnings.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>

        {/* Burn Progress Bar */}
        <div className="space-y-1 bg-zinc-900/20 p-2.5 rounded-lg border border-zinc-900">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-zinc-400">Budget Burn Status</span>
            <span className={`font-mono font-bold ${percentBurned > 90 ? 'text-red-400' : percentBurned > 75 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {percentBurned}% Burned (£{Math.round(fin.actualLoggedCost).toLocaleString()} / £{Math.round(fin.budget).toLocaleString()})
            </span>
          </div>
          <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/40">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                percentBurned > 90 ? 'bg-red-500' : percentBurned > 75 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${percentBurned}%` }}
            ></div>
          </div>
        </div>

        {/* Project Scope Backlog */}
        <div className="bg-zinc-900/20 p-3 rounded-lg border border-zinc-900 text-[11px] space-y-1">
          <span className="text-[9px] font-bold text-[#F5720A] uppercase tracking-wider flex items-center gap-1 font-mono">
            <ListTodo className="h-3 w-3" />
            Scope Backlog
          </span>
          <p className="text-zinc-300 leading-relaxed italic">
            "{proj.scopeBacklog}"
          </p>
        </div>

        {/* Scoped Team Allocation & Rates */}
        <div className="space-y-2">
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block flex items-center gap-1 font-mono">
            <Users className="h-3 w-3 text-zinc-400" />
            Allocations
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {proj.teamMembers.map((m) => {
              const roleObj = rc?.roles.find((r) => r.id === m.roleId);
              const memberLoggedHrs = entries
                .filter((e) => e.projectId === proj.id && e.teamMember.toLowerCase() === m.memberName.toLowerCase())
                .reduce((sum, e) => sum + e.hours, 0);

              return (
                <div
                  key={`${m.memberName}-${m.roleId}`}
                  className="bg-zinc-900/10 p-2 rounded-lg border border-zinc-900 text-[10px] flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between font-semibold text-zinc-200">
                    <span>{m.memberName}</span>
                    <span className="text-zinc-500 font-mono">£{roleObj?.hourlyCost || 0}/day</span>
                  </div>
                  <div className="text-zinc-500 text-[9px] mt-0.5">
                    Role: <span className="text-zinc-400">{roleObj?.role || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[9px] border-t border-zinc-900/60 pt-1.5 mt-2">
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-500">
                        Hrs Logged: <span className="text-[#F5720A] font-bold">{memberLoggedHrs.toFixed(1)}</span> / <span className="text-zinc-200 font-semibold">{(m.hoursAllocated / 7).toFixed(2)} day(s)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setQuickEditAllocation({
                            projectId: proj.id,
                            projectName: proj.name,
                            memberName: m.memberName,
                            roleId: m.roleId,
                            roleName: roleObj?.role || 'N/A',
                            hours: m.hoursAllocated,
                          })
                        }
                        className="p-0.5 text-zinc-500 hover:text-[#F5720A] hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                        title="Edit member allocated days"
                      >
                        <Edit className="h-2.5 w-2.5" />
                      </button>
                    </div>
                    <span className="text-zinc-400 font-mono bg-zinc-900 px-1 rounded">
                      {m.hoursAllocated > 0 ? Math.round((memberLoggedHrs / m.hoursAllocated) * 100) : 0}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Discount & Expenses footer banner */}
        {(proj.discount || proj.expense) ? (
          <div className="flex flex-wrap items-center gap-2 text-[9px] text-zinc-500 font-mono pt-1">
            {proj.discount ? (
              <span className="bg-red-950/15 border border-red-500/10 px-2 py-0.5 rounded text-red-400">
                Discount: -£{proj.discount}
              </span>
            ) : null}
            {proj.expense ? (
              <span className="bg-blue-950/15 border border-blue-500/10 px-2 py-0.5 rounded text-blue-400">
                Expenses: +£{proj.expense}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

  const renderInlineRateCardEditor = () => {
    if (!editingRateCard) return null;

    return (
      <div
        id="inline-rate-card-editor"
        className="bg-zinc-950 border-2 border-[#F5720A]/40 rounded-2xl p-5 md:p-6 space-y-6 shadow-2xl relative animate-in fade-in duration-200"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#F5720A]/15 border border-[#F5720A]/30 text-[#F5720A]">
              <Edit className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#F5720A] uppercase tracking-wider font-mono">
                  Rate Card Editor
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  ID: {editingRateCard.id}
                </span>
              </div>
              <h4 className="text-base font-bold text-zinc-100 font-mono mt-0.5">
                {editingRateCard.name || 'Untitled Rate Card'}
              </h4>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingRateCard(null);
              setEditCardNewRoleName('');
              setEditCardNewRoleCost('');
              setEditCardNewRoleInternalCost('');
            }}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-zinc-100 border border-zinc-800 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-center"
          >
            <X className="h-3.5 w-3.5" />
            Cancel Edit
          </button>
        </div>

        {/* Inputs: Name and Client */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              Rate Card Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={editingRateCard.name}
              onChange={(e) =>
                setEditingRateCard({ ...editingRateCard, name: e.target.value })
              }
              placeholder="eg. Standard Advisory Rate Card..."
              className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-[#F5720A]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              Associate with Client (optional)
            </label>
            <select
              value={editingRateCard.clientName || ''}
              onChange={(e) =>
                setEditingRateCard({
                  ...editingRateCard,
                  clientName: e.target.value || undefined,
                })
              }
              className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-[#F5720A]"
            >
              <option value="">-- No Association / General --</option>
              {sortedClients.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Role addition section */}
        <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-5 space-y-4">
          <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono">
            Add Roles, Billing Day Rates & Internal Costs to Rate Card
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end bg-zinc-950 p-4 rounded-xl border border-zinc-900 font-mono">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Role Name (e.g. Director)
              </label>
              <select
                value={editCardNewRoleName}
                onChange={(e) => setEditCardNewRoleName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#F5720A]"
              >
                <option value="">-- Choose Role --</option>
                {sortedGlobalRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Billing Day Rate (£)
              </label>
              <input
                type="number"
                min="0"
                value={editCardNewRoleCost}
                onChange={(e) => setEditCardNewRoleCost(e.target.value)}
                placeholder="e.g. 800"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#F5720A]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Internal Cost (£/day)
              </label>
              <input
                type="number"
                min="0"
                value={editCardNewRoleInternalCost}
                onChange={(e) => setEditCardNewRoleInternalCost(e.target.value)}
                placeholder="e.g. 450"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#F5720A]"
              />
            </div>

            <button
              type="button"
              onClick={handleAddRoleToEditingCard}
              className="w-full bg-zinc-800 hover:bg-[#F5720A] hover:text-zinc-950 border border-zinc-700 hover:border-[#F5720A] rounded-lg text-xs font-semibold py-2 transition-all cursor-pointer"
            >
              + Include Role
            </button>
          </div>

          {/* List of roles in this rate card */}
          <div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2 font-mono">
              Rate Card Roles ({editingRateCard.roles.length})
            </span>
            {editingRateCard.roles.length === 0 ? (
              <div className="text-zinc-500 italic text-[11px] p-4 text-center bg-zinc-900/10 border border-zinc-900 border-dashed rounded-lg">
                Please add at least one role to this rate card.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {editingRateCard.roles.map((r, i) => (
                  <div
                    key={r.id || i}
                    className="bg-zinc-900 border border-zinc-850 p-3 rounded-xl flex flex-col justify-between text-xs font-mono space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={r.role}
                        onChange={(e) => {
                          const updatedRoles = [...editingRateCard.roles];
                          updatedRoles[i] = { ...updatedRoles[i], role: e.target.value };
                          setEditingRateCard({ ...editingRateCard, roles: updatedRoles });
                        }}
                        className="font-bold text-zinc-100 bg-zinc-950 border border-zinc-800 rounded px-2 py-0.5 text-xs w-full focus:outline-none focus:border-[#F5720A]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updatedRoles = editingRateCard.roles.filter((_, idx) => idx !== i);
                          setEditingRateCard({ ...editingRateCard, roles: updatedRoles });
                        }}
                        className="text-red-500 hover:text-red-400 font-bold ml-1 text-base px-1 cursor-pointer transition-colors"
                        title="Remove Role"
                      >
                        ×
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <span className="text-zinc-400 block mb-0.5">Billing (£/day):</span>
                        <input
                          type="number"
                          min="0"
                          value={r.hourlyCost}
                          onChange={(e) => {
                            const updatedRoles = [...editingRateCard.roles];
                            updatedRoles[i] = {
                              ...updatedRoles[i],
                              hourlyCost: parseFloat(e.target.value) || 0,
                            };
                            setEditingRateCard({ ...editingRateCard, roles: updatedRoles });
                          }}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-[#F5720A] font-bold focus:outline-none focus:border-[#F5720A]"
                        />
                      </div>
                      <div>
                        <span className="text-zinc-400 block mb-0.5">Cost (£/day):</span>
                        <input
                          type="number"
                          min="0"
                          value={r.internalCost ?? ''}
                          onChange={(e) => {
                            const updatedRoles = [...editingRateCard.roles];
                            updatedRoles[i] = {
                              ...updatedRoles[i],
                              internalCost: parseFloat(e.target.value) || 0,
                            };
                            setEditingRateCard({ ...editingRateCard, roles: updatedRoles });
                          }}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-emerald-400 font-semibold focus:outline-none focus:border-[#F5720A]"
                        />
                      </div>
                    </div>

                    <div className="text-[9px] text-zinc-500 flex justify-between border-t border-zinc-850 pt-1.5 font-mono">
                      <span>Daily Margin:</span>
                      <span className="text-zinc-300 font-bold">
                        £{(r.hourlyCost - (r.internalCost ?? r.hourlyCost)).toLocaleString('en-GB')}/day
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => handleSaveEditingRateCard()}
            className="w-full sm:w-auto flex-1 bg-[#F5720A] hover:bg-orange-hover text-zinc-955 font-bold py-3 px-8 rounded-full transition-all shadow-lg shadow-[#F5720A]/10 flex items-center justify-center gap-2 cursor-pointer text-xs"
          >
            <Check className="h-4 w-4 stroke-[2.5px]" />
            Save Rate Card Changes
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingRateCard(null);
              setEditCardNewRoleName('');
              setEditCardNewRoleCost('');
              setEditCardNewRoleInternalCost('');
            }}
            className="w-full sm:w-auto bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-semibold py-3 px-6 rounded-full border border-zinc-700 transition-colors cursor-pointer text-xs"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  const renderRateCardsCatalog = () => (
    <div className="space-y-4 pt-6 border-t border-zinc-900">
      <div className="flex items-center justify-between">
        <h3 className="eyebrow-label text-xs">Rate Cards</h3>
        <span className="text-[10px] text-zinc-500 font-mono">
          {sortedRateCards.length} rate cards defined
        </span>
      </div>

      {/* Inline Editor if active (NO POPUP!) */}
      {editingRateCard && renderInlineRateCardEditor()}

      {sortedRateCards.length === 0 ? (
        <div className="p-8 border border-zinc-900 border-dashed rounded-xl text-center text-zinc-500 text-xs italic bg-zinc-950/20">
          No rate cards defined yet. Create one above!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedRateCards.map((card) => (
            <div
              key={card.id}
              className={`bg-zinc-950 border rounded-xl p-4 space-y-3 relative transition-all ${
                editingRateCard?.id === card.id
                  ? 'border-[#F5720A] ring-1 ring-[#F5720A]/40 bg-zinc-900/60 shadow-lg'
                  : 'border-zinc-900 hover:border-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wide font-mono text-[#F5720A]">
                      {card.name}
                    </h4>
                    {editingRateCard?.id === card.id && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#F5720A]/20 text-[#F5720A] border border-[#F5720A]/30 uppercase font-mono">
                        Editing
                      </span>
                    )}
                  </div>
                  {card.clientName && (
                    <span className="text-[10px] text-zinc-500 block font-mono">
                      Client: {card.clientName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRateCard({ ...card, roles: card.roles.map(r => ({ ...r })) });
                      setTimeout(() => {
                        const el = document.getElementById('inline-rate-card-editor');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 50);
                    }}
                    className={`p-1.5 border rounded-lg transition-all cursor-pointer ${
                      editingRateCard?.id === card.id
                        ? 'bg-[#F5720A] text-zinc-950 border-[#F5720A]'
                        : 'text-zinc-500 hover:text-[#F5720A] hover:bg-[#F5720A]/10 border-zinc-900 hover:border-[#F5720A]/20'
                    }`}
                    title="Edit Rate Card"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerDelete('rateCard', card.id, card.name)}
                    className="p-1.5 text-red-500 hover:text-red-400 hover:bg-red-500/10 border border-zinc-900 hover:border-red-500/20 rounded-lg transition-all cursor-pointer"
                    title="Delete Rate Card"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="divide-y divide-zinc-900 border border-zinc-900 rounded-lg overflow-hidden bg-zinc-900/30">
                {card.roles.map((role) => {
                  const isEditing = editingRoleId === role.id;
                  if (isEditing) {
                    return (
                      <div key={role.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-2 text-xs bg-zinc-900 font-mono">
                        <input
                          type="text"
                          value={editRoleName}
                          onChange={(e) => setEditRoleName(e.target.value)}
                          className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-100 text-xs focus:outline-none focus:border-[#F5720A]"
                          placeholder="Role Name"
                        />
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-zinc-500 text-[10px]">Billing: £</span>
                            <input
                              type="number"
                              value={editRoleCost}
                              onChange={(e) => setEditRoleCost(e.target.value)}
                              className="w-16 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-100 text-xs focus:outline-none focus:border-[#F5720A] text-right font-mono"
                              placeholder="Rate"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-zinc-500 text-[10px]">Cost: £</span>
                            <input
                              type="number"
                              value={editRoleInternalCost}
                              onChange={(e) => setEditRoleInternalCost(e.target.value)}
                              className="w-16 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-100 text-xs focus:outline-none focus:border-[#F5720A] text-right font-mono"
                              placeholder="Cost"
                            />
                          </div>
                          <div className="flex items-center gap-1 ml-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (!editRoleName.trim()) {
                                  alert('Role name cannot be empty');
                                  return;
                                }
                                const cost = parseFloat(editRoleCost);
                                if (isNaN(cost) || cost < 0) {
                                  alert('Please enter a valid rate');
                                  return;
                                }
                                const internalVal = parseFloat(editRoleInternalCost);
                                onUpdateRole(card.id, {
                                  id: role.id,
                                  role: editRoleName.trim(),
                                  hourlyCost: cost,
                                  internalCost: !isNaN(internalVal) ? internalVal : undefined,
                                });
                                setEditingRoleId(null);
                              }}
                              className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded cursor-pointer"
                              title="Confirm edit"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingRoleId(null)}
                              className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded cursor-pointer"
                              title="Cancel edit"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={role.id} className="flex items-center justify-between p-2.5 text-xs group/role font-mono">
                      <span className="text-zinc-300 font-medium">{role.role}</span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-[#F5720A] font-bold">Billing: £{role.hourlyCost}/day</span>
                          <span className="text-zinc-600">|</span>
                          <span className="text-emerald-400 font-semibold">Cost: £{role.internalCost ?? role.hourlyCost}/day</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRoleId(role.id);
                            setEditRoleName(role.role);
                            setEditRoleCost(role.hourlyCost.toString());
                            setEditRoleInternalCost(role.internalCost !== undefined ? role.internalCost.toString() : '');
                          }}
                          className="text-zinc-500 hover:text-zinc-300 p-0.5 cursor-pointer opacity-0 group-hover/role:opacity-100 transition-opacity"
                          title="Edit Role"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => triggerDelete('rateCardRole', role.id, role.role, card.id)}
                          className="text-zinc-500 hover:text-red-400 font-bold px-1.5 cursor-pointer text-sm"
                          title="Delete Role"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderProjectListTable = (projectList: Project[]) => (
    <div className="bg-zinc-950 border border-zinc-900 rounded-xl overflow-x-auto shadow-lg">
      <table className="w-full text-left text-xs font-mono">
        <thead>
          <tr className="bg-zinc-900/80 border-b border-zinc-900 text-zinc-400 uppercase text-[10px] tracking-wider">
            <th className="py-3.5 px-4 font-bold">Project Name & Client</th>
            <th className="py-3.5 px-4 font-bold">Advisory Rate Card</th>
            <th className="py-3.5 px-4 font-bold">Hours & Allocations</th>
            <th className="py-3.5 px-4 font-bold">Contract Budget</th>
            <th className="py-3.5 px-4 font-bold">Internal Cost</th>
            <th className="py-3.5 px-4 font-bold">Margin</th>
            <th className="py-3.5 px-4 font-bold">Budget Burn</th>
            <th className="py-3.5 px-4 font-bold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-900/80">
          {projectList.map((proj) => {
            const fin = getProjectFinancials(proj);
            const rc = rateCards.find((card) => card.id === proj.rateCardId);
            const percentBurned = fin.budget > 0 ? Math.min(100, Math.round((fin.actualLoggedCost / fin.budget) * 100)) : 0;
            const totalAllocated = proj.teamMembers.reduce((sum, m) => sum + m.hoursAllocated, 0);
            
            // Gross margin based on Estimated Client Budget minus Internal Cost Spend So Far
            const grossMarginAmount = fin.budget - fin.actualInternalCost;
            const marginPercent = fin.budget > 0 ? (grossMarginAmount / fin.budget) * 100 : 0;

            return (
              <tr key={proj.id} className="hover:bg-zinc-900/40 transition-colors">
                <td className="py-3.5 px-4">
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-zinc-100 font-sans text-xs">{proj.name}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold text-zinc-950 bg-[#F5720A] px-1.5 py-0.2 rounded uppercase">
                        {proj.clientName}
                      </span>
                      {proj.isNonBillable && (
                        <span className="text-[9px] text-zinc-400 bg-zinc-900 px-1.5 py-0.2 rounded uppercase border border-zinc-800">
                          Non-billable
                        </span>
                      )}
                      {proj.startDate && (
                        <span className="text-[9px] text-zinc-500">
                          {proj.startDate} {proj.endDate ? `- ${proj.endDate}` : ''}
                        </span>
                      )}
                      {hasEndDatePassed(proj) && (
                        <span className="text-[9px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 rounded uppercase flex items-center gap-1 w-fit">
                          <AlertTriangle className="h-2.5 w-2.5" /> End Date Passed
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-zinc-300">
                  <span className="bg-zinc-900 px-2 py-1 rounded border border-zinc-800 text-[11px]">
                    {rc?.name || 'Unknown'}
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-zinc-200 font-bold">
                      {fin.hoursLogged.toFixed(1)} hrs logged
                    </span>
                    <span className="text-zinc-400 text-[10px]">
                      {(totalAllocated / 7).toFixed(2)} day(s) allocated
                    </span>
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex flex-col">
                    <span className="text-zinc-100 font-bold">£{fin.budget.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                    <span className="text-zinc-500 text-[10px]">Contract Value</span>
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex flex-col">
                    <span className={`font-bold ${proj.isNonBillable ? 'text-emerald-200/50' : 'text-emerald-400'}`}>
                      £{fin.actualInternalCost.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                    </span>
                    <span className="text-zinc-500 text-[10px]">Internal Cost</span>
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex flex-col">
                    <span className={`font-bold ${grossMarginAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {marginPercent.toFixed(1)}%
                    </span>
                    <span className="text-zinc-400 text-[10px]">
                      £{grossMarginAmount.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <div className="w-28">
                    <div className="flex justify-between items-center text-[9px] mb-1">
                      <span className={`font-bold ${percentBurned > 90 ? 'text-red-400' : percentBurned > 75 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {percentBurned}% Burned
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                      <div
                        className={`h-full rounded-full transition-all ${
                          percentBurned > 90 ? 'bg-red-500' : percentBurned > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percentBurned}%` }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {!isProjectDone(proj) ? (
                      hasEndDatePassed(proj) && (
                        <button
                          type="button"
                          onClick={() => handleToggleProjectCompleted(proj)}
                          className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/30 rounded-lg transition-all cursor-pointer shadow-sm"
                          title="End Date Passed: Approve Project as Completed"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </button>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleProjectCompleted(proj)}
                        className="p-1.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg transition-all cursor-pointer hover:bg-zinc-800"
                        title="Reopen Project (Mark Active)"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {hasEndDatePassed(proj) && (
                      <button
                        type="button"
                        onClick={() => {
                          setExtendDateProject(proj);
                          setNewEndDateVal(proj.endDate || getTodayYmd());
                        }}
                        className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/30 rounded-lg transition-all cursor-pointer"
                        title="Update End Date"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleStartEditProject(proj)}
                      className="p-1.5 text-zinc-500 hover:text-[#F5720A] hover:bg-[#F5720A]/10 border border-zinc-900 hover:border-[#F5720A]/20 rounded-lg transition-all cursor-pointer"
                      title="Edit Project Scope"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerDelete('project', proj.id, proj.name)}
                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 border border-zinc-900 hover:border-red-500/20 rounded-lg transition-all cursor-pointer"
                      title="Delete Project"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // Portfolio Totals
  const totalStats = projects.reduce(
    (acc, proj) => {
      if (proj.isNonBillable) {
        return acc;
      }
      const fin = getProjectFinancials(proj);
      acc.totalBudget += fin.budget;
      acc.totalActualLogged += fin.actualLoggedCost;
      acc.totalBacklogValue += fin.backlogEarnings;
      acc.totalHoursLogged += fin.hoursLogged;
      return acc;
    },
    { totalBudget: 0, totalActualLogged: 0, totalBacklogValue: 0, totalHoursLogged: 0 }
  );

  return (
    <div className="no-print bg-[#0a0a0a] border border-zinc-900 rounded-2xl p-6 shadow-2xl space-y-8">
      {/* Title & Navigation Tabs */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
        <div>
          <span className="eyebrow-label block mb-1">Advisory Portfolio</span>
          <h2 className="text-xl font-display text-zinc-100 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#F5720A]" />
            Project <span className="text-[#F5720A]">Setup</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">Define advisory rate cards, design scoped projects, and audit financial run rates</p>
        </div>

        {/* Tab Selection & Popup Triggers */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-900">
            <button
              onClick={() => {
                setActiveTab('portfolio');
                resetProjectForm();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'portfolio'
                  ? 'bg-[#F5720A]/10 text-[#F5720A] border border-[#F5720A]/20 shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Portfolio
            </button>
            <button
              onClick={() => {
                setActiveTab('create_project');
                resetProjectForm();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'create_project'
                  ? 'bg-[#F5720A]/10 text-[#F5720A] border border-[#F5720A]/20 shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              + Create Project
            </button>
            <button
              onClick={() => {
                setActiveTab('create_rate_card');
                resetProjectForm();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'create_rate_card'
                  ? 'bg-[#F5720A]/10 text-[#F5720A] border border-[#F5720A]/20 shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              + Create Rate Card
            </button>
            <button
              onClick={() => {
                setActiveTab('directory');
                resetProjectForm();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'directory'
                  ? 'bg-[#F5720A]/10 text-[#F5720A] border border-[#F5720A]/20 shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              ⚙ Manage Directory
            </button>
          </div>
        </div>
      </div>

      {/* 1. PORTFOLIO & BACKLOGS TAB */}
      {activeTab === 'portfolio' && (
        <div className="space-y-8">
          {/* Portfolio Summary Widgets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 flex items-center justify-between relative overflow-hidden group hover:border-zinc-800 transition-all">
              <div>
                <span className="eyebrow-label text-[9px] block mb-1.5">
                  Portfolio Booking Value
                </span>
                <span className="text-3xl font-black text-zinc-100 font-sans tracking-tight block">
                  £{totalStats.totalBudget.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
                <span className="text-[10px] text-zinc-500 block mt-1.5">Total contract scoped value</span>
              </div>
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-[#F5720A]">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 flex items-center justify-between relative overflow-hidden group hover:border-zinc-800 transition-all">
              <div>
                <span className="eyebrow-label text-[9px] block mb-1.5">
                  Actual Logged Billings
                </span>
                <span className="text-3xl font-black text-emerald-400 font-sans tracking-tight block">
                  £{totalStats.totalActualLogged.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
                <span className="text-[10px] text-zinc-500 block mt-1.5">Committed actual timesheet revenues</span>
              </div>
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-emerald-500/20">
                <DollarSign className="h-5 w-5 text-emerald-400" />
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 flex items-center justify-between relative overflow-hidden group hover:border-zinc-800 transition-all bg-gradient-to-br from-zinc-950 to-[#F5720A]/5">
              <div>
                <span className="eyebrow-label text-[9px] block mb-1.5">
                  Potential Earnings Backlog
                </span>
                <span className="text-3xl font-black text-[#F5720A] font-sans tracking-tight block">
                  £{totalStats.totalBacklogValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
                <span className="text-[10px] text-zinc-500 block mt-1.5">Remaining unbilled advisory capacity</span>
              </div>
              <div className="p-3 bg-[#F5720A]/10 border border-[#F5720A]/20 rounded-xl text-[#F5720A]">
                <ArrowUpRight className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* List of Scoped Projects */}
          <div className="space-y-4">
            {projects.length === 0 ? (
              <div className="p-12 border border-zinc-900 border-dashed rounded-xl text-center text-zinc-500 text-xs italic bg-zinc-950/20">
                No active projects found. Create a new project or rate card above to begin!
              </div>
            ) : (
              <div className="space-y-8">
                {/* Expired Projects Alert Banner */}
                {projects.filter(p => hasEndDatePassed(p)).length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-300">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg shrink-0">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-amber-400">
                          {projects.filter(p => hasEndDatePassed(p)).length} Project(s) Passed End Date
                        </h4>
                        <p className="text-xs text-zinc-300 mt-0.5">
                          Please review and confirm if completed or update their end dates to extend active allocations.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Section 1: Live Projects */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-900/60 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
                        Live Projects ({projects.filter(p => !isProjectDone(p)).length})
                      </h3>
                    </div>

                    {/* View Switcher (Card vs List) */}
                    <div className="flex items-center gap-1 bg-zinc-950 p-1 border border-zinc-900 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setLiveProjectsViewMode('card')}
                        className={`p-1 rounded transition-all cursor-pointer ${
                          liveProjectsViewMode === 'card'
                            ? 'bg-[#F5720A]/10 text-[#F5720A] border border-[#F5720A]/20'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                        title="Card Grid View"
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setLiveProjectsViewMode('list')}
                        className={`p-1 rounded transition-all cursor-pointer ${
                          liveProjectsViewMode === 'list'
                            ? 'bg-[#F5720A]/10 text-[#F5720A] border border-[#F5720A]/20'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                        title="Compact List View"
                      >
                        <List className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {projects.filter(p => !isProjectDone(p)).length === 0 ? (
                    <div className="p-12 border border-zinc-900 border-dashed rounded-xl text-center text-zinc-500 text-xs italic bg-zinc-950/20">
                      No active live projects.
                    </div>
                  ) : liveProjectsViewMode === 'list' ? (
                    renderProjectListTable(projects.filter(p => !isProjectDone(p)))
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {projects.filter(p => !isProjectDone(p)).map((proj) => renderProjectCard(proj))}
                    </div>
                  )}
                </div>

                {/* Section 2: Completed / Done Projects (Under Live Projects) */}
                <div className="space-y-4 border-t border-zinc-900/80 pt-6">
                  <div className="flex items-center justify-between border-b border-zinc-900/60 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-zinc-500"></span>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
                        Completed / Done Projects ({projects.filter(p => isProjectDone(p)).length})
                      </h3>
                    </div>

                    {/* View Switcher (Card vs List) */}
                    <div className="flex items-center gap-1 bg-zinc-950 p-1 border border-zinc-900 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setCompletedProjectsViewMode('card')}
                        className={`p-1 rounded transition-all cursor-pointer ${
                          completedProjectsViewMode === 'card'
                            ? 'bg-[#F5720A]/10 text-[#F5720A] border border-[#F5720A]/20'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                        title="Card Grid View"
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCompletedProjectsViewMode('list')}
                        className={`p-1 rounded transition-all cursor-pointer ${
                          completedProjectsViewMode === 'list'
                            ? 'bg-[#F5720A]/10 text-[#F5720A] border border-[#F5720A]/20'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                        title="Compact List View"
                      >
                        <List className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {projects.filter(p => isProjectDone(p)).length === 0 ? (
                    <div className="p-12 border border-zinc-900 border-dashed rounded-xl text-center text-zinc-500 text-xs italic bg-zinc-950/20">
                      No completed projects.
                    </div>
                  ) : completedProjectsViewMode === 'list' ? (
                    renderProjectListTable(projects.filter(p => isProjectDone(p)))
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {projects.filter(p => isProjectDone(p)).map((proj) => renderProjectCard(proj))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. CREATE PROJECT TAB */}
      {activeTab === 'create_project' && (
        <form onSubmit={handleSaveProject} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. Acme Mobile App Design"
                className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-[#F5720A] focus:ring-1 focus:ring-[#F5720A]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Client Name <span className="text-red-500">*</span></span>
              </label>

              <select
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-[#F5720A] focus:ring-1 focus:ring-[#F5720A]"
              >
                <option value="" disabled>-- Select Client --</option>
                {sortedClients.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Rate Card Choice */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Select Advisory Rate Card <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedRateCardId}
                onChange={(e) => {
                  setSelectedRateCardId(e.target.value);
                  setTeamMembers([]); // reset draft team on rate card change
                }}
                required
                className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-[#F5720A] focus:ring-1 focus:ring-[#F5720A]"
              >
                <option value="" disabled>-- Choose Rate Card --</option>
                {sortedRateCards.map((rc) => (
                  <option key={rc.id} value={rc.id}>
                    {rc.name} ({rc.roles.length} roles)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Project Discount (£, optional)
              </label>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="e.g. 500"
                className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-[#F5720A] focus:ring-1 focus:ring-[#F5720A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Project Anticipated Expenses (£, optional)
              </label>
              <input
                type="number"
                min="0"
                value={expense}
                onChange={(e) => setExpense(e.target.value)}
                placeholder="e.g. 150"
                className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-[#F5720A] focus:ring-1 focus:ring-[#F5720A]"
              />
            </div>
          </div>

          {/* Project Timeline Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 font-mono">
                Project Start Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  onClick={(e) => {
                    try {
                      (e.target as any).showPicker();
                    } catch (err) {}
                  }}
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-xl pl-9 pr-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-[#F5720A] focus:ring-1 focus:ring-[#F5720A] transition-all cursor-pointer [color-scheme:dark]"
                />
                <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 font-mono">
                Project End Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  onClick={(e) => {
                    try {
                      (e.target as any).showPicker();
                    } catch (err) {}
                  }}
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-xl pl-9 pr-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-[#F5720A] focus:ring-1 focus:ring-[#F5720A] transition-all cursor-pointer [color-scheme:dark]"
                />
                <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* DYNAMIC RESOURCE ALLOCATION CARD */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 space-y-4">
            <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Users className="h-3.5 w-3.5 text-[#F5720A]" />
              Resource Allocation Planner
            </h4>

            {/* Allocate member widget */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 items-end bg-zinc-900/40 p-4 rounded-xl border border-zinc-900">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Team Member Name</span>
                </label>

                <select
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#F5720A]"
                >
                  <option value="">-- Choose Member --</option>
                  {sortedGlobalMembers.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Role from Rate Card
                </label>
                <select
                  value={newMemberRoleId}
                  onChange={(e) => setNewMemberRoleId(e.target.value)}
                  disabled={!selectedRateCardId}
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none disabled:opacity-50"
                >
                  <option value="">-- Choose Role --</option>
                  {sortedRolesInActiveCard.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.role} (£{r.hourlyCost}/day)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Allocated Days</span>
                  {isNonBillable && (
                    <span className="text-[9px] text-[#F5720A] normal-case font-mono font-normal">Optional</span>
                  )}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  value={newMemberAllocatedDays}
                  onChange={(e) => setNewMemberAllocatedDays(e.target.value)}
                  placeholder={isNonBillable ? "Optional (e.g. 0)" : "e.g. 1.25"}
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleAddTeamMemberToDraft}
                disabled={!selectedRateCardId}
                className="w-full bg-zinc-800 hover:bg-[#F5720A] hover:text-zinc-950 border border-zinc-700 hover:border-[#F5720A] rounded-lg text-xs font-semibold py-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                + Allocate Member
              </button>
            </div>

            {/* List of active allocations in this draft */}
            <div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2 font-mono">
                Active Project Allocations ({teamMembers.length})
              </span>
              {teamMembers.length === 0 ? (
                <div className="text-zinc-500 italic text-[11px] p-4 text-center bg-zinc-900/10 border border-zinc-900 border-dashed rounded-lg">
                  Please allocate at least one resource using the panel above.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {teamMembers.map((m) => {
                    const role = rolesInActiveCard.find((r) => r.id === m.roleId);
                    return (
                      <div
                        key={`${m.memberName}-${m.roleId}`}
                        className="bg-zinc-900/50 border border-zinc-900 p-2.5 rounded-xl flex items-center justify-between text-xs gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-zinc-200 truncate">{m.memberName}</p>
                          <p className="text-[10px] text-zinc-400 truncate">
                            {role?.role || 'N/A'} (£{role?.hourlyCost || 0}/day)
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800 focus-within:border-[#F5720A]">
                            <input
                              type="number"
                              min="0"
                              step="0.25"
                              value={m.hoursAllocated === 0 ? '' : Number((m.hoursAllocated / 7).toFixed(2))}
                              onChange={(e) =>
                                handleUpdateDraftMemberDays(
                                  m.memberName,
                                  m.roleId,
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-12 bg-transparent text-zinc-100 font-mono text-xs text-right focus:outline-none font-bold"
                              title="Click to edit allocated days"
                            />
                            <span className="text-[10px] text-zinc-500 font-mono">day(s)</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveMemberFromDraft(m.memberName, m.roleId)}
                            className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                            title="Remove allocation"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Non-billable project option */}
          <div className="flex items-start gap-3 bg-zinc-950 border border-zinc-900 rounded-xl p-4.5">
            <input
              type="checkbox"
              id="isNonBillableCheckbox"
              checked={isNonBillable}
              onChange={(e) => setIsNonBillable(e.target.checked)}
              className="h-4.5 w-4.5 mt-0.5 rounded border-zinc-800 bg-zinc-950 text-[#F5720A] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#F5720A]"
            />
            <div className="space-y-0.5">
              <label htmlFor="isNonBillableCheckbox" className="text-xs font-bold text-zinc-200 uppercase tracking-wider cursor-pointer">
                Non-billable Project
              </label>
              <p className="text-[10px] text-zinc-500">
                If checked, this project is classified as non-billable, and all of its recorded billings and logs will be excluded from the agency profitability metrics.
              </p>
            </div>
          </div>

          {/* Scope Backlog Description */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              Detailed Scope Backlog Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={scopeBacklog}
              onChange={(e) => setScopeBacklog(e.target.value)}
              placeholder="Provide a granular definition of the client project deliverables, advisory scope, and deliverables timeline..."
              className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-[#F5720A] resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-[#F5720A] hover:bg-orange-hover text-zinc-950 font-bold py-3 px-6 rounded-full transition-all shadow-lg shadow-[#F5720A]/10 flex items-center justify-center gap-2 cursor-pointer"
          >
            {editingProjectId ? (
              <Edit className="h-4.5 w-4.5 stroke-[2.5px]" />
            ) : (
              <FolderPlus className="h-4.5 w-4.5 stroke-[2.5px]" />
            )}
            {editingProjectId ? 'Save Project Changes' : 'Construct Scoped Project'}
          </button>
        </form>
      )}

      {/* 3. CREATE RATE CARD TAB */}
      {activeTab === 'create_rate_card' && (
        <form onSubmit={handleSaveRateCard} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Rate Card Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={rcName}
                onChange={(e) => setRcName(e.target.value)}
                placeholder="eg. Client name, Agency name..."
                className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-[#F5720A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Associate with Client (optional)
              </label>
              <select
                value={rcClientName}
                onChange={(e) => setRcClientName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-[#F5720A]"
              >
                <option value="">-- No Association / General --</option>
                {sortedClients.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Role addition section */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 space-y-4">
            <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono">
              Add Roles, Billing Day Rates & Internal Costs to Rate Card
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end bg-zinc-900/40 p-4 rounded-xl border border-zinc-900 font-mono">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Role Name (e.g. Director)
                </label>
                <select
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#F5720A]"
                >
                  <option value="">-- Choose Role --</option>
                  {sortedGlobalRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Billing Day Rate (£)
                </label>
                <input
                  type="number"
                  min="0"
                  value={newRoleCost}
                  onChange={(e) => setNewRoleCost(e.target.value)}
                  placeholder="e.g. 800"
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#F5720A]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Internal Cost (£/day)
                </label>
                <input
                  type="number"
                  min="0"
                  value={newRoleInternalCost}
                  onChange={(e) => setNewRoleInternalCost(e.target.value)}
                  placeholder="e.g. 450"
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#F5720A]"
                />
              </div>

              <button
                type="button"
                onClick={handleAddRoleToDraft}
                className="w-full bg-zinc-800 hover:bg-[#F5720A] hover:text-zinc-950 border border-zinc-700 hover:border-[#F5720A] rounded-lg text-xs font-semibold py-2 transition-all cursor-pointer"
              >
                + Include Role
              </button>
            </div>

            {/* List of roles in this rate card draft */}
            <div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2 font-mono">
                Rate Card Roles Draft ({roles.length})
              </span>
              {roles.length === 0 ? (
                <div className="text-zinc-500 italic text-[11px] p-4 text-center bg-zinc-900/10 border border-zinc-900 border-dashed rounded-lg">
                  Please add at least one role-cost pair.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {roles.map((r, i) => (
                    <div
                      key={i}
                      className="bg-zinc-900 border border-zinc-900 p-2.5 rounded-lg flex items-center justify-between text-xs animate-in slide-in-from-bottom-2 duration-150 font-mono"
                    >
                      <div>
                        <p className="font-bold text-zinc-200">{r.role}</p>
                        <div className="flex items-center gap-2 text-[10px] font-mono mt-0.5">
                          <span className="text-[#F5720A] font-bold">Billing: £{r.hourlyCost}/day</span>
                          <span className="text-zinc-400">| Cost: £{r.internalCost ?? r.hourlyCost}/day</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveRoleFromDraft(i)}
                        className="text-red-500 hover:text-red-400 font-bold ml-2 text-md px-1 cursor-pointer"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-[#F5720A] hover:bg-orange-hover text-zinc-950 font-bold py-3 px-6 rounded-full transition-all shadow-lg shadow-[#F5720A]/10 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5 stroke-[2.5px]" />
            Confirm Rate Card Creation
          </button>

          {/* Rate Cards Catalog Panel under creation button */}
          {renderRateCardsCatalog()}
        </form>
      )}

      {/* 4. MASTER DIRECTORY TAB */}
      {activeTab === 'directory' && (
        <div className="space-y-6">
          <div className="border-b border-zinc-900 pb-2">
            <h3 className="eyebrow-label text-xs">Directory & Master Data Registry</h3>
            <p className="text-[11px] text-zinc-500 font-sans mt-0.5">Manage clients, global team members, and role directories with inline controls.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* COLUMN 1: Clients Directory */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 space-y-4">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Users className="h-4 w-4 text-[#F5720A]" />
                Clients Registry
              </h4>

              {/* Add form */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New Client Name..."
                  value={newClientVal}
                  onChange={(e) => setNewClientVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newClientVal.trim()) {
                      onCreateClient(newClientVal.trim());
                      setNewClientVal('');
                    }
                  }}
                  className="flex-1 bg-zinc-900 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-[#F5720A] focus:ring-1 focus:ring-[#F5720A]"
                />
                <button
                  onClick={() => {
                    if (newClientVal.trim()) {
                      onCreateClient(newClientVal.trim());
                      setNewClientVal('');
                    }
                  }}
                  className="px-3 py-1.5 bg-[#F5720A] hover:bg-orange-hover text-zinc-955 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Add
                </button>
              </div>

              {/* List */}
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {sortedClients.length === 0 ? (
                  <p className="text-[10px] text-zinc-600 italic">No clients registered.</p>
                ) : (
                  sortedClients.map((client) => {
                    const isEditing = editingClient === client;
                    const projCount = projects.filter(p => p.clientName === client).length;

                    return (
                      <div key={client} className="bg-zinc-900/40 border border-zinc-900 rounded-lg p-2.5 flex items-center justify-between gap-2 text-xs">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 w-full">
                            <input
                              type="text"
                              value={editClientVal}
                              onChange={(e) => setEditClientVal(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && editClientVal.trim()) {
                                  onUpdateClient(client, editClientVal.trim());
                                  setEditingClient(null);
                                }
                              }}
                              className="flex-1 bg-zinc-950 border border-zinc-850 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-[#F5720A]"
                            />
                            <button
                              onClick={() => {
                                if (editClientVal.trim()) {
                                  onUpdateClient(client, editClientVal.trim());
                                  setEditingClient(null);
                                }
                              }}
                              className="p-1 hover:bg-zinc-800 text-emerald-400 rounded cursor-pointer"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingClient(null)}
                              className="p-1 hover:bg-zinc-800 text-red-400 rounded cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="truncate">
                              <span className="font-bold text-zinc-200 block truncate">{client}</span>
                              <span className="text-[9px] text-zinc-500 font-mono block">{projCount} {projCount === 1 ? 'project' : 'projects'}</span>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => {
                                  setEditingClient(client);
                                  setEditClientVal(client);
                                }}
                                className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded transition-colors cursor-pointer"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => triggerDelete('client', client, client)}
                                className="p-1 hover:bg-zinc-800 text-red-500 hover:text-red-400 rounded transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* COLUMN 2: Team Members Registry */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 space-y-4">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Users className="h-4 w-4 text-[#F5720A]" />
                Team Registry
              </h4>

              {/* Add form */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New Team Member..."
                  value={newMemberVal}
                  onChange={(e) => setNewMemberVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newMemberVal.trim()) {
                      onCreateMember(newMemberVal.trim());
                      setNewMemberVal('');
                    }
                  }}
                  className="flex-1 bg-zinc-900 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-[#F5720A] focus:ring-1 focus:ring-[#F5720A]"
                />
                <button
                  onClick={() => {
                    if (newMemberVal.trim()) {
                      onCreateMember(newMemberVal.trim());
                      setNewMemberVal('');
                    }
                  }}
                  className="px-3 py-1.5 bg-[#F5720A] hover:bg-orange-hover text-zinc-955 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Add
                </button>
              </div>

              {/* List */}
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {sortedGlobalMembers.length === 0 ? (
                  <p className="text-[10px] text-zinc-600 italic">No members registered.</p>
                ) : (
                  sortedGlobalMembers.map((member) => {
                    const isEditing = editingMember === member;

                    return (
                      <div key={member} className="bg-zinc-900/40 border border-zinc-900 rounded-lg p-2.5 flex items-center justify-between gap-2 text-xs">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 w-full">
                            <input
                              type="text"
                              value={editMemberVal}
                              onChange={(e) => setEditMemberVal(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && editMemberVal.trim()) {
                                  onUpdateMember(member, editMemberVal.trim());
                                  setEditingMember(null);
                                }
                              }}
                              className="flex-1 bg-zinc-950 border border-zinc-850 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-[#F5720A]"
                            />
                            <button
                              onClick={() => {
                                if (editMemberVal.trim()) {
                                  onUpdateMember(member, editMemberVal.trim());
                                  setEditingMember(null);
                                }
                              }}
                              className="p-1 hover:bg-zinc-800 text-emerald-400 rounded cursor-pointer"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingMember(null)}
                              className="p-1 hover:bg-zinc-800 text-red-400 rounded cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="truncate">
                              <span className="font-bold text-zinc-200 block truncate">{member}</span>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => {
                                  setEditingMember(member);
                                  setEditMemberVal(member);
                                }}
                                className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded transition-colors cursor-pointer"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => triggerDelete('globalMember', member, member)}
                                className="p-1 hover:bg-zinc-800 text-red-500 hover:text-red-400 rounded transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* COLUMN 3: Global Roles Registry */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 space-y-4">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Users className="h-4 w-4 text-[#F5720A]" />
                Roles Registry
              </h4>

              {/* Add form */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New Role Name..."
                  value={newRoleNameVal}
                  onChange={(e) => setNewRoleNameVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newRoleNameVal.trim()) {
                      onCreateRole(newRoleNameVal.trim());
                      setNewRoleNameVal('');
                    }
                  }}
                  className="flex-1 bg-zinc-900 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-[#F5720A] focus:ring-1 focus:ring-[#F5720A]"
                />
                <button
                  onClick={() => {
                    if (newRoleNameVal.trim()) {
                      onCreateRole(newRoleNameVal.trim());
                      setNewRoleNameVal('');
                    }
                  }}
                  className="px-3 py-1.5 bg-[#F5720A] hover:bg-orange-hover text-zinc-955 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Add
                </button>
              </div>

              {/* List */}
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {sortedGlobalRoles.length === 0 ? (
                  <p className="text-[10px] text-zinc-600 italic">No roles registered.</p>
                ) : (
                  sortedGlobalRoles.map((role) => {
                    const isEditing = editingRoleNameState === role;

                    return (
                      <div key={role} className="bg-zinc-900/40 border border-zinc-900 rounded-lg p-2.5 flex items-center justify-between gap-2 text-xs">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 w-full">
                            <input
                              type="text"
                              value={editRoleNameVal}
                              onChange={(e) => setEditRoleNameVal(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && editRoleNameVal.trim()) {
                                  onUpdateRoleName(role, editRoleNameVal.trim());
                                  setEditingRoleNameState(null);
                                }
                              }}
                              className="flex-1 bg-zinc-950 border border-zinc-850 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-[#F5720A]"
                            />
                            <button
                              onClick={() => {
                                if (editRoleNameVal.trim()) {
                                  onUpdateRoleName(role, editRoleNameVal.trim());
                                  setEditingRoleNameState(null);
                                }
                              }}
                              className="p-1 hover:bg-zinc-800 text-emerald-400 rounded cursor-pointer"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingRoleNameState(null)}
                              className="p-1 hover:bg-zinc-800 text-red-400 rounded cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="truncate">
                              <span className="font-bold text-zinc-200 block truncate">{role}</span>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => {
                                  setEditingRoleNameState(role);
                                  setEditRoleNameVal(role);
                                }}
                                className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded transition-colors cursor-pointer"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => triggerDelete('globalRole', role, role)}
                                className="p-1 hover:bg-zinc-800 text-red-500 hover:text-red-400 rounded transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Rate Cards Registry Panel in Manage Directory */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 md:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4.5 w-4.5 text-[#F5720A]" />
                  <h4 className="text-sm font-bold text-zinc-200 uppercase tracking-wider font-mono">
                    Rate Cards Registry
                  </h4>
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-[#F5720A]/10 text-[#F5720A] border border-[#F5720A]/20">
                    {sortedRateCards.length} {sortedRateCards.length === 1 ? 'card' : 'cards'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 font-sans mt-0.5">
                  Advisory rate cards available in the system. Edit pricing structures, billing day rates, and role margins inline without popups.
                </p>
              </div>

              {!editingRateCard && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('create_rate_card');
                    resetProjectForm();
                  }}
                  className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border border-zinc-800 hover:border-[#F5720A]/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 self-start sm:self-center"
                >
                  <Plus className="h-3.5 w-3.5 text-[#F5720A]" />
                  + Create Rate Card
                </button>
              )}
            </div>

            {/* Inline Editor if active (NO POPUP!) */}
            {editingRateCard && renderInlineRateCardEditor()}

            {/* List of rate cards */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block font-mono">
                Available Rate Cards ({sortedRateCards.length})
              </span>

              {sortedRateCards.length === 0 ? (
                <div className="p-8 border border-zinc-900 border-dashed rounded-xl text-center text-zinc-500 text-xs italic bg-zinc-900/20">
                  No rate cards defined yet. Click "+ Create Rate Card" to define your first rate card.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {sortedRateCards.map((card) => {
                    const isCurrentlyEditing = editingRateCard?.id === card.id;
                    const associatedProjects = projects.filter((p) => p.rateCardId === card.id);

                    return (
                      <div
                        key={card.id}
                        className={`bg-zinc-900/40 border rounded-xl p-4 space-y-3 transition-all relative ${
                          isCurrentlyEditing
                            ? 'border-[#F5720A] ring-1 ring-[#F5720A]/40 bg-zinc-900/80 shadow-lg'
                            : 'border-zinc-900 hover:border-zinc-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="text-xs font-bold text-zinc-100 uppercase tracking-wide font-mono text-[#F5720A]">
                                {card.name}
                              </h5>
                              {isCurrentlyEditing && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#F5720A]/20 text-[#F5720A] border border-[#F5720A]/30 uppercase font-mono">
                                  Editing
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-zinc-400 font-mono">
                                {card.clientName ? `Client: ${card.clientName}` : 'General / All Clients'}
                              </span>
                              <span className="text-zinc-600 text-[10px]">•</span>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                {card.roles.length} {card.roles.length === 1 ? 'role' : 'roles'}
                              </span>
                              {associatedProjects.length > 0 && (
                                <>
                                  <span className="text-zinc-600 text-[10px]">•</span>
                                  <span className="text-[10px] text-zinc-400 font-mono">
                                    {associatedProjects.length} {associatedProjects.length === 1 ? 'project' : 'projects'}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRateCard({
                                  ...card,
                                  roles: card.roles.map((r) => ({ ...r })),
                                });
                                setTimeout(() => {
                                  const el = document.getElementById('inline-rate-card-editor');
                                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }, 50);
                              }}
                              className={`p-1.5 border rounded-lg transition-all cursor-pointer flex items-center gap-1 text-xs font-medium ${
                                isCurrentlyEditing
                                  ? 'bg-[#F5720A] text-zinc-950 border-[#F5720A]'
                                  : 'text-zinc-400 hover:text-[#F5720A] hover:bg-[#F5720A]/10 border-zinc-850 hover:border-[#F5720A]/30'
                              }`}
                              title="Edit Rate Card"
                            >
                              <Edit className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline text-[10px] font-bold">Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => triggerDelete('rateCard', card.id, card.name)}
                              className="p-1.5 text-red-500 hover:text-red-400 hover:bg-red-500/10 border border-zinc-850 hover:border-red-500/20 rounded-lg transition-all cursor-pointer"
                              title="Delete Rate Card"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Roles breakdown inside card */}
                        <div className="divide-y divide-zinc-900 border border-zinc-900 rounded-lg overflow-hidden bg-zinc-950/60">
                          {card.roles.map((role) => (
                            <div
                              key={role.id}
                              className="flex items-center justify-between p-2 text-xs font-mono"
                            >
                              <span className="text-zinc-300 font-medium truncate mr-2">
                                {role.role}
                              </span>
                              <div className="flex items-center gap-2 text-[10px] shrink-0">
                                <span className="text-[#F5720A] font-bold">
                                  Billing: £{role.hourlyCost}/day
                                </span>
                                <span className="text-zinc-600">|</span>
                                <span className="text-emerald-400 font-semibold">
                                  Cost: £{role.internalCost ?? role.hourlyCost}/day
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BEAUTIFUL CUSTOM DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 max-w-md w-full rounded-2xl p-6 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Danger indicator bar */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-red-500"></div>

            <div className="flex items-center gap-3 text-red-500 mb-3.5">
              <Trash2 className="h-6 w-6" />
              <h3 className="text-md font-bold text-zinc-100">Confirm Deletion</h3>
            </div>

            <div className="text-xs text-zinc-400 space-y-3 mb-6 leading-relaxed">
              <p>
                Are you absolutely sure you want to delete this item? This action is irreversible.
              </p>

              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-850 space-y-2 font-mono text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Type:</span>
                  <span className="text-zinc-300 capitalize">
                    {deleteTarget.type === 'rateCardRole' ? 'Rate Card Role' : deleteTarget.type === 'rateCard' ? 'Rate Card' : deleteTarget.type === 'globalMember' ? 'Team Member' : deleteTarget.type === 'globalRole' ? 'Role' : deleteTarget.type}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Item Name:</span>
                  <span className="text-zinc-300 font-medium truncate max-w-[220px]">{deleteTarget.name}</span>
                </div>
                {deleteTarget.type === 'rateCard' && (
                  <p className="text-[10px] text-red-400/80 mt-1 leading-normal">
                    ⚠️ Warning: This will delete this advisory rate card from the master registry.
                  </p>
                )}
                {deleteTarget.type === 'client' && (
                  <p className="text-[10px] text-red-400/80 mt-1 leading-normal">
                    ⚠️ Warning: This will also delete ALL associated projects and timesheet records for this client!
                  </p>
                )}
                {deleteTarget.type === 'project' && (
                  <p className="text-[10px] text-red-400/80 mt-1 leading-normal">
                    ⚠️ Warning: This will also delete ALL timesheet entries logged under this project!
                  </p>
                )}
                {deleteTarget.type === 'globalMember' && (
                  <p className="text-[10px] text-red-400/80 mt-1 leading-normal">
                    ⚠️ Warning: This will remove this team member from all project allocations!
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold py-2.5 rounded-xl border border-zinc-700 text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const { type, id, name, extraId } = deleteTarget;
                  if (type === 'project') {
                    onDeleteProject(id);
                  } else if (type === 'client') {
                    onDeleteClient(id); // id holds clientName
                  } else if (type === 'rateCard') {
                    onDeleteRateCard(id);
                    if (editingRateCard?.id === id) {
                      setEditingRateCard(null);
                    }
                  } else if (type === 'rateCardRole') {
                    if (extraId) onDeleteRole(extraId, id); // extraId holds cardId, id holds roleId
                  } else if (type === 'globalMember') {
                    onDeleteMember(id); // id holds memberName
                  } else if (type === 'globalRole') {
                    onDeleteRoleName(id); // id holds roleName
                  }
                  setDeleteTarget(null);
                }}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MULTIPLE ROLE CONFIRMATION MODAL */}
      {multipleRoleConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 max-w-md w-full rounded-2xl p-6 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Top decorative accent bar */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#F5720A]"></div>

            <div className="flex items-center gap-3 text-[#F5720A] mb-3.5">
              <Users className="h-6 w-6" />
              <h3 className="text-md font-bold text-zinc-100 font-sans">Associate Additional Role?</h3>
            </div>

            <div className="text-xs text-zinc-400 space-y-3 mb-6 leading-relaxed">
              <p>
                <span className="font-semibold text-zinc-100">"{multipleRoleConfirm.memberName}"</span> is already assigned to a role in this project. Do you want to associate this team member with an additional role?
              </p>

              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-850 space-y-2 font-mono text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 font-mono">Member Name:</span>
                  <span className="text-zinc-300 font-medium">{multipleRoleConfirm.memberName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 font-mono">Additional Role:</span>
                  <span className="text-zinc-300 font-medium">
                    {rateCards
                      .find((rc) => rc.id === selectedRateCardId)
                      ?.roles.find((r) => r.id === multipleRoleConfirm.roleId)?.role || 'Selected Role'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 font-mono">Day Rate:</span>
                  <span className="text-emerald-400 font-semibold">
                    £{rateCards
                      .find((rc) => rc.id === selectedRateCardId)
                      ?.roles.find((r) => r.id === multipleRoleConfirm.roleId)?.hourlyCost || 0}
                    /day
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 font-mono font-normal">Allocated Days:</span>
                  <span className="text-zinc-300 font-semibold">{(multipleRoleConfirm.hours / 7).toFixed(2)} day(s) ({multipleRoleConfirm.hours} hrs)</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMultipleRoleConfirm(null)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-semibold py-2.5 rounded-xl border border-zinc-700 text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  addTeamMemberDirectly(
                    multipleRoleConfirm.memberName,
                    multipleRoleConfirm.roleId,
                    multipleRoleConfirm.hours
                  );
                  setMultipleRoleConfirm(null);
                }}
                className="flex-1 bg-[#F5720A] hover:bg-orange-hover text-zinc-950 font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Yes, Associate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK EDIT ALLOCATION MODAL */}
      {quickEditAllocation && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 max-w-sm w-full rounded-2xl p-6 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#F5720A]"></div>

            <div className="flex items-center gap-3 text-[#F5720A] mb-3.5">
              <Clock className="h-5 w-5" />
              <h3 className="text-md font-bold text-zinc-100 font-sans">Edit Allocated Days</h3>
            </div>

            <div className="text-xs text-zinc-400 space-y-3 mb-5 leading-relaxed">
              <p>
                Adjust allocated days for <span className="font-semibold text-zinc-100">"{quickEditAllocation.memberName}"</span> on project <span className="font-semibold text-zinc-100">"{quickEditAllocation.projectName}"</span>.
              </p>

              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-850 space-y-2 font-mono text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 font-mono">Role:</span>
                  <span className="text-zinc-300 font-medium">{quickEditAllocation.roleName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 font-mono">Current Allocation:</span>
                  <span className="text-[#F5720A] font-semibold">{(quickEditAllocation.hours / 7).toFixed(2)} day(s) ({quickEditAllocation.hours} hrs)</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-mono">
                  New Allocated Days
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  defaultValue={Number((quickEditAllocation.hours / 7).toFixed(2))}
                  id="quick-edit-days-input"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 font-mono focus:border-[#F5720A] focus:outline-none"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuickEditAllocation(null)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-semibold py-2.5 rounded-xl border border-zinc-700 text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('quick-edit-days-input') as HTMLInputElement;
                  const newDays = parseFloat(input?.value || '0');
                  const validDays = isNaN(newDays) ? 0 : newDays;
                  handleSaveQuickAllocation(validDays * 7, validDays);
                }}
                className="flex-1 bg-[#F5720A] hover:bg-orange-hover text-zinc-950 font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                Save Days
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend / Update End Date Modal */}
      {extendDateProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-md">
          <div className="bg-[#121316] border border-amber-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4 animate-in fade-in zoom-in duration-200 text-zinc-100">
            <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#F5720A]" />
                <h3 className="text-sm font-bold text-zinc-100">Update Project End Date</h3>
              </div>
              <button
                onClick={() => setExtendDateProject(null)}
                className="p-1 text-zinc-400 hover:text-zinc-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-zinc-300">
                Project: <strong className="text-zinc-100 font-sans">{extendDateProject.name}</strong> ({extendDateProject.clientName})
              </p>
              <p className="text-xs text-zinc-400">
                Current End Date: <span className="font-mono text-amber-400">{extendDateProject.endDate || 'None'}</span>
              </p>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 font-mono">
                  New End Date
                </label>
                <input
                  type="date"
                  value={newEndDateVal}
                  onChange={(e) => setNewEndDateVal(e.target.value)}
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-[#F5720A] focus:ring-1 focus:ring-[#F5720A]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setExtendDateProject(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onUpdateProject && extendDateProject && newEndDateVal) {
                    onUpdateProject({ ...extendDateProject, endDate: newEndDateVal });
                    showToast('success', `Updated end date for "${extendDateProject.name}" to ${newEndDateVal}`);
                    setExtendDateProject(null);
                  }
                }}
                className="px-4 py-2 bg-[#F5720A] hover:bg-orange-hover text-zinc-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md"
              >
                Save New End Date
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Toast Notification */}
      {toast && (
        <div 
          id="custom-toast"
          className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 bg-zinc-950 border border-zinc-800 text-zinc-100 px-4.5 py-3.5 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-300 min-w-[320px] max-w-[420px]"
          style={{ boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 10px 10px -5px rgba(0, 0, 0, 0.7)' }}
        >
          {/* Accent strip */}
          <div className={`absolute top-0 left-0 bottom-0 w-1 rounded-l-xl ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
          
          <div className="flex-1 flex items-start gap-3 pl-1">
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
            )}
            <div>
              <p className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono">
                {toast.type === 'success' ? 'Success Action' : 'Notice / Error'}
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-normal">{toast.message}</p>
            </div>
          </div>
          
          <button 
            type="button"
            onClick={() => setToast(null)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 cursor-pointer rounded-lg hover:bg-zinc-900"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
