$ErrorActionPreference = "Stop"
$base = "http://localhost:3000/api"

Write-Host "=== SUNNY AI - DAY 3 TEST ===" -ForegroundColor Cyan

# --- 1. Login admin/123 ---
$loginBody = @{ username = "admin"; password = "123" } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Body $loginBody -ContentType "application/json"

$token = $null
if ($login.token) { $token = $login.token }
elseif ($login.data -and $login.data.token) { $token = $login.data.token }
if (-not $token) { throw "Login failed - no token in response" }
Write-Host "[OK] Logged in. Token length = $($token.Length)" -ForegroundColor Green

$headers = @{ Authorization = "Bearer $token" }

# --- 2. Lay partner & item mau de test ---
$partners = Invoke-RestMethod -Uri "$base/partners" -Headers $headers
if (-not $partners.data -or $partners.data.Count -lt 1) { throw "No partners. Run seed_data.js first." }
$partnerId = $partners.data[0].id

$items = Invoke-RestMethod -Uri "$base/items" -Headers $headers
if (-not $items.data -or $items.data.Count -lt 2) { throw "Need >=2 items. Run seed_data.js first." }
$itemId1 = $items.data[0].id
$itemId2 = $items.data[1].id
Write-Host "[OK] partnerId=$partnerId, itemId1=$itemId1, itemId2=$itemId2" -ForegroundColor Yellow

# --- 3. Tao don hang (kem 2 dong items) ---
$orderBody = @{
    partner_id = $partnerId
    order_type = "SALES"
    notes      = "Day 3 test order"
    items      = @(
        @{ item_id = $itemId1; quantity = 5; unit_price = 100000 },
        @{ item_id = $itemId2; quantity = 3; unit_price = 250000 }
    )
} | ConvertTo-Json -Depth 5

$newOrder = Invoke-RestMethod -Uri "$base/orders" -Method POST -Body $orderBody -Headers $headers -ContentType "application/json"
$orderId = $newOrder.data.id
Write-Host "[OK] Created order id=$orderId code=$($newOrder.data.order_code)" -ForegroundColor Green

# --- 4. Xem chi tiet don ---
$detail = Invoke-RestMethod -Uri "$base/orders/$orderId" -Headers $headers
Write-Host "[OK] Detail: total=$($detail.data.total_amount), items=$($detail.data.items.Count)" -ForegroundColor Green

# --- 5. Them 1 order_item qua endpoint rieng ---
$addItemBody = @{
    order_id   = $orderId
    item_id    = $itemId1
    quantity   = 2
    unit_price = 90000
} | ConvertTo-Json
$added = Invoke-RestMethod -Uri "$base/order-items" -Method POST -Body $addItemBody -Headers $headers -ContentType "application/json"
$orderItemId = $added.data.id
Write-Host "[OK] Added order_item id=$orderItemId" -ForegroundColor Green

# --- 6. Update order_item ---
$updBody = @{ quantity = 4; unit_price = 95000 } | ConvertTo-Json
Invoke-RestMethod -Uri "$base/order-items/$orderItemId" -Method PUT -Body $updBody -Headers $headers -ContentType "application/json" | Out-Null
Write-Host "[OK] Updated order_item id=$orderItemId" -ForegroundColor Green

# --- 7. Confirm don hang -> sinh stock_ledger (OUT kho) ---
$confirm = Invoke-RestMethod -Uri "$base/orders/$orderId/confirm" -Method POST -Headers $headers
Write-Host "[OK] Confirm: $($confirm.message) ($($confirm.transaction_type))" -ForegroundColor Green

# --- 8. Kiem tra stock_ledger cua don ---
$ledger = Invoke-RestMethod -Uri "$base/stock-ledger?reference_type=ORDER&reference_id=$orderId" -Headers $headers
Write-Host "[OK] Ledger entries for order: $($ledger.data.Count)" -ForegroundColor Green
$ledger.data | Format-Table id, item_code, transaction_type, quantity, balance_before, balance_after -AutoSize

# --- 9. Nhap kho thu cong (ADJUST) ---
$adjustBody = @{
    item_id          = $itemId1
    transaction_type = "ADJUST"
    quantity         = 100
    notes            = "Manual adjust day3 test"
} | ConvertTo-Json
$adjust = Invoke-RestMethod -Uri "$base/stock-ledger" -Method POST -Body $adjustBody -Headers $headers -ContentType "application/json"
Write-Host "[OK] Adjust item $itemId1 : before=$($adjust.data.balance_before) after=$($adjust.data.balance_after)" -ForegroundColor Green

# --- 10. Lich su kho cua 1 item ---
$itemLedger = Invoke-RestMethod -Uri "$base/stock-ledger/item/$itemId1" -Headers $headers
Write-Host "[OK] Item $itemId1 ledger history count = $($itemLedger.data.Count)" -ForegroundColor Green

Write-Host ""
Write-Host "=== ALL DAY 3 TESTS PASSED ===" -ForegroundColor Cyan
