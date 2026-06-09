/**
 * Logger module for tracing state transitions, user interactions, and system errors.
 */

export const LogLevels = {
  DEBUG: { name: 'DEBUG', color: '#6c757d', icon: '🔍' },
  INFO: { name: 'INFO', color: '#0dcaf0', icon: 'ℹ️' },
  SUCCESS: { name: 'SUCCESS', color: '#198754', icon: '✅' },
  WARNING: { name: 'WARNING', color: '#ffc107', icon: '⚠️' },
  ERROR: { name: 'ERROR', color: '#dc3545', icon: '❌' }
};

class Logger {
  constructor() {
    this.logs = [];
    this.listeners = new Set();
    this.maxLogs = 200;
  }

  /**
   * Subscribe to log events (for real-time console rendering)
   * @param {Function} callback 
   */
  subscribe(callback) {
    this.listeners.add(callback);
    // Emit existing logs to the new subscriber
    this.logs.forEach(log => callback(log));
    return () => this.listeners.delete(callback);
  }

  /**
   * Log a message
   * @param {Object} level LogLevels value
   * @param {string} module Module name (e.g. 'Board', 'Audio')
   * @param {string} message Log message
   * @param {any} [details] Optional structured debugging details
   */
  log(level, module, message, details = null) {
    const timestamp = new Date();
    const logEntry = {
      timestamp,
      level,
      module,
      message,
      details
    };

    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Format for developer console
    const consoleMsg = `[${timestamp.toLocaleTimeString()}] ${level.icon} [${module}] ${message}`;
    if (level.name === 'ERROR') {
      console.error(consoleMsg, details || '');
    } else if (level.name === 'WARNING') {
      console.warn(consoleMsg, details || '');
    } else {
      console.log(consoleMsg, details || '');
    }

    // Notify UI listeners
    this.listeners.forEach(listener => {
      try {
        listener(logEntry);
      } catch (e) {
        console.error('Failed to notify log listener', e);
      }
    });
  }

  debug(module, message, details = null) {
    this.log(LogLevels.DEBUG, module, message, details);
  }

  info(module, message, details = null) {
    this.log(LogLevels.INFO, module, message, details);
  }

  success(module, message, details = null) {
    this.log(LogLevels.SUCCESS, module, message, details);
  }

  warn(module, message, details = null) {
    this.log(LogLevels.WARNING, module, message, details);
  }

  error(module, message, errorObj) {
    const messageStr = errorObj instanceof Error ? errorObj.message : String(errorObj);
    const details = errorObj instanceof Error ? { stack: errorObj.stack } : errorObj;
    this.log(LogLevels.ERROR, module, messageStr, details);
  }

  getLogs() {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
    this.listeners.forEach(listener => listener({ type: 'clear' }));
  }
}

export const logger = new Logger();
