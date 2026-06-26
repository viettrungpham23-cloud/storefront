# Run `app-web-sync-check` In This Session

Use this prompt when the user wants to run the Looper-designed loop in the current LLM session.
This is the default/easy execution path. The Python runner is the advanced path for running later or outside the session.

## Operator Instructions

You are executing a Looper-designed loop in this current session.
Follow the resolved spec below, write handoff files into the workspace, and enforce the caps manually.
Do not use `run-loop.py` unless the user explicitly asks for the advanced external runner.

1. Create the workspace directory if it does not exist.
2. Read the context sources before drafting the plan.
3. Draft `plan.md` in the workspace.
4. Run the plan gate. Apply programmatic checks when available. For judge criteria, use the configured judge only after consent for any non-local egress; otherwise ask the user to approve a human/current-session substitute.
5. Revise until the gate passes or `max_revisions` is reached.
6. Produce `delivery-N.md` in the workspace.
7. Run the delivery gate after each delivery.
8. Stop when all delivery criteria pass, a cap is reached, or the user stops the loop.
9. Keep `state.json` current with status, iteration, last gate, consent, and blockers.
10. Append a compact entry to `run-log.md` after every context read, model call, check, gate verdict, revision, blocker, and stop decision.
11. Compare each blocker against the previous blocker. If the same blocker repeats for the configured no-progress window, stop or ask for the configured human checkpoint instead of revising again.
12. Treat token and USD budgets as operator limits in this session: if exact accounting is unavailable, stop and ask before continuing when the loop appears likely to exceed them.

## Files

- Source spec: `loop.yaml`
- Human summary: `LOOP.md`
- Resolved spec: `loop.resolved.json`
- Workspace: `./loop-workspace`
- State file: `state.json`
- Run log: `run-log.md`

## Goal

App (server.py :8810) và Website (FastAPI :8000) chạy song song; chứng minh luồng đồng bộ qua DB dùng chung: tồn kho App lấy từ Web; đặt đơn trên App ghi thành đơn 'pending' channel=App có quy nhân viên trong Web; màn Admin "Đối soát & Duyệt" thấy đơn; Thông báo + "Đơn hàng của tôi" trên App phản ánh.

## Definition Of Done

Cả 2 máy chủ trả 200; sync_check.py đạt 100% bước (tồn kho khớp, đặt đơn App → đơn Web pending/App/sales, admin thấy đơn, App phản ánh ngược) — exit 0; người vận hành xác nhận đồng bộ.

## Context Sources

- Read file `../server.py`
- Read file `../qlbh_sync.py`
- Read file `../QLBH-Website/main.py`

## Verification Criteria

- `sync-roundtrip` programmatic: run `["python3", "looper-sync/loop-workspace/checks/sync_check.py"]` and expect `exit_zero`
- `operator-confirm` human signoff: Xác nhận App & Web đang chạy song song và luồng đồng bộ (đặt đơn App → hiện ở Admin Web → phản ánh lại App) hoạt động đúng.


## Council

- No council members configured.

## Gates

### plan_gate

- When: `after_plan`
- Policy: `revise_until_clean`
- Verdict source: `human`
- Criteria: ``
- Max revisions: `2`

### delivery_gate

- When: `after_each_delivery`
- Policy: `revise_until_clean`
- Verdict source: `human`
- Criteria: `sync-roundtrip`
- Max revisions: `3`

## Loop Control

- Max iterations: `5`
- Budget: `{"wall_clock_min": 20}`
- No-progress: `{"action": "stop", "max_stalled_iterations": 2, "signals": ["c\u00f9ng m\u1ed9t b\u01b0\u1edbc sync_check l\u1eb7p l\u1ea1i l\u1ed7i", "kh\u00f4ng kh\u1edfi \u0111\u1ed9ng \u0111\u01b0\u1ee3c m\u00e1y ch\u1ee7 thi\u1ebfu"]}`
- Human checkpoints: `Khi sync_check đạt: người vận hành xác nhận đồng bộ (operator-confirm)`
- Stop conditions:
  - sync_check.py exit 0 + người vận hành xác nhận
  - max_iterations đạt 5
  - cùng lỗi lặp 2 vòng (no-progress)
  - vượt trần thời gian 20 phút

## Execution Boundary

- Mode: `in_session`
- Isolation: `current_workspace`
- Side effects: `{"duplicate_action_check": true, "requires_approval": false}`

If the loop needs scheduled runs, child-agent lifecycle management, concurrency control, or restart-safe step retries, stop and tell the user this Looper spec should be handed to a durable orchestrator.

## Observability

- State file: `state.json`
- Run log: `run-log.md`
- Checkpoint granularity: `gate`

Use `state.json` for the latest resumable status and `run-log.md` for the append-only history of what happened.

## Privacy

- No cross-vendor egress configured.

## Start Now

If the user asked to run now, begin at step 1 under Operator Instructions and keep going until a stop condition is reached.
