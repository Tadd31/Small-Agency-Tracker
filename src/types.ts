export interface RoleCost {
  id: string;
  role: string;
  hourlyCost: number;
  internalCost?: number;
}

export interface RateCard {
  id: string;
  name: string;
  roles: RoleCost[];
  clientName?: string;
}

export interface ProjectTeamMember {
  memberName: string;
  roleId: string; // references RoleCost.id
  hoursAllocated: number;
}

export interface Project {
  id: string;
  name: string;
  clientName: string;
  rateCardId: string; // references RateCard.id
  teamMembers: ProjectTeamMember[];
  scopeBacklog: string;
  discount?: number; // in GBP
  expense?: number; // in GBP
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  isNonBillable?: boolean;
  createdBy?: string; // identity metadata
  isCompleted?: boolean;
}

export interface TimesheetEntry {
  id: string;
  projectId: string;
  teamMember: string; // Name of the team member
  roleId?: string; // Optional specific allocated role ID
  roleName?: string; // Snapshot of role name locked at save time
  dayRate?: number; // Snapshot of day rate (hourlyCost) locked at save time
  hours: number;
  date: string; // YYYY-MM-DD
  description: string;
  loggedByName?: string; // identity metadata
  loggedByEmail?: string; // identity metadata
}
