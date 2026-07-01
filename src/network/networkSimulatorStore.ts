import type {
  NetworkForcedError,
  NetworkSimulatorState,
  NetworkThrottleProfile,
} from "../core/types";

type Listener = () => void;

type SimulatedFailure = {
  ok: false;
  status: number;
  error: string;
  simulated: true;
};

const PROFILE_DELAY_MS: Record<NetworkThrottleProfile, number> = {
  none: 0,
  fast3g: 350,
  slow3g: 1200,
  offline: 0,
};

const listeners = new Set<Listener>();

let state: NetworkSimulatorState = {
  enabled: false,
  throttleProfile: "none",
  delayMs: 0,
};

const notify = () => {
  listeners.forEach((listener) => listener());
};

const resolveDelayMs = () =>
  PROFILE_DELAY_MS[state.throttleProfile] + Math.max(0, state.delayMs);

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export const networkSimulatorStore = {
  getState: (): NetworkSimulatorState => state,

  setState: (patch: Partial<NetworkSimulatorState>) => {
    state = { ...state, ...patch };
    notify();
  },

  setForcedError: (forcedError?: NetworkForcedError) => {
    state = { ...state, forcedError };
    notify();
  },

  reset: () => {
    state = {
      enabled: false,
      throttleProfile: "none",
      delayMs: 0,
      forcedError: undefined,
    };
    notify();
  },

  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export const configureNetworkSimulator = (
  initialState?: Partial<NetworkSimulatorState>,
) => {
  if (!initialState) return;
  state = { ...state, ...initialState };
};

export const maybeSimulateNetworkFailure = async (): Promise<SimulatedFailure | null> => {
  if (!state.enabled) return null;

  const delayMs = resolveDelayMs();
  if (delayMs > 0) {
    await sleep(delayMs);
  }

  if (state.throttleProfile === "offline") {
    return {
      ok: false,
      status: 0,
      error: "Simulated offline mode",
      simulated: true,
    };
  }

  if (state.forcedError) {
    return {
      ok: false,
      status: state.forcedError.status,
      error:
        state.forcedError.message ??
        `Simulated HTTP ${state.forcedError.status} error`,
      simulated: true,
    };
  }

  return null;
};

