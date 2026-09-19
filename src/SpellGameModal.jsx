import React, { useRef, useState, useEffect } from "react";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

const FONTS = [
    { label: "Patrick Hand (print)", value: "Patrick Hand" },
    { label: "Schoolbell (print)", value: "Schoolbell" },
    { label: "Cedarville Cursive (cursive)", value: "Cedarville Cursive" },
];
const FONT_SIZES = [42, 52, 63, 74, 84].map(v => ({ label: `${v}px`, value: v }));
const PAD = 20;
const TOP_PAD = 30;

export const SpellGameModal = ({ spellText, visible, onClose }) => {
    const canvasRef = useRef(null);
    const [paths, setPaths] = useState([]);
    const drawingRef = useRef(false);
    const currentPathRef = useRef([]);
    const [useFinger, setUseFinger] = useState(false);
    const [canvasWidth, setCanvasWidth] = useState(650);
    const [canvasHeight, setCanvasHeight] = useState(400);
    const [fontFamily, setFontFamily] = useState(FONTS[0].value);
    const [fontSize, setFontSize] = useState(63);

    const lineHeight = Math.round(fontSize * 1.2);
    const underlineOffset = Math.round(fontSize * 1.05);
    const topOffset = Math.round(fontSize * 0.31);
    const fontSpec = `${fontSize}px '${fontFamily}', cursive`;

    useEffect(() => {
        const updateCanvasSize = () => setCanvasWidth(Math.min(window.innerWidth - 40, 650));
        updateCanvasSize();
        window.addEventListener("resize", updateCanvasSize);
        return () => window.removeEventListener("resize", updateCanvasSize);
    }, []);

    const layout = (ctx, width, draw) => {
        const startX = PAD + 5;
        const maxX = width - PAD;
        let x = startX, y = PAD + TOP_PAD - topOffset, lines = 1;
        const newLine = () => {
            x = startX;
            y += lineHeight;
            lines++;
        };
        const words = spellText.split(" ");
        words.forEach((word, wi) => {
            const wordWidth = ctx.measureText(word).width;
            const spaceWidth = ctx.measureText(" ").width;
            if (x > startX && x + wordWidth > maxX) newLine();
            const perChar = wordWidth > width - PAD * 2;
            (perChar ? [...word] : [word]).forEach(g => {
                const w = ctx.measureText(g).width;
                if (perChar && x + w > maxX) newLine();
                draw?.(g, x, y, w);
                x += w;
            });
            if (wi < words.length - 1) {
                draw?.(null, x, y, spaceWidth);
                x += spaceWidth;
            }
        });
        return lines;
    };

    useEffect(() => {
        if (!spellText) return;
        const ctx = document.createElement("canvas").getContext("2d");
        ctx.font = fontSpec;
        setCanvasHeight(Math.max(400, layout(ctx, canvasWidth) * lineHeight + PAD * 2 + TOP_PAD + 60));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [spellText, canvasWidth, fontSpec, lineHeight, topOffset]);

    const renderTextWithUnderlines = (ctx, canvas) => {
        ctx.font = fontSpec;
        ctx.textBaseline = "top";
        ctx.strokeStyle = "#4285F4";
        ctx.lineWidth = 2;
        layout(ctx, canvas.width, (g, x, y, w) => {
            if (g) ctx.fillText(g, x, y);
            ctx.beginPath();
            ctx.moveTo(x, y + underlineOffset);
            ctx.lineTo(x + w, y + underlineOffset);
            ctx.stroke();
        });
    };

    const renderTextOnly = (ctx, canvas) => {
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textBaseline = "top";
        layout(ctx, canvas.width, (g, x, y) => g && ctx.fillText(g, x, y));
    };

    const drawCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#E3F2FD";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "rgba(100,100,100,0.3)";
        renderTextWithUnderlines(ctx, canvas);
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 4;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        [...paths, currentPathRef.current].forEach(path => {
            if (!path.length) return;
            ctx.beginPath();
            path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
            ctx.stroke();
        });
    };

    useEffect(() => {
        drawCanvas();
    }, [paths, spellText, canvasWidth, canvasHeight, fontSpec]);

    useEffect(() => {
        document.fonts?.load(fontSpec).then(drawCanvas);
    }, [fontSpec]);

    useEffect(() => {
        if (!visible) return;
        requestAnimationFrame(drawCanvas);
    }, [visible, canvasWidth, canvasHeight]);

    const getOffset = (el, clientX, clientY) => {
        const rect = el.getBoundingClientRect();
        return {
            x: (clientX - rect.left) * (el.width / rect.width),
            y: (clientY - rect.top) * (el.height / rect.height)
        };
    };

    const handleReset = () => {
        drawingRef.current = false;
        currentPathRef.current = [];
        setPaths([]);
    };

    const drawSegment = (from, to) => {
        const ctx = canvasRef.current.getContext("2d");
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 4;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
    };

    const finishStroke = () => {
        if (!drawingRef.current) return;
        drawingRef.current = false;
        const path = currentPathRef.current;
        currentPathRef.current = [];
        if (path.length) setPaths(p => [...p, path]);
    };

    const calculateAccuracy = () => {
        const canvas = canvasRef.current;
        const off = document.createElement("canvas");
        off.width = canvas.width;
        off.height = canvas.height;
        const ctx = off.getContext("2d");
        ctx.fillStyle = "black";
        renderTextOnly(ctx, off);
        const data = ctx.getImageData(0, 0, off.width, off.height).data;
        let hit = 0, total = 0;
        paths.forEach(path => path.forEach(p => {
            total++;
            if (data[((p.y | 0) * off.width + (p.x | 0)) * 4 + 3] > 0) hit++;
        }));
        const accuracy = total ? Math.round((hit / total) * 100) : 0;
        if (accuracy >= 80) {
            alert(`Great job! Your accuracy: ${accuracy}%`);
            onClose();
        } else {
            alert(`Your accuracy is ${accuracy}%. You need at least 80%. Try again!`);
            handleReset();
        }
    };

    return (
        <Dialog
            header="Spell the word"
            visible={visible}
            modal
            blockScroll
            closable={false}
            focusOnShow={false}
            style={{ width: "95vw", maxWidth: "700px" }}
            contentStyle={{ padding: "1rem", display: "flex", flexDirection: "column", alignItems: "center", maxHeight: "85vh", overflowY: "auto" }}
            onHide={onClose}
            onShow={() => requestAnimationFrame(() => {
                drawCanvas();
                canvasRef.current?.focus({ preventScroll: true });
            })}
        >
            <canvas
                ref={canvasRef}
                tabIndex={0}
                width={canvasWidth}
                height={canvasHeight}
                onContextMenu={e => e.preventDefault()}
                onPointerDown={e => {
                    if (!useFinger && e.pointerType !== "pen") return;
                    e.preventDefault();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    drawingRef.current = true;
                    const pos = getOffset(e.currentTarget, e.clientX, e.clientY);
                    currentPathRef.current = [pos];
                    drawSegment(pos, pos);
                }}
                onPointerMove={e => {
                    if (!drawingRef.current || (!useFinger && e.pointerType !== "pen")) return;
                    e.preventDefault();
                    const path = currentPathRef.current;
                    const pos = getOffset(e.currentTarget, e.clientX, e.clientY);
                    drawSegment(path[path.length - 1], pos);
                    path.push(pos);
                }}
                onPointerUp={finishStroke}
                onPointerCancel={finishStroke}
                style={{
                    border: "2px solid #1976D2", borderRadius: "8px", cursor: "crosshair", marginBottom: "1rem",
                    touchAction: "none", userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none",
                    WebkitTapHighlightColor: "transparent", maxWidth: "100%", display: "block"
                }}
            />
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
                <Dropdown value={fontFamily} options={FONTS} onChange={e => setFontFamily(e.value)} style={{ minWidth: "12rem" }}/>
                <Dropdown value={fontSize} options={FONT_SIZES} onChange={e => setFontSize(e.value)} style={{ minWidth: "6rem" }}/>
                <Button label={useFinger ? "Fingers allowed" : "Only stylus"} icon="pi pi-pencil" className="p-button-warning" onClick={() => setUseFinger(v => !v)}/>
                <Button label="Reset" icon="pi pi-replay" className="p-button-danger" onClick={handleReset}/>
                <Button label="Finish" icon="pi pi-check" className="p-button-success" onClick={calculateAccuracy}/>
                <Button label="Close" icon="pi pi-times" className="p-button-secondary" onClick={onClose}/>
            </div>
        </Dialog>
    );
};

export default SpellGameModal;