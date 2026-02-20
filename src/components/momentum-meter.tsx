'use client';

import { useMonocleStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export function MomentumMeter({ className }: { className?: string }) {
    const { getCompletedTodayCount } = useMonocleStore();
    const count = getCompletedTodayCount();

    // Ensure hydration matches by only rendering count after mount
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className={cn("text-[10px] sm:text-xs text-muted-foreground/0 select-none", className)}>Loading...</div>;
    }

    return (
        <div className={cn(
            "text-[10px] sm:text-xs select-none transition-all duration-500",
            count > 0 ? "text-muted-foreground font-medium" : "text-muted-foreground/30",
            className
        )}>
            {count} task{count === 1 ? '' : 's'} completed today.
        </div>
    );
}
