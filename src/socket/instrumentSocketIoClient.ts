import type { SocketLogDirection } from "../core/types";
import { socketConnectionStore } from "./socketConnectionStore";
import { createSocketLogEntryId, socketLogStore } from "./socketLogStore";

const SYSTEM_EVENTS = new Set([
  "connect",
  "disconnect",
  "connect_error",
  "reconnect",
  "reconnect_attempt",
  "reconnect_failed",
]);

const DEFAULT_MAX_PAYLOAD_CHARS = 4096;

export type InstrumentableSocket = {
  connected: boolean;
  id?: string;
  emit: (event: string, ...args: unknown[]) => unknown;
  on: (event: string, listener: (...args: unknown[]) => void) => unknown;
  off: (event: string, listener?: (...args: unknown[]) => void) => unknown;
  onAny?: (listener: (event: string, ...args: unknown[]) => void) => void;
  offAny?: (listener: (event: string, ...args: unknown[]) => void) => void;
  io?: {
    engine?: {
      transport?: { name?: string };
    };
  };
};

export type InstrumentSocketOptions = {
  enabled?: () => boolean;
  url?: string;
  sanitizePayload?: (event: string, payload: unknown) => unknown;
  maxPayloadChars?: number;
};

const serializePayload = (value: unknown): string => {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const truncatePayload = (
  value: unknown,
  maxChars: number,
): { payload: unknown; truncated: boolean } => {
  if (value === undefined) {
    return { payload: undefined, truncated: false };
  }
  const serialized = serializePayload(value);
  if (serialized.length <= maxChars) {
    return { payload: value, truncated: false };
  }
  return {
    payload: `${serialized.slice(0, maxChars)}…[truncated]`,
    truncated: true,
  };
};

const normalizeEmitPayload = (args: unknown[]): unknown => {
  if (args.length === 0) return undefined;
  if (args.length === 1) return args[0];
  return args;
};

const extractRoomId = (payload: unknown): string | undefined => {
  if (typeof payload === "string" || typeof payload === "number") {
    return String(payload);
  }
  return undefined;
};

const extractBusinessId = (payload: unknown): string | undefined => {
  if (typeof payload === "string" || typeof payload === "number") {
    return String(payload);
  }
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (record.businessId != null) return String(record.businessId);
    if (record.business_id != null) return String(record.business_id);
  }
  return undefined;
};

const getTransportName = (socket: InstrumentableSocket): string | undefined =>
  socket.io?.engine?.transport?.name;

const updateJoinedRooms = (
  event: string,
  payload: unknown,
  currentRooms: string[],
): string[] => {
  if (event === "join_conversation_room") {
    const roomId = extractRoomId(payload);
    if (!roomId) return currentRooms;
    if (currentRooms.includes(roomId)) return currentRooms;
    return [...currentRooms, roomId];
  }
  if (event === "leave_conversation_room") {
    const roomId = extractRoomId(payload);
    if (!roomId) return currentRooms;
    return currentRooms.filter((room) => room !== roomId);
  }
  return currentRooms;
};

export const instrumentSocketIoClient = (
  socket: InstrumentableSocket,
  options: InstrumentSocketOptions = {},
): (() => void) => {
  const isEnabled = options.enabled ?? (() => true);
  const maxPayloadChars = options.maxPayloadChars ?? DEFAULT_MAX_PAYLOAD_CHARS;

  const pushLog = (
    direction: SocketLogDirection,
    event: string,
    rawPayload?: unknown,
  ) => {
    if (!isEnabled()) return;

    const sanitized = options.sanitizePayload
      ? options.sanitizePayload(event, rawPayload)
      : rawPayload;
    const { payload, truncated } = truncatePayload(sanitized, maxPayloadChars);

    socketLogStore.push({
      id: createSocketLogEntryId(),
      timestamp: Date.now(),
      direction,
      event,
      payload,
      redacted: truncated,
    });
  };

  const patchConnection = (patch: Parameters<typeof socketConnectionStore.setSnapshot>[0]) => {
    if (!isEnabled()) return;
    socketConnectionStore.setSnapshot(patch);
  };

  if (options.url) {
    patchConnection({ url: options.url });
  }

  const handleConnect = () => {
    patchConnection({
      state: "connected",
      socketId: socket.id,
      transport: getTransportName(socket),
      reconnectAttempt: undefined,
    });
    pushLog("system", "connect", { socketId: socket.id });
  };

  const handleDisconnect = (reason?: unknown) => {
    patchConnection({
      state: "disconnected",
      socketId: undefined,
      transport: undefined,
    });
    pushLog("system", "disconnect", reason);
  };

  const handleConnectError = (error?: unknown) => {
    patchConnection({ state: "disconnected" });
    pushLog("system", "connect_error", error);
  };

  const handleReconnectAttempt = (attempt?: unknown) => {
    patchConnection({
      state: "reconnecting",
      reconnectAttempt:
        typeof attempt === "number" ? attempt : Number(attempt) || undefined,
    });
    pushLog("system", "reconnect_attempt", attempt);
  };

  const handleReconnect = (attempt?: unknown) => {
    patchConnection({
      state: "connected",
      socketId: socket.id,
      transport: getTransportName(socket),
      reconnectAttempt: undefined,
    });
    pushLog("system", "reconnect", attempt);
  };

  const handleReconnectFailed = () => {
    patchConnection({ state: "disconnected" });
    pushLog("system", "reconnect_failed");
  };

  const handleAnyInbound = (event: string, ...args: unknown[]) => {
    if (SYSTEM_EVENTS.has(event)) return;
    pushLog("in", event, normalizeEmitPayload(args));
  };

  const originalEmit = socket.emit.bind(socket);
  socket.emit = (event: string, ...args: unknown[]) => {
    if (isEnabled()) {
      const payload = normalizeEmitPayload(args);
      pushLog("out", event, payload);

      const snapshot = socketConnectionStore.getSnapshot();
      let joinedRooms = updateJoinedRooms(event, payload, snapshot.joinedRooms);
      let businessId = snapshot.businessId;

      if (event === "join_business") {
        businessId = extractBusinessId(payload) ?? businessId;
      } else if (event === "leave_business") {
        businessId = undefined;
      }

      patchConnection({ joinedRooms, businessId });
    }

    return originalEmit(event, ...args);
  };

  socket.on("connect", handleConnect);
  socket.on("disconnect", handleDisconnect);
  socket.on("connect_error", handleConnectError);
  socket.on("reconnect_attempt", handleReconnectAttempt);
  socket.on("reconnect", handleReconnect);
  socket.on("reconnect_failed", handleReconnectFailed);

  if (socket.onAny) {
    socket.onAny(handleAnyInbound);
  }

  if (socket.connected) {
    handleConnect();
  } else {
    patchConnection({ state: "connecting" });
  }

  return () => {
    socket.emit = originalEmit;
    socket.off("connect", handleConnect);
    socket.off("disconnect", handleDisconnect);
    socket.off("connect_error", handleConnectError);
    socket.off("reconnect_attempt", handleReconnectAttempt);
    socket.off("reconnect", handleReconnect);
    socket.off("reconnect_failed", handleReconnectFailed);
    if (socket.offAny) {
      socket.offAny(handleAnyInbound);
    }
  };
};
