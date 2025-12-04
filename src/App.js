import React, { useState } from "react";
import { Button } from "primereact/button";
import SpellGameModal from "./SpellGameModal";
import TypingTrainerModal from "./TypingTrainerModal";

function App() {
    const [authenticated, setAuthenticated] = useState(false);
    const [showSpellModal, setShowSpellModal] = useState(false);
    const [showTypingModal, setShowTypingModal] = useState(false);


    const password = "";

    const handleAuth = () => {
        const input = prompt("Enter password to access the app:");
        if (input === password) {
            setAuthenticated(true);
            setShowSpellModal(true);
            setShowTypingModal(true);
        } else {
            alert("Wrong password!");
        }
    };

    return (
        <div style={{ padding: "2rem" }}>
            {!authenticated && (
                <Button label="Enter App" icon="pi pi-lock" className="p-button-primary" onClick={handleAuth} />
            )}

            {authenticated && (
                <>
                    <SpellGameModal
                        spellText="test test test 123"
                        visible={showSpellModal}
                        onClose={() => setShowSpellModal(false)}
                    />

                    <TypingTrainerModal
                        wordData={{ word: "test test test 123", explanation: "Just a test" }}
                        visible={showTypingModal}
                        onClose={() => setShowTypingModal(false)}
                    />
                </>
            )}
        </div>
    );


}

export default App;
