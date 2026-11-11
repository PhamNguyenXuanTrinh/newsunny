$baseUrl = "http://localhost:3000/api"
$headers = @{ "Content-Type" = "application/json" }
$token = ""

Write-Host "`n[1] Tạo tài khoản Giám đốc (Full 25 trường)..." -ForegroundColor Yellow
$body = @{
    username = "admin"; password = "123"; role = "giam_doc"; 
    full_name = "Nguyen Giam Doc"; dob = "1980-01-01"; gender = "male";
    cccd = "001080000001"; cccd_date = "2020-01-01"; cccd_place = "CA Ha Noi";
    phone = "0901234567"; email = "giamdoc@sunnyai.vn";
    permanent_address = "Ha Noi"; current_address = "Ha Noi";
    emergency_contact = "Vo 0912345678"; position = "Giam Doc";
    join_date = "2020-01-01"; contract_type = "official";
    salary_base = 50000000; bank_account = "123456789"; bank_name = "Vietcombank"; tax_code = "123456789"; bhxh_code = "BHXH123"
} | ConvertTo-Json

try {
    $res = Invoke-RestMethod -Uri "$baseUrl/users" -Method Post -Headers $headers -Body $body
    Write-Host "-> Thành công: $($res.message)" -ForegroundColor Green
} catch { Write-Host "-> Lỗi: $($_.Exception.Message)" -ForegroundColor Red }

Write-Host "`n[2] Đăng nhập lấy Token..." -ForegroundColor Yellow
$body = @{ username = "admin"; password = "123" } | ConvertTo-Json
$res = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Headers $headers -Body $body
$script:token = $res.token
$headers.Add("Authorization", "Bearer $token")
Write-Host "-> Đăng nhập OK" -ForegroundColor Green

Write-Host "`n[3] Tạo tài khoản Công nhân (Full trường)..." -ForegroundColor Yellow
$body = @{
    username = "cn01"; password = "123"; role = "cong_nhan"; 
    full_name = "Tran Van Cong Nhan"; dob = "2000-05-05"; gender = "male";
    cccd = "001000000002"; phone = "0987654321";
    team_id = "T1"; position = "Tho May"; salary_base = 6000000
} | ConvertTo-Json

try {
    $res = Invoke-RestMethod -Uri "$baseUrl/users" -Method Post -Headers $headers -Body $body
    Write-Host "-> Thành công: Tạo CN01 thành công, ID: $($res.id)" -ForegroundColor Green
} catch { Write-Host "-> Lỗi: $($_.Exception.Message)" -ForegroundColor Red }

Write-Host "`n[4] Lấy danh sách nhân viên..." -ForegroundColor Yellow
$res = Invoke-RestMethod -Uri "$baseUrl/users" -Method Get -Headers $headers
Write-Host "-> Tổng số nhân sự: $($res.Count)" -ForegroundColor Green
foreach ($u in $res) {
    Write-Host "   - $($u.username) | $($u.full_name) | $($u.role) | $($u.status)" -ForegroundColor Gray
}
