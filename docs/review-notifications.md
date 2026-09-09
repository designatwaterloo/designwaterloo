# Review notifications

Ando workspace: Design Waterloo (9f2e7171-1f97-432e-bf7d-d051e32c982d)
Private channel: profile-submissions (d99c06b0-98d5-440b-8ddc-1aa11370387f)
Initial channel member: Brayden Petersen. Add other reviewers in Ando when desired.

Server-only variables:
- ANDO_REVIEW_API_KEY: an agent-bound Ando credential; never NEXT_PUBLIC. The personal ANDO_SCHOOL_API_KEY is deliberately not used.
- ANDO_REVIEW_CHANNEL_ID: channel above.

The existing personal credential was verified on 2026-09-09: it posts as Brayden, not a bot. Automatic posting now requires a separate agent-bound credential and verifies both principal_type=agent and the exact workspace ID before sending. Bot credential provisioning remains outstanding; the available agent-creation API does not return credentials. No messages were sent during this audit.
The channel configuration remains available. Until ANDO_REVIEW_API_KEY is configured, submissions remain saved in the admin queue and the dashboard exposes notification failure with a retry button.
Synthetic local databases are excluded from sending to Ando.

All application submission paths use POST /api/profile/submit. It checks the signed-in member,
retains timestamps for retries, and sends in Next's after() lifecycle with three attempts.
Each message uses member ID + submitted_at as its Ando idempotency key.
Pending dashboards also retry via authenticated POST /api/profile/notify-review.
After a prolonged outage, opening a pending applicant's dashboard retries delivery.
Direct database/admin status writes outside these application routes do not emit notifications.
For guaranteed delivery after prolonged outages or external writers, add a durable database outbox worker.
