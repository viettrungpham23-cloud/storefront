# app-web-sync-check

Chạy song song App (:8810) và Web FastAPI (:8000), kiểm chứng luồng đồng bộ App ↔ Website end-to-end trên CSDL dùng chung.

## Goal

App (server.py :8810) và Website (FastAPI :8000) chạy song song; chứng minh luồng đồng bộ qua DB dùng chung: tồn kho App lấy từ Web; đặt đơn trên App ghi thành đơn 'pending' channel=App có quy nhân viên trong Web; màn Admin "Đối soát & Duyệt" thấy đơn; Thông báo + "Đơn hàng của tôi" trên App phản ánh.

## Definition of Done

Cả 2 máy chủ trả 200; sync_check.py đạt 100% bước (tồn kho khớp, đặt đơn App → đơn Web pending/App/sales, admin thấy đơn, App phản ánh ngược) — exit 0; người vận hành xác nhận đồng bộ.

## Verification

- `sync-roundtrip` (programmatic)
- `operator-confirm` (human)

## Council

- No council members configured.

## Gates

- Plan gate: revise_until_clean
- Delivery gate: revise_until_clean

## Loop Control

- Max iterations: 5
- Budget: `{"wall_clock_min": 20}`
- No-progress: `{"action": "stop", "max_stalled_iterations": 2, "signals": ["c\u00f9ng m\u1ed9t b\u01b0\u1edbc sync_check l\u1eb7p l\u1ea1i l\u1ed7i", "kh\u00f4ng kh\u1edfi \u0111\u1ed9ng \u0111\u01b0\u1ee3c m\u00e1y ch\u1ee7 thi\u1ebfu"]}`

## Execution Boundary

- Mode: `in_session`
- Isolation: `current_workspace`
- Side effects: `{"duplicate_action_check": true, "requires_approval": false}`

## Observability

- State file: `state.json`
- Run log: `run-log.md`
- Checkpoint granularity: `gate`

## Flow Preview

```text
+--------------------------------+
| 1. Goal + context              |
| read sources                   |
+--------------------------------+
               |
               v
+--------------------------------+
| 2. Draft plan.md               |
| state -> state.json            |
+--------------------------------+
               |
               v
+--------------------------------+
| 3. Plan gate                   |
| verdict: human                 |
+--------------------------------+
               | needs work -> revise <= 2 -> step 2
               | pass
               v
+--------------------------------+
| 4. Write delivery-N.md         |
| log -> run-log.md              |
+--------------------------------+
               |
               v
+--------------------------------+
| 5. Delivery gate               |
| verdict: human                 |
+--------------------------------+
               | needs work -> revise <= 3 -> step 4
               | pass
               v
+--------------------------------+
| 6. Final output                |
| all gates clean                |
+--------------------------------+

Stops: pass gates | max 5 iterations | no progress x2 | budget 20m
```
