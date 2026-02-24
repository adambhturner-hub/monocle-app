import React from 'react';
import { cn } from '@/lib/utils';
import Linkify from 'linkify-react';

// Basic markdown link regex: [text](url)
const MD_LINK_REGEX = /\[([^\[]+)\]\((https?:\/\/[^\s]+)\)/;

// Pipe shorthand regex: url | label
// matches "https://example.com | My Link" or "example.com/foo | A link"
const PIPE_LINK_REGEX = /(https?:\/\/[^\s\|]+|[a-zA-Z0-9\-_\.]+\.[a-zA-Z]{2,}(?:\/[^\s\|]*)?)\s+\|\s+([^\n\|]+)/g;

interface FormattedTextProps {
    text: string;
    className?: string;
}

export function FormattedText({ text, className }: FormattedTextProps) {
    if (!text) return null;

    // 1. Convert pipe shorthand to standard markdown links
    let processedText = text.replace(PIPE_LINK_REGEX, (match, url, label) => {
        const fullUrl = url.startsWith('http') ? url : `https://${url}`;
        return `[${label.trim()}](${fullUrl})`;
    });

    // 2. Split the text by Markdown links to process them first
    // Capture the entire markdown link so it's kept in the parts array
    const parts = processedText.split(/(\[[^\[]+\]\(https?:\/\/[^\s]+\))/g);

    return (
        <span className={cn("whitespace-pre-wrap break-words", className)}>
            {parts.map((part, i) => {
                const mdMatch = part.match(MD_LINK_REGEX);
                if (mdMatch) {
                    const [, label, url] = mdMatch;
                    return (
                        <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline transition-colors"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {label}
                        </a>
                    );
                }

                // Wrap non-markdown parts in Linkify to catch raw domains like google.com
                return (
                    <Linkify
                        key={i}
                        options={{
                            target: '_blank',
                            rel: 'noopener noreferrer',
                            className: 'text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline break-all transition-colors',
                            attributes: {
                                onClick: (e: any) => e.stopPropagation()
                            }
                        }}
                    >
                        {part}
                    </Linkify>
                );
            })}
        </span>
    );
}
