'use client';

import { LogoSmall } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Target, ListTodo, Zap, CheckCircle2, Shuffle, Repeat, X, Pause, Music, Check, MoreHorizontal, ChevronUp, Timer, Dices } from 'lucide-react';
import { useEffect, useState } from 'react';

const MOCK_TASKS = [
    { title: "Crush your biggest priority", project: "No Project", type: "frog" },
    { title: "Review new design assets for v2.0", project: "Design", type: "normal" },
    { title: "Finalize the Q3 corporate strategy deck", project: "Board Meeting", type: "urgent" }
];

function CockpitMockup() {
    const [taskIndex, setTaskIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const interval = setInterval(() => {
            setIsVisible(false);
            setTimeout(() => {
                setTaskIndex((prev) => (prev + 1) % MOCK_TASKS.length);
                setIsVisible(true);
            }, 300);
        }, 4000);

        return () => clearInterval(interval);
    }, []);

    const task = MOCK_TASKS[taskIndex];
    const isFrog = task.type === "frog";

    return (
        <div className="w-full max-w-3xl mx-auto mt-24 mb-16 px-6 relative z-10 hidden md:block group perspective-[2000px]">
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent blur-3xl -z-10 rounded-[3rem] opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />

            {/* The Floating UI Window */}
            <div
                className={`relative rounded-[2.5rem] bg-background border-2 shadow-2xl overflow-hidden aspect-[4/5] transition-all duration-1000 ease-out flex flex-col pointer-events-none hover:scale-[1.02] hover:-translate-y-2 ${isFrog ? 'border-emerald-500/20 shadow-emerald-500/10' : 'border-primary/10 shadow-primary/5 hover:border-primary/20'}`}
                style={{ transformStyle: 'preserve-3d', transform: 'rotateX(2deg)' }}
            >
                {/* Header mimicking a sleek app window */}
                <div className="h-20 w-full flex items-center justify-between px-8 shrink-0 relative">
                    <Music className="w-5 h-5 text-muted-foreground/30" />
                    <MoreHorizontal className="w-6 h-6 text-muted-foreground/30" />
                </div>

                {/* The 'Cockpit' Internals */}
                <div className="flex-1 flex flex-col items-center p-8 relative">
                    <div className={`transition-all duration-500 flex flex-col items-center w-full min-h-[300px] ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-6 scale-[0.98]'}`}>
                        {/* Conditional Frog Header */}
                        {isFrog && (
                            <div className="flex flex-col items-center mb-6">
                                <div className="text-5xl mb-3">🐸</div>
                                <span className="text-[10px] font-bold tracking-widest text-emerald-500 uppercase">Eat the Frog</span>
                            </div>
                        )}

                        {/* Project Label */}
                        <div className="px-5 py-2 rounded-full border border-border/50 text-xs font-medium text-muted-foreground mb-12 flex items-center gap-2 bg-background shadow-sm transition-all duration-500">
                            {!isFrog && (
                                <div className={`w-2 h-2 rounded-full ${task.type === 'urgent' ? 'bg-rose-500' : 'bg-blue-500'}`} />
                            )}
                            {task.project}
                        </div>

                        {/* Imposing Task Text */}
                        <h2 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter text-center max-w-4xl text-balance leading-[1.05] mb-12 drop-shadow-sm text-foreground/90 transition-all duration-500 px-8">
                            {task.title}
                        </h2>

                        {/* Interactive Timer State */}
                        <div className="w-14 h-14 rounded-full bg-secondary/50 flex items-center justify-center mb-4 transition-all duration-500">
                            <Timer className="w-6 h-6 text-muted-foreground" />
                        </div>
                    </div>

                    {/* Faux Buttons Area (Static) */}
                    <div className="w-full flex flex-col items-center gap-6 mt-auto pb-6">
                        <ChevronUp className="w-5 h-5 text-muted-foreground/30 animate-pulse" />
                        <div className="flex gap-4">
                            <div className="px-6 py-2.5 rounded-full border border-border/50 bg-background/50 flex items-center gap-2 text-muted-foreground font-medium shadow-sm">
                                <Dices className="w-4 h-4" /> Random
                            </div>
                            <div className="px-6 py-2.5 rounded-full border border-border/50 bg-background/50 flex items-center gap-2 text-muted-foreground font-medium shadow-sm">
                                <Shuffle className="w-4 h-4" /> Skip
                            </div>
                        </div>
                        <div className="w-full max-w-sm h-14 bg-foreground text-background rounded-full flex items-center justify-center font-bold text-lg shadow-xl shadow-foreground/20">
                            <Check className="w-5 h-5 mr-3" /> Complete Task
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function HeroLogo() {
    const [rotation, setRotation] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            // Calculate rotation based on mouse position relative to center of screen
            const x = (e.clientX / window.innerWidth - 0.5) * 40; // max 20deg
            const y = (e.clientY / window.innerHeight - 0.5) * -40; // inverted, max 20deg
            setRotation({ x: y, y: x });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div
            className="relative w-32 h-32 md:w-48 md:h-48 mb-6 perspective-[1000px] group flex-shrink-0"
        >
            <div
                className="w-full h-full relative transition-transform duration-200 ease-out"
                style={{
                    transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
                    transformStyle: 'preserve-3d'
                }}
            >
                {/* The Monocle Glass */}
                <div
                    className="absolute inset-0 rounded-full border-[8px] md:border-[12px] border-foreground shadow-[0_20px_50px_rgba(0,0,0,0.5)] dark:shadow-[0_20px_50px_rgba(255,255,255,0.1)] flex items-center justify-center overflow-hidden"
                    style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)',
                        backdropFilter: 'blur(4px)',
                        transform: 'translateZ(20px)'
                    }}
                >
                    {/* Shiny Glint Sweep */}
                    <div className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" style={{ transform: 'skewX(-20deg)' }} />
                </div>

                {/* Static Inner Glint (like LogoSmall) */}
                <div
                    className="absolute top-[15%] left-[15%] w-[30%] h-[20%] border-t-[4px] border-l-[4px] border-foreground rounded-tl-full opacity-60"
                    style={{ transform: 'translateZ(30px)' }}
                />

                {/* The Monocle Chain / Handle Line */}
                <div
                    className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-16 h-1.5 md:h-2 bg-foreground rounded-full"
                    style={{ transform: 'translateZ(10px)' }}
                />

                {/* 3D Depth layers to make the rim look thick */}
                <div className="absolute inset-0 rounded-full border-[8px] md:border-[12px] border-foreground/50" style={{ transform: 'translateZ(10px)' }} />
                <div className="absolute inset-0 rounded-full border-[8px] md:border-[12px] border-foreground/20" style={{ transform: 'translateZ(0px)' }} />
            </div>

            <style jsx>{`
                @keyframes shimmer {
                    100% {
                        transform: translateX(100%) skewX(-20deg);
                    }
                }
            `}</style>
        </div>
    );
}

interface LandingPageProps {
    onGoogleSignIn: () => void;
    isSubmitting: boolean;
}

export function LandingPage({ onGoogleSignIn, isSubmitting }: LandingPageProps) {
    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 flex flex-col font-sans overflow-x-hidden">
            {/* Header */}
            <header className="px-6 py-6 md:px-12 md:py-8 flex justify-between items-center w-full max-w-7xl mx-auto">
                <div className="flex items-center gap-3">
                    <LogoSmall showText={false} className="w-8 h-8" />
                    <span className="font-bold text-xl tracking-tight">Monocle</span>
                </div>
                <div className="flex items-center gap-4">
                    <Button
                        variant="default"
                        size="sm"
                        className="rounded-full font-semibold px-6 shadow-lg shadow-primary/20"
                        onClick={onGoogleSignIn}
                        disabled={isSubmitting}
                    >
                        Sign In
                    </Button>
                </div>
            </header>

            {/* Hero Section */}
            <main className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-24 md:pt-32 md:pb-40 text-center relative max-w-5xl mx-auto w-full">
                {/* Background Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-full point-events-none -z-10 opacity-50 hidden md:block" />

                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold uppercase tracking-widest mb-8 border shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    v1.0 is Live
                </div>

                <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 mb-8 relative">
                    <HeroLogo />
                    <div className="text-center md:text-left">
                        <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-[1] relative inline-block">
                            <span className="text-foreground">Monocle.</span>
                            {/* Overlay Shine on Title */}
                            <span
                                className="absolute inset-0 bg-clip-text text-transparent bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.8)_50%,transparent_75%)] bg-[length:200%_100%] animate-[shine_4s_ease-in-out_infinite]"
                                aria-hidden="true"
                            >
                                Monocle.
                            </span>
                        </h1>
                        <span className="block text-2xl md:text-4xl lg:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-foreground via-muted-foreground/50 to-foreground bg-[length:200%_100%] animate-[shine_6s_ease-in-out_infinite_reverse] mr-1 mt-2">
                            The fancy focus app.
                        </span>
                    </div>
                </div>

                <style jsx>{`
                    @keyframes shine {
                        0% { background-position: 200% center; }
                        100% { background-position: -200% center; }
                    }
                `}</style>

                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl text-balance mb-8 leading-relaxed font-medium">
                    One task at a time.<br /><br />
                    Because you don't need another list —<br />you need a lens.<br /><br />
                    <strong>Capture.<br />Prioritize.<br />Execute.</strong>
                </p>

                <div className="mt-8 mb-12">
                    <p className="text-4xl md:text-5xl lg:text-6xl font-serif italic text-foreground text-center tracking-tight">
                        Focus, properly.
                    </p>
                </div>

                <Button
                    size="lg"
                    className="h-14 px-8 text-lg rounded-full font-bold shadow-xl shadow-primary/20 flex items-center gap-3 group relative overflow-hidden transition-all hover:scale-105 active:scale-95"
                    onClick={onGoogleSignIn}
                    disabled={isSubmitting}
                >
                    <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-700 ease-out -skew-x-12 -ml-4 w-1/2" />
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                </Button>

                <CockpitMockup />
            </main>

            {/* Dark Strip Quote */}
            <div className="w-full bg-foreground text-background py-8 md:py-10">
                <p className="text-center font-bold tracking-[0.2em] uppercase text-xs md:text-sm px-6">
                    When your list is endless, elegance is restraint.
                </p>
            </div>

            {/* Features Grid */}
            <section className="bg-secondary/30 border-t py-24 px-6 md:px-12">
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-24">

                        {/* Feature 1 */}
                        <div className="flex flex-col gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-500 mb-2 text-2xl">
                                🐸
                            </div>
                            <h3 className="text-xl font-bold">Meet the Frog. Eat the Frog.</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                There can only be one.<br /><br />
                                Tag your most important task.<br />
                                Everything else politely waits.<br /><br />
                                A frog a day keeps the panic away.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="flex flex-col gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary mb-2">
                                <Target className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold">Singular Focus</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                This is not a dashboard.<br />
                                This is a monocle.<br /><br />
                                One task fills the screen.<br />
                                You cannot multitask with one eye.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="flex flex-col gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-foreground text-background flex items-center justify-center border shadow-md mb-2">
                                <Shuffle className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold">Swipe with Intent</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Skip. Hold. Complete.<br />
                                Or let fate (the Dice) decide.<br /><br />
                                Elegant.<br />
                                Decisive.<br />
                                Slightly dramatic.
                            </p>
                        </div>

                        {/* Feature 4 */}
                        <div className="flex flex-col gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-500 mb-2">
                                <Zap className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold">Capture at the Speed of Thought</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Type naturally.<br />
                                Dates parse instantly.<br /><br />
                                No folders.<br />
                                No ceremony.<br /><br />
                                Brain dump first.<br />
                                Organize later.
                            </p>
                        </div>

                    </div>

                    <div className="mt-32 max-w-4xl mx-auto border-t pt-24 pb-12 flex flex-col md:flex-row items-center md:items-start gap-12 text-center md:text-left">
                        <div className="w-48 h-48 md:w-56 md:h-56 rounded-2xl overflow-hidden shrink-0 shadow-2xl border border-border">
                            <img src="/founder.jpg" alt="Founder" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" />
                        </div>
                        <div className="flex-1 flex flex-col justify-center h-full pt-2">
                            <p className="text-2xl md:text-3xl font-serif italic text-foreground mb-8 text-balance leading-relaxed">
                                "For the over-organized.<br />
                                For the list rewriters.<br />
                                For the ambitious — and occasionally overwhelmed.<br />
                                <strong className="text-primary">Put on the monocle.</strong>"
                            </p>
                            <div className="flex flex-col mt-auto">
                                <span className="font-bold text-lg text-foreground">Rev. Col. Adam B.H. Turner</span>
                                <span className="text-sm text-muted-foreground mt-1">Founder, Monocle</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t py-12 px-6 md:px-12 text-center flex flex-col items-center gap-6">
                <LogoSmall showText={false} className="w-6 h-6 opacity-30 grayscale" />
                <p className="text-sm text-muted-foreground/60">
                    &copy; {new Date().getFullYear()} Cherrymoon Media. Built for radical focus.
                </p>
            </footer>
        </div>
    );
}
