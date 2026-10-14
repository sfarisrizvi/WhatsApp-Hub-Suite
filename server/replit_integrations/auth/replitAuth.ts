import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authStorage } from "./storage";
import { pool } from "../../db";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters").max(30).regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

declare module "express-session" {
  interface SessionData {
    userId: string;
    hasLoggedOut?: boolean;
  }
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    pool: pool,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  const isSecure = process.env.COOKIE_SECURE === "true" || 
    (process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false" && process.env.HOST !== "127.0.0.1" && process.env.LOCAL !== "true");

  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isSecure,
      maxAge: sessionTtl,
      sameSite: "lax",
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Auto-login session for operations@bithash.ae on local environment
  const autoLoginEmail = process.env.AUTO_LOGIN_EMAIL || (process.env.NODE_ENV !== "production" || process.env.LOCAL === "true" ? "operations@bithash.ae" : undefined);
  if (autoLoginEmail) {
    app.use(async (req, res, next) => {
      if (!req.session.userId && !req.session.hasLoggedOut) {
        try {
          let user = await authStorage.getUserByEmail(autoLoginEmail);
          if (!user && (autoLoginEmail === "operations@bithash.ae" || autoLoginEmail === "operation@bithash.ae")) {
            user = await authStorage.getUserByEmail("operations@bithash.ae") || await authStorage.getUserByEmail("operation@bithash.ae");
          }
          if (user) {
            req.session.userId = user.id;
          }
        } catch (err) {
          console.error("Auto-login error:", err);
        }
      }
      next();
    });
  }

  // Direct endpoint to switch/refresh session as operations@bithash.ae
  app.get("/api/auth/auto-login", async (req, res) => {
    try {
      delete req.session.hasLoggedOut;
      const user = await authStorage.getUserByEmail("operations@bithash.ae") || await authStorage.getUserByEmail("operation@bithash.ae");
      if (user) {
        req.session.userId = user.id;
        req.session.save((err) => {
          if (err) return res.status(500).send("Failed to save session");
          res.redirect("/");
        });
      } else {
        res.status(404).send("User not found");
      }
    } catch (e: any) {
      res.status(500).send(e.message);
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        const msg = parsed.error.errors.map(e => e.message).join(", ");
        return res.status(400).json({ message: msg });
      }
      const { email, username, password, firstName, lastName } = parsed.data;

      const existingByEmail = await authStorage.getUserByEmail(email);
      if (existingByEmail) {
        return res.status(409).json({ message: "An account with this email already exists" });
      }

      const existingByUsername = await authStorage.getUserByUsername(username);
      if (existingByUsername) {
        return res.status(409).json({ message: "This username is already taken" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await authStorage.upsertUser({
        email,
        username,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
      });

      req.session.userId = user.id;
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }
        const { password: _, ...safeUser } = user;
        res.status(201).json(safeUser);
      });
    } catch (e: any) {
      console.error("Registration error:", e.message);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        const msg = parsed.error.errors.map(e => e.message).join(", ");
        return res.status(400).json({ message: msg });
      }
      let { email, password } = parsed.data;

      let user = await authStorage.getUserByEmail(email);
      if (!user && (email.toLowerCase() === "operation@bithash.ae" || email.toLowerCase() === "operations@bithash.ae")) {
        user = await authStorage.getUserByEmail("operations@bithash.ae") || await authStorage.getUserByEmail("operation@bithash.ae");
      }
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      delete req.session.hasLoggedOut;
      req.session.userId = user.id;
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }
        const { password: _, ...safeUser } = user!;
        res.json(safeUser);
      });
    } catch (e: any) {
      console.error("Login error:", e.message);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session.hasLoggedOut = true;
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};
