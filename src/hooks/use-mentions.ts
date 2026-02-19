import { useState, useEffect, RefObject, useCallback } from 'react';

type Trigger = '@' | '!' | null;

interface UseMentionsProps {
    inputRef: RefObject<HTMLInputElement | null>;
}

export function useMentions({ inputRef }: UseMentionsProps) {
    const [activeTrigger, setActiveTrigger] = useState<Trigger>(null);
    const [filterText, setFilterText] = useState('');
    const [triggerIndex, setTriggerIndex] = useState<number>(-1);

    // Check cursor position and text content to detect active trigger
    const checkTrigger = useCallback(() => {
        const input = inputRef.current;
        if (!input) return;

        const cursor = input.selectionStart || 0;
        const text = input.value;

        // Look backwards from cursor
        const textBeforeCursor = text.slice(0, cursor);

        // Find last occurrence of @ or !
        const lastAt = textBeforeCursor.lastIndexOf('@');
        const lastExcl = textBeforeCursor.lastIndexOf('!');

        const lastTriggerIndex = Math.max(lastAt, lastExcl);

        if (lastTriggerIndex === -1) {
            setActiveTrigger(null);
            return;
        }

        const triggerChar = textBeforeCursor[lastTriggerIndex] as '@' | '!';
        const textAfterTrigger = textBeforeCursor.slice(lastTriggerIndex + 1);

        // Conditions to be a valid mention:
        // 1. Trigger is at start OR preceded by space
        const isStartOrSpace = lastTriggerIndex === 0 || textBeforeCursor[lastTriggerIndex - 1] === ' ';

        // 2. No spaces in the filter text (simple version: close if space typed)
        const hasSpace = textAfterTrigger.includes(' ');

        if (isStartOrSpace && !hasSpace) {
            setActiveTrigger(triggerChar);
            setTriggerIndex(lastTriggerIndex);
            setFilterText(textAfterTrigger);
        } else {
            setActiveTrigger(null);
        }
    }, [inputRef]);

    const onInputChange = () => {
        checkTrigger();
    };

    // We also need to check on click/keyup (cursor movement)
    useEffect(() => {
        const input = inputRef.current;
        if (!input) return;

        const handleCursorChange = () => checkTrigger();

        input.addEventListener('click', handleCursorChange);
        input.addEventListener('keyup', handleCursorChange);

        return () => {
            input.removeEventListener('click', handleCursorChange);
            input.removeEventListener('keyup', handleCursorChange);
        };
    }, [inputRef, checkTrigger]);

    const closeMentions = () => {
        setActiveTrigger(null);
        setFilterText('');
        setTriggerIndex(-1);
    };

    return {
        activeTrigger,
        filterText,
        isOpen: !!activeTrigger,
        onInputChange,
        triggerIndex,
        closeMentions
    };
}
