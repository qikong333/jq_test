import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Testing basic functionality...');

// 定义要检查的文件
const filesToCheck = [
  'workers/types.ts',
  'workers/WorkerManager.ts',
  'workers/fillWorker.ts',
  'workers/colorWorker.ts',
  'workers/imageWorker.ts',
  'workers/geometryWorker.ts',
  'workers/index.ts',
];

// 检查文件是否存在和基本内容
filesToCheck.forEach((file) => {
  const filePath = path.join(__dirname, file);

  console.log(`\n检查文件: ${file}`);

  if (!fs.existsSync(filePath)) {
    console.log(`❌ 文件不存在: ${filePath}`);
    return;
  }

  const stats = fs.statSync(filePath);
  console.log(`✅ 文件存在，大小: ${stats.size} bytes`);

  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // 检查基本内容
    const checks = {
      'types.ts': ['interface WorkerMessage', 'WorkerType'],
      'WorkerManager.ts': ['class WorkerManager', 'createWorker'],
      'fillWorker.ts': [
        'class FillWorker',
        'self.onmessage',
        'performFloodFill',
      ],
      'colorWorker.ts': [
        'class ColorWorker',
        'self.onmessage',
        'convertColors',
      ],
      'imageWorker.ts': ['class ImageWorker', 'self.onmessage'],
      'geometryWorker.ts': [
        'class GeometryWorker',
        'self.onmessage',
        'calculateDistance',
      ],
      'index.ts': ['class WorkerService', 'export'],
    };

    const fileName = path.basename(file);
    const expectedContent = checks[fileName] || [];

    expectedContent.forEach((expected) => {
      if (content.includes(expected)) {
        console.log(`  ✅ 包含: ${expected}`);
      } else {
        console.log(`  ❌ 缺少: ${expected}`);
      }
    });
  } catch (error) {
    console.log(`❌ 读取文件失败: ${error.message}`);
  }
});

console.log('\n基本检查完成！');
console.log('\n下一步建议:');
console.log('1. 在浏览器中打开 test/worker-test.html 进行功能测试');
console.log('2. 检查浏览器控制台是否有错误信息');
console.log('3. 测试 Worker 的各项功能是否正常工作');
