import os

MIN_WORD_LENGTH = 7
MAX_WORD_LENGTH = 9

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')


def _load(filename):
    with open(os.path.join(DATA_DIR, filename)) as f:
        return sorted({line.strip().upper() for line in f if line.strip()})


# Team wordle answers by difficulty level, 1 (easiest) to 5 (hardest). See
# data/build_wordle_levels.py for how the levels are made.
MIN_DIFFICULTY = 1
MAX_DIFFICULTY = 5
WORDLE_WORDS_BY_LEVEL = {
    level: _load(f'wordle_levels/level_{level}.txt')
    for level in range(MIN_DIFFICULTY, MAX_DIFFICULTY + 1)
}

# Every word that can be picked as the word of a round.
WORDLE_WORDS = sorted(
    {word for words in WORDLE_WORDS_BY_LEVEL.values() for word in words}
)

# Every accepted guess; always a superset of WORDLE_WORDS.
VALID_GUESSES = frozenset(_load('wordle_valid_words.txt')) | frozenset(WORDLE_WORDS)


# Single player wordle: common 5 letter words.
SOLO_WORDLE_WORDS = sorted(
    w.upper() for w in _load('single_wordle_answer_words.txt')
)
SOLO_VALID_GUESSES = (
    frozenset(_load('single_wordle_valid_words.txt')) | frozenset(SOLO_WORDLE_WORDS)
)
