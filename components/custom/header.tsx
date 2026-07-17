'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { 
  Sparkles, 
  Bell, 
  ArrowLeftRight, 
  Check, 
  ChevronDown, 
  Info,
  LogOut
} from 'lucide-react';
import type { AuthState, DerivAccount } from '@deriv/core';

interface HeaderProps {
  authState: AuthState;
  accounts: DerivAccount[];
  activeAccount: DerivAccount | null;
  onLogin: () => Promise<void>;
  onLogout: () => void;
  onSwitchAccount: (accountId: string) => Promise<void>;
  /** When provided, a Sign up button is rendered to the right of the Log in button. */
  onSignUp?: () => Promise<void>;
  /** Logo source URL or data URL. When omitted, a placeholder badge is shown until
   *  the user provides a logo via the app builder (passed as a data URL via PREVIEW_BRANDING). */
  logoSrc?: string;
  /** App name used to derive the fallback logo letter when no logoSrc is provided.
   *  Falls back to NEXT_PUBLIC_DERIV_APP_NAME env var, then 'Deriv Trading'. */
  appName?: string;
  /** Optional controls rendered to the left of the login/logout button (e.g. a theme toggle). */
  actions?: React.ReactNode;
  /** Connection status */
  isConnected?: boolean;
}

function AccountLabel({ type }: { type: 'demo' | 'real' }) {
  return (
    <span
      className={cn(
        'text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-md shadow-sm',
        type === 'demo' 
          ? 'bg-amber-500/15 text-amber-500 dark:bg-amber-500/20' 
          : 'bg-emerald-500/15 text-emerald-500 dark:bg-emerald-500/20'
      )}
    >
      {type === 'demo' ? 'Demo' : 'Real'}
    </span>
  );
}

export function Header({
  authState,
  accounts,
  activeAccount,
  onLogin,
  onLogout,
  onSwitchAccount,
  onSignUp,
  logoSrc,
  appName,
  actions,
  isConnected = true,
}: HeaderProps) {
  const [logoError, setLogoError] = useState(false);
  const [accountSwitcherOpen, setAccountSwitcherOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isKes, setIsKes] = useState(false);
  
  // Hydrate local currency state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsKes(localStorage.getItem('astral_currency_kes') === 'true');
    }
  }, []);

  const handleToggleKes = () => {
    const newVal = !isKes;
    setIsKes(newVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('astral_currency_kes', String(newVal));
    }
  };

  const isAuthenticated = authState === 'authenticated';
  const isAuthenticating = authState === 'authenticating';

  const isDemo = activeAccount?.account_type === 'demo';
  const demoAccount = accounts.find(a => a.account_type === 'demo');
  const realAccount = accounts.find(a => a.account_type === 'real');
  const canSwitchAccountType = demoAccount && realAccount;

  const formatBalance = (balance: string, convertToKes: boolean, originalCurrency: string) => {
    const numericVal = Number(balance) || 0;
    if (convertToKes) {
      const kesVal = numericVal * 130.0;
      return `KES ${kesVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${numericVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${originalCurrency}`;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-14 md:h-16 items-center justify-between border-b border-border/40 bg-background/80 px-4 md:px-6 shadow-sm backdrop-blur-md">
      {/* BRAND & LOGO */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {!logoSrc || logoError ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/10 text-blue-500 shadow-sm transition-transform hover:scale-105 duration-200">
              <Sparkles className="h-5.5 w-5.5 animate-pulse text-blue-600 dark:text-blue-400" />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt="Astral Logo"
              className="h-8 w-auto object-contain transition-transform hover:scale-105"
              onError={() => setLogoError(true)}
            />
          )}
          <span className="font-sans font-bold tracking-tight text-foreground text-sm md:text-base flex items-center gap-1.5">
            ASTRAL <span className="text-[10px] bg-blue-600 text-white font-mono uppercase px-1 rounded font-semibold tracking-wider">PRO</span>
          </span>
        </div>

        {/* CONNECTION INDICATOR */}
        <div className="hidden sm:flex items-center gap-1.5 ml-4 px-2 py-1 rounded-full bg-muted/40 text-xs text-muted-foreground border border-border/10">
          <span className={cn(
            "relative flex h-2 w-2",
            isConnected ? "text-green-500" : "text-amber-500"
          )}>
            <span className={cn(
              "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
              isConnected ? "bg-green-400" : "bg-amber-400"
            )}></span>
            <span className={cn(
              "relative inline-flex rounded-full h-2 w-2",
              isConnected ? "bg-green-500" : "bg-amber-500"
            )}></span>
          </span>
          <span className="font-mono text-[10px] tracking-wide font-medium uppercase">
            {isConnected ? 'Live Connected' : 'Syncing...'}
          </span>
        </div>
      </div>

      {/* CONTROLS & ACCOUNT */}
      <div className="flex items-center gap-2 md:gap-4">
        {actions}

        {/* USD / KES TOGGLE */}
        {isAuthenticated && activeAccount && (
          <button
            onClick={handleToggleKes}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 text-xs font-mono font-bold text-muted-foreground hover:text-foreground transition-all shadow-xs"
            title="Toggle USD/KES Exchange Display"
          >
            <ArrowLeftRight className="h-3.5 w-3.5 text-blue-500" />
            <span>{isKes ? 'KES' : 'USD'}</span>
          </button>
        )}

        {/* NOTIFICATIONS */}
        <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <PopoverTrigger asChild>
            <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border/40 hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-all shadow-xs">
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0 border border-border bg-card shadow-lg rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border/60 bg-muted/30 flex justify-between items-center">
              <span className="text-xs font-semibold text-foreground tracking-wide uppercase">System Alerts</span>
              <span className="text-[10px] bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded font-mono font-semibold">Active</span>
            </div>
            <div className="divide-y divide-border/40 max-h-[300px] overflow-y-auto">
              <div className="p-3.5 flex gap-2.5 hover:bg-muted/20 transition-colors">
                <div className="p-1 h-fit rounded-lg bg-blue-500/10 text-blue-500">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 space-y-0.5">
                  <p className="text-xs font-medium text-foreground">Astral AI Engine Active</p>
                  <p className="text-[10px] text-muted-foreground">Neural sequence models analyzing ticks in real-time.</p>
                  <p className="text-[9px] text-muted-foreground font-mono">1m ago</p>
                </div>
              </div>
              <div className="p-3.5 flex gap-2.5 hover:bg-muted/20 transition-colors">
                <div className="p-1 h-fit rounded-lg bg-emerald-500/10 text-emerald-500">
                  <Check className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 space-y-0.5">
                  <p className="text-xs font-medium text-foreground">Deriv WS Stream Sync</p>
                  <p className="text-[10px] text-muted-foreground">Handshake established with Deriv production API node.</p>
                  <p className="text-[9px] text-muted-foreground font-mono">5m ago</p>
                </div>
              </div>
              <div className="p-3.5 flex gap-2.5 hover:bg-muted/20 transition-colors">
                <div className="p-1 h-fit rounded-lg bg-amber-500/10 text-amber-500">
                  <Info className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 space-y-0.5">
                  <p className="text-xs font-medium text-foreground">White-Label Branding Loaded</p>
                  <p className="text-[10px] text-muted-foreground">Astral customization layers injected successfully.</p>
                  <p className="text-[9px] text-muted-foreground font-mono">10m ago</p>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* DEMO / REAL SWITCH */}
        {isAuthenticated && activeAccount && (
          <div className="hidden md:flex items-center bg-muted/60 border border-border/60 rounded-full p-1 shadow-inner select-none">
            <button
              onClick={() => {
                if (!isDemo && demoAccount) onSwitchAccount(demoAccount.account_id);
              }}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-full transition-all duration-200",
                isDemo 
                  ? "bg-amber-500 text-white shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Demo
            </button>
            <button
              onClick={() => {
                if (isDemo && realAccount) onSwitchAccount(realAccount.account_id);
              }}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-full transition-all duration-200",
                !isDemo 
                  ? "bg-emerald-600 text-white shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Real
            </button>
          </div>
        )}

        {/* ACCOUNT DROPDOWN */}
        {isAuthenticated && activeAccount && (
          <Popover open={accountSwitcherOpen} onOpenChange={setAccountSwitcherOpen}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2.5 rounded-xl border border-border bg-card hover:bg-muted/30 px-3.5 py-1.5 transition-all shadow-xs outline-none">
                <div className="text-left leading-none space-y-1">
                  <div className="flex items-center gap-1.5">
                    <AccountLabel type={activeAccount.account_type} />
                    <span className="text-[10px] font-mono text-muted-foreground font-semibold">{activeAccount.account_id}</span>
                  </div>
                  <p className="text-sm font-bold text-foreground">
                    {formatBalance(activeAccount.balance, isKes, activeAccount.currency)}
                  </p>
                </div>
                <ChevronDown className={cn(
                  'w-4 h-4 text-muted-foreground transition-transform duration-200',
                  accountSwitcherOpen && 'rotate-180'
                )} />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-2.5 border border-border bg-card shadow-lg rounded-xl">
              <div className="px-2.5 py-2 mb-2 bg-muted/40 rounded-lg">
                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Accounts Portfolio</p>
              </div>
              <div className="space-y-1 max-h-[220px] overflow-y-auto">
                {accounts.map((account) => (
                  <button
                    key={account.account_id}
                    onClick={() => {
                      onSwitchAccount(account.account_id);
                      setAccountSwitcherOpen(false);
                    }}
                    className={cn(
                      'w-full text-left rounded-lg px-3 py-2.5 transition-colors flex items-center justify-between',
                      account.account_id === activeAccount.account_id
                        ? 'bg-muted'
                        : 'hover:bg-muted/50'
                    )}
                  >
                    <div>
                      <AccountLabel type={account.account_type} />
                      <span className="text-[10px] font-mono text-muted-foreground ml-2">{account.account_id}</span>
                      <p className="text-sm font-bold text-foreground mt-1">
                        {formatBalance(account.balance, isKes, account.currency)}
                      </p>
                    </div>
                    {account.account_id === activeAccount.account_id && (
                      <Check className="h-4.5 w-4.5 text-blue-500 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
              <div className="border-t border-border mt-2 pt-2.5 px-2">
                <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={onLogout}>
                  Disconnect Wallet
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* LOGOUT / LOGIN IF NOT AUTHENTICATED */}
        {isAuthenticated ? (
          <div className="md:hidden">
            <Button variant="outline" size="icon" className="text-destructive border-destructive/20 hover:bg-destructive/10" onClick={onLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-xs h-9" onClick={onLogin} disabled={isAuthenticating}>
              {isAuthenticating ? 'Authorizing...' : 'Connect Deriv'}
            </Button>
            {onSignUp && (
              <Button size="sm" className="text-xs h-9 bg-blue-600 hover:bg-blue-700" onClick={onSignUp} disabled={isAuthenticating}>
                Create Account
              </Button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}