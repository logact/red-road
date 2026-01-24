"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { UserState } from "@/types/volition";

interface UserStateContextType {
  userState: UserState;
  setUserState: (state: UserState) => void;
}

const UserStateContext = createContext<UserStateContextType | undefined>(undefined);

const STORAGE_KEY = "volition_user_state";
const DEFAULT_STATE: UserState = "MED";

/**
 * Provider component for user energy state management.
 * Persists state to localStorage and provides it globally via React Context.
 */
export function UserStateProvider({ children }: { children: React.ReactNode }) {
  const [userState, setUserStateInternal] = useState<UserState>(DEFAULT_STATE);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && (stored === "HIGH" || stored === "MED" || stored === "LOW")) {
        setUserStateInternal(stored as UserState);
      }
    } catch (error) {
      console.error("Failed to load user state from localStorage:", error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    if (!isInitialized || typeof window === "undefined") return;

    try {
      localStorage.setItem(STORAGE_KEY, userState);
    } catch (error) {
      console.error("Failed to save user state to localStorage:", error);
    }
  }, [userState, isInitialized]);

  const setUserState = useCallback((state: UserState) => {
    setUserStateInternal(state);
  }, []);

  // Don't render children until state is initialized to avoid hydration mismatch
  if (!isInitialized) {
    return null;
  }

  return (
    <UserStateContext.Provider value={{ userState, setUserState }}>
      {children}
    </UserStateContext.Provider>
  );
}

/**
 * Hook to access user energy state.
 * Must be used within a UserStateProvider.
 * 
 * @returns Object with userState and setUserState function
 * @throws Error if used outside UserStateProvider
 */
export function useUserState() {
  const context = useContext(UserStateContext);
  if (context === undefined) {
    throw new Error("useUserState must be used within a UserStateProvider");
  }
  return context;
}
