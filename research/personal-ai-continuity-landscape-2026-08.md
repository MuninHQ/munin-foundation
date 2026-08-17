# Personal AI and Continuity Landscape — August 2026

Date: 2026-08-17

Issue: #2

## Purpose

Map the current personal-AI, memory, contextual-computing, and continuity landscape using primary sources. The goal is not to declare Munin unique by assumption, but to identify where existing products already solve parts of the problem and where durable gaps remain.

## Availability rule

This document separates generally available behavior from announced, preview, beta, or plan-limited capabilities. A capability should not be treated as a competitive baseline until the source indicates it is usable by the relevant audience.

## Landscape

### ChatGPT

**Current direction:** persistent conversational memory that synthesizes user preferences, projects, constraints, corrections, and freshness across long time horizons.

OpenAI describes memory as allowing future conversations to begin from shared context rather than from scratch. In June 2026 it announced a more scalable memory-synthesis system focused on freshness, continuity, correctness, and multi-year use. The rollout began with Plus and Pro users in the US, with additional countries and Free/Go planned afterward.

**Munin implication:** generic cross-chat continuity is no longer a differentiator by itself. Munin must demonstrate stronger user inspection, provenance, correction, portability, project-scoped state, or action continuity.

Source: https://openai.com/index/chatgpt-memory-dreaming/

### Google Gemini

**Current direction:** personalization from prior conversations plus connected Google-account data.

Google documents a Memory capability that can use prior Gemini conversations to personalize future responses. It also documents Personalized Intelligence across connected Google services such as Gmail, Calendar, Drive, Photos, YouTube, Search, Maps, Tasks, and other account data, subject to eligibility and rollout constraints.

**Availability caveat:** some personalization capabilities are not available to every account, region, or work/school account and are being rolled out gradually.

**Munin implication:** broad account-connected context is already becoming native to major ecosystems. Munin should not compete on "connect all my data" alone; portability, explicit evidence, local-first operation, provider independence, and durable state reconstruction are stronger candidate wedges.

Sources:

- https://support.google.com/gemini/answer/16598469
- https://support.google.com/gemini/answer/16836988

### Apple Intelligence / Siri AI

**Current direction:** personal context integrated directly into device apps, on-screen awareness, app actions, and private cross-device conversation history.

Apple announced Siri AI in June 2026 with personal-context understanding across messages, mail, photos, and other apps, plus on-screen awareness and broader app actions. Apple also states that a dedicated Siri app can revisit conversations and that conversation history can sync privately through iCloud.

**Availability caveat:** Apple states that Siri AI is available to developers for testing and is scheduled for beta/user availability later in 2026, with language and region limitations. These announced capabilities should therefore not be treated as universally available production behavior yet.

**Munin implication:** operating-system vendors can own device-level context better than an independent application. Munin's defensible direction should emphasize cross-provider continuity, transparent state, portable memory, explicit user control, and workflows that survive changes in model or device ecosystem.

Sources:

- https://www.apple.com/newsroom/2026/06/apple-introduces-siri-ai-a-profoundly-more-capable-and-personal-assistant/
- https://developer.apple.com/apple-intelligence/

### Claude

**Current direction:** project-scoped workspaces, knowledge bases, instructions, RAG, and persistent file-based memory patterns for long-running agentic work.

Anthropic Projects provide self-contained workspaces with chat histories, project knowledge, instructions, and RAG for larger knowledge collections. Anthropic's documentation explicitly notes that project context is not automatically shared across chats unless it is placed into project knowledge. Anthropic has also demonstrated that persistent file-based memory can materially improve performance in long-running tasks.

**Munin implication:** project-specific context and reusable knowledge are not unique. Munin must prove value in automatic state reconstruction, provenance-aware updates, continuity across domains, and reliable next-action execution rather than merely storing a project knowledge base.

Sources:

- https://support.anthropic.com/en/articles/9517075-what-are-projects
- https://support.anthropic.com/en/articles/9519177-how-can-i-create-and-manage-projects
- https://www.anthropic.com/news/claude-fable-5-mythos-5

### Microsoft Windows Recall

**Current direction:** opt-in local episodic recall of what a user has seen on a PC.

Microsoft Recall stores periodic screen snapshots locally on supported Copilot+ PCs and enables semantic retrieval over prior visual activity. Microsoft states that snapshots are encrypted on-device, can be filtered, paused, deleted, and are not shared with Microsoft or third parties as part of normal Recall operation.

**Availability caveat:** Recall remains a preview/feature tied to eligible Copilot+ hardware and Windows requirements.

**Munin implication:** local episodic retrieval is becoming an OS capability. Munin should avoid rebuilding screen-history capture as its core identity. A stronger role is to turn evidence from multiple sources into explicit, correctable state and actionable continuity.

Sources:

- https://support.microsoft.com/en-us/windows/privacy/privacy-and-control-over-your-recall-experience
- https://support.microsoft.com/en-us/windows/ai/ai-features/retrace-your-steps-with-recall

## Capability comparison

| Capability | ChatGPT | Gemini | Siri AI | Claude Projects | Windows Recall | Munin target |
|---|---|---|---|---|---|---|
| Cross-conversation memory | Yes | Yes | Announced/history | Project-scoped | No | Yes |
| Connected personal data | Limited/product-specific | Strong Google ecosystem | Strong Apple ecosystem, announced | User/project supplied | Screen activity | Provider-independent |
| Project knowledge | Yes | Partial/workspace dependent | Not primary | Strong | No | Strong + state reconstruction |
| Local-first storage | No general guarantee | No | Strong privacy architecture | No general guarantee | Yes | Yes |
| Provenance per remembered fact | Limited user-facing | Limited user-facing | Not established | Knowledge-source oriented | Snapshot source | Explicit target |
| User correction / deletion | Yes | Yes | Platform controls | Project controls | Strong snapshot controls | Explicit target |
| Provider portability | Low | Low | Low | Low | OS-bound | High target |
| Durable workflow/action state | Partial | Partial | Announced actions | Agent/project dependent | No | Core target |
| Explicit project-state reconstruction | Not primary | Not primary | Not primary | Knowledge-centric | No | Core target |

## What is no longer a sufficient Munin thesis

The following claims are too weak to justify a new category on their own:

1. "AI that remembers me."
2. "AI with a project knowledge base."
3. "AI that can search my prior activity."
4. "AI connected to email, calendar, files, and photos."
5. "AI that can take actions across apps."

Major vendors already ship or have announced credible versions of each.

## Candidate durable gaps

Munin should be validated against harder claims:

1. **Provider-independent continuity:** state survives model/provider changes.
2. **Explicit provenance:** important facts and decisions show where they came from.
3. **Correctable current state:** superseded facts are not silently mixed with current facts.
4. **Project-scoped continuity:** decisions, backlog, architecture, lessons, and session state reconstruct cleanly without contaminating personal memory.
5. **Action continuity:** long-running work can resume after process/device/model failure without duplicating consequential side effects.
6. **Local-first fallback:** core state remains usable when cloud providers or integrations are unavailable.
7. **User-governed autonomy:** consequential actions pass deterministic policy rather than relying only on model judgment.
8. **Exportability:** the user can inspect, back up, move, and delete the continuity substrate.

## Red-Team consequence

The strongest current threat to Munin is not another standalone "personal AI" startup. It is the convergence of platform-native memory, connected data, project workspaces, operating-system context, and increasingly capable agents from OpenAI, Google, Apple, Anthropic, and Microsoft.

Therefore Munin should be killed or narrowed if validation shows that its continuity layer is not materially more inspectable, portable, correctable, resilient, or useful for sustained workflows than a combination of those products.

## Next validation

Use this landscape as evidence for issue #5. The Red Team should attempt to reproduce Munin's highest-value workflows using the smallest practical combination of existing products, then compare:

- context reconstruction accuracy;
- correction burden;
- provenance visibility;
- portability;
- offline/local fallback;
- action resumability;
- user-control boundaries;
- time saved versus a manually maintained project/job tracker.
