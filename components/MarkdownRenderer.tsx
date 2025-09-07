import React from 'react';
import { GroundingChunk } from '../types';
import CodeBlock from './CodeBlock';

// Renders a single source citation as a clickable text-based tag.
const Citation: React.FC<{ source: GroundingChunk; index: number }> = ({ source, index }) => {
    // Return a fallback if the source or its URI is missing.
    if (!source?.web?.uri) {
        return <sup className="text-xs font-semibold text-red-500 dark:text-red-400 mx-0.5" title="Source URI is missing">[{index + 1}]?</sup>;
    }

    try {
        const hostname = new URL(source.web.uri).hostname.replace(/^www\./, '');
        // Use the title if available, otherwise fallback to the hostname.
        const displayName = source.web.title || hostname;
        const fullTitle = source.web.title ? `${source.web.title}\n${source.web.uri}` : source.web.uri;

        return (
            <a
                href={source.web.uri}
                target="_blank"
                rel="noopener noreferrer"
                title={fullTitle}
                className="inline-block align-baseline ml-1 px-2 py-0.5 bg-neutral-200 dark:bg-gray-700 text-neutral-700 dark:text-gray-300 rounded-full text-xs font-medium no-underline hover:bg-neutral-300 dark:hover:bg-gray-600 transition-colors"
            >
                {displayName}
            </a>
        );
    } catch (e) {
        // Fallback for invalid URLs that throw an error in the URL constructor.
        return <sup className="text-xs font-semibold text-amber-500 dark:text-amber-400 mx-0.5" title={`Invalid URL: ${source.web.uri}`}>[{index + 1}]</sup>;
    }
};

// Parses inline markdown: **bold**, *italic*, `code`, citations [1], and links.
const parseInline = (text: string, sources?: GroundingChunk[]): React.ReactNode => {
    const regex = /(\*\*.*?\*\*|__.*?__|\*.*?\*|_.*?_|\`.+?\`|\[\d+\]|https?:\/\/\S+|www\.\S+)/g;
    const urlRegex = /^(https?:\/\/\S+|www\.\S+)$/;

    return text.split(regex).filter(Boolean).map((part, i) => {
        const citationMatch = part.match(/^\[(\d+)\]$/);
        if (citationMatch) {
            if (sources) {
                const index = parseInt(citationMatch[1], 10) - 1;
                if (index >= 0 && index < sources.length) {
                    return <Citation key={i} source={sources[index]} index={index} />;
                }
            }
            // If no sources or index out of bounds, render nothing for the citation.
            return null;
        }

        if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
            return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
            return <em key={i}>{part.slice(1, -1)}</em>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={i} className="bg-neutral-200 dark:bg-gray-700/60 text-neutral-800 dark:text-gray-200 font-mono text-sm px-1.5 py-1 rounded-md mx-0.5">{part.slice(1, -1)}</code>;
        }
        
        if (urlRegex.test(part)) {
            const href = part.startsWith('www.') ? `https://${part}` : part;
            return (
                <a
                    key={i}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-600 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-900/50 hover:bg-amber-200/80 dark:hover:bg-amber-800/60 font-medium px-2 py-0.5 rounded-full no-underline hover:underline break-all"
                >
                    {part}
                </a>
            );
        }

        return part;
    });
};

interface MarkdownRendererProps {
    content: string;
    sources?: GroundingChunk[];
    onContentUpdate: (newContent: string) => void;
    isStreaming?: boolean;
    setCodeForPreview?: (data: { code: string; language: string; } | null) => void;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, sources, onContentUpdate, isStreaming, setCodeForPreview }) => {
    const lines = content.split('\n');
    const elements: JSX.Element[] = [];
    let currentList: { type: 'ul' | 'ol'; items: React.ReactNode[] } | null = null;
    
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let codeBlockLanguage = '';

    const flushList = (key: string | number) => {
        if (currentList) {
            const ListTag = currentList.type;
            const className = `${
                ListTag === 'ul' ? 'list-disc' : 'list-decimal'
            } list-inside space-y-1 my-3 pl-5`;
            elements.push(
                <ListTag key={key} className={className}>
                    {currentList.items.map((item, i) => (
                        <li key={i}>{item}</li>
                    ))}
                </ListTag>
            );
            currentList = null;
        }
    };

    lines.forEach((line, index) => {
        // Code blocks
        if (line.trim().startsWith('```')) {
            flushList(`list-before-code-${index}`);
            if (inCodeBlock) {
                const code = codeBlockContent.join('\n');
                const lang = codeBlockLanguage;
                elements.push(<CodeBlock 
                    key={`code-${index}`} 
                    language={lang} 
                    code={code}
                    isStreaming={isStreaming}
                    setCodeForPreview={setCodeForPreview}
                />);
                inCodeBlock = false;
                codeBlockContent = [];
                codeBlockLanguage = '';
            } else {
                inCodeBlock = true;
                codeBlockLanguage = line.trim().substring(3).trim();
            }
            return;
        }

        if (inCodeBlock) {
            codeBlockContent.push(line);
            return;
        }

        // Horizontal Rules
        if (line.match(/^(---|___|\*\*\*)\s*$/)) {
            flushList(`list-before-hr-${index}`);
            elements.push(<hr key={index} className="my-4 border-neutral-200 dark:border-gray-700" />);
            return;
        }
        
        // Headings (h1-h6)
        const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
        if (headingMatch) {
            flushList(`list-before-h-${index}`);
            const level = headingMatch[1].length;
            const Tag = `h${level}` as keyof JSX.IntrinsicElements;
            const text = headingMatch[2];
            const classNames = [
                "font-bold",
                level === 1 ? "text-2xl mt-5 mb-2" : "",
                level === 2 ? "text-xl mt-4 mb-1" : "",
                level === 3 ? "text-lg mt-3 mb-1" : "",
                level >= 4 ? "text-base mt-2 mb-1" : ""
            ].join(" ");
            elements.push(<Tag key={index} className={classNames}>{parseInline(text, sources)}</Tag>);
            return;
        }
        
        // Unordered lists
        const ulMatch = line.match(/^(\s*)(\*|-)\s+(.*)/);
        if (ulMatch) {
            if (currentList?.type !== 'ul') {
                flushList(`list-before-ul-${index}`);
                currentList = { type: 'ul', items: [] };
            }
            currentList.items.push(parseInline(ulMatch[3], sources));
            return;
        }

        // Ordered lists
        const olMatch = line.match(/^(\s*)(\d+)\.\s+(.*)/);
        if (olMatch) {
            if (currentList?.type !== 'ol') {
                flushList(`list-before-ol-${index}`);
                currentList = { type: 'ol', items: [] };
            }
            currentList.items.push(parseInline(olMatch[3], sources));
            return;
        }

        // Paragraphs and empty lines
        flushList(`list-before-p-${index}`);
        if (line.trim() !== '') {
            elements.push(<p key={index}>{parseInline(line, sources)}</p>);
        } else if (elements.length > 0 && lines[index-1]?.trim() !== '') {
            // Add a spacer for intentional line breaks, but not for multiple empty lines
            elements.push(<div key={`spacer-${index}`} className="h-1"></div>);
        }
    });

    flushList('list-at-end');

    if (inCodeBlock) {
        const code = codeBlockContent.join('\n');
        const lang = codeBlockLanguage;
        elements.push(<CodeBlock 
            key="code-at-end" 
            language={lang} 
            code={code}
            isStreaming={isStreaming}
            setCodeForPreview={setCodeForPreview}
        />);
    }

    return <>{elements}</>;
};

export default MarkdownRenderer;