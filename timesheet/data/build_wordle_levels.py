"""Builds the team Wordle answer lists, one file per difficulty level.

This is a one-off maintenance script, it is not used by the app. The output
is committed in timesheet/data/wordle_levels/.

Needs (outside the project requirements):
  pip install wordfreq
  an English Hunspell dictionary (en_US.dic), for example
  https://github.com/wooorm/dictionaries/tree/main/dictionaries/en

Usage:
  python build_wordle_levels.py path/to/en_US.dic

How it works:
- Only base words are used (dictionary entries written in lower case), so no
  proper nouns, and no plurals or verb forms. Derived forms the dictionary
  lists on their own ("standing", "realized") are dropped too.
- Words are split by how common they are (wordfreq "zipf" score, a log scale
  where about 3.5 is a word you read every day and 2 is rare):
    level 1: common words, plurals and verb forms included (the old list)
    level 2: base words, zipf >= 3.7
    level 3: base words, 3.2 to 3.7
    level 4: base words, 2.7 to 3.2
    level 5: base words, 2.0 to 2.7
- Words that start with one of EXCLUDED_PREFIXES are left out, so words that
  don't suit a friendly workplace game never get into the pool. To drop
  another word, add it there (it also removes its plurals and verb forms)
  and rebuild, or delete it from the level files by hand.
"""
import os
import sys

from wordfreq import top_n_list, zipf_frequency

MIN_LENGTH = 7
MAX_LENGTH = 9
HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, 'wordle_levels')

# (min zipf, max zipf) per level, base words only. Level 1 is built apart.
BANDS = {2: (3.7, 99), 3: (3.2, 3.7), 4: (2.7, 3.2), 5: (2.0, 2.7)}

# Words that don't suit a friendly workplace game. Matched on the start of
# the word, so "terror" also removes "terrorist" and "terrorism".
EXCLUDED_PREFIXES = (
    'abortion',
    'asexual',
    'bastard',
    'bisexual',
    'breastfed',
    'buttock',
    'cadaver',
    'cocaine',
    'cybersex',
    'enslave',
    'erotic',
    'excrement',
    'fetish',
    'genital',
    'genocid',
    'intersex',
    'massacre',
    'molest',
    'murder',
    'naked',
    'narcotic',
    'orgasm',
    'sexiness',
    'sexless',
    'sexting',
    'sexuality',
    'slaughter',
    'slavery',
    'suicid',
    'swastika',
    'terror',
    'tortur',
    'vaginal',
    'virginit',
)


def load_lemmas(dic_path):
    words = set()
    with open(dic_path, encoding='utf-8', errors='ignore') as f:
        for line in f.read().splitlines()[1:]:
            word = line.split('/')[0]
            if word.isascii() and word.isalpha() and word.islower():
                words.add(word)
    return words


def derived_from(word, known):
    """True when word looks like a plural / verb form of a known word."""
    def has(s):
        return s in known
    if word.endswith('ies') and has(word[:-3] + 'y'):
        return True
    if word.endswith('es') and has(word[:-2]):
        return True
    if word.endswith('s') and not word.endswith('ss') and has(word[:-1]):
        return True
    if word.endswith('ed') and (
        has(word[:-2]) or has(word[:-1])
        or (word[-3] == word[-4] and has(word[:-3]))
    ):
        return True
    if word.endswith('ing') and (
        has(word[:-3]) or has(word[:-3] + 'e')
        or (word[-4] == word[-5] and has(word[:-4]))
    ):
        return True
    if word.endswith('ly') and has(word[:-2]):
        return True
    if word.endswith('ness') and has(word[:-4]):
        return True
    return False


def main(dic_path):
    known = load_lemmas(dic_path)
    in_range = lambda w: MIN_LENGTH <= len(w) <= MAX_LENGTH
    ok = lambda w: not w.startswith(EXCLUDED_PREFIXES)

    base = sorted(
        w for w in known
        if in_range(w) and ok(w) and not derived_from(w, known)
    )
    zipf = {w: zipf_frequency(w, 'en') for w in base}
    levels = {
        level: [w for w in base if low <= zipf[w] < high]
        for level, (low, high) in BANDS.items()
    }
    # Level 1 keeps the old behaviour: any common form, inflections included.
    inflected = [
        w for w in top_n_list('en', 300000)
        if w.isascii() and w.isalpha() and w.islower() and in_range(w)
        and w not in known and ok(w) and derived_from(w, known)
        and zipf_frequency(w, 'en') >= 3.5
    ]
    common = [w for w in known if in_range(w) and ok(w)
              and zipf_frequency(w, 'en') >= 3.5]
    levels[1] = sorted(set(common) | set(inflected))

    os.makedirs(OUT_DIR, exist_ok=True)
    for level, words in sorted(levels.items()):
        with open(os.path.join(OUT_DIR, f'level_{level}.txt'), 'w') as f:
            f.write('\n'.join(words) + '\n')
        by_length = {n: sum(len(w) == n for w in words)
                     for n in range(MIN_LENGTH, MAX_LENGTH + 1)}
        print(f'level {level}: {len(words)} words {by_length}')


if __name__ == '__main__':
    main(sys.argv[1])
