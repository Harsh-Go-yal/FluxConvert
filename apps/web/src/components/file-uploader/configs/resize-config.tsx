import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Lock, Unlock, Ratio, Crop, Maximize } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResizeConfigProps {
    width: number;
    setWidth: (val: number) => void;
    height: number;
    setHeight: (val: number) => void;
    unit: "pixels" | "percentage";
    setUnit: (val: "pixels" | "percentage") => void;
    maintainAspectRatio: boolean;
    setMaintainAspectRatio: (val: boolean) => void;
    resizeMode: "stretch" | "crop" | "fit";
    setResizeMode: (val: "stretch" | "crop" | "fit") => void;
    dpi: number;
    setDpi: (val: number) => void;
    format: "jpg" | "png" | "webp";
    setFormat: (val: "jpg" | "png" | "webp") => void;
    quality: number;
    setQuality: (val: number) => void;
    background: string;
    setBackground: (val: string) => void;
    originalWidth?: number;
    originalHeight?: number;
}

export function ResizeConfig({
    width, setWidth,
    height, setHeight,
    unit, setUnit,
    maintainAspectRatio, setMaintainAspectRatio,
    resizeMode, setResizeMode,
    dpi, setDpi,
    format, setFormat,
    quality, setQuality,
    background, setBackground,
    originalWidth = 1000,
    originalHeight = 1000
}: ResizeConfigProps) {

    const handleWidthChange = (val: number) => {
        setWidth(val);
        if (maintainAspectRatio && unit === "pixels") {
            const ratio = originalHeight / originalWidth;
            setHeight(Math.round(val * ratio));
        }
    };

    const handleHeightChange = (val: number) => {
        setHeight(val);
        if (maintainAspectRatio && unit === "pixels") {
            const ratio = originalWidth / originalHeight;
            setWidth(Math.round(val * ratio));
        }
    };

    return (
        <div className="space-y-8 w-full max-w-2xl mx-auto">
            <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Choose new size and format</h2>
                {originalWidth && originalHeight && (
                    <p className="text-muted-foreground mb-6">
                        Original size: <span className="font-medium text-foreground">{originalWidth} x {originalHeight}</span>
                    </p>
                )}
            </div>

            {/* Width / Height / Unit */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                        <Label className="w-16 text-right font-semibold text-lg">Width</Label>
                        <Input
                            type="number"
                            value={width}
                            onChange={(e) => handleWidthChange(Number(e.target.value))}
                            className="w-32 h-12 text-lg text-center"
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <Label className="w-16 text-right font-semibold text-lg">Height</Label>
                        <Input
                            type="number"
                            value={height}
                            onChange={(e) => handleHeightChange(Number(e.target.value))}
                            className="w-32 h-12 text-lg text-center"
                        />
                    </div>
                </div>

                {/* Lock & Unit */}
                <div className="flex flex-col gap-4 items-center">
                    <div className="relative flex items-center">
                        <div className="absolute left-[-1rem] top-1/2 -translate-y-1/2 w-4 border-t border-border" />
                        <Button
                            variant={maintainAspectRatio ? "default" : "outline"}
                            size="icon"
                            className="rounded-full w-10 h-10 z-10"
                            onClick={() => setMaintainAspectRatio(!maintainAspectRatio)}
                        >
                            {maintainAspectRatio ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        </Button>
                        <div className="absolute right-[-1rem] top-1/2 -translate-y-1/2 w-4 border-t border-border" />
                    </div>

                    <Select value={unit} onValueChange={(v: any) => setUnit(v)}>
                        <SelectTrigger className="w-32 h-12">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pixels">Pixels</SelectItem>
                            <SelectItem value="percentage">Percent</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Resize Mode */}
            <div className="space-y-4">
                <Label className="text-lg font-semibold">Resize Mode</Label>
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { id: "stretch", label: "Stretch", icon: Ratio },
                        { id: "crop", label: "Crop", icon: Crop },
                        { id: "fit", label: "Fit", icon: Maximize },
                    ].map((mode) => (
                        <div
                            key={mode.id}
                            onClick={() => setResizeMode(mode.id as any)}
                            className={cn(
                                "cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center gap-3 transition-all",
                                resizeMode === mode.id
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                            )}
                        >
                            <div className={cn(
                                "w-full aspect-video rounded-lg border flex items-center justify-center overflow-hidden bg-muted",
                                resizeMode === mode.id ? "border-primary/20" : "border-border"
                            )}>
                                {/* Visual representation could go here */}
                                <mode.icon className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <div className="flex items-center gap-2">
                                <div className={cn(
                                    "w-4 h-4 rounded-full border flex items-center justify-center",
                                    resizeMode === mode.id ? "border-primary" : "border-muted-foreground"
                                )}>
                                    {resizeMode === mode.id && <div className="w-2 h-2 rounded-full bg-primary" />}
                                </div>
                                <span className="font-medium">{mode.label}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Resolution */}
            <div className="flex items-center justify-center gap-4">
                <Label className="font-semibold text-lg">Resolution</Label>
                <div className="relative">
                    <Input
                        type="number"
                        value={dpi}
                        onChange={(e) => setDpi(Number(e.target.value))}
                        className="w-32 h-12 text-lg text-center pr-12"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">DPI</span>
                </div>
            </div>

            {/* Format, Quality, Background */}
            <div className="grid md:grid-cols-3 gap-8 items-start">
                <div className="space-y-3">
                    <Label className="text-lg font-semibold">Format</Label>
                    <Select value={format} onValueChange={(v: any) => setFormat(v)}>
                        <SelectTrigger className="h-12 text-lg">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="jpg">JPG</SelectItem>
                            <SelectItem value="png">PNG</SelectItem>
                            <SelectItem value="webp">WEBP</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-3">
                    <Label className="text-lg font-semibold">Quality</Label>
                    <div className="relative">
                        <Input
                            type="number"
                            min={1}
                            max={100}
                            value={quality}
                            onChange={(e) => setQuality(Number(e.target.value))}
                            className="h-12 text-lg text-center pr-8"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">%</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <Label className="text-lg font-semibold">Background</Label>
                    <div className="flex items-center gap-3">
                        <div
                            className={cn(
                                "w-10 h-10 rounded-full border-2 cursor-pointer transition-all",
                                background === "#ffffff" ? "border-primary ring-2 ring-primary/20" : "border-border"
                            )}
                            style={{ backgroundColor: "#ffffff" }}
                            onClick={() => setBackground("#ffffff")}
                        />
                        <div
                            className={cn(
                                "w-10 h-10 rounded-full border-2 cursor-pointer transition-all",
                                background === "#000000" ? "border-primary ring-2 ring-primary/20" : "border-border"
                            )}
                            style={{ backgroundColor: "#000000" }}
                            onClick={() => setBackground("#000000")}
                        />
                        <div className="relative">
                            <input
                                type="color"
                                value={background}
                                onChange={(e) => setBackground(e.target.value)}
                                className="w-10 h-10 rounded-full overflow-hidden cursor-pointer opacity-0 absolute inset-0"
                            />
                            <div
                                className={cn(
                                    "w-10 h-10 rounded-full border-2 flex items-center justify-center bg-gradient-to-br from-red-500 via-green-500 to-blue-500",
                                    background !== "#ffffff" && background !== "#000000" ? "border-primary ring-2 ring-primary/20" : "border-border"
                                )}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
