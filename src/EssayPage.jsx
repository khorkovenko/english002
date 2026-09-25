import React, {useEffect, useRef, useState} from "react";
import {InputTextarea} from "primereact/inputtextarea";
import {Button} from "primereact/button";
import {CARD, CARD_TITLE, isDesktop, openChatGPT, openClaude, useStoredState} from "./shared";

const MIN_WORDS = 150;
const CANVAS_HEIGHT = 1200;
const wordCount = t => t.trim().split(/\s+/).filter(Boolean).length;
const canvasWidth = () => Math.min(window.innerWidth - 40, 650);

const pen = ctx => {
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    return ctx;
};

const redraw = (canvas, paths) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    pen(ctx);
    paths.forEach(path => {
        ctx.beginPath();
        path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.stroke();
    });
};

export default function EssayPage() {
    const [prompt, setPrompt] = useStoredState("essay_prompt");
    const [essay, setEssay] = useState("");
    const [handwrite, setHandwrite] = useState(false);
    const [useFinger, setUseFinger] = useState(false);
    const [desktop, setDesktop] = useState(isDesktop);
    const [width, setWidth] = useState(canvasWidth);
    const canvasRef = useRef(null);
    const pathsRef = useRef([]);
    const strokeRef = useRef(null);
    const count = wordCount(essay);

    useEffect(() => {
        const onResize = () => {
            setDesktop(isDesktop());
            setWidth(canvasWidth());
        };
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    useEffect(() => redraw(canvasRef.current, pathsRef.current), [handwrite, width]);

    const pos = e => {
        const el = e.currentTarget, rect = el.getBoundingClientRect();
        return {x: (e.clientX - rect.left) * (el.width / rect.width), y: (e.clientY - rect.top) * (el.height / rect.height)};
    };
    const allowed = e => useFinger || e.pointerType !== "touch";
    const segment = (from, to) => {
        const ctx = pen(canvasRef.current.getContext("2d"));
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
    };
    const onDown = e => {
        if (!allowed(e)) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        const p = pos(e);
        strokeRef.current = [p];
        segment(p, p);
    };
    const onMove = e => {
        const stroke = strokeRef.current;
        if (!stroke || !allowed(e)) return;
        e.preventDefault();
        const p = pos(e);
        segment(stroke[stroke.length - 1], p);
        stroke.push(p);
    };
    const onUp = () => {
        if (strokeRef.current) pathsRef.current.push(strokeRef.current);
        strokeRef.current = null;
    };
    const clear = () => {
        pathsRef.current = [];
        redraw(canvasRef.current, pathsRef.current);
    };

    const finishText = () => openChatGPT(`${prompt.trim()}\n\n${essay.trim()}`);
    const finishCanvas = () => {
        if (!pathsRef.current.length) return alert("Nothing is written yet");
        openClaude(`${prompt.trim()}\n\nMy essay is handwritten in the attached image (essay.png, just downloaded to this device). First transcribe it exactly as written, then do the task above using that transcription.`);
        const a = document.createElement("a");
        a.href = canvasRef.current.toDataURL("image/png");
        a.download = "essay.png";
        a.click();
    };

    const toolbar = handwrite ? (
        <>
            <Button label={useFinger ? "Fingers allowed" : "Only stylus"} icon="pi pi-pencil" className="p-button-warning" onClick={() => setUseFinger(v => !v)}/>
            <Button label="Clear" icon="pi pi-replay" className="p-button-danger" onClick={clear}/>
            <Button label="Finish" icon="pi pi-check" className="p-button-success" onClick={finishCanvas}/>
        </>
    ) : (
        <>
            <span style={{fontSize: "0.85rem", color: count >= MIN_WORDS ? "#16a34a" : "#6b7280"}}>{count} / {MIN_WORDS} words</span>
            <Button label="Finish" icon="pi pi-check" className="p-button-success" disabled={count < MIN_WORDS} onClick={finishText}/>
        </>
    );

    return (
        <div style={{padding: 10, display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 900, margin: "0 auto"}}>
            <div style={CARD}>
                <h2 style={CARD_TITLE}>Prompt for the AI</h2>
                <InputTextarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} autoResize style={{width: "100%"}} placeholder="Instructions ChatGPT / Claude should follow when checking your essay"/>
            </div>
            <div style={CARD}>
                <div style={{display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center", position: "sticky", top: 0, zIndex: 1, background: "white", padding: "0.25rem 0 0.5rem"}}>
                    <h2 style={{...CARD_TITLE, marginBottom: 0, flex: 1}}>Essay</h2>
                    {!desktop && <Button label={handwrite ? "Type" : "Handwrite"} icon={handwrite ? "pi pi-align-left" : "pi pi-pencil"} outlined onClick={() => setHandwrite(v => !v)}/>}
                    {toolbar}
                </div>
                {handwrite
                    ? <canvas ref={canvasRef} width={width} height={CANVAS_HEIGHT} onContextMenu={e => e.preventDefault()}
                              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
                              style={{border: "2px solid #1976D2", borderRadius: "8px", cursor: "crosshair", touchAction: "none", userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none", WebkitTapHighlightColor: "transparent", maxWidth: "100%", display: "block"}}/>
                    : <InputTextarea value={essay} onChange={e => setEssay(e.target.value)} rows={14} style={{width: "100%"}} placeholder="Write your essay here"/>}
            </div>
        </div>
    );
}
