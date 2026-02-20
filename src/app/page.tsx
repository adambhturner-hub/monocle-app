'use client';

import { FocusView } from '@/components/focus-view';
import { ProjectSelect } from '@/components/project-select';
import { QueueView } from '@/components/queue-view';
import { ArchiveView } from '@/components/archive-view';
import { NavMenu } from '@/components/nav-menu';
import { AddTaskModal } from '@/components/add-task-modal';
import { ViewSelector } from '@/components/view-selector';
import { ShortcutsHelp } from '@/components/shortcuts-help';
import { GlobalShortcuts } from '@/components/global-shortcuts';
import { useMonocleStore } from '@/lib/store';
import { SettingsView } from '@/components/settings-view';
import { StatsView } from '@/components/stats-view';
import { LogoSmall } from '@/components/logo';
import { ProjectManager } from '@/components/project-manager';
import { MomentumMeter } from '@/components/momentum-meter';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function Home() {
  const { view, activeSheet, setOpenSheet, activeModal, setActiveModal, setView } = useMonocleStore();

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-6 md:p-12 lg:p-24 bg-background relative overflow-hidden">
      {/* Background Gradient */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />

      {/* Header */}
      <header className="w-full h-16 border-b flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm sticky top-0 z-10 transition-all">
        {/* Left: Hamburger + Logo */}
        <div className="flex items-center gap-3">
          <NavMenu />
          <LogoSmall className="hidden sm:flex" />
          <LogoSmall className="sm:hidden" showText={false} />
        </div>

        {/* Center: Add + View Selector */}
        <div className="flex items-center gap-2 sm:absolute sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:justify-center pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2">
            <AddTaskModal
              open={activeModal === 'add-task'}
              onOpenChange={(val) => setActiveModal(val ? 'add-task' : null)}
            />
            <ProjectManager
              open={activeModal === 'project-manager'}
              onOpenChange={(val) => setActiveModal(val ? 'project-manager' : null)}
            />

            {/* Add Task Button - Icon Only on Mobile */}
            <Button
              onClick={() => setActiveModal('add-task')}
              size="sm"
              className="rounded-full shadow-sm bg-primary/90 hover:bg-primary px-3 sm:px-4 shrink-0 transition-transform active:scale-95"
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Task</span>
            </Button>

            <div className="w-px h-6 bg-border mx-1 sm:mx-2" />
            <ViewSelector />
          </div>
        </div>

        {/* Right: Project Dropdown & Momentum */}
        <div className="flex items-center gap-4">
          <MomentumMeter className="hidden sm:block" />
          <ProjectSelect />
        </div>
      </header>

      {/* Main Content (Always render Queue or Drafts underneath) */}
      <div className="w-full flex-1 flex flex-col items-center justify-center">
        {view === 'ideas' ? (
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

    </main >
  );
}
