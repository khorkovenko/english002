import React, { useState, useRef } from "react";
import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "primeflex/primeflex.css";

import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { Toast } from "primereact/toast";

const LABELS = [
    { label: "word", value: "word" },
    { label: "rule", value: "rule" },
    { label: "topic", value: "topic" },
];

const defaultActionsByLabel = {
    word: [
        { key: "explain", text: "Explain (AI)", type: "ai" },
        { key: "practice", text: "Practice (Game)", type: "game", game: "spell" },
    ],
    rule: [
        { key: "explainRule", text: "Explain Rule (AI)", type: "ai" },
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

    const onRowEditComplete = (e) => {
        const _rows = [...rows];
        const { newData, index } = e;
        _rows[index] = newData;
        setRows(_rows);
        toast.current.show({ severity: "success", summary: "Saved", detail: "Row updated", life: 1500 });
    };

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

    const deleteRow = (rowData) => {
        const filtered = rows.filter((r) => r.id !== rowData.id);
        setRows(filtered);
        toast.current.show({ severity: "info", summary: "Deleted", detail: `Row ${rowData.id} removed`, life: 1500 });
    };

    const addRow = () => {
        const nextId = rows.length ? Math.max(...rows.map((r) => r.id)) + 1 : 1;
        const newRow = { id: nextId, label: "word", content: "new item", explanation: "explain..." };
        setRows([newRow, ...rows]);
    };

    const openAiChat = (row, actionKey) => {
        const params = new URLSearchParams({
            content: row.content,
            explanation: row.explanation,
            action: actionKey,
        });
        const url = `https://example.com/ai-chat?${params.toString()}`;
        window.open(url, "_blank");
    };

    const openGame = (row, game) => {
        alert(`Open game '${game}' for:\n\nContent: ${row.content}\nExplanation: ${row.explanation}`);
    };

    const orderBody = (rowData, props) => {
        const index = rows.findIndex((r) => r.id === rowData.id);
        return <span>{index + 1}</span>;
    };

    const labelBody = (rowData) => {
        return <Tag value={rowData.label} severity={getSeverity(rowData.label)} />;
    };

    const actionsBody = (rowData) => {
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
                        return (
                            <Button key={act.key} label={act.text} onClick={() => alert(`Action ${act.key} for ${rowData.id}`)} />
                        );
                    }
                })}

            </div>
        );
    };

    const rowEditorTemplate = (rowData, options) => {
        const allow = () => true;
        return <></>;
    };

    const [filters, setFilters] = useState({
        label: { value: null, matchMode: 'equals' }
    });

    const labelFilterTemplate = () => {
        return (
            <Dropdown
                value={filters.label.value || 'All'}
                options={[
                    { label: 'All', value: 'All' },
                    ...LABELS
                ]}
                onChange={(e) => {
                    const value = e.value === 'All' ? null : e.value;
                    setFilters({
                        ...filters,
                        label: { value: value, matchMode: 'equals' }
                    });
                }}
                optionLabel="label"
                placeholder="All"
                style={{ minWidth: '120px' }}
            />
        );
    };

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
                filterDisplay="row"
                filters={filters}
                onFilter={(e) => setFilters(e.filters)}
                tableStyle={{ minWidth: "60rem" }}
            >

            <Column header="#" body={orderBody} style={{ width: "4rem", textAlign: "center" }} />
                <Column header="AI Actions" body={actionsBody} style={{ minWidth: "20rem" }} />
                <Column
                    field="label"
                    header="Label"
                    body={labelBody}
                    filter
                    showFilterMenu={false}
                    filterElement={labelFilterTemplate}
                    sortable
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

                <Column
                    rowEditor
                    headerStyle={{ width: "8rem", minWidth: "6rem" }}
                    bodyStyle={{ textAlign: "center" }}
                />

                <Column
                    body={(rowData) => (
                        <Button
                            icon="pi pi-trash"
                            className="p-button-text p-button-danger"
                            onClick={() => deleteRow(rowData)}
                            tooltip="Delete"
                            tooltipOptions={{ position: "top" }}
                        />
                    )}
                    style={{ width: "6rem" }}
                />

            </DataTable>
        </div>
    );
}
