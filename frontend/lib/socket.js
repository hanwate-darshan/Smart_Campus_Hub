import { io } from 'socket.io-client';
import useAuthStore from '@/store/auth.store';

let sockets = {};

/**
 * Get or initialize a socket connection for a specific namespace.
 * Defaults to the root namespace ("/") if none provided.
 */
export const getSocket = (namespace = "") => {
  const token = useAuthStore.getState().token;
  if (!token) return null;

  if (!sockets[namespace]) {
    sockets[namespace] = io(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${namespace}`, {
      auth: (cb) => cb({ token: localStorage.getItem("accessToken") }),
      transports: ["websocket"],
      reconnection: true
    });
  }
  
  return sockets[namespace];
};

/**
 * Disconnect a specific namespace socket
 */
export const disconnectSocket = (namespace = "") => {
  if (sockets[namespace]) {
    sockets[namespace].disconnect();
    delete sockets[namespace];
  }
};

/**
 * Disconnect all sockets (useful on logout)
 */
export const disconnectAllSockets = () => {
  Object.values(sockets).forEach(socket => socket.disconnect());
  sockets = {};
};
