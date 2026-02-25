'use client';

export const haptics = {
    swipe: () => {
        if (typeof window !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(50);
        }
    },
    click: () => {
        if (typeof window !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(15);
        }
    },
    success: () => {
        if (typeof window !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }
    },
    error: () => {
        if (typeof window !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([50, 50, 50, 50, 50]);
        }
    },
    heavy: () => {
        if (typeof window !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(100);
        }
    }
};
