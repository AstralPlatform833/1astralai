'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Footer } from '@/components/custom/footer';
import { Header } from '@/components/custom/header';
import { Skeleton } from '@/components/ui/skeleton';
import { CurrentTickDisplay } from './current-tick-display';
import { DigitStatsBar } from './digit-stats-bar';
import { TradeControls } from './trade-controls';
import { TradeTypeChips } from '@/components/custom/trade-type-chips';
import { SymbolSelector } from '@/components/custom/symbol-selector';
import { ThemeToggle } from '@/components/custom/theme-toggle';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getLastDigit } from '../lib/digit-stats';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Brain, 
  Cpu, 
  Zap, 
  BarChart3, 
  Gauge, 
  Compass, 
  Sparkles,
  RefreshCw,
  Clock,
  Layers,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import type {
  AuthState,
  DerivAccount,
  ActiveSymbol,
  Tick,
  ProposalInfo,
  DurationLimits,
  BuyResult,
} from '@deriv/core';
import type { ContractMode, TradeType, DigitStats } from '../lib/types';

const DIGIT_TRADE_TYPE_OPTIONS: { value: TradeType; label: string }[] = [
  { value: 'matches-differs', label: 'Matches/Differs' },
  { value: 'over-under', label: 'Over/Under' },
  { value: 'even-odd', label: 'Even/Odd' },
];

export interface DigitsViewProps {
  // Auth
  authState: AuthState;
  accounts: DerivAccount[];
  activeAccount: DerivAccount | null;
  onLogin: () => Promise<void>;
  onSignUp: () => Promise<void>;
  onLogout: () => void;
  onSwitchAccount: (accountId: string) => Promise<void>;

  // Connection / loading
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;

  // Market data
  symbols: ActiveSymbol[];
  activeSymbol: ActiveSymbol | null;
  selectSymbol: (symbol: string) => void;
  currentTick: Tick | null;
  lastDigit: number | null;
  digitStats: DigitStats;
  pipSize: number;
  prices: number[];

  // Trade controls
  tradeType: TradeType;
  setTradeType: (type: TradeType) => void;
  contractMode: ContractMode;
  setContractMode: (mode: ContractMode) => void;
  selectedDigit: number;
  setSelectedDigit: (digit: number) => void;
  stake: string;
  setStake: (value: string) => void;
  duration: number;
  setDuration: (value: number) => void;
  durationLimits: DurationLimits;
  proposal: ProposalInfo | null;
  isProposalLoading: boolean;
  buyContract: () => Promise<void>;
  isBuying: boolean;
  buyResult: BuyResult | null;
  buyError: string | null;
  clearBuyResult: () => void;
  // Branding
  logoSrc?: string;
  appName?: string;
}

export function DigitsView({
  authState,
  accounts,
  activeAccount,
  onLogin,
  onSignUp,
  onLogout,
  onSwitchAccount,
  isConnected,
  isLoading,
  error,
  symbols,
  activeSymbol,
  selectSymbol,
  currentTick,
  lastDigit,
  digitStats,
  pipSize,
  prices = [],
  tradeType,
  setTradeType,
  contractMode,
  setContractMode,
  selectedDigit,
  setSelectedDigit,
  stake,
  setStake,
  duration,
  setDuration,
  durationLimits,
  proposal,
  isProposalLoading,
  buyContract,
  isBuying,
  buyResult,
  buyError,
  clearBuyResult,
  logoSrc,
  appName,
}: DigitsViewProps) {
  const [prevPrice, setPrevPrice] = useState<number | null>(null);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | 'neutral'>('neutral');
  const [tickInterval, setTickInterval] = useState<number>(0);
  const lastTickTimeRef = useRef<number>(Date.now());

  // Track price movement & live interval speed
  useEffect(() => {
    if (currentTick?.quote) {
      const now = Date.now();
      const diff = (now - lastTickTimeRef.current) / 1000;
      if (diff > 0.1 && diff < 15) {
        setTickInterval(diff);
      }
      lastTickTimeRef.current = now;

      if (prevPrice !== null) {
        if (currentTick.quote > prevPrice) {
          setPriceDirection('up');
        } else if (currentTick.quote < prevPrice) {
          setPriceDirection('down');
        } else {
          setPriceDirection('neutral');
        }
      }
      setPrevPrice(currentTick.quote);
    }
  }, [currentTick]);

  // Reset price flashing after a brief delay
  useEffect(() => {
    if (priceDirection !== 'neutral') {
      const timer = setTimeout(() => setPriceDirection('neutral'), 600);
      return () => clearTimeout(timer);
    }
  }, [priceDirection]);

  // Compute live market trend from trailing tick prices (rolling window of 15)
  const marketTrend = useMemo(() => {
    if (prices.length < 5) return 'Sideways';
    const recent = prices.slice(-15);
    let upCount = 0;
    for (let i = 1; i < recent.length; i++) {
      if (recent[i] > recent[i - 1]) upCount++;
    }
    const ratio = upCount / (recent.length - 1);
    if (ratio > 0.6) return 'Bullish';
    if (ratio < 0.4) return 'Bearish';
    return 'Sideways';
  }, [prices]);

  // Compute live market stream health
  const marketHealth = useMemo(() => {
    if (!isConnected) return 'Disconnected';
    if (tickInterval === 0) return 'Syncing...';
    if (tickInterval <= 1.8) return 'Optimal';
    if (tickInterval <= 3.5) return 'Stable';
    return 'Degraded';
  }, [isConnected, tickInterval]);

  // Extract trailing digits for analytics grid
  const recentDigits = useMemo(() => {
    if (!prices.length) return [];
    return prices.slice(-12).map((price) => getLastDigit(price, pipSize));
  }, [prices, pipSize]);

  // Calculate live 10x10 Transition Matrix
  const transitionMatrix = useMemo(() => {
    const matrix = Array.from({ length: 10 }, () => Array(10).fill(0));
    if (prices.length < 2) return matrix;

    const lastDigits = prices.slice(-150).map((price) => getLastDigit(price, pipSize));
    
    for (let i = 1; i < lastDigits.length; i++) {
      const prev = lastDigits[i - 1];
      const curr = lastDigits[i];
      if (prev >= 0 && prev <= 9 && curr >= 0 && curr <= 9) {
        matrix[prev][curr]++;
      }
    }

    // Normalize each row into probabilities (0 - 100%)
    return matrix.map((row) => {
      const total = row.reduce((sum, val) => sum + val, 0);
      return row.map((val) => (total > 0 ? (val / total) * 100 : 0));
    });
  }, [prices, pipSize]);

  // Calculate live statistical success probabilities for AI cards
  const aiStats = useMemo(() => {
    if (prices.length < 10) {
      return { differ: null, over1: null, under8: null };
    }

    const rollingDigits = prices.slice(-100).map((price) => getLastDigit(price, pipSize));
    const total = rollingDigits.length;

    // 1. Differ Success Rate: Probability of not hitting selectedDigit
    const selectedDigitCount = rollingDigits.filter((d) => d === selectedDigit).length;
    const differProb = ((total - selectedDigitCount) / total) * 100;

    // 2. Over 1 Success Rate: Probability of digit > 1 (2, 3, 4, 5, 6, 7, 8, 9)
    const over1Count = rollingDigits.filter((d) => d > 1).length;
    const over1Prob = (over1Count / total) * 100;

    // 3. Under 8 Success Rate: Probability of digit < 8 (0, 1, 2, 3, 4, 5, 6, 7)
    const under8Count = rollingDigits.filter((d) => d < 8).length;
    const under8Prob = (under8Count / total) * 100;

    return {
      differ: differProb,
      over1: over1Prob,
      under8: under8Prob,
    };
  }, [prices, pipSize, selectedDigit]);

  // Astra AI Companion real-time advice engine
  const astraAdvice = useMemo(() => {
    if (prices.length < 10) {
      return "Astra is connecting to the live tick stream. Standby for quantitative analysis...";
    }
    const maxFreqIndex = digitStats.percentages.indexOf(Math.max(...digitStats.percentages));
    const minFreqIndex = digitStats.percentages.indexOf(Math.min(...digitStats.percentages));

    if (marketTrend === 'Bullish') {
      return `Astra detects Bullish price waves. Probability for Digit Under 8 is stable at ${aiStats.under8?.toFixed(1) ?? '80.0'}%. Digit ${maxFreqIndex} is showing a high recurrence spike.`;
    }
    if (marketTrend === 'Bearish') {
      return `Astra identifies a strong Bearish descent. Digit ${selectedDigit} has a ${(100 - (digitStats.percentages[selectedDigit] || 10)).toFixed(1)}% empirical Differ success rate. Digit ${minFreqIndex} is currently coldest.`;
    }
    return `Market is currently consolidating sideways. Sequence analytics identify a sequence transition hot point around Digit ${maxFreqIndex} → ${getLastDigit(prices[prices.length - 1], pipSize)}.`;
  }, [prices, marketTrend, digitStats, aiStats, selectedDigit, pipSize]);

  if (error) {
    return (
      <main className="flex flex-col bg-background items-center justify-center px-4 min-h-dvh">
        <Card className="max-w-md w-full border-destructive/20 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 text-destructive mb-3">
              <AlertCircle className="h-6 w-6" />
            </div>
            <CardTitle className="text-destructive font-bold text-xl">Connection Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => window.location.reload()} className="w-full bg-blue-600 hover:bg-blue-700">
              Retry Connection
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex flex-col bg-slate-950 text-slate-100 max-lg:h-dvh max-lg:overflow-y-auto lg:overflow-visible min-h-screen">
      <Header
        authState={authState}
        accounts={accounts}
        activeAccount={activeAccount}
        onLogin={onLogin}
        onSignUp={onSignUp}
        onLogout={onLogout}
        onSwitchAccount={onSwitchAccount}
        logoSrc={logoSrc}
        appName={appName}
        actions={<ThemeToggle />}
        isConnected={isConnected}
      />
      
      {/* Space below fixed header */}
      <div className={authState === 'authenticated' ? 'h-14 md:h-16 shrink-0' : 'h-14 shrink-0'} />

      <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-4 md:py-6 flex flex-col gap-5 md:gap-6 pb-24">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full rounded-xl bg-slate-800" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-[200px] rounded-xl bg-slate-800 col-span-2" />
              <Skeleton className="h-[200px] rounded-xl bg-slate-800" />
            </div>
            <Skeleton className="h-[300px] w-full rounded-xl bg-slate-800" />
          </div>
        ) : (
          <>
            {/* TOP ROW: MARKET SELECTOR */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60 shadow-sm backdrop-blur-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/10 text-blue-400 rounded-xl border border-blue-500/10">
                  <Compass className="h-5 w-5 animate-spin-slow" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold tracking-wide text-slate-300 uppercase">Operational Market</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Changing the market updates all real-time widgets instantly</p>
                </div>
              </div>
              
              <div className="w-full md:w-80">
                <SymbolSelector
                  symbols={symbols}
                  activeSymbol={activeSymbol}
                  onSymbolChange={selectSymbol}
                />
              </div>
            </div>

            {/* LIVE PANEL BENTO GRID */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
              {/* CURRENT PRICE */}
              <Card className="bg-slate-900/50 border-slate-800/80 shadow-md flex flex-col justify-between p-4 overflow-hidden relative">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 tracking-wider uppercase font-bold">Current Quote</span>
                  <Activity className="h-3.5 w-3.5 text-slate-500" />
                </div>
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={currentTick?.quote}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      "text-xl sm:text-2xl font-mono font-bold mt-2 tracking-tight transition-colors",
                      priceDirection === 'up' && "text-emerald-400",
                      priceDirection === 'down' && "text-rose-400",
                      priceDirection === 'neutral' && "text-slate-100"
                    )}
                  >
                    {currentTick?.quote ? currentTick.quote.toFixed(pipSize) : 'Loading...'}
                  </motion.div>
                </AnimatePresence>
              </Card>

              {/* CURRENT DIGIT */}
              <Card className="bg-slate-900/50 border-slate-800/80 shadow-md flex flex-col justify-between p-4 relative">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 tracking-wider uppercase font-bold">Last Digit</span>
                  <Zap className="h-3.5 w-3.5 text-blue-400" />
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key={lastDigit}
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.7, opacity: 0 }}
                      className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-blue-600/20 text-blue-400 font-bold font-mono text-xl sm:text-2xl flex items-center justify-center border border-blue-500/30 shadow-inner shadow-blue-500/10"
                    >
                      {lastDigit ?? '-'}
                    </motion.div>
                  </AnimatePresence>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">Sequence parity</span>
                    <span className="text-[10px] font-bold text-slate-200">
                      {lastDigit !== null ? (lastDigit % 2 === 0 ? 'EVEN' : 'ODD') : '-'}
                    </span>
                  </div>
                </div>
              </Card>

              {/* TICK SPEED */}
              <Card className="bg-slate-900/50 border-slate-800/80 shadow-md flex flex-col justify-between p-4 col-span-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 tracking-wider uppercase font-bold">Stream Speed</span>
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <div className="text-xl sm:text-2xl font-mono font-bold mt-2 text-slate-100 flex items-baseline gap-1">
                  {tickInterval > 0 ? tickInterval.toFixed(1) : '...'}
                  <span className="text-xs text-slate-400 font-sans font-medium">sec/tick</span>
                </div>
              </Card>

              {/* MARKET TREND */}
              <Card className="bg-slate-900/50 border-slate-800/80 shadow-md flex flex-col justify-between p-4 col-span-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 tracking-wider uppercase font-bold">Trend Matrix</span>
                  {marketTrend === 'Bullish' && <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />}
                  {marketTrend === 'Bearish' && <TrendingDown className="h-3.5 w-3.5 text-rose-400" />}
                  {marketTrend === 'Sideways' && <Activity className="h-3.5 w-3.5 text-amber-400" />}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className={cn(
                    "px-2 py-0.5 rounded text-xs font-bold font-mono tracking-wider",
                    marketTrend === 'Bullish' && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25",
                    marketTrend === 'Bearish' && "bg-rose-500/10 text-rose-400 border border-rose-500/25",
                    marketTrend === 'Sideways' && "bg-slate-800 text-slate-300 border border-slate-700"
                  )}>
                    {marketTrend}
                  </div>
                </div>
              </Card>

              {/* MARKET HEALTH */}
              <Card className="bg-slate-900/50 border-slate-800/80 shadow-md flex flex-col justify-between p-4 col-span-2 md:col-span-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 tracking-wider uppercase font-bold">Stream Sync</span>
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={cn(
                    "text-xs font-bold uppercase",
                    marketHealth === 'Optimal' && "text-emerald-400",
                    marketHealth === 'Stable' && "text-blue-400",
                    marketHealth === 'Degraded' && "text-amber-400",
                    marketHealth === 'Disconnected' && "text-rose-500"
                  )}>
                    {marketHealth}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        marketHealth === 'Optimal' && "bg-emerald-500 w-full",
                        marketHealth === 'Stable' && "bg-blue-500 w-3/4",
                        marketHealth === 'Degraded' && "bg-amber-500 w-1/3",
                        marketHealth === 'Disconnected' && "bg-rose-500 w-0"
                      )}
                    />
                  </div>
                </div>
              </Card>
            </div>

            {/* MAIN DASHBOARD SPLIT */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* LEFT & CENTER PANEL */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* AI RESEARCH MODULE */}
                <div>
                  <div className="flex items-center gap-2 mb-3.5">
                    <Brain className="h-4.5 w-4.5 text-blue-400" />
                    <h3 className="text-sm font-bold tracking-wider uppercase text-slate-200">AI Quantitative Research</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* DIFFER SUCCESS */}
                    <Card className="bg-slate-900/40 border-slate-800/80 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                      <CardHeader className="p-4 pb-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Differ Algorithm</span>
                          <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1 py-0.2 rounded font-mono">Live</span>
                        </div>
                        <CardTitle className="text-base font-bold mt-1">Differ Prediction</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        {aiStats.differ === null ? (
                          <div className="flex items-center gap-2 py-4">
                            <RefreshCw className="h-3.5 w-3.5 text-blue-400 animate-spin" />
                            <span className="text-xs text-slate-400 font-mono">Analyzing ticks...</span>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-baseline justify-between mt-1">
                              <span className="text-2xl font-mono font-bold text-slate-100">{aiStats.differ.toFixed(1)}%</span>
                              <span className="text-[10px] text-slate-400 font-mono">empirical success</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                              <div className="h-full bg-blue-500" style={{ width: `${aiStats.differ}%` }} />
                            </div>
                            <p className="text-[10px] text-slate-400 leading-normal">
                              Probability of last digit matching target <span className="font-bold text-blue-400">Digit {selectedDigit}</span>.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* OVER 1 SUCCESS */}
                    <Card className="bg-slate-900/40 border-slate-800/80 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                      <CardHeader className="p-4 pb-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Over 1 Model</span>
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1 py-0.2 rounded font-mono">Live</span>
                        </div>
                        <CardTitle className="text-base font-bold mt-1">Over 1 Prediction</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        {aiStats.over1 === null ? (
                          <div className="flex items-center gap-2 py-4">
                            <RefreshCw className="h-3.5 w-3.5 text-emerald-400 animate-spin" />
                            <span className="text-xs text-slate-400 font-mono">Analyzing ticks...</span>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-baseline justify-between mt-1">
                              <span className="text-2xl font-mono font-bold text-slate-100">{aiStats.over1.toFixed(1)}%</span>
                              <span className="text-[10px] text-slate-400 font-mono">empirical success</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                              <div className="h-full bg-emerald-500" style={{ width: `${aiStats.over1}%` }} />
                            </div>
                            <p className="text-[10px] text-slate-400 leading-normal">
                              Likelihood of digit <span className="font-bold text-emerald-400">Over 1</span> (meaning {'>'} 1).
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* UNDER 8 SUCCESS */}
                    <Card className="bg-slate-900/40 border-slate-800/80 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                      <CardHeader className="p-4 pb-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Under 8 Model</span>
                          <span className="text-[9px] bg-amber-500/10 text-amber-400 px-1 py-0.2 rounded font-mono">Live</span>
                        </div>
                        <CardTitle className="text-base font-bold mt-1">Under 8 Prediction</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        {aiStats.under8 === null ? (
                          <div className="flex items-center gap-2 py-4">
                            <RefreshCw className="h-3.5 w-3.5 text-amber-500 animate-spin" />
                            <span className="text-xs text-slate-400 font-mono">Analyzing ticks...</span>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-baseline justify-between mt-1">
                              <span className="text-2xl font-mono font-bold text-slate-100">{aiStats.under8.toFixed(1)}%</span>
                              <span className="text-[10px] text-slate-400 font-mono">empirical success</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                              <div className="h-full bg-amber-500" style={{ width: `${aiStats.under8}%` }} />
                            </div>
                            <p className="text-[10px] text-slate-400 leading-normal">
                              Likelihood of digit <span className="font-bold text-amber-400">Under 8</span> (meaning {'<'} 8).
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* DIGIT ANALYTICS SUITE */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4.5 w-4.5 text-blue-400" />
                    <h3 className="text-sm font-bold tracking-wider uppercase text-slate-200">Algorithmic Digit Analytics</h3>
                  </div>

                  {/* RECENT DIGITS FEED */}
                  <Card className="bg-slate-900/40 border-slate-800/80 p-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-slate-300">Live Rolling Digits Stream</span>
                      <span className="text-[10px] text-slate-500 font-mono">Latest digit on far right</span>
                    </div>
                    <div className="flex items-center justify-between gap-1.5 sm:gap-3 flex-wrap">
                      {recentDigits.length === 0 ? (
                        <div className="w-full text-center text-xs text-slate-500 py-3 font-mono">
                          Synchronizing with WebSocket tick stream...
                        </div>
                      ) : (
                        recentDigits.map((digit, idx) => {
                          const isLatest = idx === recentDigits.length - 1;
                          const isSelected = digit === selectedDigit;
                          const isEven = digit % 2 === 0;

                          return (
                            <div key={idx} className="flex flex-col items-center gap-1">
                              <motion.div
                                animate={isLatest ? { scale: [1, 1.15, 1] } : {}}
                                transition={{ repeat: isLatest ? Infinity : 0, duration: 1.5 }}
                                className={cn(
                                  "h-8 w-8 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center font-mono font-bold text-xs sm:text-sm border transition-all",
                                  isLatest 
                                    ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20" 
                                    : isSelected 
                                      ? "bg-amber-500/20 text-amber-400 border-amber-500/30" 
                                      : "bg-slate-900 border-slate-800 text-slate-300"
                                )}
                              >
                                {digit}
                              </motion.div>
                              <span className="text-[8px] font-mono text-slate-500">
                                {isEven ? 'E' : 'O'}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </Card>

                  {/* FREQUENCY AND HEATMAP */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* DIGIT FREQUENCY DISTRIBUTION */}
                    <Card className="bg-slate-900/40 border-slate-800/80 p-4">
                      <div className="mb-3">
                        <span className="text-xs font-bold text-slate-300 block">Digit Frequency Distribution</span>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">Frequency percentages calculated dynamically</span>
                      </div>
                      
                      <div className="space-y-2 mt-4">
                        {digitStats.percentages.map((pct, digit) => {
                          const isSelected = digit === selectedDigit;
                          const maxPct = Math.max(...digitStats.percentages);
                          const minPct = Math.min(...digitStats.percentages);
                          const isHighest = pct === maxPct && pct > 0;
                          const isLowest = pct === minPct && pct > 0;

                          return (
                            <div key={digit} className="flex items-center gap-3 text-xs">
                              <span className={cn(
                                "font-mono font-bold w-4 text-center",
                                isSelected ? "text-amber-400" : "text-slate-300"
                              )}>
                                {digit}
                              </span>
                              <div className="flex-1 h-3 rounded-md bg-slate-950 overflow-hidden relative border border-slate-800/40">
                                <div 
                                  className={cn(
                                    "h-full rounded-sm transition-all duration-300",
                                    isHighest ? "bg-emerald-500" : isLowest ? "bg-rose-500" : isSelected ? "bg-amber-500" : "bg-blue-600/70"
                                  )}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className={cn(
                                "font-mono w-10 text-right font-medium",
                                isHighest && "text-emerald-400 font-bold",
                                isLowest && "text-rose-400 font-bold",
                                !isHighest && !isLowest && "text-slate-400"
                              )}>
                                {pct.toFixed(1)}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </Card>

                    {/* HEAT MAP */}
                    <Card className="bg-slate-900/40 border-slate-800/80 p-4 flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-300 block">Digit Density Heat Map</span>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">Deep colored matrix blocks identify high density</span>
                      </div>

                      <div className="grid grid-cols-5 gap-2.5 my-6">
                        {digitStats.percentages.map((pct, digit) => {
                          const maxPct = Math.max(...digitStats.percentages);
                          const ratio = maxPct > 0 ? pct / maxPct : 0;
                          const isSelected = digit === selectedDigit;

                          return (
                            <button
                              key={digit}
                              onClick={() => setSelectedDigit(digit)}
                              className={cn(
                                "aspect-square rounded-xl flex flex-col items-center justify-center border font-mono transition-all duration-200 relative",
                                isSelected ? "border-amber-500 shadow-md ring-1 ring-amber-500/20" : "border-slate-800"
                              )}
                              style={{
                                backgroundColor: `rgba(37, 99, 235, ${0.05 + ratio * 0.4})`,
                              }}
                            >
                              <span className={cn(
                                "text-lg font-bold",
                                isSelected ? "text-amber-400" : "text-slate-100"
                              )}>
                                {digit}
                              </span>
                              <span className="text-[8px] text-slate-400">
                                {pct.toFixed(0)}%
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </Card>
                  </div>

                  {/* 10x10 TRANSITION MATRIX */}
                  <Card className="bg-slate-900/40 border-slate-800/80 p-4">
                    <div className="mb-3">
                      <span className="text-xs font-bold text-slate-300 block">Digit Sequence Transition Matrix</span>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Row (previous digit) to Column (next digit) transition probability</span>
                    </div>

                    <div className="overflow-x-auto">
                      <div className="min-w-[450px] space-y-1">
                        {/* Header Row */}
                        <div className="flex items-center">
                          <div className="w-7 text-[9px] font-bold text-slate-500 text-center font-mono">P \ C</div>
                          {Array.from({ length: 10 }).map((_, col) => (
                            <div key={col} className="flex-1 text-[9px] font-bold text-slate-400 text-center font-mono">
                              {col}
                            </div>
                          ))}
                        </div>

                        {/* Data Rows */}
                        {transitionMatrix.map((row, rIdx) => (
                          <div key={rIdx} className="flex items-center h-6 sm:h-7">
                            <div className="w-7 text-[9px] font-bold text-slate-400 text-center font-mono">
                              {rIdx}
                            </div>
                            {row.map((prob, cIdx) => {
                              const opacity = prob > 0 ? 0.05 + (prob / 100) * 0.95 : 0;
                              return (
                                <div
                                  key={cIdx}
                                  className={cn(
                                    "flex-1 h-full mx-0.5 rounded-sm flex items-center justify-center border font-mono text-[8px] font-medium transition-all duration-300",
                                    prob > 15 ? "text-slate-100 border-blue-500/20" : "text-slate-400 border-slate-900/20"
                                  )}
                                  style={{
                                    backgroundColor: prob > 0 ? `rgba(37, 99, 235, ${opacity})` : 'transparent',
                                  }}
                                  title={`Transition ${rIdx} -> ${cIdx}: ${prob.toFixed(1)}%`}
                                >
                                  {prob > 0 ? `${prob.toFixed(0)}` : '0'}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              {/* RIGHT SIDEBAR: ASTRA AI + TRADE CONTROLS */}
              <div className="space-y-6">
                
                {/* ASTRA AI COMPANION */}
                <Card className="bg-slate-900/40 border-slate-800/80 relative overflow-hidden p-5 shadow-lg">
                  {/* Subtle decorative grid background */}
                  <div className="absolute inset-0 bg-grid-white bg-[size:16px_16px]" />
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl" />

                  <div className="relative flex flex-col items-center text-center">
                    {/* Pulsing visual cosmic orb */}
                    <div className="relative h-28 w-28 flex items-center justify-center mb-4">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
                        className="absolute inset-0 rounded-full border border-dashed border-blue-500/30 p-2"
                      />
                      <motion.div
                        animate={{ rotate: -360 }}
                        transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
                        className="absolute h-22 w-22 rounded-full border border-double border-blue-400/20"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
                        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                        className="h-16 w-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 border border-blue-400/50"
                      >
                        <Cpu className="h-7 w-7 animate-pulse text-blue-100" />
                      </motion.div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-amber-400" />
                        <span className="font-sans font-bold tracking-tight text-sm text-slate-200">ASTRA QUANT COMPANION</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono tracking-wider">SEQUENCE ALGORITHM v1.2</p>
                    </div>

                    <div className="bg-slate-950/80 border border-slate-800/60 rounded-xl p-4 mt-4 w-full text-left">
                      <p className="text-xs leading-relaxed text-slate-300 font-sans italic">
                        &ldquo;{astraAdvice}&rdquo;
                      </p>
                    </div>
                  </div>
                </Card>

                {/* TRADE CONFIGURATION */}
                <Card className="bg-slate-900/40 border-slate-800/80 p-5 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-blue-400" />
                      <span className="text-xs font-bold tracking-wider uppercase text-slate-200">Trade Configuration</span>
                    </div>
                    <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded font-mono font-semibold uppercase">Digit contract</span>
                  </div>

                  <div className="space-y-4">
                    <div className="shrink-0 overflow-x-auto pb-1.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden border-b border-slate-800/40">
                      <TradeTypeChips
                        value={tradeType}
                        options={DIGIT_TRADE_TYPE_OPTIONS}
                        onValueChange={setTradeType}
                      />
                    </div>

                    <TradeControls
                      tradeType={tradeType}
                      contractMode={contractMode}
                      onContractModeChange={setContractMode}
                      selectedDigit={selectedDigit}
                      isConnected={isConnected}
                      stake={stake}
                      onStakeChange={setStake}
                      duration={duration}
                      onDurationChange={setDuration}
                      durationLimits={durationLimits}
                      proposal={proposal}
                      isProposalLoading={isProposalLoading}
                      onBuy={buyContract}
                      isBuying={isBuying}
                      buyResult={buyResult}
                      buyError={buyError}
                      onClearBuyResult={clearBuyResult}
                      isAuthenticated={authState === 'authenticated'}
                    />
                  </div>
                </Card>

              </div>

            </div>
          </>
        )}
      </div>

      {/* FOOTER */}
      <div className="mt-auto border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500 shrink-0">
        <Footer />
      </div>
    </main>
  );
}