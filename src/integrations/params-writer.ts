/**
 * Astro integration for dev-time parameter write-back.
 * Uses astro:server:setup hook — inherently dev-only.
 *
 * Security hardening:
 * 1. Path traversal prevention (normalized root comparison)
 * 2. File type restriction (.params.ts only)
 * 3. Body size limit (64KB)
 * 4. Server-side content generation (no raw user content written)
 * 5. CSRF: deny when Origin/Referer absent
 * 6. Symlink escape check (realpath)
 * 7. Zod validation on request body
 * 8. Consistent error responses
 */
import type { AstroIntegration } from "astro";
import { writeFile, realpath } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const MAX_BODY = 64 * 1024; // 64KB

// Zod schema for request validation
const ParamDefSchema = z.discriminatedUnion("type", [
  z.object({
    key: z.string(),
    label: z.string(),
    type: z.literal("number"),
    value: z.number(),
    min: z.number(),
    max: z.number(),
    step: z.number(),
    unit: z.string().optional(),
    tier: z.enum(["css", "js"]).optional(),
  }),
  z.object({
    key: z.string(),
    label: z.string(),
    type: z.literal("color"),
    value: z.string(),
    tier: z.enum(["css", "js"]).optional(),
  }),
  z.object({
    key: z.string(),
    label: z.string(),
    type: z.literal("boolean"),
    value: z.boolean(),
    tier: z.enum(["css", "js"]).optional(),
  }),
]);

const RequestSchema = z.object({
  filePath: z.string().endsWith(".params.ts"),
  params: z.array(ParamDefSchema).max(100),
});

// Explicit field ordering for deterministic output and clean git diffs
const FIELD_ORDER: readonly string[] = [
  "key",
  "label",
  "type",
  "value",
  "min",
  "max",
  "step",
  "unit",
  "tier",
];

function generateParamsFileContent(
  params: z.infer<typeof ParamDefSchema>[],
  importPath: string,
): string {
  const lines = params.map((p) => {
    const fields = FIELD_ORDER.filter(
      (field) => (p as Record<string, unknown>)[field] !== undefined,
    )
      .map(
        (field) =>
          `${field}: ${JSON.stringify((p as Record<string, unknown>)[field])}`,
      )
      .join(", ");
    return `  { ${fields} },`;
  });

  return [
    `import type { ParamDef } from '${importPath}';`,
    ``,
    `const params: ParamDef[] = [`,
    ...lines,
    `];`,
    ``,
    `export default params;`,
    ``,
  ].join("\n");
}

function jsonResponse(
  res: import("http").ServerResponse,
  status: number,
  body: Record<string, unknown>,
) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

export function paramsWriterIntegration(): AstroIntegration {
  return {
    name: "crowcoder-params-writer",
    hooks: {
      "astro:server:setup": ({ server }) => {
        server.middlewares.use("/__params/write", async (req, res, next) => {
          if (req.method !== "POST") {
            jsonResponse(res, 405, { error: "Method Not Allowed" });
            return;
          }

          // CSRF check — deny by default when Origin/Referer absent
          const origin =
            (req.headers["origin"] as string) ||
            (req.headers["referer"] as string) ||
            "";
          if (!origin) {
            jsonResponse(res, 403, { error: "Missing origin" });
            return;
          }
          try {
            const { hostname } = new URL(origin);
            if (hostname !== "localhost" && hostname !== "127.0.0.1") {
              jsonResponse(res, 403, { error: "Forbidden" });
              return;
            }
          } catch {
            jsonResponse(res, 403, { error: "Forbidden" });
            return;
          }

          // Body size limit
          let body = "";
          let bodySize = 0;
          let destroyed = false;

          req.on("data", (chunk: Buffer) => {
            bodySize += chunk.length;
            if (bodySize > MAX_BODY) {
              destroyed = true;
              jsonResponse(res, 413, { error: "Payload too large" });
              req.destroy();
              return;
            }
            body += chunk.toString();
          });

          req.on("error", (err: unknown) => {
            const message =
              err instanceof Error ? err.message : String(err);
            console.error("[params-writer] Request stream error:", message);
            if (!res.headersSent) {
              jsonResponse(res, 500, { error: "Stream error" });
            }
          });

          req.on("end", async () => {
            if (destroyed || res.writableEnded) return;

            try {
              // Zod validation on request body
              const parsed = RequestSchema.parse(JSON.parse(body));
              const { filePath, params } = parsed;
              const root = server.config.root;

              // Path traversal prevention via realpath
              const abs = path.resolve(root, filePath);
              try {
                const realDir = await realpath(path.dirname(abs));
                const realRoot = await realpath(root);
                const normalizedRealRoot = realRoot.endsWith(path.sep)
                  ? realRoot
                  : realRoot + path.sep;
                if (
                  !realDir.startsWith(normalizedRealRoot) &&
                  realDir !== realRoot.replace(/\/$/, "")
                ) {
                  jsonResponse(res, 403, { error: "Path rejected" });
                  return;
                }
              } catch {
                jsonResponse(res, 400, { error: "Invalid path" });
                return;
              }

              // Compute relative import path for param-types
              const fileDir = path.dirname(abs);
              const paramTypesPath = path.resolve(
                root,
                "src/lib/dev/param-types",
              );
              let importPath = path.relative(fileDir, paramTypesPath);
              if (!importPath.startsWith(".")) {
                importPath = "./" + importPath;
              }

              // Server-side content generation from validated params
              const content = generateParamsFileContent(params, importPath);
              await writeFile(abs, content, "utf-8");

              jsonResponse(res, 200, { ok: true, path: filePath });
            } catch (e: unknown) {
              const message =
                e instanceof Error ? e.message : String(e);
              console.error("[params-writer]", message);
              jsonResponse(res, 500, { error: "Write failed" });
            }
          });
        });
      },
    },
  };
}
