# [TICKET-018] Integrate Agents SDK research tools

## Status
`blocked`

## Dependencies
- Requires: #017

## Description
Create the server-side agent integration and research tools for indicator lookup, widget data reading, time-series retrieval, and series comparison. The agent can explain and compare data, but it must not directly mutate frontend state.

## Acceptance Criteria
- [ ] A server-side agent entry point can receive a chat message and return a structured assistant response.
- [ ] Agent tools wrap existing backend APIs for indicator search, widget data lookup, time-series retrieval, and series comparison.
- [ ] Assistant responses include source, unit, and observation-date context when citing numeric data.
- [ ] The agent integration has tests or mocks for tool calls, tool errors, and no-result responses.

## Implementation Notes
- Suggested files: agent service module, research tool definitions, agent service tests.
- Use the current official OpenAI Agents SDK guidance during implementation, and keep API keys server-side only.
- The persona assumption for MVP is "research copilot": calm, declarative, honest about lag and uncertainty.

## Testing
- Run tests with mocked model and tool responses.
- Send sample prompts for inflation trend, liquidity indicators, and US versus eurozone comparison; verify tool calls and cited metadata.
