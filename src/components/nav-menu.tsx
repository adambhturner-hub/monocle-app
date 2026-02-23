'use client';

import { useState, useEffect } from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, Target, Layers, Lightbulb, Settings, FileText, CheckCircle2, BarChart3, PenLine } from 'lucide-react';
import { ArchiveView } from '@/components/archive-view';
import { QueueView } from '@/components/queue-view';
import { LogoSmall } from '@/components/logo';
import { SettingsView } from '@/components/settings-view';
import { useMonocleStore } from '@/lib/store';
import { ProjectSelect } from '@/components/project-select';

export function NavMenu() {
    const [open, setOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const { tasks, setView, setOpenSheet } = useMonocleStore();

    const handleNavigation = (action: () => void) => {
        setOpen(false);
        // Small timeout to allow sheet to close before changing state? 
        // Not strictly necessary but can be smoother.
        setTimeout(action, 100);
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Menu className="h-6 w-6" />
                </Button>
            </SheetTrigger>

            <SheetContent side="left" className="w-[300px]">
                <SheetHeader className="mb-8">
                    <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                    <div className="flex justify-center py-4">
                        <LogoSmall className="scale-125" />
                    </div>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest text-center mt-2">Fancy Focus, One Task At A Time</p>
                </SheetHeader>

                <div className="flex flex-col gap-2">
                    {/* Current Views */}
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Views
                    </div>

                    <Button variant="ghost" className="justify-start w-full hover:bg-secondary/50" onClick={() => handleNavigation(() => setView('capture'))}>
                        <PenLine className="mr-2 h-4 w-4" />
                        Capture Mode (Home)
                    </Button>

                    <Button variant="ghost" className="justify-start w-full hover:bg-secondary/50" onClick={() => handleNavigation(() => setView('focus'))}>
                        <Target className="mr-2 h-4 w-4" />
                        Focus Mode
                    </Button>

                    <Button variant="ghost" className="justify-start w-full hover:bg-secondary/50" onClick={() => handleNavigation(() => setView('queue'))}>
                        <Layers className="mr-2 h-4 w-4" />
                        Active Queue
                        <span className="ml-auto text-xs text-muted-foreground">{tasks.filter(t => t.status === 'todo' && !t.isDraft).length}</span>
                    </Button>

                    <Button variant="ghost" className="justify-start w-full hover:bg-secondary/50" onClick={() => handleNavigation(() => setView('ideas'))}>
                        <Lightbulb className="mr-2 h-4 w-4" />
                        Idea Dump
                        <span className="ml-auto text-xs text-muted-foreground">{tasks.filter(t => t.status === 'todo' && t.isDraft).length}</span>
                    </Button>

                    <Button variant="ghost" className="justify-start w-full hover:bg-secondary/50" onClick={() => handleNavigation(() => setOpenSheet('archive'))}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Logbook
                    </Button>

                    <Button variant="ghost" className="justify-start w-full hover:bg-secondary/50" onClick={() => handleNavigation(() => setOpenSheet('stats'))}>
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Productivity Insights
                    </Button>

                    <div className="h-px bg-border my-2" />

                    {/* App Actions */}
                    <Button variant="ghost" className="justify-start w-full hover:bg-secondary/50" onClick={() => handleNavigation(() => setOpenSheet('settings'))}>
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                    </Button>

                    <div className="mt-2 sm:hidden px-2">
                        <ProjectSelect />
                    </div>

                    <div className="w-full pt-4 border-t flex flex-col items-center justify-center gap-2">
                        <span className="text-xs text-muted-foreground font-mono">
                            v1.0.0 (Launch)
                        </span>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
