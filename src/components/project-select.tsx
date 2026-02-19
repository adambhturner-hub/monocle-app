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

export function ProjectSelect() {
    const { projects, activeProject, setActiveProject } = useMonocleStore();
    const [managerOpen, setManagerOpen] = useState(false);

    const activeProjectData = projects.find((p) => p.id === activeProject);

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2 min-w-[150px] justify-between h-9 bg-secondary/30 hover:bg-secondary/50 border-transparent hover:border-border transition-all">
                        <span className="flex items-center gap-2 truncate">
                            {activeProjectData ? (
                                <>
                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: activeProjectData.color }} />
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
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />
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
