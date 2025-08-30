# Titan AI Project Builder

## Overview

Titan is an autonomous AI project builder that provides a real-time dashboard interface for managing AI-driven development projects. The system operates as a single-page application (SPA) where users can create projects, interact with AI agents, monitor progress, and track deliverables - all within a unified dark-themed interface with neon green accents.

The application follows a chat-driven development model where users provide natural language prompts to describe their desired project outcomes, and the system manages the execution through an autonomous AI workflow. Each project expands into a comprehensive 5-tab interface displaying progress trees, chat interactions, execution logs, output reviews, and sales analytics.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development tooling
- **UI Components**: Radix UI primitives with shadcn/ui component library for consistent design
- **Styling**: Tailwind CSS with custom dark theme and neon green accent colors
- **State Management**: TanStack Query for server state management and React hooks for local state
- **Routing**: Wouter for lightweight client-side routing (though the app is primarily single-page)

The frontend is structured as a dashboard-centric SPA with no traditional page navigation. All interactions happen within expandable project cards that reveal detailed tabbed interfaces.

### Backend Architecture
- **Server**: Express.js with TypeScript running on Node.js
- **API Design**: RESTful endpoints following `/api/resource` patterns
- **Request Handling**: JSON-based communication with proper error handling and logging middleware
- **Development Setup**: Hot reload via Vite integration for seamless development experience

The backend provides a clean API layer that supports the frontend's real-time project management needs while maintaining simple CRUD operations for projects, features, messages, and logs.

### Database Schema
- **ORM**: Drizzle ORM with PostgreSQL dialect for type-safe database operations
- **Schema Design**: Hierarchical project structure with projects containing features, milestones, and goals
- **Core Tables**: Projects, features, milestones, goals, messages, logs, deliverables, and sales data
- **Relationships**: Foreign key relationships maintaining data integrity across the project hierarchy

The schema supports the complex project breakdown structure while enabling efficient queries for the dashboard's real-time updates.

### Component Architecture
- **Project Cards**: Collapsible cards showing project overview with expansion to full interface
- **Tab System**: Five distinct tabs (Progress, Input, Logs, Output, Sales) each with specialized functionality
- **Reusable UI**: Consistent component library with proper TypeScript interfaces
- **Context Providers**: Query client and toast notifications for global state management

The component structure emphasizes modularity and reusability while maintaining the specific requirements of each tab's functionality.

## External Dependencies

### Core Framework Dependencies
- **@tanstack/react-query**: Server state management and caching for real-time data synchronization
- **@neondatabase/serverless**: PostgreSQL database connection optimized for serverless environments
- **drizzle-orm**: Type-safe ORM for database operations with excellent TypeScript integration
- **express**: Web server framework for the backend API layer

### UI and Styling Dependencies
- **@radix-ui/react-***: Comprehensive set of accessible UI primitives for components
- **tailwindcss**: Utility-first CSS framework for responsive design and dark theme implementation
- **class-variance-authority**: Type-safe variant API for component styling
- **lucide-react**: Icon library providing consistent iconography

### Development and Build Tools
- **vite**: Fast build tool and development server with TypeScript support
- **wouter**: Lightweight routing library for minimal client-side navigation
- **drizzle-kit**: Database migration and schema management tools
- **typescript**: Static type checking for improved developer experience

### Session and Authentication
- **connect-pg-simple**: PostgreSQL session store for Express sessions (prepared for future authentication features)

The dependency selection prioritizes developer experience, type safety, and performance while maintaining a focused feature set aligned with the autonomous AI project builder concept.