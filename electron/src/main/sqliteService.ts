import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export interface LocalIncident {
  id: string;
  imageFileName: string;
  imagePath: string;
  remarks?: string;
  incident?: string;
  area?: string;
  operator?: string;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
  syncAttempts: number;
  lastSyncAttempt?: string;
  hash: string;
}

export class SQLiteService {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor(uploadPath: string) {
    this.dbPath = path.join(uploadPath, 'incidents.db');
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    // Ensure upload directory exists
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    try {
      this.db = new Database(this.dbPath);
      console.log('Connected to SQLite database');
      this.createTables();
    } catch (error) {
      console.error('Error opening database:', error);
    }
  }

  private createTables(): void {
    if (!this.db) return;

    const createIncidentsTable = `
      CREATE TABLE IF NOT EXISTS incidents (
        id TEXT PRIMARY KEY,
        imageFileName TEXT,
        imagePath TEXT,
        remarks TEXT,
        incident TEXT,
        area TEXT,
        operator TEXT,
        timestamp TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        syncAttempts INTEGER DEFAULT 0,
        lastSyncAttempt TEXT,
        hash TEXT
      )
    `;

    const createScreenshotsTable = `
      CREATE TABLE IF NOT EXISTS screenshots (
        id TEXT PRIMARY KEY,
        incidentId TEXT NOT NULL,
        fileName TEXT NOT NULL,
        filePath TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (incidentId) REFERENCES incidents (id)
      )
    `;

    const createSyncQueueTable = `
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        incidentId TEXT NOT NULL,
        data TEXT NOT NULL,
        retries INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (incidentId) REFERENCES incidents (id)
      )
    `;

    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_incidents_synced ON incidents (synced);
      CREATE INDEX IF NOT EXISTS idx_incidents_timestamp ON incidents (timestamp);
      CREATE INDEX IF NOT EXISTS idx_incidents_operator ON incidents (operator);
      CREATE INDEX IF NOT EXISTS idx_screenshots_incidentId ON screenshots (incidentId);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_retries ON sync_queue (retries);
    `;

    this.db.exec(createIncidentsTable);
    this.db.exec(createScreenshotsTable);
    this.db.exec(createSyncQueueTable);
    this.db.exec(createIndexes);
  }

  // Add incident to local database
  async addIncident(incident: Omit<LocalIncident, 'id' | 'createdAt' | 'updatedAt' | 'synced' | 'syncAttempts' | 'hash'>): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const dataToHash = `${incident.remarks || ''}${incident.incident || ''}${incident.area || ''}${incident.operator || ''}${incident.timestamp}`;
    const hash = this.generateHash(dataToHash);

    const stmt = this.db.prepare(`
      INSERT INTO incidents (
        id, imageFileName, imagePath, remarks, incident, area, operator, 
        timestamp, createdAt, updatedAt, synced, syncAttempts, hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id, incident.imageFileName, incident.imagePath, incident.remarks,
      incident.incident, incident.area, incident.operator, incident.timestamp,
      now, now, 0, 0, hash
    );

    return id;
  }

  // Add screenshot for an incident
  async addScreenshot(incidentId: string, fileName: string, filePath: string): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');
    const id = uuidv4();
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO screenshots (id, incidentId, fileName, filePath, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, incidentId, fileName, filePath, now);
    return id;
  }

  // Get all screenshots for an incident
  async getScreenshotsForIncident(incidentId: string): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare('SELECT * FROM screenshots WHERE incidentId = ? ORDER BY createdAt ASC');
    return stmt.all(incidentId);
  }

  // Get all incidents with optional filtering
  async getIncidents(options: {
    limit?: number;
    offset?: number;
    synced?: boolean;
    operator?: string;
    area?: string;
    search?: string;
  } = {}): Promise<LocalIncident[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    let sql = 'SELECT * FROM incidents WHERE 1=1';
    const params: any[] = [];

    if (options.synced !== undefined) {
      sql += ' AND synced = ?';
      params.push(options.synced ? 1 : 0);
    }

    if (options.operator) {
      sql += ' AND operator LIKE ?';
      params.push(`%${options.operator}%`);
    }

    if (options.area) {
      sql += ' AND area LIKE ?';
      params.push(`%${options.area}%`);
    }

    if (options.search) {
      sql += ' AND (remarks LIKE ? OR incident LIKE ? OR area LIKE ?)';
      const searchTerm = `%${options.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    sql += ' ORDER BY createdAt DESC';

    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    if (options.offset) {
      sql += ' OFFSET ?';
      params.push(options.offset);
    }

    const stmt = this.db.prepare(sql);
    return stmt.all(params) as LocalIncident[];
  }

  // Get incident by ID
  async getIncident(id: string): Promise<LocalIncident | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare('SELECT * FROM incidents WHERE id = ?');
    const result = stmt.get(id) as LocalIncident | undefined;
    return result || null;
  }

  // Update incident
  async updateIncident(id: string, updates: Partial<LocalIncident>): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const fields = Object.keys(updates).filter(key => key !== 'id');
    if (fields.length === 0) {
      return;
    }

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const sql = `UPDATE incidents SET ${setClause}, updatedAt = ? WHERE id = ?`;
    
    const values = [...fields.map(field => updates[field as keyof LocalIncident]), new Date().toISOString(), id];

    const stmt = this.db.prepare(sql);
    stmt.run(values);
  }

  // Get unsynced incidents for backend sync
  async getUnsyncedIncidents(): Promise<LocalIncident[]> {
    return this.getIncidents({ synced: false });
  }

  // Mark incident as synced
  async markAsSynced(id: string): Promise<void> {
    return this.updateIncident(id, {
      synced: true,
      lastSyncAttempt: new Date().toISOString()
    });
  }

  // Increment sync attempts
  async incrementSyncAttempts(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare(
      'UPDATE incidents SET syncAttempts = syncAttempts + 1, lastSyncAttempt = ? WHERE id = ?'
    );
    stmt.run(new Date().toISOString(), id);
  }

  // Get sync statistics
  async getSyncStats(): Promise<{
    total: number;
    synced: number;
    unsynced: number;
    failed: number;
  }> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const sql = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN synced = 1 THEN 1 ELSE 0 END) as synced,
        SUM(CASE WHEN synced = 0 THEN 1 ELSE 0 END) as unsynced,
        SUM(CASE WHEN syncAttempts >= 3 AND synced = 0 THEN 1 ELSE 0 END) as failed
      FROM incidents
    `;

    const stmt = this.db.prepare(sql);
    const result = stmt.get() as any;

    return {
      total: result.total,
      synced: result.synced,
      unsynced: result.unsynced,
      failed: result.failed
    };
  }

  // Migrate from JSON metadata to SQLite
  async migrateFromJSON(metadataPath: string): Promise<number> {
    if (!fs.existsSync(metadataPath)) {
      return 0;
    }

    try {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      let migratedCount = 0;

      for (const [imageFileName, data] of Object.entries(metadata)) {
        if (typeof data === 'object' && data !== null) {
          const incident = {
            imageFileName,
            imagePath: path.join(path.dirname(metadataPath), imageFileName),
            remarks: (data as any).remarks || '',
            incident: (data as any).incident || '',
            area: (data as any).area || '',
            operator: (data as any).operator || '',
            timestamp: (data as any).createdAt || new Date().toISOString()
          };

          await this.addIncident(incident);
          migratedCount++;
        }
      }

      return migratedCount;
    } catch (error) {
      console.error('Migration error:', error);
      return 0;
    }
  }

  // Generate hash for data integrity
  private generateHash(data: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Close database connection
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
} 