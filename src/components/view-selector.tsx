'use client';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ChevronDown, Target, List, Lightbulb, Archive, Settings, BarChart3, Activity, PenLine, CalendarDays, Clock } from "lucide-react"
import { useMonocleStore } from "@/lib/store";
import { auth } from "@/lib/firebase";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function ViewSelector() {
    const { setOpenSheet, view, setView, tasks } = useMonocleStore();
    const showTutorial = tasks.length === 1 && tasks[0].title.includes('Welcome');

    return (
        <TooltipProvider>
            <DropdownMenu>
                <Tooltip open={showTutorial && view !== 'focus'}>
                    <TooltipTrigger asChild>
                        <div>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="gap-2 font-normal text-muted-foreground hover:text-foreground relative">
                                    {showTutorial && view !== 'focus' && (
                                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                                        </span>
                                    )}
                                    {view === 'focus' ? 'Focus Mode' : view === 'queue' ? 'Queue' : view === 'analytics' ? 'Analytics' : view === 'capture' ? 'Capture' : view === 'calendar' ? 'Upcoming' : view === 'planner' ? 'Planner' : 'Idea Dump'}
                                    <ChevronDown className="h-4 w-4 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={16} className="bg-popover text-popover-foreground border shadow-lg font-medium px-4 py-2 text-sm animate-pulse tracking-wide z-[60]">
                        Now, enter Focus Mode.
                    </TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel className="flex flex-col gap-1 pb-2">
                        <span>View</span>
                        {auth.currentUser?.email && (
                            <span className="text-xs font-normal text-emerald-500/80 flex items-center gap-1">
                                <Activity className="h-3 w-3" />
                                {auth.currentUser.email}
                            </span>
                        )}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => {
                        setView('focus');
                        setOpenSheet(null);
                    }}>
                        <Target className="mr-2 h-4 w-4" />
                        Focus Mode
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                        setView('queue');
                        setOpenSheet(null);
                    }}>
                        <List className="mr-2 h-4 w-4" />
                        Queue
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                        setView('calendar');
                        setOpenSheet(null);
                    }}>
                        <CalendarDays className="mr-2 h-4 w-4" />
                        Upcoming
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                        setView('planner');
                        setOpenSheet(null);
                    }}>
                        <Clock className="mr-2 h-4 w-4" />
                        Planner
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                        setView('ideas');
                        setOpenSheet(null);
                    }}>
                        <Lightbulb className="mr-2 h-4 w-4" />
                        Idea Dump (Drafts)
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => {
                        setView('analytics');
                        setOpenSheet(null);
                    }}>
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Analytics & History
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setOpenSheet('archive')}>
                        <Archive className="mr-2 h-4 w-4" />
                        Archive
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setOpenSheet('settings')}>
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </TooltipProvider>
    )
}
