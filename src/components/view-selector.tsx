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
import { ChevronDown, Target, List, Lightbulb, Archive, Settings, BarChart3 } from "lucide-react"
import { useMonocleStore } from "@/lib/store";

export function ViewSelector() {
    const { setOpenSheet, view, setView } = useMonocleStore();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 font-normal text-muted-foreground hover:text-foreground">
                    {view === 'focus' ? 'Focus Mode' : view === 'queue' ? 'Queue' : 'Idea Dump'}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>View</DropdownMenuLabel>
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
                    setView('ideas');
                    setOpenSheet(null);
                }}>
                    <Lightbulb className="mr-2 h-4 w-4" />
                    Idea Dump (Drafts)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setOpenSheet('stats')}>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Productivity Insights
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
    )
}
