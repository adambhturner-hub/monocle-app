'use client';

import { useEffect, useState } from 'react';
import { useMonocleStore } from '@/lib/store';

export function FrogAccountability() {
    const tasks = useMonocleStore(state => state.tasks);
    const [isGuiltMode, setIsGuiltMode] = useState(false);

    useEffect(() => {
        const checkGuilt = () => {
            const activeFrog = tasks.find(t => t.isFrog && !t.completedAt && !t.archivedAt);
            const currentHour = new Date().getHours();

            // If there's an active frog and it's 6 PM (18) or later
            if (activeFrog && currentHour >= 18) {
                setIsGuiltMode(true);
                document.documentElement.classList.add('guilt-mode');
            } else {
                setIsGuiltMode(false);
                document.documentElement.classList.remove('guilt-mode');
            }
        };

        checkGuilt();
        // Check every minute if we crossed the 6 PM threshold
        const interval = setInterval(checkGuilt, 60000);
        return () => clearInterval(interval);
    }, [tasks]);

    return null; // Silent logic wrapper
}
