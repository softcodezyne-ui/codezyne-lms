# Redux Toolkit State Management Implementation

This document outlines the Redux Toolkit implementation for the EduHub LMS application, providing centralized state management for authentication, user management, and UI state.

## 🏗️ Architecture Overview

The Redux implementation follows Redux Toolkit best practices with:
- **Slices**: Modular state management with reducers and actions
- **Async Thunks**: Side effects and API calls
- **Typed Hooks**: Type-safe selectors and dispatch
- **Middleware**: Built-in Redux DevTools and serializable checks

## 📁 File Structure

```
src/
├── lib/
│   ├── store.ts                 # Redux store configuration
│   ├── hooks.ts                 # Typed Redux hooks
│   └── slices/
│       ├── authSlice.ts         # Authentication state
│       ├── userSlice.ts         # User management state
│       └── uiSlice.ts           # UI state management
├── components/
│   ├── Providers.tsx            # Redux + NextAuth providers
│   └── NotificationToast.tsx    # Global notification system
```

## 🔧 Store Configuration

### Main Store (`src/lib/store.ts`)
```typescript
export const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});
```

## 📊 State Slices

### 1. Authentication Slice (`authSlice.ts`)

**State Structure:**
```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
```

**Key Actions:**
- `loginUser` - Async thunk for user login
- `logoutUser` - Async thunk for user logout
- `registerUser` - Async thunk for user registration
- `checkAuthStatus` - Async thunk to verify current session
- `clearError` - Clear authentication errors
- `setUser` - Manually set user data

**Usage Example:**
```typescript
const dispatch = useAppDispatch();
const { user, isAuthenticated, isLoading, error } = useAppSelector((state) => state.auth);

// Login user
dispatch(loginUser({ email, password }));

// Check auth status
dispatch(checkAuthStatus());
```

### 2. User Management Slice (`userSlice.ts`)

**State Structure:**
```typescript
interface UserState {
  users: User[];
  currentUser: User | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    search: string;
    role: string;
  };
}
```

**Key Actions:**
- `fetchUsers` - Get paginated user list with filters
- `fetchUserById` - Get single user by ID
- `createUser` - Create new user
- `updateUser` - Update existing user
- `deleteUser` - Delete user
- `setFilters` - Update search and role filters
- `setPagination` - Update pagination state

**Usage Example:**
```typescript
const { users, isLoading, pagination, filters } = useAppSelector((state) => state.user);

// Fetch users with filters
dispatch(fetchUsers({
  page: 1,
  limit: 10,
  search: 'john',
  role: 'student'
}));

// Update user role
dispatch(updateUser({ userId, userData: { role: 'admin' } }));
```

### 3. UI Slice (`uiSlice.ts`)

**State Structure:**
```typescript
interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  notifications: Notification[];
  modals: {
    createUser: boolean;
    editUser: boolean;
    deleteUser: boolean;
  };
  loading: {
    global: boolean;
    auth: boolean;
    users: boolean;
  };
}
```

**Key Actions:**
- `toggleSidebar` - Toggle sidebar visibility
- `setTheme` - Change application theme
- `addNotification` - Show notification toast
- `removeNotification` - Hide notification
- `setModalOpen` - Control modal visibility
- `setLoading` - Set loading states

**Usage Example:**
```typescript
const { sidebarOpen, notifications } = useAppSelector((state) => state.ui);

// Toggle sidebar
dispatch(toggleSidebar());

// Show success notification
dispatch(addNotification({
  type: 'success',
  title: 'Success',
  message: 'User created successfully',
  duration: 5000
}));
```

## 🎣 Typed Hooks

### Custom Hooks (`src/lib/hooks.ts`)
```typescript
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

**Benefits:**
- Type-safe dispatch and selectors
- IntelliSense support
- Compile-time error checking

## 🔄 Async Thunks

### Authentication Thunks
```typescript
// Login with credentials
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    // Implementation handles NextAuth signIn and session management
  }
);

// Register new user
export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (userData: RegisterData, { rejectWithValue }) => {
    // Implementation handles API call and auto-login
  }
);
```

### User Management Thunks
```typescript
// Fetch users with pagination and filters
export const fetchUsers = createAsyncThunk(
  'user/fetchUsers',
  async (params: FetchUsersParams, { rejectWithValue }) => {
    // Implementation handles API call with query parameters
  }
);

// Update user data
export const updateUser = createAsyncThunk(
  'user/updateUser',
  async ({ userId, userData }: UpdateUserParams, { rejectWithValue }) => {
    // Implementation handles API call and optimistic updates
  }
);
```

## 🔔 Notification System

### Global Notification Toast
The `NotificationToast` component automatically displays notifications from the Redux store:

```typescript
// Add notification
dispatch(addNotification({
  type: 'success',
  title: 'Success',
  message: 'Operation completed successfully',
  duration: 5000
}));

// Remove notification
dispatch(removeNotification(notificationId));
```

**Features:**
- Auto-dismiss after duration
- Manual dismiss with close button
- Different types: success, error, warning, info
- Stacked notifications
- Smooth animations

## 🎯 Component Integration

### Updated Components

1. **Authentication Pages**
   - `src/app/auth/signin/page.tsx` - Uses Redux for login state
   - `src/app/auth/signup/page.tsx` - Uses Redux for registration state

2. **Admin Pages**
   - `src/app/admin/users/page.tsx` - Uses Redux for user management

3. **Main App**
   - `src/app/page.tsx` - Uses Redux for authentication status
   - `src/app/layout.tsx` - Includes notification system

### Provider Setup
```typescript
// src/components/Providers.tsx
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <SessionProvider>
        {children}
      </SessionProvider>
    </Provider>
  );
}
```

## 🚀 Benefits of Redux Implementation

### 1. **Centralized State Management**
- Single source of truth for application state
- Predictable state updates
- Easy debugging with Redux DevTools

### 2. **Type Safety**
- Full TypeScript support
- Compile-time error checking
- IntelliSense for actions and state

### 3. **Performance Optimization**
- Selective re-renders with useSelector
- Memoized selectors
- Optimistic updates for better UX

### 4. **Developer Experience**
- Redux DevTools integration
- Time-travel debugging
- Action logging and state inspection

### 5. **Scalability**
- Modular slice architecture
- Easy to add new features
- Consistent patterns across components

## 🔧 Usage Patterns

### 1. **Component State Management**
```typescript
function MyComponent() {
  const dispatch = useAppDispatch();
  const { data, isLoading, error } = useAppSelector((state) => state.mySlice);

  const handleAction = () => {
    dispatch(myAsyncThunk(params));
  };

  return (
    // Component JSX
  );
}
```

### 2. **Error Handling**
```typescript
// In async thunk
.catch((error) => {
  return rejectWithValue(error.message);
});

// In component
if (error) {
  dispatch(addNotification({
    type: 'error',
    title: 'Error',
    message: error
  }));
}
```

### 3. **Loading States**
```typescript
const { isLoading } = useAppSelector((state) => state.mySlice);

if (isLoading) {
  return <LoadingSpinner />;
}
```

## 🎨 Best Practices

1. **Use Typed Hooks**: Always use `useAppDispatch` and `useAppSelector`
2. **Async Thunks**: Use for API calls and side effects
3. **Error Handling**: Implement proper error handling in thunks
4. **Optimistic Updates**: Update UI immediately, rollback on error
5. **Selective Subscriptions**: Only subscribe to needed state slices
6. **Action Naming**: Use descriptive action names
7. **State Normalization**: Keep state flat and normalized

## 🔮 Future Enhancements

- **Redux Persist**: Persist state to localStorage
- **RTK Query**: Replace manual API calls with RTK Query
- **Middleware**: Add custom middleware for logging or analytics
- **State Normalization**: Implement normalized state for complex data
- **Caching**: Add intelligent caching strategies
- **Offline Support**: Implement offline-first patterns

This Redux implementation provides a solid foundation for scalable state management in the EduHub LMS application!
