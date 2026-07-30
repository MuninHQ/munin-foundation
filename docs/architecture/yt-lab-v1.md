# YT-LAB v1 Architecture

## Architectural position

YT-LAB is a governed experiment module inside Munin. It is not initially a separate SaaS product and does not require its own database.

Munin owns orchestration, governance, reusable research, and experiment memory. Video assets may later live in a dedicated repository or object store when volume justifies it.

## Bounded contexts

### Research

Produces source-backed evidence packs, topic maps, audience questions, and claims that can safely enter scripts.

### Editorial

Turns an approved evidence pack into an original narrative, hook, structure, script, and metadata draft.

### Production

Creates voice, visuals, captions, and final assembly from approved material.

### Packaging

Produces title and thumbnail hypotheses. Packaging is measured independently from content quality.

### Analytics

Collects video-level outcomes and converts them into experiment decisions.

### Governance

Blocks publication when evidence, originality, licensing, safety, or human approval is missing.

## Canonical entities

### ChannelExperiment

- id
- nicheHypothesis
- audiencePromise
- startDate
- budgetCapBrl
- weeklyHoursCap
- status
- stopConditions

### TopicCandidate

- id
- title
- cluster
- audienceQuestion
- evergreenScore
- demandSignal
- differentiationScore
- evidenceAvailability
- copyrightRisk
- productionEffort
- totalScore
- decision

### EvidencePack

- topicId
- sources
- verifiedClaims
- disputedClaims
- prohibitedClaims
- quotations
- visualSourceNotes
- originalityAngle

### VideoExperiment

- id
- topicId
- scriptVersion
- packagingVariants
- productionMinutes
- cashCostBrl
- publishDate
- approvalRecord
- metrics
- learning
- nextDecision

## Topic scoring model

Each dimension is scored from 0 to 5.

Positive dimensions:

- evergreen durability: 20%
- audience demand signal: 20%
- topic depth / series potential: 15%
- differentiation opportunity: 15%
- evidence availability: 10%
- expected advertiser value: 10%

Negative dimensions:

- copyright / reused-content risk: -15%
- production effort: -10%
- factual or reputational risk: -5%

No topic proceeds when copyright risk or factual risk is scored 4 or 5, regardless of total score.

## Validation metrics

Metrics are interpreted directionally during the first ten videos. No isolated video determines success.

### Production viability

- total human time per video;
- cash cost per video;
- percentage of workflow completed from templates;
- number of manual corrections;
- number of blocked governance checks.

### Packaging

- impressions;
- click-through rate;
- title/thumbnail hypothesis;
- traffic source distribution.

### Content

- first 30-second retention;
- average percentage viewed;
- average view duration;
- returning viewers;
- subscriber conversion per 1,000 views.

### Portfolio

- median views by video age;
- performance by topic cluster;
- cumulative watch time;
- percentage of videos still receiving impressions after 30 days.

## Initial experiment design

- One channel.
- One primary niche.
- Ten long-form videos before a scale decision.
- Three initial topic clusters.
- At least two packaging hypotheses across the set.
- Cadence chosen to respect the five-hour weekly ceiling.

## Cost-aware production stack

The stack must be replaceable and provider-neutral.

- Research and scripting: ChatGPT, Claude, primary web sources.
- Voice: free-tier or local TTS where commercial terms permit.
- Visuals: public-domain, licensed stock, generated visuals, diagrams, and original motion templates.
- Editing: CapCut Desktop, DaVinci Resolve, or FFmpeg-based assembly.
- Captions: editor transcription or local Whisper-compatible tooling.
- Thumbnails: Canva free tier or generated/original compositions.
- Tracking: repository files initially; database only when manual tracking becomes a bottleneck.

Tool selection must be confirmed against current commercial-use terms before publication.

## Quality gates

A video cannot enter production without:

- approved topic score;
- evidence pack;
- clear original angle;
- source list;
- claim-level fact review.

A video cannot be published without:

- human review of the final render;
- license notes for external assets;
- originality/reused-content check;
- title and thumbnail approval;
- description/source review.

## Stop conditions

Pause or pivot when any of the following persists after corrective tests:

- production exceeds five hours per week;
- costs exceed the initial cap without evidence of traction;
- formats depend on copyrighted clips or minimally transformed material;
- no topic cluster shows improving audience response;
- the workflow requires continuing manual effort that cannot be templated;
- the experiment harms the North Star priority of professional repositioning.

## Integration with Munin

Munin should expose:

- experiment status;
- current backlog;
- next required human decision;
- budget and time consumption;
- latest video results;
- strongest and weakest topic clusters;
- governance blocks.

YT-LAB remains lower priority than Career OS until the user explicitly changes the North Star allocation.
