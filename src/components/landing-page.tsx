'use client';

import { LogoSmall } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Target, ListTodo, Zap, CheckCircle2, Shuffle, Repeat } from 'lucide-react';
import { useEffect, useState } from 'react';

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

                <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 mb-8">
                    <HeroLogo />
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[1.1] text-balance md:text-left">
                        The brutalist <br className="hidden md:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-foreground to-muted-foreground mr-1">execution</span> engine.
                    </h1>
                </div>

                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl text-balance mb-12 leading-relaxed">
                    Not another planning tool. Monocle is a tactile, offline-first environment designed to cure decision fatigue. One task at a time. No escape hatches.
                </p>

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
            </main>

            {/* Features Grid */}
            <section className="bg-secondary/30 border-t py-24 px-6 md:px-12">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">

                        {/* Feature 1 */}
                        <div className="flex flex-col gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary mb-2">
                                <Target className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold">The Highlander Rule</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                There can only be one <strong>Frog</strong>. Tag your single most important task. All other dates and priorities are stripped away until you eat it.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="flex flex-col gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-foreground text-background flex items-center justify-center border shadow-md mb-2">
                                <Shuffle className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold">Tinder for Tasks</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Physical, tactile gestures. Swipe right to complete. Swipe left to hold. Let the Randomizer pick your next move when paralyzed by choice.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="flex flex-col gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-500 mb-2">
                                <Zap className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold">Instant Capture</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Offline-first architecture means zero loading screens. Smart NLP parses your dates and folders instantly as you type. Brain dump at the speed of thought.
                            </p>
                        </div>

                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t py-12 px-6 md:px-12 text-center flex flex-col items-center gap-6">
                <LogoSmall showText={false} className="w-6 h-6 opacity-30 grayscale" />
                <p className="text-sm text-muted-foreground/60">
                    &copy; {new Date().getFullYear()} Monocle App. Built for radical focus.
                </p>
            </footer>
        </div>
    );
}
