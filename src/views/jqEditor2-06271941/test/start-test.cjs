#!/usr/bin/env node

/**
 * OffscreenCanvas 测试启动脚本
 * 用于快速启动本地测试服务器
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3001;
const HOST = 'localhost';

// MIME 类型映射
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// 获取文件的 MIME 类型
function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return mimeTypes[ext] || 'application/octet-stream';
}

// 创建 HTTP 服务器
const server = http.createServer((req, res) => {
    // 解析 URL
    const parsedUrl = url.parse(req.url, true);
    let pathname = parsedUrl.pathname;
    
    // 默认页面
    if (pathname === '/') {
        pathname = '/offscreen-test.html';
    }
    
    // 构建文件路径
    const filePath = path.join(__dirname, pathname);
    
    // 检查文件是否存在
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            // 文件不存在
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>404 - 页面未找到</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                        h1 { color: #e74c3c; }
                        a { color: #3498db; text-decoration: none; }
                        a:hover { text-decoration: underline; }
                    </style>
                </head>
                <body>
                    <h1>404 - 页面未找到</h1>
                    <p>请求的文件 <code>${pathname}</code> 不存在。</p>
                    <p><a href="/">返回测试页面</a></p>
                </body>
                </html>
            `);
            return;
        }
        
        // 读取文件
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>500 - 服务器错误</title>
                        <style>
                            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                            h1 { color: #e74c3c; }
                        </style>
                    </head>
                    <body>
                        <h1>500 - 服务器内部错误</h1>
                        <p>无法读取文件: ${err.message}</p>
                    </body>
                    </html>
                `);
                return;
            }
            
            // 设置响应头
            const mimeType = getMimeType(filePath);
            res.writeHead(200, { 
                'Content-Type': mimeType,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            
            // 发送文件内容
            res.end(data);
        });
    });
});

// 启动服务器
server.listen(PORT, HOST, () => {
    console.log('\n🎨 OffscreenCanvas 测试服务器已启动!');
    console.log(`📍 地址: http://${HOST}:${PORT}`);
    console.log(`📁 目录: ${__dirname}`);
    console.log('\n🔗 可用链接:');
    console.log(`   测试页面: http://${HOST}:${PORT}/`);
    console.log(`   直接访问: http://${HOST}:${PORT}/offscreen-test.html`);
    console.log('\n💡 提示:');
    console.log('   - 使用 Ctrl+C 停止服务器');
    console.log('   - 修改文件后刷新浏览器即可看到更新');
    console.log('   - 建议使用现代浏览器进行测试 (Chrome 69+, Firefox 105+)');
    console.log('');
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n\n👋 正在关闭服务器...');
    server.close(() => {
        console.log('✅ 服务器已关闭');
        process.exit(0);
    });
});

// 错误处理
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ 端口 ${PORT} 已被占用，请尝试其他端口或关闭占用该端口的程序`);
    } else {
        console.error('❌ 服务器启动失败:', err.message);
    }
    process.exit(1);
});

// 导出服务器实例（用于测试）
module.exports = server;