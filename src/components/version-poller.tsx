'use client';

import { useVersionCheck } from '@/hooks/use-version-check';

export function VersionPoller() {
    useVersionCheck();
    return null;
}
