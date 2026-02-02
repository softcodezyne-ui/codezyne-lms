# Admin Settings Page

This document describes the admin settings page implementation for the PetMota LMS system.

## Overview

The admin settings page provides a comprehensive interface for system administrators to configure various aspects of the LMS system. It includes multiple categories of settings with proper validation, error handling, and real-time updates.

## Features

### 1. Settings Categories

- **General Settings**: Site configuration, user management
- **Security Settings**: Password policies, session management, 2FA
- **Notification Settings**: Email and system notification preferences
- **Database Settings**: Backup and maintenance configuration
- **Email Settings**: SMTP configuration
- **System Settings**: System status and maintenance mode

### 2. Key Features

- **Tabbed Interface**: Organized settings into logical categories
- **Real-time Updates**: Changes are tracked and can be saved
- **Form Validation**: Client and server-side validation
- **Error Handling**: Comprehensive error display and handling
- **Reset Functionality**: Ability to reset settings to defaults
- **Status Indicators**: Visual feedback for save states

## File Structure

```
src/
├── app/
│   ├── admin/
│   │   └── settings/
│   │       └── page.tsx          # Main settings page component
│   └── api/
│       └── admin/
│           └── settings/
│               └── route.ts      # API endpoints for settings
├── hooks/
│   └── useSettings.ts            # Custom hook for settings management
└── models/
    └── Settings.ts               # MongoDB model for settings
```

## API Endpoints

### GET /api/admin/settings
Retrieves all settings grouped by category.

### POST /api/admin/settings
Updates settings for a specific category.

**Request Body:**
```json
{
  "category": "system",
  "settings": {
    "siteName": "PetMota LMS",
    "siteUrl": "https://petmota-lms.com",
    "adminEmail": "admin@petmota-lms.com"
  }
}
```

### PUT /api/admin/settings
Bulk update multiple settings categories.

**Request Body:**
```json
{
  "settings": {
    "system": { ... },
    "security": { ... },
    "notifications": { ... }
  }
}
```

### DELETE /api/admin/settings
Resets settings to defaults.

**Query Parameters:**
- `category` (optional): Specific category to reset

## Settings Schema

### System Settings
```typescript
interface SystemSettings {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  adminEmail: string;
  supportEmail: string;
  timezone: string;
  language: string;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  emailVerificationRequired: boolean;
}
```

### Security Settings
```typescript
interface SecuritySettings {
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSymbols: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  twoFactorEnabled: boolean;
  ipWhitelist: string[];
}
```

### Notification Settings
```typescript
interface NotificationSettings {
  emailNotifications: boolean;
  systemNotifications: boolean;
  courseUpdates: boolean;
  paymentNotifications: boolean;
  enrollmentNotifications: boolean;
  weeklyReports: boolean;
  monthlyReports: boolean;
}
```

## Usage

### Accessing the Settings Page

1. Navigate to `/admin/settings` as an admin user
2. The page will automatically load current settings
3. Make changes using the form controls
4. Click "Save Changes" to persist changes
5. Use "Reset" to revert to defaults

### Custom Hook Usage

```typescript
import { useSettings } from '@/hooks/useSettings';

function MyComponent() {
  const {
    settings,
    isLoading,
    error,
    saveStatus,
    updateSettings,
    saveAllSettings,
    resetSettings
  } = useSettings();

  // Use the hook methods and state
}
```

## Security

- All settings endpoints require admin authentication
- Input validation on both client and server
- Proper error handling and logging
- Settings are stored securely in MongoDB

## Future Enhancements

- Settings import/export functionality
- Settings history and audit trail
- Advanced validation rules
- Settings templates
- Bulk operations interface
- Real-time settings synchronization

## Dependencies

- Next.js 14
- React 18
- MongoDB with Mongoose
- Tailwind CSS
- Lucide React (icons)
- Custom UI components
