import { createContext, useContext, useState, useCallback } from "react";

const STORAGE_KEY = "admin_view_as_user";

interface ViewModeContextType {
  viewAsUser: boolean;
  toggleViewMode: () => void;
  exitUserView: () => void;
}

const ViewModeContext = createContext<ViewModeContextType>({
  viewAsUser: false,
  toggleViewMode: () => {},
  exitUserView: () => {},
});

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
  const [viewAsUser, setViewAsUser] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "true",
  );

  const toggleViewMode = useCallback(() => {
    setViewAsUser((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const exitUserView = useCallback(() => {
    setViewAsUser(false);
    localStorage.setItem(STORAGE_KEY, "false");
  }, []);

  return (
    <ViewModeContext.Provider value={{ viewAsUser, toggleViewMode, exitUserView }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  return useContext(ViewModeContext);
}
