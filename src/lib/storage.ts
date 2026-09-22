import { RateCard, Project, TimesheetEntry } from '../types';

const STORAGE_KEYS = {
  RATE_CARDS: 'ts_rate_cards',
  PROJECTS: 'ts_projects',
  ENTRIES: 'ts_entries',
};

// High-fidelity default data to provide an instant premium experience
const DEFAULT_RATE_CARDS: RateCard[] = [];

const DEFAULT_PROJECTS: Project[] = [];

// Seed some timesheet logs on the current week (July 20 - 26, 2026)
const DEFAULT_ENTRIES: TimesheetEntry[] = [];

export function getRateCards(): RateCard[] {
  const data = localStorage.getItem(STORAGE_KEYS.RATE_CARDS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.RATE_CARDS, JSON.stringify(DEFAULT_RATE_CARDS));
    return DEFAULT_RATE_CARDS;
  }
  return JSON.parse(data);
}

export function saveRateCards(cards: RateCard[]): void {
  localStorage.setItem(STORAGE_KEYS.RATE_CARDS, JSON.stringify(cards));
}

export function getProjects(): Project[] {
  const data = localStorage.getItem(STORAGE_KEYS.PROJECTS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(DEFAULT_PROJECTS));
    return DEFAULT_PROJECTS;
  }
  return JSON.parse(data);
}

export function saveProjects(projects: Project[]): void {
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
}

export function getTimesheetEntries(): TimesheetEntry[] {
  const data = localStorage.getItem(STORAGE_KEYS.ENTRIES);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(DEFAULT_ENTRIES));
    return DEFAULT_ENTRIES;
  }
  return JSON.parse(data);
}

export function saveTimesheetEntries(entries: TimesheetEntry[]): void {
  localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
}

export function getClients(): string[] {
  const data = localStorage.getItem('ts_clients');
  if (!data) {
    const defaults: string[] = [];
    localStorage.setItem('ts_clients', JSON.stringify(defaults));
    return defaults;
  }
  return JSON.parse(data);
}

export function saveClients(clients: string[]): void {
  localStorage.setItem('ts_clients', JSON.stringify(clients));
}

export function getGlobalMembers(): string[] {
  const data = localStorage.getItem('ts_global_members');
  if (!data) {
    const defaults: string[] = [];
    localStorage.setItem('ts_global_members', JSON.stringify(defaults));
    return defaults;
  }
  return JSON.parse(data);
}

export function saveGlobalMembers(members: string[]): void {
  localStorage.setItem('ts_global_members', JSON.stringify(members));
}

export function getGlobalRoles(): string[] {
  const data = localStorage.getItem('ts_global_roles');
  if (!data) {
    const defaults: string[] = [];
    localStorage.setItem('ts_global_roles', JSON.stringify(defaults));
    return defaults;
  }
  return JSON.parse(data);
}

export function saveGlobalRoles(roles: string[]): void {
  localStorage.setItem('ts_global_roles', JSON.stringify(roles));
}
