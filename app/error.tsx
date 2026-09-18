'use client';
export default function ErrorPage({ reset }: { reset: () => void }) { return <section className="page"><h1>A little pause.</h1><p>We couldn’t open this part of the showroom. Please try again.</p><button className="button" onClick={reset}>Try again ↗</button></section>; }
