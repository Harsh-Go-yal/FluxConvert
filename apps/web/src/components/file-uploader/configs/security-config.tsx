import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface SecurityConfigProps {
    action: string;
    password: string;
    setPassword: (val: string) => void;
}

export function SecurityConfig({ action, password, setPassword }: SecurityConfigProps) {
    return (
        <div className="max-w-xs animate-in fade-in slide-in-from-left-2">
            <Label>{action === "protect-pdf" ? "Set Password" : "Enter Password"}</Label>
            <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="mt-1.5"
            />
        </div>
    );
}
