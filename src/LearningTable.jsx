import React, { useState, useRef } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { Toast } from "primereact/toast";
import { ContextMenu } from "primereact/contextmenu";
import { FilterMatchMode } from 'primereact/api';

const LABELS = [
    { label: "word", value: "word", color: "#2196F3" },
    { label: "rule", value: "rule", color: "#4CAF50" },
    { label: "topic", value: "topic", color: "#FFC107" },
];

const defaultActionsByLabel = {
    word: [
        { key: "explain", text: "Explain (AI)", type: "ai" },
        { key: "practice", text: "Practice (Game)", type: "game", game: "spell" },
    ],
    rule: [{ key: "explainRule", text: "Explain Rule (AI)", type: "ai" }],
    topic: [
        { key: "discuss", text: "Discuss (AI)", type: "ai" },
        { key: "practiceTopic", text: "Practice (Game)", type: "game", game: "typing" },
    ],
};

const initialData = [
    { id: 1, label: "word", content: "ubiquitous", explanation: "Found everywhere; omnipresent.", lastRepeatDate: "11/5/2021 12:42", numberOfRepeats: 1 },
    { id: 2, label: "rule", content: "subject-verb agreement", explanation: "Subjects and verbs must agree in number.", lastRepeatDate: "10/5/2021 10:42", numberOfRepeats: 2 },
    { id: 3, label: "topic", content: "present perfect", explanation: "Used for actions with relevance to present.", lastRepeatDate: "10/5/2025 19:42", numberOfRepeats: 4 },
    { id: 4, label: "word", content: "serendipity", explanation: "Finding something good without looking for it.", lastRepeatDate: "10/5/2025 08:41", numberOfRepeats: 5 },
];

const STATUS_LABELS = [
    { name: "Freshly", maxDays: 1, color: "#006400" },
    { name: "Little", maxDays: 2, color: "#228B22" },
    { name: "Old", maxDays: 5, color: "#32CD32" },
    { name: "Forgotten", maxDays: 10, color: "#ADFF2F" },
    { name: "VeryOld", maxDays: 20, color: "#FFA500" },
    { name: "Lost", maxDays: Infinity, color: "#8B0000" },
];

const REPEATS_LABELS = [
    { name: "Newly", min: 0, max: 1, color: "#8B0000" },
    { name: "Learning", min: 2, max: 3, color: "#FF4500" },
    { name: "Learned", min: 4, max: 5, color: "#FFA500" },
    { name: "Mastered", min: 6, max: Infinity, color: "#006400" },
];

export default function LearningTable() {
    const [rows, setRows] = useState(initialData.map(r => ({
        ...r,
        statusLabel: STATUS_LABELS.find(s => new Date() - new Date(r.lastRepeatDate) <= s.maxDays * 24 * 60 * 60 * 1000)?.name || "Lost",
        repeatsLabel: REPEATS_LABELS.find(s => r.numberOfRepeats >= s.min && r.numberOfRepeats <= s.max)?.name || "Mastered",
    })));
    const [editingRows, setEditingRows] = useState({});
    const [filters, setFilters] = useState({
        label: { value: null, matchMode: FilterMatchMode.EQUALS },
        content: { value: null, matchMode: FilterMatchMode.CONTAINS },
        explanation: { value: null, matchMode: FilterMatchMode.CONTAINS },
        statusLabel: { value: null, matchMode: FilterMatchMode.EQUALS },
        repeatsLabel: { value: null, matchMode: FilterMatchMode.EQUALS },
    });
    const [selectedRow, setSelectedRow] = useState(null);
    const toast = useRef(null);
    const cm = useRef(null);

    const textEditor = (options, field) => (
        <InputText
            value={options.value}
            onChange={(e) => options.editorCallback({ ...options.rowData, [field]: e.target.value })}
            autoFocus
        />
    );

    const addRow = () => {
        const nextId = rows.length ? Math.max(...rows.map(r => r.id)) + 1 : 1;
        const newRow = {
            id: nextId,
            label: "word",
            content: "new item",
            explanation: "explain...",
            lastRepeatDate: new Date().toISOString(),
            numberOfRepeats: 0,
            statusLabel: "Freshly",
            repeatsLabel: "Newly",
        };
        setRows([newRow, ...rows]);
    };

    const deleteRow = (rowData) => {
        setRows(rows.filter(r => r.id !== rowData.id));
        toast.current.show({ severity: "info", summary: "Deleted", detail: `Row ${rowData.id} removed`, life: 1500 });
    };

    const openAiChat = (row, actionKey) => {
        const params = new URLSearchParams({ content: row.content, explanation: row.explanation, action: actionKey });
        window.open(`https://example.com/ai-chat?${params.toString()}`, "_blank");
    };

    const openGame = (row, game) => {
        alert(`Open game '${game}' for:\n\nContent: ${row.content}\nExplanation: ${row.explanation}`);
    };

    const getSeverity = (label) => {
        switch (label) {
            case "word": return "info";
            case "rule": return "success";
            case "topic": return "warning";
            default: return null;
        }
    };

    const orderBody = (rowData) => rows.findIndex(r => r.id === rowData.id) + 1;

    const labelBody = (rowData) => {
        const color = LABELS.find(l => l.value === rowData.label)?.color || "#000";
        return <Tag value={rowData.label} severity={getSeverity(rowData.label)} style={{ backgroundColor: color, color: "white" }} />;
    };

    const timeDiffString = (dateStr) => {
        const now = new Date();
        const date = new Date(dateStr);
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((now - date) / (1000 * 60 * 60)) % 24;
        const diffMinutes = Math.floor((now - date) / (1000 * 60)) % 60;
        const diffSeconds = Math.floor((now - date) / 1000) % 60;
        if (diffDays > 0) return `${diffDays}d ${diffHours}h`;
        if (diffHours > 0) return `${diffHours}h ${diffMinutes}m`;
        if (diffMinutes > 0) return `${diffMinutes}m ${diffSeconds}s`;
        return `${diffSeconds}s`;
    };

    const statusBodyTemplate = (rowData) => {
        const index = STATUS_LABELS.findIndex(s => s.name === rowData.statusLabel);
        return (
            <span style={{ padding: '5px 10px', borderRadius: '4px', color: 'white', backgroundColor: STATUS_LABELS[index]?.color, fontWeight: 'bold' }}>
                {timeDiffString(rowData.lastRepeatDate)}
            </span>
        );
    };

    const statusFilterTemplate = (options) => (
        <div style={{ position: 'relative' }}>
            <Dropdown
                value={options.value}
                options={STATUS_LABELS.map(s => ({ label: s.name, value: s.name }))}
                optionLabel="label"
                placeholder="Select Status"
                onChange={(e) => options.filterApplyCallback(e.value)}
                itemTemplate={(option) => (
                    <div style={{ backgroundColor: STATUS_LABELS.find(s => s.name === option.value)?.color, color: "white", padding: "4px 8px", borderRadius: 4 }}>
                        {option.label}
                    </div>
                )}
                style={{ minWidth: "150px" }}
            />
            {options.value && (
                <i
                    className="pi pi-times"
                    style={{ position: 'absolute', right: '35px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: '0.9rem', color: '#6c757d' }}
                    onClick={() => options.filterApplyCallback(null)}
                />
            )}
        </div>
    );

    const quantityBodyTemplate = (rowData) => {
        const label = REPEATS_LABELS.find(r => rowData.numberOfRepeats >= r.min && rowData.numberOfRepeats <= r.max)?.name || "Mastered";
        const index = REPEATS_LABELS.findIndex(r => r.name === label);
        return (
            <span onClick={() => {
                const now = new Date();
                const lastIncrement = rowData.lastIncrement ? new Date(rowData.lastIncrement) : null;
                if (lastIncrement && now - lastIncrement < 15 * 60 * 1000) {
                    toast.current.show({ severity: "warn", summary: "Too Soon", detail: "Increment once every 15 min", life: 2000 });
                    return;
                }
                if (window.confirm(`Increment repeat count for "${rowData.content}"?`)) {
                    const updatedRows = rows.map(r =>
                        r.id === rowData.id
                            ? { ...r, numberOfRepeats: r.numberOfRepeats + 1, lastRepeatDate: now.toISOString(), lastIncrement: now.toISOString(), repeatsLabel: getRepeatsLabel(r.numberOfRepeats + 1), statusLabel: getStatusLabel(now.toISOString()) }
                            : r
                    );
                    setRows(updatedRows);
                    toast.current.show({ severity: "success", summary: "Incremented", detail: `New count: ${rowData.numberOfRepeats + 1}`, life: 1500 });
                }
            }} style={{ display: 'inline-block', width: 30, height: 30, lineHeight: '30px', borderRadius: '50%', textAlign: 'center', fontWeight: 'bold', cursor: 'pointer', color: 'white', backgroundColor: REPEATS_LABELS[index]?.color }}>
                {rowData.numberOfRepeats}
            </span>
        );
    };

    const quantityFilterTemplate = (options) => (
        <div style={{ position: 'relative' }}>
            <Dropdown
                value={options.value}
                options={REPEATS_LABELS.map(r => ({ label: r.name, value: r.name }))}
                optionLabel="label"
                placeholder="Select Repeats"
                onChange={(e) => options.filterApplyCallback(e.value)}
                itemTemplate={(option) => (
                    <div style={{ backgroundColor: REPEATS_LABELS.find(r => r.name === option.value)?.color, color: "white", padding: "4px 8px", borderRadius: 4 }}>
                        {option.label}
                    </div>
                )}
                style={{ minWidth: "150px" }}
            />
            {options.value && (
                <i
                    className="pi pi-times"
                    style={{ position: 'absolute', right: '35px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: '0.9rem', color: '#6c757d' }}
                    onClick={() => options.filterApplyCallback(null)}
                />
            )}
        </div>
    );

    const labelFilterTemplate = (options) => (
        <div style={{ position: 'relative' }}>
            <Dropdown
                value={options.value}
                options={LABELS}
                optionLabel="label"
                optionValue="value"
                placeholder="Select Label"
                onChange={(e) => options.filterApplyCallback(e.value)}
                itemTemplate={(option) => (
                    <div style={{ backgroundColor: option.color || "#fff", color: "white", padding: "4px 8px", borderRadius: 4 }}>
                        {option.label}
                    </div>
                )}
                style={{ minWidth: "150px" }}
            />
            {options.value && (
                <i
                    className="pi pi-times"
                    style={{ position: 'absolute', right: '35px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: '0.9rem', color: '#6c757d' }}
                    onClick={() => options.filterApplyCallback(null)}
                />
            )}
        </div>
    );

    const getStatusLabel = (dateStr) => STATUS_LABELS.find(s => new Date() - new Date(dateStr) <= s.maxDays * 24 * 60 * 60 * 1000)?.name || "Lost";
    const getRepeatsLabel = (repeats) => REPEATS_LABELS.find(r => repeats >= r.min && repeats <= r.max)?.name || "Mastered";

    const statusSortFunction = (e) => {
        const order = e.order;
        return [...e.data].sort((a, b) => {
            const aIndex = STATUS_LABELS.findIndex(s => s.name === a.statusLabel);
            const bIndex = STATUS_LABELS.findIndex(s => s.name === b.statusLabel);
            return order * (aIndex - bIndex);
        });
    };

    const repeatsSortFunction = (e) => {
        const order = e.order;
        return [...e.data].sort((a, b) => {
            const aIndex = REPEATS_LABELS.findIndex(r => r.name === a.repeatsLabel);
            const bIndex = REPEATS_LABELS.findIndex(r => r.name === b.repeatsLabel);
            return order * (aIndex - bIndex);
        });
    };

    const menuModel = selectedRow ? [
        {
            label: 'AI Actions',
            items: (defaultActionsByLabel[selectedRow.label] || [])
                .filter(act => act.type === "ai")
                .map(act => ({
                    label: act.text,
                    command: () => openAiChat(selectedRow, act.key)
                }))
        },
        {
            label: 'Game Actions',
            items: (defaultActionsByLabel[selectedRow.label] || [])
                .filter(act => act.type === "game")
                .map(act => ({
                    label: act.text,
                    icon: 'pi pi-play',
                    command: () => openGame(selectedRow, act.game)
                }))
        },
        { separator: true },
        {
            label: 'Edit',
            icon: 'pi pi-pencil',
            command: () => {
                setEditingRows({ [selectedRow.id]: true });
            }
        },
        {
            label: 'Delete',
            icon: 'pi pi-trash',
            command: () => deleteRow(selectedRow)
        }
    ] : [];

    const onRowEditComplete = (e) => {
        let _rows = [...rows];
        let { newData, index } = e;
        _rows[index] = newData;
        setRows(_rows);
    };

    return (
        <div className="card p-fluid" style={{ padding: 20 }}>
            <Toast ref={toast} />
            <ContextMenu model={menuModel} ref={cm} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h2>Combined Table — Editable Rows, AI Actions, Colored Filters</h2>
                <Button icon="pi pi-plus" label="Add Row" className="p-button-success p-mr-2" onClick={addRow} />
            </div>
            <DataTable
                value={rows}
                editMode="row"
                dataKey="id"
                filterDisplay="row"
                filters={filters}
                onFilter={e => setFilters(e.filters)}
                editingRows={editingRows}
                onRowEditChange={e => setEditingRows(e.data)}
                onRowEditComplete={onRowEditComplete}
                onContextMenu={(e) => {
                    setSelectedRow(e.data);
                    cm.current.show(e.originalEvent);
                }}
                contextMenuSelection={selectedRow}
                onContextMenuSelectionChange={e => setSelectedRow(e.value)}
                tableStyle={{ minWidth: "60rem" }}
            >
                <Column header="#" body={orderBody} style={{ width: "4rem", textAlign: "center" }} />
                <Column
                    field="statusLabel"
                    header="Status"
                    body={statusBodyTemplate}
                    sortable
                    sortFunction={statusSortFunction}
                    filter
                    filterElement={statusFilterTemplate}
                    showFilterMenu={false}
                    showFilterMatchModes={false}
                    showClearButton={false}
                    showApplyButton={false}
                    style={{ minWidth: "12rem" }}
                />
                <Column
                    field="repeatsLabel"
                    header="Repeats"
                    body={quantityBodyTemplate}
                    sortable
                    sortFunction={repeatsSortFunction}
                    filter
                    filterElement={quantityFilterTemplate}
                    showFilterMenu={false}
                    showFilterMatchModes={false}
                    showClearButton={false}
                    showApplyButton={false}
                    style={{ minWidth: "8rem", textAlign: "center" }}
                />
                <Column
                    field="label"
                    header="Label"
                    body={labelBody}
                    filter
                    filterElement={labelFilterTemplate}
                    showFilterMenu={false}
                    showFilterMatchModes={false}
                    showClearButton={false}
                    showApplyButton={false}
                    sortable
                    style={{ width: "12rem" }}
                />
                <Column
                    field="content"
                    header="Content"
                    editor={(options) => textEditor(options, "content")}
                    filter
                    filterPlaceholder="Search content"
                    showFilterMenu={false}
                    showFilterMatchModes={false}
                    showClearButton={false}
                    showApplyButton={false}
                    style={{ minWidth: "18rem" }}
                />
                <Column
                    field="explanation"
                    header="Explanation"
                    editor={(options) => textEditor(options, "explanation")}
                    filter
                    filterPlaceholder="Search explanation"
                    showFilterMenu={false}
                    showFilterMatchModes={false}
                    showClearButton={false}
                    showApplyButton={false}
                    style={{ minWidth: "22rem" }}
                />
            </DataTable>
        </div>
    );
}