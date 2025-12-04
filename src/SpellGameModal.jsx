import React, { useRef, useState, useEffect } from "react";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

const SpellGameModal = ({ spellText, visible, onClose }) => {
    const canvasRef = useRef(null);
    const [drawing, setDrawing] = useState(false);
    const [paths, setPaths] = useState([]);
    const [currentPath, setCurrentPath] = useState([]);
    const [useFinger, setUseFinger] = useState(false); // false = stylus only

    
const lineSpacing = 30;

useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Notebook lines
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 1;
    for (let i = 1; i < canvas.height / lineSpacing; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * lineSpacing);
        ctx.lineTo(canvas.width, i * lineSpacing);
        ctx.stroke();
    }

    // Spell text at top-left
    ctx.font = "bold 32px cursive";
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.textBaseline = "top";
    ctx.fillText(spellText, 10, 10);

    // Draw saved paths
    ctx.strokeStyle = "#007ad9";
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

    // Draw current path
    if (currentPath.length > 0) {
        ctx.beginPath();
        currentPath.forEach((point, i) => {
            if (i === 0) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
    }
}, [paths, currentPath, spellText]);

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
    if (!useFinger && e.pointerType !== "pen") return; // stylus only by default
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

const calculateAccuracy = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const offCanvas = document.createElement("canvas");
    offCanvas.width = canvas.width;
    offCanvas.height = canvas.height;
    const offCtx = offCanvas.getContext("2d");

    offCtx.font = "32px cursive";
    offCtx.fillStyle = "black";
    offCtx.textBaseline = "top";
    offCtx.fillText(spellText, 10, 10);

    const imageData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height).data;

    let pointsOnText = 0;
    let totalPoints = 0;

    paths.forEach(path => {
        path.forEach(p => {
            totalPoints++;
            const index = (Math.floor(p.y) * offCanvas.width + Math.floor(p.x)) * 4;
            if (imageData[index + 3] > 0) pointsOnText++;
        });
    });

    const accuracy = totalPoints > 0 ? Math.round((pointsOnText / totalPoints) * 100) : 0;
    alert(`Your accuracy: ${accuracy}%`);
};

return (
    <Dialog
        header={`Spell the word`}
        visible={visible}
        modal
        closable={false}
        style={{ width: "90vw", maxWidth: "700px", padding: "0" }}
        contentStyle={{ padding: "1rem", display: "flex", flexDirection: "column", alignItems: "center" }}
        onHide={onClose}
    >
        <canvas
            ref={canvasRef}
            tabIndex={0}
            width={650}
            height={400}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            style={{
                border: "2px solid #007ad9",
                borderRadius: "8px",
                cursor: "crosshair",
                marginBottom: "1rem",
                background: "#fff8e7",
                touchAction: "none"
            }}
        />
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <Button label={useFinger ? "Fingers allowed" : "Only stylus"} icon="pi pi-exchange" className="p-button-warning" onClick={() => setUseFinger(!useFinger)} />
            <Button label="Finish Spell" icon="pi pi-check" className="p-button-success" onClick={calculateAccuracy} />
            <Button label="Close" icon="pi pi-times" className="p-button-secondary" onClick={onClose} />
        </div>
    </Dialog>
);


};

export default SpellGameModal;
