#!/usr/bin/env node

/**
 * Audit Log Archival Script for DaySave
 * 
 * PURPOSE:
 * Archives old audit log entries to maintain database performance
 * while preserving audit trails for compliance requirements.
 * 
 * FEATURES:
 * - Archives audit logs older than specified retention period
 * - Exports archived data to JSON files for long-term storage
 * - Maintains referential integrity during archival
 * - Supports dry-run mode for testing
 * - Configurable retention periods by event type
 * 
 * USAGE:
 * node scripts/audit-log-archival.js [--dry-run] [--retention-days=90]
 * 
 * AUTHOR: DaySave Development Team
 * CREATED: 2025-01-30 (Audit Log Management)
 */

const { AuditLog, ApiKeyAuditLog } = require('../models');
const fs = require('fs').promises;
const path = require('path');
const { logAuthEvent, logAuthError } = require('../config/logger');

// Default configuration
const DEFAULT_RETENTION_DAYS = 365; // Keep audit logs for 1 year
const CRITICAL_EVENT_RETENTION_DAYS = 2555; // Keep critical events for 7 years (compliance)
const ARCHIVE_BATCH_SIZE = 1000;

// Critical events that require longer retention
const CRITICAL_EVENTS = [
  'MFA_ENABLED_SUCCESS',
  'MFA_DISABLED_SUCCESS',
  'ADMIN_MFA_REQUIRED_ENFORCED',
  'PASSWORD_CHANGE_SUCCESS',
  'USER_LOGIN_SUCCESS',
  'USER_LOGIN_FAILED',
  'ADMIN_USER_CREATE',
  'ADMIN_USER_DELETE',
  'API_KEY_CREATE',
  'API_KEY_DELETE'
];

class AuditLogArchival {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.retentionDays = options.retentionDays || DEFAULT_RETENTION_DAYS;
    this.criticalRetentionDays = options.criticalRetentionDays || CRITICAL_EVENT_RETENTION_DAYS;
    this.archiveDir = path.join(__dirname, '..', 'db_backup', 'audit_archives');
    this.batchSize = options.batchSize || ARCHIVE_BATCH_SIZE;
  }

  async ensureArchiveDirectory() {
    try {
      await fs.mkdir(this.archiveDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create archive directory: ${error.message}`);
    }
  }

  async findLogsToArchive() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
    
    const criticalCutoffDate = new Date();
    criticalCutoffDate.setDate(criticalCutoffDate.getDate() - this.criticalRetentionDays);

    console.log(`📊 Finding audit logs to archive...`);
    console.log(`   Standard retention: ${this.retentionDays} days (before ${cutoffDate.toISOString()})`);
    console.log(`   Critical retention: ${this.criticalRetentionDays} days (before ${criticalCutoffDate.toISOString()})`);

    // Find standard logs to archive
    const standardLogs = await AuditLog.findAll({
      where: {
        createdAt: {
          [require('sequelize').Op.lt]: cutoffDate
        },
        action: {
          [require('sequelize').Op.notIn]: CRITICAL_EVENTS
        }
      },
      order: [['createdAt', 'ASC']],
      raw: true
    });

    // Find critical logs to archive (older than critical retention period)
    const criticalLogs = await AuditLog.findAll({
      where: {
        createdAt: {
          [require('sequelize').Op.lt]: criticalCutoffDate
        },
        action: {
          [require('sequelize').Op.in]: CRITICAL_EVENTS
        }
      },
      order: [['createdAt', 'ASC']],
      raw: true
    });

    return { standardLogs, criticalLogs };
  }

  async findApiKeyLogsToArchive() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

    const apiKeyLogs = await ApiKeyAuditLog.findAll({
      where: {
        createdAt: {
          [require('sequelize').Op.lt]: cutoffDate
        }
      },
      order: [['createdAt', 'ASC']],
      raw: true
    });

    return apiKeyLogs;
  }

  async exportToArchive(logs, type) {
    if (logs.length === 0) {
      console.log(`   No ${type} logs to archive`);
      return null;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${type}_audit_logs_${timestamp}.json`;
    const filepath = path.join(this.archiveDir, filename);

    const archiveData = {
      exported_at: new Date().toISOString(),
      record_count: logs.length,
      retention_policy: type === 'critical' ? this.criticalRetentionDays : this.retentionDays,
      logs: logs
    };

    if (!this.dryRun) {
      await fs.writeFile(filepath, JSON.stringify(archiveData, null, 2));
    }

    console.log(`   📦 ${this.dryRun ? '[DRY RUN] ' : ''}Exported ${logs.length} ${type} logs to ${filename}`);
    return { filepath, count: logs.length };
  }

  async deleteArchivedLogs(logIds, tableName) {
    if (logIds.length === 0) return 0;

    if (this.dryRun) {
      console.log(`   🗑️  [DRY RUN] Would delete ${logIds.length} logs from ${tableName}`);
      return logIds.length;
    }

    const Model = tableName === 'audit_logs' ? AuditLog : ApiKeyAuditLog;
    
    let deletedCount = 0;
    for (let i = 0; i < logIds.length; i += this.batchSize) {
      const batch = logIds.slice(i, i + this.batchSize);
      const result = await Model.destroy({
        where: {
          id: {
            [require('sequelize').Op.in]: batch
          }
        }
      });
      deletedCount += result;
    }

    console.log(`   🗑️  Deleted ${deletedCount} logs from ${tableName}`);
    return deletedCount;
  }

  async generateReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      dry_run: this.dryRun,
      retention_policy: {
        standard_days: this.retentionDays,
        critical_days: this.criticalRetentionDays
      },
      results: results,
      total_archived: results.reduce((sum, r) => sum + (r.archived_count || 0), 0),
      total_deleted: results.reduce((sum, r) => sum + (r.deleted_count || 0), 0)
    };

    const reportPath = path.join(this.archiveDir, `archival_report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    
    if (!this.dryRun) {
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    }

    return report;
  }

  async run() {
    try {
      console.log('🗂️  Starting audit log archival process...');
      console.log(`   Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE'}`);
      
      await this.ensureArchiveDirectory();
      
      const results = [];

      // Process standard audit logs
      const { standardLogs, criticalLogs } = await this.findLogsToArchive();
      
      if (standardLogs.length > 0) {
        const export1 = await this.exportToArchive(standardLogs, 'standard');
        const deleted1 = await this.deleteArchivedLogs(standardLogs.map(l => l.id), 'audit_logs');
        results.push({
          type: 'standard_audit_logs',
          archived_count: standardLogs.length,
          deleted_count: deleted1,
          archive_file: export1?.filepath
        });
      }

      // Process critical audit logs
      if (criticalLogs.length > 0) {
        const export2 = await this.exportToArchive(criticalLogs, 'critical');
        const deleted2 = await this.deleteArchivedLogs(criticalLogs.map(l => l.id), 'audit_logs');
        results.push({
          type: 'critical_audit_logs',
          archived_count: criticalLogs.length,
          deleted_count: deleted2,
          archive_file: export2?.filepath
        });
      }

      // Process API key audit logs
      const apiKeyLogs = await this.findApiKeyLogsToArchive();
      if (apiKeyLogs.length > 0) {
        const export3 = await this.exportToArchive(apiKeyLogs, 'api_key');
        const deleted3 = await this.deleteArchivedLogs(apiKeyLogs.map(l => l.id), 'api_key_audit_logs');
        results.push({
          type: 'api_key_audit_logs',
          archived_count: apiKeyLogs.length,
          deleted_count: deleted3,
          archive_file: export3?.filepath
        });
      }

      // Generate report
      const report = await this.generateReport(results);
      
      console.log('\n📈 Archival Summary:');
      console.log(`   Total records archived: ${report.total_archived}`);
      console.log(`   Total records deleted: ${report.total_deleted}`);
      console.log(`   Archive directory: ${this.archiveDir}`);

      // Log the archival event
      if (!this.dryRun && report.total_deleted > 0) {
        await logAuthEvent('AUDIT_LOG_ARCHIVAL_COMPLETED', {
          archived_count: report.total_archived,
          deleted_count: report.total_deleted,
          retention_days: this.retentionDays,
          critical_retention_days: this.criticalRetentionDays,
          archive_directory: this.archiveDir
        });
      }

      console.log('\n✅ Audit log archival completed successfully');
      return report;

    } catch (error) {
      console.error('❌ Audit log archival failed:', error.message);
      await logAuthError('AUDIT_LOG_ARCHIVAL_ERROR', error, {
        retention_days: this.retentionDays,
        dry_run: this.dryRun
      });
      throw error;
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  args.forEach(arg => {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--retention-days=')) {
      options.retentionDays = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--critical-retention-days=')) {
      options.criticalRetentionDays = parseInt(arg.split('=')[1]);
    }
  });

  const archival = new AuditLogArchival(options);
  archival.run()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = AuditLogArchival;
