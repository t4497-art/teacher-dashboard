/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Clock, Calendar, ToggleLeft, ToggleRight } from 'lucide-react';
import { formatKSTFullDate } from '../services/dateService';

interface ClockWidgetProps {
  size: 'small' | 'medium' | 'large' | 'wide';
  width?: number;
  height?: number;
}

export default function ClockWidget({ size, width, height }: ClockWidgetProps) {
  const [time, setTime] = useState(new Date());
  const [isAnalog, setIsAnalog] = useState(false);
  const [use24Hour, setUse24Hour] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  const formattedHours = use24Hour ? hours.toString().padStart(2, '0') : (hours % 12 || 12).toString();
  const formattedMinutes = minutes.toString().padStart(2, '0');
  const formattedSeconds = seconds.toString().padStart(2, '0');
  const ampm = hours >= 12 ? '오후' : '오전';

  // Analog Hands Angle math
  const secondAngle = (seconds / 60) * 360;
  const minuteAngle = ((minutes * 60 + seconds) / 3600) * 360;
  const hourAngle = (((hours % 12) * 60 + minutes) / 720) * 360;

  // Dynamically scale font size when widget is dragged / resized
  const digitalFontSize = width ? `${Math.max(18, Math.min(width / 6.2, 54))}px` : '1.875rem'; // 3xl default
  const analogSize = height ? Math.max(90, Math.min(height - 85, 140)) : 112; // 28 default is 112px

  return (
    <div className="flex flex-col h-full justify-between select-none text-slate-800 dark:text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-205 dark:border-white/10 pb-2 text-xs">
        <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-100">
          <Clock className="w-4 h-4 text-sky-500" />
          <span>시계 & 날짜</span>
        </div>
        <div className="flex items-center gap-2 no-drag">
          <button
            onClick={() => setIsAnalog(!isAnalog)}
            className="text-[10px] bg-slate-200 dark:bg-slate-850 text-slate-600 dark:text-slate-350 px-1.5 py-0.5 rounded-full hover:brightness-95 transition-all cursor-pointer font-bold"
          >
            {isAnalog ? '디지털' : '아날로그'}
          </button>
          {!isAnalog && (
            <button
              onClick={() => setUse24Hour(!use24Hour)}
              className="text-[10px] bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 px-1.5 py-0.5 rounded-full hover:brightness-95 transition-all cursor-pointer font-bold"
            >
              {use24Hour ? '12H' : '24H'}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center py-2 min-h-0">
        {isAnalog ? (
          <div 
            className="relative rounded-full border-2 border-slate-300 dark:border-slate-700 bg-white/40 dark:bg-black/30 flex items-center justify-center transition-all"
            style={{ width: `${analogSize}px`, height: `${analogSize}px` }}
          >
            {/* Center Pin */}
            <div className="w-2 h-2 rounded-full bg-slate-800 dark:bg-slate-200 z-10" />

            {/* Hour hand */}
            <div
              className="absolute bottom-1/2 left-1/2 w-1.5 origin-bottom bg-slate-800 dark:bg-slate-300 rounded-full"
              style={{
                transform: `translateX(-50%) rotate(${hourAngle}deg)`,
                width: `${Math.max(2, analogSize * 0.025)}px`,
                height: `${analogSize * 0.22}px`,
              }}
            />

            {/* Minute hand */}
            <div
              className="absolute bottom-1/2 left-1/2 w-1 origin-bottom bg-slate-600 dark:bg-slate-400 rounded-full"
              style={{
                transform: `translateX(-50%) rotate(${minuteAngle}deg)`,
                width: `${Math.max(1.5, analogSize * 0.018)}px`,
                height: `${analogSize * 0.32}px`,
              }}
            />

            {/* Second hand */}
            <div
              className="absolute bottom-1/2 left-1/2 origin-bottom bg-red-500 rounded-full"
              style={{
                transform: `translateX(-50%) rotate(${secondAngle}deg)`,
                width: `${Math.max(1, analogSize * 0.009)}px`,
                height: `${analogSize * 0.38}px`,
              }}
            />

            {/* Minimal hour markings */}
            <span className="absolute top-1 text-[10px] font-bold text-slate-400">12</span>
            <span className="absolute right-1.5 text-[10px] font-bold text-slate-400">3</span>
            <span className="absolute bottom-1 text-[10px] font-bold text-slate-400">6</span>
            <span className="absolute left-1.5 text-[10px] font-bold text-slate-400">9</span>
          </div>
        ) : (
          <div className="text-center w-full px-2">
            <div 
              style={{ fontSize: digitalFontSize }}
              className="font-mono tracking-tighter text-slate-900 dark:text-white font-bold flex items-baseline justify-center select-all shrink-0"
            >
              {!use24Hour && <span className="text-[12px] font-bold text-slate-400 mr-1.5 self-center">{ampm}</span>}
              <span>{formattedHours}</span>
              <span className="animate-pulse text-sky-500 mx-0.5">:</span>
              <span>{formattedMinutes}</span>
              <span className="animate-pulse text-sky-500 mx-0.5">:</span>
              <span className="text-sky-500">{formattedSeconds}</span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white/40 dark:bg-black/20 p-2 rounded-xl flex items-center gap-2 text-slate-700 dark:text-slate-300">
        <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
        <span className="text-xs font-semibold truncate">
          {formatKSTFullDate(time)}
        </span>
      </div>
    </div>
  );
}
