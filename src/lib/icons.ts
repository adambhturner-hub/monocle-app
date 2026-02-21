import {
    Folder,
    Briefcase,
    Home,
    Code,
    Heart,
    Book,
    Star,
    Zap,
    Target,
    Globe,
    Music,
    Camera,
    Cpu,
    Coffee,
    Flame,
    Rocket,
    Activity,
    Cloud,
    LucideIcon
} from 'lucide-react';

export const PROJECT_ICONS: Record<string, LucideIcon> = {
    Folder,
    Briefcase,
    Home,
    Code,
    Heart,
    Book,
    Star,
    Zap,
    Target,
    Globe,
    Music,
    Camera,
    Cpu,
    Coffee,
    Flame,
    Rocket,
    Activity,
    Cloud
};

export const getIconComponent = (iconName?: string): LucideIcon => {
    if (!iconName) return Folder;
    return PROJECT_ICONS[iconName] || Folder;
};
