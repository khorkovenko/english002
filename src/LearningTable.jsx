import React, {useState, useRef, useEffect, useMemo} from "react";
import {DataTable} from "primereact/datatable";
import {Column} from "primereact/column";
import {InputText} from "primereact/inputtext";
import {Dropdown} from "primereact/dropdown";
import {Button} from "primereact/button";
import {Tag} from "primereact/tag";
import {Toast} from "primereact/toast";
import {ContextMenu} from "primereact/contextmenu";
import {FilterMatchMode} from "primereact/api";
import {SelectButton} from "primereact/selectbutton";
import {Dialog} from "primereact/dialog";
import {ToggleButton} from "primereact/togglebutton";
import {supabase} from "./supabaseClient";
import {SpellGameModal} from "./SpellGameModal";
import {TypingTrainerModal} from "./TypingTrainerModal";

const LABELS = [
    {label: "word", value: "word", color: "#2196F3"},
    {label: "rule", value: "rule", color: "#4CAF50"},
    {label: "topic", value: "topic", color: "#FFC107"},
];
const STATUS_LABELS = [
    {name: "Freshly", maxDays: 1, color: "#006400"},
    {name: "Little", maxDays: 2, color: "#228B22"},
    {name: "Old", maxDays: 5, color: "#32CD32"},
    {name: "Forgotten", maxDays: 10, color: "#ADFF2F"},
    {name: "VeryOld", maxDays: 20, color: "#FFA500"},
    {name: "Lost", maxDays: Infinity, color: "#8B0000"},
];
const REPEATS_LABELS = [
    {name: "Newly", min: 0, max: 1, color: "#8B0000"},
    {name: "Learning", min: 2, max: 3, color: "#FF4500"},
    {name: "Learned", min: 4, max: 5, color: "#FFA500"},
    {name: "Mastered", min: 6, max: Infinity, color: "#006400"},
];
const SEVERITY = {word: "info", rule: "success", topic: "warning"};
const DEFAULT_KEYS = ["explain", "practice", "explainRule", "discuss", "practiceTopic"];
const REPETITION_SCHEDULE = [0, 1, 3, 7, 16, 35];
const DAY = 86400000;
const TAP = {userSelect: "none", WebkitTapHighlightColor: "transparent"};
const FILTER_PROPS = {filter: true, showFilterMenu: false, showFilterMatchModes: false, showClearButton: false, showApplyButton: false};
const CARD = {padding: "1rem", backgroundColor: "white", borderRadius: "0.75rem", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", border: "1px solid #e5e7eb"};
const CARD_TITLE = {fontSize: "1rem", fontWeight: "600", marginBottom: "0.75rem", color: "#1f2937"};
const ROW = {display: "flex", flexWrap: "wrap", gap: "0.75rem"};
const CSS = `
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
    .p-datatable .p-row-editor-init, .p-datatable .p-row-editor-save, .p-datatable .p-row-editor-cancel {
        display: inline-flex !important; align-items: center !important; justify-content: center !important;
        width: 2.75rem !important; height: 2.75rem !important; border-radius: 50% !important;
        vertical-align: middle !important; margin: 0 !important; -webkit-tap-highlight-color: transparent;
    }
    .p-datatable .p-row-editor-save { margin-right: 0.75rem !important; }
    .p-datatable .p-row-editor-init svg, .p-datatable .p-row-editor-save svg, .p-datatable .p-row-editor-cancel svg,
    .p-datatable .p-row-editor-init .pi, .p-datatable .p-row-editor-save .pi, .p-datatable .p-row-editor-cancel .pi {
        width: 1.25rem !important; height: 1.25rem !important; font-size: 1.25rem !important;
    }
    .p-datatable .p-row-editor-save svg, .p-datatable .p-row-editor-save .pi { color: #16a34a; }
    .p-datatable .p-row-editor-cancel svg, .p-datatable .p-row-editor-cancel .pi { color: #dc2626; }
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
`;

const checkDesktop = () => window.innerWidth >= 1280 && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const labelColor = (v, fb = "#000") => LABELS.find(l => l.value === v)?.color || fb;
const statusOf = d => STATUS_LABELS.find(s => new Date() - new Date(d) <= s.maxDays * DAY);
const repeatsOf = n => REPEATS_LABELS.find(r => n >= r.min && n <= r.max);
const decorate = item => ({...item, statusLabel: statusOf(item.last_repeat_date)?.name || "Lost", repeatsLabel: repeatsOf(item.number_of_repeats)?.name || "Mastered"});
const toOpts = arr => arr.map(s => ({label: s.name, value: s.name, color: s.color}));
const isImageUrl = t => typeof t === "string" && /^https?:\/\//i.test(t.trim()) && (/\.(jpg|jpeg|png|gif|bmp|webp|svg)(\?[^?\s]*)?$/i.test(t.trim()) || /imgur\.com/i.test(t));
const isHtmlContent = t => typeof t === "string" && /<[^>]+>/.test(t);
const q = async p => {
    const {data, error} = await p;
    if (error) throw error;
    return data;
};
const db = t => supabase.from(t);

const timeDiffString = d => {
    const diff = new Date() - new Date(d);
    const days = Math.floor(diff / DAY), h = Math.floor(diff / 3600000) % 24, m = Math.floor(diff / 60000) % 60, s = Math.floor(diff / 1000) % 60;
    if (days > 0) return `${days}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
};

const chatGPTUrl = qs => `https://chat.openai.com/?q=${encodeURIComponent(qs)}`;
const openChatGPTUrl = qs => window.open(chatGPTUrl(qs), "_blank");

const buildChatGPTQuery = ({content, explanation, queryTemplate}) => {
    const special = isImageUrl(explanation) || isHtmlContent(explanation);
    if (!queryTemplate) return special ? `${content}` : `${content} - ${explanation}`;
    const resolved = queryTemplate.replace(/{content}/g, content).replace(/{explanation}/g, explanation || "");
    return special ? `${content} | ${resolved}` : `${content} - ${explanation} | ${resolved}`;
};

const menuItemTemplate = (item, options) => (
    <a className={options.className} onClick={options.onClick} style={TAP}
       onTouchEnd={e => {
           e.preventDefault();
           options.onClick(e);
       }}>
        {item.icon && <span className={options.iconClassName}/>}
        <span className={options.labelClassName}>{item.label}</span>
        {item.items && <span className={options.submenuIconClassName}/>}
    </a>
);

const withTouchTemplate = items => items.map(i => ({...i, template: i.template || menuItemTemplate, items: i.items ? withTouchTemplate(i.items) : undefined}));

const ClearIcon = ({onClick, right = "0.5rem", color = "#777", size = "14px", char = "✕", weight}) => (
    <button onClick={onClick} style={{position: "absolute", right, top: "50%", transform: "translateY(-50%)", color, background: "transparent", border: "none", cursor: "pointer", fontSize: size, fontWeight: weight}}>{char}</button>
);

const ColorChip = ({color, weight, children}) => (
    <div style={{backgroundColor: color, color: "white", padding: "4px 8px", borderRadius: 4, fontWeight: weight}}>{children}</div>
);

const TimesIcon = <i className="pi pi-times"/>;

export default function LearningTable() {
    const [rows, setRows] = useState([]);
    const [editingRows, setEditingRows] = useState({});
    const [filters, setFilters] = useState({
        label: {value: null, matchMode: FilterMatchMode.EQUALS},
        content: {value: null, matchMode: FilterMatchMode.CONTAINS},
        explanation: {value: null, matchMode: FilterMatchMode.CONTAINS},
        statusLabel: {value: null, matchMode: FilterMatchMode.EQUALS},
        repeatsLabel: {value: null, matchMode: FilterMatchMode.EQUALS},
    });
    const [selectedRow, setSelectedRow] = useState(null);
    const [selectedRows, setSelectedRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [aiQueries, setAiQueries] = useState({});
    const [customAiActions, setCustomAiActions] = useState({});
    const [quickButtons, setQuickButtons] = useState([]);
    const [form, setForm] = useState({labelToAdd: "word", labelForRequest: "word", content: "", explanation: "", actionName: "", requestQuery: "", buttonName: "", buttonQuery: ""});
    const [game, setGame] = useState(null);
    const [isDesktop, setIsDesktop] = useState(checkDesktop);
    const [image, setImage] = useState(null);
    const [imageError, setImageError] = useState(false);
    const [tableHtml, setTableHtml] = useState(null);
    const [showAll, setShowAll] = useState(true);

    const toast = useRef(null);
    const cm = useRef(null);

    const set = k => v => setForm(f => ({...f, [k]: v}));
    const showToast = (severity, summary, detail, life = 3000) => toast.current?.show({severity, summary, detail, life});
    const run = async (fn, log, msg) => {
        try {
            await fn();
        } catch (error) {
            console.error(log, error);
            if (msg) showToast("error", "Error", msg);
        }
    };

    useEffect(() => {
        const word = new URLSearchParams(window.location.search).get("word");
        if (!word) return;
        run(async () => {
            await q(db("learning_items").insert([{label: "word", content: word.trim(), explanation: "", last_repeat_date: new Date().toISOString(), number_of_repeats: 0}]));
            showToast("success", "Added", `"${word}" saved`, 2000);
            window.history.replaceState({}, document.title, window.location.pathname);
        }, "Error adding word:", "Failed to add word");
    }, []);

    const filteredRows = useMemo(() => showAll ? rows : rows.filter(r => {
        const n = r.number_of_repeats ?? 0;
        return Math.floor((Date.now() - new Date(r.last_repeat_date)) / DAY) >= REPETITION_SCHEDULE[Math.min(n, REPETITION_SCHEDULE.length - 1)];
    }), [rows, showAll]);

    useEffect(() => {
        fetchData();
        fetchAiQueries();
        fetchQuickButtons();
        const onResize = () => setIsDesktop(checkDesktop());
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    const fetchData = () => run(async () => {
        setLoading(true);
        setRows((await q(db("learning_items").select("*").order("created_at", {ascending: false})) || []).map(decorate));
    }, "Error fetching data:", "Failed to load data").finally(() => setLoading(false));

    const fetchAiQueries = () => run(async () => {
        const queries = {}, custom = {};
        (await q(db("ai_action_queries").select("*")) || []).forEach(({id, label, action_key: key, query_text: query}) => {
            (queries[label] = queries[label] || {})[key] = query;
            const list = custom[label] = custom[label] || [];
            if (!DEFAULT_KEYS.includes(key)) list.push({id, key, query, text: key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())});
        });
        setAiQueries(queries);
        setCustomAiActions(custom);
    }, "Error fetching AI queries:");

    const fetchQuickButtons = () => run(async () => {
        setQuickButtons(await q(db("quick_buttons").select("*").order("created_at", {ascending: true})) || []);
    }, "Error fetching quick buttons:");

    const addContentRow = () => {
        const {labelToAdd, content, explanation} = form;
        if (!content.trim() || !explanation.trim()) return showToast("warn", "Validation", "Please fill in all fields", 2000);
        run(async () => {
            const data = await q(db("learning_items").insert([{label: labelToAdd, content: content.trim(), explanation: explanation.trim(), last_repeat_date: new Date().toISOString(), number_of_repeats: 0}]).select().single());
            setRows(prev => [decorate(data), ...prev]);
            setForm(f => ({...f, content: "", explanation: ""}));
            showToast("success", "Success", "Content item added", 2000);
        }, "Error adding content:", "Failed to add content item");
    };

    const addRequestRow = () => {
        const {labelForRequest, actionName, requestQuery} = form;
        if (!requestQuery.trim() || !actionName.trim()) return showToast("warn", "Validation", "Please enter action name and query", 2000);
        run(async () => {
            await q(db("ai_action_queries").insert([{label: labelForRequest, action_key: actionName.trim().toLowerCase().replace(/\s+/g, "_"), query_text: requestQuery.trim()}]).select().single());
            await fetchAiQueries();
            setForm(f => ({...f, actionName: "", requestQuery: ""}));
            showToast("success", "Success", "Custom AI action added", 2000);
        }, "Error adding AI request:", "Failed to add custom AI action");
    };

    const addQuickButton = () => {
        const {buttonName, buttonQuery} = form;
        if (!buttonName.trim() || !buttonQuery.trim()) return showToast("warn", "Validation", "Please fill button name and query", 2000);
        run(async () => {
            const data = await q(db("quick_buttons").insert([{name: buttonName.trim(), query: buttonQuery.trim()}]).select().single());
            setQuickButtons(prev => [...prev, data]);
            setForm(f => ({...f, buttonName: "", buttonQuery: ""}));
            showToast("success", "Success", "Quick button added", 2000);
        }, "Error adding quick button:", "Failed to add quick button");
    };

    const deleteQuickButton = id => run(async () => {
        await q(db("quick_buttons").delete().eq("id", id));
        setQuickButtons(prev => prev.filter(b => b.id !== id));
        showToast("info", "Deleted", "Quick button removed", 1500);
    }, "Error deleting quick button:", "Failed to delete button");

    const deleteCustomAiAction = id => run(async () => {
        await q(db("ai_action_queries").delete().eq("id", id));
        await fetchAiQueries();
        showToast("info", "Deleted", "Custom action removed", 1500);
    }, "Error deleting custom action:", "Failed to delete action");

    const deleteItems = (targets, single, errMsg) => {
        const msg = single ? `Delete "${targets[0].content}"?` : `Delete ${targets.length} selected items?\n\n${targets.map(r => `• ${r.content}`).join("\n")}`;
        if (!window.confirm(msg)) return;
        const ids = targets.map(r => r.id);
        run(async () => {
            await q(db("learning_items").delete().in("id", ids));
            setRows(prev => prev.filter(r => !ids.includes(r.id)));
            setSelectedRows([]);
            showToast("info", "Deleted", single ? "Item removed" : `${ids.length} items removed`, 1500);
        }, "Error deleting rows:", errMsg);
    };

    const deleteRow = row => {
        const bulk = selectedRows.some(r => r.id === row.id);
        deleteItems(bulk ? selectedRows : [row], !bulk, "Failed to delete item(s)");
    };

    const incrementRepeats = row => {
        const now = new Date();
        if (row.last_increment && now - new Date(row.last_increment) < 900000) return showToast("warn", "Too Soon", "Increment once every 15 min", 2000);
        if (!window.confirm(`Increment repeat count for "${row.content}"?`)) return;
        const number_of_repeats = row.number_of_repeats + 1, iso = now.toISOString();
        run(async () => {
            await q(db("learning_items").update({number_of_repeats, last_repeat_date: iso, last_increment: iso, updated_at: iso}).eq("id", row.id));
            setRows(prev => prev.map(r => r.id === row.id ? decorate({...r, number_of_repeats, last_repeat_date: iso, last_increment: iso}) : r));
            showToast("success", "Incremented", `New count: ${number_of_repeats}`, 1500);
        }, "Error incrementing:", "Failed to update");
    };

    const onRowEditComplete = ({newData}) => run(async () => {
        await q(db("learning_items").update({label: newData.label, content: newData.content, explanation: newData.explanation, updated_at: new Date().toISOString()}).eq("id", newData.id));
        setRows(prev => prev.map(r => r.id === newData.id ? newData : r));
        showToast("success", "Updated", "Item updated successfully", 1500);
    }, "Error updating row:", "Failed to update item");

    const queryFor = (row, key) => buildChatGPTQuery({content: row.content, explanation: row.explanation, queryTemplate: key ? aiQueries[row.label]?.[key] || null : null});
    const openGame = row => setGame({...row, combinedText: `${row.content} - ${row.explanation}`});
    const closeGame = () => setGame(null);

    const customActionMenuItem = act => {
        const confirmDelete = () => {
            cm.current?.hide();
            if (window.confirm(`Delete custom action "${act.text}"?`)) deleteCustomAiAction(act.id);
        };
        if (isDesktop) return {
            label: act.text, icon: "pi pi-arrow-right",
            items: [
                {label: "Open", icon: "pi pi-external-link", command: () => openChatGPTUrl(queryFor(selectedRow, act.key))},
                {label: "Delete", icon: "pi pi-trash", command: confirmDelete}
            ]
        };
        const url = chatGPTUrl(queryFor(selectedRow, act.key));
        return {
            label: act.text,
            template: (item, options) => (
                <div className={options.className} style={{display: "flex", alignItems: "center", gap: "0.5rem", ...TAP}}>
                    <button onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        confirmDelete();
                    }} style={{background: "transparent", border: "none", color: "#dc2626", fontSize: "1.25rem", fontWeight: "bold", lineHeight: 1, padding: "0 0.25rem", cursor: "pointer"}}>×</button>
                    <a href={url} target="_blank" rel="noopener noreferrer" onClick={() => cm.current?.hide()} style={{flex: 1, color: "inherit", textDecoration: "none"}}>{item.label}</a>
                </div>
            )
        };
    };

    const menuModel = selectedRow ? withTouchTemplate((() => {
        const custom = (customAiActions[selectedRow.label] || []).map(customActionMenuItem);
        const special = isImageUrl(selectedRow.explanation) || isHtmlContent(selectedRow.explanation);
        if (selectedRow.label === "word" && !special) return [{label: isDesktop ? "Practice (Typing Trainer)" : "Practice (Spell Game)", icon: "pi pi-play", command: () => openGame(selectedRow)}, ...custom];
        return custom.length ? custom : [{label: "No actions available", icon: "pi pi-ban", disabled: true}];
    })()) : [];

    const quickButtonColor = name => labelColor(["word", "rule", "topic"].find(k => (name || "").toLowerCase().includes(k)));

    const orderBody = row => rows.findIndex(r => r.id === row.id) + 1;
    const labelBody = row => <Tag value={row.label} severity={SEVERITY[row.label] || null} style={{backgroundColor: labelColor(row.label), color: "white"}}/>;
    const statusBody = row => (
        <span style={{padding: "5px 10px", borderRadius: 4, color: "white", fontWeight: "bold", backgroundColor: STATUS_LABELS.find(s => s.name === row.statusLabel)?.color}}>
            {timeDiffString(row.last_repeat_date)}
        </span>
    );

    const quantityBody = row => {
        const n = row.number_of_repeats, color = repeatsOf(n)?.color, hover = {1: "#FF4500", 3: "#FFA500", 5: "#006400"}[n] || "#000";
        const paint = c => e => {
            e.currentTarget.style.backgroundColor = c;
            e.currentTarget.style.borderColor = c;
        };
        return (
            <div style={{display: "flex", alignItems: "center", gap: 8, justifyContent: "center"}}>
                <span style={{display: "inline-block", width: 30, height: 30, lineHeight: "30px", borderRadius: "50%", textAlign: "center", fontWeight: "bold", color: "white", backgroundColor: color, cursor: "not-allowed"}}>{n}</span>
                <Button label="++" size="small" onClick={() => incrementRepeats(row)} onMouseEnter={paint(hover)} onMouseLeave={paint(color)}
                        style={{padding: "4px 8px", fontSize: "0.75rem", minWidth: "auto", backgroundColor: color, borderColor: color, color: "white", cursor: "pointer", transition: "background-color 0.2s, border-color 0.2s"}}/>
            </div>
        );
    };

    const contentBody = row => (
        <div onClick={() => openChatGPTUrl(queryFor(row))} style={{cursor: "pointer", color: "#2196F3", textDecoration: "underline"}}>{row.content}</div>
    );

    const explanationBody = row => {
        const text = row.explanation || "";
        if (isImageUrl(text)) return (
            <img src={text.trim()} alt="Explanation" style={{maxWidth: 200, maxHeight: 100, cursor: "pointer", objectFit: "contain"}}
                 onClick={() => {
                     setImageError(false);
                     setImage(text.trim());
                 }}
                 onError={e => {
                     e.target.style.display = "none";
                     e.target.parentNode.innerHTML = '<span style="color: red;">Image cannot be reached</span>';
                 }}/>
        );
        if (isHtmlContent(text)) {
            const color = labelColor(row.label, "#6b7280");
            return <Button label="Open Rule" size="small" onClick={() => setTableHtml(text)} style={{padding: "6px 12px", fontSize: "0.875rem", backgroundColor: color, borderColor: color, color: "#fff"}}/>;
        }
        return <b style={{cursor: "pointer", color: "black"}} title="Start practice" onClick={() => openGame(row)}>{text}</b>;
    };

    const labelEditor = o => (
        <Dropdown value={o.value} options={LABELS} optionLabel="label" optionValue="value" onChange={e => o.editorCallback(e.value)} style={{minWidth: "8rem"}}
                  itemTemplate={op => <ColorChip color={op.color} weight={500}>{op.label}</ColorChip>}
                  valueTemplate={op => op ? <ColorChip color={op.color} weight={500}>{op.label}</ColorChip> : null}/>
    );
    const textEditor = o => <InputText value={o.value} onChange={e => o.editorCallback(e.target.value)} style={{width: "100%"}}/>;

    const dropdownFilter = (opts, placeholder) => o => (
        <div style={{position: "relative"}}>
            <Dropdown value={o.value} options={opts} optionLabel="label" optionValue="value" placeholder={placeholder} onChange={e => o.filterApplyCallback(e.value)}
                      itemTemplate={op => <ColorChip color={op.color}>{op.label}</ColorChip>} style={{minWidth: 150}}/>
            {o.value && <ClearIcon onClick={() => o.filterApplyCallback(null)} right="35px" color="#6c757d" size="0.9rem" char={TimesIcon}/>}
        </div>
    );

    const textFilter = placeholder => o => (
        <div style={{position: "relative", width: "100%"}}>
            <InputText value={o.value || ""} onChange={e => o.filterApplyCallback(e.target.value)} placeholder={placeholder} style={{width: "100%"}}/>
            {o.value && <ClearIcon onClick={() => o.filterApplyCallback("")} right="8px" color="#6c757d" char={TimesIcon}/>}
        </div>
    );

    const statusSort = e => [...e.data].sort((a, b) => e.order * (new Date(b.last_repeat_date) - new Date(a.last_repeat_date)));

    const field = (key, placeholder, extra) => (
        <div key={key} style={{position: "relative", flex: "1 1 200px", minWidth: 150}}>
            <InputText placeholder={placeholder} value={form[key]} onChange={e => set(key)(e.target.value)} style={{width: "100%", paddingRight: "2rem", ...extra}}/>
            {form[key] && <ClearIcon onClick={() => set(key)("")}/>}
        </div>
    );

    const sections = [
        {title: "Add Content Item", labelKey: "labelToAdd", fields: [["content", "Content"], ["explanation", "Explanation"]], btn: "Add", action: addContentRow},
        {title: "Add Custom AI Action", labelKey: "labelForRequest", fields: [["actionName", "Action name"], ["requestQuery", "Query (use {content} and {explanation})"]], btn: "Add Action", action: addRequestRow},
    ];

    if (loading) return <div style={{padding: 20, textAlign: "center"}}>Loading...</div>;

    return (
        <div style={{padding: 10, maxWidth: "100%", overflow: "hidden"}}>
            <Toast ref={toast}/>
            <ContextMenu model={menuModel} ref={cm}/>
            <style>{CSS}</style>

            <div style={{display: "flex", flexDirection: "column", gap: "1rem", width: "100%", padding: "1rem", backgroundColor: "#f9fafb", borderRadius: "1rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "1rem"}}>
                {sections.map(s => {
                    const active = labelColor(form[s.labelKey]);
                    return (
                        <div key={s.title} style={CARD}>
                            <h2 style={CARD_TITLE}>{s.title}</h2>
                            <div style={{...ROW, alignItems: "flex-end"}}>
                                <div style={{minWidth: 150, flexShrink: 0}}>
                                    <SelectButton value={form[s.labelKey]} onChange={e => set(s.labelKey)(e.value)} options={LABELS} optionLabel="label" optionValue="value" pt={{
                                        button: ({context}) => ({
                                            style: {
                                                background: context.selected ? active : "#f5f5f5",
                                                borderColor: context.selected ? active : "#ccc",
                                                color: context.selected ? "#fff" : "#444",
                                                transition: "0.2s",
                                                fontWeight: context.selected ? "600" : "500",
                                                padding: "0.5rem 0.75rem",
                                                fontSize: "0.875rem"
                                            }
                                        })
                                    }}/>
                                </div>
                                {s.fields.map(([key, ph]) => field(key, ph, {borderColor: active, boxShadow: `0 0 0 1px ${active}`}))}
                                <Button icon="pi pi-plus" label={s.btn} onClick={s.action} style={{backgroundColor: active, borderColor: active, flexShrink: 0}}/>
                            </div>
                        </div>
                    );
                })}

                <div style={CARD}>
                    <h2 style={CARD_TITLE}>Quick ChatGPT Buttons</h2>
                    <div style={{...ROW, alignItems: "center", justifyContent: "center", marginBottom: "1rem"}}>
                        {field("buttonName", "Button name")}
                        {field("buttonQuery", "Query text")}
                        <Button icon="pi pi-plus" label="Add Button" onClick={addQuickButton} style={{backgroundColor: "#6366f1", borderColor: "#6366f1", flexShrink: 0}}/>
                    </div>
                    <div style={{display: "flex", flexWrap: "wrap", gap: "0.5rem"}}>
                        {quickButtons.map(btn => {
                            const bg = quickButtonColor(btn.name);
                            return (
                                <div key={btn.id} style={{position: "relative", display: "inline-block"}}>
                                    <Button label={btn.name} style={{backgroundColor: bg, borderColor: bg, color: "#fff", paddingRight: "2rem"}}
                                            onClick={() => form.content.trim() ? openChatGPTUrl(`${form.content.trim()} - ${btn.query.trim()}`) : showToast("warn", "Missing Content", "Enter a word or phrase before using Quick Actions")}/>
                                    <ClearIcon char="×" color="white" size="16px" weight="bold" onClick={() => window.confirm(`Delete button "${btn.name}"?`) && deleteQuickButton(btn.id)}/>
                                </div>
                            );
                        })}
                        {!quickButtons.length && <p style={{color: "#6b7280", fontStyle: "italic", margin: 0}}>No quick buttons yet. Add one above!</p>}
                    </div>
                </div>
            </div>

            <div style={{...ROW, alignItems: "center", marginBottom: "1rem"}}>
                <ToggleButton onLabel="All Items" offLabel="Spaced Repetition" onIcon="pi pi-list" offIcon="pi pi-calendar" checked={showAll} onChange={e => setShowAll(e.value)} style={{width: 200}}/>
                {selectedRows.length > 1 && (
                    <>
                        <Button icon="pi pi-trash" label={`Delete Selected (${selectedRows.length})`} severity="danger" onClick={() => deleteItems(selectedRows, false, "Failed to delete items")} style={{backgroundColor: "#dc2626", borderColor: "#dc2626"}}/>
                        <Button icon="pi pi-times" label="Clear Selection" outlined onClick={() => setSelectedRows([])}/>
                    </>
                )}
            </div>

            <div style={{overflowX: "auto", width: "100%"}}>
                <DataTable value={filteredRows} emptyMessage={showAll ? "No learning items available." : "No items due for repetition at the moment."}
                           editMode="row" dataKey="id" filterDisplay="row" filters={filters} onFilter={e => setFilters(e.filters)}
                           editingRows={editingRows} onRowEditChange={e => setEditingRows(e.data)} onRowEditComplete={onRowEditComplete}
                           onContextMenu={e => {
                               setSelectedRow(e.data);
                               cm.current.show(e.originalEvent);
                           }}
                           selectionMode="multiple" selection={selectedRows} onSelectionChange={e => setSelectedRows(e.value)} metaKeySelection
                           responsiveLayout="scroll" breakpoint="768px" style={{minWidth: 600}}>
                    <Column header="#" body={orderBody} style={{width: "3rem", textAlign: "center"}}/>
                    <Column field="statusLabel" header="Status" body={statusBody} sortable sortFunction={statusSort} {...FILTER_PROPS}
                            filterElement={dropdownFilter(toOpts(STATUS_LABELS), "Select color")} style={{minWidth: "10rem"}}/>
                    <Column field="number_of_repeats" header="Repeats" body={quantityBody} sortable filterField="repeatsLabel" {...FILTER_PROPS}
                            filterElement={dropdownFilter(toOpts(REPEATS_LABELS), "Select color")} style={{minWidth: "6rem", textAlign: "center"}}/>
                    <Column field="label" header="Label" body={labelBody} editor={labelEditor} sortable {...FILTER_PROPS}
                            filterElement={dropdownFilter(LABELS, "Select Label")} style={{minWidth: "8rem"}}/>
                    <Column field="content" header="Content" body={contentBody} editor={textEditor} {...FILTER_PROPS}
                            filterElement={textFilter("Search content")} style={{minWidth: "15rem"}}/>
                    <Column field="explanation" header="Explanation" body={explanationBody} editor={textEditor} {...FILTER_PROPS}
                            filterElement={textFilter("Search explanation")} style={{minWidth: "18rem"}}/>
                    <Column rowEditor headerStyle={{width: "8rem", minWidth: "8rem"}} bodyStyle={{textAlign: "center", whiteSpace: "nowrap", minWidth: "8rem"}}/>
                    <Column body={row => (
                        <Button icon="pi pi-trash" className="p-button-text p-button-danger" tooltip="Delete" tooltipOptions={{position: "top"}}
                                onClick={e => {
                                    e.stopPropagation();
                                    deleteRow(row);
                                }}/>
                    )}/>
                </DataTable>
            </div>

            {game && (isDesktop
                ? <TypingTrainerModal wordData={{...game, content: game.combinedText}} visible onClose={closeGame}/>
                : <SpellGameModal spellText={game.combinedText} visible onClose={closeGame}/>)}

            <Dialog header="Image Viewer" visible={!!image} style={{width: "80vw", maxWidth: 800}} onHide={() => setImage(null)} modal>
                {imageError
                    ? <div style={{padding: "2rem", textAlign: "center", color: "red", fontSize: "1.1rem"}}>Image cannot be reached</div>
                    : <img src={image} alt="Full size" style={{width: "100%", height: "auto", maxHeight: "70vh", objectFit: "contain"}} onError={() => setImageError(true)}/>}
            </Dialog>

            <Dialog header="Rule Viewer" visible={tableHtml !== null} style={{width: "90vw", maxWidth: 1200}} onHide={() => setTableHtml(null)} modal
                    contentStyle={{padding: "1rem", overflowX: "auto", maxHeight: "70vh"}}>
                <div dangerouslySetInnerHTML={{__html: tableHtml || ""}}/>
            </Dialog>
        </div>
    );
}