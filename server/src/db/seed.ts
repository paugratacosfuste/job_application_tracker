import db from './database.js';
import { migrate } from './migrate.js';

// Run migrations first
migrate();

function seed() {
  const existingCount = db.prepare('SELECT COUNT(*) as count FROM applications').get() as { count: number };
  if (existingCount.count > 0) {
    console.log('Database already has data, skipping seed.');
    return;
  }

  const insertApp = db.prepare(`
    INSERT INTO applications (company_name, company_website, company_size, job_title, job_url, job_description_raw, salary_min, salary_max, salary_currency, compensation_type, location_city, location_country, work_mode, status, date_applied, match_score, source, contact_name, contact_email, contact_role, notes, priority, follow_up_date, resume_version)
    VALUES (@company_name, @company_website, @company_size, @job_title, @job_url, @job_description_raw, @salary_min, @salary_max, @salary_currency, @compensation_type, @location_city, @location_country, @work_mode, @status, @date_applied, @match_score, @source, @contact_name, @contact_email, @contact_role, @notes, @priority, @follow_up_date, @resume_version)
  `);

  const insertTag = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
  const insertAppTag = db.prepare('INSERT INTO application_tags (application_id, tag_id) VALUES (?, ?)');
  const insertHistory = db.prepare('INSERT INTO status_history (application_id, from_status, to_status, notes) VALUES (?, ?, ?, ?)');

  const tags = ['React', 'TypeScript', 'Node.js', 'Python', 'AWS', 'Docker', 'PostgreSQL', 'GraphQL', 'REST API', 'CI/CD', 'Kubernetes', 'Machine Learning'];
  for (const tag of tags) {
    insertTag.run(tag);
  }

  const apps = [
    {
      company_name: 'Spotify',
      company_website: 'https://spotify.com',
      company_size: 'enterprise',
      job_title: 'Senior Frontend Engineer',
      job_url: 'https://spotify.com/careers/senior-frontend',
      job_description_raw: 'We are looking for a Senior Frontend Engineer to join our Web Player team. You will work on building the next generation of our web-based music player using React, TypeScript, and modern web technologies.',
      salary_min: 75000,
      salary_max: 95000,
      salary_currency: 'EUR',
      compensation_type: 'annual',
      location_city: 'Barcelona',
      location_country: 'Spain',
      work_mode: 'hybrid',
      status: 'technical_interview',
      date_applied: '2026-01-15',
      match_score: 4,
      source: 'linkedin',
      contact_name: 'Maria Garcia',
      contact_email: 'maria@spotify.com',
      contact_role: 'Engineering Manager',
      notes: 'Had a great phone screen. Technical interview scheduled for next week.',
      priority: 'high',
      follow_up_date: '2026-02-15',
      resume_version: 'v3-frontend',
      tags: ['React', 'TypeScript', 'Node.js']
    },
    {
      company_name: 'Datadog',
      company_website: 'https://datadoghq.com',
      company_size: 'enterprise',
      job_title: 'Full Stack Developer',
      job_url: 'https://datadoghq.com/careers/fullstack',
      job_description_raw: 'Join Datadog as a Full Stack Developer working on our monitoring and analytics platform. Experience with React, Python, and cloud infrastructure required.',
      salary_min: 65000,
      salary_max: 85000,
      salary_currency: 'EUR',
      compensation_type: 'annual',
      location_city: 'Paris',
      location_country: 'France',
      work_mode: 'hybrid',
      status: 'applied',
      date_applied: '2026-01-28',
      match_score: 3,
      source: 'company_site',
      contact_name: null,
      contact_email: null,
      contact_role: null,
      notes: 'Applied through their website. Looks like a great team.',
      priority: 'medium',
      follow_up_date: '2026-02-10',
      resume_version: 'v3-fullstack',
      tags: ['React', 'Python', 'AWS', 'Docker']
    },
    {
      company_name: 'Figma',
      company_website: 'https://figma.com',
      company_size: 'mid',
      job_title: 'Software Engineer, Platform',
      job_url: 'https://figma.com/careers/platform-engineer',
      job_description_raw: 'Help build the platform that powers Figma. Work on performance, infrastructure, and developer tools. Strong TypeScript and systems design experience required.',
      salary_min: 80000,
      salary_max: 110000,
      salary_currency: 'EUR',
      compensation_type: 'annual',
      location_city: 'London',
      location_country: 'UK',
      work_mode: 'remote',
      status: 'phone_screen',
      date_applied: '2026-01-20',
      match_score: 5,
      source: 'referral',
      contact_name: 'James Chen',
      contact_email: 'james.c@figma.com',
      contact_role: 'Staff Engineer',
      notes: 'Referred by a friend. Phone screen went well, waiting for next steps.',
      priority: 'high',
      follow_up_date: '2026-02-12',
      resume_version: 'v3-platform',
      tags: ['TypeScript', 'Node.js', 'CI/CD', 'Kubernetes']
    },
    {
      company_name: 'Stripe',
      company_website: 'https://stripe.com',
      company_size: 'enterprise',
      job_title: 'Backend Engineer, Payments',
      job_url: 'https://stripe.com/jobs/backend-payments',
      job_description_raw: 'Work on Stripe\'s core payments infrastructure. Build reliable, scalable systems that process billions of dollars. Experience with distributed systems and API design required.',
      salary_min: 90000,
      salary_max: 120000,
      salary_currency: 'EUR',
      compensation_type: 'annual',
      location_city: 'Dublin',
      location_country: 'Ireland',
      work_mode: 'hybrid',
      status: 'saved',
      date_applied: null,
      match_score: 4,
      source: 'linkedin',
      contact_name: null,
      contact_email: null,
      contact_role: null,
      notes: 'Interesting role but need to prepare more for the system design interview.',
      priority: 'medium',
      follow_up_date: null,
      resume_version: null,
      tags: ['Node.js', 'PostgreSQL', 'REST API', 'Docker']
    },
    {
      company_name: 'Vercel',
      company_website: 'https://vercel.com',
      company_size: 'mid',
      job_title: 'Developer Experience Engineer',
      job_url: 'https://vercel.com/careers/dx-engineer',
      job_description_raw: 'Help improve the developer experience for millions of developers using Vercel and Next.js. Work on documentation, SDKs, and developer tools.',
      salary_min: 70000,
      salary_max: 95000,
      salary_currency: 'EUR',
      compensation_type: 'annual',
      location_city: null,
      location_country: null,
      work_mode: 'remote',
      status: 'offer',
      date_applied: '2026-01-05',
      match_score: 5,
      source: 'job_board',
      contact_name: 'Sarah Kim',
      contact_email: 'sarah@vercel.com',
      contact_role: 'Head of DX',
      notes: 'Got an offer! Negotiating salary. Great culture fit.',
      priority: 'high',
      follow_up_date: '2026-02-14',
      resume_version: 'v3-dx',
      tags: ['React', 'TypeScript', 'Node.js', 'CI/CD']
    }
  ];

  const transaction = db.transaction(() => {
    for (const app of apps) {
      const { tags: appTags, ...appData } = app;
      const result = insertApp.run(appData);
      const appId = result.lastInsertRowid;

      if (app.status !== 'saved') {
        insertHistory.run(appId, null, 'saved', 'Application created');
        if (app.status !== 'saved') {
          insertHistory.run(appId, 'saved', 'applied', 'Submitted application');
        }
        if (['phone_screen', 'technical_interview', 'final_round', 'offer', 'accepted'].includes(app.status)) {
          insertHistory.run(appId, 'applied', 'phone_screen', 'Scheduled phone screen');
        }
        if (['technical_interview', 'final_round', 'offer', 'accepted'].includes(app.status)) {
          insertHistory.run(appId, 'phone_screen', 'technical_interview', 'Moved to technical interview');
        }
        if (['offer', 'accepted'].includes(app.status)) {
          insertHistory.run(appId, 'technical_interview', 'offer', 'Received offer');
        }
      }

      for (const tagName of appTags) {
        const tag = db.prepare('SELECT id FROM tags WHERE name = ?').get(tagName) as { id: number } | undefined;
        if (tag) {
          insertAppTag.run(appId, tag.id);
        }
      }
    }
  });

  transaction();
  console.log('Seed data inserted successfully.');
}

seed();
