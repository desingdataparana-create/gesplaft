import type {Metadata} from 'next';
import '../src/index.css';
export const metadata:Metadata={title:'IAFAS · Riesgo PLA/FT',description:'Gestión privada de sujetos y evaluaciones de riesgo PLA/FT.'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="es"><body>{children}</body></html>;}
