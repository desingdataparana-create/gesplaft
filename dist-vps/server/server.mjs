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
import { z } from "zod";

// src/data/initialRiskData.ts
var INITIAL_FACTOR_WEIGHTS = [
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
var INITIAL_RISK_CRITERIA = [
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
var INITIAL_REGULATORY_THRESHOLDS = [
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

// src/utils/calculateRisk.ts
function calculateRisk(criteria, factorWeights, selectedCriteriaIds, isPep, amountARS, thresholds = [], context = {}) {
  const selectedObj = criteria.filter((c) => c.active && selectedCriteriaIds.includes(c.id));
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
  if (totalScore >= 75 || isPep || selectedCriteriaIds.includes("cli-07") || selectedCriteriaIds.includes("oper-04")) {
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
  const thresholdChecks = thresholds.filter((t) => t.code !== "UMB-AGENCIA-04" || context.subjectType === "AGENCIA").map((t) => {
    const date = businessDate(context.operationAt || (/* @__PURE__ */ new Date()).toISOString());
    const prior = (context.records || []).filter((r) => {
      const d = businessDate(r.operationAt || r.timestamp);
      return t.periodicity === "MENSUAL_ACUMULADO" ? d.slice(0, 7) === date.slice(0, 7) : t.periodicity === "ANUAL" ? d.slice(0, 4) === date.slice(0, 4) : false;
    }).reduce((n, r) => n + r.amountARS, 0);
    return { ...t, total: amountARS + prior, triggered: amountARS + prior >= t.amountARS };
  });
  const triggered = thresholdChecks.filter((t) => t.triggered);
  triggered.forEach((t) => alertsGenerated.push(`${t.title}: $${t.total.toLocaleString("es-AR")} / $${t.amountARS.toLocaleString("es-AR")} (${t.periodicity}). ${t.actionRequired}`));
  if (selectedCriteriaIds.includes("oper-04")) {
    alertsGenerated.push("Se\xF1al de alerta: Sospecha de estructuraci\xF3n o fraccionamiento de operaciones.");
  }
  if (selectedCriteriaIds.includes("geo-02")) {
    alertsGenerated.push("Operaci\xF3n en zona de frontera internacional.");
  }
  const djofRequired = triggered.some((t) => t.code === "UMB-DJOF-02") || isPep || lvl === "ALTO" || lvl === "CRITICO";
  const docRequired = triggered.some((t) => t.code === "UMB-ID-01") || djofRequired;
  return {
    thresholdChecks,
    weightedScore: totalScore,
    rawScore: Math.round(totalScore),
    riskLevel: lvl,
    dueDiligence: dd,
    alerts: alertsGenerated,
    requiresDJOF: djofRequired,
    requiresDocumentation: docRequired
  };
}
function businessDate(v) {
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
  return ["year", "month", "day"].map((k) => parts.find((p) => p.type === k)?.value).join("-");
}

// app/api/data/route.ts
var dynamic = "force-dynamic";
var subjectTypes = ["PERSONA_FISICA", "PERSONA_JURIDICA", "AGENCIA"];
var statusValues = ["PENDIENTE", "EN_ANALISIS", "JUSTIFICADO", "ALERTA_EMITIDA", "REPORTE_ROS"];
var subjectSchema = z.object({ id: z.string().optional(), updatedAt: z.string().optional(), subjectName: z.string().trim().min(2).max(200), taxId: z.string().trim().min(7).max(20), subjectType: z.enum(subjectTypes), address: z.string().trim().min(3).max(500), email: z.string().trim().email().max(254), phone: z.string().trim().min(6).max(40), activity: z.string().trim().min(2).max(200), pepStatus: z.boolean(), pepDetails: z.string().max(1e3).optional(), clientCriteriaIds: z.array(z.string()).max(100).default([]) }).refine((s) => /^\d{7,11}$/.test(s.taxId.replace(/\D/g, "")), { message: "Revis\xE1 el DNI/CUIT: debe tener entre 7 y 11 d\xEDgitos." }).refine((s) => s.phone.replace(/\D/g, "").length >= 6, { message: "Revis\xE1 el tel\xE9fono." }).refine((s) => !s.pepStatus || !!s.pepDetails?.trim(), { message: "Indic\xE1 el cargo o condici\xF3n PEP en la ficha del sujeto." });
var recordSchema = z.object({ subjectUpdatedAt: z.string().optional(), operationType: z.enum(["COBRO_PREMIO", "APUESTA_PRESENCIAL", "APUESTA_ONLINE", "CAMBIO_FICHAS", "ALTA_AGENCIA"]), amountARS: z.number().finite().positive().max(1e15), locationDepartment: z.string().trim().min(1).max(200), channelName: z.string().trim().min(1).max(200), selectedCriteriaIds: z.array(z.string()).min(1).max(200), notes: z.string().max(1e4) });
var profileSchema = z.object({ profileSummary: z.string().max(4e3), comparison: z.enum(["SIN_DATOS", "COMPATIBLE", "DESVIACION"]), comparisonReason: z.string().max(4e3), originDeclared: z.string().max(2e3), destinationDeclared: z.string().max(2e3), beneficialOwner: z.string().max(2e3) });
var operationSchema = recordSchema.extend({ profileAssessment: profileSchema.optional(), operationAt: z.string().datetime().refine((v) => Date.parse(v) <= Date.now() + 6e4, { message: "La operaci\xF3n no puede tener fecha futura." }), conditionConfirmed: z.literal(true, { error: "Confirm\xE1 la condici\xF3n del sujeto para esta operaci\xF3n." }), pepStatus: z.boolean(), pepDetails: z.string().max(1e3).optional(), activityAtOperation: z.string().trim().min(2).max(200) }).refine((r) => !r.pepStatus || !!r.pepDetails?.trim(), { message: "Indic\xE1 el cargo o condici\xF3n PEP evaluada." });
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
  if (e instanceof z.ZodError) return json({ error: e.issues[0]?.message || "Datos inv\xE1lidos." }, 400);
  if (e instanceof Error && e.message === "UNAUTHORIZED") return json({ error: "Inici\xE1 sesi\xF3n para acceder a los datos." }, 401);
  if (e instanceof Error && e.message === "FORBIDDEN") return json({ error: "Operaci\xF3n no autorizada." }, 403);
  return json({ error: "No se pudo completar la operaci\xF3n en la base de datos. Intent\xE1 nuevamente." }, 500);
}
var defaultConfig = { criteria: INITIAL_RISK_CRITERIA, factorWeights: INITIAL_FACTOR_WEIGHTS, thresholds: INITIAL_REGULATORY_THRESHOLDS };
async function configFor(ownerId) {
  const db = getDb();
  const [config] = await db.select().from(settings).where(eq2(settings.ownerId, ownerId));
  return config || defaultConfig;
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
    return json({ ...config, user, dashboard, organization: org?.organization || DEFAULT_ORGANIZATION, subjects: can(user, "sujetos") || can(user, "expedientes", true) ? people : [], records: can(user, "expedientes") ? records.map((r) => can(user, "analisis") ? r : { ...r, analysis: void 0, analysisHistory: void 0 }) : [] });
  } catch (e) {
    return handleError(e);
  }
}
async function POST(req) {
  try {
    writeOwner(req);
    const user = await access(req), ownerId = user.ownerId, db = getDb();
    const { action, payload } = z.object({ action: z.string(), payload: z.record(z.string(), z.unknown()) }).parse(await req.json());
    const required = { saveOrganization: "ajustes", saveSubject: "sujetos", saveEvaluation: "expedientes", reviewCase: "analisis", updateStatus: "analisis", saveSettings: "riesgo", deleteCriterion: "riesgo", importLocal: "expedientes" };
    if (!required[action]) return json({ error: "Operaci\xF3n desconocida." }, 400);
    requireModule(user, required[action], true);
    if (action === "importLocal") {
      requireModule(user, "sujetos", true);
      requireModule(user, "riesgo", true);
    }
    if (action === "reviewCase" || action === "updateStatus") requireModule(user, "expedientes");
    if (action === "saveOrganization") {
      const organization = z.object({ shortName: z.string().trim().min(2).max(40), legalName: z.string().trim().min(2).max(200), area: z.string().trim().min(2).max(120), taxId: z.string().trim().max(30), address: z.string().trim().max(500), email: z.union([z.literal(""), z.string().trim().email().max(254)]), phone: z.string().trim().max(50), website: z.union([z.literal(""), z.string().url().max(300).refine((v) => /^https?:\/\//.test(v), { message: "Us\xE1 una direcci\xF3n web http o https." })]), logo: z.string().max(28e4).refine((v) => !v || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(v), { message: "Us\xE1 un logo PNG, JPG o WebP de hasta 200 KB." }) }).parse(payload);
      if (organization.logo) {
        const [prefix, encoded] = organization.logo.split(",");
        const bytes = atob(encoded);
        const valid = prefix.includes("image/png") ? bytes.startsWith("\x89PNG\r\n\n") : prefix.includes("image/jpeg") ? bytes.startsWith("\xFF\xD8\xFF") : bytes.startsWith("RIFF") && bytes.slice(8, 12) === "WEBP";
        if (!valid || bytes.length > 2e5) return json({ error: "El archivo del logo no es v\xE1lido o supera 200 KB." }, 400);
      }
      await db.insert(organizationSettings).values({ ownerId, organization, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }).onConflictDoUpdate({ target: organizationSettings.ownerId, set: { organization, updatedAt: (/* @__PURE__ */ new Date()).toISOString() } });
      return json({ organization });
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
      const requestId = payload.requestId ? z.string().uuid().parse(payload.requestId) : crypto.randomUUID();
      const submitted = recordSchema.extend({ operationAt: z.string().datetime(), profileAssessment: profileSchema.optional() }).parse(payload.record);
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
      input.selectedCriteriaIds = [.../* @__PURE__ */ new Set([...input.selectedCriteriaIds.filter((id2) => !config.criteria.some((c) => c.id === id2 && c.category === "CLIENTE")), ...person.clientCriteriaIds])];
      if (input.selectedCriteriaIds.some((id2) => !config.criteria.some((c) => c.id === id2 && c.active))) return json({ error: "Uno de los criterios ya no est\xE1 activo. Actualiz\xE1 la p\xE1gina y revis\xE1 la selecci\xF3n." }, 409);
      if (["CLIENTE", "PRODUCTO", "CANAL", "GEOGRAFIA"].some((category) => !config.criteria.some((c) => c.category === category && input.selectedCriteriaIds.includes(c.id)))) return json({ error: "Complet\xE1 los criterios personales en la ficha del sujeto y los criterios de producto/servicio, canal y geograf\xEDa en la operaci\xF3n." }, 400);
      const history = await db.select().from(evaluations).where(and2(eq2(evaluations.ownerId, ownerId), eq2(evaluations.subjectId, subjectId)));
      const result = calculateRisk(config.criteria, config.factorWeights, input.selectedCriteriaIds, input.pepStatus, input.amountARS, config.thresholds, { operationAt: input.operationAt, subjectType: person.subjectType, records: history.map((r) => r.record) });
      const id = requestId;
      const record = { ...input, id, requestFingerprint: fingerprint, criteriaSnapshot: config.criteria.filter((c) => input.selectedCriteriaIds.includes(c.id)), weightsSnapshot: config.factorWeights, thresholdsSnapshot: config.thresholds, dossierNumber: `EXP-PLA-${(/* @__PURE__ */ new Date()).getFullYear()}-${id.slice(0, 8).toUpperCase()}`, timestamp: now, conditionReviewedAt: now, evaluator: req.headers.get("oai-authenticated-user-email") || "Usuario autenticado", evaluatorRole: user.role, subjectId, subjectName: person.subjectName, taxId: person.taxId, subjectType: person.subjectType, address: person.address || "", email: person.email || "", phone: person.phone || "", activityOcupation: input.activityAtOperation, pepStatus: input.pepStatus, pepDetails: input.pepDetails, weightedScore: result.weightedScore, rawScore: result.rawScore, riskLevel: result.riskLevel, dueDiligenceLevel: result.dueDiligence, status: "PENDIENTE", requiresDJOF: result.requiresDJOF, requiresDocumentation: result.requiresDocumentation, alerts: [...result.alerts, ...input.profileAssessment?.comparison === "DESVIACION" ? ["Desv\xEDo declarado respecto del perfil transaccional: requiere an\xE1lisis."] : []], analysisVersion: 0 };
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
      const input = z.object({ id: z.string(), version: z.number().int().nonnegative(), action: z.enum(["SEGUIMIENTO", "CERRAR_JUSTIFICADA", "DETERMINAR_SOSPECHOSA", "REGISTRAR_ROS"]), classification: z.enum(["EN_REVISION", "SIN_INUSUALIDAD", "INUSUAL", "SOSPECHOSA"]), alertOrigin: z.string().trim().min(2).max(1e3), unusualType: z.string().max(4e3), profileSummary: z.string().max(4e3), documentationRequested: z.string().max(4e3), documentationReviewed: z.string().max(4e3), fundsAssessment: z.string().max(4e3), beneficialOwner: z.string().max(2e3), reasoning: z.string().trim().min(10).max(6e3), rosReference: z.string().max(500), rosSubmittedAt: z.string().max(50) }).parse(payload);
      const [row] = await db.select().from(evaluations).where(and2(eq2(evaluations.ownerId, ownerId), eq2(evaluations.id, input.id)));
      if (!row) return json({ error: "No se encontr\xF3 el expediente." }, 404);
      if ((row.record.analysisVersion || 0) !== input.version) return json({ error: "El expediente cambi\xF3. Actualiz\xE1 la p\xE1gina antes de guardar el an\xE1lisis." }, 409);
      if (input.action === "SEGUIMIENTO" && input.classification === "SOSPECHOSA" && row.record.analysis?.classification !== "SOSPECHOSA") return json({ error: "Us\xE1 la decisi\xF3n Determinar sospechosa para registrar esa conclusi\xF3n." }, 400);
      if ((input.classification === "INUSUAL" || input.action === "DETERMINAR_SOSPECHOSA") && input.unusualType.trim().length < 10) return json({ error: "Describ\xED la inusualidad detectada." }, 400);
      if (row.record.status === "REPORTE_ROS" && input.action !== "SEGUIMIENTO") return json({ error: "El ROS ya est\xE1 registrado. Agreg\xE1 novedades mediante seguimiento, conservando la constancia." }, 400);
      if (input.action === "CERRAR_JUSTIFICADA" && input.classification === "INUSUAL" && !input.documentationReviewed.trim()) return json({ error: "Registr\xE1 el sustento documental revisado para justificar la inusualidad." }, 400);
      if (input.action === "CERRAR_JUSTIFICADA" && input.classification === "EN_REVISION") return json({ error: "Complet\xE1 la clasificaci\xF3n antes de cerrar el an\xE1lisis." }, 400);
      if (input.action === "CERRAR_JUSTIFICADA" && (!input.profileSummary.trim() || !input.fundsAssessment.trim())) return json({ error: "Document\xE1 el perfil considerado y el an\xE1lisis que sustenta el cierre." }, 400);
      if (input.action === "CERRAR_JUSTIFICADA" && input.classification === "SOSPECHOSA") return json({ error: "Revis\xE1 la clasificaci\xF3n antes de cerrar una operaci\xF3n como justificada." }, 400);
      if (input.action === "DETERMINAR_SOSPECHOSA" && !input.fundsAssessment.trim()) return json({ error: "Registr\xE1 los elementos analizados que sustentan la sospecha." }, 400);
      if (input.action === "REGISTRAR_ROS" && (row.record.analysis?.classification !== "SOSPECHOSA" || !input.rosReference.trim() || !Number.isFinite(Date.parse(input.rosSubmittedAt)))) return json({ error: "Primero document\xE1 la determinaci\xF3n de sospecha. Para registrar el ROS presentado, indic\xE1 su constancia y fecha." }, 400);
      if (input.action === "REGISTRAR_ROS" && Date.parse(input.rosSubmittedAt) > Date.now()) return json({ error: "La fecha de presentaci\xF3n no puede ser futura." }, 400);
      const review = { ...input, classification: input.action === "DETERMINAR_SOSPECHOSA" || input.action === "REGISTRAR_ROS" || row.record.status === "REPORTE_ROS" ? "SOSPECHOSA" : input.classification, rosReference: row.record.status === "REPORTE_ROS" ? row.record.analysis?.rosReference || input.rosReference : input.rosReference, rosSubmittedAt: row.record.status === "REPORTE_ROS" ? row.record.analysis?.rosSubmittedAt || input.rosSubmittedAt : input.rosSubmittedAt, analyst: req.headers.get("oai-authenticated-user-email") || "Usuario autenticado", reviewedAt: (/* @__PURE__ */ new Date()).toISOString() };
      const record = { ...row.record, analysis: review, analysisHistory: [...row.record.analysisHistory || [], review], analysisVersion: input.version + 1, status: row.record.status === "REPORTE_ROS" ? "REPORTE_ROS" : input.action === "CERRAR_JUSTIFICADA" ? "JUSTIFICADO" : input.action === "REGISTRAR_ROS" ? "REPORTE_ROS" : "EN_ANALISIS" };
      const updated = await db.update(evaluations).set({ record }).where(and2(eq2(evaluations.ownerId, ownerId), eq2(evaluations.id, input.id), eq2(evaluations.record, row.record))).returning({ id: evaluations.id });
      if (!updated.length) return json({ error: "Otro cambio se guard\xF3 primero. Actualiz\xE1 el expediente." }, 409);
      return json({ record });
    }
    if (action === "updateStatus") {
      const input = z.object({ id: z.string(), status: z.enum(statusValues) }).parse(payload);
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
      const { id } = z.object({ id: z.string().min(1).max(200) }).parse(payload);
      const config = await configFor(ownerId), criterion = config.criteria.find((c) => c.id === id);
      if (!criterion) return json({ error: "No se encontr\xF3 el par\xE1metro." }, 404);
      if (criterion.deletedAt) return json(config);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const next = { criteria: config.criteria.map((c) => c.id === id ? { ...c, active: false, deletedAt: now, deletedBy: user.email } : c), factorWeights: config.factorWeights, thresholds: config.thresholds };
      await db.insert(settings).values({ ownerId, ...next, updatedAt: now }).onConflictDoUpdate({ target: settings.ownerId, set: { ...next, updatedAt: now } });
      return json(next);
    }
    if (action === "saveSettings") {
      const config = z.object({ criteria: z.array(z.object({ id: z.string(), deletedAt: z.string().optional(), deletedBy: z.string().optional(), code: z.string(), name: z.string(), description: z.string(), category: z.enum(["CLIENTE", "PRODUCTO", "CANAL", "GEOGRAFIA", "OPERACIONAL"]), subgroup: z.string(), score: z.number().min(1).max(5), riskLevel: z.enum(["BAJO", "MEDIO", "ALTO", "CRITICO"]), mitigationFactor: z.number().min(0).max(1), active: z.boolean(), regulatoryBase: z.string(), lastUpdated: z.string() })).max(1e3), factorWeights: z.array(z.object({ category: z.enum(["CLIENTE", "PRODUCTO", "CANAL", "GEOGRAFIA", "OPERACIONAL"]), name: z.string(), weightPercentage: z.number().min(0).max(100), description: z.string(), iconName: z.string() })).length(5), thresholds: z.array(z.object({ id: z.string(), code: z.string(), title: z.string(), description: z.string(), amountARS: z.number().finite().nonnegative(), periodicity: z.enum(["POR_OPERACION", "MENSUAL_ACUMULADO", "ANUAL"]), actionRequired: z.string(), regulationSource: z.string(), lastUpdated: z.string() })).max(100) }).parse(payload);
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
      const records = z.array(recordSchema.extend({ id: z.string().max(100), timestamp: z.string(), dossierNumber: z.string(), evaluator: z.string(), evaluatorRole: z.string(), subjectName: z.string(), taxId: z.string(), subjectType: z.enum(subjectTypes), activityOcupation: z.string(), pepStatus: z.boolean(), weightedScore: z.number().finite(), rawScore: z.number().finite(), riskLevel: z.enum(["BAJO", "MEDIO", "ALTO", "CRITICO"]), dueDiligenceLevel: z.enum(["SIMPLIFICADA", "ESTANDAR", "REFORZADA"]), status: z.enum(statusValues), alerts: z.array(z.string()), requiresDJOF: z.boolean(), requiresDocumentation: z.boolean() }).passthrough()).max(1e3).parse(payload.records);
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
import { z as z2 } from "zod";
var dynamic2 = "force-dynamic";
function error(e) {
  return Response.json({ error: e instanceof z2.ZodError ? e.issues[0].message : "Acceso no autorizado." }, { status: e instanceof z2.ZodError ? 400 : e instanceof Error && e.message === "UNAUTHORIZED" ? 401 : 403 });
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
    const input = z2.object({ id: z2.string().optional(), email: z2.string().trim().email().transform((v) => v.toLowerCase()), name: z2.string().trim().min(2).max(100), role: z2.enum(["ADMIN", "ANALISTA", "OPERADOR"]), active: z2.boolean(), grants: z2.partialRecord(z2.enum(MODULES), z2.enum(["read", "write"])) }).parse(await req.json());
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
