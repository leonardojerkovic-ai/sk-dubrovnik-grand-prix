# Phase 3D — Finale

## Opći DGP Finale
- TOP 8 dolazi iz `dgp_final_qualification_candidates`.
- Svaki slot je označen `final_slot` 1–8.
- `QUALIFIED` / `INVITED` mogu prijeći u `CONFIRMED` ili `DECLINED`.
- `DECLINED` automatski pokreće replacement iz sljedećeg kvalificiranog igrača.
- Igrač koji je već evidentiran u Finalu ne može ponovno zauzeti drugi slot.

## U20 Finale
- Isti lifecycle koristi `junior_gp_final_qualifiers`.
- Replacement se bira iz `dgp_junior_final_qualification_candidates`.

## Ishod Finala
- `CONFIRMED → PLAYED` ili `CONFIRMED → NO_SHOW`.
- `PLAYED` i `NO_SHOW` su konačni statusi kvalifikacije.
- Finalizacija zahtijeva svih 8 slotova s konačnim sudioničkim statusom.

## Zaštićeni rezultat
- Nakon finalizacije svaki rezultat Finala dobiva `final_result_protected=true`.
- Rezultati su istodobno zaključani na turniru.
- Trigger u bazi odbija direktne izmjene zaštićenih Final rezultata.
- Bodovi se ponovno obračunavaju prije zaštite rezultata.
