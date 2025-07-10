const { query } = require('../database/connection');
const logger = require('../utils/logger');
const { AUDIT_ACTIONS } = require('../../shared/types/index');

// Audit log entry
const auditLog = async (logData) => {
  const {
    action,
    userId = null,
    username = null,
    resource = null,
    resourceId = null,
    details = null,
    ipAddress = null,
    userAgent = null
  } = logData;

  try {
    // Validate required fields
    if (!action) {
      logger.error('Audit log missing required action field');
      return;
    }

    // Insert audit log entry
    const result = await query(
      `INSERT INTO audit_logs 
       (user_id, username, action, resource, resource_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [userId, username, action, resource, resourceId, details, ipAddress, userAgent]
    );

    logger.info('Audit log entry created', {
      auditId: result.rows[0].id,
      action,
      userId,
      username,
      resource,
      resourceId
    });

    return result.rows[0].id;
  } catch (error) {
    logger.error('Failed to create audit log entry:', error);
    // Don't throw error to avoid breaking the main application flow
  }
};

// Get audit logs with pagination and filtering
const getAuditLogs = async (options = {}) => {
  const {
    page = 1,
    limit = 20,
    action = null,
    resource = null,
    userId = null,
    username = null,
    startDate = null,
    endDate = null,
    ipAddress = null
  } = options;

  try {
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Build WHERE conditions
    if (action) {
      whereConditions.push(`action = $${paramIndex++}`);
      queryParams.push(action);
    }

    if (resource) {
      whereConditions.push(`resource = $${paramIndex++}`);
      queryParams.push(resource);
    }

    if (userId) {
      whereConditions.push(`user_id = $${paramIndex++}`);
      queryParams.push(userId);
    }

    if (username) {
      whereConditions.push(`username ILIKE $${paramIndex++}`);
      queryParams.push(`%${username}%`);
    }

    if (startDate) {
      whereConditions.push(`created_at >= $${paramIndex++}`);
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`created_at <= $${paramIndex++}`);
      queryParams.push(endDate);
    }

    if (ipAddress) {
      whereConditions.push(`ip_address = $${paramIndex++}`);
      queryParams.push(ipAddress);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // Count total records
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM audit_logs 
      ${whereClause}
    `;
    
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Calculate pagination
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // Get paginated results
    const dataQuery = `
      SELECT 
        id,
        user_id,
        username,
        action,
        resource,
        resource_id,
        details,
        ip_address,
        user_agent,
        created_at
      FROM audit_logs 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    queryParams.push(limit, offset);
    const dataResult = await query(dataQuery, queryParams);

    return {
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  } catch (error) {
    logger.error('Failed to get audit logs:', error);
    throw error;
  }
};

// Get audit log by ID
const getAuditLogById = async (id) => {
  try {
    const result = await query(
      `SELECT 
        id,
        user_id,
        username,
        action,
        resource,
        resource_id,
        details,
        ip_address,
        user_agent,
        created_at
       FROM audit_logs 
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logger.error('Failed to get audit log by ID:', error);
    throw error;
  }
};

// Get audit statistics
const getAuditStats = async (options = {}) => {
  const { startDate = null, endDate = null } = options;

  try {
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (startDate) {
      whereConditions.push(`created_at >= $${paramIndex++}`);
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`created_at <= $${paramIndex++}`);
      queryParams.push(endDate);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // Get action counts
    const actionStatsQuery = `
      SELECT 
        action,
        COUNT(*) as count
      FROM audit_logs 
      ${whereClause}
      GROUP BY action
      ORDER BY count DESC
    `;

    const actionStatsResult = await query(actionStatsQuery, queryParams);

    // Get user activity
    const userStatsQuery = `
      SELECT 
        username,
        COUNT(*) as count
      FROM audit_logs 
      ${whereClause}
      WHERE username IS NOT NULL
      GROUP BY username
      ORDER BY count DESC
      LIMIT 10
    `;

    const userStatsResult = await query(userStatsQuery, queryParams);

    // Get daily activity
    const dailyStatsQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM audit_logs 
      ${whereClause}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `;

    const dailyStatsResult = await query(dailyStatsQuery, queryParams);

    return {
      actionStats: actionStatsResult.rows,
      userStats: userStatsResult.rows,
      dailyStats: dailyStatsResult.rows
    };
  } catch (error) {
    logger.error('Failed to get audit statistics:', error);
    throw error;
  }
};

// Clean old audit logs (for maintenance)
const cleanOldAuditLogs = async (daysToKeep = 90) => {
  try {
    const result = await query(
      `DELETE FROM audit_logs 
       WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${daysToKeep} days'`
    );

    logger.info(`Cleaned ${result.rowCount} old audit log entries`);
    return result.rowCount;
  } catch (error) {
    logger.error('Failed to clean old audit logs:', error);
    throw error;
  }
};

module.exports = {
  auditLog,
  getAuditLogs,
  getAuditLogById,
  getAuditStats,
  cleanOldAuditLogs
}; 