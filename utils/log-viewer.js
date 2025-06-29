const fs = require('fs');
const path = require('path');
const { logBasePath } = require('../config/logger');

class LogViewer {
  constructor() {
    this.authLogPath = path.join(logBasePath, 'auth.log');
    this.authErrorLogPath = path.join(logBasePath, 'auth-errors.log');
  }

  // Read and parse log file
  readLogFile(filePath, lines = 50) {
    try {
      if (!fs.existsSync(filePath)) {
        return { error: `Log file not found: ${filePath}` };
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const logLines = content.trim().split('\n').filter(line => line.trim());
      
      // Return last N lines
      return {
        success: true,
        totalLines: logLines.length,
        lines: logLines.slice(-lines),
        filePath
      };
    } catch (error) {
      return { error: `Error reading log file: ${error.message}` };
    }
  }

  // Get recent authentication events
  getRecentAuthEvents(lines = 50) {
    return this.readLogFile(this.authLogPath, lines);
  }

  // Get recent authentication errors
  getRecentAuthErrors(lines = 50) {
    return this.readLogFile(this.authErrorLogPath, lines);
  }

  // Parse log line to extract structured data
  parseLogLine(line) {
    try {
      // Extract timestamp and message
      const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \[(\w+)\]: (.+)$/);
      if (!timestampMatch) {
        return { raw: line };
      }

      const [, timestamp, level, message] = timestampMatch;
      
      // Try to parse JSON data if present
      let data = {};
      try {
        const jsonMatch = message.match(/\{.*\}$/);
        if (jsonMatch) {
          data = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        // JSON parsing failed, keep raw message
      }

      return {
        timestamp,
        level,
        message: message.replace(/\{.*\}$/, '').trim(),
        data,
        raw: line
      };
    } catch (error) {
      return { raw: line, parseError: error.message };
    }
  }

  // Get authentication statistics
  getAuthStats() {
    try {
      const authLogs = this.readLogFile(this.authLogPath, 1000);
      const errorLogs = this.readLogFile(this.authErrorLogPath, 1000);

      if (authLogs.error || errorLogs.error) {
        return { error: 'Could not read log files' };
      }

      const stats = {
        totalAuthEvents: authLogs.totalLines,
        totalErrors: errorLogs.totalLines,
        recentEvents: [],
        recentErrors: [],
        oauthStats: {
          google: { initiations: 0, successes: 0, errors: 0 },
          microsoft: { initiations: 0, successes: 0, errors: 0 },
          apple: { initiations: 0, successes: 0, errors: 0 }
        },
        userStats: {
          logins: 0,
          logouts: 0,
          failedAttempts: 0
        }
      };

      // Parse recent events
      authLogs.lines.slice(-20).forEach(line => {
        const parsed = this.parseLogLine(line);
        if (parsed.message) {
          stats.recentEvents.push(parsed);
          
          // Count OAuth events
          if (parsed.message.includes('OAUTH_FLOW: GOOGLE')) {
            if (parsed.message.includes('INITIATE')) stats.oauthStats.google.initiations++;
            if (parsed.message.includes('CALLBACK_SUCCESS')) stats.oauthStats.google.successes++;
          } else if (parsed.message.includes('OAUTH_FLOW: MICROSOFT')) {
            if (parsed.message.includes('INITIATE')) stats.oauthStats.microsoft.initiations++;
            if (parsed.message.includes('CALLBACK_SUCCESS')) stats.oauthStats.microsoft.successes++;
          } else if (parsed.message.includes('OAUTH_FLOW: APPLE')) {
            if (parsed.message.includes('INITIATE')) stats.oauthStats.apple.initiations++;
            if (parsed.message.includes('CALLBACK_SUCCESS')) stats.oauthStats.apple.successes++;
          }

          // Count user events
          if (parsed.message.includes('LOGOUT_SUCCESS')) stats.userStats.logouts++;
          if (parsed.message.includes('CALLBACK_SUCCESS')) stats.userStats.logins++;
        }
      });

      // Parse recent errors
      errorLogs.lines.slice(-10).forEach(line => {
        const parsed = this.parseLogLine(line);
        if (parsed.message) {
          stats.recentErrors.push(parsed);
          
          // Count OAuth errors
          if (parsed.message.includes('OAUTH_ERROR: GOOGLE')) {
            stats.oauthStats.google.errors++;
          } else if (parsed.message.includes('OAUTH_ERROR: MICROSOFT')) {
            stats.oauthStats.microsoft.errors++;
          } else if (parsed.message.includes('OAUTH_ERROR: APPLE')) {
            stats.oauthStats.apple.errors++;
          }
        }
      });

      return stats;
    } catch (error) {
      return { error: `Error generating stats: ${error.message}` };
    }
  }

  // Clear log files
  clearLogs() {
    try {
      if (fs.existsSync(this.authLogPath)) {
        fs.writeFileSync(this.authLogPath, '');
      }
      if (fs.existsSync(this.authErrorLogPath)) {
        fs.writeFileSync(this.authErrorLogPath, '');
      }
      return { success: true, message: 'Log files cleared successfully' };
    } catch (error) {
      return { error: `Error clearing logs: ${error.message}` };
    }
  }

  // Get log file info
  getLogInfo() {
    const info = {
      logBasePath,
      authLogPath: this.authLogPath,
      authErrorLogPath: this.authErrorLogPath,
      authLogExists: fs.existsSync(this.authLogPath),
      authErrorLogExists: fs.existsSync(this.authErrorLogPath)
    };

    if (info.authLogExists) {
      const stats = fs.statSync(this.authLogPath);
      info.authLogSize = stats.size;
      info.authLogModified = stats.mtime;
    }

    if (info.authErrorLogExists) {
      const stats = fs.statSync(this.authErrorLogPath);
      info.authErrorLogSize = stats.size;
      info.authErrorLogModified = stats.mtime;
    }

    return info;
  }
}

module.exports = LogViewer; 