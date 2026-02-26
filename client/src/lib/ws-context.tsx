import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";

interface WSContextType {
  lastMessage: any;
  isConnected: boolean;
}

const WSContext = createContext<WSContextType>({ lastMessage: null, isConnected: false });

export function WSProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user) return;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setIsConnected(true);
      socket.send(JSON.stringify({ type: 'auth', userId: user.id }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
      } catch {}
    };

    socket.onclose = () => setIsConnected(false);
    wsRef.current = socket;

    return () => { socket.close(); };
  }, [user]);

  return <WSContext.Provider value={{ lastMessage, isConnected }}>{children}</WSContext.Provider>;
}

export function useWS() {
  return useContext(WSContext);
}
