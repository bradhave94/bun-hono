import { Database } from 'bun:sqlite';
import { logger } from '../logger';

// Initialize database
const db = new Database('csrf_tokens.db');

// Create tokens table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS csrf_tokens (
    token TEXT PRIMARY KEY,
    ip TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  );
  
  -- Index for IP address to efficiently count tokens per IP
  CREATE INDEX IF NOT EXISTS idx_csrf_tokens_ip ON csrf_tokens(ip);
  
  -- Index for timestamp to efficiently clean up expired tokens
  CREATE INDEX IF NOT EXISTS idx_csrf_tokens_timestamp ON csrf_tokens(timestamp);
`);

// Prepare statements for better performance
const statements = {
  insert: db.prepare('INSERT INTO csrf_tokens (token, ip, timestamp) VALUES ($token, $ip, $timestamp)'),
  delete: db.prepare('DELETE FROM csrf_tokens WHERE token = $token'),
  get: db.prepare('SELECT * FROM csrf_tokens WHERE token = $token'),
  countByIp: db.prepare('SELECT COUNT(*) as count FROM csrf_tokens WHERE ip = $ip'),
  deleteExpired: db.prepare('DELETE FROM csrf_tokens WHERE timestamp < $timestamp'),
  deleteByToken: db.prepare('DELETE FROM csrf_tokens WHERE token = $token')
};

export { db, statements };