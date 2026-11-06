# Plan Implementacji: Inteligentna Weryfikacja Dostępności i Surowe Raporty Danych

Zgodnie z Twoimi preferencjami, skupimy się na automatycznej analizie dostępności towaru (czy jest w magazynie) oraz prezentacji wyników w formie konkretnych faktów i liczb (surowy raport).

### 1. Rozszerzenie Modelu Danych (Backend & Types)
- Dodanie pól `availability` (w magazynie, ostatnie sztuki, brak) oraz `shippingSpeed` do ofert.
- Wprowadzenie sekcji `rawMarketStats` (mediana, odchylenie, najniższa cena historyczna) do wyników analizy.

### 2. Inteligentne Prompty (Gemini Search Grounding)
- **Weryfikacja Stocku**: AI otrzyma instrukcję, aby podczas przeszukiwania sieci (Ceneo/Allegro) szukało fraz krytycznych: "dostępny", "wysyłka 24h", "oczekiwanie na dostawę", "produkt archiwalny".
- **Surowy Raport**: Zmiana stylu odpowiedzi z opisowej na analityczną (tabela faktów, liczby, konkretne daty ostatniej aktualizacji ceny).

### 3. Nowe Elementy UI
- **Stock Indicator**: Wizualny znacznik dostępności przy każdej ofercie (np. zielona kropka dla "In Stock").
- **Panel "Surowe Fakty"**: Nowa sekcja w wynikach, wyświetlająca czyste dane statystyczne bez zbędnych opisów, idealna dla szybkiej analizy rynkowej.
- **Data Freshness Score**: Bardziej precyzyjne określenie czasu od ostatniej zmiany ceny u danego sprzedawcy.

### 4. Weryfikacja
- Testy na produktach o niskiej dostępności (np. limitowane edycje), aby sprawdzić czy AI poprawnie wykrywa braki magazynowe.
- `lint_applet` i `compile_applet` dla zapewnienia stabilności.
