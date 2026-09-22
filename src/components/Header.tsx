import { User } from 'firebase/auth';
import { LogIn, LogOut, RefreshCw, CheckCircle2, AlertTriangle, Sun, Moon, Sparkles } from 'lucide-react';

interface HeaderProps {
  user: User | null;
  accessToken: string | null;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  onLogin: () => void;
  onLogout: () => void;
  onSync: () => void;
  onReformatExecutiveSummary?: () => void;
  syncError?: string | null;
  onReconnect?: () => void;
  version: string;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  hasSpreadsheetLinked?: boolean;
}

export default function Header({
  user,
  accessToken,
  isSyncing,
  lastSyncedAt,
  onLogin,
  onLogout,
  onSync,
  onReformatExecutiveSummary,
  syncError,
  onReconnect,
  version,
  theme = 'dark',
  onToggleTheme,
  hasSpreadsheetLinked = true,
}: HeaderProps) {
  const isSyncActive = Boolean(user && accessToken && !syncError);

  return (
    <header className="no-print border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Logo and App Title */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#F5720A]/10 border border-[#F5720A]/20 flex items-center justify-center text-[#F5720A]">
            <svg
              className="h-5 w-5 animate-pulse"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#F5720A] flex items-center gap-2">
              Timesheet Recorder
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-normal border border-zinc-700/50">
                {version}
              </span>
            </h1>
            <p className="text-xs text-zinc-400">Collaborative workflow engine & sheets database</p>
          </div>
        </div>

        {/* Sync Status, Theme Switch & Authentication */}
        <div className="flex flex-wrap items-center justify-end gap-3 w-full sm:w-auto">
          {/* Light / Dark Mode Switch */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="h-9 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0 shadow-sm"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? (
                <>
                  <Moon className="h-4 w-4 text-amber-500" />
                  <span className="font-mono text-zinc-800 font-bold">Dark Mode</span>
                </>
              ) : (
                <>
                  <Sun className="h-4 w-4 text-amber-400" />
                  <span className="font-mono text-zinc-200 font-bold">Light Mode</span>
                </>
              )}
            </button>
          )}

          {/* Sync Status Banner */}
          {isSyncing ? (
            <div className="flex items-center gap-2 bg-[#F5720A]/10 border border-[#F5720A]/25 rounded-xl px-3.5 py-1.5 text-xs text-[#F5720A] shadow-sm">
              <RefreshCw className="h-3.5 w-3.5 animate-spin shrink-0" />
              <span className="font-semibold text-[11px]">Syncing with Sheets...</span>
            </div>
          ) : syncError ? (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-3.5 py-1.5 text-xs text-red-300 shadow-sm">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="max-w-[170px] truncate font-medium text-[11px]" title={syncError}>
                Sync issue: {syncError}
              </span>
              <button
                onClick={onReconnect || onLogin}
                className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-100 text-[10px] font-bold rounded-lg border border-red-500/40 cursor-pointer transition-all shrink-0 flex items-center gap-1 shadow-sm active:scale-95"
                title="Reconnect Google Sheets authorization"
              >
                <RefreshCw className="h-2.5 w-2.5" />
                Reconnect
              </button>
              <button
                onClick={onSync}
                className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[10px] font-semibold rounded-lg border border-zinc-700 cursor-pointer transition-all shrink-0"
                title="Retry Sync"
              >
                Retry
              </button>
            </div>
          ) : isSyncActive ? (
            !hasSpreadsheetLinked ? (
              <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/25 rounded-xl px-3 py-1.5 text-xs text-blue-300 shadow-sm">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400"></span>
                </span>
                <span className="text-[11px] font-medium">Connected • No Sheet Linked</span>
                <button
                  onClick={onSync}
                  className="ml-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-all shrink-0 shadow-sm"
                  title="Link Google Sheet"
                >
                  Link Sheet
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-3.5 py-1.5 text-xs text-emerald-300 shadow-sm">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-semibold text-[11px]">Sync active</span>
                {lastSyncedAt && (
                  <span className="text-zinc-400 text-[10px]">
                    ({lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                  </span>
                )}
                <button
                  onClick={onSync}
                  disabled={isSyncing}
                  className="ml-1 hover:text-emerald-100 transition-colors cursor-pointer flex items-center gap-1 shrink-0 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/25 text-[10px] font-bold hover:bg-emerald-500/25"
                  title="Sync now"
                >
                  <RefreshCw className={`h-2.5 w-2.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Sync Now</span>
                </button>
                {onReformatExecutiveSummary && (
                  <button
                    onClick={onReformatExecutiveSummary}
                    disabled={isSyncing}
                    className="hover:text-amber-100 transition-colors cursor-pointer flex items-center gap-1 shrink-0 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-[10px] font-bold text-amber-300 hover:bg-amber-500/30 shadow-sm"
                    title="Format Executive Summary tab on Google Sheets"
                  >
                    <Sparkles className="h-2.5 w-2.5 text-amber-400" />
                    <span>Update CEO Sheet</span>
                  </button>
                )}
              </div>
            )
          ) : user ? (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-1.5 text-xs text-amber-300 shadow-sm">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
              <span className="hidden md:inline text-[11px] font-medium">Sheets sync paused. Connect Google Sheets access to enable sync.</span>
              <span className="md:hidden text-[11px] font-medium">Sync paused</span>
              <button
                onClick={onReconnect || onLogin}
                className="ml-1 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 text-[10px] font-bold rounded-lg border border-amber-500/30 cursor-pointer transition-all shrink-0 flex items-center gap-1 shadow-sm active:scale-95"
                title="Authorize Google Sheets sync"
              >
                <RefreshCw className="h-2.5 w-2.5" />
                Connect Sheets
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-zinc-800/80 border border-zinc-700/80 rounded-xl px-3 py-1.5 text-xs text-zinc-300 shadow-sm">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
              <span className="hidden md:inline text-[11px] font-medium">Sheets disconnected. Connect Google Sheets to enable live sync.</span>
              <span className="md:hidden text-[11px] font-medium">Not connected</span>
            </div>
          )}

          {/* User Profile & Auth Trigger */}
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-zinc-800 rounded-xl px-3 py-1.5 border border-zinc-700">
                <span className="text-xs text-zinc-300 font-medium">
                  {user.displayName || user.email}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="h-9 px-3 bg-zinc-800 hover:bg-zinc-700 hover:text-red-400 border border-zinc-700 rounded-xl text-zinc-300 text-xs font-medium flex items-center gap-2 transition-all cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={onLogin}
              className="gsi-material-button relative overflow-hidden shadow-lg border border-zinc-700/80 rounded-xl cursor-pointer"
            >
              <div className="gsi-material-button-state"></div>
              <div className="gsi-material-button-content-wrapper flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-4 py-2 transition-all">
                <div className="gsi-material-button-icon shrink-0">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    className="h-4.5 w-4.5 block"
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    ></path>
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    ></path>
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    ></path>
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    ></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents text-xs font-semibold text-zinc-100">
                  Sign in with Google
                </span>
              </div>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
