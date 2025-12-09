import React, { useEffect, useState } from "react";

const ALLOWED_DEVICES = [
    "757ad95b-13e9-4f44-922e-821484d2faf1",
    "e09f1b332b0afb0ffa310e81ddf36718",
    "af3409041c0682f5564c955dfe4b2ea8",
];

export default function AuthWrapper({ children }) {
    const [status, setStatus] = useState("checking");
    const [deviceToken, setDeviceToken] = useState(null);

    useEffect(() => {
        let isMounted = true;

        const checkDevice = () => {
            try {
                let token = localStorage.getItem("deviceToken");

                if (!token) {
                    token = crypto.randomUUID();
                    localStorage.setItem("deviceToken", token);
                }

                if (!isMounted) return;
                setDeviceToken(token);

                if (ALLOWED_DEVICES.includes(token)) {
                    setStatus("authorized");
                } else {
                    setStatus("blocked");
                }
            } catch (err) {
                console.error("Device check failed:", err);
                if (isMounted) setStatus("blocked");
            }
        };

        checkDevice();

        return () => {
            isMounted = false;
        };
    }, []);

    if (status === "checking") {
        return <div className="p-4 text-center">Checking device...</div>;
    }

    if (status === "blocked") {
        return (
            <div className="p-4 text-center" style={{ color: "red" }}>
                <h2>Device Not Authorized</h2>
                <p>Your device is not allowed to access this application.</p>
                <p><strong>Device Token:</strong> {deviceToken}</p>
                <p>Please add this token to the allowed devices array.</p>
            </div>
        );
    }

    return <>{children}</>;
}
