# Workspace Overview

This workspace contains 3 repositories:

1. ./your-app
   - our main application repo
   - this is the only repo where final product integration code should be added unless absolutely necessary

2. ./MiroFish
   - third-party open-source repo
   - use the actual source code in this workspace, not just README descriptions

3. ./tribev2
   - third-party open-source repo
   - use the actual source code in this workspace, not just README descriptions

# Main Objective

Implement a real integration of TRIBE v2 and MiroFish into our lecture-analysis platform.

The product goal is:
- analyze lecture segments
- identify difficult / dense / confusing moments
- identify most engaging and least engaging moments
- use TRIBE v2 to derive cognitive-intensity / response-dynamics features
- inject those TRIBE-derived features into MiroFish so persona simulations react differently based on segment difficulty and cognitive pressure
- output clean JSON for the frontend

# Definition of Real Integration

A real integration means:
1. TRIBE v2 code is actually inspected and used from local source files
2. MiroFish code is actually inspected and used from local source files
3. TRIBE output changes MiroFish inputs
4. MiroFish persona behavior reflects TRIBE-informed cognitive pressure
5. The final output is exposed through our app backend

This is NOT acceptable:
- using only README summaries
- inventing APIs
- treating TRIBE and MiroFish as unrelated parallel tools
- hallucinating functions or scripts that do not exist in the local repos

# Required Workflow

## Phase 1: Inspect the real source code
Before making changes:
- inspect the local source code inside ./tribev2
- inspect the local source code inside ./MiroFish
- identify real entry points, scripts, classes, functions, configs, or APIs that can be used

Before coding, provide a brief source-grounded summary with:
- file paths
- what each integration point does
- any uncertainties or blockers

## Phase 2: Implement minimal but real wrappers
Add integration code inside ./your-app that wraps:
- TRIBE inference / processing
- MiroFish simulation / report generation

Prefer adapter/wrapper services over modifying third-party repo internals.

Only modify third-party repos if absolutely necessary, and explain why first.

## Phase 3: Connect them correctly
TRIBE must be used to generate segment-level cognitive-pressure signals such as:
- mean intensity
- peak intensity
- delta from previous segment
- pattern: stable | spike | fluctuating

These TRIBE-derived summaries must be injected into MiroFish persona simulation inputs.

MiroFish must simulate exactly 3 personas unless otherwise requested:
- weak_background_student
- average_student
- strong_student

The personas must respond to:
- content difficulty
- prerequisite gaps
- pacing
- TRIBE-informed cognitive pressure

## Phase 4: Final backend output
Expose final segment-level JSON with fields like:
- segment_id
- time_range
- concept
- classification: easy | dense | confusing
- engagement_label: low | medium | high
- friction_score
- engagement_score
- most_affected_persona
- prerequisite_to_review
- recommended_action
- ui_explanation

# Product Logic Requirements

The product solves:
- students do not know where they got lost in lectures
- students waste time rewatching everything
- students do not know which moments are most engaging, least engaging, or most review-worthy

The system must support:
- most engaging segment detection
- least engaging segment detection
- most confusing segment detection
- most review-needed segment detection

Do not overclaim.
Do not say the system reads brains or directly measures confusion.
Treat TRIBE as a cognitive/perceptual demand signal.
Treat MiroFish as persona simulation, not ground truth.

# Engineering Constraints

- inspect source before implementation
- do not hallucinate APIs
- if an interface is unclear, stop and report uncertainty with file references
- keep the integration modular
- prefer robust wrappers
- avoid brittle hardcoding
- keep the service smooth and demo-friendly
- do not over-engineer the first pass

# Git Workflow Rules

- work only on a new branch:
  feature/tribe-mirofish-integration

- never push to main
- never push to develop
- make small logical commits
- show a diff summary before any push
- ask for approval before pushing
- do not rewrite git history unless explicitly asked

# Safety Rules

- do not modify secrets or .env files unless explicitly asked
- do not modify deployment or CI/CD config unless explicitly asked
- do not remove existing app behavior without noting it
- do not install large dependencies blindly without explaining why

# Deliverables

Produce:
1. a source-grounded integration summary with file paths
2. wrapper/adaptor services in our app
3. backend endpoints or internal functions for the integrated pipeline
4. setup instructions
5. a clear list of remaining gaps / mocked pieces / assumptions
6. a final diff summary before any push

# Preferred Implementation Strategy

Follow this architecture unless the local code strongly suggests a better one:

lecture clip / transcript / slides
-> segmenter
-> lecture analyzer
-> TRIBE service
-> TRIBE summarizer
-> flagged segment selector
-> MiroFish service with TRIBE-informed seed
-> fusion layer
-> frontend JSON output

# Expected Behavior During Work

When you discover a likely integration point, cite the file path.
When you make a design decision, explain it briefly.
When blocked, say exactly what is unclear and where.
Do not pretend uncertainty is resolved when it is not.

# First Task

Start by inspecting:
- ./tribev2
- ./MiroFish
- ./your-app

Then report:
1. likely integration points in each repo
2. the minimum viable path to real integration
3. what code you plan to write first

Do not code yet until that inspection summary is complete.
