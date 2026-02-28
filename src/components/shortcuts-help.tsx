'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Keyboard, Command } from "lucide-react"
import { useMonocleStore } from "@/lib/store"

export function ShortcutsHelp() {
    const { activeModal, setActiveModal } = useMonocleStore();

    return (
        <Dialog open={activeModal === 'shortcuts-help'} onOpenChange={(open) => setActiveModal(open ? 'shortcuts-help' : null)}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="fixed bottom-4 right-4 h-10 w-10 rounded-full bg-background border shadow-md text-muted-foreground hover:text-foreground z-50 hidden sm:flex">
                    <Keyboard className="h-5 w-5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Command className="h-4 w-4" />
                        Keyboard Shortcuts
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="grid gap-2">
                        {/* Navigation */}
                        <div className="text-xs font-semibold text-muted-foreground mt-2">Navigation</div>

                        <div className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                            <span>Command Palette</span>
                            <div className="flex gap-1">
                                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">⌘P</kbd>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                            <span>Focus Mode</span>
                            <div className="flex gap-1">
                                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">F</kbd>
                                <span className="text-muted-foreground/50">/</span>
                                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">⌘1</kbd>
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                            <span>Queue View</span>
                            <div className="flex gap-1">
                                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">Q</kbd>
                                <span className="text-muted-foreground/50">/</span>
                                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">⌘2</kbd>
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                            <span>Archive</span>
                            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">⌘3</kbd>
                        </div>

                        {/* Actions */}
                        <div className="text-xs font-semibold text-muted-foreground mt-2">Actions</div>
                        <div className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                            <span>Add Task</span>
                            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">⌘K</kbd>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                            <span>Quick Add (Queue)</span>
                            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">Enter</kbd>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                            <span>Idea Dump</span>
                            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">⇧Enter</kbd>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                            <span>Shuffle Task</span>
                            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">S</kbd>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                            <span>Complete Active</span>
                            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">⌘E</kbd>
                        </div>

                        {/* Text Modifiers */}
                        <div className="text-xs font-semibold text-muted-foreground mt-2">Text Modifiers</div>
                        <div className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                            <span>Daily Frog</span>
                            <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400">#frog</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                            <span>Lightning Task</span>
                            <span className="font-mono text-xs text-yellow-600 dark:text-yellow-400">#lightning</span>
                        </div>

                        {/* Focus Timer */}
                        <div className="text-xs font-semibold text-muted-foreground mt-2">Focus Timer</div>
                        <div className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                            <span>Start / Pause</span>
                            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">T</kbd>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                            <span>Stop Session</span>
                            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">⇧T</kbd>
                        </div>

                        {/* General */}
                        <div className="text-xs font-semibold text-muted-foreground mt-2">General</div>
                        <div className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                            <span>Shortcuts Help</span>
                            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">?</kbd>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                            <span>Close Modal</span>
                            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">Esc</kbd>
                        </div>
                    </div>
                    <div className="text-xs text-muted-foreground pt-4 border-t">
                        More shortcuts coming soon in future updates.
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
