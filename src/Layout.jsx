import React from "react";
import {NavLink, Outlet} from "react-router-dom";

const LINKS = [["/", "Table"], ["/shadowing", "Shadowing"], ["/essay", "Essay"]];

export default function Layout() {
    return (
        <>
            <nav style={{display: "flex", gap: "0.5rem", padding: "0.75rem 10px", borderBottom: "1px solid #e5e7eb", background: "white"}}>
                {LINKS.map(([to, label]) => (
                    <NavLink key={to} to={to} end style={({isActive}) => ({padding: "0.4rem 0.9rem", borderRadius: "999px", textDecoration: "none", fontWeight: 600, fontSize: "0.9rem", color: isActive ? "white" : "#374151", background: isActive ? "#2196F3" : "#f3f4f6"})}>
                        {label}
                    </NavLink>
                ))}
            </nav>
            <Outlet/>
        </>
    );
}
