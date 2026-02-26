
'use client';

import { useState, useRef } from 'react';
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
import { Moon, Sun, Laptop, Trash2, Download, Upload, Info, Keyboard, List, Calendar, Clock, Target, Volume2, Mic, Activity, RefreshCw, PlaySquare } from 'lucide-react';
import { useMonocleStore } from '@/lib/store';
import { toast } from 'sonner';
import { soundEngine } from '@/lib/sound-engine';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { del } from 'idb-keyval';
import { formatDistanceToNow } from 'date-fns';
import { FeedbackModal } from './feedback-modal';

interface SettingsViewProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SettingsView({ open, onOpenChange }: SettingsViewProps) {
    const { setTheme, theme } = useTheme();
    const { tasks, projects, settings, updateSettings, clearData, lastSyncTime } = useMonocleStore();
    const [testSoundPlaying, setTestSoundPlaying] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            // 1. Wipe local state so UI reflects it immediately
            // Doing this first prevents the UI from freezing if the Firebase offline queue is completely locked up.
            clearData();
            toast.success("Local data wiped. If sync remains stuck, go to Account & Sync -> Repair Sync.");

            // 2. Fire and forget the cloud wipe (do not await, to prevent UI freeze)
            if (auth.currentUser) {
                try {
                    const { doc, setDoc } = await import('firebase/firestore');
                    const { db } = await import('@/lib/firebase');
                    const userDocRef = doc(db, 'users', auth.currentUser.uid);
                    setDoc(userDocRef, {
                        tasks: [],
                        projects: [],
                        sessionHistory: [],
                        settings: { ...settings, hasSeenOnboarding: true },
                        deletedIds: [],
                        lastModified: Date.now()
                    }).catch((e: any) => console.error("Failed to wipe cloud document (ignoring for UI)", e));
                } catch (e) {
                    console.error("Failed to load Firebase chunks", e);
                }
            }
        }
    };

    const handleRepairDatabase = async () => {
        if (confirm("This will clear the local Firebase network cache and completely reload the app. Use this if sync is frozen. Continue?")) {
            toast.loading("Repairing database...");
            try {
                const { terminate, clearIndexedDbPersistence } = await import('firebase/firestore');
                const { db } = await import('@/lib/firebase');
                await terminate(db);
                await clearIndexedDbPersistence(db);
                window.location.reload();
            } catch (e: any) {
                console.error("Failed to clear DB", e);
                toast.error("Failed to repair database", { description: e.message });
                // Fallback: reload anyway
                setTimeout(() => window.location.reload(), 1500);
            }
        }
    };

    const handleSignOut = async () => {
        if (confirm("Are you sure you want to sign out? This will clear local data to protect your privacy.")) {
            try {
                await signOut(auth);
                // Clear state using Zustand after signing out so the sync engine doesn't push the wipe to the cloud
                clearData();
                toast.success("Signed out successfully.");
            } catch (error) {
                console.error("Sign out failed", error);
            }
        }
    };

    const handleExport = async () => {
        const data = {
            tasks,
            projects,
            sessionHistory: useMonocleStore.getState().sessionHistory,
            settings: useMonocleStore.getState().settings,
            exportedAt: new Date().toISOString(),
        };
        const jsonString = JSON.stringify(data, null, 2);
        const defaultFilename = `monocle-backup-${new Date().toISOString().split('T')[0]}.json`;

        if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
            try {
                const { save } = await import('@tauri-apps/plugin-dialog');
                const { writeTextFile } = await import('@tauri-apps/plugin-fs');

                const filePath = await save({
                    defaultPath: defaultFilename,
                    filters: [{ name: 'JSON', extensions: ['json'] }]
                });

                if (filePath) {
                    await writeTextFile(filePath, jsonString);
                    toast.success("Backup saved successfully");
                }
            } catch (err) {
                console.error("Tauri export failed:", err);
                toast.error("Export failed", { description: "Could not save the backup file." });
            }
        } else {
            // Web Fallback
            const blob = new Blob([jsonString], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = defaultFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success("Data exported successfully");
        }
    };

    const runImport = (dataString: string) => {
        try {
            const data = JSON.parse(dataString);

            // Validate schema loosely
            if (!Array.isArray(data.tasks) || !Array.isArray(data.projects)) {
                throw new Error("Invalid backup file format.");
            }

            if (confirm("Are you sure? This will overwrite your current local data with the backup.")) {
                useMonocleStore.getState().loadFromCloud({
                    tasks: data.tasks,
                    projects: data.projects,
                    settings: data.settings || useMonocleStore.getState().settings,
                    sessionHistory: data.sessionHistory || useMonocleStore.getState().sessionHistory,
                });

                toast.success("Backup restored successfully.");
            }
        } catch (err) {
            console.error("Failed to parse backup file", err);
            toast.error("Failed to import data", { description: "The file might be corrupted or in an invalid format." });
        }
    };

    const handleImportClick = async () => {
        if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
            try {
                const { open } = await import('@tauri-apps/plugin-dialog');
                const { readTextFile } = await import('@tauri-apps/plugin-fs');

                const filePath = await open({
                    multiple: false,
                    filters: [{ name: 'JSON', extensions: ['json'] }]
                });

                if (filePath && typeof filePath === 'string') {
                    const contents = await readTextFile(filePath);
                    runImport(contents);
                }
            } catch (err) {
                console.error("Tauri import failed:", err);
                toast.error("Import failed", { description: "Could not read the backup file." });
            }
        } else {
            // Web Fallback triggers the hidden file input
            fileInputRef.current?.click();
        }
    };

    const handleWebImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            if (typeof event.target?.result === 'string') {
                runImport(event.target.result);
            }
            // Reset input so the same file can be selected again
            e.target.value = '';
        };
        reader.readAsText(file);
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
                                    <p className="text-xs text-muted-foreground font-mono mt-1">
                                        UID: {auth.currentUser?.uid}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Provider: {auth.currentUser?.providerData?.[0]?.providerId === 'google.com' ? 'Google' : 'Email/Password'}
                                    </p>
                                    <p className="text-xs text-muted-foreground/70 flex items-center gap-1 mt-2">
                                        <RefreshCw className="h-3 w-3" />
                                        Last synced: {lastSyncTime ? formatDistanceToNow(lastSyncTime, { addSuffix: true }) : 'Never'}
                                    </p>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Button variant="default" size="sm" onClick={handleForceSync} disabled={isSyncing} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                        {isSyncing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                                        Force Sync
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={handleRepairDatabase} className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:hover:bg-red-900/20 dark:text-red-400">
                                        Repair Sync
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

                            <Separator />

                            <div className="flex items-center justify-between">
                                <Label className="flex flex-col gap-1">
                                    <span>Interactive Tutorial</span>
                                    <span className="font-normal text-muted-foreground text-xs">Replay the onboarding sequence</span>
                                </Label>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        updateSettings({ hasSeenOnboarding: false });
                                        onOpenChange(false);
                                    }}
                                >
                                    <PlaySquare className="h-4 w-4 mr-2" />
                                    Replay
                                </Button>
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



                    {/* Focus Engine Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-lg font-semibold border-b pb-2">
                            <Target className="h-5 w-5" />
                            <h3>Focus Engine</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="night-shift" className="flex flex-col gap-1">
                                    <span>Night Shift Sweep</span>
                                    <span className="font-normal text-muted-foreground text-xs pr-4">
                                        Automatically move uncompleted Active tasks back to the Idea Dump at midnight for a pristine morning queue.
                                    </span>
                                </Label>
                                <Switch
                                    id="night-shift"
                                    checked={settings.nightShiftSweep}
                                    onCheckedChange={(checked) => updateSettings({ nightShiftSweep: checked })}
                                />
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

                            <div className="flex flex-col gap-4 p-4 border rounded-lg bg-secondary/10 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] pointer-events-none" />
                                <div className="space-y-0.5">
                                    <Label className="text-base">Export & Import Data</Label>
                                    <p className="text-sm text-muted-foreground w-11/12">
                                        Download a hard JSON backup of your tasks and projects, or restore a previous backup.
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={handleExport} className="flex-1 bg-background hover:bg-secondary/50">
                                        <Download className="mr-2 h-4 w-4 text-muted-foreground" />
                                        Export JSON
                                    </Button>

                                    <input
                                        type="file"
                                        accept=".json"
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={handleWebImport}
                                    />
                                    <Button variant="outline" size="sm" onClick={handleImportClick} className="flex-1 bg-background hover:bg-secondary/50">
                                        <Upload className="mr-2 h-4 w-4 text-muted-foreground" />
                                        Import JSON
                                    </Button>
                                </div>
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

                    {/* About Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-lg font-semibold border-b pb-2">
                            <Info className="h-5 w-5" />
                            <h3>About Monocle</h3>
                        </div>

                        <div className="space-y-2 text-sm text-muted-foreground">
                            <div className="flex justify-between py-2 border-b border-border/50">
                                <span>Version</span>
                                <span className="font-mono text-foreground">v1.0.0 (Launch)</span>
                            </div>

                            <div className="pt-4 leading-relaxed flex flex-col gap-4">
                                <p>
                                    Monocle is not another to-do list. It's an execution chamber. Dump your brain into the Queue. Enter Focus Mode. One task. No drift.
                                </p>

                                <div className="p-4 bg-muted/30 border rounded-lg text-xs leading-relaxed space-y-3">
                                    <div>
                                        <span className="font-semibold text-foreground block mb-1">Known Limitations</span>
                                        <ul className="list-disc pl-4 text-muted-foreground space-y-1">
                                            <li><span className="text-foreground font-medium">Offline-first by design:</span> Data is stored locally on this device via IndexedDB.</li>
                                            <li>Cross-device sync is planned for a future release.</li>
                                            <li>Best experienced in Focus Mode.</li>
                                        </ul>
                                    </div>
                                    <div className="pt-2 border-t border-border/50">
                                        <span className="font-semibold text-foreground block mb-1">Privacy Guarantee</span>
                                        Monocle stores your data locally in your browser. No data is sold. No tracking. We respect your focus and your data.
                                    </div>
                                </div>

                                <Button variant="outline" className="w-full" onClick={() => setIsFeedbackOpen(true)}>
                                    Send Feedback
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </SheetContent>
            <FeedbackModal open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen} />
        </Sheet>
    );
}
