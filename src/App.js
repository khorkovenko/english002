// src/App.js
import React, { useState, useRef } from "react";
import "primereact/resources/themes/saga-blue/theme.css"; // theme
import "primereact/resources/primereact.min.css"; // core
import "primeicons/primeicons.css"; // icons
import "primeflex/primeflex.css"; // optional flex utilities

import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { Toast } from "primereact/toast";

/**
 * App combines:
 * - Filters (client-side) like LazyLoadDemo (filter display = row)
 * - Row editing like RowEditingDemo (row editor)
 * - Delete button
 * - Auto order number
 * - AI actions column with dynamic buttons by label
 *
 * NOTE: Replace `openAiChat` URL with a real AI chat route or integration.
 */

const LABELS = [
    { label: "word", value: "word" },
    { label: "rule", value: "rule" },
    { label: "topic", value: "topic" },
];

// Default actions mapped by label. You can extend this mapping.
const defaultActionsByLabel = {
    word: [
        { key: "explain", text: "Explain (AI)", type: "ai" },
        { key: "practice", text: "Practice (Game)", type: "game", game: "spell" },
    ],
    rule: [
        { key: "explainRule", text: "Explain Rule (AI)", type: "ai" },
        // add more default actions for 'rule' here
    ],
    topic: [
        { key: "discuss", text: "Discuss (AI)", type: "ai" },
        { key: "practiceTopic", text: "Practice (Game)", type: "game", game: "typing" },
    ],
};

const initialData = [
    {
        id: 1,
        label: "word",
        content: "ubiquitous",
        explanation: "Found everywhere; omnipresent.",
    },
    {
        id: 2,
        label: "rule",
        content: "subject-verb agreement",
        explanation: "Subjects and verbs must agree in number.",
    },
    {
        id: 3,
        label: "topic",
        content: "present perfect",
        explanation: "Used for actions with relevance to present.",
    },
    {
        id: 4,
        label: "word",
        content: "serendipity",
        explanation: "Finding something good without looking for it.",
    },
];

export default function App() {
    const [rows, setRows] = useState(initialData);
    const [editingRows, setEditingRows] = useState({});
    const toast = useRef(null);

    // Helper: severity for Tag (just visual)
    const getSeverity = (label) => {
        switch (label) {
            case "word":
                return "info";
            case "rule":
                return "success";
            case "topic":
                return "warning";
            default:
                return null;
        }
    };

    // Row editor complete handler
    const onRowEditComplete = (e) => {
        const _rows = [...rows];
        const { newData, index } = e;
        _rows[index] = newData;
        setRows(_rows);
        toast.current.show({ severity: "success", summary: "Saved", detail: "Row updated", life: 1500 });
    };

    // Row editor validators / editors
    const textEditor = (options, field) => {
        return (
            <InputText
                type="text"
                value={options.value}
                onChange={(e) => options.editorCallback({ ...options.rowData, [field]: e.target.value })}
                autoFocus
            />
        );
    };

    const labelEditor = (options) => {
        return (
            <Dropdown
                value={options.value}
                options={LABELS}
                onChange={(e) => options.editorCallback({ ...options.rowData, label: e.value })}
                optionLabel="label"
                placeholder="Select a label"
            />
        );
    };

    // Delete row
    const deleteRow = (rowData) => {
        const filtered = rows.filter((r) => r.id !== rowData.id);
        setRows(filtered);
        toast.current.show({ severity: "info", summary: "Deleted", detail: `Row ${rowData.id} removed`, life: 1500 });
    };

    // Add new row (simple)
    const addRow = () => {
        const nextId = rows.length ? Math.max(...rows.map((r) => r.id)) + 1 : 1;
        const newRow = { id: nextId, label: "word", content: "new item", explanation: "explain..." };
        setRows([newRow, ...rows]);
    };

    // AI action: open new window (replace URL with real chat)
    const openAiChat = (row, actionKey) => {
        // Create a safe query that includes content + explanation
        const params = new URLSearchParams({
            content: row.content,
            explanation: row.explanation,
            action: actionKey,
        });
        // Replace this URL with your AI chat route or integration - this is a placeholder.
        const url = `https://example.com/ai-chat?${params.toString()}`;
        window.open(url, "_blank");
    };

    // Game action: open modal/game - placeholder (you can open your modal here)
    const openGame = (row, game) => {
        // Example: if you use SpellGameModal or TypingTrainerModal, you can set state to open them
        // For demo, we'll just open an alert and show where to hook your modals
        // TODO: Replace alert with real modal calls: setShowSpellModal(true) / setShowTypingModal(true)
        alert(`Open game '${game}' for:\n\nContent: ${row.content}\nExplanation: ${row.explanation}`);
    };

    // Renderers
    const orderBody = (rowData, props) => {
        const index = rows.findIndex((r) => r.id === rowData.id);
        return <span>{index + 1}</span>;
    };

    const labelBody = (rowData) => {
        return <Tag value={rowData.label} severity={getSeverity(rowData.label)} />;
    };

    const actionsBody = (rowData) => {
        // Merge defaultActionsByLabel and any custom actions you plan to add (future extension)
        // For now we use defaultActionsByLabel
        const actions = defaultActionsByLabel[rowData.label] || [];

        return (
            <div className="p-d-flex p-flex-wrap" style={{ gap: 8 }}>
                {actions.map((act) => {
                    if (act.type === "ai") {
                        return (
                            <Button
                                key={act.key}
                                label={act.text}
                                className="p-button-text"
                                onClick={() => openAiChat(rowData, act.key)}
                            />
                        );
                    } else if (act.type === "game") {
                        return (
                            <Button
                                key={act.key}
                                label={act.text}
                                icon="pi pi-play"
                                onClick={() => openGame(rowData, act.game)}
                            />
                        );
                    } else {
                        // generic action
                        return (
                            <Button key={act.key} label={act.text} onClick={() => alert(`Action ${act.key} for ${rowData.id}`)} />
                        );
                    }
                })}

                {/* Place to render dynamically-added custom buttons per row/label in the future.
            You can store per-label action definitions in state and render them here. */}
            </div>
        );
    };

    // Row-level editor (edit + delete like RowEditingDemo)
    const rowEditorTemplate = (rowData, options) => {
        const allow = () => true;
        // If you want conditional editing like 'allowEdit' in example, implement it here
        return <></>; // DataTable will render default row editor controls (save/cancel) automatically when using rowEditor prop
    };

    // DataTable filter row templates (we use built-in filter display='row')
    // Column editors use the functions above

    return (
        <div className="card p-fluid" style={{ padding: 20 }}>
            <Toast ref={toast} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h2>Combined Table — Single Page, Editable Rows, AI Actions</h2>
                <div>
                    <Button icon="pi pi-plus" label="Add Row" className="p-button-success p-mr-2" onClick={addRow} />
                </div>
            </div>

            <DataTable
                value={rows}
                editMode="row"
                dataKey="id"
                onRowEditComplete={onRowEditComplete}
                filterDisplay="row" // shows filters at the top row
                tableStyle={{ minWidth: "60rem" }}
                // no paginator — all data displayed
            >
                <Column header="#" body={orderBody} style={{ width: "4rem", textAlign: "center" }} />
                <Column
                    field="label"
                    header="Label"
                    editor={(options) => labelEditor(options)}
                    body={labelBody}
                    filter
                    filterPlaceholder="Filter by label"
                    filterField="label"
                    style={{ width: "12rem" }}
                />
                <Column
                    field="content"
                    header="Content"
                    editor={(options) => textEditor(options, "content")}
                    filter
                    filterPlaceholder="Search content"
                    style={{ minWidth: "18rem" }}
                />
                <Column
                    field="explanation"
                    header="Explanation"
                    editor={(options) => textEditor(options, "explanation")}
                    filter
                    filterPlaceholder="Search explanation"
                    style={{ minWidth: "22rem" }}
                />

                {/* Edit/Delete column: we use built-in rowEditor column plus a delete button */}
                <Column
                    rowEditor
                    headerStyle={{ width: "8rem", minWidth: "6rem" }}
                    bodyStyle={{ textAlign: "center" }}
                />

                <Column
                    header="Delete"
                    body={(rowData) => (
                        <div style={{ display: "flex", justifyContent: "center" }}>
                            <Button icon="pi pi-trash" className="p-button-danger" onClick={() => deleteRow(rowData)} />
                        </div>
                    )}
                    style={{ width: "6rem" }}
                />

                <Column header="AI Actions" body={actionsBody} style={{ minWidth: "20rem" }} />
            </DataTable>

            <div style={{ marginTop: 12, color: "#666" }}>
                <strong>Notes & extension points:</strong>
                <ul>
                    <li>
                        <strong>AI chat URL:</strong> replace <code>openAiChat</code>'s URL with your real AI-chat route. It currently opens{" "}
                        <code>https://example.com/ai-chat?content=...&explanation=...</code>.
                    </li>
                    <li>
                        <strong>Games / Modals:</strong> replace <code>openGame</code> with calls to your modal state setters (e.g. <code>setShowSpellModal(true)</code>)
                        and provide the row data so the modal can load content.
                    </li>
                    <li>
                        <strong>Custom per-label buttons:</strong> to add custom buttons for a label at runtime, keep an <code>actionsByLabel</code> state and map it inside <code>actionsBody</code>.
                    </li>
                </ul>
            </div>
        </div>
    );
}
