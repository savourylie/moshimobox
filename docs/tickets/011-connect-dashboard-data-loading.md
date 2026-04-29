# [TICKET-011] Connect dashboard data loading

## Status
`done`

## Dependencies
- Requires: #010 ✅

## Description
Connect the dashboard page to the fixture/provider-backed API layer and prepare shared loading, empty, and error states for widgets. This ticket bridges backend data contracts and frontend rendering without yet implementing the final widget visuals.

## Acceptance Criteria
- [x] The dashboard loads the default layout schema and fetches data for each visible widget through backend APIs.
- [x] Loading states name what is being fetched, such as "Fetching CPI series", and use skeleton or progress treatment rather than spinning loaders.
- [x] Error states are factual and include source or last successful fetch metadata when available.
- [x] Data loading code preserves unit and observation date for downstream widget components.

## Design Reference
- **Motion and loading**: `docs/design/design-system/README.md` sections "Animation" and "Microcopy patterns"
- **Tokens**: `docs/design/design-system/colors_and_type.css`

## Visual Reference
The dashboard shell displays four quadrant sections with stable widget placeholders. Loading states are quiet paper-toned skeletons or thin progress bars, not animated spinners.

## Implementation Notes
- Suggested files: dashboard data loader hook/module, dashboard route integration, loading/error components.
- Do not hard-code fixture values in UI components; load through APIs.
- Use factual copy with no exclamation marks.

## Testing
- Run frontend tests for loading, success, and API-error states.
- Open the dashboard and verify no widget renders a number without a unit and observation date.
