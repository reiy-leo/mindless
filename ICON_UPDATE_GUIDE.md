# 应用图标更新指南

## 概述
本项目使用 Tauri 框架，需要为 macOS、iOS、Android、Windows 生成图标。macOS 要求图标为 squircle（圆角矩形）形状。

## 更新流程

### 1. 准备源图标
- 创建正方形 PNG 源文件（建议 1024x1024 或 512x512）
- 确保图标内容居中，为 squircle 形状预留安全区域
- 保存为 `app-icon.png` 在项目根目录

### 2. 应用 squircle 遮罩（如果需要）
如果源图标是正方形的，需要先应用 squircle 遮罩：

```bash
python3 scripts/apply_macos_icon_mask.py
```

该脚本会：
- 使用 superellipse 公式生成 macOS 标准 squircle 遮罩
- 应用到 `src-tauri/icons/` 中的所有 PNG 文件
- 重新生成 `icon.icns`

### 3. 使用 Tauri 生成所有平台图标
```bash
npm run tauri icon
```

该命令会自动为以下平台生成图标：
- **macOS**: `icon.icns`（squircle 形状）
- **iOS**: 各种尺寸的 AppIcon PNG
- **Android**: 各种密度的 ic_launcher PNG
- **Windows**: `icon.ico` 和各种尺寸的 SquareLogo PNG

### 4. 清理缓存（如果图标未更新）
```bash
# 清理 Tauri 构建缓存
cd src-tauri && cargo clean

# 清理 macOS 图标缓存
sudo find /var/folders -name "com.apple.iconservices*" -type d -exec rm -rf {} +
sudo rm -rf /Library/Caches/com.apple.iconservices*

# 重启图标服务（可选）
sudo killall iconservicesd
```

### 5. 验证图标
```bash
python3 -c "
from PIL import Image
import numpy as np
img = Image.open('src-tauri/icons/macos.iconset/icon_512x512@2x.png')
r, g, b, a = img.split()
alpha = np.array(a)
print(f'Corner (0,0) alpha: {alpha[0, 0]}')
print(f'Center alpha: {alpha[512, 512]}')
"
```

## 文件结构
```
mindless/
├── app-icon.png                    # squircle 形状的源图标
├── scripts/
│   └── apply_macos_icon_mask.py    # squircle 遮罩应用脚本
└── src-tauri/
    └── icons/
        ├── icon.icns               # macOS 图标
        ├── icon.ico                # Windows 图标
        ├── icon.png                # 通用图标
        ├── macos.iconset/          # macOS 图标集
        ├── ios/                    # iOS 图标
        └── android/                # Android 图标
```

## 技术细节

### squircle 参数
- **Superellipse 指数**: n = 5（Apple 标准）
- **形状缩放**: 0.78（占画布 78%）
- **抗锯齿**: 2 像素宽度

### macOS 图标规范
- 系统自动应用圆角遮罩
- 图标内容必须在 squircle 安全区域内
- 四角应为透明

## 注意事项
1. 每次更新图标后，必须清理构建缓存才能看到变化
2. macOS 图标缓存可能导致旧图标继续显示
3. `app-icon.png` 应为正方形，squircle 遮罩会在生成时应用
4. 如果使用 Icon Composer 项目，确保导出时选择正确的形状
