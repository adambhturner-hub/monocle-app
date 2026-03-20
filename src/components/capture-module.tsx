'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useMonocleStore } from '@/lib/store';
import { parseTaskInput, ParsedTask } from '@/lib/smart-parser';
import { generateId } from '@/lib/utils';
import { Task } from '@/types';
import TextareaAutosize from 'react-textarea-autosize';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Calendar as CalendarIcon, AlertCircle, Repeat, Plus, Target, Layers, Lightbulb, ChevronDown, ChevronUp, Folder, Save, Zap, Hourglass, Image as ImageIcon, Loader2, X, Sparkles, Mic } from 'lucide-react';
import { SwipeableTask } from './ui/swipeable-task';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as CalendarComponent } from './ui/calendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getIconComponent, PROJECT_ICONS } from '@/lib/icons';
import { Textarea } from './ui/textarea';
import { useMentions } from '@/hooks/use-mentions';
import { MentionsList, MentionOption } from './mentions-list';
import { toast } from 'sonner';
import { uploadTaskAttachment } from '@/lib/storage';
import { auth } from '@/lib/firebase';

import { ParsedToken } from '@/lib/smart-parser';

const renderHighlightedText = (text: string, matchedTokens: ParsedToken[]) => {
    if (!text || !matchedTokens || matchedTokens.length === 0) return <span>{text}</span>;

    const sortedTokens = [...matchedTokens].sort((a, b) => b.text.length - a.text.length);
    const escapedTokens = sortedTokens.map(token => token.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(${escapedTokens.join('|')})`, 'gi');

    const parts = text.split(regex);

    return parts.map((part, i) => {
        const tokenMatch = sortedTokens.find(token => part.toLowerCase() === token.text.toLowerCase());

        if (tokenMatch) {
            let colorClass = "bg-primary/20 text-transparent";
            switch (tokenMatch.type) {
                case 'frog': colorClass = "bg-green-500/20 text-transparent"; break;
                case 'lightning': colorClass = "bg-amber-500/20 text-transparent"; break;
                case 'date': colorClass = "bg-purple-500/20 text-transparent"; break;
                case 'priority': colorClass = "bg-red-500/20 text-transparent"; break;
                case 'recurrence': colorClass = "bg-blue-500/20 text-transparent"; break;
                case 'duration': colorClass = "bg-slate-500/30 text-transparent"; break;
                case 'project': colorClass = "bg-primary/20 text-transparent"; break;
                case 'waiting': colorClass = "bg-slate-500/20 text-transparent"; break;
                case 'habit': colorClass = "bg-orange-500/20 text-transparent"; break;
                case 'idea': colorClass = "bg-purple-500/20 text-transparent"; break;
            }

            return (
                <span key={i} className={cn(colorClass, "rounded-sm transition-colors duration-200")} style={tokenMatch.type === 'project' && tokenMatch.color ? { backgroundColor: `${tokenMatch.color}33` } : undefined}>
                    {part}
                </span>
            );
        }
        return <span key={i} className="text-transparent">{part}</span>;
    });
};

const COLORS = [
    '#ef4444', // Red 500
    '#f97316', // Orange 500
    '#eab308', // Yellow 500
    '#22c55e', // Green 500
    '#06b6d4', // Cyan 500
    '#3b82f6', // Blue 500
    '#8b5cf6', // Violet 500
    '#d946ef', // Fuchsia 500
    '#64748b', // Slate 500
    '#f43f5e', // Rose 500
    '#f59e0b', // Amber 500
    '#84cc16', // Lime 500
    '#10b981', // Emerald 500
    '#14b8a6', // Teal 500
    '#0ea5e9', // Sky 500
    '#6366f1', // Indigo 500
    '#a855f7', // Purple 500
    '#ec4899', // Pink 500
    '#71717a', // Zinc 500
    '#111827', // Gray 900
];

export interface CaptureModuleProps {
    taskToEdit?: Task;
    onComplete?: () => void;
    isModal?: boolean;
}

export function CaptureModule({ taskToEdit, onComplete, isModal = false }: CaptureModuleProps) {
    const { addTask, updateTask, updateProject, projects, setView, deleteTask, draftTaskData, setDraftTaskData, activeProject, setActiveModal } = useMonocleStore();

    const isEditMode = !!taskToEdit;

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [projectId, setProjectId] = useState<string>('all');
    const [launchDate, setLaunchDate] = useState<Date | undefined>(undefined);
    const [recurrence, setRecurrence] = useState<string>('none');

    const [parsedData, setParsedData] = useState<ParsedTask | null>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [isFrog, setIsFrog] = useState(false);
    const [isLightning, setIsLightning] = useState(false);
    const [attachments, setAttachments] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isParsing, setIsParsing] = useState(false);

    // Speech Recognition State
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);
    const preListenTitleRef = useRef('');

    useEffect(() => {
        if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;

            recognitionRef.current.onstart = () => setIsListening(true);
            recognitionRef.current.onend = () => setIsListening(false);
            recognitionRef.current.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
                if (event.error === 'not-allowed') {
                    toast.error("Microphone access denied. Please allow permissions in your browser.");
                }
            };

            recognitionRef.current.onresult = (event: any) => {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = 0; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                const prefix = preListenTitleRef.current ? preListenTitleRef.current + (preListenTitleRef.current.endsWith(' ') ? '' : ' ') : '';
                const fullText = prefix + finalTranscript + interimTranscript;
                
                const submitRegex = /\b(?:save|add|submit|create)\s*(?:task|it)?\b\.?$/i;
                if (submitRegex.test(fullText.trim())) {
                    const cleanTitle = fullText.trim().replace(submitRegex, '').trim();
                    setTitle(cleanTitle);
                    
                    if (recognitionRef.current) {
                        recognitionRef.current.stop();
                        setIsListening(false);
                    }
                    
                    const syncParsedData = parseTaskInput(cleanTitle, useMonocleStore.getState().projects);
                    submitTask(isModal ? 'capture' : 'queue', cleanTitle, syncParsedData);
                } else {
                    setTitle(fullText);
                }
            };
        }
    }, []);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            if (recognitionRef.current) {
                preListenTitleRef.current = title;
                recognitionRef.current.start();
            } else {
                toast.error("Voice dictation is not supported in this browser.");
            }
        }
    };

    // Initializer for Edit Mode or Undo Drafts
    useEffect(() => {
        setParsedData(null);
        if (taskToEdit) {
            setTitle(taskToEdit.title);
            setDescription(taskToEdit.description || '');
            setPriority(taskToEdit.priority);
            setProjectId(taskToEdit.projectId || 'all');
            setLaunchDate(taskToEdit.launchDate ? new Date(taskToEdit.launchDate) : undefined);
            setRecurrence(taskToEdit.recurrence?.toString() || 'none');
            setIsFrog(taskToEdit.isFrog || false);
            setIsLightning(taskToEdit.isLightning || false);
            setAttachments(taskToEdit.attachments || []);
            if (taskToEdit.description || taskToEdit.recurrence || taskToEdit.launchDate || (taskToEdit.attachments && taskToEdit.attachments.length > 0)) {
                setAdvancedOpen(true);
            }
        } else {
            setTitle('');
            setDescription('');
            setPriority('medium');
            setProjectId(activeProject || 'all');
            setLaunchDate(undefined);
            setRecurrence('none');
            setIsFrog(false);
            setAdvancedOpen(false);

            if (draftTaskData) {
                setTitle(draftTaskData.title || '');
                setDescription(draftTaskData.description || '');
                setPriority(draftTaskData.priority || 'medium');
                setProjectId(draftTaskData.projectId || activeProject || 'all');
                if (draftTaskData.launchDate) setLaunchDate(new Date(draftTaskData.launchDate));
                setRecurrence(draftTaskData.recurrence?.toString() || 'none');
                setIsFrog(draftTaskData.isFrog || false);
                setIsLightning(draftTaskData.isLightning || false);
                setAttachments(draftTaskData.attachments || []);
                if (draftTaskData.description || draftTaskData.recurrence || draftTaskData.launchDate || (draftTaskData.attachments && draftTaskData.attachments.length > 0)) {
                    setAdvancedOpen(true);
                }
                setDraftTaskData(null);
            }
        }
        setTimeout(() => inputRef.current?.focus(), 100);
    }, [taskToEdit, activeProject, draftTaskData]);

    // Mentions
    const { activeTrigger, filterText, isOpen: isMentionsOpen, onInputChange: onMentionChange, triggerIndex, closeMentions } = useMentions({ inputRef: inputRef as any });
    const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);

    const mentionOptions: MentionOption[] = useMemo(() => {
        if (!activeTrigger) return [];
        const lowerFilter = filterText.toLowerCase();

        if (activeTrigger === '#') {
            const matches = projects
                .filter(p => p.name.toLowerCase().includes(lowerFilter))
                .slice(0, 5)
                .map(p => ({
                    label: p.name,
                    value: p.id,
                    icon: <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                }));

            // Check if exact match exists
            const exactMatch = projects.find(p => p.name.toLowerCase() === lowerFilter);
            if (lowerFilter.length > 0 && !exactMatch) {
                // Add a "create new" option
                matches.push({
                    label: `Create "${filterText}"...`,
                    value: `create_${filterText}`,
                    icon: <Plus className="w-3 h-3 text-muted-foreground" />
                });
            }

            return matches;
        }
        if (activeTrigger === '!') {
            const priorities = [
                { label: 'high', value: 'high', icon: <AlertCircle className="w-3 h-3 text-red-500" /> },
                { label: 'medium', value: 'medium', icon: <AlertCircle className="w-3 h-3 text-yellow-500" /> },
                { label: 'low', value: 'low', icon: <AlertCircle className="w-3 h-3 text-blue-500" /> }
            ];
            return priorities.filter(p => p.label.includes(lowerFilter));
        }
        return [];
    }, [activeTrigger, filterText, projects]);

    useEffect(() => {
        setMentionSelectedIndex(0);
    }, [mentionOptions.length, activeTrigger]);

    const handleMentionSelect = (option: MentionOption) => {
        const input = inputRef.current;
        if (!input || !activeTrigger) return;

        const text = input.value;
        const before = text.slice(0, triggerIndex);
        const after = text.slice(triggerIndex + 1 + filterText.length);

        if (activeTrigger === '#') {
            const isCreatingNew = option.value.startsWith('create_');
            if (isCreatingNew) {
                const newProjectName = option.value.replace('create_', '');
                const newProjectId = generateId();
                useMonocleStore.getState().addProject({
                    id: newProjectId,
                    name: newProjectName,
                    color: '#6366f1', // Default indigo
                    icon: 'Folder'
                });
                setProjectId(newProjectId);
                toast.success(`Created project "${newProjectName}"`);
            } else {
                setProjectId(option.value);
            }

            // Replace the hashtag string with nothing to strip it out
            const newValue = before + after;
            setTitle(newValue);

            setTimeout(() => {
                input.focus();
                input.setSelectionRange(before.length, before.length);
            }, 0);
        } else {
            const insertion = activeTrigger + option.label + ' ';
            const newValue = before + insertion + after;
            setTitle(newValue);

            setTimeout(() => {
                input.focus();
                const newCursorPos = before.length + insertion.length;
                input.setSelectionRange(newCursorPos, newCursorPos);
            }, 0);
        }

        closeMentions();
    };

    // Parser
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!title.trim()) {
                setParsedData(null);
                return;
            }
            const result = parseTaskInput(title, projects);
            if (result.priority || result.launchDate || result.recurrence || result.projectId || result.isFrog || result.isLightning || result.isWaiting || result.isIdea || result.isHabit) {
                setParsedData(result);
            } else {
                setParsedData(null);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [title, projects]);

    const submitTask = (destination: 'capture' | 'queue' | 'focus' | 'idea' | 'save' | 'archive', overrideTitle?: string, overrideParsedData?: ParsedTask | null) => {
        let currentTitle = overrideTitle !== undefined ? overrideTitle : title;
        let finalTitle = currentTitle.replace(/\u200B/g, '').trim();
        
        const activeParsedData = overrideParsedData !== undefined ? overrideParsedData : parsedData;

        if (activeParsedData?.title) {
            finalTitle = activeParsedData.title.trim();
        }

        if (!finalTitle) {
            toast.error("Task title cannot be empty");
            if (destination === 'queue') setView('queue');
            if (destination === 'focus') setView('focus');
            if (destination === 'idea') setView('ideas');
            if (onComplete) onComplete();
            return;
        }

        let finalPriority = priority;
        let finalDueDate = launchDate?.getTime();
        let finalRecurrence: string | number = recurrence;
        let finalProjectId = projectId === 'all' ? undefined : projectId;
        let finalIsFrog = isFrog;
        let finalIsLightning = isLightning;

        if (activeParsedData) {
            if (activeParsedData.priority) finalPriority = activeParsedData.priority;
            if (activeParsedData.launchDate) finalDueDate = activeParsedData.launchDate;
            if (activeParsedData.recurrence) finalRecurrence = activeParsedData.recurrence;
            if (activeParsedData.projectId) finalProjectId = activeParsedData.projectId;

            if (activeParsedData.isFrog) finalIsFrog = true;
            if (activeParsedData.isLightning) finalIsLightning = true;
        }

        if (isEditMode && taskToEdit) {
            updateTask(taskToEdit.id, {
                title: finalTitle,
                description: description.trim() || undefined,
                priority: finalPriority,
                projectId: finalProjectId,
                launchDate: finalDueDate,
                recurrence: (finalRecurrence === 'none' ? undefined : finalRecurrence) as any,
                isLightning: finalIsLightning,
                isFrog: finalIsFrog,
                isDraft: destination === 'idea' || activeParsedData?.isIdea ? true : (destination === 'queue' || destination === 'focus' ? false : taskToEdit.isDraft),
                status: destination === 'archive' ? 'done' : (activeParsedData?.isWaiting ? 'waiting' : taskToEdit.status),
                attachments: attachments.length > 0 ? attachments : undefined,
            });

            if (destination === 'archive') {
                toast.success("Archived");
            } else if (destination === 'queue') {
                toast.success("Moved to Queue");
            }

            if (onComplete) onComplete();
            return;
        }

        if (activeParsedData?.isHabit && !isEditMode) {
            useMonocleStore.getState().addHabit({
                id: generateId(),
                title: finalTitle,
                streak: 0,
                createdAt: Date.now()
            });

            toast.success("Habit Created", { description: finalTitle });

            if (onComplete) onComplete();
            setTitle('');
            return;
        }

        const taskId = generateId();
        const newTask: Task = {
            id: taskId,
            title: finalTitle,
            description: description.trim() || undefined,
            status: activeParsedData?.isWaiting ? 'waiting' : 'todo',
            priority: finalPriority,
            projectId: finalProjectId,
            launchDate: finalDueDate,
            recurrence: finalRecurrence === 'none' ? undefined : finalRecurrence as any,
            isDraft: destination === 'idea' || activeParsedData?.isIdea ? true : false,
            isFrog: false, // Will be made true securely by toggleFrog if requested
            isLightning: finalIsLightning,
            createdAt: Date.now(),
            attachments: attachments.length > 0 ? attachments : undefined,
        };

        addTask(newTask);

        if (finalIsFrog) {
            useMonocleStore.getState().toggleFrog(taskId);
        }

        toast.success(destination === 'idea' ? "Idea added" : "Captured", {
            action: {
                label: "Undo",
                onClick: () => {
                    deleteTask(taskId);
                    setDraftTaskData({
                        title: title,
                        description: description,
                        priority: priority,
                        projectId: projectId === 'all' ? undefined : projectId,
                        launchDate: launchDate?.getTime(),
                        recurrence: recurrence === 'none' ? undefined : recurrence as any,
                        isFrog: isFrog,
                        isLightning: isLightning
                    });
                    setActiveModal('add-task');
                }
            }
        });

        // Reset if we are staying
        setTitle('');
        setDescription('');
        setPriority('medium');
        setRecurrence('none');
        setLaunchDate(undefined);
        setParsedData(null);
        setIsFrog(false);
        setIsLightning(false);
        setAdvancedOpen(false);
        setAttachments([]);

        if (destination === 'queue') {
            setView('queue');
        } else if (destination === 'focus') {
            setView('focus');
        } else {
            setTimeout(() => inputRef.current?.focus(), 10);
        }

        if (onComplete) onComplete();
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        const imageItem = Array.from(items).find(item => item.type.startsWith("image/"));
        
        if (imageItem) {
            e.preventDefault();
            const file = imageItem.getAsFile();
            if (!file) return;
            setIsUploading(true);
            setAdvancedOpen(true);
            const toastId = toast.loading("Uploading image...", { description: file.name });
            try {
                const tempId = isEditMode && taskToEdit ? taskToEdit.id : generateId();
                const url = await uploadTaskAttachment(tempId, file);
                setAttachments(prev => [...prev, url]);
                toast.success("Image attached", { id: toastId });
            } catch (err: any) {
                toast.error("Upload failed", { id: toastId, description: err.message });
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        setIsUploading(true);
        setAdvancedOpen(true);
        const toastId = toast.loading("Uploading image...", { description: file.name });
        try {
            const tempId = isEditMode && taskToEdit ? taskToEdit.id : generateId();
            const url = await uploadTaskAttachment(tempId, file);
            setAttachments(prev => [...prev, url]);
            toast.success("Image attached", { id: toastId });
        } catch (err: any) {
            toast.error("Upload failed", { id: toastId, description: err.message });
        } finally {
            setIsUploading(false);
            e.target.value = ""; // reset
        }
    };

    const handleParseImage = async (url: string) => {
        setIsParsing(true);
        const toastId = toast.loading('Parsing structure from image...');
        try {
            const idToken = await auth.currentUser?.getIdToken();
            const res = await fetch('/api/parse-image', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ imageUrl: url })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to parse image');
            }

            const data: ParsedTask = await res.json();
            
            if (data.title) setTitle(data.title);
            if (data.description) setDescription(data.description);
            if (data.launchDate) setLaunchDate(new Date(data.launchDate));
            
            toast.success('Task details extracted!', { id: toastId });
        } catch (error: any) {
            console.error('Parsing Error:', error);
            toast.error(error.message || 'Failed to extract details from image.', { id: toastId });
        } finally {
            setIsParsing(false);
        }
    };

    const handleDirectParse = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        
        setIsParsing(true);
        const toastId = toast.loading("Processing image...", { description: file.name });
        try {
            // 1. Upload temporarily purely for parsing
            const tempId = isEditMode && taskToEdit ? taskToEdit.id : generateId();
            const url = await uploadTaskAttachment(tempId, file);
            
            // 2. Add to attachments so they can see the context if they want
            setAttachments(prev => [...prev, url]);
            
            // 3. Immediately parse
            toast.loading("Analyzing content...", { id: toastId });
            const idToken = await auth.currentUser?.getIdToken();
            const res = await fetch('/api/parse-image', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ imageUrl: url })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to parse image');
            }

            const data: ParsedTask = await res.json();
            
            if (data.title) setTitle(data.title);
            if (data.description) setDescription(data.description);
            if (data.launchDate) setLaunchDate(new Date(data.launchDate));
            setAdvancedOpen(true);
            
            toast.success('Task details extracted!', { id: toastId });
        } catch (err: any) {
            toast.error("Failed to parse", { id: toastId, description: err.message });
        } finally {
            setIsParsing(false);
            e.target.value = ""; // reset
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && inputRef.current && parsedData?.matchedTokens) {
            const cursorPosition = inputRef.current.selectionStart;
            const textBeforeCursor = title.substring(0, cursorPosition);

            const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            for (const token of parsedData.matchedTokens) {
                // Must be at exactly the end of the token
                const regex = new RegExp(escapeRegExp(token.text) + "$", "i");
                if (regex.test(textBeforeCursor)) {
                    e.preventDefault();

                    const match = textBeforeCursor.match(regex)!;
                    const tokenTextPos = textBeforeCursor.lastIndexOf(match[0]);
                    const beforeToken = title.substring(0, tokenTextPos);
                    const tokenText = match[0];

                    // Insert \u200B right before the last character of the token to break the match
                    const modifiedToken = tokenText.substring(0, tokenText.length - 1) + '\u200B' + tokenText.substring(tokenText.length - 1);
                    const afterToken = title.substring(cursorPosition);

                    setTitle(beforeToken + modifiedToken + afterToken);

                    // Keep cursor at the same visual position
                    setTimeout(() => {
                        const newPos = cursorPosition + 1; // Since we added 1 invisible char before cursor
                        inputRef.current?.setSelectionRange(newPos, newPos);
                    }, 0);

                    return;
                }
            }
        }

        if (e.key === ' ' && isMentionsOpen && activeTrigger === '#') {
            if (mentionOptions.length > 0) {
                const selected = mentionOptions[mentionSelectedIndex];
                if (!selected.value.startsWith('create_')) {
                    e.preventDefault();
                    handleMentionSelect(selected);
                    return;
                } else {
                    closeMentions();
                    // Let space behave normally
                }
            }
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            if (isMentionsOpen && mentionOptions.length > 0) {
                e.preventDefault();
                handleMentionSelect(mentionOptions[mentionSelectedIndex]);
                return;
            }
            e.preventDefault();
            submitTask(isEditMode ? 'save' : 'capture');
        }

        if (isMentionsOpen) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setMentionSelectedIndex(prev => (prev + 1) % mentionOptions.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setMentionSelectedIndex(prev => (prev - 1 + mentionOptions.length) % mentionOptions.length);
            } else if (e.key === 'Escape') {
                closeMentions();
            }
        }
    };

    const innerContent = (
        <>
            <div className="absolute top-4 right-4 z-50">
                <div className="relative overflow-hidden rounded-full">
                    <input 
                        type="file" 
                        accept="image/*" 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                        onChange={handleDirectParse}
                        disabled={isParsing || isUploading}
                        title="Upload an image to auto-fill task details"
                    />
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        className="h-8 text-xs font-semibold text-foreground hover:text-emerald-500 bg-secondary shadow-sm hover:bg-secondary/80 focus:ring-2 focus:ring-emerald-500 gap-1.5 px-4 transition-all relative pointer-events-none"
                    >
                        {isParsing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-emerald-500" />}
                        {isParsing ? "Parsing..." : "Parse Image"}
                    </Button>
                </div>
            </div>
            <div className="w-full px-8 md:px-16 flex flex-col items-center justify-center relative flex-1 py-6">
                <div className={cn("mb-6 animate-in fade-in slide-in-from-top-4 duration-500", isModal && "mt-12")}>
                    {(() => {
                        const isAll = projectId === 'all';
                        const proj = !isAll ? projects.find(p => p.id === projectId) : null;

                        return (
                            <div className="flex items-center bg-secondary/50 rounded-full border border-border/50 shadow-sm h-9 hover:bg-secondary transition-all w-fit">
                                {!isAll && proj && (
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <button className="h-full pl-3 pr-2 flex items-center justify-center rounded-l-full hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                                <div className="flex items-center justify-center shrink-0 w-4 h-4 rounded-sm" style={{ backgroundColor: proj.color }}>
                                                    {(() => {
                                                        const IconCmp = getIconComponent(proj.icon);
                                                        return <IconCmp className="h-2.5 w-2.5 text-white drop-shadow-sm" />;
                                                    })()}
                                                </div>
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent align="start" className="w-64 p-3 z-[100] flex flex-col gap-3">
                                            <div className="flex items-center justify-between pb-2 border-b">
                                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Edit Project</span>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-widest">Color</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {COLORS.map(c => (
                                                        <button
                                                            key={c}
                                                            className={cn("w-5 h-5 rounded-full hover:scale-110 transition-transform", proj.color === c && "ring-2 ring-offset-2 ring-primary")}
                                                            style={{ backgroundColor: c }}
                                                            onClick={async () => {
                                                                updateProject(proj.id, { color: c });
                                                                setTimeout(() => inputRef.current?.focus(), 10);
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-muted-foreground mb-1.5 uppercase tracking-widest">Icon</p>
                                                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-1 scrollbar-none">
                                                    {Object.keys(PROJECT_ICONS).map(iconName => {
                                                        const IconCmp = PROJECT_ICONS[iconName as keyof typeof PROJECT_ICONS];
                                                        return (
                                                            <button
                                                                key={iconName}
                                                                className={cn("w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors", proj.icon === iconName && "bg-secondary text-primary ring-1 ring-primary")}
                                                                onClick={async () => {
                                                                    updateProject(proj.id, { icon: iconName });
                                                                    setTimeout(() => inputRef.current?.focus(), 10);
                                                                }}
                                                            >
                                                                <IconCmp className="h-3.5 w-3.5" />
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                )}

                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button className={cn(
                                            "h-full text-xs font-semibold flex items-center gap-2 text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                            !isAll && proj ? "pr-4 pl-1 rounded-r-full" : "px-4 rounded-full"
                                        )}>
                                            {isAll || !proj ? (
                                                <><Folder className="h-4 w-4 shrink-0 opacity-60" /> <span className="truncate max-w-[120px]">Project</span></>
                                            ) : (
                                                <span className="truncate max-w-[120px] text-foreground hover:text-primary transition-colors">{proj.name}</span>
                                            )}
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent align="center" className="w-56 p-1 z-[100]">
                                        <div className="text-[10px] font-bold px-2 py-1.5 text-muted-foreground uppercase tracking-widest mb-1">
                                            Assign Project
                                        </div>
                                        <button
                                            onClick={() => setProjectId('all')}
                                            className={cn(
                                                "w-full text-left flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-muted transition-colors",
                                                projectId === 'all' && "bg-secondary text-primary font-medium"
                                            )}
                                        >
                                            <Folder className="h-4 w-4 text-muted-foreground opacity-60" />
                                            No Project
                                        </button>
                                        {projects.map(p => {
                                            const IconCmp = getIconComponent(p.icon);
                                            return (
                                                <button
                                                    key={p.id}
                                                    onClick={() => setProjectId(p.id)}
                                                    className={cn(
                                                        "w-full text-left flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-muted transition-colors",
                                                        projectId === p.id && "bg-secondary text-primary font-medium"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-center shrink-0 w-4 h-4 rounded-sm" style={{ backgroundColor: p.color }}>
                                                        <IconCmp className="h-2.5 w-2.5 text-white drop-shadow-sm" />
                                                    </div>
                                                    <span className="truncate">{p.name}</span>
                                                </button>
                                            );
                                        })}
                                    </PopoverContent>
                                </Popover>
                            </div>
                        );
                    })()}
                </div>

                <div className="relative w-full">
                    {/* Syntax Highlighting Background Overlay */}
                    <div
                        className={cn(
                            "absolute inset-0 pointer-events-none w-full bg-transparent text-center p-0 m-0 resize-none focus:outline-none placeholder-transparent leading-tight break-words whitespace-pre-wrap text-transparent",
                            isModal ? "text-2xl md:text-3xl font-bold" : "text-3xl md:text-5xl font-bold"
                        )}
                        aria-hidden="true"
                    >
                        {renderHighlightedText(title, parsedData?.matchedTokens || [])}
                    </div>

                    <TextareaAutosize
                        ref={(node) => {
                            if (node) inputRef.current = node;
                        }}
                        value={title}
                        onChange={(e) => {
                            setTitle(e.target.value);
                            onMentionChange();
                        }}
                        onPaste={handlePaste}
                        onKeyDown={handleKeyDown}
                        placeholder="What's on your mind?"
                        className={cn(
                            "w-full bg-transparent border-none text-center p-0 m-0 resize-none focus:outline-none focus:ring-0 placeholder:text-muted-foreground/30 leading-tight text-foreground caret-foreground relative z-10",
                            isModal ? "text-2xl md:text-3xl font-bold" : "text-3xl md:text-5xl font-bold"
                        )}
                        minRows={1}
                        maxRows={5}
                        maxLength={255}
                    />
                    
                    {/* Voice Dictation Button */}
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            toggleListening();
                        }}
                        className={cn(
                            "absolute right-2 bottom-0 p-2 rounded-full transition-all z-20",
                            isListening ? "text-red-500 bg-red-500/10 animate-pulse" : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                        )}
                        title="Voice Dictation"
                    >
                        <Mic className={cn("w-5 h-5", isListening && "scale-110 transition-transform")} />
                    </button>
                </div>



                {isMentionsOpen && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 z-[100]">
                        <MentionsList
                            options={mentionOptions}
                            selectedIndex={mentionSelectedIndex}
                            onSelect={handleMentionSelect}
                        />
                    </div>
                )}
            </div>

            <div className={cn("w-full px-6 flex flex-col gap-4 z-10 shrink-0", isModal ? "pb-6 pt-0" : "mt-auto pb-8 pt-0")}>
                {/* NLP Highlights display */}
                {(parsedData?.launchDate || parsedData?.priority || parsedData?.projectId || parsedData?.recurrence || parsedData?.isFrog || parsedData?.isLightning || parsedData?.isWaiting || parsedData?.isIdea) && (
                    <div className="flex flex-wrap items-center justify-center gap-2 pointer-events-none animate-in fade-in slide-in-from-top-4 mb-4">
                        {parsedData.launchDate && (
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center gap-1.5 backdrop-blur-md">
                                <CalendarIcon className="w-3 h-3" /> {format(parsedData.launchDate, 'MMM d')}
                            </span>
                        )}
                        {parsedData.priority && parsedData.priority !== 'medium' && (
                            <span className={cn(
                                "text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-md",
                                parsedData.priority === 'high' ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"
                            )}>
                                <AlertCircle className="w-3 h-3" /> {parsedData.priority}
                            </span>
                        )}
                        {parsedData.recurrence && (
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-500 flex items-center gap-1.5 backdrop-blur-md">
                                <Repeat className="w-3 h-3" /> {parsedData.recurrence}
                            </span>
                        )}
                        {parsedData.isFrog && (
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 backdrop-blur-md">
                                <span className="leading-none select-none text-[10px]">🐸</span> Daily Frog
                            </span>
                        )}
                        {parsedData.isLightning && (
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-1.5 backdrop-blur-md">
                                <Zap className="w-3 h-3" /> Lightning
                            </span>
                        )}
                        {parsedData.isWaiting && (
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-500 flex items-center gap-1.5 backdrop-blur-md">
                                <Hourglass className="w-3 h-3" /> Waiting
                            </span>
                        )}
                        {parsedData.isIdea && (
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center gap-1.5 backdrop-blur-md">
                                <Lightbulb className="w-3 h-3" /> Idea
                            </span>
                        )}
                    </div>
                )}

                {attachments && attachments.length > 0 && (
                    <div className="w-full max-w-sm mx-auto flex gap-3 overflow-x-auto shrink-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-3">
                        {attachments.map((url, i) => (
                            <div key={i} className="relative h-20 w-fit shrink-0 rounded-lg overflow-hidden border bg-muted/40 group shadow-sm flex items-center">
                                <img src={url} alt={`Attachment ${i+1}`} className="w-20 h-20 object-cover" />
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        setAttachments(prev => prev.filter((_, idx) => idx !== i));
                                    }}
                                    className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex justify-center">
                    <button
                        onClick={() => setAdvancedOpen(!advancedOpen)}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors bg-secondary/30 px-3 py-1.5 rounded-full"
                    >
                        {advancedOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {advancedOpen ? "Hide Options" : "Advanced Options"}
                    </button>
                </div>

                {advancedOpen && (
                    <div className="flex flex-col gap-3 animate-in slide-in-from-bottom-2 fade-in duration-200 w-full max-w-sm mx-auto">
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add details, notes, or links..."
                            maxLength={2000}
                            className="min-h-[60px] resize-none text-sm bg-card hover:bg-secondary/50 focus:bg-secondary transition-colors border-border/50 rounded-xl px-3 py-2"
                        />

                        {/* Attachments renderer moved outside to ensure visibility */}

                        <div className="flex flex-wrap justify-center gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className={cn(
                                        "flex-1 justify-center px-3 py-1.5 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-all bg-card hover:bg-secondary",
                                        priority === 'high' ? "text-amber-500 border-amber-500/30" :
                                            priority === 'low' ? "text-blue-500 border-blue-500/30" : "text-muted-foreground border-border/50"
                                    )}>
                                        <AlertCircle className="h-3.5 w-3.5" />
                                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="center">
                                    <DropdownMenuRadioGroup value={priority} onValueChange={(v: any) => setPriority(v as any)}>
                                        <DropdownMenuRadioItem value="low" className="text-blue-500">Low</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="medium">Medium</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="high" className="text-amber-500">High</DropdownMenuRadioItem>
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Popover>
                                <PopoverTrigger asChild>
                                    <button className={cn(
                                        "flex-1 justify-center px-3 py-1.5 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-all bg-card hover:bg-secondary",
                                        launchDate ? "text-indigo-500 border-indigo-500/30" : "text-muted-foreground border-border/50"
                                    )}>
                                        <CalendarIcon className="h-3.5 w-3.5" />
                                        {launchDate ? format(launchDate, 'MMM d') : 'Date'}
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="center">
                                    <CalendarComponent
                                        mode="single"
                                        selected={launchDate}
                                        onSelect={(d: any) => setLaunchDate(d)}
                                        initialFocus
                                    />
                                    {launchDate && (
                                        <div className="p-2 border-t border-border">
                                            <Button 
                                                variant="ghost" 
                                                className="w-full text-xs text-muted-foreground hover:text-destructive h-8 font-medium" 
                                                onClick={() => setLaunchDate(undefined)}
                                            >
                                                Clear Date
                                            </Button>
                                        </div>
                                    )}
                                </PopoverContent>
                            </Popover>

                            <Select value={recurrence} onValueChange={setRecurrence}>
                                <SelectTrigger className="flex-1 justify-center h-8 px-3 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-all bg-card hover:bg-secondary border-border/50 text-muted-foreground focus:ring-0">
                                    <Repeat className="h-3.5 w-3.5 shrink-0" />
                                    <SelectValue placeholder="Repeat" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Repeat</SelectItem>
                                    <SelectItem value="daily">Daily</SelectItem>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                </SelectContent>
                            </Select>

                            <button
                                onClick={() => { setIsFrog(!isFrog); setIsLightning(false); }}
                                className={cn(
                                    "flex-1 justify-center px-3 py-1.5 rounded-full border text-xs font-medium flex items-center transition-all bg-card whitespace-nowrap",
                                    isFrog ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/30" : "hover:bg-secondary text-muted-foreground border-border/50"
                                )}
                            >
                                <span className="text-sm leading-none mr-1.5">🐸</span> Frog
                            </button>

                            <button
                                onClick={() => { setIsLightning(!isLightning); setIsFrog(false); }}
                                className={cn(
                                    "flex-1 justify-center px-3 py-1.5 rounded-full border text-xs font-medium flex items-center transition-all bg-card whitespace-nowrap",
                                    isLightning ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/30" : "hover:bg-secondary text-muted-foreground border-border/50"
                                )}
                            >
                                <span className="text-sm leading-none mr-1.5">⚡️</span> Quick
                            </button>

                            <div className="relative flex-1">
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                    onChange={handleFileUpload}
                                    disabled={isUploading}
                                    title="Attach Image"
                                />
                                <button
                                    disabled={isUploading}
                                    className={cn(
                                        "w-full justify-center px-3 py-1.5 rounded-full border text-xs font-medium flex items-center transition-all bg-card whitespace-nowrap",
                                        "hover:bg-secondary text-muted-foreground border-border/50 disabled:opacity-50"
                                    )}
                                >
                                    {isUploading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5 mr-1.5" />}
                                    {isUploading ? "Uploading..." : "Attach"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
                    {isEditMode ? (
                        <div className="flex flex-col gap-2">
                            {taskToEdit?.isDraft && (
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        className="flex-1 rounded-full h-11 bg-secondary/30 hover:bg-secondary border-border/50 text-xs font-medium"
                                        onClick={() => submitTask('queue')}
                                    >
                                        <Layers className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> To Queue
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        className="flex-1 rounded-full h-11 bg-secondary/30 hover:bg-secondary border-border/50 text-xs font-medium text-destructive hover:text-destructive"
                                        onClick={() => submitTask('archive')}
                                    >
                                        <Folder className="w-3.5 h-3.5 mr-1.5" /> Archive
                                    </Button>
                                </div>
                            )}
                            <Button
                                variant="default"
                                size="lg"
                                className="w-full rounded-full h-11 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold shadow-md active:scale-95 transition-transform"
                                onClick={() => submitTask('save')}
                            >
                                <Save className="w-4 h-4 mr-2" /> Save Changes
                            </Button>
                        </div>
                    ) : (
                        <>
                            {!isModal && (
                                <div className="flex justify-between gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 rounded-full bg-secondary/30 hover:bg-secondary border-border/50 data-[disabled]:opacity-50 h-9 font-medium text-xs"
                                        onClick={() => submitTask('idea')}
                                    >
                                        <Lightbulb className="w-3.5 h-3.5 mr-1.5 text-yellow-500" /> Idea
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 rounded-full bg-secondary/30 hover:bg-secondary border-border/50 data-[disabled]:opacity-50 h-9 font-medium text-xs"
                                        onClick={() => submitTask('queue')}
                                    >
                                        <Layers className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> Prioritize
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 rounded-full bg-secondary/30 hover:bg-secondary border-border/50 data-[disabled]:opacity-50 h-9 font-medium text-xs"
                                        onClick={() => submitTask('focus')}
                                    >
                                        <Target className="w-3.5 h-3.5 mr-1.5 text-red-500" /> Focus
                                    </Button>
                                </div>
                            )}

                            <Button
                                variant="default"
                                size="lg"
                                className="w-full rounded-full h-11 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold shadow-md active:scale-95 transition-transform"
                                onClick={() => submitTask('capture')}
                            >
                                <Plus className="w-4 h-4 mr-2" /> {isModal ? "Add Task" : "Add Task"}
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </>
    );

    if (isModal) {
        return (
            <div className="flex flex-col items-center justify-between h-full bg-card relative rounded-[2rem] overflow-x-hidden overflow-y-auto w-full pb-6">
                {innerContent}
            </div>
        );
    }

    const dummyTask = { id: 'capture_modal', title: 'Capture' } as Task;

    return (
        <SwipeableTask
            task={dummyTask}
            isMobile={true}
            leftAction={() => submitTask('idea')}
            leftIcon={Lightbulb}
            leftLabel="Idea Dump"
            leftBgClass="bg-yellow-500"
            leftColorClass="text-yellow-600"
            rightAction={() => submitTask('focus')}
            rightIcon={Target}
            rightLabel="Focus"
            rightBgClass="bg-red-500"
            rightColorClass="text-red-600"
            downAction={() => submitTask('queue')}
            downIcon={Layers}
            downLabel="Queue"
            downBgClass="bg-blue-500"
            downColorClass="text-blue-600"
            upAction={() => submitTask('capture')}
            upIcon={Plus}
            upLabel="Add Task"
            upBgClass="bg-indigo-500"
            upColorClass="text-indigo-600"
        >
            <Card className="w-full max-w-2xl h-auto min-h-[70vh] md:min-h-[600px] shadow-2xl border bg-card/95 backdrop-blur-xl relative flex flex-col items-center justify-between text-center rounded-[2rem] group transition-all duration-500 overflow-y-auto overflow-x-hidden ring-1 ring-white/5 scrollbar-none">
                {innerContent}
            </Card>
        </SwipeableTask>
    );
}
