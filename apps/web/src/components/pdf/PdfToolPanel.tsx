import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PdfMergeForm } from './PdfMergeForm';
import { PdfSplitForm } from './PdfSplitForm';

export function PdfToolPanel() {
    const [activeTab, setActiveTab] = useState("merge");

    return (
        <Card className="w-full max-w-4xl mx-auto mt-8">
            <CardHeader>
                <CardTitle>PDF Tools</CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="merge" value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="merge">Merge PDFs</TabsTrigger>
                        <TabsTrigger value="split">Split PDF</TabsTrigger>
                    </TabsList>
                    <TabsContent value="merge">
                        <PdfMergeForm />
                    </TabsContent>
                    <TabsContent value="split">
                        <PdfSplitForm />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
