import React, {useState} from "react";
import {Navigate, Outlet, useNavigate} from "react-router-dom";
import {Dialog} from "primereact/dialog";
import {Password} from "primereact/password";
import {Button} from "primereact/button";
import {Message} from "primereact/message";

const CORRECT_PASSWORD = "codaaddin1";
const STORAGE_KEY = "isAuthenticated";

export const isAuthenticated = () => localStorage.getItem(STORAGE_KEY) === "true";

export default function AuthWrapper() {
    return isAuthenticated() ? <Outlet/> : <Navigate to="/login" replace/>;
}

export function LoginPage() {
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [error, setError] = useState(false);

    const handleLogin = () => {
        if (password === CORRECT_PASSWORD) {
            localStorage.setItem(STORAGE_KEY, "true");
            navigate("/", {replace: true});
        } else {
            setError(true);
        }
    };

    if (isAuthenticated()) return <Navigate to="/" replace/>;
    return (
        <Dialog
            visible
            closable={false}
            draggable={false}
            modal
            header="Authentication Required"
            style={{width: "350px"}}
            onHide={() => {
            }}
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
