import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

const ThemeSelector: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'system');
    const selectorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent) => {
            if (theme === 'system') {
                const root = document.documentElement;
                const lightHljs = document.getElementById('hljs-light-theme');
                const darkHljs = document.getElementById('hljs-dark-theme');
                root.classList.toggle('dark', e.matches);
                lightHljs?.toggleAttribute('disabled', e.matches);
                darkHljs?.toggleAttribute('disabled', !e.matches);
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    const handleThemeChange = (newTheme: Theme) => {
        setTheme(newTheme);
        setIsOpen(false);

        const root = document.documentElement;
        const lightHljs = document.getElementById('hljs-light-theme');
        const darkHljs = document.getElementById('hljs-dark-theme');

        if (newTheme === 'system') {
            localStorage.removeItem('theme');
            const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.classList.toggle('dark', systemIsDark);
            lightHljs?.toggleAttribute('disabled', systemIsDark);
            darkHljs?.toggleAttribute('disabled', !systemIsDark);
        } else {
            localStorage.setItem('theme', newTheme);
            const isDark = newTheme === 'dark';
            root.classList.toggle('dark', isDark);
            lightHljs?.toggleAttribute('disabled', isDark);
            darkHljs?.toggleAttribute('disabled', !isDark);
        }
    };

    const ThemeIcon = useMemo(() => theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor, [theme]);

    return (
        <div ref={selectorRef} className="relative">
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className="flex items-center justify-center h-10 w-10 text-neutral-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors focus:outline-none rounded-full"
                aria-label="Change theme"
                title="Change theme"
            >
                <ThemeIcon className="h-6 w-6" />
            </button>
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-36 bg-white dark:bg-[#2E2F33] border border-neutral-200 dark:border-gray-600 rounded-lg shadow-xl overflow-hidden z-20">
                    <button
                        onClick={() => handleThemeChange('light')}
                        className={`w-full text-left p-3 text-sm flex items-center gap-2 ${theme === 'light' ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-800 dark:text-gray-200'} hover:bg-neutral-100 dark:hover:bg-gray-700/70 transition-colors`}
                    >
                        <Sun className="h-4 w-4" /> Light
                    </button>
                    <button
                        onClick={() => handleThemeChange('dark')}
                        className={`w-full text-left p-3 text-sm flex items-center gap-2 ${theme === 'dark' ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-800 dark:text-gray-200'} hover:bg-neutral-100 dark:hover:bg-gray-700/70 transition-colors`}
                    >
                        <Moon className="h-4 w-4" /> Dark
                    </button>
                    <button
                        onClick={() => handleThemeChange('system')}
                        className={`w-full text-left p-3 text-sm flex items-center gap-2 ${theme === 'system' ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-800 dark:text-gray-200'} hover:bg-neutral-100 dark:hover:bg-gray-700/70 transition-colors`}
                    >
                        <Monitor className="h-4 w-4" /> System
                    </button>
                </div>
            )}
        </div>
    );
};

export default ThemeSelector;