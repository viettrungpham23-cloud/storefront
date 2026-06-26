# Run `app-quickbuy-orders` In This Session

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

Ứng dụng khách (storefront/web) có (1) nút "Mua ngay" một chạm trên MỌI thẻ sản phẩm ở Trang chủ, Danh mục và So sánh — thêm xe rồi vào thẳng thanh toán; và (2) màn "Đơn hàng của tôi" liệt kê đơn của khách (theo SĐT/cart-token) kèm trạng thái realtime lấy từ backend (chờ duyệt / đã đối soát / hoàn tất), đồng bộ với DB Website QLBH (xe_dien_thu_anh.db).

## Definition Of Done

Nút "Mua ngay" hiển thị & hoạt động trên thẻ ở cả 3 màn; bấm tạo đơn đồng bộ (đơn App trạng thái pending trong Website); màn "Đơn hàng của tôi" liệt kê >=1 đơn kèm trạng thái lấy từ endpoint backend mới; `node --check web/app.js` pass; không có lỗi console trên preview; Judge chấm đạt rubric; người ký duyệt bằng ảnh.

## Context Sources

- Read file `../web/app.js`
- Read file `../web/styles.css`
- Read file `../web/index.html`
- Read file `../server.py`
- Read file `../qlbh_sync.py`
- Read file `../README.md`

## Verification Criteria

- `js-syntax` programmatic: run `["node", "--check", "web/app.js"]` and expect `exit_zero`
- `order-flow` programmatic: run `["python3", "looper-output/loop-workspace/checks/order_flow.py"]` and expect `exit_zero`
- `feature-complete` judge rubric: Chấm theo từng chiều, trả JSON verdict. PASS chỉ khi tất cả đạt: (1) Nút "Mua ngay" có mặt và bấm được trên thẻ xe ở CẢ Trang chủ, Danh mục và So sánh; (2) Bấm "Mua ngay" thêm đúng xe và đi tới checkout (hoặc tạo đơn nhanh) — không phá luồng giỏ hàng/so sánh hiện có; (3) Có màn "Đơn hàng của tôi" liệt kê đơn của khách kèm trạng thái lấy từ backend (không hardcode); (4) Đơn tạo từ App đồng bộ sang Website (pending, channel App) — không tạo khách trùng; (5) Tồn kho/hết hàng vẫn khóa mua đúng; (6) Giao diện nhất quán phong cách iOS sẵn có (token màu, .btn, spacing). Liệt kê blocking_issues nếu thiếu bất kỳ chiều nào.

- `visual-signoff` human signoff: Xem ảnh chụp 3 màn (Trang chủ/Danh mục/So sánh) có nút Mua ngay và màn Đơn hàng của tôi. Xác nhận hoạt động đúng và đúng thẩm mỹ.


## Council

- `reviewer-1` judge via `["claude", "-p"]` (local; timeout 900s)

## Gates

### plan_gate

- When: `after_plan`
- Policy: `revise_until_clean`
- Verdict source: `reviewer-1`
- Criteria: `feature-complete`
- Max revisions: `3`

### delivery_gate

- When: `after_each_delivery`
- Policy: `revise_until_clean`
- Verdict source: `reviewer-1`
- Criteria: `js-syntax, order-flow, feature-complete`
- Max revisions: `3`

## Loop Control

- Max iterations: `10`
- Budget: `{"tokens": 3000000, "wall_clock_min": 45}`
- No-progress: `{"action": "stop", "max_stalled_iterations": 2, "signals": ["c\u00f9ng m\u1ed9t blocking issue l\u1eb7p l\u1ea1i", "delivery kh\u00f4ng thay \u0111\u1ed5i \u0111\u00e1ng k\u1ec3", "k\u1ebft qu\u1ea3 check kh\u00f4ng \u0111\u1ed5i"]}`
- Human checkpoints: `Sau khi plan đạt gate: người duyệt plan vì loop sửa trực tiếp app đang chạy, Trước khi kết thúc: người ký duyệt bằng ảnh chụp (visual-signoff)`
- Stop conditions:
  - tất cả delivery qua gate sạch + visual-signoff đạt
  - max_iterations đạt 10
  - cùng blocker lặp 2 vòng (no-progress)
  - vượt bất kỳ trần ngân sách nào

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

- Before sending `plan, deliveries` to `reviewer-1`, confirm consent and apply redactions `.env, .env.*, secrets/**, **/*.key`.

## Start Now

If the user asked to run now, begin at step 1 under Operator Instructions and keep going until a stop condition is reached.
