import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

const POLLING_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function useVersionCheck() {
    const currentVersion = useRef<string | null>(null);

    useEffect(() => {
        const checkVersion = async () => {
            try {
                // Append a cache-busting timestamp so the browser actually fetches the newest file
                const response = await fetch(`/version.txt?t=${Date.now()}`, {
                    cache: 'no-store'
                });

                if (!response.ok) return;

                const latestVersion = await response.text();
                const trimmedLatest = latestVersion.trim();

                if (!trimmedLatest) return;

                if (currentVersion.current === null) {
                    // First load: just record the version
                    currentVersion.current = trimmedLatest;
                } else if (currentVersion.current !== trimmedLatest) {
                    // Version changed! Prompt the user to update.
                    toast('A new version of Monocle is available.', {
                        duration: 100000, // keep the toast around
                        position: 'bottom-center',
                        action: {
                            label: 'Update Now',
                            onClick: () => {
                                // Force a hard reload
                                window.location.reload();
                            }
                        },
                    });
                }
            } catch (err) {
                // Ignore network errors (user might be offline)
            }
        };

        // Check immediately on mount
        checkVersion();

        // Check repeatedly on an interval
        const intervalId = setInterval(checkVersion, POLLING_INTERVAL_MS);

        // Also check whenever the user brings the tab back into focus
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkVersion();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);
}
