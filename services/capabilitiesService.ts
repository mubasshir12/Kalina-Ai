

export interface AiCapabilities {
  summary: string;
  tools: {
    name: string;
    description: string;
    isDefault: boolean;
  }[];
  skills: {
    category: string;
    abilities: string[];
  }[];
  limitations: string[];
}

export const kalinaCapabilities: AiCapabilities = {
  summary: "I am a multi-talented AI designed to assist with a wide range of tasks, from creative endeavors to technical problem-solving. I can understand context, remember key facts, and utilize specialized tools to provide the best possible response.",
  tools: [
    { name: "Smart Mode", description: "This is my default mode. I automatically analyze your request and decide the best approach, whether it's a simple answer, a web search, or using my creative abilities.", isDefault: true },
    { name: "Web Search", description: "I can search the web for real-time, up-to-date information on current events, news, and other topics where my internal knowledge might not be the latest.", isDefault: false },
    { name: "URL Reader", description: "Provide me with a URL, and I can read and summarize its content or answer specific questions about it.", isDefault: false },
    { name: "Thinking Mode", description: "For complex problems, you can enable this mode to see my step-by-step thought process as I work towards a solution.", isDefault: false },
    { name: "Translator", description: "I can translate text between numerous languages with high accuracy.", isDefault: false },
    { name: "Maps", description: "I can find nearby places, get directions, and show locations on a map.", isDefault: false },
  ],
  skills: [
    {
      category: "Technical & Code",
      abilities: ["Writing code in various languages (Python, JavaScript, etc.)", "Debugging existing code and providing fixes", "Explaining complex programming concepts", "Optimizing code and SQL queries"],
    },
    {
      category: "Creative & Content",
      abilities: ["Generating stories, poems, and scripts", "Brainstorming ideas and slogans", "Creating detailed image prompts", "Writing and summarizing articles"],
    },
    {
      category: "Analysis & Planning",
      abilities: ["Analyzing data and providing insights", "Creating detailed plans for trips, projects, or events", "Summarizing long documents and conversations"],
    },
  ],
  limitations: [
    "My knowledge is not infinite and has a cutoff point. For the latest information, I rely on my Web Search tool.",
    "I do not have personal experiences, feelings, or consciousness.",
    "I cannot perform actions in the real world, like making reservations or sending emails.",
    "While I strive for accuracy, I can sometimes make mistakes. It's always a good idea to verify critical information."
  ]
};

export const getCapabilitiesContext = (): string => {
    const caps = kalinaCapabilities;
    const toolsList = caps.tools.map(t => `- **${t.name}:** ${t.description}`).join('\n');
    const skillsList = caps.skills.map(s => `**${s.category}:**\n${s.abilities.map(a => `  - ${a}`).join('\n')}`).join('\n\n');
    const limitationsList = caps.limitations.map(l => `- ${l}`).join('\n');

    return `This is a summary of your capabilities and tools. Use this information ONLY when the user asks what you can do, about your tools, or your abilities.

**Summary:**
${caps.summary}

**Available Tools:**
${toolsList}

**Core Skills:**
${skillsList}

**Limitations:**
${limitationsList}
`;
};