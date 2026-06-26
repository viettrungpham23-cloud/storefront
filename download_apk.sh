#!/bin/bash
RUN_ID=28231964185
echo "Đang đợi quá trình Build APK hoàn tất trên GitHub Actions..."
gh run watch $RUN_ID --exit-status
if [ $? -eq 0 ]; then
  echo "Build thành công. Đang tải tệp APK..."
  gh run download $RUN_ID -n app-debug -D .
  mv app-debug.apk VinFast_Thu_Anh_App.apk
  echo "Đã lưu tệp APK tại: $(pwd)/VinFast_Thu_Anh_App.apk"
else
  echo "Build thất bại!"
fi
