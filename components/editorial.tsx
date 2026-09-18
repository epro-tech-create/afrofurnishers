import Link from 'next/link';
import { pages } from '@/lib/pages';
import { Reveal } from './motion';

export function InformationPage({ name }: { name: string }) {
  const content = pages[name];
  return <section className="page article"><p className="eyebrow">{content[0]}</p><h1>{content[1]}</h1>{name === 'story' && <img src="/assets/dining.jpg" alt="Natural textures and warm wood" width={1000} height={700} />}{content.slice(2).map(text => <p key={text}>{text}</p>)}<div className="buttons"><Link href="/shop" className="button">Explore the collection ↗</Link><Link href="/custom" className="text-link">Create a design brief ↗</Link></div></section>;
}
export function Journal() {
  return <section className="page"><p className="eyebrow">NOTES ON LIVING WELL</p><h1>Afro Living.</h1><div className="journal"><Reveal><Link href="/article/warmth"><img src="/assets/hero.jpg" alt="An orange sofa and plants" width={850} height={600} /><p className="eyebrow">COLOUR & CHARACTER</p><h3>A warmer way to come home. ↗</h3></Link></Reveal><Reveal delay={0.1}><Link href="/article/table"><img src="/assets/dining.jpg" alt="A warm dining room" width={850} height={600} /><p className="eyebrow">THE EVERYDAY EDIT</p><h3>Make space for a longer conversation. ↗</h3></Link></Reveal></div></section>;
}
export function Article({ id }: { id: string }) {
  return <section className="page article"><p className="eyebrow">AFRO LIVING · THE EVERYDAY EDIT</p><h1>{id === 'table' ? 'Make space for a longer conversation.' : 'A warmer way to come home.'}</h1><img src={`/assets/${id === 'table' ? 'dining' : 'hero'}.jpg`} alt="Interior inspiration" width={1000} height={750} /><p>{id === 'table' ? 'The dining table is more than a place to eat. It is where a quick cup of tea turns into an afternoon, where stories are shared and ordinary days become memories.' : 'Warmth begins with how a room feels. A terracotta seat, a natural texture, a pool of afternoon light: small choices can give a space a welcoming rhythm.'}</p><h2>Start with how you live.</h2><p>Leave room to move, choose a scale that suits your space, and keep the pieces you use most within easy reach. Measure the room and its doorways before choosing furniture.</p><h2>Let the materials speak.</h2><p>Pair wood with softer fabrics. Bring in a plant, a favourite book, or a piece with a story. A home grows more interesting when it reflects the people who live there.</p><Link className="button" href="/shop">Find your next piece ↗</Link></section>;
}
export function Credits() {
  return <section className="page article"><h1>Behind the photographs.</h1><p>Stock images are used as design inspiration and do not depict actual AfroFurnitures inventory.</p><p><a className="text-link" href="https://unsplash.com/photos/G8rS7Sz9FiQ" target="_blank" rel="noopener noreferrer">Living room — Jason Leung / Unsplash ↗</a></p><p><a className="text-link" href="https://unsplash.com/photos/t2mzF13kSpA" target="_blank" rel="noopener noreferrer">Coral seat — Dário Gomes / Unsplash ↗</a></p><p><a className="text-link" href="https://www.pexels.com/photo/8113036/" target="_blank" rel="noopener noreferrer">Dining room — Rachel Claire / Pexels ↗</a></p></section>;
}
