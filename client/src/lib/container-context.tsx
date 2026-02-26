import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { Container } from "@shared/schema";

interface ContainerContextType {
  activeContainer: Container | null;
  setActiveContainer: (container: Container | null) => void;
  savedContainerId: string | null;
}

const ContainerContext = createContext<ContainerContextType>({
  activeContainer: null,
  setActiveContainer: () => {},
  savedContainerId: null,
});

export function ContainerProvider({ children }: { children: ReactNode }) {
  const [activeContainer, setActiveContainer] = useState<Container | null>(null);
  const [savedContainerId] = useState(() => localStorage.getItem("activeContainerId"));

  const handleSetActive = useCallback((container: Container | null) => {
    setActiveContainer(container);
    if (container) {
      localStorage.setItem("activeContainerId", container.id);
    } else {
      localStorage.removeItem("activeContainerId");
    }
  }, []);

  return (
    <ContainerContext.Provider value={{ activeContainer, setActiveContainer: handleSetActive, savedContainerId }}>
      {children}
    </ContainerContext.Provider>
  );
}

export function useContainer() {
  return useContext(ContainerContext);
}
