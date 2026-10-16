# Writing Connections puzzles

This folder is for creating new puzzles for the team **Connections** game in
the timesheet app. When asked to create puzzles, follow these instructions and
produce **one CSV file** that can be imported in the Django admin.

## What a puzzle is

A puzzle has **16 words** split into **4 hidden groups of 4 words**. Players
must work out which words belong together. Each group has a short **category
name**, shown only after the group is found.

The groups are ordered from **easiest to hardest**. The game colours them in
that order: group 1 yellow (easiest), group 2 green, group 3 blue,
group 4 purple (hardest).

## The audience

A small software team that works with GIS and maps (Kartoza), based mostly in
South Africa and Indonesia. Mix topics so puzzles stay fun and different:

- general knowledge, science and nature
- software development, the web, devops
- GIS, maps and geography
- South African and Indonesian culture, food, places
- movies, music, games, sport
- wordplay (words that go before or after the same word, hidden words)
- everyday office and remote work life

Keep it friendly and suitable for work. Use only well-known facts, so players
can be certain of an answer. Do not use offensive words.

## Rules for the words (the import rejects anything else)

- A word is **one word**: letters A-Z only, **2 to 12 letters**.
- **No spaces, hyphens, apostrophes, digits or accents.** Use `NEWYORK` only if
  you must; better pick another word. Avoid names that need punctuation.
- Written in **UPPER CASE** (the import also accepts lower case).
- A word appears **only once in a puzzle**, in exactly one group.
- Exactly **4 groups** and exactly **4 words per group**.
- Every group needs a category name (a few words, e.g. `Coffee drinks`,
  `___ball`, `Things with keys`).

## What makes a good puzzle

- Each word must clearly belong to **exactly one group in the final solution**.
  Check every word against all four categories: if a word fits two groups, the
  other group must still be solvable only one way.
- Add **one or two red herrings**: a word that looks like it fits another group
  at first glance. Example: `PYTHON` looks like a snake, but the snake group
  already has its own four snakes, so `PYTHON` belongs to the programming
  languages group.
- Make the difficulty really increase: group 1 is obvious, group 4 needs
  lateral thinking (wordplay, "___ball", "things that can precede X").
- Avoid obscure trivia, ambiguous categories ("Things that are red"), and
  near-duplicates of each other inside one puzzle.
- Do not repeat the same category or the same words across puzzles you create
  in one run. If `existing_puzzles.csv` is in this folder (a download of the
  puzzles already on the website), read it first and **do not reuse its
  categories or word sets**.

## CSV format

One puzzle per row. The first row is the header, exactly:

```
category_1,words_1,category_2,words_2,category_3,words_3,category_4,words_4
```

- `category_N` is the category name of group N (easiest first).
- `words_N` has the **four words of group N separated by `|`** (a pipe).
- Put quotes around a cell only if it contains a comma. Save the file as UTF-8.

See `example.csv` for two complete puzzles:

```
Git commands,COMMIT|MERGE|REBASE|CLONE,Coffee drinks,LATTE|MOCHA|ESPRESSO|CORTADO,Snakes,COBRA|VIPER|ADDER|MAMBA,Programming languages,PYTHON|RUBY|SWIFT|RUST
```

## Steps

1. Ask how many puzzles are wanted and whether there is a theme, if not said.
   Default to 10 puzzles with a mix of themes.
2. Read `existing_puzzles.csv` if it exists, to avoid repeats.
3. Write the puzzles to `output/puzzles-YYYY-MM-DD.csv` (create `output/` if
   needed; use today's date; add `-2`, `-3` if the file exists).
4. **Validate the file** from the project root with the same rules as the
   website:

   ```
   python manage.py check_connections_csv connections-puzzles/output/puzzles-YYYY-MM-DD.csv
   ```

   It prints the problems with row numbers. Fix them and run it again until it
   reports `0 problem(s)`.
5. Do a final review of every puzzle against the "good puzzle" list above:
   does each word fit exactly one group in the solution? Replace weak puzzles.
6. Tell the user the file path and give a short list of the categories per
   puzzle, so they can sanity check. Remind them how to import:

   > Admin -> Connections puzzles -> **Import CSV**. Puzzles are saved as
   > drafts; select them and use "Approve selected puzzles" when happy (or tick
   > "Approve the puzzles right away").

Do not change any code or database. Only create files in this folder.
