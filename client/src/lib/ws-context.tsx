import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";

interface WSContextType {
  lastMessage: any;
  isConnected: boolean;
}

const WSContext = createContext<WSContextType>({ lastMessage: null, isConnected: false });

export function WSProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(() => {
    if (!user) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        setIsConnected(true);
        reconnectAttempts.current = 0;
        socket.send(JSON.stringify({ type: 'auth', userId: user.id }));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage({ ...data, _ts: Date.now() });
        } catch {}
      };

      socket.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        reconnectAttempts.current++;
        reconnectTimer.current = setTimeout(connect, delay);
      };

      socket.onerror = () => {
        socket.close();
      };

      wsRef.current = socket;
    } catch {}
  }, [user]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return <WSContext.Provider value={{ lastMessage, isConnected }}>{children}</WSContext.Provider>;
}

export function useWS() {
  return useContext(WSContext);
}
