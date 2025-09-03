import { createClient } from '@libsql/client';

// Use local database file
const client = createClient({
	url: 'file:./local.db',
});

async function setupDatabase() {
	try {
		console.log('🚀 Setting up database...');

		// Create tables manually
		await client.execute(`
			CREATE TABLE IF NOT EXISTS users (
				id TEXT PRIMARY KEY,
				email TEXT UNIQUE NOT NULL,
				password_hash TEXT NOT NULL,
				role TEXT DEFAULT 'participant' NOT NULL,
				created_at INTEGER NOT NULL,
				updated_at INTEGER NOT NULL
			);

			CREATE TABLE IF NOT EXISTS sessions (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				code TEXT UNIQUE NOT NULL,
				status TEXT DEFAULT 'active' NOT NULL,
				created_by TEXT NOT NULL,
				created_at INTEGER NOT NULL,
				updated_at INTEGER NOT NULL,
				FOREIGN KEY (created_by) REFERENCES users(id)
			);

			CREATE TABLE IF NOT EXISTS participants (
				id TEXT PRIMARY KEY,
				session_id TEXT NOT NULL,
				name TEXT,
				persona_id TEXT NOT NULL,
				joined_at INTEGER NOT NULL,
				last_activity INTEGER NOT NULL,
				FOREIGN KEY (session_id) REFERENCES sessions(id)
			);

			CREATE TABLE IF NOT EXISTS images (
				id TEXT PRIMARY KEY,
				session_id TEXT,
				participant_id TEXT,
				persona_id TEXT NOT NULL,
				persona_title TEXT NOT NULL,
				image_url TEXT NOT NULL,
				prompt TEXT NOT NULL,
				provider TEXT DEFAULT 'placeholder' NOT NULL,
				status TEXT DEFAULT 'generating' NOT NULL,
				created_at INTEGER NOT NULL,
				updated_at INTEGER NOT NULL,
				FOREIGN KEY (session_id) REFERENCES sessions(id),
				FOREIGN KEY (participant_id) REFERENCES participants(id)
			);

			CREATE TABLE IF NOT EXISTS activity_logs (
				id TEXT PRIMARY KEY,
				session_id TEXT,
				participant_id TEXT,
				action TEXT NOT NULL,
				data TEXT,
				timestamp INTEGER NOT NULL,
				FOREIGN KEY (session_id) REFERENCES sessions(id),
				FOREIGN KEY (participant_id) REFERENCES participants(id)
			);

			CREATE UNIQUE INDEX IF NOT EXISTS sessions_code_unique ON sessions(code);
			CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email);
		`);

		console.log('✅ Database tables created successfully!');

		// Test connection
		const result = await client.execute('SELECT name FROM sqlite_master WHERE type=\'table\'');
		console.log('📊 Tables created:', result.rows.map(row => row.name).join(', '));

	} catch (error) {
		console.error('❌ Database setup failed:', error);
		process.exit(1);
	}
}

setupDatabase();