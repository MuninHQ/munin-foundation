# Skills.sh Discovery Adapter v1

## Purpose

Munin can discover relevant Agent Skills from skills.sh without installing or executing third-party code.

## Flow

`need → skills.sh public search → skills.sh security audit → Munin capability gate → Munin security gate → non-executing promotion benchmark → observation replay`

The adapter deliberately stops there. In v1, automatic installation, execution and promotion are hard-blocked.

## Safety contract

- Discovery uses the public search surface used by the official skills CLI.
- Security audit evidence is collected before recommendation.
- Missing audit evidence produces HOLD, not implicit trust.
- High/critical or failing audit evidence produces REJECT.
- The existing Munin capability security gate still evaluates every candidate.
- Missing immutable revision/license evidence prevents promotion.
- No `npx skills add`, package installation, child process or arbitrary skill code execution exists in this adapter.

## Operator command

`npm run skills:discover -- "video editing" --limit=8`

The output is a candidate/replay report only.
