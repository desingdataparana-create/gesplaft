import {
  __export,
  appUsers,
  evaluations,
  getDb,
  organizationSettings,
  settings,
  subjects
} from "./chunk-GOGXSPHE.mjs";

// app/api/data/route.ts
var route_exports = {};
__export(route_exports, {
  GET: () => GET,
  POST: () => POST,
  dynamic: () => dynamic
});

// app/api/data/historicalImport.ts
import { z } from "zod";

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

// src/utils/historicalImport.ts
var HISTORICAL_HEADERS = ["FECHA DE COBRO", "NOMBRE Y APELLIDO", "DNI", "CUIT/CUIL", "NACIONALIDAD", "SALA", "IMPORTE", "MEDIO DE PAGO", "PROFESION", "PEP(S/N)", "SITUACION CENTRAL DE DEUDORES BCRA", "NIVEL DE RIESGO"];

// app/api/data/historicalImport.ts
var input = z.array(z.object({ _fila: z.number().int().min(2), values: z.array(z.string().max(1e3)).length(12) }).strict()).min(1).max(200);
async function digest(v) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(v))))).map((n) => n.toString(16).padStart(2, "0")).join("");
}
function exampleSubject(p) {
  return /^0{6,10}[0-9]{1,2}$/.test(p.taxId.replace(/\D/g, "")) && /^(Sujeto de demostraci[oó]n \d+|Persona de ejemplo|Persona de importación QA)$/i.test(p.subjectName);
}
function exampleRecord(r) {
  return exampleSubject(r) && (r.evaluator === "Equipo de demostraci\xF3n" || r.importReference?.toUpperCase().startsWith("EJEMPLO-"));
}
async function prepareHistoricalImport(raw, ownerId, people, existing, actor) {
  const rows = input.parse(raw), now = (/* @__PURE__ */ new Date()).toISOString(), newSubjects = [], records = [], views = [], byDoc = new Map(people.map((p) => [p.taxId.replace(/\D/g, ""), p])), seen = /* @__PURE__ */ new Set();
  for (const row of rows) {
    const v = row.values, view = { fila: row._fila, referencia: "", sujeto: v[1], documento: v[2] || v[3], estado: "ERROR" };
    try {
      if (v[1].length < 2 || !v[5] || v[8].length < 2) throw Error("Complet\xE1 nombre, sala y profesi\xF3n.");
      if (!["SI", "NO"].includes(normalizeText(v[9]))) throw Error("PEP debe indicar SI o NO.");
      if (normalizeText(v[9]) === "SI") throw Error("El listado no informa el cargo PEP. Us\xE1 la plantilla completa para esa fila.");
      const risk = normalizeText(v[11]);
      if (!["BAJO", "MEDIO", "ALTO", "CRITICO"].includes(risk)) throw Error("El nivel de riesgo del archivo no es v\xE1lido.");
      const doc = v[2] || v[3], key = doc.replace(/\D/g, "");
      if (doc && !/^\d{7,11}$/.test(key)) throw Error("Documento inv\xE1lido.");
      const date = String(v[0]).split("T")[0];
      const operationAt = parseImportDate(date + " 00:00"), amount = parseImportAmount(v[6]);
      const ref = "HST-" + (await digest([date, key || normalizeText(v[1]), normalizeText(v[5]), amount])).slice(0, 24), hash = await digest(v);
      view.referencia = ref;
      view.importe = amount;
      view.riesgo = risk + " (origen)";
      if (seen.has(ref)) throw Error("Operaci\xF3n repetida dentro del listado.");
      seen.add(ref);
      const old = existing.find((r) => r.importReference === ref);
      if (old) {
        if (old.importRowFingerprint !== hash) throw Error("Esta operaci\xF3n ya existe con datos distintos.");
        view.estado = "YA_IMPORTADA";
        views.push(view);
        continue;
      }
      let person = key ? byDoc.get(key) : void 0;
      if (person && (normalizeText(person.subjectName) !== normalizeText(v[1]) || normalizeText(person.activity) !== normalizeText(v[8]) || person.pepStatus)) throw Error("Los datos no coinciden con la ficha existente. Revis\xE1 el sujeto.");
      if (key && !person) {
        person = { id: crypto.randomUUID(), subjectName: v[1], taxId: doc, subjectType: "PERSONA_FISICA", address: "", email: "", phone: "", activity: v[8], pepStatus: false, pepDetails: "", clientCriteriaIds: [], updatedAt: now };
        newSubjects.push(person);
        byDoc.set(key, person);
      }
      const id = crypto.randomUUID(), sourceData = Object.fromEntries(HISTORICAL_HEADERS.map((h, i) => [h, v[i]]));
      records.push({ id, subjectId: person?.id, dossierNumber: "HIST-" + date.slice(0, 4) + "-" + ref.slice(4, 12).toUpperCase(), timestamp: now, operationAt, evaluator: actor.email, evaluatorRole: actor.role, subjectName: v[1], taxId: doc, subjectType: "PERSONA_FISICA", activityOcupation: v[8], pepStatus: false, selectedCriteriaIds: [], operationType: "COBRO_PREMIO", operationTypeName: "Cobro de premio (hist\xF3rico)", amountARS: amount, locationDepartment: "Sin informar", channelName: v[5], rawScore: 0, weightedScore: 0, riskLevel: risk, dueDiligenceLevel: "ESTANDAR", status: "PENDIENTE", notes: "Importaci\xF3n hist\xF3rica. Fecha sin hora en el original. Riesgo informado por la fuente; pendiente de evaluaci\xF3n con par\xE1metros completos." + (key ? "" : " Documento pendiente de completar."), requiresDJOF: false, requiresDocumentation: false, alerts: [], analysisVersion: 0, importReference: ref, importRowFingerprint: hash, evaluationPending: true, sourceData, sourceRow: row._fila });
      view.estado = "NUEVA";
      view.alcance = key ? "Hist\xF3rico: pendiente de evaluaci\xF3n" : "Pendiente de documento y evaluaci\xF3n";
    } catch (e) {
      view.error = e.message;
    }
    views.push(view);
  }
  const fingerprint = await digest({ rows, people, existing });
  const result = { rows: views, fingerprint, newCount: records.length, subjectCount: newSubjects.length, skipped: views.filter((v) => v.estado === "YA_IMPORTADA").length, errors: views.filter((v) => v.estado === "ERROR").length };
  return { result, records, newSubjects };
}

// app/api/data/importOperations.ts
import { z as z3 } from "zod";

// src/utils/validation.ts
import { z as z2 } from "zod";
var subjectTypes = ["PERSONA_FISICA", "PERSONA_JURIDICA", "AGENCIA"];
var subjectSchema = z2.object({ id: z2.string().optional(), updatedAt: z2.string().optional(), subjectName: z2.string().trim().min(2).max(200), taxId: z2.string().trim().min(7).max(20), subjectType: z2.enum(subjectTypes), address: z2.string().trim().max(500).default(""), email: z2.union([z2.literal(""), z2.string().trim().email().max(254)]).default(""), phone: z2.string().trim().max(40).default(""), activity: z2.string().trim().min(2).max(200), pepStatus: z2.boolean(), pepDetails: z2.string().max(1e3).optional(), clientCriteriaIds: z2.array(z2.string()).max(100).default([]) }).refine((s) => /^\d{7,11}$/.test(s.taxId.replace(/\D/g, "")), { message: "Revis\xE1 el DNI/CUIT: debe tener entre 7 y 11 d\xEDgitos." }).refine((s) => !s.phone || s.phone.replace(/\D/g, "").length >= 6, { message: "Revis\xE1 el tel\xE9fono." }).refine((s) => !s.clientCriteriaIds.includes("cli-03") || s.pepStatus, { message: "Marc\xE1 la condici\xF3n PEP si seleccion\xE1s ese par\xE1metro personal." }).refine((s) => !s.pepStatus || !!s.pepDetails?.trim(), { message: "Indic\xE1 el cargo o condici\xF3n PEP en la ficha del sujeto." });
var recordSchema = z2.object({ subjectUpdatedAt: z2.string().optional(), operationType: z2.string().trim().min(1).max(80), amountARS: z2.number().finite().positive().max(1e15).multipleOf(0.01), locationDepartment: z2.string().trim().min(1).max(200), channelName: z2.string().trim().min(1).max(200), selectedCriteriaIds: z2.array(z2.string()).min(1).max(200), notes: z2.string().max(1e4) });
var operationSchema = recordSchema.extend({ operationAt: z2.string().datetime().refine((v) => Date.parse(v) <= Date.now() + 6e4, { message: "La operaci\xF3n no puede tener fecha futura." }), conditionConfirmed: z2.literal(true, { error: "Confirm\xE1 la condici\xF3n del sujeto para esta operaci\xF3n." }), pepStatus: z2.boolean(), pepDetails: z2.string().max(1e3).optional(), activityAtOperation: z2.string().trim().min(2).max(200) }).refine((r) => !r.pepStatus || !!r.pepDetails?.trim(), { message: "Indic\xE1 el cargo o condici\xF3n PEP evaluada." });

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
function buildEvaluationRecord(input2, person, config, type, meta) {
  if (type.uifScope === "PISO" && !config.thresholds.some((t) => t.code === "UMB-ID-01" && Number.isFinite(t.amountARS) && t.amountARS > 0)) throw Error("Configur\xE1 un piso UIF v\xE1lido antes de evaluar este tipo de operaci\xF3n.");
  const selectedCriteriaIds = resolveOperationCriteria(config, person, input2.selectedCriteriaIds);
  const result = calculateRisk(config.criteria, config.factorWeights, selectedCriteriaIds, person.pepStatus, input2.amountARS, config.thresholds, { operationType: type });
  return { ...input2, selectedCriteriaIds, id: meta.id, requestFingerprint: meta.fingerprint, dossierNumber: `EXP-PLA-${new Date(meta.now).getFullYear()}-${meta.id.slice(0, 8).toUpperCase()}`, timestamp: meta.now, conditionConfirmed: true, conditionReviewedAt: meta.now, evaluator: meta.evaluator, evaluatorRole: meta.role, subjectId: person.id, subjectUpdatedAt: person.updatedAt, subjectName: person.subjectName, taxId: person.taxId, subjectType: person.subjectType, address: person.address, email: person.email, phone: person.phone, activityOcupation: person.activity, activityAtOperation: person.activity, pepStatus: person.pepStatus, pepDetails: person.pepDetails, rawScore: result.rawScore, weightedScore: result.weightedScore, riskLevel: result.riskLevel, dueDiligenceLevel: result.dueDiligence, status: "PENDIENTE", requiresDJOF: result.requiresDJOF, requiresDocumentation: result.requiresDocumentation, alerts: result.alerts, analysisVersion: 0, criteriaSnapshot: config.criteria.filter((c) => selectedCriteriaIds.includes(c.id)), weightsSnapshot: config.factorWeights, thresholdsSnapshot: config.thresholds, operationTypeName: type.name, evaluationScope: result.evaluationScope, evaluationPolicyVersion: EVALUATION_POLICY_VERSION };
}

// app/api/data/importOperations.ts
var rawSchema = z3.array(z3.object(Object.fromEntries(IMPORT_HEADERS.map((h) => [h, z3.string().max(h === "notas" ? 1e4 : 1e3).optional()]))).extend({ _fila: z3.number().int().min(2).max(1e5) }).strict()).min(1).max(200);
async function digest2(value) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))).map((n) => n.toString(16).padStart(2, "0")).join("");
}
async function uuid(value) {
  const h = await digest2(value);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
async function operationTypesVersion(types) {
  return digest2(JSON.stringify(types));
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
      const rowFingerprint = await digest2(JSON.stringify(canonical));
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
      const input2 = operationSchema.parse({ operationType: type.code, operationAt: parseImportDate(row.fecha_operacion || ""), amountARS: parseImportAmount(row.importe_ars || ""), locationDepartment: row.departamento || "", channelName: row.sala || "", selectedCriteriaIds: [criterion(row.producto || type.productCriterionId || "", "PRODUCTO"), criterion(row.canal || "", "CANAL"), criterion(row.zona || "", "GEOGRAFIA")], notes: row.notas || "", conditionConfirmed: true, pepStatus: person.pepStatus, pepDetails: person.pepDetails, activityAtOperation: person.activity });
      const record = buildEvaluationRecord(input2, person, config, type, { id, now, evaluator: actor.email, role: actor.role, fingerprint: rowFingerprint });
      record.importReference = ref;
      record.importRowFingerprint = rowFingerprint;
      records.push(record);
      Object.assign(view, { estado: "NUEVA", sujeto: person.subjectName, importe: record.amountARS, riesgo: record.riskLevel, puntaje: record.weightedScore, alcance: record.evaluationScope?.reason });
    } catch (e) {
      view.error = e instanceof z3.ZodError ? e.issues[0]?.message : e.message;
    }
    preview.push(view);
  }
  const fingerprint = await digest2(JSON.stringify({ rows, config, types, people: people.map((p) => ({ id: p.id, updatedAt: p.updatedAt })).sort((a, b) => a.id.localeCompare(b.id)), existing: existing.filter((r) => r.importReference).map((r) => ({ id: r.id, hash: r.importRowFingerprint })).sort((a, b) => a.id.localeCompare(b.id)) }));
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
import { z as z4 } from "zod";

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
  const origin = req.headers.get("Origin");
  if (origin && origin !== new URL(req.url).origin) throw new Error("FORBIDDEN");
  return id;
}
function handleError(e) {
  if (e instanceof SyntaxError) return json({ error: "El contenido no es JSON v\xE1lido." }, 400);
  if (e instanceof z4.ZodError) return json({ error: e.issues[0]?.message || "Datos inv\xE1lidos." }, 400);
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
    const { action, payload } = z4.object({ action: z4.string(), payload: z4.record(z4.string(), z4.unknown()) }).parse(await req.json());
    const required = { previewHistoricalImport: "expedientes", importHistoricalOperations: "expedientes", deleteSubject: "sujetos", deleteEvaluation: "expedientes", saveOrganization: "ajustes", saveOperationTypes: "ajustes", previewOperationsImport: "expedientes", importOperations: "expedientes", saveSubject: "sujetos", saveEvaluation: "expedientes", reviewCase: "analisis", updateStatus: "analisis", saveSettings: "riesgo", deleteCriterion: "riesgo", importLocal: "expedientes" };
    if (!required[action]) return json({ error: "Operaci\xF3n desconocida." }, 400);
    requireModule(user, required[action], true);
    if (action === "importLocal") {
      requireModule(user, "sujetos", true);
      requireModule(user, "riesgo", true);
    }
    if (action === "reviewCase" || action === "updateStatus") requireModule(user, "expedientes");
    if (action === "deleteSubject" || action === "deleteEvaluation") {
      if (user.role !== "SUPERADMIN") throw Error("FORBIDDEN");
      const input2 = z4.object({ id: z4.string().min(1).max(100), version: z4.string().min(1).max(1e5), confirmed: z4.literal(true) }).parse(payload);
      if (action === "deleteSubject") {
        const [person] = await db.select().from(subjects).where(and2(eq2(subjects.ownerId, ownerId), eq2(subjects.id, input2.id)));
        if (!person) return json({ error: "El sujeto ya no existe." }, 404);
        if (person.updatedAt !== input2.version) return json({ error: "La ficha cambi\xF3. Actualiz\xE1 antes de eliminarla." }, 409);
        const rows = await db.select().from(evaluations).where(eq2(evaluations.ownerId, ownerId));
        if (rows.some((r) => r.subjectId === person.id || r.record.taxId.replace(/\D/g, "") === person.documentKey)) return json({ error: "El sujeto tiene operaciones vinculadas. Elimin\xE1 primero esas operaciones." }, 409);
        const changed = await db.delete(subjects).where(and2(eq2(subjects.ownerId, ownerId), eq2(subjects.id, input2.id), eq2(subjects.updatedAt, input2.version))).returning({ id: subjects.id });
        if (!changed.length) return json({ error: "La ficha cambi\xF3. Actualiz\xE1 antes de eliminarla." }, 409);
      } else {
        const [row] = await db.select().from(evaluations).where(and2(eq2(evaluations.ownerId, ownerId), eq2(evaluations.id, input2.id)));
        if (!row) return json({ error: "La operaci\xF3n ya no existe." }, 404);
        if (JSON.stringify(row.record) !== input2.version) return json({ error: "La operaci\xF3n cambi\xF3. Actualiz\xE1 antes de eliminarla." }, 409);
        const changed = await db.delete(evaluations).where(and2(eq2(evaluations.ownerId, ownerId), eq2(evaluations.id, input2.id), eq2(evaluations.record, row.record))).returning({ id: evaluations.id });
        if (!changed.length) return json({ error: "La operaci\xF3n cambi\xF3. Actualiz\xE1 antes de eliminarla." }, 409);
      }
      return json({ deleted: input2.id });
    }
    if (action === "saveOperationTypes") {
      const input2 = z4.object({ version: z4.string(), types: z4.array(z4.object({ code: z4.string().regex(/^[A-Z][A-Z0-9_]{1,79}$/), name: z4.string().trim().min(2).max(120), active: z4.boolean(), uifScope: z4.enum(["PISO", "SIEMPRE", "NO_APLICA"]), productCriterionId: z4.string().optional() })).min(1).max(100) }).parse(payload);
      if (new Set(input2.types.map((t) => t.code)).size !== input2.types.length) return json({ error: "Hay c\xF3digos de operaci\xF3n repetidos." }, 400);
      if (!input2.types.some((t) => t.active)) return json({ error: "Debe quedar al menos un tipo activo." }, 400);
      const [org] = await db.select().from(organizationSettings).where(eq2(organizationSettings.ownerId, ownerId));
      const current = operationTypesFor(org?.organization);
      if (await operationTypesVersion(current) !== input2.version) return json({ error: "Los tipos cambiaron. Actualiz\xE1 la p\xE1gina antes de guardar." }, 409);
      const config = await configFor(ownerId);
      if (input2.types.some((t) => t.productCriterionId && !config.criteria.some((c) => c.id === t.productCriterionId && c.active && !c.deletedAt && c.category === "PRODUCTO"))) return json({ error: "El producto predeterminado no est\xE1 activo." }, 400);
      const types = [...input2.types, ...current.filter((t) => !input2.types.some((n) => n.code === t.code)).map((t) => ({ ...t, active: false }))];
      if (types.length > 100) return json({ error: "El cat\xE1logo admite hasta 100 tipos, incluidos los retirados." }, 400);
      const organization = { ...org?.organization || DEFAULT_ORGANIZATION, operationTypes: types }, now = (/* @__PURE__ */ new Date()).toISOString();
      await db.insert(organizationSettings).values({ ownerId, organization, updatedAt: now }).onConflictDoUpdate({ target: organizationSettings.ownerId, set: { organization, updatedAt: now } });
      return json({ organization, operationTypesVersion: await operationTypesVersion(types) });
    }
    if (action === "previewHistoricalImport" || action === "importHistoricalOperations") {
      if (user.role !== "SUPERADMIN") throw Error("FORBIDDEN");
      const [people, rows] = await Promise.all([db.select().from(subjects).where(eq2(subjects.ownerId, ownerId)), db.select().from(evaluations).where(eq2(evaluations.ownerId, ownerId))]);
      const plan = await prepareHistoricalImport(payload.rows, ownerId, people, rows.map((r) => r.record), user);
      const examples = rows.filter((r) => exampleRecord(r.record));
      if (action === "previewHistoricalImport") return json({ ...plan.result, examples: examples.length });
      if (payload.confirmed !== true) return json({ error: "Confirm\xE1 la revisi\xF3n del listado hist\xF3rico." }, 400);
      if (plan.result.errors) return json({ error: "Correg\xED todos los errores antes de importar." }, 400);
      if (payload.fingerprint !== plan.result.fingerprint) return json({ error: "Los datos cambiaron. Actualiz\xE1 la vista previa." }, 409);
      const queries = [];
      const removed = new Set(payload.replaceExamples === true ? examples.map((r) => r.id) : []);
      if (removed.size) {
        for (const r of examples) queries.push(db.delete(evaluations).where(and2(eq2(evaluations.ownerId, ownerId), eq2(evaluations.id, r.id))));
      }
      let subjectsRemoved = 0;
      if (payload.replaceExamples === true) {
        for (const p of people.filter(exampleSubject)) {
          if (!rows.some((r) => !removed.has(r.id) && (r.subjectId === p.id || r.record.taxId.replace(/\D/g, "") === p.documentKey))) {
            queries.push(db.delete(subjects).where(and2(eq2(subjects.ownerId, ownerId), eq2(subjects.id, p.id))));
            subjectsRemoved++;
          }
        }
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      for (const person of plan.newSubjects) queries.push(db.insert(subjects).values({ ...person, ownerId, documentKey: person.taxId.replace(/\D/g, ""), pepDetails: "", createdAt: now, updatedAt: now }));
      for (const record of plan.records) queries.push(db.insert(evaluations).values({ id: record.id, ownerId, subjectId: record.subjectId || null, createdAt: now, record }));
      if (queries.length) await db.batch(queries);
      return json({ imported: plan.records.length, subjectsCreated: plan.newSubjects.length, skipped: plan.result.skipped, examplesRemoved: removed.size, subjectsRemoved });
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
      const organization = z4.object({ shortName: z4.string().trim().min(2).max(40), legalName: z4.string().trim().min(2).max(200), area: z4.string().trim().min(2).max(120), taxId: z4.string().trim().max(30), address: z4.string().trim().max(500), email: z4.union([z4.literal(""), z4.string().trim().email().max(254)]), phone: z4.string().trim().max(50), website: z4.union([z4.literal(""), z4.string().url().max(300).refine((v) => /^https?:\/\//.test(v), { message: "Us\xE1 una direcci\xF3n web http o https." })]), logo: z4.string().max(28e4).refine((v) => !v || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(v), { message: "Us\xE1 un logo PNG, JPG o WebP de hasta 200 KB." }) }).parse(payload);
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
      const input2 = subjectSchema.parse(payload), documentKey = input2.taxId.replace(/\D/g, ""), now = (/* @__PURE__ */ new Date()).toISOString();
      const [old] = await db.select().from(subjects).where(and2(eq2(subjects.ownerId, ownerId), eq2(subjects.documentKey, documentKey)));
      if (old && old.id !== input2.id) return json({ error: "Ya existe un sujeto con ese documento. Seleccion\xE1 su ficha para editarlo." }, 409);
      if (input2.id && (!old || old.id !== input2.id)) return json({ error: "No se encontr\xF3 la ficha o cambi\xF3 su documento." }, 409);
      if (old && input2.updatedAt && old.updatedAt !== input2.updatedAt) return json({ error: "La ficha cambi\xF3. Actualizala antes de editarla." }, 409);
      const config = await configFor(ownerId);
      if (input2.clientCriteriaIds.some((id) => !config.criteria.some((c) => c.id === id && c.active && c.category === "CLIENTE"))) return json({ error: "Revis\xE1 los criterios personales de la ficha." }, 400);
      const subject = { ...input2, id: old?.id || crypto.randomUUID(), ownerId, documentKey, pepDetails: input2.pepDetails || "", createdAt: old?.createdAt || now, updatedAt: old ? new Date(Math.max(Date.now(), Date.parse(old.updatedAt) + 1)).toISOString() : now };
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
      const requestId = payload.requestId ? z4.string().uuid().parse(payload.requestId) : crypto.randomUUID();
      const submitted = recordSchema.extend({ operationAt: z4.string().datetime() }).parse(payload.record);
      const fingerprint = JSON.stringify({ ...submitted, selectedCriteriaIds: [...new Set(submitted.selectedCriteriaIds)].sort() });
      const [previous] = await db.select().from(evaluations).where(and2(eq2(evaluations.ownerId, ownerId), eq2(evaluations.id, requestId)));
      if (previous) {
        if (previous.subjectId !== person.id || previous.record.requestFingerprint !== fingerprint) return json({ error: "El identificador ya se us\xF3 con otros datos." }, 409);
        return json({ record: previous.record, subject: person });
      }
      if (submitted.subjectUpdatedAt && person.updatedAt !== submitted.subjectUpdatedAt) return json({ error: "La ficha cambi\xF3. Seleccionala nuevamente y confirm\xE1 la condici\xF3n." }, 409);
      const input2 = operationSchema.parse({ ...payload.record, pepStatus: person.pepStatus, pepDetails: person.pepDetails, activityAtOperation: person.activity });
      const subjectId = person.id;
      const config = await configFor(ownerId);
      const [org] = await db.select().from(organizationSettings).where(eq2(organizationSettings.ownerId, ownerId));
      const type = operationTypesFor(org?.organization).find((t) => t.code === input2.operationType && t.active);
      if (!type) return json({ error: "El tipo de operaci\xF3n no est\xE1 activo. Actualiz\xE1 la p\xE1gina." }, 409);
      let record;
      try {
        record = buildEvaluationRecord(input2, person, config, type, { id: requestId, now, evaluator: user.email, role: user.role, fingerprint });
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
      const input2 = z4.object({ id: z4.string(), version: z4.number().int().nonnegative(), action: z4.enum(["SEGUIMIENTO", "CERRAR_JUSTIFICADA", "DETERMINAR_SOSPECHOSA", "REGISTRAR_ROS"]), classification: z4.enum(["EN_REVISION", "SIN_INUSUALIDAD", "INUSUAL", "SOSPECHOSA"]), alertOrigin: z4.string().trim().min(2).max(1e3), unusualType: z4.string().max(4e3), profileSummary: z4.string().max(4e3).default(""), documentationRequested: z4.string().max(4e3), documentationReviewed: z4.string().max(4e3), fundsAssessment: z4.string().max(4e3).default(""), beneficialOwner: z4.string().max(2e3), reasoning: z4.string().trim().min(10).max(6e3), rosReference: z4.string().max(500), rosSubmittedAt: z4.string().max(50) }).parse(payload);
      const [row] = await db.select().from(evaluations).where(and2(eq2(evaluations.ownerId, ownerId), eq2(evaluations.id, input2.id)));
      if (!row) return json({ error: "No se encontr\xF3 el expediente." }, 404);
      if ((row.record.analysisVersion || 0) !== input2.version) return json({ error: "El expediente cambi\xF3. Actualiz\xE1 la p\xE1gina antes de guardar el an\xE1lisis." }, 409);
      if (input2.action === "SEGUIMIENTO" && input2.classification === "SOSPECHOSA" && row.record.analysis?.classification !== "SOSPECHOSA") return json({ error: "Us\xE1 la decisi\xF3n Determinar sospechosa para registrar esa conclusi\xF3n." }, 400);
      if ((input2.classification === "INUSUAL" || input2.action === "DETERMINAR_SOSPECHOSA") && input2.unusualType.trim().length < 10) return json({ error: "Describ\xED la inusualidad detectada." }, 400);
      if (row.record.status === "REPORTE_ROS" && input2.action !== "SEGUIMIENTO") return json({ error: "El ROS ya est\xE1 registrado. Agreg\xE1 novedades mediante seguimiento, conservando la constancia." }, 400);
      if (input2.action === "CERRAR_JUSTIFICADA" && input2.classification === "INUSUAL" && !input2.documentationReviewed.trim()) return json({ error: "Registr\xE1 el sustento documental revisado para justificar la inusualidad." }, 400);
      if (input2.action === "CERRAR_JUSTIFICADA" && input2.classification === "EN_REVISION") return json({ error: "Complet\xE1 la clasificaci\xF3n antes de cerrar el an\xE1lisis." }, 400);
      if (input2.action === "CERRAR_JUSTIFICADA" && input2.classification === "SOSPECHOSA") return json({ error: "Revis\xE1 la clasificaci\xF3n antes de cerrar una operaci\xF3n como justificada." }, 400);
      if (input2.action === "REGISTRAR_ROS" && (row.record.analysis?.classification !== "SOSPECHOSA" || !input2.rosReference.trim() || !Number.isFinite(Date.parse(input2.rosSubmittedAt)))) return json({ error: "Primero document\xE1 la determinaci\xF3n de sospecha. Para registrar el ROS presentado, indic\xE1 su constancia y fecha." }, 400);
      if (input2.action === "REGISTRAR_ROS" && Date.parse(input2.rosSubmittedAt) > Date.now()) return json({ error: "La fecha de presentaci\xF3n no puede ser futura." }, 400);
      const review = { ...input2, profileSummary: row.record.analysis?.profileSummary || "", fundsAssessment: row.record.analysis?.fundsAssessment || "", classification: input2.action === "DETERMINAR_SOSPECHOSA" || input2.action === "REGISTRAR_ROS" || row.record.status === "REPORTE_ROS" ? "SOSPECHOSA" : input2.classification, rosReference: row.record.status === "REPORTE_ROS" ? row.record.analysis?.rosReference || input2.rosReference : input2.rosReference, rosSubmittedAt: row.record.status === "REPORTE_ROS" ? row.record.analysis?.rosSubmittedAt || input2.rosSubmittedAt : input2.rosSubmittedAt, analyst: req.headers.get("oai-authenticated-user-email") || "Usuario autenticado", reviewedAt: (/* @__PURE__ */ new Date()).toISOString() };
      const record = { ...row.record, analysis: review, analysisHistory: [...row.record.analysisHistory || [], review], analysisVersion: input2.version + 1, status: row.record.status === "REPORTE_ROS" ? "REPORTE_ROS" : input2.action === "CERRAR_JUSTIFICADA" ? "JUSTIFICADO" : input2.action === "REGISTRAR_ROS" ? "REPORTE_ROS" : "EN_ANALISIS" };
      const updated = await db.update(evaluations).set({ record }).where(and2(eq2(evaluations.ownerId, ownerId), eq2(evaluations.id, input2.id), eq2(evaluations.record, row.record))).returning({ id: evaluations.id });
      if (!updated.length) return json({ error: "Otro cambio se guard\xF3 primero. Actualiz\xE1 el expediente." }, 409);
      return json({ record });
    }
    if (action === "updateStatus") {
      const input2 = z4.object({ id: z4.string(), status: z4.enum(statusValues) }).parse(payload);
      const [row] = await db.select().from(evaluations).where(and2(eq2(evaluations.ownerId, ownerId), eq2(evaluations.id, input2.id)));
      if (!row) return json({ error: "No se encontr\xF3 el expediente." }, 404);
      if (row.record.status === "JUSTIFICADO" || row.record.status === "REPORTE_ROS") return json({ error: "Los cambios de un expediente concluido requieren an\xE1lisis documentado." }, 409);
      if (input2.status === "JUSTIFICADO" || input2.status === "REPORTE_ROS") return json({ error: "El cierre y el registro de ROS requieren un an\xE1lisis fundamentado." }, 400);
      const record = { ...row.record, status: input2.status };
      await db.update(evaluations).set({ record }).where(and2(eq2(evaluations.ownerId, ownerId), eq2(evaluations.id, input2.id)));
      return json({ record });
    }
    if (action === "deleteCriterion") {
      if (user.role !== "SUPERADMIN") throw Error("FORBIDDEN");
      const { id } = z4.object({ id: z4.string().min(1).max(200) }).parse(payload);
      const config = await configFor(ownerId), criterion = config.criteria.find((c) => c.id === id);
      if (!criterion) return json({ error: "No se encontr\xF3 el par\xE1metro." }, 404);
      if (criterion.deletedAt) return json(config);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const next = { criteria: config.criteria.map((c) => c.id === id ? { ...c, active: false, deletedAt: now, deletedBy: user.email } : c), factorWeights: config.factorWeights, thresholds: config.thresholds };
      await db.insert(settings).values({ ownerId, ...next, updatedAt: now }).onConflictDoUpdate({ target: settings.ownerId, set: { ...next, updatedAt: now } });
      return json(next);
    }
    if (action === "saveSettings") {
      const config = z4.object({ criteria: z4.array(z4.object({ id: z4.string(), deletedAt: z4.string().optional(), deletedBy: z4.string().optional(), code: z4.string(), name: z4.string(), description: z4.string(), category: z4.enum(["CLIENTE", "PRODUCTO", "CANAL", "GEOGRAFIA"]), subgroup: z4.string(), score: z4.number().min(1).max(5), riskLevel: z4.enum(["BAJO", "MEDIO", "ALTO", "CRITICO"]), mitigationFactor: z4.number().min(0).max(1), active: z4.boolean(), regulatoryBase: z4.string(), lastUpdated: z4.string() })).max(1e3), factorWeights: z4.array(z4.object({ category: z4.enum(["CLIENTE", "PRODUCTO", "CANAL", "GEOGRAFIA"]), name: z4.string(), weightPercentage: z4.number().min(0).max(100), description: z4.string(), iconName: z4.string() })).length(4), thresholds: z4.array(z4.object({ id: z4.string(), code: z4.string(), title: z4.string(), description: z4.string(), amountARS: z4.number().finite().positive(), periodicity: z4.enum(["POR_OPERACION", "MENSUAL_ACUMULADO", "ANUAL"]), actionRequired: z4.string(), regulationSource: z4.string(), lastUpdated: z4.string() })).max(100) }).parse(payload);
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
      const records = z4.array(recordSchema.extend({ id: z4.string().max(100), timestamp: z4.string(), dossierNumber: z4.string(), evaluator: z4.string(), evaluatorRole: z4.string(), subjectName: z4.string(), taxId: z4.string(), subjectType: z4.enum(subjectTypes2), activityOcupation: z4.string(), pepStatus: z4.boolean(), weightedScore: z4.number().finite(), rawScore: z4.number().finite(), riskLevel: z4.enum(["BAJO", "MEDIO", "ALTO", "CRITICO"]), dueDiligenceLevel: z4.enum(["SIMPLIFICADA", "ESTANDAR", "REFORZADA"]), status: z4.enum(statusValues), alerts: z4.array(z4.string()), requiresDJOF: z4.boolean(), requiresDocumentation: z4.boolean() }).passthrough()).max(1e3).parse(payload.records);
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

export {
  MODULES,
  access,
  POST,
  route_exports
};
