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

    const lineSpacing = 40;

    useEffect(() => {
        const updateCanvasSize = () => {
            const width = Math.min(window.innerWidth - 40, 650);
            setCanvasWidth(width);
        };
        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);
        return () => window.removeEventListener('resize', updateCanvasSize);
    }, []);

    // Calculate required canvas height based on text length
    useEffect(() => {
        if (!spellText) return;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasWidth;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.font = "bold 36px Arial";

        const padding = 20;
        const startX = padding + 5;
        const maxWidth = canvasWidth - padding * 2;
        let x = startX;
        let lineCount = 1;
        const lineHeight = 45;

        const words = spellText.split(' ');

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const wordWidth = tempCtx.measureText(word).width;
            const spaceWidth = tempCtx.measureText(' ').width;

            if (x > startX && x + wordWidth > canvasWidth - padding) {
                lineCount++;
                x = startX;
            }

            if (wordWidth > maxWidth) {
                for (let j = 0; j < word.length; j++) {
                    const charWidth = tempCtx.measureText(word[j]).width;
                    const hyphenWidth = tempCtx.measureText('-').width;

                    if (x + charWidth + hyphenWidth > canvasWidth - padding && j < word.length - 1) {
                        lineCount++;
                        x = startX;
                    }
                    x += charWidth;
                }
            } else {
                x += wordWidth;
            }

            if (i < words.length - 1) {
                x += spaceWidth;
            }
        }

        const calculatedHeight = (lineCount * lineHeight) + (padding * 2) + 60;
        setCanvasHeight(Math.max(400, calculatedHeight));
    }, [spellText, canvasWidth]);

    const renderTextWithUnderlines = (ctx, canvas) => {
        ctx.font = "bold 36px Arial";
        ctx.textBaseline = "top";

        const padding = 20;
        const startX = padding + 5;
        const startY = padding - 13;
        const maxWidth = canvas.width - padding * 2;
        let x = startX;
        let y = startY;
        const lineHeight = 45;
        const underlineOffset = 40;

        const words = spellText.split(' ');

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const wordWidth = ctx.measureText(word).width;
            const spaceWidth = ctx.measureText(' ').width;

            if (x > startX && x + wordWidth > canvas.width - padding) {
                x = startX;
                y += lineHeight;
            }

            if (wordWidth > maxWidth) {
                for (let j = 0; j < word.length; j++) {
                    const char = word[j];
                    const charWidth = ctx.measureText(char).width;
                    const hyphenWidth = ctx.measureText('-').width;

                    if (x + charWidth + hyphenWidth > canvas.width - padding && j < word.length - 1) {
                        ctx.fillText('-', x, y);
                        x = startX;
                        y += lineHeight;
                    }

                    const charX = x;
                    ctx.fillText(char, x, y);

                    ctx.strokeStyle = "#4285F4";
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(charX, y + underlineOffset);
                    ctx.lineTo(charX + charWidth, y + underlineOffset);
                    ctx.stroke();

                    x += charWidth;
                }
            } else {
                const wordX = x;
                ctx.fillText(word, x, y);

                ctx.strokeStyle = "#4285F4";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(wordX, y + underlineOffset);
                ctx.lineTo(wordX + wordWidth, y + underlineOffset);
                ctx.stroke();

                x += wordWidth;
            }

            if (i < words.length - 1) {
                const spaceX = x;
                ctx.strokeStyle = "#4285F4";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(spaceX, y + underlineOffset);
                ctx.lineTo(spaceX + spaceWidth, y + underlineOffset);
                ctx.stroke();

                x += spaceWidth;
            }
        }
    };

    const renderTextOnly = (ctx, canvas) => {
        ctx.font = "bold 36px Arial";
        ctx.textBaseline = "top";

        const padding = 20;
        const startX = padding + 5;
        const startY = padding - 13;
        const maxWidth = canvas.width - padding * 2;
        let x = startX;
        let y = startY;
        const lineHeight = 45;

        const words = spellText.split(' ');

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const wordWidth = ctx.measureText(word).width;
            const spaceWidth = ctx.measureText(' ').width;

            if (x > startX && x + wordWidth > canvas.width - padding) {
                x = startX;
                y += lineHeight;
            }

            if (wordWidth > maxWidth) {
                for (let j = 0; j < word.length; j++) {
                    const char = word[j];
                    const charWidth = ctx.measureText(char).width;
                    const hyphenWidth = ctx.measureText('-').width;

                    if (x + charWidth + hyphenWidth > canvas.width - padding && j < word.length - 1) {
                        ctx.fillText('-', x, y);
                        x = startX;
                        y += lineHeight;
                    }

                    ctx.fillText(char, x, y);
                    x += charWidth;
                }
            } else {
                ctx.fillText(word, x, y);
                x += wordWidth;
            }

            if (i < words.length - 1) {
                x += spaceWidth;
            }
        }
    };

    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#E3F2FD";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "rgba(100, 100, 100, 0.3)";
        renderTextWithUnderlines(ctx, canvas);

        ctx.strokeStyle = "#D32F2F";
        ctx.lineWidth = 4;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        paths.forEach(path => {
            ctx.beginPath();
            path.forEach((point, i) => {
                if (i === 0) ctx.moveTo(point.x, point.y);
                else ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();
        });

        if (currentPath.length > 0) {
            ctx.beginPath();
            currentPath.forEach((point, i) => {
                if (i === 0) ctx.moveTo(point.x, point.y);
                else ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();
        }
    }, [paths, currentPath, spellText, canvasWidth, canvasHeight]);

    useEffect(() => {
        if (visible && canvasRef.current) {
            canvasRef.current.focus();
        }
    }, [visible]);

    const getOffset = (element, x, y) => {
        const rect = element.getBoundingClientRect();
        return { x: x - rect.left, y: y - rect.top };
    };

    const handlePointerDown = (e) => {
        if (!useFinger && e.pointerType !== "pen") return;
        setDrawing(true);
        const pos = getOffset(e.target, e.clientX, e.clientY);
        setCurrentPath([{ x: pos.x, y: pos.y }]);
    };

    const handlePointerMove = (e) => {
        if (!drawing) return;
        if (!useFinger && e.pointerType !== "pen") return;
        const pos = getOffset(e.target, e.clientX, e.clientY);
        setCurrentPath(prev => [...prev, { x: pos.x, y: pos.y }]);
    };

    const handlePointerUp = () => {
        if (!drawing) return;
        setDrawing(false);
        setPaths(prev => [...prev, currentPath]);
        setCurrentPath([]);
    };

    const handleReset = () => {
        setPaths([]);
        setCurrentPath([]);
    };

    const calculateAccuracy = () => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const offCanvas = document.createElement("canvas");
        offCanvas.width = canvas.width;
        offCanvas.height = canvas.height;
        const offCtx = offCanvas.getContext("2d");

        offCtx.fillStyle = "black";
        renderTextOnly(offCtx, offCanvas);

        const imageData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height).data;

        let pointsOnText = 0;
        let totalPoints = 0;

        paths.forEach(path => {
            path.forEach(p => {
                totalPoints++;
                const px = Math.floor(p.x);
                const py = Math.floor(p.y);
                if (px >= 0 && px < offCanvas.width && py >= 0 && py < offCanvas.height) {
                    const index = (py * offCanvas.width + px) * 4;
                    if (imageData[index + 3] > 0) pointsOnText++;
                }
            });
        });

        const accuracy = totalPoints > 0 ? Math.round((pointsOnText / totalPoints) * 100) : 0;

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
            style={{ width: "95vw", maxWidth: "700px", padding: "0" }}
            contentStyle={{
                padding: "1rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                overflowX: "hidden",
                maxHeight: "85vh",
                overflowY: "auto"
            }}
            onHide={onClose}
        >
            <canvas
                ref={canvasRef}
                tabIndex={0}
                width={canvasWidth}
                height={canvasHeight}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                style={{
                    border: "2px solid #1976D2",
                    borderRadius: "8px",
                    cursor: "crosshair",
                    marginBottom: "1rem",
                    touchAction: "none",
                    maxWidth: "100%",
                    display: "block"
                }}
            />
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
                <Button
                    label={useFinger ? "Fingers allowed" : "Only stylus"}
                    icon="pi pi-pencil"
                    className="p-button-warning"
                    onClick={() => setUseFinger(!useFinger)}
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