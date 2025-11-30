import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatBytes } from "@/lib/utils";

interface CompressConfigProps {
    files: File[];
    compressionMode: "percentage" | "target";
    setCompressionMode: (val: "percentage" | "target") => void;
    compressionPercentage: number;
    setCompressionPercentage: (val: number) => void;
    targetSize: number;
    setTargetSize: (val: number) => void;
    targetUnit: "KB" | "MB";
    setTargetUnit: (val: "KB" | "MB") => void;
}

export function CompressConfig({
    files,
    compressionMode,
    setCompressionMode,
    compressionPercentage,
    setCompressionPercentage,
    targetSize,
    setTargetSize,
    targetUnit,
    setTargetUnit
}: CompressConfigProps) {
    if (files.length === 0) return null;

    const currentSize = files[0].size;

    return (
        <div className="w-full max-w-md mx-auto space-y-6 p-6 bg-card rounded-xl border border-border shadow-sm">
            <div className="space-y-2 text-center">
                <h3 className="text-lg font-medium">Compression Settings</h3>
                <p className="text-sm text-muted-foreground">
                    Current Size: <span className="font-mono font-medium text-foreground">{formatBytes(currentSize)}</span>
                </p>
            </div>

            <RadioGroup
                value={compressionMode}
                onValueChange={(val) => setCompressionMode(val as "percentage" | "target")}
                className="grid grid-cols-2 gap-4"
            >
                <div>
                    <RadioGroupItem value="percentage" id="mode-percentage" className="peer sr-only" />
                    <Label
                        htmlFor="mode-percentage"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                        <span>Percentage</span>
                    </Label>
                </div>
                <div>
                    <RadioGroupItem value="target" id="mode-target" className="peer sr-only" />
                    <Label
                        htmlFor="mode-target"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                        <span>Target Size</span>
                    </Label>
                </div>
            </RadioGroup>

            {compressionMode === "percentage" ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex justify-between items-center">
                        <Label>Compression Level</Label>
                        <span className="text-sm font-medium">{compressionPercentage}%</span>
                    </div>
                    <Slider
                        value={[compressionPercentage]}
                        onValueChange={(vals: number[]) => setCompressionPercentage(vals[0])}
                        min={1}
                        max={100}
                        step={1}
                        className="w-full"
                    />
                    <p className="text-xs text-muted-foreground text-center">
                        Lower percentage means smaller file size but lower quality.
                    </p>
                </div>
            ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <Label>Target File Size</Label>
                    <div className="flex gap-2">
                        <Input
                            type="number"
                            value={targetSize}
                            onChange={(e) => setTargetSize(Number(e.target.value))}
                            min={1}
                            placeholder="Enter size"
                            className="flex-1"
                        />
                        <Select value={targetUnit} onValueChange={(val) => setTargetUnit(val as "KB" | "MB")}>
                            <SelectTrigger className="w-[100px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="KB">KB</SelectItem>
                                <SelectItem value="MB">MB</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                        We'll try to compress the image to be under this size.
                    </p>
                </div>
            )}
        </div>
    );
}
