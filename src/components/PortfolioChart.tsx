'use client';

import { useEffect, useRef } from 'react';

interface NavPoint {
  navDate: string;
  nav: number;
}

export default function PortfolioChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let chart: Awaited<ReturnType<typeof import('lightweight-charts')['createChart']>>;

    const initChart = async () => {
      const { createChart, ColorType, AreaSeries } = await import('lightweight-charts');

      if (!chartContainerRef.current) return;

      chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: 'rgba(255, 255, 255, 0.6)',
        },
        grid: {
          vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
          horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
        },
        width: chartContainerRef.current.clientWidth,
        height: 400,
        rightPriceScale: {
          borderColor: 'rgba(255, 255, 255, 0.1)',
        },
        timeScale: {
          borderColor: 'rgba(255, 255, 255, 0.1)',
        },
        crosshair: {
          vertLine: {
            color: 'rgba(255, 255, 255, 0.2)',
            width: 1,
            style: 2,
          },
          horzLine: {
            color: 'rgba(255, 255, 255, 0.2)',
            width: 1,
            style: 2,
          },
        },
      });

      const series = chart.addSeries(AreaSeries, {
        lineColor: '#2962FF',
        topColor: 'rgba(41, 98, 255, 0.3)',
        bottomColor: 'rgba(41, 98, 255, 0.02)',
        lineWidth: 2,
      });

      const handleResize = () => {
        if (chartContainerRef.current) {
          chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
      };

      const observer = new ResizeObserver(handleResize);
      observer.observe(chartContainerRef.current);

      try {
        const response = await fetch('/api/fund-price', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ productId: 35 }),
        });

        if (!response.ok) {
          console.error('Failed to fetch fund price data');
          return;
        }

        const result = await response.json();
        const data: NavPoint[] = result?.data ?? [];

        const mappedData = data.map((item) => ({
          time: item.navDate,
          value: item.nav,
        }));

        series.setData(mappedData);
      } catch (err) {
        console.error('Failed to fetch fund price data:', err);
      }
    };

    initChart();

    return () => {
      if (chart) chart.remove();
    };
  }, []);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="mb-4 text-lg font-semibold text-slate-100">
        Fund NAV Chart
      </h2>
      <div ref={chartContainerRef} className="w-full" style={{ height: 400 }} />
    </div>
  );
}
