# OPSIQO V7.32 H15

H15 repairs a historical-audit compatibility defect introduced when H14 replaced the single-process authenticated browser smoke with isolated per-route workers.

The H11 audit previously recognized bounded partial evidence only by legacy source tokens (`runtimeError` and `routes completed`). H14 provides stronger evidence by checkpointing `v7-32-authenticated-accessibility.partial.json` after every route and recording `routesCompleted` / `routesTotal`, while each route runs through `runBoundedProcess`.

H15 updates the H11 audit predicate to accept either evidence architecture. The original H11 evidence contract remains accepted; the new predicate does not suppress browser failures or weaken accessibility checks.
