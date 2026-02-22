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
import { Plus } from 'lucide-react';
import { OnboardingSlideshow } from '@/components/onboarding-slideshow';

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
      <header className="w-full h-16 border-b flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm sticky top-0 z-10 transition-all">
        {/* Left: Hamburger */}
        <div className="flex items-center gap-3">
          <NavMenu />
        </div>

        {/* Center: Monocle Logo Focus Trigger */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
          <button
            onClick={() => setView('focus')}
            className="flex items-center justify-center transition-transform hover:scale-105 active:scale-95 group"
            title="Enter Focus Mode"
          >
            <LogoSmall className="hidden sm:flex group-hover:drop-shadow-[0_0_12px_rgba(var(--primary),0.5)] transition-all" />
            <LogoSmall className="sm:hidden group-hover:drop-shadow-[0_0_12px_rgba(var(--primary),0.5)] transition-all" showText={false} />
          </button>
        </div>

        {/* Right: Add + View Selector + Project Dropdown */}
        <div className="flex items-center gap-2 max-w-[50%] justify-end pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2">
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
              className="rounded-full shadow-sm bg-primary/90 hover:bg-primary px-3 sm:px-4 shrink-0 transition-transform active:scale-95"
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Capture</span>
            </Button>

            <div className="hidden sm:block w-px h-6 bg-border mx-1 sm:mx-2" />
            <div className="hidden sm:block">
              <ViewSelector />
            </div>
          </div>
        </div>

        {/* Right: Project Dropdown & Momentum (Desktop Only) */}
        <div className="hidden sm:flex items-center gap-4">
          <MomentumMeter />
          <ProjectSelect />
        </div>
      </header>

      {/* Main Content (Always render Queue or Drafts underneath) */}
      <div className="w-full flex-1 flex flex-col items-center justify-center">
        {view === 'capture' ? (
          <div className="w-full h-full flex items-center justify-center pt-4 md:pt-8 relative z-0">
            <CaptureView />
          </div>
        ) : view === 'analytics' ? (
          <div className="w-full flex-1 pt-12">
            <AnalyticsView />
          </div>
        ) : view === 'ideas' ? (
          <QueueView variant="fullscreen" mode="drafts" />
        ) : (
          <QueueView variant="fullscreen" mode="active" />
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
    </main >
  );
}
