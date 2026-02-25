import { useState, useRef, useEffect } from 'react';
import { useMonocleStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, Target, Hand, Timer, CheckCircle2, Shuffle, Dices, Headphones, Zap, Waves, CloudRain, Music2, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LogoSmall } from '@/components/logo';
import { SwipeableTask } from './ui/swipeable-task';
import { Task } from '@/types';
import { haptics } from '@/lib/haptics';
import { soundEngine } from '@/lib/sound-engine';
import { motion, AnimatePresence } from 'framer-motion';

export function OnboardingSlideshow() {
    const { settings, updateSettings, isHydrated } = useMonocleStore();
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isExiting, setIsExiting] = useState(false);

    const [isBelowMd, setIsBelowMd] = useState(false);
    useEffect(() => {
        const check = () => setIsBelowMd(window.innerWidth <= 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    // Interactive State
    const [task1Done, setTask1Done] = useState(false);
    const [task2Done, setTask2Done] = useState(false);

    // Reset local state if data is wiped and onboarding needs to show again
    const [timerDone, setTimerDone] = useState(false);
    const [isTimerDemoRunning, setIsTimerDemoRunning] = useState(false);
    const [timerProgress, setTimerProgress] = useState(0);

    const [musicDone, setMusicDone] = useState(false);
    const [activeNoise, setActiveNoise] = useState<'white' | 'pink' | 'rain' | 'off'>('off');

    const [holdDone, setHoldDone] = useState(false);
    const [randomDone, setRandomDone] = useState(false);

    // Stop noise when leaving slide
    useEffect(() => {
        if (currentSlide !== 4 && activeNoise !== 'off') {
            soundEngine.stopNoise();
            setActiveNoise('off');
        }
    }, [currentSlide, activeNoise]);

    // Timer Animation Ref
    const timerRef = useRef<number>(0);
    const tickIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) cancelAnimationFrame(timerRef.current);
            if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
            soundEngine.stopNoise();
        };
    }, []);

    // Reset local state if data is wiped and onboarding needs to show again
    useEffect(() => {
        if (settings && !settings.hasSeenOnboarding) {
            setIsExiting(false);
            setCurrentSlide(0);
            setTask1Done(false);
            setTask2Done(false);
            setTimerDone(false);
            setIsTimerDemoRunning(false);
            setTimerProgress(0);
            setMusicDone(false);
            setActiveNoise('off');
            setHoldDone(false);
            setRandomDone(false);
        }
    }, [settings?.hasSeenOnboarding]);

    // Swipe tracking
    const touchStartX = useRef<number | null>(null);
    const touchEndX = useRef<number | null>(null);
    const minSwipeDistance = 50;

    const allTasksDone = task1Done && task2Done;

    // Auto-advance when interactive tutorial is complete
    useEffect(() => {
        if (currentSlide === 1 && allTasksDone) {
            setTimeout(() => {
                setCurrentSlide(2);
            }, 800);
        }
    }, [currentSlide, allTasksDone]);

    if (!isHydrated) return null;
    if (settings.hasSeenOnboarding) return null;
    if (isExiting) return null;

    const fakeTask1: Task = { id: 'onboard-1', title: isBelowMd ? 'Swipe right to complete' : 'Hover & click checkmark to complete', status: 'todo', priority: 'medium', createdAt: Date.now() };
    const fakeTask2: Task = { id: 'onboard-2', title: isBelowMd ? 'Swipe left to skip' : 'Hover & click shuffle to skip', status: 'todo', priority: 'medium', createdAt: Date.now() };

    const handleTask1 = () => {
        soundEngine.playComplete();
        haptics.success();
        setTask1Done(true);
    };

    const handleTask2 = () => {
        soundEngine.playSkip();
        haptics.swipe();
        setTask2Done(true);
    };

    const handleTimerTest = async () => {
        await soundEngine.unlock();
        soundEngine.playStart();
        haptics.heavy();
        setTimerDone(true);
        setIsTimerDemoRunning(true);
        setTimerProgress(0);

        if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = setInterval(() => {
            soundEngine.playTick();
        }, 1000);

        const start = Date.now();
        const duration = 4000; // 4 second demo

        const animate = () => {
            const elapsed = Date.now() - start;
            const p = Math.min(1, elapsed / duration);
            setTimerProgress(p);

            if (p < 1) {
                timerRef.current = requestAnimationFrame(animate);
            } else {
                setIsTimerDemoRunning(false);
                if (tickIntervalRef.current) {
                    clearInterval(tickIntervalRef.current);
                    tickIntervalRef.current = null;
                }
                soundEngine.playComplete(); // play success chime at end!
            }
        };

        if (timerRef.current) cancelAnimationFrame(timerRef.current);
        timerRef.current = requestAnimationFrame(animate);
    };

    const handleNoiseTest = async (type: 'white' | 'pink' | 'rain') => {
        await soundEngine.unlock();
        if (activeNoise === type) {
            soundEngine.stopNoise();
            setActiveNoise('off');
        } else {
            soundEngine.playNoise(type);
            setActiveNoise(type);
            setMusicDone(true);
        }
    };

    const handleHoldTest = async () => {
        await soundEngine.unlock();
        soundEngine.playHold();
        haptics.heavy();
        setHoldDone(true);
    };

    const handleRandomTest = async () => {
        await soundEngine.unlock();
        soundEngine.playDiceRattle();
        haptics.success();
        setRandomDone(true);
    };

    const slides = [
        {
            title: "Welcome to Monocle",
            description: "Not another to-do list. This is an execution chamber designed for radical focus.",
            icon: <LogoSmall className="scale-150 mb-6" showText={false} />
        },
        {
            interactive: true,
            title: "Tactile Control",
            description: isBelowMd ? "Build muscle memory. Clear these tasks to continue." : "Hover over tasks to reveal actions on Desktop.",
            icon: <Hand className="h-10 w-10 text-primary mb-2" />
        },
        {
            title: "Radical Focus",
            description: "When you're ready to work, hit Focus Mode to enter the cockpit. One task. No drift.",
            icon: <Target className="h-16 w-16 text-primary mb-6" />
        },
        {
            title: "Choose Your Mode",
            description: (
                <div className="flex flex-col gap-4 text-left w-full mt-2">
                    <p className="text-center text-sm">
                        Focus isn't vague. It's timed.<br />
                        Decide how long you're committing — then begin. You can pause the timer anytime if you get interrupted.
                    </p>

                    {!timerDone && !isTimerDemoRunning ? (
                        <div className="flex flex-col gap-3 p-4 rounded-xl border bg-card shadow-sm text-sm max-w-[260px] mx-auto w-full">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium flex items-center gap-2">
                                    🍅 Pomodoro
                                </h4>
                                <span className="text-xs text-muted-foreground">25m</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <Button variant="outline" size="sm" className="flex-1 text-muted-foreground hover:bg-muted" onClick={handleTimerTest}>
                                    ⚡️ Lightning
                                </Button>
                                <Button variant="default" size="sm" className="flex-1 font-bold shadow-md" onClick={handleTimerTest}>
                                    🍅 Pomodoro
                                </Button>
                            </div>
                            <Button size="default" className="w-full gap-2 font-semibold mt-2 shadow-sm" onClick={handleTimerTest}>
                                <Play className="h-4 w-4 fill-current" />
                                Start Focus
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-6 bg-card border rounded-xl shadow-sm mx-auto max-w-[260px] w-full">
                            <div className="relative flex items-center justify-center w-[120px] h-[120px]">
                                <svg
                                    className="w-full h-full -rotate-90 transition-all duration-300"
                                    viewBox="0 0 120 120"
                                >
                                    <circle cx="60" cy="60" r="50" className="stroke-muted/30 fill-none" strokeWidth="6" />
                                    <circle
                                        cx="60" cy="60" r="50"
                                        className="stroke-orange-500 fill-none transition-all duration-100 ease-linear"
                                        strokeWidth="6"
                                        strokeDasharray={2 * Math.PI * 50}
                                        strokeDashoffset={(2 * Math.PI * 50) - (timerProgress * 2 * Math.PI * 50)}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-2xl font-mono font-medium tracking-tighter tabular-nums drop-shadow-md text-orange-500 animate-pulse">
                                        {Math.ceil(25 - (timerProgress * 25))}:{(60 - Math.ceil(timerProgress * 60) % 60).toString().padStart(2, '0')}
                                    </span>
                                </div>
                                <div className="absolute inset-2 rounded-full -z-10 blur-xl opacity-20 animate-pulse bg-orange-500" />
                            </div>
                            <div className="mt-6 flex items-center justify-center gap-2 text-emerald-500 font-bold text-sm">
                                <CheckCircle2 className="h-4 w-4" /> Timer Selected
                            </div>
                        </div>
                    )}
                </div>
            ),
            icon: <Timer className="h-16 w-16 text-primary mb-4" />
        },
        {
            title: "Atmosphere & Audio",
            description: (
                <div className="flex flex-col gap-4 text-center w-full mt-2">
                    <p className="text-base text-foreground">
                        The Focus Cockpit isolates you from distractions.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Cycle through ambient background noises, or listen to Monocle's success chimes below.
                    </p>
                    <div className="w-full max-w-[260px] p-4 border rounded-xl bg-card shadow-sm mx-auto text-left">
                        <div className="grid grid-cols-3 gap-2">
                            <Button variant="outline" className={cn("flex flex-col items-center gap-1 h-20 border-2 transition-all", activeNoise === 'white' ? "border-primary bg-primary/10 text-primary" : "border-border/50 hover:bg-accent/50 text-muted-foreground")} onClick={() => handleNoiseTest('white')}>
                                <Zap className="h-4 w-4" />
                                <span className="text-[10px] text-center leading-tight">White<br />Noise</span>
                            </Button>
                            <Button variant="outline" className={cn("flex flex-col items-center gap-1 h-20 border-2 transition-all", activeNoise === 'pink' ? "border-primary bg-primary/10 text-primary" : "border-border/50 hover:bg-accent/50 text-muted-foreground")} onClick={() => handleNoiseTest('pink')}>
                                <Waves className="h-4 w-4" />
                                <span className="text-[10px] text-center leading-tight">Pink<br />Noise</span>
                            </Button>
                            <Button variant="outline" className={cn("flex flex-col items-center gap-1 h-20 border-2 transition-all", activeNoise === 'rain' ? "border-primary bg-primary/10 text-primary" : "border-border/50 hover:bg-accent/50 text-muted-foreground")} onClick={() => handleNoiseTest('rain')}>
                                <CloudRain className="h-4 w-4" />
                                <span className="text-[10px] text-center leading-tight">Heavy<br />Rain</span>
                            </Button>
                        </div>
                    </div>
                    {musicDone && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-emerald-500 font-bold text-center flex items-center justify-center gap-2">
                            <CheckCircle2 className="h-4 w-4" /> Audio Tested
                        </motion.div>
                    )}
                </div>
            ),
            icon: <Headphones className="h-16 w-16 text-primary mb-6" />
        },
        {
            title: "Power Tools",
            description: (
                <div className="flex flex-col gap-4 text-center w-full mt-2">
                    <p className="text-sm text-muted-foreground">
                        Unexpected friction? Try out your power tools below:
                    </p>
                    <div className="flex gap-4 w-full mt-2">
                        <Button
                            variant={holdDone ? "default" : "outline"}
                            className="flex-1 h-24 flex flex-col gap-2 transition-all"
                            onClick={handleHoldTest}
                        >
                            <Hand className="h-8 w-8" />
                            <span>Hold Task</span>
                        </Button>
                        <Button
                            variant={randomDone ? "default" : "outline"}
                            className="flex-1 h-24 flex flex-col gap-2 transition-all"
                            onClick={handleRandomTest}
                        >
                            <Dices className="h-8 w-8" />
                            <span>Random Task</span>
                        </Button>
                    </div>
                    {holdDone && randomDone && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-emerald-500 font-bold text-center flex items-center justify-center gap-2">
                            <CheckCircle2 className="h-4 w-4" /> Tools Mastered
                        </motion.div>
                    )}
                </div>
            ),
            icon: <Dices className="h-16 w-16 text-primary mb-6" />
        },
        {
            title: "Eat the Frog",
            description: (
                <div className="flex flex-col gap-4 text-center w-full mt-2">
                    <blockquote className="italic text-muted-foreground border-l-2 border-primary/50 pl-4 py-2 text-left bg-secondary/10 rounded-r-lg text-sm">
                        "If it's your job to eat a frog, it's best to do it first thing in the morning."<br />
                        <span className="text-xs font-semibold mt-2 block">— Mark Twain</span>
                    </blockquote>
                    <p className="text-sm text-foreground mt-2">
                        Choose your most important task. It will always rise to the top.
                    </p>
                </div>
            ),
            icon: <div className="text-7xl mb-6 leading-none">🐸</div>
        },
        {
            title: "Install Monocle",
            description: (
                <div className="flex flex-col gap-4 text-center w-full mt-2">
                    <p className="text-base text-foreground">
                        For the best experience, install Monocle to your home screen or dock.
                    </p>
                    <div className="text-sm text-muted-foreground bg-secondary/10 p-4 rounded-xl border border-border/50 text-left">
                        <strong>iOS:</strong> Tap Share <span className="text-xl inline-block translate-y-1">↑</span> then "Add to Home Screen"<br />
                        <strong>Desktop:</strong> Use Chrome/Edge or PWA settings to "Install App".
                    </div>
                </div>
            ),
            icon: <div className="text-7xl mb-6 leading-none">📲</div>
        }
    ];

    const handleNext = () => {
        if (currentSlide === 1 && !allTasksDone) {
            // Force them to complete interactive tutorial on all devices
            soundEngine.playTick();
            haptics.error();
            return;
        }

        const isTimerInteractive = currentSlide === 3 && !timerDone;
        const isMusicInteractive = currentSlide === 4 && !musicDone;
        const isPowerToolsInteractive = currentSlide === 5 && (!holdDone || !randomDone);

        if (isTimerInteractive || isMusicInteractive || isPowerToolsInteractive) {
            soundEngine.playTick();
            haptics.error();
            return;
        }

        if (currentSlide === slides.length - 1) {
            updateSettings({ hasSeenOnboarding: true });
            setIsExiting(true);
        } else {
            setCurrentSlide(p => p + 1);
        }
    };

    const handlePrev = () => {
        setCurrentSlide(p => Math.max(0, p - 1));
    };

    const onTouchStart = (e: React.TouchEvent) => {
        // Prevent accidental swiping while interacting with tasks
        if (currentSlide === 1) return;
        touchEndX.current = null;
        touchStartX.current = e.targetTouches[0].clientX;
    };

    const onTouchMove = (e: React.TouchEvent) => {
        if (currentSlide === 1) return;
        touchEndX.current = e.targetTouches[0].clientX;
    };

    const onTouchEnd = () => {
        if (currentSlide === 1) return;
        if (!touchStartX.current || !touchEndX.current) return;
        const distance = touchStartX.current - touchEndX.current;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            handleNext();
        } else if (isRightSwipe) {
            handlePrev();
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6 sm:p-12 h-[100dvh] max-h-[100dvh] overflow-hidden animate-in fade-in duration-500"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            {/* Minimalist Top Indicator */}
            <div className="absolute top-12 left-0 right-0 flex justify-center gap-2">
                {slides.map((_, i) => (
                    <div
                        key={i}
                        className={cn(
                            "h-1.5 rounded-full transition-all duration-300",
                            i === currentSlide ? "w-8 bg-primary" : "w-1.5 bg-border"
                        )}
                    />
                ))}
            </div>

            {/* Slide Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="flex-1 w-full max-w-sm flex flex-col items-center justify-center text-center"
                >
                    {slides[currentSlide].icon}
                    <h1 className="text-3xl font-bold tracking-tight mb-4">{slides[currentSlide].title}</h1>
                    <div className="text-lg text-muted-foreground leading-relaxed whitespace-pre-line w-full">
                        {slides[currentSlide].description}
                    </div>

                    {/* Interactive Sandbox for Slide 1 */}
                    {slides[currentSlide].interactive && (
                        <div className="mt-8 w-full flex flex-col gap-3">
                            <AnimatePresence>
                                {!task1Done && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9, height: 0 }}
                                        className="relative group"
                                    >
                                        <SwipeableTask
                                            isMobile={isBelowMd}
                                            task={fakeTask1}
                                            leftAction={handleTask1}
                                        >
                                            <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between pointer-events-none">
                                                <span className="font-medium">{fakeTask1.title}</span>
                                                {isBelowMd && <ChevronRight className="h-5 w-5 text-emerald-500 animate-pulse" />}
                                                {!isBelowMd && <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-500" onClick={handleTask1} style={{ pointerEvents: 'auto' }}><CheckCircle2 className="h-5 w-5" /></Button>}
                                            </div>
                                        </SwipeableTask>
                                        {/* Desktop Hover Hint */}
                                        {!isBelowMd && (
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button size="icon" variant="ghost" onClick={handleTask1} className="text-emerald-500 bg-background/80 hover:bg-emerald-500/20 rounded-full h-8 w-8">
                                                    <CheckCircle2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                                {!task2Done && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9, height: 0 }}
                                        className="relative group"
                                    >
                                        <SwipeableTask
                                            isMobile={isBelowMd}
                                            task={fakeTask2}
                                            rightAction={handleTask2}
                                            rightBgClass="bg-blue-500"
                                        >
                                            <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between pointer-events-none">
                                                {isBelowMd && <ChevronLeft className="h-5 w-5 text-blue-500 animate-pulse" />}
                                                <span className="font-medium">{fakeTask2.title}</span>
                                                {!isBelowMd && <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500" onClick={handleTask2} style={{ pointerEvents: 'auto' }}><Shuffle className="h-5 w-5" /></Button>}
                                            </div>
                                        </SwipeableTask>
                                        {!isBelowMd && (
                                            <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex">
                                                <Button size="icon" variant="ghost" onClick={handleTask2} className="text-blue-500 bg-background/80 hover:bg-blue-500/20 rounded-full h-8 w-8">
                                                    <Shuffle className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            {allTasksDone && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-emerald-500 font-bold mt-4 flex items-center justify-center gap-2">
                                    <CheckCircle2 className="h-5 w-5" /> Memory Built
                                </motion.div>
                            )}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Bottom Controls */}
            <div className="w-full max-w-sm flex items-center justify-between pb-24 pt-6 sm:pb-12 h-20 shrink-0">
                <Button
                    variant="ghost"
                    onClick={handlePrev}
                    className={cn("transition-opacity", currentSlide === 0 ? "opacity-0 pointer-events-none" : "opacity-100")}
                >
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back
                </Button>

                <Button
                    onClick={handleNext}
                    size="lg"
                    className="rounded-full shadow-lg"
                    disabled={
                        (currentSlide === 1 && !allTasksDone) ||
                        (currentSlide === 3 && !timerDone) ||
                        (currentSlide === 4 && !musicDone) ||
                        (currentSlide === 5 && (!holdDone || !randomDone))
                    }
                >
                    {currentSlide === slides.length - 1 ? (
                        "Let's Go"
                    ) : (
                        <>Next <ChevronRight className="ml-2 h-4 w-4" /></>
                    )}
                </Button>
            </div>
        </div>
    );
}
