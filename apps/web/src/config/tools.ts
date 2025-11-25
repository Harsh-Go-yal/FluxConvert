import {
    FileText,
    Image as ImageIcon,
    Layers,
    Maximize,
    Minimize,
    RefreshCw,
    Scissors,
    Shield,
    Unlock,
    FileSpreadsheet,
    FileType,
    Wand2,
    Stamp,
    FileImage
} from "lucide-react";

export type ToolCategory = "PDF" | "Image" | "Convert" | "Security";

export interface Tool {
    id: string;
    title: string;
    description: string;
    icon: any;
    category: ToolCategory;
    href: string;
    color: string;
}

export const tools: Tool[] = [
    // Organize PDF
    {
        id: "merge-pdf",
        title: "Merge PDF",
        description: "Combine multiple PDFs into one unified document.",
        icon: Layers,
        category: "PDF",
        href: "/merge-pdf",
        color: "text-red-500"
    },
    {
        id: "split-pdf",
        title: "Split PDF",
        description: "Extract pages from your PDF or save each page as a separate PDF.",
        icon: Scissors,
        category: "PDF",
        href: "/split-pdf",
        color: "text-red-500"
    },
    {
        id: "remove-pages",
        title: "Remove Pages",
        description: "Select and remove specific pages from your PDF document.",
        icon: Scissors,
        category: "PDF",
        href: "/remove-pages",
        color: "text-red-500"
    },
    {
        id: "extract-pages",
        title: "Extract Pages",
        description: "Get a high-quality PDF document with only the pages you want.",
        icon: Layers,
        category: "PDF",
        href: "/extract-pages",
        color: "text-red-500"
    },
    {
        id: "organize-pdf",
        title: "Organize PDF",
        description: "Sort pages of your PDF file however you like.",
        icon: Layers,
        category: "PDF",
        href: "/organize-pdf",
        color: "text-red-500"
    },
    {
        id: "scan-pdf",
        title: "Scan to PDF",
        description: "Capture document scans from your mobile device and send them to your browser.",
        icon: FileImage,
        category: "PDF",
        href: "/scan-pdf",
        color: "text-red-500"
    },

    // Optimize PDF
    {
        id: "compress-pdf",
        title: "Compress PDF",
        description: "Reduce file size while optimizing for maximal PDF quality.",
        icon: Minimize,
        category: "PDF",
        href: "/compress-pdf",
        color: "text-green-500"
    },
    {
        id: "repair-pdf",
        title: "Repair PDF",
        description: "Recover data from a corrupted or damaged PDF document.",
        icon: Wand2,
        category: "PDF",
        href: "/repair-pdf",
        color: "text-green-500"
    },
    {
        id: "ocr-pdf",
        title: "OCR PDF",
        description: "Convert scanned PDF and images into editable Word, Excel, and PPT documents.",
        icon: FileType,
        category: "Convert",
        href: "/ocr-pdf",
        color: "text-blue-700"
    },

    // Convert to PDF
    {
        id: "image-to-pdf",
        title: "JPG to PDF",
        description: "Convert JPG, PNG, BMP, GIF, and TIFF images to PDF.",
        icon: FileImage,
        category: "Convert",
        href: "/image-to-pdf",
        color: "text-yellow-500"
    },
    {
        id: "word-to-pdf",
        title: "WORD to PDF",
        description: "Make DOC and DOCX files easy to read by converting them to PDF.",
        icon: FileText,
        category: "Convert",
        href: "/word-to-pdf",
        color: "text-blue-500"
    },
    {
        id: "powerpoint-to-pdf",
        title: "POWERPOINT to PDF",
        description: "Make PPT and PPTX slideshows easy to view by converting them to PDF.",
        icon: FileSpreadsheet,
        category: "Convert",
        href: "/powerpoint-to-pdf",
        color: "text-orange-500"
    },
    {
        id: "excel-to-pdf",
        title: "EXCEL to PDF",
        description: "Make EXCEL spreadsheets easy to read by converting them to PDF.",
        icon: FileSpreadsheet,
        category: "Convert",
        href: "/excel-to-pdf",
        color: "text-green-600"
    },
    {
        id: "html-to-pdf",
        title: "HTML to PDF",
        description: "Convert webpages in HTML to PDF.",
        icon: FileText,
        category: "Convert",
        href: "/html-to-pdf",
        color: "text-gray-500"
    },

    // Convert from PDF
    {
        id: "pdf-to-jpg",
        title: "PDF to JPG",
        description: "Convert each PDF page into a JPG or extract all images.",
        icon: ImageIcon,
        category: "Convert",
        href: "/pdf-to-jpg",
        color: "text-yellow-500"
    },
    {
        id: "pdf-to-word",
        title: "PDF to WORD",
        description: "Convert your PDF to WORD documents with incredible accuracy.",
        icon: FileText,
        category: "Convert",
        href: "/pdf-to-word",
        color: "text-blue-500"
    },
    {
        id: "pdf-to-powerpoint",
        title: "PDF to POWERPOINT",
        description: "Convert your PDF to POWERPOINT presentations.",
        icon: FileSpreadsheet,
        category: "Convert",
        href: "/pdf-to-powerpoint",
        color: "text-orange-500"
    },
    {
        id: "pdf-to-excel",
        title: "PDF to EXCEL",
        description: "Convert PDF data to Excel spreadsheets automatically.",
        icon: FileSpreadsheet,
        category: "Convert",
        href: "/pdf-to-excel",
        color: "text-green-600"
    },
    {
        id: "pdf-to-pdfa",
        title: "PDF to PDF/A",
        description: "Convert PDF documents to PDF/A for archiving and long-term preservation.",
        icon: FileText,
        category: "Convert",
        href: "/pdf-to-pdfa",
        color: "text-red-700"
    },

    // Edit PDF
    {
        id: "rotate-pdf",
        title: "Rotate PDF",
        description: "Rotate your PDFs the way you need them. You can even rotate multiple PDFs at once!",
        icon: RefreshCw,
        category: "PDF",
        href: "/rotate-pdf",
        color: "text-orange-500"
    },
    {
        id: "add-page-numbers",
        title: "Add Page Numbers",
        description: "Add page numbers into PDFs with ease. Choose your positions, dimensions, typography.",
        icon: FileText,
        category: "PDF",
        href: "/add-page-numbers",
        color: "text-red-500"
    },
    {
        id: "watermark-pdf",
        title: "Add Watermark",
        description: "Stamp an image or text over your PDF in seconds. Choose the typography, transparency and position.",
        icon: Stamp,
        category: "Security",
        href: "/watermark-pdf",
        color: "text-blue-600"
    },
    {
        id: "crop-pdf",
        title: "Crop PDF",
        description: "Crop PDF by selecting the area you wish to keep.",
        icon: Scissors,
        category: "PDF",
        href: "/crop-pdf",
        color: "text-red-500"
    },
    {
        id: "edit-pdf",
        title: "Edit PDF",
        description: "Add text, images, shapes or freehand annotations to a PDF document.",
        icon: FileText,
        category: "PDF",
        href: "/edit-pdf",
        color: "text-red-500"
    },

    // PDF Security
    {
        id: "unlock-pdf",
        title: "Unlock PDF",
        description: "Remove PDF password security, giving you the freedom to use your PDFs.",
        icon: Unlock,
        category: "Security",
        href: "/unlock-pdf",
        color: "text-slate-500"
    },
    {
        id: "protect-pdf",
        title: "Protect PDF",
        description: "Encrypt your PDF with a password to keep sensitive data confidential.",
        icon: Shield,
        category: "Security",
        href: "/protect-pdf",
        color: "text-slate-700 dark:text-slate-300"
    },
    {
        id: "sign-pdf",
        title: "Sign PDF",
        description: "Sign yourself or request electronic signatures from others.",
        icon: FileText,
        category: "Security",
        href: "/sign-pdf",
        color: "text-blue-600"
    },
    {
        id: "redact-pdf",
        title: "Redact PDF",
        description: "Permanently remove visible text and graphics from a document.",
        icon: Shield,
        category: "Security",
        href: "/redact-pdf",
        color: "text-black"
    },
    {
        id: "compare-pdf",
        title: "Compare PDF",
        description: "Compare and find differences between two versions of a PDF file.",
        icon: Layers,
        category: "PDF",
        href: "/compare-pdf",
        color: "text-red-500"
    },

    // Image Tools (kept for completeness)
    {
        id: "resize-image",
        title: "Resize Image",
        description: "Resize JPG, PNG, SVG or GIF images by defining new height and width pixels.",
        icon: Maximize,
        category: "Image",
        href: "/resize-image",
        color: "text-blue-400"
    },
    {
        id: "compress-image",
        title: "Compress Image",
        description: "Compress JPG, PNG, SVG, and GIFs while saving space and maintaining quality.",
        icon: Minimize,
        category: "Image",
        href: "/compress-image",
        color: "text-blue-400"
    }
];
