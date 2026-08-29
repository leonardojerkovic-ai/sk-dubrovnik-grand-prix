# Dubrovnik Grand Prix — Projektna specifikacija

## 1. Sustavi i sezone

Projekt podržava dva odvojena natjecateljska sustava:
- GP Akademije — sezona 2026/27
- Dubrovnik Grand Prix — sezona 2027

Bodovi dvaju sustava nikada se ne zbrajaju niti uspoređuju.

## 2. Ključna poslovna pravila

### GP Akademije 2026/27
- Sezona počinje u rujnu 2026. i završava Prvenstvom Akademije u lipnju 2027.
- Kvalifikacijska serija ima 6 turnira; finale je zaseban završni turnir.
- Pravo na GP bodove temelji se na pravilniku i FIDE rapid rejtingu na prvom nastupu igrača u Akademiji u toj sezoni.
- **Dobna kategorija igrača u Akademiji određuje se prema njegovoj dobi/godištu na prvom turniru Akademije na kojem se uključio u sezonu.** Referentna godina je godina tog prvog nastupa. Kategorija se zatim vodi za njegovu Akademijinu sezonu prema tom početnom određivanju.
- Na službenoj ljestvici prikazuju se samo članovi ŠK Dubrovnik; rezultati ostalih sudionika ostaju u obračunu gdje je to propisano.

**Napomena:** dostavljeni pravilnik GP Akademije u članku 20 navodi dob prema 1. siječnju godine u kojoj sezona počinje. Ova projektna specifikacija bilježi noviju poslovnu uputu naručitelja (prvi nastup u Akademiji); prije produkcijske objave pravilnika razliku treba uskladiti i u službenom dokumentu.

### Dubrovnik Grand Prix 2027
- Sezona traje od 1.1.2027. do 31.12.2027.
- Završni turniri održani u siječnju 2028. pripadaju sezoni 2027.
- Opći GP obuhvaća otvorene turnire prema pravilniku.
- Kategorijske ljestvice koriste bodove Općeg GP-a plus bodove posebnih kategorijskih turnira namijenjenih toj kategoriji, uz pravila o broju rezultata i zaštićenim završnim rezultatima.

## 3. Dobne kategorije

Za Dubrovnik GP sezonu s godinom `G` i godištem igrača `B`:
- U kategorija: `G - B <= granica`
- S kategorija: `G - B >= granica`

Za Dubrovnik GP 2027:
- U20: godište 2007. i mlađe
- U16: godište 2011. i mlađe
- U12: godište 2015. i mlađe
- S50: dob >= 50
- S65: dob >= 65

U1800 je rejting-kategorija i ne određuje se prema godištu.

## 4. Kategorije Dubrovnik GP-a

- Žene
- U20
- U16
- U12
- S50
- S65
- U1800

## 5. Povijesni podaci

Rejting igrača mora biti spremljen kao povijesni zapis. Rezultat turnira uvijek referencira rejting koji je igrač imao za taj turnir; trenutni mjesečni rejting ne smije retroaktivno mijenjati stare rezultate.

## 6. Pravila objave

Sustav mora podržati verzioniranje pravila, izračuna i objava ljestvica. Svaki obračun mora imati zapis korištene verzije pravila.
