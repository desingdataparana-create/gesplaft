import {
  __export,
  appUsers,
  closeDb,
  evaluations,
  getDb,
  organizationSettings,
  settings,
  sqlQuery,
  subjects,
  withWriteTransaction
} from "./chunk-GOGXSPHE.mjs";

// portable/server.mjs
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes as randomBytes2 } from "node:crypto";

// app/api/data/route.ts
var route_exports = {};
__export(route_exports, {
  GET: () => GET,
  POST: () => POST,
  dynamic: () => dynamic
});

// app/api/data/importOperations.ts
import { z as z2 } from "zod";

// src/utils/operationImport.ts
var IMPORT_HEADERS = ["referencia", "documento", "nombre", "tipo_sujeto", "actividad", "pep", "detalle_pep", "criterios_sujeto", "tipo_operacion", "fecha_operacion", "importe_ars", "departamento", "sala", "producto", "canal", "zona", "direccion", "email", "telefono", "notas"];
var normalizeText = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
function parseImportAmount(value) {
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(value)) throw Error("Importe: us\xE1 n\xFAmeros sin separador de miles y hasta dos decimales.");
  const n = Number(value.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0 || n > 1e15) throw Error("El importe debe ser mayor a cero.");
  return n;
}
function parseImportDate(value) {
  let v = value.trim().replace(" ", "T");
  if (/^\d{2}\/\d{2}\/\d{4}T\d{2}:\d{2}(:\d{2})?$/.test(v)) {
    const [date, time] = v.split("T"), [d, m, y] = date.split("/");
    v = `${y}-${m}-${d}T${time}`;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(v)) v += "-03:00";
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(v) || !Number.isFinite(Date.parse(v))) throw Error("Fecha: us\xE1 AAAA-MM-DD HH:mm (hora argentina).");
  const day = v.slice(0, 10), test = (/* @__PURE__ */ new Date(day + "T12:00:00Z")).toISOString().slice(0, 10);
  if (day !== test) throw Error("La fecha no existe.");
  if (Date.parse(v) > Date.now() + 6e4) throw Error("La operaci\xF3n no puede tener fecha futura.");
  return new Date(v).toISOString();
}

// src/utils/validation.ts
import { z } from "zod";
var subjectTypes = ["PERSONA_FISICA", "PERSONA_JURIDICA", "AGENCIA"];
var subjectSchema = z.object({ id: z.string().optional(), updatedAt: z.string().optional(), subjectName: z.string().trim().min(2).max(200), taxId: z.string().trim().min(7).max(20), subjectType: z.enum(subjectTypes), address: z.string().trim().max(500).default(""), email: z.union([z.literal(""), z.string().trim().email().max(254)]).default(""), phone: z.string().trim().max(40).default(""), activity: z.string().trim().min(2).max(200), pepStatus: z.boolean(), pepDetails: z.string().max(1e3).optional(), clientCriteriaIds: z.array(z.string()).max(100).default([]) }).refine((s) => /^\d{7,11}$/.test(s.taxId.replace(/\D/g, "")), { message: "Revis\xE1 el DNI/CUIT: debe tener entre 7 y 11 d\xEDgitos." }).refine((s) => !s.phone || s.phone.replace(/\D/g, "").length >= 6, { message: "Revis\xE1 el tel\xE9fono." }).refine((s) => !s.clientCriteriaIds.includes("cli-03") || s.pepStatus, { message: "Marc\xE1 la condici\xF3n PEP si seleccion\xE1s ese par\xE1metro personal." }).refine((s) => !s.pepStatus || !!s.pepDetails?.trim(), { message: "Indic\xE1 el cargo o condici\xF3n PEP en la ficha del sujeto." });
var recordSchema = z.object({ subjectUpdatedAt: z.string().optional(), operationType: z.string().trim().min(1).max(80), amountARS: z.number().finite().positive().max(1e15).multipleOf(0.01), locationDepartment: z.string().trim().min(1).max(200), channelName: z.string().trim().min(1).max(200), selectedCriteriaIds: z.array(z.string()).min(1).max(200), notes: z.string().max(1e4) });
var operationSchema = recordSchema.extend({ operationAt: z.string().datetime().refine((v) => Date.parse(v) <= Date.now() + 6e4, { message: "La operaci\xF3n no puede tener fecha futura." }), conditionConfirmed: z.literal(true, { error: "Confirm\xE1 la condici\xF3n del sujeto para esta operaci\xF3n." }), pepStatus: z.boolean(), pepDetails: z.string().max(1e3).optional(), activityAtOperation: z.string().trim().min(2).max(200) }).refine((r) => !r.pepStatus || !!r.pepDetails?.trim(), { message: "Indic\xE1 el cargo o condici\xF3n PEP evaluada." });

// src/utils/riskConfiguration.ts
var UIF_FLOOR_CODE = "UMB-ID-01";
function simplifyRiskConfiguration(config) {
  const weights = config.factorWeights.filter((w) => w.category !== "OPERACIONAL");
  const total = weights.reduce((sum, w) => sum + w.weightPercentage, 0);
  let assigned = 0;
  const factorWeights = weights.map((w, index) => {
    const weightPercentage = index === weights.length - 1 ? Math.round((100 - assigned) * 100) / 100 : Math.round((total > 0 ? w.weightPercentage / total * 100 : 100 / weights.length) * 100) / 100;
    assigned += weightPercentage;
    return { ...w, weightPercentage };
  });
  return {
    ...config,
    criteria: config.criteria.filter((c) => c.category !== "OPERACIONAL"),
    factorWeights,
    thresholds: config.thresholds.filter((t) => t.code === UIF_FLOOR_CODE).map((t) => ({
      ...t,
      title: "Piso UIF",
      periodicity: "POR_OPERACION"
    }))
  };
}

// src/utils/calculateRisk.ts
function calculateRisk(criteria, factorWeights, selectedCriteriaIds, isPep, amountARS, thresholds = [], context = {}) {
  ({ criteria, factorWeights, thresholds } = simplifyRiskConfiguration({ criteria, factorWeights, thresholds }));
  const selectedObj = criteria.filter((c) => c.active && !c.deletedAt && selectedCriteriaIds.includes(c.id));
  const catScores = {};
  factorWeights.forEach((fw) => {
    const itemsInCat = selectedObj.filter((c) => c.category === fw.category);
    if (itemsInCat.length > 0) {
      const maxScore = Math.max(...itemsInCat.map((c) => c.score));
      const avg = itemsInCat.reduce((acc, curr) => acc + curr.score, 0) / itemsInCat.length;
      catScores[fw.category] = {
        avgScore: avg,
        maxScore,
        count: itemsInCat.length,
        weight: fw.weightPercentage
      };
    } else {
      catScores[fw.category] = {
        avgScore: 1,
        maxScore: 1,
        count: 0,
        weight: fw.weightPercentage
      };
    }
  });
  let totalScore = 0;
  factorWeights.forEach((fw) => {
    const data = catScores[fw.category];
    const categoryNormalized = (data.maxScore * 0.7 + data.avgScore * 0.3) / 5 * 100;
    totalScore += categoryNormalized * (fw.weightPercentage / 100);
  });
  totalScore = Math.min(100, Math.max(10, Math.round(totalScore * 10) / 10));
  let lvl = "BAJO";
  if (totalScore >= 75 || isPep || selectedObj.some((c) => ["cli-03", "cli-04", "cli-07"].includes(c.id))) {
    lvl = totalScore >= 85 ? "CRITICO" : "ALTO";
  } else if (totalScore >= 40) {
    lvl = "MEDIO";
  }
  let dd = "SIMPLIFICADA";
  if (lvl === "ALTO" || lvl === "CRITICO") {
    dd = "REFORZADA";
  } else if (lvl === "MEDIO") {
    dd = "ESTANDAR";
  }
  const alertsGenerated = [];
  if (isPep) {
    alertsGenerated.push("Persona Expuesta Pol\xEDticamente (PEP): Requiere debida diligencia reforzada.");
  }
  const scope = context.operationType?.uifScope || "PISO";
  const thresholdChecks = thresholds.map((t) => ({ ...t, total: amountARS, triggered: amountARS >= t.amountARS }));
  const triggered = thresholdChecks.filter((t) => t.triggered);
  if (scope === "PISO") triggered.forEach((t) => alertsGenerated.push(`${t.title}: $${t.total.toLocaleString("es-AR")} / $${t.amountARS.toLocaleString("es-AR")} (${t.periodicity}). ${t.actionRequired}`));
  if (selectedObj.some((c) => c.id === "geo-02")) {
    alertsGenerated.push("Operaci\xF3n en zona de frontera internacional.");
  }
  const djofRequired = isPep || lvl === "ALTO" || lvl === "CRITICO";
  const meetsFloor = triggered.some((t) => t.code === "UMB-ID-01");
  const identificationRequired = scope === "SIEMPRE" || scope === "PISO" && meetsFloor;
  const scopeReason = scope === "SIEMPRE" ? "Identificaci\xF3n desde el inicio de la relaci\xF3n en l\xEDnea." : scope === "NO_APLICA" ? "Este tipo de operaci\xF3n no usa el piso monetario para definir su alcance." : meetsFloor ? "Alcanza el piso UIF configurado." : "No alcanza el piso UIF configurado; el riesgo se informa para seguimiento.";
  const docRequired = identificationRequired || djofRequired;
  const categoryBreakdown = factorWeights.map((w) => ({ category: w.category, name: w.name, weight: w.weightPercentage, score: Math.round((catScores[w.category].maxScore * 0.7 + catScores[w.category].avgScore * 0.3) / 5 * 1e3) / 10, criteria: selectedObj.filter((c) => c.category === w.category).map((c) => c.name) }));
  return {
    thresholdChecks,
    evaluationScope: { meetsFloor, identificationRequired, reason: scopeReason },
    categoryBreakdown,
    weightedScore: totalScore,
    rawScore: Math.round(totalScore),
    riskLevel: lvl,
    dueDiligence: dd,
    alerts: alertsGenerated,
    requiresDJOF: djofRequired,
    requiresDocumentation: docRequired
  };
}

// src/utils/evaluationRecord.ts
var EVALUATION_POLICY_VERSION = "2026-11-operacion-sujeto-v2";
function resolveOperationCriteria(config, person, submitted) {
  if (person.clientCriteriaIds?.includes("cli-03") && !person.pepStatus) throw Error("La ficha tiene un par\xE1metro PEP incompatible con su condici\xF3n. Corregila en Sujetos.");
  const operationIds = submitted.filter((id) => !config.criteria.some((c) => c.id === id && c.category === "CLIENTE"));
  const ids = [.../* @__PURE__ */ new Set([...operationIds, ...person.clientCriteriaIds || []])];
  if (ids.some((id) => !config.criteria.some((c) => c.id === id && c.active && !c.deletedAt))) throw Error("Uno de los criterios no est\xE1 activo. Revis\xE1 la selecci\xF3n.");
  if (!config.criteria.some((c) => c.category === "CLIENTE" && ids.includes(c.id))) throw Error("Complet\xE1 los par\xE1metros personales en la ficha del sujeto.");
  for (const category of ["PRODUCTO", "CANAL", "GEOGRAFIA"]) {
    if (config.criteria.filter((c) => c.category === category && ids.includes(c.id)).length !== 1) throw Error("Eleg\xED un producto/juego, un canal y una zona geogr\xE1fica para la operaci\xF3n.");
  }
  return ids;
}
function buildEvaluationRecord(input, person, config, type, meta) {
  if (type.uifScope === "PISO" && !config.thresholds.some((t) => t.code === "UMB-ID-01" && Number.isFinite(t.amountARS) && t.amountARS > 0)) throw Error("Configur\xE1 un piso UIF v\xE1lido antes de evaluar este tipo de operaci\xF3n.");
  const selectedCriteriaIds = resolveOperationCriteria(config, person, input.selectedCriteriaIds);
  const result = calculateRisk(config.criteria, config.factorWeights, selectedCriteriaIds, person.pepStatus, input.amountARS, config.thresholds, { operationType: type });
  return { ...input, selectedCriteriaIds, id: meta.id, requestFingerprint: meta.fingerprint, dossierNumber: `EXP-PLA-${new Date(meta.now).getFullYear()}-${meta.id.slice(0, 8).toUpperCase()}`, timestamp: meta.now, conditionConfirmed: true, conditionReviewedAt: meta.now, evaluator: meta.evaluator, evaluatorRole: meta.role, subjectId: person.id, subjectUpdatedAt: person.updatedAt, subjectName: person.subjectName, taxId: person.taxId, subjectType: person.subjectType, address: person.address, email: person.email, phone: person.phone, activityOcupation: person.activity, activityAtOperation: person.activity, pepStatus: person.pepStatus, pepDetails: person.pepDetails, rawScore: result.rawScore, weightedScore: result.weightedScore, riskLevel: result.riskLevel, dueDiligenceLevel: result.dueDiligence, status: "PENDIENTE", requiresDJOF: result.requiresDJOF, requiresDocumentation: result.requiresDocumentation, alerts: result.alerts, analysisVersion: 0, criteriaSnapshot: config.criteria.filter((c) => selectedCriteriaIds.includes(c.id)), weightsSnapshot: config.factorWeights, thresholdsSnapshot: config.thresholds, operationTypeName: type.name, evaluationScope: result.evaluationScope, evaluationPolicyVersion: EVALUATION_POLICY_VERSION };
}

// app/api/data/importOperations.ts
var rawSchema = z2.array(z2.object(Object.fromEntries(IMPORT_HEADERS.map((h) => [h, z2.string().max(h === "notas" ? 1e4 : 1e3).optional()]))).extend({ _fila: z2.number().int().min(2).max(1e5) }).strict()).min(1).max(200);
async function digest(value) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))).map((n) => n.toString(16).padStart(2, "0")).join("");
}
async function uuid(value) {
  const h = await digest(value);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
async function operationTypesVersion(types) {
  return digest(JSON.stringify(types));
}
async function prepareOperationsImport(raw, ownerId, people, existing, config, types, actor) {
  const rows = rawSchema.parse(raw);
  const seen = /* @__PURE__ */ new Set(), byDoc = new Map(people.map((p) => [p.taxId.replace(/\D/g, ""), p])), newSubjects = /* @__PURE__ */ new Map(), records = [], preview = [];
  const now = (/* @__PURE__ */ new Date()).toISOString();
  for (const row of rows) {
    const view = { fila: row._fila, referencia: row.referencia || "", sujeto: row.nombre || "", documento: row.documento || "", estado: "ERROR" };
    try {
      const ref = normalizeText(row.referencia || "");
      if (!ref || ref.length > 100) throw Error("Indic\xE1 una referencia \xFAnica de hasta 100 caracteres.");
      if (seen.has(ref)) throw Error("Referencia repetida dentro del archivo.");
      seen.add(ref);
      const canonical = IMPORT_HEADERS.map((h) => {
        const value = (row[h] || "").trim();
        if (h === "referencia") return [h, ref];
        if (h === "documento") return [h, value.replace(/\D/g, "")];
        if (h === "fecha_operacion") return [h, parseImportDate(value)];
        if (h === "importe_ars") return [h, parseImportAmount(value)];
        if (h === "tipo_operacion") return [h, types.find((t) => normalizeText(t.code) === normalizeText(value) || normalizeText(t.name) === normalizeText(value))?.code || normalizeText(value)];
        if (["producto", "canal", "zona"].includes(h)) return [h, config.criteria.find((c) => c.id === value || normalizeText(c.code) === normalizeText(value))?.code || normalizeText(value)];
        if (h === "criterios_sujeto") return [h, value ? value.split("|").map((v) => config.criteria.find((c) => c.id === v.trim() || normalizeText(c.code) === normalizeText(v))?.code || normalizeText(v)).sort() : []];
        return [h, h === "notas" ? value : normalizeText(value)];
      });
      const rowFingerprint = await digest(JSON.stringify(canonical));
      const id = await uuid(ownerId + ":import:" + ref), previous = existing.find((r) => r.id === id);
      if (previous) {
        if (previous.importRowFingerprint !== rowFingerprint) throw Error("Esta referencia ya se import\xF3 con otros datos.");
        Object.assign(view, { estado: "YA_IMPORTADA", sujeto: previous.subjectName, importe: previous.amountARS, riesgo: previous.riskLevel, puntaje: previous.weightedScore, alcance: previous.evaluationScope?.reason });
        preview.push(view);
        continue;
      }
      const document = row.documento || "";
      if (!/^[\d.\-\s]+$/.test(document) || !/^\d{7,11}$/.test(document.replace(/\D/g, ""))) throw Error("Documento: deben ser entre 7 y 11 d\xEDgitos.");
      const key = document.replace(/\D/g, "");
      const criterion = (value, category) => {
        const found = config.criteria.find((c) => c.active && !c.deletedAt && c.category === category && (c.id === value || normalizeText(c.code) === normalizeText(value)));
        if (!found) throw Error(`Criterio de ${category.toLowerCase()} no v\xE1lido: ${value || "(vac\xEDo)"}.`);
        return found.id;
      };
      const personal = row.criterios_sujeto?.trim() ? row.criterios_sujeto.split("|").map((v) => criterion(v.trim(), "CLIENTE")) : void 0;
      let person = byDoc.get(key);
      if (person) {
        const comparisons = [["nombre", row.nombre, person.subjectName], ["tipo de sujeto", row.tipo_sujeto, person.subjectType], ["actividad", row.actividad, person.activity], ["detalle PEP", row.detalle_pep, person.pepDetails], ["domicilio", row.direccion, person.address], ["correo", row.email, person.email], ["tel\xE9fono", row.telefono, person.phone]];
        for (const [label, value, stored] of comparisons) if (value && normalizeText(value) !== normalizeText(stored || "")) throw Error(`El ${label} no coincide con la ficha existente. Revisala en Sujetos.`);
        if (row.pep && (!["SI", "NO"].includes(normalizeText(row.pep)) || normalizeText(row.pep) === "SI" !== person.pepStatus)) throw Error("La condici\xF3n PEP no coincide con la ficha existente.");
        if (personal && [...new Set(personal)].sort().join("|") !== [...new Set(person.clientCriteriaIds || [])].sort().join("|")) throw Error("Los par\xE1metros personales no coinciden con la ficha existente.");
      } else {
        if (!row.pep || !["SI", "NO"].includes(normalizeText(row.pep))) throw Error("Indic\xE1 SI o NO en PEP para el sujeto nuevo.");
        if (!row.nombre?.trim() || !row.actividad?.trim()) throw Error("Complet\xE1 nombre y actividad para el sujeto nuevo.");
        const values = subjectSchema.parse({ subjectName: row.nombre || "", taxId: document, subjectType: row.tipo_sujeto || "PERSONA_FISICA", activity: row.actividad || "", pepStatus: normalizeText(row.pep) === "SI", pepDetails: row.detalle_pep || "", clientCriteriaIds: personal || [], address: row.direccion || "", email: row.email || "", phone: row.telefono || "" });
        person = { ...values, id: await uuid(ownerId + ":import-subject:" + key), updatedAt: now };
        byDoc.set(key, person);
        newSubjects.set(key, person);
      }
      const type = types.find((t) => t.active && (normalizeText(t.code) === normalizeText(row.tipo_operacion || "") || normalizeText(t.name) === normalizeText(row.tipo_operacion || "")));
      if (!type) throw Error("El tipo de operaci\xF3n no existe o est\xE1 deshabilitado.");
      const input = operationSchema.parse({ operationType: type.code, operationAt: parseImportDate(row.fecha_operacion || ""), amountARS: parseImportAmount(row.importe_ars || ""), locationDepartment: row.departamento || "", channelName: row.sala || "", selectedCriteriaIds: [criterion(row.producto || type.productCriterionId || "", "PRODUCTO"), criterion(row.canal || "", "CANAL"), criterion(row.zona || "", "GEOGRAFIA")], notes: row.notas || "", conditionConfirmed: true, pepStatus: person.pepStatus, pepDetails: person.pepDetails, activityAtOperation: person.activity });
      const record = buildEvaluationRecord(input, person, config, type, { id, now, evaluator: actor.email, role: actor.role, fingerprint: rowFingerprint });
      record.importReference = ref;
      record.importRowFingerprint = rowFingerprint;
      records.push(record);
      Object.assign(view, { estado: "NUEVA", sujeto: person.subjectName, importe: record.amountARS, riesgo: record.riskLevel, puntaje: record.weightedScore, alcance: record.evaluationScope?.reason });
    } catch (e) {
      view.error = e instanceof z2.ZodError ? e.issues[0]?.message : e.message;
    }
    preview.push(view);
  }
  const fingerprint = await digest(JSON.stringify({ rows, config, types, people: people.map((p) => ({ id: p.id, updatedAt: p.updatedAt })).sort((a, b) => a.id.localeCompare(b.id)), existing: existing.filter((r) => r.importReference).map((r) => ({ id: r.id, hash: r.importRowFingerprint })).sort((a, b) => a.id.localeCompare(b.id)) }));
  const result = { rows: preview, fingerprint, newCount: records.length, subjectCount: newSubjects.size, skipped: preview.filter((r) => r.estado === "YA_IMPORTADA").length, errors: preview.filter((r) => r.estado === "ERROR").length };
  return { result, records, newSubjects: [...newSubjects.values()] };
}

// src/utils/operationTypes.ts
var DEFAULT_OPERATION_TYPES = [
  { code: "COBRO_PREMIO", name: "Cobro de premio", active: true, uifScope: "PISO" },
  { code: "APUESTA_PRESENCIAL", name: "Apuesta presencial", active: true, uifScope: "NO_APLICA" },
  { code: "APUESTA_ONLINE", name: "Juego en l\xEDnea", active: true, uifScope: "SIEMPRE" },
  { code: "CAMBIO_FICHAS", name: "Conversi\xF3n de valores / cambio de fichas", active: true, uifScope: "PISO" },
  { code: "ALTA_AGENCIA", name: "Alta de agencia / intermediario", active: true, uifScope: "NO_APLICA" }
];
var operationTypesFor = (org) => org?.operationTypes ?? DEFAULT_OPERATION_TYPES;

// portable/access.ts
import { and, eq } from "drizzle-orm";

// src/access.ts
var MODULES = ["dashboard", "expedientes", "sujetos", "analisis", "riesgo", "ajustes"];
var can = (u, m, write = false) => !!u && u.active && (u.role === "SUPERADMIN" || (write ? u.grants[m] === "write" : !!u.grants[m]));

// portable/access.ts
async function access(req) {
  const id = req.headers.get("oai-authenticated-user-id"), email = req.headers.get("oai-authenticated-user-email");
  if (!id || !email) throw Error("UNAUTHORIZED");
  const [u] = await getDb().select().from(appUsers).where(and(eq(appUsers.id, id), eq(appUsers.email, email)));
  if (!u?.active) throw Error("FORBIDDEN");
  return u;
}
function requireModule(u, m, w = false) {
  if (!can(u, m, w)) throw Error("FORBIDDEN");
}

// src/data/organization.ts
var DEFAULT_ORGANIZATION = { shortName: "IAFAS", legalName: "Instituto de Ayuda Financiera a la Acci\xF3n Social", area: "Prevenci\xF3n PLA/FT", taxId: "", address: "Entre R\xEDos, Argentina", email: "", phone: "", website: "", logo: "" };

// app/api/data/route.ts
import { and as and2, eq as eq2, desc } from "drizzle-orm";
import { z as z3 } from "zod";

// src/data/initialRiskData.ts
var LEGACY_FACTOR_WEIGHTS = [
  {
    category: "CLIENTE",
    name: "Factor Clientes / Apostadores",
    weightPercentage: 30,
    description: "Perfil del apostador, calidad de PEP, actividad econ\xF3mica, antecedentes y origen de fondos.",
    iconName: "UserCheck"
  },
  {
    category: "PRODUCTO",
    name: "Factor Productos / Juegos de Azar",
    weightPercentage: 25,
    description: "Naturaleza del juego (pa\xF1o/mesas, slots, quiniela, quini 6, online) y velocidad de rotaci\xF3n de fondos.",
    iconName: "Dices"
  },
  {
    category: "CANAL",
    name: "Factor Canales de Distribuci\xF3n",
    weightPercentage: 20,
    description: "Salas de casino f\xEDsicas, bingos, red de 900+ agencias oficiales IAFAS y canal digital web.",
    iconName: "Store"
  },
  {
    category: "GEOGRAFIA",
    name: "Factor Zona Geogr\xE1fica / Jurisdicci\xF3n",
    weightPercentage: 15,
    description: "Departamentos de Entre R\xEDos, pasos fronterizos con Uruguay (Salto Grande, Col\xF3n, Gualeguaych\xFA) y provincias lim\xEDtrofes.",
    iconName: "MapPin"
  },
  {
    category: "OPERACIONAL",
    name: "Factor Transaccional / Operativo",
    weightPercentage: 10,
    description: "Montos operados, frecuencia, operaciones fraccionadas (pitufeo/estructuraci\xF3n) y superaci\xF3n de umbrales UIF.",
    iconName: "Activity"
  }
];
var LEGACY_RISK_CRITERIA = [
  // --- FACTOR CLIENTES (CLI) ---
  {
    id: "cli-01",
    category: "CLIENTE",
    code: "CLI-01",
    name: "Persona F\xEDsica con Actividad Formal Declarada y Bancarizada",
    description: "Apostador o ganador con relaci\xF3n de dependencia, monotributo o aut\xF3nomo con ingresos demostrables e historial en IAFAS.",
    subgroup: "Perfil Socioecon\xF3mico",
    score: 1,
    riskLevel: "BAJO",
    mitigationFactor: 0.8,
    active: true,
    regulatoryBase: "Res. UIF 194/2023 - Art. 12 (Identificaci\xF3n de Clientes)",
    lastUpdated: "2026-02-15"
  },
  {
    id: "cli-02",
    category: "CLIENTE",
    code: "CLI-02",
    name: "Persona F\xEDsica sin Actividad Econ\xF3mica Comprobable o Desempleada",
    description: "Apostador que realiza apuestas o cobra premios relevantes sin acreditaci\xF3n de ingresos regulares o actividad formal registrada.",
    subgroup: "Perfil Socioecon\xF3mico",
    score: 4,
    riskLevel: "ALTO",
    mitigationFactor: 0.4,
    active: true,
    regulatoryBase: "Res. UIF 194/2023 - Art. 15 (Perfil Transaccional)",
    lastUpdated: "2026-02-15"
  },
  {
    id: "cli-03",
    category: "CLIENTE",
    code: "CLI-03",
    name: "Persona Expuesta Pol\xEDticamente (PEP) Nacional o Provincial",
    description: "Funcionario p\xFAblico de nivel municipal, provincial (Entre R\xEDos) o nacional seg\xFAn n\xF3mina oficial de la UIF.",
    subgroup: "Calidad PEP",
    score: 5,
    riskLevel: "CRITICO",
    mitigationFactor: 0.3,
    active: true,
    regulatoryBase: "Res. UIF 35/2023 - N\xF3mina y Tratamiento de Sujetos PEP",
    lastUpdated: "2026-01-10"
  },
  {
    id: "cli-04",
    category: "CLIENTE",
    code: "CLI-04",
    name: "Persona Vinculada a PEP (Familiares o Allegados Cercanos)",
    description: "C\xF3nyuges, parientes por consanguinidad hasta el segundo grado o socios comerciales de Personas Expuestas Pol\xEDticamente.",
    subgroup: "Calidad PEP",
    score: 4,
    riskLevel: "ALTO",
    mitigationFactor: 0.5,
    active: true,
    regulatoryBase: "Res. UIF 35/2023 - Art. 4",
    lastUpdated: "2026-01-10"
  },
  {
    id: "cli-05",
    category: "CLIENTE",
    code: "CLI-05",
    name: "Persona Jur\xEDdica Comercial (SA, SRL, SAS)",
    description: "Sociedades comerciales con beneficiarios finales identificados mediante estatuto y constancia registral ante DIPJ Entre R\xEDos.",
    subgroup: "Personer\xEDa Jur\xEDdica",
    score: 2,
    riskLevel: "BAJO",
    mitigationFactor: 0.7,
    active: true,
    regulatoryBase: "Res. UIF 194/2023 - Art. 13 (Beneficiario Final)",
    lastUpdated: "2026-02-10"
  },
  {
    id: "cli-06",
    category: "CLIENTE",
    code: "CLI-06",
    name: "Asociaciones, Fundaciones y ONGs sin Fines de Lucro",
    description: "Entidades sin fines de lucro que operan o cobran premios en nombre de terceros o colectas ben\xE9ficas.",
    subgroup: "Personer\xEDa Jur\xEDdica",
    score: 3,
    riskLevel: "MEDIO",
    mitigationFactor: 0.6,
    active: true,
    regulatoryBase: "Gu\xEDa GAFI/FATF para Organizaciones sin Fines de Lucro",
    lastUpdated: "2026-01-22"
  },
  {
    id: "cli-07",
    category: "CLIENTE",
    code: "CLI-07",
    name: "Sujeto Incluido en Listas de Control o Sanciones (RePET / UIF)",
    description: "Coincidencia positiva con el Registro P\xFAblico de Personas y Entidades vinculadas a Terrorismo o Listas ONU.",
    subgroup: "Listas Restrictivas",
    score: 5,
    riskLevel: "CRITICO",
    mitigationFactor: 0.1,
    active: true,
    regulatoryBase: "Decreto 918/2012 y Res. UIF 29/2013 (RePET)",
    lastUpdated: "2026-02-01"
  },
  // --- FACTOR PRODUCTOS (PROD) ---
  {
    id: "prod-01",
    category: "PRODUCTO",
    code: "PROD-01",
    name: "Juegos de Pa\xF1o y Mesas Vivas de Casino (Ruleta, Black Jack, Punto y Banca)",
    description: "Operaciones en mesas de juego con compra de fichas en efectivo, alta volatilidad y riesgo de reventa/canje de fichas.",
    subgroup: "Casino Presencial",
    score: 4,
    riskLevel: "ALTO",
    mitigationFactor: 0.5,
    active: true,
    regulatoryBase: "Res. UIF 194/2023 - Anexo Sector Juegos de Azar",
    lastUpdated: "2026-02-12"
  },
  {
    id: "prod-02",
    category: "PRODUCTO",
    code: "PROD-02",
    name: "M\xE1quinas Tragamonedas (Slots) con Sistema TITO y Billeteros Electr\xF3nicos",
    description: "Juegos mec\xE1nicos/electr\xF3nicos con trazabilidad de tickets TITO y lectura en l\xEDnea por sistema central IAFAS.",
    subgroup: "Casino Presencial",
    score: 2,
    riskLevel: "BAJO",
    mitigationFactor: 0.8,
    active: true,
    regulatoryBase: "Reglamento T\xE9cnico de Salas y Monitoreo Online IAFAS",
    lastUpdated: "2026-02-12"
  },
  {
    id: "prod-03",
    category: "PRODUCTO",
    code: "PROD-03",
    name: "Juegos Poceados Tradicionales (Quini 6, Brinco, Telekino, Loto)",
    description: "Juegos de sorteo con premios acumulados de gran envergadura y cobro centralizado en sede IAFAS.",
    subgroup: "Loter\xEDa y Poceados",
    score: 3,
    riskLevel: "MEDIO",
    mitigationFactor: 0.7,
    active: true,
    regulatoryBase: "Res. UIF 194/2023 - Art. 19 (Premios Relevantes)",
    lastUpdated: "2026-01-30"
  },
  {
    id: "prod-04",
    category: "PRODUCTO",
    code: "PROD-04",
    name: "Quiniela de Entre R\xEDos y T\xF3mbola Matutina/Vespertina/Nocturna",
    description: "Juego de resoluci\xF3n diaria con apuestas de baja cuant\xEDa y pagos inmediatos en la red de agencias.",
    subgroup: "Loter\xEDa y Poceados",
    score: 1,
    riskLevel: "BAJO",
    mitigationFactor: 0.9,
    active: true,
    regulatoryBase: "Manual Operativo de Juegos de Quiniela IAFAS",
    lastUpdated: "2026-01-30"
  },
  {
    id: "prod-05",
    category: "PRODUCTO",
    code: "PROD-05",
    name: "Plataforma de Juego Online (iGaming, Casino Virtual y Apuestas Deportivas)",
    description: "Cuentas virtuales con dep\xF3sitos remotos, m\xFAltiples m\xE9todos de pago digitales y trazabilidad de IP/geolocalizaci\xF3n.",
    subgroup: "Juego Online",
    score: 3,
    riskLevel: "MEDIO",
    mitigationFactor: 0.6,
    active: true,
    regulatoryBase: "Reglamento IAFAS de Juego en L\xEDnea y Prevenci\xF3n LA/FT",
    lastUpdated: "2026-02-18"
  },
  {
    id: "prod-06",
    category: "PRODUCTO",
    code: "PROD-06",
    name: "Cobro de Premios Mayores con Transferencia Bancaria Directa",
    description: "Premios que superan el umbral UIF liquidados exclusivamente mediante transferencia bancaria a cuenta propia verificada del ganador.",
    subgroup: "Liquidaci\xF3n de Premios",
    score: 2,
    riskLevel: "BAJO",
    mitigationFactor: 0.85,
    active: true,
    regulatoryBase: "Circular DGC-IAFAS 04/2024 - Medios de Pago",
    lastUpdated: "2026-02-05"
  },
  // --- FACTOR CANALES (CAN) ---
  {
    id: "can-01",
    category: "CANAL",
    code: "CAN-01",
    name: "Salas de Casino Oficiales Principales (Casino Mayor Paran\xE1, Concordia, Gualeguaych\xFA)",
    description: "Complejos de gran afluencia de p\xFAblico con cajas de cambio de valores, mesas vivas y vigilancia CCTV 24hs.",
    subgroup: "Casinos F\xEDsicos",
    score: 3,
    riskLevel: "MEDIO",
    mitigationFactor: 0.7,
    active: true,
    regulatoryBase: "Protocolo de Seguridad y Control de Cajas IAFAS",
    lastUpdated: "2026-02-14"
  },
  {
    id: "can-02",
    category: "CANAL",
    code: "CAN-02",
    name: "Salas de Entretenimiento y Slots Departamentales (Col\xF3n, Federaci\xF3n, Victoria, La Paz, Villaguay)",
    description: "Salas orientadas a slots con sistema de pago electr\xF3nico y menor rotaci\xF3n de juego vivo.",
    subgroup: "Casinos F\xEDsicos",
    score: 2,
    riskLevel: "BAJO",
    mitigationFactor: 0.8,
    active: true,
    regulatoryBase: "Estructura de Salas IAFAS Entre R\xEDos",
    lastUpdated: "2026-02-14"
  },
  {
    id: "can-03",
    category: "CANAL",
    code: "CAN-03",
    name: "Red de Agencias Oficiales IAFAS (Con Terminal en L\xEDnea)",
    description: "Red comercial de m\xE1s de 900 agencieros oficiales debidamente registrados y capacitados en PLA/FT.",
    subgroup: "Red de Agencias",
    score: 1,
    riskLevel: "BAJO",
    mitigationFactor: 0.9,
    active: true,
    regulatoryBase: "Reglamento de Agentes Oficiales IAFAS",
    lastUpdated: "2026-01-15"
  },
  {
    id: "can-04",
    category: "CANAL",
    code: "CAN-04",
    name: "Puntos de Venta M\xF3viles / Subagencias Temporarias de Eventos",
    description: "Comercializaci\xF3n de billetes o t\xF3mbola en fiestas provinciales y eventos masivos con menor control de caja.",
    subgroup: "Red de Agencias",
    score: 3,
    riskLevel: "MEDIO",
    mitigationFactor: 0.6,
    active: true,
    regulatoryBase: "Norma Transitoria de Comercializaci\xF3n IAFAS",
    lastUpdated: "2026-01-15"
  },
  {
    id: "can-05",
    category: "CANAL",
    code: "CAN-05",
    name: "Plataforma Digital Oficial (Web & App M\xF3vil Homologada)",
    description: "Canal digital con validaci\xF3n de identidad biom\xE9trica (ReNaPer) y fondos asociados a CBU/CVU bancario.",
    subgroup: "Canal Digital",
    score: 2,
    riskLevel: "BAJO",
    mitigationFactor: 0.75,
    active: true,
    regulatoryBase: "Est\xE1ndar de Seguridad Digital IAFAS - Nivel 3",
    lastUpdated: "2026-02-20"
  },
  // --- FACTOR GEOGRAFIA (GEO) ---
  {
    id: "geo-01",
    category: "GEOGRAFIA",
    code: "GEO-01",
    name: "Zona Metropolitana y Departamentos Centrales (Paran\xE1, Villaguay, Tala, Nogoy\xE1)",
    description: "Ciudades administrativas con baja incidencia de cruce fronterizo directo y alta presencia institucional.",
    subgroup: "Jurisdicci\xF3n Provincial",
    score: 1,
    riskLevel: "BAJO",
    mitigationFactor: 0.9,
    active: true,
    regulatoryBase: "Mapa de Riesgo Geogr\xE1fico PLA/FT Entre R\xEDos",
    lastUpdated: "2026-02-01"
  },
  {
    id: "geo-02",
    category: "GEOGRAFIA",
    code: "GEO-02",
    name: "Zona Fronteriza Internacional Costa del R\xEDo Uruguay (Concordia, Col\xF3n, Gualeguaych\xFA)",
    description: "Departamentos con pasos fronterizos internacionales (Puente Salto Grande, Puente Gral. Artigas, Puente Gral. San Mart\xEDn) con alto flujo binacional de divisas.",
    subgroup: "Zonas Fronterizas",
    score: 4,
    riskLevel: "ALTO",
    mitigationFactor: 0.5,
    active: true,
    regulatoryBase: "Res. UIF 194/2023 - Art. 17 (Factores Geogr\xE1ficos de Riesgo)",
    lastUpdated: "2026-02-01"
  },
  {
    id: "geo-03",
    category: "GEOGRAFIA",
    code: "GEO-03",
    name: "Departamentos Ribere\xF1os y Puertos Fluviales (Victoria, La Paz, Diamante, Ibicuy)",
    description: "Zonas portuarias de hidrov\xEDa Paran\xE1 con circulaci\xF3n de turismo interprovincial (Rosario / Buenos Aires).",
    subgroup: "Jurisdicci\xF3n Provincial",
    score: 2,
    riskLevel: "BAJO",
    mitigationFactor: 0.8,
    active: true,
    regulatoryBase: "Evaluaci\xF3n Nacional de Riesgos de LA/FT Argentina",
    lastUpdated: "2026-01-20"
  },
  {
    id: "geo-04",
    category: "GEOGRAFIA",
    code: "GEO-04",
    name: "Clientes no Residentes / Extranjeros de Jurisdicciones No Cooperantes (GAFI)",
    description: "Apostadores domiciliados en pa\xEDses con deficiencias estrat\xE9gicas de PLA/FT seg\xFAn listas de GAFI/FATF.",
    subgroup: "Internacional / No Residentes",
    score: 5,
    riskLevel: "CRITICO",
    mitigationFactor: 0.2,
    active: true,
    regulatoryBase: "Listas GAFI de Jurisdicciones de Alto Riesgo",
    lastUpdated: "2026-02-10"
  },
  // --- FACTOR OPERACIONAL (OPER) ---
  {
    id: "oper-01",
    category: "OPERACIONAL",
    code: "OPER-01",
    name: "Operaciones por Debajo de los Umbrales de Identificaci\xF3n UIF",
    description: "Apuestas o cobros menores al l\xEDmite fijado por la UIF, sin indicios de fraccionamiento.",
    subgroup: "Cuant\xEDa y Umbrales",
    score: 1,
    riskLevel: "BAJO",
    mitigationFactor: 0.95,
    active: true,
    regulatoryBase: "Res. UIF 194/2023 - Art. 10",
    lastUpdated: "2026-02-22"
  },
  {
    id: "oper-02",
    category: "OPERACIONAL",
    code: "OPER-02",
    name: "Operaciones que Superan el Umbral de Identificaci\xF3n Obligatoria UIF",
    description: "Montos individuales o acumulados en 30 d\xEDas que exigen registro formal de DNI/CUIT y datos de contacto.",
    subgroup: "Cuant\xEDa y Umbrales",
    score: 3,
    riskLevel: "MEDIO",
    mitigationFactor: 0.7,
    active: true,
    regulatoryBase: "Res. UIF 194/2023 - Art. 11",
    lastUpdated: "2026-02-22"
  },
  {
    id: "oper-03",
    category: "OPERACIONAL",
    code: "OPER-03",
    name: "Operaciones que Superan el Umbral de Declaraci\xF3n Jurada de Origen de Fondos (DJOF)",
    description: "Montos que requieren presentaci\xF3n obligatoria de DDJJ de origen l\xEDcito y documentaci\xF3n contable respaldatoria.",
    subgroup: "Cuant\xEDa y Umbrales",
    score: 4,
    riskLevel: "ALTO",
    mitigationFactor: 0.45,
    active: true,
    regulatoryBase: "Res. UIF 194/2023 - Art. 18 (Justificaci\xF3n de Fondos)",
    lastUpdated: "2026-02-22"
  },
  {
    id: "oper-04",
    category: "OPERACIONAL",
    code: "OPER-04",
    name: "Patr\xF3n de Operaciones Fraccionadas o Estructuraci\xF3n (Smurfing)",
    description: "M\xFAltiples apuestas o cobros de montos inmediatamente inferiores al umbral en un lapso corto de tiempo en la misma sala o agencia.",
    subgroup: "Patr\xF3n de Conducta",
    score: 5,
    riskLevel: "CRITICO",
    mitigationFactor: 0.25,
    active: true,
    regulatoryBase: "Gu\xEDa de Se\xF1ales de Alerta UIF para Juegos de Azar",
    lastUpdated: "2026-02-20"
  },
  {
    id: "oper-05",
    category: "OPERACIONAL",
    code: "OPER-05",
    name: "Cobro Reiterado de Premios por un Mismo Apostador en M\xFAltiples Agencias",
    description: "Apostador que registra m\xE1s de 3 cobros de premios relevantes en diferentes puntos de la provincia en menos de 15 d\xEDas.",
    subgroup: "Patr\xF3n de Conducta",
    score: 4,
    riskLevel: "ALTO",
    mitigationFactor: 0.4,
    active: true,
    regulatoryBase: "Alerta Temprana Sistema Centralizado IAFAS",
    lastUpdated: "2026-02-20"
  }
];
var LEGACY_REGULATORY_THRESHOLDS = [
  {
    id: "thresh-01",
    code: "UMB-ID-01",
    title: "Umbral de Identificaci\xF3n Obligatoria de Apostadores / Ganadores",
    description: "Monto a partir del cual el sujeto obligado (IAFAS) debe requerir identificaci\xF3n fehaciente (DNI, CUIT, Domicilio, Ocupaci\xF3n).",
    amountARS: 285e4,
    periodicity: "POR_OPERACION",
    actionRequired: "Carga obligatoria de datos en Sistema de Control PLA/FT y verificaci\xF3n en listas restrictivas.",
    regulationSource: "Resoluci\xF3n UIF N\xB0 194/2023 - Art. 11",
    lastUpdated: "2026-01-15"
  },
  {
    id: "thresh-02",
    code: "UMB-DJOF-02",
    title: "Umbral para Declaraci\xF3n Jurada de Origen y Licitud de Fondos (DJOF)",
    description: "Monto acumulado o individual que exige la firma de la Declaraci\xF3n Jurada de Origen y Licitud de Fondos con respaldo documental.",
    amountARS: 85e5,
    periodicity: "MENSUAL_ACUMULADO",
    actionRequired: "Solicitar DJOF firmada + Certificaci\xF3n de Ingresos emitida por Contador P\xFAblico o recibos de sueldo / DDJJ Ganancias.",
    regulationSource: "Resoluci\xF3n UIF N\xB0 194/2023 - Art. 18",
    lastUpdated: "2026-01-15"
  },
  {
    id: "thresh-03",
    code: "UMB-ROS-03",
    title: "Umbral de Alerta Autom\xE1tica para Oficial de Cumplimiento",
    description: "Monto extraordinario que dispara notificaci\xF3n inmediata al Oficial de Cumplimiento y an\xE1lisis de debida diligencia reforzada.",
    amountARS: 22e6,
    periodicity: "POR_OPERACION",
    actionRequired: "Apertura inmediata de expediente de an\xE1lisis de riesgo PLA/FT y eventual emisi\xF3n de Reporte de Operaci\xF3n Sospechosa (ROS).",
    regulationSource: "Manual de Prevenci\xF3n LA/FT IAFAS - Procedimiento 07",
    lastUpdated: "2026-02-01"
  },
  {
    id: "thresh-04",
    code: "UMB-AGENCIA-04",
    title: "L\xEDmite M\xE1ximo de Pago en Efectivo por Agencia Oficial",
    description: "L\xEDmite dinerario que una agencia puede pagar en efectivo; todo excedente debe liquidarse por transferencia bancaria en IAFAS Central o Delegaciones.",
    amountARS: 12e5,
    periodicity: "POR_OPERACION",
    actionRequired: "Emisi\xF3n de cheque no a la orden o transferencia bancaria directa a CBU del apostador.",
    regulationSource: "Circular DGC-IAFAS N\xB0 12/2024",
    lastUpdated: "2026-01-02"
  }
];
var simplified = simplifyRiskConfiguration({ criteria: LEGACY_RISK_CRITERIA, factorWeights: LEGACY_FACTOR_WEIGHTS, thresholds: LEGACY_REGULATORY_THRESHOLDS });
var INITIAL_RISK_CRITERIA = simplified.criteria;
var INITIAL_FACTOR_WEIGHTS = simplified.factorWeights;
var INITIAL_REGULATORY_THRESHOLDS = simplified.thresholds;

// app/api/data/route.ts
var dynamic = "force-dynamic";
var subjectTypes2 = ["PERSONA_FISICA", "PERSONA_JURIDICA", "AGENCIA"];
var statusValues = ["PENDIENTE", "EN_ANALISIS", "JUSTIFICADO", "ALERTA_EMITIDA", "REPORTE_ROS"];
function json(body, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
function owner(req) {
  const id = req.headers.get("oai-authenticated-user-id");
  if (!id) throw new Error("UNAUTHORIZED");
  return id;
}
function writeOwner(req) {
  const id = owner(req);
  const origin2 = req.headers.get("Origin");
  if (origin2 && origin2 !== new URL(req.url).origin) throw new Error("FORBIDDEN");
  return id;
}
function handleError(e) {
  if (e instanceof SyntaxError) return json({ error: "El contenido no es JSON v\xE1lido." }, 400);
  if (e instanceof z3.ZodError) return json({ error: e.issues[0]?.message || "Datos inv\xE1lidos." }, 400);
  if (e instanceof Error && e.message === "UNAUTHORIZED") return json({ error: "Inici\xE1 sesi\xF3n para acceder a los datos." }, 401);
  if (e instanceof Error && e.message === "FORBIDDEN") return json({ error: "Operaci\xF3n no autorizada." }, 403);
  return json({ error: "No se pudo completar la operaci\xF3n en la base de datos. Intent\xE1 nuevamente." }, 500);
}
var defaultConfig = { criteria: INITIAL_RISK_CRITERIA, factorWeights: INITIAL_FACTOR_WEIGHTS, thresholds: INITIAL_REGULATORY_THRESHOLDS };
async function configFor(ownerId) {
  const db = getDb();
  const [config] = await db.select().from(settings).where(eq2(settings.ownerId, ownerId));
  return simplifyRiskConfiguration(config || defaultConfig);
}
async function GET(req) {
  try {
    const user = await access(req), ownerId = user.ownerId, db = getDb(), url = new URL(req.url);
    if (url.searchParams.get("kind") === "subjects") {
      if (!can(user, "sujetos") && !can(user, "expedientes", true)) throw new Error("FORBIDDEN");
      const query = (url.searchParams.get("q") || "").trim().slice(0, 100).replace(/[%_]/g, "");
      if (query.length < 2) return json({ subjects: [] });
      const digits = query.replace(/\D/g, "");
      const normalize = (v) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const people2 = await db.select().from(subjects).where(eq2(subjects.ownerId, ownerId));
      const matches = people2.filter((p) => normalize(p.subjectName).includes(normalize(query)) || !!digits && p.documentKey.includes(digits)).slice(0, 30);
      return json({ subjects: matches });
    }
    const [config, people, rows] = await Promise.all([configFor(ownerId), db.select().from(subjects).where(eq2(subjects.ownerId, ownerId)).orderBy(desc(subjects.updatedAt)), db.select().from(evaluations).where(eq2(evaluations.ownerId, ownerId)).orderBy(desc(evaluations.createdAt))]);
    const [org] = await db.select().from(organizationSettings).where(eq2(organizationSettings.ownerId, ownerId));
    const records = rows.map((r) => r.record);
    const dashboard = can(user, "dashboard") ? { subjects: people.length, total: records.length, pending: records.filter((r) => r.status === "PENDIENTE").length, inAnalysis: records.filter((r) => r.status === "EN_ANALISIS").length, closed: records.filter((r) => r.status === "JUSTIFICADO").length, ros: records.filter((r) => r.status === "REPORTE_ROS").length, risk: Object.fromEntries(["BAJO", "MEDIO", "ALTO", "CRITICO"].map((k) => [k, records.filter((r) => r.riskLevel === k).length])) } : null;
    return json({ ...config, user, dashboard, organization: { ...org?.organization || DEFAULT_ORGANIZATION, operationTypes: operationTypesFor(org?.organization) }, operationTypesVersion: await operationTypesVersion(operationTypesFor(org?.organization)), subjects: can(user, "sujetos") || can(user, "expedientes", true) ? people : [], records: can(user, "expedientes") ? records.map((r) => can(user, "analisis") ? r : { ...r, analysis: void 0, analysisHistory: void 0 }) : [] });
  } catch (e) {
    return handleError(e);
  }
}
async function POST(req) {
  try {
    writeOwner(req);
    const user = await access(req), ownerId = user.ownerId, db = getDb();
    const { action, payload } = z3.object({ action: z3.string(), payload: z3.record(z3.string(), z3.unknown()) }).parse(await req.json());
    const required = { saveOrganization: "ajustes", saveOperationTypes: "ajustes", previewOperationsImport: "expedientes", importOperations: "expedientes", saveSubject: "sujetos", saveEvaluation: "expedientes", reviewCase: "analisis", updateStatus: "analisis", saveSettings: "riesgo", deleteCriterion: "riesgo", importLocal: "expedientes" };
    if (!required[action]) return json({ error: "Operaci\xF3n desconocida." }, 400);
    requireModule(user, required[action], true);
    if (action === "importLocal") {
      requireModule(user, "sujetos", true);
      requireModule(user, "riesgo", true);
    }
    if (action === "reviewCase" || action === "updateStatus") requireModule(user, "expedientes");
    if (action === "saveOperationTypes") {
      const input = z3.object({ version: z3.string(), types: z3.array(z3.object({ code: z3.string().regex(/^[A-Z][A-Z0-9_]{1,79}$/), name: z3.string().trim().min(2).max(120), active: z3.boolean(), uifScope: z3.enum(["PISO", "SIEMPRE", "NO_APLICA"]), productCriterionId: z3.string().optional() })).min(1).max(100) }).parse(payload);
      if (new Set(input.types.map((t) => t.code)).size !== input.types.length) return json({ error: "Hay c\xF3digos de operaci\xF3n repetidos." }, 400);
      if (!input.types.some((t) => t.active)) return json({ error: "Debe quedar al menos un tipo activo." }, 400);
      const [org] = await db.select().from(organizationSettings).where(eq2(organizationSettings.ownerId, ownerId));
      const current = operationTypesFor(org?.organization);
      if (await operationTypesVersion(current) !== input.version) return json({ error: "Los tipos cambiaron. Actualiz\xE1 la p\xE1gina antes de guardar." }, 409);
      const config = await configFor(ownerId);
      if (input.types.some((t) => t.productCriterionId && !config.criteria.some((c) => c.id === t.productCriterionId && c.active && !c.deletedAt && c.category === "PRODUCTO"))) return json({ error: "El producto predeterminado no est\xE1 activo." }, 400);
      const types = [...input.types, ...current.filter((t) => !input.types.some((n) => n.code === t.code)).map((t) => ({ ...t, active: false }))];
      if (types.length > 100) return json({ error: "El cat\xE1logo admite hasta 100 tipos, incluidos los retirados." }, 400);
      const organization = { ...org?.organization || DEFAULT_ORGANIZATION, operationTypes: types }, now = (/* @__PURE__ */ new Date()).toISOString();
      await db.insert(organizationSettings).values({ ownerId, organization, updatedAt: now }).onConflictDoUpdate({ target: organizationSettings.ownerId, set: { organization, updatedAt: now } });
      return json({ organization, operationTypesVersion: await operationTypesVersion(types) });
    }
    if (action === "previewOperationsImport" || action === "importOperations") {
      requireModule(user, "sujetos", true);
      requireModule(user, "ajustes", true);
      const [config, people, rows, orgs] = await Promise.all([configFor(ownerId), db.select().from(subjects).where(eq2(subjects.ownerId, ownerId)), db.select().from(evaluations).where(eq2(evaluations.ownerId, ownerId)), db.select().from(organizationSettings).where(eq2(organizationSettings.ownerId, ownerId))]);
      const plan = await prepareOperationsImport(payload.rows, ownerId, people, rows.map((r) => r.record), config, operationTypesFor(orgs[0]?.organization), user);
      if (action === "previewOperationsImport") return json(plan.result);
      if (payload.confirmed !== true) return json({ error: "Confirm\xE1 la revisi\xF3n de los sujetos y operaciones antes de importar." }, 400);
      if (plan.result.errors) return json({ error: "Correg\xED todas las filas con errores antes de importar.", preview: plan.result }, 400);
      if (plan.result.newCount && payload.fingerprint !== plan.result.fingerprint) return json({ error: "Los datos, par\xE1metros o sujetos cambiaron. Gener\xE1 una nueva vista previa." }, 409);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const inserts = [...plan.newSubjects.map((person) => db.insert(subjects).values({ ...person, ownerId, documentKey: person.taxId.replace(/\D/g, ""), pepDetails: person.pepDetails || "", createdAt: person.updatedAt || now, updatedAt: person.updatedAt || now })), ...plan.records.map((record) => db.insert(evaluations).values({ id: record.id, ownerId, subjectId: record.subjectId, createdAt: now, record }))];
      if (inserts.length) await db.batch(inserts);
      return json({ imported: plan.records.length, subjectsCreated: plan.newSubjects.length, skipped: plan.result.skipped });
    }
    if (action === "saveOrganization") {
      const organization = z3.object({ shortName: z3.string().trim().min(2).max(40), legalName: z3.string().trim().min(2).max(200), area: z3.string().trim().min(2).max(120), taxId: z3.string().trim().max(30), address: z3.string().trim().max(500), email: z3.union([z3.literal(""), z3.string().trim().email().max(254)]), phone: z3.string().trim().max(50), website: z3.union([z3.literal(""), z3.string().url().max(300).refine((v) => /^https?:\/\//.test(v), { message: "Us\xE1 una direcci\xF3n web http o https." })]), logo: z3.string().max(28e4).refine((v) => !v || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(v), { message: "Us\xE1 un logo PNG, JPG o WebP de hasta 200 KB." }) }).parse(payload);
      if (organization.logo) {
        const [prefix, encoded] = organization.logo.split(",");
        const bytes = atob(encoded);
        const valid = prefix.includes("image/png") ? bytes.startsWith("\x89PNG\r\n\n") : prefix.includes("image/jpeg") ? bytes.startsWith("\xFF\xD8\xFF") : bytes.startsWith("RIFF") && bytes.slice(8, 12) === "WEBP";
        if (!valid || bytes.length > 2e5) return json({ error: "El archivo del logo no es v\xE1lido o supera 200 KB." }, 400);
      }
      const [previousOrg] = await db.select().from(organizationSettings).where(eq2(organizationSettings.ownerId, ownerId));
      const savedOrganization = { ...organization, operationTypes: operationTypesFor(previousOrg?.organization) };
      await db.insert(organizationSettings).values({ ownerId, organization: savedOrganization, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }).onConflictDoUpdate({ target: organizationSettings.ownerId, set: { organization: savedOrganization, updatedAt: (/* @__PURE__ */ new Date()).toISOString() } });
      return json({ organization: savedOrganization });
    }
    if (action === "saveSubject") {
      const input = subjectSchema.parse(payload), documentKey = input.taxId.replace(/\D/g, ""), now = (/* @__PURE__ */ new Date()).toISOString();
      const [old] = await db.select().from(subjects).where(and2(eq2(subjects.ownerId, ownerId), eq2(subjects.documentKey, documentKey)));
      if (old && old.id !== input.id) return json({ error: "Ya existe un sujeto con ese documento. Seleccion\xE1 su ficha para editarlo." }, 409);
      if (input.id && (!old || old.id !== input.id)) return json({ error: "No se encontr\xF3 la ficha o cambi\xF3 su documento." }, 409);
      if (old && input.updatedAt && old.updatedAt !== input.updatedAt) return json({ error: "La ficha cambi\xF3. Actualizala antes de editarla." }, 409);
      const config = await configFor(ownerId);
      if (input.clientCriteriaIds.some((id) => !config.criteria.some((c) => c.id === id && c.active && c.category === "CLIENTE"))) return json({ error: "Revis\xE1 los criterios personales de la ficha." }, 400);
      const subject = { ...input, id: old?.id || crypto.randomUUID(), ownerId, documentKey, pepDetails: input.pepDetails || "", createdAt: old?.createdAt || now, updatedAt: old ? new Date(Math.max(Date.now(), Date.parse(old.updatedAt) + 1)).toISOString() : now };
      try {
        if (old) {
          const changed = await db.update(subjects).set(subject).where(and2(eq2(subjects.id, old.id), eq2(subjects.ownerId, ownerId), eq2(subjects.updatedAt, old.updatedAt))).returning({ id: subjects.id });
          if (!changed.length) return json({ error: "Otra edici\xF3n se guard\xF3 primero. Actualiz\xE1 la ficha." }, 409);
        } else await db.insert(subjects).values(subject);
      } catch (e) {
        if (String(e).includes("UNIQUE")) return json({ error: "El documento ya est\xE1 registrado. Busc\xE1 su ficha." }, 409);
        throw e;
      }
      return json({ subject }, old ? 200 : 201);
    }
    if (action === "saveEvaluation") {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const requestedId = typeof payload.subjectId === "string" ? payload.subjectId : void 0;
      if (!requestedId) return json({ error: "Primero registr\xE1 y seleccion\xE1 al sujeto. Los datos personales se cargan en su ficha." }, 400);
      const [person] = await db.select().from(subjects).where(and2(eq2(subjects.ownerId, ownerId), eq2(subjects.id, requestedId)));
      if (!person) return json({ error: "No se encontr\xF3 el sujeto. Busc\xE1 su ficha antes de cargar la operaci\xF3n." }, 404);
      const requestId = payload.requestId ? z3.string().uuid().parse(payload.requestId) : crypto.randomUUID();
      const submitted = recordSchema.extend({ operationAt: z3.string().datetime() }).parse(payload.record);
      const fingerprint = JSON.stringify({ ...submitted, selectedCriteriaIds: [...new Set(submitted.selectedCriteriaIds)].sort() });
      const [previous] = await db.select().from(evaluations).where(and2(eq2(evaluations.ownerId, ownerId), eq2(evaluations.id, requestId)));
      if (previous) {
        if (previous.subjectId !== person.id || previous.record.requestFingerprint !== fingerprint) return json({ error: "El identificador ya se us\xF3 con otros datos." }, 409);
        return json({ record: previous.record, subject: person });
      }
      if (submitted.subjectUpdatedAt && person.updatedAt !== submitted.subjectUpdatedAt) return json({ error: "La ficha cambi\xF3. Seleccionala nuevamente y confirm\xE1 la condici\xF3n." }, 409);
      const input = operationSchema.parse({ ...payload.record, pepStatus: person.pepStatus, pepDetails: person.pepDetails, activityAtOperation: person.activity });
      const subjectId = person.id;
      const config = await configFor(ownerId);
      const [org] = await db.select().from(organizationSettings).where(eq2(organizationSettings.ownerId, ownerId));
      const type = operationTypesFor(org?.organization).find((t) => t.code === input.operationType && t.active);
      if (!type) return json({ error: "El tipo de operaci\xF3n no est\xE1 activo. Actualiz\xE1 la p\xE1gina." }, 409);
      let record;
      try {
        record = buildEvaluationRecord(input, person, config, type, { id: requestId, now, evaluator: user.email, role: user.role, fingerprint });
      } catch (e) {
        return json({ error: e.message }, 409);
      }
      const id = requestId;
      const operation = db.insert(evaluations).values({ id, ownerId, subjectId, createdAt: now, record });
      try {
        await operation;
      } catch (e) {
        if (String(e).includes("UNIQUE")) return json({ error: "Ese sujeto ya fue registrado. Buscalo y vincul\xE1 la operaci\xF3n a su ficha." }, 409);
        throw e;
      }
      return json({ record, subject: person }, 201);
    }
    if (action === "reviewCase") {
      const input = z3.object({ id: z3.string(), version: z3.number().int().nonnegative(), action: z3.enum(["SEGUIMIENTO", "CERRAR_JUSTIFICADA", "DETERMINAR_SOSPECHOSA", "REGISTRAR_ROS"]), classification: z3.enum(["EN_REVISION", "SIN_INUSUALIDAD", "INUSUAL", "SOSPECHOSA"]), alertOrigin: z3.string().trim().min(2).max(1e3), unusualType: z3.string().max(4e3), profileSummary: z3.string().max(4e3).default(""), documentationRequested: z3.string().max(4e3), documentationReviewed: z3.string().max(4e3), fundsAssessment: z3.string().max(4e3).default(""), beneficialOwner: z3.string().max(2e3), reasoning: z3.string().trim().min(10).max(6e3), rosReference: z3.string().max(500), rosSubmittedAt: z3.string().max(50) }).parse(payload);
      const [row] = await db.select().from(evaluations).where(and2(eq2(evaluations.ownerId, ownerId), eq2(evaluations.id, input.id)));
      if (!row) return json({ error: "No se encontr\xF3 el expediente." }, 404);
      if ((row.record.analysisVersion || 0) !== input.version) return json({ error: "El expediente cambi\xF3. Actualiz\xE1 la p\xE1gina antes de guardar el an\xE1lisis." }, 409);
      if (input.action === "SEGUIMIENTO" && input.classification === "SOSPECHOSA" && row.record.analysis?.classification !== "SOSPECHOSA") return json({ error: "Us\xE1 la decisi\xF3n Determinar sospechosa para registrar esa conclusi\xF3n." }, 400);
      if ((input.classification === "INUSUAL" || input.action === "DETERMINAR_SOSPECHOSA") && input.unusualType.trim().length < 10) return json({ error: "Describ\xED la inusualidad detectada." }, 400);
      if (row.record.status === "REPORTE_ROS" && input.action !== "SEGUIMIENTO") return json({ error: "El ROS ya est\xE1 registrado. Agreg\xE1 novedades mediante seguimiento, conservando la constancia." }, 400);
      if (input.action === "CERRAR_JUSTIFICADA" && input.classification === "INUSUAL" && !input.documentationReviewed.trim()) return json({ error: "Registr\xE1 el sustento documental revisado para justificar la inusualidad." }, 400);
      if (input.action === "CERRAR_JUSTIFICADA" && input.classification === "EN_REVISION") return json({ error: "Complet\xE1 la clasificaci\xF3n antes de cerrar el an\xE1lisis." }, 400);
      if (input.action === "CERRAR_JUSTIFICADA" && input.classification === "SOSPECHOSA") return json({ error: "Revis\xE1 la clasificaci\xF3n antes de cerrar una operaci\xF3n como justificada." }, 400);
      if (input.action === "REGISTRAR_ROS" && (row.record.analysis?.classification !== "SOSPECHOSA" || !input.rosReference.trim() || !Number.isFinite(Date.parse(input.rosSubmittedAt)))) return json({ error: "Primero document\xE1 la determinaci\xF3n de sospecha. Para registrar el ROS presentado, indic\xE1 su constancia y fecha." }, 400);
      if (input.action === "REGISTRAR_ROS" && Date.parse(input.rosSubmittedAt) > Date.now()) return json({ error: "La fecha de presentaci\xF3n no puede ser futura." }, 400);
      const review = { ...input, profileSummary: row.record.analysis?.profileSummary || "", fundsAssessment: row.record.analysis?.fundsAssessment || "", classification: input.action === "DETERMINAR_SOSPECHOSA" || input.action === "REGISTRAR_ROS" || row.record.status === "REPORTE_ROS" ? "SOSPECHOSA" : input.classification, rosReference: row.record.status === "REPORTE_ROS" ? row.record.analysis?.rosReference || input.rosReference : input.rosReference, rosSubmittedAt: row.record.status === "REPORTE_ROS" ? row.record.analysis?.rosSubmittedAt || input.rosSubmittedAt : input.rosSubmittedAt, analyst: req.headers.get("oai-authenticated-user-email") || "Usuario autenticado", reviewedAt: (/* @__PURE__ */ new Date()).toISOString() };
      const record = { ...row.record, analysis: review, analysisHistory: [...row.record.analysisHistory || [], review], analysisVersion: input.version + 1, status: row.record.status === "REPORTE_ROS" ? "REPORTE_ROS" : input.action === "CERRAR_JUSTIFICADA" ? "JUSTIFICADO" : input.action === "REGISTRAR_ROS" ? "REPORTE_ROS" : "EN_ANALISIS" };
      const updated = await db.update(evaluations).set({ record }).where(and2(eq2(evaluations.ownerId, ownerId), eq2(evaluations.id, input.id), eq2(evaluations.record, row.record))).returning({ id: evaluations.id });
      if (!updated.length) return json({ error: "Otro cambio se guard\xF3 primero. Actualiz\xE1 el expediente." }, 409);
      return json({ record });
    }
    if (action === "updateStatus") {
      const input = z3.object({ id: z3.string(), status: z3.enum(statusValues) }).parse(payload);
      const [row] = await db.select().from(evaluations).where(and2(eq2(evaluations.ownerId, ownerId), eq2(evaluations.id, input.id)));
      if (!row) return json({ error: "No se encontr\xF3 el expediente." }, 404);
      if (row.record.status === "JUSTIFICADO" || row.record.status === "REPORTE_ROS") return json({ error: "Los cambios de un expediente concluido requieren an\xE1lisis documentado." }, 409);
      if (input.status === "JUSTIFICADO" || input.status === "REPORTE_ROS") return json({ error: "El cierre y el registro de ROS requieren un an\xE1lisis fundamentado." }, 400);
      const record = { ...row.record, status: input.status };
      await db.update(evaluations).set({ record }).where(and2(eq2(evaluations.ownerId, ownerId), eq2(evaluations.id, input.id)));
      return json({ record });
    }
    if (action === "deleteCriterion") {
      if (user.role !== "SUPERADMIN") throw Error("FORBIDDEN");
      const { id } = z3.object({ id: z3.string().min(1).max(200) }).parse(payload);
      const config = await configFor(ownerId), criterion = config.criteria.find((c) => c.id === id);
      if (!criterion) return json({ error: "No se encontr\xF3 el par\xE1metro." }, 404);
      if (criterion.deletedAt) return json(config);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const next = { criteria: config.criteria.map((c) => c.id === id ? { ...c, active: false, deletedAt: now, deletedBy: user.email } : c), factorWeights: config.factorWeights, thresholds: config.thresholds };
      await db.insert(settings).values({ ownerId, ...next, updatedAt: now }).onConflictDoUpdate({ target: settings.ownerId, set: { ...next, updatedAt: now } });
      return json(next);
    }
    if (action === "saveSettings") {
      const config = z3.object({ criteria: z3.array(z3.object({ id: z3.string(), deletedAt: z3.string().optional(), deletedBy: z3.string().optional(), code: z3.string(), name: z3.string(), description: z3.string(), category: z3.enum(["CLIENTE", "PRODUCTO", "CANAL", "GEOGRAFIA"]), subgroup: z3.string(), score: z3.number().min(1).max(5), riskLevel: z3.enum(["BAJO", "MEDIO", "ALTO", "CRITICO"]), mitigationFactor: z3.number().min(0).max(1), active: z3.boolean(), regulatoryBase: z3.string(), lastUpdated: z3.string() })).max(1e3), factorWeights: z3.array(z3.object({ category: z3.enum(["CLIENTE", "PRODUCTO", "CANAL", "GEOGRAFIA"]), name: z3.string(), weightPercentage: z3.number().min(0).max(100), description: z3.string(), iconName: z3.string() })).length(4), thresholds: z3.array(z3.object({ id: z3.string(), code: z3.string(), title: z3.string(), description: z3.string(), amountARS: z3.number().finite().positive(), periodicity: z3.enum(["POR_OPERACION", "MENSUAL_ACUMULADO", "ANUAL"]), actionRequired: z3.string(), regulationSource: z3.string(), lastUpdated: z3.string() })).max(100) }).parse(payload);
      if (config.thresholds.length !== 1 || config.thresholds[0].code !== UIF_FLOOR_CODE || config.thresholds[0].periodicity !== "POR_OPERACION") return json({ error: "Configur\xE1 \xFAnicamente el piso UIF por operaci\xF3n." }, 400);
      if (Math.abs(config.factorWeights.reduce((sum, w) => sum + w.weightPercentage, 0) - 100) > 0.01) return json({ error: "Las ponderaciones deben sumar 100%." }, 400);
      const unique = (v) => new Set(v).size === v.length;
      if (!unique(config.criteria.map((c) => c.id)) || !unique(config.criteria.map((c) => c.code)) || !unique(config.factorWeights.map((w) => w.category)) || !unique(config.thresholds.map((t) => t.id)) || !unique(config.thresholds.map((t) => t.code))) return json({ error: "La configuraci\xF3n contiene c\xF3digos o factores duplicados." }, 400);
      const previous = await configFor(ownerId);
      const removed = previous.criteria.filter((c) => !c.deletedAt && !config.criteria.some((n) => n.id === c.id));
      if (removed.length && user.role !== "SUPERADMIN") throw Error("FORBIDDEN");
      if (config.criteria.some((c) => c.deletedAt && !previous.criteria.find((p) => p.id === c.id)?.deletedAt)) return json({ error: "Us\xE1 la opci\xF3n Eliminar para retirar un par\xE1metro." }, 400);
      const archived = previous.criteria.filter((c) => c.deletedAt);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      config.criteria = [...config.criteria.filter((c) => !archived.some((a) => a.id === c.id)), ...archived, ...removed.map((c) => ({ ...c, active: false, deletedAt: now, deletedBy: user.email }))];
      const row = { ownerId, ...config, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
      await db.insert(settings).values(row).onConflictDoUpdate({ target: settings.ownerId, set: row });
      return json(config);
    }
    if (action === "importLocal") {
      if (user.role !== "SUPERADMIN") throw Error("FORBIDDEN");
      const records = z3.array(recordSchema.extend({ id: z3.string().max(100), timestamp: z3.string(), dossierNumber: z3.string(), evaluator: z3.string(), evaluatorRole: z3.string(), subjectName: z3.string(), taxId: z3.string(), subjectType: z3.enum(subjectTypes2), activityOcupation: z3.string(), pepStatus: z3.boolean(), weightedScore: z3.number().finite(), rawScore: z3.number().finite(), riskLevel: z3.enum(["BAJO", "MEDIO", "ALTO", "CRITICO"]), dueDiligenceLevel: z3.enum(["SIMPLIFICADA", "ESTANDAR", "REFORZADA"]), status: z3.enum(statusValues), alerts: z3.array(z3.string()), requiresDJOF: z3.boolean(), requiresDocumentation: z3.boolean() }).passthrough()).max(1e3).parse(payload.records);
      let imported = 0;
      for (const record of records) {
        if (!record.taxId.replace(/\D/g, "")) continue;
        const [already] = await db.select({ id: evaluations.id }).from(evaluations).where(and2(eq2(evaluations.ownerId, ownerId), eq2(evaluations.id, record.id)));
        if (already) continue;
        const key = record.taxId.replace(/\D/g, "");
        const [old] = await db.select().from(subjects).where(and2(eq2(subjects.ownerId, ownerId), eq2(subjects.documentKey, key)));
        const id = old?.id || crypto.randomUUID(), now = (/* @__PURE__ */ new Date()).toISOString();
        const sub = { id, ownerId, documentKey: key, taxId: record.taxId, subjectName: record.subjectName, subjectType: record.subjectType, address: record.address || "", email: record.email || "", phone: record.phone || "", activity: record.activityOcupation, pepStatus: record.pepStatus, pepDetails: record.pepDetails || "", createdAt: now, updatedAt: now };
        await db.batch([db.insert(subjects).values(sub).onConflictDoNothing(), db.insert(evaluations).values({ id: record.id, ownerId, subjectId: id, createdAt: record.timestamp, record: { ...record, subjectId: id } }).onConflictDoNothing()]);
        imported++;
      }
      return json({ imported });
    }
    return json({ error: "Operaci\xF3n desconocida." }, 400);
  } catch (e) {
    return handleError(e);
  }
}

// app/api/users/route.ts
var route_exports2 = {};
__export(route_exports2, {
  GET: () => GET2,
  POST: () => POST2,
  dynamic: () => dynamic2
});
import { eq as eq3 } from "drizzle-orm";
import { z as z4 } from "zod";
var dynamic2 = "force-dynamic";
function error(e) {
  return Response.json({ error: e instanceof z4.ZodError ? e.issues[0].message : "Acceso no autorizado." }, { status: e instanceof z4.ZodError ? 400 : e instanceof Error && e.message === "UNAUTHORIZED" ? 401 : 403 });
}
async function GET2(req) {
  try {
    const u = await access(req);
    if (u.role !== "SUPERADMIN") throw Error("FORBIDDEN");
    return Response.json({ users: await getDb().select().from(appUsers).where(eq3(appUsers.ownerId, u.ownerId)) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return error(e);
  }
}
async function POST2(req) {
  try {
    const u = await access(req);
    if (u.role !== "SUPERADMIN") throw Error("FORBIDDEN");
    if (req.headers.get("Origin") && req.headers.get("Origin") !== new URL(req.url).origin) throw Error("FORBIDDEN");
    const input = z4.object({ id: z4.string().optional(), email: z4.string().trim().email().transform((v) => v.toLowerCase()), name: z4.string().trim().min(2).max(100), role: z4.enum(["ADMIN", "ANALISTA", "OPERADOR"]), active: z4.boolean(), grants: z4.partialRecord(z4.enum(MODULES), z4.enum(["read", "write"])) }).parse(await req.json());
    if (input.grants.analisis && !input.grants.expedientes) return Response.json({ error: "El an\xE1lisis requiere acceso a Expedientes." }, { status: 400 });
    const db = getDb();
    const [existing] = await db.select().from(appUsers).where(eq3(appUsers.email, input.email));
    if (existing && (existing.ownerId !== u.ownerId || existing.role === "SUPERADMIN" || existing.id !== input.id)) throw Error("FORBIDDEN");
    if (input.id && (!existing || existing.id !== input.id)) throw Error("FORBIDDEN");
    const row = { ...input, id: existing?.id || crypto.randomUUID(), ownerId: u.ownerId, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    await db.insert(appUsers).values(row).onConflictDoUpdate({ target: appUsers.id, set: row });
    return Response.json({ user: row });
  } catch (e) {
    return error(e);
  }
}

// portable/auth.mjs
import { scrypt as callback, randomBytes, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
var scrypt = promisify(callback);
var tokenHash = (v) => createHash("sha256").update(v).digest("hex");
async function hashPassword(v) {
  if (typeof v !== "string" || v.length < 12 || v.length > 256) throw Error("Us\xE1 una contrase\xF1a de 12 a 256 caracteres.");
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${Buffer.from(await scrypt(v, salt, 64)).toString("hex")}`;
}
var dummy = await hashPassword("Fictional-not-usable-password");
async function verifyPassword(v, encoded) {
  if (typeof v !== "string" || v.length > 256) return false;
  const [salt, h] = (encoded || dummy).split(":"), actual = Buffer.from(await scrypt(v, salt, 64)), expected = Buffer.from(h, "hex");
  return !!encoded && actual.length === expected.length && timingSafeEqual(actual, expected);
}

// portable/server.mjs
var port = Number(process.env.PORT || 8094);
var base = "/gesplaft";
var origin = process.env.PUBLIC_ORIGIN;
if (!origin || new URL(origin).origin !== origin || process.env.NODE_ENV === "production" && !origin.startsWith("https://")) throw Error("PUBLIC_ORIGIN debe ser un origen HTTPS sin barra final.");
var secure = origin.startsWith("https://");
var cookieName = secure ? "__Secure-gesplaft_session" : "gesplaft_session";
var root = resolve(dirname(fileURLToPath(import.meta.url)), "../client");
var cookie = (v, clear = false) => `${cookieName}=${v}; Path=${base}; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : 28800}${secure ? "; Secure" : ""}`;
var escape = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var reply = (b, s = 200, h = {}) => new Response(b, { status: s, headers: h });
var redirect = (path, h = {}) => reply(null, 303, { Location: base + path, ...h });
async function readBody(req) {
  let n = 0, body = "";
  for await (const c of req) {
    n += c.length;
    if (n > 1048576) throw reply("Solicitud demasiado grande.", 413);
    body += c.toString();
  }
  return body;
}
function login(message = "") {
  return reply(`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GesPLAFT \xB7 Ingresar</title><style>body{background:#143b46;color:#193d47;font-family:system-ui;margin:0;display:grid;place-items:center;min-height:100vh}main{margin:20px;max-width:380px;padding:32px;background:white;border-radius:14px}label{display:block;margin:20px 0}input{display:block;width:100%;box-sizing:border-box;padding:12px;margin-top:7px;border:1px solid #b9c9ce;border-radius:6px}button{padding:12px 20px;width:100%;background:#176d70;color:white;border:0;border-radius:6px;font-size:16px}small{color:#6b7980}</style><main><small>SIGXIA \xB7 DEMO PRIVADA</small><h1>GesPLAFT</h1><p>Ingres\xE1 con una cuenta habilitada.</p>${message ? `<p role="alert">${escape(message)}</p>` : ""}<form method="post" action="${base}/auth/login"><label>Correo electr\xF3nico<input required name="email" type="email" autocomplete="username" maxlength="254"></label><label>Contrase\xF1a<input required name="password" type="password" autocomplete="current-password" maxlength="256"></label><button>Ingresar</button></form><p><small>Para acceder o restablecer tu clave, contact\xE1 al administrador.</small></p></main></html>`, 200, { "Content-Type": "text/html; charset=utf-8" });
}
async function currentUser(req) {
  const value = String(req.headers.cookie || "").split(";").map((x) => x.trim()).find((x) => x.startsWith(cookieName + "="))?.slice(cookieName.length + 1);
  if (!value || !/^[a-f0-9]{64}$/.test(value)) return null;
  const [u] = await sqlQuery("select u.* from sessions s join app_users u on u.id=s.user_id where s.token_hash=$1 and s.expires_at>now() and u.active=true", [tokenHash(value)]);
  return u || null;
}
async function route(req) {
  const url = new URL(req.url, origin), path = url.pathname;
  if (path === base) return redirect("/");
  if (!path.startsWith(base + "/")) return reply("", 404);
  if (path === base + "/api/health") {
    try {
      await sqlQuery("select 1");
      return Response.json({ ok: true, app: "gesplaft", database: "postgresql" });
    } catch {
      return Response.json({ ok: false }, { status: 503 });
    }
  }
  if (req.method === "POST" && req.headers.origin !== origin) return reply("Origen no autorizado.", 403);
  if (path === base + "/auth/login" && req.method === "POST") {
    const body = new URLSearchParams(await readBody(req)), email = (body.get("email") || "").trim().toLowerCase(), password = body.get("password") || "";
    const local = req.socket.remoteAddress || "unknown", ip = process.env.TRUST_PROXY === "1" && ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(local) ? String(req.headers["x-forwarded-for"] || local).split(",")[0].trim() : local;
    const keys = [tokenHash("ip:" + ip), tokenHash("account:" + email)];
    for (const key of keys) {
      const [a] = await sqlQuery("insert into login_attempts(attempt_key,failures,reset_at) values($1,1,now()+interval '15 minutes') on conflict(attempt_key) do update set failures=case when login_attempts.reset_at<now() then 1 else login_attempts.failures+1 end,reset_at=case when login_attempts.reset_at<now() then now()+interval '15 minutes' else login_attempts.reset_at end returning failures", [key]);
      if (a.failures > 10) return reply("Demasiados intentos. Reintent\xE1 en 15 minutos.", 429, { "Retry-After": "900" });
    }
    const [u] = await sqlQuery("select u.id,u.active,c.password_hash from app_users u left join credentials c on c.user_id=u.id where u.email=$1", [email]);
    if (!await verifyPassword(password, u?.password_hash) || !u?.active) return login("Correo o contrase\xF1a incorrectos.");
    await sqlQuery("delete from login_attempts where attempt_key=$1 or attempt_key=$2", keys);
    await sqlQuery("delete from sessions where expires_at<=now()");
    const token = randomBytes2(32).toString("hex");
    await sqlQuery("insert into sessions(token_hash,user_id,expires_at) values($1,$2,now()+interval '8 hours')", [tokenHash(token), u.id]);
    return redirect("/", { "Set-Cookie": cookie(token) });
  }
  if ([base + "/login", base + "/signin-with-chatgpt"].includes(path) && req.method === "GET") return login();
  const user = await currentUser(req);
  if (path === base + "/signout-with-chatgpt") {
    if (req.method === "GET") return reply(`<html lang="es"><meta charset="utf-8"><form method="post" action="${base}/signout-with-chatgpt"><button>Cerrar sesi\xF3n</button></form></html>`, 200, { "Content-Type": "text/html; charset=utf-8" });
    if (req.method !== "POST") return reply("", 405);
    if (user) await sqlQuery("delete from sessions where user_id=$1", [user.id]);
    return redirect("/login", { "Set-Cookie": cookie("", true) });
  }
  if (path.startsWith(base + "/api/")) {
    if (!user) return Response.json({ error: "Inici\xE1 sesi\xF3n para acceder a los datos." }, { status: 401 });
    if (path === base + "/api/users/password" && req.method === "POST") {
      if (user.role !== "SUPERADMIN") return Response.json({ error: "Acceso no autorizado." }, { status: 403 });
      let input;
      try {
        input = JSON.parse(await readBody(req));
      } catch {
        return Response.json({ error: "Contenido inv\xE1lido." }, { status: 400 });
      }
      const [target] = await sqlQuery("select id from app_users where id=$1 and owner_id=$2", [input.id, user.owner_id]);
      if (!target) return Response.json({ error: "Usuario no encontrado." }, { status: 404 });
      let hash;
      try {
        hash = await hashPassword(input.password);
      } catch (e) {
        return Response.json({ error: e.message }, { status: 400 });
      }
      return withWriteTransaction(async () => {
        await sqlQuery("insert into credentials(user_id,password_hash) values($1,$2) on conflict(user_id) do update set password_hash=excluded.password_hash,updated_at=now()", [target.id, hash]);
        await sqlQuery("delete from sessions where user_id=$1", [target.id]);
        return Response.json({ ok: true });
      });
    }
    const routes = path === base + "/api/data" ? route_exports : path === base + "/api/users" ? route_exports2 : null;
    if (!routes || !["GET", "POST"].includes(req.method)) return reply("", 404);
    const headers = new Headers({ "oai-authenticated-user-id": user.id, "oai-authenticated-user-email": user.email });
    if (req.method === "POST") {
      headers.set("Content-Type", "application/json");
      headers.set("Origin", origin);
    }
    const request = new Request(origin + req.url, { method: req.method, headers, ...req.method === "POST" ? { body: await readBody(req) } : {} });
    return req.method === "POST" ? withWriteTransaction(() => routes.POST(request)) : routes.GET(request);
  }
  if (!["GET", "HEAD"].includes(req.method)) return reply("", 405);
  if (path === base + "/" && !user) return redirect("/login");
  const file = resolve(root, decodeURIComponent(path.slice(base.length + 1)) || "index.html");
  if (file !== root && !file.startsWith(root + "/")) return reply("", 404);
  try {
    if (!(await stat(file)).isFile()) return reply("", 404);
    const bytes = await readFile(file), mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2" }[extname(file)] || "application/octet-stream";
    return reply(req.method === "HEAD" ? null : bytes, 200, { "Content-Type": mime, ...path.includes("/assets/") ? { "Cache-Control": "public, max-age=31536000, immutable" } : {} });
  } catch {
    return reply("", 404);
  }
}
var server = createServer(async (req, res) => {
  let output;
  try {
    output = await route(req);
  } catch (e) {
    if (e instanceof Response) output = e;
    else {
      console.error("Error de solicitud GesPLAFT:", e?.code || e?.name || "Error");
      output = Response.json({ error: "No se pudo completar la solicitud." }, { status: 500 });
    }
  }
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  output.headers.forEach((v, k) => res.setHeader(k, v));
  res.writeHead(output.status);
  res.end(Buffer.from(await output.arrayBuffer()));
});
server.listen(port, process.env.HOST || "127.0.0.1", () => console.log(`GesPLAFT disponible en 127.0.0.1:${port}${base}/`));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(async () => {
  await closeDb();
  process.exit(0);
}));
