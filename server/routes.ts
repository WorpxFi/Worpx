import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import {
  insertAgentSchema,
  insertTransactionSchema,
  insertChannelSchema,
  insertSkillSchema,
  insertSkillExecutionSchema,
} from "@shared/schema";
import { z } from "zod";

function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const message = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join(", ");
    throw Object.assign(new Error(message), { status: 400 });
  }
  return result.data;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", protocol: "worpx", version: "0.1.0" });
  });

  app.get("/api/stats", async (_req, res) => {
    const stats = await storage.getProtocolStats();
    res.json(stats);
  });

  app.post("/api/agents", async (req, res, next) => {
    try {
      const data = validateBody(insertAgentSchema, req.body);
      const agent = await storage.createAgent(data);
      res.status(201).json(agent);
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/agents", async (req, res) => {
    const chain = req.query.chain as string | undefined;
    const limit = parseInt((req.query.limit as string) || "50", 10);
    const offset = parseInt((req.query.offset as string) || "0", 10);

    if (chain) {
      const agents = await storage.getAgentsByChain(chain);
      return res.json(agents);
    }
    const agents = await storage.listAgents(limit, offset);
    res.json(agents);
  });

  app.get("/api/agents/:id", async (req, res) => {
    const agent = await storage.getAgent(req.params.id);
    if (!agent) return res.status(404).json({ message: "Agent not found" });
    res.json(agent);
  });

  app.patch("/api/agents/:id/status", async (req, res, next) => {
    try {
      const { active } = req.body;
      if (typeof active !== "boolean") {
        return res
          .status(400)
          .json({ message: "active must be a boolean" });
      }
      const agent = await storage.updateAgentStatus(req.params.id, active);
      if (!agent) return res.status(404).json({ message: "Agent not found" });
      res.json(agent);
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/transactions", async (req, res, next) => {
    try {
      const data = validateBody(insertTransactionSchema, req.body);
      const fromAgent = await storage.getAgent(data.fromAgentId);
      if (!fromAgent)
        return res.status(400).json({ message: "Sender agent not found" });
      const toAgent = await storage.getAgent(data.toAgentId);
      if (!toAgent)
        return res.status(400).json({ message: "Recipient agent not found" });
      const tx = await storage.createTransaction(data);
      res.status(201).json(tx);
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/transactions/:id", async (req, res) => {
    const tx = await storage.getTransaction(req.params.id);
    if (!tx) return res.status(404).json({ message: "Transaction not found" });
    res.json(tx);
  });

  app.get("/api/agents/:id/transactions", async (req, res) => {
    const transactions = await storage.getTransactionsByAgent(req.params.id);
    res.json(transactions);
  });

  app.patch("/api/transactions/:id/status", async (req, res, next) => {
    try {
      const { status, txHash } = req.body;
      const tx = await storage.updateTransactionStatus(
        req.params.id,
        status,
        txHash
      );
      if (!tx)
        return res.status(404).json({ message: "Transaction not found" });
      res.json(tx);
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/channels", async (req, res, next) => {
    try {
      const data = validateBody(insertChannelSchema, req.body);
      const initiator = await storage.getAgent(data.initiatorId);
      if (!initiator)
        return res.status(400).json({ message: "Initiator agent not found" });
      const counterparty = await storage.getAgent(data.counterpartyId);
      if (!counterparty)
        return res
          .status(400)
          .json({ message: "Counterparty agent not found" });
      const channel = await storage.createChannel(data);
      res.status(201).json(channel);
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/channels/:id", async (req, res) => {
    const channel = await storage.getChannel(req.params.id);
    if (!channel)
      return res.status(404).json({ message: "Channel not found" });
    res.json(channel);
  });

  app.get("/api/agents/:id/channels", async (req, res) => {
    const channels = await storage.getChannelsByAgent(req.params.id);
    res.json(channels);
  });

  app.post("/api/channels/:id/settle", async (req, res, next) => {
    try {
      const channel = await storage.getChannel(req.params.id);
      if (!channel)
        return res.status(404).json({ message: "Channel not found" });
      if (channel.status === "settled")
        return res
          .status(400)
          .json({ message: "Channel already settled" });
      const settled = await storage.updateChannelStatus(
        req.params.id,
        "settled"
      );
      const txs = await storage.getTransactionsByChannel(req.params.id);
      res.json({
        channel: settled,
        transactionCount: txs.length,
        settled: true,
      });
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/skills", async (req, res, next) => {
    try {
      const data = validateBody(insertSkillSchema, req.body);
      const author = await storage.getAgent(data.authorId);
      if (!author)
        return res.status(400).json({ message: "Author agent not found" });
      const skill = await storage.createSkill(data);
      res.status(201).json(skill);
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/skills", async (req, res) => {
    const category = req.query.category as string | undefined;
    const skills = await storage.listSkills(category);
    res.json(skills);
  });

  app.get("/api/skills/:id", async (req, res) => {
    const skill = await storage.getSkill(req.params.id);
    if (!skill) return res.status(404).json({ message: "Skill not found" });
    res.json(skill);
  });

  app.post("/api/skills/:id/execute", async (req, res, next) => {
    try {
      const skill = await storage.getSkill(req.params.id);
      if (!skill)
        return res.status(404).json({ message: "Skill not found" });
      if (!skill.published)
        return res
          .status(400)
          .json({ message: "Skill is not published" });

      const startTime = Date.now();
      const execData = validateBody(insertSkillExecutionSchema, {
        skillId: req.params.id,
        callerAgentId: req.body.callerAgentId,
        channelId: req.body.channelId,
        params: req.body.params,
        result: { executed: true, timestamp: Date.now() },
        latencyMs: Date.now() - startTime,
        paymentAmount: skill.pricePerCall,
        success: true,
      });

      const execution = await storage.createSkillExecution(execData);
      await storage.incrementSkillExecutions(
        req.params.id,
        execution.latencyMs ?? 0
      );

      res.status(201).json(execution);
    } catch (e) {
      next(e);
    }
  });

  return httpServer;
}
