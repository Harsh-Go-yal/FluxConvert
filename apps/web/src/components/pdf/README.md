# PDF UI Components

## Overview
This directory contains the React components for the PDF tools.

## Components

### `PdfToolPanel.tsx`
The main container component. It uses tabs to switch between different PDF tools (Merge, Split).

### `PdfMergeForm.tsx`
Form for merging PDFs.
*   Allows file selection (multiple).
*   Allows mode selection (Auto, Local, Cloud).
*   Displays progress and errors.
*   Provides a download button for the result.

### `PdfSplitForm.tsx`
Form for splitting PDFs.
*   Allows file selection (single).
*   Input for page ranges.
*   Mode selection.
*   Displays results as download links.

## Reusability
These components use ShadCN UI primitives (`Card`, `Button`, `Input`, `Tabs`, `RadioGroup`) for a consistent look and feel. To add a new tool:
1.  Create a new form component (e.g., `PdfProtectForm.tsx`).
2.  Add a new Tab to `PdfToolPanel.tsx`.
