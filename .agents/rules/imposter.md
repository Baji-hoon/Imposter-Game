# Imposter Project Rules

Before any task, read [docs/SPEC.md](file:///c:/Users/LOQ/OneDrive/Documents/Imposter%20Game/docs/SPEC.md). Follow its rules, protocol and phase plan.
- Game logic lives only in `packages/shared` and must stay pure TypeScript.
- UI talks to the `Transport` interface only.
- No timers, buzzes or typing in the core game loop.
- Write tests for engine changes.
- Do not modify `docs/SPEC.md` without asking.
