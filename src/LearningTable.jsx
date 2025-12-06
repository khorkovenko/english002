import React, { useState, useRef, useEffect } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { Toast } from "primereact/toast";
import { ContextMenu } from "primereact/contextmenu";
import { FilterMatchMode } from 'primereact/api';
import { SelectButton } from "primereact/selectbutton";
import { supabase } from './supabaseClient';

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
    const [rows, setRows] = useState([]);
    const [editingRows, setEditingRows] = useState({});
    const [filters, setFilters] = useState({
        label: { value: null, matchMode: FilterMatchMode.EQUALS },
        content: { value: null, matchMode: FilterMatchMode.CONTAINS },
        explanation: { value: null, matchMode: FilterMatchMode.CONTAINS },
        statusLabel: { value: null, matchMode: FilterMatchMode.EQUALS },
        repeatsLabel: { value: null, matchMode: FilterMatchMode.EQUALS },
    });
    const [selectedRow, setSelectedRow] = useState(null);
    const [loading, setLoading] = useState(true);
    const [aiQueries, setAiQueries] = useState({});
    const [customAiActions, setCustomAiActions] = useState({});
    const toast = useRef(null);
    const cm = useRef(null);

    const [labelToAdd, setLabelToAdd] = useState(LABELS[0].value);
    const [labelForRequest, setLabelForRequest] = useState(LABELS[0].value);
    const [content, setContent] = useState("");
    const [explanation, setExplanation] = useState("");
    const [requestQuery, setRequestQuery] = useState("");
    const [customActionName, setCustomActionName] = useState("");

    useEffect(() => {
        fetchData();
        fetchAiQueries();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('learning_items')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const processedData = (data || []).map(item => ({
                ...item,
                statusLabel: getStatusLabel(item.last_repeat_date),
                repeatsLabel: getRepeatsLabel(item.number_of_repeats),
            }));

            setRows(processedData);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.current?.show({
                severity: "error",
                summary: "Error",
                detail: "Failed to load data",
                life: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchAiQueries = async () => {
        try {
            const { data, error } = await supabase
                .from('ai_action_queries')
                .select('*');

            if (error) throw error;

            const queriesMap = {};
            const customActionsMap = {};

            (data || []).forEach(item => {
                if (!queriesMap[item.label]) {
                    queriesMap[item.label] = {};
                    customActionsMap[item.label] = [];
                }
                queriesMap[item.label][item.action_key] = item.query_text;

                // Check if this is a custom action (not in default actions)
                const isDefault = defaultActionsByLabel[item.label]?.some(
                    act => act.key === item.action_key
                );
                if (!isDefault) {
                    customActionsMap[item.label].push({
                        id: item.id,
                        key: item.action_key,
                        text: item.action_key,
                        query: item.query_text
                    });
                }
            });

            setAiQueries(queriesMap);
            setCustomAiActions(customActionsMap);
        } catch (error) {
            console.error('Error fetching AI queries:', error);
        }
    };

    const addContentRow = async () => {
        if (!content.trim() || !explanation.trim()) {
            toast.current?.show({
                severity: "warn",
                summary: "Validation",
                detail: "Please fill in all fields",
                life: 2000
            });
            return;
        }

        try {
            const { data, error } = await supabase
                .from('learning_items')
                .insert([
                    {
                        label: labelToAdd,
                        content: content.trim(),
                        explanation: explanation.trim(),
                        last_repeat_date: new Date().toISOString(),
                        number_of_repeats: 0,
                    }
                ])
                .select()
                .single();

            if (error) throw error;

            const newRow = {
                ...data,
                statusLabel: getStatusLabel(data.last_repeat_date),
                repeatsLabel: getRepeatsLabel(data.number_of_repeats),
            };

            setRows([newRow, ...rows]);
            setContent("");
            setExplanation("");
            toast.current?.show({
                severity: "success",
                summary: "Success",
                detail: "Content item added",
                life: 2000
            });
        } catch (error) {
            console.error('Error adding content:', error);
            toast.current?.show({
                severity: "error",
                summary: "Error",
                detail: "Failed to add content item",
                life: 3000
            });
        }
    };

    const addRequestRow = async () => {
        if (!requestQuery.trim() || !customActionName.trim()) {
            toast.current?.show({
                severity: "warn",
                summary: "Validation",
                detail: "Please enter action name and query",
                life: 2000
            });
            return;
        }

        try {
            const actionKey = customActionName.trim().toLowerCase().replace(/\s+/g, '_');

            const { data, error } = await supabase
                .from('ai_action_queries')
                .insert([
                    {
                        label: labelForRequest,
                        action_key: actionKey,
                        query_text: requestQuery.trim(),
                    }
                ])
                .select()
                .single();

            if (error) throw error;

            await fetchAiQueries();
            setRequestQuery("");
            setCustomActionName("");
            toast.current?.show({
                severity: "success",
                summary: "Success",
                detail: "Custom AI action added",
                life: 2000
            });
        } catch (error) {
            console.error('Error adding AI request:', error);
            toast.current?.show({
                severity: "error",
                summary: "Error",
                detail: "Failed to add custom AI action",
                life: 3000
            });
        }
    };

    const deleteCustomAiAction = async (actionId, label) => {
        try {
            const { error } = await supabase
                .from('ai_action_queries')
                .delete()
                .eq('id', actionId);

            if (error) throw error;

            await fetchAiQueries();
            toast.current?.show({
                severity: "info",
                summary: "Deleted",
                detail: "Custom action removed",
                life: 1500
            });
        } catch (error) {
            console.error('Error deleting custom action:', error);
            toast.current?.show({
                severity: "error",
                summary: "Error",
                detail: "Failed to delete action",
                life: 3000
            });
        }
    };

    const deleteRow = async (rowData) => {
        try {
            const { error } = await supabase
                .from('learning_items')
                .delete()
                .eq('id', rowData.id);

            if (error) throw error;

            setRows(rows.filter(r => r.id !== rowData.id));
            toast.current?.show({
                severity: "info",
                summary: "Deleted",
                detail: `Item removed`,
                life: 1500
            });
        } catch (error) {
            console.error('Error deleting row:', error);
            toast.current?.show({
                severity: "error",
                summary: "Error",
                detail: "Failed to delete item",
                life: 3000
            });
        }
    };

    const openAiChat = (row, actionKey) => {
        const queryTemplate = aiQueries[row.label]?.[actionKey] || '';
        const filledQuery = queryTemplate
            .replace(/{content}/g, row.content)
            .replace(/{explanation}/g, row.explanation);

        const params = new URLSearchParams({
            content: row.content,
            explanation: row.explanation,
            action: actionKey,
            query: filledQuery
        });
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
                {timeDiffString(rowData.last_repeat_date)}
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
        const label = REPEATS_LABELS.find(r => rowData.number_of_repeats >= r.min && rowData.number_of_repeats <= r.max)?.name || "Mastered";
        const index = REPEATS_LABELS.findIndex(r => r.name === label);
        return (
            <span onClick={async () => {
                const now = new Date();
                const lastIncrement = rowData.last_increment ? new Date(rowData.last_increment) : null;
                if (lastIncrement && now - lastIncrement < 15 * 60 * 1000) {
                    toast.current?.show({ severity: "warn", summary: "Too Soon", detail: "Increment once every 15 min", life: 2000 });
                    return;
                }
                if (window.confirm(`Increment repeat count for "${rowData.content}"?`)) {
                    try {
                        const newCount = rowData.number_of_repeats + 1;
                        const { error } = await supabase
                            .from('learning_items')
                            .update({
                                number_of_repeats: newCount,
                                last_repeat_date: now.toISOString(),
                                last_increment: now.toISOString(),
                                updated_at: now.toISOString()
                            })
                            .eq('id', rowData.id);

                        if (error) throw error;

                        const updatedRows = rows.map(r =>
                            r.id === rowData.id
                                ? {
                                    ...r,
                                    number_of_repeats: newCount,
                                    last_repeat_date: now.toISOString(),
                                    last_increment: now.toISOString(),
                                    repeatsLabel: getRepeatsLabel(newCount),
                                    statusLabel: getStatusLabel(now.toISOString())
                                }
                                : r
                        );
                        setRows(updatedRows);
                        toast.current?.show({ severity: "success", summary: "Incremented", detail: `New count: ${newCount}`, life: 1500 });
                    } catch (error) {
                        console.error('Error incrementing:', error);
                        toast.current?.show({ severity: "error", summary: "Error", detail: "Failed to update", life: 3000 });
                    }
                }
            }} style={{ display: 'inline-block', width: 30, height: 30, lineHeight: '30px', borderRadius: '50%', textAlign: 'center', fontWeight: 'bold', cursor: 'pointer', color: 'white', backgroundColor: REPEATS_LABELS[index]?.color }}>
                {rowData.number_of_repeats}
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

    const statusSortFunction = (event) => {
        const order = event.order;
        return [...event.data].sort((a, b) => {
            const diffA = new Date() - new Date(a.last_repeat_date);
            const diffB = new Date() - new Date(b.last_repeat_date);
            return order * (diffA - diffB);
        });
    };

    const repeatsSortFunction = (event) => {
        const data = [...event.data];
        const order = event.order;
        data.sort((a, b) => {
            const aIndex = REPEATS_LABELS.findIndex(r => r.name === a.repeatsLabel);
            const bIndex = REPEATS_LABELS.findIndex(r => r.name === b.repeatsLabel);
            return order * (aIndex - bIndex);
        });
        return data;
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
            label: 'Custom AI Actions',
            items: (customAiActions[selectedRow.label] || []).length > 0
                ? customAiActions[selectedRow.label].map(act => ({
                    label: act.text,
                    icon: 'pi pi-trash',
                    command: () => deleteCustomAiAction(act.id, selectedRow.label)
                }))
                : [{ label: 'No custom actions', disabled: true }]
        },
        { separator: true },
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

    const onRowEditComplete = async (e) => {
        const { newData, index } = e;

        try {
            const { error } = await supabase
                .from('learning_items')
                .update({
                    content: newData.content,
                    explanation: newData.explanation,
                    updated_at: new Date().toISOString()
                })
                .eq('id', newData.id);

            if (error) throw error;

            let _rows = [...rows];
            _rows[index] = newData;
            setRows(_rows);

            toast.current?.show({
                severity: "success",
                summary: "Updated",
                detail: "Item updated successfully",
                life: 1500
            });
        } catch (error) {
            console.error('Error updating row:', error);
            toast.current?.show({
                severity: "error",
                summary: "Error",
                detail: "Failed to update item",
                life: 3000
            });
        }
    };

    const textEditor = (options, field) => (
        <InputText
            value={options.value}
            onChange={(e) => options.editorCallback({ ...options.rowData, [field]: e.target.value })}
            autoFocus
        />
    );

    const textFilterTemplate = (options) => (
        <div style={{ position: "relative", width: "100%" }}>
            <InputText
                value={options.value || ""}
                onChange={(e) => options.filterApplyCallback(e.target.value)}
                placeholder={options.filterPlaceholder}
                style={{ width: "100%" }}
            />
            {options.value && (
                <i
                    className="pi pi-times"
                    style={{
                        position: "absolute",
                        right: "8px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        cursor: "pointer",
                        color: "#6c757d"
                    }}
                    onClick={() => options.filterApplyCallback("")}
                />
            )}
        </div>
    );

    if (loading) {
        return <div style={{ padding: 20, textAlign: 'center' }}>Loading...</div>;
    }

    return (
        <div style={{ padding: '10px', maxWidth: '100%', overflow: 'hidden' }}>
            <Toast ref={toast} />
            <ContextMenu model={menuModel} ref={cm} />

            <style>{`
                @media (max-width: 768px) {
                    .p-datatable .p-datatable-thead > tr > th,
                    .p-datatable .p-datatable-tbody > tr > td {
                        padding: 0.5rem !important;
                        font-size: 0.875rem !important;
                    }
                    .p-button {
                        padding: 0.4rem 0.6rem !important;
                        font-size: 0.875rem !important;
                    }
                    .p-inputtext {
                        font-size: 0.875rem !important;
                        padding: 0.4rem !important;
                    }
                }
                @media (max-width: 480px) {
                    .p-datatable .p-datatable-thead > tr > th,
                    .p-datatable .p-datatable-tbody > tr > td {
                        padding: 0.3rem !important;
                        font-size: 0.75rem !important;
                    }
                    .p-button {
                        padding: 0.3rem 0.5rem !important;
                        font-size: 0.75rem !important;
                    }
                    .p-inputtext {
                        font-size: 0.75rem !important;
                        padding: 0.3rem !important;
                    }
                }
            `}</style>

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                width: '100%',
                padding: '1rem',
                backgroundColor: '#f9fafb',
                borderRadius: '1rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                marginBottom: '1rem'
            }}>
                {[
                    {
                        title: "Add Content Item",
                        label: labelToAdd,
                        setLabel: setLabelToAdd,
                        inputs: [
                            { val: content, set: setContent, ph: "Content" },
                            { val: explanation, set: setExplanation, ph: "Explanation" }
                        ],
                        btnText: "Add",
                        action: addContentRow
                    },
                    {
                        title: "Add Custom AI Action",
                        label: labelForRequest,
                        setLabel: setLabelForRequest,
                        inputs: [
                            { val: customActionName, set: setCustomActionName, ph: "Action name" },
                            { val: requestQuery, set: setRequestQuery, ph: "Query (use {content} and {explanation})" }
                        ],
                        btnText: "Add Action",
                        action: addRequestRow
                    }
                ].map((section, idx) => {
                    const activeColor = LABELS.find(l => l.value === section.label)?.color;

                    return (
                        <div key={idx} style={{
                            padding: '1rem',
                            backgroundColor: 'white',
                            borderRadius: '0.75rem',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            border: '1px solid #e5e7eb'
                        }}>
                            <h2 style={{
                                fontSize: '1rem',
                                fontWeight: '600',
                                marginBottom: '0.75rem',
                                color: '#1f2937'
                            }}>{section.title}</h2>

                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '0.75rem',
                                alignItems: 'flex-end'
                            }}>
                                <div style={{ minWidth: '150px', flexShrink: 0 }}>
                                    <SelectButton
                                        value={section.label}
                                        onChange={(e) => section.setLabel(e.value)}
                                        options={LABELS}
                                        optionLabel="label"
                                        optionValue="value"
                                        pt={{
                                            button: ({ context }) => ({
                                                style: {
                                                    background: context.selected ? activeColor : "#f5f5f5",
                                                    borderColor: context.selected ? activeColor : "#ccc",
                                                    color: context.selected ? "#fff" : "#444",
                                                    transition: "0.2s",
                                                    fontWeight: context.selected ? "600" : "500",
                                                    padding: "0.5rem 0.75rem",
                                                    fontSize: "0.875rem"
                                                }
                                            })
                                        }}
                                    />
                                </div>

                                {section.inputs.map((inp, i) => (
                                    <div key={i} style={{ position: 'relative', flex: '1 1 200px', minWidth: '150px' }}>
                                        <InputText
                                            placeholder={inp.ph}
                                            value={inp.val}
                                            onChange={(e) => inp.set(e.target.value)}
                                            style={{
                                                width: '100%',
                                                borderColor: activeColor,
                                                boxShadow: `0 0 0 1px ${activeColor}`,
                                                paddingRight: '2rem'
                                            }}
                                        />
                                        {inp.val && (
                                            <button
                                                onClick={() => inp.set("")}
                                                style={{
                                                    position: "absolute",
                                                    right: "0.5rem",
                                                    top: "50%",
                                                    transform: "translateY(-50%)",
                                                    color: "#777",
                                                    background: "transparent",
                                                    border: "none",
                                                    cursor: "pointer",
                                                    fontSize: "14px"
                                                }}
                                            >✕</button>
                                        )}
                                    </div>
                                ))}

                                <Button
                                    icon="pi pi-plus"
                                    label={section.btnText}
                                    onClick={section.action}
                                    style={{
                                        backgroundColor: activeColor,
                                        borderColor: activeColor,
                                        flexShrink: 0
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ overflowX: 'auto', width: '100%' }}>
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
                    responsiveLayout="scroll"
                    breakpoint="768px"
                    style={{ minWidth: '600px' }}
                >
                    <Column header="#" body={orderBody} style={{ width: "3rem", textAlign: "center" }} />
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
                        style={{ minWidth: "10rem" }}
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
                        style={{ minWidth: "6rem", textAlign: "center" }}
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
                        style={{ minWidth: "8rem" }}
                    />
                    <Column
                        field="content"
                        header="Content"
                        editor={(options) => textEditor(options, "content")}
                        filter
                        filterElement={(options) => textFilterTemplate({ ...options, filterPlaceholder: "Search content" })}
                        showFilterMenu={false}
                        showFilterMatchModes={false}
                        showClearButton={false}
                        showApplyButton={false}
                        style={{ minWidth: "15rem" }}
                    />
                    <Column
                        field="explanation"
                        header="Explanation"
                        editor={(options) => textEditor(options, "explanation")}
                        filter
                        filterElement={(options) => textFilterTemplate({ ...options, filterPlaceholder: "Search explanation" })}
                        showFilterMenu={false}
                        showFilterMatchModes={false}
                        showClearButton={false}
                        showApplyButton={false}
                        style={{ minWidth: "18rem" }}
                    />
                    <Column
                        rowEditor
                        headerStyle={{ width: "7rem", minWidth: "6rem" }}
                        bodyStyle={{ textAlign: "center" }}
                        body={(rowData) => {
                            const isEditing = editingRows[rowData.id];
                            if (isEditing) {
                                return (
                                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'nowrap' }}>
                                        <Button
                                            icon="pi pi-check"
                                            className="p-button-text p-button-success"
                                            onClick={(e) => {
                                                const saveEvent = {
                                                    originalEvent: e,
                                                    data: rowData,
                                                    newData: rowData,
                                                    index: rows.findIndex(r => r.id === rowData.id)
                                                };
                                                onRowEditComplete(saveEvent);
                                                setEditingRows({});
                                            }}
                                        />
                                        <Button
                                            icon="pi pi-times"
                                            className="p-button-text p-button-danger"
                                            onClick={() => setEditingRows({})}
                                        />
                                        <Button
                                            icon="pi pi-trash"
                                            className="p-button-text p-button-danger"
                                            onClick={() => deleteRow(rowData)}
                                        />
                                    </div>
                                );
                            }
                            return (
                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'nowrap' }}>
                                    <Button
                                        icon="pi pi-pencil"
                                        className="p-button-text"
                                        onClick={() => setEditingRows({ [rowData.id]: true })}
                                    />
                                    <Button
                                        icon="pi pi-trash"
                                        className="p-button-text p-button-danger"
                                        onClick={() => deleteRow(rowData)}
                                    />
                                </div>
                            );
                        }}
                    />
                </DataTable>
            </div>
        </div>
    );
}