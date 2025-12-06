import React from "react";
import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "primeflex/primeflex.css";

import LearningTable from "./LearningTable";
import AuthWrapper from "./AuthWrapper";

export default function App() {
    return (
        <AuthWrapper>
            <div>
                <LearningTable />
            </div>
        </AuthWrapper>
    );
}
