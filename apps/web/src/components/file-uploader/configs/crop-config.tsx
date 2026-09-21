import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Crop } from "lucide-react";

export interface CropMargins {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

interface CropConfigProps {
    margins: CropMargins;
    setMargins: (val: CropMargins) => void;
}

export function CropConfig({ margins, setMargins }: CropConfigProps) {
    const update = (key: keyof CropMargins, value: number) => {
        const clamped = Number.isFinite(value) && value > 0 ? value : 0;
        setMargins({ ...margins, [key]: clamped });
    };

    const fields: { key: keyof CropMargins; label: string }[] = [
        { key: "top", label: "Top" },
        { key: "right", label: "Right" },
        { key: "bottom", label: "Bottom" },
        { key: "left", label: "Left" },
    ];

    return (
        <div className="space-y-8 w-full max-w-2xl mx-auto">
            <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Crop margins</h2>
                <p className="text-muted-foreground mb-6">
                    Trim the same margin from every page. Values are in points (1 pt = 1/72 in).
                </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
                {fields.map((field) => (
                    <div key={field.key} className="space-y-3">
                        <Label className="text-lg font-semibold">{field.label}</Label>
                        <div className="relative">
                            <Input
                                type="number"
                                min={0}
                                value={margins[field.key]}
                                onChange={(e) => update(field.key, Number(e.target.value))}
                                className="h-12 text-lg text-center pr-12"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">pt</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-center gap-3 text-muted-foreground">
                <Crop className="w-5 h-5" />
                <span className="text-sm">Margins are applied to every page independently.</span>
            </div>
        </div>
    );
}
