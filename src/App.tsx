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
  Sun
} from 'lucide-react';
import { DHIKR_LIST as INITIAL_DHIKR_LIST, Dhikr } from './constants';

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
  const [showList, setShowList] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
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
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Progress calculations
  const step = currentDhikr?.step || currentDhikr?.target || 100;
  const progressValue = currentCount % step;
  const progressPercentage = currentCount === 0 ? 0 : (progressValue === 0 ? 100 : (progressValue / step) * 100);
  const circleRadius = 136;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circleCircumference - (progressPercentage / 100) * circleCircumference;

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
                    className="space-y-2"
                  >
                    <h2 className="text-3xl md:text-4xl font-serif arabic-text leading-relaxed">
                      {currentDhikr.text}
                    </h2>
                    {(currentDhikr.virtue || currentDhikr.hadith) && (
                      <button 
                        onClick={() => setShowVirtue(!showVirtue)}
                        className="inline-flex items-center gap-1 text-xs text-primary/60 hover:text-primary transition-colors"
                      >
                        <BookOpen size={14} />
                        <span>فضل الذكر</span>
                      </button>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              <button onClick={nextDhikr} className="p-2 rounded-full hover:bg-black/5 transition-colors">
                <ChevronLeft size={24} />
              </button>
            </div>

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
                      <button onClick={() => setShowVirtue(false)} className="text-primary/40 hover:text-primary">
                        <RotateCcw size={20} className="rotate-45" />
                      </button>
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
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {dhikrList.map((dhikr, idx) => {
                      const dhikrToday = dailyStats[todayStr]?.[dhikr.id];
                      const dhikrCount = dhikrToday?.count || 0;
                      const dhikrTime = dhikrToday?.timeSpent || 0;
                      const isSelected = idx === currentIndex;
                      const isCompleted = dhikr.target && dhikrCount >= dhikr.target;
                      
                      return (
                        <button
                          key={dhikr.id}
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
                          <h3 className={`text-xl font-serif arabic-text mb-3 ${isSelected ? 'text-secondary' : 'text-primary'}`}>
                            {dhikr.text}
                          </h3>
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
                        </button>
                      );
                    })}
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
                  <circle
                    cx="144"
                    cy="144"
                    r="136"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-primary/10"
                  />
                  <motion.circle
                    cx="144"
                    cy="144"
                    r="136"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    className="text-primary"
                    initial={{ strokeDashoffset: circleCircumference }}
                    animate={{ strokeDashoffset }}
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
                        القسم: {progressValue === 0 && currentCount > 0 ? step : progressValue} / {step}
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

        {editingId && (
          <div className="bg-surface p-4 rounded-2xl shadow-lg border border-primary/20 mb-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary/80 mb-1">نص الذكر *</label>
              <input 
                type="text" 
                value={formData.text || ''}
                onChange={e => setFormData({...formData, text: e.target.value})}
                className="w-full p-2 border border-primary/20 rounded-lg bg-secondary/50 focus:outline-none focus:border-primary font-serif arabic-text text-lg"
                dir="rtl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary/80 mb-1">الهدف (اختياري)</label>
              <input 
                type="number" 
                value={formData.target || ''}
                onChange={e => setFormData({...formData, target: parseInt(e.target.value) || undefined})}
                className="w-full p-2 border border-primary/20 rounded-lg bg-secondary/50 focus:outline-none focus:border-primary"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary/80 mb-1">القسم / التجزئة (اختياري)</label>
              <input 
                type="number" 
                value={formData.step || ''}
                onChange={e => setFormData({...formData, step: parseInt(e.target.value) || undefined})}
                className="w-full p-2 border border-primary/20 rounded-lg bg-secondary/50 focus:outline-none focus:border-primary"
                dir="ltr"
                placeholder="مثال: 33"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary/80 mb-1">الفضل (اختياري)</label>
              <input 
                type="text" 
                value={formData.virtue || ''}
                onChange={e => setFormData({...formData, virtue: e.target.value})}
                className="w-full p-2 border border-primary/20 rounded-lg bg-secondary/50 focus:outline-none focus:border-primary"
                dir="rtl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary/80 mb-1">الحديث (اختياري)</label>
              <textarea 
                value={formData.hadith || ''}
                onChange={e => setFormData({...formData, hadith: e.target.value})}
                className="w-full p-2 border border-primary/20 rounded-lg bg-secondary/50 focus:outline-none focus:border-primary min-h-[80px]"
                dir="rtl"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button 
                onClick={handleSave}
                className="flex-1 flex justify-center items-center gap-2 py-2 bg-primary text-secondary rounded-lg font-medium"
              >
                <Save size={18} /> حفظ
              </button>
              <button 
                onClick={() => setEditingId(null)}
                className="flex-1 py-2 bg-primary/10 text-primary rounded-lg font-medium"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {dhikrList.map(dhikr => (
            <div key={dhikr.id} className="bg-surface p-4 rounded-2xl shadow-sm border border-primary/10 flex justify-between items-center">
              <div className="flex-1 ml-4">
                <h3 className="text-lg font-serif arabic-text text-primary">{dhikr.text}</h3>
                {dhikr.target && <span className="text-xs text-primary/60">الهدف: {dhikr.target}</span>}
              </div>
              <div className="flex gap-2">
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
