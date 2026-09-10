import PublicHeader from '../components/PublicHeader';

export const metadata = { title: 'O nama | ŠK Dubrovnik', description: 'Šahovski klub Dubrovnik i Dubrovnik Grand Prix.' };

export default function AboutPage() {
  return <><PublicHeader active="/o-nama" /><section className="page-hero"><div><span className="eyebrow">ŠK Dubrovnik</span><h1>O nama</h1><p>Šah, tradicija i natjecanje u Dubrovniku. Dubrovnik Grand Prix okuplja igrače kroz cijelu godinu i stvara jedinstvenu klupsku ljestvicu.</p></div></section><main className="public-main"><div className="content-grid"><article className="public-card"><span className="section-kicker">Klub</span><h2>Šahovski klub Dubrovnik</h2><p>ŠK Dubrovnik razvija šah kroz rad s mladima, klupska natjecanja i otvorene turnire. Naš cilj je spojiti ozbiljno natjecanje, fair-play i snažnu lokalnu šahovsku zajednicu.</p></article><article className="public-card"><span className="section-kicker">Grand Prix</span><h2>Dubrovnik Grand Prix</h2><p>Grand Prix je sustav turnira i ljestvica koji igračima daje kontinuitet tijekom sezone. Bodovi, kategorije i završnica vode prema jasnom sportskom cilju.</p></article></div></main><footer>© {new Date().getFullYear()} ŠK Dubrovnik Grand Prix</footer></>;
}
