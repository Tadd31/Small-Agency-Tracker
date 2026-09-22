import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { initAuth, googleSignIn, logout, setCachedAccessToken } from './lib/firebase';
import {
  ensureSheetTabs,
  fetchEntriesFromSheet,
  writeEntriesToSheet,
  fetchProjectsFromSheet,
  writeProjectsToSheet,
  fetchRateCardsFromSheet,
  writeRateCardsToSheet,
  fetchMetadataFromSheet,
  writeMetadataToSheet,
  writeExecutiveSummaryTemplate
} from './lib/sheetsDb';
import {
  getRateCards,
  saveRateCards,
  getProjects,
  saveProjects,
  getTimesheetEntries,
  saveTimesheetEntries,
  getClients,
  saveClients,
  getGlobalMembers,
  saveGlobalMembers,
  getGlobalRoles,
  saveGlobalRoles,
} from './lib/storage';
import { RateCard, Project, TimesheetEntry, RoleCost } from './types';
import { APP_VERSION } from './version';
import Header from './components/Header';
import TimesheetForm from './components/TimesheetForm';
import LedgerTable from './components/LedgerTable';
import ProjectManager from './components/ProjectManager';
import WeeklyReport from './components/WeeklyReport';
import WeeklyMatrixGrid from './components/WeeklyMatrixGrid';
import { Calendar, Layers, BarChart, FileText, CheckCircle2, AlertCircle, RefreshCw, FileSpreadsheet, ExternalLink, Database, LogIn, LogOut, X, Sparkles } from 'lucide-react';

export default function App() {
  // --- Central States ---
  const [entryMode, setEntryMode] = useState<'matrix' | 'form'>('form');
  const [rateCards, setRateCards] = useState<RateCard[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [clients, setClients] = useState<string[]>([]);
  const [globalMembers, setGlobalMembers] = useState<string[]>([]);
  const [globalRoles, setGlobalRoles] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // --- Auth & Sync State ---
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(() => {
    const iso = localStorage.getItem('timesheet_recorder_last_synced_iso');
    return iso ? new Date(iso) : null;
  });

  const recordSyncTimestamp = () => {
    const nowIso = new Date().toISOString();
    localStorage.setItem('timesheet_recorder_last_synced_iso', nowIso);
    setLastSyncedAt(new Date(nowIso));
  };
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>(() => {
    const saved = localStorage.getItem('consulting_timesheet_spreadsheet_url') || '';
    if (saved.includes('1qf0-ETxhVErBd4KjsEyPz9g6Mv18IvZk0sgcMtzl_ok')) {
      localStorage.removeItem('consulting_timesheet_spreadsheet_url');
      return '';
    }
    return saved;
  });

  const getSpreadsheetId = (url: string): string => {
    const trimmed = (url || '').trim();
    if (!trimmed || trimmed.includes('1qf0-ETxhVErBd4KjsEyPz9g6Mv18IvZk0sgcMtzl_ok')) {
      return '';
    }
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return match[1];
    }
    return trimmed;
  };

  useEffect(() => {
    if (spreadsheetUrl) {
      localStorage.setItem('consulting_timesheet_spreadsheet_url', spreadsheetUrl);
    } else {
      localStorage.removeItem('consulting_timesheet_spreadsheet_url');
    }
  }, [spreadsheetUrl]);

  // --- View State ---
  const [activeView, setActiveView] = useState<'timesheets' | 'projects' | 'reports'>('timesheets');

  // --- Theme State ---
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('timesheet_recorder_theme');
    return (saved as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('timesheet_recorder_theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('light-mode');
      document.body.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
      document.body.classList.remove('light-mode');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // --- Confirmation & Alert Modals State ---
  const [showSyncConfirmModal, setShowSyncConfirmModal] = useState<boolean>(false);
  const [showClearDbConfirmModal, setShowClearDbConfirmModal] = useState<boolean>(false);

  // --- Deletion and Version States ---
  const [wipePassword, setWipePassword] = useState<string>('');
  const [wipePasswordError, setWipePasswordError] = useState<string>('');

  useEffect(() => {
    if (!showClearDbConfirmModal) {
      setWipePassword('');
      setWipePasswordError('');
    }
  }, [showClearDbConfirmModal]);

  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: '',
  });
  const [persistentSyncError, setPersistentSyncError] = useState<string | null>(null);

  // --- Initialize App State ---
  useEffect(() => {
    setRateCards(getRateCards());
    setProjects(getProjects());
    setEntries(getTimesheetEntries());
    setClients(getClients());
    setGlobalMembers(getGlobalMembers());
    setGlobalRoles(getGlobalRoles());
    setIsInitialized(true);

    // Recover user session securely from Firebase Auth
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        if (token) {
          setAccessToken(token);
        }
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );

    return () => unsubscribe();
  }, []);

  // --- Write updates to localStorage ---
  useEffect(() => {
    if (isInitialized) {
      saveRateCards(rateCards);
    }
  }, [rateCards, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      saveProjects(projects);
    }
  }, [projects, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      saveTimesheetEntries(entries);
    }
  }, [entries, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      saveClients(clients);
    }
  }, [clients, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      saveGlobalMembers(globalMembers);
    }
  }, [globalMembers, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      saveGlobalRoles(globalRoles);
    }
  }, [globalRoles, isInitialized]);

  // --- Auth Handlers ---
  const handleLogin = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        setPersistentSyncError(null);
        // Automatically open the sync confirm modal upon signing in
        setShowSyncConfirmModal(true);
      }
    } catch (err: any) {
      console.error('Google Sign in failed:', err);
      setSyncStatus({
        type: 'error',
        message: 'Google Authentication failed. Please check credentials and try again.',
      });
      setPersistentSyncError('Google Authentication failed.');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setAccessToken(null);
      setPersistentSyncError(null);
    } catch (err: any) {
      console.error('Logout failed:', err);
    }
  };

  // --- Initial Sheet Data Pull on Auth ---
  useEffect(() => {
    if (!accessToken || !user || !isInitialized) return;

    let isMounted = true;
    const initialSheetPull = async () => {
      const spreadsheetId = getSpreadsheetId(spreadsheetUrl);
      if (!spreadsheetId) return;

      setIsSyncing(true);
      try {
        await ensureSheetTabs(accessToken, spreadsheetId);
        const [freshEntries, freshProjects, freshRateCards, freshMeta] = await Promise.all([
          fetchEntriesFromSheet(accessToken, spreadsheetId),
          fetchProjectsFromSheet(accessToken, spreadsheetId),
          fetchRateCardsFromSheet(accessToken, spreadsheetId),
          fetchMetadataFromSheet(accessToken, spreadsheetId),
        ]);

        if (!isMounted) return;

        const lastSyncedIso = localStorage.getItem('timesheet_recorder_last_synced_iso');

        // Single Source of Truth: Sheet data populates local state
        const mergedEntries = mergeSmartWithTimestamp(freshEntries, entries, lastSyncedIso);
        setEntries(mergedEntries);
        saveTimesheetEntries(mergedEntries);

        const mergedProjects = mergeSmartWithTimestamp(freshProjects, projects, lastSyncedIso);
        setProjects(mergedProjects);
        saveProjects(mergedProjects);

        const mergedRateCards = mergeSmartWithTimestamp(freshRateCards, rateCards, lastSyncedIso);
        setRateCards(mergedRateCards);
        saveRateCards(mergedRateCards);

        // Synchronize Clients, Members, Roles bi-directionally
        const combinedClients = Array.from(new Set([...(freshMeta?.clients || []), ...clients])).filter(Boolean);
        const combinedMembers = Array.from(new Set([...(freshMeta?.members || []), ...globalMembers])).filter(Boolean);
        const combinedRoles = Array.from(new Set([...(freshMeta?.roles || []), ...globalRoles])).filter(Boolean);

        setClients(combinedClients);
        saveClients(combinedClients);
        setGlobalMembers(combinedMembers);
        saveGlobalMembers(combinedMembers);
        setGlobalRoles(combinedRoles);
        saveGlobalRoles(combinedRoles);

        // If local has items not yet on the sheet, upload them immediately to Google Sheets
        if (
          combinedClients.length > (freshMeta?.clients?.length || 0) ||
          combinedMembers.length > (freshMeta?.members?.length || 0) ||
          combinedRoles.length > (freshMeta?.roles?.length || 0)
        ) {
          await writeMetadataToSheet(accessToken, spreadsheetId, {
            clients: combinedClients,
            members: combinedMembers,
            roles: combinedRoles,
          });
        }

        recordSyncTimestamp();
        setPersistentSyncError(null);
      } catch (err: any) {
        console.warn('Initial Google Sheet sync pull error:', err);
        const isAuthError =
          err.message?.includes('authorization has expired') ||
          err.message?.includes('401') ||
          err.message?.includes('403') ||
          err.message?.includes('insufficient');
        if (isAuthError) {
          setAccessToken(null);
          setCachedAccessToken(null);
          setPersistentSyncError('Google authorization has expired or is insufficient. Please click "Reconnect" to renew access.');
        } else {
          setPersistentSyncError(err.message || 'Google Sheet initial sync failed.');
        }
      } finally {
        if (isMounted) {
          setIsSyncing(false);
        }
      }
    };

    initialSheetPull();

    return () => {
      isMounted = false;
    };
  }, [accessToken, user, isInitialized]);

  // --- Collaborative Unified Coordinator ---
  const applyMutation = async <T extends 'entries' | 'projects' | 'rateCards' | 'metadata'>(
    type: T,
    mutateFn: (currentLocalState: any) => any,
    options?: { silent?: boolean }
  ) => {
    const token = accessToken;
    const spreadsheetId = getSpreadsheetId(spreadsheetUrl);

    if (!token) {
      if (type === 'entries') {
        setEntries((prev) => {
          const next = mutateFn(prev);
          saveTimesheetEntries(next);
          return next;
        });
      } else if (type === 'projects') {
        setProjects((prev) => {
          const next = mutateFn(prev);
          saveProjects(next);
          return next;
        });
      } else if (type === 'rateCards') {
        setRateCards((prev) => {
          const next = mutateFn(prev);
          saveRateCards(next);
          return next;
        });
      } else if (type === 'metadata') {
        const currentMeta = { clients, members: globalMembers, roles: globalRoles };
        const nextMeta = mutateFn(currentMeta);
        if (nextMeta.clients) {
          setClients(nextMeta.clients);
          saveClients(nextMeta.clients);
        }
        if (nextMeta.members) {
          setGlobalMembers(nextMeta.members);
          saveGlobalMembers(nextMeta.members);
        }
        if (nextMeta.roles) {
          setGlobalRoles(nextMeta.roles);
          saveGlobalRoles(nextMeta.roles);
        }
      }
      return;
    }

    setIsSyncing(true);
    try {
      await ensureSheetTabs(token, spreadsheetId);
      const lastSyncedIso = localStorage.getItem('timesheet_recorder_last_synced_iso');

      if (type === 'entries') {
        const freshEntries = await fetchEntriesFromSheet(token, spreadsheetId);
        const currentMerged = mergeSmartWithTimestamp(freshEntries, entries, lastSyncedIso);
        const nextEntries = mutateFn(currentMerged);
        await writeEntriesToSheet(token, spreadsheetId, nextEntries);
        setEntries(nextEntries);
        saveTimesheetEntries(nextEntries);
      } else if (type === 'projects') {
        const freshProjects = await fetchProjectsFromSheet(token, spreadsheetId);
        const currentMerged = mergeSmartWithTimestamp(freshProjects, projects, lastSyncedIso);
        const nextProjects = mutateFn(currentMerged);
        await writeProjectsToSheet(token, spreadsheetId, nextProjects);
        setProjects(nextProjects);
        saveProjects(nextProjects);
      } else if (type === 'rateCards') {
        const freshRateCards = await fetchRateCardsFromSheet(token, spreadsheetId);
        const currentMerged = mergeSmartWithTimestamp(freshRateCards, rateCards, lastSyncedIso);
        const nextRateCards = mutateFn(currentMerged);
        await writeRateCardsToSheet(token, spreadsheetId, nextRateCards);
        setRateCards(nextRateCards);
        saveRateCards(nextRateCards);
      } else if (type === 'metadata') {
        const freshMeta = await fetchMetadataFromSheet(token, spreadsheetId);
        const mergedClients = Array.from(new Set([...(freshMeta?.clients || []), ...clients])).filter(Boolean);
        const mergedMembers = Array.from(new Set([...(freshMeta?.members || []), ...globalMembers])).filter(Boolean);
        const mergedRoles = Array.from(new Set([...(freshMeta?.roles || []), ...globalRoles])).filter(Boolean);
        const nextMeta = mutateFn({
          clients: mergedClients,
          members: mergedMembers,
          roles: mergedRoles,
        });
        await writeMetadataToSheet(token, spreadsheetId, nextMeta);
        if (nextMeta.clients) {
          setClients(nextMeta.clients);
          saveClients(nextMeta.clients);
        }
        if (nextMeta.members) {
          setGlobalMembers(nextMeta.members);
          saveGlobalMembers(nextMeta.members);
        }
        if (nextMeta.roles) {
          setGlobalRoles(nextMeta.roles);
          saveGlobalRoles(nextMeta.roles);
        }
      }

      recordSyncTimestamp();
      setPersistentSyncError(null);
      setSyncStatus({
        type: null,
        message: '',
      });
    } catch (err: any) {
      console.error('Sheets transaction failed:', err);
      
      const isAuthError =
        err.message?.includes('authorization has expired') ||
        err.message?.includes('401') ||
        err.message?.includes('403') ||
        err.message?.includes('insufficient');

      if (isAuthError) {
        setAccessToken(null);
        setCachedAccessToken(null);
      }

      setPersistentSyncError(
        isAuthError
          ? 'Google authorization has expired or is insufficient. Please click "Reconnect" to renew access.'
          : err.message || 'Sheets sync failed. Please reconnect Google Sheets.'
      );

      // Local fallback on error so user action is never lost
      if (type === 'entries') {
        setEntries((prev) => {
          const next = mutateFn(prev);
          saveTimesheetEntries(next);
          return next;
        });
      } else if (type === 'projects') {
        setProjects((prev) => {
          const next = mutateFn(prev);
          saveProjects(next);
          return next;
        });
      } else if (type === 'rateCards') {
        setRateCards((prev) => {
          const next = mutateFn(prev);
          saveRateCards(next);
          return next;
        });
      } else if (type === 'metadata') {
        const currentMeta = { clients, members: globalMembers, roles: globalRoles };
        const nextMeta = mutateFn(currentMeta);
        if (nextMeta.clients) {
          setClients(nextMeta.clients);
          saveClients(nextMeta.clients);
        }
        if (nextMeta.members) {
          setGlobalMembers(nextMeta.members);
          saveGlobalMembers(nextMeta.members);
        }
        if (nextMeta.roles) {
          setGlobalRoles(nextMeta.roles);
          saveGlobalRoles(nextMeta.roles);
        }
      }

      setSyncStatus({
        type: 'error',
        message: err.message || 'Sheets sync failed. Local state updated.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // --- Smart Bi-Directional Merge Helper ---
  const getItemTimestamp = (id: string): number => {
    if (!id) return 0;
    const match = id.match(/\d{10,13}/);
    if (match) {
      const ts = parseInt(match[0], 10);
      return ts < 10000000000 ? ts * 1000 : ts;
    }
    return 0;
  };

  const mergeSmartWithTimestamp = <T extends { id: string }>(
    freshItems: T[],
    localItems: T[],
    lastSyncedIso: string | null
  ): T[] => {
    const itemMap = new Map<string, T>();
    const freshIds = new Set<string>();

    // 1. Google Sheet items ALWAYS take precedence as Single Source of Truth
    freshItems.forEach((item) => {
      if (item && item.id) {
        itemMap.set(item.id, item);
        freshIds.add(item.id);
      }
    });

    const lastSyncedTime = lastSyncedIso ? new Date(lastSyncedIso).getTime() : 0;

    // 2. Only preserve local items if:
    //    a) The sheet is completely empty (freshItems.length === 0) AND device hasn't synced
    //    b) The local item was created AFTER the last successful sync timestamp (offline creation)
    if (freshItems.length === 0 && (!lastSyncedIso || lastSyncedTime === 0)) {
      localItems.forEach((localItem) => {
        if (localItem && localItem.id) {
          itemMap.set(localItem.id, localItem);
        }
      });
    } else if (lastSyncedTime > 0) {
      localItems.forEach((localItem) => {
        if (!localItem || !localItem.id) return;
        if (!freshIds.has(localItem.id)) {
          const createdTime = getItemTimestamp(localItem.id);
          if (createdTime > lastSyncedTime) {
            itemMap.set(localItem.id, localItem);
          }
        }
      });
    }

    return Array.from(itemMap.values());
  };

  // --- Safe Manual Sync ---
  const handleSafeSync = async () => {
    const token = accessToken;
    if (!token) return;

    const spreadsheetId = getSpreadsheetId(spreadsheetUrl);
    if (!spreadsheetId) {
      setSyncStatus({
        type: 'error',
        message: 'Please link a Google Sheet URL or ID in settings first.',
      });
      return;
    }

    setIsSyncing(true);
    setSyncStatus({ type: null, message: '' });
    try {
      await ensureSheetTabs(token, spreadsheetId);

      const [freshEntries, freshProjects, freshRateCards, freshMeta] = await Promise.all([
        fetchEntriesFromSheet(token, spreadsheetId),
        fetchProjectsFromSheet(token, spreadsheetId),
        fetchRateCardsFromSheet(token, spreadsheetId),
        fetchMetadataFromSheet(token, spreadsheetId),
      ]);

      const lastSyncedIso = localStorage.getItem('timesheet_recorder_last_synced_iso');

      const mergedEntries = mergeSmartWithTimestamp(freshEntries, entries, lastSyncedIso);
      const mergedProjects = mergeSmartWithTimestamp(freshProjects, projects, lastSyncedIso);
      const mergedRateCards = mergeSmartWithTimestamp(freshRateCards, rateCards, lastSyncedIso);

      const mergedClients = Array.from(new Set([...(freshMeta?.clients || []), ...clients])).filter(Boolean);
      const mergedMembers = Array.from(new Set([...(freshMeta?.members || []), ...globalMembers])).filter(Boolean);
      const mergedRoles = Array.from(new Set([...(freshMeta?.roles || []), ...globalRoles])).filter(Boolean);

      // Only write to Google Sheets if there are genuine new local/offline items that don't exist on the sheet
      const hasNewEntriesToUpload = mergedEntries.length > freshEntries.length;
      const hasNewProjectsToUpload = mergedProjects.length > freshProjects.length;
      const hasNewRateCardsToUpload = mergedRateCards.length > freshRateCards.length;
      const hasNewMetaToUpload =
        mergedClients.length > (freshMeta?.clients?.length || 0) ||
        mergedMembers.length > (freshMeta?.members?.length || 0) ||
        mergedRoles.length > (freshMeta?.roles?.length || 0);

      const writePromises: Promise<void>[] = [];
      if (hasNewEntriesToUpload || (freshEntries.length === 0 && mergedEntries.length > 0)) {
        writePromises.push(writeEntriesToSheet(token, spreadsheetId, mergedEntries));
      }
      if (hasNewProjectsToUpload || (freshProjects.length === 0 && mergedProjects.length > 0)) {
        writePromises.push(writeProjectsToSheet(token, spreadsheetId, mergedProjects));
      }
      if (hasNewRateCardsToUpload || (freshRateCards.length === 0 && mergedRateCards.length > 0)) {
        writePromises.push(writeRateCardsToSheet(token, spreadsheetId, mergedRateCards));
      }
      if (hasNewMetaToUpload) {
        writePromises.push(writeMetadataToSheet(token, spreadsheetId, {
          clients: mergedClients,
          members: mergedMembers,
          roles: mergedRoles,
        }));
      }

      // Always refresh Executive Summary tab with latest CEO dashboard formulas & formatting
      writePromises.push(writeExecutiveSummaryTemplate(token, spreadsheetId).catch((e) => {
        console.warn('Non-blocking Executive Summary refresh notice:', e);
      }));

      if (writePromises.length > 0) {
        await Promise.all(writePromises);
      }

      setEntries(mergedEntries);
      saveTimesheetEntries(mergedEntries);

      setProjects(mergedProjects);
      saveProjects(mergedProjects);

      setRateCards(mergedRateCards);
      saveRateCards(mergedRateCards);

      setClients(mergedClients);
      saveClients(mergedClients);

      setGlobalMembers(mergedMembers);
      saveGlobalMembers(mergedMembers);

      setGlobalRoles(mergedRoles);
      saveGlobalRoles(mergedRoles);

      recordSyncTimestamp();
      setPersistentSyncError(null);
      setSyncStatus({
        type: 'success',
        message: 'Online Google Sheet loaded as Single Source of Truth.',
      });
    } catch (err: any) {
      console.error('Google Sheets safe manual sync failed:', err);
      const isAuthError =
        err.message?.includes('authorization has expired') ||
        err.message?.includes('401') ||
        err.message?.includes('403') ||
        err.message?.includes('insufficient');

      if (isAuthError) {
        setAccessToken(null);
        setCachedAccessToken(null);
        setPersistentSyncError('Google authorization has expired or is insufficient. Please click "Reconnect" to renew access.');
      } else {
        setPersistentSyncError(err.message || 'Sync failed. Please check connection or retry.');
      }

      setSyncStatus({
        type: 'error',
        message: err.message || 'Sync failed. Please check internet connection or Reconnect Google Sheets.',
      });
    } finally {
      setIsSyncing(false);
      setShowSyncConfirmModal(false);
    }
  };

  // --- Manual Executive Summary Reformat Action ---
  const handleReformatExecutiveSummary = async () => {
    if (!accessToken) {
      alert('Please connect Google Sheets first to reformat the Executive Summary tab.');
      return;
    }
    const spreadsheetId = getSpreadsheetId(spreadsheetUrl);
    if (!spreadsheetId) {
      alert('Please link a Google Sheet URL or ID in settings first.');
      return;
    }
    setIsSyncing(true);
    setSyncStatus({ type: null, message: '' });
    try {
      await writeExecutiveSummaryTemplate(accessToken, spreadsheetId);
      setSyncStatus({
        type: 'success',
        message: 'Executive Summary tab upgraded with live CEO dashboard & spill-free layout.',
      });
    } catch (err: any) {
      console.error('Manual Executive Summary reformat failed:', err);
      setSyncStatus({
        type: 'error',
        message: `Reformat failed: ${err.message || 'Check connection or permissions.'}`,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // --- 30-Second Polling Cycle ---
  useEffect(() => {
    if (!accessToken || !user) return;
    const spreadsheetId = getSpreadsheetId(spreadsheetUrl);
    if (!spreadsheetId) return;

    const intervalId = setInterval(async () => {
      try {
        const [freshEntries, freshProjects, freshRateCards, freshMeta] = await Promise.all([
          fetchEntriesFromSheet(accessToken, spreadsheetId),
          fetchProjectsFromSheet(accessToken, spreadsheetId),
          fetchRateCardsFromSheet(accessToken, spreadsheetId),
          fetchMetadataFromSheet(accessToken, spreadsheetId),
        ]);

        // Background check to ensure Executive Summary is on latest spill-free template
        ensureSheetTabs(accessToken, spreadsheetId).catch(() => {});

        const lastSyncedIso = localStorage.getItem('timesheet_recorder_last_synced_iso');
        const mergedEntries = mergeSmartWithTimestamp(freshEntries, entries, lastSyncedIso);
        const mergedProjects = mergeSmartWithTimestamp(freshProjects, projects, lastSyncedIso);
        const mergedRateCards = mergeSmartWithTimestamp(freshRateCards, rateCards, lastSyncedIso);

        const entriesChanged = JSON.stringify(mergedEntries) !== JSON.stringify(entries);
        const projectsChanged = JSON.stringify(mergedProjects) !== JSON.stringify(projects);
        const rateCardsChanged = JSON.stringify(mergedRateCards) !== JSON.stringify(rateCards);
        const clientsChanged = JSON.stringify(freshMeta.clients) !== JSON.stringify(clients);
        const membersChanged = JSON.stringify(freshMeta.members) !== JSON.stringify(globalMembers);
        const rolesChanged = JSON.stringify(freshMeta.roles) !== JSON.stringify(globalRoles);

        if (entriesChanged) {
          setEntries(mergedEntries);
          saveTimesheetEntries(mergedEntries);
        }
        if (projectsChanged) {
          setProjects(mergedProjects);
          saveProjects(mergedProjects);
        }
        if (rateCardsChanged) {
          setRateCards(mergedRateCards);
          saveRateCards(mergedRateCards);
        }
        if (clientsChanged || membersChanged || rolesChanged) {
          const combinedClients = Array.from(new Set([...freshMeta.clients, ...clients])).filter(Boolean);
          const combinedMembers = Array.from(new Set([...freshMeta.members, ...globalMembers])).filter(Boolean);
          const combinedRoles = Array.from(new Set([...freshMeta.roles, ...globalRoles])).filter(Boolean);

          const localHasNew =
            combinedClients.length > freshMeta.clients.length ||
            combinedMembers.length > freshMeta.members.length ||
            combinedRoles.length > freshMeta.roles.length;

          if (localHasNew) {
            await writeMetadataToSheet(accessToken, spreadsheetId, {
              clients: combinedClients,
              members: combinedMembers,
              roles: combinedRoles,
            }).catch((e) => console.warn('Background meta sync push error:', e));
          }

          setClients(combinedClients);
          saveClients(combinedClients);
          setGlobalMembers(combinedMembers);
          saveGlobalMembers(combinedMembers);
          setGlobalRoles(combinedRoles);
          saveGlobalRoles(combinedRoles);
        }

        if (entriesChanged || projectsChanged || rateCardsChanged || clientsChanged || membersChanged || rolesChanged) {
          recordSyncTimestamp();
          console.log('Background Sync: Reconciled fresh sheet database content.');
        }
        setPersistentSyncError(null);
      } catch (err: any) {
        console.warn('Background sync polling failed:', err);
        const isAuthError =
          err?.message?.includes('authorization has expired') ||
          err?.message?.includes('401') ||
          err?.message?.includes('403') ||
          err?.message?.includes('insufficient');
        if (isAuthError) {
          setAccessToken(null);
          setCachedAccessToken(null);
          setPersistentSyncError('Google authorization has expired. Please click "Reconnect" to renew access.');
        }
      }
    }, 30000);

    return () => clearInterval(intervalId);
  }, [accessToken, user, entries, projects, rateCards, clients, globalMembers, globalRoles, spreadsheetUrl]);

  // --- State Mutator Functions ---
  const handleAddEntry = (newEntryData: Omit<TimesheetEntry, 'id'>): string | null => {
    if (!user || !accessToken) {
      alert('Central Google Sheet connection required to log effort. Opening connection window...');
      handleLogin();
      return null;
    }
    const newId = `entry-${Date.now()}`;
    applyMutation('entries', (currentEntries) => {
      const entry: TimesheetEntry = {
        id: newId,
        ...newEntryData,
        loggedByName: user?.displayName || undefined,
        loggedByEmail: user?.email || undefined,
      };
      return [entry, ...currentEntries];
    });
    return newId;
  };

  const handleUpdateEntry = (updatedEntry: TimesheetEntry) => {
    applyMutation('entries', (currentEntries) => {
      return currentEntries.map((e) => (e.id === updatedEntry.id ? {
        ...updatedEntry,
        loggedByName: updatedEntry.loggedByName || user?.displayName || undefined,
        loggedByEmail: updatedEntry.loggedByEmail || user?.email || undefined,
      } : e));
    });
  };

  const handleDeleteEntry = (id: string) => {
    applyMutation('entries', (currentEntries) => {
      return currentEntries.filter((e) => e.id !== id);
    });
  };

  const handleRestoreEntry = (restoredEntry: TimesheetEntry) => {
    applyMutation('entries', (currentEntries) => {
      if (currentEntries.some((e) => e.id === restoredEntry.id)) return currentEntries;
      return [restoredEntry, ...currentEntries];
    });
  };

  const handleBatchUpsertEntries = async (
    entriesToUpsert: TimesheetEntry[],
    entryIdsToDelete: string[] = []
  ) => {
    if (!user || !accessToken) {
      alert('Central Google Sheet connection required to save timesheet matrix. Opening connection window...');
      handleLogin();
      return;
    }
    await applyMutation('entries', (currentEntries) => {
      let filtered = currentEntries.filter((e) => !entryIdsToDelete.includes(e.id));
      const upsertIds = new Set(entriesToUpsert.map((e) => e.id));
      filtered = filtered.filter((e) => !upsertIds.has(e.id));
      return [...entriesToUpsert, ...filtered];
    });
  };

  const handleCreateRateCard = (card: RateCard) => {
    applyMutation('rateCards', (currentRateCards) => {
      return [...currentRateCards, card];
    });
  };

  const handleUpdateRateCard = (updatedCard: RateCard) => {
    applyMutation('rateCards', (currentRateCards) => {
      return currentRateCards.map((rc) => (rc.id === updatedCard.id ? updatedCard : rc));
    });
  };

  const handleCreateProject = (project: Project) => {
    applyMutation('projects', (currentProjects) => {
      const projWithIdentity = {
        ...project,
        createdBy: user?.email || undefined,
      };
      return [projWithIdentity, ...currentProjects];
    });
  };

  const handleUpdateProject = (updatedProject: Project) => {
    applyMutation('projects', (currentProjects) => {
      return currentProjects.map((p) => (p.id === updatedProject.id ? {
        ...updatedProject,
        createdBy: p.createdBy || user?.email || undefined,
      } : p));
    });
  };

  const handleDeleteProject = (projectId: string) => {
    applyMutation('projects', (currentProjects) => {
      return currentProjects.filter((p) => p.id !== projectId);
    });
    applyMutation('entries', (currentEntries) => {
      return currentEntries.filter((e) => e.projectId !== projectId);
    }, { silent: true });
  };

  const handleCreateClient = (newClient: string) => {
    const trimmed = newClient.trim();
    if (!trimmed) return;
    if (!user || !accessToken) {
      alert('Google Sheets connection required to sync clients. Connecting to Google Sheets...');
      handleLogin();
      return;
    }
    applyMutation('metadata', (currentMeta) => {
      const existing = currentMeta.clients || [];
      if (existing.some((c: string) => c.toLowerCase() === trimmed.toLowerCase())) {
        return currentMeta;
      }
      return {
        ...currentMeta,
        clients: [...existing, trimmed],
      };
    });
  };

  const handleCreateMember = (newMember: string) => {
    const trimmed = newMember.trim();
    if (!trimmed) return;
    if (!user || !accessToken) {
      alert('Google Sheets connection required to sync team members. Connecting to Google Sheets...');
      handleLogin();
      return;
    }
    applyMutation('metadata', (currentMeta) => {
      const existing = currentMeta.members || [];
      if (existing.some((m: string) => m.toLowerCase() === trimmed.toLowerCase())) {
        return currentMeta;
      }
      return {
        ...currentMeta,
        members: [...existing, trimmed],
      };
    });
  };

  const handleCreateRole = (newRole: string) => {
    const trimmed = newRole.trim();
    if (!trimmed) return;
    if (!user || !accessToken) {
      alert('Google Sheets connection required to sync roles. Connecting to Google Sheets...');
      handleLogin();
      return;
    }
    applyMutation('metadata', (currentMeta) => {
      const existing = currentMeta.roles || [];
      if (existing.some((r: string) => r.toLowerCase() === trimmed.toLowerCase())) {
        return currentMeta;
      }
      return {
        ...currentMeta,
        roles: [...existing, trimmed],
      };
    });
  };

  const handleDeleteClient = (clientName: string) => {
    if (!user || !accessToken) {
      alert('Google Sheets connection required to delete clients. Connecting to Google Sheets...');
      handleLogin();
      return;
    }
    applyMutation('metadata', (currentMeta) => ({
      ...currentMeta,
      clients: currentMeta.clients.filter((c: string) => c.toLowerCase() !== clientName.toLowerCase()),
    }));
    applyMutation('projects', (currentProjects) => {
      return currentProjects.filter((p) => p.clientName.toLowerCase() !== clientName.toLowerCase());
    }, { silent: true });
    applyMutation('rateCards', (currentRateCards) => {
      return currentRateCards.map((rc) => (rc.clientName?.toLowerCase() === clientName.toLowerCase() ? { ...rc, clientName: undefined } : rc));
    }, { silent: true });
    
    const projectsToDelete = projects
      .filter((p) => p.clientName.toLowerCase() === clientName.toLowerCase())
      .map((p) => p.id);
    applyMutation('entries', (currentEntries) => {
      return currentEntries.filter((e) => !projectsToDelete.includes(e.projectId));
    }, { silent: true });
  };

  const handleDeleteMember = (memberName: string) => {
    if (!user || !accessToken) {
      alert('Google Sheets connection required to delete team members. Connecting to Google Sheets...');
      handleLogin();
      return;
    }
    applyMutation('metadata', (currentMeta) => ({
      ...currentMeta,
      members: currentMeta.members.filter((m: string) => m !== memberName),
    }));
    applyMutation('projects', (currentProjects) => {
      return currentProjects.map((p) => ({
        ...p,
        teamMembers: p.teamMembers.filter((tm) => tm.memberName !== memberName)
      }));
    }, { silent: true });
  };

  const handleDeleteRoleName = (roleName: string) => {
    if (!user || !accessToken) {
      alert('Google Sheets connection required to delete roles. Connecting to Google Sheets...');
      handleLogin();
      return;
    }
    applyMutation('metadata', (currentMeta) => ({
      ...currentMeta,
      roles: currentMeta.roles.filter((r: string) => r !== roleName),
    }));
  };

  const handleUpdateClient = (oldName: string, newName: string) => {
    if (!user || !accessToken) {
      alert('Google Sheets connection required to update clients. Connecting to Google Sheets...');
      handleLogin();
      return;
    }
    applyMutation('metadata', (currentMeta) => ({
      ...currentMeta,
      clients: currentMeta.clients.map((c: string) => (c === oldName ? newName : c)),
    }));
    applyMutation('projects', (currentProjects) => {
      return currentProjects.map((p) => (p.clientName === oldName ? { ...p, clientName: newName } : p));
    }, { silent: true });
    applyMutation('rateCards', (currentRateCards) => {
      return currentRateCards.map((rc) => (rc.clientName === oldName ? { ...rc, clientName: newName } : rc));
    }, { silent: true });
  };

  const handleUpdateMember = (oldName: string, newName: string) => {
    if (!user || !accessToken) {
      alert('Google Sheets connection required to update team members. Connecting to Google Sheets...');
      handleLogin();
      return;
    }
    applyMutation('metadata', (currentMeta) => ({
      ...currentMeta,
      members: currentMeta.members.map((m: string) => (m === oldName ? newName : m)),
    }));
    applyMutation('projects', (currentProjects) => {
      return currentProjects.map((p) => ({
        ...p,
        teamMembers: p.teamMembers.map((tm) => (tm.memberName === oldName ? { ...tm, memberName: newName } : tm))
      }));
    }, { silent: true });
    applyMutation('entries', (currentEntries) => {
      return currentEntries.map((e) => (e.teamMember === oldName ? { ...e, teamMember: newName } : e));
    }, { silent: true });
  };

  const handleUpdateRoleName = (oldName: string, newName: string) => {
    if (!user || !accessToken) {
      alert('Google Sheets connection required to update roles. Connecting to Google Sheets...');
      handleLogin();
      return;
    }
    applyMutation('metadata', (currentMeta) => ({
      ...currentMeta,
      roles: currentMeta.roles.map((r: string) => (r === oldName ? newName : r)),
    }));
    applyMutation('rateCards', (currentRateCards) => {
      return currentRateCards.map((rc) => ({
        ...rc,
        roles: rc.roles.map((r) => (r.role === oldName ? { ...r, role: newName } : r))
      }));
    }, { silent: true });
  };

  const handleDeleteRateCard = (cardId: string) => {
    applyMutation('rateCards', (currentRateCards) => {
      return currentRateCards.filter((rc) => rc.id !== cardId);
    });
  };

  const handleDeleteRole = (cardId: string, roleId: string) => {
    applyMutation('rateCards', (currentRateCards) => {
      return currentRateCards.map((rc) => {
        if (rc.id === cardId) {
          return {
            ...rc,
            roles: rc.roles.filter((r) => r.id !== roleId),
          };
        }
        return rc;
      });
    });
  };

  const handleUpdateRole = (cardId: string, updatedRole: RoleCost) => {
    applyMutation('rateCards', (currentRateCards) => {
      return currentRateCards.map((rc) => {
        if (rc.id === cardId) {
          return {
            ...rc,
            roles: rc.roles.map((r) => (r.id === updatedRole.id ? updatedRole : r)),
          };
        }
        return rc;
      });
    });
  };

  const handleClearDatabase = () => {
    if (wipePassword !== '1234') {
      setWipePasswordError('Invalid database wipe password!');
      return;
    }
    setRateCards([]);
    setProjects([]);
    setEntries([]);
    setClients([]);
    setGlobalMembers([]);
    setGlobalRoles([]);
    setShowClearDbConfirmModal(false);
    setWipePassword('');
    setWipePasswordError('');
    setSyncStatus({
      type: 'success',
      message: 'The timesheet records and rate-cards database was successfully cleared. You can now start fresh!',
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* 
        Header Component 
        Handles Sign-in status, Sheets sync warning, manual triggers
      */}
      <Header
        user={user}
        accessToken={accessToken}
        isSyncing={isSyncing}
        lastSyncedAt={lastSyncedAt}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onSync={() => setShowSyncConfirmModal(true)}
        onReformatExecutiveSummary={handleReformatExecutiveSummary}
        syncError={persistentSyncError || (syncStatus.type === 'error' ? syncStatus.message : null)}
        onReconnect={handleLogin}
        version={APP_VERSION}
        theme={theme}
        onToggleTheme={toggleTheme}
        hasSpreadsheetLinked={Boolean(getSpreadsheetId(spreadsheetUrl))}
      />

      {/* 
        Sub-Navigation Tab Bar 
        Toggles between different workspace modules
      */}
      <nav className="no-print bg-zinc-900/20 border-b border-zinc-800/80 px-6 py-2 sticky top-[72px] z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveView('timesheets')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-tight transition-all cursor-pointer border ${
                activeView === 'timesheets'
                  ? 'bg-orange-500/15 border-orange-500/40 text-orange-500 font-bold shadow-lg shadow-orange-500/5'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 hover:border-zinc-800'
              }`}
            >
              <Layers className="h-4 w-4" />
              Timesheet Ledger
            </button>

            <button
              onClick={() => setActiveView('projects')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-tight transition-all cursor-pointer border ${
                activeView === 'projects'
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-500 font-bold shadow-lg shadow-amber-500/5'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 hover:border-zinc-800'
              }`}
            >
              <BarChart className="h-4 w-4" />
              Project Portfolio
            </button>

            <button
              onClick={() => setActiveView('reports')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-tight transition-all cursor-pointer border ${
                activeView === 'reports'
                  ? 'bg-orange-600/15 border-orange-600/40 text-orange-600 font-bold shadow-lg shadow-orange-600/5'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 hover:border-zinc-800'
              }`}
            >
              <FileText className="h-4 w-4" />
              Reports
            </button>
          </div>

          <div>
            <button
              onClick={() => setShowClearDbConfirmModal(true)}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500 border border-red-500/30 hover:border-red-500 text-red-400 hover:text-zinc-950 text-xs font-bold rounded-full transition-all cursor-pointer shadow-md shadow-red-500/5"
            >
              Wipe Database
            </button>
          </div>
        </div>
      </nav>

      {/* Prominent Executive Summary Update Action Notice */}
      {user && accessToken && (
        <div className="no-print max-w-7xl mx-auto px-6 pt-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-2.5 text-xs shadow-sm">
            <div className="flex items-center gap-2.5 text-amber-200">
              <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
              <span>
                <strong>Executive Summary Google Sheet:</strong> New spill-free CEO layout with side-by-side tables and formatted dates ready to apply.
              </span>
            </div>
            <button
              onClick={handleReformatExecutiveSummary}
              disabled={isSyncing}
              className="bg-amber-500/25 hover:bg-amber-500/40 text-amber-200 hover:text-white border border-amber-500/40 font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all shrink-0 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Apply to Google Sheet Now</span>
            </button>
          </div>
        </div>
      )}

      {/* 
        Main Page Workspace Content
      */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Render Active view based on nav tab selection */}
        {activeView === 'timesheets' && (
          <div className="space-y-6">
            {/* View switcher between Single Entry Form (default) & Weekly Matrix Grid */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-950 border border-zinc-900 rounded-2xl p-3 sm:px-5 shadow-md">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-zinc-400 font-bold uppercase tracking-wider">Timesheet Entry Mode:</span>
                </div>
                {/* Toggle buttons directly next to the title */}
                <div id="timesheet-entry-mode-toggle" className="entry-mode-toggle flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1 text-xs shadow-inner">
                  <button
                    type="button"
                    id="btn-mode-single-entry"
                    onClick={() => setEntryMode('form')}
                    className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      entryMode === 'form'
                        ? 'active-toggle bg-[#F5720A] text-zinc-950 shadow-sm'
                        : 'inactive-toggle text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Single Entry Form</span>
                  </button>
                  <button
                    type="button"
                    id="btn-mode-weekly-matrix"
                    onClick={() => setEntryMode('matrix')}
                    className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      entryMode === 'matrix'
                        ? 'active-toggle bg-[#F5720A] text-zinc-950 shadow-sm'
                        : 'inactive-toggle text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Monday–Sunday Matrix</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Matrix View or Single Entry Form */}
            {entryMode === 'matrix' ? (
              <WeeklyMatrixGrid
                entries={entries}
                projects={projects}
                rateCards={rateCards}
                globalMembers={globalMembers}
                currentUserEmail={user?.email || undefined}
                currentUserName={user?.displayName || undefined}
                isConnected={!!(user && accessToken)}
                onConnectSheet={handleLogin}
                onBatchUpsertEntries={handleBatchUpsertEntries}
              />
            ) : (
              <div>
                <TimesheetForm
                  projects={projects}
                  rateCards={rateCards}
                  onAddEntry={handleAddEntry}
                  onDeleteEntry={handleDeleteEntry}
                  isConnected={!!(user && accessToken)}
                  onConnectSheet={handleLogin}
                />
              </div>
            )}

            {/* Bottom: Auditing Ledger Table List (Full width) */}
            <div>
              <LedgerTable
                entries={entries}
                projects={projects}
                rateCards={rateCards}
                onUpdateEntry={handleUpdateEntry}
                onDeleteEntry={handleDeleteEntry}
                onRestoreEntry={handleRestoreEntry}
              />
            </div>
          </div>
        )}

        {activeView === 'projects' && (
          <ProjectManager
            projects={projects}
            rateCards={rateCards}
            entries={entries}
            clients={clients}
            globalMembers={globalMembers}
            globalRoles={globalRoles}
            onCreateClient={handleCreateClient}
            onCreateMember={handleCreateMember}
            onCreateRole={handleCreateRole}
            onCreateRateCard={handleCreateRateCard}
            onUpdateRateCard={handleUpdateRateCard}
            onCreateProject={handleCreateProject}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
            onDeleteClient={handleDeleteClient}
            onDeleteRateCard={handleDeleteRateCard}
            onDeleteRole={handleDeleteRole}
            onUpdateRole={handleUpdateRole}
            onDeleteMember={handleDeleteMember}
            onDeleteRoleName={handleDeleteRoleName}
            onUpdateClient={handleUpdateClient}
            onUpdateMember={handleUpdateMember}
            onUpdateRoleName={handleUpdateRoleName}
          />
        )}

        {activeView === 'reports' && (
          <WeeklyReport entries={entries} projects={projects} rateCards={rateCards} onUpdateProject={handleUpdateProject} />
        )}
      </main>

      {/* Footer information */}
      <footer className="no-print text-center border-t border-zinc-900 py-6 text-[11px] text-zinc-600 mt-auto bg-zinc-950/40">
        <p>© 2026 The Uplift Partnership. All data securely stored online & synchronized with Google Sheets.</p>
      </footer>

      {/* 
        ============================================================
        MODALS & DIALOGS (Safeguarded Backdrop blur overlays)
        ============================================================
      */}

      {/* 1. Sync Confirmation Modal (Google Sheets Cloud Sync matching reference screenshot) */}
      {showSyncConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#121316] border border-zinc-800/90 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative my-auto animate-in fade-in zoom-in duration-200 text-zinc-100">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 mb-5 border-b border-zinc-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-100 font-sans tracking-tight">Google Sheets Cloud Sync</h3>
                  <p className="text-xs text-zinc-400 font-mono">Real-time spreadsheet synchronization</p>
                </div>
              </div>
              <button
                onClick={() => setShowSyncConfirmModal(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800/60 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {/* CARD 1: CONNECTED ACCOUNT */}
              <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                    CONNECTED ACCOUNT
                  </span>
                  {user && accessToken ? (
                    <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold px-2.5 py-0.5 rounded-md text-[11px]">
                      Active
                    </span>
                  ) : (
                    <span className="bg-amber-500/15 border border-amber-500/30 text-amber-400 font-semibold px-2.5 py-0.5 rounded-md text-[11px]">
                      Action Required
                    </span>
                  )}
                </div>

                {user && accessToken ? (
                  <div className="flex items-center gap-3 pt-1">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'User'}
                        className="h-10 w-10 rounded-full object-cover border border-zinc-700"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 font-bold text-sm">
                        {user.displayName?.[0] || user.email?.[0] || 'U'}
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <h4 className="text-sm font-bold text-zinc-100 truncate">
                        {user.displayName || 'Google User'}
                      </h4>
                      <p className="text-xs text-zinc-400 truncate font-mono">
                        {user.email}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="pt-1 space-y-2">
                    <p className="text-xs text-amber-300 font-medium leading-snug">
                      Sign-in with Google required to sync timesheets to your central database.
                    </p>
                    <button
                      onClick={() => {
                        handleLogin();
                      }}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all mt-2"
                    >
                      <LogIn className="h-4 w-4" />
                      Sign in with Google Account
                    </button>
                  </div>
                )}
              </div>

              {/* CARD 2: SYNC ENGINE STATUS */}
              <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                    SYNC ENGINE STATUS
                  </span>
                  {isSyncing ? (
                    <span className="bg-blue-500/15 border border-blue-500/30 text-blue-400 font-semibold px-2.5 py-0.5 rounded-md text-[11px] animate-pulse">
                      Syncing...
                    </span>
                  ) : user && accessToken ? (
                    <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold px-2.5 py-0.5 rounded-md text-[11px]">
                      Synced
                    </span>
                  ) : (
                    <span className="bg-zinc-800 border border-zinc-700 text-zinc-400 font-semibold px-2.5 py-0.5 rounded-md text-[11px]">
                      Not Connected
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-zinc-400 font-mono">Last successful sync:</span>
                  <span className="font-mono font-semibold text-zinc-200">
                    {lastSyncedAt
                      ? `${lastSyncedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}, ${lastSyncedAt.toLocaleTimeString()}`
                      : 'Never'}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleSafeSync}
                    disabled={isSyncing || !accessToken}
                    className="w-full bg-zinc-800 hover:bg-zinc-750 disabled:opacity-50 text-zinc-200 border border-zinc-700 font-semibold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
                    Sync Now
                  </button>

                  {(!accessToken || syncStatus.type === 'error') && (
                    <button
                      onClick={handleLogin}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all shrink-0"
                    >
                      <Database className="h-3.5 w-3.5" />
                      Reconnect
                    </button>
                  )}
                </div>
              </div>

              {/* CARD 3: TARGET SPREADSHEET DATABASE */}
              <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl p-4 space-y-3">
                <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                  TARGET SPREADSHEET DATABASE
                </span>

                <div className="flex items-center justify-between gap-3 py-1">
                  <div className="overflow-hidden">
                    <h4 className="text-xs font-bold text-zinc-200">
                      {getSpreadsheetId(spreadsheetUrl) ? 'Custom linked spreadsheet' : 'No spreadsheet linked'}
                    </h4>
                    <p className="text-[11px] font-mono text-zinc-400 truncate max-w-[200px]" title={getSpreadsheetId(spreadsheetUrl) || 'None'}>
                      {getSpreadsheetId(spreadsheetUrl) ? `ID: ${getSpreadsheetId(spreadsheetUrl)}` : 'Enter a Google Sheet URL below to link'}
                    </p>
                  </div>
                  {getSpreadsheetId(spreadsheetUrl) && (
                    <a
                      href={spreadsheetUrl.startsWith('http') ? spreadsheetUrl : `https://docs.google.com/spreadsheets/d/${spreadsheetUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-semibold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
                    >
                      Open Sheet
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>

                <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between gap-3">
                  <div>
                    <h5 className="text-xs font-bold text-zinc-200">Executive Summary Tab</h5>
                    <p className="text-[11px] text-zinc-400">
                      Rebuild CEO dashboard & live formulas with zero spill errors
                    </p>
                  </div>
                  <button
                    onClick={handleReformatExecutiveSummary}
                    disabled={isSyncing || !getSpreadsheetId(spreadsheetUrl)}
                    className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-semibold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all shrink-0 disabled:opacity-50"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    Reformat Tab
                  </button>
                </div>

                <div className="pt-2 border-t border-zinc-800/60 space-y-1.5">
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                    SWITCH/OVERRIDE SPREADSHEET URL / ID
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={spreadsheetUrl}
                      onChange={(e) => setSpreadsheetUrl(e.target.value)}
                      placeholder="Paste Google Sheet URL (https://docs.google.com/spreadsheets/d/...)"
                      className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-blue-500/50 rounded-xl px-3.5 py-2 text-xs text-zinc-200 font-mono placeholder-zinc-600 focus:outline-none transition-all"
                    />
                    <button
                      onClick={() => {
                        const trimmed = spreadsheetUrl.trim();
                        if (!trimmed) {
                          localStorage.removeItem('consulting_timesheet_spreadsheet_url');
                          setSpreadsheetUrl('');
                          setSyncStatus({
                            type: null,
                            message: 'Spreadsheet link cleared. Working in local mode.',
                          });
                          return;
                        }
                        localStorage.setItem('consulting_timesheet_spreadsheet_url', trimmed);
                        setSyncStatus({
                          type: 'success',
                          message: 'Spreadsheet database link updated successfully.',
                        });
                        if (accessToken) {
                          handleSafeSync();
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs cursor-pointer shadow-md transition-all shrink-0"
                    >
                      Link
                    </button>
                    {spreadsheetUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setSpreadsheetUrl('');
                          localStorage.removeItem('consulting_timesheet_spreadsheet_url');
                          setSyncStatus({
                            type: null,
                            message: 'Spreadsheet link cleared. Working in local mode.',
                          });
                        }}
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700 px-3 py-2 rounded-xl text-xs cursor-pointer transition-all shrink-0"
                        title="Clear URL"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80">
              {user ? (
                <button
                  onClick={() => {
                    handleLogout();
                    setShowSyncConfirmModal(false);
                  }}
                  className="text-red-400 hover:text-red-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Disconnect Google
                </button>
              ) : (
                <span className="text-zinc-500 text-xs font-mono">Not connected</span>
              )}

              <button
                onClick={() => setShowSyncConfirmModal(false)}
                className="bg-zinc-100 hover:bg-white text-zinc-900 font-bold px-5 py-2 rounded-xl text-xs cursor-pointer transition-all shadow"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Sync Status Toast / Notification Modal */}
      {syncStatus.type && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className={`absolute top-0 left-0 right-0 h-[3px] ${syncStatus.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>

            <div className="flex items-center gap-3 mb-4">
              {syncStatus.type === 'success' ? (
                <CheckCircle2 className="h-7 w-7 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="h-7 w-7 text-red-500 shrink-0" />
              )}
              <h3 className="text-sm font-bold text-zinc-100 font-display">
                {syncStatus.type === 'success'
                  ? 'Sync Complete'
                  : syncStatus.message.includes('authorization')
                  ? 'Google Authorization Expired'
                  : 'Sync Error'}
              </h3>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed mb-6">
              {syncStatus.message}
            </p>

            <div className="flex flex-col gap-2">
              {syncStatus.type === 'error' && (
                <button
                  onClick={async () => {
                    setSyncStatus({ type: null, message: '' });
                    await handleLogin();
                  }}
                  className="w-full bg-[#F5720A] hover:bg-[#e06505] text-zinc-950 font-bold py-2.5 rounded-xl text-xs cursor-pointer transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#F5720A]/10 active:scale-95"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Reconnect Google Sheets</span>
                </button>
              )}

              <button
                onClick={() => setSyncStatus({ type: null, message: '' })}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-semibold py-2.5 rounded-xl border border-zinc-700 text-xs cursor-pointer transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Wipe Database Confirmation Modal */}
      {showClearDbConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-md">
          <div className="bg-zinc-900 border border-red-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-red-500"></div>

            <div className="flex items-center gap-3 text-red-400 mb-3.5">
              <AlertCircle className="h-6 w-6" />
              <h3 className="text-md font-bold text-zinc-100">Wipe Entire Database?</h3>
            </div>

            <div className="text-xs text-zinc-400 space-y-2.5 mb-6 leading-relaxed">
              <p>
                You are about to perform a highly destructive, irreversible operation.
              </p>
              <p className="bg-red-500/10 text-red-400 p-3 rounded-lg border border-red-500/20 font-medium">
                This will delete all timesheet entries, projects, rate-cards, and team members from your local browser cache, resetting your application to a pristine starting state.
              </p>
              <p>
                To safeguard these logs permanently, sync with Google Sheets before executing this wipe.
              </p>

              <div className="space-y-1.5 pt-2">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                  Enter Password to Wipe <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={wipePassword}
                  onChange={(e) => {
                    setWipePassword(e.target.value);
                    setWipePasswordError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleClearDatabase();
                    }
                  }}
                  placeholder="Password..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 font-mono"
                  autoFocus
                />
                {wipePasswordError && (
                  <p className="text-[10px] text-red-400 mt-1 font-mono">❌ {wipePasswordError}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowClearDbConfirmModal(false)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold py-2.5 rounded-xl border border-zinc-700 text-xs transition-colors cursor-pointer"
              >
                Abort
              </button>
              <button
                onClick={handleClearDatabase}
                className="flex-1 bg-red-600 hover:bg-red-500 text-zinc-100 font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-red-600/10"
              >
                Wipe & Start Fresh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
