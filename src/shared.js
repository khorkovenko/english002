import {useEffect, useState} from "react";

export const openChatGPT = q => window.open(`https://chat.openai.com/?q=${encodeURIComponent(q)}`, "_blank");
export const openClaude = q => window.open(`https://claude.ai/new?q=${encodeURIComponent(q)}`, "_blank");
export const isDesktop = () => window.innerWidth >= 1280 && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
export const CARD = {padding: "1rem", backgroundColor: "white", borderRadius: "0.75rem", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", border: "1px solid #e5e7eb"};
export const CARD_TITLE = {fontSize: "1rem", fontWeight: "600", marginBottom: "0.75rem", color: "#1f2937"};

export const useStoredState = (key, initial = "") => {
    const [value, setValue] = useState(() => localStorage.getItem(key) ?? initial);
    useEffect(() => localStorage.setItem(key, value), [key, value]);
    return [value, setValue];
};
