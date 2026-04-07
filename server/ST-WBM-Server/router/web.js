/**
 * router/web.js — 独立网页路由
 *
 * 注册：
 *   GET /wb-manager         → 返回独立网页 index.html
 *   GET /wb-manager/css/*   → CSS 静态文件
 *   GET /wb-manager/js/*    → JS 静态文件
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.resolve(__dirname, "../web");

/**
 * 注册独立网页路由。
 * @param {import("express").Router} router
 */
export function registerWebRoutes(router) {
  // GET /wb-manager → 独立管理网页
  router.get("/wb-manager", async (_req, res) => {
    try {
      const htmlPath = path.join(WEB_DIR, "index.html");
      const html = await fs.readFile(htmlPath, "utf-8");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.send(html);
    } catch (e) {
      res.status(500).send(`<pre>[wb-manager] 无法加载 index.html: ${e.message}</pre>`);
    }
  });

  // GET /wb-manager/css/:file → CSS 资源
  router.get("/wb-manager/css/:file", async (req, res) => {
    const fileName = req.params.file;
    if (fileName.includes("..") || fileName.includes("/")) {
      return res.status(400).send("路径不合法");
    }
    try {
      const filePath = path.join(WEB_DIR, "css", fileName);
      const content = await fs.readFile(filePath, "utf-8");
      res.setHeader("Content-Type", "text/css; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.send(content);
    } catch (e) {
      res.status(404).send(`/* CSS 文件未找到: ${fileName} */`);
    }
  });

  // GET /wb-manager/js/:file → JS 资源
  router.get("/wb-manager/js/:file", async (req, res) => {
    const fileName = req.params.file;
    if (fileName.includes("..") || fileName.includes("/")) {
      return res.status(400).send("路径不合法");
    }
    try {
      const filePath = path.join(WEB_DIR, "js", fileName);
      const content = await fs.readFile(filePath, "utf-8");
      res.setHeader("Content-Type", "application/javascript; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.send(content);
    } catch (e) {
      res.status(404).send(`/* JS 文件未找到: ${fileName} */`);
    }
  });
}
