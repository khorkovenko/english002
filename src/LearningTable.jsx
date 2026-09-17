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
import {supabase} from "./supabaseClient";
import {SpellGameModal} from "./SpellGameModal";
import {TypingTrainerModal} from "./TypingTrainerModal";
import {ToggleButton} from "primereact/togglebutton";

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

const REPETITION_SCHEDULE = [0, 1, 3, 7, 16, 35];
const DAY = 86400000;

const checkDesktop = () => window.innerWidth >= 1280 && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

const labelColor = (v, fb = "#000") => LABELS.find(l => l.value === v)?.color || fb;
const getStatusLabel = d => STATUS_LABELS.find(s => new Date() - new Date(d) <= s.maxDays * DAY)?.name || "Lost";
const getRepeatsLabel = n => REPEATS_LABELS.find(r => n >= r.min && n <= r.max)?.name || "Mastered";
const getSeverity = l => ({word: "info", rule: "success", topic: "warning"}[l] || null);
const decorate = item => ({...item, statusLabel: getStatusLabel(item.last_repeat_date), repeatsLabel: getRepeatsLabel(item.number_of_repeats)});

const isImageUrl = t => {
    if (!t || typeof t !== "string") return false;
    const s = t.trim();
    return /^https?:\/\//i.test(s) && (/\.(jpg|jpeg|png|gif|bmp|webp|svg)(\?[^?\s]*)?$/i.test(s) || /imgur\.com/i.test(s));
};

const isHtmlContent = t => t && typeof t === "string" && /<[^>]+>/.test(t);

const timeDiffString = d => {
    const diff = new Date() - new Date(d);
    const days = Math.floor(diff / DAY), h = Math.floor(diff / 3600000) % 24, m = Math.floor(diff / 60000) % 60, s = Math.floor(diff / 1000) % 60;
    if (days > 0) return `${days}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
};

const openChatGPTUrl = q => window.open(`https://chat.openai.com/?q=${encodeURIComponent(q)}`, "_blank");

const buildChatGPTQuery = ({content, explanation, queryTemplate}) => {
    const special = isImageUrl(explanation) || isHtmlContent(explanation);
    if (!queryTemplate) return special ? `${content}` : `${content} - ${explanation}`;
    const resolved = queryTemplate.replace(/{content}/g, content).replace(/{explanation}/g, explanation || "");
    return special ? `${content} | ${resolved}` : `${content} - ${explanation} | ${resolved}`;
};

const menuItemTemplate = (item, options) => (
    <a className={options.className} onClick={options.onClick}
       onTouchEnd={e => {
           e.preventDefault();
           options.onClick(e);
       }} style={{userSelect: "none", WebkitTapHighlightColor: "transparent"}}>
        {item.icon && <span className={options.iconClassName}/>}
        <span className={options.labelClassName}>{item.label}</span>
        {item.items && <span className={options.submenuIconClassName}/>}
    </a>
);

const withTouchTemplate = items => items.map(i => ({...i, template: menuItemTemplate, items: i.items ? withTouchTemplate(i.items) : undefined}));

const ClearIcon = ({onClick, right = "0.5rem", color = "#777", size = "14px", char = "✕", weight}) => (
    <button onClick={onClick} style={{position: "absolute", right, top: "50%", transform: "translateY(-50%)", color, background: "transparent", border: "none", cursor: "pointer", fontSize: size, fontWeight: weight}}>{char}</button>
);

const ColorChip = ({color, children}) => (
    <div style={{backgroundColor: color, color: "white", padding: "4px 8px", borderRadius: 4, fontWeight: 500}}>{children}</div>
);

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
    const [isDesktop, setIsDesktop] = useState(checkDesktop());
    const [imageModalVisible, setImageModalVisible] = useState(false);
    const [currentImage, setCurrentImage] = useState(null);
    const [imageError, setImageError] = useState(false);
    const [tableModalVisible, setTableModalVisible] = useState(false);
    const [currentTableHtml, setCurrentTableHtml] = useState("");
    const [quickButtons, setQuickButtons] = useState([]);
    const [newButtonName, setNewButtonName] = useState("");
    const [newButtonQuery, setNewButtonQuery] = useState("");
    const [showAllItems, setShowAllItems] = useState(true);
    const [selectedRows, setSelectedRows] = useState([]);
    const [metaKey] = useState(true);

    const toast = useRef(null);
    const cm = useRef(null);

    const showToast = (severity, summary, detail, life = 3000) => toast.current?.show({severity, summary, detail, life});

    useEffect(() => {
        const word = new URLSearchParams(window.location.search).get("word");
        if (!word) return;
        (async () => {
            try {
                const {error} = await supabase.from("learning_items").insert([{
                    label: "word", content: word.trim(), explanation: "",
                    last_repeat_date: new Date().toISOString(), number_of_repeats: 0
                }]);
                if (error) throw error;
                toast.current?.show({severity: "success", summary: "Added", detail: `"${word}" saved`, life: 2000});
                window.history.replaceState({}, document.title, window.location.pathname);
            } catch (err) {
                console.error(err);
                toast.current?.show({severity: "error", summary: "Error", detail: "Failed to add word"});
            }
        })();
    }, []);

    const filteredRows = useMemo(() => {
        if (showAllItems) return rows;
        const now = Date.now();
        return rows.filter(row => {
            const repeats = row.number_of_repeats ?? 0;
            const targetDays = REPETITION_SCHEDULE[Math.min(repeats, REPETITION_SCHEDULE.length - 1)];
            return Math.floor((now - new Date(row.last_repeat_date)) / DAY) >= targetDays;
        });
    }, [rows, showAllItems]);

    useEffect(() => {
        fetchData();
        fetchAiQueries();
        fetchQuickButtons();
        const handleResize = () => setIsDesktop(checkDesktop());
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const {data, error} = await supabase.from("learning_items").select("*").order("created_at", {ascending: false});
            if (error) throw error;
            setRows((data || []).map(decorate));
        } catch (error) {
            console.error("Error fetching data:", error);
            showToast("error", "Error", "Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const fetchAiQueries = async () => {
        try {
            const {data, error} = await supabase.from("ai_action_queries").select("*");
            if (error) throw error;
            const queriesMap = {}, customActionsMap = {};
            const defaultKeys = ["explain", "practice", "explainRule", "discuss", "practiceTopic"];
            (data || []).forEach(item => {
                if (!queriesMap[item.label]) {
                    queriesMap[item.label] = {};
                    customActionsMap[item.label] = [];
                }
                queriesMap[item.label][item.action_key] = item.query_text;
                if (!defaultKeys.includes(item.action_key)) {
                    customActionsMap[item.label].push({
                        id: item.id,
                        key: item.action_key,
                        text: item.action_key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
                        query: item.query_text
                    });
                }
            });
            setAiQueries(queriesMap);
            setCustomAiActions(customActionsMap);
        } catch (error) {
            console.error("Error fetching AI queries:", error);
        }
    };

    const fetchQuickButtons = async () => {
        try {
            const {data, error} = await supabase.from("quick_buttons").select("*").order("created_at", {ascending: true});
            if (error) throw error;
            setQuickButtons(data || []);
        } catch (error) {
            console.error("Error fetching quick buttons:", error);
        }
    };

    const addContentRow = async () => {
        if (!content.trim() || !explanation.trim()) return showToast("warn", "Validation", "Please fill in all fields", 2000);
        try {
            const {data, error} = await supabase.from("learning_items").insert([{
                label: labelToAdd, content: content.trim(), explanation: explanation.trim(),
                last_repeat_date: new Date().toISOString(), number_of_repeats: 0,
            }]).select().single();
            if (error) throw error;
            setRows(prev => [decorate(data), ...prev]);
            setContent("");
            setExplanation("");
            showToast("success", "Success", "Content item added", 2000);
        } catch (error) {
            console.error("Error adding content:", error);
            showToast("error", "Error", "Failed to add content item");
        }
    };

    const addRequestRow = async () => {
        if (!requestQuery.trim() || !customActionName.trim()) return showToast("warn", "Validation", "Please enter action name and query", 2000);
        try {
            const {error} = await supabase.from("ai_action_queries").insert([{
                label: labelForRequest,
                action_key: customActionName.trim().toLowerCase().replace(/\s+/g, "_"),
                query_text: requestQuery.trim(),
            }]).select().single();
            if (error) throw error;
            await fetchAiQueries();
            setRequestQuery("");
            setCustomActionName("");
            showToast("success", "Success", "Custom AI action added", 2000);
        } catch (error) {
            console.error("Error adding AI request:", error);
            showToast("error", "Error", "Failed to add custom AI action");
        }
    };

    const addQuickButton = async () => {
        if (!newButtonName.trim() || !newButtonQuery.trim()) return showToast("warn", "Validation", "Please fill button name and query", 2000);
        try {
            const {data, error} = await supabase.from("quick_buttons").insert([{
                name: newButtonName.trim(), query: newButtonQuery.trim(),
            }]).select().single();
            if (error) throw error;
            setQuickButtons(prev => [...prev, data]);
            setNewButtonName("");
            setNewButtonQuery("");
            showToast("success", "Success", "Quick button added", 2000);
        } catch (error) {
            console.error("Error adding quick button:", error);
            showToast("error", "Error", "Failed to add quick button");
        }
    };

    const deleteQuickButton = async id => {
        try {
            const {error} = await supabase.from("quick_buttons").delete().eq("id", id);
            if (error) throw error;
            setQuickButtons(prev => prev.filter(b => b.id !== id));
            showToast("info", "Deleted", "Quick button removed", 1500);
        } catch (error) {
            console.error("Error deleting quick button:", error);
            showToast("error", "Error", "Failed to delete button");
        }
    };

    const openQuickButtonChatGPT = query => {
        if (!content.trim()) return showToast("warn", "Missing Content", "Enter a word or phrase before using Quick Actions");
        openChatGPTUrl(`${content.trim()} - ${query.trim()}`);
    };

    const deleteCustomAiAction = async actionId => {
        try {
            const {error} = await supabase.from("ai_action_queries").delete().eq("id", actionId);
            if (error) throw error;
            await fetchAiQueries();
            showToast("info", "Deleted", "Custom action removed", 1500);
        } catch (error) {
            console.error("Error deleting custom action:", error);
            showToast("error", "Error", "Failed to delete action");
        }
    };

    const deleteItems = async (targets, bulkMsg, singleMsg, errLog) => {
        try {
            const ids = targets.map(r => r.id);
            const {error} = await supabase.from("learning_items").delete().in("id", ids);
            if (error) throw error;
            setRows(prev => prev.filter(r => !ids.includes(r.id)));
            setSelectedRows([]);
            showToast("info", "Deleted", bulkMsg ? `${ids.length} items removed` : singleMsg, 1500);
        } catch (error) {
            console.error(errLog, error);
            showToast("error", "Error", bulkMsg && !singleMsg ? "Failed to delete items" : "Failed to delete item(s)");
        }
    };

    const deleteRow = async rowData => {
        const isBulk = selectedRows.length > 0 && selectedRows.some(r => r.id === rowData.id);
        const targets = isBulk ? selectedRows : [rowData];
        const message = isBulk
            ? `Delete ${targets.length} selected items?\n\n${targets.map(r => `• ${r.content}`).join("\n")}`
            : `Delete "${rowData.content}"?`;
        if (!window.confirm(message)) return;
        await deleteItems(targets, isBulk, "Item removed", "Error deleting row(s):");
    };

    const deleteSelectedRows = async () => {
        if (!selectedRows || selectedRows.length === 0) return;
        const message = `Delete ${selectedRows.length} selected items?\n\n${selectedRows.map(r => `• ${r.content}`).join("\n")}`;
        if (!window.confirm(message)) return;
        await deleteItems(selectedRows, true, null, "Error deleting selected rows:");
    };

    const incrementRepeats = async rowData => {
        const now = new Date();
        const lastIncrement = rowData.last_increment ? new Date(rowData.last_increment) : null;
        if (lastIncrement && now - lastIncrement < 15 * 60 * 1000) return showToast("warn", "Too Soon", "Increment once every 15 min", 2000);
        if (!window.confirm(`Increment repeat count for "${rowData.content}"?`)) return;
        try {
            const newCount = rowData.number_of_repeats + 1;
            const iso = now.toISOString();
            const {error} = await supabase.from("learning_items").update({
                number_of_repeats: newCount, last_repeat_date: iso, last_increment: iso, updated_at: iso
            }).eq("id", rowData.id);
            if (error) throw error;
            setRows(prev => prev.map(r => r.id === rowData.id ? {
                ...r, number_of_repeats: newCount, last_repeat_date: iso, last_increment: iso,
                repeatsLabel: getRepeatsLabel(newCount), statusLabel: getStatusLabel(iso)
            } : r));
            showToast("success", "Incremented", `New count: ${newCount}`, 1500);
        } catch (error) {
            console.error("Error incrementing:", error);
            showToast("error", "Error", "Failed to update");
        }
    };

    const onRowEditComplete = async e => {
        const {newData} = e;
        try {
            const {error} = await supabase.from("learning_items").update({
                label: newData.label, content: newData.content, explanation: newData.explanation,
                updated_at: new Date().toISOString()
            }).eq("id", newData.id);
            if (error) throw error;
            setRows(prev => prev.map(r => r.id === newData.id ? newData : r));
            showToast("success", "Updated", "Item updated successfully", 1500);
        } catch (error) {
            console.error("Error updating row:", error);
            showToast("error", "Error", "Failed to update item");
        }
    };

    const openChatGPT = (content, explanation, actionKey = null) => {
        const queryTemplate = actionKey ? aiQueries[selectedRow?.label]?.[actionKey] || null : null;
        openChatGPTUrl(buildChatGPTQuery({content, explanation, queryTemplate}));
    };

    const openGame = row => {
        setGameModalData({...row, combinedText: `${row.content} - ${row.explanation}`});
        setGameModalVisible(true);
    };

    const closeGame = () => {
        setGameModalVisible(false);
        setGameModalData(null);
    };

    const customActionMenuItem = act => {
        const open = {label: "Open", icon: "pi pi-external-link", command: () => openChatGPT(selectedRow.content, selectedRow.explanation, act.key)};
        const del = {label: "Delete", icon: "pi pi-trash", command: () => {
                if (window.confirm(`Delete custom action "${act.text}"?`)) deleteCustomAiAction(act.id);
            }};
        if (isDesktop) return [{label: act.text, icon: "pi pi-arrow-right", items: [open, del]}];
        return [
            {label: `${act.text} → Open`, icon: "pi pi-external-link", command: open.command},
            {label: `${act.text} → Delete`, icon: "pi pi-trash", command: del.command}
        ];
    };

    const menuModel = selectedRow ? withTouchTemplate((() => {
        const customActions = customAiActions[selectedRow.label] || [];
        const hasImageOrTable = isImageUrl(selectedRow.explanation) || isHtmlContent(selectedRow.explanation);
        if (selectedRow.label === "word" && !hasImageOrTable) {
            return [{
                label: isDesktop ? "Practice (Typing Trainer)" : "Practice (Spell Game)",
                icon: "pi pi-play",
                command: () => openGame(selectedRow)
            }, ...customActions.flatMap(customActionMenuItem)];
        }
        if (customActions.length > 0) return customActions.flatMap(customActionMenuItem);
        return [{label: "No actions available", icon: "pi pi-ban", disabled: true}];
    })()) : [];

    const getQuickButtonColor = name => {
        const lower = (name || "").toLowerCase();
        for (const key of ["word", "rule", "topic"]) if (lower.includes(key)) return labelColor(key);
        return "#000";
    };

    const orderBody = rowData => rows.findIndex(r => r.id === rowData.id) + 1;

    const labelBody = rowData => (
        <Tag value={rowData.label} severity={getSeverity(rowData.label)}
             style={{backgroundColor: labelColor(rowData.label), color: "white"}}/>
    );

    const statusBodyTemplate = rowData => (
        <span style={{
            padding: "5px 10px", borderRadius: "4px", color: "white",
            backgroundColor: STATUS_LABELS.find(s => s.name === rowData.statusLabel)?.color, fontWeight: "bold"
        }}>{timeDiffString(rowData.last_repeat_date)}</span>
    );

    const quantityBodyTemplate = rowData => {
        const color = REPEATS_LABELS.find(r => rowData.number_of_repeats >= r.min && rowData.number_of_repeats <= r.max)?.color;
        const hoverColor = {1: "#FF4500", 3: "#FFA500", 5: "#006400"}[rowData.number_of_repeats] || "#000";
        return (
            <div style={{display: "flex", alignItems: "center", gap: "8px", justifyContent: "center"}}>
                <span style={{
                    display: "inline-block", width: 30, height: 30, lineHeight: "30px", borderRadius: "50%",
                    textAlign: "center", fontWeight: "bold", color: "white", backgroundColor: color, cursor: "not-allowed"
                }}>{rowData.number_of_repeats}</span>
                <Button label="++" onClick={() => incrementRepeats(rowData)} size="small"
                        style={{
                            padding: "4px 8px", fontSize: "0.75rem", minWidth: "auto", backgroundColor: color,
                            borderColor: color, color: "white", cursor: "pointer",
                            transition: "background-color 0.2s, border-color 0.2s"
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.backgroundColor = hoverColor;
                            e.currentTarget.style.borderColor = hoverColor;
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.backgroundColor = color;
                            e.currentTarget.style.borderColor = color;
                        }}/>
            </div>
        );
    };

    const contentBodyTemplate = rowData => (
        <div onClick={() => openChatGPTUrl(buildChatGPTQuery({content: rowData.content, explanation: rowData.explanation, queryTemplate: null}))}
             style={{cursor: "pointer", color: "#2196F3", textDecoration: "underline"}}>
            {rowData.content}
        </div>
    );

    const explanationBodyTemplate = rowData => {
        const text = rowData.explanation || "";
        const color = labelColor(rowData.label, "#6b7280");
        if (isImageUrl(text)) {
            return (
                <img src={text.trim()} alt="Explanation"
                     style={{maxWidth: "200px", maxHeight: "100px", cursor: "pointer", objectFit: "contain"}}
                     onClick={() => {
                         setCurrentImage(text.trim());
                         setImageError(false);
                         setImageModalVisible(true);
                     }}
                     onError={e => {
                         e.target.style.display = "none";
                         e.target.parentNode.innerHTML = '<span style="color: red;">Image cannot be reached</span>';
                     }}/>
            );
        }
        if (isHtmlContent(text)) {
            return (
                <Button label="Open Rule" size="small" onClick={() => {
                    setCurrentTableHtml(text);
                    setTableModalVisible(true);
                }} style={{padding: "6px 12px", fontSize: "0.875rem", backgroundColor: color, borderColor: color, color: "#fff"}}/>
            );
        }
        return <b style={{cursor: "pointer", color: "black"}} title="Start practice" onClick={() => openGame(rowData)}>{text}</b>;
    };

    const labelEditor = options => (
        <Dropdown value={options.value} options={LABELS} optionLabel="label" optionValue="value"
                  onChange={e => options.editorCallback(e.value)}
                  itemTemplate={option => <ColorChip color={option.color}>{option.label}</ColorChip>}
                  valueTemplate={option => option ? <ColorChip color={option.color}>{option.label}</ColorChip> : null}
                  style={{minWidth: "8rem"}}/>
    );

    const textEditor = options => (
        <InputText type="text" value={options.value} onChange={e => options.editorCallback(e.target.value)} style={{width: "100%"}}/>
    );

    const dropdownClear = options => options.value && (
        <ClearIcon onClick={() => options.filterApplyCallback(null)} right="35px" color="#6c757d" size="0.9rem" char={<i className="pi pi-times"/>}/>
    );

    const createFilterTemplate = (items, colorKey) => options => (
        <div style={{position: "relative"}}>
            <Dropdown value={options.value} options={items.map(s => ({label: s.name, value: s.name}))}
                      optionLabel="label" placeholder={`Select ${colorKey}`}
                      onChange={e => options.filterApplyCallback(e.value)}
                      itemTemplate={option => <div style={{
                          backgroundColor: items.find(s => s.name === option.value)?.[colorKey],
                          color: "white", padding: "4px 8px", borderRadius: 4
                      }}>{option.label}</div>}
                      style={{minWidth: "150px"}}/>
            {dropdownClear(options)}
        </div>
    );

    const labelFilterTemplate = options => (
        <div style={{position: "relative"}}>
            <Dropdown value={options.value} options={LABELS} optionLabel="label" optionValue="value"
                      placeholder="Select Label" onChange={e => options.filterApplyCallback(e.value)}
                      itemTemplate={option => <div style={{
                          backgroundColor: option.color || "#fff", color: "white", padding: "4px 8px", borderRadius: 4
                      }}>{option.label}</div>}
                      style={{minWidth: "150px"}}/>
            {dropdownClear(options)}
        </div>
    );

    const textFilterTemplate = options => (
        <div style={{position: "relative", width: "100%"}}>
            <InputText value={options.value || ""} onChange={e => options.filterApplyCallback(e.target.value)}
                       placeholder={options.filterPlaceholder} style={{width: "100%"}}/>
            {options.value && <ClearIcon onClick={() => options.filterApplyCallback("")} right="8px" color="#6c757d" char={<i className="pi pi-times"/>}/>}
        </div>
    );

    const statusSortFunction = event => [...event.data].sort((a, b) => event.order * (new Date() - new Date(a.last_repeat_date) - (new Date() - new Date(b.last_repeat_date))));

    if (loading) return <div style={{padding: 20, textAlign: "center"}}>Loading...</div>;

    const cardStyle = {padding: "1rem", backgroundColor: "white", borderRadius: "0.75rem", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", border: "1px solid #e5e7eb"};
    const cardTitleStyle = {fontSize: "1rem", fontWeight: "600", marginBottom: "0.75rem", color: "#1f2937"};

    return (
        <div style={{padding: "10px", maxWidth: "100%", overflow: "hidden"}}>
            <Toast ref={toast}/>
            <ContextMenu model={menuModel} ref={cm}/>

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
            `}</style>

            <div style={{
                display: "flex", flexDirection: "column", gap: "1rem", width: "100%", padding: "1rem",
                backgroundColor: "#f9fafb", borderRadius: "1rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "1rem"
            }}>
                {[
                    {
                        title: "Add Content Item", label: labelToAdd, setLabel: setLabelToAdd,
                        inputs: [{val: content, set: setContent, ph: "Content"}, {val: explanation, set: setExplanation, ph: "Explanation"}],
                        btnText: "Add", action: addContentRow
                    },
                    {
                        title: "Add Custom AI Action", label: labelForRequest, setLabel: setLabelForRequest,
                        inputs: [{val: customActionName, set: setCustomActionName, ph: "Action name"}, {val: requestQuery, set: setRequestQuery, ph: "Query (use {content} and {explanation})"}],
                        btnText: "Add Action", action: addRequestRow
                    }
                ].map((section, idx) => {
                    const activeColor = LABELS.find(l => l.value === section.label)?.color;
                    return (
                        <div key={idx} style={cardStyle}>
                            <h2 style={cardTitleStyle}>{section.title}</h2>
                            <div style={{display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end"}}>
                                <div style={{minWidth: "150px", flexShrink: 0}}>
                                    <SelectButton value={section.label} onChange={e => section.setLabel(e.value)}
                                                  options={LABELS} optionLabel="label" optionValue="value" pt={{
                                        button: ({context}) => ({
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
                                    }}/>
                                </div>
                                {section.inputs.map((inp, i) => (
                                    <div key={i} style={{position: "relative", flex: "1 1 200px", minWidth: "150px"}}>
                                        <InputText placeholder={inp.ph} value={inp.val} onChange={e => inp.set(e.target.value)}
                                                   style={{width: "100%", borderColor: activeColor, boxShadow: `0 0 0 1px ${activeColor}`, paddingRight: "2rem"}}/>
                                        {inp.val && <ClearIcon onClick={() => inp.set("")}/>}
                                    </div>
                                ))}
                                <Button icon="pi pi-plus" label={section.btnText} onClick={section.action}
                                        style={{backgroundColor: activeColor, borderColor: activeColor, flexShrink: 0}}/>
                            </div>
                        </div>
                    );
                })}

                <div style={cardStyle}>
                    <h2 style={cardTitleStyle}>Quick ChatGPT Buttons</h2>
                    <div style={{display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", justifyContent: "center", marginBottom: "1rem"}}>
                        {[
                            {val: newButtonName, set: setNewButtonName, ph: "Button name"},
                            {val: newButtonQuery, set: setNewButtonQuery, ph: "Query text"}
                        ].map((inp, i) => (
                            <div key={i} style={{position: "relative", flex: "1 1 200px", minWidth: "150px"}}>
                                <InputText placeholder={inp.ph} value={inp.val} onChange={e => inp.set(e.target.value)}
                                           style={{width: "100%", paddingRight: "2rem"}}/>
                                {inp.val && <ClearIcon onClick={() => inp.set("")}/>}
                            </div>
                        ))}
                        <Button icon="pi pi-plus" label="Add Button" onClick={addQuickButton}
                                style={{backgroundColor: "#6366f1", borderColor: "#6366f1", flexShrink: 0}}/>
                    </div>
                    <div style={{display: "flex", flexWrap: "wrap", gap: "0.5rem"}}>
                        {quickButtons.map(btn => {
                            const bgColor = getQuickButtonColor(btn.name);
                            return (
                                <div key={btn.id} style={{position: "relative", display: "inline-block"}}>
                                    <Button label={btn.name} onClick={() => openQuickButtonChatGPT(btn.query)}
                                            style={{backgroundColor: bgColor, borderColor: bgColor, color: "#fff", paddingRight: "2rem"}}/>
                                    <ClearIcon char="×" color="white" size="16px" weight="bold"
                                               onClick={() => {
                                                   if (window.confirm(`Delete button "${btn.name}"?`)) deleteQuickButton(btn.id);
                                               }}/>
                                </div>
                            );
                        })}
                        {quickButtons.length === 0 &&
                            <p style={{color: "#6b7280", fontStyle: "italic", margin: 0}}>No quick buttons yet. Add one above!</p>}
                    </div>
                </div>
            </div>

            <div style={{marginBottom: "1rem", display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap"}}>
                <ToggleButton onLabel="All Items" offLabel="Spaced Repetition" onIcon="pi pi-list" offIcon="pi pi-calendar"
                              checked={showAllItems} onChange={e => setShowAllItems(e.value)} style={{width: "200px"}}/>
                {selectedRows.length > 1 && (
                    <>
                        <Button icon="pi pi-trash" label={`Delete Selected (${selectedRows.length})`} severity="danger"
                                onClick={deleteSelectedRows} style={{backgroundColor: "#dc2626", borderColor: "#dc2626"}}/>
                        <Button icon="pi pi-times" label="Clear Selection" outlined onClick={() => setSelectedRows([])}/>
                    </>
                )}
            </div>

            <div style={{overflowX: "auto", width: "100%"}}>
                <DataTable value={filteredRows}
                           emptyMessage={showAllItems ? "No learning items available." : "No items due for repetition at the moment."}
                           editMode="row" dataKey="id" filterDisplay="row" filters={filters}
                           onFilter={e => setFilters(e.filters)} editingRows={editingRows}
                           onRowEditChange={e => setEditingRows(e.data)} onRowEditComplete={onRowEditComplete}
                           onContextMenu={e => {
                               setSelectedRow(e.data);
                               cm.current.show(e.originalEvent);
                           }}
                           selectionMode="multiple" selection={selectedRows}
                           onSelectionChange={e => setSelectedRows(e.value)}
                           metaKeySelection={metaKey}
                           responsiveLayout="scroll" breakpoint="768px" style={{minWidth: "600px"}}>
                    <Column header="#" body={orderBody} style={{width: "3rem", textAlign: "center"}}/>
                    <Column field="statusLabel" header="Status" body={statusBodyTemplate} sortable
                            sortFunction={statusSortFunction} filter
                            filterElement={createFilterTemplate(STATUS_LABELS, "color")} showFilterMenu={false}
                            showFilterMatchModes={false} showClearButton={false} showApplyButton={false}
                            style={{minWidth: "10rem"}}/>
                    <Column field="number_of_repeats" header="Repeats" body={quantityBodyTemplate} sortable filter
                            filterField="repeatsLabel" filterElement={createFilterTemplate(REPEATS_LABELS, "color")}
                            showFilterMenu={false} showFilterMatchModes={false} showClearButton={false}
                            showApplyButton={false} style={{minWidth: "6rem", textAlign: "center"}}/>
                    <Column field="label" header="Label" body={labelBody} editor={labelEditor} filter
                            filterElement={labelFilterTemplate} showFilterMenu={false} showFilterMatchModes={false}
                            showClearButton={false} showApplyButton={false} sortable style={{minWidth: "8rem"}}/>
                    <Column field="content" header="Content" body={contentBodyTemplate} editor={textEditor} filter
                            filterElement={options => textFilterTemplate({...options, filterPlaceholder: "Search content"})}
                            showFilterMenu={false} showFilterMatchModes={false} showClearButton={false}
                            showApplyButton={false} style={{minWidth: "15rem"}}/>
                    <Column field="explanation" header="Explanation" body={explanationBodyTemplate} editor={textEditor} filter
                            filterElement={options => textFilterTemplate({...options, filterPlaceholder: "Search explanation"})}
                            showFilterMenu={false} showFilterMatchModes={false} showClearButton={false}
                            showApplyButton={false} style={{minWidth: "18rem"}}/>
                    <Column rowEditor headerStyle={{width: "8rem", minWidth: "8rem"}}
                            bodyStyle={{textAlign: "center", whiteSpace: "nowrap", minWidth: "8rem"}}/>
                    <Column body={rowData => (
                        <Button icon="pi pi-trash" className="p-button-text p-button-danger"
                                onClick={e => {
                                    e.stopPropagation();
                                    deleteRow(rowData);
                                }} tooltip="Delete" tooltipOptions={{position: "top"}}/>
                    )}/>
                </DataTable>
            </div>

            {gameModalVisible && gameModalData && (isDesktop ? (
                <TypingTrainerModal wordData={{...gameModalData, content: gameModalData.combinedText}}
                                    visible={gameModalVisible} onClose={closeGame}/>
            ) : (
                <SpellGameModal spellText={gameModalData.combinedText} visible={gameModalVisible} onClose={closeGame}/>
            ))}

            <Dialog header="Image Viewer" visible={imageModalVisible} style={{width: "80vw", maxWidth: "800px"}}
                    onHide={() => setImageModalVisible(false)} modal>
                {imageError ? (
                    <div style={{padding: "2rem", textAlign: "center", color: "red", fontSize: "1.1rem"}}>Image cannot be reached</div>
                ) : (
                    <img src={currentImage} alt="Full size"
                         style={{width: "100%", height: "auto", maxHeight: "70vh", objectFit: "contain"}}
                         onError={() => setImageError(true)}/>
                )}
            </Dialog>

            <Dialog header="Rule Viewer" visible={tableModalVisible} style={{width: "90vw", maxWidth: "1200px"}}
                    onHide={() => setTableModalVisible(false)} modal
                    contentStyle={{padding: "1rem", overflowX: "auto", maxHeight: "70vh"}}>
                <div dangerouslySetInnerHTML={{__html: currentTableHtml}}/>
            </Dialog>
        </div>
    );
}