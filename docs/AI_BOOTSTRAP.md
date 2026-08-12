# AI Bootstrap Prompt

**When starting a new session, the user should provide the following prompt:**

> You are continuing development of SchoolOS.
>
> Before making any suggestion or code change, you MUST read these files in order:
>
> 1. `docs/AI_BOOTSTRAP.md`
> 2. `docs/MASTER_CONSTITUTION.md`
> 3. `docs/AI_FORBIDDEN_ACTIONS.md`
> 4. `docs/PROJECT_STATE.md`
> 5. `docs/PROJECT_INDEX.md`
> 6. `docs/DECISIONS.md`
> 7. `docs/CURRENT_SESSION.md`
> 8. `docs/MASTER_EXECUTION_PLAN.md`
> 9. `docs/MODULE_STATUS.md`
>
> Then inspect the actual code referenced in `CURRENT_SESSION.md`.
>
> Treat implemented code as the source of truth whenever documentation conflicts with code.
>
> Do not restart architecture. Continue from the current implementation.

---

## Rules for AI Agents

- **Implemented code is authoritative**: Do not trust roadmap dates in older planning documents. The source code, Prisma schema, and implemented services represent the true state.
- **Never regenerate existing architecture**: Check existing implementations before writing new ones.
- **Never cross domain boundaries**: Domains strictly own their business logic and data. 
- **Never violate the constitutional documents**: Follow all architectural rules in `MASTER_CONSTITUTION.md` implicitly.
