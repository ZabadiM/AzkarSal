/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RotateCcw, 
  Timer as TimerIcon, 
  Hash, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  BookOpen,
  Menu,
  X,
  BarChart3,
  Trophy,
  Calendar,
  Clock,
  Award,
  Plus,
  Trash2,
  Edit2,
  Save,
  Moon,
  Sun,
  ArrowUp,
  ArrowDown,
  Star,
  Share2,
  Image as ImageIcon
} from 'lucide-react';
import { toBlob } from 'html-to-image';
import { DHIKR_LIST as INITIAL_DHIKR_LIST, Dhikr } from './constants';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';

type DailyStats = {
  [date: string]: {
    [dhikrId: string]: {
      count: number;
      timeSpent: number; // in seconds
    }
  }
};

const getLocalDateStr = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTodayStr = () => getLocalDateStr(new Date());

const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds} ثانية`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours} ساعة${mins > 0 ? ` و ${mins} دقيقة` : ''}`;
  }
  return `${mins} دقيقة`;
};

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function App() {
  const [view, setView] = useState<'main' | 'stats' | 'manage'>('main');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState<'counter' | 'timer'>('counter');
  const [timeLeft, setTimeLeft] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showVirtue, setShowVirtue] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [shareImageBlob, setShareImageBlob] = useState<Blob | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);
  const [showList, setShowList] = useState(false);
  const [listFilter, setListFilter] = useState<'all' | 'favorites'>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('tasbih_font_size');
    return saved ? parseInt(saved, 10) : 36;
  });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('tasbih_dark_mode');
    if (saved !== null) return JSON.parse(saved);
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  
  // Custom Dhikr List
  const [dhikrList, setDhikrList] = useState<Dhikr[]>(() => {
    try {
      const saved = localStorage.getItem('tasbih_list');
      return saved ? JSON.parse(saved) : INITIAL_DHIKR_LIST;
    } catch {
      return INITIAL_DHIKR_LIST;
    }
  });

  // Persistent Stats
  const [dailyStats, setDailyStats] = useState<DailyStats>(() => {
    try {
      const saved = localStorage.getItem('tasbih_stats');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const currentDhikr = dhikrList[currentIndex] || dhikrList[0];
  const todayStr = getTodayStr();
  const currentCount = dailyStats[todayStr]?.[currentDhikr?.id]?.count || 0;
  const currentTimeSpent = dailyStats[todayStr]?.[currentDhikr?.id]?.timeSpent || 0;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Progress calculations for counter
  const step = currentDhikr?.step || currentDhikr?.target || 100;
  const counterProgressValue = currentCount % step;
  const counterProgressPercentage = currentCount === 0 ? 0 : (counterProgressValue === 0 ? 100 : (counterProgressValue / step) * 100);
  const isCounterComplete = currentCount > 0 && counterProgressValue === 0;
  
  // Progress calculations for timer (assuming a target of 5 minutes (300 seconds) per dhikr if not specified)
  const timerTarget = 300; // 5 minutes default target
  const timerProgressPercentage = Math.min(100, (currentTimeSpent / timerTarget) * 100);
  const isTimerComplete = currentTimeSpent >= timerTarget;

  const circleRadius = 136;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const counterStrokeDashoffset = circleCircumference - (counterProgressPercentage / 100) * circleCircumference;
  const timerStrokeDashoffset = circleCircumference - (timerProgressPercentage / 100) * circleCircumference;

  // Save data to local storage
  useEffect(() => {
    localStorage.setItem('tasbih_stats', JSON.stringify(dailyStats));
  }, [dailyStats]);

  useEffect(() => {
    localStorage.setItem('tasbih_dark_mode', JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('tasbih_list', JSON.stringify(dhikrList));
  }, [dhikrList]);

  useEffect(() => {
    localStorage.setItem('tasbih_font_size', fontSize.toString());
  }, [fontSize]);

  // Ensure currentIndex is valid if list changes
  useEffect(() => {
    if (currentIndex >= dhikrList.length) {
      setCurrentIndex(Math.max(0, dhikrList.length - 1));
    }
  }, [dhikrList.length, currentIndex]);

  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Non-musical sound effect (simple beep)
  const playBeep = (type: 'click' | 'alarm') => {
    if (!soundEnabledRef.current) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      if (type === 'click') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
      } else if (type === 'alarm') {
        // Double beep for alarm
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        
        oscillator.start();
        
        // Beep 1
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime + 0.2);
        
        // Beep 2
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime + 0.4);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime + 0.6);
        
        oscillator.stop(audioCtx.currentTime + 0.6);
      }
    } catch (e) {
      // Ignore audio context errors
    }
    
    if (window.navigator.vibrate) {
      if (type === 'click') window.navigator.vibrate(10);
      else window.navigator.vibrate([200, 100, 200]);
    }
  };

  const handleIncrement = () => {
    if (!currentDhikr) return;
    const today = getTodayStr();
    setDailyStats(prev => {
      const todayStats = prev[today] || {};
      const dhikrStats = todayStats[currentDhikr.id] || { count: 0, timeSpent: 0 };
      return {
        ...prev,
        [today]: {
          ...todayStats,
          [currentDhikr.id]: {
            ...dhikrStats,
            count: dhikrStats.count + 1
          }
        }
      };
    });
    playBeep('click');
  };

  const handleReset = () => {
    if (!currentDhikr) return;
    const today = getTodayStr();
    setDailyStats(prev => {
      const todayStats = prev[today] || {};
      const dhikrStats = todayStats[currentDhikr.id] || { count: 0, timeSpent: 0 };
      return {
        ...prev,
        [today]: {
          ...todayStats,
          [currentDhikr.id]: {
            ...dhikrStats,
            count: 0
          }
        }
      };
    });
    setTimeLeft(60);
    setIsTimerRunning(false);
  };

  const nextDhikr = () => {
    if (dhikrList.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % dhikrList.length);
  };

  const prevDhikr = () => {
    if (dhikrList.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + dhikrList.length) % dhikrList.length);
  };

  const handleShareText = async () => {
    if (!currentDhikr) return;
    
    let shareText = currentDhikr.text;
    if (currentDhikr.virtue) {
      shareText += `\n\nفضل الذكر: ${currentDhikr.virtue}`;
    }
    if (currentDhikr.hadith) {
      shareText += `\n\n${currentDhikr.hadith}`;
    }
    shareText += `\n\n- تمت المشاركة عن طريق تطبيق AzkarSal`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ذكر من تطبيق AzkarSal',
          text: shareText,
        });
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        if (String(error).includes('canceled')) return;
        console.error('Error sharing:', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        alert('تم نسخ الذكر إلى الحافظة!');
      } catch (error) {
        console.error('Error copying to clipboard:', error);
      }
    }
    setShowShareMenu(false);
  };

  const handleShareImage = async () => {
    if (!shareImageBlob) {
      if (isGeneratingImage) {
        alert('جاري تجهيز الصورة، يرجى الانتظار قليلاً...');
      } else {
        alert('عذراً، حدث خطأ أثناء تجهيز الصورة');
      }
      return;
    }

    const file = new File([shareImageBlob], 'dhikr.png', { type: 'image/png' });

    let shared = false;
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: 'ذكر من تطبيق AzkarSal',
          files: [file],
        });
        shared = true;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          setShowShareMenu(false);
          return;
        }
        console.error('Share API failed:', error);
      }
    }
    
    if (!shared) {
      const url = URL.createObjectURL(shareImageBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'dhikr.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    
    setShowShareMenu(false);
  };

  useEffect(() => {
    if (showShareMenu && shareRef.current && currentDhikr) {
      const generateImage = async () => {
        setIsGeneratingImage(true);
        try {
          const watermark = shareRef.current?.querySelector('#watermark');
          if (watermark) watermark.classList.remove('hidden');

          // Small delay to ensure layout is updated
          await new Promise(resolve => setTimeout(resolve, 50));

          const blob = await toBlob(shareRef.current!, {
            backgroundColor: document.documentElement.classList.contains('dark') ? '#121212' : '#f5f5f0',
            pixelRatio: 2,
            filter: (node) => {
              // Filter out elements with data-html2canvas-ignore
              if (node instanceof HTMLElement && node.dataset.html2canvasIgnore !== undefined) {
                return false;
              }
              return true;
            }
          });
          
          if (watermark) watermark.classList.add('hidden');

          setShareImageBlob(blob);
        } catch (error) {
          console.error('Error generating image:', error);
          setShareImageBlob(null);
        } finally {
          setIsGeneratingImage(false);
        }
      };
      generateImage();
    } else if (!showShareMenu) {
      setShareImageBlob(null);
    }
  }, [showShareMenu, currentDhikr]);

  // Timer logic - ONLY counts time when timer is running
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (mode === 'timer' && isTimerRunning) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            playBeep('alarm');
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
        
        // Increment timeSpent for the current dhikr
        if (currentDhikr) {
          const today = getTodayStr();
          setDailyStats(prev => {
            const todayStats = prev[today] || {};
            const dhikrStats = todayStats[currentDhikr.id] || { count: 0, timeSpent: 0 };
            return {
              ...prev,
              [today]: {
                ...todayStats,
                [currentDhikr.id]: {
                  ...dhikrStats,
                  timeSpent: dhikrStats.timeSpent + 1
                }
              }
            };
          });
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [mode, isTimerRunning, currentDhikr?.id]);

  // --- Statistics Calculations ---
  const getStatsForPeriod = (days: number) => {
    let totalCount = 0;
    let totalTime = 0;
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = getLocalDateStr(d);
      const dayStats = dailyStats[dateStr];
      if (dayStats) {
        Object.values(dayStats).forEach(stat => {
          totalCount += stat.count;
          totalTime += stat.timeSpent;
        });
      }
    }
    return { count: totalCount, timeSpent: totalTime };
  };

  const todayStats = getStatsForPeriod(1);
  const weekStats = getStatsForPeriod(7);
  const monthStats = getStatsForPeriod(30);
  const yearStats = getStatsForPeriod(365);

  let maxCount = 0;
  let topDhikrId = '';
  const allTimeDhikrCounts: Record<string, number> = {};
  Object.values(dailyStats).forEach(day => {
    Object.entries(day).forEach(([id, stat]) => {
      allTimeDhikrCounts[id] = (allTimeDhikrCounts[id] || 0) + stat.count;
    });
  });
  Object.entries(allTimeDhikrCounts).forEach(([id, count]) => {
    if (count > maxCount) {
      maxCount = count;
      topDhikrId = id;
    }
  });
  const topDhikr = dhikrList.find(d => d.id === topDhikrId) || INITIAL_DHIKR_LIST.find(d => d.id === topDhikrId);

  // --- Render Manage View ---
  if (view === 'manage') {
    return <ManageDhikrView 
      dhikrList={dhikrList} 
      setDhikrList={setDhikrList} 
      onClose={() => setView('main')} 
    />;
  }

  // --- Render Statistics View ---
  if (view === 'stats') {
    const last7DaysData = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = getLocalDateStr(d);
      const dayStats = dailyStats[dateStr] || {};
      const totalCount = Object.values(dayStats).reduce((acc, curr) => acc + curr.count, 0);
      return {
        name: `${d.getDate()}/${d.getMonth() + 1}`,
        count: totalCount
      };
    });

    const last30DaysData = Array.from({ length: 30 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const dateStr = getLocalDateStr(d);
      const dayStats = dailyStats[dateStr] || {};
      const totalCount = Object.values(dayStats).reduce((acc, curr) => acc + curr.count, 0);
      return {
        name: `${d.getDate()}/${d.getMonth() + 1}`,
        count: totalCount
      };
    });

    return (
      <div className="min-h-screen flex flex-col items-center p-6 bg-secondary text-primary overflow-y-auto">
        <header className="w-full max-w-md flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold font-serif">إحصائيات الإنجاز</h1>
          <button onClick={() => setView('main')} className="p-2 rounded-full hover:bg-black/5 transition-colors">
            <X size={24} />
          </button>
        </header>
        
        <main className="w-full max-w-md flex flex-col gap-6 pb-8">
          <div className="bg-surface p-6 rounded-3xl shadow-sm border border-primary/10 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 text-accent/10">
              <Trophy size={120} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4 text-accent">
                <Trophy size={24} />
                <h2 className="text-lg font-bold">أكثر ذكر تم إنجازه</h2>
              </div>
              <p className="text-2xl md:text-3xl font-serif arabic-text text-primary mb-2 leading-relaxed">
                {topDhikr ? topDhikr.text : 'لا يوجد بيانات بعد'}
              </p>
              <p className="text-sm font-medium text-primary/60 bg-primary/5 inline-block px-3 py-1 rounded-full">
                مجموع التكرار: {maxCount} مرة
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <StatCard title="اليوم" stats={todayStats} icon={<Clock size={20}/>} />
            <StatCard title="هذا الأسبوع" stats={weekStats} icon={<Calendar size={20}/>} />
            <StatCard title="هذا الشهر" stats={monthStats} icon={<BarChart3 size={20}/>} />
            <StatCard title="هذا العام" stats={yearStats} icon={<Award size={20}/>} />
          </div>

          <div className="bg-surface p-6 rounded-3xl shadow-sm border border-primary/10">
            <div className="flex items-center gap-3 mb-6 text-primary">
              <BarChart3 size={20} />
              <h2 className="text-lg font-bold">نشاط آخر 7 أيام</h2>
            </div>
            <div className="h-48 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={last7DaysData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'currentColor' }} tickLine={false} axisLine={false} opacity={0.6} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    labelStyle={{ color: '#000', fontWeight: 'bold', marginBottom: '4px' }}
                    itemStyle={{ color: '#000' }}
                  />
                  <Bar dataKey="count" fill="var(--color-accent)" radius={[4, 4, 0, 0]} name="التسبيحات" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-surface p-6 rounded-3xl shadow-sm border border-primary/10">
            <div className="flex items-center gap-3 mb-6 text-primary">
              <BarChart3 size={20} />
              <h2 className="text-lg font-bold">توجه آخر 30 يوم</h2>
            </div>
            <div className="h-48 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={last30DaysData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10, fill: 'currentColor' }} 
                    tickLine={false} 
                    axisLine={false} 
                    opacity={0.6}
                    interval="preserveStartEnd"
                    minTickGap={20}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    labelStyle={{ color: '#000', fontWeight: 'bold', marginBottom: '4px' }}
                    itemStyle={{ color: '#000' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="var(--color-accent)" 
                    strokeWidth={3} 
                    dot={false}
                    activeDot={{ r: 6, fill: 'var(--color-accent)', stroke: '#fff', strokeWidth: 2 }}
                    name="التسبيحات" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- Render Main View ---
  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-6 bg-secondary text-primary overflow-hidden">
      {/* Header */}
      <header className="w-full max-w-md flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowList(true)}
            className="p-2 rounded-full hover:bg-black/5 transition-colors"
            title="قائمة الأذكار"
          >
            <Menu size={24} />
          </button>
          <button 
            onClick={() => setView('stats')}
            className="p-2 rounded-full hover:bg-black/5 transition-colors"
            title="الإحصائيات"
          >
            <BarChart3 size={24} />
          </button>
          <button 
            onClick={() => setView('manage')}
            className="p-2 rounded-full hover:bg-black/5 transition-colors"
            title="إدارة الأذكار"
          >
            <Edit2 size={20} />
          </button>
        </div>
        <div className="flex gap-2 sm:gap-4">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            title={isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <button 
            onClick={() => setMode(mode === 'counter' ? 'timer' : 'counter')}
            className="flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 hover:bg-primary hover:text-secondary transition-all"
          >
            {mode === 'counter' ? <TimerIcon size={18} /> : <Hash size={18} />}
            <span className="text-sm font-medium">{mode === 'counter' ? 'مؤقت' : 'عداد'}</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-md flex flex-col items-center justify-center gap-8">
        
        {dhikrList.length === 0 ? (
          <div className="text-center p-8 bg-surface rounded-3xl shadow-sm border border-primary/10">
            <p className="text-lg text-primary/60 mb-4">لا يوجد أذكار في القائمة</p>
            <button 
              onClick={() => setView('manage')}
              className="px-6 py-2 bg-primary text-secondary rounded-full"
            >
              إضافة ذكر جديد
            </button>
          </div>
        ) : (
          <>
            <div className="flex justify-center gap-4 w-full mb-[-1rem] z-10 relative">
              <button 
                onClick={() => setFontSize(f => Math.min(f + 4, 72))} 
                className="p-2 text-primary/40 hover:text-primary/80 transition-colors font-bold text-lg rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                title="تكبير الخط"
              >
                A+
              </button>
              <button 
                onClick={() => setFontSize(f => Math.max(f - 4, 16))} 
                className="p-2 text-primary/40 hover:text-primary/80 transition-colors font-bold text-sm rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                title="تصغير الخط"
              >
                A-
              </button>
            </div>
            {/* Dhikr Selector */}
            <div className="w-full flex items-center justify-between gap-4">
              <button onClick={prevDhikr} className="p-2 rounded-full hover:bg-black/5 transition-colors">
                <ChevronRight size={24} />
              </button>
              
              <div className="flex-1 text-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentDhikr.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-2 p-4 rounded-xl"
                    ref={shareRef}
                  >
                    <h2 
                      className="font-serif arabic-text leading-relaxed transition-all duration-300"
                      style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}
                    >
                      {currentDhikr.text}
                    </h2>
                    <div id="watermark" className="hidden mt-6 pt-4 border-t border-primary/10">
                      <p className="text-sm font-medium text-primary/60">تمت المشاركة عن طريق تطبيق AzkarSal</p>
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-2" data-html2canvas-ignore>
                      {(currentDhikr.virtue || currentDhikr.hadith) && (
                        <button 
                          onClick={() => setShowVirtue(!showVirtue)}
                          className="inline-flex items-center gap-1 text-xs text-primary/60 hover:text-primary transition-colors"
                        >
                          <BookOpen size={14} />
                          <span>فضل الذكر</span>
                        </button>
                      )}
                      <button 
                        onClick={() => setShowShareMenu(true)}
                        className="inline-flex items-center gap-1 text-xs text-primary/60 hover:text-primary transition-colors"
                      >
                        <Share2 size={14} />
                        <span>مشاركة</span>
                      </button>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              <button onClick={nextDhikr} className="p-2 rounded-full hover:bg-black/5 transition-colors">
                <ChevronLeft size={24} />
              </button>
            </div>

            {/* Share Menu Modal */}
            <AnimatePresence>
              {showShareMenu && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
                  onClick={() => setShowShareMenu(false)}
                >
                  <motion.div 
                    className="bg-surface rounded-3xl p-6 max-w-xs w-full shadow-2xl space-y-4 text-center"
                    onClick={e => e.stopPropagation()}
                  >
                    <h3 className="text-lg font-bold font-serif mb-4">خيارات المشاركة</h3>
                    <div className="flex flex-col gap-3">
                      <button 
                        onClick={handleShareText}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-colors font-medium"
                      >
                        <Share2 size={18} />
                        مشاركة كنص
                      </button>
                      <button 
                        onClick={handleShareImage}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-secondary hover:bg-primary/90 rounded-xl transition-colors font-medium"
                      >
                        <ImageIcon size={18} />
                        مشاركة كصورة
                      </button>
                    </div>
                    <button 
                      onClick={() => setShowShareMenu(false)}
                      className="mt-4 text-sm text-primary/60 hover:text-primary transition-colors"
                    >
                      إلغاء
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Virtue Modal/Overlay */}
            <AnimatePresence>
              {showVirtue && currentDhikr && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
                  onClick={() => setShowVirtue(false)}
                >
                  <motion.div 
                    className="bg-surface rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-4"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-bold font-serif">فضل هذا الذكر</h3>
                      <div className="flex items-center gap-3">
                        <button onClick={() => setShowShareMenu(true)} className="text-primary/40 hover:text-primary transition-colors" title="مشاركة">
                          <Share2 size={20} />
                        </button>
                        <button onClick={() => setShowVirtue(false)} className="text-primary/40 hover:text-primary transition-colors">
                          <RotateCcw size={20} className="rotate-45" />
                        </button>
                      </div>
                    </div>
                    {currentDhikr.virtue && (
                      <p className="text-lg text-primary font-medium leading-relaxed">
                        {currentDhikr.virtue}
                      </p>
                    )}
                    {currentDhikr.virtue && currentDhikr.hadith && (
                      <div className="h-px bg-primary/10 w-full" />
                    )}
                    {currentDhikr.hadith && (
                      <p className="text-sm text-primary/70 italic leading-relaxed">
                        {currentDhikr.hadith}
                      </p>
                    )}
                    <button 
                      onClick={() => setShowVirtue(false)}
                      className="w-full py-3 bg-primary text-secondary rounded-xl font-medium mt-4"
                    >
                      فهمت
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* List Modal/Overlay */}
            <AnimatePresence>
              {showList && (
                <motion.div 
                  initial={{ opacity: 0, x: '100%' }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: '100%' }}
                  className="fixed inset-0 z-50 flex bg-secondary/95 backdrop-blur-md flex-col"
                >
                  <div className="p-6 flex items-center justify-between border-b border-primary/10 bg-secondary">
                    <h2 className="text-2xl font-bold font-serif">قائمة الأذكار</h2>
                    <button onClick={() => setShowList(false)} className="p-2 rounded-full hover:bg-black/5">
                      <X size={24} />
                    </button>
                  </div>
                  <div className="flex p-4 pb-0 gap-2">
                    <button 
                      onClick={() => setListFilter('all')}
                      className={`flex-1 py-2 rounded-xl font-medium transition-colors ${listFilter === 'all' ? 'bg-primary text-secondary' : 'bg-primary/5 text-primary/60 hover:bg-primary/10'}`}
                    >
                      الكل
                    </button>
                    <button 
                      onClick={() => setListFilter('favorites')}
                      className={`flex-1 py-2 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${listFilter === 'favorites' ? 'bg-primary text-secondary' : 'bg-primary/5 text-primary/60 hover:bg-primary/10'}`}
                    >
                      <Star size={16} fill={listFilter === 'favorites' ? "currentColor" : "none"} /> المفضلة
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {dhikrList.map((dhikr, idx) => {
                      if (listFilter === 'favorites' && !dhikr.isFavorite) return null;
                      
                      const dhikrToday = dailyStats[todayStr]?.[dhikr.id];
                      const dhikrCount = dhikrToday?.count || 0;
                      const dhikrTime = dhikrToday?.timeSpent || 0;
                      const isSelected = idx === currentIndex;
                      const isCompleted = dhikr.target && dhikrCount >= dhikr.target;
                      
                      return (
                        <div key={dhikr.id} className="relative">
                          <button
                            onClick={() => {
                              setCurrentIndex(idx);
                              setShowList(false);
                            }}
                            className={`w-full text-right p-4 rounded-2xl border transition-all ${
                              isSelected 
                                ? 'bg-primary text-secondary border-primary shadow-lg' 
                                : 'bg-surface text-primary border-primary/10 hover:border-primary/30 shadow-sm'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <h3 className={`text-xl font-serif arabic-text ${isSelected ? 'text-secondary' : 'text-primary'}`}>
                                {dhikr.text}
                              </h3>
                              {dhikr.isFavorite && (
                                <Star size={18} className={isSelected ? 'text-yellow-300' : 'text-yellow-500'} fill="currentColor" />
                              )}
                            </div>
                            <div className={`flex flex-col gap-1 text-sm ${isSelected ? 'text-secondary/80' : 'text-primary/60'}`}>
                              <div className="flex justify-between items-center">
                                <span className="font-medium">
                                  الإنجاز: {dhikrCount} {dhikr.target ? `/ ${dhikr.target}` : ''}
                                </span>
                                {isCompleted && (
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isSelected ? 'bg-surface/20 text-secondary' : 'bg-green-500/10 text-green-600'}`}>
                                    مكتمل
                                  </span>
                                )}
                              </div>
                              <span className="text-xs opacity-80">
                                الوقت: {formatDuration(dhikrTime)}
                              </span>
                            </div>
                            <div className="mt-3 flex flex-col gap-2">
                              {/* Counter Progress Bar */}
                              <div className={`w-full h-1.5 rounded-full overflow-hidden ${isSelected ? 'bg-secondary/20' : 'bg-primary/10'}`}>
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : (isSelected ? 'bg-secondary' : 'bg-primary')}`} 
                                  style={{ width: `${Math.min(100, dhikr.target ? (dhikrCount / dhikr.target) * 100 : (dhikrCount % (dhikr.step || 100)) === 0 && dhikrCount > 0 ? 100 : ((dhikrCount % (dhikr.step || 100)) / (dhikr.step || 100)) * 100)}%` }}
                                />
                              </div>
                              {/* Timer Progress Bar */}
                              <div className={`w-full h-1.5 rounded-full overflow-hidden ${isSelected ? 'bg-secondary/20' : 'bg-primary/10'}`}>
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${dhikrTime >= 300 ? 'bg-green-500' : (isSelected ? 'bg-secondary/70' : 'bg-accent')}`} 
                                  style={{ width: `${Math.min(100, (dhikrTime / 300) * 100)}%` }}
                                />
                              </div>
                            </div>
                          </button>
                        </div>
                      );
                    })}
                    {listFilter === 'favorites' && !dhikrList.some(d => d.isFavorite) && (
                      <div className="text-center py-12 text-primary/50">
                        <Star size={48} className="mx-auto mb-4 opacity-20" />
                        <p>لا توجد أذكار مفضلة حتى الآن</p>
                        <p className="text-sm mt-2">يمكنك إضافة الأذكار للمفضلة من شاشة الإدارة</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Interaction Area */}
            <div className="relative flex flex-col items-center w-full">
              {mode === 'timer' && (
                <div className="mb-6 flex flex-col items-center w-full bg-surface p-4 rounded-3xl shadow-sm border border-primary/10">
                  <div className="text-4xl font-bold font-mono text-primary mb-3">
                    {formatTime(timeLeft)}
                  </div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setIsTimerRunning(!isTimerRunning)}
                      className="p-3 bg-primary text-secondary rounded-full shadow-md hover:scale-105 transition-transform"
                    >
                      {isTimerRunning ? <Pause size={20} /> : <Play size={20} />}
                    </button>
                    <div className="flex gap-2">
                      {[30, 60, 180, 300].map(s => (
                        <button 
                          key={s}
                          onClick={() => { setTimeLeft(s); setIsTimerRunning(false); }}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${timeLeft === s ? 'bg-primary text-secondary border-primary' : 'bg-secondary text-primary/70 border-primary/20 hover:bg-primary/10'}`}
                        >
                          {s < 60 ? `${s}ث` : `${s/60}د`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="relative w-72 h-72 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 288 288">
                  {/* Background Circle */}
                  <circle
                    cx="144"
                    cy="144"
                    r="136"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-primary/10"
                  />
                  {/* Timer Progress Circle (Inner) */}
                  <motion.circle
                    cx="144"
                    cy="144"
                    r="124"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                    strokeLinecap="round"
                    className={isTimerComplete ? "text-green-500" : "text-accent"}
                    initial={{ strokeDashoffset: 2 * Math.PI * 124 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 124 - (timerProgressPercentage / 100) * (2 * Math.PI * 124) }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    style={{ strokeDasharray: 2 * Math.PI * 124 }}
                  />
                  {/* Counter Progress Circle (Outer) */}
                  <motion.circle
                    cx="144"
                    cy="144"
                    r="136"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    className={isCounterComplete ? "text-green-500" : "text-primary"}
                    initial={{ strokeDashoffset: circleCircumference }}
                    animate={{ strokeDashoffset: counterStrokeDashoffset }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    style={{ strokeDasharray: circleCircumference }}
                  />
                </svg>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleIncrement}
                  className="w-64 h-64 rounded-full bg-surface shadow-xl flex flex-col items-center justify-center relative overflow-hidden group z-10"
                >
                  <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="text-6xl font-bold tracking-tighter text-primary">
                    {currentCount}
                  </span>
                  <div className="flex flex-col items-center mt-2">
                    <span className="text-sm text-primary/40 uppercase tracking-widest">اضغط للتسبيح</span>
                    {currentDhikr.step && currentDhikr.target && currentDhikr.step !== currentDhikr.target && (
                      <span className="text-xs text-primary/60 mt-1 font-medium bg-primary/5 px-2 py-1 rounded-full">
                        القسم: {counterProgressValue === 0 && currentCount > 0 ? step : counterProgressValue} / {step}
                      </span>
                    )}
                  </div>
                </motion.button>
              </div>
              
              <button 
                onClick={handleReset}
                className="mt-8 p-3 text-primary/40 hover:text-primary hover:rotate-180 transition-all duration-500"
                title="تصفير عداد اليوم"
              >
                <RotateCcw size={24} />
              </button>
            </div>
          </>
        )}
      </main>

      {/* Footer / Info */}
      <footer className="w-full max-w-md text-center mt-8">
        {dhikrList.length > 0 && (
          <>
            <div className="flex justify-center gap-2 mb-2">
              {dhikrList.map((_, idx) => (
                <div 
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-6 bg-primary' : 'w-1.5 bg-primary/20'}`}
                />
              ))}
            </div>
            <p className="text-[10px] text-primary/40 uppercase tracking-[0.2em]">
              {currentIndex + 1} من {dhikrList.length} أذكار
            </p>
          </>
        )}
      </footer>
    </div>
  );
}

// Helper component for Stats View
function StatCard({ title, stats, icon }: { title: string, stats: { count: number, timeSpent: number }, icon: React.ReactNode }) {
  return (
    <div className="bg-surface p-4 rounded-2xl shadow-sm border border-primary/10 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-primary/60 mb-2">
        {icon}
        <span className="font-medium">{title}</span>
      </div>
      <div className="text-2xl font-bold text-primary">
        {stats.count} <span className="text-sm font-normal text-primary/60">تسبيحة</span>
      </div>
      <div className="text-sm font-medium text-accent bg-accent/10 inline-block px-2 py-1 rounded-md self-start">
        {formatDuration(stats.timeSpent)}
      </div>
    </div>
  );
}

// --- Manage Dhikr View Component ---
function ManageDhikrView({ 
  dhikrList, 
  setDhikrList, 
  onClose 
}: { 
  dhikrList: Dhikr[], 
  setDhikrList: React.Dispatch<React.SetStateAction<Dhikr[]>>,
  onClose: () => void 
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Dhikr>>({});
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showValidationError, setShowValidationError] = useState(false);

  const handleAdd = () => {
    const newId = `custom_${Date.now()}`;
    setEditingId(newId);
    setFormData({ id: newId, text: '', virtue: '', hadith: '', target: 100 });
  };

  const handleEdit = (dhikr: Dhikr) => {
    setEditingId(dhikr.id);
    setFormData({ ...dhikr });
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      setDhikrList(prev => prev.filter(d => d.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    }
  };

  const handleSave = () => {
    if (!formData.text?.trim()) {
      setShowValidationError(true);
      return;
    }

    setDhikrList(prev => {
      const exists = prev.some(d => d.id === formData.id);
      if (exists) {
        return prev.map(d => d.id === formData.id ? formData as Dhikr : d);
      } else {
        return [...prev, formData as Dhikr];
      }
    });
    setEditingId(null);
  };

  const handleResetToDefault = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    setDhikrList(INITIAL_DHIKR_LIST);
    setShowResetConfirm(false);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setDhikrList(prev => {
      const newList = [...prev];
      [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
      return newList;
    });
  };

  const moveDown = (index: number) => {
    if (index === dhikrList.length - 1) return;
    setDhikrList(prev => {
      const newList = [...prev];
      [newList[index + 1], newList[index]] = [newList[index], newList[index + 1]];
      return newList;
    });
  };

  const toggleFavorite = (id: string) => {
    setDhikrList(prev => prev.map(d => d.id === id ? { ...d, isFavorite: !d.isFavorite } : d));
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-6 bg-secondary text-primary overflow-y-auto">
      <header className="w-full max-w-md flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold font-serif">إدارة الأذكار</h1>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 transition-colors">
          <X size={24} />
        </button>
      </header>

      <main className="w-full max-w-md flex flex-col gap-4 pb-8 relative">
        {/* Modals */}
        <AnimatePresence>
          {editingId && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-surface p-6 rounded-3xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold font-serif">{formData.id?.startsWith('custom_') ? 'إضافة ذكر جديد' : 'تعديل الذكر'}</h3>
                  <button onClick={() => setEditingId(null)} className="p-2 rounded-full hover:bg-black/5 transition-colors">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-primary/80 mb-1">نص الذكر *</label>
                    <input 
                      type="text" 
                      value={formData.text || ''}
                      onChange={e => setFormData({...formData, text: e.target.value})}
                      className="w-full p-3 border border-primary/20 rounded-xl bg-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-serif arabic-text text-lg transition-all"
                      dir="rtl"
                      placeholder="أدخل نص الذكر هنا..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary/80 mb-1">الهدف (اختياري)</label>
                      <input 
                        type="number" 
                        value={formData.target || ''}
                        onChange={e => setFormData({...formData, target: parseInt(e.target.value) || undefined})}
                        className="w-full p-3 border border-primary/20 rounded-xl bg-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        dir="ltr"
                        placeholder="مثال: 100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary/80 mb-1">القسم (اختياري)</label>
                      <input 
                        type="number" 
                        value={formData.step || ''}
                        onChange={e => setFormData({...formData, step: parseInt(e.target.value) || undefined})}
                        className="w-full p-3 border border-primary/20 rounded-xl bg-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        dir="ltr"
                        placeholder="مثال: 33"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary/80 mb-1">الفضل (اختياري)</label>
                    <input 
                      type="text" 
                      value={formData.virtue || ''}
                      onChange={e => setFormData({...formData, virtue: e.target.value})}
                      className="w-full p-3 border border-primary/20 rounded-xl bg-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                      dir="rtl"
                      placeholder="فضل هذا الذكر..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary/80 mb-1">الحديث (اختياري)</label>
                    <textarea 
                      value={formData.hadith || ''}
                      onChange={e => setFormData({...formData, hadith: e.target.value})}
                      className="w-full p-3 border border-primary/20 rounded-xl bg-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary min-h-[100px] resize-y transition-all"
                      dir="rtl"
                      placeholder="نص الحديث الشريف..."
                    />
                  </div>
                  <div className="flex gap-3 pt-4 mt-2 border-t border-primary/10">
                    <button 
                      onClick={handleSave}
                      className="flex-1 flex justify-center items-center gap-2 py-3 bg-primary text-secondary rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-md"
                    >
                      <Save size={18} /> حفظ الذكر
                    </button>
                    <button 
                      onClick={() => setEditingId(null)}
                      className="flex-1 py-3 bg-primary/5 text-primary rounded-xl font-medium hover:bg-primary/10 transition-colors"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {showResetConfirm && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="bg-surface p-6 rounded-3xl max-w-sm w-full shadow-2xl"
              >
                <h3 className="text-xl font-bold mb-4">استعادة الافتراضي</h3>
                <p className="text-primary/70 mb-6">هل أنت متأكد من استعادة القائمة الافتراضية؟ سيتم حذف جميع الأذكار المخصصة.</p>
                <div className="flex gap-3">
                  <button onClick={confirmReset} className="flex-1 bg-red-500 text-white py-3 rounded-xl font-medium">نعم، استعادة</button>
                  <button onClick={() => setShowResetConfirm(false)} className="flex-1 bg-secondary text-primary py-3 rounded-xl font-medium">إلغاء</button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {deleteConfirmId && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="bg-surface p-6 rounded-3xl max-w-sm w-full shadow-2xl"
              >
                <h3 className="text-xl font-bold mb-4">حذف الذكر</h3>
                <p className="text-primary/70 mb-6">هل أنت متأكد من حذف هذا الذكر؟</p>
                <div className="flex gap-3">
                  <button onClick={confirmDelete} className="flex-1 bg-red-500 text-white py-3 rounded-xl font-medium">نعم، حذف</button>
                  <button onClick={() => setDeleteConfirmId(null)} className="flex-1 bg-secondary text-primary py-3 rounded-xl font-medium">إلغاء</button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {showValidationError && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="bg-surface p-6 rounded-3xl max-w-sm w-full shadow-2xl text-center"
              >
                <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X size={32} />
                </div>
                <h3 className="text-xl font-bold mb-2">خطأ</h3>
                <p className="text-primary/70 mb-6">نص الذكر مطلوب، يرجى إدخاله.</p>
                <button onClick={() => setShowValidationError(false)} className="w-full bg-primary text-secondary py-3 rounded-xl font-medium">حسناً</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-between items-center mb-2">
          <button 
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-secondary rounded-xl text-sm font-medium"
          >
            <Plus size={16} /> إضافة ذكر
          </button>
          <button 
            onClick={handleResetToDefault}
            className="text-xs text-primary/60 hover:text-primary underline"
          >
            استعادة الافتراضي
          </button>
        </div>

        <div className="space-y-3">
          {dhikrList.map((dhikr, index) => (
            <div key={dhikr.id} className="bg-surface p-4 rounded-2xl shadow-sm border border-primary/10 flex justify-between items-center">
              <div className="flex flex-col gap-1 ml-2">
                <button 
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className={`p-1 rounded-md transition-colors ${index === 0 ? 'text-primary/20 cursor-not-allowed' : 'text-primary/60 hover:text-primary hover:bg-primary/5'}`}
                >
                  <ArrowUp size={16} />
                </button>
                <button 
                  onClick={() => moveDown(index)}
                  disabled={index === dhikrList.length - 1}
                  className={`p-1 rounded-md transition-colors ${index === dhikrList.length - 1 ? 'text-primary/20 cursor-not-allowed' : 'text-primary/60 hover:text-primary hover:bg-primary/5'}`}
                >
                  <ArrowDown size={16} />
                </button>
              </div>
              <div className="flex-1 ml-2">
                <h3 className="text-lg font-serif arabic-text text-primary">{dhikr.text}</h3>
                {dhikr.target && <span className="text-xs text-primary/60">الهدف: {dhikr.target}</span>}
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={() => toggleFavorite(dhikr.id)}
                  className={`p-2 rounded-lg transition-colors ${dhikr.isFavorite ? 'text-yellow-500 hover:bg-yellow-500/10' : 'text-primary/40 hover:text-primary/60 hover:bg-primary/5'}`}
                >
                  <Star size={18} fill={dhikr.isFavorite ? "currentColor" : "none"} />
                </button>
                <button 
                  onClick={() => handleEdit(dhikr)}
                  className="p-2 text-primary/60 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(dhikr.id)}
                  className="p-2 text-red-500/60 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
