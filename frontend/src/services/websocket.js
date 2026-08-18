class TrafficWebSocketClient {
  constructor() {
    this.ws = null;
    this.url = 'ws://127.0.0.1:8000/ws/traffic';
    this.listeners = {};
    this.reconnectInterval = 3000;
    this.isConnecting = false;
    this.pingTimer = null;
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('[WEBSOCKET] Connected to real-time traffic telemetry stream.');
        this._startHeartbeat();
        this._emit('connect', { status: 'connected' });
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.event) {
            this._emit(msg.event, msg.data);
          }
        } catch (e) {
          // Ignore non-JSON frame
        }
      };

      this.ws.onclose = () => {
        console.warn('[WEBSOCKET] Telemetry connection closed. Scheduling auto-reconnect...');
        this._stopHeartbeat();
        this._emit('disconnect', { status: 'disconnected' });
        setTimeout(() => this.connect(), this.reconnectInterval);
      };

      this.ws.onerror = (error) => {
        console.error('[WEBSOCKET ERROR]', error);
        this._emit('error', error);
      };
    } catch (e) {
      console.error('[WEBSOCKET CONNECT ERROR]', e);
      setTimeout(() => this.connect(), this.reconnectInterval);
    }
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  onSignalStatus(callback) {
    this.on('signal_status', callback);
    return () => this.off('signal_status', callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  _emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('ping');
      }
    }, 15000);
  }

  _stopHeartbeat() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }
}

export const wsClient = new TrafficWebSocketClient();
