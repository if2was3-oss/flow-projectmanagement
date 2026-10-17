# Flow — Együtt, lendületben.

Magyar nyelvű projektmenedzsment kis marketing-, kreatív és kulturális csapatoknak. React 19, TypeScript, Vite, Supabase Auth, PostgreSQL és privát Supabase Storage. Az ikonok Lucide-ikonok, a betűkészletek helyben kiszolgált DM Sans és Manrope változó fontok.

## Indítás

Node.js 22 vagy újabb szükséges (ellenőrizve: Node 24).

```sh
npm ci
npm run dev
```

A fejlesztői kiszolgáló alapértelmezett portja 5173. A felhőkörnyezetben, ha az npm alapértelmezett gyorsítótára nem írható:

```sh
npm ci --cache /tmp/flow-npm-cache
```

Supabase-beállítások nélkül a rendszer **mintakörnyezetben** indul. A valószerű, magyar mintaadatok és a módosítások az adott böngésző localStorage tárában maradnak. A feladatok határideje a mintaadatok első létrehozásának napjához igazodik. Visszaállítás: **Beállítások → Mintaadatok visszaállítása**. A mintakörnyezet nem megosztott és nem hitelesített adattároló. Mintafeltöltés: legfeljebb 1 MB/fájl, a böngésző tárhelykorlátján belül.

## Elkészült munkafolyamatok

- Áttekintő: aktív projektek, mai és lejárt feladatok, közelgő határidők, friss aktivitás és számított előrehaladás.
- Projekt létrehozása, szerkesztése, archiválása és visszaállítása az állapot módosításával. Felelős, dátumok, prioritás és leírás.
- Feladatok létrehozása és szerkesztése, felelős, állapot, határidő és prioritás; ellenőrzőlista, hozzászólások, csatolmányok.
- Szűrhető lista, húzható Kanban-kártyák és billentyűzettel kezelhető állapotválasztók; kéthetes határidő-idővonal.
- Havi naptár, napi feladatlista, csapattagok és feladatszám alapján becsült terhelés.
- Globális keresés (Ctrl/⌘ + K), fájllista, profil- és munkatér-beállítások.
- Alkalmazáson belüli értesítések: hozzárendelés, megemlítés (`@email-cím`), hozzászólás, közelgő és lejárt határidő.

## Supabase csatlakoztatása

**A megadott Supabase-projekt konfigurációja a helyi, Git által figyelmen kívül hagyott `.env.local` fájlban szerepel.** A felhasználó visszajelzése szerint a migráció sikeresen lefutott. A távoli szolgáltatás ellenőrzését a fejlesztői környezet kimenő hálózati korlátozása jelenleg blokkolja; az éles bejelentkezés és megosztás még nem igazolt. Új környezetben a beállítás lépései:

1. Hozz létre egy Supabase-projektet.
2. A projekt SQL Editorában futtasd a `supabase/migrations/202610160001_flow.sql` teljes tartalmát, egyszer, egy új adatbázisban. Alternatíva: Supabase CLI-vel a projekt összekapcsolása után `supabase db push`.
3. A Supabase projekt Connect/API beállításaiból másold ki a projekt URL-jét és **publishable vagy anon** kulcsát. A projekt gyökerében hozz létre `.env.local` fájlt az `.env.example` alapján, vagy add meg ezeket a változókat a környezet beállításaiban:

   ```dotenv
   VITE_SUPABASE_URL=https://a-projekted.supabase.co
   VITE_SUPABASE_ANON_KEY=a-projekt-nyilvanos-kulcsa
   ```

   A Vite ezeket a nyilvános értékeket beépíti a kliensbe. **Service role/secret kulcsot soha ne használj VITE változóban.** A jogosultságokat a PostgreSQL RLS-szabályai védik.

4. Authentication → URL Configuration: állítsd be a Site URL-t a telepített alkalmazás HTTPS-címére, és vedd fel az engedélyezett átirányítási címek közé. Helyi fejlesztéshez a használt helyi cím is szükséges. Maradjon bekapcsolva az e-mail-cím megerősítése.
5. A teljes magyar élményhez az Authentication e-mails beállításaiban használd a `supabase/email-templates/` mappában található regisztrációs és jelszó-helyreállítási HTML-sablonokat. Tárgyak: „Erősítsd meg a Flow-fiókodat” és „Állíts be új jelszót a Flowban”. Éles e-mail-küldéshez állítsd be a Supabase SMTP-szolgáltatását.
6. Korlátozott felhőhálózat esetén engedélyezd a konkrét projekt `.supabase.co` domainjét a meglévő hálózati szabályok megőrzésével. Indítsd újra a Vite-ot, illetve éles telepítésnél készíts új buildet. Regisztrálj, erősítsd meg az e-mail-címedet, és hozz létre egy munkateret.
7. **Csapat → Csapattag meghívása**: hozd létre a meghívást, és oszd meg az alkalmazás címét a meghívottal. A meghívott a megadott, ellenőrzött e-mail-címmel bejelentkezve automatikusan csatlakozik. A csapatmeghívás jelenleg nem küld külön e-mailt. Már létrehozott saját munkatérrel rendelkező fiók nem csatlakozik egy második munkatérhez.

A Supabase-mód nem másolja át a mintaadatokat. Az új munkatér üresen indul. A mintakörnyezet a bejelentkező képernyőről is megnyitható; visszalépés a Beállításokból vagy a fiókmenüből.

## Adatok és jogosultságok

A migráció létrehozza a profilokat, munkatereket, tagságokat, projekteket, feladatokat, ellenőrzőlistákat, hozzászólásokat, csatolmány-metaadatokat, aktivitást, értesítéseket és meghívásokat.

- Minden alkalmazástáblán aktív az RLS. Névtelen olvasás és írás tiltott.
- A csapattagok közösen szerkeszthetik saját munkaterük projektjeit és feladatait. Összetett idegen kulcsok megakadályozzák másik csapat projektjére, feladatára vagy tagjára hivatkozást.
- Munkatérnevet módosítani és meghívni a tulajdonos és az adminisztrátor tud. Szerepkört kizárólag a tulajdonos módosíthat. Tagságot és csapatazonosítót a kliens közvetlenül nem írhat át.
- A szerzőazonosítót a hozzászólások és feltöltések szabályai ellenőrzik. Az aktivitás és értesítés adatbázis-oldalon keletkezik. Az értesítéseket csak a címzett olvashatja és jelölheti olvasottnak.
- A `attachments` Storage bucket privát. Fájlonként 10 MB a felső korlát. A hozzáférést csapat- és feladatazonosító alapján ellenőrzi az RLS; a letöltés 60 másodpercig érvényes aláírt URL-t használ.
- A csapatszintű Realtime-frissítések újratöltik az érintett adatokat. A határidő-értesítések bejelentkezéskor és a böngészőfül újbóli megnyitásakor frissülnek, duplikálás nélkül, Europe/Budapest szerinti dátummal. Háttérben futó e-mail/push ütemező nincs az MVP-ben.
- Az MVP egy munkateret támogat fiókonként. Több munkatér, számlázás, Gantt-függőségek, időmérés és automatizálások nem részei ennek a változatnak.

## Ellenőrzés

```sh
npm run build
npm test
npm run test:e2e
```

A tesztek jelentése:

- A Vitest számításokat, valamint valódi PostgreSQL-szemantikát használó PGlite adatbázisban a teljes migrációt, RLS-t, szerepköröket, meghívásokat, értesítéseket és privát Storage-szabályokat ellenőrzi. Az Auth és Storage sémák teszt-illesztésekkel szerepelnek; ez nem távoli Supabase-szolgáltatásteszt.
- A Playwright Chromiumban ellenőrzi a navigációt, mobilnézetet, projekt/feladat életciklust, böngészős mentést, ellenőrzőlistát, hozzászólást, feltöltést, archiválást, Kanbant, naptárt, csapatszűrést és értesítéseket. A mintakörnyezet tesztjei az 5175-ös porton, üres Supabase-konfigurációval futnak, az Auth-felület tesztjei szimulált API-válaszokat használnak az 5174-es porton. A tesztek nem írnak az élő Supabase-projektbe.
- A böngésző alapértelmezés szerint a `/usr/bin/chromium`, ha elérhető. Egyéb környezetben `npx playwright install chromium`, vagy `PLAYWRIGHT_CHROMIUM_EXECUTABLE` megadása szükséges.
- Élő Supabase-projekt megadása után még elvégzendő: regisztráció és e-mailes megerősítés, két felhasználó közötti meghívás és élő szinkron, fájl feltöltése/letöltése, jelszó-helyreállítás valódi levelezéssel.

## Éles build és felhőkörnyezet

```sh
npm run build
npm run preview
```

A `dist/` mappa statikus tárhelyre telepíthető, például a Netlify Drop felületén. A build a megadott nyilvános Supabase-konfigurációt beépíti; a csomag nem tartalmaz adatbázis-jelszót vagy adminisztrátori kulcsot. Feltöltés után a kapott webcímet a Supabase Authentication → URL Configuration alatt Site URL-ként és engedélyezett Redirect URL-ként is be kell állítani.

A fejlesztési kiszolgáló nem éles szolgáltatás. **A felhőkörnyezet publikálása csak a fejlesztői környezetet menti, önmagában nem teszi közzé a Flow weboldalt.** A felhőfeladatok már elkülönített munkakörnyezetben futnak; a meglévő `/workspace/flow-projectmanagement` checkout használható, külön Git worktree létrehozása nem szükséges.
