
'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Moon, Sun, Laptop, Trash2, Download, Info, Keyboard, List, Calendar, Clock, Target, Volume2, Mic, Activity, RefreshCw } from 'lucide-react';
import { useMonocleStore } from '@/lib/store';
import { toast } from 'sonner';
import { soundEngine } from '@/lib/sound-engine';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { del } from 'idb-keyval';
import { formatDistanceToNow } from 'date-fns';

interface SettingsViewProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SettingsView({ open, onOpenChange }: SettingsViewProps) {
    const { setTheme, theme } = useTheme();
    const { tasks, projects, settings, updateSettings, clearData, lastSyncTime } = useMonocleStore();
    const [testSoundPlaying, setTestSoundPlaying] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const handleForceSync = async () => {
        if (!auth.currentUser) return;
        setIsSyncing(true);
        try {
            const toastId = toast.loading("Syncing with cloud...");
            const { doc, getDoc } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase');
            const userDocRef = doc(db, 'users', auth.currentUser.uid);

            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                const cloudData = docSnap.data();
                useMonocleStore.getState().loadFromCloud({
                    tasks: cloudData.tasks || [],
                    projects: cloudData.projects || [],
                    settings: cloudData.settings,
                    sessionHistory: cloudData.sessionHistory || [],
                });
                useMonocleStore.getState().setLastSyncTime(Date.now());
                toast.success("Sync successful", { id: toastId });
            } else {
                toast.success("Ready for push", { id: toastId });
            }
        } catch (e: any) {
            toast.error("Force sync failed", { description: e.message });
        } finally {
            setIsSyncing(false);
        }
    };
    // const [, setTick] = useState(0);

    const handleClearData = async () => {
        if (confirm("Are you sure you want to delete ALL data? This cannot be undone.")) {
            try {
                if (auth.currentUser) {
                    const { doc, setDoc } = await import('firebase/firestore');
                    const { db } = await import('@/lib/firebase');
                    const userDocRef = doc(db, 'users', auth.currentUser.uid);
                    await setDoc(userDocRef, {
                        tasks: [],
                        projects: [],
                        sessionHistory: [],
                        settings: { ...settings, hasSeenOnboarding: false },
                        updatedAt: Date.now()
                    });
                }
            } catch (e) {
                console.error("Failed to wipe cloud document", e);
            } finally {
                clearData();
                await del('monocle-storage');
                window.location.reload();
            }
        }
    };

    const handleSignOut = async () => {
        if (confirm("Are you sure you want to sign out? This will clear local data to protect your privacy.")) {
            try {
                clearData();
                await del('monocle-storage');
                await signOut(auth);
            } finally {
                // ... window reload handles closing and wiping anyway
                window.location.reload();
            }
        }
    };

    const handleExport = () => {
        const data = {
            tasks,
            projects,
            exportedAt: new Date().toISOString(),
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `monocle-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Data exported successfully");
    };

    const handleSoundToggle = (enabled: boolean) => {
        updateSettings({ soundEnabled: enabled });
        if (enabled) {
            soundEngine.setVolume(0.5);
            soundEngine.playTick();
        } else {
            soundEngine.setVolume(0);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-6">
                <SheetHeader className="mb-6">
                    <SheetTitle className="text-2xl">Settings</SheetTitle>
                    <SheetDescription>
                        Customize your experience and manage your data.
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-8">
                    {/* Audio Section (New) */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-lg font-semibold border-b pb-2">
                            <Volume2 className="h-5 w-5" />
                            <h3>Audio</h3>
                        </div>
                        <div className="flex items-center justify-between space-x-2">
                            <div className="flex flex-col space-y-1">
                                <Label htmlFor="sound-effects">Sound Effects</Label>
                                <span className="text-xs text-muted-foreground">Play sounds for timer start and task completion.</span>
                            </div>
                            <Switch
                                id="sound-effects"
                                checked={settings.soundEnabled ?? true}
                                onCheckedChange={handleSoundToggle}
                            />
                        </div>
                        <div className="flex items-center justify-between space-x-2">
                            <div className="flex flex-col space-y-1">
                                <Label>Test Audio</Label>
                                <span className="text-xs text-muted-foreground">Check if your speakers are working.</span>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                    await soundEngine.unlock(); // Ensure context is ready
                                    soundEngine.playComplete();
                                    setTestSoundPlaying(true);
                                    setTimeout(() => setTestSoundPlaying(false), 1000);
                                }}
                                disabled={settings.soundEnabled === false}
                            >
                                <Volume2 className={`h-4 w-4 mr-2 ${testSoundPlaying ? 'animate-pulse text-primary' : ''}`} />
                                Test
                            </Button>
                        </div>

                        {/* Media Mode Note */}
                        <div className="rounded-md bg-muted/50 p-3 flex gap-2 items-start">
                            <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div className="text-xs text-muted-foreground">
                                <span className="font-semibold text-foreground">Mobile Audio Mode</span>
                                <br />
                                App is optimized to play like a media app (Spotify), ignoring the silent switch.
                            </div>
                        </div>
                    </div>

                    {/* Account & Sync Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-lg font-semibold border-b pb-2">
                            <Activity className="h-5 w-5" />
                            <h3>Account & Sync</h3>
                        </div>
                        <div className="flex flex-col gap-3 p-4 border rounded-lg bg-emerald-500/5 border-emerald-500/20">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base text-emerald-600 dark:text-emerald-400">Cloud Sync Active</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Signed in as <span className="font-medium text-foreground">{auth.currentUser?.email}</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground/70 flex items-center gap-1 mt-1">
                                        <RefreshCw className="h-3 w-3" />
                                        Last synced: {lastSyncTime ? formatDistanceToNow(lastSyncTime, { addSuffix: true }) : 'Never'}
                                    </p>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Button variant="default" size="sm" onClick={handleForceSync} disabled={isSyncing} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                        {isSyncing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                                        Force Sync
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={handleSignOut}>
                                        Sign Out
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* General Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-lg font-semibold border-b pb-2">
                            <List className="h-5 w-5" />
                            <h3>General</h3>
                        </div>
                        <div className="grid gap-4">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="sort" className="flex flex-col gap-1">
                                    <span>Default Sort Mode</span>
                                    <span className="font-normal text-muted-foreground text-xs">How tasks are ordered in the queue</span>
                                </Label>
                                <Select
                                    value={settings.sortMode}
                                    onValueChange={(val: 'manual' | 'date') => updateSettings({ sortMode: val })}
                                >
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Select sort" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="manual">Manual (Drag & Drop)</SelectItem>
                                        <SelectItem value="date">Date (Due Date)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Appearance Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-lg font-semibold border-b pb-2">
                            <Sun className="h-5 w-5" />
                            <h3>Appearance</h3>
                        </div>

                        <div className="grid gap-4">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="theme" className="flex flex-col gap-1">
                                    <span>Theme</span>
                                    <span className="font-normal text-muted-foreground text-xs">Select your preferred color mode</span>
                                </Label>
                                <Select value={theme} onValueChange={setTheme}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Select theme" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="light">
                                            <div className="flex items-center gap-2"><Sun className="h-4 w-4" /> Light</div>
                                        </SelectItem>
                                        <SelectItem value="dark">
                                            <div className="flex items-center gap-2"><Moon className="h-4 w-4" /> Dark</div>
                                        </SelectItem>
                                        <SelectItem value="system">
                                            <div className="flex items-center gap-2"><Laptop className="h-4 w-4" /> System</div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Auto-Pick Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-lg font-semibold border-b pb-2">
                            <Target className="h-5 w-5" />
                            <h3>Focus Engine</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="overdue" className="flex flex-col gap-1">
                                    <span>Prioritize Overdue</span>
                                    <span className="font-normal text-muted-foreground text-xs">Always show overdue tasks first in Focus Mode</span>
                                </Label>
                                <Switch
                                    id="overdue"
                                    checked={settings.autoPickOverdue}
                                    onCheckedChange={(checked) => updateSettings({ autoPickOverdue: checked })}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <Label htmlFor="cooldown" className="flex flex-col gap-1">
                                    <span>Skip Cooldown</span>
                                    <span className="font-normal text-muted-foreground text-xs">Hide skipped tasks from Focus Mode for...</span>
                                </Label>
                                <Select
                                    value={settings.skipCooldown.toString()}
                                    onValueChange={(val) => updateSettings({ skipCooldown: parseInt(val) })}
                                >
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Select cooldown" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">Disabled (Instant)</SelectItem>
                                        <SelectItem value="60">1 Hour</SelectItem>
                                        <SelectItem value="180">3 Hours</SelectItem>
                                        <SelectItem value="360">6 Hours</SelectItem>
                                        <SelectItem value="720">12 Hours</SelectItem>
                                        <SelectItem value="1440">24 Hours</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Data Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-lg font-semibold border-b pb-2">
                            <Download className="h-5 w-5" />
                            <h3>Data & Storage</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="retention" className="flex flex-col gap-1">
                                    <span>Archive Retention</span>
                                    <span className="font-normal text-muted-foreground text-xs">Auto-delete completed tasks after</span>
                                </Label>
                                <Select
                                    value={settings.archiveRetention.toString()}
                                    onValueChange={(val) => updateSettings({ archiveRetention: parseInt(val) })}
                                >
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Select retention" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="7">7 days</SelectItem>
                                        <SelectItem value="30">30 days</SelectItem>
                                        <SelectItem value="90">90 days</SelectItem>
                                        <SelectItem value="365">1 year</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Separator />

                            <div className="flex items-center justify-between p-4 border rounded-lg bg-secondary/10">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Export Data</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Download a JSON backup of your tasks and projects.
                                    </p>
                                </div>
                                <Button variant="outline" size="sm" onClick={handleExport}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Export
                                </Button>
                            </div>

                            <div className="flex items-center justify-between p-4 border rounded-lg border-destructive/20 bg-destructive/5">
                                <div className="space-y-0.5">
                                    <Label className="text-base text-destructive">Danger Zone</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Clear all data or reset application state.
                                    </p>
                                </div>
                                <Button variant="destructive" size="sm" onClick={handleClearData}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Reset App
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Shortcuts Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-lg font-semibold border-b pb-2">
                            <Keyboard className="h-5 w-5" />
                            <h3>Keyboard Shortcuts</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            {/* Navigation */}
                            <div className="col-span-2 text-xs font-semibold text-muted-foreground mt-2">Navigation</div>
                            <div className="flex justify-between items-center p-2 rounded bg-muted/50">
                                <span>Command Palette</span>
                                <div className="flex gap-1">
                                    <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">⌘P</kbd>
                                </div>
                            </div>
                            <div className="flex justify-between items-center p-2 rounded bg-muted/50">
                                <span>Focus Mode</span>
                                <div className="flex gap-1">
                                    <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">F</kbd>
                                    <span className="text-muted-foreground/50">/</span>
                                    <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">⌘1</kbd>
                                </div>
                            </div>
                            <div className="flex justify-between items-center p-2 rounded bg-muted/50">
                                <span>Queue View</span>
                                <div className="flex gap-1">
                                    <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">Q</kbd>
                                    <span className="text-muted-foreground/50">/</span>
                                    <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">⌘2</kbd>
                                </div>
                            </div>
                            {/* ... (Other shortcuts can be added back if needed, but this is a good start) */}
                        </div>
                    </div>

                    {/* About Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-lg font-semibold border-b pb-2">
                            <Info className="h-5 w-5" />
                            <h3>About Monocle</h3>
                        </div>

                        <div className="space-y-2 text-sm text-muted-foreground">
                            <div className="flex justify-between py-2 border-b border-border/50">
                                <span>Version</span>
                                <span className="font-mono text-foreground">v0.12.0 (Beta)</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-border/50">
                                <span>Build</span>
                                <span className="font-mono text-foreground">Sprint 22</span>
                            </div>
                            <p className="pt-4 leading-relaxed">
                                Monocle is designed to help you focus on one task at a time.
                            </p>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
