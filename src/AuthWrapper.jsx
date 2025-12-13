import React, { useState } from "react";
import { Dialog } from "primereact/dialog";
import { Password } from "primereact/password";
import { Button } from "primereact/button";
import { Message } from "primereact/message";

const CORRECT_PASSWORD = "codaaddin1";
const STORAGE_KEY = "isAuthenticated";

export default function AuthWrapper({ children }) {
    const [isAuthenticated, setIsAuthenticated] = useState(
        localStorage.getItem(STORAGE_KEY) === "true"
    );

    const [password, setPassword] = useState("");
    const [error, setError] = useState(false);

    const handleLogin = () => {
        if (password === CORRECT_PASSWORD) {
            localStorage.setItem(STORAGE_KEY, "true");
            setIsAuthenticated(true);
            setError(false);
            setPassword("");
        } else {
            setError(true);
        }
    };

    if (!isAuthenticated) {
        return (
            <Dialog
                visible
                closable={false}
                draggable={false}
                modal
                header="Authentication Required"
                style={{ width: "350px" }}
                onHide={() => {}}
            >
                <div className="p-fluid">
                    <label htmlFor="password" className="mb-2">
                        Enter Password
                    </label>

                    <Password
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        feedback={false}
                        toggleMask
                        className="mb-3"
                        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    />

                    {error && (
                        <Message
                            severity="error"
                            text="Incorrect password"
                            className="mb-3"
                        />
                    )}

                    <Button
                        label="Login"
                        icon="pi pi-lock"
                        onClick={handleLogin}
                    />
                </div>
            </Dialog>
        );
    }

    return <>{children}</>;
}
