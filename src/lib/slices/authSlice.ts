import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { signIn, signOut, getSession } from 'next-auth/react';

export interface User {
  id: string;
  email: string;
  phone?: string;
  name: string;
  role: 'admin' | 'instructor' | 'student';
  image?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials: { phone: string; password: string }, { rejectWithValue }) => {
    try {
      console.log('Attempting login with phone:', credentials.phone);
      
      const result = await signIn('credentials', {
        phone: credentials.phone,
        password: credentials.password,
        redirect: false,
      });

      console.log('SignIn result:', result);

      if (result?.error) {
        console.log('SignIn error:', result.error);
        return rejectWithValue(result.error);
      }

      const session = await getSession();
      console.log('Session after login:', session);
      if (session?.user) {
        return {
          ...session.user,
          role: session.user.role as 'admin' | 'instructor' | 'student'
        };
      }
      return null;
    } catch (error) {
      console.error('Login error:', error);
      return rejectWithValue('Login failed');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      await signOut({ redirect: false });
      return null;
    } catch (error) {
      return rejectWithValue('Logout failed');
    }
  }
);

export const checkAuthStatus = createAsyncThunk(
  'auth/checkAuthStatus',
  async (_, { rejectWithValue }) => {
    try {
      const session = await getSession();
      if (session?.user) {
        return {
          ...session.user,
          role: session.user.role as 'admin' | 'instructor' | 'student'
        };
      }
      return null;
    } catch (error) {
      return rejectWithValue('Failed to check auth status');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (userData: {
    firstName: string;
    lastName: string;
    phone: string;
    password: string;
    avatar?: string;
    role?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...userData,
          role: userData.role || 'student',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.error || 'Registration failed');
      }

      // Auto sign in after successful registration
      const result = await signIn('credentials', {
        phone: userData.phone,
        password: userData.password,
        redirect: false,
      });

      if (result?.error) {
        return rejectWithValue('Registration successful but auto-login failed');
      }

      const session = await getSession();
      if (session?.user) {
        return {
          ...session.user,
          role: session.user.role as 'admin' | 'instructor' | 'student'
        };
      }
      return null;
    } catch (error) {
      return rejectWithValue('Registration failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = !!action.payload;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = action.payload as string;
      })
      // Logout
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Check auth status
      .addCase(checkAuthStatus.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = !!action.payload;
        state.error = null;
      })
      .addCase(checkAuthStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = action.payload as string;
      })
      // Register
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = !!action.payload;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setUser } = authSlice.actions;
export default authSlice.reducer;
