import React, { useState, useEffect, useCallback } from 'react';
import { Lightbulb, BarChart3, Code2, BugPlay, DatabaseZap, HelpCircle, Mail, BookOpenText, GitCompareArrows, ChefHat, Share2, Presentation, Sparkles, FlaskConical } from 'lucide-react';
import { Suggestion } from '../types';

interface WelcomeScreenProps {
  onSelectSuggestion: (suggestion: Suggestion) => void;
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


const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSelectSuggestion }) => {
    const [firstRow, setFirstRow] = useState<Suggestion[]>([]);
    const [secondRow, setSecondRow] = useState<Suggestion[]>([]);

    const refreshSuggestions = useCallback(() => {
        const shuffled = [...allSuggestions].sort(() => 0.5 - Math.random());
        const half = Math.ceil(shuffled.length / 2);
        setFirstRow(shuffled.slice(0, half));
        setSecondRow(shuffled.slice(half));
    }, []);

    useEffect(() => {
        refreshSuggestions();
    }, [refreshSuggestions]);

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
        `}</style>
      <div className="relative z-10 w-full">
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-serif font-bold bg-gradient-to-br from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-500 bg-clip-text text-transparent select-none">
                What can I help with?
            </h1>
          </div>
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
