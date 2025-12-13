import React, {useState, useRef, useEffect, useMemo} from "react";
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
import { Dialog } from "primereact/dialog";
import { supabase } from './supabaseClient';
import { SpellGameModal } from "./SpellGameModal";
import { TypingTrainerModal } from "./TypingTrainerModal";
import {ToggleButton} from "primereact/togglebutton";

const LABELS = [
    { label: "word", value: "word", color: "#2196F3" },
    { label: "rule", value: "rule", color: "#4CAF50" },
    { label: "topic", value: "topic", color: "#FFC107" },
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

const getStatusLabel = (dateStr) => STATUS_LABELS.find(s => new Date() - new Date(dateStr) <= s.maxDays * 24 * 60 * 60 * 1000)?.name || "Lost";
const getRepeatsLabel = (repeats) => REPEATS_LABELS.find(r => repeats >= r.min && repeats <= r.max)?.name || "Mastered";
const getSeverity = (label) => ({ word: "info", rule: "success", topic: "warning" }[label] || null);

const isImageUrl = (text) => {
    if (!text || typeof text !== 'string') return false;
    const trimmed = text.trim();
    return /^https?:\/\//i.test(trimmed) && (/\.(jpg|jpeg|png|gif|bmp|webp|svg)(\?[^?\s]*)?$/i.test(trimmed) || /imgur\.com/i.test(trimmed));
};

const isHtmlContent = (text) => text && typeof text === 'string' && /<[^>]+>/.test(text);

const timeDiffString = (dateStr) => {
    const diff = new Date() - new Date(dateStr);
    const d = Math.floor(diff / 86400000);
    const h = Math.floor(diff / 3600000) % 24;
    const m = Math.floor(diff / 60000) % 60;
    const s = Math.floor(diff / 1000) % 60;
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
};

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
    const [labelToAdd, setLabelToAdd] = useState(LABELS[0].value);
    const [labelForRequest, setLabelForRequest] = useState(LABELS[0].value);
    const [content, setContent] = useState("");
    const [explanation, setExplanation] = useState("");
    const [requestQuery, setRequestQuery] = useState("");
    const [customActionName, setCustomActionName] = useState("");
    const [gameModalVisible, setGameModalVisible] = useState(false);
    const [gameModalData, setGameModalData] = useState(null);
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
    const [imageModalVisible, setImageModalVisible] = useState(false);
    const [currentImage, setCurrentImage] = useState(null);
    const [imageError, setImageError] = useState(false);
    const [tableModalVisible, setTableModalVisible] = useState(false);
    const [currentTableHtml, setCurrentTableHtml] = useState("");
    const [quickButtons, setQuickButtons] = useState([]);
    const [newButtonName, setNewButtonName] = useState("");
    const [newButtonQuery, setNewButtonQuery] = useState("");
    const [showAllItems, setShowAllItems] = useState(true);

    const spacedRepetitionDays = [1, 7, 16, 35];

    const filteredRows = useMemo(() => {
        if (showAllItems) return rows;

        return rows.filter(row => {
            const lastRepeat = new Date(row.last_repeat_date);
            const diffDays = Math.floor((new Date() - lastRepeat) / (1000 * 60 * 60 * 24));
            return spacedRepetitionDays.some(d => diffDays === d);
        });
    }, [rows, showAllItems]);

    const toast = useRef(null);
    const cm = useRef(null);

    useEffect(() => {
        fetchData();
        fetchAiQueries();
        fetchQuickButtons();
        const handleResize = () => setIsDesktop(window.innerWidth >= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase.from('learning_items').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setRows((data || []).map(item => ({
                ...item,
                statusLabel: getStatusLabel(item.last_repeat_date),
                repeatsLabel: getRepeatsLabel(item.number_of_repeats),
            })));
        } catch (error) {
            console.error('Error fetching data:', error);
            showToast("error", "Error", "Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const fetchAiQueries = async () => {
        try {
            const { data, error } = await supabase.from('ai_action_queries').select('*');
            if (error) throw error;
            const queriesMap = {};
            const customActionsMap = {};
            (data || []).forEach(item => {
                if (!queriesMap[item.label]) {
                    queriesMap[item.label] = {};
                    customActionsMap[item.label] = [];
                }
                queriesMap[item.label][item.action_key] = item.query_text;
                const defaultKeys = ['explain', 'practice', 'explainRule', 'discuss', 'practiceTopic'];
                if (!defaultKeys.includes(item.action_key)) {
                    customActionsMap[item.label].push({ id: item.id, key: item.action_key, text: item.action_key, query: item.query_text });
                }
            });
            setAiQueries(queriesMap);
            setCustomAiActions(customActionsMap);
        } catch (error) {
            console.error('Error fetching AI queries:', error);
        }
    };

    const fetchQuickButtons = async () => {
        try {
            const { data, error } = await supabase.from('quick_buttons').select('*').order('created_at', { ascending: true });
            if (error) throw error;
            setQuickButtons(data || []);
        } catch (error) {
            console.error('Error fetching quick buttons:', error);
        }
    };

    const showToast = (severity, summary, detail, life = 3000) => {
        toast.current?.show({ severity, summary, detail, life });
    };

    const addContentRow = async () => {
        if (!content.trim() || !explanation.trim()) {
            showToast("warn", "Validation", "Please fill in all fields", 2000);
            return;
        }
        try {
            const { data, error } = await supabase.from('learning_items').insert([{
                label: labelToAdd,
                content: content.trim(),
                explanation: explanation.trim(),
                last_repeat_date: new Date().toISOString(),
                number_of_repeats: 0,
            }]).select().single();
            if (error) throw error;
            setRows([{ ...data, statusLabel: getStatusLabel(data.last_repeat_date), repeatsLabel: getRepeatsLabel(data.number_of_repeats) }, ...rows]);
            setContent("");
            setExplanation("");
            showToast("success", "Success", "Content item added", 2000);
        } catch (error) {
            console.error('Error adding content:', error);
            showToast("error", "Error", "Failed to add content item");
        }
    };

    const addRequestRow = async () => {
        if (!requestQuery.trim() || !customActionName.trim()) {
            showToast("warn", "Validation", "Please enter action name and query", 2000);
            return;
        }
        try {
            const actionKey = customActionName.trim().toLowerCase().replace(/\s+/g, '_');
            const { error } = await supabase.from('ai_action_queries').insert([{
                label: labelForRequest,
                action_key: actionKey,
                query_text: requestQuery.trim(),
            }]).select().single();
            if (error) throw error;
            await fetchAiQueries();
            setRequestQuery("");
            setCustomActionName("");
            showToast("success", "Success", "Custom AI action added", 2000);
        } catch (error) {
            console.error('Error adding AI request:', error);
            showToast("error", "Error", "Failed to add custom AI action");
        }
    };

    const addQuickButton = async () => {
        if (!newButtonName.trim() || !newButtonQuery.trim()) {
            showToast("warn", "Validation", "Please fill button name and query", 2000);
            return;
        }
        try {
            const { data, error } = await supabase.from('quick_buttons').insert([{
                name: newButtonName.trim(),
                query: newButtonQuery.trim(),
            }]).select().single();
            if (error) throw error;
            setQuickButtons([...quickButtons, data]);
            setNewButtonName("");
            setNewButtonQuery("");
            showToast("success", "Success", "Quick button added", 2000);
        } catch (error) {
            console.error('Error adding quick button:', error);
            showToast("error", "Error", "Failed to add quick button");
        }
    };

    const deleteQuickButton = async (id) => {
        try {
            const { error } = await supabase.from('quick_buttons').delete().eq('id', id);
            if (error) throw error;
            setQuickButtons(quickButtons.filter(b => b.id !== id));
            showToast("info", "Deleted", "Quick button removed", 1500);
        } catch (error) {
            console.error('Error deleting quick button:', error);
            showToast("error", "Error", "Failed to delete button");
        }
    };

    const openQuickButtonChatGPT = (query) => {
        if (!content.trim()) {
            showToast("warn", "Missing Content", "Enter a word or phrase before using Quick Actions");
            return;
        }
        const queryText = `${content.trim()} - ${query.trim()}`;
        window.open(`https://chat.openai.com/?q=${encodeURIComponent(queryText)}`, "_blank");
    };

    const deleteCustomAiAction = async (actionId) => {
        try {
            const { error } = await supabase.from('ai_action_queries').delete().eq('id', actionId);
            if (error) throw error;
            await fetchAiQueries();
            showToast("info", "Deleted", "Custom action removed", 1500);
        } catch (error) {
            console.error('Error deleting custom action:', error);
            showToast("error", "Error", "Failed to delete action");
        }
    };

    const deleteRow = async (rowData) => {
        if (!window.confirm(`Delete "${rowData.content}"?`)) return;
        try {
            const { error } = await supabase.from('learning_items').delete().eq('id', rowData.id);
            if (error) throw error;
            setRows(rows.filter(r => r.id !== rowData.id));
            showToast("info", "Deleted", "Item removed", 1500);
        } catch (error) {
            console.error('Error deleting row:', error);
            showToast("error", "Error", "Failed to delete item");
        }
    };

    const incrementRepeats = async (rowData) => {
        const now = new Date();
        const lastIncrement = rowData.last_increment ? new Date(rowData.last_increment) : null;
        if (lastIncrement && now - lastIncrement < 15 * 60 * 1000) {
            showToast("warn", "Too Soon", "Increment once every 15 min", 2000);
            return;
        }
        if (window.confirm(`Increment repeat count for "${rowData.content}"?`)) {
            try {
                const newCount = rowData.number_of_repeats + 1;
                const { error } = await supabase.from('learning_items').update({
                    number_of_repeats: newCount,
                    last_repeat_date: now.toISOString(),
                    last_increment: now.toISOString(),
                    updated_at: now.toISOString()
                }).eq('id', rowData.id);
                if (error) throw error;
                setRows(rows.map(r => r.id === rowData.id ? {
                    ...r,
                    number_of_repeats: newCount,
                    last_repeat_date: now.toISOString(),
                    last_increment: now.toISOString(),
                    repeatsLabel: getRepeatsLabel(newCount),
                    statusLabel: getStatusLabel(now.toISOString())
                } : r));
                showToast("success", "Incremented", `New count: ${newCount}`, 1500);
            } catch (error) {
                console.error('Error incrementing:', error);
                showToast("error", "Error", "Failed to update");
            }
        }
    };

    const onRowEditComplete = async (e) => {
        const { newData } = e;
        try {
            const { error } = await supabase.from('learning_items').update({
                content: newData.content,
                explanation: newData.explanation,
                updated_at: new Date().toISOString()
            }).eq('id', newData.id);
            if (error) throw error;
            const actualIndex = rows.findIndex(r => r.id === newData.id);
            if (actualIndex !== -1) {
                const updatedRows = [...rows];
                updatedRows[actualIndex] = newData;
                setRows(updatedRows);
            }
            showToast("success", "Updated", "Item updated successfully", 1500);
        } catch (error) {
            console.error('Error updating row:', error);
            showToast("error", "Error", "Failed to update item");
        }
    };

    const buildChatGPTQuery = ({ content, explanation, queryTemplate }) => {
        const isSpecialExplanation = isImageUrl(explanation) || isHtmlContent(explanation);
        if (!queryTemplate) {
            return isSpecialExplanation ? `${content}` : `${content} - ${explanation}`;
        }
        let resolvedQuery = queryTemplate.replace(/{content}/g, content).replace(/{explanation}/g, explanation || "");
        return isSpecialExplanation ? `${content} | ${resolvedQuery}` : `${content} - ${explanation} | ${resolvedQuery}`;
    };

    const openChatGPT = (content, explanation, actionKey = null) => {
        let queryTemplate = null;
        if (actionKey && aiQueries[selectedRow?.label]?.[actionKey]) {
            queryTemplate = aiQueries[selectedRow.label][actionKey];
        }
        const queryText = buildChatGPTQuery({ content, explanation, queryTemplate });
        window.open(`https://chat.openai.com/?q=${encodeURIComponent(queryText)}`, "_blank");
    };

    const openGame = (row) => {
        setGameModalData({ ...row, combinedText: `${row.content} - ${row.explanation}` });
        setGameModalVisible(true);
    };

    const orderBody = (rowData) => rows.findIndex(r => r.id === rowData.id) + 1;

    const labelBody = (rowData) => {
        const color = LABELS.find(l => l.value === rowData.label)?.color || "#000";
        return <Tag value={rowData.label} severity={getSeverity(rowData.label)} style={{ backgroundColor: color, color: "white" }} />;
    };

    const statusBodyTemplate = (rowData) => {
        const statusConfig = STATUS_LABELS.find(s => s.name === rowData.statusLabel);
        return <span style={{ padding: '5px 10px', borderRadius: '4px', color: 'white', backgroundColor: statusConfig?.color, fontWeight: 'bold' }}>{timeDiffString(rowData.last_repeat_date)}</span>;
    };

    const quantityBodyTemplate = (rowData) => {
        const repeatsConfig = REPEATS_LABELS.find(r => rowData.number_of_repeats >= r.min && rowData.number_of_repeats <= r.max);
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <span style={{ display: 'inline-block', width: 30, height: 30, lineHeight: '30px', borderRadius: '50%', textAlign: 'center', fontWeight: 'bold', color: 'white', backgroundColor: repeatsConfig?.color }}>{rowData.number_of_repeats}</span>
                <Button label="++" onClick={() => incrementRepeats(rowData)} size="small" style={{ padding: '4px 8px', fontSize: '0.75rem', minWidth: 'auto', backgroundColor: repeatsConfig?.color, borderColor: repeatsConfig?.color, color: 'white' }} />
            </div>
        );
    };

    const contentBodyTemplate = (rowData) => (
        <div onClick={() => {
            const queryText = buildChatGPTQuery({ content: rowData.content, explanation: rowData.explanation, queryTemplate: null });
            window.open(`https://chat.openai.com/?q=${encodeURIComponent(queryText)}`, "_blank");
        }} style={{ cursor: 'pointer', color: '#2196F3', textDecoration: 'underline' }}>
            {rowData.content}
        </div>
    );

    const explanationBodyTemplate = (rowData) => {
        const text = rowData.explanation || '';
        const labelColor = LABELS.find(l => l.value === rowData.label)?.color || "#6b7280";
        if (isImageUrl(text)) {
            return (
                <img src={text.trim()} alt="Explanation" style={{ maxWidth: '200px', maxHeight: '100px', cursor: 'pointer', objectFit: 'contain' }} onClick={() => {
                    setCurrentImage(text.trim());
                    setImageError(false);
                    setImageModalVisible(true);
                }} onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentNode.innerHTML = '<span style="color: red;">Image cannot be reached</span>';
                }} />
            );
        }
        if (isHtmlContent(text)) {
            return (
                <Button label="Open Rule" size="small" onClick={() => {
                    setCurrentTableHtml(text);
                    setTableModalVisible(true);
                }} style={{ padding: '6px 12px', fontSize: '0.875rem', backgroundColor: labelColor, borderColor: labelColor, color: '#fff' }} />
            );
        }
        return <b>{text}</b>;
    };

    const textEditor = (options) => <InputText type="text" value={options.value} onChange={(e) => options.editorCallback(e.target.value)} style={{ width: '100%' }} />;

    const createFilterTemplate = (items, colorKey) => (options) => (
        <div style={{ position: 'relative' }}>
            <Dropdown value={options.value} options={items.map(s => ({ label: s.name, value: s.name }))} optionLabel="label" placeholder={`Select ${colorKey}`} onChange={(e) => options.filterApplyCallback(e.value)} itemTemplate={(option) => <div style={{ backgroundColor: items.find(s => s.name === option.value)?.[colorKey], color: "white", padding: "4px 8px", borderRadius: 4 }}>{option.label}</div>} style={{ minWidth: "150px" }} />
            {options.value && <i className="pi pi-times" style={{ position: 'absolute', right: '35px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: '0.9rem', color: '#6c757d' }} onClick={() => options.filterApplyCallback(null)} />}
        </div>
    );

    const labelFilterTemplate = (options) => (
        <div style={{ position: 'relative' }}>
            <Dropdown value={options.value} options={LABELS} optionLabel="label" optionValue="value" placeholder="Select Label" onChange={(e) => options.filterApplyCallback(e.value)} itemTemplate={(option) => <div style={{ backgroundColor: option.color || "#fff", color: "white", padding: "4px 8px", borderRadius: 4 }}>{option.label}</div>} style={{ minWidth: "150px" }} />
            {options.value && <i className="pi pi-times" style={{ position: 'absolute', right: '35px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: '0.9rem', color: '#6c757d' }} onClick={() => options.filterApplyCallback(null)} />}
        </div>
    );

    const textFilterTemplate = (options) => (
        <div style={{ position: "relative", width: "100%" }}>
            <InputText value={options.value || ""} onChange={(e) => options.filterApplyCallback(e.target.value)} placeholder={options.filterPlaceholder} style={{ width: "100%" }} />
            {options.value && <i className="pi pi-times" style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#6c757d" }} onClick={() => options.filterApplyCallback("")} />}
        </div>
    );

    const statusSortFunction = (event) => [...event.data].sort((a, b) => event.order * (new Date() - new Date(a.last_repeat_date) - (new Date() - new Date(b.last_repeat_date))));

    const menuModel = selectedRow ? (() => {
        const customActions = customAiActions[selectedRow.label] || [];
        const hasImageOrTable = isImageUrl(selectedRow.explanation) || isHtmlContent(selectedRow.explanation);
        if (selectedRow.label === 'word' && !hasImageOrTable) {
            const menu = [{ label: isDesktop ? 'Practice (Typing Trainer)' : 'Practice (Spell Game)', icon: 'pi pi-play', command: () => openGame(selectedRow) }];
            customActions.forEach(act => {
                menu.push({
                    label: act.text,
                    icon: 'pi pi-arrow-right',
                    items: [
                        { label: 'Open', icon: 'pi pi-external-link', command: () => openChatGPT(selectedRow.content, selectedRow.explanation, act.key) },
                        { label: 'Delete', icon: 'pi pi-trash', command: () => { if (window.confirm(`Delete custom action "${act.text}"?`)) deleteCustomAiAction(act.id); } }
                    ]
                });
            });
            return menu;
        }
        if (customActions.length > 0) {
            return customActions.map(act => ({
                label: act.text,
                icon: 'pi pi-arrow-right',
                items: [
                    { label: 'Open', icon: 'pi pi-external-link', command: () => openChatGPT(selectedRow.content, selectedRow.explanation, act.key) },
                    { label: 'Delete', icon: 'pi pi-trash', command: () => { if (window.confirm(`Delete custom action "${act.text}"?`)) deleteCustomAiAction(act.id); } }
                ]
            }));
        }
        return [{ label: 'No actions available', icon: 'pi pi-ban', disabled: true }];
    })() : [];

    if (loading) return <div style={{ padding: 20, textAlign: 'center' }}>Loading...</div>;

    return (
        <div style={{ padding: '10px', maxWidth: '100%', overflow: 'hidden' }}>
            <Toast ref={toast} />
            <ContextMenu model={menuModel} ref={cm} />

            <style>{`
                @media (max-width: 768px) {
                    .p-datatable .p-datatable-thead > tr > th, .p-datatable .p-datatable-tbody > tr > td { padding: 0.5rem !important; font-size: 0.875rem !important; }
                    .p-button { padding: 0.4rem 0.6rem !important; font-size: 0.875rem !important; }
                    .p-inputtext { font-size: 0.875rem !important; padding: 0.4rem !important; }
                }
                @media (max-width: 480px) {
                    .p-datatable .p-datatable-thead > tr > th, .p-datatable .p-datatable-tbody > tr > td { padding: 0.3rem !important; font-size: 0.75rem !important; }
                    .p-button { padding: 0.3rem 0.5rem !important; font-size: 0.75rem !important; }
                    .p-inputtext { font-size: 0.75rem !important; padding: 0.3rem !important; }
                }
                .p-dialog .p-dialog-content table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
                .p-dialog .p-dialog-content table td, .p-dialog .p-dialog-content table th { padding: 8px; border: 1px solid #ddd; text-align: left; }
                .p-dialog .p-dialog-content table th { background-color: #f5f5f5; font-weight: bold; }
                @media (max-width: 768px) {
                    .p-dialog .p-dialog-content table { font-size: 0.8rem; }
                    .p-dialog .p-dialog-content table td, .p-dialog .p-dialog-content table th { padding: 6px; }
                }
                @media (max-width: 480px) {
                    .p-dialog .p-dialog-content table { font-size: 0.7rem; display: block; overflow-x: auto; }
                    .p-dialog .p-dialog-content table td, .p-dialog .p-dialog-content table th { padding: 4px; white-space: nowrap; }
                }
            `}</style>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1rem' }}>
                {[
                    { title: "Add Content Item", label: labelToAdd, setLabel: setLabelToAdd, inputs: [{ val: content, set: setContent, ph: "Content" }, { val: explanation, set: setExplanation, ph: "Explanation" }], btnText: "Add", action: addContentRow },
                    { title: "Add Custom AI Action", label: labelForRequest, setLabel: setLabelForRequest, inputs: [{ val: customActionName, set: setCustomActionName, ph: "Action name" }, { val: requestQuery, set: setRequestQuery, ph: "Query (use {content} and {explanation})" }], btnText: "Add Action", action: addRequestRow }
                ].map((section, idx) => {
                    const activeColor = LABELS.find(l => l.value === section.label)?.color;
                    return (
                        <div key={idx} style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' }}>
                            <h2 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: '#1f2937' }}>{section.title}</h2>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
                                <div style={{ minWidth: '150px', flexShrink: 0 }}>
                                    <SelectButton value={section.label} onChange={(e) => section.setLabel(e.value)} options={LABELS} optionLabel="label" optionValue="value" pt={{ button: ({ context }) => ({ style: { background: context.selected ? activeColor : "#f5f5f5", borderColor: context.selected ? activeColor : "#ccc", color: context.selected ? "#fff" : "#444", transition: "0.2s", fontWeight: context.selected ? "600" : "500", padding: "0.5rem 0.75rem", fontSize: "0.875rem" } }) }} />
                                </div>
                                {section.inputs.map((inp, i) => (
                                    <div key={i} style={{ position: 'relative', flex: '1 1 200px', minWidth: '150px' }}>
                                        <InputText placeholder={inp.ph} value={inp.val} onChange={(e) => inp.set(e.target.value)} style={{ width: '100%', borderColor: activeColor, boxShadow: `0 0 0 1px ${activeColor}`, paddingRight: '2rem' }} />
                                        {inp.val && <button onClick={() => inp.set("")} style={{ position: "absolute", right: "0.5rem", top: "50%", transform: "translateY(-50%)", color: "#777", background: "transparent", border: "none", cursor: "pointer", fontSize: "14px" }}>✕</button>}
                                    </div>
                                ))}
                                <Button icon="pi pi-plus" label={section.btnText} onClick={section.action} style={{ backgroundColor: activeColor, borderColor: activeColor, flexShrink: 0 }} />
                            </div>
                        </div>
                    );
                })}

                <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: '#1f2937' }}>Quick ChatGPT Buttons</h2>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '150px' }}>
                            <InputText placeholder="Button name" value={newButtonName} onChange={(e) => setNewButtonName(e.target.value)} style={{ width: '100%', paddingRight: '2rem' }} />
                            {newButtonName && <button onClick={() => setNewButtonName("")} style={{ position: "absolute", right: "0.5rem", top: "50%", transform: "translateY(-50%)", color: "#777", background: "transparent", border: "none", cursor: "pointer", fontSize: "14px" }}>✕</button>}
                        </div>
                        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '150px' }}>
                            <InputText placeholder="Query text" value={newButtonQuery} onChange={(e) => setNewButtonQuery(e.target.value)} style={{ width: '100%', paddingRight: '2rem' }} />
                            {newButtonQuery && <button onClick={() => setNewButtonQuery("")} style={{ position: "absolute", right: "0.5rem", top: "50%", transform: "translateY(-50%)", color: "#777", background: "transparent", border: "none", cursor: "pointer", fontSize: "14px" }}>✕</button>}
                        </div>
                        <Button icon="pi pi-plus" label="Add Button" onClick={addQuickButton} style={{ backgroundColor: '#6366f1', borderColor: '#6366f1', flexShrink: 0 }} />
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {quickButtons.map((btn) => (
                            <div key={btn.id} style={{ position: 'relative', display: 'inline-block' }}>
                                <Button label={btn.name} onClick={() => openQuickButtonChatGPT(btn.query)} style={{ backgroundColor: '#6366f1', borderColor: '#6366f1', paddingRight: '2rem' }} />
                                <button onClick={() => { if (window.confirm(`Delete button "${btn.name}"?`)) deleteQuickButton(btn.id); }} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'white', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>×</button>
                            </div>
                        ))}
                        {quickButtons.length === 0 && <p style={{ color: '#6b7280', fontStyle: 'italic', margin: 0 }}>No quick buttons yet. Add one above!</p>}
                    </div>
                </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
                <ToggleButton onLabel="All Items" offLabel="Spaced Repetition" onIcon="pi pi-list" offIcon="pi pi-calendar" checked={showAllItems} onChange={(e) => setShowAllItems(e.value)} style={{ width: '200px' }} />
            </div>

            <div style={{ overflowX: 'auto', width: '100%' }}>
                <DataTable value={filteredRows} emptyMessage={showAllItems ? "No learning items available." : "No items due for repetition at the moment."} editMode="row" dataKey="id" filterDisplay="row" filters={filters} onFilter={e => setFilters(e.filters)} editingRows={editingRows} onRowEditChange={e => setEditingRows(e.data)} onRowEditComplete={onRowEditComplete} onContextMenu={(e) => { setSelectedRow(e.data); cm.current.show(e.originalEvent); }} contextMenuSelection={selectedRow} onContextMenuSelectionChange={e => setSelectedRow(e.value)} responsiveLayout="scroll" breakpoint="768px" style={{ minWidth: '600px' }}>
                    <Column header="#" body={orderBody} style={{ width: "3rem", textAlign: "center" }} />
                    <Column field="statusLabel" header="Status" body={statusBodyTemplate} sortable sortFunction={statusSortFunction} filter filterElement={createFilterTemplate(STATUS_LABELS, 'color')} showFilterMenu={false} showFilterMatchModes={false} showClearButton={false} showApplyButton={false} style={{ minWidth: "10rem" }} />
                    <Column field="number_of_repeats" header="Repeats" body={quantityBodyTemplate} sortable filter filterField="repeatsLabel" filterElement={createFilterTemplate(REPEATS_LABELS, 'color')} showFilterMenu={false} showFilterMatchModes={false} showClearButton={false} showApplyButton={false} style={{ minWidth: "6rem", textAlign: "center" }} />
                    <Column field="label" header="Label" body={labelBody} filter filterElement={labelFilterTemplate} showFilterMenu={false} showFilterMatchModes={false} showClearButton={false} showApplyButton={false} sortable style={{ minWidth: "8rem" }} />
                    <Column field="content" header="Content" body={contentBodyTemplate} editor={textEditor} filter filterElement={(options) => textFilterTemplate({ ...options, filterPlaceholder: "Search content" })} showFilterMenu={false} showFilterMatchModes={false} showClearButton={false} showApplyButton={false} style={{ minWidth: "15rem" }} />
                    <Column field="explanation" header="Explanation" body={explanationBodyTemplate} editor={textEditor} filter filterElement={(options) => textFilterTemplate({ ...options, filterPlaceholder: "Search explanation" })} showFilterMenu={false} showFilterMatchModes={false} showClearButton={false} showApplyButton={false} style={{ minWidth: "18rem" }} />
                    <Column rowEditor headerStyle={{ width: "7rem", minWidth: "6rem" }} bodyStyle={{ textAlign: "center" }} />
                    <Column body={(rowData) => <Button icon="pi pi-trash" className="p-button-text p-button-danger" onClick={() => deleteRow(rowData)} tooltip="Delete" tooltipOptions={{ position: 'top' }} />} headerStyle={{ width: "5rem", minWidth: "4rem" }} bodyStyle={{ textAlign: "center" }} />
                </DataTable>
            </div>

            {gameModalVisible && gameModalData && (isDesktop ? (<TypingTrainerModal wordData={{ ...gameModalData, content: gameModalData.combinedText }} visible={gameModalVisible} onClose={() => { setGameModalVisible(false); setGameModalData(null); }} />) : (<SpellGameModal spellText={gameModalData.combinedText} visible={gameModalVisible} onClose={() => { setGameModalVisible(false); setGameModalData(null); }} />))}

            <Dialog header="Image Viewer" visible={imageModalVisible} style={{ width: '80vw', maxWidth: '800px' }} onHide={() => setImageModalVisible(false)} modal>
                {imageError ? (<div style={{ padding: '2rem', textAlign: 'center', color: 'red', fontSize: '1.1rem' }}>Image cannot be reached</div>) : (<img src={currentImage} alt="Full size" style={{ width: '100%', height: 'auto', maxHeight: '70vh', objectFit: 'contain' }} onError={() => setImageError(true)} />)}
            </Dialog>

            <Dialog header="Rule Viewer" visible={tableModalVisible} style={{ width: '90vw', maxWidth: '1200px' }} onHide={() => setTableModalVisible(false)} modal contentStyle={{ padding: '1rem', overflowX: 'auto', maxHeight: '70vh' }}>
                <div dangerouslySetInnerHTML={{ __html: currentTableHtml }} />
            </Dialog>
        </div>
    );
}
