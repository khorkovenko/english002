import React, { useEffect, useState } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

// Allowed device fingerprints
const ALLOWED_DEVICES = [
    ""
];

export default function AuthWrapper({ children }) {
    const [status, setStatus] = useState("checking");
    // "checking" | "authorized" | "blocked"
    const [deviceCode, setDeviceCode] = useState(null);

    useEffect(() => {
        let isMounted = true; // prevents ghost renders

        const checkDevice = async () => {
            try {
                const fp = await FingerprintJS.load();
                const result = await fp.get();
                const code = result.visitorId;

                if (!isMounted) return;

                setDeviceCode(code);

                if (ALLOWED_DEVICES.includes(code)) {
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
            isMounted = false; // cleanup to avoid stale updates
        };
    }, []);

    // 🔒 1. absolutely no children rendered until check completes
    if (status === "checking") {
        return <div className="p-4 text-center">Checking device...</div>;
    }

    // ❌ 2. unauthorized devices blocked completely
    if (status === "blocked") {
        return (
            <div className="p-4 text-center" style={{ color: "red" }}>
                <h2>Device Not Authorized</h2>
                <p>Your device is not allowed to access this application.</p>
                <p><strong>Device Code:</strong> {deviceCode}</p>
                <p>Please add this code to the allowed devices array.</p>
            </div>
        );
    }

    // ✅ 3. Only render children AFTER explicit authorization
    return <>{children}</>;
}
