# Package Usage Guide

This document shows how to properly import and use the packages in this monorepo.

## 📦 Package Imports

### **UI Components (`@hackaton/ui`)**

```typescript
// Import individual components
import { Button, Card } from '@hackaton/ui'

// Usage example
function MyComponent() {
  return (
    <Card title="My Card" variant="elevated">
      <Button variant="primary" size="large" onClick={() => console.log('Clicked!')}>
        Click me
      </Button>
    </Card>
  )
}
```

### **Tailwind Configuration (`@hackaton/tailwind-config`)**

```javascript
// In tailwind.config.js files
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  presets: [require('@hackaton/tailwind-config')],
}
```

## 🏗️ Current Package Structure

```
hackaton/
├── apps/
│   ├── client/                    # React app
│   │   ├── src/App.tsx           # Uses @hackaton/ui components
│   │   └── tailwind.config.js    # Uses @hackaton/tailwind-config
│   └── api/                       # Express API
├── packages/
│   ├── @hackaton/ui/              # Shared UI components
│   │   ├── src/
│   │   │   ├── Button.tsx         # Exported as Button
│   │   │   ├── Card.tsx           # Exported as Card
│   │   │   └── index.ts           # Exports all components
│   │   └── package.json           # Scoped package name
│   └── @hackaton/tailwind-config/ # Shared Tailwind config
│       ├── index.js               # Main Tailwind configuration
│       └── package.json           # Scoped package name
```

## ✅ Import Patterns

### **Correct Usage:**
```typescript
// ✅ Using scoped package names
import { Button, Card } from '@hackaton/ui'
import { someUtil } from '@hackaton/utils'  // Future package

// ✅ In config files
presets: [require('@hackaton/tailwind-config')]
```

### **Incorrect Usage:**
```typescript
// ❌ Don't use relative paths for packages
import { Button } from '../../packages/ui/src/Button'

// ❌ Don't use unscoped names
import { Button } from 'ui'
```

## 🔧 Package Dependencies

### **Client App (`apps/client/package.json`):**
```json
{
  "dependencies": {
    "@hackaton/ui": "workspace:*",
    "@hackaton/tailwind-config": "workspace:*"
  }
}
```

### **UI Package (`packages/@hackaton/ui/package.json`):**
```json
{
  "name": "@hackaton/ui",
  "dependencies": {
    "@hackaton/tailwind-config": "workspace:*"
  }
}
```

## 🚀 Development Commands

```bash
# Install all dependencies
pnpm install

# Run specific package
pnpm -F @hackaton/ui build
pnpm -F @hackaton/tailwind-config build

# Run apps
pnpm -F client dev
pnpm -F api dev
```

## 📝 Notes

- All packages use the `@hackaton/` scope for consistency
- Workspace dependencies use `workspace:*` for local development
- Import paths must use the full scoped package names
- This ensures proper TypeScript resolution and bundling
