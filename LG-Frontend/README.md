# FLASH - LinenGrass Workflow Assistant Frontend

Modern, desktop-optimized frontend built with Next.js 16 and the LinenGrass Design System.

## Design System

This application follows the **LinenGrass Design System v0.1** with:

- **Brand Colors**: Primary green (#2e7d32) with hover and active states
- **Typography**: Inter for body text, Exo 2 for branding
- **Components**: Fully accessible UI components matching the design spec
- **Layout**: Desktop-first with sidebar navigation

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main chat interface
│   └── globals.css         # Design system tokens
├── components/
│   ├── chat/
│   │   ├── chat-input.tsx  # Message input component
│   │   └── chat-message.tsx # Message display
│   ├── forms/
│   │   └── dynamic-form.tsx # Dynamic form renderer
│   ├── layout/
│   │   ├── header.tsx      # Top navigation
│   │   └── sidebar.tsx     # Left sidebar
│   └── ui/                 # Reusable UI components
│       ├── avatar.tsx
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── checkbox.tsx
│       ├── form-field.tsx
│       ├── input.tsx
│       ├── search-input.tsx
│       ├── select.tsx
│       ├── textarea.tsx
│       └── toggle.tsx
└── lib/
    ├── design-tokens.ts    # Design system constants
    └── utils.ts            # Utility functions
```

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Features

- ✅ Desktop-optimized layout with sidebar navigation
- ✅ Real-time chat interface with workflow assistant
- ✅ Dynamic form rendering based on backend schemas
- ✅ LinenGrass Design System implementation
- ✅ Fully typed with TypeScript
- ✅ Accessible UI components
- ✅ Responsive design tokens

## Design System Components

All components follow the LinenGrass Design System specifications:

- **Buttons**: Primary, Secondary, Outline, Danger variants with 3 sizes
- **Forms**: Floating labels, error states, validation
- **Inputs**: Text, Select, Textarea, Search with consistent styling
- **Badges**: Status indicators (Active, Pending, Inactive)
- **Cards**: Content containers with headers
- **Avatar**: User initials with size variants

## Backend Integration

The frontend connects to the backend API at `http://localhost:8050`:

- `POST /api/chat` - Send messages and receive workflow responses
- `POST /api/form-submit` - Submit form data and continue workflows

Make sure the backend server is running before starting the frontend.
