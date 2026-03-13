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
  ImageIcon,
  Search,
  FastForward
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

const normalizeArabic = (text: string) => {
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '') // Remove Tashkeel
    .replace(/[أإآ]/g, 'ا') // Normalize Alef
    .replace(/ة/g, 'ه') // Normalize Taa Marbuta
    .replace(/ى/g, 'ي'); // Normalize Alef Maksura
};

let sharedAudioCtx: AudioContext | null = null;
const getAudioContext = () => {
  if (!sharedAudioCtx) {
    sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
};

export default function App() {
  const [view, setView] = useState<'main' | 'stats' | 'manage'>('main');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState<'counter' | 'timer'>('counter');
  const [timeLeft, setTimeLeft] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showVirtue, setShowVirtue] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showSoundSettings, setShowSoundSettings] = useState(false);
  const [shareImageBlob, setShareImageBlob] = useState<Blob | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);
  const [showList, setShowList] = useState(false);
  const [listFilter, setListFilter] = useState<'all' | 'favorites'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('tasbih_sound_enabled');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [alertEnabled, setAlertEnabled] = useState(() => {
    const saved = localStorage.getItem('tasbih_alert_enabled');
    return saved !== null ? JSON.parse(saved) : true;
  });
  
  const [customTimerInput, setCustomTimerInput] = useState('');
  const [initialTimeLeft, setInitialTimeLeft] = useState(60);
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('tasbih_font_size');
    return saved ? parseInt(saved, 10) : 36;
  });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('tasbih_dark_mode');
    if (saved !== null) return JSON.parse(saved);
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [autoAdvance, setAutoAdvance] = useState(() => {
    const saved = localStorage.getItem('tasbih_auto_advance');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Handle back button on mobile using history state
  useEffect(() => {
    // Initialize state if not present
    if (!window.history.state) {
      window.history.replaceState({ view: 'main', modal: null }, '');
    }

    const handlePopState = (e: PopStateEvent) => {
      const state = e.state;
      if (state) {
        setView(state.view || 'main');
        setShowList(state.modal === 'list');
        setShowVirtue(state.modal === 'virtue');
        setShowShareMenu(state.modal === 'share');
        setShowSoundSettings(state.modal === 'sound');
      } else {
        setView('main');
        setShowList(false);
        setShowVirtue(false);
        setShowShareMenu(false);
        setShowSoundSettings(false);
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const changeView = (newView: 'main' | 'stats' | 'manage') => {
    if (newView === view) return;
    
    if (newView === 'main') {
      // If going to main, we can just push state or replace
      window.history.pushState({ view: 'main', modal: null }, '');
    } else {
      if (view === 'main') {
        window.history.pushState({ view: newView, modal: null }, '');
      } else {
        window.history.replaceState({ view: newView, modal: null }, '');
      }
    }
    setView(newView);
  };

  const openModal = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    let modalName = 'modal';
    if (setter === setShowList) modalName = 'list';
    if (setter === setShowVirtue) modalName = 'virtue';
    if (setter === setShowShareMenu) modalName = 'share';
    if (setter as any === setShowSoundSettings) modalName = 'sound';
    
    window.history.pushState({ view: view, modal: modalName }, '');
    setter(true);
  };

  const closeOverlay = () => {
    // We just go back in history, which will trigger popstate and close the modal
    window.history.back();
  };
  
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
  const target = currentDhikr?.target || 100;
  const step = currentDhikr?.step || target;
  
  let counterProgressPercentage;
  let isCounterComplete;
  const counterProgressValue = currentCount % step;

  if (currentCount >= target) {
    counterProgressPercentage = 100;
    isCounterComplete = true;
  } else {
    counterProgressPercentage = currentCount === 0 ? 0 : (counterProgressValue === 0 ? 100 : (counterProgressValue / step) * 100);
    isCounterComplete = currentCount > 0 && counterProgressValue === 0;
  }
  
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

  useEffect(() => {
    localStorage.setItem('tasbih_auto_advance', JSON.stringify(autoAdvance));
  }, [autoAdvance]);

  useEffect(() => {
    localStorage.setItem('tasbih_sound_enabled', JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('tasbih_alert_enabled', JSON.stringify(alertEnabled));
  }, [alertEnabled]);

  const prevCountRef = useRef(currentCount);
  const prevTimeRef = useRef(currentTimeSpent);
  const prevDhikrIdRef = useRef(currentDhikr?.id);
  const prevTimerDhikrIdRef = useRef(currentDhikr?.id);

  useEffect(() => {
    if (autoAdvance && mode === 'counter') {
      if (currentCount > 0 && currentCount !== prevCountRef.current && currentDhikr?.id === prevDhikrIdRef.current) {
        const target = currentDhikr?.target || 100;
        if (currentCount % target === 0) {
          const timeout = setTimeout(() => {
            setCurrentIndex((prev) => (prev + 1) % dhikrList.length);
          }, 1000);
          return () => clearTimeout(timeout);
        }
      }
    }
    prevCountRef.current = currentCount;
    prevDhikrIdRef.current = currentDhikr?.id;
  }, [currentCount, autoAdvance, mode, currentDhikr, dhikrList.length]);

  useEffect(() => {
    if (autoAdvance && mode === 'timer') {
      if (currentTimeSpent > 0 && currentTimeSpent !== prevTimeRef.current && currentDhikr?.id === prevTimerDhikrIdRef.current) {
        // Auto-advance in timer mode is handled by the interval when timeLeft reaches 0
      }
    }
    prevTimeRef.current = currentTimeSpent;
    prevTimerDhikrIdRef.current = currentDhikr?.id;
  }, [currentTimeSpent, autoAdvance, mode, currentDhikr, dhikrList.length]);

  // Ensure currentIndex is valid if list changes
  useEffect(() => {
    if (currentIndex >= dhikrList.length) {
      setCurrentIndex(Math.max(0, dhikrList.length - 1));
    }
  }, [dhikrList.length, currentIndex]);

  const soundEnabledRef = useRef(soundEnabled);
  const alertEnabledRef = useRef(alertEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
    alertEnabledRef.current = alertEnabled;
  }, [soundEnabled, alertEnabled]);

  // Non-musical sound effect (simple beep)
  const playBeep = (type: 'click' | 'alarm' | 'approaching') => {
    if (type === 'click' && !soundEnabledRef.current) return;
    if (type === 'approaching' && !alertEnabledRef.current) return;
    if (type === 'alarm' && !soundEnabledRef.current && !alertEnabledRef.current) return;

    try {
      const audioCtx = getAudioContext();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      const now = audioCtx.currentTime;
      
      if (type === 'click') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, now);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.setTargetAtTime(0, now, 0.03);
        oscillator.start(now);
        oscillator.stop(now + 0.2);
      } else if (type === 'approaching') {
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(880, now);
        gainNode.gain.setValueAtTime(0, now);
        
        oscillator.start(now);
        
        gainNode.gain.linearRampToValueAtTime(0.05, now + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.05);
        
        gainNode.gain.setValueAtTime(0, now + 0.1);
        gainNode.gain.linearRampToValueAtTime(0.05, now + 0.11);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.15);
        
        oscillator.stop(now + 0.2);
      } else if (type === 'alarm') {
        // Double beep for alarm
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(600, now);
        
        oscillator.start(now);
        
        // Beep 1
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.2, now + 0.02);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.2);
        
        // Beep 2
        gainNode.gain.setValueAtTime(0, now + 0.4);
        gainNode.gain.linearRampToValueAtTime(0.2, now + 0.42);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.6);
        
        oscillator.stop(now + 0.65);
      }
    } catch (e) {
      // Ignore audio context errors
    }
    
    try {
      const vibrate = navigator.vibrate || (navigator as any).webkitVibrate || (navigator as any).mozVibrate || (navigator as any).msVibrate;
      if (vibrate) {
        if (type === 'click' && soundEnabledRef.current) {
          vibrate.call(navigator, 30);
        } else if (type === 'approaching' && alertEnabledRef.current) {
          vibrate.call(navigator, [100, 50, 100]);
        } else if (type === 'alarm') {
          vibrate.call(navigator, [300, 100, 300]);
        }
      }
    } catch (e) {
      console.error('Vibration error:', e);
    }
  };

  const handleIncrement = () => {
    if (!currentDhikr) return;
    const today = getTodayStr();
    
    const newCount = currentCount + 1;
    const target = currentDhikr.target || 100;
    const remaining = target - newCount;
    
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
    
    if (remaining >= 0 && remaining <= 2) {
      playBeep('approaching');
    } else {
      playBeep('click');
    }
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
    closeOverlay();
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
          closeOverlay();
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
    
    closeOverlay();
  };

  useEffect(() => {
    if (showShareMenu && shareRef.current && currentDhikr) {
      const generateImage = async () => {
        setIsGeneratingImage(true);
        try {
          const watermark = shareRef.current?.querySelector('#watermark');
          const shareDetails = shareRef.current?.querySelector('#share-details');
          if (watermark) watermark.classList.remove('hidden');
          if (shareDetails) shareDetails.classList.remove('hidden');

          // Temporarily fix width to ensure a good aspect ratio for sharing
          const originalWidth = shareRef.current.style.width;
          const originalMaxWidth = shareRef.current.style.maxWidth;
          const originalPadding = shareRef.current.style.padding;
          
          shareRef.current.style.width = '600px';
          shareRef.current.style.maxWidth = 'none';
          shareRef.current.style.padding = '40px';

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
          
          // Restore original styles
          shareRef.current.style.width = originalWidth;
          shareRef.current.style.maxWidth = originalMaxWidth;
          shareRef.current.style.padding = originalPadding;

          if (watermark) watermark.classList.add('hidden');
          if (shareDetails) shareDetails.classList.add('hidden');

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
            if (autoAdvance) {
              setTimeout(() => {
                setCurrentIndex((idx) => (idx + 1) % dhikrList.length);
                setTimeLeft(initialTimeLeft);
                setIsTimerRunning(true);
              }, 1000);
            }
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
  }, [mode, isTimerRunning, currentDhikr?.id, autoAdvance, dhikrList.length, initialTimeLeft]);

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
        Object.values(dayStats).forEach((stat: any) => {
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
  let maxTime = 0;
  let topDhikrIdByCount = '';
  let topDhikrIdByTime = '';
  const allTimeDhikrCounts: Record<string, number> = {};
  const allTimeDhikrTimes: Record<string, number> = {};
  
  Object.values(dailyStats).forEach(day => {
    Object.entries(day).forEach(([id, stat]: [string, any]) => {
      allTimeDhikrCounts[id] = (allTimeDhikrCounts[id] || 0) + stat.count;
      allTimeDhikrTimes[id] = (allTimeDhikrTimes[id] || 0) + stat.timeSpent;
    });
  });
  
  Object.entries(allTimeDhikrCounts).forEach(([id, count]) => {
    if (count > maxCount) {
      maxCount = count;
      topDhikrIdByCount = id;
    }
  });
  
  Object.entries(allTimeDhikrTimes).forEach(([id, time]) => {
    if (time > maxTime) {
      maxTime = time;
      topDhikrIdByTime = id;
    }
  });
  
  const topDhikrByCount = dhikrList.find(d => d.id === topDhikrIdByCount) || INITIAL_DHIKR_LIST.find(d => d.id === topDhikrIdByCount);
  const topDhikrByTime = dhikrList.find(d => d.id === topDhikrIdByTime) || INITIAL_DHIKR_LIST.find(d => d.id === topDhikrIdByTime);

  // --- Render Manage View ---
  if (view === 'manage') {
    return <ManageDhikrView 
      dhikrList={dhikrList} 
      setDhikrList={setDhikrList} 
      onClose={closeOverlay} 
    />;
  }

  // --- Render Statistics View ---
  if (view === 'stats') {
    const last7DaysData = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = getLocalDateStr(d);
      const dayStats = dailyStats[dateStr] || {};
      const totalCount = Object.values(dayStats).reduce((acc: number, curr: any) => acc + Number(curr.count), 0);
      const totalTime = Object.values(dayStats).reduce((acc: number, curr: any) => acc + Number(curr.timeSpent), 0);
      return {
        name: `${d.getDate()}/${d.getMonth() + 1}`,
        count: totalCount,
        time: Math.round(Number(totalTime) / 60) // in minutes for chart
      };
    });

    const last30DaysData = Array.from({ length: 30 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const dateStr = getLocalDateStr(d);
      const dayStats = dailyStats[dateStr] || {};
      const totalCount = Object.values(dayStats).reduce((acc: number, curr: any) => acc + Number(curr.count), 0);
      const totalTime = Object.values(dayStats).reduce((acc: number, curr: any) => acc + Number(curr.timeSpent), 0);
      return {
        name: `${d.getDate()}/${d.getMonth() + 1}`,
        count: totalCount,
        time: Math.round(Number(totalTime) / 60) // in minutes for chart
      };
    });

    return (
      <div className="min-h-screen flex flex-col items-center p-6 bg-secondary text-primary overflow-y-auto relative">
        {/* Background Decoration */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-accent/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-3xl pointer-events-none" />

        <header className="w-full max-w-md flex justify-between items-center mb-6 z-10 glass-panel px-6 py-4 rounded-2xl">
          <h1 className="text-2xl font-bold font-serif">إحصائيات الإنجاز</h1>
          <button onClick={closeOverlay} className="p-2 rounded-full hover:bg-primary/10 transition-colors">
            <X size={24} />
          </button>
        </header>

        <main className="w-full max-w-md flex flex-col gap-6 pb-8 z-10">
          <div className="glass-panel p-6 rounded-3xl relative overflow-hidden bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
            <div className="absolute -left-4 -top-4 text-accent/10 transform -scale-x-100">
              <Trophy size={140} />
            </div>
            <div className="relative z-10 flex flex-col gap-6">
              <div>
                <div className="flex items-center gap-3 mb-4 text-accent">
                  <div className="p-2 bg-accent/10 rounded-xl">
                    <Trophy size={20} />
                  </div>
                  <h2 className="text-lg font-bold">أكثر ذكر تكراراً</h2>
                </div>
                <p className="text-2xl md:text-3xl font-serif arabic-text text-primary mb-4 leading-relaxed">
                  {topDhikrByCount ? topDhikrByCount.text : 'لا يوجد بيانات بعد'}
                </p>
                <div className="inline-flex items-center gap-2 bg-primary/5 px-4 py-2 rounded-xl border border-primary/10">
                  <Award size={16} className="text-accent" />
                  <span className="text-sm font-bold text-primary/80">
                    مجموع التكرار: <span className="text-primary">{maxCount}</span> مرة
                  </span>
                </div>
              </div>
              
              <div className="h-px w-full bg-primary/10"></div>
              
              <div>
                <div className="flex items-center gap-3 mb-4 text-blue-500">
                  <div className="p-2 bg-blue-500/10 rounded-xl">
                    <Clock size={20} />
                  </div>
                  <h2 className="text-lg font-bold">أكثر ذكر وقتاً</h2>
                </div>
                <p className="text-2xl md:text-3xl font-serif arabic-text text-primary mb-4 leading-relaxed">
                  {topDhikrByTime ? topDhikrByTime.text : 'لا يوجد بيانات بعد'}
                </p>
                <div className="inline-flex items-center gap-2 bg-primary/5 px-4 py-2 rounded-xl border border-primary/10">
                  <Clock size={16} className="text-blue-500" />
                  <span className="text-sm font-bold text-primary/80">
                    مجموع الوقت: <span className="text-primary">{formatDuration(maxTime)}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <StatCard title="اليوم" stats={todayStats} icon={<Clock size={20} className="text-blue-500" />} />
            <StatCard title="هذا الأسبوع" stats={weekStats} icon={<Calendar size={20} className="text-green-500" />} />
            <StatCard title="هذا الشهر" stats={monthStats} icon={<BarChart3 size={20} className="text-purple-500" />} />
            <StatCard title="هذا العام" stats={yearStats} icon={<Award size={20} className="text-orange-500" />} />
          </div>

          <div className="glass-panel p-6 rounded-3xl">
            <div className="flex items-center gap-3 mb-6 text-primary">
              <BarChart3 size={20} />
              <h2 className="text-lg font-bold">نشاط آخر 7 أيام</h2>
            </div>
            <div className="h-48 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={last7DaysData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'currentColor' }} tickLine={false} axisLine={false} opacity={0.6} />
                  <Tooltip 
                    cursor={{ fill: 'var(--color-primary)', opacity: 0.05 }}
                    contentStyle={{ borderRadius: '16px', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', backgroundColor: 'var(--color-surface)' }}
                    labelStyle={{ color: 'var(--color-primary)', fontWeight: 'bold', marginBottom: '4px' }}
                    itemStyle={{ color: 'var(--color-primary)' }}
                  />
                  <Bar dataKey="count" fill="var(--color-accent)" radius={[6, 6, 0, 0]} name="التسبيحات" />
                  <Bar dataKey="time" fill="#3b82f6" radius={[6, 6, 0, 0]} name="الدقائق" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl">
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
                    cursor={{ stroke: 'var(--color-primary)', strokeWidth: 1, opacity: 0.2, strokeDasharray: '3 3' }}
                    contentStyle={{ borderRadius: '16px', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', backgroundColor: 'var(--color-surface)' }}
                    labelStyle={{ color: 'var(--color-primary)', fontWeight: 'bold', marginBottom: '4px' }}
                    itemStyle={{ color: 'var(--color-primary)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="var(--color-accent)" 
                    strokeWidth={3} 
                    dot={false}
                    activeDot={{ r: 6, fill: 'var(--color-accent)', stroke: 'var(--color-surface)', strokeWidth: 2 }}
                    name="التسبيحات" 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="time" 
                    stroke="#3b82f6" 
                    strokeWidth={3} 
                    dot={false}
                    activeDot={{ r: 6, fill: '#3b82f6', stroke: 'var(--color-surface)', strokeWidth: 2 }}
                    name="الدقائق" 
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
    <div className="min-h-screen flex flex-col items-center justify-between p-6 bg-secondary text-primary overflow-hidden relative">
      {/* Background Decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-accent/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-md flex justify-between items-center mb-4 z-10 glass-panel px-4 py-3 rounded-2xl">
        <div className="flex items-center gap-1">
          <button 
            onClick={() => openModal(setShowList)}
            className="p-2.5 rounded-xl hover:bg-primary/10 transition-colors"
            title="قائمة الأذكار"
          >
            <Menu size={22} />
          </button>
          <button 
            onClick={() => changeView('stats')}
            className="p-2.5 rounded-xl hover:bg-primary/10 transition-colors"
            title="الإحصائيات"
          >
            <BarChart3 size={22} />
          </button>
          <button 
            onClick={() => changeView('manage')}
            className="p-2.5 rounded-xl hover:bg-primary/10 transition-colors"
            title="إدارة الأذكار"
          >
            <Edit2 size={20} />
          </button>
        </div>
        <div className="flex gap-1 sm:gap-2">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2.5 rounded-xl hover:bg-primary/10 transition-colors"
            title={isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button 
            onClick={() => openModal(setShowSoundSettings)}
            className="p-2.5 rounded-xl hover:bg-primary/10 transition-colors"
            title="إعدادات الصوت"
          >
            {soundEnabled || alertEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <button 
            onClick={() => setMode(mode === 'counter' ? 'timer' : 'counter')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-secondary hover:bg-primary/90 transition-all shadow-sm"
          >
            {mode === 'counter' ? <TimerIcon size={18} /> : <Hash size={18} />}
            <span className="text-sm font-medium">{mode === 'counter' ? 'مؤقت' : 'عداد'}</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-md flex flex-col items-center justify-center gap-8 z-10">
        
        {dhikrList.length === 0 ? (
          <div className="text-center p-8 glass-panel rounded-3xl w-full">
            <p className="text-lg text-primary/60 mb-4">لا يوجد أذكار في القائمة</p>
            <button 
              onClick={() => changeView('manage')}
              className="px-6 py-3 bg-primary text-secondary rounded-xl font-medium shadow-md hover:scale-105 transition-transform"
            >
              إضافة ذكر جديد
            </button>
          </div>
        ) : (
          <>
            <div className="flex justify-center gap-2 w-full mb-[-1.5rem] z-20 relative px-4">
              <button 
                onClick={() => setFontSize(f => Math.min(f + 4, 72))} 
                className="w-10 h-10 flex items-center justify-center text-primary/60 hover:text-primary transition-colors font-bold text-lg rounded-full glass-panel hover:bg-primary/5 shrink-0"
                title="تكبير الخط"
              >
                A+
              </button>
              <button 
                onClick={() => setAutoAdvance(!autoAdvance)}
                className={`px-4 h-10 flex items-center justify-center rounded-full glass-panel transition-colors text-sm font-bold ${autoAdvance ? 'bg-primary/10 text-primary border-primary/20' : 'text-primary/60 hover:text-primary hover:bg-primary/5'}`}
                title={autoAdvance ? 'إيقاف الانتقال التلقائي' : 'تفعيل الانتقال التلقائي'}
              >
                الانتقال التلقائي
              </button>
              <button 
                onClick={() => setFontSize(f => Math.max(f - 4, 16))} 
                className="w-10 h-10 flex items-center justify-center text-primary/60 hover:text-primary transition-colors font-bold text-sm rounded-full glass-panel hover:bg-primary/5 shrink-0"
                title="تصغير الخط"
              >
                A-
              </button>
            </div>
            {/* Dhikr Selector */}
            <div className="w-full flex items-center justify-between gap-4">
              <button onClick={prevDhikr} className="p-3 rounded-2xl glass-panel hover:bg-primary/5 transition-colors">
                <ChevronRight size={24} />
              </button>
              
              <div className="flex-1 text-center relative">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentDhikr.id}
                    initial={{ opacity: 0, y: 15, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -15, scale: 0.98 }}
                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                    className="space-y-4 py-6"
                    ref={shareRef}
                  >
                    <h2 
                      className="font-serif arabic-text leading-relaxed transition-all duration-300 text-primary"
                      style={{ fontSize: `${fontSize}px`, lineHeight: 1.7 }}
                    >
                      {currentDhikr.text}
                    </h2>
                    <div id="share-details" className="hidden mt-6 text-right space-y-4 border-t border-primary/10 pt-4">
                      {currentDhikr.virtue && (
                        <div>
                          <h4 className="text-sm font-bold text-primary/80 mb-1">الفضل:</h4>
                          <p className="text-sm text-primary/70">{currentDhikr.virtue}</p>
                        </div>
                      )}
                      {currentDhikr.hadith && (
                        <div>
                          <h4 className="text-sm font-bold text-primary/80 mb-1">الحديث:</h4>
                          <p className="text-sm text-primary/70">{currentDhikr.hadith}</p>
                        </div>
                      )}
                    </div>
                    <div id="watermark" className="hidden mt-6 pt-4 border-t border-primary/10">
                      <p className="text-sm font-medium text-primary/60">تمت المشاركة عن طريق تطبيق AzkarSal</p>
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-primary/5" data-html2canvas-ignore>
                      {(currentDhikr.virtue || currentDhikr.hadith) && (
                        <button 
                          onClick={() => {
                            if (!showVirtue) openModal(setShowVirtue);
                            else closeOverlay();
                          }}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary/60 hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/5"
                        >
                          <BookOpen size={16} />
                          <span>فضل الذكر</span>
                        </button>
                      )}
                      <button 
                        onClick={() => openModal(setShowShareMenu)}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary/60 hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/5"
                      >
                        <Share2 size={16} />
                        <span>مشاركة</span>
                      </button>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              <button onClick={nextDhikr} className="p-3 rounded-2xl glass-panel hover:bg-primary/5 transition-colors">
                <ChevronLeft size={24} />
              </button>
            </div>

            {/* Share Menu Modal */}
            <AnimatePresence>
              {showShareMenu && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-md"
                  onClick={closeOverlay}
                >
                  <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="glass-panel rounded-3xl p-6 max-w-xs w-full shadow-2xl space-y-4 text-center"
                    onClick={e => e.stopPropagation()}
                  >
                    <h3 className="text-xl font-bold font-serif mb-4">خيارات المشاركة</h3>
                    <div className="flex flex-col gap-3">
                      <button 
                        onClick={handleShareText}
                        className="flex items-center justify-center gap-2 w-full py-3.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-colors font-medium"
                      >
                        <Share2 size={18} />
                        مشاركة كنص
                      </button>
                      <button 
                        onClick={handleShareImage}
                        className="flex items-center justify-center gap-2 w-full py-3.5 bg-primary text-secondary hover:bg-primary/90 rounded-xl transition-colors font-medium shadow-md"
                      >
                        <ImageIcon size={18} />
                        مشاركة كصورة
                      </button>
                    </div>
                    <button 
                      onClick={closeOverlay}
                      className="mt-4 text-sm font-medium text-primary/60 hover:text-primary transition-colors px-4 py-2 rounded-lg hover:bg-primary/5"
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
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-md"
                  onClick={closeOverlay}
                >
                  <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="glass-panel rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-5"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="text-2xl font-bold font-serif text-primary">فضل هذا الذكر</h3>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openModal(setShowShareMenu)} className="p-2 rounded-full hover:bg-primary/10 text-primary/60 hover:text-primary transition-colors" title="مشاركة">
                          <Share2 size={20} />
                        </button>
                        <button onClick={closeOverlay} className="p-2 rounded-full hover:bg-primary/10 text-primary/60 hover:text-primary transition-colors">
                          <X size={20} />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
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
                    </div>
                    <button 
                      onClick={closeOverlay}
                      className="w-full py-3.5 bg-primary text-secondary rounded-xl font-medium mt-2 shadow-md hover:bg-primary/90 transition-colors"
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
                  <div className="p-6 flex items-center justify-between border-b border-primary/10 bg-secondary/80 backdrop-blur-sm sticky top-0 z-10">
                    <h2 className="text-2xl font-bold font-serif">قائمة الأذكار</h2>
                    <button onClick={closeOverlay} className="p-2 rounded-full hover:bg-primary/10 transition-colors">
                      <X size={24} />
                    </button>
                  </div>
                  <div className="p-4 pb-0 flex flex-col gap-3">
                    <div className="relative">
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-primary/40">
                        <Search size={18} />
                      </div>
                      <input 
                        type="text" 
                        placeholder="ابحث عن ذكر..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-primary/5 border border-primary/10 rounded-xl py-2.5 pr-10 pl-4 text-sm focus:outline-none focus:border-primary/30 focus:bg-primary/10 transition-colors text-primary placeholder:text-primary/40"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setListFilter('all')}
                        className={`flex-1 py-2.5 rounded-xl font-medium transition-all ${listFilter === 'all' ? 'bg-primary text-secondary shadow-md' : 'bg-primary/5 text-primary/60 hover:bg-primary/10 hover:text-primary'}`}
                      >
                        الكل
                      </button>
                      <button 
                        onClick={() => setListFilter('favorites')}
                        className={`flex-1 py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${listFilter === 'favorites' ? 'bg-primary text-secondary shadow-md' : 'bg-primary/5 text-primary/60 hover:bg-primary/10 hover:text-primary'}`}
                      >
                        <Star size={16} fill={listFilter === 'favorites' ? "currentColor" : "none"} /> المفضلة
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {dhikrList.map((dhikr, idx) => {
                      if (listFilter === 'favorites' && !dhikr.isFavorite) return null;
                      if (searchTerm && !normalizeArabic(dhikr.text).includes(normalizeArabic(searchTerm))) return null;
                      
                      const dhikrToday = dailyStats[todayStr]?.[dhikr.id];
                      const dhikrCount = dhikrToday?.count || 0;
                      const dhikrTime = dhikrToday?.timeSpent || 0;
                      const isSelected = idx === currentIndex;
                      const isCompleted = dhikr.target && dhikrCount >= dhikr.target;
                      
                      const counterProgress = Math.min(100, dhikr.target ? (dhikrCount / dhikr.target) * 100 : (dhikrCount % (dhikr.step || 100)) === 0 && dhikrCount > 0 ? 100 : ((dhikrCount % (dhikr.step || 100)) / (dhikr.step || 100)) * 100);
                      const timerProgress = Math.min(100, (dhikrTime / 300) * 100);

                      return (
                        <div key={dhikr.id} className="relative">
                          <button
                            onClick={() => {
                              setCurrentIndex(idx);
                              closeOverlay();
                            }}
                            className={`w-full text-right p-5 rounded-2xl border transition-all duration-300 ${
                              isSelected 
                                ? 'bg-primary text-secondary border-primary shadow-lg scale-[1.02]' 
                                : 'glass-panel text-primary border-primary/10 hover:border-primary/30 hover:scale-[1.01]'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <h3 className={`text-xl font-serif arabic-text leading-relaxed ${isSelected ? 'text-secondary' : 'text-primary'}`}>
                                {dhikr.text}
                              </h3>
                              {dhikr.isFavorite && (
                                <Star size={18} className={isSelected ? 'text-yellow-300' : 'text-yellow-500'} fill="currentColor" />
                              )}
                            </div>
                            
                            <div className="mt-4 flex flex-row gap-2">
                              {/* Counter Progress Bar with Text Inside */}
                              <div className={`relative flex-1 h-8 rounded-lg overflow-hidden flex items-center justify-between px-3 ${isSelected ? 'bg-secondary/20' : 'bg-primary/10'}`}>
                                <div 
                                  className={`absolute right-0 top-0 h-full transition-all duration-500 ${isCompleted ? 'bg-green-500/80' : (isSelected ? 'bg-secondary/40' : 'bg-primary/20')}`} 
                                  style={{ width: `${counterProgress}%` }}
                                />
                                <span className={`relative z-10 text-[10px] sm:text-xs font-bold ${isSelected ? 'text-secondary' : 'text-primary'}`}>
                                  الإنجاز: {dhikrCount} {dhikr.target ? `/ ${dhikr.target}` : ''}
                                </span>
                                {isCompleted && (
                                  <span className={`relative z-10 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${isSelected ? 'bg-secondary text-primary' : 'bg-green-500 text-white'}`}>
                                    مكتمل
                                  </span>
                                )}
                              </div>
                              
                              {/* Timer Progress Bar with Text Inside */}
                              <div className={`relative flex-1 h-8 rounded-lg overflow-hidden flex items-center px-3 ${isSelected ? 'bg-secondary/20' : 'bg-primary/10'}`}>
                                <div 
                                  className={`absolute right-0 top-0 h-full transition-all duration-500 ${dhikrTime >= 300 ? 'bg-green-500/80' : (isSelected ? 'bg-secondary/30' : 'bg-accent/30')}`} 
                                  style={{ width: `${timerProgress}%` }}
                                />
                                <span className={`relative z-10 text-[10px] sm:text-xs font-bold ${isSelected ? 'text-secondary' : 'text-primary'}`}>
                                  الوقت: {formatDuration(dhikrTime)}
                                </span>
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
                    {searchTerm && !dhikrList.some(d => normalizeArabic(d.text).includes(normalizeArabic(searchTerm))) && (
                      <div className="text-center py-12 text-primary/50">
                        <Search size={48} className="mx-auto mb-4 opacity-20" />
                        <p>لا توجد نتائج مطابقة للبحث</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Interaction Area */}
            <div className="relative flex flex-col items-center w-full mt-4">
              {mode === 'timer' && (
                <div className="mb-8 flex flex-col items-center w-full glass-panel p-6 rounded-3xl shadow-sm">
                  <div className="text-5xl font-bold font-mono text-primary mb-4 tracking-tight">
                    {formatTime(timeLeft)}
                  </div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setIsTimerRunning(!isTimerRunning)}
                      className="p-4 bg-primary text-secondary rounded-full shadow-lg hover:scale-105 hover:shadow-xl transition-all active:scale-95"
                    >
                      {isTimerRunning ? <Pause size={24} /> : <Play size={24} fill="currentColor" />}
                    </button>
                    <div className="flex flex-wrap justify-center gap-2">
                      {[30, 60, 180, 300].map(s => (
                        <button 
                          key={s}
                          onClick={() => { setTimeLeft(s); setInitialTimeLeft(s); setIsTimerRunning(false); }}
                          className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${timeLeft === s ? 'bg-primary text-secondary border-primary shadow-md' : 'bg-secondary/50 text-primary/70 border-primary/20 hover:bg-primary/10'}`}
                        >
                          {s < 60 ? `${s}ث` : `${s/60}د`}
                        </button>
                      ))}
                      <div className="flex items-center gap-1 bg-secondary/50 rounded-xl px-2 border border-primary/20 focus-within:border-primary/50 focus-within:bg-primary/5 transition-all">
                        <input
                          type="number"
                          placeholder="مخصص"
                          min="1"
                          className="w-12 bg-transparent text-center text-sm font-bold outline-none text-primary placeholder:text-primary/40 placeholder:font-normal"
                          value={customTimerInput}
                          onChange={(e) => setCustomTimerInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const val = parseInt(customTimerInput);
                              if (val > 0) {
                                setTimeLeft(val * 60);
                                setInitialTimeLeft(val * 60);
                                setIsTimerRunning(false);
                                setCustomTimerInput('');
                              }
                            }
                          }}
                          onBlur={() => {
                            const val = parseInt(customTimerInput);
                            if (val > 0) {
                              setTimeLeft(val * 60);
                              setInitialTimeLeft(val * 60);
                              setIsTimerRunning(false);
                              setCustomTimerInput('');
                            }
                          }}
                        />
                        <span className="text-xs font-bold text-primary/70">د</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="relative w-72 h-72 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none drop-shadow-sm" viewBox="0 0 288 288">
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
                    transition={{ duration: 0.4, ease: "easeOut" }}
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
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    style={{ strokeDasharray: circleCircumference }}
                  />
                </svg>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={handleIncrement}
                  className="w-64 h-64 rounded-full bg-surface shadow-[0_8px_32px_rgba(0,0,0,0.08)] flex flex-col items-center justify-center relative overflow-hidden group z-10 border border-primary/5"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="text-7xl font-bold tracking-tighter text-primary drop-shadow-sm">
                    {currentCount}
                  </span>
                  <div className="flex flex-col items-center mt-3">
                    <span className="text-sm text-primary/50 uppercase tracking-[0.2em] font-medium">اضغط للتسبيح</span>
                    {currentDhikr.step && currentDhikr.target && currentDhikr.step !== currentDhikr.target && (
                      <span className="text-xs text-primary/70 mt-2 font-bold bg-primary/10 px-3 py-1 rounded-full">
                        القسم: {counterProgressValue === 0 && currentCount > 0 ? step : counterProgressValue} / {step}
                      </span>
                    )}
                    {currentDhikr.target && (
                      <span className="text-xs text-primary/60 mt-1 font-medium">
                        الإنجاز: {currentCount} / {currentDhikr.target}
                      </span>
                    )}
                  </div>
                </motion.button>
              </div>
              
              <button 
                onClick={handleReset}
                className="mt-8 p-3 text-primary/40 hover:text-primary hover:rotate-180 transition-all duration-500 bg-primary/5 hover:bg-primary/10 rounded-full"
                title="تصفير عداد اليوم"
              >
                <RotateCcw size={24} />
              </button>
            </div>
          </>
        )}
      </main>

      {/* Footer / Info */}
      <footer className="w-full max-w-md text-center mt-8 z-10">
        {dhikrList.length > 0 && (
          <>
            <div className="flex justify-center gap-2 mb-3">
              {dhikrList.map((_, idx) => (
                <div 
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentIndex ? 'w-8 bg-primary' : 'w-2 bg-primary/20'}`}
                />
              ))}
            </div>
            <p className="text-[11px] font-medium text-primary/50 uppercase tracking-[0.2em]">
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
    <div className="glass-panel p-5 rounded-3xl flex flex-col gap-3 transition-all hover:scale-[1.02] hover:shadow-lg hover:bg-primary/5 border border-primary/10">
      <div className="flex items-center gap-2 text-primary/80 mb-1">
        <div className="p-2 bg-primary/5 rounded-xl shadow-sm">
          {icon}
        </div>
        <span className="font-bold text-sm tracking-wide">{title}</span>
      </div>
      <div className="flex flex-col gap-1">
        <div className="text-3xl font-bold text-primary tracking-tight">
          {stats.count.toLocaleString('ar-EG')} <span className="text-sm font-medium text-primary/50 tracking-normal">تسبيحة</span>
        </div>
        <div className="text-xs font-bold text-accent bg-accent/10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg self-start mt-1">
          <Clock size={12} />
          <span>{formatDuration(stats.timeSpent)}</span>
        </div>
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
    <div className="min-h-screen flex flex-col items-center p-6 bg-secondary text-primary overflow-y-auto relative">
      {/* Background Decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-accent/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <header className="w-full max-w-md flex justify-between items-center mb-8 z-10 glass-panel px-6 py-4 rounded-2xl">
        <h1 className="text-2xl font-bold font-serif">إدارة الأذكار</h1>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-primary/10 transition-colors">
          <X size={24} />
        </button>
      </header>

      <main className="w-full max-w-md flex flex-col gap-4 pb-8 z-10">
        {/* Modals */}
        <AnimatePresence>
          {editingId && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="glass-panel p-6 rounded-3xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold font-serif">{formData.id?.startsWith('custom_') ? 'إضافة ذكر جديد' : 'تعديل الذكر'}</h3>
                  <button onClick={() => setEditingId(null)} className="p-2 rounded-full hover:bg-primary/10 transition-colors">
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
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="glass-panel p-6 rounded-3xl max-w-sm w-full shadow-2xl"
              >
                <h3 className="text-xl font-bold mb-4 text-primary">استعادة الافتراضي</h3>
                <p className="text-primary/70 mb-6">هل أنت متأكد من استعادة القائمة الافتراضية؟ سيتم حذف جميع الأذكار المخصصة.</p>
                <div className="flex gap-3">
                  <button onClick={confirmReset} className="flex-1 bg-red-500 text-white py-3 rounded-xl font-medium hover:bg-red-600 transition-colors">نعم، استعادة</button>
                  <button onClick={() => setShowResetConfirm(false)} className="flex-1 bg-primary/10 text-primary py-3 rounded-xl font-medium hover:bg-primary/20 transition-colors">إلغاء</button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {deleteConfirmId && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="glass-panel p-6 rounded-3xl max-w-sm w-full shadow-2xl"
              >
                <h3 className="text-xl font-bold mb-4 text-primary">حذف الذكر</h3>
                <p className="text-primary/70 mb-6">هل أنت متأكد من حذف هذا الذكر؟</p>
                <div className="flex gap-3">
                  <button onClick={confirmDelete} className="flex-1 bg-red-500 text-white py-3 rounded-xl font-medium hover:bg-red-600 transition-colors">نعم، حذف</button>
                  <button onClick={() => setDeleteConfirmId(null)} className="flex-1 bg-primary/10 text-primary py-3 rounded-xl font-medium hover:bg-primary/20 transition-colors">إلغاء</button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {showValidationError && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="glass-panel p-6 rounded-3xl max-w-sm w-full shadow-2xl text-center"
              >
                <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X size={32} />
                </div>
                <h3 className="text-xl font-bold mb-2 text-primary">خطأ</h3>
                <p className="text-primary/70 mb-6">نص الذكر مطلوب، يرجى إدخاله.</p>
                <button onClick={() => setShowValidationError(false)} className="w-full bg-primary text-secondary py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors">حسناً</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-between items-center mb-2 px-2">
          <button 
            onClick={handleAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-secondary rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus size={18} /> إضافة ذكر
          </button>
          <button 
            onClick={handleResetToDefault}
            className="text-sm text-primary/60 hover:text-primary underline transition-colors"
          >
            استعادة الافتراضي
          </button>
        </div>

        <div className="space-y-3">
          {dhikrList.map((dhikr, index) => (
            <div key={dhikr.id} className="glass-panel p-4 rounded-2xl flex justify-between items-center transition-transform hover:scale-[1.01]">
              <div className="flex flex-col gap-1 ml-3">
                <button 
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className={`p-1.5 rounded-lg transition-colors ${index === 0 ? 'text-primary/20 cursor-not-allowed' : 'text-primary/60 hover:text-primary hover:bg-primary/10'}`}
                >
                  <ArrowUp size={16} />
                </button>
                <button 
                  onClick={() => moveDown(index)}
                  disabled={index === dhikrList.length - 1}
                  className={`p-1.5 rounded-lg transition-colors ${index === dhikrList.length - 1 ? 'text-primary/20 cursor-not-allowed' : 'text-primary/60 hover:text-primary hover:bg-primary/10'}`}
                >
                  <ArrowDown size={16} />
                </button>
              </div>
              <div className="flex-1 ml-2">
                <h3 className="text-lg font-serif arabic-text text-primary mb-1">{dhikr.text}</h3>
                {dhikr.target && <span className="text-xs font-medium text-primary/60 bg-primary/5 px-2 py-1 rounded-md">الهدف: {dhikr.target}</span>}
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={() => toggleFavorite(dhikr.id)}
                  className={`p-2.5 rounded-xl transition-colors ${dhikr.isFavorite ? 'text-yellow-500 hover:bg-yellow-500/10' : 'text-primary/40 hover:text-primary/60 hover:bg-primary/10'}`}
                >
                  <Star size={18} fill={dhikr.isFavorite ? "currentColor" : "none"} />
                </button>
                <button 
                  onClick={() => handleEdit(dhikr)}
                  className="p-2.5 text-primary/60 hover:text-primary hover:bg-primary/10 rounded-xl transition-colors"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(dhikr.id)}
                  className="p-2.5 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
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
