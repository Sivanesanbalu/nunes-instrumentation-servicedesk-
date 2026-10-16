import './style.css';import type {Metadata} from 'next';
export const metadata:Metadata={title:'Nunes ServiceDesk',description:'Nunes Instrumentation internal service management'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
