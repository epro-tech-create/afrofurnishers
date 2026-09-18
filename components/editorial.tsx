import Link from 'next/link';
import { pages } from '@/lib/pages';
import { WHATSAPP_DISPLAY, orderWhatsApp } from '@/lib/whatsapp';
import { Reveal } from './motion';

export function InformationPage({ name }: { name: string }) {
  const content = pages[name];
  return (
    <section className="page article">
      <p className="eyebrow">{content[0]}</p>
      <h1>{content[1]}</h1>
      {name === 'story' && <img src="/assets/dining.jpg" alt="AfroFurnitures furniture for Tanzanian homes" width={1000} height={700} />}
      {content.slice(2).map(text => <p key={text}>{text}</p>)}
      <div className="buttons">
        <a href={orderWhatsApp()} className="button" target="_blank" rel="noopener noreferrer">
          {name === 'contact' ? `WhatsApp ${WHATSAPP_DISPLAY} →` : 'Order on WhatsApp →'}
        </a>
        <Link href="/shop" className="text-link">See our work →</Link>
      </div>
    </section>
  );
}

export function Journal() {
  return (
    <section className="page">
      <p className="eyebrow">IDEAS</p>
      <h1>Notes on living well.</h1>
      <div className="journal">
        <Reveal>
          <Link href="/article/warmth">
            <img src="/assets/hero.jpg" alt="" width={850} height={600} />
            <p className="eyebrow">LIVING ROOM</p>
            <h3>Make a living room feel welcoming →</h3>
          </Link>
        </Reveal>
        <Reveal delay={0.1}>
          <Link href="/article/table">
            <img src="/assets/dining.jpg" alt="" width={850} height={600} />
            <p className="eyebrow">DINING</p>
            <h3>Choose a table for family meals →</h3>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

export function Article({ id }: { id: string }) {
  return (
    <section className="page article">
      <p className="eyebrow">IDEAS</p>
      <h1>{id === 'table' ? 'Choose a table for family meals.' : 'Make a living room feel welcoming.'}</h1>
      <img src={`/assets/${id === 'table' ? 'dining' : 'hero'}.jpg`} alt="" width={1000} height={750} />
      <p>
        {id === 'table'
          ? 'Measure the room, leave walking space, and pick a size that fits everyday meals in a Tanzanian home.'
          : 'Start with comfortable seating, warm colours and clear pathways. One good sofa can set the tone for the whole room.'}
      </p>
      <a className="button" href={orderWhatsApp()} target="_blank" rel="noopener noreferrer">Order on WhatsApp →</a>
    </section>
  );
}

export function Credits() {
  return (
    <section className="page article">
      <h1>Photo credits.</h1>
      <p>Stock photos show the style of furniture we sell and may not show exact current stock.</p>
      <p><a className="text-link" href="https://unsplash.com/photos/G8rS7Sz9FiQ" target="_blank" rel="noopener noreferrer">Living room — Jason Leung / Unsplash →</a></p>
      <p><a className="text-link" href="https://unsplash.com/photos/t2mzF13kSpA" target="_blank" rel="noopener noreferrer">Coral seat — Dário Gomes / Unsplash →</a></p>
      <p><a className="text-link" href="https://www.pexels.com/photo/8113036/" target="_blank" rel="noopener noreferrer">Dining room — Rachel Claire / Pexels →</a></p>
    </section>
  );
}
