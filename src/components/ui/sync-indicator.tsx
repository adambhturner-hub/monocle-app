import { useMonocleStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';

export function SyncIndicator({ className = "" }: { className?: string }) {
    const syncStatus = useMonocleStore(state => state.syncStatus);

    return (
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={cn("flex items-center justify-center cursor-help", className)}>
                        {syncStatus === 'offline' && (
                            <CloudOff className="h-[14px] w-[14px] text-muted-foreground/50" />
                        )}
                        {syncStatus === 'syncing' && (
                            <RefreshCw className="h-[14px] w-[14px] text-blue-500 animate-spin" />
                        )}
                        {syncStatus === 'idle' && (
                            <Cloud className="h-[14px] w-[14px] text-emerald-500/80 drop-shadow-[0_0_2px_rgba(16,185,129,0.5)]" />
                        )}
                        {syncStatus === 'error' && (
                            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="center" className="text-xs">
                    {syncStatus === 'offline' && "Offline - Local Only"}
                    {syncStatus === 'syncing' && "Syncing with Cloud..."}
                    {syncStatus === 'idle' && "Cloud Synced"}
                    {syncStatus === 'error' && "Sync Error"}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
