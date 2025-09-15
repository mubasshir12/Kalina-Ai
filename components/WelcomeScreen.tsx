

import React, { useState, useEffect, useCallback } from 'react';
import { Lightbulb, BarChart3, Code2, BugPlay, DatabaseZap, HelpCircle, Mail, BookOpenText, GitCompareArrows, ChefHat, Share2, Presentation, Sparkles, FlaskConical, Atom } from 'lucide-react';
import { Suggestion, Tool } from '../types';

interface WelcomeScreenProps {
  onSelectSuggestion: (suggestion: Suggestion) => void;
  onTryMultiAgent: () => void;
  ctaRef: React.Ref<HTMLButtonElement>;
}

const allSuggestions: Suggestion[] = [
    { 
        text: "Make a plan", 
        icon: <Lightbulb className="h-5 w-5 text-yellow-500" />,
        prompt: "Make a plan for a 3-day trip to Paris, including budget-friendly options"
    },
    { 
        text: "Analyze data", 
        icon: <BarChart3 className="h-5 w-5 text-blue-500" />,
        prompt: "Here is some sample sales data: [Product A: 100 units, Product B: 150 units, Product C: 80 units]. Analyze it and provide insights."
    },
    { 
        text: "Brainstorm ideas", 
        icon: <Lightbulb className="h-5 w-5 text-yellow-500" />,
        prompt: "Brainstorm 5 catchy slogans for a new eco-friendly water bottle brand."
    },
    {
        text: "Write a script",
        icon: <Code2 className="h-5 w-5 text-purple-500" />,
        prompt: "Write a short python script to organize my downloads folder by file type."
    },
    {
        text: "Debug this code",
        icon: <BugPlay className="h-5 w-5 text-red-500" />,
        prompt: "My React component isn't updating its state correctly. Here's the code, can you help me find the bug?"
    },
    { 
        text: "Explain a concept",
        icon: <HelpCircle className="h-5 w-5 text-teal-500" />,
        prompt: "Explain the concept of 'async/await' in JavaScript with a code example."
    },
    {
        text: "Optimize a query",
        icon: <DatabaseZap className="h-5 w-5 text-orange-500" />,
        prompt: "How can I optimize this SQL query for better performance on a large dataset? `SELECT u.id, p.product_name FROM users u JOIN purchases p ON u.id = p.user_id WHERE u.signup_date > '2023-01-01';`"
    },
    {
        text: "Draft an email",
        icon: <Mail className="h-5 w-5 text-sky-500" />,
        prompt: "Draft a professional email to my team about the upcoming project deadline."
    },
    {
        text: "Summarize a topic",
        icon: <BookOpenText className="h-5 w-5 text-indigo-500" />,
        prompt: "Summarize the key events of World War II in three paragraphs."
    },
     { 
        text: "Use AI Agents", 
        icon: <Sparkles className="h-5 w-5 text-cyan-500" />,
        prompt: "Do a market analysis on the future of electric vehicles using the full multi-agent team."
    },
    {
        text: "Compare and contrast",
        icon: <GitCompareArrows className="h-5 w-5 text-green-500" />,
        prompt: "Compare and contrast the pros and cons of React and Vue for web development."
    },
    {
        text: "Visualize caffeine", 
        icon: <FlaskConical className="h-5 w-5 text-emerald-500" />,
        prompt: "Show me the 3D structure of caffeine"
    },
    { 
        text: "Visualize a p-orbital", 
        icon: <Atom className="h-5 w-5 text-blue-500" />,
        prompt: "Show me what a p orbital looks like"
    },
    { 
        text: "Explain covalent bonds", 
        icon: <FlaskConical className="h-5 w-5 text-emerald-500" />,
        prompt: "Can you explain covalent bonds with an example?"
    },
    { 
        text: "What is glucose?", 
        icon: <FlaskConical className="h-5 w-5 text-emerald-500" />,
        prompt: "What is the chemical formula for glucose and what is it used for?"
    },
    {
        text: "Get a recipe",
        icon: <ChefHat className="h-5 w-5 text-rose-500" />,
        prompt: "Give me a simple recipe for a classic lasagna."
    },
    {
        text: "Write a social post",
        icon: <Share2 className="h-5 w-5 text-cyan-500" />,
        prompt: "Write an engaging Twitter post about the benefits of remote work."
    },
    {
        text: "Outline a presentation",
        icon: <Presentation className="h-5 w-5 text-lime-500" />,
        prompt: "Create a 5-slide presentation outline about the importance of digital marketing."
    },
    {
        text: "Tell me a fun fact",
        icon: <Sparkles className="h-5 w-5 text-pink-500" />,
        prompt: "Tell me a surprising fun fact about the ocean."
    }
];

const typingPhrases = [
    "Unlock deep insights.",
    "Deploy a team of AI agents.",
    "Solve complex problems."
];

const MarqueeRow: React.FC<{
    suggestions: Suggestion[];
    onSelectSuggestion: (suggestion: Suggestion) => void;
    direction?: 'left' | 'right';
}> = ({ suggestions, onSelectSuggestion, direction = 'left' }) => {
    if (suggestions.length === 0) return null;

    const animationDuration = suggestions.length * 8; // Adjust speed based on number of items

    return (
        <div className="marquee">
            <div
                className="marquee-content"
                style={{
                    animationDuration: `${animationDuration}s`,
                    animationDirection: direction === 'right' ? 'reverse' : 'normal',
                }}
            >
                {[...suggestions, ...suggestions].map((suggestion, index) => (
                    <button
                        key={`${suggestion.prompt}-${index}`}
                        onClick={() => onSelectSuggestion(suggestion)}
                        className="flex items-center gap-2.5 bg-white/70 dark:bg-[#1e1f22]/70 backdrop-blur-sm p-3 pl-4 pr-5 rounded-full hover:bg-neutral-100 dark:hover:bg-gray-800/50 transition-colors duration-200 border border-neutral-200 dark:border-gray-700 shadow-sm flex-shrink-0 mx-1.5"
                        aria-label={suggestion.text}
                    >
                        {suggestion.icon}
                        <span className="font-medium text-neutral-700 dark:text-gray-300 whitespace-nowrap">{suggestion.text}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};


const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSelectSuggestion, onTryMultiAgent, ctaRef }) => {
    const [firstRow, setFirstRow] = useState<Suggestion[]>([]);
    const [secondRow, setSecondRow] = useState<Suggestion[]>([]);
    
    const [phraseIndex, setPhraseIndex] = useState(0);
    const [subIndex, setSubIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [currentText, setCurrentText] = useState('');

    const refreshSuggestions = useCallback(() => {
        const shuffled = [...allSuggestions].sort(() => 0.5 - Math.random());
        const half = Math.ceil(shuffled.length / 2);
        setFirstRow(shuffled.slice(0, half));
        setSecondRow(shuffled.slice(half));
    }, []);

    useEffect(() => {
        refreshSuggestions();
    }, [refreshSuggestions]);
    
    useEffect(() => {
        const typeSpeed = 100;
        const deleteSpeed = 50;
        const pauseDuration = 2000;

        let timeoutId: number;

        const handleTyping = () => {
            const currentPhrase = typingPhrases[phraseIndex];
            if (isDeleting) {
                if (subIndex > 0) {
                    setCurrentText(currentPhrase.substring(0, subIndex - 1));
                    setSubIndex(subIndex - 1);
                } else {
                    setIsDeleting(false);
                    setPhraseIndex((prevIndex) => (prevIndex + 1) % typingPhrases.length);
                }
            } else {
                if (subIndex < currentPhrase.length) {
                    setCurrentText(currentPhrase.substring(0, subIndex + 1));
                    setSubIndex(subIndex + 1);
                } else {
                    timeoutId = window.setTimeout(() => setIsDeleting(true), pauseDuration);
                }
            }
        };

        const delay = isDeleting ? deleteSpeed : (subIndex === typingPhrases[phraseIndex].length ? pauseDuration : typeSpeed);
        timeoutId = window.setTimeout(handleTyping, delay);

        return () => clearTimeout(timeoutId);
    }, [subIndex, isDeleting, phraseIndex]);

  return (
    <div className="relative flex flex-col items-center justify-center h-full text-center overflow-hidden">
        <style>{`
            .marquee {
                position: relative;
                width: 100%;
                overflow: hidden;
                -webkit-mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%);
                mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%);
            }
            .marquee-content {
                display: flex;
                width: max-content;
                animation-name: marquee;
                animation-timing-function: linear;
                animation-iteration-count: infinite;
            }
            .marquee:hover .marquee-content {
                animation-play-state: paused;
            }
            @keyframes marquee {
                from { transform: translateX(0); }
                to { transform: translateX(-50%); }
            }
            .typing-cursor {
                display: inline-block;
                width: 3px;
                height: 2.2rem;
                background-color: #f59e0b;
                margin-left: 4px;
                animation: blink 1s infinite;
                vertical-align: middle;
            }
            .dark .typing-cursor {
                background-color: #fbbf24;
            }
            @keyframes blink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0; }
            }
            .cta-button-glow {
                animation: pulse-glow 3s ease-in-out infinite;
            }
            @keyframes pulse-glow {
                0%, 100% {
                    transform: scale(1);
                    box-shadow: 0 0 10px rgba(245, 158, 11, 0.2), 0 0 20px rgba(245, 158, 11, 0.1);
                }
                50% {
                    transform: scale(1.03);
                    box-shadow: 0 0 20px rgba(245, 158, 11, 0.4), 0 0 40px rgba(245, 158, 11, 0.2);
                }
            }
        `}</style>
      <div className="relative z-10 w-full flex flex-col items-center">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-neutral-800 dark:text-white select-none mb-4">
                What can I help with?
            </h1>
            
            <div className="h-10 text-center mb-4">
                <span className="text-2xl font-semibold bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-500 bg-clip-text text-transparent">
                    {currentText}
                </span>
                <span className="typing-cursor"></span>
            </div>

            <button 
                ref={ctaRef}
                onClick={onTryMultiAgent}
                className="cta-button-glow mb-8 inline-flex items-center gap-3 px-6 py-3 font-semibold text-white bg-gradient-to-br from-amber-500 to-orange-600 rounded-full shadow-lg hover:from-amber-600 hover:to-orange-700 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-amber-500/50"
            >
                Try Multi-Agent Mode
            </button>
          
          <div className="flex flex-col justify-center items-center gap-3 w-full">
                <MarqueeRow suggestions={firstRow} onSelectSuggestion={onSelectSuggestion} direction="left" />
                <MarqueeRow suggestions={secondRow} onSelectSuggestion={onSelectSuggestion} direction="right" />
          </div>
           <div className="mt-8">
                <button
                onClick={refreshSuggestions}
                className="bg-white/70 dark:bg-[#1e1f22]/70 backdrop-blur-sm p-3 px-5 rounded-full hover:bg-neutral-100 dark:hover:bg-gray-800/50 transition-colors duration-200 border border-neutral-200 dark:border-gray-700 shadow-sm"
                aria-label="Show new suggestions"
                >
                    <span className="font-medium text-neutral-700 dark:text-gray-300">New Suggestions</span>
                </button>
           </div>
        </div>
    </div>
  );
};

export default WelcomeScreen;