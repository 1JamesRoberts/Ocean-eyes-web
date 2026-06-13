# Maintainability Review — Backend & Data Storage

**Reviewer:** maintainability
**Scope:** FastAPI backend (`ai/`), data persistence (`history.jsonl`, `localStorageStore`), frontend services that talk to the backend, and the hooks that consume stored data.
**Date:** 2026-06-13

---

## Findings

### 1. Thread-unsafe mutation of global pipeline confidence

- **Location:** `ai/api_server.py` — `predict()` (~L138-148) and `predict_detection()` (~L214-225)
- **Severity:** high
- **Confidence:** 0.90
- **Problem:** Both endpoints temporarily set `pipeline.conf = conf`, run inference, then restore the previous value. In an async FastAPI server this is not atomic; concurrent requests can observe or overwrite each other's confidence thresholds.
- **Recommendation:** Make `conf` an explicit, immutable argument passed through `pipeline.predict(..., conf=...)` instead of mutating shared state.

---

### 2. Large-scale code duplication between `inference.py` and `run_pipeline_onnx_json.py`

- **Location:** `ai/inference.py` and `ai/run_pipeline_onnx_json.py`
- **Severity:** high
- **Confidence:** 0.95
- **Problem:** Both files duplicate preprocessing, session loading, provider selection, detection, species classification, and turbidity functions. Fixes and tuning must be applied in two places, and the CLI script does not reuse `FishAIPipeline`.
- **Recommendation:** Refactor `run_pipeline_onnx_json.py` to import and call `FishAIPipeline`; delete the duplicated helper functions.

---

### 3. Frontend/backend type contract drift on `image_dimensions` and `threshold`

- **Location:** `src/types/aquarium.ts` vs `ai/api_server.py` and `ai/inference.py`
- **Severity:** high
- **Confidence:** 0.85
- **Problem:** TypeScript `AIDetectionResult`, `AITurbidityResult`, and `AIDetection` expect `image_dimensions` and `threshold` fields, but the FastAPI endpoints `/predict/detection` and `/predict/turbidity` omit `image_dimensions`, and `inference.py` omits `threshold` in species results. This invites runtime failures after type-checking passes.
- **Recommendation:** Generate/share a single Pydantic schema from the backend and derive TypeScript types from it, or keep a strict contract test.

---

### 4. History endpoints are unnecessarily gated on model availability

- **Location:** `ai/api_server.py` — `/history/detections`, `/history/turbidity`, `/history/dates` (~L263-331)
- **Severity:** medium
- **Confidence:** 0.85
- **Problem:** The history endpoints return 503 when `pipeline is None` even though they only read JSONL files. This couples read-only history APIs to the expensive model-loading lifecycle.
- **Recommendation:** Remove the pipeline check from history endpoints; only validate the output directory and date format.

---

### 5. Simulated chemistry mixed into "real" data fetching

- **Location:** `src/services/realDataService.ts` (~L10, L34-55)
- **Severity:** medium
- **Confidence:** 0.80
- **Problem:** `realDataService.ts` is named and documented as the real-backend path, yet it calls `generateSimulatedChemistry()` to invent pH/temp/ammonia/nitrite values. The naming promises real data while the implementation provides placeholders.
- **Recommendation:** Rename the module to `sensorDataAdapter` or similar, and isolate the simulated-chemistry fallback behind an explicitly named function so callers know the data is synthetic.

---

### 6. Schema migrations run on every `localStorage` read

- **Location:** `src/services/localStorageStore.ts` — `getTanks()` (~L36-60) and `getLiveState()` (~L95-130)
- **Severity:** medium
- **Confidence:** 0.80
- **Problem:** The store methods replay legacy-field migration logic every time they are invoked. This scatters one-time data-upgrade concerns across the hot read path and makes the store harder to reason about.
- **Recommendation:** Run migrations once at app bootstrap (e.g., `migrateLocalStorage()`) and keep the store methods as plain read/write operations.

---

### 7. Fish inventory ignores per-tank ownership

- **Location:** `src/services/localStorageStore.ts` (~L260-290); `src/hooks/useFish.ts`
- **Severity:** medium
- **Confidence:** 0.80
- **Problem:** `LocalStorageStore.addFish` takes `_unusedTankId` and documents that per-tank ownership is not implemented. Hooks and components still pass `tankId`, creating a false domain model where fish appear scoped to a tank but are actually global.
- **Recommendation:** Either implement per-tank fish storage or remove `tankId` from the API surface and naming so the data model matches the code.

---

### 8. Hooks re-parse entire `localStorage` datasets on every update

- **Location:** `src/hooks/useTank.ts`, `useFish.ts`, `useAlerts.ts`, `useReadings.ts`, `useLiveState.ts`
- **Severity:** medium
- **Confidence:** 0.80
- **Problem:** Each hook subscribes to a single global `DB_UPDATE_EVENT` and re-reads/JSON.parses its entire key on every event, regardless of which key changed. This is O(n) per mutation and scales poorly with reading count caps and alert lists.
- **Recommendation:** Include the changed key in the update event and short-circuit unrelated subscribers, or move to a normalized in-memory store with selective subscriptions.

---

### 9. Broad exception handlers return raw exception strings

- **Location:** `ai/api_server.py` — `predict()`, `predict_turbidity()`, `predict_detection()` exception blocks
- **Severity:** medium
- **Confidence:** 0.75
- **Problem:** All prediction endpoints catch `Exception` and return `str(e)` to the client. This can leak internal paths or implementation details and provides no structured logging for operators.
- **Recommendation:** Log the full traceback server-side and return a generic, structured error object to clients. Distinguish client errors (400) from server errors (500).

---

###### 10. LLM diagnosis uses bespoke HTTP and fragile markdown stripping

- **Location:** `ai/inference.py` — `diagnose_fish_image_openai()` (~L187-280)
- **Severity:** medium
- **Confidence:** 0.80
- **Problem:** The function constructs raw `urllib` requests and manually strips markdown code fences before `json.loads()`. A malformed response causes an unhandled `JSONDecodeError`, and timeouts are not applied to response reading.
- **Recommendation:** Use a small HTTP client (`httpx`/`requests`) and Pydantic to parse/validate the LLM response; never assume the model returns valid JSON.

---

### 11. Redundant color-space conversion in image loading

- **Location:** `ai/inference.py` — `_load_image()` (~L313-319)
- **Severity:** low
- **Confidence:** 0.85
- **Problem:** `_load_image` converts RGB→BGR then immediately BGR→RGB, doing unnecessary work for every request.
- **Recommendation:** Keep the array in RGB from `PIL.Image.convert('RGB')` and use it directly; remove the double `cv2` conversion.

---

### 12. Default model paths in CLI script do not match repo layout

- **Location:** `ai/run_pipeline_onnx_json.py` (~L390-395)
- **Severity:** medium
- **Confidence:** 0.85
- **Problem:** The script defaults to `repo_root/models/export/*.onnx`, but the actual models live in `ai/models/`. The script will fail out-of-the-box unless the user overrides paths.
- **Recommendation:** Update defaults to `Path(__file__).parent / 'models' / ...` to match the actual repository structure.

---

### 13. Calibration stored in two places with unclear ownership

- **Location:** `src/services/localStorageStore.ts` — `updateCalibration()` (~L241-258)
- **Severity:** medium
- **Confidence:** 0.75
- **Problem:** `updateCalibration` writes `water_line_y` to both the active camera feed and the tank object. The function name implies a single update, but two records are maintained, risking divergence.
- **Recommendation:** Choose a single source of truth for calibration (prefer the feed) and derive the other from it, or rename the method to `updateCalibrationForTankAndFeed`.

---

### 14. Random diagnosis candidate selection hurts reproducibility

- **Location:** `ai/inference.py` — `_select_diagnosis_candidate()` (~L323-334)
- **Severity:** low
- **Confidence:** 0.60
- **Problem:** When `diagnose=true`, a random detection is chosen for LLM diagnosis. Results vary between identical requests, complicating debugging and testing.
- **Recommendation:** Use a deterministic rule (e.g., highest-confidence detection, or first viable crop) and optionally allow a query parameter to select a specific detection index.

---

### 15. `localStorage` writes lack quota-exceeded handling

- **Location:** `src/services/localStorageStore.ts` — throughout save methods
- **Severity:** medium
- **Confidence:** 0.75
- **Problem:** All `localStorage.setItem` calls can throw `QuotaExceededError`, especially as readings, snapshots, and recordings accumulate. The store methods let these exceptions bubble up uncaught.
- **Recommendation:** Wrap writes in try/catch, evict oldest records gracefully, and surface a user-facing storage-full warning.

---

## Residual Risks

1. **`localStorage` remains the canonical persistence layer.** Even after addressing individual store issues, `localStorage` is not designed for relational, multi-tab, or multi-user data. Scaling beyond a single-device demo will require a real database and migration path.
2. **Chemistry values are still simulated.** The health score and alerts depend on randomly generated chemistry. Until real sensors are wired, the system's core value proposition cannot be validated.
3. **LLM diagnosis reliability is external.** Disease diagnosis depends on an unspecified OpenAI-compatible endpoint returning well-formed JSON. Provider downtime or format drift will break the feature regardless of local code quality.
4. **No authentication boundary.** The FastAPI backend and Vite proxy expose history/clear endpoints without auth. Adding users later will require retrofitting authorization across all endpoints and storage keys.

---

## Testing Gaps

1. **No contract tests between TypeScript types and FastAPI responses.** The frontend types are not validated against actual backend output. A schema snapshot test or generated client would catch `image_dimensions`/`threshold` drift.
2. **No concurrency tests for prediction endpoints.** The shared `pipeline.conf` mutation bug would be surfaced by a simple parallel-request test.
3. **No tests for `localStorage` quota or migration paths.** Migration logic and `QuotaExceededError` handling are exercised only by manual use.
4. **No tests for ONNX provider fallback.** `load_session` chooses CUDA/DirectML/CPU but is only validated by running on different machines.
5. **No backend tests for JSONL I/O under concurrent writes.** The `_io_lock` behavior and corrupt-line recovery are not covered by automated tests.
