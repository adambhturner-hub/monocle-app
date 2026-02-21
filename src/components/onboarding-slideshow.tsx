import { useState, useRef } from 'react';
import { useMonocleStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, Target, ListTodo, Hand, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LogoSmall } from '@/components/logo';

export function OnboardingSlideshow() {
    const { settings, updateSettings } = useMonocleStore();
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isExiting, setIsExiting] = useState(false);

    // Swipe tracking
    const touchStartX = useRef<number | null>(null);
    const touchEndX = useRef<number | null>(null);
    const minSwipeDistance = 50;

    if (settings.hasSeenOnboarding) return null;
    if (isExiting) return null;

    const slides = [
        {
            title: "Welcome to Monocle",
            description: "Not another to-do list. This is an execution engine designed for radical focus.",
            icon: <LogoSmall className="scale-150 mb-6" showText={false} />
        },
        {
            title: "The Queue",
            description: "Dump your brain into the Queue. Sort by priority, due date, or manually order your day.",
            icon: <ListTodo className="h-16 w-16 text-primary mb-6" />
        },
        {
            title: "Tactile Control",
            description: "Swipe right to complete.\nSwipe left to skip and move it down.",
            icon: <Hand className="h-16 w-16 text-primary mb-6" />
        },
        {
            title: "Radical Focus",
            description: "When you're ready to work, hit Focus Mode to enter the cockpit. One task. No distractions.",
            icon: <Target className="h-16 w-16 text-primary mb-6" />
        },
        {
            title: "Choose Your Sprint",
            description: (
                <div className="flex flex-col gap-4 text-left w-full mt-2">
                    <p className="text-center text-base">
                        Focus isn't vague. It's timed.<br />
                        Decide how long you're committing — then begin.
                    </p>
                    <div className="flex flex-col gap-3 bg-secondary/20 p-4 rounded-xl border border-secondary/30 text-sm">
                        <div className="flex items-center gap-3"><span className="text-xl">⚡</span> <span className="font-semibold text-foreground">Lightning</span> <span className="text-muted-foreground ml-auto">2-min ignition</span></div>
                        <div className="flex items-center gap-3"><span className="text-xl">🏃</span> <span className="font-semibold text-foreground">Micro-Sprint</span> <span className="text-muted-foreground ml-auto">5-min burst</span></div>
                        <div className="flex items-center gap-3"><span className="text-xl">🍅</span> <span className="font-semibold text-foreground">Pomodoro</span> <span className="text-muted-foreground ml-auto">25-min sprint</span></div>
                        <div className="flex items-center gap-3"><span className="text-xl">🌊</span> <span className="font-semibold text-foreground">Flow State</span> <span className="text-muted-foreground ml-auto">45-min immersion</span></div>
                        <div className="flex items-center gap-3"><span className="text-xl">🔋</span> <span className="font-semibold text-foreground">Ultradian</span> <span className="text-muted-foreground ml-auto">90-min deep session</span></div>
                    </div>
                </div>
            ),
            icon: <Timer className="h-16 w-16 text-primary mb-6" />
        },
        {
            title: "Eat the Frog",
            description: (
                <div className="flex flex-col gap-4 text-center w-full mt-2">
                    <blockquote className="italic text-muted-foreground border-l-2 border-primary/50 pl-4 py-2 text-left bg-secondary/10 rounded-r-lg">
                        "If it's your job to eat a frog, it's best to do it first thing in the morning."<br />
                        <span className="text-sm font-semibold mt-2 block">— Mark Twain</span>
                    </blockquote>
                    <p className="text-base text-foreground mt-2">
                        Choose your most important task. It will always rise to the top.
                    </p>
                </div>
            ),
            icon: <div className="text-7xl mb-6 leading-none">🐸</div>
        }
    ];

    const handleNext = () => {
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
        touchEndX.current = null;
        touchStartX.current = e.targetTouches[0].clientX;
    };

    const onTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.targetTouches[0].clientX;
    };

    const onTouchEnd = () => {
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
            <div className="flex-1 w-full max-w-sm flex flex-col items-center justify-center text-center">
                <div key={currentSlide} className="flex flex-col items-center animate-in slide-in-from-right-4 fade-in duration-500">
                    {slides[currentSlide].icon}
                    <h1 className="text-3xl font-bold tracking-tight mb-4">{slides[currentSlide].title}</h1>
                    <div className="text-lg text-muted-foreground leading-relaxed whitespace-pre-line w-full">
                        {slides[currentSlide].description}
                    </div>
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="w-full max-w-sm flex items-center justify-between pb-24 pt-6 sm:pb-12">
                <Button
                    variant="ghost"
                    onClick={handlePrev}
                    className={cn("transition-opacity", currentSlide === 0 ? "opacity-0 pointer-events-none" : "opacity-100")}
                >
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back
                </Button>

                <Button onClick={handleNext} size="lg" className="rounded-full shadow-lg">
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
