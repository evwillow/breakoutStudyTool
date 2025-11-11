"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import StockChart from "../StockChart";

interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface LandingDrillPreviewProps {
  highlight?: boolean;
}

const INITIAL_TIMER = 18;
const STOCK_SYMBOL = "TSLA";
const BEFORE_PATH = "/D.json";
const AFTER_PATH = "/after.json";
const PRESET_FEEDBACK = "Sample plan tags the breakout but leaves room to tighten the stop.";

const TypedStockChart = StockChart as React.ComponentType<any>;

const toNumber = (value: any, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const pickNumber = (entry: Record<string, any>, keys: string[], fallback = 0) => {
  for (const key of keys) {
    if (entry[key] !== undefined && entry[key] !== null) {
      return toNumber(entry[key], fallback);
    }
  }
  return fallback;
};

const normalizeCandles = (data: any[]): Candle[] => {
  if (!Array.isArray(data)) return [];
  return data.map((entry, index) => {
    const close = pickNumber(entry, ["Close", "close", "Adj Close", "adjClose", "c"], index);
    return {
      date: entry.Date || entry.date || entry.timestamp || `${index}`,
      open: pickNumber(entry, ["Open", "open", "o"], close),
      high: pickNumber(entry, ["High", "high", "h"], close),
      low: pickNumber(entry, ["Low", "low", "l"], close),
      close,
      volume: pickNumber(entry, ["Volume", "volume", "v"], 0),
    };
  });
};

const formatTime = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.max(totalSeconds % 60, 0)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const LandingDrillPreview: React.FC<LandingDrillPreviewProps> = ({ highlight }) => {
  const [beforeData, setBeforeData] = useState<Candle[]>([]);
  const [afterData, setAfterData] = useState<Candle[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const [isRevealed, setIsRevealed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [zoom, setZoom] = useState(0);
  const [feedback, setFeedback] = useState<string>(PRESET_FEEDBACK);

  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setDataLoading(true);
        setDataError(null);

        const [beforeRes, afterRes] = await Promise.all([
          fetch(BEFORE_PATH),
          fetch(AFTER_PATH),
        ]);

        if (!beforeRes.ok) {
          throw new Error(`Failed to load ${BEFORE_PATH}`);
        }

        const beforeJson = await beforeRes.json();
        const afterJson = afterRes.ok ? await afterRes.json() : [];

        if (!Array.isArray(beforeJson) || beforeJson.length === 0) {
          throw new Error("Breakout dataset is empty");
        }

        if (isMounted) {
          setBeforeData(normalizeCandles(beforeJson));
          setAfterData(normalizeCandles(afterJson));
        }
      } catch (error: any) {
        if (isMounted) {
          console.error("Landing preview data error:", error);
          setDataError("Preview unavailable. Please refresh.");
          setBeforeData([]);
          setAfterData([]);
        }
      } finally {
        if (isMounted) {
          setDataLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  const targetPoint = useMemo(() => {
    if (!beforeData.length || !afterData.length) return null;
    const firstAfter = afterData[0];
    const referencePrice = firstAfter.high || firstAfter.close;
    return {
      x: beforeData.length,
      y: Number.isFinite(referencePrice) ? referencePrice : beforeData[beforeData.length - 1].close,
    };
  }, [beforeData, afterData]);

  const clearAnimation = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const clearTimers = useCallback(() => {
    clearAnimation();
  }, [clearAnimation]);

  const resetPreview = useCallback(() => {
    clearTimers();
    setIsRevealed(false);
    setProgress(0);
    setZoom(0);
    setFeedback(PRESET_FEEDBACK);
  }, [clearTimers]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  useEffect(() => {
    if (!isRevealed) {
      clearAnimation();
      return;
    }

    const duration = 1600;
    const start = performance.now();

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      const rawProgress = Math.min(1, (now - start) / duration);
      const eased = easeOutCubic(rawProgress);
      const nextValue = eased * 100;
      setProgress(nextValue);
      setZoom(nextValue);

      if (rawProgress < 1) {
        animationFrameRef.current = requestAnimationFrame(tick);
      } else {
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      clearAnimation();
    };
  }, [isRevealed, clearAnimation]);

  useEffect(() => {
    if (!isRevealed) return;

    setFeedback(PRESET_FEEDBACK);
  }, [isRevealed]);
  const handleReveal = () => {
    if (isRevealed || dataLoading || !!dataError) return;
    setProgress(0);
    setZoom(0);
    setIsRevealed(true);
  };

  const containerHighlight = highlight ? "ring-2 ring-emerald-400/80" : "";

  return (
    <div className={`relative bg-gradient-to-br from-[#091316] via-[#05090b] to-[#020708] border border-white/10 rounded-2xl shadow-[0_18px_55px_rgba(16,185,129,0.22)] overflow-hidden transition ${containerHighlight}`}>
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.05),rgba(9,13,16,0.9))]" />
      </div>

      <div className="relative px-5 sm:px-6 pt-4 pb-4 flex flex-col gap-4">
        <div className="text-xs text-white/65 font-medium tracking-[0.32em] uppercase">
          <span>Breakout drill demo</span>
        </div>

        <div className="rounded-xl border border-white/12 bg-black/45 backdrop-blur-sm overflow-hidden w-full">
          <div className="px-4 py-2 flex items-center justify-between text-xs uppercase tracking-[0.32em] text-white/45 border-b border-white/12 bg-black/45">
            <span>{STOCK_SYMBOL}</span>
            <span>Historical replay</span>
          </div>
          <div className="relative w-full select-none aspect-square bg-black/45" style={{ touchAction: 'pan-y' }}>
            {dataError ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white/70 text-sm text-center px-6">
                {dataError}
              </div>
            ) : (
              <div className="absolute inset-0 pointer-events-none">
                <TypedStockChart
                  data={beforeData}
                  afterData={afterData}
                  showAfterAnimation={isRevealed}
                  progressPercentage={progress}
                  zoomPercentage={zoom}
                  isInDelayPhase={false}
                  afterAnimationComplete={progress >= 100}
                  showSMA={false}
                  tightPadding
                  disabled
                  chartType="default"
                />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3 text-white/80 text-sm">
          <div className="bg-white/6 border border-white/12 rounded-xl px-5 py-3.5 text-white">
            <div className="text-[11px] uppercase tracking-[0.32em] text-white/55">
              <span>Plan & feedback</span>
            </div>
            <p className="mt-2 text-sm text-white/80 leading-relaxed">
              Map the trade, watch the future unfold, and get instant breakout feedback the moment the chart opens.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            onClick={resetPreview}
            type="button"
            className="px-5 py-[10px] rounded-md border border-white/12 text-xs uppercase tracking-[0.3em] text-white/65 hover:text-white/85 hover:border-white/20 transition"
            disabled={dataLoading}
          >
            Reset preview
          </button>
          <button
            type="button"
            onClick={handleReveal}
            disabled={isRevealed || dataLoading || !!dataError}
            className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-gradient-to-r from-white/10 via-white/14 to-white/10 border border-white/20 text-white font-semibold text-sm uppercase tracking-[0.35em] shadow-[0_12px_30px_rgba(16,185,129,0.28)] hover:shadow-[0_14px_40px_rgba(16,185,129,0.34)] transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Reveal outcome
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingDrillPreview;


