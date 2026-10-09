# Career alert ingestion — 2026-10-08

## Delivered behavior

- Gmail reads the full nested MIME body of job alerts; Outlook requests the full alert body. Ordinary emails retain metadata/preview-only ingestion. HTML is preferred over its duplicate plaintext alternative.
- Extraction is deterministic and requires no model or paid API. It never navigates LinkedIn, executes email HTML, loads tracking images or fetches job URLs.
- A digest becomes a parent email plus independently importable vacancy records with stable source identities. The parent retains the extraction count and incomplete-reading flag, and does not masquerade as a vacancy.
- Direct LinkedIn job links are canonicalized by numeric job ID. Repeated apply buttons and repeated alerts share an identity. Different job IDs at the same company/title remain separate opportunities.
- Explicit title/company text and nearby LinkedIn company anchors supply identity. Missing identity stays unresolved for human confirmation. Generic search/navigation links and executable URLs are excluded.
- Importing another alert for a URL already in the pipeline associates the existing process instead of creating a duplicate or resetting its stage. Resynchronization preserves manual email-to-job associations.
- Successfully extracted bodies are reused locally; unavailable bodies are retried on later worker cycles. Full email bodies are parsed transiently rather than saved as raw HTML.
- Career Command reports extracted vacancy counts and incomplete alerts using its existing source-health surface. Worker health summaries distinguish original emails, local records, vacancies and alerts requiring review.

## Validation

The regression suite covers multi-vacancy HTML and plaintext, MIME alternatives, company anchors, entity decoding, URL safety, stable identities, resynchronization, full Gmail/Outlook requests, partial failures, body caching and actual HTTP import of two independent vacancies. Full-suite and browser results are recorded in the delivery session log after execution.

No new dependency, canonical token change, auto-submission or LinkedIn account automation was introduced. The design checker stays in observation mode. Only text/state was added to the existing source-health component; keyboard and focus behavior is unchanged.

## Operating the radar

1. In LinkedIn Jobs, save separate searches with the intended role, location, seniority and work arrangement filters.
2. Set each alert to daily delivery by email, using the mailbox already connected to Munin. Official help: <https://www.linkedin.com/help/linkedin/answer/a511279/job-alerts-on-linkedin>.
3. Run the existing email worker on Windows (`npm run email:worker`) or use its existing startup installer (`npm run email:worker:startup:install`). Its default polling interval is 15 minutes; this does not change LinkedIn's daily delivery schedule.
4. In Career Command, check the last import and incomplete-alert count. Inspect the original email when identity is missing. Confirm company/title before adding an individual opportunity to the pipeline.

## Remaining operational evidence

Windows installation, the actual mailbox connection and representative private LinkedIn digest formats have not been exercised in this environment. The device was observed offline during this delivery.

The existing fetch window remains 30 days and at most 500 original emails per provider per cycle. The radar covers received alerts and manually added vacancies; it does not claim exhaustive or real-time LinkedIn coverage. Available application links are retained, but job availability is still unverified until the user checks the posting. Unknown layouts and tracking-only links are signalled for review instead of guessed.
