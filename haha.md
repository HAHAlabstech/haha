# HAHA — Developer Brief

> **HAHA — Humans Are Hard to Automate**
> **"Tell a joke that fools the AI and get paid."**
> Versi pendek untuk logo/banner: **Tell a joke. Fool the AI. Get paid.**
> Ticker: **$HAHA** · Chain: **Robinhood Chain** · Launchpad: **Pons (V2)** · Reward: **USDG** · Entitas: **HAHA Labs**

> Rujukan teknis pendamping: **Repo open source untuk HAHA.md** (laporan riset repo, lisensi, dan temuan Pons/USDG).

Dokumen ini adalah spesifikasi lengkap untuk membangun HAHA. Bagian yang ditandai **[KEPUTUSAN]** masih perlu dikonfirmasi pemilik proyek sebelum/ saat implementasi.

---

## Daftar Isi

1. Ringkasan Produk
2. Brand, Tema & Istilah
3. Peran (Roles)
4. Kategori Tantangan
5. Core Loop
6. The Straight Man (AI yang terus belajar)
7. The Crowd (sistem juri)
8. The Joke Vault (halaman khusus)
9. Struktur Halaman & User Flow
10. Contoh Bits untuk Inspirasi Pengguna
11. Ekonomi: Tip Jar, Mic Drop & Token
12. Smart Contracts
13. Arsitektur Teknis
14. Data Model
15. API Endpoints
16. Anti-Gaming & Moderasi
17. Privasi, Legal & Risiko
18. Roadmap
19. Definisi Sukses

---

## 1. Ringkasan Produk

HAHA adalah lab terbuka di mana manusia mengirim tantangan yang kompleks tapi masuk akal — lelucon, subteks emosi, situasi dunia nyata, bahasa ambigu — untuk mengecoh AI kami, **the Straight Man**.

- Jika AI **tidak menangkapnya** dan the Crowd (juri manusia) setuju → pengguna **dibayar**.
- Jika AI **menangkapnya** → tantangan tetap masuk **the Joke Vault** sebagai data.
- The Straight Man **dilatih ulang** dari tantangan yang dimenangkan manusia → setiap "season" makin sulit dikalahkan.
- The Joke Vault dilisensikan ke lab AI & perusahaan sebagai data training dan evaluasi untuk hal-hal yang paling sulit dimodelkan AI: **humor, perasaan, realitas dunia nyata, dan bahasa ambigu**.
- Hadiah dibayar dalam **USDG** dari **creator fee trading $HAHA** di Pons (70% → Tip Jar) dan pendapatan data; 30% creator fee untuk **buyback & burn** (Mic Drop).

Narasi publik: **"Trading fees pay the humans who beat AI."**

---

## 2. Brand, Tema & Istilah

Tema seluruh produk: **comedy club**. Semua copy UI, notifikasi, dan konten sosial memakai istilah di bawah ini secara konsisten.

| Konsep teknis | Istilah HAHA |
|---|---|
| Tantangan yang dikirim pengguna | **Bit** |
| Halaman/aksi mengirim tantangan | **The Stage** / "Take the stage" |
| Pengguna menang (AI kalah) | **Killed it** |
| Pengguna kalah (AI benar) | **Bombed** |
| Tantangan ditolak (tidak adil/spam) | **Heckled off** |
| AI kami | **The Straight Man** |
| Versi model baru | **Season** (mis. "Straight Man S3") |
| Juri | **The Crowd** |
| Soal jebakan untuk menguji juri | **Plants** |
| Data Pool | **The Joke Vault** |
| Reward pool (70% creator fee) | **The Tip Jar** |
| Buyback & burn (30% creator fee) | **Mic Drop** |
| Pembeli data / klien eval | **Producers** |
| Sponsor campaign bertema | **Hosts** / "Theme Night" |
| Holder yang staking | **Regulars** |

**Tone of voice:** jenaka, percaya diri, sedikit nakal, tapi tidak kasar. Contoh:
- "The Straight Man didn't get it. You killed it. +4.20 USDG from the Tip Jar."
- "Bombed. The Straight Man saw that one coming. Try another bit?"
- "New Season. Straight Man S4 is live — and harder to fool."

**Visual (arahan untuk desainer):** nuansa comedy club malam hari — panggung, lampu sorot, tirai, mikrofon. Straight Man digambarkan sebagai karakter robot berwajah datar yang tidak pernah tertawa. Hindari meniru karakter/brand komedi yang sudah ada.

---

## 3. Peran (Roles)

| Peran | Siapa | Yang dilakukan | Dibayar dari |
|---|---|---|---|
| **Comedian** | Semua pengguna | Mengirim bits untuk mengecoh Straight Man | Tip Jar (porsi Comedian) |
| **The Crowd** | Pengguna dengan reputasi & stake minimum | Menilai bits secara blind | Tip Jar (porsi Crowd) |
| **The Straight Man** | AI HAHA | Menjawab bits, belajar tiap season | — |
| **Producers** | Lab AI, perusahaan | Melisensi Joke Vault, subscribe, pesan eval | Membayar HAHA Labs |
| **Hosts** | Sponsor | Mendanai Theme Night bertema | Membayar ke campaign pool |
| **Regulars** | Holder $HAHA | Staking; syarat menjadi Crowd; akses fitur | — |
| **Admin/Moderator** | Tim HAHA Labs | Moderasi, banding, konfigurasi | — |

Satu akun bisa menjadi Comedian dan Crowd sekaligus (tapi tidak boleh menilai bit miliknya sendiri atau akun terkait).

### Tingkatan reputasi

**Comedian:** Open Mic → Opener → Feature → Headliner → Legend
- Naik berdasarkan jumlah "killed it" yang lolos, fairness score, dan season yang dikalahkan.
- Tier lebih tinggi = kuota bits harian lebih besar + multiplier reward.

**Crowd:** Walk-in → Regular → Front Row → Critic
- Naik berdasarkan akurasi terhadap konsensus & lolos Plants.
- Tier lebih tinggi = lebih banyak penugasan + bobot suara sedikit lebih besar (dibatasi, lihat §7).

---

## 4. Kategori Tantangan

| Kategori | Ikon/nama UI | Yang diuji | Format pertanyaan umum |
|---|---|---|---|
| **Humor** | 🎤 Punchline | Memahami kenapa sesuatu lucu, menebak punchline | "Kenapa ini lucu?" / "Apa punchline-nya?" |
| **Feelings** | 💬 Subtext | Subteks emosi, sarkasme, pasif-agresif | "Apa yang sebenarnya dia rasakan/maksud?" |
| **Reality** | 🌍 IRL | Akal sehat fisik & sosial | "Apa yang salah/akan terjadi di sini?" |
| **Language** | 🔀 Double Meaning | Kalimat bermakna ganda, idiom, permainan kata | "Apa maksud kalimat ini di konteks ini?" |

Semua kategori dijual sebagai bagian dari "joke" secara luas; tagline tetap memakai kata "joke".

**Bahasa MVP:** Inggris. **[KEPUTUSAN]** Mandarin sebagai bahasa kedua (fase 2).

### Aturan bit yang baik (tampilkan di UI The Stage)
1. **Masuk akal:** setelah jawabannya dijelaskan, kebanyakan orang akan bilang "oh iya, benar".
2. **Bisa dipahami orang asing:** tidak bergantung pada info pribadi yang hanya kamu tahu.
3. **Bukan trik murahan:** tidak ada trik ejaan, hitung huruf, atau pertanyaan menjebak tanpa makna.
4. **Tanpa orang nyata:** jangan sebut nama atau detail orang nyata.
5. **Tidak menyakiti:** tidak ada konten kebencian, seksual eksplisit, atau kekerasan.

---

## 5. Core Loop

```
Comedian menulis bit
      │
      ▼
Pre-screen otomatis ──(gagal)──▶ Ditolak + alasan
      │
      ▼
Straight Man menjawab (+ alasan singkat)
      │
      ▼
Comedian menilai: "Got it" atau "Missed it"
      │                         │
  (Got it)                 (Missed it)
      │                         │
      ▼                         ▼
 BOMBED                Comedian mengungkap jawaban benar + penjelasan
 (masuk Vault                   │
  sbg AI-win)                   ▼
                     The Crowd menilai secara blind (5–7 juri)
                                │
             ┌──────────────────┼───────────────────┐
             ▼                  ▼                   ▼
        KILLED IT            BOMBED           HECKLED OFF
   (mayoritas memihak   (mayoritas memihak   (bit dinilai
    Comedian & fair)      Straight Man)       tidak adil)
             │                  │                   │
   Reward dari Tip Jar    Masuk Vault          Reputasi turun
   Masuk Vault (human-win) (AI-win)            Masuk Vault (rejected)
   Masuk antrian training
```

### Detail langkah

1. **Menulis bit** — pilih kategori, tulis skenario (maks. ~600 karakter) + pertanyaan (maks. ~200 karakter). Lampiran gambar: fase 2.
2. **Pre-screen** (otomatis, < 5 detik): moderasi konten, deteksi PII & nama orang nyata, cek duplikat (similarity embedding terhadap Vault), clarity check (apakah pertanyaan bisa dinilai).
3. **Straight Man menjawab** — tampilkan jawaban + alasan singkat dengan animasi "thinking…" bernuansa panggung.
4. **Comedian menilai** — dua tombol: "Got it 😐" (AI benar) / "Missed it 😂" (AI salah).
   - Jika "Missed it", Comedian wajib mengisi **jawaban benar** + **penjelasan** (maks. ~400 karakter). Setelah dikirim, jawaban terkunci (tidak bisa diedit).
5. **The Crowd** — lihat §7.
6. **Hasil** — ditampilkan ke Comedian + notifikasi. Hasil "Killed it" menghasilkan **kartu share** otomatis.

### Kuota
- Open Mic: 5 bits/hari (gratis). Naik per tier. **[KEPUTUSAN]** angka final.
- Di atas kuota: stake anti-spam kecil (dikembalikan penuh kecuali bit Heckled off). Bukan taruhan — stake tidak hilang hanya karena Bombed.

---

## 6. The Straight Man (AI yang terus belajar)

### Fase 1 — MVP: "belajar" via memori
- Base model: model open-weight dengan lisensi komersial yang mengizinkan fine-tuning, atau API model frontier. **[KEPUTUSAN]** pilihan model saat build.
- Setiap bit "Killed it" disimpan di vector DB (pgvector).
- Saat bit baru masuk, ambil contoh serupa yang relevan dan sisipkan ke prompt (few-shot retrieval).
- System prompt tetap: menjawab singkat, memberi alasan, format JSON terstruktur.

### Fase 2 — Seasons (fine-tuning berkala)
- Fine-tuning LoRA tiap 2–4 minggu dari data human-win yang lolos (dengan filter kualitas).
- Setiap rilis = **New Season** (S1, S2, S3…), diumumkan publik.
- **Holdout set privat** (± 10–15% bits human-win, dipilih acak, tidak pernah dipakai training) untuk mengukur kemajuan: "S4 sekarang menangkap 38% bits yang dulu mengalahkan S3."
- Model registry: simpan setiap versi, skor holdout, dan tanggal rilis.

### Fase 3 — Benchmark publik
- Straight Man vs model frontier lain di holdout set, per kategori. Hasil dipublikasikan sebagai laporan (bukti nilai Joke Vault).

### Format output AI (wajib)
```json
{
  "answer": "string, max 300 chars",
  "reasoning": "string, max 300 chars",
  "confidence": 0.0
}
```

### Prinsip
- Holdout set tidak boleh bocor ke publik atau ke training.
- Straight Man tidak boleh tahu jawaban Comedian sebelum menjawab.
- Log semua input/output + versi model untuk audit.

---

## 7. The Crowd (sistem juri)

### Syarat menjadi Crowd
- Akun lolos verifikasi manusia (anti-bot).
- Stake minimum $HAHA (**[KEPUTUSAN]** angka).
- Lolos tes onboarding singkat (10 bit contoh dengan jawaban diketahui).

### Cara menilai (blind)
Juri melihat:
- Bit (skenario + pertanyaan)
- **Jawaban A** dan **Jawaban B** (satu dari Straight Man, satu dari Comedian, **urutan diacak**, label disembunyikan, gaya teks dinormalisasi agar tidak mudah ditebak mana AI)

Juri menjawab dua pertanyaan:
1. **Mana jawaban yang benar / paling masuk akal?** → A / B / Keduanya benar / Keduanya salah
2. **Apakah bit ini adil?** → Fair / Unfair (trik murahan, ambigu total, butuh info pribadi)

### Keputusan
- Juri per bit: 5 (naik ke 7 jika hasil tipis).
- **Killed it** jika: ≥ 60% memilih jawaban Comedian **dan** ≥ 60% menilai Fair.
- **Heckled off** jika: ≥ 60% menilai Unfair.
- Selain itu: **Bombed**.
- "Keduanya benar" dihitung memihak Straight Man (AI tidak kalah).

### Pembayaran Crowd
- Juri yang memilih sama dengan konsensus final mendapat bagian dari porsi Crowd di Tip Jar.
- Juri yang berbeda dari konsensus tidak dibayar untuk bit itu (tanpa penalti jika sesekali).

### Kualitas & anti-kolusi
- **Plants:** ± 10% penugasan adalah bit dengan jawaban diketahui. Gagal Plants berulang → reputasi turun → akses dicabut → kasus berat: slashing stake.
- Juri dipilih acak dari pool; tidak boleh menilai bit dari akun terkait (wallet funding sama, device, IP cluster).
- Batas penilaian harian per juri.
- Bobot suara per tier dibatasi (maks. 1,5x) agar tidak ada juri dominan.
- Banding: Comedian bisa banding 1x per hari; banding ditinjau panel Critic + admin.

---

## 8. The Joke Vault (halaman khusus)

**Posisi di produk:** halaman kedua yang dilihat pengguna, **langsung setelah halaman Intro**, dan tetap ada di navigasi utama. Tujuannya: pengguna langsung paham bahwa setiap bit yang mereka kirim menambah nilai harta bersama.

### 8.1 Tujuan halaman
Membuat pengguna **terbayang nilai data** yang sudah terkumpul, berapa kira-kira harganya jika dibeli pihak lain, dan berapa biaya subscribe-nya — secara jujur dan bisa dipertanggungjawabkan.

### 8.2 Tiga angka utama (wajib dipisah jelas)

| Angka | Label UI | Arti | Sumber |
|---|---|---|---|
| **Replacement Cost** | "What it would cost to build this data from scratch" | Estimasi biaya membuat data sejenis lewat vendor data | Jumlah entri × harga acuan per entri per kategori |
| **Revenue Earned** | "Actually earned" | Pendapatan nyata dari lisensi, subscription, eval | Tercatat di sistem billing + ringkasan on-chain |
| **Price List** | "License the Vault" | Harga resmi untuk Producers | Dikonfigurasi admin |

**Jangan pernah** menampilkan angka "valuasi" tunggal atau mengaitkan angka-angka ini dengan harga $HAHA.

### 8.3 Rumus Replacement Cost
```
replacement_cost = Σ (entries[kategori][outcome] × ref_price[kategori][outcome])
```
- `outcome`: human_win, ai_win, rejected (rejected bisa bernilai 0 atau sangat kecil).
- `ref_price` dikonfigurasi admin dan **harus diriset dari tarif pasar** vendor data preferensi/anotasi manusia sebelum ditampilkan. **[KEPUTUSAN]** Angka acuan final + sumbernya dicantumkan di halaman Methodology.
- Hanya entri **terverifikasi** (sudah dinilai Crowd atau AI-win terkonfirmasi) yang dihitung.

### 8.4 Layout halaman (desktop & mobile)

1. **Hero — Vault Meter**
   - Ilustrasi brankas/lemari besi comedy club.
   - Angka besar **Replacement Cost** dengan animasi counter naik (update real-time / tiap 30 detik).
   - Sub-teks: "estimated replacement cost · methodology →"
   - Di sebelahnya (atau di bawah pada mobile): **Revenue Earned** dengan badge "actual".
2. **Isi Vault per kategori**
   - 4 bar/kartu: Punchline, Subtext, IRL, Double Meaning.
   - Per kategori: jumlah bits, % human-win, kontribusi ke Replacement Cost.
3. **Pertumbuhan**
   - Grafik garis jumlah entri & Replacement Cost dari waktu ke waktu.
   - Penanda setiap New Season Straight Man.
4. **Price List / License the Vault**
   - Kartu harga, contoh struktur (**[KEPUTUSAN]** angka):
     - *Snapshot License* — satu batch dataset (per kategori atau semua)
     - *Subscription* — akses bulanan ke entri baru + API
     - *Eval Run* — model Producer diuji ke holdout set, dapat laporan
     - *Theme Night* — sponsor campaign bertema
   - Tombol "Talk to HAHA Labs" (form kontak B2B).
5. **Proof**
   - Merkle root setiap rilis dataset + link ke transaksi di explorer Robinhood Chain.
   - Jumlah total entri on-chain vs off-chain harus cocok.
6. **Your contribution** (jika login)
   - "Your bits in the Vault: 42 · Killed it: 9 · Your share of Replacement Cost: ~X"
7. **Disclaimer (wajib, selalu terlihat)**
   - "Replacement Cost is an estimate of what it would cost to produce comparable data, not a valuation of HAHA or $HAHA. Revenue Earned shows actual payments received. Nothing on this page is financial advice."

### 8.5 Methodology page
Halaman terpisah yang menjelaskan: definisi entri terverifikasi, harga acuan per kategori + sumbernya, cara update, dan riwayat perubahan harga acuan.

---

## 9. Struktur Halaman & User Flow

### Sitemap
```
/                 Intro (landing)
/vault            The Joke Vault  ← halaman kedua di onboarding
/vault/method     Methodology
/stage            The Stage (kirim bit)
/bit/:id          Hasil bit + kartu share
/crowd            The Crowd (menilai bits)
/crowd/join       Onboarding juri
/leaderboard      Leaderboard Comedians & Crowd
/u/:handle        Profil publik
/tipjar           Transparansi Tip Jar & Mic Drop
/seasons          Riwayat Season Straight Man + skor
/producers        Halaman B2B (license, subscribe, eval)
/rules            Aturan bit, moderasi, banding
/faq
```

### Onboarding flow (pengguna baru)
1. **Intro (/)**
   - Headline: **"Tell a joke that fools the AI and get paid."**
   - Subtitle: *Humans Are Hard to Automate.*
   - Penjelasan 3 langkah: Tell a joke → Fool the AI → Get paid.
   - Live stats kecil: bits hari ini, "killed it" hari ini, Tip Jar saat ini.
   - Contoh bit yang pernah "killed it" (rotating carousel, hanya yang diizinkan publik).
   - CTA utama: "See the Joke Vault →"
2. **The Joke Vault (/vault)** — lihat §8. CTA di akhir: "Add your bit to the Vault →"
3. **Connect wallet / sign in** (wallet EVM; email/sosial opsional untuk yang belum punya wallet — **[KEPUTUSAN]** gunakan embedded wallet / account abstraction yang didukung Robinhood Chain).
4. **Verifikasi manusia** (ringan) sebelum bisa menerima reward.
5. **The Stage** dengan panel inspirasi (§10) terbuka secara default untuk bit pertama.

### The Stage (/stage)
- Pilih kategori (4 kartu besar).
- Editor skenario + pertanyaan dengan penghitung karakter.
- **Panel "Need ideas?"**: contoh bits per kategori (§10) + tombol "Shuffle" + template isian.
- Checklist aturan bit yang baik (collapsible).
- Tombol "Take the stage 🎤".

### Halaman hasil (/bit/:id)
- Status: waiting for Straight Man → Straight Man answered → waiting for Crowd → Killed it / Bombed / Heckled off.
- Progress Crowd (mis. "3/5 votes in").
- Jika Killed it: kartu share + jumlah reward (estimasi, final saat epoch selesai).

### Kartu share (generate otomatis, gambar 1200×675)
- "I killed it against Straight Man S3 🎤" + kategori + reward.
- Opsi: tampilkan isi bit atau sembunyikan (default **sembunyi** untuk bits yang masuk holdout; lihat §17).
- Link kembali ke HAHA dengan referral code.

---

## 10. Contoh Bits untuk Inspirasi Pengguna

Tampilkan di panel **"Need ideas?"** di The Stage, di halaman FAQ, dan di onboarding. Semua contoh di bawah adalah **orisinal** dan boleh dipakai sebagai konten produk. Contoh ini hanya untuk inspirasi — bit yang disalin persis dari daftar ini akan ditolak sebagai duplikat.

Format per contoh: **Bit** · **Pertanyaan** · *Jawaban yang diharapkan* · (kenapa AI bisa meleset)

### 🎤 Punchline (Humor)

1. **Bit:** My therapist told me to write letters to the people I'm angry at and then burn them. I did it. Now I have no letters and I'm still angry at the people I burned.
   **Q:** Why is this funny?
   *A: The last sentence flips "burn the letters" into sounding like the narrator burned the people — the ambiguity of "them" is the joke.*
   (AI sering hanya menjelaskan "terapi tidak berhasil" dan melewatkan pergeseran rujukan kata "them".)

2. **Bit:** I told my plants I'd water them every day. Now they're dead and they didn't even leave a note.
   **Q:** What's the joke?
   *A: It treats plant death like a dramatic human breakup/suicide trope ("didn't leave a note"), while the real cause is obviously the narrator's broken promise.*

3. **Bit:** A man walks into a library and asks for a book on paranoia. The librarian whispers, "It's right behind you."
   **Q:** Why does the librarian's line land?
   *A: "Right behind you" is both a literal location and the classic phrase that would terrify a paranoid person; whispering makes it creepier.*

4. **Bit:** I bought a "self-help" book. I opened it and every page just said "you're on your own."
   **Q:** Explain the joke.
   *A: Literal reading of "self-help" — the book refuses to help because the help must come from yourself.*

5. **Bit (tebak punchline):** My grandpa said my generation relies too much on technology. So I unplugged his…
   **Q:** Finish the punchline.
   *A: "…life support." (Dark humor: the twist turns a generational argument into something shocking.)*
   (Catatan moderasi: dark humor diperbolehkan selama tidak menyerang kelompok/orang nyata.)

### 💬 Subtext (Feelings)

6. **Bit:** You cancel dinner plans with a friend for the third time this month. They reply: "No worries at all!! Totally get it 😊 Maybe next year haha."
   **Q:** How does your friend actually feel?
   *A: Hurt and fed up. "Next year" plus the over-cheerful tone is passive-aggressive; they're signaling they've stopped expecting you to show up.*

7. **Bit:** Your partner asks, "Do you want to go to my sister's birthday on Saturday?" You say, "Do I have to?" They say, "No, you don't have to."
   **Q:** Should you go?
   *A: Yes. "You don't have to" here means "I'm giving you the chance to show you care; skipping will be remembered."*

8. **Bit:** Your coworker, whose idea your manager just rejected in a meeting, messages you afterwards: "Great meeting. Love how we always go with the safest option."
   **Q:** What is your coworker feeling?
   *A: Frustrated and sarcastic — "great meeting" and "love" are ironic; they feel their idea was dismissed and want someone to agree with them.*

9. **Bit:** After a long silence at dinner, your mom says, "It's fine. I'll just do the dishes myself. Like always."
   **Q:** Is it fine?
   *A: No. "Like always" reveals a long-standing grievance about unequal effort; she wants acknowledgment, not just help with tonight's dishes.*

### 🌍 IRL (Reality)

10. **Bit:** Someone proudly says they saved money by buying a cheap umbrella from a street vendor during a typhoon, then walked home across an open bridge.
    **Q:** What most likely happened to the umbrella, and to the savings?
    *A: A cheap umbrella flips inside out and breaks in typhoon winds almost immediately; they got soaked anyway, so the "savings" were wasted.*

11. **Bit:** You put a full glass of water on the dashboard of a car, then the driver brakes hard at a red light.
    **Q:** Where does the water go?
    *A: Forward — onto the windshield/dashboard and probably the front seat passengers' side, because the water keeps moving forward when the car decelerates.*

12. **Bit:** A guest arrives at a party exactly on time, and the host opens the door wearing a towel with wet hair.
    **Q:** What does this tell you about the party?
    *A: The social norm is to arrive "fashionably late" — the host didn't expect anyone this early, so the guest is effectively too early even though they're on time.*

13. **Bit:** You're told to carry a stack of eight plates and a full pot of soup to the table "in one trip, to save time."
    **Q:** What's the realistic outcome and the smarter choice?
    *A: High risk of spills/breakage; two trips is actually faster than cleaning up broken plates and soup. The "one trip" urge is a classic human overconfidence moment.*

### 🔀 Double Meaning (Language)

14. **Bit:** A sign at a hospital parking lot says: "Visitors who are not patients are not permitted to park here."
    **Q:** Who can park here?
    *A: Only patients (and possibly staff); non-patient visitors must park elsewhere. The phrasing makes it sound confusing because "visitors" and "patients" usually overlap in speech.*

15. **Bit:** "I saw the man with the binoculars."
    **Q:** Who has the binoculars, and how would you know?
    *A: Genuinely ambiguous — either the speaker used binoculars or the man had them. Only context tells you; without it, a human would ask. (The expected answer is that it's ambiguous and what cue would resolve it.)*

16. **Bit:** A job ad reads: "We're looking for someone who works hard and plays hard. We're a family here."
    **Q:** What is the ad really saying?
    *A: Expect long hours, blurred work-life boundaries, and pressure to socialize with coworkers; "family" often signals loyalty expectations beyond the job.*

17. **Bit:** Your friend texts "we need to talk" and then, five minutes later, "it's nothing bad lol."
    **Q:** Should you relax?
    *A: Not completely — "we need to talk" signals something serious; the quick follow-up is to reduce your anxiety, but the "lol" often masks nervousness about the topic.*

### Template isian (untuk tombol "Give me a template")
- "My ___ told me to ___. I did. Now ___." → *Why is this funny?*
- "Someone replies '___' with a 😊 after you ___. How do they actually feel?"
- "You ___ while ___. What realistically happens next?"
- "A sign/ad/message says: '___'. What does it really mean?"

### Contoh bit yang BURUK (tampilkan di /rules)
- "How many R's are in 'strawberry'?" → trik token, bukan pemahaman manusia (Heckled off).
- "What's my dog's name?" → butuh info pribadi.
- "Is this joke funny? [lelucon]" → subjektif total tanpa jawaban yang bisa disepakati.
- Bit yang menyebut orang nyata atau menyerang kelompok → ditolak moderasi.

---

## 11. Ekonomi: Tip Jar, Mic Drop & Token

### 11.1 Fair launch di Pons (Robinhood Chain)

**Launchpad: Pons V2** — docs `docs.ponsfamily.com/v2`, kontrak open source `github.com/ponsdotdev/pons-labs` (MIT, belum ditemukan laporan audit). Mekanisme yang relevan (verifikasi ulang on-chain sebelum launch):
- Setiap launch mencetak **1.000.000.000 token** ke bonding curve yang dihargai dalam **quote asset** (default ETH; token yang disetujui Pons seperti USDG mungkin tersedia).
- Graduasi otomatis (± 4,2 ETH) ke pool **Uniswap v4** yang likuiditasnya dikunci permanen, dengan Pons hook. Token tidak punya fungsi mint, blacklist, atau tax.
- **Anti-sniper bawaan:** "snipe tax" 99% yang turun ke 0 dalam ± 5 detik pertama.
- **Creator fee** dibayar dalam **quote asset**, ditampung di kontrak **Fee Escrow**, dan harus **diklaim** oleh penerima (`claim()` / `claimToken(token)` — signature pasti harus dicek di contract yang ter-deploy). Persentase fee resmi dibaca dari getter on-chain.
- Penerima fee boleh berupa kontrak dan bisa dipindah, tapi fee yang sudah tercatat tetap milik penerima lama. Pons juga bisa memindahkan penerima lewat "community takeover" dengan pemberitahuan 3 hari.

**[KEPUTUSAN] Quote asset:**
- **Opsi A (disarankan, jika Pons mengizinkan): quote asset = USDG.** Creator fee langsung dalam USDG → Tip Jar tidak perlu swap; Mic Drop swap USDG → $HAHA.
- **Opsi B: quote asset = ETH.** Tip Jar perlu swap ETH → USDG sebelum distribusi; Mic Drop swap ETH → $HAHA.

**Tim ± 5% supply:**
- Wallet tim diumumkan publik **sebelum** launch.
- Pembelian tim dilakukan terbuka setelah snipe tax habis (bukan di detik pertama, bukan via bundel wallet).
- Token tim dikunci di kontrak vesting publik — gunakan **Sablier Lockup** yang sudah ter-deploy di Robinhood Chain (**[KEPUTUSAN]** durasi; saran: cliff 6–12 bulan, vesting 12–24 bulan).

**Exempt wallet (penting untuk kepercayaan):**
- Pons **selalu** mengecualikan alamat launcher dan penerima creator fee dari snipe tax; kreator bisa menambah hingga 32 wallet exempt. Fitur inilah yang disalahgunakan jaringan rug-pull $18,4 juta di Robinhood Chain (Juli–September 2026).
- Kebijakan HAHA: **tidak menambahkan satu pun wallet exempt tambahan.** Launcher = multisig, penerima fee = kontrak `FeeSplitter`. Buktikan secara publik lewat event launch di explorer dan tampilkan di /tipjar.
- Tanpa pre-allocation tersembunyi, tanpa presale.

### 11.2 Aliran creator fee

```
Creator fee trading $HAHA (dalam quote asset: USDG atau ETH)
        │
  Pons Fee Escrow ──claim()──▶ FeeSplitter (kontrak HAHA)
                                    │
                               ┌────┴─────┐
                              70%        30%
                               │           │
                            TIP JAR     MIC DROP
                               │           │
                     (swap ke USDG     Swap ke $HAHA di
                      jika quote=ETH)  pool Uniswap v4
                               │       (Pons hook) → burn
                     Dibayar dalam USDG
                     ke manusia yg beat AI
```

Catatan: fitur buyback bawaan Pons **tidak membakar** token (token hasil buyback di-vesting 5 tahun), jadi HAHA memakai kontrak `MicDrop` sendiri.

### 11.3 The Tip Jar (70%)
- Menampung 70% creator fee + (opsional) sebagian pendapatan data (§11.5).
- Didistribusikan per **epoch harian**. **[KEPUTUSAN]** harian vs mingguan.
- Pembagian default:
  - **80% → Comedians** (bits "Killed it" di epoch itu)
  - **20% → The Crowd** (juri yang sejalan dengan konsensus)
- **Mata uang pembayaran: USDG** (stablecoin Global Dollar Network, diterbitkan Paxos, native di Robinhood Chain).
  - Kontrak USDG di Robinhood Chain (dari riset, **verifikasi ulang di explorer**): `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168`.
  - Selalu baca `decimals()` dari kontrak (di Ethereum USDG memakai 6 desimal) — jangan hardcode 18.
  - UI menampilkan reward dalam dolar ("+4.20 USDG"), sehingga "get paid" terasa nyata dan stabil.
- **Rumus reward Comedian:**
  ```
  score(bit) = win_strength × fairness × season_mult × tier_mult × category_mult
  reward(bit) = comedian_pool_epoch × score(bit) / Σ score(semua bit killed-it di epoch)
  ```
  - `win_strength` = proporsi juri yang memihak Comedian (0.6–1.0)
  - `fairness` = proporsi juri yang menilai Fair (0.6–1.0)
  - `season_mult` = mengalahkan season terbaru 1.0; bit yang dinilai untuk season lama tidak ada (semua bit dinilai terhadap season aktif)
  - `tier_mult` = Open Mic 1.0 … Legend 1.3 (dibatasi)
  - `category_mult` = bonus untuk kategori/bahasa yang datanya masih sedikit (dikonfigurasi admin)
- **Batas per akun per epoch** (mis. maks. 5% dari comedian pool) agar tidak didominasi satu pihak.
- **Reward Crowd:** crowd_pool_epoch dibagi rata per penilaian yang sejalan konsensus (Plants tidak dibayar).
- **Klaim reward: model Merkle kumulatif** (pola Morpho Universal Rewards Distributor / Merkl).
  - Setiap epoch, backend menerbitkan satu Merkle root berisi **total kumulatif** USDG yang pernah diperoleh tiap alamat.
  - Pengguna memanggil `claim(account, cumulativeAmount, proof)`; kontrak membayar selisih dengan yang sudah diklaim. Satu transaksi bisa mengklaim banyak epoch sekaligus (hemat gas, penting karena subsidi gas Robinhood Chain sudah berakhir).
  - Model **pull** (pengguna yang mengklaim), bukan push otomatis.
  - Pengguna boleh mengklaim ke alamat penerima lain (berguna jika alamat utamanya bermasalah).
  - **[KEPUTUSAN]** sponsor gas klaim lewat paymaster (ERC-4337 didukung di Robinhood Chain).

### 11.4 Mic Drop (30%)
- 30% creator fee (USDG atau ETH, sesuai quote asset) dipakai membeli $HAHA di **pool Uniswap v4 hasil graduasi Pons (dengan Pons hook)**, lalu **dibakar**.
- Dieksekusi terjadwal (mis. harian) oleh keeper milik HAHA (job BullMQ yang memanggil kontrak), dengan batas slippage dan ukuran swap maksimum. Chainlink Automation tidak tersedia di Robinhood Chain.
- Router: gunakan Uniswap v4 Universal Router di Robinhood Chain (ada dua deployment; **verifikasi mana yang tepat** sebelum mainnet).
- Setiap Mic Drop ditampilkan di **/tipjar** + dibagikan otomatis ke X: "🎤 Mic Drop: X $HAHA burned today."

### 11.5 Pendapatan data (Producers)
Pendapatan dari lisensi, subscription, dan eval (diutamakan dalam **USDG**; fiat dikonversi ke USDG sebelum masuk Tip Jar). Pembagian yang disarankan **[KEPUTUSAN]**:
- 40% operasional & compute (inference, training)
- 30% Tip Jar
- 20% Mic Drop
- 10% revenue share untuk Comedians yang bits-nya masuk batch yang dilisensikan

> Catatan: creator fee tidak menyisakan porsi untuk operasional. Pastikan compute & operasional didanai dari pendapatan data atau sumber lain sebelum launch.

### 11.6 Utilitas $HAHA
- **Stake untuk menjadi The Crowd** (dengan slashing untuk kecurangan berat).
- **Regulars:** staker mendapat kuota bits lebih besar, akses Theme Night eksklusif, badge.
- **Anti-spam stake** untuk bits di atas kuota (dikembalikan kecuali Heckled off).
- **Theme Night:** Hosts bisa mendanai campaign dengan $HAHA.

### 11.7 Transparansi (/tipjar)
Halaman publik yang menampilkan:
- Creator fee masuk dari Pons Fee Escrow (total & harian, dalam USDG/ETH)
- Saldo Tip Jar (USDG), total USDG dibayarkan ke Comedians & Crowd
- Riwayat Mic Drop (jumlah dibeli, dibakar, tx hash)
- Alamat semua kontrak & wallet tim + status vesting
- **Bukti launch:** tautan event launch Pons yang menunjukkan tidak ada wallet exempt tambahan

---

## 12. Smart Contracts

Target: **Robinhood Chain** (EVM, Arbitrum Orbit, gas dalam ETH; chain ID 4663 — **verifikasi ulang di dokumentasi resmi** sebelum deploy). Tooling: Foundry, OpenZeppelin, viem/wagmi.

| Kontrak | Fungsi |
|---|---|
| `HAHAToken` | **Dibuat oleh Pons** saat launch (1B supply, tanpa mint/blacklist/tax). HAHA tidak men-deploy token sendiri. |
| `FeeSplitter` | Ditetapkan sebagai **creator fee recipient sejak launch**. Memanggil fungsi klaim di Pons Fee Escrow, lalu membagi otomatis 70% → `TipJar`, 30% → `MicDrop`. Immutable, tanpa fungsi withdraw ke EOA. |
| `TipJar` | Menyimpan USDG; Merkle root **kumulatif** per epoch (diset oleh multisig/role `ROOT_SETTER`); `claim(account, cumulativeAmount, proof)`; opsi klaim ke alamat lain; mencegah double-claim. Jika quote asset = ETH, fungsi swap ETH → USDG dengan batas slippage. |
| `MicDrop` | Menerima 30% creator fee; `executeBuyback(minOut)` swap ke $HAHA via pool Uniswap v4 hasil graduasi Pons; burn. |
| `CrowdStaking` | Stake/unstake $HAHA dengan cooldown; slashing **per juri** oleh role `SLASHER` (multisig). |
| `VaultRegistry` | Menyimpan Merkle root setiap rilis dataset Joke Vault + metadata (jumlah entri, timestamp); cukup emit event. |
| Vesting tim | Pakai **Sablier Lockup** yang sudah ter-deploy di Robinhood Chain (lisensi BUSL-1.1: pakai kontrak yang ter-deploy, jangan fork kodenya). |

Library: OpenZeppelin Contracts v5.x (`MerkleProof`, `SafeERC20`, `AccessControl`), `@openzeppelin/merkle-tree` untuk membangun root di backend. Catatan: `PaymentSplitter` sudah dihapus di OpenZeppelin v5, jadi `FeeSplitter` ditulis sendiri (sederhana).

### Hal yang wajib diverifikasi on-chain sebelum mainnet
- Signature fungsi klaim di Pons Fee Escrow (`claim()` vs `claim(uint256)` vs `claimToken(token)`).
- Apakah USDG tersedia sebagai quote asset di Pons.
- Alamat & `decimals()` USDG di Robinhood Chain.
- Alamat pool Uniswap v4 $HAHA setelah graduasi + Universal Router yang tepat.
- Alamat Safe (multisig) dan Sablier Lockup di chain 4663.

### Keamanan
- Semua role admin dipegang **multisig** (mis. Safe), bukan EOA.
- Timelock untuk perubahan parameter penting.
- Audit eksternal sebelum mainnet. Minimal: test coverage tinggi + fuzzing (Foundry).
- Tidak ada fungsi mint tambahan, tidak ada blacklist/whitelist trading tersembunyi.

---

## 13. Arsitektur Teknis

| Lapisan | Pilihan |
|---|---|
| Frontend | Next.js (App Router) + TypeScript, Tailwind, Framer Motion (animasi panggung & counter), Recharts (grafik Vault) |
| Wallet | wagmi + viem; embedded wallet/account abstraction untuk pengguna non-crypto **[KEPUTUSAN]** provider |
| Backend API | Node.js + TypeScript (Next API routes atau Fastify) |
| ML service | Python (FastAPI): inference Straight Man, embedding, retrieval, pipeline training |
| Database | PostgreSQL + pgvector |
| Queue | Redis + BullMQ (pre-screen, AI answer, penugasan juri, epoch settlement, Mic Drop) |
| Model serving | vLLM di GPU cloud atau penyedia inference terkelola; fallback API frontier |
| Training | Job LoRA terjadwal, model registry, eval otomatis ke holdout |
| Moderasi | Classifier konten + deteksi PII/nama orang nyata + similarity dedup |
| Storage | S3-compatible (kartu share, ekspor dataset terenkripsi) |
| Indexer | Indexer event on-chain (TipJar, MicDrop, VaultRegistry) untuk halaman transparansi |
| Observability | Logging terstruktur, metrics, alert untuk queue & biaya compute |

### Job terjadwal
- `epoch_settlement` (harian): hitung reward USDG, perbarui total kumulatif per alamat, bangun Merkle tree, publish root ke `TipJar`.
- `fee_claim` (harian): panggil `FeeSplitter` untuk menarik creator fee dari Pons Fee Escrow dan membaginya 70/30.
- `mic_drop` (harian): eksekusi buyback & burn.
- `vault_snapshot` (mingguan): bangun Merkle root entri Vault, publish ke `VaultRegistry`.
- `vault_metrics` (tiap 30 detik–5 menit): hitung ulang Replacement Cost untuk halaman /vault.
- `season_training` (tiap 2–4 minggu, manual approve): training + eval + rilis season.

---

## 14. Data Model

```
User(
  id, wallet, email?, handle, country?,
  comedian_tier, comedian_rep, crowd_tier, crowd_rep,
  human_verified_at?, created_at
)

Bit(
  id, user_id, category[punchline|subtext|irl|double_meaning], language,
  scenario, question, status[screening|answered|disputed|in_crowd|killed_it|bombed|heckled_off|rejected_prescreen],
  season_id, is_holdout, share_public, content_hash, created_at
)

StraightManAnswer(id, bit_id, season_id, answer, reasoning, confidence, latency_ms, created_at)

ComedianReveal(id, bit_id, answer, explanation, created_at)

CrowdAssignment(
  id, bit_id, juror_id, is_plant, position_ai[A|B],
  vote[A|B|both_right|both_wrong], fairness[fair|unfair], voted_at
)

Outcome(id, bit_id, result, comedian_votes, ai_votes, fair_ratio, decided_at)

Season(id, name, base_model, trained_at, holdout_score, released_at, notes)

Epoch(id, start_at, end_at, fee_in_amount, fee_in_asset[USDG|ETH], tipjar_in_usdg, comedian_pool_usdg, crowd_pool_usdg, merkle_root, tx_hash)

Reward(id, epoch_id, user_id, role[comedian|crowd], amount_usdg, cumulative_usdg, claimed_tx?)

MicDropEvent(id, asset_in[USDG|ETH], amount_in, haha_bought, haha_burned, tx_hash, executed_at)

VaultPricing(id, category, outcome, ref_price_usd, source_note, effective_from)

VaultSnapshot(id, entry_count, by_category_json, replacement_cost_usd, merkle_root, tx_hash, created_at)

Producer(id, org_name, contact, plan[snapshot|subscription|eval|theme_night], status)

RevenueEvent(id, producer_id, amount_usd, type, split_json, created_at)

Appeal(id, bit_id, user_id, reason, status, resolved_by, resolved_at)
```

---

## 15. API Endpoints (ringkas)

```
POST   /api/bits                     kirim bit
GET    /api/bits/:id                 status & hasil bit
POST   /api/bits/:id/verdict         Comedian: got_it | missed_it (+ reveal)
POST   /api/bits/:id/appeal          banding

GET    /api/crowd/next               ambil penugasan juri berikutnya
POST   /api/crowd/:assignmentId      kirim vote

GET    /api/vault/summary            Replacement Cost, Revenue Earned, per kategori
GET    /api/vault/history            data grafik pertumbuhan
GET    /api/vault/pricing            harga acuan + metodologi
GET    /api/vault/snapshots          daftar Merkle root + tx

GET    /api/tipjar/summary           saldo, total dibayar, Mic Drop
GET    /api/rewards/me               reward pengguna + proof klaim

GET    /api/leaderboard?type=comedian|crowd&period=week|all
GET    /api/seasons                  riwayat season & skor
GET    /api/inspiration?category=    contoh bits (§10) acak
POST   /api/producers/contact        form B2B
```

Autentikasi: Sign-In with Ethereum (SIWE) + sesi server; email untuk embedded wallet.

---

## 16. Anti-Gaming & Moderasi

| Ancaman | Mitigasi |
|---|---|
| Comedian mengklaim AI salah sembarangan | Juri blind + threshold 60% + penilaian fairness |
| Bit dengan jawaban hanya diketahui pengirim | Fairness vote + aturan bit + Heckled off menurunkan reputasi |
| Bits dibuat AI massal | Deteksi teks AI, similarity dedup, kuota, verifikasi manusia |
| Kolusi Comedian–juri | Penugasan acak, filter akun terkait, batas harian, analisis pola vote |
| Juri asal klik | Plants, reputasi, slashing untuk kasus berat |
| Sybil farming Tip Jar | Verifikasi manusia wajib untuk menerima reward, batas per akun per epoch |
| Menebak mana jawaban AI | Urutan acak + normalisasi gaya/panjang jawaban |
| Konten berbahaya | Moderasi otomatis + review manual + laporan pengguna |

### Moderasi konten
- Dilarang: kebencian terhadap kelompok, konten seksual eksplisit, kekerasan grafis, self-harm, doxxing, nama/detail orang nyata, konten tentang anak.
- Kategori Subtext rawan topik berat (hubungan, keluarga): jika terdeteksi tanda krisis/self-harm, tampilkan pesan dukungan & sumber bantuan, jangan diproses sebagai bit.

---

## 17. Privasi, Legal & Risiko

- **Lisensi konten:** saat submit, Comedian menyetujui bahwa bit & jawabannya dilisensikan ke HAHA Labs untuk training, evaluasi, dan lisensi ke pihak ketiga. Tampilkan jelas, bukan tersembunyi.
- **Holdout set:** bits yang masuk holdout tidak dipublikasikan isinya (kartu share tanpa isi) agar nilai evaluasinya terjaga.
- **PII:** tolak/strip data pribadi; kepatuhan GDPR, CCPA, PIPL sesuai pasar.
- **Token & regulasi:** buyback & burn + reward bisa membuat $HAHA dianggap sekuritas di beberapa yurisdiksi (terutama US). Stake anti-spam bukan taruhan. **Konsultasi hukum sebelum launch.**
- **Klaim nilai:** halaman Vault tidak boleh menyiratkan harga/valuasi token (§8.2).
- **Lisensi model:** pastikan lisensi model open-weight mengizinkan fine-tuning & komersialisasi; penggunaan API model lain sesuai ToS masing-masing.
- **Merek:** cek ketersediaan "HAHA", "$HAHA", domain, dan handle X sebelum branding final.
- **Risiko ekonomi:** jika volume trading turun, Tip Jar mengecil → pendapatan data harus tumbuh. Komunikasikan bahwa reward bersifat variabel.
- **Biaya compute:** pantau biaya per bit; kuota & caching.
- **Risiko USDG:** Paxos dapat membekukan, menghapus saldo, atau menghentikan sementara transfer USDG, dan kontraknya upgradeable. Jika alamat `TipJar` dibekukan, pembayaran berhenti. Mitigasi: model klaim pull, opsi klaim ke alamat lain, simpan saldo Tip Jar secukupnya per epoch, dan siapkan rencana migrasi kontrak.
- **Risiko Pons:** kontrak Pons belum ditemukan audit publiknya; Pons dapat memindahkan penerima creator fee lewat "community takeover" (dengan pemberitahuan 3 hari). Pantau event terkait penerima fee dan umumkan jika ada perubahan.

---

## 18. Roadmap

### Fase 0 — Persiapan (Minggu 0–1)
- Finalisasi nama, domain, handle X, quote asset Pons (USDG vs ETH), dan keputusan **[KEPUTUSAN]** utama.
- Riset harga acuan Replacement Cost.

### Fase 1 — Beta tanpa token (Minggu 1–4)
- Intro, Joke Vault (dengan Replacement Cost), The Stage + panel inspirasi, Straight Man (memori/retrieval), The Crowd blind + Plants, leaderboard, kartu share.
- Reward berupa **poin** (dikonversi ke alokasi/klaim saat launch **[KEPUTUSAN]** mekanismenya).

### Fase 2 — Launch (Minggu 5–7)
- Deploy kontrak (FeeSplitter, TipJar, MicDrop, CrowdStaking, VaultRegistry) setelah audit; vesting tim via Sablier.
- Fair launch $HAHA di **Pons**, `FeeSplitter` sebagai creator fee recipient, tanpa wallet exempt tambahan, pembelian tim terbuka, vesting aktif.
- Tip Jar (USDG) & Mic Drop live, halaman /tipjar.

### Fase 3 — Seasons & Producers (Minggu 8–12)
- Straight Man S1 (fine-tune) + holdout benchmark publik.
- Halaman Producers + Price List aktif, pilot pertama.
- Theme Night pertama dengan Host.

### Fase 4 — Skala
- Bahasa kedua (Mandarin), lampiran gambar, API dataset, eval-as-a-service, benchmark vs model frontier.

---

## 19. Definisi Sukses

**Beta (4 minggu):**
- ≥ 5.000 bits terverifikasi, ≥ 500 Comedians aktif, ≥ 150 Crowd aktif
- Kesepakatan juri ≥ 70% pada bits yang diterima
- ≥ 15% bits "Killed it" dibagikan

**Setelah launch (3 bulan):**
- ≥ 25.000 bits di Joke Vault
- Human win rate turun terukur antar season (bukti Straight Man belajar)
- ≥ 1 Producer membayar (Revenue Earned > 0)
- Distribusi Tip Jar & Mic Drop berjalan tanpa gangguan, seluruhnya terverifikasi on-chain

---

*Ringkasan dalam satu kalimat untuk tim: HAHA mengubah kecerdasan dan selera humor manusia menjadi data paling berharga untuk AI — dan membayar manusia yang berhasil mengecohnya.*
