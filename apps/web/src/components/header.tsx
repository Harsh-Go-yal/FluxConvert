"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
    navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { tools, ToolCategory } from "@/config/tools";
import { Menu, Zap, User, Settings, CreditCard, LogOut, Sparkles } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

// ... (imports remain the same, remove unused ones if any)

export function Header() {
    const [isOpen, setIsOpen] = useState(false);

    // ... (toolsByCategory and categories logic remains the same)
    const toolsByCategory = tools.reduce((acc, tool) => {
        if (!acc[tool.category]) {
            acc[tool.category] = [];
        }
        acc[tool.category].push(tool);
        return acc;
    }, {} as Record<ToolCategory, typeof tools>);

    const categories: ToolCategory[] = ["PDF", "Convert", "Image", "Security"];

    return (
        <header className="w-full sticky top-4 z-50 px-4">
            <div className="container mx-auto max-w-7xl">
                <div className="rounded-2xl border border-border/50 bg-background/80 backdrop-blur-xl shadow-lg shadow-black/5 px-6 h-16 flex items-center justify-between transition-all duration-300 hover:shadow-primary/5 hover:border-primary/20">

                    {/* Logo Section */}
                    <div className="flex items-center gap-8">
                        <Link href="/" className="flex items-center gap-2.5 group">
                            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                <Zap className="w-5 h-5 text-primary fill-primary/20 group-hover:scale-110 transition-transform duration-300" />
                                <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-primary/20 group-hover:ring-primary/40 transition-all" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-lg leading-none tracking-tight">PDF Solutions</span>
                                <span className="text-[10px] font-medium text-muted-foreground tracking-widest uppercase group-hover:text-primary transition-colors">Pro Tools</span>
                            </div>
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden lg:flex">
                            <NavigationMenu>
                                <NavigationMenuList className="gap-1">
                                    <NavigationMenuItem>
                                        <NavigationMenuTrigger className="h-9 rounded-lg bg-transparent hover:bg-muted/50 data-[state=open]:bg-muted/50">
                                            Tools
                                        </NavigationMenuTrigger>
                                        <NavigationMenuContent>
                                            <div className="grid w-[800px] grid-cols-4 gap-4 p-6 md:w-[900px] lg:w-[1000px] bg-popover/95 backdrop-blur-sm">
                                                {categories.map((category) => (
                                                    <div key={category} className="space-y-4">
                                                        <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                                            <h4 className="font-bold text-sm text-foreground uppercase tracking-wider">
                                                                {category === 'PDF' ? 'Organize PDF' : category}
                                                            </h4>
                                                        </div>
                                                        <ul className="space-y-1">
                                                            {toolsByCategory[category]?.map((tool) => (
                                                                <li key={tool.id}>
                                                                    <NavigationMenuLink asChild>
                                                                        <Link
                                                                            href={tool.href}
                                                                            className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-all p-2 rounded-lg hover:bg-muted group/item"
                                                                        >
                                                                            <div className={cn("p-1.5 rounded-md bg-muted/50 group-hover/item:bg-background shadow-sm transition-colors", tool.color.replace('text-', 'bg-').replace('500', '500/10').replace('600', '600/10').replace('700', '700/10'))}>
                                                                                <tool.icon className={cn("w-3.5 h-3.5", tool.color)} />
                                                                            </div>
                                                                            <span className="line-clamp-1 font-medium">{tool.title}</span>
                                                                        </Link>
                                                                    </NavigationMenuLink>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                ))}
                                            </div>
                                        </NavigationMenuContent>
                                    </NavigationMenuItem>

                                    <NavigationMenuItem>
                                        <Link href="/merge-pdf" legacyBehavior passHref>
                                            <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), "h-9 rounded-lg bg-transparent hover:bg-muted/50")}>
                                                Merge
                                            </NavigationMenuLink>
                                        </Link>
                                    </NavigationMenuItem>
                                    <NavigationMenuItem>
                                        <Link href="/compress-pdf" legacyBehavior passHref>
                                            <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), "h-9 rounded-lg bg-transparent hover:bg-muted/50")}>
                                                Compress
                                            </NavigationMenuLink>
                                        </Link>
                                    </NavigationMenuItem>
                                    <NavigationMenuItem>
                                        <Link href="/pricing" legacyBehavior passHref>
                                            <NavigationMenuLink className={cn(navigationMenuTriggerStyle(), "h-9 rounded-lg bg-transparent hover:bg-muted/50")}>
                                                Pricing
                                            </NavigationMenuLink>
                                        </Link>
                                    </NavigationMenuItem>
                                </NavigationMenuList>
                            </NavigationMenu>
                        </div>
                    </div>

                    {/* Right Side Actions */}
                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-2">
                            <Button variant="ghost" size="sm" className="hidden xl:flex gap-2 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10">
                                <Sparkles className="w-4 h-4" />
                                <span className="font-medium">Go Pro</span>
                            </Button>
                            <div className="h-4 w-px bg-border/50 mx-1" />
                            <ThemeToggle />
                        </div>

                        {/* Auth Buttons */}
                        <div className="flex items-center gap-2">
                            <SignedOut>
                                <SignInButton mode="modal">
                                    <Button variant="ghost" size="sm">Log in</Button>
                                </SignInButton>
                                <SignUpButton mode="modal">
                                    <Button size="sm">Sign up</Button>
                                </SignUpButton>
                            </SignedOut>
                            <SignedIn>
                                <UserButton afterSignOutUrl="/" />
                            </SignedIn>
                        </div>

                        {/* Mobile Menu Toggle */}
                        <div className="lg:hidden">
                            <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)}>
                                <Menu className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu Content */}
                {isOpen && (
                    <div className="lg:hidden mt-2 rounded-2xl border border-border/50 bg-background/95 backdrop-blur-xl shadow-xl p-4 space-y-4 animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-2 gap-3">
                            <Link href="/merge-pdf" className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded-xl hover:bg-muted transition-colors" onClick={() => setIsOpen(false)}>
                                <span className="font-medium text-sm">Merge PDF</span>
                            </Link>
                            <Link href="/compress-pdf" className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded-xl hover:bg-muted transition-colors" onClick={() => setIsOpen(false)}>
                                <span className="font-medium text-sm">Compress PDF</span>
                            </Link>
                        </div>
                        <div className="space-y-1">
                            <Button variant="ghost" className="w-full justify-start" asChild onClick={() => setIsOpen(false)}>
                                <Link href="/">All Tools</Link>
                            </Button>
                            <Button variant="ghost" className="w-full justify-start" asChild onClick={() => setIsOpen(false)}>
                                <Link href="/pricing">Pricing</Link>
                            </Button>
                        </div>
                        <div className="pt-4 border-t border-border/50 flex flex-col gap-2">
                            <Button className="w-full bg-primary/10 text-primary hover:bg-primary/20 border-0">
                                <Sparkles className="w-4 h-4 mr-2" /> Go Pro
                            </Button>
                            <SignedOut>
                                <SignInButton mode="modal">
                                    <Button className="w-full">Log in</Button>
                                </SignInButton>
                            </SignedOut>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
