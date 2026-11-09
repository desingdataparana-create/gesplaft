// Listas desplegables que el administrador puede editar en Configuración → Organización.
// Los valores elegidos se guardan como texto en cada ficha: cambiar una lista no altera lo ya cargado.
export const LIST_DEFS=[
 {key:'departments',label:'Departamentos de la operación',use:'Evaluación → Departamento',select:true},
 {key:'channels',label:'Salas de juego o canales',use:'Evaluación → Sala de juego o canal'},
 {key:'games',label:'Juegos',use:'Evaluación → Juego'},
 {key:'modalities',label:'Modalidades',use:'Evaluación → Modalidad'},
 {key:'draws',label:'Sorteos',use:'Evaluación → Sorteo'},
 {key:'banks',label:'Bancos',use:'Evaluación → Banco emisor'},
 {key:'maritalStatuses',label:'Estados civiles',use:'Sujeto → Estado civil',select:true},
 {key:'nationalities',label:'Nacionalidades',use:'Sujeto → Nacionalidad'},
 {key:'provinces',label:'Provincias',use:'Sujeto → Provincia'},
 {key:'activities',label:'Actividades u ocupaciones',use:'Sujeto → Actividad u ocupación'},
] as const;
export type ListKey=typeof LIST_DEFS[number]['key'];
export const LIST_KEYS=LIST_DEFS.map(d=>d.key) as unknown as [ListKey,...ListKey[]];
export const DEFAULT_LISTS:Record<ListKey,string[]>={
 departments:['Paraná','Concordia','Gualeguaychú','Colón','Concepción del Uruguay','Victoria','Federación','La Paz','Villaguay','Gualeguay'],
 channels:['Casino','Sala de bingo','Agencia de quiniela','Plataforma online'],
 games:['Quiniela','Quini 6','Loto','Brinco','Tragamonedas','Ruleta','Póquer','Apuestas deportivas'],
 modalities:['Presencial','Online'],
 draws:['La Previa','Primera','Matutina','Vespertina','Nocturna'],
 banks:['Banco de la Nación Argentina','Banco de la Provincia de Buenos Aires','Banco de Entre Ríos','Banco Santander','Banco Galicia','BBVA','Banco Macro','Banco Credicoop','Banco Patagonia','ICBC','HSBC','Banco Ciudad','Banco Hipotecario','Banco Itaú'],
 maritalStatuses:['Soltero/a','Casado/a','Unión convivencial','Divorciado/a','Viudo/a'],
 nationalities:['Argentina','Paraguaya','Uruguaya','Brasileña','Chilena','Boliviana','Peruana','Venezolana','Colombiana'],
 provinces:['Buenos Aires','Ciudad Autónoma de Buenos Aires','Catamarca','Chaco','Chubut','Córdoba','Corrientes','Entre Ríos','Formosa','Jujuy','La Pampa','La Rioja','Mendoza','Misiones','Neuquén','Río Negro','Salta','San Juan','San Luis','Santa Cruz','Santa Fe','Santiago del Estero','Tierra del Fuego','Tucumán'],
 activities:['Empleado/a','Empleado/a público','Comerciante','Profesional independiente','Jubilado/a o pensionado/a','Docente','Estudiante','Ama de casa','Productor/a agropecuario','Sin actividad'],
};
export type ListsMap=Partial<Record<ListKey,string[]>>;
export const listOptions=(lists:ListsMap|undefined,key:ListKey)=>lists?.[key]?.length?lists[key]!:DEFAULT_LISTS[key];
// Limpia una lista: recorta espacios, descarta vacíos y repetidos (sin distinguir mayúsculas) y respeta el orden.
export const cleanList=(items:string[])=>{const seen=new Set<string>();return items.map(v=>v.trim().replace(/\s+/g,' ')).filter(v=>{const k=v.toLowerCase();if(!v||seen.has(k))return false;seen.add(k);return true})};
