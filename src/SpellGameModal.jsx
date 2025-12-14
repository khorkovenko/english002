import React, { useRef, useState, useEffect } from "react";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

export const SpellGameModal = ({ spellText, visible, onClose }) => {
    const canvasRef = useRef(null);
    const [drawing, setDrawing] = useState(false);
    const [paths, setPaths] = useState([]);
    const [currentPath, setCurrentPath] = useState([]);
    const [useFinger, setUseFinger] = useState(false);
    const [canvasWidth, setCanvasWidth] = useState(650);
    const [canvasHeight, setCanvasHeight] = useState(400);

    useEffect(() => {
        const updateCanvasSize = () => {
            const width = Math.min(window.innerWidth - 40, 650);
            setCanvasWidth(width);
        };
        updateCanvasSize();
        window.addEventListener("resize", updateCanvasSize);
        return () => window.removeEventListener("resize", updateCanvasSize);
    }, []);

    useEffect(() => {
        if (!visible) return;
        const prevOverflow = document.body.style.overflow;
        const prevPosition = document.body.style.position;
        document.body.style.overflow = "hidden";
        document.body.style.position = "fixed";
        return () => {
            document.body.style.overflow = prevOverflow;
            document.body.style.position = prevPosition;
        };
    }, [visible]);

    useEffect(() => {
        if (!spellText) return;
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvasWidth;
        const ctx = tempCanvas.getContext("2d");
        ctx.font = "bold 36px Arial";

        const padding = 20;
        const startX = padding + 5;
        let x = startX;
        let lines = 1;
        const lineHeight = 45;
        const maxWidth = canvasWidth - padding * 2;

        spellText.split(" ").forEach(word => {
            const wordWidth = ctx.measureText(word).width;
            const spaceWidth = ctx.measureText(" ").width;

            if (x > startX && x + wordWidth > canvasWidth - padding) {
                lines++;
                x = startX;
            }

            if (wordWidth > maxWidth) {
                [...word].forEach(char => {
                    const charWidth = ctx.measureText(char).width;
                    if (x + charWidth > canvasWidth - padding) {
                        lines++;
                        x = startX;
                    }
                    x += charWidth;
                });
            } else {
                x += wordWidth;
            }
            x += spaceWidth;
        });

        setCanvasHeight(Math.max(400, lines * lineHeight + padding * 2 + 60));
    }, [spellText, canvasWidth]);

    const renderTextWithUnderlines = (ctx, canvas) => {
        ctx.font = "bold 36px Arial";
        ctx.textBaseline = "top";
        ctx.strokeStyle = "#4285F4";
        ctx.lineWidth = 2;

        const padding = 20;
        const startX = padding + 5;
        let x = startX;
        let y = padding - 13;
        const lineHeight = 45;
        const underlineOffset = 40;
        const maxWidth = canvas.width - padding * 2;

        spellText.split(" ").forEach((word, wi, arr) => {
            const wordWidth = ctx.measureText(word).width;
            const spaceWidth = ctx.measureText(" ").width;

            if (x > startX && x + wordWidth > canvas.width - padding) {
                x = startX;
                y += lineHeight;
            }

            if (wordWidth > maxWidth) {
                [...word].forEach(char => {
                    const charWidth = ctx.measureText(char).width;
                    if (x + charWidth > canvas.width - padding) {
                        x = startX;
                        y += lineHeight;
                    }
                    ctx.fillText(char, x, y);
                    ctx.beginPath();
                    ctx.moveTo(x, y + underlineOffset);
                    ctx.lineTo(x + charWidth, y + underlineOffset);
                    ctx.stroke();
                    x += charWidth;
                });
            } else {
                ctx.fillText(word, x, y);
                ctx.beginPath();
                ctx.moveTo(x, y + underlineOffset);
                ctx.lineTo(x + wordWidth, y + underlineOffset);
                ctx.stroke();
                x += wordWidth;
            }

            if (wi < arr.length - 1) {
                ctx.beginPath();
                ctx.moveTo(x, y + underlineOffset);
                ctx.lineTo(x + spaceWidth, y + underlineOffset);
                ctx.stroke();
                x += spaceWidth;
            }
        });
    };

    const renderTextOnly = (ctx, canvas) => {
        ctx.font = "bold 36px Arial";
        ctx.textBaseline = "top";

        const padding = 20;
        const startX = padding + 5;
        let x = startX;
        let y = padding - 13;
        const lineHeight = 45;
        const maxWidth = canvas.width - padding * 2;

        spellText.split(" ").forEach(word => {
            const wordWidth = ctx.measureText(word).width;
            const spaceWidth = ctx.measureText(" ").width;

            if (x > startX && x + wordWidth > canvas.width - padding) {
                x = startX;
                y += lineHeight;
            }

            if (wordWidth > maxWidth) {
                [...word].forEach(char => {
                    const charWidth = ctx.measureText(char).width;
                    if (x + charWidth > canvas.width - padding) {
                        x = startX;
                        y += lineHeight;
                    }
                    ctx.fillText(char, x, y);
                    x += charWidth;
                });
            } else {
                ctx.fillText(word, x, y);
                x += wordWidth;
            }
            x += spaceWidth;
        });
    };

    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
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

        [...paths, currentPath].forEach(path => {
            if (!path.length) return;
            ctx.beginPath();
            path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
            ctx.stroke();
        });
    }, [paths, currentPath, spellText, canvasWidth, canvasHeight]);

    const getOffset = (el, clientX, clientY) => {
        const rect = el.getBoundingClientRect();
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const down = e => {
            if (!useFinger && e.pointerType !== "pen") return;
            e.preventDefault();
            canvas.setPointerCapture(e.pointerId);
            setDrawing(true);
            const pos = getOffset(canvas, e.clientX, e.clientY);
            setCurrentPath([{ x: pos.x, y: pos.y }]);
        };

        const move = e => {
            if (!drawing) return;
            if (!useFinger && e.pointerType !== "pen") return;
            e.preventDefault();
            const pos = getOffset(canvas, e.clientX, e.clientY);
            setCurrentPath(p => [...p, { x: pos.x, y: pos.y }]);
        };

        const up = e => {
            if (!drawing) return;
            e.preventDefault();
            try { canvas.releasePointerCapture(e.pointerId); } catch {}
            setDrawing(false);
            setPaths(p => [...p, currentPath]);
            setCurrentPath([]);
        };

        canvas.addEventListener("pointerdown", down, { passive: false });
        canvas.addEventListener("pointermove", move, { passive: false });
        canvas.addEventListener("pointerup", up, { passive: false });
        canvas.addEventListener("pointercancel", up, { passive: false });

        return () => {
            canvas.removeEventListener("pointerdown", down);
            canvas.removeEventListener("pointermove", move);
            canvas.removeEventListener("pointerup", up);
            canvas.removeEventListener("pointercancel", up);
        };
    }, [drawing, useFinger, currentPath]);

    const handleReset = () => {
        setPaths([]);
        setCurrentPath([]);
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

        let hit = 0;
        let total = 0;

        paths.forEach(path =>
            path.forEach(p => {
                total++;
                const i = ((p.y | 0) * off.width + (p.x | 0)) * 4;
                if (data[i + 3] > 0) hit++;
            })
        );

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
            closable={false}
            style={{ width: "95vw", maxWidth: "700px" }}
            contentStyle={{
                padding: "1rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                maxHeight: "85vh",
                overflowY: "auto"
            }}
            onHide={onClose}
        >
            <canvas
                ref={canvasRef}
                width={canvasWidth}
                height={canvasHeight}
                onContextMenu={e => e.preventDefault()}
                style={{
                    border: "2px solid #1976D2",
                    borderRadius: "8px",
                    cursor: "crosshair",
                    marginBottom: "1rem",
                    touchAction: "none",
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    WebkitTouchCallout: "none",
                    WebkitTapHighlightColor: "transparent",
                    maxWidth: "100%",
                    display: "block"
                }}
            />
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
                <Button
                    label={useFinger ? "Fingers allowed" : "Only stylus"}
                    icon="pi pi-pencil"
                    className="p-button-warning"
                    onClick={() => setUseFinger(v => !v)}
                />
                <Button
                    label="Reset"
                    icon="pi pi-replay"
                    className="p-button-danger"
                    onClick={handleReset}
                />
                <Button
                    label="Finish"
                    icon="pi pi-check"
                    className="p-button-success"
                    onClick={calculateAccuracy}
                />
                <Button
                    label="Close"
                    icon="pi pi-times"
                    className="p-button-secondary"
                    onClick={onClose}
                />
            </div>
        </Dialog>
    );
};

export default SpellGameModal;
