import React, { useState, useMemo } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useMonocleStore } from '@/lib/store';
import { startOfDay } from 'date-fns';
import confetti from 'canvas-confetti';
import { Dices, CircleDashed } from 'lucide-react';
import { FormattedText } from './ui/formatted-text';
import { soundEngine } from '@/lib/sound-engine';

export function TaskRouletteModal({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [isSpinning, setIsSpinning] = useState(false);
    const [winningTask, setWinningTask] = useState<any>(null);
    const controls = useAnimation();
    const { tasks, activeProject, setActiveRandomTaskId } = useMonocleStore();

    // Logic from randomTask in store to find eligible tasks
    const eligibleTasks = useMemo(() => {
        const now = Date.now();
        const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
        const todayStart = startOfDay(now - FOUR_HOURS_MS).getTime();
        
        const currentActiveId = useMonocleStore.getState().getAutoPickedTask()?.id;
        
        return tasks.filter(t =>
            !t.isDraft &&
            t.status === 'todo' &&
            (activeProject ? t.projectId === activeProject : true) &&
            (!t.skippedUntil || t.skippedUntil < now) &&
            (!t.launchDate || startOfDay(t.launchDate).getTime() <= todayStart) &&
            t.id !== currentActiveId
        );
    }, [tasks, activeProject, open]);

    const visualSegments = useMemo(() => {
        if (eligibleTasks.length === 0) return [];
        let segments = [...eligibleTasks];
        while (segments.length > 0 && segments.length < 8) {
            segments = [...segments, ...eligibleTasks];
        }
        return segments.slice(0, Math.max(8, eligibleTasks.length));
    }, [eligibleTasks]);

    const handleSpin = async () => {
        if (isSpinning || eligibleTasks.length === 0) return;
        setIsSpinning(true);
        setWinningTask(null);

        try {
            const storeState = useMonocleStore.getState();
            if (storeState.settings?.soundEnabled !== false) {
                soundEngine.playDiceRattle(); // initial spin sound
                
                // Gradually slowing tick sound to simulate wheel slowing down
                let ticks = 0;
                let delay = 50;
                const playSpinTick = () => {
                    if (!isSpinning && ticks > 25) return;
                    if (ticks > 30) return; // cap at 30 ticks
                    soundEngine.playTick();
                    ticks++;
                    delay = Math.min(300, delay * 1.15); // exponentially slow down
                    setTimeout(playSpinTick, delay);
                };
                playSpinTick();
                
                // @ts-ignore
                if (window.navigator?.vibrate) window.navigator.vibrate(50);
            }
        } catch (e) {}

        const finalRotation = 360 * 5 + Math.floor(Math.random() * 360); 
        const winningTaskRaw = eligibleTasks[Math.floor(Math.random() * eligibleTasks.length)];

        await controls.start({
            rotate: finalRotation,
            transition: { duration: 3, ease: [0.1, 0.9, 0.2, 1] }
        });

        try {
            const storeState = useMonocleStore.getState();
            if (storeState.settings?.soundEnabled !== false) {
                soundEngine.playComplete();
                 // @ts-ignore
                if (window.navigator?.vibrate) window.navigator.vibrate([100, 50, 100]);
            }
        } catch(e) {}
        
        confetti({
            particleCount: 80,
            angle: 90,
            spread: 60,
            origin: { y: 0.8 },
            colors: ['#a855f7', '#6366f1', '#3b82f6'] // sleek colors
        });

        setWinningTask(winningTaskRaw);
        setIsSpinning(false);
        
        setTimeout(() => {
            setActiveRandomTaskId(winningTaskRaw.id);
            setOpen(false);
            setWinningTask(null);
            
            // Reset spinner rotation instantly without animation so it's ready next time
            controls.set({ rotate: 0 });
        }, 3000);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-zinc-950 border-zinc-800 rounded-3xl" onOpenAutoFocus={e => e.preventDefault()}>
                <DialogTitle className="sr-only">Task Roulette</DialogTitle>
                
                <div className="relative w-full aspect-square flex flex-col items-center justify-center p-8 overflow-hidden bg-gradient-to-br from-zinc-900 to-black select-none h-[450px]">
                    
                    {/* Background Glows */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px]" />

                    {/* Header */}
                    <div className="absolute top-6 w-full text-center z-20">
                        <h2 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
                            <CircleDashed className="w-5 h-5 text-indigo-400" />
                            Task Roulette
                        </h2>
                        <p className="text-muted-foreground text-xs mt-1">Let fate decide your next focus.</p>
                    </div>

                    {/* Wheel Container */}
                    {eligibleTasks.length > 0 ? (
                        <div className="relative w-64 h-64 mt-6 flex items-center justify-center">
                            {/* HUD Center */}
                            <div className="absolute inset-0 m-auto w-32 h-32 bg-zinc-900 border-[3px] border-zinc-800 rounded-full z-20 shadow-[0_0_30px_rgba(0,0,0,0.8)] flex items-center justify-center text-center p-4">
                                {winningTask ? (
                                    <motion.div 
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="text-white font-bold text-sm tracking-tight leading-tight"
                                    >
                                        <FormattedText text={winningTask.title} />
                                    </motion.div>
                                ) : (
                                    <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-1">
                                        {isSpinning ? "Spinning..." : "Ready"}
                                    </span>
                                )}
                            </div>

                            {/* Pointer */}
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-r-[10px] border-b-[16px] border-l-transparent border-r-transparent border-b-white z-30 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] rotate-180" />

                            {/* Rotating Wheel */}
                            <motion.div 
                                animate={controls}
                                className="w-full h-full rounded-full border border-zinc-800 shadow-inner relative overflow-hidden"
                            >
                                <div 
                                    className="absolute inset-0 w-full h-full rounded-full opacity-60"
                                    style={{
                                        background: `conic-gradient(from 0deg, ${visualSegments.map((s, i) => {
                                            const deg = 360 / visualSegments.length;
                                            const colors = ['#6366f1', '#a855f7', '#ec4899', '#14b8a6', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'];
                                            const color = colors[i % colors.length];
                                            return `${color} ${i * deg}deg ${(i + 1) * deg}deg`;
                                        }).join(', ')})`,
                                        maskImage: 'radial-gradient(transparent 35%, black 40%)',
                                        WebkitMaskImage: 'radial-gradient(transparent 35%, black 40%)'
                                    }}
                                />
                                {/* Overlay Glass */}
                                <div className="absolute inset-0 w-full h-full rounded-full border-[8px] border-black/40 box-border pointer-events-none" />
                            </motion.div>
                        </div>
                    ) : (
                        <div className="text-center text-sm text-zinc-500 mt-12 px-8">
                            Not enough tasks available to play Roulette. Add some more tasks to this project first!
                        </div>
                    )}

                    {/* Actions */}
                    <div className="absolute bottom-6 w-full px-12 flex justify-center z-20">
                        <Button 
                            size="lg" 
                            disabled={isSpinning || eligibleTasks.length < 2}
                            onClick={handleSpin}
                            className="w-full max-w-[200px] h-12 rounded-full font-bold text-md tracking-wider bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-400/30 transition-all hover:scale-105"
                        >
                            <Dices className="mr-2 h-5 w-5" />
                            {isSpinning ? 'SPINNING...' : 'SPIN'}
                        </Button>
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    );
}
