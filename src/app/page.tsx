'use client';

import { useEffect, useState } from 'react';
import { FocusView } from '@/components/focus-view';
import { ProjectSelect } from '@/components/project-select';
import { QueueView } from '@/components/queue-view';
import { ArchiveView } from '@/components/archive-view';
import { NavMenu } from '@/components/nav-menu';
import { AddTaskModal } from '@/components/add-task-modal';
import { ViewSelector } from '@/components/view-selector';
import { CaptureView } from '@/components/capture-view';
import { ShortcutsHelp } from '@/components/shortcuts-help';
import { GlobalShortcuts } from '@/components/global-shortcuts';
import { useMonocleStore } from '@/lib/store';
import { SettingsView } from '@/components/settings-view';
import { StatsView } from '@/components/stats-view';
import { AnalyticsView } from '@/components/analytics-view';
import { LogoSmall } from '@/components/logo';
import { ProjectManager } from '@/components/project-manager';
import { MomentumMeter } from '@/components/momentum-meter';
import { Button } from '@/components/ui/button';
import { Plus, Command, ListTodo, Target, PenLine } from 'lucide-react';
import { OnboardingSlideshow } from '@/components/onboarding-slideshow';
import { SyncIndicator } from '@/components/ui/sync-indicator';
import { cn } from '@/lib/utils';

export default function Home() {
  const { view, activeSheet, setOpenSheet, activeModal, setActiveModal, setView, getVisibleTasks, isHydrated } = useMonocleStore();
  const [isMounted, setIsMounted] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Initialize and force capture on load, ensuring hydration is complete
  useEffect(() => {
    setIsMounted(true);

    // Minimum artificial delay for splash screen branding
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  // Set initial view ONLY after hydration to avoid persist middleware overwriting it
  useEffect(() => {
    if (isHydrated && isMounted) {
      setView('capture');
    }
    // We only want this to run once when hydrated becomes true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated]);

  if (!isMounted || showSplash || !isHydrated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-12 lg:p-24 bg-background relative overflow-hidden">
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />
        <div className="animate-in fade-in zoom-in-95 duration-700 delay-100 fill-mode-both">
          <LogoSmall className="scale-[2]" showText={false} />
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-6 md:p-12 lg:p-24 bg-background relative overflow-hidden animate-in fade-in duration-700">
      {/* Background Gradient */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />

      {/* Header */}
      <header className="w-full h-16 border-b flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm sticky top-0 z-10 transition-all relative">
        {/* Left: Hamburger (+ extra items for symmetry) */}
        <div className="flex-1 basis-0 min-w-0 flex items-center justify-start gap-3 relative z-20">
          <NavMenu />

          <SyncIndicator />

          <div className="hidden sm:block w-px h-6 bg-border mx-1 shrink-0" />

          <button
            onClick={() => {
              document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
            }}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
            title="Command Palette"
          >
            <Command className="h-4 w-4" />
            <span>K</span>
          </button>
        </div>

        {/* Center: Monocle Logo Focus Trigger */}
        <div className="shrink-0 flex items-center justify-center pointer-events-auto z-30 relative px-4">
          <button
            onClick={() => setView('focus')}
            className="flex items-center justify-center transition-transform hover:scale-105 active:scale-95 group"
            title="Enter Focus Mode"
          >
            <LogoSmall className="hidden sm:flex group-hover:drop-shadow-[0_0_12px_rgba(var(--primary),0.5)] transition-all" />
            <LogoSmall className="sm:hidden group-hover:drop-shadow-[0_0_12px_rgba(var(--primary),0.5)] transition-all" showText={false} />
          </button>
        </div>

        {/* Right: Actions, View Selector, Project Dropdown */}
        <div className="flex-1 basis-0 min-w-0 flex items-center justify-end gap-2 sm:gap-4 overflow-x-auto no-scrollbar py-2 relative z-20">
          <div className="flex items-center gap-2 shrink-0">
            <AddTaskModal
              open={activeModal === 'add-task'}
              onOpenChange={(val) => setActiveModal(val ? 'add-task' : null)}
            />
            <ProjectManager
              open={activeModal === 'project-manager'}
              onOpenChange={(val) => setActiveModal(val ? 'project-manager' : null)}
            />

            {/* Add Task Button - Routes to Capture Mode */}
            <Button
              onClick={() => setView('capture')}
              size="sm"
              className="rounded-full shadow-sm bg-primary/90 hover:bg-primary px-3 sm:px-4 transition-transform active:scale-95 shrink-0"
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Capture</span>
            </Button>

            <div className="hidden sm:block w-px h-6 bg-border mx-1 shrink-0" />
            <div className="hidden sm:block shrink-0">
              <ViewSelector />
            </div>

            <div className="hidden lg:flex items-center gap-4 shrink-0 pl-1">
              <MomentumMeter />
              <ProjectSelect />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content (Always render Queue or Drafts underneath) */}
      {/* We add pb-20 on mobile to account for the bottom nav bar */}
      <div className="w-full flex-1 flex flex-col items-center justify-center pb-20 sm:pb-0">
        {view === 'capture' ? (
          <div className="w-full h-full flex items-center justify-center pt-4 md:pt-8 relative z-0">
            <CaptureView />
          </div>
        ) : view === 'analytics' ? (
          <div className="w-full flex-1 pt-12">
            <AnalyticsView />
          </div>
        ) : (
          <QueueView variant="fullscreen" />
        )}
      </div>

      {/* Focus Mode Overlay */}
      {view === 'focus' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md animate-in fade-in duration-300">
          {/* Close by clicking backdrop is handled inside FocusView for better separation, or we can handle it here if we pass onExit */}
          <FocusView onExit={() => setView('queue')} />
        </div>
      )}

      {/* Sheets / Overlays */}
      <QueueView variant="sheet" />
      <ArchiveView />
      <ShortcutsHelp />
      <GlobalShortcuts />

      {/* Settings & Archive Sheets (Controlled by Global Store) */}
      <SettingsView open={activeSheet === 'settings'} onOpenChange={(open) => setOpenSheet(open ? 'settings' : null)} />
      <ArchiveView /> {/* ArchiveView controls its own open state via activeSheet check internally? Let's check. Yes it does. */}
      <StatsView />

      <OnboardingSlideshow />

      {/* Mobile Bottom Navigation */}
      <div className="sm:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-xl border border-border shadow-lg z-[60] flex items-center justify-between px-2 py-2 rounded-full w-[90%] max-w-[320px]">
        <button 
          onClick={() => setView('queue')} 
          className={cn(
            "flex flex-col items-center justify-center gap-1 w-20 h-12 rounded-full transition-colors", 
            view === 'queue' ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800"
          )}
        >
          <ListTodo className="h-5 w-5" />
          <span className="text-[9px] font-bold tracking-wider uppercase">Queue</span>
        </button>
        
        <button 
          onClick={() => setView('capture')} 
          className={cn(
            "flex flex-col items-center justify-center gap-1 w-20 h-12 rounded-full transition-colors", 
            view === 'capture' ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800"
          )}
        >
          <PenLine className="h-5 w-5" />
          <span className="text-[9px] font-bold tracking-wider uppercase">Capture</span>
        </button>
        
        <button 
          onClick={() => setView('focus')} 
          className={cn(
            "flex flex-col items-center justify-center gap-1 w-20 h-12 rounded-full transition-colors", 
            view === 'focus' ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800"
          )}
        >
          <Target className="h-5 w-5" />
          <span className="text-[9px] font-bold tracking-wider uppercase">Focus</span>
        </button>
      </div>
    </main >
  );
}
