import WebSocket from 'ws';

// TikFinity Desktop streams TikTok events from a local WebSocket.
// No EulerStream API key or TikTok request signing is used.
export class TikFinitySource {
  constructor({
    url = 'ws://127.0.0.1:21213/',
    reconnectMs = 4000,
    onStatus = () => {},
    onEvent = () => {},
  } = {}) {
    this.url = url;
    this.reconnectMs = reconnectMs;
    this.onStatus = onStatus;
    this.onEvent = onEvent;
    this.active = false;
    this.socket = null;
    this.retryTimer = null;
    this.state = 'idle';
  }

  emitStatus(state, message) {
    this.state = state;
    this.onStatus(state, message);
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.connectSocket();
  }

  connectSocket() {
    if (!this.active) return;
    this.emitStatus('connecting', 'Connecting to TikFinity Desktop at 127.0.0.1:21213...');
    let socket;
    try {
      socket = new WebSocket(this.url, { handshakeTimeout: 5000 });
    } catch {
      this.scheduleRetry();
      return;
    }
    this.socket = socket;

    socket.on('open', () => {
      if (!this.active || this.socket !== socket) return;
      this.emitStatus('connected', 'Connected to TikFinity Desktop. Connect TikFinity to your TikTok LIVE to receive gifts and chat.');
    });
    socket.on('message', payload => {
      if (!this.active || this.socket !== socket) return;
      try {
        const packet = JSON.parse(String(payload));
        if ((packet?.event === 'gift' || packet?.event === 'chat') && packet.data && typeof packet.data === 'object') {
          this.onEvent(packet.event, packet.data);
        }
      } catch (error) {
        // Ignore invalid or unrelated packets; keep listening.
        console.warn('Ignored malformed TikFinity message:', error?.message);
      }
    });
    socket.on('error', error => {
      if (!this.active || this.socket !== socket) return;
      // The close handler schedules the retry.
      console.warn('TikFinity connection issue:', error?.message);
    });
    socket.on('close', () => {
      if (!this.active || this.socket !== socket) return;
      this.socket = null;
      this.scheduleRetry();
    });
  }

  scheduleRetry() {
    if (!this.active || this.retryTimer) return;
    this.emitStatus('waiting', 'Waiting for TikFinity Desktop. Open it and connect your LIVE; retrying automatically.');
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.connectSocket();
    }, this.reconnectMs);
  }

  stop() {
    this.active = false;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    const socket = this.socket;
    this.socket = null;
    if (socket) {
      try { socket.terminate(); } catch { /* Socket already closed */ }
    }
    this.emitStatus('idle', 'Disconnected from TikFinity. Test mode remains available.');
  }
}
