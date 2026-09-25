import React, {useEffect, useRef, useState} from "react";
import {InputTextarea} from "primereact/inputtextarea";
import {Button} from "primereact/button";
import {Dialog} from "primereact/dialog";
import SoundsPanel from "./SoundsPanel";
import {CARD, CARD_TITLE, openChatGPT, useStoredState} from "./shared";

const MAX = 1000;
const ARPA = {AA: "ɑ", AE: "æ", AH: "ʌ", AO: "ɔ", AW: "aʊ", AY: "aɪ", B: "b", CH: "tʃ", D: "d", DH: "ð", EH: "ɛ", ER: "ɝ", EY: "eɪ", F: "f", G: "ɡ", HH: "h", IH: "ɪ", IY: "iː", JH: "dʒ", K: "k", L: "l", M: "m", N: "n", NG: "ŋ", OW: "oʊ", OY: "ɔɪ", P: "p", R: "r", S: "s", SH: "ʃ", T: "t", TH: "θ", UH: "ʊ", UW: "uː", V: "v", W: "w", Y: "j", Z: "z", ZH: "ʒ"};
const WEAK = {AH: "ə", ER: "ɚ", IY: "i"};
let dict = null;

const DICT_URL = "https://cdn.jsdelivr.net/npm/cmu-pronouncing-dictionary@3.0.0/index.js";
const loadDict = async () => dict || (dict = (await import(/* webpackIgnore: true */ DICT_URL)).dictionary);

const toIpa = arpa => {
    const phones = arpa.split(" ").map(p => p.match(/^([A-Z]+)(\d)?$/)).filter(Boolean);
    const polysyllabic = phones.filter(p => p[2] !== undefined).length > 1;
    const out = [];
    let onset = 0;
    phones.forEach(([, ph, st]) => {
        if (st === undefined) return out.push(ARPA[ph] || "");
        if (polysyllabic && st !== "0") out.splice(onset, 0, st === "1" ? "ˈ" : "ˌ");
        out.push((st === "0" && WEAK[ph]) || ARPA[ph] || "");
        onset = out.length;
    });
    return out.join("");
};

const transcribe = word => {
    const arpa = dict?.[word.toLowerCase().replace(/[^a-z']/g, "")];
    return arpa ? toIpa(arpa) : "";
};

const splitSentences = text => (text.match(/[^.,!?]+[.,!?]*/g) || []).map(s => s.trim()).filter(Boolean);

const speak = text => {
    if (!window.speechSynthesis) return alert("This browser has no speech engine");
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const score = v => (/google|natural|online|neural|premium|enhanced/i.test(v.name) ? 2 : 0) + (v.localService ? 0 : 1) + (/en[-_]GB/i.test(v.lang) ? 1 : 0);
    const voice = speechSynthesis.getVoices().filter(v => /^en([-_]|$)/i.test(v.lang)).sort((a, b) => score(b) - score(a))[0];
    if (voice) u.voice = voice;
    u.lang = voice?.lang || "en-GB";
    u.rate = 0.9;
    speechSynthesis.speak(u);
};

const quizPrompt = text => `Create a listening comprehension quiz for the English text below. Give exactly 5 multiple-choice questions about its content, each with 3 to 5 numbered answer options (never more than 5). Do not reveal the correct answers. I will reply with my answers as comma-separated option numbers, one per question, for example: 2,4,1,3,5. After that, tell me for each question whether I was right or wrong, name the correct option and give a one-sentence explanation.

Text:
"""
${text}
"""`;

export default function ShadowingPage() {
    const [text, setText] = useStoredState("shadowing_text");
    const [sentences, setSentences] = useState([]);
    const [busy, setBusy] = useState(false);
    const [showExplain, setShowExplain] = useState(false);
    const [recording, setRecording] = useState(false);
    const [recUrl, setRecUrl] = useState(null);
    const recRef = useRef(null);
    const chunksRef = useRef([]);
    const urlRef = useRef(null);

    useEffect(() => () => {
        window.speechSynthesis?.cancel();
        const rec = recRef.current;
        if (rec?.state === "recording") {
            rec.onstop = null;
            rec.stop();
            rec.stream.getTracks().forEach(t => t.stop());
        }
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    }, []);

    const setUrl = url => {
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = url;
        setRecUrl(url);
    };

    const practice = async () => {
        if (!text.trim()) return alert("The text area is empty");
        setBusy(true);
        try {
            await loadDict();
        } catch (e) {
            console.error("Error loading dictionary:", e);
            alert("Transcription dictionary could not be loaded, words are shown without transcription");
        }
        setBusy(false);
        setSentences(splitSentences(text).map(s => ({text: s, words: s.split(/\s+/).map(w => ({w, ipa: transcribe(w)}))})));
    };

    const toggleRecord = async () => {
        if (recording) return recRef.current.stop();
        if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return alert("Recording is not supported in this browser");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({audio: true});
            const rec = new MediaRecorder(stream);
            chunksRef.current = [];
            rec.ondataavailable = e => e.data.size && chunksRef.current.push(e.data);
            rec.onstop = () => {
                stream.getTracks().forEach(t => t.stop());
                setUrl(URL.createObjectURL(new Blob(chunksRef.current, {type: rec.mimeType || "audio/webm"})));
                setRecording(false);
            };
            rec.start();
            recRef.current = rec;
            setRecording(true);
        } catch (e) {
            console.error("Microphone error:", e);
            alert("Microphone access was blocked");
        }
    };

    return (
        <div style={{padding: 10, display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 900, margin: "0 auto"}}>
            <div style={CARD}>
                <h2 style={CARD_TITLE}>Shadowing practice</h2>
                <InputTextarea value={text} onChange={e => setText(e.target.value.slice(0, MAX))} maxLength={MAX} rows={6} autoResize style={{width: "100%"}} placeholder="Paste or type an English text (max 1000 characters)"/>
                <div style={{textAlign: "right", fontSize: "0.8rem", color: text.length >= MAX ? "#dc2626" : "#6b7280"}}>{text.length} / {MAX}</div>
                <div style={{display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center", marginTop: "0.5rem"}}>
                    <Button label="Practice" icon="pi pi-play" loading={busy} onClick={practice}/>
                    <Button label="Explain" icon="pi pi-info-circle" outlined onClick={() => setShowExplain(true)}/>                    <Button label={recording ? "Stop" : "Record"} icon={recording ? "pi pi-stop-circle" : "pi pi-microphone"} severity="danger" outlined={!recording} onClick={toggleRecord}/>
                    <Button label="Reset record" icon="pi pi-replay" outlined disabled={recording || !recUrl} onClick={() => setUrl(null)}/>
                    <Button label="Listening quiz (ChatGPT)" icon="pi pi-question-circle" severity="help" onClick={() => text.trim() ? openChatGPT(quizPrompt(text.trim())) : alert("The text area is empty")}/>
                </div>
                {recUrl && <audio controls src={recUrl} style={{width: "100%", marginTop: "0.75rem"}}/>}
            </div>
            {sentences.map((s, i) => (
                <div key={i} style={{...CARD, display: "flex", gap: "0.75rem", alignItems: "flex-start"}}>
                    <Button icon="pi pi-volume-up" rounded onClick={() => speak(s.text)} style={{flexShrink: 0}}/>
                    <div style={{display: "flex", flexWrap: "wrap", gap: "0.4rem"}}>
                        {s.words.map((w, j) => (
                            <div key={j} style={{border: "1px solid #e5e7eb", borderRadius: 10, padding: "4px 10px", textAlign: "center", background: "#f9fafb"}}>
                                <div style={{fontSize: "1.05rem", fontWeight: 500}}>{w.w}</div>
                                <div style={{fontSize: "0.8rem", color: "#6b7280", fontFamily: "'Noto Serif', 'Charis SIL', serif"}}>{w.ipa ? `/${w.ipa}/` : "\u00a0"}</div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            <Dialog header="Sounds" visible={showExplain} onHide={() => setShowExplain(false)} modal style={{width: "95vw", maxWidth: 1400}} contentStyle={{padding: 0}}>
                {showExplain && <SoundsPanel/>}
            </Dialog>
        </div>
    );
}
