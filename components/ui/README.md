# Shared UI Components Library

This directory contains reusable UI components following Gen Z-styled design principles with full theme support (light/dark mode).

## Components

### Button

A versatile button component with multiple variants and sizes.

**Variants:**
- `default` - Standard button
- `primary` - Primary action button with shadow
- `secondary` - Secondary action button
- `destructive` - Destructive action button (delete, remove)
- `outline` - Outlined button
- `ghost` - Transparent button with hover effect

**Sizes:**
- `sm` - Small button
- `default` - Default size
- `lg` - Large button
- `icon` - Square button for icons

**Usage:**
```tsx
import { Button } from '@/components/ui';

<Button variant="primary" size="lg">
  Get Started
</Button>

<Button variant="destructive" onClick={handleDelete}>
  Delete
</Button>
```

### Input

An input component with validation states and helper text.

**Props:**
- `error` - Boolean to show error state
- `helperText` - Text to display below input (error message or hint)

**Usage:**
```tsx
import { Input } from '@/components/ui';

<Input
  type="text"
  placeholder="Enter destination"
  error={!!errors.destination}
  helperText={errors.destination || "Where would you like to go?"}
/>
```

### Card

A card component with header, content, and footer sections.

**Sub-components:**
- `Card` - Main container
- `CardHeader` - Header section
- `CardTitle` - Title text
- `CardDescription` - Description text
- `CardContent` - Main content area
- `CardFooter` - Footer section

**Usage:**
```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';

<Card>
  <CardHeader>
    <CardTitle>Trip to Paris</CardTitle>
    <CardDescription>5 days of adventure</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Your itinerary details...</p>
  </CardContent>
</Card>
```

### Loading

A loading spinner component with optional text.

**Sizes:**
- `sm` - Small spinner
- `default` - Default size
- `lg` - Large spinner

**Usage:**
```tsx
import { Loading } from '@/components/ui';

<Loading size="lg" text="Generating your itinerary..." />
```

### ErrorMessage

An error message component with optional retry button.

**Props:**
- `title` - Error title (default: "Error")
- `message` - Error message (required)
- `onRetry` - Optional retry callback

**Usage:**
```tsx
import { ErrorMessage } from '@/components/ui';

<ErrorMessage
  title="Failed to load itinerary"
  message="We couldn't load your itinerary. Please try again."
  onRetry={handleRetry}
/>
```

### Dialog (Modal)

A modal dialog component with backdrop and keyboard support.

**Sub-components:**
- `Dialog` - Main container (controls open state)
- `DialogContent` - Content container with close button
- `DialogHeader` - Header section
- `DialogTitle` - Title text
- `DialogDescription` - Description text
- `DialogFooter` - Footer section for actions

**Features:**
- Closes on Escape key
- Closes on backdrop click
- Prevents body scroll when open
- Accessible with ARIA attributes

**Usage:**
```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui';
import { Button } from '@/components/ui';

const [open, setOpen] = useState(false);

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent onClose={() => setOpen(false)}>
    <DialogHeader>
      <DialogTitle>Delete Itinerary</DialogTitle>
      <DialogDescription>
        Are you sure you want to delete this itinerary? This action cannot be undone.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      <Button variant="destructive" onClick={handleDelete}>
        Delete
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### ThemeToggle

A button to toggle between light, dark, and system theme modes.

**Usage:**
```tsx
import { ThemeToggle } from '@/components/ui';

<ThemeToggle />
```

## Design Principles

All components follow these principles:

1. **Theme Support**: Full light/dark mode support using CSS variables
2. **Accessibility**: ARIA attributes, keyboard navigation, focus states
3. **Responsive**: Mobile-first design with responsive breakpoints
4. **Gen Z Styling**: Minimalist, bold, playful design with smooth transitions
5. **Composable**: Components can be combined and customized
6. **Type-Safe**: Full TypeScript support with proper types

## Theme Variables

Components use CSS variables defined in `app/globals.css`:

- `--background` / `--foreground` - Page background and text
- `--card` / `--card-foreground` - Card background and text
- `--primary` / `--primary-foreground` - Primary action colors
- `--secondary` / `--secondary-foreground` - Secondary action colors
- `--destructive` / `--destructive-foreground` - Destructive action colors
- `--muted` / `--muted-foreground` - Muted text and backgrounds
- `--accent` / `--accent-foreground` - Accent colors for hover states
- `--border` - Border color
- `--input` - Input border color
- `--ring` - Focus ring color
- `--radius` - Border radius

## Importing Components

You can import components individually or from the index:

```tsx
// Individual imports
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// From index (recommended)
import { Button, Input, Card } from '@/components/ui';
```
