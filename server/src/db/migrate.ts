import db from './database.js';

export function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      company_website TEXT,
      company_size TEXT CHECK(company_size IN ('startup', 'mid', 'enterprise')),
      job_title TEXT NOT NULL,
      job_url TEXT,
      job_description_raw TEXT,
      salary_min INTEGER,
      salary_max INTEGER,
      salary_currency TEXT DEFAULT 'EUR',
      compensation_type TEXT CHECK(compensation_type IN ('annual', 'hourly', 'contract')),
      location_city TEXT,
      location_country TEXT,
      work_mode TEXT CHECK(work_mode IN ('remote', 'hybrid', 'on-site')),
      status TEXT DEFAULT 'saved' CHECK(status IN ('saved', 'applied', 'phone_screen', 'technical_interview', 'final_round', 'offer', 'accepted', 'rejected', 'withdrawn')),
      date_applied TEXT,
      date_added TEXT DEFAULT CURRENT_TIMESTAMP,
      match_score INTEGER CHECK(match_score >= 1 AND match_score <= 5),
      source TEXT CHECK(source IN ('linkedin', 'indeed', 'company_site', 'referral', 'job_board', 'other')),
      contact_name TEXT,
      contact_email TEXT,
      contact_role TEXT,
      notes TEXT,
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('high', 'medium', 'low')),
      follow_up_date TEXT,
      resume_version TEXT,
      cover_letter_notes TEXT
    );

    CREATE TABLE IF NOT EXISTS status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
      from_status TEXT,
      to_status TEXT,
      changed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS application_tags (
      application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
      tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (application_id, tag_id)
    );
  `);

  console.log('Database migration complete.');
}

// Auto-run when this module is the main script
if (process.argv[1]?.includes('migrate')) {
  migrate();
}
