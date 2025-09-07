interface ErrorHint {
    title: string;
    description: string;
    solution: string;
}

export const errorHints: Record<string, ErrorHint> = {
    "API key not valid": {
        title: "Invalid API Key",
        description: "The provided Google Gemini API key is incorrect or has been revoked.",
        solution: "Please verify your API key in Google AI Studio and update it in the app's settings. Ensure there are no extra spaces or characters."
    },
    "429": {
        title: "Rate Limit Exceeded",
        description: "You have sent too many requests in a short period and have exceeded your API quota.",
        solution: "Wait for some time before making new requests. If this persists, check your quota limits in the Google Cloud Console or Google AI Studio."
    },
    "fetch": {
        title: "Network Error",
        description: "The application failed to connect to the Google Gemini API service.",
        solution: "Check your internet connection. If the connection is stable, there might be a temporary issue with the API service or a CORS problem."
    },
    "Readability could not extract": {
        title: "URL Reader Failure",
        description: "The URL Reader tool failed to parse meaningful content from the provided URL.",
        solution: "This often happens with single-page applications, pages behind a login, or non-HTML content like PDFs. Try a different, simpler article-based URL."
    },
    "not initialized": {
        title: "AI Client Not Initialized",
        description: "The application tried to make an API call before the API key was set.",
        solution: "This is likely an application startup logic issue. Ensure the API key is provided and the AI client is initialized before any calls are made."
    },
    "render error": {
        title: "React Render Error",
        description: "An error occurred during the rendering of a React component, which often crashes the component tree.",
        solution: "Check the component stack trace for the exact location. Common causes include accessing properties of `undefined`, incorrect state updates, or invalid hook usage."
    }
};

export const getHintForError = (errorMessage: string): ErrorHint | null => {
    for (const key in errorHints) {
        if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
            return errorHints[key];
        }
    }
    return null;
};
