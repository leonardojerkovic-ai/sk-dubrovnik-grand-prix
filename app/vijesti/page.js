import PublicHeader from '../components/PublicHeader';
import { supabase } from '../../lib/supabaseClient';

export const revalidate = 30;
export const metadata = { title: 'Vijesti | ŠK Dubrovnik', description: 'Novosti, obavijesti i najave Šahovskog kluba Dubrovnik.' };

export default async function NewsPage() {
  const { data: news, error } = await supabase.from('news').select('*').order('published_at', { ascending: false }).limit(20);
  return <><PublicHeader active="/vijesti" /><section className="page-hero"><div><span className="eyebrow">Aktualno</span><h1>Vijesti</h1><p>Novosti i obavijesti ŠK Dubrovnik i Dubrovnik Grand Prixa.</p></div></section><main className="public-main"><div className="news-grid">{error ? <div className="public-card"><h2>Vijesti trenutačno nisu dostupne.</h2><p>Pokušajte ponovno kasnije.</p></div> : !news?.length ? <div className="public-card"><h2>Još nema objavljenih vijesti.</h2><p>Nove objave pojavit će se ovdje.</p></div> : news.map((item) => <article className="public-card news-public" key={item.id}>{item.tag && <span className="section-kicker">{item.tag}</span>}<h2>{item.title}</h2>{item.excerpt && <p>{item.excerpt}</p>}{item.published_at && <time dateTime={item.published_at}>{new Date(item.published_at).toLocaleDateString('hr-HR')}</time>}</article>)}</div></main><footer>© {new Date().getFullYear()} ŠK Dubrovnik Grand Prix</footer></>;
}
