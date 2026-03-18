import { useState } from 'react';
import { useMonocleStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
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
    const [open, setOpen] = useState(false);

    const activeProjectData = projects.find((p) => p.id === activeProject);

    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
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
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[80vw] sm:w-[300px] p-0 shadow-xl border bg-card rounded-xl overflow-hidden ring-1 ring-white/5 pb-1">
                    <Command className="bg-transparent">
                        <CommandInput placeholder="Search Categories..." className="h-11 border-none focus:ring-0 text-[16px] sm:text-sm" />
                        <CommandList className="max-h-[50vh] overflow-y-auto overscroll-contain pb-2">
                            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">No Categories found.</CommandEmpty>
                            <div className="px-2 pt-2">
                                <CommandGroup>
                                    <CommandItem 
                                        value="all projects default"
                                        onSelect={() => { setActiveProject(null); setOpen(false); }} 
                                        className="gap-2 cursor-pointer items-center min-h-[44px] sm:min-h-[36px] rounded-lg mb-1 aria-selected:bg-secondary/50"
                                    >
                                        <div className="flex items-center justify-center shrink-0 w-6 h-6 sm:w-5 sm:h-5 bg-muted rounded flex-none shadow-sm">
                                            <Folder className="h-3 w-3 sm:h-3 sm:w-3 text-muted-foreground" />
                                        </div>
                                        <span className="text-[16px] sm:text-sm flex-1 truncate font-medium">All Projects</span>
                                        {!activeProject && <span className="ml-auto text-primary text-xs shrink-0">●</span>}
                                    </CommandItem>
                                </CommandGroup>
                            </div>
                            
                            <CommandSeparator className="my-1 bg-border/50" />
                            
                            <div className="px-2">
                                <CommandGroup heading={<span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase px-1">Categories</span>}>
                                    <div className="mt-1 flex flex-col gap-1">
                                        {projects.map((project) => (
                                            <CommandItem
                                                key={project.id}
                                                value={project.name}
                                                onSelect={() => { setActiveProject(project.id); setOpen(false); }}
                                                className="gap-2 cursor-pointer items-center min-h-[44px] sm:min-h-[36px] rounded-lg aria-selected:bg-secondary/50"
                                            >
                                                <div className="flex items-center justify-center shrink-0 w-6 h-6 sm:w-5 sm:h-5 rounded flex-none shadow-sm" style={{ backgroundColor: project.color }}>
                                                    {(() => {
                                                        const IconCmp = getIconComponent(project.icon);
                                                        return <IconCmp className="h-3.5 w-3.5 sm:h-3 sm:w-3 text-white drop-shadow-sm" />;
                                                    })()}
                                                </div>
                                                <span className="text-[16px] sm:text-sm flex-1 truncate">{project.name}</span>
                                                {activeProject === project.id && <span className="text-primary text-xs shrink-0">●</span>}
                                            </CommandItem>
                                        ))}
                                    </div>
                                </CommandGroup>
                            </div>
                            
                            <CommandSeparator className="my-1 bg-border/50" />
                            
                            <div className="px-2 pb-1">
                                <CommandGroup>
                                    <CommandItem 
                                        value="manage projects settings config"
                                        onSelect={() => { setManagerOpen(true); setOpen(false); }}
                                        className="cursor-pointer text-muted-foreground min-h-[44px] sm:min-h-[36px] rounded-lg mt-1 aria-selected:bg-secondary/50"
                                    >
                                        <Settings2 className="mr-3 h-4 w-4 shrink-0" /> 
                                        <span className="text-[16px] sm:text-sm">Manage Categories...</span>
                                    </CommandItem>
                                </CommandGroup>
                            </div>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            <ProjectManager open={managerOpen} onOpenChange={setManagerOpen} />
        </>
    );
}
