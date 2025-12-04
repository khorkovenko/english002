import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { InputNumber } from 'primereact/inputnumber';
import clickSoundFile from './typewriter.mp3';
import failSoundFile from './error.mp3';

const TypingTrainerModal = ({ wordData, onClose, visible }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [feedback, setFeedback] = useState([]);
    const [colorHistory, setColorHistory] = useState([]);
    const [mistypedBefore, setMistypedBefore] = useState([]);
    const [allKeystrokes, setAllKeystrokes] = useState([]);
    const [startTime, setStartTime] = useState(null);
    const [endTime, setEndTime] = useState(null);
    const [proMode, setProMode] = useState(false);
    const [repeatCount, setRepeatCount] = useState(1);
    const [completedCount, setCompletedCount] = useState(0);
    const [summaryList, setSummaryList] = useState([]);
    const [showFinalSummary, setShowFinalSummary] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const inputRef = useRef(null);

    const clickSound = useRef(new Audio(clickSoundFile));
    const failSound = useRef(new Audio(failSoundFile));

    const isValidUrl = (str) => {
        try {
            const url = new URL(str);
            return url.protocol === "http:" || url.protocol === "https:";
        } catch {
            return false;
        }
    };

    const capitalizedWord = wordData?.word
        ? wordData.word.charAt(0).toUpperCase() + wordData.word.slice(1)
        : '';

    const parts = [wordData?.word, wordData?.explanation];

    if (wordData?.association && !isValidUrl(wordData.association)) {
        parts.push(wordData.association);
    }

    const rawPhrase = parts.filter(Boolean).join(' - ').trim();

    const phrase = rawPhrase.charAt(0).toUpperCase() + rawPhrase.slice(1);

    const reset = () => {
        setCurrentIndex(0);
        setFeedback([]);
        setColorHistory([]);
        setMistypedBefore([]);
        setAllKeystrokes([]);
        setStartTime(Date.now());
        setEndTime(null);
        setShowFinalSummary(false);
        setGameStarted(true);
    };

    const startNewGame = () => {
        setCurrentIndex(0);
        setFeedback([]);
        setColorHistory([]);
        setMistypedBefore([]);
        setAllKeystrokes([]);
        setStartTime(Date.now());
        setEndTime(null);
        setCompletedCount(0);
        setSummaryList([]);
        setShowFinalSummary(false);
        setGameStarted(true);
    };

    useEffect(() => {
        if (visible && wordData) {
            startNewGame();
            setTimeout(() => {
                const dialogContent = document.querySelector('[role="dialog"]');
                if (dialogContent) {
                    dialogContent.focus();
                }
            }, 100);
        }
    }, [visible, wordData]);

    useEffect(() => {
        if (!visible || !phrase || !gameStarted) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
                return;
            }

            const activeTag = document.activeElement?.tagName?.toLowerCase();
            if (activeTag === 'input' || activeTag === 'textarea') return;

            if (e.ctrlKey && e.altKey) {
                e.preventDefault();
                reset();
                return;
            }

            setAllKeystrokes(prev => [...prev, {
                key: e.key,
                timestamp: Date.now()
            }]);

            if (e.key === 'Backspace') {
                if (currentIndex > 0) {
                    setCurrentIndex(prev => prev - 1);
                    setFeedback(prev => prev.slice(0, -1));
                    setColorHistory(prev => prev.slice(0, -1));
                }
                clickSound.current.play();
                return;
            }

            if (e.key.length !== 1 || currentIndex >= phrase.length) return;

            const expectedChar = phrase[currentIndex];
            const typedChar = e.key;
            let color = 'red';

            const wasMistyped = mistypedBefore[currentIndex] || false;

            if (typedChar === expectedChar) {
                color = wasMistyped ? 'yellow' : 'green';
                playClickSound();
            } else {
                color = 'red';
                playFailSound();
            }


            const newMistypedBefore = [...mistypedBefore];
            newMistypedBefore[currentIndex] = color === 'red' || wasMistyped;

            const newFeedback = [...feedback, { expected: expectedChar, typed: typedChar, color }];
            const newColorHistory = [...colorHistory];
            newColorHistory[currentIndex] = color;

            setMistypedBefore(newMistypedBefore);
            setFeedback(newFeedback);
            setColorHistory(newColorHistory);
            setCurrentIndex(prev => prev + 1);

            if (proMode && color === 'red') {
                setTimeout(() => reset(), 100);
                return;
            }

            if (currentIndex + 1 === phrase.length) {
                const now = Date.now();
                const totalMistakes = newFeedback.filter(f => f.color === 'red' || f.color === 'yellow').length;
                const accuracy = Math.round(((phrase.length - totalMistakes) / phrase.length) * 100);
                const timeTaken = ((now - (startTime || now)) / 1000).toFixed(2);

                const mistakePositions = newFeedback
                    .map((f, i) => (f.color === 'red' || f.color === 'yellow') ? i : null)
                    .filter(pos => pos !== null);

                const mistakeDetails = mistakePositions.map(pos => {
                    const expectedChar = phrase[pos];
                    const finalColor = newFeedback[pos].color;

                    const relevantKeystrokes = [];
                    let tempPosition = 0;

                    for (const keystroke of allKeystrokes) {
                        if (keystroke.key === 'Backspace') {
                            if (tempPosition > 0) {
                                tempPosition--;
                                if (tempPosition === pos) {
                                    relevantKeystrokes.push('⌫');
                                }
                            }
                        } else if (keystroke.key.length === 1) {
                            if (tempPosition === pos) {
                                const displayChar = keystroke.key === ' ' ? '␣' : keystroke.key;
                                relevantKeystrokes.push(displayChar);
                            }
                            tempPosition++;
                        }
                    }

                    const keystrokeSequence = relevantKeystrokes.join('•') || expectedChar;

                    return {
                        position: pos + 1,
                        expected: expectedChar === ' ' ? 'space' : expectedChar,
                        sequence: keystrokeSequence,
                        finalColor: finalColor,
                        corrected: finalColor === 'yellow'
                    };
                });

                const allCorrected = newFeedback.every(f => f.color !== 'red');

                const roundSummary = {
                    accuracy,
                    timeTaken,
                    mistakeDetails,
                    allCorrected,
                    repeatNumber: completedCount + 1,
                };

                setSummaryList(prev => [...prev, roundSummary]);

                if (completedCount + 1 < repeatCount) {
                    setCompletedCount(prev => prev + 1);
                    reset();
                } else {
                    setShowFinalSummary(true);
                    setGameStarted(false);
                }

                setEndTime(now);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        currentIndex,
        feedback,
        colorHistory,
        mistypedBefore,
        allKeystrokes,
        startTime,
        visible,
        proMode,
        repeatCount,
        completedCount,
        phrase,
        gameStarted,
        onClose,
    ]);

    const playClickSound = () => {
        const audio = new Audio(clickSoundFile);
        audio.play();
    };

    const playFailSound = () => {
        const audio = new Audio(failSoundFile);
        audio.play();
    };


    const renderLetters = () => {
        const baseWidth = 1.2;
        const baseHeight = 1.8;
        const scale = 1.7;
        const width = baseWidth * scale;
        const height = baseHeight * scale;
        const lineHeight = height;

        return phrase.split('').map((char, index) => {
            const isCurrent = index === currentIndex;
            const color = colorHistory[index];
            const bg =
                color === 'green' ? 'lightgreen' :
                    color === 'red' ? '#ffb3b3' :
                        color === 'yellow' ? '#ffff99' :
                            isCurrent ? '#e0e0e0' : 'transparent';

            const displayChar = char === ' ' ? '_' : char;

            return (
                <span
                    key={index}
                    style={{
                        display: 'inline-block',
                        width: `${width}rem`,
                        height: `${height}rem`,
                        lineHeight: `${lineHeight}rem`,
                        textAlign: 'center',
                        fontFamily: 'monospace',
                        backgroundColor: bg,
                        textDecoration: isCurrent ? 'underline' : 'none',
                        fontWeight: isCurrent ? 'bold' : 'normal',
                        marginRight: '0.1rem',
                        userSelect: 'none',
                        borderRadius: '3px',
                        color: char === ' ' ? '#aaa' : 'inherit',
                    }}
                >
                    {displayChar}
                </span>
            );
        });
    };

    const renderFinalSummary = () => {
        if (!showFinalSummary || summaryList.length === 0) return null;

        return (
            <div style={{
                marginTop: '1rem',
                maxHeight: '300px',
                overflowY: 'auto',
                paddingRight: '0.5rem',
                background: '#f9f9f9',
                borderRadius: 4,
                padding: '10px',
            }}>
                <h4 style={{ marginTop: 0 }}>📊 Final Summary ({summaryList.length} rounds)</h4>
                {summaryList.map((s, index) => (
                    <div key={index} style={{ marginBottom: '1rem', borderBottom: '1px solid #ccc', paddingBottom: '0.5rem' }}>
                        <p><strong>Round:</strong> {s.repeatNumber}</p>
                        <p><strong>Time:</strong> {s.timeTaken} s</p>
                        <p><strong>Accuracy:</strong> {s.accuracy}%</p>
                        {s.mistakeDetails.length > 0 && (
                            <>
                                <p><strong>Mistakes:</strong></p>
                                <ul>
                                    {s.mistakeDetails.map((mistake, idx) => (
                                        <li key={idx} style={{ marginBottom: '4px' }}>
                                            <span>Position {mistake.position}: expected '{mistake.expected}' → {mistake.sequence}</span>
                                            {mistake.corrected ? (
                                                <span style={{ color: 'orange', marginLeft: '8px' }}>✓ Corrected</span>
                                            ) : (
                                                <span style={{ color: 'red', marginLeft: '8px' }}>✗ Not corrected</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                        {s.allCorrected
                            ? <p>✅ All mistakes were corrected.</p>
                            : <p>❌ Some mistakes were never corrected.</p>}
                    </div>
                ))}
            </div>
        );
    };

    if (!wordData) return null;

    return (
        <Dialog
            header={
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span><strong>Word:</strong> {wordData.word}</span>
                    <span><strong>Repeat:</strong> {completedCount + 1} / {repeatCount}</span>
                    {startTime && !showFinalSummary && (
                        <>
                            <span><strong>Time:</strong> {((endTime || Date.now()) - startTime) / 1000}s</span>
                            <span><strong>Accuracy:</strong> {
                                Math.round(((phrase.length - feedback.filter(f => f.color === 'red' || f.color === 'yellow').length) / phrase.length) * 100)
                            }%</span>
                        </>
                    )}
                </div>
            }
            visible={visible}
            style={{
                width: '100vw',
                height: '100vh',
                minWidth: '100%',
                padding: 0,
                margin: 0,
                maxWidth: '100%',
                display: 'flex',
                flexDirection: 'column',
            }}
            contentStyle={{ height: 'calc(100% - 60px)', overflow: 'auto', padding: '1rem' }}
            modal
            onHide={onClose}
            closeOnEscape
            dismissableMask
            breakpoints={{}}
            tabIndex={0}
        >
            <input ref={inputRef} style={{ opacity: 0, position: 'absolute' }} aria-hidden="true" />

            <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
                {renderLetters()}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Checkbox inputId="proMode" checked={proMode} onChange={e => setProMode(e.checked)} />
                    <label htmlFor="proMode" style={{ margin: '0 0.5rem' }}>Pro Mode</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <label htmlFor="repeatInput" style={{ marginRight: '0.5rem' }}>Repeat:</label>
                    <InputNumber
                        id="repeatInput"
                        value={repeatCount}
                        onValueChange={(e) => setRepeatCount(e.value || 1)}
                        min={1}
                        max={10}
                        inputStyle={{ width: '4rem' }}
                    />
                </div>
            </div>

            {renderFinalSummary()}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto', gap: '0.5rem' }}>
                <Button
                    label="Restart"
                    tabIndex={-1}
                    onClick={(e) => {
                        e.currentTarget.blur();
                        clickSound.current.play();
                        startNewGame();
                    }}
                />
                <Button label="Close" onClick={() => { clickSound.current.play(); onClose(); }} />
            </div>
        </Dialog>
    );
};

export default TypingTrainerModal;
