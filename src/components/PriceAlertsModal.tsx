import React, { useState, useEffect } from 'react';
import { Asset } from './AssetList';
import { formatPrice } from '@/lib/binance';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Bell,
  BellRing,
  TrendingUp,
  TrendingDown,
  Trash2,
  RotateCcw,
  Volume2,
  VolumeX,
  CheckCircle2,
  Sparkles,
  Plus,
  ArrowUpRight,
  Clock
} from 'lucide-react';

export interface PriceAlert {
  id: string;
  symbol: string;
  name: string;
  targetPrice: number;
  condition: 'above' | 'below';
  createdAtPrice: number;
  note?: string;
  status: 'active' | 'triggered';
  createdAt: string;
  triggeredAt?: string;
  triggeredPrice?: number;
}

const STORAGE_KEY_ALERTS = 'binanceph_price_alerts_v1';
const STORAGE_KEY_SOUND = 'binanceph_price_alerts_sound';

export function loadStoredAlerts(): PriceAlert[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_ALERTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredAlerts(alerts: PriceAlert[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify(alerts));
  } catch {}
}

export function loadSoundPreference(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_SOUND);
    return raw === null ? true : raw === 'true';
  } catch {
    return true;
  }
}

export function saveSoundPreference(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY_SOUND, String(enabled));
  } catch {}
}

export function getBrowserNotificationPermission(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return window.Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<'granted' | 'denied' | 'default' | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const result = await window.Notification.requestPermission();
    return result;
  } catch {
    return window.Notification.permission;
  }
}

export function playAlertChime(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    // Crisp two-note rising chime (A5 -> D6)
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.setValueAtTime(1174.66, now + 0.14);

    osc2.frequency.setValueAtTime(440, now);
    osc2.frequency.setValueAtTime(587.33, now + 0.14);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.46);
    osc2.stop(now + 0.46);
  } catch {
    // Ignore audio context restrictions
  }
}

export function triggerBrowserNotification(
  title: string,
  body: string,
  tag?: string,
  onClick?: () => void
): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (window.Notification.permission !== 'granted') {
    return false;
  }
  try {
    const notification = new window.Notification(title, {
      body,
      tag: tag || `binanceph-alert-${Date.now()}`,
      silent: false,
    });
    if (onClick) {
      notification.onclick = () => {
        window.focus();
        onClick();
        notification.close();
      };
    }
    return true;
  } catch {
    return false;
  }
}

interface PriceAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  selectedAsset: Asset;
  alerts: PriceAlert[];
  onAddAlert: (alert: PriceAlert) => void;
  onRemoveAlert: (id: string) => void;
  onRearmAlert: (id: string, currentPrice: number) => void;
  onClearTriggered: () => void;
  onSelectAsset: (asset: Asset) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onTestAlert: (asset: Asset) => void;
}

export function PriceAlertsModal({
  isOpen,
  onClose,
  assets,
  selectedAsset,
  alerts,
  onAddAlert,
  onRemoveAlert,
  onRearmAlert,
  onClearTriggered,
  onSelectAsset,
  soundEnabled,
  onToggleSound,
  onTestAlert,
}: PriceAlertsModalProps) {
  const [symbol, setSymbol] = useState<string>(selectedAsset?.symbol || 'BTC');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [targetPriceInput, setTargetPriceInput] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [listTab, setListTab] = useState<'active' | 'triggered'>('active');
  const [permission, setPermission] = useState<'granted' | 'denied' | 'default' | 'unsupported'>(
    getBrowserNotificationPermission()
  );
  const [feedback, setFeedback] = useState<string | null>(null);

  const currentAsset = assets.find((a) => a.symbol === symbol) || selectedAsset || assets[0];
  const livePrice = currentAsset?.price || 0;

  // Sync default symbol and suggested target price when modal opens or selectedAsset changes
  useEffect(() => {
    if (isOpen && selectedAsset) {
      setSymbol(selectedAsset.symbol);
      const suggested = selectedAsset.price * 1.02;
      setTargetPriceInput(
        suggested >= 100
          ? suggested.toFixed(2)
          : suggested >= 1
          ? suggested.toFixed(4)
          : suggested.toFixed(6)
      );
      setCondition('above');
      setPermission(getBrowserNotificationPermission());
      setFeedback(null);
    }
  }, [isOpen, selectedAsset]);

  const handleAssetChange = (newSymbol: string) => {
    setSymbol(newSymbol);
    const found = assets.find((a) => a.symbol === newSymbol);
    if (found) {
      const suggested = found.price * (condition === 'above' ? 1.02 : 0.98);
      setTargetPriceInput(
        suggested >= 100
          ? suggested.toFixed(2)
          : suggested >= 1
          ? suggested.toFixed(4)
          : suggested.toFixed(6)
      );
    }
  };

  const applyPercentagePreset = (pct: number) => {
    if (!livePrice) return;
    const nextPrice = livePrice * (1 + pct / 100);
    const formatted =
      nextPrice >= 100
        ? nextPrice.toFixed(2)
        : nextPrice >= 1
        ? nextPrice.toFixed(4)
        : nextPrice.toFixed(6);
    setTargetPriceInput(formatted);
    setCondition(pct >= 0 ? 'above' : 'below');
  };

  const handleRequestPermission = async () => {
    const res = await requestBrowserNotificationPermission();
    setPermission(res);
    if (res === 'granted') {
      setFeedback('Browser notifications enabled! You will receive desktop/mobile alerts.');
      triggerBrowserNotification(
        'BinancePH Price Alerts Enabled',
        'You will now receive real-time browser notifications when your crypto targets hit.'
      );
    } else if (res === 'denied') {
      setFeedback('Browser permission is blocked by your browser/iframe settings. In-app banners & audio alerts remain active.');
    }
  };

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedTarget = parseFloat(targetPriceInput);
    if (isNaN(parsedTarget) || parsedTarget <= 0) {
      setFeedback('Please enter a valid target price greater than 0.');
      return;
    }

    // Request browser notification permission automatically if still default
    if (permission === 'default') {
      requestBrowserNotificationPermission().then(setPermission);
    }

    const newAlert: PriceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      symbol: currentAsset.symbol,
      name: currentAsset.name,
      targetPrice: parsedTarget,
      condition,
      createdAtPrice: livePrice,
      note: note.trim() || undefined,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    onAddAlert(newAlert);
    setNote('');
    setListTab('active');
    setFeedback(`Alert set for ${currentAsset.symbol}/USDT ${condition === 'above' ? '≥' : '≤'} $${formatPrice(parsedTarget)}`);
    setTimeout(() => setFeedback(null), 3500);
  };

  const parsedTargetNum = parseFloat(targetPriceInput);
  const pctDiff =
    livePrice > 0 && !isNaN(parsedTargetNum) && parsedTargetNum > 0
      ? ((parsedTargetNum - livePrice) / livePrice) * 100
      : 0;

  const activeAlerts = alerts.filter((a) => a.status === 'active');
  const triggeredAlerts = alerts.filter((a) => a.status === 'triggered');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-2xl p-0 overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        {/* Top Header */}
        <div className="p-6 border-b border-zinc-800 bg-zinc-900/40 flex items-center justify-between gap-4 shrink-0">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2.5 text-zinc-100">
              <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-500">
                <BellRing className="w-5 h-5" />
              </div>
              <span>Personalized Price Alerts</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Receive real-time browser notifications & audio chimes when any Binance spot pair hits your target price.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onToggleSound}
              className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 h-8 px-2.5 text-xs"
              title={soundEnabled ? 'Sound Chime Enabled' : 'Sound Chime Muted'}
            >
              {soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-yellow-500 mr-1.5" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-zinc-500 mr-1.5" />
              )}
              <span>{soundEnabled ? 'Sound On' : 'Muted'}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onTestAlert(currentAsset)}
              className="border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 h-8 px-3 text-xs font-bold"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Test Alert
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {/* Browser Notification Permission Bar */}
          <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  permission === 'granted' ? 'bg-emerald-400' : 'bg-yellow-500 animate-pulse'
                }`}
              />
              <span className="text-zinc-300">
                {permission === 'granted'
                  ? 'Browser Push Notifications: Active · Monitoring live Binance WebSocket stream'
                  : permission === 'default'
                  ? 'Enable browser notifications to get desktop/mobile alerts even when switching tabs.'
                  : 'Browser notifications restricted by environment · Live in-app alert banners & audio chimes active.'}
              </span>
            </div>

            {permission === 'default' && (
              <Button
                type="button"
                size="sm"
                onClick={handleRequestPermission}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold h-8 px-3 text-xs shrink-0"
              >
                Enable Browser Alerts
              </Button>
            )}
          </div>

          {feedback && (
            <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          {/* Create Alert Form */}
          <form onSubmit={handleCreateAlert} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Create New Price Alert
              </span>
              <span className="text-xs font-mono text-zinc-400">
                Live {currentAsset?.symbol}/USDT:{' '}
                <strong className="text-yellow-500">${formatPrice(livePrice)}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Asset Selector */}
              <div className="sm:col-span-4 space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Asset Pair
                </label>
                <select
                  value={symbol}
                  onChange={(e) => handleAssetChange(e.target.value)}
                  className="w-full h-10 rounded-lg bg-zinc-950 border border-zinc-800 px-3 text-xs font-bold text-zinc-100 focus:outline-none focus:border-yellow-500"
                >
                  {assets.map((a) => (
                    <option key={a.symbol} value={a.symbol}>
                      {a.symbol}/USDT — ${formatPrice(a.price)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Condition Selector */}
              <div className="sm:col-span-4 space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Trigger Condition
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-zinc-950 p-1 rounded-lg border border-zinc-800 h-10">
                  <button
                    type="button"
                    onClick={() => setCondition('above')}
                    className={`rounded text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                      condition === 'above'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Above ≥</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCondition('below')}
                    className={`rounded text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                      condition === 'below'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>Below ≤</span>
                  </button>
                </div>
              </div>

              {/* Target Price Input */}
              <div className="sm:col-span-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Target Price (USDT)
                  </label>
                  <span
                    className={`text-[10px] font-mono font-bold ${
                      pctDiff >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {pctDiff >= 0 ? '+' : ''}
                    {pctDiff.toFixed(2)}%
                  </span>
                </div>
                <Input
                  type="number"
                  step="any"
                  value={targetPriceInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTargetPriceInput(val);
                    const num = parseFloat(val);
                    if (!isNaN(num) && livePrice > 0) {
                      setCondition(num >= livePrice ? 'above' : 'below');
                    }
                  }}
                  placeholder={formatPrice(livePrice)}
                  className="h-10 bg-zinc-950 border-zinc-800 font-mono text-sm text-zinc-100 focus-visible:ring-yellow-500"
                  required
                />
              </div>
            </div>

            {/* Quick Percentage Presets */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase text-zinc-500 mr-1">Quick Target:</span>
                {[-5, -2, -1, 1, 2, 5, 10].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => applyPercentagePreset(pct)}
                    className={`px-2 py-1 rounded text-[11px] font-mono font-bold border transition-colors ${
                      pct < 0
                        ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                    }`}
                  >
                    {pct > 0 ? `+${pct}%` : `${pct}%`}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => applyPercentagePreset(0)}
                  className="px-2 py-1 rounded text-[11px] font-mono font-bold border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  title="Set target to current live price to trigger immediately on next tick"
                >
                  Live Price
                </button>
              </div>
            </div>

            {/* Optional Note + Submit */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              <Input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note (e.g., Breakout entry, Take profit, Support zone)"
                className="h-10 bg-zinc-950 border-zinc-800 text-xs text-zinc-200 flex-1"
              />
              <Button
                type="submit"
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold h-10 px-5 shrink-0"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Set Price Alert
              </Button>
            </div>
          </form>

          {/* Active & Triggered Alerts List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setListTab('active')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    listTab === 'active'
                      ? 'bg-yellow-500 text-black'
                      : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900'
                  }`}
                >
                  Active Alerts ({activeAlerts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setListTab('triggered')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    listTab === 'triggered'
                      ? 'bg-yellow-500 text-black'
                      : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900'
                  }`}
                >
                  Triggered History ({triggeredAlerts.length})
                </button>
              </div>

              {listTab === 'triggered' && triggeredAlerts.length > 0 && (
                <button
                  type="button"
                  onClick={onClearTriggered}
                  className="text-xs text-zinc-400 hover:text-red-400 transition-colors"
                >
                  Clear History
                </button>
              )}
            </div>

            {listTab === 'active' ? (
              activeAlerts.length === 0 ? (
                <div className="py-10 text-center space-y-2 bg-zinc-900/30 border border-zinc-800/60 rounded-xl">
                  <Bell className="w-8 h-8 text-zinc-600 mx-auto" />
                  <p className="text-sm font-bold text-zinc-400">No active price alerts</p>
                  <p className="text-xs text-zinc-500">
                    Choose an asset and target price above to get notified the moment it hits.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeAlerts.map((alert) => {
                    const liveAsset = assets.find((a) => a.symbol === alert.symbol);
                    const currPrice = liveAsset ? liveAsset.price : alert.createdAtPrice;
                    const distancePct =
                      currPrice > 0 ? ((alert.targetPrice - currPrice) / currPrice) * 100 : 0;

                    return (
                      <div
                        key={alert.id}
                        className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 flex items-center justify-between gap-4 transition-colors"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-sm font-black text-zinc-100">
                              {alert.symbol}/USDT
                            </span>
                            <span
                              className={`text-xs font-mono font-bold ${
                                alert.condition === 'above' ? 'text-emerald-400' : 'text-red-400'
                              }`}
                            >
                              {alert.condition === 'above' ? '≥' : '≤'} ${formatPrice(alert.targetPrice)}
                            </span>
                            <span className="text-xs text-zinc-500 font-mono">
                              · Live: ${formatPrice(currPrice)} ({distancePct >= 0 ? '+' : ''}
                              {distancePct.toFixed(2)}%)
                            </span>
                          </div>
                          {alert.note && (
                            <p className="text-xs text-zinc-400 truncate">{alert.note}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {liveAsset && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                onSelectAsset(liveAsset);
                                onClose();
                              }}
                              className="h-8 px-2.5 text-xs text-zinc-400 hover:text-yellow-500"
                              title="View Chart"
                            >
                              <ArrowUpRight className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemoveAlert(alert.id)}
                            className="h-8 px-2.5 text-xs text-zinc-500 hover:text-red-400"
                            title="Delete Alert"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : triggeredAlerts.length === 0 ? (
              <div className="py-10 text-center space-y-2 bg-zinc-900/30 border border-zinc-800/60 rounded-xl">
                <Clock className="w-8 h-8 text-zinc-600 mx-auto" />
                <p className="text-sm font-bold text-zinc-400">No triggered alerts yet</p>
                <p className="text-xs text-zinc-500">
                  When an active alert reaches its target price, it will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {triggeredAlerts.map((alert) => {
                  const liveAsset = assets.find((a) => a.symbol === alert.symbol);
                  const currPrice = liveAsset ? liveAsset.price : alert.createdAtPrice;

                  return (
                    <div
                      key={alert.id}
                      className="p-3.5 rounded-xl bg-zinc-900/50 border border-yellow-500/20 flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CheckCircle2 className="w-4 h-4 text-yellow-500 shrink-0" />
                          <span className="text-sm font-black text-zinc-100">
                            {alert.symbol}/USDT
                          </span>
                          <span className="text-xs font-mono font-bold text-yellow-500">
                            Hit ${formatPrice(alert.triggeredPrice || alert.targetPrice)}
                          </span>
                          <span className="text-xs text-zinc-500 font-mono">
                            · Target {alert.condition === 'above' ? '≥' : '≤'} ${formatPrice(alert.targetPrice)}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500 flex items-center gap-2">
                          {alert.triggeredAt && (
                            <span>Triggered at {new Date(alert.triggeredAt).toLocaleTimeString()}</span>
                          )}
                          {alert.note && <span>· {alert.note}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onRearmAlert(alert.id, currPrice)}
                          className="h-8 px-2.5 text-xs border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200"
                          title="Re-activate this alert"
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1" />
                          Re-Arm
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveAlert(alert.id)}
                          className="h-8 px-2.5 text-xs text-zinc-500 hover:text-red-400"
                          title="Delete Alert"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
