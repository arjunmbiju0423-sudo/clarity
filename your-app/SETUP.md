# Catapult Platform — Setup Instructions

## 1. Clone third-party repos

From the `catapult-platform/` root:

```bash
git clone https://github.com/666ghj/MiroFish.git
git clone https://github.com/facebookresearch/tribev2.git
```

## 2. Install backend dependencies

```bash
cd your-app
pip install -r requirements.txt
```

## 3. Set environment variables

```bash
export ANTHROPIC_API_KEY=your_key_here
```

If no key is set, the backend falls back to a heuristic lecture analyzer.

## 4. Run the backend

```bash
cd your-app
uvicorn main:app --reload --port 8000
```

Docs at: http://localhost:8000/docs

## 5. Test a single segment

```bash
curl -X POST http://localhost:8000/api/analyze-segment \
  -H "Content-Type: application/json" \
  -d '{
    "segment_id": "seg_001",
    "time_range": {"start": 42.0, "end": 56.0},
    "transcript_segment": "Now we will define the gradient descent algorithm. The gradient points in the direction of steepest ascent, so we move in the opposite direction to minimize loss.",
    "slide_text": "Gradient Descent: θ = θ - α∇L(θ)"
  }'
```

## 6. TRIBE v2 integration (next step)

After cloning tribev2:
1. Inspect `./tribev2` source — find inference entry point
2. Update `your-app/backend/services/tribe_service.py`
3. Replace `_synthetic_tribe_scores()` in `routes/lecture_analysis.py` with real TRIBE call

## 7. MiroFish integration (next step)

After cloning MiroFish:
1. Inspect `./MiroFish` source — find simulation entry point
2. Update `your-app/backend/services/mirofish_service.py`
3. The heuristic engine in that file is the fallback — real MiroFish calls wrap it

## Current integration status

| Component | Status |
|---|---|
| Lecture analysis (LLM) | Working (requires ANTHROPIC_API_KEY) |
| Lecture analysis (heuristic) | Working (no key needed) |
| TRIBE summary layer | Working |
| TRIBE v2 raw inference | Scaffold — needs source inspection |
| MiroFish simulation | Working (heuristic engine) |
| MiroFish real source | Scaffold — needs source inspection |
| Fusion layer | Working |
| FastAPI routes | Working |
| Frontend | Not yet built |
