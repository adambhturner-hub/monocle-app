import { useState } from 'react';
import { useMonocleStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, Target, ListTodo, Hand } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LogoSmall } from '@/components/logo';

export function OnboardingSlideshow() {
    const { settings, updateSettings } = useMonocleStore();
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isExiting, setIsExiting] = useState(false);

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
            description: "Swipe right on a task to execute it. Swipe left to delay it into the Idea Dump.",
            icon: <Hand className="h-16 w-16 text-primary mb-6" />
        },
        {
            title: "Radical Focus",
            description: "When you're ready to work, hit Focus Mode to enter the cockpit. One task. No distractions.",
            icon: <Target className="h-16 w-16 text-primary mb-6" />
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

    return (
        <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
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
                    <p className="text-lg text-muted-foreground leading-relaxed">
                        {slides[currentSlide].description}
                    </p>
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="w-full max-w-sm flex items-center justify-between pb-12 pt-6">
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
