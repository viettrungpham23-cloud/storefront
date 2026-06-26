#!/bin/bash
# Script tự động tải file APK mới nhất từ GitHub Actions
# - Lấy phiên bản từ package.json
# - Xóa file APK cũ
# - Tải APK mới và đổi tên có chứa version + mã build

echo "Đang kiểm tra tiến trình Build trên GitHub..."
RUN_ID=$(gh run list -w "Build Android APK" --status success --limit 1 --json databaseId -q ".[0].databaseId")

if [ -z "$RUN_ID" ]; then
  echo "Không tìm thấy bản build thành công nào!"
  exit 1
fi

echo "Bản build thành công mới nhất: $RUN_ID"

# Đọc version từ package.json
VERSION=$(grep '"version"' mobile/package.json | awk -F'"' '{print $4}' || echo "1.0")

# Tạo thư mục chứa APK nếu chưa có
APK_DIR="apks"
mkdir -p "$APK_DIR"

# Xóa các file APK cũ trong thư mục
echo "Đang dọn dẹp các tệp APK cũ..."
rm -f "$APK_DIR"/*.apk
rm -f *.apk # Xoá tệp ở ngoài nếu có từ trước

echo "Đang tải tệp APK mới..."
gh run download $RUN_ID -n app-debug -D .

NEW_APK_NAME="VinFast_Thu_Anh_App_v${VERSION}_build${RUN_ID}.apk"
mv app-debug.apk "$APK_DIR/$NEW_APK_NAME"

echo "=========================================="
echo "✅ ĐÃ CẬP NHẬT APP THÀNH CÔNG!"
echo "Tệp mới: $(pwd)/$APK_DIR/$NEW_APK_NAME"
echo "=========================================="
