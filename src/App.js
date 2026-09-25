import React from "react";
import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "primeflex/primeflex.css";

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LearningTable from "./LearningTable";
import AuthWrapper, { LoginPage } from "./AuthWrapper";
import Layout from "./Layout";
import ShadowingPage from "./ShadowingPage";
import EssayPage from "./EssayPage";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route element={<AuthWrapper />}>
                    <Route element={<Layout />}>
                        <Route path="/" element={<LearningTable />} />
                        <Route path="/shadowing" element={<ShadowingPage />} />
                        <Route path="/essay" element={<EssayPage />} />
                    </Route>
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
