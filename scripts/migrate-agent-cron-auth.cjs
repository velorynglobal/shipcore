const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const projectRef = 'wceiurzrlrcahviywlky';
const secretPath = path.join(os.tmpdir(), 'shipcore-agent-cron-secret');
const cronSecret = fs.readFileSync(secretPath, 'utf8').trim();
const jobs = [
  [11, 'tesla-agent'],
  [12, 'pranali-agent'],
  [13, 'ganesh-agent'],
  [14, 'einstein-agent'],
  [15, 'alex-agent'],
];

if (!/^[a-f0-9]{64}$/.test(cronSecret)) {
  throw new Error('Staged cron secret is missing or invalid');
}

for (const [jobId, slug] of jobs) {
  const command = [
    'select net.http_post(',
    `url := 'https://${projectRef}.supabase.co/functions/v1/${slug}',`,
    `headers := jsonb_build_object('Content-Type','application/json','x-agent-cron-secret','${cronSecret}'),`,
    `body := '{}'::jsonb`,
    ');',
  ].join(' ');
  const escapedCommand = command.replaceAll("'", "''");
  const sql = `select cron.alter_job(job_id := ${jobId}, command := '${escapedCommand}');`;

  execFileSync(
    'cmd.exe',
    ['/d', '/s', '/c', 'npx', 'supabase', 'db', 'query', '--linked', sql, '--output', 'json'],
    { cwd: process.cwd(), stdio: 'ignore' },
  );
}

fs.unlinkSync(secretPath);
console.log(`Updated ${jobs.length} agent schedules and removed the staged secret.`);
