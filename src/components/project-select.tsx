import { useState } from 'react';
import { useMonocleStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Folder, Settings2 } from 'lucide-react';
import { ProjectManager } from '@/components/project-manager';
import { cn } from '@/lib/utils';
import { getIconComponent } from '@/lib/icons';

export interface ProjectSelectProps {
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    className?: string;
}

export function ProjectSelect({ variant = "outline", className }: ProjectSelectProps = {}) {
    const { projects, activeProject, setActiveProject } = useMonocleStore();
    const [managerOpen, setManagerOpen] = useState(false);

    const activeProjectData = projects.find((p) => p.id === activeProject);

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant={variant} className={cn("gap-2 min-w-[150px] justify-between h-9 bg-secondary/30 hover:bg-secondary/50 border-transparent hover:border-border transition-all", className)}>
                        <span className="flex items-center gap-2 truncate">
                            {activeProjectData ? (
                                <>
                                    <div className="flex items-center justify-center shrink-0 w-4 h-4 rounded-sm" style={{ backgroundColor: activeProjectData.color }}>
                                        {(() => {
                                            const IconCmp = getIconComponent(activeProjectData.icon);
                                            return <IconCmp className="h-2.5 w-2.5 text-white drop-shadow-sm" />;
                                        })()}
                                    </div>
                                    {activeProjectData.name}
                                </>
                            ) : (
                                <>
                                    <Folder className="h-4 w-4 text-muted-foreground" />
                                    All Projects
                                </>
                            )}
                        </span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Filter by Project</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={() => setActiveProject(null)} className="gap-2">
                        <Folder className="h-4 w-4 text-muted-foreground" />
                        All Projects
                        {!activeProject && <span className="ml-auto text-primary text-xs">●</span>}
                    </DropdownMenuItem>

                    {projects.map((project) => (
                        <DropdownMenuItem
                            key={project.id}
                            onClick={() => setActiveProject(project.id)}
                            className="gap-2"
                        >
                            <div className="flex items-center justify-center shrink-0 w-4 h-4 rounded-sm" style={{ backgroundColor: project.color }}>
                                {(() => {
                                    const IconCmp = getIconComponent(project.icon);
                                    return <IconCmp className="h-2.5 w-2.5 text-white drop-shadow-sm" />;
                                })()}
                            </div>
                            <span className="truncate flex-1">{project.name}</span>
                            {activeProject === project.id && <span className="text-primary text-xs">●</span>}
                        </DropdownMenuItem>
                    ))}

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setManagerOpen(true); }}>
                        <Settings2 className="mr-2 h-4 w-4" /> Manage Projects...
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <ProjectManager open={managerOpen} onOpenChange={setManagerOpen} />
        </>
    );
}
